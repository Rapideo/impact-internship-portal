import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.server';

let _admin: SupabaseClient | null = null;

/**
 * Server-only singleton. Uses the service-role key — NEVER expose to client bundles.
 * The `.server.ts` suffix ensures RR v7's bundler keeps this off the client.
 *
 * Distinct from `db.service.server.ts` (Drizzle service-role client). This wraps the
 * Supabase JS client so we can call `auth.admin.*` operations (invite, delete, listUsers).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _admin;
}
