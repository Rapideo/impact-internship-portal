import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm';
import type { db as Db } from './db.server';
import {
  employers,
  cohorts,
  roles,
  interns,
  phases,
  cohortPhases,
  barriers,
  internEntryAssessment,
  internEntryBarriers,
  internEmploymentOutcomes,
  assessmentSubmissions,
  programInfo,
} from '../../db/schema';

type Database = typeof Db;

// ---------- KPIs ----------

export async function getAdminHomeKpis(db: Database) {
  const [cohortRow] = await db.select({ n: count() }).from(cohorts);
  const [internRow] = await db
    .select({ n: count() })
    .from(interns)
    .where(isNull(interns.deletedAt));
  const [outcomeRow] = await db
    .select({ n: count() })
    .from(internEmploymentOutcomes)
    .where(eq(internEmploymentOutcomes.employed90Day, true));
  const [submissionRow] = await db
    .select({ n: count() })
    .from(assessmentSubmissions)
    .where(isNull(assessmentSubmissions.deletedAt));
  return {
    activeCohorts: Number(cohortRow?.n ?? 0),
    activeInterns: Number(internRow?.n ?? 0),
    outcomes90Day: Number(outcomeRow?.n ?? 0),
    submissions: Number(submissionRow?.n ?? 0),
  };
}

// ---------- Employers ----------

export async function listEmployersWithCohortCount(db: Database) {
  return db
    .select({
      id: employers.id,
      name: employers.name,
      contactName: employers.contactName,
      contactEmail: employers.contactEmail,
      phone: employers.phone,
      notes: employers.notes,
      cohortCount: sql<number>`COALESCE(COUNT(${cohorts.id})::int, 0)`.as('cohort_count'),
    })
    .from(employers)
    .leftJoin(cohorts, eq(cohorts.employerId, employers.id))
    .groupBy(employers.id)
    .orderBy(asc(employers.name));
}

export async function getEmployerOrNull(db: Database, id: string) {
  const rows = await db.select().from(employers).where(eq(employers.id, id)).limit(1);
  return rows[0] ?? null;
}

// ---------- Cohorts ----------

export async function listCohortsForEmployer(db: Database, employerId: string) {
  const cohortRows = await db
    .select({
      id: cohorts.id,
      employerId: cohorts.employerId,
      roleId: cohorts.roleId,
      roleLabel: roles.label,
      name: cohorts.name,
      startDate: cohorts.startDate,
      endDate: cohorts.endDate,
      description: cohorts.description,
      members: sql<number>`COALESCE((
        SELECT COUNT(*)::int FROM ${interns}
        WHERE ${interns.cohortId} = ${cohorts.id} AND ${interns.deletedAt} IS NULL
      ), 0)`.as('members'),
    })
    .from(cohorts)
    .leftJoin(roles, eq(roles.id, cohorts.roleId))
    .where(eq(cohorts.employerId, employerId))
    .orderBy(asc(cohorts.name));
  return cohortRows;
}

