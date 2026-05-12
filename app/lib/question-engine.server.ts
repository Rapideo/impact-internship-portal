import { eq, asc } from 'drizzle-orm';
import { db } from './db.server';
import * as schema from '../../db/schema';
import type { Question, QuestionSet, QuestionSetKind } from './question-types';

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
