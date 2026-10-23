import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-only client with the service-role key. It bypasses row-level security, so it is
 * used for exactly one thing: writing the subscription state that Stripe reports.
 * Never import this from a client component.
 */
export function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role is not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
