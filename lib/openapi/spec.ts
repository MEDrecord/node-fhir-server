/**
 * OpenAPI 3.0 Specification Generator for FHIR R4 Server
 * Generates spec from CapabilityStatement and registered resources
 */

import { getSupportedResources } from '@/lib/fhir/router';
import { NL_CORE_PROFILES, FHIR_VERSION } from '@/lib/fhir/types';

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: {
      name?: string;
      url?: string;
      email?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  tags: Array<{
    name: string;
    description?: string;
    externalDocs?: {
      description: string;
      url: string;
    };
  }>;
  paths: Record<string, PathItem>;
  components: {
    securitySchemes?: Record<string, SecurityScheme>;
    schemas?: Record<string, Schema>;
    parameters?: Record<string, Parameter>;
    responses?: Record<string, Response>;
  };
  security?: Array<Record<string, string[]>>;
  externalDocs?: {
    description: string;
    url: string;
  };
}

interface PathItem {
  summary?: string;
  description?: string;
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  parameters?: Parameter[];
}

interface Operation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security?: Array<Record<string, string[]>>;
}

interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required?: boolean;
  schema: Schema;
  example?: unknown;
}

interface RequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, MediaType>;
}

interface Response {
  description: string;
  content?: Record<string, MediaType>;
  headers?: Record<string, { description: string; schema: Schema }>;
}

interface MediaType {
  schema?: Schema;
  example?: unknown;
  examples?: Record<string, { summary?: string; value: unknown }>;
}

interface Schema {
  type?: string;
  format?: string;
  description?: string;
  enum?: string[];
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
  $ref?: string;
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  example?: unknown;
}

interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
}

// Resource-specific search parameters
const RESOURCE_SEARCH_PARAMS: Record<string, Parameter[]> = {
  Patient: [
    { name: '_id', in: 'query', description: 'Logical id of the resource', schema: { type: 'string' } },
    { name: 'identifier', in: 'query', description: 'Patient identifier (e.g., BSN). Format: system|value or just value', schema: { type: 'string' }, example: 'http://fhir.nl/fhir/NamingSystem/bsn|123456789' },
    { name: 'family', in: 'query', description: 'Family name (partial match supported)', schema: { type: 'string' } },
    { name: 'given', in: 'query', description: 'Given name (partial match supported)', schema: { type: 'string' } },
    { name: 'name', in: 'query', description: 'Full name search (family + given)', schema: { type: 'string' } },
    { name: 'birthdate', in: 'query', description: 'Birth date (YYYY-MM-DD)', schema: { type: 'string', format: 'date' } },
    { name: 'gender', in: 'query', description: 'Gender code', schema: { type: 'string', enum: ['male', 'female', 'other', 'unknown'] } },
    { name: 'active', in: 'query', description: 'Active status', schema: { type: 'boolean' } },
  ],
  Observation: [
    { name: '_id', in: 'query', description: 'Logical id of the resource', schema: { type: 'string' } },
    { name: 'patient', in: 'query', description: 'Patient reference (Patient/id)', schema: { type: 'string' }, example: 'Patient/123' },
    { name: 'subject', in: 'query', description: 'Subject reference (alias for patient)', schema: { type: 'string' } },
    { name: 'code', in: 'query', description: 'Observation code (LOINC). Format: system|code or just code', schema: { type: 'string' }, example: 'http://loinc.org|85354-9' },
    { name: 'category', in: 'query', description: 'Observation category', schema: { type: 'string' }, example: 'vital-signs' },
    { name: 'status', in: 'query', description: 'Observation status', schema: { type: 'string', enum: ['registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error', 'unknown'] } },
    { name: 'date', in: 'query', description: 'Effective date (supports prefixes: eq, ne, lt, le, gt, ge)', schema: { type: 'string' }, example: 'ge2024-01-01' },
  ],
  Condition: [
    { name: '_id', in: 'query', description: 'Logical id of the resource', schema: { type: 'string' } },
    { name: 'patient', in: 'query', description: 'Patient reference', schema: { type: 'string' } },
    { name: 'subject', in: 'query', description: 'Subject reference', schema: { type: 'string' } },
    { name: 'code', in: 'query', description: 'Condition code (SNOMED CT)', schema: { type: 'string' } },
    { name: 'clinical-status', in: 'query', description: 'Clinical status', schema: { type: 'string' } },
    { name: 'verification-status', in: 'query', description: 'Verification status', schema: { type: 'string' } },
    { name: 'onset-date', in: 'query', description: 'Onset date', schema: { type: 'string', format: 'date' } },
  ],
  Practitioner: [
    { name: '_id', in: 'query', description: 'Logical id of the resource', schema: { type: 'string' } },
    { name: 'identifier', in: 'query', description: 'Practitioner identifier (AGB/BIG)', schema: { type: 'string' } },
    { name: 'name', in: 'query', description: 'Name search', schema: { type: 'string' } },
    { name: 'family', in: 'query', description: 'Family name', schema: { type: 'string' } },
  ],
  AllergyIntolerance: [
    { name: '_id', in: 'query', description: 'Logical id of the resource', schema: { type: 'string' } },
    { name: 'patient', in: 'query', description: 'Patient reference', schema: { type: 'string' } },
    { name: 'code', in: 'query', description: 'Allergy/intolerance code', schema: { type: 'string' } },
    { name: 'clinical-status', in: 'query', description: 'Clinical status', schema: { type: 'string' } },
    { name: 'criticality', in: 'query', description: 'Criticality level', schema: { type: 'string', enum: ['low', 'high', 'unable-to-assess'] } },
  ],
  MedicationRequest: [
    { name: '_id', in: 'query', description: 'Logical id of the resource', schema: { type: 'string' } },
    { name: 'patient', in: 'query', description: 'Patient reference', schema: { type: 'string' } },
    { name: 'status', in: 'query', description: 'Request status', schema: { type: 'string' } },
    { name: 'intent', in: 'query', description: 'Request intent', schema: { type: 'string' } },
    { name: 'medication', in: 'query', description: 'Medication reference', schema: { type: 'string' } },
    { name: 'authoredon', in: 'query', description: 'Authored date', schema: { type: 'string', format: 'date' } },
  ],
  Encounter: [
    { name: '_id', in: 'query', description: 'Logical id of the resource', schema: { type: 'string' } },
    { name: 'patient', in: 'query', description: 'Patient reference', schema: { type: 'string' } },
    { name: 'subject', in: 'query', description: 'Subject reference', schema: { type: 'string' } },
    { name: 'status', in: 'query', description: 'Encounter status', schema: { type: 'string' } },
    { name: 'class', in: 'query', description: 'Encounter class', schema: { type: 'string' } },
    { name: 'date', in: 'query', description: 'Encounter date', schema: { type: 'string', format: 'date' } },
  ],
};

