// Employer intern record — focused view scoped to what employers need:
//
//   * Identity + assignment header (MetaStrip), read-only.
//   * Entry assessment (notes + entry barriers), read-only.
//   * Employment outcomes (90/180 day), read-only.
//   * Recent assessments — link out to the employer-side viewers for the two
//     submission types employers author (competency + exit-employer-survey);
//     intern-self-submit types are listed for context with no viewer link
//     because the employer-side viewer is out of scope for SP5.
//   * Two action buttons in the page-head: submit a competency assessment,
//     submit an Exit Employer Survey. Both link to employer/* routes that
//     ship in SP5 Phases H/I.
//
// Deviation from plan: the plan imports a shared `<InternRecord>` component
// with capability flag props. SP2 built the admin record inline, so that
// shared component does not exist. Rather than extract it now (scope creep),
// we render an employer-specific composition here using the same primitives
// (PageHead, MetaStrip) that the admin record uses.
//
// Auth: the parent employer.tsx layout guards role + employerId. The
// `internInEmployerScope` check below is the per-record authorization — an
// employer who knows another tenant's internId still gets a 404.

import { and, desc, eq, isNull } from 'drizzle-orm';
import { data, Link, redirect, useLoaderData } from 'react-router';
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
import { EmptyRow } from '~/components/EmptyRow';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Intern - IMPACT Employer' }];

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
  // Intern self-submit types: employer-side viewer isn't part of SP5.
  return null;
}

export default function EmployerInternRecord() {
  const { intern, cohort, role, entry, entryBarriers, outcomes, submissions } =
    useLoaderData<typeof loader>();

  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link to="/employer/interns" style={{ color: 'inherit', textDecoration: 'none' }}>
              EMPLOYER / INTERNS
            </Link>{' '}
            / {intern.lastName.toUpperCase()}
          </>
        }
        title={`${intern.firstInitial}. ${intern.lastName}`}
        sub="Read-only intern record. Submit competency assessments and Exit Employer Surveys from here."
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to={`/employer/competency/new?internId=${intern.id}`}
              className="btn btn--outline"
            >
              Submit Competency
            </Link>
            <Link to={`/employer/exit-survey?internId=${intern.id}`} className="btn btn--primary">
              Submit Exit Survey
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

      <section>
        <div className="container">
          <article className="identity-card">
            <header className="identity-card__head">
              <h2 className="identity-card__title">Entry Assessment</h2>
            </header>
            <div style={{ marginBottom: '14px' }}>
              <span className="identity-card__link" style={{ color: 'var(--muted)' }}>
                Barriers identified at intake
              </span>
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
            <div>
              <span className="identity-card__link" style={{ color: 'var(--muted)' }}>
                Notes
              </span>
              <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{entry?.notes ?? '—'}</p>
            </div>
          </article>
        </div>
      </section>

      <section style={{ marginTop: '24px' }}>
        <div className="container">
          <article className="identity-card">
            <header className="identity-card__head">
              <h2 className="identity-card__title">Employment Outcomes</h2>
            </header>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <span className="identity-card__link" style={{ color: 'var(--muted)' }}>
                  90-Day
                </span>
                <p style={{ margin: '6px 0 4px', fontWeight: 600 }}>
                  {outcomes?.employed90Day ? 'Employed' : 'Not yet tracked'}
                </p>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--muted)' }}>
                  {outcomes?.employed90Notes ?? '—'}
                </p>
              </div>
              <div>
                <span className="identity-card__link" style={{ color: 'var(--muted)' }}>
                  180-Day
                </span>
                <p style={{ margin: '6px 0 4px', fontWeight: 600 }}>
                  {outcomes?.employed180Day ? 'Still employed' : 'Not yet tracked'}
                </p>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--muted)' }}>
                  {outcomes?.employed180Notes ?? '—'}
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section style={{ marginTop: '24px' }}>
        <div className="container">
          <article className="identity-card">
            <header className="identity-card__head">
              <h2 className="identity-card__title">Recent assessments</h2>
              <span className="identity-card__link" style={{ color: 'var(--muted)' }}>
                {submissions.length} total
              </span>
            </header>
            <table className="assessments">
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Type</th>
                  <th style={{ width: '20%' }}>Phase</th>
                  <th style={{ width: '28%' }}>Submitted</th>
                  <th style={{ width: '20%' }}></th>
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
                          {href ? (
                            <Link to={href} className="btn btn--outline btn--sm">
                              View
                            </Link>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '13px' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </article>
        </div>
      </section>
    </>
  );
}
