import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load .env.local first (project convention — gitignored, holds real values),
// then fall back to .env. This matches how the React Router runtime loads env.
config({ path: '.env.local' });
config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required for drizzle-kit');
}

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL },
  verbose: true,
  strict: true,
});
