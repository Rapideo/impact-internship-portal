// Employer cohorts list. Read-only listing of every cohort that belongs to the
// signed-in employer. Cohort configuration (phases, role, dates) lives with
// the program admin — this view is for awareness + drill-down only.
//
// SP7 Phase G rebuild: TableFilter wrapper with search input + zero-padded
// count strip, uppercase display title, row-click navigation to mirror the
// admin tables pattern. Markup matches the prototype's `.assessments` table.
//
// Auth is enforced by the parent `employer.tsx` layout; the `!auth?.employerId`
// guard here is belt-and-suspenders for TypeScript narrowing.

import { useMemo, useState } from 'react';
import { data, Link, redirect, useLoaderData, useNavigate } from 'react-router';
import type { Route } from './+types/employer.cohorts._index';
import { getAuthContext } from '~/lib/auth.server';
import { cohortsForEmployer } from '~/lib/employer-scope.server';
import { PageHead } from '~/components/PageHead';
import { TableFilter } from '~/components/TableFilter';
import { EmptyRow } from '~/components/EmptyRow';
import { formatDate } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Cohorts — IMPACT Employer' }];

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
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cohorts;
    return cohorts.filter((c) => c.name.toLowerCase().includes(q));
  }, [cohorts, search]);

  return (
    <>
      <PageHead
        breadcrumb="EMPLOYER / COHORTS / 2026"
        title="YOUR COHORTS."
        sub="Read-only. Cohort configuration lives with your program admin."
      />
      <section>
        <div className="container">
          <TableFilter
            countLabel="Cohorts"
            count={filtered.length}
            rightAside="Sort: Start Date ↓"
            inputs={
              <input
                className="input input--search"
                type="search"
                placeholder="Search cohorts by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search cohorts"
              />
            }
          >
            <table className="assessments">
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Name</th>
                  <th style={{ width: '18%' }}>Start</th>
                  <th style={{ width: '18%' }}>End</th>
                  <th style={{ width: '14%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <EmptyRow colSpan={4} message="No cohorts match the current filters." />
                ) : (
                  filtered.map((c) => (
                    <tr
                      key={c.id}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('a, button')) return;
                        navigate(`/employer/cohorts/${c.id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/employer/cohorts/${c.id}`);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td>{c.name}</td>
                      <td className="col-date">{formatDate(c.startDate)}</td>
                      <td className="col-date">{formatDate(c.endDate)}</td>
                      <td>
                        <div className="col-actions">
                          <Link to={`/employer/cohorts/${c.id}`} className="action-link">
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </TableFilter>
        </div>
      </section>
    </>
  );
}
