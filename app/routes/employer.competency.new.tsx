// Employer Competency new-assessment route (SP5 Phase H, Task 26).
//
// Mirrors the admin equivalent (app/routes/admin.assessments.competency.new.tsx)
// but:
//   * Auth = employer scope (parent employer.tsx already enforces role +
//     employerId; this loader does a thin TS-narrowing guard).
//   * `internInEmployerScope(internId, employerId)` is checked in both loader
//     and action as defense-in-depth alongside the RLS policy
//     `employer_write_submissions` on assessment_submissions.
//   * INSERT goes through the authenticated supabase client (not the
//     service-role `db`) so the RLS policy is exercised. The table is queried
//     by its snake_case name with snake_case columns.
//
// Note: `~/lib/admin-queries.server` is misnamed; the helpers it exports are
// plain read helpers (no admin assertions) and are appropriate for the
// employer side too. They run via the service-role `db` client — that is
// fine here because we've already scope-checked the intern.

import { useEffect } from 'react';
import { data, Link, redirect, useActionData, useLoaderData } from 'react-router';
import type { Route } from './+types/employer.competency.new';
import { createSupabaseServerClient, getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
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
  { title: 'New Competency Assessment · IMPACT Employer' },
];

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

  const stitched = await stitchedCompetencyQuestions(internId);
  const phaseRows = await listPhasesForCohort(db, intern.cohortId);

  return data(
    {
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
  const internId = url.searchParams.get('internId');
  if (!internId || !UUID_RE.test(internId)) {
    return data({ errors: { __form: 'Intern required.' } }, { status: 400, headers });
  }

  const inScope = await internInEmployerScope(internId, auth.employerId);
  if (!inScope) throw new Response('Not found', { status: 404, headers });

  const intern = await getInternOrNull(db, internId);
  if (!intern) return data({ errors: { __form: 'Intern not found.' } }, { status: 404, headers });

  const formData = await request.formData();
  const phase = String(formData.get('phase') ?? '').trim();
  const raw = String(formData.get('answers') ?? '{}');
  if (!phase) {
    return data({ errors: { __form: 'Phase is required.' } }, { status: 400, headers });
  }

  // Anti-tamper: phase must belong to this intern's cohort.
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

  const stitched = await stitchedCompetencyQuestions(internId);
  const v = validateAnswers(stitched.questions, answers, {});
  if (!v.ok) {
    return data({ errors: v.errors }, { status: 400, headers });
  }

  const supabase = createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const submittedBy = user?.id ?? null;

  // Insert via the authenticated supabase client so the RLS policy
  // `employer_write_submissions` is exercised. snake_case columns.
  const { data: inserted, error } = await supabase
    .from('assessment_submissions')
    .insert({
      intern_id: internId,
      type: 'competency',
      phase,
      answers: answers as Record<string, unknown>,
      submitted_by: submittedBy,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    return data(
      { errors: { __form: error?.message ?? 'Could not save submission.' } },
      { status: 500, headers },
    );
  }

  throw redirect(`/employer/interns/${internId}?submitted=competency`, { headers });
}

export default function EmployerCompetencyNew() {
  const { intern, cohort, employer, role, phases, questions, sectionBoundaries } =
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
            {' / COMPETENCY / NEW'}
          </>
        }
        title={
          <>
            NEW COMPETENCY
            <br />
            ASSESSMENT.
          </>
        }
        sub="Select the phase, score the rubric, and save. Multiple phases per intern are supported."
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
            initialAnswers={{}}
            initialPhase={null}
            errors={errors}
            setLevelError={setLevelError}
            actionPath={`/employer/competency/new?internId=${intern.id}`}
            submitLabel="Save Competency Assessment"
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
