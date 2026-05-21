import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import postgres from 'postgres';

/**
 * Open a connection that simulates an authenticated user with the given role + claims.
 *
 * We use Postgres's `request.jwt.claims` setting to inject claims that Supabase's
 * `auth.jwt()` reads, and we switch to the `authenticated` role so RLS policies apply.
 *
 * `SET LOCAL` only takes effect inside a transaction block, so we wrap all work in
 * `sql.begin(...)`. Without the transaction, `SET LOCAL ROLE` emits a WARNING and
 * the session stays on the service role (which has BYPASSRLS) — making every test
 * silently pass regardless of policy correctness.
 */
export async function withClaims<T>(
  claims: Record<string, unknown>,
  fn: (sql: postgres.Sql) => Promise<T>,
): Promise<T> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL required');

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    // postgres.js's `sql.begin` unwraps Promise<T> arrays to T arrays in its
    // return type; we cast back to T to keep the helper's signature predictable.
    return (await sql.begin(async (tx) => {
      // `set_config(..., true)` = transaction-local, matching SET LOCAL semantics.
      await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
      await tx`SET LOCAL ROLE authenticated`;
      return await fn(tx as unknown as postgres.Sql);
    })) as T;
  } finally {
    await sql.end();
  }
}

// Application role is in `user_role` (not the top-level `role` claim, which
// PostgREST uses for `SET LOCAL ROLE` and stays at 'authenticated'). Matches
// `db/policies/0004_jwt_hook.sql`.
export const ADMIN_CLAIMS = (userId: string) => ({
  sub: userId,
  role: 'authenticated',
  user_role: 'admin',
});

export const EMPLOYER_CLAIMS = (userId: string, employerId: string) => ({
  sub: userId,
  role: 'authenticated',
  user_role: 'employer',
  employer_id: employerId,
});
