// Employer intern record — focused view scoped to what employers need.
//
// SP7 Phase G rebuild: switched the body from inline `.identity-card` blocks
// to the numbered `<RubricPanel>` panels used by the admin intern record
// (numbers 03/04/05/06 to mirror the admin numbering, since 01/02 — Personal
// Information + Internship Details — are surfaced via the MetaStrip in the
// PageHead per the locked-identity pattern). This keeps record shape
// consistent between admin and employer surfaces.
//
// Also implements the hub-redirect-with-toast pattern for the exit-survey
// flow: this route accepts `?submitted=exit-survey` from the upstream
// `employer.exit-survey.tsx` post-submit redirect and toasts on arrival.
//
// Auth: the parent employer.tsx layout guards role + employerId. The
// `internInEmployerScope` check below is the per-record authorization — an
// employer who knows another tenant's internId still gets a 404.

import { useEffect } from 'react';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { data, Link, redirect, useLoaderData, useSearchParams } from 'react-router';
import type { Route } from './+types/employer.interns.$internId';
import { getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { internInEmployerScope } from '~/lib/employer-scope.server';
import {
  assessmentSubmissions,
  barriers,
  cohorts,
  internEmploymentOutcomes,
  internEntryAssessment,
  internEntryBarriers,
  interns,
  roles,
} from '../../db/schema';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { RubricPanel } from '~/components/RubricPanel';
import { EmptyRow } from '~/components/EmptyRow';
import { useToast } from '~/components/ToastProvider';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Intern — IMPACT Employer' }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }

  const internId = params.internId;
  if (!internId) throw new Response('Not found', { status: 404 });

  const inScope = await internInEmployerScope(internId, auth.employerId);
  if (!inScope) throw new Response('Not found', { status: 404 });

  const internRows = await db
    .select()
    .from(interns)
    .where(and(eq(interns.id, internId), isNull(interns.deletedAt)))
    .limit(1);
  const [intern] = internRows;
  if (!intern) throw new Response('Not found', { status: 404 });

  const cohortRows = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, intern.cohortId))
    .limit(1);
  const [cohort] = cohortRows;

  const roleRows = intern.roleId
    ? await db.select().from(roles).where(eq(roles.id, intern.roleId)).limit(1)
    : [];
  const [role] = roleRows;

  const entryRows = await db
    .select()
    .from(internEntryAssessment)
    .where(eq(internEntryAssessment.internId, internId))
    .limit(1);
  const [entry] = entryRows;

  const entryBarrierRows = await db
    .select({ id: barriers.id, label: barriers.label })
    .from(internEntryBarriers)
    .innerJoin(barriers, eq(barriers.id, internEntryBarriers.barrierId))
    .where(eq(internEntryBarriers.internId, internId));

  const outcomesRows = await db
    .select()
    .from(internEmploymentOutcomes)
    .where(eq(internEmploymentOutcomes.internId, internId))
    .limit(1);
  const [outcomes] = outcomesRows;

  const submissionRows = await db
    .select({
      id: assessmentSubmissions.id,
      type: assessmentSubmissions.type,
      phase: assessmentSubmissions.phase,
      submittedAt: assessmentSubmissions.submittedAt,
    })
    .from(assessmentSubmissions)
    .where(
      and(eq(assessmentSubmissions.internId, internId), isNull(assessmentSubmissions.deletedAt)),
    )
    .orderBy(desc(assessmentSubmissions.submittedAt));

  return data(
    {
      intern,
      cohort: cohort ?? null,
      role: role ?? null,
      entry: entry ?? null,
      entryBarriers: entryBarrierRows,
      outcomes: outcomes ?? null,
      submissions: submissionRows,
    },
    { headers },
  );
}

const ASSESSMENT_LABELS: Record<string, string> = {
  competency: 'Competency',
  'exit-employer-survey': 'Exit Employer Survey',
  'personal-goals': 'Personal Goals',
  'midpoint-reflection': 'Mid-Point Reflection',
  'participant-feedback': 'Participant Feedback',
};

function viewHrefFor(s: { id: string; type: string; phase: string | null }): string | null {
  if (s.type === 'competency') return `/employer/competency/${s.id}`;
  if (s.type === 'exit-employer-survey') return `/employer/exit-survey?id=${s.id}`;
  // Intern self-submit types: employer-side viewer is admin-only.
  return null;
}

