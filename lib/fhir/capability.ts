import { NextResponse } from 'next/server';
import type { FhirCapabilityStatement } from './types';
import { FHIR_VERSION, NL_CORE_PROFILES } from './types';
import { fhirResponse } from './response';
import { getSupportedResources } from './router';

/**
 * Generate FHIR CapabilityStatement for this server
 */
export function getCapabilityStatement(
  request: Request,
  version: string
): NextResponse<FhirCapabilityStatement> {
  const url = new URL(request.url);
  const baseUrl = `${url.origin}/api/fhir/${version}`;

  const capabilityStatement: FhirCapabilityStatement = {
    resourceType: 'CapabilityStatement',
    id: 'medrecord-fhir-server',
    url: `${baseUrl}/metadata`,
    version: '1.0.0',
    name: 'MEDrecordFHIRServer',
    title: 'MEDrecord FHIR R4 Server',
    status: 'active',
    experimental: false,
    date: new Date().toISOString(),
    publisher: 'MEDrecord',
    contact: [
      {
        name: 'MEDrecord Support',
        telecom: [
          {
            system: 'url',
            value: 'https://medrecord.nl',
          },
        ],
      },
    ],
    description:
      'MEDrecord FHIR R4 Server implementing Dutch ZIB (nl-core) profiles for healthcare data exchange.',
    jurisdiction: [
      {
        coding: [
          {
            system: 'urn:iso:std:iso:3166',
            code: 'NL',
            display: 'Netherlands',
          },
        ],
      },
    ],
    purpose:
      'Provide FHIR R4 API access to healthcare data following Dutch ZIB standards.',
    kind: 'instance',
    software: {
      name: 'MEDrecord FHIR Server',
      version: '1.0.0',
    },
    implementation: {
      description: 'MEDrecord FHIR R4 Server',
      url: baseUrl,
    },
    fhirVersion: FHIR_VERSION,
    format: ['application/fhir+json', 'application/json'],
    rest: [
      {
        mode: 'server',
        documentation: 'RESTful FHIR server supporting Dutch ZIB profiles',
        security: {
          cors: true,
          service: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/restful-security-service',
                  code: 'SMART-on-FHIR',
                  display: 'SMART-on-FHIR',
                },
              ],
              text: 'MEDrecord Gateway authentication',
            },
          ],
          description:
            'Authentication is handled via MEDrecord Gateway. Requests must include valid session cookie or X-Api-Key header.',
        },
        resource: getResourceCapabilities(),
        interaction: [
          { code: 'transaction', documentation: 'Batch/transaction processing' },
          { code: 'search-system', documentation: 'System-wide search' },
        ],
      },
    ],
  };

  return fhirResponse(capabilityStatement);
}

/**
 * Get capability information for each supported resource
 */
