import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import postgres from 'postgres';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const POLICIES_DIR = join(process.cwd(), 'db', 'policies');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

async function main() {
  const files = (await readdir(POLICIES_DIR)).filter((f) => f.endsWith('.sql')).sort();

  if (files.length === 0) {
    console.log('No policy files found in db/policies/');
    return;
  }

  const sql = postgres(databaseUrl!, { max: 1 });

  try {
    for (const file of files) {
      const path = join(POLICIES_DIR, file);
      const content = await readFile(path, 'utf-8');
      console.log(`Applying ${file}...`);
      await sql.unsafe(content);
    }
    console.log(`Applied ${files.length} policy file(s).`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
