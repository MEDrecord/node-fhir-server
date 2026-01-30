import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase server client for FHIR operations
 * Uses service role key for full access - authorization is handled at application level
 */
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