// Common pagination parameters
const PAGINATION_PARAMS: Parameter[] = [
  { name: '_count', in: 'query', description: 'Number of results per page (default: 20, max: 100)', schema: { type: 'integer', format: 'int32' }, example: 20 },
  { name: '_offset', in: 'query', description: 'Starting offset for pagination', schema: { type: 'integer', format: 'int32' }, example: 0 },
];

// Example resources for "Try it out"
const RESOURCE_EXAMPLES: Record<string, unknown> = {
  Patient: {
    resourceType: 'Patient',
    identifier: [
      {
        use: 'official',
        system: 'http://fhir.nl/fhir/NamingSystem/bsn',
        value: '123456789',
      },
    ],
    active: true,
    name: [
      {
        use: 'official',
        family: 'Jansen',
        given: ['Jan', 'Pieter'],
        prefix: ['Dhr.'],
      },
    ],
    telecom: [
      {
        system: 'phone',
        value: '+31612345678',
        use: 'mobile',
      },
      {
        system: 'email',
        value: 'jan.jansen@example.nl',
        use: 'home',
      },
    ],
    gender: 'male',
    birthDate: '1980-05-15',
    address: [
      {
        use: 'home',
        type: 'physical',
        line: ['Kerkstraat 123'],
        city: 'Amsterdam',
        postalCode: '1012 AB',
        country: 'NL',
      },
    ],
  },
  Observation: {
    resourceType: 'Observation',
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '85354-9',
          display: 'Blood pressure panel with all children optional',
        },
      ],
    },
    subject: {
      reference: 'Patient/example-patient-id',
      display: 'Jan Jansen',
    },
    effectiveDateTime: '2024-01-15T10:30:00+01:00',
    component: [
      {
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '8480-6',
              display: 'Systolic blood pressure',
            },
          ],
        },
        valueQuantity: {
          value: 120,
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
      {
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '8462-4',
              display: 'Diastolic blood pressure',
            },
          ],
        },
        valueQuantity: {
          value: 80,
          unit: 'mmHg',
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
    ],
  },
  Condition: {
    resourceType: 'Condition',
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active',
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
          display: 'Confirmed',
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item',
            display: 'Problem List Item',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: '38341003',
          display: 'Hypertensive disorder',
        },
      ],
    },
    subject: {
      reference: 'Patient/example-patient-id',
    },
    onsetDateTime: '2023-06-01',
    recordedDate: '2023-06-15',
  },
};

