// Employer interns list. Shows every non-deleted intern across the signed-in
// employer's cohorts. Click through to a focused employer intern record.
//
// SP7 Phase G rebuild: TableFilter wrapper with search + cohort filter +
// outcome filter, uppercase title, NameInitial chip in the Intern cell,
// 90/180-day outcome pill column, row-click navigation. Mirrors the admin
// interns list pattern (app/routes/admin.interns._index.tsx).
//
// Outcome data is joined inline against `internEmploymentOutcomes` since
// `internsForEmployer` doesn't surface those columns (SP7 G constraint #6
// disallows changes to app/lib/*.server.ts).
//
// Auth is enforced by the parent `employer.tsx` layout; the `!auth?.employerId`
// guard here is belt-and-suspenders for TypeScript narrowing.

import { useMemo, useState } from 'react';
import { data, Link, redirect, useLoaderData, useNavigate } from 'react-router';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Route } from './+types/employer.interns._index';
import { getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { cohorts, internEmploymentOutcomes, interns, roles } from '../../db/schema';
import { PageHead } from '~/components/PageHead';
import { TableFilter } from '~/components/TableFilter';
import { NameInitial } from '~/components/tables/NameInitial';
import { EmptyRow } from '~/components/EmptyRow';
import { formatDate, initials } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Interns — IMPACT Employer' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }

  // Single composed query: intern + cohort name + role label + 90/180-day
  // outcomes, all scoped to this employer.
  const rows = await db
    .select({
      id: interns.id,
      firstInitial: interns.firstInitial,
      lastName: interns.lastName,
      startDate: interns.startDate,
      endDate: interns.endDate,
      cohortId: cohorts.id,
      cohortName: cohorts.name,
      roleLabel: roles.label,
      employed90: internEmploymentOutcomes.employed90Day,
      employed180: internEmploymentOutcomes.employed180Day,
    })
    .from(interns)
    .innerJoin(cohorts, eq(cohorts.id, interns.cohortId))
    .leftJoin(roles, eq(roles.id, interns.roleId))
    .leftJoin(internEmploymentOutcomes, eq(internEmploymentOutcomes.internId, interns.id))
    .where(and(isNull(interns.deletedAt), eq(cohorts.employerId, auth.employerId)))
    .orderBy(sql`${interns.startDate} desc nulls last`);

  const cohortOptions = Array.from(new Set(rows.map((r) => r.cohortName))).sort();
  return data({ interns: rows, cohortOptions }, { headers });
}

function outcomePill(employed90: boolean | null, employed180: boolean | null) {
  if (employed180) return <span className="pill pill--employed-180">Employed + Still at 180d</span>;
  if (employed90) return <span className="pill pill--employed-90">Employed at 90d</span>;
  return <span className="pill pill--tracked">Not yet tracked</span>;
}

export default function EmployerInternsIndex() {
  const { interns, cohortOptions } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [cohort, setCohort] = useState('all');
  const [outcome, setOutcome] = useState('all');

  const filtered = useMemo(() => {
    return interns.filter((i) => {
      const haystack = `${i.firstInitial}. ${i.lastName} ${i.cohortName ?? ''}`.toLowerCase();
      if (search && !haystack.includes(search.toLowerCase())) return false;
      if (cohort !== 'all' && i.cohortName !== cohort) return false;
      if (outcome === 'employed-90' && !i.employed90) return false;
      if (outcome === 'employed-180' && !i.employed180) return false;
      if (outcome === 'not-tracked' && (i.employed90 || i.employed180)) return false;
      return true;
    });
  }, [interns, search, cohort, outcome]);

  return (
    <>
      <PageHead
        breadcrumb="EMPLOYER / INTERNS / 2026"
        title="YOUR INTERNS."
        sub="Across all your active cohorts. Open a record to view assessments and outcomes."
      />
      <section>
        <div className="container">
          <TableFilter
            countLabel="Active interns"
            count={filtered.length}
            rightAside="Sort: Start Date ↓"
            inputs={
              <>
                <input
                  className="input input--search"
                  type="search"
                  placeholder="Search by last name or cohort..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search interns"
                />
                <div className="filter-group">
                  <label className="filter-group__label" htmlFor="cohort-filter">
                    Cohort
                  </label>
                  <select
                    className="select"
                    id="cohort-filter"
                    value={cohort}
                    onChange={(e) => setCohort(e.target.value)}
                  >
                    <option value="all">All cohorts</option>
                    {cohortOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-group__label" htmlFor="outcome-filter">
                    Outcome
                  </label>
                  <select
                    className="select"
                    id="outcome-filter"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="employed-90">Employed at 90d</option>
                    <option value="employed-180">Employed + Still at 180d</option>
                    <option value="not-tracked">Not yet tracked</option>
                  </select>
                </div>
              </>
            }
          >
            <table className="assessments">
              <thead>
                <tr>
                  <th style={{ width: '26%' }}>Intern</th>
                  <th style={{ width: '20%' }}>Cohort</th>
                  <th style={{ width: '14%' }}>Start</th>
                  <th style={{ width: '14%' }}>Role</th>
                  <th style={{ width: '18%' }}>Outcome</th>
                  <th style={{ width: '8%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <EmptyRow colSpan={6} message="No records match the current filters." />
                ) : (
                  filtered.map((i) => (
                    <tr
                      key={i.id}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('a, button')) return;
                        navigate(`/employer/interns/${i.id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/employer/interns/${i.id}`);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td>
                        <NameInitial
                          initials={initials(i.lastName)}
                          name={`${i.firstInitial}. ${i.lastName}`}
                        />
                      </td>
                      <td className="col-cohort">{i.cohortName ?? '—'}</td>
                      <td className="col-date">{formatDate(i.startDate)}</td>
                      <td>{i.roleLabel ?? '—'}</td>
                      <td>{outcomePill(i.employed90, i.employed180)}</td>
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
          </TableFilter>
        </div>
      </section>
    </>
  );
}
