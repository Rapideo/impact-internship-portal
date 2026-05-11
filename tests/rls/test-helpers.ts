import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import postgres from 'postgres';

/**
 * Open a connection that simulates an authenticated user with the given role + claims.
 * We use Postgres's request.jwt.claims setting to inject claims that auth.jwt() reads.
 */
export async function withClaims<T>(
  claims: Record<string, unknown>,
  fn: (sql: postgres.Sql) => Promise<T>,
): Promise<T> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL required');

  const sql = postgres(databaseUrl, { max: 1 });
  try {
    // The 'authenticated' role exists in Supabase Postgres. Switch to it for RLS to apply.
    await sql`SELECT set_config('request.jwt.claims', ${JSON.stringify(claims)}, false)`;
    await sql`SET LOCAL ROLE authenticated`;
    return await fn(sql);
  } finally {
    await sql.end();
  }
}

export const ADMIN_CLAIMS = (userId: string) => ({
  sub: userId,
  role: 'admin',
});

export const EMPLOYER_CLAIMS = (userId: string, employerId: string) => ({
  sub: userId,
  role: 'employer',
  employer_id: employerId,
});
