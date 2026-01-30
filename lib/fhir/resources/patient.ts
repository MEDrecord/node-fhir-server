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
import type { FhirPatient, GatewayUser } from '@/lib/fhir/types';
import { NL_CORE_PROFILES, DUTCH_CODE_SYSTEMS } from '@/lib/fhir/types';

/**
 * Transform database row to FHIR Patient resource
 */
function toFhirPatient(row: DatabasePatient): FhirPatient {
  const patient: FhirPatient = {
    resourceType: 'Patient',
    id: row.resource_id,
    meta: {
      versionId: String(row.version_id),
      lastUpdated: row.last_updated,
      profile: [NL_CORE_PROFILES.Patient],
    },
    ...row.resource,
  };

  return patient;
}

/**
 * Transform FHIR Patient to database row
 * Note: BSN is hashed for storage security
 */
function fromFhirPatient(
  patient: FhirPatient,
  tenantId: string,
  existingId?: string
): Partial<DatabasePatient> {
  const bsn = patient.identifier?.find(
    (id) => id.system === DUTCH_CODE_SYSTEMS.BSN
  )?.value;

  const officialName = patient.name?.find((n) => n.use === 'official') || patient.name?.[0];

  return {
    resource_id: existingId || patient.id || crypto.randomUUID(),
    tenant_id: tenantId,
    bsn_hash: bsn ? hashBsn(bsn) : null,
    family_name: officialName?.family || null,
    given_name: officialName?.given?.join(' ') || null,
    birth_date: patient.birthDate || null,
    gender: patient.gender || null,
    deceased_boolean: patient.deceasedBoolean || !!patient.deceasedDateTime || false,
    active: patient.active ?? true,
    resource: patient,
  };
}

/**
 * Hash BSN for secure storage (simple hash - use bcrypt in production)
 */
function hashBsn(bsn: string): string {
  let hash = 0;
  for (let i = 0; i < bsn.length; i++) {
    const char = bsn.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `bsn_${Math.abs(hash).toString(16)}`;
}

interface DatabasePatient {
  id: string;
  tenant_id: string;
  resource_id: string;
  bsn_hash: string | null;
  family_name: string | null;
  given_name: string | null;
  birth_date: string | null;
  gender: string | null;
  deceased_boolean: boolean;
  active: boolean;
  resource: Omit<FhirPatient, 'resourceType' | 'id' | 'meta'>;
  version_id: number;
  last_updated: string;
}

/**
 * Search for patients
 */
async function searchPatients(args: SearchArgs, user: GatewayUser) {
  const supabase = createServerClient();
  const params = parseSearchParams(args.searchParams);

  let query = supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenantId);

  // If patient role, only allow access to own data
  if (user.role === 'patient' && user.patientId) {
    query = query.eq('id', user.patientId);
  }

  // Apply search parameters
  if (params._id) {
    query = query.eq('resource_id', params._id);
  }

  if (params.identifier) {
    const identifierValue = Array.isArray(params.identifier)
      ? params.identifier[0]
      : params.identifier;
    
    // Parse system|value format and search by hashed BSN
    if (identifierValue.includes('|')) {
      const [system, value] = identifierValue.split('|');
      if (system === DUTCH_CODE_SYSTEMS.BSN || system === '') {
        query = query.eq('bsn_hash', hashBsn(value));
      }
    } else {
      query = query.eq('bsn_hash', hashBsn(identifierValue));
    }
  }

  if (params.family) {
    const familyValue = Array.isArray(params.family) ? params.family[0] : params.family;
    query = query.ilike('family_name', `%${familyValue}%`);
  }

  if (params.given) {
    const givenValue = Array.isArray(params.given) ? params.given[0] : params.given;
    query = query.ilike('given_name', `%${givenValue}%`);
  }

  if (params.name) {
    const nameValue = Array.isArray(params.name) ? params.name[0] : params.name;
    query = query.or(`family_name.ilike.%${nameValue}%,given_name.ilike.%${nameValue}%`);
  }

  if (params.birthdate) {
    const birthdateValue = Array.isArray(params.birthdate) ? params.birthdate[0] : params.birthdate;
    query = query.eq('birth_date', birthdateValue);
  }

  if (params.gender) {
    const genderValue = Array.isArray(params.gender) ? params.gender[0] : params.gender;
    query = query.eq('gender', genderValue);
  }

  // Pagination
  const count = params._count ? parseInt(String(params._count), 10) : 20;
  const offset = params._offset ? parseInt(String(params._offset), 10) : 0;

  query = query.range(offset, offset + count - 1).order('last_updated', { ascending: false });

  const { data, error, count: total } = await query;

  if (error) {
    console.error('[FHIR Patient] Search error:', error);
    return FhirErrors.serverError(error.message);
  }

  const patients = (data || []).map((row) => toFhirPatient(row as DatabasePatient));
  const selfUrl = buildSelfUrl(args.request, args.version, 'Patient');

  return bundleResponse('Patient', patients, selfUrl, total || undefined);
}

