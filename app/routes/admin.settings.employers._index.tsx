import { data, Link, useLoaderData, useNavigate } from 'react-router';
import type { Route } from './+types/admin.settings.employers._index';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { listEmployersWithCohortCount } from '~/lib/admin-queries.server';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import { EmptyRow } from '~/components/EmptyRow';
import { initials } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'Employers — Settings — IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const rows = await listEmployersWithCohortCount(db);
  return data({ rows }, { headers });
}

export default function EmployersList() {
  const { rows } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  return (
    <>
      <PageHead
        breadcrumb="ADMIN / SETTINGS / EMPLOYERS"
        title="EMPLOYERS."
        sub="Program partners and the cohorts running under them."
      />
      <SettingsShell active="employers">
        <div className="detail-header" style={{ marginTop: 0 }}>
          <h2 className="detail-header__title">Employers</h2>
          <Link to="/admin/settings/employers/new" className="btn btn--primary">
            + New Employer
          </Link>
        </div>
        <table className="assessments">
          <thead>
            <tr>
              <th style={{ width: '30%' }}>Name</th>
              <th style={{ width: '25%' }}>Contact</th>
              <th style={{ width: '30%' }}>Email</th>
              <th style={{ width: '15%' }}>Cohorts</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={4} message="No employers yet." />
            ) : (
              rows.map((e) => (
                <tr
                  key={e.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/settings/employers/${e.id}`)}
                  tabIndex={0}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      navigate(`/admin/settings/employers/${e.id}`);
                    }
                  }}
                >
                  <td>
                    <div className="col-name">
                      <span className="name-initial">{initials(e.name)}</span>
                      {e.name}
                    </div>
                  </td>
                  <td>{e.contactName ?? '—'}</td>
                  <td>{e.contactEmail ?? '—'}</td>
                  <td>
                    <span className="col-phase">{e.cohortCount}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </SettingsShell>
    </>
  );
}
