import { and, eq, isNull } from 'drizzle-orm';
import { db } from './db.server';
import { dbService } from './db.service.server';
import { assessmentSubmissions } from '../../db/schema';
import type { SerializedAnswers } from './question-types';

export type SubmissionType =
  | 'personal-goals'
  | 'midpoint-reflection'
  | 'participant-feedback'
  | 'competency'
  | 'exit-employer-survey';

export const ONE_SHOT_TYPES: SubmissionType[] = [
  'personal-goals',
  'midpoint-reflection',
  'participant-feedback',
];

export class AssessmentAlreadySubmittedError extends Error {
  public readonly type: SubmissionType;
  public readonly internId: string;
  constructor(type: SubmissionType, internId: string) {
    super(`Assessment ${type} already submitted for intern ${internId}`);
    this.name = 'AssessmentAlreadySubmittedError';
    this.type = type;
    this.internId = internId;
  }
}

/**
 * Insert via the service-role client (bypasses RLS). Used by anonymous intern
 * self-assessment submissions where the actor has no JWT.
 *
 * Identity revalidation is the caller's responsibility (action handler should
 * call `getCurrentInternIdentity()` first and confirm the result matches the
 * targeted intern).
 *
 * Throws `AssessmentAlreadySubmittedError` when the partial unique index for
 * one-shot types (`personal-goals`, `midpoint-reflection`, `participant-feedback`)
 * already has an undeleted row for this (intern_id, type). We pre-check before
 * the insert for a friendly error, and re-translate the PG `23505` unique
 * violation if a race wins the check.
 */
export async function insertAnonymousSubmission(input: {
  internId: string;
  type: SubmissionType;
  answers: SerializedAnswers;
}): Promise<string> {
  if (ONE_SHOT_TYPES.includes(input.type)) {
    const existing = await dbService
      .select({ id: assessmentSubmissions.id })
      .from(assessmentSubmissions)
      .where(
        and(
          eq(assessmentSubmissions.internId, input.internId),
          eq(assessmentSubmissions.type, input.type),
          isNull(assessmentSubmissions.deletedAt),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      throw new AssessmentAlreadySubmittedError(input.type, input.internId);
    }
  }
  try {
    const rows = await dbService
      .insert(assessmentSubmissions)
      .values({
        internId: input.internId,
        type: input.type,
        answers: input.answers as Record<string, unknown>,
        submittedBy: null,
      })
      .returning({ id: assessmentSubmissions.id });
    const row = rows[0];
    if (!row) throw new Error('insertAnonymousSubmission: no row returned');
    return row.id;
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: unknown }).code === '23505'
    ) {
      throw new AssessmentAlreadySubmittedError(input.type, input.internId);
    }
    throw err;
  }
}

/**
 * Admin-side insert-or-update via the regular (RLS-scoped) `db` client.
 * - For `type='competency'`: always inserts a new row (multiple per phase
 *   allowed per PRD §7.4).
 * - For `type='exit-employer-survey'`: upsert by (intern_id, type) — admin
 *   can re-save without creating duplicates.
 *
 * The action handler is responsible for setting `submittedBy` to the
 * current admin user's id when available (null otherwise).
 */
export async function insertOrUpdateSubmissionAsAdmin(input: {
  internId: string;
  type: 'competency' | 'exit-employer-survey';
  phase?: string;
  answers: SerializedAnswers;
  submittedBy: string | null;
}): Promise<string> {
  if (input.type === 'exit-employer-survey') {
    const existing = await db
      .select({ id: assessmentSubmissions.id })
      .from(assessmentSubmissions)
      .where(
        and(
          eq(assessmentSubmissions.internId, input.internId),
          eq(assessmentSubmissions.type, input.type),
          isNull(assessmentSubmissions.deletedAt),
        ),
      )
      .limit(1);
    const existingRow = existing[0];
    if (existingRow) {
      await db
        .update(assessmentSubmissions)
        .set({
          answers: input.answers as Record<string, unknown>,
          submittedBy: input.submittedBy,
        })
        .where(eq(assessmentSubmissions.id, existingRow.id));
      return existingRow.id;
    }
  }
  const rows = await db
    .insert(assessmentSubmissions)
    .values({
      internId: input.internId,
      type: input.type,
      phase: input.type === 'competency' ? (input.phase ?? null) : null,
      answers: input.answers as Record<string, unknown>,
      submittedBy: input.submittedBy,
    })
    .returning({ id: assessmentSubmissions.id });
  const row = rows[0];
  if (!row) throw new Error('insertOrUpdateSubmissionAsAdmin: no row returned');
  return row.id;
}

export async function getSubmission(id: string) {
  const rows = await db
    .select()
    .from(assessmentSubmissions)
    .where(and(eq(assessmentSubmissions.id, id), isNull(assessmentSubmissions.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getOneShotSubmission(internId: string, type: SubmissionType) {
  // Service-role client: this is called from the intern public flow with only
  // an HMAC-signed identity cookie (no Supabase JWT), so RLS-bound queries
  // would return zero rows once Task #77 splits the URLs. See Task #76.
  const rows = await dbService
    .select()
    .from(assessmentSubmissions)
    .where(
      and(
        eq(assessmentSubmissions.internId, internId),
        eq(assessmentSubmissions.type, type),
        isNull(assessmentSubmissions.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
