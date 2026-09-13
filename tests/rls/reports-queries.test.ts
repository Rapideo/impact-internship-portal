// tests/rls/reports-queries.test.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as schema from '../../db/schema';
import {
  getKpis,
  getInternsByGroup,
  getOutcomeRates,
  getAssessmentCompletion,
  getParticipationFactorDistribution,
  getSubmissionsTrend,
  getReportsData,
  resolveAdminScope,
  resolveEmployerScope,
} from '../../app/lib/reports-queries.server';

const RIVERBEND = '11111111-1111-1111-1111-111111111101';
const NORTHSIDE = '11111111-1111-1111-1111-111111111102';
const COHORT_RIVERBEND = '33333333-3333-3333-3333-333333333301';
const COHORT_NORTHSIDE = '33333333-3333-3333-3333-333333333302';

// The only intern id that any RLS suite ever writes assessment_submissions
// rows for (assessment-submissions.test.ts's TEST_INTERN, and the
// competency / exit-employer-survey rows employer-scope.test.ts inserts for
// its "employerInternId"). Every one of those sibling tests already cleans
// up the rows it inserts, but that cleanup runs after an `expect(...)` in
// the same `it` — if that assertion ever throws, the row leaks. Scoping
// this file's own reset to that same intern id (matching the pattern
// tests/rls/assessment-submissions.test.ts:30 already uses) catches that
// leak without touching unrelated data in what is otherwise a shared
// database.
const SEEDED_SUBMISSION_INTERN = '44444444-4444-4444-4444-444444444401';

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  db = drizzle(sql, { schema });
  // These assertions are anchored to the seed's baseline, which has zero
  // assessment_submissions (db/seed.ts truncates the table and never refills
  // it). The rls suite shares one database and runs serially; sibling files
  // (e.g. employer-scope.test.ts) commit competency / exit-survey rows for
  // seeded interns. This file runs last alphabetically, so reset to the seed
  // baseline here to keep the submission-derived metrics deterministic.
  await sql`DELETE FROM public.assessment_submissions WHERE intern_id = ${SEEDED_SUBMISSION_INTERN}`;
});
afterAll(async () => {
  await sql.end();
});

describe('reports-queries: getKpis', () => {
  it('global KPIs reflect the full seed', async () => {
    const k = await getKpis(db, { level: 'global' });
    expect(k.employers).toBe(6);
    expect(k.activeInterns).toBe(6);
    expect(k.employed90Pct).toBe(0); // seed has no employment outcomes set true
    expect(k.assessedPct).toBe(0); // seed has no submissions
  });

  it('employer scope counts only that employer and hides the employers KPI', async () => {
    const k = await getKpis(db, { level: 'employer', employerId: NORTHSIDE });
    expect(k.employers).toBeNull();
    expect(k.activeInterns).toBe(4);
  });

  it('a single-intern employer counts 1', async () => {
    const k = await getKpis(db, { level: 'employer', employerId: RIVERBEND });
    expect(k.activeInterns).toBe(1);
  });
});

describe('reports-queries: getInternsByGroup', () => {
  it('groups by employer at global scope, desc by count', async () => {
    const g = await getInternsByGroup(db, { level: 'global' });
    expect(g.groupBy).toBe('employer');
    expect(g.rows).toHaveLength(3); // only employers with interns
    expect(g.rows[0]).toMatchObject({ label: 'Northside Hospital Network', count: 4 });
  });

  it('groups by cohort when scoped to an employer', async () => {
    const g = await getInternsByGroup(db, { level: 'employer', employerId: NORTHSIDE });
    expect(g.groupBy).toBe('cohort');
    expect(g.rows).toHaveLength(1);
    expect(g.rows[0]).toMatchObject({ label: 'Northside — Winter 2026 CNA Track', count: 4 });
  });
});

