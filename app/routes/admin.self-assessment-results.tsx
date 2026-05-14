// Admin self-assessment-results list (SP4 Phase D, Task 24).
//
// URL-only page (intentionally NOT in the admin top nav). Lists all
// one-shot intern submissions across the program: personal-goals,
// midpoint-reflection, participant-feedback. Live client-side filter.

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

  return data({ rows }, { headers });
}

function typeLabel(t: string): string {
  if (t === 'personal-goals') return 'Personal Goals';
  if (t === 'midpoint-reflection') return 'Mid-Point Reflection';
  if (t === 'participant-feedback') return 'Participant Feedback';
  return t;
}

export default function SelfAssessmentResults() {
  const { rows } = useLoaderData<typeof loader>();
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.lastName.toLowerCase().includes(q) ||
        r.cohortName.toLowerCase().includes(q) ||
        r.employerName.toLowerCase().includes(q) ||
        typeLabel(r.type).toLowerCase().includes(q),
    );
  }, [rows, filter]);

  return (
    <>
      <PageHead
        breadcrumb="ADMIN / SELF-ASSESSMENT RESULTS"
        title="SELF-ASSESSMENT RESULTS."
        sub="All intern-submitted goals, reflections, and feedback across the program."
      />
      <section>
        <div className="container">
          <div style={{ margin: '16px 0' }}>
            <input
              type="text"
              className="input"
              placeholder="Filter by intern, employer, cohort, or assessment type…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          {filtered.length === 0 ? (
            <article className="identity-card">
              <p>No self-assessment submissions match the current filter.</p>
            </article>
          ) : (
            <table className="assessments">
              <thead>
                <tr>
                  <th>Last Name</th>
                  <th>Employer</th>
                  <th>Cohort</th>
                  <th>Type</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const submittedAt =
                    typeof r.submittedAt === 'string' ? new Date(r.submittedAt) : r.submittedAt;
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link
                          to={`/admin/self-assessment-detail?type=${r.type}&internId=${r.internId}`}
                        >
                          {r.firstInitial}. {r.lastName}
                        </Link>
                      </td>
                      <td>{r.employerName}</td>
                      <td>{r.cohortName}</td>
                      <td>{typeLabel(r.type)}</td>
                      <td>{submittedAt.toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
