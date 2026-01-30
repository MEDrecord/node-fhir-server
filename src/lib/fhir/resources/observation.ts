/**
 * Observation Resource Handler (nl-core vitals)
 * 
 * Implements FHIR R4 Observation resource operations with Dutch ZIB profile support.
 * Supports: BloodPressure, BodyWeight, BodyHeight, LaboratoryTestResult
 */

import { NextResponse } from 'next/server';
import type { FhirObservation, FhirRequestContext, FhirSearchParams } from '@/types/fhir';
import type { ResourceHandler } from '@/lib/fhir/router';
import { createTenantClient, createAdminClient, type Database } from '@/lib/supabase/client';
import { canAccessPatient } from '@/lib/gateway/auth';
import {
  buildSearchBundle,
  fhirResponse,
  fhirCreated,
  fhirError,
  fhirNoContent,
  extractPagination,
} from '@/lib/fhir/utils/response';

// nl-core Observation profiles
const PROFILES = {
  bloodPressure: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-BloodPressure',
  bodyWeight: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-BodyWeight',
  bodyHeight: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-BodyHeight',
  labResult: 'http://nictiz.nl/fhir/StructureDefinition/nl-core-LaboratoryTestResult',
};

// LOINC codes for vital signs
const LOINC_CODES = {
  bloodPressure: '85354-9',
  systolicBP: '8480-6',
  diastolicBP: '8462-4',
  bodyWeight: '29463-7',
  bodyHeight: '8302-2',
};

/**
 * Transform database row to FHIR Observation
 */
function toFhirObservation(row: Database['public']['Tables']['observations']['Row']): FhirObservation {
  const observation = row.resource as unknown as FhirObservation;
  
  return {
    ...observation,
    resourceType: 'Observation',
    id: row.resource_id,
    meta: {
      ...observation.meta,
      versionId: String(row.version_id),
      lastUpdated: row.last_updated,
    },
  };
}

/**
 * Determine profile from observation code
 */
function getProfile(observation: FhirObservation): string {
  const code = observation.code?.coding?.[0]?.code;
  
  switch (code) {
    case LOINC_CODES.bloodPressure:
      return PROFILES.bloodPressure;
    case LOINC_CODES.bodyWeight:
      return PROFILES.bodyWeight;
    case LOINC_CODES.bodyHeight:
      return PROFILES.bodyHeight;
    default:
      // Check category for lab results
      const category = observation.category?.[0]?.coding?.[0]?.code;
      if (category === 'laboratory') {
        return PROFILES.labResult;
      }
      return PROFILES.labResult; // Default
  }
}

/**
 * Extract patient ID from subject reference
 */
function extractPatientId(subject: FhirObservation['subject']): string | null {
  if (!subject?.reference) return null;
  
  // Format: Patient/{id} or {baseUrl}/Patient/{id}
  const match = subject.reference.match(/Patient\/([^/]+)$/);
  return match ? match[1] : null;
}

/**
 * Transform FHIR Observation to database row
 */