// Resource descriptions with nl-core profile info
const RESOURCE_DESCRIPTIONS: Record<string, { description: string; profile: string }> = {
  Patient: {
    description: 'Patient demographics and identifiers following the Dutch nl-core-Patient profile. Includes BSN (Burgerservicenummer) support.',
    profile: NL_CORE_PROFILES.Patient,
  },
  Practitioner: {
    description: 'Healthcare professionals following the nl-core-HealthProfessional profile. Supports AGB and BIG identifiers.',
    profile: NL_CORE_PROFILES.Practitioner,
  },
  Observation: {
    description: 'Clinical observations including vitals and lab results. Supports nl-core profiles for BloodPressure, BodyWeight, BodyHeight, and LaboratoryTestResult.',
    profile: NL_CORE_PROFILES.Observation,
  },
  Condition: {
    description: 'Problems, diagnoses, and complaints following the nl-core-Problem profile.',
    profile: NL_CORE_PROFILES.Condition,
  },
  AllergyIntolerance: {
    description: 'Allergies and intolerances following the nl-core-AllergyIntolerance profile.',
    profile: NL_CORE_PROFILES.AllergyIntolerance,
  },
  MedicationRequest: {
    description: 'Medication prescriptions and agreements following the nl-core-MedicationAgreement profile.',
    profile: NL_CORE_PROFILES.MedicationRequest,
  },
  Encounter: {
    description: 'Healthcare encounters and visits following the nl-core-Encounter profile.',
    profile: NL_CORE_PROFILES.Encounter,
  },
};

/**
 * Generate OpenAPI specification for the FHIR server
 */
