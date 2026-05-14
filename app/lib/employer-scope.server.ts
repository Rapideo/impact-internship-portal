// Employer scope helpers — shape Drizzle queries that are scoped to a single
// employerId. Used by the /employer/* routes.
//
// IMPORTANT (BYPASSRLS caveat): the imported `db` client is a service-role
// connection (see app/lib/db.server.ts), so RLS does NOT scope these queries —
// the route loader is the trust boundary. Loaders pull `employerId` from
// `getAuthContext` (which the employer.tsx layout has already verified) and
// pass it in here. Carry-over tasks #76 and #77 will revisit moving these to
// a true anon role + RLS-scoped connection.
//
// `internInEmployerScope` is the defense for write paths: actions must call
// it before mutating intern-scoped data to ensure the caller actually owns
// the intern, regardless of what the body of the request claims.

import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from './db.server';
import { cohorts, interns, assessmentSubmissions } from '../../db/schema';

export interface EmployerKpis {
  activeCohorts: number;
  activeInterns: number;
  assessmentsNeeded: number;
}

export async function kpisForEmployer(employerId: string): Promise<EmployerKpis> {
  const cohortRows = await db
    .select({ id: cohorts.id })
    .from(cohorts)
    .where(eq(cohorts.employerId, employerId));

  const internRows = await db
    .select({ id: interns.id })
    .from(interns)
    .where(
      and(
        isNull(interns.deletedAt),
        sql`${interns.cohortId} IN (SELECT id FROM ${cohorts} WHERE ${cohorts.employerId} = ${employerId})`,
      ),
    );

  // "Assessments needed" = interns in this employer's scope who have zero
  // competency submissions (placeholder business rule — real rule pending
  // program staff per spec OQ §10.1).
  const needRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(interns)
    .where(
      and(
        isNull(interns.deletedAt),
        sql`${interns.cohortId} IN (SELECT id FROM ${cohorts} WHERE ${cohorts.employerId} = ${employerId})`,
        sql`NOT EXISTS (SELECT 1 FROM ${assessmentSubmissions} s WHERE s.intern_id = ${interns.id} AND s.type = 'competency' AND s.deleted_at IS NULL)`,
      ),
    );

  return {
    activeCohorts: cohortRows.length,
    activeInterns: internRows.length,
    assessmentsNeeded: needRows[0]?.count ?? 0,
  };
}

export async function cohortsForEmployer(employerId: string) {
  return db.select().from(cohorts).where(eq(cohorts.employerId, employerId));
}

export async function internsForEmployer(employerId: string) {
  return db
    .select({
      id: interns.id,
      firstInitial: interns.firstInitial,
      lastName: interns.lastName,
      cohortId: interns.cohortId,
      roleId: interns.roleId,
      startDate: interns.startDate,
      endDate: interns.endDate,
    })
    .from(interns)
    .where(
      and(
        isNull(interns.deletedAt),
        sql`${interns.cohortId} IN (SELECT id FROM ${cohorts} WHERE ${cohorts.employerId} = ${employerId})`,
      ),
    );
}

export async function internInEmployerScope(
  internId: string,
  employerId: string,
): Promise<boolean> {
  // Single join: resolve intern → its cohort's employer in one round trip.
  // The plan's draft used two queries (the first selecting the wrong column);
  // an inner join produces the same result with half the work.
  const rows = await db
    .select({ employerId: cohorts.employerId })
    .from(interns)
    .innerJoin(cohorts, eq(interns.cohortId, cohorts.id))
    .where(and(eq(interns.id, internId), isNull(interns.deletedAt)))
    .limit(1);
  if (rows.length === 0) return false;
  return rows[0].employerId === employerId;
}
