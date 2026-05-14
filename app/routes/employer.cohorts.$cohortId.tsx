// Employer cohort detail. Read-only view of a single cohort owned by the
// signed-in employer: applicable phases + enrolled (non-deleted) interns.
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
import { EmptyRow } from '~/components/EmptyRow';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Cohort - IMPACT Employer' }];

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
    .select({ label: phases.label, sortOrder: cohortPhases.sortOrder })
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

  const subParts: string[] = [];
  subParts.push(role ? `Role: ${role.label}.` : 'No role assigned.');
  subParts.push(`${formatDate(cohort.startDate)} → ${formatDate(cohort.endDate)}`);

  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link to="/employer/cohorts" style={{ color: 'inherit', textDecoration: 'none' }}>
              EMPLOYER / COHORTS
            </Link>{' '}
            / {cohort.name.toUpperCase()}
          </>
        }
        title={cohort.name}
        sub={subParts.join(' ')}
      />

      <section>
        <div className="container">
          <article className="identity-card">
            <header className="identity-card__head">
              <h2 className="identity-card__title">Applicable phases</h2>
            </header>
            {phases.length === 0 ? (
              <p style={{ color: 'var(--muted)', margin: 0 }}>None configured.</p>
            ) : (
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                {phases.map((p) => (
                  <li key={p.label}>{p.label}</li>
                ))}
              </ol>
            )}
          </article>
        </div>
      </section>

      <section style={{ marginTop: '24px' }}>
        <div className="container">
          <article className="identity-card">
            <header className="identity-card__head">
              <h2 className="identity-card__title">Enrolled interns</h2>
              <span className="identity-card__link" style={{ color: 'var(--muted)' }}>
                {interns.length} total
              </span>
            </header>
            <table className="assessments">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Intern</th>
                  <th style={{ width: '20%' }}>Start</th>
                  <th style={{ width: '20%' }}>End</th>
                  <th style={{ width: '20%' }}></th>
                </tr>
              </thead>
              <tbody>
                {interns.length === 0 ? (
                  <EmptyRow colSpan={4} message="No interns enrolled." />
                ) : (
                  interns.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.firstInitial}. {i.lastName}
                      </td>
                      <td className="col-date">{formatDate(i.startDate)}</td>
                      <td className="col-date">{formatDate(i.endDate)}</td>
                      <td>
                        <Link to={`/employer/interns/${i.id}`} className="btn btn--outline btn--sm">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </article>
        </div>
      </section>
    </>
  );
}
