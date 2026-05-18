import { data, useLoaderData } from 'react-router';
import type { Route } from './+types/admin._index';
import { requireAdmin } from '~/lib/admin-guard.server';
import { createSupabaseServerClient } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { getAdminHomeKpis, listRecentActivity } from '~/lib/admin-queries.server';
import { PageHead } from '~/components/PageHead';
import { KpiCard } from '~/components/KpiCard';
import { QuickLinks } from '~/components/QuickLinks';
import { RecentActivity, type ActivityEntry } from '~/components/RecentActivity';

export const meta: Route.MetaFunction = () => [{ title: 'Admin Home — IMPACT' }];

/**
 * Derive a display first name from a Supabase user email. Strips the
 * domain, takes the local-part before any `.` or `+` separator, and
 * uppercases. e.g. `admin@example.com` -> `ADMIN`,
 * `kortney.bayer@impact.org` -> `KORTNEY`. Falls back to "ADMIN" if the
 * email is empty or malformed.
 */
function deriveFirstName(email: string | null | undefined): string {
  if (!email) return 'ADMIN';
  const local = email.split('@')[0] ?? '';
  const token = local.split(/[.+_-]/)[0] ?? '';
  const cleaned = token.trim();
  return (cleaned.length > 0 ? cleaned : 'ADMIN').toUpperCase();
}

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const supabase = createSupabaseServerClient(request, headers);
  const [{ data: userData }, kpis, activity] = await Promise.all([
    supabase.auth.getUser(),
    getAdminHomeKpis(db),
    listRecentActivity(db, 5),
  ]);
  const firstName = deriveFirstName(userData?.user?.email);
  // Use data() rather than Response.json() so the loader return is a typed
  // object useLoaderData<typeof loader>() can infer, while still forwarding
  // refreshed Supabase cookies via headers.
  return data({ kpis, activity, firstName }, { headers });
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

// Quick Links — verbatim from admin.html (Assessments → Interns → Employers).
const QUICK_LINKS = [
  { to: '/admin/assessments', label: 'Assessments' },
  { to: '/admin/interns', label: 'Interns' },
  { to: '/admin/settings/employers', label: 'Employers' },
] as const;

export default function AdminHome() {
  const { kpis, activity, firstName } = useLoaderData<typeof loader>();
  const pad2 = (n: number) => String(n).padStart(2, '0');

  const entries: ActivityEntry[] =
    activity.length === 0
      ? []
      : activity.map((a) => ({
          actor: a.internLastName,
          body: (
            <>
              {activityLabel(a.type, a.phase)} &mdash; {a.cohortName}
            </>
          ),
          time: activityTime(a.submittedAt),
        }));

  return (
    <>
      <PageHead
        breadcrumb="ADMIN / HOME / 2026"
        title={
          <>
            GOOD MORNING,
            <br />
            {firstName}.
          </>
        }
        sub="Program overview for the 2026 cohort cycle. Data reflects the current demo dataset."
      />

      {/* KPI grid — 3 cards: Active Cohorts (default navy rail), Active
          Interns (cyan), 90-Day Outcomes (success). Mirrors admin.html. */}
      <section>
        <div className="container">
          <div className="kpi-grid">
            <KpiCard
              label="Active Cohorts"
              value={pad2(kpis.activeCohorts)}
              delta="ALL 2026 CYCLE"
            />
            <KpiCard
              label="Active Interns"
              value={pad2(kpis.activeInterns)}
              delta={kpis.activeCohorts > 0 ? `ACROSS ${kpis.activeCohorts} COHORTS` : 'NO COHORTS'}
              variant="cyan"
            />
            <KpiCard
              label="90-Day Outcomes"
              value={pad2(kpis.outcomes90Day)}
              delta={`OF ${kpis.activeInterns} CONFIRMED`}
              variant="success"
            />
          </div>
        </div>
      </section>

      {/* Quick Links — row of navy pill links with trailing arrow glyph. */}
      <section>
        <div className="container">
          <div className="detail-header">
            <h2 className="detail-header__title">Quick Links</h2>
            <span className="micro-label">JUMP TO SECTION</span>
          </div>
          <QuickLinks items={QUICK_LINKS} />
        </div>
      </section>

      {/* Recent Activity — last 5 submissions with mono timestamps. */}
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
