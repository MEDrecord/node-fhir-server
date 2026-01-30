import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { GatewayUser } from '@/lib/fhir/types';

/**
 * Create a Supabase client with user context for RLS
 * This sets the app.* settings used by RLS policies
 */
export function createServerClient(user?: GatewayUser) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const client = createSupabaseClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}

/**
 * Set RLS context for the current request
 * This must be called before any queries to enable RLS policies
 */
export async function setRLSContext(
  client: ReturnType<typeof createServerClient>,
  user: GatewayUser
) {
  // Set session variables for RLS policies
  await client.rpc('set_config', {
    setting: 'app.tenant_id',
    value: user.tenantId,
  });

  await client.rpc('set_config', {
    setting: 'app.user_role',
    value: user.role,
  });

  await client.rpc('set_config', {
    setting: 'app.gateway_user_id',
    value: user.id,
  });

  if (user.patientId) {
    await client.rpc('set_config', {
      setting: 'app.user_patient_id',
      value: user.patientId,
    });
  }

  if (user.practitionerId) {
    await client.rpc('set_config', {
      setting: 'app.user_practitioner_id',
      value: user.practitionerId,
    });
  }
}

/**
 * Create a Supabase client with RLS context already set
 */
export async function createContextualClient(user: GatewayUser) {
  const client = createServerClient(user);
  await setRLSContext(client, user);
  return client;
}
