// Employer profile route (SP5 Phase J).
//
// Self-service editor for the signed-in employer's own contact record. The
// employer's *name* is locked — only the program admin can rename an
// employer. Everything else (contact name / email / phone / notes) can be
// edited here. Writes go through the authenticated supabase client so the
// `employer_own_employer` RLS policy is the enforcement boundary.
//
// SP7 Phase G rebuild: title set to "MY EMPLOYER." with employer name moved
// into the MetaStrip (Contact / Email / Phone surfaced for visual parity with
// admin employer detail). Save confirmation now uses `useToast()` instead of
// the mid-page `auth__alert--success` banner.
//
// Auth is enforced by the parent `employer.tsx` layout; the
// `!auth?.employerId` guard here is belt-and-suspenders for TypeScript
// narrowing.

import { useEffect } from 'react';
import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import { eq } from 'drizzle-orm';
import type { Route } from './+types/employer.profile';
import { createSupabaseServerClient, getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { employers } from '../../db/schema';
import { errorsByField, optionalString, parseFormFields } from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { MetaStrip } from '~/components/MetaStrip';
import { IdentityCard } from '~/components/IdentityCard';
import { ActionBar } from '~/components/ActionBar';
import { useToast } from '~/components/ToastProvider';
import { formatPhone } from '~/lib/format';

export const meta: Route.MetaFunction = () => [{ title: 'My Employer — IMPACT' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }
  const rows = await db.select().from(employers).where(eq(employers.id, auth.employerId)).limit(1);
  const [employer] = rows;
  if (!employer) throw new Response('Not Found', { status: 404 });
  return data({ employer }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }
  const fd = await request.formData();
  const { values, errors } = parseFormFields(fd, {
    contactName: optionalString('Contact name'),
    contactEmail: optionalString('Contact email'),
    phone: optionalString('Phone'),
    notes: optionalString('Notes'),
  });
  if (errors.length > 0) {
    return data({ errors, values, saved: false as const }, { headers, status: 400 });
  }
  const supabase = createSupabaseServerClient(request, headers);
  const { error } = await supabase
    .from('employers')
    .update({
      contact_name: values.contactName,
      contact_email: values.contactEmail,
      phone: values.phone,
      notes: values.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', auth.employerId);
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

export default function EmployerProfile() {
  const { employer } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const toast = useToast();
  const errs = errorsByField(actionData?.errors ?? []);
  const v = (actionData?.values ?? employer) as {
    contactName?: string | null;
    contactEmail?: string | null;
    phone?: string | null;
    notes?: string | null;
  };
  const formError = errs._form;
  const saved = actionData?.saved === true;

  useEffect(() => {
    if (saved) {
      toast.show({ kind: 'success', label: 'SAVED', message: 'Profile saved.' });
    }
  }, [saved, toast]);

  return (
    <>
      <PageHead
        breadcrumb="EMPLOYER / MY EMPLOYER"
        title="MY EMPLOYER."
        sub="Update your contact details. Your employer name is set by your program admin."
      >
        <MetaStrip
          items={[
            { label: 'Employer', value: employer.name },
            { label: 'Contact', value: employer.contactName ?? '—' },
            { label: 'Email', value: employer.contactEmail ?? '—' },
            { label: 'Phone', value: formatPhone(employer.phone) || '—', mono: true },
          ]}
        />
      </PageHead>
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
          <Form method="post">
            <IdentityCard title="Contact Record" subnote="EMPLOYER · CONTACT INFO">
              <div className="id-grid id-grid--4">
                <div
                  className={`field${errs.contactName ? ' field--error' : ''}`}
                  style={{ gridColumn: 'span 2' }}
                >
                  <label htmlFor="emp-contact">Contact Name</label>
                  <input
                    className="input"
                    type="text"
                    id="emp-contact"
                    name="contactName"
                    defaultValue={v.contactName ?? ''}
                  />
                  {errs.contactName ? (
                    <span className="field__error">{errs.contactName}</span>
                  ) : null}
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
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="emp-phone">Phone</label>
                  <input
                    className="input"
                    type="text"
                    id="emp-phone"
                    name="phone"
                    defaultValue={v.phone ?? ''}
                  />
                </div>
              </div>
              <div style={{ paddingTop: 22, marginTop: 22, borderTop: '1px solid var(--rule)' }}>
                <div className="field">
                  <label htmlFor="emp-notes">Notes</label>
                  <textarea
                    className="textarea"
                    id="emp-notes"
                    name="notes"
                    rows={4}
                    defaultValue={v.notes ?? ''}
                  />
                </div>
              </div>
            </IdentityCard>
            <ActionBar status="EMPLOYER · PROFILE">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={nav.state === 'submitting'}
              >
                {nav.state === 'submitting' ? (
                  'Saving…'
                ) : (
                  <>
                    Save Profile <span className="btn__arrow">&rarr;</span>
                  </>
                )}
              </button>
            </ActionBar>
          </Form>

          <article className="identity-card" style={{ marginTop: 32 }}>
            <header className="identity-card__head">
              <h2 className="identity-card__title">Roles</h2>
              <Link to="/employer/roles" className="identity-card__link">
                Manage roles &rarr;
              </Link>
            </header>
            <p style={{ color: 'var(--muted)', margin: 0 }}>
              Roles are templates used when cohorts are configured by your program admin.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
