// Admin self-assessment-results list (SP4 Phase D, Task 24).
//
// URL-only page (intentionally NOT in the admin top nav). Lists all
// one-shot intern submissions across the program: personal-goals,
// midpoint-reflection, participant-feedback. Live client-side filter.
//
// SP7 Phase F rewrite — markup now matches `self-assessment-results.html`:
// two-line `SELF-ASSESSMENT<br/>RESULTS.` title, `.filters` row with
// Cohort dropdown + Export CSV placeholder, `<TableFilter>` `.table-meta`
// strip with zero-padded count, `.col-name` + `.name-initial` avatar
// chip on the first cell, `<EmptyRow>` empty state (not identity-card).

import { useMemo, useState } from 'react';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { data, Link, useLoaderData } from 'react-router';
import type { Route } from './+types/admin.self-assessment-results';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import {
  assessmentSubmissions,
  interns,
  cohorts as cohortsTable,
  employers as employersTable,
} from '../../db/schema';
import { PageHead } from '~/components/PageHead';
import { TableFilter } from '~/components/TableFilter';
import { EmptyRow } from '~/components/EmptyRow';
import { formatDate, initials } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Self-Assessment Results · IMPACT Admin' }];

const SELF_ASSESSMENT_TYPES = [
  'personal-goals',
  'midpoint-reflection',
  'participant-feedback',
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);

  const rows = await db
    .select({
      id: assessmentSubmissions.id,
      type: assessmentSubmissions.type,
      submittedAt: assessmentSubmissions.submittedAt,
      internId: assessmentSubmissions.internId,
      firstInitial: interns.firstInitial,
      lastName: interns.lastName,
      cohortName: cohortsTable.name,
      employerName: employersTable.name,
    })
    .from(assessmentSubmissions)
    .innerJoin(interns, eq(interns.id, assessmentSubmissions.internId))
    .innerJoin(cohortsTable, eq(cohortsTable.id, interns.cohortId))
    .innerJoin(employersTable, eq(employersTable.id, cohortsTable.employerId))
    .where(
      and(
        inArray(assessmentSubmissions.type, [...SELF_ASSESSMENT_TYPES]),
        isNull(assessmentSubmissions.deletedAt),
      ),
    )
    .orderBy(desc(assessmentSubmissions.submittedAt));

  const cohortOptions = Array.from(new Set(rows.map((r) => r.cohortName))).sort();
  return data({ rows, cohortOptions }, { headers });
}

function typeLabel(t: string): string {
  if (t === 'personal-goals') return 'Personal Goals';
  if (t === 'midpoint-reflection') return 'Mid-Point Reflection';
  if (t === 'participant-feedback') return 'Participant Feedback';
  return t;
}

export default function SelfAssessmentResults() {
  const { rows, cohortOptions } = useLoaderData<typeof loader>();
  const [search, setSearch] = useState('');
  const [cohort, setCohort] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (cohort !== 'all' && r.cohortName !== cohort) return false;
      if (!q) return true;
      return (
        r.lastName.toLowerCase().includes(q) ||
        r.cohortName.toLowerCase().includes(q) ||
        r.employerName.toLowerCase().includes(q) ||
        typeLabel(r.type).toLowerCase().includes(q)
      );
    });
  }, [rows, search, cohort]);

  return (
    <>
      <PageHead
        breadcrumb="ADMIN / SELF-ASSESSMENT RESULTS / 2026"
        title={
          <>
            SELF-ASSESSMENT
            <br />
            RESULTS.
          </>
        }
        sub="One-time program reflections submitted by interns. Submissions are locked after submit; admins can review or remove a record but cannot edit."
      />
      <section>
        <div className="container">
          <TableFilter
            countLabel="Submissions shown"
            count={filtered.length}
            rightAside="Sort: Date ↓"
            inputs={
              <>
                <input
                  className="input input--search"
                  type="search"
                  placeholder="Search by last name or cohort..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search submissions"
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
                <a
                  href="#"
                  className="btn btn--outline btn--sm"
                  onClick={(e) => e.preventDefault()}
                  aria-label="Export CSV (coming soon)"
                  title="Export CSV — coming in SP6 Phase C"
                >
                  Export CSV
                </a>
              </>
            }
          >
            <table className="assessments">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Intern</th>
                  <th style={{ width: '22%' }}>Employer</th>
                  <th style={{ width: '20%' }}>Cohort</th>
                  <th style={{ width: '16%' }}>Type</th>
                  <th style={{ width: '14%' }}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <EmptyRow colSpan={5} message="No submissions match the current filters." />
                ) : (
                  filtered.map((r) => {
                    const submittedAt =
                      typeof r.submittedAt === 'string' ? new Date(r.submittedAt) : r.submittedAt;
                    const iso = submittedAt.toISOString().slice(0, 10);
                    return (
                      <tr key={r.id}>
                        <td>
                          <Link
                            to={`/admin/self-assessment-detail?type=${r.type}&internId=${r.internId}`}
                            style={{ color: 'inherit', textDecoration: 'none' }}
                          >
                            <div className="col-name">
                              <span className="name-initial">{initials(r.lastName)}</span>
                              {r.firstInitial}. {r.lastName}
                            </div>
                          </Link>
                        </td>
                        <td className="col-cohort">{r.employerName}</td>
                        <td className="col-cohort">{r.cohortName}</td>
                        <td>{typeLabel(r.type)}</td>
                        <td className="col-date">{formatDate(iso)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </TableFilter>
        </div>
      </section>
    </>
  );
}
