/**
 * FHIR R4 Type Definitions for Dutch ZIB (nl-core) profiles
 * Based on HL7 FHIR R4 4.0.1 specification
 */

// ============================================================================
// Core FHIR Types
// ============================================================================

export interface FhirResource {
  resourceType: string;
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

export interface FhirReference {
  reference?: string;
  type?: string;
  identifier?: FhirIdentifier;
  display?: string;
}

export interface FhirPeriod {
  start?: string;
  end?: string;
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

// ============================================================================
// Bundle Types
// ============================================================================

export interface FhirBundle {
  resourceType: 'Bundle';
  id?: string;
  meta?: FhirMeta;
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
    ifNoneMatch?: string;
    ifModifiedSince?: string;
    ifMatch?: string;
    ifNoneExist?: string;
  };
  response?: {
    status: string;
    location?: string;
    etag?: string;
    lastModified?: string;
    outcome?: FhirResource;
  };
}

// ============================================================================
// OperationOutcome (Error Response)
// ============================================================================

export interface FhirOperationOutcome {
  resourceType: 'OperationOutcome';
  id?: string;
  meta?: FhirMeta;
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

// ============================================================================
// Patient Resource (nl-core-Patient)
// ============================================================================

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
  link?: FhirPatientLink[];
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

export interface FhirPatientLink {
  other: FhirReference;
  type: 'replaced-by' | 'replaces' | 'refer' | 'seealso';
}

// ============================================================================
// Practitioner Resource (nl-core-HealthProfessional)
// ============================================================================

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
  communication?: FhirCodeableConcept[];
}

export interface FhirPractitionerQualification {
  identifier?: FhirIdentifier[];
  code: FhirCodeableConcept;
  period?: FhirPeriod;
  issuer?: FhirReference;
}

// ============================================================================
// Organization Resource (nl-core-HealthcareProvider)
// ============================================================================

export interface FhirOrganization extends FhirResource {
  resourceType: 'Organization';
  identifier?: FhirIdentifier[];
  active?: boolean;
  type?: FhirCodeableConcept[];
  name?: string;
  alias?: string[];
  telecom?: FhirContactPoint[];
  address?: FhirAddress[];
  partOf?: FhirReference;
  contact?: FhirOrganizationContact[];
  endpoint?: FhirReference[];
}

export interface FhirOrganizationContact {
  purpose?: FhirCodeableConcept;
  name?: FhirHumanName;
  telecom?: FhirContactPoint[];
  address?: FhirAddress;
}

// ============================================================================
// Observation Resource (nl-core vitals: BloodPressure, BodyWeight, etc.)
// ============================================================================

export interface FhirObservation extends FhirResource {
  resourceType: 'Observation';
  identifier?: FhirIdentifier[];
  basedOn?: FhirReference[];
  partOf?: FhirReference[];
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject?: FhirReference;
  focus?: FhirReference[];
  encounter?: FhirReference;
  effectiveDateTime?: string;
  effectivePeriod?: FhirPeriod;
  effectiveTiming?: unknown;
  effectiveInstant?: string;
  issued?: string;
  performer?: FhirReference[];
  valueQuantity?: FhirQuantity;
  valueCodeableConcept?: FhirCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: { low?: FhirQuantity; high?: FhirQuantity };
  valueRatio?: { numerator?: FhirQuantity; denominator?: FhirQuantity };
  valueSampledData?: unknown;
  valueTime?: string;
  valueDateTime?: string;
  valuePeriod?: FhirPeriod;
  dataAbsentReason?: FhirCodeableConcept;
  interpretation?: FhirCodeableConcept[];
  note?: FhirAnnotation[];
  bodySite?: FhirCodeableConcept;
  method?: FhirCodeableConcept;
  specimen?: FhirReference;
  device?: FhirReference;
  referenceRange?: FhirObservationReferenceRange[];
  hasMember?: FhirReference[];
  derivedFrom?: FhirReference[];
  component?: FhirObservationComponent[];
}

export interface FhirObservationReferenceRange {
  low?: FhirQuantity;
  high?: FhirQuantity;
  type?: FhirCodeableConcept;
  appliesTo?: FhirCodeableConcept[];
  age?: { low?: FhirQuantity; high?: FhirQuantity };
  text?: string;
}

export interface FhirObservationComponent {
  code: FhirCodeableConcept;
  valueQuantity?: FhirQuantity;
  valueCodeableConcept?: FhirCodeableConcept;
  valueString?: string;
  valueBoolean?: boolean;
  valueInteger?: number;
  valueRange?: { low?: FhirQuantity; high?: FhirQuantity };
  valueRatio?: { numerator?: FhirQuantity; denominator?: FhirQuantity };
  valueSampledData?: unknown;
  valueTime?: string;
  valueDateTime?: string;
  valuePeriod?: FhirPeriod;
  dataAbsentReason?: FhirCodeableConcept;
  interpretation?: FhirCodeableConcept[];
  referenceRange?: FhirObservationReferenceRange[];
}

// ============================================================================
// Condition Resource (nl-core-Problem)
// ============================================================================

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
  onsetRange?: { low?: FhirQuantity; high?: FhirQuantity };
  onsetString?: string;
  abatementDateTime?: string;
  abatementAge?: FhirQuantity;
  abatementPeriod?: FhirPeriod;
  abatementRange?: { low?: FhirQuantity; high?: FhirQuantity };
  abatementString?: string;
  recordedDate?: string;
  recorder?: FhirReference;
  asserter?: FhirReference;
  stage?: FhirConditionStage[];
  evidence?: FhirConditionEvidence[];
  note?: FhirAnnotation[];
}

