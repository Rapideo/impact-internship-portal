// Employer cohorts list. Read-only listing of every cohort that belongs to the
// signed-in employer. Cohort configuration (phases, role, dates) lives with
// the program admin — this view is for awareness + drill-down only.
//
// Auth is enforced by the parent `employer.tsx` layout; the `!auth?.employerId`
// guard here is belt-and-suspenders for TypeScript narrowing.

import { data, Link, redirect, useLoaderData } from 'react-router';
import type { Route } from './+types/employer.cohorts._index';
import { getAuthContext } from '~/lib/auth.server';
import { cohortsForEmployer } from '~/lib/employer-scope.server';
import { PageHead } from '~/components/PageHead';
import { EmptyRow } from '~/components/EmptyRow';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Cohorts - IMPACT Employer' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }
  const cohorts = await cohortsForEmployer(auth.employerId);
  return data({ cohorts }, { headers });
}

export default function EmployerCohortsIndex() {
  const { cohorts } = useLoaderData<typeof loader>();
  return (
    <>
      <PageHead
        breadcrumb="EMPLOYER / COHORTS"
        title="Your cohorts."
        sub="Read-only. Cohort configuration lives with your program admin."
      />
      <section>
        <div className="container">
          <table className="assessments">
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Name</th>
                <th style={{ width: '18%' }}>Start</th>
                <th style={{ width: '18%' }}>End</th>
                <th style={{ width: '14%' }}></th>
              </tr>
            </thead>
            <tbody>
              {cohorts.length === 0 ? (
                <EmptyRow colSpan={4} message="No cohorts yet." />
              ) : (
                cohorts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="col-date">{formatDate(c.startDate)}</td>
                    <td className="col-date">{formatDate(c.endDate)}</td>
                    <td>
                      <Link to={`/employer/cohorts/${c.id}`} className="btn btn--outline btn--sm">
                        View
                      </Link>
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
