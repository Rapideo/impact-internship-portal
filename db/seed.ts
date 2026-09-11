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
import { SEED_PARTICIPATION_FACTORS } from './seed-data/participation-factors';
import { SEED_INTERNS } from './seed-data/interns';
import { SEED_QUESTION_SETS } from './seed-data/question-sets';
import { SEED_PROGRAM_INFO } from './seed-data/program-info';
import { planProfileRestore, type ProfileSnapshotRow } from './profile-restore-plan';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

async function main() {
  const PROD_PROJECT_REF = 'ptnhzdkspzquwcxdoqbt';
  if (databaseUrl!.includes(PROD_PROJECT_REF)) {
    console.error(
      `ERROR: DATABASE_URL points to impact-prod (${PROD_PROJECT_REF}). Refusing to run dev seed (which TRUNCATEs every table).`,
    );
    console.error('If you really meant to seed prod, use seed-prod.ts with PROD_DATABASE_URL.');
    process.exit(1);
  }

  const client = postgres(databaseUrl!, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    await client.unsafe('BEGIN');

    // Snapshot every existing `profiles` row BEFORE the TRUNCATE below wipes it.
    // This is what makes seeding safe to run against a database that already has
    // real accounts on it: every profile — not just the two hardcoded dev
    // accounts — gets restored afterwards. See db/profile-restore-plan.ts.
    const profileSnapshot: ProfileSnapshotRow[] = (
      await client<
        {
          user_id: string;
          role: 'admin' | 'employer';
          employer_id: string | null;
          email: string | null;
        }[]
      >`
        SELECT p.user_id, p.role, p.employer_id, u.email
        FROM public.profiles p
        LEFT JOIN auth.users u ON u.id = p.user_id
      `
    ).map((r) => ({ userId: r.user_id, role: r.role, employerId: r.employer_id, email: r.email }));
    console.log(
      `Snapshotted ${profileSnapshot.length} existing profile row(s) before truncating...`,
    );

    try {
      console.log('Truncating existing data...');
      // Order matters: children first via CASCADE handles dependents, but explicit list
      // here is intentional so the failure mode (FK violation) is obvious if order drifts.
      await client.unsafe(`
        TRUNCATE TABLE
          public.assessment_submissions,
          public.questions,
          public.question_sets,
          public.intern_employment_outcomes,
          public.intern_participation_factors,
          public.intern_entry_assessment,
          public.interns,
          public.cohort_phases,
          public.cohorts,
          public.roles,
          public.employers,
          public.participation_factors,
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

      console.log('Seeding participation factors...');
      const insertedParticipationFactors = await db
        .insert(schema.participationFactors)
        .values(
          SEED_PARTICIPATION_FACTORS.map((p) => ({
            label: p.label,
            description: p.description,
            code: p.code,
            sortOrder: p.sortOrder,
          })),
        )
        .returning();
      const participationFactorByLabel = new Map(
        insertedParticipationFactors.map((p) => [p.label, p]),
      );

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

      console.log('Seeding interns + entry assessment + participation factors + outcomes...');
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

      const entryParticipationFactorRows: { internId: string; participationFactorId: string }[] =
        [];
      for (const i of SEED_INTERNS) {
        for (const label of i.entryParticipationFactorLabels) {
          const participationFactor = participationFactorByLabel.get(label);
          if (!participationFactor) {
            throw new Error(
              `Unknown participation factor label "${label}" for intern ${i.lastName}`,
            );
          }
          entryParticipationFactorRows.push({
            internId: i.id,
            participationFactorId: participationFactor.id,
          });
        }
      }
      await db.insert(schema.internParticipationFactors).values(entryParticipationFactorRows);

      await db.insert(schema.internEmploymentOutcomes).values(
        SEED_INTERNS.map((i) => ({
          internId: i.id,
          employed90Day: i.employed90Day,
          employed90Notes: i.employed90Notes,
          employed180Day: i.employed180Day,
          employed180Notes: i.employed180Notes,
        })),
      );

      // Build slug → UUID map so question-set fixtures can bind to a cohort
      // via stable slug (e.g. 'northside-cna-2026') rather than hard-coding
      // the cohort UUID inside the question-set seed file.
      const slugToCohortUuid = new Map<string, string>();
      for (const c of SEED_COHORTS) {
        if (c.slug) slugToCohortUuid.set(c.slug, c.id);
      }

      console.log('Seeding question_sets + questions...');
      for (const qset of SEED_QUESTION_SETS) {
        let cohortId: string | null = qset.cohortId;
        const internId: string | null = qset.internId;
        if (qset.kind === 'competency-cohort') {
          if (!qset.cohortId) {
            console.warn(`Skipping ${qset.id}: competency-cohort set has no cohort slug`);
            continue;
          }
          cohortId = slugToCohortUuid.get(qset.cohortId) ?? null;
          if (!cohortId) {
            console.warn(`Skipping ${qset.id}: cohort slug '${qset.cohortId}' has no UUID mapping`);
            continue;
          }
        }
        if (qset.kind === 'competency-intern') {
          console.warn(
            `Skipping intern-tier seed ${qset.id}: dev seed does not author per-intern tiers`,
          );
          continue;
        }
        const effectiveSetId =
          qset.kind === 'competency-cohort' && cohortId ? `competency-cohort-${cohortId}` : qset.id;
        await db.insert(schema.questionSets).values({
          id: effectiveSetId,
          kind: qset.kind,
          name: qset.name,
          cohortId,
          internId,
          minRequired: qset.minRequired,
          allowMultiple: qset.allowMultiple,
        });
        if (qset.questions.length > 0) {
          await db.insert(schema.questions).values(
            qset.questions.map((q) => ({
              id: q.id,
              questionSetId: effectiveSetId,
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

      await client.unsafe('COMMIT');
      console.log('Seed complete.');
    } catch (err) {
      await client.unsafe('ROLLBACK');
      throw err;
    }

    // Restore `profiles` rows. The TRUNCATE ... CASCADE above wipes `profiles`
    // because it references `employers`. Seeding must NOT be an account-wipe:
    // every profile snapshotted above gets restored here, not just the two
    // hardcoded dev accounts. Real accounts (program staff, employer logins)
    // that existed before this run come back with their original role +
    // employer_id. See db/profile-restore-plan.ts for the restore decision
    // logic (and why some rows are deliberately skipped + warned about
    // instead of silently restored).
    if (profileSnapshot.length === 0) {
      // Fresh database — nothing was snapshotted, so fall back to bootstrapping
      // the two hardcoded dev accounts. If auth.users hasn't been populated yet
      // either (before `npm run admin:create`), warn and skip; the seed itself
      // still succeeds.
      console.log(
        'No existing profiles found (fresh database) — restoring default dev accounts (admin + employer1)...',
      );
      const EMPLOYER1_ID = '11111111-1111-1111-1111-111111111101';
      const users = await client<{ id: string; email: string }[]>`
        SELECT id, email FROM auth.users
        WHERE email IN ('admin@example.com', 'employer1@example.com')
      `;
      if (users.length === 0) {
        console.warn(
          '  No matching auth.users rows yet — skipping profile restore. ' +
            'Run `npm run admin:create` and re-seed to populate profile rows.',
        );
      } else {
        for (const u of users) {
          const role = u.email === 'admin@example.com' ? 'admin' : 'employer';
          const employerId = u.email === 'admin@example.com' ? null : EMPLOYER1_ID;
          await client`
            INSERT INTO public.profiles (user_id, role, employer_id)
            VALUES (${u.id}, ${role}, ${employerId})
            ON CONFLICT (user_id) DO UPDATE
            SET role = EXCLUDED.role, employer_id = EXCLUDED.employer_id
          `;
          console.log(
            `  Restored profile: ${u.email} -> role=${role}, employer_id=${employerId ?? 'NULL'}`,
          );
        }
      }
    } else {
      console.log(`Restoring ${profileSnapshot.length} snapshotted profile row(s)...`);
      const [validUserIdRows, validEmployerIdRows] = await Promise.all([
        client<{ id: string }[]>`SELECT id FROM auth.users`,
        client<{ id: string }[]>`SELECT id FROM public.employers`,
      ]);
      const plan = planProfileRestore(
        profileSnapshot,
        new Set(validUserIdRows.map((r) => r.id)),
        new Set(validEmployerIdRows.map((r) => r.id)),
      );

      for (const row of plan.restore) {
        await client`
          INSERT INTO public.profiles (user_id, role, employer_id)
          VALUES (${row.userId}, ${row.role}, ${row.employerId})
          ON CONFLICT (user_id) DO UPDATE
          SET role = EXCLUDED.role, employer_id = EXCLUDED.employer_id
        `;
      }

      for (const warning of plan.warnings) {
        console.warn(`  WARNING: ${warning}`);
      }

      console.log('--- Profile restore summary ---');
      console.log(`  Snapshotted: ${profileSnapshot.length}`);
      console.log(`  Restored:    ${plan.restore.length}`);
      console.log(`  Warnings:    ${plan.warnings.length}`);
      if (plan.warnings.length > 0) {
        console.log('  See WARNING lines above — those accounts need manual attention.');
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
