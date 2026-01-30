import { NextResponse } from 'next/server';
import { generateOpenAPISpec } from '@/lib/openapi/spec';

// Import resource handlers to ensure they are registered
import '@/lib/fhir/resources/patient';
import '@/lib/fhir/resources/observation';

/**
 * GET /api/openapi
 * 
 * Returns the OpenAPI 3.0 specification for the FHIR server
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  
  const spec = generateOpenAPISpec(baseUrl);
  
  return NextResponse.json(spec, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
