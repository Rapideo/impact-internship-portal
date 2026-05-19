// Employer Competency edit route (SP5 Phase H, Task 27a).
//
// Uses a querystring `?id=` rather than a path param (per plan), to keep the
// edit URL distinct from the read-only viewer at `/employer/competency/$id`.
//
// UPDATE goes through the authenticated supabase client so the RLS policy
// `employer_update_submissions` is exercised. We still check
// `internInEmployerScope` in JS as defense-in-depth.

import { useEffect } from 'react';
import { and, eq, isNull } from 'drizzle-orm';
import { data, Link, redirect, useActionData, useLoaderData } from 'react-router';
import type { Route } from './+types/employer.competency.edit';
import { createSupabaseServerClient, getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { assessmentSubmissions } from '../../db/schema';
import {
  getCohortOrNull,
  getEmployerOrNull,
  getInternOrNull,
  getRoleOrNull,
  listPhasesForCohort,
} from '~/lib/admin-queries.server';
import { internInEmployerScope } from '~/lib/employer-scope.server';
import { stitchedCompetencyQuestions } from '~/lib/question-engine.server';
import { validateAnswers } from '~/lib/question-engine';
import type { SerializedAnswers } from '~/lib/question-types';
import { UUID_RE } from '~/lib/validation';
import { CompetencyAssessmentForm } from '~/components/forms/CompetencyAssessmentForm';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { useToast } from '~/components/ToastProvider';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [
  { title: 'Edit Competency Assessment · IMPACT Employer' },
];

async function loadSubmissionInScope(id: string, employerId: string) {
  const rows = await db
    .select()
    .from(assessmentSubmissions)
    .where(and(eq(assessmentSubmissions.id, id), isNull(assessmentSubmissions.deletedAt)))
    .limit(1);
  const submission = rows[0];
  if (!submission || submission.type !== 'competency') return null;
  const inScope = await internInEmployerScope(submission.internId, employerId);
  if (!inScope) return null;
  return submission;
}

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id || !UUID_RE.test(id)) {
    throw new Response('Not found', { status: 404, headers });
  }

  const submission = await loadSubmissionInScope(id, auth.employerId);
  if (!submission) throw new Response('Not found', { status: 404, headers });

  const intern = await getInternOrNull(db, submission.internId);
  if (!intern) throw new Response('Intern not found', { status: 404, headers });

  const cohort = await getCohortOrNull(db, intern.cohortId);
  const employer = cohort ? await getEmployerOrNull(db, cohort.employerId) : null;
  const role = intern.roleId ? await getRoleOrNull(db, intern.roleId) : null;

  const stitched = await stitchedCompetencyQuestions(submission.internId);
  const phaseRows = await listPhasesForCohort(db, intern.cohortId);

  return data(
    {
      submission,
      intern,
      cohort,
      employer,
      role,
      phases: phaseRows.map((p) => ({ id: p.id, label: p.label })),
      questions: stitched.questions,
      sectionBoundaries: stitched.sectionBoundaries,
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
  const id = url.searchParams.get('id');
  if (!id || !UUID_RE.test(id)) {
    throw new Response('Not found', { status: 404, headers });
  }

  const submission = await loadSubmissionInScope(id, auth.employerId);
  if (!submission) throw new Response('Not found', { status: 404, headers });

  const intern = await getInternOrNull(db, submission.internId);
  if (!intern) return data({ errors: { __form: 'Intern not found.' } }, { status: 404, headers });

  const formData = await request.formData();
  const phase = String(formData.get('phase') ?? '').trim();
  const raw = String(formData.get('answers') ?? '{}');
  if (!phase) {
    return data({ errors: { __form: 'Phase is required.' } }, { status: 400, headers });
  }

  const phaseRows = await listPhasesForCohort(db, intern.cohortId);
  const phaseIds = new Set(phaseRows.map((p) => p.id));
  if (!phaseIds.has(phase)) {
    return data(
      { errors: { __form: 'Invalid phase for this intern’s cohort.' } },
      { status: 400, headers },
    );
  }

  let answers: SerializedAnswers;
  try {
    answers = JSON.parse(raw) as SerializedAnswers;
  } catch {
    return data({ errors: { __form: 'Invalid submission.' } }, { status: 400, headers });
  }

  const stitched = await stitchedCompetencyQuestions(submission.internId);
  const v = validateAnswers(stitched.questions, answers, {});
  if (!v.ok) {
    return data({ errors: v.errors }, { status: 400, headers });
  }

  const supabase = createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const submittedBy = user?.id ?? null;

  const { error } = await supabase
    .from('assessment_submissions')
    .update({
      phase,
      answers: answers as Record<string, unknown>,
      submitted_by: submittedBy,
    })
    .eq('id', submission.id);

  if (error) {
    return data({ errors: { __form: error.message } }, { status: 500, headers });
  }

  throw redirect(`/employer/interns/${submission.internId}?submitted=competency`, { headers });
}

export default function EmployerCompetencyEdit() {
  const { submission, intern, cohort, employer, role, phases, questions, sectionBoundaries } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = (actionData?.errors ?? {}) as Record<string, string>;
  const setLevelError = errors.__minRequired ?? errors.__form ?? null;
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
            </Link>
            {' / '}
            <Link
              to={`/employer/interns/${intern.id}`}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {intern.lastName.toUpperCase()}
            </Link>
            {' / COMPETENCY / EDIT'}
          </>
        }
        title={
          <>
            EDIT COMPETENCY
            <br />
            ASSESSMENT.
          </>
        }
        sub="Adjust the phase or answers below. Saving updates the existing record in place."
      >
        <MetaStrip
          items={[
            { label: 'Intern', value: `${intern.firstInitial}. ${intern.lastName}` },
            { label: 'Cohort', value: cohort?.name ?? '—' },
            { label: 'Role', value: role?.label ?? '—' },
            { label: 'Employer', value: employer?.name ?? '—' },
            { label: 'Start', value: formatDate(intern.startDate), mono: true },
            { label: 'End', value: formatDate(intern.endDate), mono: true },
          ]}
        />
      </PageHead>
      <section className="assessment-wrap">
        <div className="container">
          <CompetencyAssessmentForm
            internId={intern.id}
            phases={phases}
            questions={questions}
            sectionBoundaries={sectionBoundaries}
            initialAnswers={(submission.answers as unknown as SerializedAnswers) ?? {}}
            initialPhase={submission.phase ?? null}
            errors={errors}
            setLevelError={setLevelError}
            actionPath={`/employer/competency/edit?id=${submission.id}`}
            submitLabel="Save Changes"
            readOnly={false}
            cancelHref={`/employer/interns/${intern.id}`}
            meta={{
              internName: `${intern.firstInitial}. ${intern.lastName}`,
              cohortName: cohort?.name ?? '—',
              employerName: employer?.name ?? '—',
              roleName: role?.label ?? '—',
              startDate: formatDate(intern.startDate),
              endDate: formatDate(intern.endDate),
            }}
          />
        </div>
      </section>
    </>
  );
}
