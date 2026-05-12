import { eq, asc } from 'drizzle-orm';
import { db } from './db.server';
import * as schema from '../../db/schema';
import type {
  Question,
  QuestionSet,
  QuestionSetKind,
  SectionBoundary,
  StitchedCompetencySet,
  StitchedQuestion,
} from './question-types';

/**
 * Server-side data layer for the question engine.
 *
 * Loads question sets + their ordered questions from the DB and maps DB rows
 * into the strongly-typed `QuestionSet` / `Question` shapes consumed by the
 * renderer (Phase B) and editor (Phase D-F).
 *
 * RLS (sub-project 1) restricts SELECT on `question_sets` / `questions` to
 * authenticated roles; writes are admin-only. Callers must validate the
 * auth context at the route boundary — these functions don't enforce auth
 * themselves.
 */

export async function loadQuestionSet(setId: string): Promise<QuestionSet | null> {
  const rows = await db.select().from(schema.questionSets).where(eq(schema.questionSets.id, setId));
  const set = rows[0];
  if (!set) return null;
  const qRows = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.questionSetId, setId))
    .orderBy(asc(schema.questions.sortOrder));
  return {
    id: set.id,
    kind: set.kind as QuestionSetKind,
    name: set.name,
    cohortId: set.cohortId,
    internId: set.internId,
    minRequired: set.minRequired,
    allowMultiple: set.allowMultiple,
    lastEditedAt: set.lastEditedAt.toISOString(),
    questions: qRows.map(
      (r) =>
        ({
          id: r.id,
          type: r.type,
          label: r.label,
          helperText: r.helperText ?? undefined,
          required: r.required,
          sortOrder: r.sortOrder,
          config: r.config,
        }) as Question,
    ),
  };
}

export async function listStandardSets(): Promise<QuestionSet[]> {
  const rows = await db
    .select()
    .from(schema.questionSets)
    .where(eq(schema.questionSets.kind, 'standard'));
  const out: QuestionSet[] = [];
  for (const r of rows) {
    const set = await loadQuestionSet(r.id);
    if (set) out.push(set);
  }
  return out;
}

export async function listCohortCompetencySets(): Promise<QuestionSet[]> {
  const rows = await db
    .select()
    .from(schema.questionSets)
    .where(eq(schema.questionSets.kind, 'competency-cohort'));
  const out: QuestionSet[] = [];
  for (const r of rows) {
    const set = await loadQuestionSet(r.id);
    if (set) out.push(set);
  }
  return out;
}

export async function listInternCompetencySets(): Promise<QuestionSet[]> {
  const rows = await db
    .select()
    .from(schema.questionSets)
    .where(eq(schema.questionSets.kind, 'competency-intern'));
  const out: QuestionSet[] = [];
  for (const r of rows) {
    const set = await loadQuestionSet(r.id);
    if (set) out.push(set);
  }
  return out;
}

/* ============================================================ */
/* Atomic save (transactional)                                  */
/* ============================================================ */

export interface SaveQuestionSetInput {
  setId: string;
  // Optional override fields. `name`/`kind`/`cohortId`/`internId` are only
  // honored when CREATING a new set; updates leave them as-is unless `name`
  // is supplied (renaming via the editor).
  name?: string;
  kind?: QuestionSetKind;
  cohortId?: string | null;
  internId?: string | null;
  minRequired: number | null;
  allowMultiple: boolean;
  questions: Question[];
}

export class QuestionSetSaveError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = 'QuestionSetSaveError';
  }
}

function validateInput(input: SaveQuestionSetInput): void {
  if (!input.setId) throw new QuestionSetSaveError('setId is required');
  if (input.questions.length === 0) {
    throw new QuestionSetSaveError('At least one question is required');
  }
  if (input.minRequired !== null && input.minRequired < 0) {
    throw new QuestionSetSaveError('minRequired must be non-negative');
  }
  if (input.minRequired !== null && input.minRequired > input.questions.length) {
    throw new QuestionSetSaveError('minRequired cannot exceed the number of questions');
  }
  const seen = new Set<string>();
  input.questions.forEach((q, i) => {
    if (!q.id) throw new QuestionSetSaveError(`Question ${i + 1} has no id`);
    if (seen.has(q.id)) throw new QuestionSetSaveError(`Duplicate question id: ${q.id}`);
    seen.add(q.id);
    if (!q.label || !q.label.trim()) {
      throw new QuestionSetSaveError(`Question ${i + 1} has an empty label`);
    }
    if (q.type === 'radio' || q.type === 'checkbox-group') {
      const cfg = q.config as { options?: { value: string; label: string }[] };
      if (!Array.isArray(cfg.options) || cfg.options.length === 0) {
        throw new QuestionSetSaveError(`Question ${i + 1} (${q.type}) has no options`);
      }
      cfg.options.forEach((o, oi) => {
        if (!o.value || !o.value.trim()) {
          throw new QuestionSetSaveError(`Question ${i + 1}, option ${oi + 1}: missing value`);
        }
        if (!o.label || !o.label.trim()) {
          throw new QuestionSetSaveError(`Question ${i + 1}, option ${oi + 1}: missing label`);
        }
      });
    }
  });
}

