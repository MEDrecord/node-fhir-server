/**
 * FHIR CapabilityStatement (Conformance Resource)
 * 
 * Describes the server's capabilities per the FHIR specification.
 * Available at /metadata endpoint without authentication.
 */

import { NextResponse } from 'next/server';
import type { FhirCapabilityStatement, FhirCapabilityStatementRestResource } from '@/types/fhir';
import { fhirResponse } from '@/lib/fhir/utils/response';

// Server metadata
const SERVER_NAME = 'MEDrecord FHIR Server';
const SERVER_VERSION = '1.0.0';
const PUBLISHER = 'MEDrecord';
const FHIR_VERSION = '4.0.1';

// nl-core profile base URL
const NL_CORE_BASE = 'http://nictiz.nl/fhir/StructureDefinition';

/**
 * Resource definitions with supported operations and search parameters
 */
const resourceDefinitions: FhirCapabilityStatementRestResource[] = [
  {
    type: 'Patient',
    profile: `${NL_CORE_BASE}/nl-core-Patient`,
    supportedProfile: [`${NL_CORE_BASE}/nl-core-Patient`],
    documentation: 'Dutch ZIB Patient (nl-core-Patient) resource',
    interaction: [
      { code: 'read', documentation: 'Read a patient by ID' },
      { code: 'search-type', documentation: 'Search for patients' },
      { code: 'create', documentation: 'Create a new patient' },
      { code: 'update', documentation: 'Update an existing patient' },
      { code: 'delete', documentation: 'Delete (deactivate) a patient' },
    ],
    versioning: 'versioned',
    readHistory: false,
    updateCreate: false,
    conditionalCreate: false,
    conditionalUpdate: false,
    conditionalDelete: 'not-supported',
    searchParam: [
      { name: '_id', type: 'token', documentation: 'The logical ID of the resource' },
      { name: 'identifier', type: 'token', documentation: 'Patient identifier (BSN)' },
      { name: 'family', type: 'string', documentation: 'Family name' },
      { name: 'given', type: 'string', documentation: 'Given name' },
      { name: 'name', type: 'string', documentation: 'Family or given name' },
      { name: 'birthdate', type: 'date', documentation: 'Birth date' },
      { name: 'gender', type: 'token', documentation: 'Gender' },
    ],
  },
  {
    type: 'Practitioner',
    profile: `${NL_CORE_BASE}/nl-core-HealthProfessional-Practitioner`,
    supportedProfile: [`${NL_CORE_BASE}/nl-core-HealthProfessional-Practitioner`],
    documentation: 'Dutch ZIB HealthProfessional (nl-core-HealthProfessional) resource',
    interaction: [
      { code: 'read', documentation: 'Read a practitioner by ID' },
      { code: 'search-type', documentation: 'Search for practitioners' },
      { code: 'create', documentation: 'Create a new practitioner' },
      { code: 'update', documentation: 'Update an existing practitioner' },
    ],
    versioning: 'versioned',
    searchParam: [
      { name: '_id', type: 'token', documentation: 'The logical ID of the resource' },
      { name: 'identifier', type: 'token', documentation: 'AGB or BIG code' },
      { name: 'family', type: 'string', documentation: 'Family name' },
      { name: 'given', type: 'string', documentation: 'Given name' },
    ],
  },
  {
    type: 'Organization',
    profile: `${NL_CORE_BASE}/nl-core-HealthcareProvider-Organization`,
    supportedProfile: [`${NL_CORE_BASE}/nl-core-HealthcareProvider-Organization`],
    documentation: 'Dutch ZIB HealthcareProvider (nl-core-HealthcareProvider) resource',
    interaction: [
      { code: 'read', documentation: 'Read an organization by ID' },
      { code: 'search-type', documentation: 'Search for organizations' },
      { code: 'create', documentation: 'Create a new organization' },
      { code: 'update', documentation: 'Update an existing organization' },
    ],
    versioning: 'versioned',
    searchParam: [
      { name: '_id', type: 'token', documentation: 'The logical ID of the resource' },
      { name: 'identifier', type: 'token', documentation: 'Organization identifier' },
      { name: 'name', type: 'string', documentation: 'Organization name' },
    ],
  },
  {
    type: 'Observation',
    profile: `${NL_CORE_BASE}/nl-core-LaboratoryTestResult`,
    supportedProfile: [
      `${NL_CORE_BASE}/nl-core-BloodPressure`,
      `${NL_CORE_BASE}/nl-core-BodyWeight`,
      `${NL_CORE_BASE}/nl-core-BodyHeight`,
      `${NL_CORE_BASE}/nl-core-LaboratoryTestResult`,
    ],
    documentation: 'Observations including vital signs (BloodPressure, BodyWeight, BodyHeight) and laboratory results',
    interaction: [
      { code: 'read', documentation: 'Read an observation by ID' },
      { code: 'search-type', documentation: 'Search for observations' },
      { code: 'create', documentation: 'Create a new observation' },
      { code: 'update', documentation: 'Update an existing observation' },
      { code: 'delete', documentation: 'Delete an observation' },
    ],
    versioning: 'versioned',
    searchParam: [
      { name: '_id', type: 'token', documentation: 'The logical ID of the resource' },
      { name: 'patient', type: 'reference', documentation: 'The patient the observation is about' },
      { name: 'subject', type: 'reference', documentation: 'The subject of the observation' },
      { name: 'code', type: 'token', documentation: 'The code of the observation (LOINC)' },
      { name: 'category', type: 'token', documentation: 'Category of the observation' },
      { name: 'status', type: 'token', documentation: 'Status of the observation' },
      { name: 'date', type: 'date', documentation: 'Effective date of the observation' },
    ],
  },
  {
    type: 'Condition',
    profile: `${NL_CORE_BASE}/nl-core-Problem`,
    supportedProfile: [`${NL_CORE_BASE}/nl-core-Problem`],
    documentation: 'Dutch ZIB Problem (nl-core-Problem) resource',
    interaction: [
      { code: 'read', documentation: 'Read a condition by ID' },
      { code: 'search-type', documentation: 'Search for conditions' },
      { code: 'create', documentation: 'Create a new condition' },
      { code: 'update', documentation: 'Update an existing condition' },
    ],
    versioning: 'versioned',
    searchParam: [
      { name: '_id', type: 'token', documentation: 'The logical ID of the resource' },
      { name: 'patient', type: 'reference', documentation: 'The patient with the condition' },
      { name: 'code', type: 'token', documentation: 'The code of the condition (SNOMED CT)' },
      { name: 'clinical-status', type: 'token', documentation: 'Clinical status of the condition' },
      { name: 'verification-status', type: 'token', documentation: 'Verification status' },
      { name: 'category', type: 'token', documentation: 'Category of the condition' },
    ],
  },
  {
    type: 'AllergyIntolerance',
    profile: `${NL_CORE_BASE}/nl-core-AllergyIntolerance`,
    supportedProfile: [`${NL_CORE_BASE}/nl-core-AllergyIntolerance`],
    documentation: 'Dutch ZIB AllergyIntolerance (nl-core-AllergyIntolerance) resource',
    interaction: [
      { code: 'read', documentation: 'Read an allergy by ID' },
      { code: 'search-type', documentation: 'Search for allergies' },
      { code: 'create', documentation: 'Create a new allergy' },
      { code: 'update', documentation: 'Update an existing allergy' },
    ],
    versioning: 'versioned',
    searchParam: [
      { name: '_id', type: 'token', documentation: 'The logical ID of the resource' },
      { name: 'patient', type: 'reference', documentation: 'The patient with the allergy' },
      { name: 'code', type: 'token', documentation: 'The allergen code' },
      { name: 'clinical-status', type: 'token', documentation: 'Clinical status' },
      { name: 'criticality', type: 'token', documentation: 'Criticality level' },
      { name: 'type', type: 'token', documentation: 'Type (allergy vs intolerance)' },
    ],
  },
  {
    type: 'MedicationRequest',
    profile: `${NL_CORE_BASE}/nl-core-MedicationAgreement`,
    supportedProfile: [
      `${NL_CORE_BASE}/nl-core-MedicationAgreement`,
      `${NL_CORE_BASE}/nl-core-DispenseRequest`,
    ],
    documentation: 'Dutch ZIB MedicationAgreement (nl-core-MedicationAgreement) resource',
    interaction: [
      { code: 'read', documentation: 'Read a medication request by ID' },
      { code: 'search-type', documentation: 'Search for medication requests' },
      { code: 'create', documentation: 'Create a new medication request' },
      { code: 'update', documentation: 'Update an existing medication request' },
    ],
    versioning: 'versioned',
    searchParam: [
      { name: '_id', type: 'token', documentation: 'The logical ID of the resource' },
      { name: 'patient', type: 'reference', documentation: 'The patient for the medication' },
      { name: 'status', type: 'token', documentation: 'Status of the request' },
      { name: 'intent', type: 'token', documentation: 'Intent of the request' },
      { name: 'medication', type: 'reference', documentation: 'The medication reference' },
      { name: 'authoredon', type: 'date', documentation: 'Date request was authored' },
    ],
  },
  {
    type: 'Encounter',
    profile: `${NL_CORE_BASE}/nl-core-Encounter`,
    supportedProfile: [`${NL_CORE_BASE}/nl-core-Encounter`],
    documentation: 'Dutch ZIB Contact (nl-core-Encounter) resource',
    interaction: [
      { code: 'read', documentation: 'Read an encounter by ID' },
      { code: 'search-type', documentation: 'Search for encounters' },
      { code: 'create', documentation: 'Create a new encounter' },
      { code: 'update', documentation: 'Update an existing encounter' },
    ],
    versioning: 'versioned',
    searchParam: [
      { name: '_id', type: 'token', documentation: 'The logical ID of the resource' },
      { name: 'patient', type: 'reference', documentation: 'The patient in the encounter' },
      { name: 'status', type: 'token', documentation: 'Status of the encounter' },
      { name: 'class', type: 'token', documentation: 'Classification of the encounter' },
      { name: 'date', type: 'date', documentation: 'Date of the encounter' },
      { name: 'participant', type: 'reference', documentation: 'Participants in the encounter' },
    ],
  },
];

