import { NextResponse } from 'next/server';
import { validateGatewayAuth, hasScope } from '@/lib/gateway/auth';
import { handleFhirRequest } from '@/lib/fhir/router';
import { FhirErrors } from '@/lib/fhir/response';

// Import and register resource handlers
import '@/lib/fhir/resources/patient';
import '@/lib/fhir/resources/observation';

type RouteParams = {
  params: Promise<{
    version: string;
    path: string[];
  }>;
};

/**
 * GET /api/fhir/[version]/[resourceType]
 * GET /api/fhir/[version]/[resourceType]/[id]
 * 
 * Handles FHIR search and read operations
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { version, path } = await params;

  // Special case: metadata doesn't require auth
  if (path[0] === 'metadata' || path[0] === 'CapabilityStatement') {
    const { getCapabilityStatement } = await import('@/lib/fhir/capability');
    return getCapabilityStatement(request, version);
  }

  // Validate authentication
  const user = await validateGatewayAuth(request);
  if (!user) {
    return FhirErrors.unauthorized();
  }

  // Check scope for read operation
  const resourceType = path[0];
  if (!hasScope(user, resourceType, 'read')) {
    return FhirErrors.forbidden();
  }

  return handleFhirRequest('GET', version, path, request, user);
}

/**
 * POST /api/fhir/[version]/[resourceType]
 * 
 * Handles FHIR create operations
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { version, path } = await params;

  // Validate authentication
  const user = await validateGatewayAuth(request);
  if (!user) {
    return FhirErrors.unauthorized();
  }

  // Check scope for write operation
  const resourceType = path[0];
  if (!hasScope(user, resourceType, 'write')) {
    return FhirErrors.forbidden();
  }

  return handleFhirRequest('POST', version, path, request, user);
}

/**
 * PUT /api/fhir/[version]/[resourceType]/[id]
 * 
 * Handles FHIR update operations
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { version, path } = await params;

  // Validate authentication
  const user = await validateGatewayAuth(request);
  if (!user) {
    return FhirErrors.unauthorized();
  }

  // Check scope for write operation
  const resourceType = path[0];
  if (!hasScope(user, resourceType, 'write')) {
    return FhirErrors.forbidden();
  }

  return handleFhirRequest('PUT', version, path, request, user);
}

/**
 * DELETE /api/fhir/[version]/[resourceType]/[id]
 * 
 * Handles FHIR delete operations
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { version, path } = await params;

  // Validate authentication
  const user = await validateGatewayAuth(request);
  if (!user) {
    return FhirErrors.unauthorized();
  }

  // Check scope for delete operation
  const resourceType = path[0];
  if (!hasScope(user, resourceType, 'delete')) {
    return FhirErrors.forbidden();
  }

  return handleFhirRequest('DELETE', version, path, request, user);
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Tenant-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}
