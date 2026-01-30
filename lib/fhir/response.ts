import { NextResponse } from 'next/server';
import type {
  FhirBundle,
  FhirOperationOutcome,
  FhirOperationOutcomeIssue,
  FhirResource,
  FhirResourceType,
} from './types';
import { FHIR_VERSION } from './types';

/**
 * Standard FHIR response headers
 */
const FHIR_HEADERS = {
  'Content-Type': 'application/fhir+json; charset=utf-8',
  'X-FHIR-Version': FHIR_VERSION,
};

/**
 * Create a FHIR-compliant JSON response
 */
export function fhirResponse<T extends FhirResource>(
  resource: T,
  status: number = 200,
  additionalHeaders?: Record<string, string>
): NextResponse<T> {
  return NextResponse.json(resource, {
    status,
    headers: {
      ...FHIR_HEADERS,
      ...additionalHeaders,
    },
  });
}

/**
 * Create a FHIR Bundle response for search results
 */
export function bundleResponse(
  resourceType: FhirResourceType,
  resources: FhirResource[],
  baseUrl: string,
  total?: number
): NextResponse<FhirBundle> {
  const bundle: FhirBundle = {
    resourceType: 'Bundle',
    type: 'searchset',
    total: total ?? resources.length,
    link: [
      {
        relation: 'self',
        url: baseUrl,
      },
    ],
    entry: resources.map((resource) => ({
      fullUrl: `${baseUrl}/${resource.id}`,
      resource,
      search: {
        mode: 'match',
      },
    })),
  };

  return fhirResponse(bundle);
}

/**
 * Create an OperationOutcome response
 */
export function operationOutcome(
  severity: FhirOperationOutcomeIssue['severity'],
  code: string,
  diagnostics: string,
  status: number = 400
): NextResponse<FhirOperationOutcome> {
  const outcome: FhirOperationOutcome = {
    resourceType: 'OperationOutcome',
    issue: [
      {
        severity,
        code,
        diagnostics,
      },
    ],
  };

  return fhirResponse(outcome, status);
}

/**
 * Common FHIR error responses
 */
export const FhirErrors = {
  unauthorized: () =>
    operationOutcome('error', 'login', 'Authentication required', 401),

  forbidden: () =>
    operationOutcome('error', 'forbidden', 'Insufficient permissions', 403),

  notFound: (resourceType: string, id: string) =>
    operationOutcome(
      'error',
      'not-found',
      `${resourceType}/${id} not found`,
      404
    ),

  badRequest: (message: string) =>
    operationOutcome('error', 'invalid', message, 400),

  serverError: (message: string = 'Internal server error') =>
    operationOutcome('fatal', 'exception', message, 500),

  methodNotAllowed: (method: string) =>
    operationOutcome(
      'error',
      'not-supported',
      `Method ${method} not supported`,
      405
    ),

  unsupportedResource: (resourceType: string) =>
    operationOutcome(
      'error',
      'not-supported',
      `Resource type ${resourceType} is not supported`,
      400
    ),
};

/**
 * Build a self URL for a FHIR request
 */
export function buildSelfUrl(
  request: Request,
  version: string,
  resourceType: string
): string {
  const url = new URL(request.url);
  return `${url.origin}/api/fhir/${version}/${resourceType}${url.search}`;
}

/**
 * Build a resource URL
 */
export function buildResourceUrl(
  request: Request,
  version: string,
  resourceType: string,
  id: string
): string {
  const url = new URL(request.url);
  return `${url.origin}/api/fhir/${version}/${resourceType}/${id}`;
}

/**
 * Add versioning headers for resource responses
 */
export function withVersionHeaders(
  response: NextResponse,
  versionId: string,
  lastUpdated: string
): NextResponse {
  response.headers.set('ETag', `W/"${versionId}"`);
  response.headers.set('Last-Modified', new Date(lastUpdated).toUTCString());
  return response;
}

/**
 * Created response (201) with Location header
 */
export function createdResponse(
  resource: FhirResource,
  location: string
): NextResponse {
  return fhirResponse(resource, 201, {
    Location: location,
  });
}

/**
 * No Content response (204)
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: FHIR_HEADERS,
  });
}