export interface FhirConditionStage {
  summary?: FhirCodeableConcept;
  assessment?: FhirReference[];
  type?: FhirCodeableConcept;
}

export interface FhirConditionEvidence {
  code?: FhirCodeableConcept[];
  detail?: FhirReference[];
}

// ============================================================================
// AllergyIntolerance Resource (nl-core-AllergyIntolerance)
// ============================================================================

export interface FhirAllergyIntolerance extends FhirResource {
  resourceType: 'AllergyIntolerance';
  identifier?: FhirIdentifier[];
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  type?: 'allergy' | 'intolerance';
  category?: ('food' | 'medication' | 'environment' | 'biologic')[];
  criticality?: 'low' | 'high' | 'unable-to-assess';
  code?: FhirCodeableConcept;
  patient: FhirReference;
  encounter?: FhirReference;
  onsetDateTime?: string;
  onsetAge?: FhirQuantity;
  onsetPeriod?: FhirPeriod;
  onsetRange?: { low?: FhirQuantity; high?: FhirQuantity };
  onsetString?: string;
  recordedDate?: string;
  recorder?: FhirReference;
  asserter?: FhirReference;
  lastOccurrence?: string;
  note?: FhirAnnotation[];
  reaction?: FhirAllergyIntoleranceReaction[];
}

export interface FhirAllergyIntoleranceReaction {
  substance?: FhirCodeableConcept;
  manifestation: FhirCodeableConcept[];
  description?: string;
  onset?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  exposureRoute?: FhirCodeableConcept;
  note?: FhirAnnotation[];
}

// ============================================================================
// MedicationRequest Resource (nl-core-MedicationAgreement)
// ============================================================================

