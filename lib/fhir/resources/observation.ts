import { createServerClient } from '@/lib/supabase/client';
import { registerResourceHandler, parseSearchParams, type SearchArgs } from '@/lib/fhir/router';
import {
  bundleResponse,
  fhirResponse,
  createdResponse,
  FhirErrors,
  buildSelfUrl,
  withVersionHeaders,
} from '@/lib/fhir/response';
import type { FhirObservation, GatewayUser } from '@/lib/fhir/types';
import { NL_CORE_PROFILES, DUTCH_CODE_SYSTEMS } from '@/lib/fhir/types';

// LOINC codes for common Dutch ZIB vitals
const VITAL_SIGNS_CODES = {
  BLOOD_PRESSURE: '85354-9',
  SYSTOLIC: '8480-6',
  DIASTOLIC: '8462-4',
  BODY_WEIGHT: '29463-7',
  BODY_HEIGHT: '8302-2',
  HEART_RATE: '8867-4',
  BODY_TEMPERATURE: '8310-5',
  RESPIRATORY_RATE: '9279-1',
  OXYGEN_SATURATION: '2708-6',
} as const;

interface DatabaseObservation {
  id: string;
  tenant_id: string;
  resource_id: string;
  patient_id: string;
  code_system: string | null;
  code_code: string | null;
  category: string | null;
  status: string;
  effective_date: string | null;
  resource: Omit<FhirObservation, 'resourceType' | 'id' | 'meta'>;
  version_id: number;
  last_updated: string;
}

/**
 * Get appropriate nl-core profile based on observation code
 */
function getProfileForCode(code: string | null): string {
  if (!code) return NL_CORE_PROFILES.Observation;

  switch (code) {
    case VITAL_SIGNS_CODES.BLOOD_PRESSURE:
    case VITAL_SIGNS_CODES.SYSTOLIC:
    case VITAL_SIGNS_CODES.DIASTOLIC:
      return NL_CORE_PROFILES.BloodPressure;
    case VITAL_SIGNS_CODES.BODY_WEIGHT:
      return NL_CORE_PROFILES.BodyWeight;
    case VITAL_SIGNS_CODES.BODY_HEIGHT:
      return NL_CORE_PROFILES.BodyHeight;
    default:
      return NL_CORE_PROFILES.Observation;
  }
}

/**
 * Transform database row to FHIR Observation resource
 */
function toFhirObservation(row: DatabaseObservation): FhirObservation {
  const observation: FhirObservation = {
    resourceType: 'Observation',
    id: row.resource_id,
    meta: {
      versionId: String(row.version_id),
      lastUpdated: row.last_updated,
      profile: [getProfileForCode(row.code_code)],
    },
    status: row.status as FhirObservation['status'],
    ...row.resource,
  };

  return observation;
}

/**
 * Transform FHIR Observation to database row
 */
function fromFhirObservation(
  observation: FhirObservation,
  tenantId: string,
  patientId: string,
  existingId?: string
): Partial<DatabaseObservation> {
  // Extract code from FHIR resource
  const primaryCode = observation.code?.coding?.find(
    (c) => c.system === DUTCH_CODE_SYSTEMS.LOINC
  ) || observation.code?.coding?.[0];

  // Extract category
  const category = observation.category?.find(
    (c) => c.coding?.some((code) => code.system === 'http://terminology.hl7.org/CodeSystem/observation-category')
  )?.coding?.[0]?.code;

  return {
    resource_id: existingId || observation.id || crypto.randomUUID(),
    tenant_id: tenantId,
    patient_id: patientId,
    code_system: primaryCode?.system || null,
    code_code: primaryCode?.code || null,
    category: category || null,
    status: observation.status,
    effective_date: observation.effectiveDateTime || observation.effectivePeriod?.start || null,
    resource: observation,
  };
}

/**
 * Extract patient ID from FHIR reference
 */
