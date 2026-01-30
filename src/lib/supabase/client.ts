/**
 * Supabase Serverless Client
 * 
 * Provides connection pooling and tenant-aware database access.
 * All database operations MUST go through this client.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { GatewayUser } from '@/types/fhir';

// Database types (generated from schema)
export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>;
      };
      patients: {
        Row: {
          id: string;
          tenant_id: string;
          resource_id: string;
          bsn_hash: string | null;
          family_name: string | null;
          given_name: string | null;
          birth_date: string | null;
          gender: string | null;
          deceased: boolean;
          active: boolean;
          resource: Record<string, unknown>;
          version_id: number;
          last_updated: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id' | 'version_id' | 'last_updated' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
      };
      practitioners: {
        Row: {
          id: string;
          tenant_id: string;
          resource_id: string;
          agb_code: string | null;
          big_code: string | null;
          family_name: string | null;
          given_name: string | null;
          specialty_code: string | null;
          active: boolean;
          resource: Record<string, unknown>;
          version_id: number;
          last_updated: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['practitioners']['Row'], 'id' | 'version_id' | 'last_updated' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['practitioners']['Insert']>;
      };
      observations: {
        Row: {
          id: string;
          tenant_id: string;
          resource_id: string;
          patient_id: string;
          code_system: string | null;
          code_code: string | null;
          code_display: string | null;
          category: string | null;
          status: string;
          effective_date: string | null;
          value_quantity_value: number | null;
          value_quantity_unit: string | null;
          resource: Record<string, unknown>;
          version_id: number;
          last_updated: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['observations']['Row'], 'id' | 'version_id' | 'last_updated' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['observations']['Insert']>;
      };
      conditions: {
        Row: {
          id: string;
          tenant_id: string;
          resource_id: string;
          patient_id: string;
          code_system: string | null;
          code_code: string | null;
          code_display: string | null;
          clinical_status: string | null;
          verification_status: string | null;
          category: string | null;
          severity: string | null;
          onset_date: string | null;
          abatement_date: string | null;
          resource: Record<string, unknown>;
          version_id: number;
          last_updated: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conditions']['Row'], 'id' | 'version_id' | 'last_updated' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['conditions']['Insert']>;
      };
      allergy_intolerances: {
        Row: {
          id: string;
          tenant_id: string;
          resource_id: string;
          patient_id: string;
          code_system: string | null;
          code_code: string | null;
          code_display: string | null;
          clinical_status: string | null;
          verification_status: string | null;
          type: string | null;
          category: string[] | null;
          criticality: string | null;
          resource: Record<string, unknown>;
          version_id: number;
          last_updated: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['allergy_intolerances']['Row'], 'id' | 'version_id' | 'last_updated' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['allergy_intolerances']['Insert']>;
      };
      medication_requests: {
        Row: {
          id: string;
          tenant_id: string;
          resource_id: string;
          patient_id: string;
          requester_id: string | null;
          medication_code_system: string | null;
          medication_code_code: string | null;
          medication_code_display: string | null;
          status: string;
          intent: string;
          authored_on: string | null;
          resource: Record<string, unknown>;
          version_id: number;
          last_updated: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['medication_requests']['Row'], 'id' | 'version_id' | 'last_updated' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['medication_requests']['Insert']>;
      };
      encounters: {
        Row: {
          id: string;
          tenant_id: string;
          resource_id: string;
          patient_id: string;
          practitioner_id: string | null;
          status: string;
          class_code: string | null;
          type_code: string | null;
          period_start: string | null;
          period_end: string | null;
          resource: Record<string, unknown>;
          version_id: number;
          last_updated: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['encounters']['Row'], 'id' | 'version_id' | 'last_updated' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['encounters']['Insert']>;
      };
      care_relationships: {
        Row: {
          id: string;
          tenant_id: string;
          patient_id: string;
          practitioner_id: string;
          relationship_type: string | null;
          start_date: string | null;
          end_date: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['care_relationships']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['care_relationships']['Insert']>;
      };
      user_mappings: {
        Row: {
          id: string;
          tenant_id: string;
          gateway_user_id: string;
          role: string;
          patient_id: string | null;
          practitioner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_mappings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_mappings']['Insert']>;
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          request_method: string | null;
          request_path: string | null;
          request_ip: string | null;
          response_status: number | null;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
      };
    };
  };
}

/**
 * Create an admin Supabase client (bypasses RLS)
 * Use only for system operations like audit logging
 */
export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a tenant-scoped Supabase client
 * Sets RLS context for tenant and user role isolation
 */
export async function createTenantClient(
  user: GatewayUser
): Promise<SupabaseClient<Database>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const client = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        // Pass tenant context for RLS
        'x-tenant-id': user.tenantId,
        'x-user-role': user.role,
        'x-user-id': user.id,
      },
    },
  });

  // Set RLS context via session variables
  await client.rpc('set_config', { setting: 'app.tenant_id', value: user.tenantId });
  await client.rpc('set_config', { setting: 'app.user_role', value: user.role });
  await client.rpc('set_config', { setting: 'app.gateway_user_id', value: user.id });
  
  if (user.patientId) {
    await client.rpc('set_config', { setting: 'app.user_patient_id', value: user.patientId });
  }
  if (user.practitionerId) {
    await client.rpc('set_config', { setting: 'app.user_practitioner_id', value: user.practitionerId });
  }

  return client;
}

/**
 * Audit log helper - always uses admin client to ensure logging works
 */
export async function logAuditEvent(
  tenantId: string,
  userId: string | null,
  action: string,
  resourceType: string,
  resourceId: string | null,
  request: {
    method?: string;
    path?: string;
    ip?: string;
  },
  responseStatus: number,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const adminClient = createAdminClient();
    
    await adminClient.from('audit_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      request_method: request.method || null,
      request_path: request.path || null,
      request_ip: request.ip || null,
      response_status: responseStatus,
      details: details || null,
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('[FHIR] Audit logging failed:', error);
  }
}
