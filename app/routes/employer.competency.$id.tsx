// Employer Competency detail (read-only) route (SP5 Phase H, Task 27b).
//
// Mirrors admin.assessments.competency.$id.tsx but with employer-scope guards
// and no delete action — employers may not delete submissions.

import { useEffect } from 'react';
import { and, eq, isNull } from 'drizzle-orm';
import { data, Link, redirect, useLoaderData, useSearchParams } from 'react-router';
import type { Route } from './+types/employer.competency.$id';
import { getAuthContext } from '~/lib/auth.server';
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
import type { SerializedAnswers } from '~/lib/question-types';
import { CompetencyAssessmentForm } from '~/components/forms/CompetencyAssessmentForm';
import { PageHead } from '~/components/PageHead';
import { useToast } from '~/components/ToastProvider';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [
  { title: 'Competency Assessment · IMPACT Employer' },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }

  const id = params.id;
  if (!id) throw new Response('Not found', { status: 404, headers });

  const rows = await db
    .select()
    .from(assessmentSubmissions)
    .where(and(eq(assessmentSubmissions.id, id), isNull(assessmentSubmissions.deletedAt)))
    .limit(1);
  const submission = rows[0];
  if (!submission || submission.type !== 'competency') {
    throw new Response('Not found', { status: 404, headers });
  }

  const inScope = await internInEmployerScope(submission.internId, auth.employerId);
  if (!inScope) throw new Response('Not found', { status: 404, headers });

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

export default function EmployerCompetencyDetail() {
  const { submission, intern, cohort, employer, role, phases, questions, sectionBoundaries } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

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
            <Link to="/employer/interns" style={{ color: 'inherit', textDecoration: 'none' }}>
              EMPLOYER / INTERNS
            </Link>{' '}
            / COMPETENCY
          </>
        }
        title={`COMPETENCY — ${intern.lastName.toUpperCase()}.`}
        sub={`Phase ${phaseLabel} · submitted ${submittedAt.toLocaleDateString()}.`}
        actions={
          <Link to={`/employer/competency/edit?id=${submission.id}`} className="btn btn--outline">
            Edit
          </Link>
        }
      />
      <section>
        <div className="container">
          <CompetencyAssessmentForm
            internId={intern.id}
            phases={[]}
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
        </div>
      </section>
    </>
  );
}