async function toDbRow(
  observation: FhirObservation,
  tenantId: string
): Promise<Database['public']['Tables']['observations']['Insert'] | null> {
  // Extract patient ID from subject reference
  const patientResourceId = extractPatientId(observation.subject);
  if (!patientResourceId) {
    return null;
  }

  // Look up patient internal ID
  const supabase = createAdminClient();
  const { data: patient } = await supabase
    .from('patients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('resource_id', patientResourceId)
    .single();

  if (!patient) {
    return null;
  }

  // Extract indexed fields
  const code = observation.code?.coding?.[0];
  const category = observation.category?.[0]?.coding?.[0]?.code;
  const effectiveDate = observation.effectiveDateTime || observation.effectivePeriod?.start;
  const valueQuantity = observation.valueQuantity;

  return {
    tenant_id: tenantId,
    resource_id: observation.id || crypto.randomUUID(),
    patient_id: patient.id,
    code_system: code?.system || null,
    code_code: code?.code || null,
    code_display: code?.display || null,
    category: category || null,
    status: observation.status,
    effective_date: effectiveDate || null,
    value_quantity_value: valueQuantity?.value ?? null,
    value_quantity_unit: valueQuantity?.unit || null,
    resource: observation as unknown as Record<string, unknown>,
  };
}

/**
 * Search for observations
 */
async function search(
  params: FhirSearchParams,
  context: FhirRequestContext
): Promise<NextResponse> {
  const { user, tenantId } = context;
  const { count, offset } = extractPagination(params);

  try {
    const supabase = await createTenantClient(user);

    // Build query
    let query = supabase
      .from('observations')
      .select('*, patients!inner(resource_id)', { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply search parameters
    if (params._id) {
      query = query.eq('resource_id', params._id);
    }

    if (params.patient) {
      // Patient can be reference (Patient/123) or just ID
      const patientId = String(params.patient).replace(/^Patient\//, '');
      query = query.eq('patients.resource_id', patientId);
    }

    if (params.subject) {
      const subjectId = String(params.subject).replace(/^Patient\//, '');
      query = query.eq('patients.resource_id', subjectId);
    }

    if (params.code) {
      // Format: system|code or just code
      const codeParts = String(params.code).split('|');
      if (codeParts.length === 2) {
        query = query.eq('code_system', codeParts[0]).eq('code_code', codeParts[1]);
      } else {
        query = query.eq('code_code', codeParts[0]);
      }
    }

    if (params.category) {
      query = query.eq('category', params.category);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.date) {
      // Support date comparisons: eq, gt, lt, ge, le
      const dateStr = String(params.date);
      if (dateStr.startsWith('ge')) {
        query = query.gte('effective_date', dateStr.slice(2));
      } else if (dateStr.startsWith('le')) {
        query = query.lte('effective_date', dateStr.slice(2));
      } else if (dateStr.startsWith('gt')) {
        query = query.gt('effective_date', dateStr.slice(2));
      } else if (dateStr.startsWith('lt')) {
        query = query.lt('effective_date', dateStr.slice(2));
      } else {
        query = query.eq('effective_date', dateStr);
      }
    }

    // Patient role: only own observations
    if (user.role === 'patient' && user.patientId) {
      query = query.eq('patient_id', user.patientId);
    }

    // Practitioner role: filter by care relationships
    if (user.role === 'practitioner' && user.practitionerId) {
      const { data: carePatients } = await supabase
        .from('care_relationships')
        .select('patient_id')
        .eq('tenant_id', tenantId)
        .eq('practitioner_id', user.practitionerId)
        .eq('active', true);

      if (carePatients && carePatients.length > 0) {
        query = query.in('patient_id', carePatients.map((p) => p.patient_id));
      } else {
        // No patients in care - return empty
        return fhirResponse(buildSearchBundle([], 0, context, params as Record<string, string>));
      }
    }

    // Pagination
    query = query.range(offset, offset + count - 1);

    // Sort
    if (params._sort === '-date') {
      query = query.order('effective_date', { ascending: false });
    } else if (params._sort === 'date') {
      query = query.order('effective_date', { ascending: true });
    } else {
      query = query.order('last_updated', { ascending: false });
    }

    const { data, error, count: total } = await query;

    if (error) {
      console.error('[Observation Search] Database error:', error);
      return fhirError(500, 'Database error', error.message);
    }

    const observations = (data || []).map(toFhirObservation);
    const bundle = buildSearchBundle(observations, total || 0, context, params as Record<string, string>);

    return fhirResponse(bundle);
  } catch (error) {
    console.error('[Observation Search] Error:', error);
    return fhirError(500, 'Internal error', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Read a single observation by ID
 */
async function read(
  id: string,
  context: FhirRequestContext
): Promise<NextResponse> {
  const { user, tenantId } = context;

  try {
    const supabase = await createTenantClient(user);

    const { data, error } = await supabase
      .from('observations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('resource_id', id)
      .single();

    if (error || !data) {
      return fhirError(404, 'Observation not found', `No Observation found with id '${id}'`);
    }

    // Check access permission
    const canAccess = await canAccessPatient(user, data.patient_id);
    if (!canAccess) {
      return fhirError(403, 'Access denied', 'You do not have permission to access this observation');
    }

    const observation = toFhirObservation(data);
    return fhirResponse(observation);
  } catch (error) {
    console.error('[Observation Read] Error:', error);
    return fhirError(500, 'Internal error', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Create a new observation
 */
async function create(
  resource: unknown,
  context: FhirRequestContext
): Promise<NextResponse> {
  const { user, tenantId } = context;

  // Validate resource type
  if (!resource || typeof resource !== 'object' || (resource as Record<string, unknown>).resourceType !== 'Observation') {
    return fhirError(400, 'Invalid resource', 'Request body must be an Observation resource');
  }

  const observation = resource as FhirObservation;

  // Validate required fields
  if (!observation.status) {
    return fhirError(400, 'Missing required field', 'Observation.status is required');
  }

  if (!observation.code) {
    return fhirError(400, 'Missing required field', 'Observation.code is required');
  }

  if (!observation.subject) {
    return fhirError(400, 'Missing required field', 'Observation.subject is required');
  }

  try {
    const supabase = await createTenantClient(user);

    // Generate ID if not provided
    if (!observation.id) {
      observation.id = crypto.randomUUID();
    }

    // Add profile
    observation.meta = {
      ...observation.meta,
      profile: [getProfile(observation)],
    };

    const row = await toDbRow(observation, tenantId);
    if (!row) {
      return fhirError(400, 'Invalid patient reference', 'Referenced patient not found');
    }

    // Check access permission to patient
    const canAccess = await canAccessPatient(user, row.patient_id);
    if (!canAccess) {
      return fhirError(403, 'Access denied', 'You do not have permission to create observations for this patient');
    }

    const { data, error } = await supabase
      .from('observations')
      .insert(row)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return fhirError(409, 'Conflict', `Observation with id '${observation.id}' already exists`);
      }
      console.error('[Observation Create] Database error:', error);
      return fhirError(500, 'Database error', error.message);
    }

    const created = toFhirObservation(data);
    return fhirCreated(created, context);
  } catch (error) {
    console.error('[Observation Create] Error:', error);
    return fhirError(500, 'Internal error', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Update an existing observation
 */
async function update(
  id: string,
  resource: unknown,
  context: FhirRequestContext
): Promise<NextResponse> {
  const { user, tenantId } = context;

  // Validate resource type
  if (!resource || typeof resource !== 'object' || (resource as Record<string, unknown>).resourceType !== 'Observation') {
    return fhirError(400, 'Invalid resource', 'Request body must be an Observation resource');
  }

  const observation = resource as FhirObservation;

  // Ensure ID matches URL
  if (observation.id && observation.id !== id) {
    return fhirError(400, 'ID mismatch', 'Resource ID in body does not match URL');
  }

  observation.id = id;

  try {
    const supabase = await createTenantClient(user);

    // Check if exists
    const { data: existing, error: existError } = await supabase
      .from('observations')
      .select('id, version_id, patient_id')
      .eq('tenant_id', tenantId)
      .eq('resource_id', id)
      .single();

    if (existError || !existing) {
      return fhirError(404, 'Observation not found', `No Observation found with id '${id}'`);
    }

    // Check access permission
    const canAccess = await canAccessPatient(user, existing.patient_id);
    if (!canAccess) {
      return fhirError(403, 'Access denied', 'You do not have permission to update this observation');
    }

    const row = await toDbRow(observation, tenantId);
    if (!row) {
      return fhirError(400, 'Invalid patient reference', 'Referenced patient not found');
    }

    const { data, error } = await supabase
      .from('observations')
      .update({
        ...row,
        version_id: existing.version_id + 1,
        last_updated: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('[Observation Update] Database error:', error);
      return fhirError(500, 'Database error', error.message);
    }

    const updated = toFhirObservation(data);
    return fhirResponse(updated);
  } catch (error) {
    console.error('[Observation Update] Error:', error);
    return fhirError(500, 'Internal error', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Delete an observation
 */
async function deleteObservation(
  id: string,
  context: FhirRequestContext
): Promise<NextResponse> {
  const { user, tenantId } = context;

  try {
    const supabase = await createTenantClient(user);

    // Check if exists
    const { data: existing, error: existError } = await supabase
      .from('observations')
      .select('id, patient_id')
      .eq('tenant_id', tenantId)
      .eq('resource_id', id)
      .single();

    if (existError || !existing) {
      return fhirError(404, 'Observation not found', `No Observation found with id '${id}'`);
    }

    // Check access permission
    const canAccess = await canAccessPatient(user, existing.patient_id);
    if (!canAccess) {
      return fhirError(403, 'Access denied', 'You do not have permission to delete this observation');
    }

    // Hard delete (observations can be recreated if needed)
    const { error } = await supabase
      .from('observations')
      .delete()
      .eq('id', existing.id);

    if (error) {
      console.error('[Observation Delete] Database error:', error);
      return fhirError(500, 'Database error', error.message);
    }

    return fhirNoContent();
  } catch (error) {
    console.error('[Observation Delete] Error:', error);
    return fhirError(500, 'Internal error', error instanceof Error ? error.message : 'Unknown error');
  }
}

const handler: ResourceHandler = {
  search,
  read,
  create,
  update,
  delete: deleteObservation,
};

export default handler;
