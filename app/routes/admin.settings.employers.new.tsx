import { data, Form, Link, redirect, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/admin.settings.employers.new';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { employers } from '../../db/schema';
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

export const meta: Route.MetaFunction = () => [{ title: 'New Employer — Settings — IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  return data({}, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const formData = await request.formData();
  const { values, errors } = parseFormFields(formData, {
    name: requireString('Name'),
    contactName: optionalString('Contact Name'),
    contactEmail: optionalEmail('Contact Email'),
    phone: optionalString('Phone'),
    notes: optionalString('Notes'),
  });
  if (errors.length > 0) {
    return data({ errors, values }, { headers, status: 400 });
  }
  const [row] = await db
    .insert(employers)
    .values({
      name: values.name,
      contactName: values.contactName,
      contactEmail: values.contactEmail,
      phone: values.phone,
      notes: values.notes,
    })
    .returning({ id: employers.id });
  throw redirect(`/admin/settings/employers/${row!.id}?created=1`, { headers });
}

export default function NewEmployer() {
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
            </Link>{' '}
            / NEW
          </>
        }
        title="NEW EMPLOYER."
        sub="Capture the program's point of contact at the placement organization."
      />
      <SettingsShell active="employers">
        <Form method="post">
          <IdentityCard title="Employer Record" subnote="NEW EMPLOYER · CAPTURE CONTACT INFO">
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
                  placeholder="e.g. Eskenazi Health"
                  defaultValue={String(v.name ?? '')}
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
                  placeholder="e.g. Maya Reyes"
                  defaultValue={String(v.contactName ?? '')}
                />
              </div>
              <div className="field">
                <label htmlFor="emp-phone">Phone</label>
                <input
                  className="input"
                  type="text"
                  id="emp-phone"
                  name="phone"
                  placeholder="(317) 555-0100"
                  defaultValue={String(v.phone ?? '')}
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
                  placeholder="contact@example.com"
                  defaultValue={String(v.contactEmail ?? '')}
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
                  placeholder="Placement specifics, scheduling notes, account caveats…"
                  defaultValue={String(v.notes ?? '')}
                />
              </div>
            </div>
          </IdentityCard>
          <ActionBar status="EMPLOYER · NEW">
            <Link to="/admin/settings/employers" className="btn btn--outline">
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