/**
 * Generate the CapabilityStatement resource
 */
export function getCapabilityStatement(baseUrl: string, version: string): NextResponse {
  const capabilityStatement: FhirCapabilityStatement = {
    resourceType: 'CapabilityStatement',
    id: 'medrecord-fhir-server',
    meta: {
      lastUpdated: new Date().toISOString(),
    },
    url: `${baseUrl}/${version}/metadata`,
    version: SERVER_VERSION,
    name: 'MEDrecordFHIRServer',
    title: SERVER_NAME,
    status: 'active',
    experimental: false,
    date: new Date().toISOString().split('T')[0],
    publisher: PUBLISHER,
    contact: [
      {
        name: 'MEDrecord Support',
        telecom: [
          {
            system: 'url',
            value: 'https://medrecord.nl',
          },
          {
            system: 'email',
            value: 'support@medrecord.nl',
          },
        ],
      },
    ],
    description: 'MEDrecord FHIR R4 Server implementing Dutch ZIB (Zorginformatiebouwstenen) profiles via nl-core. Part of the MEDrecord healthcare platform for MedSafe, Coachi, and HealthTalk brands.',
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
    purpose: 'Provide a FHIR R4 API for Dutch healthcare data exchange, supporting EHDS compliance and interoperability with Dutch healthcare systems.',
    copyright: 'Copyright MEDrecord',
    kind: 'instance',
    instantiates: [
      'http://hl7.org/fhir/CapabilityStatement/base',
    ],
    software: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      releaseDate: '2025-01-30',
    },
    implementation: {
      description: `${SERVER_NAME} - Dutch ZIB FHIR R4 Implementation`,
      url: baseUrl,
    },
    fhirVersion: FHIR_VERSION,
    format: ['application/fhir+json', 'application/json'],
    patchFormat: ['application/json-patch+json'],
    implementationGuide: [
      'http://nictiz.nl/fhir/ImplementationGuide/nictiz.fhir.nl.r4.nl-core',
    ],
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
              text: 'SMART on FHIR authorization via MEDrecord Gateway',
            },
          ],
          description: 'Authentication and authorization is handled via MEDrecord Gateway. Supports session cookies, API keys, and Bearer tokens.',
        },
        resource: resourceDefinitions,
        interaction: [
          {
            code: 'transaction',
            documentation: 'Batch/Transaction bundle processing (coming soon)',
          },
          {
            code: 'search-system',
            documentation: 'System-wide search across all resources (coming soon)',
          },
        ],
        searchParam: [
          {
            name: '_id',
            type: 'token',
            documentation: 'Resource ID',
          },
          {
            name: '_lastUpdated',
            type: 'date',
            documentation: 'When resource was last updated',
          },
          {
            name: '_count',
            type: 'number',
            documentation: 'Number of results to return',
          },
          {
            name: '_offset',
            type: 'number',
            documentation: 'Starting offset for results',
          },
          {
            name: '_sort',
            type: 'string',
            documentation: 'Sort order for results',
          },
        ],
      },
    ],
  };

  return fhirResponse(capabilityStatement);
}
