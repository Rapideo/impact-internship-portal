import { and, eq, isNull } from 'drizzle-orm';
import { interns } from '../../db/schema';
import { db } from './db.server';

export interface InternCodeIdentity {
  internCode: string;
  cohortId: string;
}

export interface InternRecord {
  id: string;
  internCode: string;
  cohortId: string;
}

/**
 * Resolve an intern from the pair the public chooser collects: the canonical
 * Intern ID (already normalised by the caller) and the selected cohort.
 * Soft-deleted interns never resolve. Exact match on the code — the DB holds
 * canonical form only (spec D7).
 */
export async function lookupInternByCode(
  identity: InternCodeIdentity,
): Promise<InternRecord | null> {
  const rows = await db
    .select({ id: interns.id, internCode: interns.internCode, cohortId: interns.cohortId })
    .from(interns)
    .where(
      and(
        eq(interns.internCode, identity.internCode),
        eq(interns.cohortId, identity.cohortId),
        isNull(interns.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
