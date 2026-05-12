import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type { Route } from './+types/admin.settings.employers.$employerId.roles.new';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { getEmployerOrNull } from '~/lib/admin-queries.server';
import { roles as rolesTbl } from '../../db/schema';
import { parseFormFields, requireString, optionalString, errorsByField } from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import { IdentityCard } from '~/components/IdentityCard';
import { ActionBar } from '~/components/ActionBar';

export const meta: Route.MetaFunction = () => [{ title: 'New Role — IMPACT Admin' }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const employer = await getEmployerOrNull(db, params.employerId!);
  if (!employer) throw new Response('Not Found', { status: 404 });
  return data({ employer }, { headers });
}

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const employer = await getEmployerOrNull(db, params.employerId!);
  if (!employer) throw new Response('Not Found', { status: 404 });
  const fd = await request.formData();
  const { values, errors } = parseFormFields(fd, {
    label: requireString('Role Name'),
    description: optionalString('Description'),
  });
  if (errors.length > 0) {
    return data({ errors, values }, { headers, status: 400 });
  }
  const [row] = await db
    .insert(rolesTbl)
    .values({
      employerId: employer.id,
      label: values.label,
      description: values.description,
    })
    .returning({ id: rolesTbl.id });
  throw redirect(`/admin/settings/employers/${employer.id}?roleCreated=1#role-${row!.id}`, {
    headers,
  });
}

export default function NewRole() {
  const { employer } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const errs = errorsByField(actionData?.errors ?? []);
  const v = (actionData?.values ?? {}) as Partial<Record<string, string | null>>;
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
            <Link
              to={`/admin/settings/employers/${employer.id}`}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {employer.name.toUpperCase()}
            </Link>
            {' / NEW ROLE'}
          </>
        }
        title="NEW ROLE."
        sub="Define a role under this employer. Cohorts and intern records can reference roles when assigning placements."
      />
      <SettingsShell active="employers">
        <Form method="post">
          <IdentityCard title="Role Record" subnote="NEW ROLE · DEFINE DETAILS">
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
                  placeholder="e.g. Medical Assistant"
                  defaultValue={String(v.label ?? '')}
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
                  placeholder="Role overview, responsibilities, credentials earned…"
                  defaultValue={String(v.description ?? '')}
                />
              </div>
            </div>
          </IdentityCard>
          <ActionBar status="ROLE RECORD · NEW">
            <Link to={`/admin/settings/employers/${employer.id}`} className="btn btn--outline">
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
                  Create Role <span className="btn__arrow">&rarr;</span>
                </>
              )}
            </button>
          </ActionBar>
        </Form>
      </SettingsShell>
    </>
  );
}
