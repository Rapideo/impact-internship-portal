// Employer Exit Employer Survey self-service route (SP5 Phase I, Task 28).
//
// Mirrors the admin equivalent (app/routes/admin.assessments.exit-employer-survey.tsx)
// but:
//   * Auth = employer scope (parent employer.tsx already enforces role +
//     employerId; this loader does a thin TS-narrowing guard).
//   * `internInEmployerScope(internId, employerId)` is checked in both loader
//     and action as defense-in-depth alongside the RLS policies
//     `employer_write_submissions` (INSERT) and `employer_update_submissions`
//     (UPDATE) on assessment_submissions.
//   * Writes go through the authenticated supabase client (not the
//     service-role `db`) so the RLS policies are exercised. The table is
//     queried by its snake_case name with snake_case columns.
//   * Upsert-by-intern semantics: re-opening the form pre-fills the previous
//     answers and saving updates the same row.
//
// Note: `~/lib/admin-queries.server` is misnamed; the helpers it exports are
// plain read helpers (no admin assertions) and are appropriate for the
// employer side too. They run via the service-role `db` client — that is
// fine here because we've already scope-checked the intern.

import { useEffect } from 'react';
import { data, Link, redirect, useActionData, useLoaderData, useSearchParams } from 'react-router';
import type { Route } from './+types/employer.exit-survey';
import { createSupabaseServerClient, getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import {
  getCohortOrNull,
  getEmployerOrNull,
  getInternOrNull,
  getRoleOrNull,
} from '~/lib/admin-queries.server';
import { internInEmployerScope } from '~/lib/employer-scope.server';
import { loadQuestionSet } from '~/lib/question-engine.server';
import { validateAnswers } from '~/lib/question-engine';
import type { SerializedAnswers } from '~/lib/question-types';
import { UUID_RE } from '~/lib/validation';
import { getOneShotSubmission } from '~/lib/assessment-submissions.server';
import { AssessmentForm } from '~/components/forms/AssessmentForm';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { useToast } from '~/components/ToastProvider';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Exit Employer Survey · IMPACT Employer' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }

  const url = new URL(request.url);
  const internId = url.searchParams.get('internId');
  if (!internId || !UUID_RE.test(internId)) {
    throw new Response('Intern required', { status: 400, headers });
  }

  const inScope = await internInEmployerScope(internId, auth.employerId);
  if (!inScope) throw new Response('Not found', { status: 404, headers });

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
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }

  const url = new URL(request.url);
  const internId = url.searchParams.get('internId');
  if (!internId || !UUID_RE.test(internId)) {
    return data({ errors: { __form: 'Intern required.' } }, { status: 400, headers });
  }

  const inScope = await internInEmployerScope(internId, auth.employerId);
  if (!inScope) throw new Response('Not found', { status: 404, headers });

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

  const supabase = createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const submittedBy = user?.id ?? null;

  // Upsert-by-intern: if a row already exists, UPDATE it; otherwise INSERT.
  // Both paths go through the authenticated client so the corresponding RLS
  // policies (`employer_write_submissions`, `employer_update_submissions`)
  // are exercised. snake_case columns.
  const existing = await getOneShotSubmission(internId, 'exit-employer-survey');
  if (existing) {
    const { error } = await supabase
      .from('assessment_submissions')
      .update({
        answers: answers as Record<string, unknown>,
        submitted_by: submittedBy,
      })
      .eq('id', existing.id);
    if (error) {
      return data({ errors: { __form: error.message } }, { status: 500, headers });
    }
  } else {
    const { error } = await supabase.from('assessment_submissions').insert({
      intern_id: internId,
      type: 'exit-employer-survey',
      answers: answers as Record<string, unknown>,
      submitted_by: submittedBy,
    });
    if (error) {
      return data({ errors: { __form: error.message } }, { status: 500, headers });
    }
  }

  throw redirect(`/employer/interns/${internId}?ees=saved`, { headers });
}

export default function EmployerExitSurvey() {
  const { intern, cohort, employer, role, questions, existingAnswers } =
    useLoaderData<typeof loader>();
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
            <Link to="/employer/interns" style={{ color: 'inherit', textDecoration: 'none' }}>
              EMPLOYER / INTERNS
            </Link>{' '}
            / EXIT EMPLOYER SURVEY
          </>
        }
        title="EXIT EMPLOYER SURVEY."
        sub="Complete the post-internship employer survey for this intern. Saving updates the existing record."
      >
        <MetaStrip
          items={[
            { label: 'Employer', value: employer?.name ?? '—' },
            { label: 'Participant', value: `${intern.firstInitial}. ${intern.lastName}` },
            { label: 'Position', value: role?.label ?? '—' },
            { label: 'Cohort', value: cohort?.name ?? '—' },
            { label: 'Start', value: formatDate(intern.startDate), mono: true },
            { label: 'End', value: formatDate(intern.endDate), mono: true },
          ]}
        />
      </PageHead>
      <section>
        <div className="container">
          <AssessmentForm
            actionPath={`/employer/exit-survey?internId=${internId}`}
            questions={questions}
            initialAnswers={existingAnswers}
            errors={errors}
            setLevelError={setLevelError}
            submitLabel="Save Exit Survey"
            modalTitle="Save the exit employer survey?"
            modalBody="You can re-open and update this record later from the intern record."
            readOnly={false}
          />
        </div>
      </section>
    </>
  );
}