function getResourceCapabilities(): FhirCapabilityStatement['rest'][0]['resource'] {
  const supportedResources = getSupportedResources();
  
  const resourceCapabilities: FhirCapabilityStatement['rest'][0]['resource'] = [];

  // Patient
  if (supportedResources.includes('Patient')) {
    resourceCapabilities.push({
      type: 'Patient',
      profile: NL_CORE_PROFILES.Patient,
      interaction: [
        { code: 'read' },
        { code: 'search-type' },
        { code: 'create' },
        { code: 'update' },
      ],
      versioning: 'versioned',
      readHistory: false,
      updateCreate: false,
      conditionalCreate: false,
      conditionalRead: 'not-supported',
      conditionalUpdate: false,
      conditionalDelete: 'not-supported',
      searchParam: [
        { name: '_id', type: 'token', documentation: 'Logical id of this resource' },
        { name: 'identifier', type: 'token', documentation: 'Patient identifier (e.g., BSN)' },
        { name: 'family', type: 'string', documentation: 'Family name' },
        { name: 'given', type: 'string', documentation: 'Given name' },
        { name: 'name', type: 'string', documentation: 'Full name (family + given)' },
        { name: 'birthdate', type: 'date', documentation: 'Birth date' },
        { name: 'gender', type: 'token', documentation: 'Gender' },
        { name: 'active', type: 'token', documentation: 'Active status' },
      ],
    });
  }

  // Practitioner
  if (supportedResources.includes('Practitioner')) {
    resourceCapabilities.push({
      type: 'Practitioner',
      profile: NL_CORE_PROFILES.Practitioner,
      interaction: [
        { code: 'read' },
        { code: 'search-type' },
      ],
      searchParam: [
        { name: '_id', type: 'token' },
        { name: 'identifier', type: 'token', documentation: 'AGB or BIG code' },
        { name: 'name', type: 'string' },
        { name: 'family', type: 'string' },
      ],
    });
  }

  // Observation
  if (supportedResources.includes('Observation')) {
    resourceCapabilities.push({
      type: 'Observation',
      profile: NL_CORE_PROFILES.Observation,
      supportedProfile: [
        NL_CORE_PROFILES.BloodPressure,
        NL_CORE_PROFILES.BodyWeight,
        NL_CORE_PROFILES.BodyHeight,
      ],
      interaction: [
        { code: 'read' },
        { code: 'search-type' },
        { code: 'create' },
        { code: 'update' },
      ],
      versioning: 'versioned',
      searchParam: [
        { name: '_id', type: 'token' },
        { name: 'patient', type: 'reference', documentation: 'Patient reference' },
        { name: 'subject', type: 'reference', documentation: 'Subject reference' },
        { name: 'code', type: 'token', documentation: 'Observation code (LOINC)' },
        { name: 'category', type: 'token', documentation: 'Observation category' },
        { name: 'date', type: 'date', documentation: 'Effective date' },
        { name: 'status', type: 'token', documentation: 'Observation status' },
      ],
    });
  }

  // Condition
  if (supportedResources.includes('Condition')) {
    resourceCapabilities.push({
      type: 'Condition',
      profile: NL_CORE_PROFILES.Condition,
      interaction: [
        { code: 'read' },
        { code: 'search-type' },
        { code: 'create' },
        { code: 'update' },
      ],
      searchParam: [
        { name: '_id', type: 'token' },
        { name: 'patient', type: 'reference' },
        { name: 'subject', type: 'reference' },
        { name: 'code', type: 'token', documentation: 'Condition code (SNOMED CT)' },
        { name: 'clinical-status', type: 'token' },
        { name: 'verification-status', type: 'token' },
        { name: 'onset-date', type: 'date' },
      ],
    });
  }

  // AllergyIntolerance
  if (supportedResources.includes('AllergyIntolerance')) {
    resourceCapabilities.push({
      type: 'AllergyIntolerance',
      profile: NL_CORE_PROFILES.AllergyIntolerance,
      interaction: [
        { code: 'read' },
        { code: 'search-type' },
        { code: 'create' },
      ],
      searchParam: [
        { name: '_id', type: 'token' },
        { name: 'patient', type: 'reference' },
        { name: 'code', type: 'token' },
        { name: 'clinical-status', type: 'token' },
        { name: 'criticality', type: 'token' },
      ],
    });
  }

  // MedicationRequest
  if (supportedResources.includes('MedicationRequest')) {
    resourceCapabilities.push({
      type: 'MedicationRequest',
      profile: NL_CORE_PROFILES.MedicationRequest,
      interaction: [
        { code: 'read' },
        { code: 'search-type' },
        { code: 'create' },
      ],
      searchParam: [
        { name: '_id', type: 'token' },
        { name: 'patient', type: 'reference' },
        { name: 'status', type: 'token' },
        { name: 'intent', type: 'token' },
        { name: 'medication', type: 'reference' },
        { name: 'authoredon', type: 'date' },
      ],
    });
  }

  // Encounter
  if (supportedResources.includes('Encounter')) {
    resourceCapabilities.push({
      type: 'Encounter',
      profile: NL_CORE_PROFILES.Encounter,
      interaction: [
        { code: 'read' },
        { code: 'search-type' },
        { code: 'create' },
      ],
      searchParam: [
        { name: '_id', type: 'token' },
        { name: 'patient', type: 'reference' },
        { name: 'subject', type: 'reference' },
        { name: 'status', type: 'token' },
        { name: 'class', type: 'token' },
        { name: 'date', type: 'date' },
      ],
    });
  }

  return resourceCapabilities;
}
