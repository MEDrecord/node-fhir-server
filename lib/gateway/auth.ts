import type { GatewayUser } from '@/lib/fhir/types';

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://auth-test-b2c.healthtalk.ai';

/**
 * Validate request against MEDrecord Gateway and get user info
 * Forwards cookies and API key headers to gateway for validation
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

    // Forward tenant ID if provided
    const tenantId = request.headers.get('x-tenant-id');
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    // Call gateway to validate and get user info
    const response = await fetch(`${GATEWAY_URL}/api/user/me`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const userData = await response.json();

    // Map gateway response to our GatewayUser type
    const user: GatewayUser = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: mapGatewayRole(userData.role),
      tenantId: userData.tenantId || tenantId || '',
      patientId: userData.patientId,
      practitionerId: userData.practitionerId,
    };

    return user;
  } catch (error) {
    console.error('[FHIR Auth] Gateway validation failed:', error);
    return null;
  }
}

/**
 * Map gateway roles to our internal role enum
 */
function mapGatewayRole(role: string): GatewayUser['role'] {
  const roleMap: Record<string, GatewayUser['role']> = {
    'super_admin': 'super_admin',
    'superadmin': 'super_admin',
    'tenant_admin': 'tenant_admin',
    'tenantadmin': 'tenant_admin',
    'admin': 'tenant_admin',
    'practitioner': 'practitioner',
    'doctor': 'practitioner',
    'nurse': 'practitioner',
    'patient': 'patient',
    'researcher': 'researcher',
    'dev': 'dev',
    'developer': 'dev',
  };

  return roleMap[role?.toLowerCase()] || 'patient';
}

/**
 * Check if user has required scope for FHIR operation
 */
export function hasScope(
  user: GatewayUser,
  resourceType: string,
  operation: 'read' | 'write' | 'delete'
): boolean {
  const { role } = user;

  // Super admin and tenant admin have full access
  if (role === 'super_admin' || role === 'tenant_admin') {
    return true;
  }

  // Practitioner access
  if (role === 'practitioner') {
    // Practitioners can read/write clinical data for their patients
    const clinicalResources = [
      'Patient', 'Observation', 'Condition', 'AllergyIntolerance',
      'MedicationRequest', 'Encounter', 'Procedure'
    ];
    
    if (clinicalResources.includes(resourceType)) {
      return operation !== 'delete'; // No delete for practitioners
    }
    return false;
  }

  // Patient access
  if (role === 'patient') {
    // Patients can only read their own data
    const patientResources = [
      'Patient', 'Observation', 'Condition', 'AllergyIntolerance',
      'MedicationRequest', 'Encounter'
    ];
    
    return patientResources.includes(resourceType) && operation === 'read';
  }

  // Researcher access
  if (role === 'researcher') {
    // Researchers can only read anonymized data
    return operation === 'read';
  }

  // Dev access
  if (role === 'dev') {
    // Developers have read-only access
    return operation === 'read';
  }

  return false;
}

/**
 * Get SMART on FHIR scopes for user role
 */
export function getScopesForRole(role: GatewayUser['role']): string[] {
  const scopeMap: Record<GatewayUser['role'], string[]> = {
    super_admin: ['system/*.*'],
    tenant_admin: ['system/*.*'],
    practitioner: [
      'user/Patient.read',
      'user/Observation.*',
      'user/Condition.*',
      'user/AllergyIntolerance.*',
      'user/MedicationRequest.*',
      'user/Encounter.*',
    ],
    patient: [
      'patient/Patient.read',
      'patient/Observation.read',
      'patient/Condition.read',
      'patient/AllergyIntolerance.read',
      'patient/MedicationRequest.read',
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
