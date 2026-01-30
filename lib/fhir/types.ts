/**
 * FHIR R4 Type Definitions for Dutch ZIB Resources
 * Based on nl-core profiles
 */

// FHIR Resource Types supported by this server
export type FhirResourceType =
  | 'Patient'
  | 'Practitioner'
  | 'Organization'
  | 'Observation'
  | 'Condition'
  | 'AllergyIntolerance'
  | 'MedicationRequest'
  | 'MedicationStatement'
  | 'Procedure'
  | 'Encounter'
  | 'Consent'
  | 'DocumentReference'
  | 'CapabilityStatement'
  | 'OperationOutcome'
  | 'Bundle';

// FHIR Version
export const FHIR_VERSION = '4.0.1';

// Base FHIR Resource
export interface FhirResource {
  resourceType: FhirResourceType;
  id?: string;
  meta?: FhirMeta;
}

export interface FhirMeta {
  versionId?: string;
  lastUpdated?: string;
  source?: string;
  profile?: string[];
  security?: FhirCoding[];
  tag?: FhirCoding[];
}

export interface FhirCoding {
  system?: string;
  version?: string;
  code?: string;
  display?: string;
  userSelected?: boolean;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirIdentifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: FhirCodeableConcept;
  system?: string;
  value?: string;
  period?: FhirPeriod;
  assigner?: FhirReference;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
}

export interface FhirReference {
  reference?: string;
  type?: string;
  identifier?: FhirIdentifier;
  display?: string;
}

export interface FhirHumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: FhirPeriod;
}

export interface FhirAddress {
  use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
  type?: 'postal' | 'physical' | 'both';
  text?: string;
  line?: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: FhirPeriod;
}

export interface FhirContactPoint {
  system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
  use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  rank?: number;
  period?: FhirPeriod;
}

// Patient Resource (nl-core-Patient)
export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address?: FhirAddress[];
  maritalStatus?: FhirCodeableConcept;
  multipleBirthBoolean?: boolean;
  multipleBirthInteger?: number;
  contact?: FhirPatientContact[];
  communication?: FhirPatientCommunication[];
  generalPractitioner?: FhirReference[];
  managingOrganization?: FhirReference;
}

export interface FhirPatientContact {
  relationship?: FhirCodeableConcept[];
  name?: FhirHumanName;
  telecom?: FhirContactPoint[];
  address?: FhirAddress;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  organization?: FhirReference;
  period?: FhirPeriod;
}

export interface FhirPatientCommunication {
  language: FhirCodeableConcept;
  preferred?: boolean;
}

// Practitioner Resource (nl-core-HealthProfessional)
export interface FhirPractitioner extends FhirResource {
  resourceType: 'Practitioner';
  identifier?: FhirIdentifier[];
  active?: boolean;
  name?: FhirHumanName[];
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  qualification?: FhirPractitionerQualification[];
}

export interface FhirPractitionerQualification {
  identifier?: FhirIdentifier[];
  code: FhirCodeableConcept;
  period?: FhirPeriod;
  issuer?: FhirReference;
}

// Observation Resource (nl-core vitals)
export interface FhirObservation extends FhirResource {
  resourceType: 'Observation';
  identifier?: FhirIdentifier[];
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  encounter?: FhirReference;
  effectiveDateTime?: string;
  effectivePeriod?: FhirPeriod;
  issued?: string;
  performer?: FhirReference[];
  valueQuantity?: FhirQuantity;
  valueCodeableConcept?: FhirCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  dataAbsentReason?: FhirCodeableConcept;
  interpretation?: FhirCodeableConcept[];
  note?: FhirAnnotation[];
  bodySite?: FhirCodeableConcept;
  method?: FhirCodeableConcept;
  referenceRange?: FhirObservationReferenceRange[];
  component?: FhirObservationComponent[];
}

