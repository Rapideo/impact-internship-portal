import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';
import { env } from './env.server';

/**
 * Service-role Drizzle client. Bypasses RLS by connecting as a Postgres
 * superuser/BYPASSRLS role.
 *
 * Use ONLY in server actions where the actor is anonymous (the 3 intern
 * self-assessment forms + getOneShotSubmission read path). Never expose to
 * client code; never use in admin/employer paths where RLS-scoped queries
 * are the correct safety net.
 *
 * Connection URL resolution (carry-over #77):
 * - Prefers `DATABASE_SERVICE_URL` when set so the pool client (`db.server.ts`)
 *   can be downgraded to a real `anon` Postgres role for genuine RLS
 *   enforcement.
 * - Falls back to `DATABASE_POOL_URL` so today's dev + prod environments
 *   keep working unchanged until the Supabase role provisioning lands.
 *
 * `tests/rls/assessment-submissions.test.ts` verifies the contract end-to-end
 * (anon-key denied, service-role inserts). `prepare: false` is required for
 * Supavisor transaction-mode compatibility (mirrors `db.server.ts`).
 */
const client = postgres(env.DATABASE_SERVICE_URL ?? env.DATABASE_POOL_URL, {
  max: 1,
  prepare: false,
});

export const dbService = drizzle(client, { schema });
export type DBService = typeof dbService;