/**
 * Atomically save a question set + its questions.
 *
 * Strategy: delete-then-insert all child `questions` inside a transaction.
 * This (a) drops any deleted rows; (b) re-indexes `sort_order` contiguously
 * from 1; (c) updates `last_edited_at` in the same atomic step. The questions
 * FK has `ON DELETE CASCADE` from `question_sets`, so no orphan rows.
 *
 * Callers must enforce admin auth before calling this — RLS will reject the
 * write if the request doesn't carry an admin role JWT, but the route guard
 * gives a friendlier error.
 */
export async function saveQuestionSet(input: SaveQuestionSetInput): Promise<QuestionSet> {
  validateInput(input);

  await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(schema.questionSets)
      .where(eq(schema.questionSets.id, input.setId));

    if (existing.length === 0) {
      if (!input.kind) {
        throw new QuestionSetSaveError(
          `Cannot create question set ${input.setId}: kind is required`,
        );
      }
      await tx.insert(schema.questionSets).values({
        id: input.setId,
        kind: input.kind,
        name: input.name ?? input.setId,
        cohortId: input.cohortId ?? null,
        internId: input.internId ?? null,
        minRequired: input.minRequired,
        allowMultiple: input.allowMultiple,
        lastEditedAt: new Date(),
      });
    } else {
      const current = existing[0]!;
      await tx
        .update(schema.questionSets)
        .set({
          name: input.name ?? current.name,
          cohortId: input.cohortId ?? current.cohortId,
          internId: input.internId ?? current.internId,
          minRequired: input.minRequired,
          allowMultiple: input.allowMultiple,
          lastEditedAt: new Date(),
        })
        .where(eq(schema.questionSets.id, input.setId));
    }

    // Atomically replace questions: delete-then-insert in the same tx.
    await tx.delete(schema.questions).where(eq(schema.questions.questionSetId, input.setId));

    await tx.insert(schema.questions).values(
      input.questions.map((q, i) => ({
        id: q.id,
        questionSetId: input.setId,
        type: q.type,
        label: q.label.trim(),
        helperText: q.helperText ?? null,
        required: q.required,
        sortOrder: i + 1, // re-index contiguous
        config: q.config as Record<string, unknown>,
      })),
    );
  });

  const loaded = await loadQuestionSet(input.setId);
  if (!loaded) throw new QuestionSetSaveError(`Re-load failed for ${input.setId}`);
  return loaded;
}

/**
 * Delete a question set + cascade its questions. FK `ON DELETE CASCADE`
 * on `questions.question_set_id` makes this a single statement.
 */
export async function deleteQuestionSet(setId: string): Promise<void> {
  await db.delete(schema.questionSets).where(eq(schema.questionSets.id, setId));
}

/* ============================================================ */
/* Stitched competency assembly                                  */
/* ============================================================ */

/**
 * Assemble the 3-tier competency rubric for an intern:
 *   core (program-wide) -> cohort -> intern-specific
 *
 * Concatenates questions in tier order, tags each with its `tier`, and
 * emits `SectionBoundary` markers (positioned via `afterIndex`) so the
 * renderer can draw section headers. Tiers with zero questions are
 * omitted (both questions AND their boundary).
 *
 * Used by:
 *  - the assessment-form renderer for the competency rubric (sub-project 4)
 *  - the admin competency-detail route (sub-project 3 Phase F) to preview
 *    the stitched output before saving cohort/intern overrides.
 */
export async function stitchedCompetencyQuestions(
  internId: string,
): Promise<StitchedCompetencySet> {
  const internRow = await db
    .select({
      cohortId: schema.interns.cohortId,
    })
    .from(schema.interns)
    .where(eq(schema.interns.id, internId));
  const intern = internRow[0];
  if (!intern) {
    throw new Error(`Intern not found: ${internId}`);
  }
  const cohortId = intern.cohortId;

  let cohortName: string | null = null;
  if (cohortId) {
    const cohortRow = await db
      .select({ name: schema.cohorts.name })
      .from(schema.cohorts)
      .where(eq(schema.cohorts.id, cohortId));
    cohortName = cohortRow[0]?.name ?? null;
  }

  const coreSet = await loadQuestionSet('competency-core');
  const cohortSet = cohortId ? await loadQuestionSet(`competency-cohort-${cohortId}`) : null;
  const internSet = await loadQuestionSet(`competency-intern-${internId}`);

  const tagged: StitchedQuestion[] = [];
  const boundaries: SectionBoundary[] = [];

  if (coreSet && coreSet.questions.length > 0) {
    boundaries.push({ afterIndex: tagged.length - 1, label: 'Professional Competencies' });
    for (const q of coreSet.questions) tagged.push({ ...q, tier: 'core' } as StitchedQuestion);
  }
  if (cohortSet && cohortSet.questions.length > 0) {
    boundaries.push({
      afterIndex: tagged.length - 1,
      label: 'Role-Specific',
      ...(cohortName ? { subLabel: cohortName } : {}),
    });
    for (const q of cohortSet.questions) tagged.push({ ...q, tier: 'cohort' } as StitchedQuestion);
  }
  if (internSet && internSet.questions.length > 0) {
    boundaries.push({ afterIndex: tagged.length - 1, label: 'Intern-Specific' });
    for (const q of internSet.questions) tagged.push({ ...q, tier: 'intern' } as StitchedQuestion);
  }

  return {
    internId,
    questions: tagged,
    sectionBoundaries: boundaries,
  };
}
