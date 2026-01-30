/**
 * FHIR Response Utilities
 * 
 * Helpers for building FHIR-compliant responses including
 * Bundles, OperationOutcomes, and proper HTTP headers.
 */

import { NextResponse } from 'next/server';
import type {
  FhirBundle,
  FhirBundleEntry,
  FhirOperationOutcome,
  FhirOperationOutcomeIssue,
  FhirResource,
  FhirRequestContext,
} from '@/types/fhir';

// ============================================================================
// Bundle Builders
// ============================================================================

/**
 * Build a FHIR searchset Bundle
 */
export function buildSearchBundle(
  resources: FhirResource[],
  total: number,
  context: FhirRequestContext,
  searchParams?: Record<string, string>
): FhirBundle {
  const { baseUrl, version } = context;
  const resourceType = resources[0]?.resourceType || 'Resource';
  
  // Build self link with search params
  const selfUrl = new URL(`${baseUrl}/${version}/${resourceType}`);
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) selfUrl.searchParams.set(key, value);
    });
  }

  const entries: FhirBundleEntry[] = resources.map((resource) => ({
    fullUrl: `${baseUrl}/${version}/${resource.resourceType}/${resource.id}`,
    resource,
    search: {
      mode: 'match',
    },
  }));

  return {
    resourceType: 'Bundle',
    id: crypto.randomUUID(),
    meta: {
      lastUpdated: new Date().toISOString(),
    },
    type: 'searchset',
    total,
    link: [
      {
        relation: 'self',
        url: selfUrl.toString(),
      },
    ],
    entry: entries,
  };
}

/**
 * Build a FHIR history Bundle
 */
export function buildHistoryBundle(
  resources: FhirResource[],
  context: FhirRequestContext
): FhirBundle {
  const { baseUrl, version } = context;

  const entries: FhirBundleEntry[] = resources.map((resource) => ({
    fullUrl: `${baseUrl}/${version}/${resource.resourceType}/${resource.id}`,
    resource,
    request: {
      method: 'GET',
      url: `${resource.resourceType}/${resource.id}`,
    },
    response: {
      status: '200',
      lastModified: resource.meta?.lastUpdated,
    },
  }));

  return {
    resourceType: 'Bundle',
    id: crypto.randomUUID(),
    meta: {
      lastUpdated: new Date().toISOString(),
    },
    type: 'history',
    total: resources.length,
    entry: entries,
  };
}

// ============================================================================
// OperationOutcome Builders
// ============================================================================

/**
 * Issue code mappings based on HTTP status
 */
const issueCodeMap: Record<number, string> = {
  400: 'invalid',
  401: 'login',
  403: 'forbidden',
  404: 'not-found',
  405: 'not-supported',
  409: 'conflict',
  410: 'deleted',
  412: 'conflict',
  422: 'processing',
  500: 'exception',
  501: 'not-supported',
  503: 'transient',
};

/**
 * Build an OperationOutcome for errors
 */
export function buildOperationOutcome(
  severity: 'fatal' | 'error' | 'warning' | 'information',
  httpStatus: number,
  message: string,
  diagnostics?: string
): FhirOperationOutcome {
  const issue: FhirOperationOutcomeIssue = {
    severity,
    code: issueCodeMap[httpStatus] || 'exception',
    details: {
      text: message,
    },
    diagnostics,
  };

  return {
    resourceType: 'OperationOutcome',
    id: crypto.randomUUID(),
    issue: [issue],
  };
}

/**
 * Build a success OperationOutcome
 */
export function buildSuccessOutcome(message: string): FhirOperationOutcome {
  return {
    resourceType: 'OperationOutcome',
    id: crypto.randomUUID(),
    issue: [
      {
        severity: 'information',
        code: 'informational',
        details: {
          text: message,
        },
      },
    ],
  };
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Common FHIR response headers
 */
function getFhirHeaders(
  contentType: 'json' | 'xml' = 'json',
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  return {
    'Content-Type': contentType === 'json' 
      ? 'application/fhir+json; charset=utf-8' 
      : 'application/fhir+xml; charset=utf-8',
    'X-Request-Id': crypto.randomUUID(),
    ...additionalHeaders,
  };
}

/**
 * Return a FHIR resource response
 */
export function fhirResponse(
  resource: FhirResource | FhirBundle | FhirOperationOutcome,
  status: number = 200,
  additionalHeaders?: Record<string, string>
): NextResponse {
  const headers = getFhirHeaders('json', additionalHeaders);
  
  // Add ETag for versioned resources
  if ('meta' in resource && resource.meta?.versionId) {
    headers['ETag'] = `W/"${resource.meta.versionId}"`;
  }
  
  // Add Last-Modified if available
  if ('meta' in resource && resource.meta?.lastUpdated) {
    headers['Last-Modified'] = new Date(resource.meta.lastUpdated).toUTCString();
  }

  return NextResponse.json(resource, {
    status,
    headers,
  });
}

/**
 * Return an error response with OperationOutcome
 */
export function fhirError(
  status: number,
  message: string,
  diagnostics?: string
): NextResponse {
  const outcome = buildOperationOutcome(
    status >= 500 ? 'fatal' : 'error',
    status,
    message,
    diagnostics
  );

  return NextResponse.json(outcome, {
    status,
    headers: getFhirHeaders('json'),
  });
}

/**
 * Return a 201 Created response with Location header
 */
export function fhirCreated(
  resource: FhirResource,
  context: FhirRequestContext
): NextResponse {
  const { baseUrl, version } = context;
  const location = `${baseUrl}/${version}/${resource.resourceType}/${resource.id}`;
  
  return fhirResponse(resource, 201, {
    'Location': location,
  });
}

/**
 * Return a 204 No Content response (for delete)
 */
export function fhirNoContent(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getFhirHeaders('json'),
  });
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that a resource type matches expected type
 */
export function validateResourceType(
  resource: unknown,
  expectedType: string
): resource is FhirResource {
  if (!resource || typeof resource !== 'object') {
    return false;
  }
  
  const r = resource as Record<string, unknown>;
  return r.resourceType === expectedType;
}

/**
 * Parse and validate FHIR search parameters
 */
export function parseSearchParams(
  searchParams: URLSearchParams
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {};
  
  searchParams.forEach((value, key) => {
    // Handle multiple values for same parameter
    if (params[key]) {
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  });
  
  return params;
}

/**
 * Extract pagination parameters
 */
export function extractPagination(
  params: Record<string, string | string[] | undefined>
): { count: number; offset: number } {
  const countParam = params['_count'];
  const offsetParam = params['_offset'];
  
  const count = typeof countParam === 'string' ? parseInt(countParam, 10) : 50;
  const offset = typeof offsetParam === 'string' ? parseInt(offsetParam, 10) : 0;
  
  return {
    count: isNaN(count) || count < 1 ? 50 : Math.min(count, 1000), // Max 1000
    offset: isNaN(offset) || offset < 0 ? 0 : offset,
  };
}
