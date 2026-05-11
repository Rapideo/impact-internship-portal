import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';
import { env } from './env.server';

// Use the pooled connection at runtime (Supavisor transaction mode).
// Keep max=1 because Netlify Functions are short-lived.
const client = postgres(env.DATABASE_POOL_URL, {
  max: 1,
  // Required for the Supavisor transaction-mode pooler (port 6543).
  // NOTE: DATABASE_POOL_URL currently points at the direct connection in dev .env.local;
  // swap to the regional pooler URL before production to activate the pooled path.
  prepare: false,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
