// app/routes/admin.settings.users._index.tsx
import { useEffect } from 'react';
import { data, Link, useLoaderData, useNavigate, useSearchParams } from 'react-router';
import type { Route } from './+types/admin.settings.users._index';
import { requireAdmin } from '~/lib/admin-guard.server';
import { listAccounts } from '~/lib/users.server';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import { EmptyRow } from '~/components/EmptyRow';
import { UserStatusPill } from '~/components/UserStatusPill';
import { useToast } from '~/components/toast/ToastProvider';

export const meta: Route.MetaFunction = () => [{ title: 'Users — Settings — Equus Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const accounts = await listAccounts();
  return data({ accounts }, { headers });
}

export default function UsersList() {
  const { accounts } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  // Toast on arrival from the detail page's delete redirect, then strip the
  // flag so a refresh doesn't re-toast (same pattern as the Assessments hub).
  useEffect(() => {
    if (searchParams.get('deleted') !== '1') return;
    toast.show({ kind: 'success', label: 'Deleted', message: 'Account deleted.' });
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('deleted');
        return next;
      },
      { replace: true },
    );
    // toast + setSearchParams are stable refs; intentional one-shot on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const navigate = useNavigate();
  return (
    <>
      <PageHead
        breadcrumb="ADMIN / SETTINGS / USERS"
        title="USERS."
        sub="Administrator and employer login accounts. Employer accounts are attributed to a specific employer."
      />
      <SettingsShell active="users">
        <div className="detail-header" style={{ marginTop: 0 }}>
          <h2 className="detail-header__title">Users</h2>
          <Link to="/admin/settings/users/new" className="btn btn--primary">
            + New User
          </Link>
        </div>
        <table className="assessments">
          <thead>
            <tr>
              <th style={{ width: '34%' }}>Email</th>
              <th style={{ width: '12%' }}>Role</th>
              <th style={{ width: '28%' }}>Employer</th>
              <th style={{ width: '14%' }}>Status</th>
              <th style={{ width: '12%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <EmptyRow colSpan={5} message="No users yet." />
            ) : (
              accounts.map((a) => (
                <tr
                  key={a.userId}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/settings/users/${a.userId}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/admin/settings/users/${a.userId}`);
                    }
                  }}
                >
                  <td>{a.email}</td>
                  <td>{a.role === 'admin' ? 'Admin' : 'Employer'}</td>
                  <td>{a.employerName ?? '—'}</td>
                  <td>
                    <UserStatusPill status={a.status} />
                  </td>
                  <td>
                    <Link
                      to={`/admin/settings/users/${a.userId}`}
                      className="action-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Manage
                    </Link>
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
