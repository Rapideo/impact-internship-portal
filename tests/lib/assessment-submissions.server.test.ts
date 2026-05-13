import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { describe, it, expect, beforeEach } from 'vitest';
import postgres from 'postgres';
import {
  insertAnonymousSubmission,
  insertOrUpdateSubmissionAsAdmin,
  getSubmission,
  AssessmentAlreadySubmittedError,
} from '~/lib/assessment-submissions.server';

// Live-DB-gated: skip when DATABASE_POOL_URL is unset or a placeholder.
const SKIP = !process.env.DATABASE_POOL_URL || process.env.DATABASE_POOL_URL.includes('fake');

// Plan calls this "ESKENAZI_INTERN"; in the actual seed this UUID is A. Whitaker
// in the Riverbend cohort — the test only cares about the intern_id, not the
// person, so we keep the label for traceability with the plan.
const ESKENAZI_INTERN = '44444444-4444-4444-4444-444444444401';

describe.skipIf(SKIP)('assessment-submissions helpers', () => {
  beforeEach(async () => {
    const sql = postgres(process.env.DATABASE_POOL_URL!, { max: 1, prepare: false });
    try {
      await sql`DELETE FROM public.assessment_submissions WHERE intern_id = ${ESKENAZI_INTERN}`;
    } finally {
      await sql.end();
    }
  });

  it('inserts a one-shot submission anonymously', async () => {
    const id = await insertAnonymousSubmission({
      internId: ESKENAZI_INTERN,
      type: 'personal-goals',
      answers: { 'pg-skills': 'Communication' },
    });
    expect(id).toBeTruthy();
  });

  it('rejects a duplicate one-shot submission with AssessmentAlreadySubmittedError', async () => {
    await insertAnonymousSubmission({
      internId: ESKENAZI_INTERN,
      type: 'personal-goals',
      answers: { 'pg-skills': 'A' },
    });
    await expect(
      insertAnonymousSubmission({
        internId: ESKENAZI_INTERN,
        type: 'personal-goals',
        answers: { 'pg-skills': 'B' },
      }),
    ).rejects.toBeInstanceOf(AssessmentAlreadySubmittedError);
  });

  it('admin insert-or-update upserts the exit-employer-survey (editable)', async () => {
    const id1 = await insertOrUpdateSubmissionAsAdmin({
      internId: ESKENAZI_INTERN,
      type: 'exit-employer-survey',
      answers: { 'ees-outcome': 'hired' },
      submittedBy: null,
    });
    const id2 = await insertOrUpdateSubmissionAsAdmin({
      internId: ESKENAZI_INTERN,
      type: 'exit-employer-survey',
      answers: { 'ees-outcome': 'completed' },
      submittedBy: null,
    });
    expect(id2).toBe(id1); // same row updated, not a second row
    const row = await getSubmission(id2);
    expect((row?.answers as Record<string, unknown>)['ees-outcome']).toBe('completed');
  });

  it('admin can insert multiple competency submissions per intern per phase', async () => {
    const id1 = await insertOrUpdateSubmissionAsAdmin({
      internId: ESKENAZI_INTERN,
      type: 'competency',
      phase: 'Phase 1',
      answers: { 'comp-attendance': { rating: 'ready', notes: '' } },
      submittedBy: null,
    });
    const id2 = await insertOrUpdateSubmissionAsAdmin({
      internId: ESKENAZI_INTERN,
      type: 'competency',
      phase: 'Phase 1',
      answers: { 'comp-attendance': { rating: 'developing', notes: '' } },
      submittedBy: null,
    });
    expect(id2).not.toBe(id1); // PRD §7.4: multiple competency per phase allowed
  });
});