export function generateOpenAPISpec(baseUrl: string): OpenAPISpec {
  const supportedResources = getSupportedResources();
  
  const spec: OpenAPISpec = {
    openapi: '3.0.3',
    info: {
      title: 'MEDrecord FHIR R4 API',
      description: `
## Dutch ZIB-Compliant FHIR R4 Server

This API provides FHIR R4 access to healthcare data following Dutch ZIB (Zorginformatiebouwstenen) standards 
via nl-core profiles from Nictiz.

### Key Features
- **FHIR R4 (${FHIR_VERSION})** compliant
- **Dutch nl-core profiles** for interoperability
- **Multi-tenant** architecture with tenant isolation
- **Role-based access control** (RBAC)
- **EHDS-ready** for European Health Data Space compliance

### Authentication
All endpoints (except \`/metadata\`) require authentication via:
- **Session Cookie**: For web applications
- **X-Api-Key Header**: For server-to-server communication

Additionally, all requests must include:
- **X-Tenant-ID Header**: For multi-tenant access control

### Dutch Code Systems
- **BSN**: \`http://fhir.nl/fhir/NamingSystem/bsn\`
- **AGB**: \`http://fhir.nl/fhir/NamingSystem/agb-z\`
- **BIG**: \`http://fhir.nl/fhir/NamingSystem/big\`

### Search Syntax
- Token parameters support \`system|value\` or just \`value\`
- Date parameters support prefixes: \`eq\`, \`ne\`, \`lt\`, \`le\`, \`gt\`, \`ge\`
- String parameters support partial matching

### More Information
- [FHIR R4 Specification](https://hl7.org/fhir/R4/)
- [Nictiz nl-core Profiles](https://simplifier.net/nictiz-r4-zib2020)
- [MEDrecord Documentation](https://medrecord.nl/docs)
      `.trim(),
      version: '1.0.0',
      contact: {
        name: 'MEDrecord Support',
        url: 'https://medrecord.nl',
        email: 'support@medrecord.nl',
      },
      license: {
        name: 'Proprietary',
        url: 'https://medrecord.nl/license',
      },
    },
    servers: [
      {
        url: `${baseUrl}/api/fhir/4_0_1`,
        description: 'FHIR R4 Server (v4.0.1)',
      },
    ],
    tags: [
      {
        name: 'Capability',
        description: 'Server capability and metadata',
        externalDocs: {
          description: 'FHIR CapabilityStatement',
          url: 'https://hl7.org/fhir/R4/capabilitystatement.html',
        },
      },
      ...supportedResources.map((resource) => ({
        name: resource,
        description: RESOURCE_DESCRIPTIONS[resource]?.description || `${resource} resource operations`,
        externalDocs: {
          description: `FHIR ${resource} Resource`,
          url: `https://hl7.org/fhir/R4/${resource.toLowerCase()}.html`,
        },
      })),
    ],
    paths: {
      '/metadata': {
        get: {
          tags: ['Capability'],
          summary: 'Get CapabilityStatement',
          description: 'Returns the server\'s CapabilityStatement describing supported resources and operations. This endpoint does not require authentication.',
          operationId: 'getCapabilityStatement',
          responses: {
            '200': {
              description: 'CapabilityStatement resource',
              content: {
                'application/fhir+json': {
                  schema: { $ref: '#/components/schemas/CapabilityStatement' },
                },
              },
            },
          },
          security: [], // No auth required
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Api-Key',
          description: 'API key for server-to-server authentication',
        },
        SessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
          description: 'Session cookie for web application authentication',
        },
      },
      parameters: {
        TenantId: {
          name: 'X-Tenant-ID',
          in: 'header',
          required: true,
          description: 'Tenant identifier for multi-tenant access control',
          schema: { type: 'string' },
          example: 'tenant-123',
        },
        ResourceId: {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Logical id of the resource',
          schema: { type: 'string' },
          example: 'abc-123-def-456',
        },
      },
      schemas: {
        CapabilityStatement: {
          type: 'object',
          description: 'FHIR CapabilityStatement resource',
          properties: {
            resourceType: { type: 'string', enum: ['CapabilityStatement'] },
            status: { type: 'string', enum: ['draft', 'active', 'retired', 'unknown'] },
            fhirVersion: { type: 'string', example: FHIR_VERSION },
          },
        },
        Bundle: {
          type: 'object',
          description: 'FHIR Bundle containing search results',
          properties: {
            resourceType: { type: 'string', enum: ['Bundle'] },
            type: { type: 'string', enum: ['searchset'] },
            total: { type: 'integer', description: 'Total number of matching resources' },
            link: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  relation: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
            entry: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fullUrl: { type: 'string' },
                  resource: { type: 'object' },
                },
              },
            },
          },
        },
        OperationOutcome: {
          type: 'object',
          description: 'FHIR OperationOutcome for error responses',
          properties: {
            resourceType: { type: 'string', enum: ['OperationOutcome'] },
            issue: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  severity: { type: 'string', enum: ['fatal', 'error', 'warning', 'information'] },
                  code: { type: 'string' },
                  diagnostics: { type: 'string' },
                },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/fhir+json': {
              schema: { $ref: '#/components/schemas/OperationOutcome' },
              example: {
                resourceType: 'OperationOutcome',
                issue: [{
                  severity: 'error',
                  code: 'security',
                  diagnostics: 'Authentication required',
                }],
              },
            },
          },
        },
        Forbidden: {
          description: 'Access denied - insufficient permissions',
          content: {
            'application/fhir+json': {
              schema: { $ref: '#/components/schemas/OperationOutcome' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/fhir+json': {
              schema: { $ref: '#/components/schemas/OperationOutcome' },
            },
          },
        },
        BadRequest: {
          description: 'Invalid request',
          content: {
            'application/fhir+json': {
              schema: { $ref: '#/components/schemas/OperationOutcome' },
            },
          },
        },
      },
    },
    security: [
      { ApiKeyAuth: [] },
      { SessionCookie: [] },
    ],
    externalDocs: {
      description: 'FHIR R4 Specification',
      url: 'https://hl7.org/fhir/R4/',
    },
  };

  // Add resource schemas with examples
  for (const resource of supportedResources) {
    const resourceInfo = RESOURCE_DESCRIPTIONS[resource];
    const resourceExample = RESOURCE_EXAMPLES[resource];
    spec.components.schemas![resource] = {
      type: 'object',
      description: resourceInfo?.description || `FHIR ${resource} resource`,
      properties: {
        resourceType: { type: 'string', enum: [resource] },
        id: { type: 'string', description: 'Logical id of the resource' },
        meta: {
          type: 'object',
          properties: {
            versionId: { type: 'string' },
            lastUpdated: { type: 'string', format: 'date-time' },
            profile: {
              type: 'array',
              items: { type: 'string' },
              example: resourceInfo ? [resourceInfo.profile] : [],
            },
          },
        },
      },
      example: resourceExample,
    };
  }

  // Add paths for each supported resource
  for (const resource of supportedResources) {
    const resourceInfo = RESOURCE_DESCRIPTIONS[resource];
    const searchParams = RESOURCE_SEARCH_PARAMS[resource] || [];

    // Search endpoint: GET /{ResourceType}
    spec.paths[`/${resource}`] = {
      get: {
        tags: [resource],
        summary: `Search ${resource} resources`,
        description: `Search for ${resource} resources with optional filters.\n\n**Profile**: \`${resourceInfo?.profile || 'N/A'}\``,
        operationId: `search${resource}`,
        parameters: [
          { $ref: '#/components/parameters/TenantId' } as unknown as Parameter,
          ...searchParams,
          ...PAGINATION_PARAMS,
        ],
        responses: {
          '200': {
            description: `Bundle of matching ${resource} resources`,
            content: {
              'application/fhir+json': {
                schema: { $ref: '#/components/schemas/Bundle' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' } as unknown as Response,
          '403': { $ref: '#/components/responses/Forbidden' } as unknown as Response,
        },
      },
      post: {
        tags: [resource],
        summary: `Create ${resource}`,
        description: `Create a new ${resource} resource.\n\n**Profile**: \`${resourceInfo?.profile || 'N/A'}\``,
        operationId: `create${resource}`,
        parameters: [
          { $ref: '#/components/parameters/TenantId' } as unknown as Parameter,
        ],
        requestBody: {
          required: true,
          description: `${resource} resource to create`,
          content: {
            'application/fhir+json': {
              schema: { $ref: `#/components/schemas/${resource}` },
              example: RESOURCE_EXAMPLES[resource],
            },
          },
        },
        responses: {
          '201': {
            description: `${resource} created successfully`,
            headers: {
              Location: {
                description: 'URL of the created resource',
                schema: { type: 'string' },
              },
              ETag: {
                description: 'Version identifier',
                schema: { type: 'string' },
              },
            },
            content: {
              'application/fhir+json': {
                schema: { $ref: `#/components/schemas/${resource}` },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' } as unknown as Response,
          '401': { $ref: '#/components/responses/Unauthorized' } as unknown as Response,
          '403': { $ref: '#/components/responses/Forbidden' } as unknown as Response,
        },
      },
    };

    // Read/Update endpoint: GET/PUT /{ResourceType}/{id}
    spec.paths[`/${resource}/{id}`] = {
      get: {
        tags: [resource],
        summary: `Read ${resource}`,
        description: `Read a specific ${resource} resource by ID.\n\n**Profile**: \`${resourceInfo?.profile || 'N/A'}\``,
        operationId: `read${resource}`,
        parameters: [
          { $ref: '#/components/parameters/TenantId' } as unknown as Parameter,
          { $ref: '#/components/parameters/ResourceId' } as unknown as Parameter,
        ],
        responses: {
          '200': {
            description: `${resource} resource`,
            headers: {
              ETag: {
                description: 'Version identifier',
                schema: { type: 'string' },
              },
              'Last-Modified': {
                description: 'Last modification timestamp',
                schema: { type: 'string' },
              },
            },
            content: {
              'application/fhir+json': {
                schema: { $ref: `#/components/schemas/${resource}` },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' } as unknown as Response,
          '403': { $ref: '#/components/responses/Forbidden' } as unknown as Response,
          '404': { $ref: '#/components/responses/NotFound' } as unknown as Response,
        },
      },
      put: {
        tags: [resource],
        summary: `Update ${resource}`,
        description: `Update an existing ${resource} resource.\n\n**Profile**: \`${resourceInfo?.profile || 'N/A'}\``,
        operationId: `update${resource}`,
        parameters: [
          { $ref: '#/components/parameters/TenantId' } as unknown as Parameter,
          { $ref: '#/components/parameters/ResourceId' } as unknown as Parameter,
        ],
        requestBody: {
          required: true,
          description: `Updated ${resource} resource`,
          content: {
            'application/fhir+json': {
              schema: { $ref: `#/components/schemas/${resource}` },
              example: RESOURCE_EXAMPLES[resource],
            },
          },
        },
        responses: {
          '200': {
            description: `${resource} updated successfully`,
            headers: {
              ETag: {
                description: 'New version identifier',
                schema: { type: 'string' },
              },
              'Last-Modified': {
                description: 'Modification timestamp',
                schema: { type: 'string' },
              },
            },
            content: {
              'application/fhir+json': {
                schema: { $ref: `#/components/schemas/${resource}` },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' } as unknown as Response,
          '401': { $ref: '#/components/responses/Unauthorized' } as unknown as Response,
          '403': { $ref: '#/components/responses/Forbidden' } as unknown as Response,
          '404': { $ref: '#/components/responses/NotFound' } as unknown as Response,
        },
      },
    };
  }

  return spec;
}
