import { NextResponse } from 'next/server';
import type { GatewayUser, FhirResourceType } from './types';
import { FhirErrors } from './response';

// Resource handlers registry
type ResourceHandler = {
  search?: (args: SearchArgs, user: GatewayUser) => Promise<NextResponse>;
  read?: (id: string, user: GatewayUser) => Promise<NextResponse>;
  create?: (resource: unknown, user: GatewayUser) => Promise<NextResponse>;
  update?: (id: string, resource: unknown, user: GatewayUser) => Promise<NextResponse>;
  delete?: (id: string, user: GatewayUser) => Promise<NextResponse>;
};

export interface SearchArgs {
  request: Request;
  searchParams: URLSearchParams;
  version: string;
}

// Registry of resource handlers
const resourceHandlers: Partial<Record<FhirResourceType, ResourceHandler>> = {};

/**
 * Register a resource handler
 */
export function registerResourceHandler(
  resourceType: FhirResourceType,
  handler: ResourceHandler
) {
  resourceHandlers[resourceType] = handler;
}

/**
 * Get supported resource types
 */
export function getSupportedResources(): FhirResourceType[] {
  return Object.keys(resourceHandlers) as FhirResourceType[];
}

/**
 * Main FHIR request router
 */
export async function handleFhirRequest(
  method: string,
  version: string,
  path: string[],
  request: Request,
  user: GatewayUser
): Promise<NextResponse> {
  // Validate FHIR version
  if (version !== '4_0_1' && version !== 'R4') {
    return FhirErrors.badRequest(`Unsupported FHIR version: ${version}. Supported: 4_0_1, R4`);
  }

  // Parse resource type and ID from path
  const [resourceType, resourceId, ...rest] = path;

  // Handle metadata request
  if (resourceType === 'metadata' || resourceType === 'CapabilityStatement') {
    // Import dynamically to avoid circular deps
    const { getCapabilityStatement } = await import('./capability');
    return getCapabilityStatement(request, version);
  }

  // Validate resource type
  if (!resourceType) {
    return FhirErrors.badRequest('Resource type is required');
  }

  const handler = resourceHandlers[resourceType as FhirResourceType];
  if (!handler) {
    return FhirErrors.unsupportedResource(resourceType);
  }

  // Route to appropriate handler method
  try {
    switch (method) {
      case 'GET':
        if (resourceId) {
          // Read single resource
          if (!handler.read) {
            return FhirErrors.methodNotAllowed('GET (read)');
          }
          return await handler.read(resourceId, user);
        } else {
          // Search
          if (!handler.search) {
            return FhirErrors.methodNotAllowed('GET (search)');
          }
          const url = new URL(request.url);
          return await handler.search(
            {
              request,
              searchParams: url.searchParams,
              version,
            },
            user
          );
        }

      case 'POST':
        if (!handler.create) {
          return FhirErrors.methodNotAllowed('POST');
        }
        const createBody = await request.json();
        return await handler.create(createBody, user);

      case 'PUT':
        if (!resourceId) {
          return FhirErrors.badRequest('Resource ID is required for PUT');
        }
        if (!handler.update) {
          return FhirErrors.methodNotAllowed('PUT');
        }
        const updateBody = await request.json();
        return await handler.update(resourceId, updateBody, user);

      case 'DELETE':
        if (!resourceId) {
          return FhirErrors.badRequest('Resource ID is required for DELETE');
        }
        if (!handler.delete) {
          return FhirErrors.methodNotAllowed('DELETE');
        }
        return await handler.delete(resourceId, user);

      default:
        return FhirErrors.methodNotAllowed(method);
    }
  } catch (error) {
    console.error(`[FHIR] Error handling ${method} ${resourceType}:`, error);
    return FhirErrors.serverError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Parse FHIR search parameters from URL
 */
export function parseSearchParams(searchParams: URLSearchParams): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};

  searchParams.forEach((value, key) => {
    const existing = params[key];
    if (existing) {
      params[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      params[key] = value;
    }
  });

  return params;
}
