// Admin Competency detail (read-only) route (SP4 Phase D, Task 23).
//
// Renders the saved competency assessment in read-only mode with an Edit
// link and a Delete action that soft-deletes (sets deleted_at).

import { useEffect, useState } from 'react';
import { eq } from 'drizzle-orm';
import { data, Form, Link, redirect, useLoaderData, useSearchParams } from 'react-router';
import type { Route } from './+types/admin.assessments.competency.$id';
import { requireAdmin } from '~/lib/admin-guard.server';
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
import type { SerializedAnswers } from '~/lib/question-types';
import { CompetencyAssessmentForm } from '~/components/forms/CompetencyAssessmentForm';
import { PageHead } from '~/components/PageHead';
import { ConfirmModal } from '~/components/ConfirmModal';
import { useToast } from '~/components/ToastProvider';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Competency Assessment · IMPACT Admin' }];

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
  const formData = await request.formData();
  const intent = String(formData.get('_intent') ?? '');
  if (intent !== 'delete') {
    return data({ error: 'Unknown intent' }, { status: 400, headers });
  }

  const submission = await getSubmission(id);
  if (!submission || submission.type !== 'competency') {
    throw new Response('Not Found', { status: 404, headers });
  }

  await db
    .update(assessmentSubmissions)
    .set({ deletedAt: new Date() })
    .where(eq(assessmentSubmissions.id, submission.id));

  throw redirect(`/admin/interns/${submission.internId}?competencyDeleted=1`, { headers });
}

export default function AdminCompetencyDetail() {
  const { submission, intern, cohort, employer, role, phases, questions, sectionBoundaries } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('saved') === '1') {
      toast.show({ kind: 'success', label: 'SAVED', message: 'Competency assessment saved.' });
      searchParams.delete('saved');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  const submittedAt =
    typeof submission.submittedAt === 'string'
      ? new Date(submission.submittedAt)
      : submission.submittedAt;
  const phaseLabel =
    phases.find((p) => p.id === submission.phase)?.label ?? submission.phase ?? '—';

  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link to="/admin/assessments" style={{ color: 'inherit', textDecoration: 'none' }}>
              ADMIN / ASSESSMENTS
            </Link>{' '}
            / COMPETENCY
          </>
        }
        title={`COMPETENCY — ${intern.lastName.toUpperCase()}.`}
        sub={`Phase ${phaseLabel} · submitted ${submittedAt.toLocaleDateString()}.`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              to={`/admin/assessments/competency/edit/${submission.id}`}
              className="btn btn--outline"
            >
              Edit
            </Link>
            <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>
              Delete
            </button>
          </div>
        }
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
            errors={{}}
            actionPath=""
            submitLabel=""
            readOnly={true}
            meta={{
              internName: `${intern.firstInitial}. ${intern.lastName}`,
              cohortName: cohort?.name ?? '—',
              employerName: employer?.name ?? '—',
              roleName: role?.label ?? '—',
              startDate: formatDate(intern.startDate),
              endDate: formatDate(intern.endDate),
            }}
          />

          <Form method="post" id="competency-delete-form">
            <input type="hidden" name="_intent" value="delete" />
          </Form>
        </div>
      </section>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          (document.getElementById('competency-delete-form') as HTMLFormElement | null)?.submit();
        }}
        label="DELETE COMPETENCY"
        title="Delete this competency assessment?"
        body="The submission will be soft-deleted and removed from the intern's record. An admin can recover it from the database if needed."
        confirmText="Delete Permanently"
        variant="danger"
      />
    </>
  );
}