/**
 * Read a single patient by ID
 */
async function readPatient(id: string, user: GatewayUser) {
  const supabase = createServerClient();

  let query = supabase
    .from('patients')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('resource_id', id)
    .single();

  // If patient role, only allow access to own data
  if (user.role === 'patient' && user.patientId) {
    query = supabase
      .from('patients')
      .select('*')
      .eq('tenant_id', user.tenantId)
      .eq('id', user.patientId)
      .eq('resource_id', id)
      .single();
  }

  const { data, error } = await query;

  if (error || !data) {
    return FhirErrors.notFound('Patient', id);
  }

  const patient = toFhirPatient(data as DatabasePatient);
  const response = fhirResponse(patient);

  return withVersionHeaders(
    response,
    String(data.version_id),
    data.last_updated
  );
}

/**
 * Create a new patient
 */
async function createPatient(resource: unknown, user: GatewayUser) {
  const supabase = createServerClient();

  // Validate resource type
  const patient = resource as FhirPatient;
  if (patient.resourceType !== 'Patient') {
    return FhirErrors.badRequest('Resource type must be Patient');
  }

  const dbPatient = fromFhirPatient(patient, user.tenantId);

  const { data, error } = await supabase
    .from('patients')
    .insert({
      ...dbPatient,
      version_id: 1,
      last_updated: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[FHIR Patient] Create error:', error);
    return FhirErrors.serverError(error.message);
  }

  const createdPatient = toFhirPatient(data as DatabasePatient);
  const location = `/api/fhir/4_0_1/Patient/${createdPatient.id}`;

  return createdResponse(createdPatient, location);
}

/**
 * Update an existing patient
 */
async function updatePatient(id: string, resource: unknown, user: GatewayUser) {
  const supabase = createServerClient();

  // Validate resource type
  const patient = resource as FhirPatient;
  if (patient.resourceType !== 'Patient') {
    return FhirErrors.badRequest('Resource type must be Patient');
  }

  // Check if patient exists
  const { data: existing, error: fetchError } = await supabase
    .from('patients')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('resource_id', id)
    .single();

  if (fetchError || !existing) {
    return FhirErrors.notFound('Patient', id);
  }

  const dbPatient = fromFhirPatient(patient, user.tenantId, id);

  const { data, error } = await supabase
    .from('patients')
    .update({
      ...dbPatient,
      version_id: existing.version_id + 1,
      last_updated: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) {
    console.error('[FHIR Patient] Update error:', error);
    return FhirErrors.serverError(error.message);
  }

  const updatedPatient = toFhirPatient(data as DatabasePatient);
  const response = fhirResponse(updatedPatient);

  return withVersionHeaders(
    response,
    String(data.version_id),
    data.last_updated
  );
}

// Register the Patient resource handler
registerResourceHandler('Patient', {
  search: searchPatients,
  read: readPatient,
  create: createPatient,
  update: updatePatient,
});
