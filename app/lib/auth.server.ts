import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
  type CookieOptions,
} from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.server';

export type AppRole = 'admin' | 'employer';

export interface AuthContext {
  role: AppRole;
  employerId: string | null;
}

/**
 * Pull the role + employer_id JWT claims out of a parsed payload.
 * Returns null for missing/unknown claims.
 *
 * Reads `user_role` (not the JWT's top-level `role` claim — that is reserved
 * for PostgREST's `SET LOCAL ROLE` and stays at 'authenticated'). The custom
 * access token hook (`db/policies/0004_jwt_hook.sql`) writes the application
 * role into `user_role`.
 */
export function decodeRoleFromJwtPayload(payload: unknown): AuthContext | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;
  const role = obj['user_role'];
  if (role !== 'admin' && role !== 'employer') return null;
  const employerId = typeof obj['employer_id'] === 'string' ? (obj['employer_id'] as string) : null;
  return { role, employerId };
}

/**
 * Create a Supabase server client bound to the current request's cookies.
 * Use this in loaders/actions to read auth state.
 */
export function createSupabaseServerClient(request: Request, headers: Headers): SupabaseClient {
  const cookies = parseCookieHeader(request.headers.get('Cookie') ?? '');
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookies;
      },
      setAll(toSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value, options } of toSet) {
          headers.append('Set-Cookie', serializeCookieHeader(name, value, options));
        }
      },
    },
  });
}

/**
 * Get the current user's auth context (role + employer_id) by parsing the JWT.
 * Returns null if no valid session.
 */
export async function getAuthContext(
  request: Request,
  headers: Headers,
): Promise<AuthContext | null> {
  const supabase = createSupabaseServerClient(request, headers);
  // getClaims() verifies the JWT signature against the project JWKS and returns
  // the verified claims. Do NOT use getSession() here — in cookie-storage mode it
  // returns the cookie contents WITHOUT signature verification, which lets a caller
  // who controls cookies forge a role/employer_id claim.
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  return decodeRoleFromJwtPayload(data.claims);
}
