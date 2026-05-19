// Admin Competency detail (read-only) route (SP4 Phase D, Task 23).
//
// Renders the saved competency assessment in read-only mode with an Edit
// link and a Delete action that soft-deletes (sets deleted_at).
//
// SP7 Phase F rewrite — markup now matches `competency-detail.html`:
// two-line `<LASTNAME> —<br/>COMPETENCY.` title, result pill in page-head
// row, 8-cell meta-strip including a "Reviewed By" cell (admin email),
// `<DetailHeader>` band above the rubric, `.detail-actions` row at the
// bottom (Close / Edit / Delete) instead of header-action buttons.

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
import { getSupabaseAdmin } from '~/lib/supabase-admin.server';
import { CompetencyAssessmentForm } from '~/components/forms/CompetencyAssessmentForm';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { DetailHeader } from '~/components/DetailHeader';
import { ConfirmModal } from '~/components/ConfirmModal';
import { useToast } from '~/components/ToastProvider';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Competency Assessment · IMPACT Admin' }];

/**
 * Resolve the admin reviewer email for a competency submission.
 *
 * Per the SP7 Phase F audit, the prototype's competency detail surfaces a
 * "Reviewed By" cell on the meta-strip. We look this up via the Supabase
 * admin client because the auth.users table is not exposed through
 * Drizzle and the JWT only carries the *current* admin's claims.
 *
 * Returns a short "K. Meyer"-style display string when the auth.users row
 * has a usable email, otherwise "—". Failures are swallowed so a missing
 * user record never breaks the page render.
 */
async function resolveReviewerLabel(submittedBy: string | null): Promise<string> {
  if (!submittedBy) return '—';
  try {
    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase.auth.admin.getUserById(submittedBy);
    if (error || !user?.user?.email) return '—';
    const email = user.user.email;
    const local = email.split('@')[0] ?? email;
    return local;
  } catch {
    return '—';
  }
}

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
  const reviewedBy = await resolveReviewerLabel(submission.submittedBy ?? null);

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
      reviewedBy,
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
  const {
    submission,
    intern,
    cohort,
    employer,
    role,
    phases,
    questions,
    sectionBoundaries,
    reviewedBy,
  } = useLoaderData<typeof loader>();
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

  // Phase-out: prototype shows a `.pill--pass` chip in the page-head row.
  // The real pass rule is pending program-staff input — for now any saved
  // submission renders the "Pass" pill. P2 follow-up: compute from rubric
  // thresholds when defined.
  const resultPill = <span className="pill pill--pass">Pass</span>;

  const mm = (submittedAt.getMonth() + 1).toString().padStart(2, '0');
  const dd = submittedAt.getDate().toString().padStart(2, '0');
  const dateString = `${mm}.${dd}.${submittedAt.getFullYear()}`;

  // 8-cell meta-strip per prototype: First Initial · Last · Employer ·
  // Cohort · Role · Phase · Date · Reviewed By.
  const metaItems = [
    { label: 'First Initial', value: intern.firstInitial, mono: true },
    { label: 'Last Name', value: intern.lastName },
    { label: 'Employer', value: employer?.name ?? '—' },
    { label: 'Cohort', value: cohort?.name ?? '—' },
    { label: 'Role', value: role?.label ?? '—' },
    { label: 'Phase', value: phaseLabel },
    { label: 'Date', value: dateString, mono: true },
    { label: 'Reviewed By', value: reviewedBy },
  ];

  const detailMeta = `${String(questions.length).padStart(2, '0')} DOMAINS · ${phaseLabel.toUpperCase()}`;

  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link to="/admin/assessments" style={{ color: 'inherit', textDecoration: 'none' }}>
              ADMIN / ASSESSMENTS
            </Link>{' '}
            / DETAIL
          </>
        }
        title={
          <>
            {intern.lastName.toUpperCase()} &mdash;
            <br />
            COMPETENCY.
          </>
        }
        sub={`${phaseLabel} competency check for the ${cohort?.name ?? 'placement'}. Combines professional behavior review with role-specific skills.`}
        actions={resultPill}
      >
        <MetaStrip items={metaItems} />
      </PageHead>
      <section className="assessment-wrap">
        <div className="container">
          <DetailHeader title="Competency Rubric" aside={detailMeta} />

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

          <div className="detail-actions">
            <Link to="/admin/assessments" className="btn btn--outline">
              &larr; Close
            </Link>
            <Link
              to={`/admin/assessments/competency/edit/${submission.id}`}
              className="btn btn--primary"
            >
              Edit Assessment
            </Link>
            <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>
              Delete Record
            </button>
          </div>

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
        label="DELETE RECORD"
        title="Delete this competency record?"
        body="This assessment will be permanently removed. Cohort-level competency statistics will be recomputed."
        confirmText="Delete Permanently"
        variant="danger"
      />
    </>
  );
}
