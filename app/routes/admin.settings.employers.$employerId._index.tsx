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
import type { Route } from './+types/admin.settings.employers.$employerId._index';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import {
  getEmployerOrNull,
  listCohortsForEmployer,
  listRolesForEmployerWithCohortCount,
} from '~/lib/admin-queries.server';
import { employers } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { SettingsShell } from '~/components/SettingsShell';
import { ConfirmModal } from '~/components/ConfirmModal';
import { EmptyRow } from '~/components/EmptyRow';
import { useToast } from '~/components/ToastProvider';
import { formatDate, formatPhone, initials } from '~/lib/format';

export const meta: Route.MetaFunction = ({ data: loaderData }) => [
  {
    title: `${(loaderData as { employer?: { name: string } } | undefined)?.employer?.name ?? 'Employer'} — Settings — IMPACT Admin`,
  },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const employer = await getEmployerOrNull(db, params.employerId!);
  if (!employer) throw new Response('Not Found', { status: 404 });
  const [cohorts, roles] = await Promise.all([
    listCohortsForEmployer(db, employer.id),
    listRolesForEmployerWithCohortCount(db, employer.id),
  ]);
  return data({ employer, cohorts, roles }, { headers });
}

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const fd = await request.formData();
  if (String(fd.get('_intent')) === 'delete') {
    await db.delete(employers).where(eq(employers.id, params.employerId!));
    throw redirect('/admin/settings/employers?deleted=1', { headers });
  }
  return data({}, { headers });
}

export default function EmployerDetail() {
  const { employer, cohorts, roles } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const toast = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [search] = useSearchParams();

  useEffect(() => {
    if (search.get('created') === '1')
      toast.show({ kind: 'success', label: 'CREATED', message: 'Employer created.' });
    if (search.get('updated') === '1')
      toast.show({ kind: 'success', label: 'UPDATED', message: 'Employer updated.' });
    if (search.get('cohortCreated') === '1')
      toast.show({ kind: 'success', label: 'CREATED', message: 'Cohort created.' });
    if (search.get('roleCreated') === '1')
      toast.show({ kind: 'success', label: 'CREATED', message: 'Role created.' });
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
            </Link>{' '}
            / {employer.name.toUpperCase()}
          </>
        }
        title={`${employer.name}.`}
        sub="Contact and cohort overview."
      >
        <MetaStrip
          items={[
            { label: 'Contact Name', value: employer.contactName ?? '—' },
            { label: 'Email', value: employer.contactEmail ?? '—' },
            { label: 'Phone', value: formatPhone(employer.phone ?? ''), mono: true },
          ]}
        />
      </PageHead>
      <SettingsShell active="employers">
        <article className="prose-card">
          <span className="prose-card__label">Employer Notes</span>
          <p className="prose-card__body">{employer.notes || '—'}</p>
        </article>

        <div className="detail-actions" style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <Link to={`/admin/settings/employers/${employer.id}/edit`} className="btn btn--outline">
            Edit Employer
          </Link>
          <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>
            Delete Employer
          </button>
        </div>

        <div className="detail-header" style={{ marginTop: 48 }}>
          <h2 className="detail-header__title">Cohorts</h2>
          <Link
            to={`/admin/settings/employers/${employer.id}/cohorts/new`}
            className="btn btn--primary"
          >
            + New Cohort
          </Link>
        </div>
        <table className="assessments" style={{ marginBottom: 40 }}>
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Cohort</th>
              <th style={{ width: '25%' }}>Role</th>
              <th style={{ width: '20%' }}>Start</th>
              <th style={{ width: '20%' }}>Members</th>
            </tr>
          </thead>
          <tbody>
            {cohorts.length === 0 ? (
              <EmptyRow colSpan={4} message="No cohorts yet." />
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
                  <td>{c.roleLabel ?? '—'}</td>
                  <td className="col-date">{formatDate(c.startDate)}</td>
                  <td>
                    <span className="col-phase">{c.members}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="detail-header" style={{ marginTop: 48 }}>
          <h2 className="detail-header__title">Roles</h2>
          <Link
            to={`/admin/settings/employers/${employer.id}/roles/new`}
            className="btn btn--primary"
          >
            + New Role
          </Link>
        </div>
        <table className="assessments" style={{ marginBottom: 40 }}>
          <thead>
            <tr>
              <th style={{ width: '45%' }}>Role</th>
              <th style={{ width: '35%' }}>Description</th>
              <th style={{ width: '20%' }}>Cohorts Using</th>
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <EmptyRow colSpan={3} message="No roles yet." />
            ) : (
              roles.map((r) => (
                <tr
                  key={r.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/settings/roles/${r.id}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/admin/settings/roles/${r.id}`);
                    }
                  }}
                >
                  <td>
                    <div className="col-name">
                      <span className="name-initial">{initials(r.label)}</span>
                      {r.label}
                    </div>
                  </td>
                  <td>{r.description ?? '—'}</td>
                  <td>
                    <span className="col-phase">{r.cohortCount}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Form method="post" id="delete-form">
          <input type="hidden" name="_intent" value="delete" />
        </Form>
        <ConfirmModal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => (document.getElementById('delete-form') as HTMLFormElement).submit()}
          label="DELETE EMPLOYER"
          title="Delete this employer?"
          body="This employer will be removed from the program. All cohorts and roles under this employer will be cascade-deleted. This cannot be undone."
          confirmText="Delete Permanently"
          variant="danger"
        />
      </SettingsShell>
    </>
  );
}
