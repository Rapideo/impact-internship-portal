// Admin Exit Employer Survey route (SP4 Phase D, Task 20).
//
// Admin completes the exit survey on behalf of the employer for a given
// intern. Upsert-by-intern semantics: re-opening the form pre-fills the
// previous answers and saving updates the same row.
//
// Sub-project 5 will add an employer-self-service wrapper that posts to a
// different action; the form body lives in <AssessmentForm> so that wrapper
// can reuse the same questions and layout.

import { useEffect } from 'react';
import { data, Link, redirect, useActionData, useLoaderData, useSearchParams } from 'react-router';
import type { Route } from './+types/admin.assessments.exit-employer-survey';
import { requireAdmin } from '~/lib/admin-guard.server';
import { createSupabaseServerClient } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import {
  getCohortOrNull,
  getEmployerOrNull,
  getInternOrNull,
  getRoleOrNull,
} from '~/lib/admin-queries.server';
import { loadQuestionSet } from '~/lib/question-engine.server';
import { validateAnswers } from '~/lib/question-engine';
import type { SerializedAnswers } from '~/lib/question-types';
import { UUID_RE } from '~/lib/validation';
import {
  getOneShotSubmission,
  insertOrUpdateSubmissionAsAdmin,
} from '~/lib/assessment-submissions.server';
import { AssessmentForm } from '~/components/forms/AssessmentForm';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { useToast } from '~/components/ToastProvider';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Exit Employer Survey · IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const url = new URL(request.url);
  const internId = url.searchParams.get('internId');
  if (!internId || !UUID_RE.test(internId)) {
    throw new Response('Intern required', { status: 400, headers });
  }

  const intern = await getInternOrNull(db, internId);
  if (!intern) throw new Response('Intern not found', { status: 404, headers });

  const cohort = await getCohortOrNull(db, intern.cohortId);
  const employer = cohort ? await getEmployerOrNull(db, cohort.employerId) : null;
  const role = intern.roleId ? await getRoleOrNull(db, intern.roleId) : null;

  const set = await loadQuestionSet('exit-employer-survey');
  if (!set) throw new Response('Exit survey question set unavailable', { status: 500, headers });

  const existing = await getOneShotSubmission(internId, 'exit-employer-survey');

  return data(
    {
      intern,
      cohort,
      employer,
      role,
      questions: set.questions,
      minRequired: set.minRequired,
      existingAnswers: (existing?.answers as SerializedAnswers | undefined) ?? {},
    },
    { headers },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const url = new URL(request.url);
  const internId = url.searchParams.get('internId');
  if (!internId || !UUID_RE.test(internId)) {
    return data({ errors: { __form: 'Intern required.' } }, { status: 400, headers });
  }

  const intern = await getInternOrNull(db, internId);
  if (!intern) return data({ errors: { __form: 'Intern not found.' } }, { status: 404, headers });

  const formData = await request.formData();
  const raw = String(formData.get('answers') ?? '{}');
  let answers: SerializedAnswers;
  try {
    answers = JSON.parse(raw) as SerializedAnswers;
  } catch {
    return data({ errors: { __form: 'Invalid submission.' } }, { status: 400, headers });
  }

  const set = await loadQuestionSet('exit-employer-survey');
  if (!set) {
    return data({ errors: { __form: 'Exit survey unavailable.' } }, { status: 500, headers });
  }

  const v = validateAnswers(set.questions, answers, { minRequired: set.minRequired });
  if (!v.ok) {
    return data({ errors: v.errors }, { status: 400, headers });
  }

  // Resolve the admin user's id so submittedBy is auditable.
  const supabase = createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const submittedBy = user?.id ?? null;

  await insertOrUpdateSubmissionAsAdmin({
    internId,
    type: 'exit-employer-survey',
    answers,
    submittedBy,
  });

  // Back to the assessments hub (SP7 Phase F UX fix) so the admin can
  // pick a different intern + assessment next, rather than bouncing into
  // the unrelated intern record edit page.
  throw redirect(`/admin/assessments?submitted=exit-survey`, { headers });
}

export default function AdminExitEmployerSurvey() {
  const { intern, employer, role, questions, existingAnswers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = (actionData?.errors ?? {}) as Record<string, string>;
  const setLevelError = errors.__minRequired ?? errors.__form ?? null;
  const [searchParams] = useSearchParams();
  const internId = searchParams.get('internId') ?? '';
  const toast = useToast();

  useEffect(() => {
    if (errors && Object.keys(errors).length > 0) {
      toast.show({
        kind: 'danger',
        label: 'CHECK FIELDS',
        message: 'Please fix the highlighted fields.',
      });
    }
  }, [errors, toast]);

  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link to="/admin/interns" style={{ color: 'inherit', textDecoration: 'none' }}>
              ADMIN / INTERNS
            </Link>{' '}
            / EVALUATIONS / EXIT EMPLOYER SURVEY
          </>
        }
        title={
          <>
            EXIT EMPLOYER
            <br />
            SURVEY.
          </>
        }
        sub="Captured on behalf of the employer at the close of the placement. Save now, edit later."
      >
        <MetaStrip
          items={[
            { label: 'Employer', value: employer?.name ?? '—' },
            { label: 'Participant', value: `${intern.firstInitial}. ${intern.lastName}` },
            { label: 'Position', value: role?.label ?? '—' },
            { label: 'Start Date', value: formatDate(intern.startDate), mono: true },
            { label: 'End Date', value: formatDate(intern.endDate), mono: true },
          ]}
        />
      </PageHead>
      <section className="assessment-wrap">
        <div className="container">
          <AssessmentForm
            actionPath={`/admin/assessments/exit-employer-survey?internId=${internId}`}
            questions={questions}
            initialAnswers={existingAnswers}
            errors={errors}
            setLevelError={setLevelError}
            submitLabel="Save Survey"
            modalTitle="Save this Exit Employer Survey?"
            modalBody="The survey will be stored against this intern's record. You can return to edit it from the Evaluations panel."
            readOnly={false}
            cancelHref={`/admin/interns/${internId}`}
            statusCaption="EXIT EMPLOYER SURVEY · EDITABLE"
          />
        </div>
      </section>
    </>
  );
}
