// Employer role detail / edit / delete (SP5 Phase J).
//
// All writes go through the authenticated supabase client so the
// `employer_own_roles` RLS policy is enforced. The loader filters by
// employerId so cross-tenant roleIds 404 here (defense-in-depth beside
// RLS).
//
// Delete semantics: `cohorts.role_id` and `interns.role_id` both use
// ON DELETE RESTRICT (migration 0002_role_fk_restrict.sql), so attempting
// to delete a role that still has cohort or intern references raises
// Postgres error 23503 (foreign_key_violation). We catch that as a last
// resort, but also do a pre-flight check in the loader — if any cohort or
// intern still references the role, the Delete button is disabled and an
// inline note explains why.
//
// SP7 Phase G rebuild: MetaStrip in PageHead surfaces usage counts (cohorts
// + interns currently assigned). "Cohorts Using This Role" sub-table renders
// after the edit form (mirroring the prototype `role-detail.html`). Save
// confirmation switched from the mid-page `auth__alert--success` banner to
// `useToast()`.
//
// Auth is enforced by the parent `employer.tsx` layout; the
// `!auth?.employerId` guard here is for TypeScript narrowing.

import { useEffect, useState } from 'react';
import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
} from 'react-router';
import { and, eq } from 'drizzle-orm';
import type { Route } from './+types/employer.roles.$roleId';
import { createSupabaseServerClient, getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { listCohortsUsingRole } from '~/lib/admin-queries.server';
import { interns, roles } from '../../db/schema';
import {
  errorsByField,
  optionalString,
  parseFormFields,
  requireString,
  UUID_RE,
} from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { IdentityCard } from '~/components/IdentityCard';
import { ActionBar } from '~/components/ActionBar';
import { ConfirmModal } from '~/components/ConfirmModal';
import { EmptyRow } from '~/components/EmptyRow';
import { NameInitial } from '~/components/tables/NameInitial';
import { useToast } from '~/components/ToastProvider';
import { formatDate, initials } from '~/lib/format';
import { sql } from 'drizzle-orm';

export const meta: Route.MetaFunction = () => [{ title: 'Edit Role — IMPACT Employer' }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }
  const roleId = params.roleId;
  if (!roleId || !UUID_RE.test(roleId)) {
    throw new Response('Bad Request', { status: 400 });
  }
  const rows = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.employerId, auth.employerId)))
    .limit(1);
  const [role] = rows;
  if (!role) throw new Response('Not Found', { status: 404 });

  // Pre-flight: count cohorts + non-deleted interns currently referencing
  // this role. Surfaced in the MetaStrip + gates the Delete button.
  const cohortsUsing = await listCohortsUsingRole(db, roleId);
  const internsUsingRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(interns)
    .where(and(eq(interns.roleId, roleId), sql`${interns.deletedAt} IS NULL`));
  const internsUsing = internsUsingRows[0]?.count ?? 0;

  return data({ role, cohortsUsing, internsUsing }, { headers });
}

export async function action({ request, params }: Route.ActionArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }
  const roleId = params.roleId;
  if (!roleId || !UUID_RE.test(roleId)) {
    throw new Response('Bad Request', { status: 400 });
  }

  const fd = await request.formData();
  const intent = String(fd.get('intent') ?? 'save');
  const supabase = createSupabaseServerClient(request, headers);

  if (intent === 'delete') {
    const { error } = await supabase.from('roles').delete().eq('id', roleId);
    if (error) {
      // cohorts.role_id and interns.role_id use ON DELETE RESTRICT
      // (migration 0002_role_fk_restrict.sql). When a referencing row
      // exists, the DB raises 23503 and we tell the user to reassign first.
      const friendly =
        error.code === '23503'
          ? "This role can't be deleted because it's currently assigned to one or more cohorts or interns. Reassign or remove them first, then try again."
          : `Delete failed: ${error.message}`;
      return data(
        { errors: [{ field: '_form', message: friendly }], values: null, saved: false as const },
        { headers, status: 400 },
      );
    }
    throw redirect('/employer/roles?deleted=1', { headers });
  }

  const { values, errors } = parseFormFields(fd, {
    label: requireString('Role Name'),
    description: optionalString('Description'),
  });
  if (errors.length > 0) {
    return data({ errors, values, saved: false as const }, { headers, status: 400 });
  }
  const { error } = await supabase
    .from('roles')
    .update({
      label: values.label,
      description: values.description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roleId);
  if (error) {
    return data(
      {
        errors: [{ field: '_form', message: `Save failed: ${error.message}` }],
        values,
        saved: false as const,
      },
      { headers, status: 500 },
    );
  }
  return data({ errors: [], values, saved: true as const }, { headers });
}

