/**
 * FHIR API Route Handler
 * 
 * Catch-all route for all FHIR API requests.
 * Routes: /api/fhir/4_0_1/{ResourceType}[/{id}]
 */

import { handleFhirRequest } from '@/lib/fhir/router';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Search or Read
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleFhirRequest('GET', path, request);
}

/**
 * POST - Create
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleFhirRequest('POST', path, request);
}

/**
 * PUT - Update
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleFhirRequest('PUT', path, request);
}

/**
 * DELETE - Delete
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return handleFhirRequest('DELETE', path, request);
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key, X-Tenant-ID',
      'Access-Control-Max-Age': '86400',
    },
  });
}
