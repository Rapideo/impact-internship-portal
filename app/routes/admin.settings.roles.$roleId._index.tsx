import {
  data,
  Form,
  Link,
  redirect,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from 'react-router';
import { useEffect, useState } from 'react';
import type { Route } from './+types/admin.settings.roles.$roleId._index';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { getRoleOrNull, getEmployerOrNull, listCohortsUsingRole } from '~/lib/admin-queries.server';
import { roles as rolesTbl } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { SettingsShell } from '~/components/SettingsShell';
import { ConfirmModal } from '~/components/ConfirmModal';
import { EmptyRow } from '~/components/EmptyRow';
import { useToast } from '~/components/ToastProvider';
import { formatDate, initials } from '~/lib/format';

export const meta: Route.MetaFunction = ({ data: loaderData }) => [
  {
    title: `${(loaderData as { role?: { label: string } } | undefined)?.role?.label ?? 'Role'} — Role — IMPACT Admin`,
  },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const role = await getRoleOrNull(db, params.roleId!);
  if (!role) throw new Response('Not Found', { status: 404 });
  const [employer, cohorts] = await Promise.all([
    getEmployerOrNull(db, role.employerId),
    listCohortsUsingRole(db, role.id),
  ]);
  return data({ role, employer, cohorts }, { headers });
}

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const fd = await request.formData();
  if (String(fd.get('_intent')) === 'delete') {
    const role = await getRoleOrNull(db, params.roleId!);
    await db.delete(rolesTbl).where(eq(rolesTbl.id, params.roleId!));
    throw redirect(`/admin/settings/employers/${role?.employerId ?? ''}?roleDeleted=1`, {
      headers,
    });
  }
  return data({}, { headers });
}

export default function RoleDetail() {
  const { role, employer, cohorts } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const toast = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [search] = useSearchParams();

  useEffect(() => {
    if (search.get('created') === '1')
      toast.show({ kind: 'success', label: 'CREATED', message: 'Role created.' });
    if (search.get('updated') === '1')
      toast.show({ kind: 'success', label: 'UPDATED', message: 'Role updated.' });
  }, [search, toast]);

  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link
              to="/admin/settings/employers"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              ADMIN / SETTINGS / EMPLOYERS
            </Link>
            {' / '}
            {employer ? (
              <Link
                to={`/admin/settings/employers/${employer.id}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
              >
                {employer.name.toUpperCase()}
              </Link>
            ) : (
              'EMPLOYER'
            )}
            {' / '}
            {role.label.toUpperCase()}
          </>
        }
        title={`${role.label}.`}
        sub="Role detail. Cohorts and intern records under this employer can reference this role when assigning placements."
      >
        <MetaStrip
          items={[
            { label: 'Role Name', value: role.label },
            { label: 'Employer', value: employer?.name ?? '—' },
            {
              label: 'Cohorts using',
              value: String(cohorts.length).padStart(2, '0'),
              mono: true,
            },
          ]}
        />
      </PageHead>
      <SettingsShell active="employers">
        <article className="prose-card">
          <span className="prose-card__label">Role Description</span>
          <p className="prose-card__body">{role.description || 'No description recorded.'}</p>
        </article>

        <div className="detail-header" style={{ marginTop: 48 }}>
          <h2 className="detail-header__title">Cohorts Using This Role</h2>
          <span className="micro-label">
            {String(cohorts.length).padStart(2, '0')} COHORT{cohorts.length === 1 ? '' : 'S'}
          </span>
        </div>
        <table className="assessments" style={{ marginBottom: 40 }}>
          <thead>
            <tr>
              <th style={{ width: '50%' }}>Cohort</th>
              <th style={{ width: '25%' }}>Start</th>
              <th style={{ width: '25%' }}>Members</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.length === 0 ? (
              <EmptyRow colSpan={3} message="No cohorts currently use this role." />
            ) : (
              cohorts.map((c) => (
                <tr
                  key={c.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/settings/cohorts/${c.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/admin/settings/cohorts/${c.id}`);
                    }
                  }}
                >
                  <td>
                    <div className="col-name">
                      <span className="name-initial">{initials(c.name)}</span>
                      {c.name}
                    </div>
                  </td>
                  <td className="col-date">{formatDate(c.startDate)}</td>
                  <td>
                    <span className="col-phase">{c.members}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="detail-actions" style={{ display: 'flex', gap: 10 }}>
          <Link
            to={employer ? `/admin/settings/employers/${employer.id}` : '/admin/settings/employers'}
            className="btn btn--outline"
          >
            &larr; Close
          </Link>
          <Link to={`/admin/settings/roles/${role.id}/edit`} className="btn btn--primary">
            Edit Role
          </Link>
          <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>
            Delete Role
          </button>
        </div>

        <Form method="post" id="delete-role-form">
          <input type="hidden" name="_intent" value="delete" />
        </Form>
        <ConfirmModal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() =>
            (document.getElementById('delete-role-form') as HTMLFormElement).submit()
          }
          label="DELETE ROLE"
          title="Delete this role?"
          body="Removing this role will not delete cohorts or interns that reference it, but those records will need a new role assignment. This cannot be undone."
          confirmText="Delete Permanently"
          variant="danger"
        />
      </SettingsShell>
    </>
  );
}