export default function EditEmployerRole() {
  const { role, cohortsUsing, internsUsing } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const navigate = useNavigate();
  const toast = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const errs = errorsByField(actionData?.errors ?? []);
  const v = (actionData?.values ?? role) as {
    label?: string;
    description?: string | null;
  };
  const formError = errs._form;
  const saved = actionData?.saved === true;
  const totalUsing = cohortsUsing.length + internsUsing;
  const deleteBlocked = totalUsing > 0;

  useEffect(() => {
    if (saved) {
      toast.show({ kind: 'success', label: 'SAVED', message: 'Role saved.' });
    }
  }, [saved, toast]);

  useEffect(() => {
    if (formError) {
      toast.show({ kind: 'danger', label: 'ERROR', message: formError });
    }
  }, [formError, toast]);

  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link to="/employer/roles" style={{ color: 'inherit', textDecoration: 'none' }}>
              EMPLOYER / ROLES
            </Link>
            {' / '}
            {role.label.toUpperCase()}
          </>
        }
        title={`${role.label.toUpperCase()}.`}
        sub="Update the role's name and description, or delete it if no longer needed."
      >
        <MetaStrip
          items={[
            { label: 'Role Name', value: role.label },
            {
              label: 'Cohorts using',
              value: String(cohortsUsing.length).padStart(2, '0'),
              mono: true,
            },
            {
              label: 'Interns using',
              value: String(internsUsing).padStart(2, '0'),
              mono: true,
            },
          ]}
        />
      </PageHead>
      <section>
        <div className="container">
          <Form method="post">
            <IdentityCard title="Role Record" subnote="EDIT ROLE · UPDATE DETAILS">
              <div className="id-grid id-grid--4">
                <div
                  className={`field${errs.label ? ' field--error' : ''}`}
                  style={{ gridColumn: 'span 4' }}
                >
                  <label htmlFor="r-name">Role Name</label>
                  <input
                    className="input"
                    type="text"
                    id="r-name"
                    name="label"
                    defaultValue={v.label ?? ''}
                  />
                  {errs.label ? <span className="field__error">{errs.label}</span> : null}
                </div>
              </div>
              <div style={{ paddingTop: 22, marginTop: 22, borderTop: '1px solid var(--rule)' }}>
                <div className="field">
                  <label htmlFor="r-desc">Description</label>
                  <textarea
                    className="textarea"
                    id="r-desc"
                    name="description"
                    rows={3}
                    defaultValue={v.description ?? ''}
                  />
                </div>
              </div>
            </IdentityCard>
            <ActionBar status="ROLE RECORD · EDIT">
              <Link to="/employer/roles" className="btn btn--outline">
                Cancel
              </Link>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => setDeleteOpen(true)}
                disabled={deleteBlocked}
                title={
                  deleteBlocked
                    ? `Reassign ${totalUsing} cohort/intern reference${totalUsing === 1 ? '' : 's'} before deleting.`
                    : undefined
                }
              >
                Delete role
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={nav.state === 'submitting'}
              >
                {nav.state === 'submitting' ? (
                  'Saving…'
                ) : (
                  <>
                    Save Role <span className="btn__arrow">&rarr;</span>
                  </>
                )}
              </button>
            </ActionBar>
          </Form>

          {deleteBlocked ? (
            <p
              style={{
                marginTop: 16,
                color: 'var(--muted)',
                fontSize: 13,
              }}
            >
              This role is currently assigned to {cohortsUsing.length} cohort
              {cohortsUsing.length === 1 ? '' : 's'} and {internsUsing} intern
              {internsUsing === 1 ? '' : 's'}. Reassign them before deleting.
            </p>
          ) : null}

          {/* Cohorts Using This Role — sub-table per prototype role-detail.html. */}
          <div className="detail-header" style={{ marginTop: 48 }}>
            <h2 className="detail-header__title">Cohorts Using This Role</h2>
            <span className="micro-label">
              {String(cohortsUsing.length).padStart(2, '0')} COHORT
              {cohortsUsing.length === 1 ? '' : 'S'}
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
              {cohortsUsing.length === 0 ? (
                <EmptyRow colSpan={3} message="No cohorts currently use this role." />
              ) : (
                cohortsUsing.map((c) => (
                  <tr
                    key={c.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/employer/cohorts/${c.id}`)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/employer/cohorts/${c.id}`);
                      }
                    }}
                  >
                    <td>
                      <NameInitial initials={initials(c.name)} name={c.name} />
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

          {/* Standalone delete form — submitted by the ConfirmModal handler. */}
          <Form method="post" id="role-delete-form">
            <input type="hidden" name="intent" value="delete" />
          </Form>
        </div>
      </section>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          (document.getElementById('role-delete-form') as HTMLFormElement | null)?.submit();
        }}
        label="DELETE ROLE"
        title="Delete this role?"
        body="If any cohorts or interns are still assigned to this role, the delete will be refused — reassign them first. This cannot be undone."
        confirmText="Delete Permanently"
        variant="danger"
      />
    </>
  );
}
