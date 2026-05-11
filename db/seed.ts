import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { SEED_EMPLOYERS } from './seed-data/employers';
import { SEED_ROLES } from './seed-data/roles';
import { SEED_COHORTS } from './seed-data/cohorts';
import { SEED_PHASES } from './seed-data/phases';
import { SEED_BARRIERS } from './seed-data/barriers';
import { SEED_INTERNS } from './seed-data/interns';
import { SEED_QUESTION_SETS } from './seed-data/question-sets';
import { SEED_PROGRAM_INFO } from './seed-data/program-info';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

async function main() {
  const client = postgres(databaseUrl!, { max: 1 });
  const db = drizzle(client, { schema });

  console.log('Truncating existing data...');
  // Order matters: children first via CASCADE handles dependents, but explicit list
  // here is intentional so the failure mode (FK violation) is obvious if order drifts.
  await client.unsafe(`
    TRUNCATE TABLE
      public.assessment_submissions,
      public.questions,
      public.question_sets,
      public.intern_employment_outcomes,
      public.intern_entry_barriers,
      public.intern_entry_assessment,
      public.interns,
      public.cohort_phases,
      public.cohorts,
      public.roles,
      public.employers,
      public.barriers,
      public.phases,
      public.program_info
    RESTART IDENTITY CASCADE;
  `);

  console.log('Seeding program_info...');
  await db.insert(schema.programInfo).values({
    id: 1,
    programName: SEED_PROGRAM_INFO.programName,
    organizationName: SEED_PROGRAM_INFO.organizationName,
    contactEmail: SEED_PROGRAM_INFO.contactEmail,
    phone: SEED_PROGRAM_INFO.phone,
    defaultCohortLengthWeeks: SEED_PROGRAM_INFO.defaultCohortLengthWeeks,
    fiscalYearStartMonth: SEED_PROGRAM_INFO.fiscalYearStartMonth,
  });

  console.log('Seeding phases...');
  const insertedPhases = await db
    .insert(schema.phases)
    .values(SEED_PHASES.map((p) => ({ label: p.label, sortOrder: p.sortOrder })))
    .returning();
  const phaseByLabel = new Map(insertedPhases.map((p) => [p.label, p]));

  console.log('Seeding barriers...');
  const insertedBarriers = await db
    .insert(schema.barriers)
    .values(SEED_BARRIERS.map((b) => ({ label: b.label, sortOrder: b.sortOrder })))
    .returning();
  const barrierByLabel = new Map(insertedBarriers.map((b) => [b.label, b]));

  console.log('Seeding employers...');
  await db.insert(schema.employers).values(
    SEED_EMPLOYERS.map((e) => ({
      id: e.id,
      name: e.name,
      contactName: e.contactName,
      contactEmail: e.contactEmail,
      phone: e.phone,
      notes: e.notes,
    })),
  );

  console.log('Seeding roles...');
  await db.insert(schema.roles).values(
    SEED_ROLES.map((r) => ({
      id: r.id,
      employerId: r.employerId,
      label: r.label,
      description: r.description,
    })),
  );

  console.log('Seeding cohorts...');
  await db.insert(schema.cohorts).values(
    SEED_COHORTS.map((c) => ({
      id: c.id,
      employerId: c.employerId,
      roleId: c.roleId,
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      description: c.description,
    })),
  );

  console.log('Linking cohort_phases...');
  const cohortPhaseRows: { cohortId: string; phaseId: string; sortOrder: number }[] = [];
  for (const c of SEED_COHORTS) {
    c.phaseLabels.forEach((label, idx) => {
      const phase = phaseByLabel.get(label);
      if (!phase) {
        throw new Error(`Unknown phase label "${label}" for cohort ${c.name}`);
      }
      cohortPhaseRows.push({
        cohortId: c.id,
        phaseId: phase.id,
        sortOrder: idx + 1,
      });
    });
  }
  await db.insert(schema.cohortPhases).values(cohortPhaseRows);

  console.log('Seeding interns + entry assessment + barriers + outcomes...');
  await db.insert(schema.interns).values(
    SEED_INTERNS.map((i) => ({
      id: i.id,
      cohortId: i.cohortId,
      roleId: i.roleId,
      firstInitial: i.firstInitial,
      lastName: i.lastName,
      startDate: i.startDate,
      endDate: i.endDate,
    })),
  );

  await db.insert(schema.internEntryAssessment).values(
    SEED_INTERNS.map((i) => ({
      internId: i.id,
      notes: i.entryNotes,
      completedAt: new Date(),
    })),
  );

  const entryBarrierRows: { internId: string; barrierId: string }[] = [];
  for (const i of SEED_INTERNS) {
    for (const label of i.entryBarrierLabels) {
      const barrier = barrierByLabel.get(label);
      if (!barrier) {
        throw new Error(`Unknown barrier label "${label}" for intern ${i.lastName}`);
      }
      entryBarrierRows.push({ internId: i.id, barrierId: barrier.id });
    }
  }
  await db.insert(schema.internEntryBarriers).values(entryBarrierRows);

  await db.insert(schema.internEmploymentOutcomes).values(
    SEED_INTERNS.map((i) => ({
      internId: i.id,
      employed90Day: i.employed90Day,
      employed90Notes: i.employed90Notes,
      employed180Day: i.employed180Day,
      employed180Notes: i.employed180Notes,
    })),
  );

  console.log('Seeding question_sets + questions...');
  for (const qset of SEED_QUESTION_SETS) {
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
  }

  console.log('Seed complete.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