export async function getCohortOrNull(db: Database, id: string) {
  const rows = await db
    .select({
      id: cohorts.id,
      employerId: cohorts.employerId,
      roleId: cohorts.roleId,
      name: cohorts.name,
      startDate: cohorts.startDate,
      endDate: cohorts.endDate,
      description: cohorts.description,
    })
    .from(cohorts)
    .where(eq(cohorts.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listPhasesForCohort(db: Database, cohortId: string) {
  return db
    .select({
      id: phases.id,
      label: phases.label,
      sortOrder: cohortPhases.sortOrder,
    })
    .from(cohortPhases)
    .innerJoin(phases, eq(phases.id, cohortPhases.phaseId))
    .where(eq(cohortPhases.cohortId, cohortId))
    .orderBy(asc(cohortPhases.sortOrder));
}

export async function listInternsByCohort(db: Database, cohortId: string) {
  return db
    .select({
      id: interns.id,
      firstInitial: interns.firstInitial,
      lastName: interns.lastName,
      startDate: interns.startDate,
      endDate: interns.endDate,
    })
    .from(interns)
    .where(and(eq(interns.cohortId, cohortId), isNull(interns.deletedAt)))
    .orderBy(asc(interns.lastName));
}

// ---------- Roles ----------

export async function listRolesForEmployerWithCohortCount(db: Database, employerId: string) {
  return db
    .select({
      id: roles.id,
      employerId: roles.employerId,
      label: roles.label,
      description: roles.description,
      cohortCount: sql<number>`COALESCE((
        SELECT COUNT(*)::int FROM ${cohorts} WHERE ${cohorts.roleId} = ${roles.id}
      ), 0)`.as('cohort_count'),
    })
    .from(roles)
    .where(eq(roles.employerId, employerId))
    .orderBy(asc(roles.label));
}

export async function getRoleOrNull(db: Database, id: string) {
  const rows = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function listCohortsUsingRole(db: Database, roleId: string) {
  return db
    .select({
      id: cohorts.id,
      name: cohorts.name,
      startDate: cohorts.startDate,
      endDate: cohorts.endDate,
      members: sql<number>`COALESCE((
        SELECT COUNT(*)::int FROM ${interns}
        WHERE ${interns.cohortId} = ${cohorts.id} AND ${interns.deletedAt} IS NULL
      ), 0)`.as('members'),
    })
    .from(cohorts)
    .where(eq(cohorts.roleId, roleId))
    .orderBy(asc(cohorts.name));
}

// ---------- Interns ----------

export async function listInternsForListing(db: Database) {
  return db
    .select({
      id: interns.id,
      firstInitial: interns.firstInitial,
      lastName: interns.lastName,
      startDate: interns.startDate,
      endDate: interns.endDate,
      cohortId: cohorts.id,
      cohortName: cohorts.name,
      employerId: employers.id,
      employerName: employers.name,
      roleLabel: roles.label,
      employed90: internEmploymentOutcomes.employed90Day,
      employed180: internEmploymentOutcomes.employed180Day,
    })
    .from(interns)
    .innerJoin(cohorts, eq(cohorts.id, interns.cohortId))
    .innerJoin(employers, eq(employers.id, cohorts.employerId))
    .leftJoin(roles, eq(roles.id, interns.roleId))
    .leftJoin(internEmploymentOutcomes, eq(internEmploymentOutcomes.internId, interns.id))
    .where(isNull(interns.deletedAt))
    .orderBy(desc(interns.startDate));
}

export async function getInternOrNull(db: Database, id: string) {
  const rows = await db
    .select({
      id: interns.id,
      cohortId: interns.cohortId,
      roleId: interns.roleId,
      firstInitial: interns.firstInitial,
      lastName: interns.lastName,
      startDate: interns.startDate,
      endDate: interns.endDate,
      deletedAt: interns.deletedAt,
    })
    .from(interns)
    .where(and(eq(interns.id, id), isNull(interns.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getInternEntry(db: Database, internId: string) {
  const rows = await db
    .select()
    .from(internEntryAssessment)
    .where(eq(internEntryAssessment.internId, internId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getInternEntryBarrierIds(db: Database, internId: string): Promise<string[]> {
  const rows = await db
    .select({ barrierId: internEntryBarriers.barrierId })
    .from(internEntryBarriers)
    .where(eq(internEntryBarriers.internId, internId));
  return rows.map((r) => r.barrierId);
}

export async function getInternEmploymentOutcomes(db: Database, internId: string) {
  const rows = await db
    .select()
    .from(internEmploymentOutcomes)
    .where(eq(internEmploymentOutcomes.internId, internId))
    .limit(1);
  return rows[0] ?? null;
}

// ---------- Library tables ----------

export async function listPhases(db: Database) {
  return db.select().from(phases).orderBy(asc(phases.sortOrder));
}

export async function listBarriers(db: Database) {
  return db.select().from(barriers).orderBy(asc(barriers.sortOrder));
}

export async function getProgramInfo(db: Database) {
  const rows = await db.select().from(programInfo).where(eq(programInfo.id, 1)).limit(1);
  return rows[0] ?? null;
}

export async function listAllEmployers(db: Database) {
  return db
    .select({ id: employers.id, name: employers.name })
    .from(employers)
    .orderBy(asc(employers.name));
}

// ---------- Recent activity ----------

export async function listRecentActivity(db: Database, limit = 10) {
  return db
    .select({
      id: assessmentSubmissions.id,
      type: assessmentSubmissions.type,
      phase: assessmentSubmissions.phase,
      submittedAt: assessmentSubmissions.submittedAt,
      internLastName: interns.lastName,
      internFirstInitial: interns.firstInitial,
      cohortName: cohorts.name,
    })
    .from(assessmentSubmissions)
    .innerJoin(interns, eq(interns.id, assessmentSubmissions.internId))
    .innerJoin(cohorts, eq(cohorts.id, interns.cohortId))
    .where(isNull(assessmentSubmissions.deletedAt))
    .orderBy(desc(assessmentSubmissions.submittedAt))
    .limit(limit);
}