describe('reports-queries: getOutcomeRates', () => {
  it('uses all in-scope interns as the denominator', async () => {
    const o = await getOutcomeRates(db, { level: 'global' });
    expect(o.ninetyDay).toEqual({ numerator: 0, denominator: 6 });
    expect(o.oneEightyDay).toEqual({ numerator: 0, denominator: 6 });
  });
});

describe('reports-queries: completion / participation factors / trend', () => {
  it('returns all five assessment types with a zero seed', async () => {
    const rows = await getAssessmentCompletion(db, { level: 'global' });
    expect(rows).toHaveLength(5);
    const competency = rows.find((r) => r.key === 'competency');
    expect(competency).toMatchObject({ completed: 0, total: 6 });
  });

  it('counts distinct interns per participation factor, desc', async () => {
    const rows = await getParticipationFactorDistribution(db, { level: 'global' });
    // 4 distinct participation factors across seeded interns: Whitaker carries
    // 'Transportation/access' + 'Administrative requirements', Okafor carries
    // 'Schedule/availability', Delgado carries 'Attendance continuity'. (Updated
    // from the old 12-value "barrier" labels when the eight participation
    // factors landed — see db/seed-data/interns.ts.)
    expect(rows).toHaveLength(4);
    rows.forEach((r) => expect(r.count).toBe(1));
    expect(rows.map((r) => r.label)).toContain('Transportation/access');
  });

  it('scopes participation factors to the employer', async () => {
    const rows = await getParticipationFactorDistribution(db, {
      level: 'employer',
      employerId: NORTHSIDE,
    });
    // Okafor ('Schedule/availability') is the only Northside intern with a
    // real factor; the Test1-3 E2E fixtures carry none.
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ label: 'Schedule/availability', count: 1 });
  });

  it('returns an empty trend when there are no submissions', async () => {
    const rows = await getSubmissionsTrend(db, { level: 'global' });
    expect(rows).toEqual([]);
  });
});

// Spec §7: admins are allowed to tick contradictory combinations (e.g. both
// "No participation factors identified" and a real factor) — data entry is
// unconstrained. This fixture proves the query, not the form, is what keeps
// the "none" bucket honest: an intern with a real factor never inflates it.
describe('reports-queries: getParticipationFactorDistribution none-bucket honesty', () => {
  // Fresh UUID namespace (55555555-…) so these transient fixtures can never
  // collide with seeded ids (11=employers, 22=roles, 33=cohorts, 44=interns).
  const NONE_ONLY_INTERN = '55555555-5555-5555-5555-555555555501';
  const NONE_AND_REAL_INTERN = '55555555-5555-5555-5555-555555555502';

  afterEach(async () => {
    // ON DELETE CASCADE on intern_participation_factors.intern_id removes the
    // factor links along with the interns; scoped to these two fixture ids
    // only, matching this file's SEEDED_SUBMISSION_INTERN-scoped pattern.
    await sql`DELETE FROM public.interns WHERE id IN (${NONE_ONLY_INTERN}, ${NONE_AND_REAL_INTERN})`;
  });

  it('excludes an intern from the none bucket when they also have a real factor', async () => {
    const [noneFactor] = await db
      .select({ id: schema.participationFactors.id })
      .from(schema.participationFactors)
      .where(eq(schema.participationFactors.code, 'none'));
    const [transportFactor] = await db
      .select({ id: schema.participationFactors.id })
      .from(schema.participationFactors)
      .where(eq(schema.participationFactors.label, 'Transportation/access'));
    if (!noneFactor || !transportFactor) {
      throw new Error('Seed is missing an expected participation_factors row');
    }

    // Intern A: only "No participation factors identified".
    // Intern B: "No participation factors identified" AND "Transportation/access"
    // — the contradictory combination the app deliberately allows at entry.
    await db.insert(schema.interns).values([
      {
        id: NONE_ONLY_INTERN,
        cohortId: COHORT_RIVERBEND,
        internCode: 'IMP-26-9901',
      },
      {
        id: NONE_AND_REAL_INTERN,
        cohortId: COHORT_RIVERBEND,
        internCode: 'IMP-26-9902',
      },
    ]);
    await db.insert(schema.internParticipationFactors).values([
      { internId: NONE_ONLY_INTERN, participationFactorId: noneFactor.id },
      { internId: NONE_AND_REAL_INTERN, participationFactorId: noneFactor.id },
      { internId: NONE_AND_REAL_INTERN, participationFactorId: transportFactor.id },
    ]);

    const rows = await getParticipationFactorDistribution(db, { level: 'global' });
    const none = rows.find((r) => r.label === 'No participation factors identified');
    const transport = rows.find((r) => r.label === 'Transportation/access');

    // B is contradictory, so it counts only toward the real factor.
    expect(none?.count).toBe(1);
    // Seed baseline already has Whitaker (Riverbend) on 'Transportation/access';
    // the fixture intern B adds exactly one more, not two.
    expect(transport?.count).toBe(2);
  });
});

