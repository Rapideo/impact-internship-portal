import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';
import { env } from './env.server';

/**
 * Service-role Drizzle client. Bypasses RLS by connecting via the postgres
 * role (Supabase's pooled connection user) which has BYPASSRLS by default.
 *
 * Use ONLY in server actions where the actor is anonymous (the 3 intern
 * self-assessment forms). Never expose to client code; never use in
 * admin/employer paths where RLS-scoped queries are the correct safety net.
 *
 * `DATABASE_POOL_URL` is the Supavisor connection whose underlying role is
 * `postgres` — that role bypasses RLS in a fresh Supabase project, which is
 * the behaviour this wrapper depends on. `tests/rls/assessment-submissions.test.ts`
 * verifies the contract end-to-end (anon-key denied, service-role inserts).
 *
 * `prepare: false` is required for Supavisor transaction-mode compatibility
 * (mirrors the regular `db.server.ts` client).
 */
const client = postgres(env.DATABASE_POOL_URL, {
  max: 1,
  prepare: false,
});

export const dbService = drizzle(client, { schema });
export type DBService = typeof dbService;
