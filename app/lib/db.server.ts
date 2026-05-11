import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';
import { env } from './env.server';

// Use the pooled connection at runtime (Supavisor transaction mode).
// Keep max=1 because Netlify Functions are short-lived.
const client = postgres(env.DATABASE_POOL_URL, {
  max: 1,
  prepare: false, // pgbouncer / transaction-mode pooler requires this
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
