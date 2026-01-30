/**
 * MEDrecord Gateway Authentication
 * 
 * Validates requests against the MEDrecord Gateway.
 * All authentication flows through the gateway - no local token validation.
 */

import type { GatewayUser, UserRole } from '@/types/fhir';
import { createAdminClient } from '@/lib/supabase/client';

// Gateway base URL
const GATEWAY_URL = process.env.GATEWAY_URL || 'https://auth-test-b2c.healthtalk.ai';

/**
 * Gateway user response from /api/user/me
 */
interface GatewayUserResponse {
  id: string;
  email: string;
  name?: string;
  role: string;
  tenantId: string;
  permissions?: string[];
}

/**
 * Map MEDrecord roles to SMART on FHIR scopes
 */
function mapRoleToScopes(role: UserRole): string[] {
  const scopeMap: Record<UserRole, string[]> = {
    super_admin: ['system/*.*'],
    tenant_admin: ['system/*.*'],
    practitioner: [
      'user/Patient.read',
      'user/Patient.write',
      'user/Observation.read',
      'user/Observation.write',
      'user/Condition.read',
      'user/Condition.write',
      'user/AllergyIntolerance.read',
      'user/AllergyIntolerance.write',
      'user/MedicationRequest.read',
      'user/MedicationRequest.write',
      'user/Encounter.read',
      'user/Encounter.write',
    ],
    patient: [
      'patient/Patient.read',
      'patient/Observation.read',
      'patient/Condition.read',
      'patient/AllergyIntolerance.read',
      'patient/MedicationRequest.read',
      'patient/Encounter.read',
    ],
    researcher: [
      'user/Observation.read',
      'user/Condition.read',
    ],
    dev: [
      'system/*.read',
    ],
  };

  return scopeMap[role] || [];
}

/**
 * Validate a request against the MEDrecord Gateway
 * 
 * Forwards cookies/API key to gateway and retrieves user info.
 * Returns null if authentication fails.
 */
export async function validateGatewayAuth(request: Request): Promise<GatewayUser | null> {
  try {
    // Forward relevant headers to gateway
    const headers: Record<string, string> = {};
    
    // Forward cookies for session auth
    const cookie = request.headers.get('cookie');
    if (cookie) {
      headers['Cookie'] = cookie;
    }
    
    // Forward API key for server-to-server auth
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }
    
    // Forward Authorization header (Bearer token)
    const authorization = request.headers.get('authorization');
    if (authorization) {
      headers['Authorization'] = authorization;
    }
    
    // Forward tenant ID if provided
    const tenantId = request.headers.get('x-tenant-id');
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    // No auth headers provided
    if (!cookie && !apiKey && !authorization) {
      return null;
    }

    // Call gateway to validate and get user info
    const response = await fetch(`${GATEWAY_URL}/api/user/me`, {
      method: 'GET',
      headers,
      // Don't follow redirects - we want to see auth failures
      redirect: 'manual',
    });

    if (!response.ok) {
      console.error('[FHIR Auth] Gateway returned:', response.status);
      return null;
    }

    const gatewayUser: GatewayUserResponse = await response.json();

    if (!gatewayUser.id || !gatewayUser.tenantId) {
      console.error('[FHIR Auth] Invalid gateway response - missing id or tenantId');
      return null;
    }

    // Validate role is a known role
    const validRoles: UserRole[] = ['super_admin', 'tenant_admin', 'practitioner', 'patient', 'researcher', 'dev'];
    const role = validRoles.includes(gatewayUser.role as UserRole) 
      ? (gatewayUser.role as UserRole)
      : 'dev'; // Default to most restrictive non-patient role

    // Look up user mapping to get patient/practitioner IDs
    const userMapping = await getUserMapping(gatewayUser.id, gatewayUser.tenantId);

    const user: GatewayUser = {
      id: gatewayUser.id,
      email: gatewayUser.email,
      name: gatewayUser.name,
      role,
      tenantId: gatewayUser.tenantId,
      patientId: userMapping?.patientId,
      practitionerId: userMapping?.practitionerId,
      scopes: mapRoleToScopes(role),
    };

    return user;
  } catch (error) {
    console.error('[FHIR Auth] Gateway validation error:', error);
    return null;
  }
}

/**
 * Get user mapping from database
 * Maps gateway user ID to patient/practitioner FHIR resources
 */
async function getUserMapping(
  gatewayUserId: string,
  tenantId: string
): Promise<{ patientId?: string; practitionerId?: string } | null> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('user_mappings')
      .select('patient_id, practitioner_id')
      .eq('gateway_user_id', gatewayUserId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      patientId: data.patient_id || undefined,
      practitionerId: data.practitioner_id || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Check if user has required scope for an action
 */
export function hasScope(
  user: GatewayUser,
  resourceType: string,
  action: 'read' | 'write'
): boolean {
  const { scopes, role } = user;

  // Super admin and tenant admin have full access
  if (role === 'super_admin' || role === 'tenant_admin') {
    return true;
  }

  // Check for matching scope
  return scopes.some((scope) => {
    // Parse scope: context/resource.action
    const match = scope.match(/^(system|user|patient)\/(\*|[A-Za-z]+)\.(\*|read|write)$/);
    if (!match) return false;

    const [, context, resource, scopeAction] = match;

    // Check resource match
    if (resource !== '*' && resource !== resourceType) {
      return false;
    }

    // Check action match
    if (scopeAction !== '*' && scopeAction !== action) {
      return false;
    }

    // For patient context, only allow if user is the patient
    if (context === 'patient' && role !== 'patient') {
      return false;
    }

    return true;
  });
}

/**
 * Check if user can access a specific patient's data
 */
export async function canAccessPatient(
  user: GatewayUser,
  patientId: string
): Promise<boolean> {
  const { role, patientId: userPatientId, practitionerId } = user;

  // Super admin and tenant admin can access all patients
  if (role === 'super_admin' || role === 'tenant_admin') {
    return true;
  }

  // Patient can only access their own data
  if (role === 'patient') {
    return userPatientId === patientId;
  }

  // Practitioner can access patients in their care
  if (role === 'practitioner' && practitionerId) {
    return await hasCareRelationship(user.tenantId, practitionerId, patientId);
  }

  // Researcher can access (anonymized) - handled at query level
  if (role === 'researcher') {
    return true;
  }

  // Dev can read for testing
  if (role === 'dev') {
    return true;
  }

  return false;
}

/**
 * Check if practitioner has active care relationship with patient
 */
async function hasCareRelationship(
  tenantId: string,
  practitionerId: string,
  patientId: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('care_relationships')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('practitioner_id', practitionerId)
      .eq('patient_id', patientId)
      .eq('active', true)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Extract tenant ID from request
 * Priority: X-Tenant-ID header > user's tenantId
 */
export function extractTenantId(request: Request, user: GatewayUser): string {
  // Super admin can access any tenant via header
  if (user.role === 'super_admin') {
    const headerTenant = request.headers.get('x-tenant-id');
    if (headerTenant) {
      return headerTenant;
    }
  }
  
  // All other users are bound to their tenant
  return user.tenantId;
}
