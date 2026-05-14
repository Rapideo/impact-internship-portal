// Admin Competency edit route (SP4 Phase D, Task 22).
//
// UPDATEs an existing competency submission in place (phase + answers).
// Uses the regular RLS-scoped `db` client because the `admin_all_submissions`
// policy in db/policies/0002_admin_all.sql grants FOR ALL to admin JWTs.

import { useEffect } from 'react';
import { eq } from 'drizzle-orm';
import { data, Link, redirect, useActionData, useLoaderData } from 'react-router';
import type { Route } from './+types/admin.assessments.competency.edit.$id';
import { requireAdmin } from '~/lib/admin-guard.server';
import { createSupabaseServerClient } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { assessmentSubmissions } from '../../db/schema';
import {
  getCohortOrNull,
  getEmployerOrNull,
  getInternOrNull,
  getRoleOrNull,
  listPhasesForCohort,
} from '~/lib/admin-queries.server';
import { getSubmission } from '~/lib/assessment-submissions.server';
import { stitchedCompetencyQuestions } from '~/lib/question-engine.server';
import { validateAnswers } from '~/lib/question-engine';
import type { SerializedAnswers } from '~/lib/question-types';
import { CompetencyAssessmentForm } from '~/components/forms/CompetencyAssessmentForm';
import { PageHead } from '~/components/PageHead';
import { useToast } from '~/components/ToastProvider';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [
  { title: 'Edit Competency Assessment · IMPACT Admin' },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const id = params.id;
  const submission = await getSubmission(id);
  if (!submission || submission.type !== 'competency') {
    throw new Response('Not Found', { status: 404, headers });
  }

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

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const id = params.id;
  const submission = await getSubmission(id);
  if (!submission || submission.type !== 'competency') {
    throw new Response('Not Found', { status: 404, headers });
  }
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

  await db
    .update(assessmentSubmissions)
    .set({
      phase,
      answers: answers as Record<string, unknown>,
      submittedBy,
    })
    .where(eq(assessmentSubmissions.id, submission.id));

  throw redirect(`/admin/assessments/competency/${submission.id}?saved=1`, { headers });
}

export default function AdminCompetencyEdit() {
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
            <Link to="/admin/assessments" style={{ color: 'inherit', textDecoration: 'none' }}>
              ADMIN / ASSESSMENTS
            </Link>{' '}
            / COMPETENCY / EDIT
          </>
        }
        title="EDIT COMPETENCY ASSESSMENT."
        sub="Adjust the phase or answers below. Saving updates the existing record in place."
      />
      <section>
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
            actionPath={`/admin/assessments/competency/edit/${submission.id}`}
            submitLabel="Save Changes"
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
