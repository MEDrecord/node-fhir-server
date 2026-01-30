/**
 * Patient Resource Handler (nl-core-Patient)
 * 
 * Implements FHIR R4 Patient resource operations with Dutch ZIB profile support.
 */

import { NextResponse } from 'next/server';
import type { FhirPatient, FhirRequestContext, FhirSearchParams } from '@/types/fhir';
import type { ResourceHandler } from '@/lib/fhir/router';
import { createTenantClient, type Database } from '@/lib/supabase/client';
import { canAccessPatient } from '@/lib/gateway/auth';
import {
  buildSearchBundle,
  fhirResponse,
  fhirCreated,
  fhirError,
  fhirNoContent,
  extractPagination,
} from '@/lib/fhir/utils/response';

// nl-core-Patient profile URL
const NL_CORE_PATIENT_PROFILE = 'http://nictiz.nl/fhir/StructureDefinition/nl-core-Patient';

// Dutch BSN system identifier
const BSN_SYSTEM = 'http://fhir.nl/fhir/NamingSystem/bsn';

/**
 * Transform database row to FHIR Patient
 */
function toFhirPatient(row: Database['public']['Tables']['patients']['Row']): FhirPatient {
  // The resource column contains the full FHIR resource
  const patient = row.resource as unknown as FhirPatient;
  
  return {
    ...patient,
    resourceType: 'Patient',
    id: row.resource_id,
    meta: {
      ...patient.meta,
      versionId: String(row.version_id),
      lastUpdated: row.last_updated,
      profile: [NL_CORE_PATIENT_PROFILE],
    },
  };
}

/**
 * Transform FHIR Patient to database row
 */
function toDbRow(
  patient: FhirPatient,
  tenantId: string
): Database['public']['Tables']['patients']['Insert'] {
  // Extract indexed fields from FHIR resource
  const familyName = patient.name?.[0]?.family;
  const givenName = patient.name?.[0]?.given?.join(' ');
  const birthDate = patient.birthDate;
  const gender = patient.gender;
  const deceased = patient.deceasedBoolean || !!patient.deceasedDateTime;
  const active = patient.active ?? true;
  
  // Extract BSN if present (will be hashed in real implementation)
  const bsnIdentifier = patient.identifier?.find(
    (id) => id.system === BSN_SYSTEM
  );
  const bsnHash = bsnIdentifier?.value 
    ? hashBsn(bsnIdentifier.value) 
    : null;

  return {
    tenant_id: tenantId,
    resource_id: patient.id || crypto.randomUUID(),
    bsn_hash: bsnHash,
    family_name: familyName || null,
    given_name: givenName || null,
    birth_date: birthDate || null,
    gender: gender || null,
    deceased,
    active,
    resource: patient as unknown as Record<string, unknown>,
  };
}

/**
 * Hash BSN for storage (privacy protection)
 * In production, use proper crypto with salt
 */
function hashBsn(bsn: string): string {
  // Simple hash for demo - use bcrypt or similar in production
  return Buffer.from(bsn).toString('base64');
}

/**
 * Search for patients
 */
