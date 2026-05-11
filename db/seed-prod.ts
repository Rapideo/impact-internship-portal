import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { SEED_PHASES } from './seed-data/phases';
import { SEED_BARRIERS } from './seed-data/barriers';
import { SEED_PROGRAM_INFO } from './seed-data/program-info';
import { SEED_QUESTION_SETS } from './seed-data/question-sets';

/**
 * Production-bootstrap seed runner.
 *
 * Idempotent: each section checks for existing rows and skips if present.
 * Only seeds the program-wide reference data needed for the app to function:
 *   - program_info (singleton)
 *   - phases (4 program-wide phase labels)
 *   - barriers (12 barrier library entries)
 *   - question_sets of kind 'standard' or 'competency-core' (no cohort/intern fixtures)
 *
 * Does NOT seed: employers, roles, cohorts, interns, sample question sets tied
 * to specific cohorts. Those are populated by the IMPACT team via the admin UI.
 *
 * Usage: only run once against fresh prod database (post-migrate).
 *   PROD_DATABASE_URL=... npx tsx db/seed-prod.ts
 */
const databaseUrl = process.env.PROD_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('PROD_DATABASE_URL (or DATABASE_URL) is required');
  process.exit(1);
}

async function main() {
  const client = postgres(databaseUrl!, { max: 1 });
  const db = drizzle(client, { schema });

  console.log('Checking program_info...');
  const existingProgramInfo = await db.select().from(schema.programInfo);
  if (existingProgramInfo.length === 0) {
    console.log('  Inserting program_info row.');
    await db.insert(schema.programInfo).values({
      id: 1,
      programName: SEED_PROGRAM_INFO.programName,
      organizationName: SEED_PROGRAM_INFO.organizationName,
      contactEmail: SEED_PROGRAM_INFO.contactEmail,
      phone: SEED_PROGRAM_INFO.phone,
      defaultCohortLengthWeeks: SEED_PROGRAM_INFO.defaultCohortLengthWeeks,
      fiscalYearStartMonth: SEED_PROGRAM_INFO.fiscalYearStartMonth,
    });
  } else {
    console.log('  program_info already present; skipping.');
  }

  console.log('Checking phases...');
  const existingPhases = await db.select().from(schema.phases);
  if (existingPhases.length === 0) {
    console.log(`  Inserting ${SEED_PHASES.length} phases.`);
    await db
      .insert(schema.phases)
      .values(SEED_PHASES.map((p) => ({ label: p.label, sortOrder: p.sortOrder })));
  } else {
    console.log(`  ${existingPhases.length} phases already present; skipping.`);
  }

  console.log('Checking barriers...');
  const existingBarriers = await db.select().from(schema.barriers);
  if (existingBarriers.length === 0) {
    console.log(`  Inserting ${SEED_BARRIERS.length} barriers.`);
    await db
      .insert(schema.barriers)
      .values(SEED_BARRIERS.map((b) => ({ label: b.label, sortOrder: b.sortOrder })));
  } else {
    console.log(`  ${existingBarriers.length} barriers already present; skipping.`);
  }

  console.log('Checking question_sets (standard + competency-core only)...');
  const bootstrapSets = SEED_QUESTION_SETS.filter(
    (qs) => qs.kind === 'standard' || qs.kind === 'competency-core',
  );
  for (const qset of bootstrapSets) {
    const existing = await db
      .select()
      .from(schema.questionSets)
      .where(eq(schema.questionSets.id, qset.id));
    if (existing.length === 0) {
      console.log(`  Inserting question_set "${qset.id}".`);
      await db.insert(schema.questionSets).values({
        id: qset.id,
        kind: qset.kind,
        name: qset.name,
        cohortId: qset.cohortId,
        internId: qset.internId,
        minRequired: qset.minRequired,
        allowMultiple: qset.allowMultiple,
      });
      if (qset.questions.length > 0) {
        await db.insert(schema.questions).values(
          qset.questions.map((q) => ({
            id: q.id,
            questionSetId: qset.id,
            type: q.type,
            label: q.label,
            helperText: q.helperText,
            required: q.required,
            sortOrder: q.sortOrder,
            config: q.config,
          })),
        );
      }
    } else {
      console.log(`  question_set "${qset.id}" already present; skipping.`);
    }
  }

  console.log('Prod bootstrap complete.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
