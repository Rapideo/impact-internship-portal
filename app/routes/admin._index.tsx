import { data, Link, useLoaderData } from 'react-router';
import type { Route } from './+types/admin._index';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { getAdminHomeKpis, listRecentActivity } from '~/lib/admin-queries.server';
import { PageHead } from '~/components/PageHead';

export const meta: Route.MetaFunction = () => [{ title: 'Admin Home — IMPACT' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const [kpis, activity] = await Promise.all([getAdminHomeKpis(db), listRecentActivity(db, 5)]);
  // Use data() rather than Response.json() so the loader return is a typed
  // object useLoaderData<typeof loader>() can infer, while still forwarding
  // refreshed Supabase cookies via headers.
  return data({ kpis, activity }, { headers });
}

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

export default function AdminHome() {
  const { kpis, activity } = useLoaderData<typeof loader>();
  const pad2 = (n: number) => String(n).padStart(2, '0');
  return (
    <>
      <PageHead
        breadcrumb="ADMIN / HOME / 2026"
        title={'GOOD MORNING.'}
        sub="Program overview for the current cohort cycle."
      />
      <section>
        <div className="container">
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-card__label">Active Cohorts</span>
              <div className="kpi-card__value">{pad2(kpis.activeCohorts)}</div>
              <span className="kpi-card__delta">ALL 2026 CYCLE</span>
            </div>
            <div className="kpi-card kpi-card--cyan">
              <span className="kpi-card__label">Active Interns</span>
              <div className="kpi-card__value">{pad2(kpis.activeInterns)}</div>
              <span className="kpi-card__delta">
                {kpis.activeCohorts > 0 ? `ACROSS ${kpis.activeCohorts} COHORTS` : 'NO COHORTS'}
              </span>
            </div>
            <div className="kpi-card kpi-card--success">
              <span className="kpi-card__label">90-Day Outcomes</span>
              <div className="kpi-card__value">{pad2(kpis.outcomes90Day)}</div>
              <span className="kpi-card__delta">{`OF ${kpis.activeInterns} CONFIRMED`}</span>
            </div>
          </div>
        </div>
      </section>
      <section>
        <div className="container">
          <div className="detail-header">
            <h2 className="detail-header__title">Quick Links</h2>
            <span className="micro-label">JUMP TO SECTION</span>
          </div>
          <div className="quick-links">
            <Link to="/admin/assessments" className="quick-link">
              Assessments <span className="quick-link__arrow">&rarr;</span>
            </Link>
            <Link to="/admin/interns" className="quick-link">
              Interns <span className="quick-link__arrow">&rarr;</span>
            </Link>
            <Link to="/admin/settings/employers" className="quick-link">
              Employers <span className="quick-link__arrow">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>
      <section>
        <div className="container">
          <div className="detail-header">
            <h2 className="detail-header__title">Recent Activity</h2>
            <span className="micro-label">LAST 5 SUBMISSIONS</span>
          </div>
          <div className="activity-list">
            {activity.length === 0 ? (
              <div className="activity-row">
                <span style={{ color: 'var(--muted)' }}>No recent activity yet.</span>
              </div>
            ) : (
              activity.map((a) => (
                <div className="activity-row" key={a.id}>
                  <span>
                    <strong>{a.internLastName}</strong> {activityLabel(a.type, a.phase)} &mdash;{' '}
                    {a.cohortName}
                  </span>
                  <span className="activity-row__time">{activityTime(a.submittedAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
