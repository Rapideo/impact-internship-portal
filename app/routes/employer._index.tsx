// Employer dashboard landing page.
//
// Auth is enforced by the parent `employer.tsx` layout loader (which handles
// the redirects for missing session / admin role / missing employerId). The
// `if (!auth?.employerId)` check here is belt-and-suspenders for TypeScript
// narrowing — by the time this loader runs it should be unreachable.

import { data, Link, redirect, useLoaderData } from 'react-router';
import type { Route } from './+types/employer._index';
import { getAuthContext } from '~/lib/auth.server';
import { cohortsForEmployer, kpisForEmployer } from '~/lib/employer-scope.server';
import { EmployerDashboardKpis } from '~/components/employer/EmployerDashboardKpis';
import { PageHead } from '~/components/PageHead';

export const meta: Route.MetaFunction = () => [{ title: 'Dashboard - IMPACT Employer' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    // Defense-in-depth — parent layout already guards this.
    throw redirect('/login', { headers });
  }

  const [kpis, cohorts] = await Promise.all([
    kpisForEmployer(auth.employerId),
    cohortsForEmployer(auth.employerId),
  ]);

  return data({ kpis, cohorts }, { headers });
}

export default function EmployerDashboard() {
  const { kpis, cohorts } = useLoaderData<typeof loader>();
  return (
    <>
      <PageHead
        breadcrumb="EMPLOYER / OVERVIEW / 2026"
        title="Your program at a glance."
        sub="Cohorts and interns scoped to your employer. Submit competency assessments and Exit Employer Surveys from the Assessments tab."
      />

      <section>
        <div className="container">
          <EmployerDashboardKpis kpis={kpis} />
        </div>
      </section>

      <section>
        <div className="container">
          <article className="identity-card">
            <header className="identity-card__head">
              <h2 className="identity-card__title">Your cohorts</h2>
              <Link to="/employer/cohorts" className="identity-card__link">
                View all &rarr;
              </Link>
            </header>
            {cohorts.length === 0 ? (
              <p style={{ color: 'var(--muted)', margin: 0 }}>
                No active cohorts yet. Reach out to your program lead.
              </p>
            ) : (
              <ul className="employer-cohort-list">
                {cohorts.map((c) => (
                  <li key={c.id} className="employer-cohort-list__row">
                    <Link to={`/employer/cohorts/${c.id}`} className="employer-cohort-list__name">
                      {c.name}
                    </Link>
                    <span className="employer-cohort-list__meta">
                      {c.startDate ?? '—'} &rarr; {c.endDate ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </section>
    </>
  );
}