function extractPatientId(reference: string | undefined): string | null {
  if (!reference) return null;
  
  // Handle Patient/123 format
  if (reference.startsWith('Patient/')) {
    return reference.replace('Patient/', '');
  }
  
  // Handle full URL format
  const match = reference.match(/Patient\/([^/]+)$/);
  return match ? match[1] : null;
}

/**
 * Search for observations
 */
async function searchObservations(args: SearchArgs, user: GatewayUser) {
  const supabase = createServerClient();
  const params = parseSearchParams(args.searchParams);

  // Start building query
  let query = supabase
    .from('observations')
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenantId);

  // If patient role, only allow access to own data
  if (user.role === 'patient' && user.patientId) {
    query = query.eq('patient_id', user.patientId);
  }

  // Apply search parameters
  if (params._id) {
    query = query.eq('resource_id', params._id);
  }

  // Patient/subject reference
  const patientRef = params.patient || params.subject;
  if (patientRef) {
    const patientValue = Array.isArray(patientRef) ? patientRef[0] : patientRef;
    const patientId = extractPatientId(patientValue);
    if (patientId) {
      // Need to join with patients table to get the internal ID
      // For now, assume resource_id matches
      query = query.eq('patient_id', patientId);
    }
  }

  // Code search (LOINC)
  if (params.code) {
    const codeValue = Array.isArray(params.code) ? params.code[0] : params.code;
    
    if (codeValue.includes('|')) {
      const [system, code] = codeValue.split('|');
      if (code) {
        query = query.eq('code_code', code);
      }
      if (system) {
        query = query.eq('code_system', system);
      }
    } else {
      query = query.eq('code_code', codeValue);
    }
  }

  // Category search
  if (params.category) {
    const categoryValue = Array.isArray(params.category) ? params.category[0] : params.category;
    
    if (categoryValue.includes('|')) {
      const [, category] = categoryValue.split('|');
      query = query.eq('category', category || categoryValue);
    } else {
      query = query.eq('category', categoryValue);
    }
  }

  // Status search
  if (params.status) {
    const statusValue = Array.isArray(params.status) ? params.status[0] : params.status;
    query = query.eq('status', statusValue);
  }

  // Date search (supports prefixes: eq, ne, lt, le, gt, ge, sa, eb)
  if (params.date) {
    const dateValue = Array.isArray(params.date) ? params.date[0] : params.date;
    
    // Parse prefix if present
    const prefixMatch = dateValue.match(/^(eq|ne|lt|le|gt|ge|sa|eb)?(.+)$/);
    if (prefixMatch) {
      const [, prefix = 'eq', date] = prefixMatch;
      
      switch (prefix) {
        case 'eq':
          query = query.eq('effective_date', date);
          break;
        case 'ne':
          query = query.neq('effective_date', date);
          break;
        case 'lt':
          query = query.lt('effective_date', date);
          break;
        case 'le':
          query = query.lte('effective_date', date);
          break;
        case 'gt':
          query = query.gt('effective_date', date);
          break;
        case 'ge':
          query = query.gte('effective_date', date);
          break;
        default:
          query = query.eq('effective_date', date);
      }
    }
  }

  // Pagination
  const count = params._count ? parseInt(String(params._count), 10) : 20;
  const offset = params._offset ? parseInt(String(params._offset), 10) : 0;

  query = query.range(offset, offset + count - 1).order('effective_date', { ascending: false });

  const { data, error, count: total } = await query;

  if (error) {
    console.error('[FHIR Observation] Search error:', error);
    return FhirErrors.serverError(error.message);
  }

  const observations = (data || []).map((row) => toFhirObservation(row as DatabaseObservation));
  const selfUrl = buildSelfUrl(args.request, args.version, 'Observation');

  return bundleResponse('Observation', observations, selfUrl, total || undefined);
}

/**
 * Read a single observation by ID
 */
