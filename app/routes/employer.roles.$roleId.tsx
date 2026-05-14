// Employer role detail / edit / delete (SP5 Phase J, Task 30).
//
// All writes go through the authenticated supabase client so the
// `employer_own_roles` RLS policy is enforced. The loader filters by
// employerId so cross-tenant roleIds 404 here (defense-in-depth beside
// RLS).
//
// Delete semantics: `cohorts.role_id` and `interns.role_id` both use
// ON DELETE SET NULL in the current schema (0000_initial_schema.sql), so
// deleting a role does not fail on FK — referencing rows simply have
// their role pointer cleared. We still catch supabase errors and surface
// them inline, in case a future migration tightens the FK.
//
// Auth is enforced by the parent `employer.tsx` layout; the
// `!auth?.employerId` guard here is for TypeScript narrowing.

import { useState } from 'react';
import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import { and, eq } from 'drizzle-orm';
import type { Route } from './+types/employer.roles.$roleId';
import { createSupabaseServerClient, getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { roles } from '../../db/schema';
import {
  errorsByField,
  optionalString,
  parseFormFields,
  requireString,
  UUID_RE,
} from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { IdentityCard } from '~/components/IdentityCard';
import { ActionBar } from '~/components/ActionBar';
import { ConfirmModal } from '~/components/ConfirmModal';

export const meta: Route.MetaFunction = () => [{ title: 'Edit Role · IMPACT Employer' }];

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
  return data({ role }, { headers });
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
      // Schema currently uses ON DELETE SET NULL for cohorts.role_id and
      // interns.role_id so a delete should not FK-fail today. If a future
      // migration tightens this to RESTRICT, surface a friendly message
      // rather than redirecting on failure.
      const friendly =
        error.code === '23503'
          ? 'Cannot delete this role — one or more cohorts still reference it.'
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
  const { role } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const errs = errorsByField(actionData?.errors ?? []);
  const v = (actionData?.values ?? role) as {
    label?: string;
    description?: string | null;
  };
  const formError = errs._form;
  const saved = actionData?.saved === true;
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
        title="EDIT ROLE."
        sub="Update the role's name and description, or delete it if no longer needed."
      />
      <section>
        <div className="container">
          {formError ? (
            <div
              role="alert"
              className="auth__alert auth__alert--danger"
              style={{ marginBottom: 16 }}
            >
              {formError}
            </div>
          ) : null}
          {saved ? (
            <div
              role="status"
              className="auth__alert auth__alert--success"
              style={{ marginBottom: 16 }}
            >
              Saved.
            </div>
          ) : null}

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
              <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>
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
        body="Cohorts and interns that reference this role will have their role pointer cleared. This cannot be undone."
        confirmText="Delete Permanently"
        variant="danger"
      />
    </>
  );
}