export interface FhirMedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  identifier?: FhirIdentifier[];
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'entered-in-error' | 'stopped' | 'draft' | 'unknown';
  statusReason?: FhirCodeableConcept;
  intent: 'proposal' | 'plan' | 'order' | 'original-order' | 'reflex-order' | 'filler-order' | 'instance-order' | 'option';
  category?: FhirCodeableConcept[];
  priority?: 'routine' | 'urgent' | 'asap' | 'stat';
  doNotPerform?: boolean;
  reportedBoolean?: boolean;
  reportedReference?: FhirReference;
  medicationCodeableConcept?: FhirCodeableConcept;
  medicationReference?: FhirReference;
  subject: FhirReference;
  encounter?: FhirReference;
  supportingInformation?: FhirReference[];
  authoredOn?: string;
  requester?: FhirReference;
  performer?: FhirReference;
  performerType?: FhirCodeableConcept;
  recorder?: FhirReference;
  reasonCode?: FhirCodeableConcept[];
  reasonReference?: FhirReference[];
  instantiatesCanonical?: string[];
  instantiatesUri?: string[];
  basedOn?: FhirReference[];
  groupIdentifier?: FhirIdentifier;
  courseOfTherapyType?: FhirCodeableConcept;
  insurance?: FhirReference[];
  note?: FhirAnnotation[];
  dosageInstruction?: FhirDosage[];
  dispenseRequest?: FhirMedicationRequestDispenseRequest;
  substitution?: FhirMedicationRequestSubstitution;
  priorPrescription?: FhirReference;
  detectedIssue?: FhirReference[];
  eventHistory?: FhirReference[];
}

export interface FhirDosage {
  sequence?: number;
  text?: string;
  additionalInstruction?: FhirCodeableConcept[];
  patientInstruction?: string;
  timing?: unknown;
  asNeededBoolean?: boolean;
  asNeededCodeableConcept?: FhirCodeableConcept;
  site?: FhirCodeableConcept;
  route?: FhirCodeableConcept;
  method?: FhirCodeableConcept;
  doseAndRate?: {
    type?: FhirCodeableConcept;
    doseRange?: { low?: FhirQuantity; high?: FhirQuantity };
    doseQuantity?: FhirQuantity;
    rateRatio?: { numerator?: FhirQuantity; denominator?: FhirQuantity };
    rateRange?: { low?: FhirQuantity; high?: FhirQuantity };
    rateQuantity?: FhirQuantity;
  }[];
  maxDosePerPeriod?: { numerator?: FhirQuantity; denominator?: FhirQuantity };
  maxDosePerAdministration?: FhirQuantity;
  maxDosePerLifetime?: FhirQuantity;
}

export interface FhirMedicationRequestDispenseRequest {
  initialFill?: {
    quantity?: FhirQuantity;
    duration?: FhirQuantity;
  };
  dispenseInterval?: FhirQuantity;
  validityPeriod?: FhirPeriod;
  numberOfRepeatsAllowed?: number;
  quantity?: FhirQuantity;
  expectedSupplyDuration?: FhirQuantity;
  performer?: FhirReference;
}

export interface FhirMedicationRequestSubstitution {
  allowedBoolean?: boolean;
  allowedCodeableConcept?: FhirCodeableConcept;
  reason?: FhirCodeableConcept;
}

// ============================================================================
// Encounter Resource (nl-core-Encounter)
// ============================================================================

export interface FhirEncounter extends FhirResource {
  resourceType: 'Encounter';
  identifier?: FhirIdentifier[];
  status: 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' | 'entered-in-error' | 'unknown';
  statusHistory?: FhirEncounterStatusHistory[];
  class: FhirCoding;
  classHistory?: FhirEncounterClassHistory[];
  type?: FhirCodeableConcept[];
  serviceType?: FhirCodeableConcept;
  priority?: FhirCodeableConcept;
  subject?: FhirReference;
  episodeOfCare?: FhirReference[];
  basedOn?: FhirReference[];
  participant?: FhirEncounterParticipant[];
  appointment?: FhirReference[];
  period?: FhirPeriod;
  length?: FhirQuantity;
  reasonCode?: FhirCodeableConcept[];
  reasonReference?: FhirReference[];
  diagnosis?: FhirEncounterDiagnosis[];
  account?: FhirReference[];
  hospitalization?: FhirEncounterHospitalization;
  location?: FhirEncounterLocation[];
  serviceProvider?: FhirReference;
  partOf?: FhirReference;
}

export interface FhirEncounterStatusHistory {
  status: string;
  period: FhirPeriod;
}

export interface FhirEncounterClassHistory {
  class: FhirCoding;
  period: FhirPeriod;
}

