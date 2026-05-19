// Admin self-assessment-detail viewer (SP4 Phase D, Task 25).
//
// Read-only viewer for the three intern-submitted one-shot types
// (personal-goals, midpoint-reflection, participant-feedback). Empty-state
// renders when the intern hasn't submitted that type yet. Includes an
// optional soft-delete action that frees the intern to re-submit.
//
// SP7 Phase F rewrite — markup now matches `self-assessment-detail.html`:
// two-line `<LASTNAME> —<br/><TYPE>.` title, 6-cell meta-strip including
// a "Locked = Immutable" cell per prototype, `<DetailHeader>` band above
// the rubric with question-count micro-label, rubric-panel empty state
// (not identity-card), `.detail-actions` row at the bottom (Close /
// Delete Submission) instead of header-action buttons.

import { useState } from 'react';
import { eq } from 'drizzle-orm';
import { data, Form, Link, redirect, useLoaderData, useSearchParams } from 'react-router';
import type { Route } from './+types/admin.self-assessment-detail';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { assessmentSubmissions } from '../../db/schema';
import { getCohortOrNull, getEmployerOrNull, getInternOrNull } from '~/lib/admin-queries.server';
import { getOneShotSubmission, type SubmissionType } from '~/lib/assessment-submissions.server';
import { loadQuestionSet } from '~/lib/question-engine.server';
import type { SerializedAnswers } from '~/lib/question-types';
import { UUID_RE } from '~/lib/validation';
import { AssessmentForm } from '~/components/forms/AssessmentForm';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { DetailHeader } from '~/components/DetailHeader';
import { ConfirmModal } from '~/components/ConfirmModal';

export const meta: Route.MetaFunction = () => [{ title: 'Self-Assessment Detail · IMPACT Admin' }];

const VALID_TYPES = ['personal-goals', 'midpoint-reflection', 'participant-feedback'] as const;
type SelfType = (typeof VALID_TYPES)[number];

function isValidType(v: string): v is SelfType {
  return (VALID_TYPES as readonly string[]).includes(v);
}

function typeLabel(t: SelfType): string {
  if (t === 'personal-goals') return 'PERSONAL GOALS';
  if (t === 'midpoint-reflection') return 'MIDPOINT REFLECTION';
  return 'PARTICIPANT FEEDBACK';
}

function setDisplayName(t: SelfType): string {
  if (t === 'personal-goals') return 'Personal Goals';
  if (t === 'midpoint-reflection') return 'Midpoint Reflection';
  return 'Participant Feedback';
}

function setSubCopy(t: SelfType): string {
  if (t === 'personal-goals') {
    return 'Submitted and locked. One submission per intern. The intern’s starting reflection on what they want to get out of this internship.';
  }
  if (t === 'midpoint-reflection') {
    return 'Submitted and locked. One submission per intern. The intern’s mid-program reflection on progress and next steps.';
  }
  return 'Submitted and locked. One submission per intern. End-of-program feedback covering experience, supports, and barriers.';
}

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const url = new URL(request.url);
  const typeParam = url.searchParams.get('type') ?? '';
  const internId = url.searchParams.get('internId');
  if (!internId || !UUID_RE.test(internId)) {
    throw new Response('internId required', { status: 400, headers });
  }
  if (!isValidType(typeParam)) {
    throw new Response('Invalid type parameter', { status: 400, headers });
  }
  const type: SelfType = typeParam;

  const intern = await getInternOrNull(db, internId);
  if (!intern) throw new Response('Intern not found', { status: 404, headers });

  const cohort = await getCohortOrNull(db, intern.cohortId);
  const employer = cohort ? await getEmployerOrNull(db, cohort.employerId) : null;
  const set = await loadQuestionSet(type);
  if (!set) throw new Response('Question set unavailable', { status: 500, headers });

  const submission = await getOneShotSubmission(internId, type as SubmissionType);
  if (!submission) {
    return data(
      {
        found: false as const,
        type,
        intern,
        cohort,
        employer,
        questions: set.questions,
      },
      { headers },
    );
  }

  return data(
    {
      found: true as const,
      type,
      submission,
      intern,
      cohort,
      employer,
      questions: set.questions,
    },
    { headers },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const url = new URL(request.url);
  const typeParam = url.searchParams.get('type') ?? '';
  const internId = url.searchParams.get('internId');
  if (!internId || !UUID_RE.test(internId) || !isValidType(typeParam)) {
    throw new Response('Bad request', { status: 400, headers });
  }
  const formData = await request.formData();
  if (String(formData.get('_intent')) !== 'delete') {
    return data({ error: 'Unknown intent' }, { status: 400, headers });
  }

  const submission = await getOneShotSubmission(internId, typeParam as SubmissionType);
  if (!submission) {
    throw new Response('Not Found', { status: 404, headers });
  }

  await db
    .update(assessmentSubmissions)
    .set({ deletedAt: new Date() })
    .where(eq(assessmentSubmissions.id, submission.id));

  throw redirect(`/admin/self-assessment-results?deleted=1`, { headers });
}

