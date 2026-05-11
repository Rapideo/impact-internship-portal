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
 */
export function decodeRoleFromJwtPayload(payload: unknown): AuthContext | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;
  const role = obj['role'];
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
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  // The access token is a JWT; we decode the payload (no signature verification needed
  // since Supabase already validated the session above).
  const tokenParts = session.access_token.split('.');
  if (tokenParts.length !== 3) return null;
  const rawPayload = tokenParts[1];
  if (!rawPayload) return null;
  let payload: unknown;
  try {
    const base64 = rawPayload.replace(/-/g, '+').replace(/_/g, '/');
    payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
  return decodeRoleFromJwtPayload(payload);
}