export interface FhirEncounterParticipant {
  type?: FhirCodeableConcept[];
  period?: FhirPeriod;
  individual?: FhirReference;
}

export interface FhirEncounterDiagnosis {
  condition: FhirReference;
  use?: FhirCodeableConcept;
  rank?: number;
}

export interface FhirEncounterHospitalization {
  preAdmissionIdentifier?: FhirIdentifier;
  origin?: FhirReference;
  admitSource?: FhirCodeableConcept;
  reAdmission?: FhirCodeableConcept;
  dietPreference?: FhirCodeableConcept[];
  specialCourtesy?: FhirCodeableConcept[];
  specialArrangement?: FhirCodeableConcept[];
  destination?: FhirReference;
  dischargeDisposition?: FhirCodeableConcept;
}

export interface FhirEncounterLocation {
  location: FhirReference;
  status?: 'planned' | 'active' | 'reserved' | 'completed';
  physicalType?: FhirCodeableConcept;
  period?: FhirPeriod;
}

// ============================================================================
// CapabilityStatement Resource
// ============================================================================

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
  useContext?: unknown[];
  jurisdiction?: FhirCodeableConcept[];
  purpose?: string;
  copyright?: string;
  kind: 'instance' | 'capability' | 'requirements';
  instantiates?: string[];
  imports?: string[];
  software?: {
    name: string;
    version?: string;
    releaseDate?: string;
  };
  implementation?: {
    description: string;
    url?: string;
    custodian?: FhirReference;
  };
  fhirVersion: string;
  format: string[];
  patchFormat?: string[];
  implementationGuide?: string[];
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
  resource?: FhirCapabilityStatementRestResource[];
  interaction?: { code: string; documentation?: string }[];
  searchParam?: FhirCapabilityStatementSearchParam[];
  operation?: { name: string; definition: string; documentation?: string }[];
  compartment?: string[];
}

export interface FhirCapabilityStatementRestResource {
  type: string;
  profile?: string;
  supportedProfile?: string[];
  documentation?: string;
  interaction?: { code: string; documentation?: string }[];
  versioning?: 'no-version' | 'versioned' | 'versioned-update';
  readHistory?: boolean;
  updateCreate?: boolean;
  conditionalCreate?: boolean;
  conditionalRead?: 'not-supported' | 'modified-since' | 'not-match' | 'full-support';
  conditionalUpdate?: boolean;
  conditionalDelete?: 'not-supported' | 'single' | 'multiple';
  referencePolicy?: ('literal' | 'logical' | 'resolves' | 'enforced' | 'local')[];
  searchInclude?: string[];
  searchRevInclude?: string[];
  searchParam?: FhirCapabilityStatementSearchParam[];
  operation?: { name: string; definition: string; documentation?: string }[];
}

export interface FhirCapabilityStatementSearchParam {
  name: string;
  definition?: string;
  type: 'number' | 'date' | 'string' | 'token' | 'reference' | 'composite' | 'quantity' | 'uri' | 'special';
  documentation?: string;
}

// ============================================================================
// Search Parameters Types
// ============================================================================

export interface FhirSearchParams {
  _id?: string;
  _lastUpdated?: string;
  _count?: string;
  _offset?: string;
  _sort?: string;
  _include?: string | string[];
  _revinclude?: string | string[];
  _summary?: 'true' | 'text' | 'data' | 'count' | 'false';
  _elements?: string;
  _contained?: 'true' | 'false' | 'both';
  _containedType?: 'container' | 'contained';
  [key: string]: string | string[] | undefined;
}

// ============================================================================
// User Context Types (for Gateway Integration)
// ============================================================================

export type UserRole = 'super_admin' | 'tenant_admin' | 'practitioner' | 'patient' | 'researcher' | 'dev';

export interface GatewayUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  tenantId: string;
  patientId?: string;       // If role is patient
  practitionerId?: string;  // If role is practitioner
  scopes: string[];         // SMART on FHIR scopes
}

export interface FhirRequestContext {
  user: GatewayUser;
  tenantId: string;
  version: string;
  baseUrl: string;
}