export default function SelfAssessmentDetail() {
  const loaderData = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const internId = searchParams.get('internId') ?? '';
  const [deleteOpen, setDeleteOpen] = useState(false);

  const closeHref = internId ? `/admin/interns/${internId}` : '/admin/self-assessment-results';
  const titleName = loaderData.found ? loaderData.intern.lastName.toUpperCase() : 'NO SUBMISSION';

  // 6-cell meta-strip per prototype: First Initial · Last · Employer ·
  // Cohort · Submitted · Locked = "Immutable".
  const metaItems: { label: string; value: string; mono?: boolean }[] = [
    { label: 'First Initial', value: loaderData.intern.firstInitial, mono: true },
    { label: 'Last Name', value: loaderData.intern.lastName },
    { label: 'Employer', value: loaderData.employer?.name ?? '—' },
    { label: 'Cohort', value: loaderData.cohort?.name ?? '—' },
  ];

  if (loaderData.found) {
    const submittedAt =
      typeof loaderData.submission.submittedAt === 'string'
        ? new Date(loaderData.submission.submittedAt)
        : loaderData.submission.submittedAt;
    const mm = (submittedAt.getMonth() + 1).toString().padStart(2, '0');
    const dd = submittedAt.getDate().toString().padStart(2, '0');
    metaItems.push({
      label: 'Submitted',
      value: `${mm}.${dd}.${submittedAt.getFullYear()}`,
      mono: true,
    });
  } else {
    metaItems.push({ label: 'Submitted', value: '—', mono: true });
  }
  // Brand-voice cell — always present per prototype, confirms one-shot
  // semantics regardless of submission state.
  metaItems.push({ label: 'Locked', value: 'Immutable' });

  const questionCount = loaderData.questions.length;
  const detailMeta = loaderData.found ? `${String(questionCount).padStart(2, '0')} QUESTIONS` : '—';

  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link to="/admin/interns" style={{ color: 'inherit', textDecoration: 'none' }}>
              ADMIN / INTERNS
            </Link>
            {loaderData.found ? (
              <>
                {' '}
                /{' '}
                <Link to={closeHref} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {loaderData.intern.lastName.toUpperCase()}
                </Link>
              </>
            ) : null}{' '}
            / {typeLabel(loaderData.type)}
          </>
        }
        title={
          <>
            {titleName} &mdash;
            <br />
            {typeLabel(loaderData.type)}.
          </>
        }
        sub={setSubCopy(loaderData.type)}
      >
        <MetaStrip items={metaItems} />
      </PageHead>

      <section className="assessment-wrap">
        <div className="container">
          <DetailHeader title={setDisplayName(loaderData.type)} aside={detailMeta} />

          {loaderData.found ? (
            <AssessmentForm
              actionPath=""
              questions={loaderData.questions}
              initialAnswers={(loaderData.submission.answers as unknown as SerializedAnswers) ?? {}}
              errors={{}}
              submitLabel=""
              modalTitle=""
              modalBody=""
              readOnly={true}
            />
          ) : (
            <div className="rubric assessment-questions">
              <div
                className="rubric-panel"
                style={{ padding: '32px 28px', textAlign: 'center', color: 'var(--muted)' }}
              >
                <p
                  style={{
                    margin: '0 0 12px 0',
                    fontFamily: 'var(--font-display)',
                    fontSize: 18,
                    color: 'var(--ink)',
                  }}
                >
                  No submission yet.
                </p>
                <p style={{ margin: 0, fontSize: 14 }}>
                  This intern has not yet submitted the assessment. The card on their record will
                  update automatically once they do.
                </p>
              </div>
            </div>
          )}

          <div className="detail-actions">
            <Link to={closeHref} className="btn btn--outline">
              &larr; Close
            </Link>
            {loaderData.found ? (
              <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>
                Delete Submission
              </button>
            ) : null}
          </div>

          {loaderData.found ? (
            <Form method="post" id="self-delete-form">
              <input type="hidden" name="_intent" value="delete" />
            </Form>
          ) : null}
        </div>
      </section>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          (document.getElementById('self-delete-form') as HTMLFormElement | null)?.submit();
        }}
        label="DELETE SUBMISSION"
        title="Delete this submission?"
        body="The submitted responses will be permanently removed and the intern will be able to submit again. This cannot be undone."
        confirmText="Delete Permanently"
        variant="danger"
      />
    </>
  );
}