async function search(
  params: FhirSearchParams,
  context: FhirRequestContext
): Promise<NextResponse> {
  const { user, tenantId, baseUrl, version } = context;
  const { count, offset } = extractPagination(params);

  try {
    const supabase = await createTenantClient(user);

    // Build query
    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('active', true);

    // Apply search parameters
    if (params._id) {
      query = query.eq('resource_id', params._id);
    }
    
    if (params.identifier) {
      // Search by BSN (hashed)
      const identifier = String(params.identifier);
      if (identifier.includes(BSN_SYSTEM)) {
        const bsn = identifier.split('|')[1];
        if (bsn) {
          query = query.eq('bsn_hash', hashBsn(bsn));
        }
      }
    }

    if (params.family) {
      query = query.ilike('family_name', `%${params.family}%`);
    }

    if (params.given) {
      query = query.ilike('given_name', `%${params.given}%`);
    }

    if (params.name) {
      // Search both family and given name
      const name = String(params.name);
      query = query.or(`family_name.ilike.%${name}%,given_name.ilike.%${name}%`);
    }

    if (params.birthdate) {
      query = query.eq('birth_date', params.birthdate);
    }

    if (params.gender) {
      query = query.eq('gender', params.gender);
    }

    // Patient role: only own data
    if (user.role === 'patient' && user.patientId) {
      query = query.eq('id', user.patientId);
    }

    // Pagination
    query = query.range(offset, offset + count - 1);

    // Sort by last updated
    if (params._sort === '-_lastUpdated') {
      query = query.order('last_updated', { ascending: false });
    } else {
      query = query.order('last_updated', { ascending: true });
    }

    const { data, error, count: total } = await query;

    if (error) {
      console.error('[Patient Search] Database error:', error);
      return fhirError(500, 'Database error', error.message);
    }

    const patients = (data || []).map(toFhirPatient);
    const bundle = buildSearchBundle(patients, total || 0, { ...context, baseUrl, version }, params as Record<string, string>);

    return fhirResponse(bundle);
  } catch (error) {
    console.error('[Patient Search] Error:', error);
    return fhirError(500, 'Internal error', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Read a single patient by ID
 */
async function read(
  id: string,
  context: FhirRequestContext
): Promise<NextResponse> {
  const { user, tenantId } = context;

  try {
    const supabase = await createTenantClient(user);

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('resource_id', id)
      .single();

    if (error || !data) {
      return fhirError(404, 'Patient not found', `No Patient found with id '${id}'`);
    }

    // Check access permission
    const canAccess = await canAccessPatient(user, data.id);
    if (!canAccess) {
      return fhirError(403, 'Access denied', 'You do not have permission to access this patient');
    }

    const patient = toFhirPatient(data);
    return fhirResponse(patient);
  } catch (error) {
    console.error('[Patient Read] Error:', error);
    return fhirError(500, 'Internal error', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Create a new patient
 */
async function create(
  resource: unknown,
  context: FhirRequestContext
): Promise<NextResponse> {
  const { user, tenantId } = context;

  // Validate resource type
  if (!resource || typeof resource !== 'object' || (resource as Record<string, unknown>).resourceType !== 'Patient') {
    return fhirError(400, 'Invalid resource', 'Request body must be a Patient resource');
  }

  const patient = resource as FhirPatient;

  try {
    const supabase = await createTenantClient(user);

    // Generate ID if not provided
    if (!patient.id) {
      patient.id = crypto.randomUUID();
    }

    const row = toDbRow(patient, tenantId);

    const { data, error } = await supabase
      .from('patients')
      .insert(row)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return fhirError(409, 'Conflict', `Patient with id '${patient.id}' already exists`);
      }
      console.error('[Patient Create] Database error:', error);
      return fhirError(500, 'Database error', error.message);
    }

    const created = toFhirPatient(data);
    return fhirCreated(created, context);
  } catch (error) {
    console.error('[Patient Create] Error:', error);
    return fhirError(500, 'Internal error', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Update an existing patient
 */
async function update(
  id: string,
  resource: unknown,
  context: FhirRequestContext
): Promise<NextResponse> {
  const { user, tenantId } = context;

  // Validate resource type
  if (!resource || typeof resource !== 'object' || (resource as Record<string, unknown>).resourceType !== 'Patient') {
    return fhirError(400, 'Invalid resource', 'Request body must be a Patient resource');
  }

  const patient = resource as FhirPatient;

  // Ensure ID matches URL
  if (patient.id && patient.id !== id) {
    return fhirError(400, 'ID mismatch', 'Resource ID in body does not match URL');
  }

  patient.id = id;

  try {
    const supabase = await createTenantClient(user);

    // Check if exists and get current version
    const { data: existing, error: existError } = await supabase
      .from('patients')
      .select('id, version_id')
      .eq('tenant_id', tenantId)
      .eq('resource_id', id)
      .single();

    if (existError || !existing) {
      return fhirError(404, 'Patient not found', `No Patient found with id '${id}'`);
    }

    // Check access permission
    const canAccess = await canAccessPatient(user, existing.id);
    if (!canAccess) {
      return fhirError(403, 'Access denied', 'You do not have permission to update this patient');
    }

    const row = toDbRow(patient, tenantId);

    const { data, error } = await supabase
      .from('patients')
      .update({
        ...row,
        version_id: existing.version_id + 1,
        last_updated: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[Patient Update] Database error:', error);
      return fhirError(500, 'Database error', error.message);
    }

    const updated = toFhirPatient(data);
    return fhirResponse(updated);
  } catch (error) {
    console.error('[Patient Update] Error:', error);
    return fhirError(500, 'Internal error', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Delete a patient (soft delete - set active=false)
 */
async function deletePatient(
  id: string,
  context: FhirRequestContext
): Promise<NextResponse> {
  const { user, tenantId } = context;

  try {
    const supabase = await createTenantClient(user);

    // Check if exists
    const { data: existing, error: existError } = await supabase
      .from('patients')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('resource_id', id)
      .single();

    if (existError || !existing) {
      return fhirError(404, 'Patient not found', `No Patient found with id '${id}'`);
    }

    // Check access permission
    const canAccess = await canAccessPatient(user, existing.id);
    if (!canAccess) {
      return fhirError(403, 'Access denied', 'You do not have permission to delete this patient');
    }

    // Soft delete
    const { error } = await supabase
      .from('patients')
      .update({ active: false })
      .eq('id', existing.id);

    if (error) {
      console.error('[Patient Delete] Database error:', error);
      return fhirError(500, 'Database error', error.message);
    }

    return fhirNoContent();
  } catch (error) {
    console.error('[Patient Delete] Error:', error);
    return fhirError(500, 'Internal error', error instanceof Error ? error.message : 'Unknown error');
  }
}

const handler: ResourceHandler = {
  search,
  read,
  create,
  update,
  delete: deletePatient,
};

export default handler;
