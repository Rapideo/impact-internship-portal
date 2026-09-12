import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';
import { env } from './env.server';

// Use the pooled connection at runtime (Supavisor transaction mode).
// Keep max=1 because Netlify Functions are short-lived.
const client = postgres(env.DATABASE_POOL_URL, {
  max: 1,
  // Required for the Supavisor transaction-mode pooler (port 6543).
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

export const db = drizzle(client, { schema });
export type DB = typeof db;
