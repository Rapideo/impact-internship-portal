// Admin Competency new-assessment route (SP4 Phase D, Task 21).
//
// Always inserts a new `assessment_submissions` row (phase-scoped) per the
// PRD: an intern may have multiple competency rows, one per phase, and the
// admin may re-assess a phase if a re-evaluation is needed.

import { useEffect } from 'react';
import { data, Link, redirect, useActionData, useLoaderData } from 'react-router';
import type { Route } from './+types/admin.assessments.competency.new';
import { requireAdmin } from '~/lib/admin-guard.server';
import { createSupabaseServerClient } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import {
  getCohortOrNull,
  getEmployerOrNull,
  getInternOrNull,
  getRoleOrNull,
  listPhasesForCohort,
} from '~/lib/admin-queries.server';
import { stitchedCompetencyQuestions } from '~/lib/question-engine.server';
import { validateAnswers } from '~/lib/question-engine';
import type { SerializedAnswers } from '~/lib/question-types';
import { UUID_RE } from '~/lib/validation';
import { insertOrUpdateSubmissionAsAdmin } from '~/lib/assessment-submissions.server';
import { CompetencyAssessmentForm } from '~/components/forms/CompetencyAssessmentForm';
import { PageHead } from '~/components/PageHead';
import { useToast } from '~/components/ToastProvider';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [
  { title: 'New Competency Assessment · IMPACT Admin' },
];

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
  const { headers } = await requireAdmin(request);
  const url = new URL(request.url);
  const internId = url.searchParams.get('internId');
  if (!internId || !UUID_RE.test(internId)) {
    return data({ errors: { __form: 'Intern required.' } }, { status: 400, headers });
  }

  const intern = await getInternOrNull(db, internId);
  if (!intern) return data({ errors: { __form: 'Intern not found.' } }, { status: 404, headers });

  const formData = await request.formData();
  const phase = String(formData.get('phase') ?? '').trim();
  const raw = String(formData.get('answers') ?? '{}');
  if (!phase) {
    return data({ errors: { __form: 'Phase is required.' } }, { status: 400, headers });
  }

  // Validate phase is one of the cohort's phases (anti-tamper).
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

  const newId = await insertOrUpdateSubmissionAsAdmin({
    internId,
    type: 'competency',
    phase,
    answers,
    submittedBy,
  });

  throw redirect(`/admin/assessments/competency/${newId}?saved=1`, { headers });
}

export default function AdminCompetencyNew() {
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
            <Link to="/admin/assessments" style={{ color: 'inherit', textDecoration: 'none' }}>
              ADMIN / ASSESSMENTS
            </Link>{' '}
            / COMPETENCY / NEW
          </>
        }
        title="NEW COMPETENCY ASSESSMENT."
        sub="Select the phase, score the rubric, and save. Multiple phases per intern are supported."
      />
      <section>
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
            actionPath={`/admin/assessments/competency/new?internId=${intern.id}`}
            submitLabel="Save Competency Assessment"
            readOnly={false}
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