export default function EmployerInternRecord() {
  const { intern, cohort, role, entry, entryBarriers, outcomes, submissions } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  // Hub-redirect-with-toast: this route is the post-submit landing for the
  // employer exit-survey + competency flows. Strip the query param after the
  // toast fires so a refresh doesn't re-toast.
  useEffect(() => {
    const submitted = searchParams.get('submitted');
    if (submitted === 'exit-survey') {
      toast.show({ kind: 'success', label: 'SAVED', message: 'Exit Employer Survey saved.' });
    } else if (submitted === 'competency') {
      toast.show({ kind: 'success', label: 'SAVED', message: 'Competency assessment saved.' });
    } else {
      return;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('submitted');
        return next;
      },
      { replace: true },
    );
    // One-shot on mount; toast + setSearchParams are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link to="/employer/interns" style={{ color: 'inherit', textDecoration: 'none' }}>
              EMPLOYER / INTERNS
            </Link>
            {' / '}
            {intern.lastName.toUpperCase()}
          </>
        }
        title={`${intern.firstInitial}. ${intern.lastName}`}
        sub="Read-only intern record. Submit competency assessments and Exit Employer Surveys from here."
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to={`/employer/exit-survey?internId=${intern.id}`} className="btn btn--outline">
              Submit Exit Survey
            </Link>
            <Link
              to={`/employer/competency/new?internId=${intern.id}`}
              className="btn btn--primary"
            >
              Submit Competency
            </Link>
          </div>
        }
      >
        <MetaStrip
          items={[
            { label: 'First Initial', value: intern.firstInitial, mono: true },
            { label: 'Last Name', value: intern.lastName },
            { label: 'Cohort', value: cohort?.name ?? '—' },
            { label: 'Role', value: role?.label ?? '—' },
            { label: 'Start', value: formatDate(intern.startDate), mono: true },
            { label: 'End', value: formatDate(intern.endDate), mono: true },
          ]}
        />
      </PageHead>

      <section className="assessment-wrap">
        <div className="container">
          <div className="rubric">
            <RubricPanel
              num="03"
              title="Entry Assessment"
              meta="Barriers identified at intake. Notes capture additional context."
            >
              <div style={{ padding: '22px 28px' }}>
                <span className="rubric-notes__label">Barriers identified at intake</span>
                {entryBarriers.length === 0 ? (
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>None recorded.</p>
                ) : (
                  <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
                    {entryBarriers.map((b) => (
                      <li key={b.id}>{b.label}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div
                className="rubric-notes"
                style={{ padding: '22px 28px', borderTop: '1px solid var(--rule)' }}
              >
                <span className="rubric-notes__label">Notes</span>
                <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{entry?.notes ?? '—'}</p>
              </div>
            </RubricPanel>

            <RubricPanel
              num="04"
              title="Evaluations"
              meta="Competency assessments and exit surveys for this intern."
            >
              <div style={{ padding: '22px 28px' }}>
                <table className="assessments">
                  <thead>
                    <tr>
                      <th style={{ width: '32%' }}>Type</th>
                      <th style={{ width: '20%' }}>Phase</th>
                      <th style={{ width: '28%' }}>Submitted</th>
                      <th style={{ width: '20%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.length === 0 ? (
                      <EmptyRow colSpan={4} message="No submissions yet." />
                    ) : (
                      submissions.map((s) => {
                        const href = viewHrefFor(s);
                        const submitted =
                          s.submittedAt instanceof Date
                            ? s.submittedAt.toLocaleDateString()
                            : new Date(s.submittedAt as unknown as string).toLocaleDateString();
                        return (
                          <tr key={s.id}>
                            <td>{ASSESSMENT_LABELS[s.type] ?? s.type}</td>
                            <td>{s.phase ?? '—'}</td>
                            <td className="col-date">{submitted}</td>
                            <td>
                              <div className="col-actions">
                                {href ? (
                                  <Link to={href} className="action-link">
                                    View
                                  </Link>
                                ) : (
                                  <span
                                    style={{ color: 'var(--muted)', fontSize: '13px' }}
                                    title="Admin-only view"
                                  >
                                    —
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </RubricPanel>

            <RubricPanel
              num="05"
              title="Employment Outcomes"
              meta="Post-placement outcomes confirmed at 90 and 180 days."
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px',
                  padding: '22px 28px',
                }}
              >
                <div>
                  <span className="rubric-notes__label">90-Day</span>
                  <p style={{ margin: '6px 0 4px', fontWeight: 600 }}>
                    {outcomes?.employed90Day ? 'Employed' : 'Not yet tracked'}
                  </p>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--muted)' }}>
                    {outcomes?.employed90Notes ?? '—'}
                  </p>
                </div>
                <div>
                  <span className="rubric-notes__label">180-Day</span>
                  <p style={{ margin: '6px 0 4px', fontWeight: 600 }}>
                    {outcomes?.employed180Day ? 'Still employed' : 'Not yet tracked'}
                  </p>
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--muted)' }}>
                    {outcomes?.employed180Notes ?? '—'}
                  </p>
                </div>
              </div>
            </RubricPanel>
          </div>
        </div>
      </section>
    </>
  );
}
