import { and, eq, isNull, sql } from 'drizzle-orm';
import { interns } from '../../db/schema';
import { db } from './db.server';

export interface InternIdentity {
  firstInitial: string;
  lastName: string;
  cohortId: string;
}

export interface InternRecord {
  id: string;
  firstInitial: string;
  lastName: string;
  cohortId: string;
}

export async function lookupInternByIdentity(
  identity: InternIdentity,
): Promise<InternRecord | null> {
  const rows = await db
    .select({
      id: interns.id,
      firstInitial: interns.firstInitial,
      lastName: interns.lastName,
      cohortId: interns.cohortId,
    })
    .from(interns)
    .where(
      and(
        sql`lower(${interns.firstInitial}) = lower(${identity.firstInitial})`,
        sql`lower(${interns.lastName}) = lower(${identity.lastName})`,
        eq(interns.cohortId, identity.cohortId),
        isNull(interns.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