async function readObservation(id: string, user: GatewayUser) {
  const supabase = createServerClient();

  let query = supabase
    .from('observations')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('resource_id', id)
    .single();

  // If patient role, only allow access to own data
  if (user.role === 'patient' && user.patientId) {
    query = supabase
      .from('observations')
      .select('*')
      .eq('tenant_id', user.tenantId)
      .eq('patient_id', user.patientId)
      .eq('resource_id', id)
      .single();
  }

  const { data, error } = await query;

  if (error || !data) {
    return FhirErrors.notFound('Observation', id);
  }

  const observation = toFhirObservation(data as DatabaseObservation);
  const response = fhirResponse(observation);

  return withVersionHeaders(
    response,
    String(data.version_id),
    data.last_updated
  );
}

/**
 * Create a new observation
 */
async function createObservation(resource: unknown, user: GatewayUser) {
  const supabase = createServerClient();

  // Validate resource type
  const observation = resource as FhirObservation;
  if (observation.resourceType !== 'Observation') {
    return FhirErrors.badRequest('Resource type must be Observation');
  }

  // Extract patient reference
  const patientRef = observation.subject?.reference;
  const patientId = extractPatientId(patientRef);

  if (!patientId) {
    return FhirErrors.badRequest('Observation must have a subject reference to a Patient');
  }

  // Verify patient exists and user has access
  const { data: patientData, error: patientError } = await supabase
    .from('patients')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .eq('resource_id', patientId)
    .single();

  if (patientError || !patientData) {
    return FhirErrors.badRequest(`Patient ${patientId} not found`);
  }

  // If practitioner, verify care relationship exists
  if (user.role === 'practitioner' && user.practitionerId) {
    const { data: careRelation, error: careError } = await supabase
      .from('care_relationships')
      .select('id')
      .eq('tenant_id', user.tenantId)
      .eq('patient_id', patientData.id)
      .eq('practitioner_id', user.practitionerId)
      .eq('active', true)
      .single();

    if (careError || !careRelation) {
      return FhirErrors.forbidden();
    }
  }

  const dbObservation = fromFhirObservation(observation, user.tenantId, patientData.id);

  const { data, error } = await supabase
    .from('observations')
    .insert({
      ...dbObservation,
      version_id: 1,
      last_updated: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[FHIR Observation] Create error:', error);
    return FhirErrors.serverError(error.message);
  }

  const createdObservation = toFhirObservation(data as DatabaseObservation);
  const location = `/api/fhir/4_0_1/Observation/${createdObservation.id}`;

  return createdResponse(createdObservation, location);
}

/**
 * Update an existing observation
 */
async function updateObservation(id: string, resource: unknown, user: GatewayUser) {
  const supabase = createServerClient();

  // Validate resource type
  const observation = resource as FhirObservation;
  if (observation.resourceType !== 'Observation') {
    return FhirErrors.badRequest('Resource type must be Observation');
  }

  // Check if observation exists
  const { data: existing, error: fetchError } = await supabase
    .from('observations')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('resource_id', id)
    .single();

  if (fetchError || !existing) {
    return FhirErrors.notFound('Observation', id);
  }

  // If patient role, only allow update to own data
  if (user.role === 'patient' && user.patientId !== existing.patient_id) {
    return FhirErrors.forbidden();
  }

  const dbObservation = fromFhirObservation(observation, user.tenantId, existing.patient_id, id);

  const { data, error } = await supabase
    .from('observations')
    .update({
      ...dbObservation,
      version_id: existing.version_id + 1,
      last_updated: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) {
    console.error('[FHIR Observation] Update error:', error);
    return FhirErrors.serverError(error.message);
  }

  const updatedObservation = toFhirObservation(data as DatabaseObservation);
  const response = fhirResponse(updatedObservation);

  return withVersionHeaders(
    response,
    String(data.version_id),
    data.last_updated
  );
}

// Register the Observation resource handler
registerResourceHandler('Observation', {
  search: searchObservations,
  read: readObservation,
  create: createObservation,
  update: updateObservation,
});
