import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';
import { env } from './env.server';

/**
 * Service-role Drizzle client. Bypasses RLS by connecting as a Postgres
 * superuser/BYPASSRLS role.
 *
 * Use ONLY in the two anonymous paths: the intern self-assessment submission
 * insert (+ `getOneShotSubmission` read) and the identity throttle in
 * `identity-throttle.server.ts`. Never expose to client code; never use in
 * admin/employer paths where RLS-scoped queries are the correct safety net.
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
  // Serverless hardening (incident 2026-09-12): a Lambda instance is frozen between
  // invocations and its idle pooler socket can be dropped silently; the next query on a
  // half-open socket hangs until the platform kills the invocation. Close idle
  // connections ourselves, recycle long-lived ones, and never wait 30 s to connect.
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connect_timeout: 10,
  // ROOT CAUSE of the 2026-09-12 sign-in stall: with max:1, concurrent queries (any
  // `Promise.all` over `db`) are PIPELINED on the single socket, and Supavisor's
  // transaction-mode pooler (port 6543, production) hangs on pipelined statements —
  // reproduced 10/10 from a workstation; the session pooler (5432, dev) is unaffected.
  // max_pipeline 0 makes postgres-js queue instead of pipeline. Never remove.
  max_pipeline: 0,
  // postgres-js parses max_pipeline at runtime but omits it from its type declarations.
} as postgres.Options<Record<string, postgres.PostgresType>> & { max_pipeline: number });

export const dbService = drizzle(client, { schema });
export type DBService = typeof dbService;
