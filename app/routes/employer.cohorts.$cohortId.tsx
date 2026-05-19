// Employer cohort detail. Read-only view of a single cohort owned by the
// signed-in employer: applicable phases + enrolled (non-deleted) interns.
//
// SP7 Phase G rebuild: uppercase title, MetaStrip in PageHead for the cohort
// summary (Role / Start / End / Members), Applicable Phases rendered as
// `.col-phase` chips, enrolled-interns table uses NameInitial chip.
//
// Cross-employer protection: the cohort query filters by employerId, so an
// employer who knows another tenant's cohortId still hits a 404 here. The
// parent `employer.tsx` layout guards auth; the `!auth?.employerId` line is
// belt-and-suspenders for TypeScript narrowing.

import { data, Link, redirect, useLoaderData } from 'react-router';
import { and, eq, isNull } from 'drizzle-orm';
import type { Route } from './+types/employer.cohorts.$cohortId';
import { getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { cohortPhases, cohorts, interns, phases, roles } from '../../db/schema';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { NameInitial } from '~/components/tables/NameInitial';
import { EmptyRow } from '~/components/EmptyRow';
import { formatDate, initials } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Cohort — IMPACT Employer' }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }

  const cohortId = params.cohortId;
  if (!cohortId) throw new Response('Not found', { status: 404 });

  const cohortRows = await db
    .select()
    .from(cohorts)
    .where(and(eq(cohorts.id, cohortId), eq(cohorts.employerId, auth.employerId)))
    .limit(1);
  const [cohort] = cohortRows;
  if (!cohort) throw new Response('Not found', { status: 404 });

  const phaseRows = await db
    .select({ id: phases.id, label: phases.label, sortOrder: cohortPhases.sortOrder })
    .from(cohortPhases)
    .innerJoin(phases, eq(phases.id, cohortPhases.phaseId))
    .where(eq(cohortPhases.cohortId, cohortId))
    .orderBy(cohortPhases.sortOrder);

  const internRows = await db
    .select({
      id: interns.id,
      firstInitial: interns.firstInitial,
      lastName: interns.lastName,
      startDate: interns.startDate,
      endDate: interns.endDate,
    })
    .from(interns)
    .where(and(eq(interns.cohortId, cohortId), isNull(interns.deletedAt)));

  const roleRows = cohort.roleId
    ? await db.select().from(roles).where(eq(roles.id, cohort.roleId)).limit(1)
    : [];
  const [role] = roleRows;

  return data({ cohort, role: role ?? null, phases: phaseRows, interns: internRows }, { headers });
}

export default function EmployerCohortDetail() {
  const { cohort, role, phases, interns } = useLoaderData<typeof loader>();

  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link to="/employer/cohorts" style={{ color: 'inherit', textDecoration: 'none' }}>
              EMPLOYER / COHORTS
            </Link>
            {' / '}
            {cohort.name.toUpperCase()}
          </>
        }
        title={`${cohort.name.toUpperCase()}.`}
        sub="Cohort detail. Applicable phases and enrolled interns are scoped to your employer."
      >
        <MetaStrip
          items={[
            { label: 'Role', value: role?.label ?? '—' },
            { label: 'Start', value: formatDate(cohort.startDate), mono: true },
            { label: 'End', value: formatDate(cohort.endDate), mono: true },
            { label: 'Members', value: String(interns.length).padStart(2, '0'), mono: true },
          ]}
        />
      </PageHead>

      <section>
        <div className="container">
          <div className="detail-header">
            <h2 className="detail-header__title">Applicable Phases</h2>
            <span className="micro-label">
              {String(phases.length).padStart(2, '0')} PHASE{phases.length === 1 ? '' : 'S'}
            </span>
          </div>
          {phases.length === 0 ? (
            <p style={{ color: 'var(--muted)', margin: 0 }}>None configured.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {phases.map((p) => (
                <span key={p.id} className="col-phase">
                  {p.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={{ marginTop: '40px' }}>
        <div className="container">
          <div className="detail-header">
            <h2 className="detail-header__title">Enrolled Interns</h2>
            <span className="micro-label">
              {String(interns.length).padStart(2, '0')} INTERN{interns.length === 1 ? '' : 'S'}
            </span>
          </div>
          <table className="assessments">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Intern</th>
                <th style={{ width: '20%' }}>Start</th>
                <th style={{ width: '20%' }}>End</th>
                <th style={{ width: '20%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {interns.length === 0 ? (
                <EmptyRow colSpan={4} message="No interns enrolled." />
              ) : (
                interns.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <NameInitial
                        initials={initials(i.lastName)}
                        name={`${i.firstInitial}. ${i.lastName}`}
                      />
                    </td>
                    <td className="col-date">{formatDate(i.startDate)}</td>
                    <td className="col-date">{formatDate(i.endDate)}</td>
                    <td>
                      <div className="col-actions">
                        <Link to={`/employer/interns/${i.id}`} className="action-link">
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
