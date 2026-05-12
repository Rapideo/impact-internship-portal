import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type { Route } from './+types/admin.settings.roles.$roleId.edit';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { getRoleOrNull, getEmployerOrNull } from '~/lib/admin-queries.server';
import { roles as rolesTbl } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { parseFormFields, requireString, optionalString, errorsByField } from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import { IdentityCard } from '~/components/IdentityCard';
import { ActionBar } from '~/components/ActionBar';

export const meta: Route.MetaFunction = () => [{ title: 'Edit Role — IMPACT Admin' }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const role = await getRoleOrNull(db, params.roleId!);
  if (!role) throw new Response('Not Found', { status: 404 });
  const employer = await getEmployerOrNull(db, role.employerId);
  return data({ role, employer }, { headers });
}

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const fd = await request.formData();
  const { values, errors } = parseFormFields(fd, {
    label: requireString('Role Name'),
    description: optionalString('Description'),
  });
  if (errors.length > 0) {
    return data({ errors, values }, { headers, status: 400 });
  }
  await db
    .update(rolesTbl)
    .set({
      label: values.label,
      description: values.description,
      updatedAt: new Date(),
    })
    .where(eq(rolesTbl.id, params.roleId!));
  throw redirect(`/admin/settings/roles/${params.roleId}?updated=1`, { headers });
}

export default function EditRole() {
  const { role, employer } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const errs = errorsByField(actionData?.errors ?? []);
  const v = (actionData?.values ?? role) as {
    label?: string;
    description?: string | null;
  };
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
            {' / EDIT ROLE'}
          </>
        }
        title="EDIT ROLE."
        sub="Update the role's name and description."
      />
      <SettingsShell active="employers">
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
            <Link to={`/admin/settings/roles/${role.id}`} className="btn btn--outline">
              Cancel
            </Link>
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
      </SettingsShell>
    </>
  );
}
