// app/lib/reports-queries.server.ts
// Scope-aware aggregation queries for the reports dashboard. Each function
// takes a Drizzle `db` and a ReportsScope, and translates the scope into a
// WHERE predicate over the interns table. Follows the employer-scope.server.ts
// pattern: the service-role connection bypasses RLS, so the CALLER (admin
// guard / employer layout) is the trust boundary — the scope passed in here is
// already verified. (#77 hardening applies as it does to employer-scope.)

import { and, asc, count, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import type { DB } from './db.server';
import type { ReportsScope, ReportsData } from './reports-types';
import { pct } from './reports-format';
import {
  interns,
  cohorts,
  employers,
  assessmentSubmissions,
  internEmploymentOutcomes,
  internEntryBarriers,
  barriers,
} from '../../db/schema';
import { getEmployerOrNull, getCohortOrNull } from './admin-queries.server';

/** WHERE predicate selecting the in-scope, non-deleted interns. */
function internScopePredicate(scope: ReportsScope): SQL {
  if (scope.level === 'employer') {
    return and(
      isNull(interns.deletedAt),
      sql`${interns.cohortId} IN (SELECT id FROM ${cohorts} WHERE ${cohorts.employerId} = ${scope.employerId})`,
    )!;
  }
  if (scope.level === 'cohort') {
    return and(isNull(interns.deletedAt), eq(interns.cohortId, scope.cohortId))!;
  }
  return isNull(interns.deletedAt);
}

export async function getKpis(db: DB, scope: ReportsScope) {
  const wherePred = internScopePredicate(scope);

  const [activeRow] = await db.select({ n: count() }).from(interns).where(wherePred);
  const activeInterns = Number(activeRow?.n ?? 0);

  const [emp90Row] = await db
    .select({ n: count() })
    .from(interns)
    .innerJoin(internEmploymentOutcomes, eq(internEmploymentOutcomes.internId, interns.id))
    .where(and(wherePred, eq(internEmploymentOutcomes.employed90Day, true))!);
  const employed90 = Number(emp90Row?.n ?? 0);

  const [assessedRow] = await db
    .select({ n: sql<number>`count(distinct ${interns.id})::int` })
    .from(interns)
    .innerJoin(
      assessmentSubmissions,
      and(
        eq(assessmentSubmissions.internId, interns.id),
        eq(assessmentSubmissions.type, 'competency'),
        isNull(assessmentSubmissions.deletedAt),
      )!,
    )
    .where(wherePred);
  const assessed = Number(assessedRow?.n ?? 0);

  const employersCount =
    scope.level === 'global'
      ? Number((await db.select({ n: count() }).from(employers))[0]?.n ?? 0)
      : null;

  return {
    employers: employersCount,
    activeInterns,
    employed90Pct: pct(employed90, activeInterns),
    assessedPct: pct(assessed, activeInterns),
  };
}

// Re-export the predicate for sibling metric functions added in later tasks.
export { internScopePredicate };

export async function getInternsByGroup(db: DB, scope: ReportsScope) {
  const cnt = count(interns.id);
  if (scope.level === 'global') {
    const rows = await db
      .select({ id: employers.id, label: employers.name, count: cnt })
      .from(interns)
      .innerJoin(cohorts, eq(cohorts.id, interns.cohortId))
      .innerJoin(employers, eq(employers.id, cohorts.employerId))
      .where(isNull(interns.deletedAt))
      .groupBy(employers.id)
      .orderBy(desc(cnt), asc(employers.name));
    return {
      groupBy: 'employer' as const,
      rows: rows.map((r) => ({ id: r.id, label: r.label, count: Number(r.count) })),
    };
  }
  const rows = await db
    .select({ id: cohorts.id, label: cohorts.name, count: cnt })
    .from(interns)
    .innerJoin(cohorts, eq(cohorts.id, interns.cohortId))
    .where(internScopePredicate(scope))
    .groupBy(cohorts.id)
    .orderBy(desc(cnt), asc(cohorts.name));
  return {
    groupBy: 'cohort' as const,
    rows: rows.map((r) => ({ id: r.id, label: r.label, count: Number(r.count) })),
  };
}

export async function getOutcomeRates(db: DB, scope: ReportsScope) {
  const wherePred = internScopePredicate(scope);
  const [activeRow] = await db.select({ n: count() }).from(interns).where(wherePred);
  const denominator = Number(activeRow?.n ?? 0);

  const [n90] = await db
    .select({ n: count() })
    .from(interns)
    .innerJoin(internEmploymentOutcomes, eq(internEmploymentOutcomes.internId, interns.id))
    .where(and(wherePred, eq(internEmploymentOutcomes.employed90Day, true))!);

  const [n180] = await db
    .select({ n: count() })
    .from(interns)
    .innerJoin(internEmploymentOutcomes, eq(internEmploymentOutcomes.internId, interns.id))
    .where(and(wherePred, eq(internEmploymentOutcomes.employed180Day, true))!);

  return {
    ninetyDay: { numerator: Number(n90?.n ?? 0), denominator },
    oneEightyDay: { numerator: Number(n180?.n ?? 0), denominator },
  };
}

const ASSESSMENT_TYPES = [
  { key: 'competency', label: 'Competency' },
  { key: 'personal-goals', label: 'Personal Goals' },
  { key: 'midpoint-reflection', label: 'Midpoint Reflection' },
  { key: 'participant-feedback', label: 'Participant Feedback' },
  { key: 'exit-employer-survey', label: 'Exit Employer Survey' },
] as const;

export async function getAssessmentCompletion(db: DB, scope: ReportsScope) {
  const wherePred = internScopePredicate(scope);
  const [activeRow] = await db.select({ n: count() }).from(interns).where(wherePred);
  const total = Number(activeRow?.n ?? 0);

  const rows = await db
    .select({
      type: assessmentSubmissions.type,
      completed: sql<number>`count(distinct ${assessmentSubmissions.internId})::int`,
    })
    .from(assessmentSubmissions)
    .innerJoin(interns, eq(interns.id, assessmentSubmissions.internId))
    .where(and(wherePred, isNull(assessmentSubmissions.deletedAt))!)
    .groupBy(assessmentSubmissions.type);

  const byType = new Map(rows.map((r) => [r.type as string, Number(r.completed)]));
  return ASSESSMENT_TYPES.map((t) => ({
    key: t.key,
    label: t.label,
    completed: byType.get(t.key) ?? 0,
    total,
  }));
}

export async function getBarrierDistribution(db: DB, scope: ReportsScope) {
  const wherePred = internScopePredicate(scope);
  const cnt = sql<number>`count(distinct ${interns.id})::int`;
  const rows = await db
    .select({ id: barriers.id, label: barriers.label, count: cnt })
    .from(internEntryBarriers)
    .innerJoin(interns, eq(interns.id, internEntryBarriers.internId))
    .innerJoin(barriers, eq(barriers.id, internEntryBarriers.barrierId))
    .where(wherePred)
    .groupBy(barriers.id, barriers.label)
    .orderBy(desc(cnt), asc(barriers.label));
  return rows.map((r) => ({ id: r.id, label: r.label, count: Number(r.count) }));
}

export async function getSubmissionsTrend(db: DB, scope: ReportsScope) {
  const wherePred = internScopePredicate(scope);
  const rows = await db
    .select({
      weekStart: sql<string>`to_char(date_trunc('week', ${assessmentSubmissions.submittedAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(assessmentSubmissions)
    .innerJoin(interns, eq(interns.id, assessmentSubmissions.internId))
    .where(
      and(
        wherePred,
        isNull(assessmentSubmissions.deletedAt),
        sql`${assessmentSubmissions.submittedAt} >= now() - interval '8 weeks'`,
      )!,
    )
    .groupBy(sql`date_trunc('week', ${assessmentSubmissions.submittedAt})`)
    .orderBy(sql`date_trunc('week', ${assessmentSubmissions.submittedAt})`);
  return rows.map((r) => ({ weekStart: r.weekStart, count: Number(r.count) }));
}

export async function getReportsData(db: DB, scope: ReportsScope): Promise<ReportsData> {
  const [kpis, internsByGroup, outcomes, assessmentCompletion, barrierRows, trend] =
    await Promise.all([
      getKpis(db, scope),
      getInternsByGroup(db, scope),
      getOutcomeRates(db, scope),
      getAssessmentCompletion(db, scope),
      getBarrierDistribution(db, scope),
      getSubmissionsTrend(db, scope),
    ]);
  return { kpis, internsByGroup, outcomes, assessmentCompletion, barriers: barrierRows, trend };
}

export interface ResolvedAdminScope {
  scope: ReportsScope;
  employer: { id: string; name: string } | null;
  cohort: { id: string; name: string } | null;
  label: string;
}

export async function resolveAdminScope(
  db: DB,
  employerId: string | null,
  cohortId: string | null,
): Promise<ResolvedAdminScope> {
  if (!employerId) {
    return { scope: { level: 'global' }, employer: null, cohort: null, label: 'Program-wide' };
  }
  const employer = await getEmployerOrNull(db, employerId);
  if (!employer) {
    return { scope: { level: 'global' }, employer: null, cohort: null, label: 'Program-wide' };
  }
  if (cohortId) {
    const cohort = await getCohortOrNull(db, cohortId);
    if (cohort && cohort.employerId === employer.id) {
      return {
        scope: { level: 'cohort', employerId: employer.id, cohortId: cohort.id },
        employer: { id: employer.id, name: employer.name },
        cohort: { id: cohort.id, name: cohort.name },
        label: `${employer.name} › ${cohort.name}`,
      };
    }
  }
  return {
    scope: { level: 'employer', employerId: employer.id },
    employer: { id: employer.id, name: employer.name },
    cohort: null,
    label: employer.name,
  };
}

export interface ResolvedEmployerScope {
  scope: ReportsScope;
  cohort: { id: string; name: string } | null;
  label: string;
}

export async function resolveEmployerScope(
  db: DB,
  employerId: string,
  cohortId: string | null,
): Promise<ResolvedEmployerScope> {
  if (cohortId) {
    const cohort = await getCohortOrNull(db, cohortId);
    if (cohort && cohort.employerId === employerId) {
      return {
        scope: { level: 'cohort', employerId, cohortId: cohort.id },
        cohort: { id: cohort.id, name: cohort.name },
        label: cohort.name,
      };
    }
  }
  return { scope: { level: 'employer', employerId }, cohort: null, label: 'All cohorts' };
}
