// tests/rls/reports-queries.test.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';
import {
  getKpis,
  getInternsByGroup,
  getOutcomeRates,
  getAssessmentCompletion,
  getBarrierDistribution,
  getSubmissionsTrend,
  getReportsData,
  resolveAdminScope,
  resolveEmployerScope,
} from '../../app/lib/reports-queries.server';

const RIVERBEND = '11111111-1111-1111-1111-111111111101';
const NORTHSIDE = '11111111-1111-1111-1111-111111111102';
const COHORT_RIVERBEND = '33333333-3333-3333-3333-333333333301';
const COHORT_NORTHSIDE = '33333333-3333-3333-3333-333333333302';

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
  await sql`DELETE FROM public.assessment_submissions`;
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

describe('reports-queries: completion / barriers / trend', () => {
  it('returns all five assessment types with a zero seed', async () => {
    const rows = await getAssessmentCompletion(db, { level: 'global' });
    expect(rows).toHaveLength(5);
    const competency = rows.find((r) => r.key === 'competency');
    expect(competency).toMatchObject({ completed: 0, total: 6 });
  });

  it('counts distinct interns per barrier, desc', async () => {
    const rows = await getBarrierDistribution(db, { level: 'global' });
    expect(rows).toHaveLength(5); // 5 distinct barriers across seeded interns
    rows.forEach((r) => expect(r.count).toBe(1));
    expect(rows.map((r) => r.label)).toContain('Transportation');
  });

  it('scopes barriers to the employer', async () => {
    const rows = await getBarrierDistribution(db, { level: 'employer', employerId: NORTHSIDE });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ label: 'Childcare', count: 1 });
  });

  it('returns an empty trend when there are no submissions', async () => {
    const rows = await getSubmissionsTrend(db, { level: 'global' });
    expect(rows).toEqual([]);
  });
});

describe('reports-queries: getReportsData', () => {
  it('assembles every metric block', async () => {
    const d = await getReportsData(db, { level: 'global' });
    expect(d.kpis.activeInterns).toBe(6);
    expect(d.internsByGroup.groupBy).toBe('employer');
    expect(d.outcomes.ninetyDay.denominator).toBe(6);
    expect(d.assessmentCompletion).toHaveLength(5);
    expect(Array.isArray(d.barriers)).toBe(true);
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
