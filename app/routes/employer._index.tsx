// Employer dashboard landing page.
//
// SP7 Phase G rebuild: mirrors the admin home pattern with uppercase greeting,
// KPI grid (3 tiles, one cyan-accent per spec §8 decision 7), Quick Links rail
// and Recent Activity feed. Recent activity is scoped to this employer's
// interns and sourced inline (no app/lib/*.server.ts changes per SP7 G
// constraint #6).
//
// Auth is enforced by the parent `employer.tsx` layout loader (which handles
// the redirects for missing session / admin role / missing employerId). The
// `if (!auth?.employerId)` check here is belt-and-suspenders for TypeScript
// narrowing.

import { data, redirect, useLoaderData } from 'react-router';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Route } from './+types/employer._index';
import { getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { assessmentSubmissions, cohorts, interns } from '../../db/schema';
import { kpisForEmployer } from '~/lib/employer-scope.server';
import { PageHead } from '~/components/PageHead';
import { KpiCard } from '~/components/KpiCard';
import { QuickLinks } from '~/components/QuickLinks';
import { RecentActivity, type ActivityEntry } from '~/components/RecentActivity';

export const meta: Route.MetaFunction = () => [{ title: 'Dashboard — IMPACT Employer' }];

const QUICK_LINKS = [
  { to: '/employer/cohorts', label: 'Cohorts' },
  { to: '/employer/interns', label: 'Interns' },
  { to: '/employer/profile', label: 'My Employer' },
] as const;

function activityLabel(type: string, phase: string | null): string {
  if (type === 'competency') return `completed Competency phase ${phase ?? ''}`.trim();
  if (type === 'personal-goals') return 'submitted Personal Goals';
  if (type === 'midpoint-reflection') return 'submitted Midpoint Reflection';
  if (type === 'participant-feedback') return 'submitted Participant Feedback';
  if (type === 'exit-employer-survey') return 'Exit Employer Survey submitted';
  return `submitted ${type}`;
}

function activityTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())}.${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    // Defense-in-depth — parent layout already guards this.
    throw redirect('/login', { headers });
  }

  const kpis = await kpisForEmployer(auth.employerId);

  // Recent activity scoped to this employer's interns. Pulled inline here
  // because adding a helper to app/lib/employer-scope.server.ts is out of
  // scope for the SP7 G visual rebuild (no server-module changes).
  const activity = await db
    .select({
      id: assessmentSubmissions.id,
      type: assessmentSubmissions.type,
      phase: assessmentSubmissions.phase,
      submittedAt: assessmentSubmissions.submittedAt,
      internLastName: interns.lastName,
      cohortName: cohorts.name,
    })
    .from(assessmentSubmissions)
    .innerJoin(interns, eq(interns.id, assessmentSubmissions.internId))
    .innerJoin(cohorts, eq(cohorts.id, interns.cohortId))
    .where(
      and(
        isNull(assessmentSubmissions.deletedAt),
        isNull(interns.deletedAt),
        eq(cohorts.employerId, auth.employerId),
      ),
    )
    .orderBy(desc(assessmentSubmissions.submittedAt))
    .limit(5);

  return data({ kpis, activity }, { headers });
}

export default function EmployerDashboard() {
  const { kpis, activity } = useLoaderData<typeof loader>();
  const pad2 = (n: number) => String(n).padStart(2, '0');

  const entries: ActivityEntry[] = activity.map((a) => ({
    actor: a.internLastName,
    body: (
      <>
        {activityLabel(a.type, a.phase)} &mdash; {a.cohortName}
      </>
    ),
    time: activityTime(a.submittedAt as Date | string),
  }));

  return (
    <>
      <PageHead
        breadcrumb="EMPLOYER / HOME / 2026"
        title={
          <>
            YOUR PROGRAM
            <br />
            AT A GLANCE.
          </>
        }
        sub="Cohorts and interns scoped to your employer. Submit competency assessments and Exit Employer Surveys from the intern record."
      />

      {/* KPI grid — 3 tiles. Cyan accent on Active Interns per spec §8.7. */}
      <section>
        <div className="container">
          <div className="kpi-grid">
            <KpiCard
              label="Active Cohorts"
              value={pad2(kpis.activeCohorts)}
              delta="YOUR EMPLOYER SCOPE"
            />
            <KpiCard
              label="Active Interns"
              value={pad2(kpis.activeInterns)}
              delta={kpis.activeCohorts > 0 ? `ACROSS ${kpis.activeCohorts} COHORTS` : 'NO COHORTS'}
              variant="cyan"
            />
            <KpiCard
              label="Assessments Needed"
              value={pad2(kpis.assessmentsNeeded)}
              delta="WITHOUT A COMPETENCY"
            />
          </div>
        </div>
      </section>

      {/* Quick Links — navy pill rail. */}
      <section>
        <div className="container">
          <div className="detail-header">
            <h2 className="detail-header__title">Quick Links</h2>
            <span className="micro-label">JUMP TO SECTION</span>
          </div>
          <QuickLinks items={QUICK_LINKS} />
        </div>
      </section>

      {/* Recent Activity — last 5 submissions scoped to this employer. */}
      <section>
        <div className="container">
          <div className="detail-header">
            <h2 className="detail-header__title">Recent Activity</h2>
            <span className="micro-label">LAST 5 SUBMISSIONS</span>
          </div>
          {entries.length === 0 ? (
            <div className="activity-list">
              <div className="activity-row">
                <span style={{ color: 'var(--muted)' }}>No recent activity yet.</span>
              </div>
            </div>
          ) : (
            <RecentActivity entries={entries} />
          )}
        </div>
      </section>
    </>
  );
}
