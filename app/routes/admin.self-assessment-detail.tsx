// Admin self-assessment-detail viewer (SP4 Phase D, Task 25).
//
// Read-only viewer for the three intern-submitted one-shot types
// (personal-goals, midpoint-reflection, participant-feedback). Empty-state
// renders when the intern hasn't submitted that type yet. Includes an
// optional soft-delete action that frees the intern to re-submit.

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
import { AssessmentForm } from '~/components/forms/AssessmentForm';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { ConfirmModal } from '~/components/ConfirmModal';

export const meta: Route.MetaFunction = () => [{ title: 'Self-Assessment Detail · IMPACT Admin' }];

const VALID_TYPES = ['personal-goals', 'midpoint-reflection', 'participant-feedback'] as const;
type SelfType = (typeof VALID_TYPES)[number];

function isValidType(v: string): v is SelfType {
  return (VALID_TYPES as readonly string[]).includes(v);
}

function typeLabel(t: SelfType): string {
  if (t === 'personal-goals') return 'PERSONAL GOALS';
  if (t === 'midpoint-reflection') return 'MID-POINT REFLECTION';
  return 'PARTICIPANT FEEDBACK';
}

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const url = new URL(request.url);
  const typeParam = url.searchParams.get('type') ?? '';
  const internId = url.searchParams.get('internId');
  if (!internId) throw new Response('internId required', { status: 400, headers });
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
  if (!internId || !isValidType(typeParam)) {
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

  const metaItems = [
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
    metaItems.push({
      label: 'Submitted',
      value: submittedAt.toLocaleDateString(),
      mono: true,
    });
  }

  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link
              to="/admin/self-assessment-results"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              ADMIN / SELF-ASSESSMENT RESULTS
            </Link>{' '}
            / DETAIL
          </>
        }
        title={`${loaderData.intern.lastName.toUpperCase()} — ${typeLabel(loaderData.type)}.`}
        sub={
          loaderData.found ? 'Locked submission — read only.' : 'No submission yet for this type.'
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to={closeHref} className="btn btn--outline">
              Close
            </Link>
            {loaderData.found ? (
              <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>
                Delete Submission
              </button>
            ) : null}
          </div>
        }
      >
        <MetaStrip items={metaItems} />
      </PageHead>

      <section>
        <div className="container">
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
            <article className="identity-card">
              <p>
                No <strong>{typeLabel(loaderData.type)}</strong> submission has been recorded for
                this intern yet.
              </p>
            </article>
          )}

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
        body="The submission will be soft-deleted, freeing the intern to re-submit this assessment."
        confirmText="Delete Permanently"
        variant="danger"
      />
    </>
  );
}
