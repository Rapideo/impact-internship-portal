import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type { Route } from './+types/admin.settings.employers.$employerId.edit';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { getEmployerOrNull } from '~/lib/admin-queries.server';
import { employers } from '../../db/schema';
import { eq } from 'drizzle-orm';
import {
  parseFormFields,
  requireString,
  optionalEmail,
  optionalString,
  errorsByField,
} from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import { IdentityCard } from '~/components/IdentityCard';
import { ActionBar } from '~/components/ActionBar';

export const meta: Route.MetaFunction = () => [
  { title: 'Edit Employer — Settings — IMPACT Admin' },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const employer = await getEmployerOrNull(db, params.employerId!);
  if (!employer) throw new Response('Not Found', { status: 404 });
  return data({ employer }, { headers });
}

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const fd = await request.formData();
  const { values, errors } = parseFormFields(fd, {
    name: requireString('Name'),
    contactName: optionalString('Contact Name'),
    contactEmail: optionalEmail('Contact Email'),
    phone: optionalString('Phone'),
    notes: optionalString('Notes'),
  });
  if (errors.length > 0) {
    return data({ errors, values }, { headers, status: 400 });
  }
  await db
    .update(employers)
    .set({
      name: values.name,
      contactName: values.contactName,
      contactEmail: values.contactEmail,
      phone: values.phone,
      notes: values.notes,
      updatedAt: new Date(),
    })
    .where(eq(employers.id, params.employerId!));
  throw redirect(`/admin/settings/employers/${params.employerId}?updated=1`, { headers });
}

export default function EditEmployer() {
  const { employer } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const errs = errorsByField(actionData?.errors ?? []);
  const v = (actionData?.values ?? employer) as {
    name?: string;
    contactName?: string | null;
    contactEmail?: string | null;
    phone?: string | null;
    notes?: string | null;
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
            </Link>{' '}
            / EDIT
          </>
        }
        title="EDIT EMPLOYER."
        sub="Update the program's point of contact at the placement organization."
      />
      <SettingsShell active="employers">
        <Form method="post">
          <IdentityCard title="Employer Record" subnote="EDIT EMPLOYER · UPDATE CONTACT INFO">
            <div className="id-grid id-grid--4">
              <div
                className={`field${errs.name ? ' field--error' : ''}`}
                style={{ gridColumn: 'span 2' }}
              >
                <label htmlFor="emp-name">Name</label>
                <input
                  className="input"
                  type="text"
                  id="emp-name"
                  name="name"
                  defaultValue={v.name ?? ''}
                />
                {errs.name ? <span className="field__error">{errs.name}</span> : null}
              </div>
              <div className="field">
                <label htmlFor="emp-contact">Contact Name</label>
                <input
                  className="input"
                  type="text"
                  id="emp-contact"
                  name="contactName"
                  defaultValue={v.contactName ?? ''}
                />
              </div>
              <div className="field">
                <label htmlFor="emp-phone">Phone</label>
                <input
                  className="input"
                  type="text"
                  id="emp-phone"
                  name="phone"
                  defaultValue={v.phone ?? ''}
                />
              </div>
              <div
                className={`field${errs.contactEmail ? ' field--error' : ''}`}
                style={{ gridColumn: 'span 2' }}
              >
                <label htmlFor="emp-email">Contact Email</label>
                <input
                  className="input"
                  type="email"
                  id="emp-email"
                  name="contactEmail"
                  defaultValue={v.contactEmail ?? ''}
                />
                {errs.contactEmail ? (
                  <span className="field__error">{errs.contactEmail}</span>
                ) : null}
              </div>
            </div>
            <div
              style={{
                paddingTop: 22,
                marginTop: 22,
                borderTop: '1px solid var(--rule)',
              }}
            >
              <div className="field">
                <label htmlFor="emp-notes">Notes</label>
                <textarea
                  className="textarea"
                  id="emp-notes"
                  name="notes"
                  rows={3}
                  defaultValue={v.notes ?? ''}
                />
              </div>
            </div>
          </IdentityCard>
          <ActionBar status="EMPLOYER · EDIT">
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
                  Save Employer <span className="btn__arrow">&rarr;</span>
                </>
              )}
            </button>
          </ActionBar>
        </Form>
      </SettingsShell>
    </>
  );
}
