import crypto from 'node:crypto';
import { interns, internEntryAssessment, internParticipationFactors } from '../../db/schema';
import { db as defaultDb, type DB } from './db.server';
import {
  INTERN_CODE_MAX,
  INTERN_CODE_MIN,
  formatInternCode,
  yearForInternCode,
} from './intern-code';

/** Collisions are rare (≈11% chance of even one redraw across a 50-intern year);
 *  the cap exists so a broken draw fails loudly instead of looping. */
export const INTERN_CODE_MAX_ATTEMPTS = 10;

export class InternCodeExhaustedError extends Error {
  constructor(yy: number) {
    super(
      `Could not find an unused Intern ID for year ${String(yy).padStart(2, '0')} after ${INTERN_CODE_MAX_ATTEMPTS} attempts`,
    );
    this.name = 'InternCodeExhaustedError';
  }
}

export interface NewInternValues {
  cohortId: string;
  roleId: string | null;
  firstInitial: string;
  lastName: string;
  startDate: string | null;
  endDate: string | null;
  entryNotes: string | null;
  participationFactorIds: string[];
}

export interface CreateInternOptions {
  db?: DB;
  now?: Date;
  /** Override the random draw (tests). Must return an int in [INTERN_CODE_MIN, INTERN_CODE_MAX]. */
  draw?: () => number;
}

function drawInternNumber(): number {
  return crypto.randomInt(INTERN_CODE_MIN, INTERN_CODE_MAX + 1);
}

/** PG 23505 on the intern_code index specifically — anything else propagates. */
function isInternCodeCollision(err: unknown): boolean {
  const e = err as { code?: string; constraint_name?: string; constraint?: string } | null;
  if (!e || e.code !== '23505') return false;
  const constraint = e.constraint_name ?? e.constraint ?? '';
  return constraint.includes('intern_code');
}

/**
 * Create an intern record with a freshly drawn Intern ID, plus the entry
 * assessment row and participation-factor rows the admin create form supplies,
 * in one transaction. On an intern_code collision the whole transaction rolls
 * back and a new number is drawn (spec §3).
 */
export async function createInternWithCode(
  values: NewInternValues,
  opts: CreateInternOptions = {},
): Promise<{ id: string; internCode: string }> {
  const dbc = opts.db ?? defaultDb;
  const draw = opts.draw ?? drawInternNumber;
  const yy = yearForInternCode(values.startDate, opts.now);

  for (let attempt = 1; attempt <= INTERN_CODE_MAX_ATTEMPTS; attempt++) {
    const internCode = formatInternCode(yy, draw());
    try {
      return await dbc.transaction(async (tx) => {
        const [intern] = await tx
          .insert(interns)
          .values({
            cohortId: values.cohortId,
            roleId: values.roleId,
            firstInitial: values.firstInitial,
            lastName: values.lastName,
            internCode,
            startDate: values.startDate,
            endDate: values.endDate,
          })
          .returning({ id: interns.id, internCode: interns.internCode });

        await tx.insert(internEntryAssessment).values({
          internId: intern!.id,
          notes: values.entryNotes,
          completedAt: new Date(),
        });

        if (values.participationFactorIds.length > 0) {
          await tx.insert(internParticipationFactors).values(
            values.participationFactorIds.map((fid) => ({
              internId: intern!.id,
              participationFactorId: fid,
            })),
          );
        }
        return intern!;
      });
    } catch (err) {
      if (isInternCodeCollision(err)) continue;
      throw err;
    }
  }
  throw new InternCodeExhaustedError(yy);
}