export interface FhirQuantity {
  value?: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirAnnotation {
  authorReference?: FhirReference;
  authorString?: string;
  time?: string;
  text: string;
}

export interface FhirObservationReferenceRange {
  low?: FhirQuantity;
  high?: FhirQuantity;
  type?: FhirCodeableConcept;
  appliesTo?: FhirCodeableConcept[];
  age?: FhirRange;
  text?: string;
}

export interface FhirRange {
  low?: FhirQuantity;
  high?: FhirQuantity;
}

export interface FhirObservationComponent {
  code: FhirCodeableConcept;
  valueQuantity?: FhirQuantity;
  valueCodeableConcept?: FhirCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  dataAbsentReason?: FhirCodeableConcept;
  interpretation?: FhirCodeableConcept[];
  referenceRange?: FhirObservationReferenceRange[];
}

// Condition Resource (nl-core-Problem)
export interface FhirCondition extends FhirResource {
  resourceType: 'Condition';
  identifier?: FhirIdentifier[];
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  severity?: FhirCodeableConcept;
  code?: FhirCodeableConcept;
  bodySite?: FhirCodeableConcept[];
  subject: FhirReference;
  encounter?: FhirReference;
  onsetDateTime?: string;
  onsetAge?: FhirQuantity;
  onsetPeriod?: FhirPeriod;
  onsetRange?: FhirRange;
  onsetString?: string;
  abatementDateTime?: string;
  abatementAge?: FhirQuantity;
  abatementPeriod?: FhirPeriod;
  abatementRange?: FhirRange;
  abatementString?: string;
  recordedDate?: string;
  recorder?: FhirReference;
  asserter?: FhirReference;
  note?: FhirAnnotation[];
}

// Bundle Resource
export interface FhirBundle extends FhirResource {
  resourceType: 'Bundle';
  type: 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset' | 'collection';
  timestamp?: string;
  total?: number;
  link?: FhirBundleLink[];
  entry?: FhirBundleEntry[];
}

export interface FhirBundleLink {
  relation: string;
  url: string;
}

export interface FhirBundleEntry {
  fullUrl?: string;
  resource?: FhirResource;
  search?: {
    mode?: 'match' | 'include' | 'outcome';
    score?: number;
  };
  request?: {
    method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
  };
  response?: {
    status: string;
    location?: string;
    etag?: string;
    lastModified?: string;
  };
}

// OperationOutcome Resource
export interface FhirOperationOutcome extends FhirResource {
  resourceType: 'OperationOutcome';
  issue: FhirOperationOutcomeIssue[];
}

export interface FhirOperationOutcomeIssue {
  severity: 'fatal' | 'error' | 'warning' | 'information';
  code: string;
  details?: FhirCodeableConcept;
  diagnostics?: string;
  location?: string[];
  expression?: string[];
}

// CapabilityStatement Resource
export interface FhirCapabilityStatement extends FhirResource {
  resourceType: 'CapabilityStatement';
  url?: string;
  version?: string;
  name?: string;
  title?: string;
  status: 'draft' | 'active' | 'retired' | 'unknown';
  experimental?: boolean;
  date: string;
  publisher?: string;
  contact?: FhirContactDetail[];
  description?: string;
  jurisdiction?: FhirCodeableConcept[];
  purpose?: string;
  copyright?: string;
  kind: 'instance' | 'capability' | 'requirements';
  software?: {
    name: string;
    version?: string;
    releaseDate?: string;
  };
  implementation?: {
    description: string;
    url?: string;
  };
  fhirVersion: string;
  format: string[];
  rest?: FhirCapabilityStatementRest[];
}

export interface FhirContactDetail {
  name?: string;
  telecom?: FhirContactPoint[];
}

export interface FhirCapabilityStatementRest {
  mode: 'client' | 'server';
  documentation?: string;
  security?: {
    cors?: boolean;
    service?: FhirCodeableConcept[];
    description?: string;
  };
  resource?: FhirCapabilityStatementResource[];
  interaction?: FhirCapabilityStatementInteraction[];
  searchParam?: FhirCapabilityStatementSearchParam[];
}

export interface FhirCapabilityStatementResource {
  type: string;
  profile?: string;
  supportedProfile?: string[];
  documentation?: string;
  interaction?: FhirCapabilityStatementInteraction[];
  versioning?: 'no-version' | 'versioned' | 'versioned-update';
  readHistory?: boolean;
  updateCreate?: boolean;
  conditionalCreate?: boolean;
  conditionalRead?: 'not-supported' | 'modified-since' | 'not-match' | 'full-support';
  conditionalUpdate?: boolean;
  conditionalDelete?: 'not-supported' | 'single' | 'multiple';
  searchParam?: FhirCapabilityStatementSearchParam[];
}

export interface FhirCapabilityStatementInteraction {
  code: string;
  documentation?: string;
}

export interface FhirCapabilityStatementSearchParam {
  name: string;
  definition?: string;
  type: 'number' | 'date' | 'string' | 'token' | 'reference' | 'composite' | 'quantity' | 'uri' | 'special';
  documentation?: string;
}

// User context from gateway
export interface GatewayUser {
  id: string;
  email?: string;
  name?: string;
  role: 'super_admin' | 'tenant_admin' | 'practitioner' | 'patient' | 'researcher' | 'dev';
  tenantId: string;
  patientId?: string;
  practitionerId?: string;
}

// Dutch ZIB Code Systems
export const DUTCH_CODE_SYSTEMS = {
  BSN: 'http://fhir.nl/fhir/NamingSystem/bsn',
  AGB: 'http://fhir.nl/fhir/NamingSystem/agb-z',
  BIG: 'http://fhir.nl/fhir/NamingSystem/big',
  UZI: 'http://fhir.nl/fhir/NamingSystem/uzi',
  SNOMED_CT: 'http://snomed.info/sct',
  LOINC: 'http://loinc.org',
  UCUM: 'http://unitsofmeasure.org',
} as const;

// Dutch nl-core Profile URLs
export const NL_CORE_PROFILES = {
  Patient: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-Patient',
  Practitioner: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-HealthProfessional-Practitioner',
  Organization: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-HealthcareProvider-Organization',
  Observation: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-LaboratoryTestResult',
  BloodPressure: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-BloodPressure',
  BodyWeight: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-BodyWeight',
  BodyHeight: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-BodyHeight',
  Condition: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-Problem',
  AllergyIntolerance: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-AllergyIntolerance',
  MedicationRequest: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-MedicationAgreement',
  Encounter: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-Encounter',
} as const;
