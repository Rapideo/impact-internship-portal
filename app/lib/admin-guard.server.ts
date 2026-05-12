import { redirect } from 'react-router';
import { getAuthContext, type AuthContext } from './auth.server';

/**
 * Server-side guard for /admin/* routes. Returns the auth context if
 * the current session is an admin. Throws a redirect Response if not
 * (anonymous → /login; employer → /employer).
 *
 * The returned `headers` object is the one passed to getAuthContext —
 * the loader/action must include it in any Response/redirect it
 * eventually returns so that refreshed Supabase cookies are sent.
 */
export async function requireAdmin(
  request: Request,
): Promise<{ auth: AuthContext; headers: Headers }> {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth) {
    throw redirect('/login', { headers });
  }
  if (auth.role !== 'admin') {
    throw redirect('/employer', { headers });
  }
  return { auth, headers };
}
