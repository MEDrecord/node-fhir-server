/**
 * FHIR API Router
 * 
 * Routes FHIR requests to appropriate resource handlers.
 * Handles authentication, authorization, and audit logging.
 */

import { NextResponse } from 'next/server';
import type { FhirRequestContext, GatewayUser } from '@/types/fhir';
import { validateGatewayAuth, hasScope, extractTenantId } from '@/lib/gateway/auth';
import { fhirError } from '@/lib/fhir/utils/response';
import { logAuditEvent } from '@/lib/supabase/client';

// Resource handlers - lazy loaded
const resourceHandlers: Record<string, () => Promise<ResourceHandler>> = {
  Patient: () => import('@/lib/fhir/resources/patient').then((m) => m.default),
  Observation: () => import('@/lib/fhir/resources/observation').then((m) => m.default),
  Condition: () => import('@/lib/fhir/resources/condition').then((m) => m.default),
  AllergyIntolerance: () => import('@/lib/fhir/resources/allergy-intolerance').then((m) => m.default),
  MedicationRequest: () => import('@/lib/fhir/resources/medication-request').then((m) => m.default),
  Encounter: () => import('@/lib/fhir/resources/encounter').then((m) => m.default),
  Practitioner: () => import('@/lib/fhir/resources/practitioner').then((m) => m.default),
  Organization: () => import('@/lib/fhir/resources/organization').then((m) => m.default),
};

// Supported FHIR versions
const SUPPORTED_VERSIONS = ['4_0_1', 'R4'];

/**
 * Resource handler interface
 */
export interface ResourceHandler {
  search: (params: Record<string, string | string[] | undefined>, context: FhirRequestContext) => Promise<NextResponse>;
  read: (id: string, context: FhirRequestContext) => Promise<NextResponse>;
  create: (resource: unknown, context: FhirRequestContext) => Promise<NextResponse>;
  update: (id: string, resource: unknown, context: FhirRequestContext) => Promise<NextResponse>;
  delete: (id: string, context: FhirRequestContext) => Promise<NextResponse>;
}

/**
 * Parse FHIR path into components
 * 
 * Patterns:
 * - /4_0_1/Patient -> search
 * - /4_0_1/Patient/123 -> read
 * - /4_0_1/Patient/123/_history -> history
 * - /metadata -> capability statement
 */
interface ParsedPath {
  version: string;
  resourceType: string;
  resourceId?: string;
  operation?: string;
}

function parseFhirPath(pathSegments: string[]): ParsedPath | null {
  if (pathSegments.length < 1) {
    return null;
  }

  // Handle metadata (CapabilityStatement) - can be at root or versioned
  if (pathSegments[0] === 'metadata' || pathSegments[1] === 'metadata') {
    return {
      version: pathSegments[0] === 'metadata' ? '4_0_1' : pathSegments[0],
      resourceType: 'CapabilityStatement',
      operation: 'metadata',
    };
  }

  // Version must be first segment
  const version = pathSegments[0];
  if (!SUPPORTED_VERSIONS.includes(version)) {
    return null;
  }

  if (pathSegments.length < 2) {
    return null;
  }

  const resourceType = pathSegments[1];
  const resourceId = pathSegments[2];
  const operation = pathSegments[3]; // e.g., _history

  return {
    version,
    resourceType,
    resourceId,
    operation,
  };
}

/**
 * Get base URL from request
 */
function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/api/fhir`;
}

/**
 * Main FHIR request handler
 */
export async function handleFhirRequest(
  method: string,
  pathSegments: string[],
  request: Request
): Promise<NextResponse> {
  const startTime = Date.now();
  let user: GatewayUser | null = null;
  let tenantId = '';
  let resourceType = '';
  let resourceId: string | null = null;

  try {
    // Parse the path
    const parsed = parseFhirPath(pathSegments);
    if (!parsed) {
      return fhirError(400, 'Invalid FHIR path', `Path: /${pathSegments.join('/')}`);
    }

    resourceType = parsed.resourceType;
    resourceId = parsed.resourceId || null;

    // Handle metadata without auth (FHIR spec allows this)
    if (parsed.operation === 'metadata') {
      const { getCapabilityStatement } = await import('@/lib/fhir/capability');
      return getCapabilityStatement(getBaseUrl(request), parsed.version);
    }

    // Authenticate via gateway
    user = await validateGatewayAuth(request);
    if (!user) {
      return fhirError(401, 'Unauthorized', 'Authentication required. Provide valid session cookie, API key, or Bearer token.');
    }

    tenantId = extractTenantId(request, user);

    // Build request context
    const context: FhirRequestContext = {
      user,
      tenantId,
      version: parsed.version,
      baseUrl: getBaseUrl(request),
    };

    // Check authorization
    const action = method === 'GET' || method === 'HEAD' ? 'read' : 'write';
    if (!hasScope(user, resourceType, action)) {
      await logAuditEvent(
        tenantId,
        user.id,
        'access_denied',
        resourceType,
        resourceId,
        { method, path: request.url, ip: request.headers.get('x-forwarded-for') || undefined },
        403
      );
      return fhirError(403, 'Forbidden', `Insufficient permissions for ${action} on ${resourceType}`);
    }

    // Get resource handler
    const handlerLoader = resourceHandlers[resourceType];
    if (!handlerLoader) {
      return fhirError(404, 'Unknown resource type', `Resource type '${resourceType}' is not supported`);
    }

    const handler = await handlerLoader();

    // Route to appropriate method
    let response: NextResponse;
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());

    switch (method) {
      case 'GET':
        if (parsed.resourceId) {
          response = await handler.read(parsed.resourceId, context);
        } else {
          response = await handler.search(searchParams, context);
        }
        break;

      case 'POST':
        const createBody = await request.json();
        response = await handler.create(createBody, context);
        break;

      case 'PUT':
        if (!parsed.resourceId) {
          return fhirError(400, 'Resource ID required', 'PUT requires a resource ID in the URL');
        }
        const updateBody = await request.json();
        response = await handler.update(parsed.resourceId, updateBody, context);
        break;

      case 'DELETE':
        if (!parsed.resourceId) {
          return fhirError(400, 'Resource ID required', 'DELETE requires a resource ID in the URL');
        }
        response = await handler.delete(parsed.resourceId, context);
        break;

      default:
        return fhirError(405, 'Method not allowed', `HTTP method '${method}' is not supported`);
    }

    // Audit successful request
    await logAuditEvent(
      tenantId,
      user.id,
      `${method.toLowerCase()}_${resourceType.toLowerCase()}`,
      resourceType,
      resourceId,
      { method, path: request.url, ip: request.headers.get('x-forwarded-for') || undefined },
      response.status,
      { duration_ms: Date.now() - startTime }
    );

    return response;
  } catch (error) {
    console.error('[FHIR Router] Error:', error);

    // Audit error
    if (user && tenantId) {
      await logAuditEvent(
        tenantId,
        user.id,
        'error',
        resourceType || 'unknown',
        resourceId,
        { method, path: request.url, ip: request.headers.get('x-forwarded-for') || undefined },
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }

    return fhirError(
      500,
      'Internal server error',
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}
