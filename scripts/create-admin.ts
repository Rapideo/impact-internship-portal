import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';
import { parseArgs } from 'node:util';
import { eq } from 'drizzle-orm';

const args = parseArgs({
  options: {
    email: { type: 'string' },
    password: { type: 'string' },
  },
}).values;

if (!args.email || !args.password) {
  console.error('Usage: npm run admin:create -- --email=<email> --password=<password>');
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DATABASE_URL) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  console.log(`Creating admin account: ${args.email}`);
  const { data, error } = await supabase.auth.admin.createUser({
    email: args.email!,
    password: args.password!,
    email_confirm: true,
  });
  if (error) {
    console.error('Failed to create user:', error.message);
    process.exit(1);
  }
  if (!data.user) {
    console.error('No user returned');
    process.exit(1);
  }
  const userId = data.user.id;
  console.log(`User created: ${userId}`);

  const client = postgres(DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });

  const existing = await db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, userId));
  if (existing.length === 0) {
    await db.insert(schema.profiles).values({
      userId,
      role: 'admin',
      employerId: null,
    });
    console.log(`Profile row inserted with role=admin.`);
  } else {
    console.log(`Profile row already exists; not overwriting.`);
  }

  await client.end();
  console.log(`Admin account ready: ${args.email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