describe('reports-queries: getReportsData', () => {
  it('assembles every metric block', async () => {
    const d = await getReportsData(db, { level: 'global' });
    expect(d.kpis.activeInterns).toBe(6);
    expect(d.internsByGroup.groupBy).toBe('employer');
    expect(d.outcomes.ninetyDay.denominator).toBe(6);
    expect(d.assessmentCompletion).toHaveLength(5);
    expect(Array.isArray(d.participationFactors)).toBe(true);
    expect(Array.isArray(d.trend)).toBe(true);
  });
});

describe('reports-queries: resolveAdminScope', () => {
  it('no params -> global', async () => {
    const r = await resolveAdminScope(db, null, null);
    expect(r.scope).toEqual({ level: 'global' });
    expect(r.label).toBe('Program-wide');
  });

  it('employer only -> employer scope with the employer name', async () => {
    const r = await resolveAdminScope(db, RIVERBEND, null);
    expect(r.scope).toEqual({ level: 'employer', employerId: RIVERBEND });
    expect(r.label).toBe('Riverbend Manufacturing');
  });

  it('matching employer+cohort -> cohort scope', async () => {
    const r = await resolveAdminScope(db, RIVERBEND, COHORT_RIVERBEND);
    expect(r.scope).toEqual({
      level: 'cohort',
      employerId: RIVERBEND,
      cohortId: COHORT_RIVERBEND,
    });
  });

  it('drops a cohort that does not belong to the employer', async () => {
    const r = await resolveAdminScope(db, RIVERBEND, COHORT_NORTHSIDE);
    expect(r.scope).toEqual({ level: 'employer', employerId: RIVERBEND });
    expect(r.cohort).toBeNull();
  });

  it('unknown employer id -> global', async () => {
    const r = await resolveAdminScope(db, '11111111-1111-1111-1111-1111111199aa', null);
    expect(r.scope).toEqual({ level: 'global' });
  });
});

describe('reports-queries: resolveEmployerScope', () => {
  it('no cohort -> employer scope pinned to the caller', async () => {
    const r = await resolveEmployerScope(db, NORTHSIDE, null);
    expect(r.scope).toEqual({ level: 'employer', employerId: NORTHSIDE });
    expect(r.label).toBe('All cohorts');
  });

  it('own cohort -> cohort scope', async () => {
    const r = await resolveEmployerScope(db, NORTHSIDE, COHORT_NORTHSIDE);
    expect(r.scope).toEqual({
      level: 'cohort',
      employerId: NORTHSIDE,
      cohortId: COHORT_NORTHSIDE,
    });
    expect(r.label).toBe('Northside — Winter 2026 CNA Track');
  });

  it('a foreign cohort is ignored (stays employer scope)', async () => {
    const r = await resolveEmployerScope(db, NORTHSIDE, COHORT_RIVERBEND);
    expect(r.scope).toEqual({ level: 'employer', employerId: NORTHSIDE });
  });
});
