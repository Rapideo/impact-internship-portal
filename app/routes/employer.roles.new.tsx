// Employer role creation (SP5 Phase J, Task 30).
//
// Insert is done through the authenticated supabase client so the
// `employer_own_roles` RLS policy is enforced; the `employer_id` column is
// pinned to the signed-in user's employer scope server-side.
//
// Auth is enforced by the parent `employer.tsx` layout; the
// `!auth?.employerId` guard here is for TypeScript narrowing.

import { data, Form, Link, redirect, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/employer.roles.new';
import { createSupabaseServerClient, getAuthContext } from '~/lib/auth.server';
import { errorsByField, optionalString, parseFormFields, requireString } from '~/lib/validation';
import { PageHead } from '~/components/PageHead';
import { IdentityCard } from '~/components/IdentityCard';
import { ActionBar } from '~/components/ActionBar';

export const meta: Route.MetaFunction = () => [{ title: 'New Role · IMPACT Employer' }];

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }
  const fd = await request.formData();
  const { values, errors } = parseFormFields(fd, {
    label: requireString('Role Name'),
    description: optionalString('Description'),
  });
  if (errors.length > 0) {
    return data({ errors, values }, { headers, status: 400 });
  }
  const supabase = createSupabaseServerClient(request, headers);
  const { error } = await supabase.from('roles').insert({
    label: values.label,
    description: values.description,
    employer_id: auth.employerId,
  });
  if (error) {
    return data(
      { errors: [{ field: '_form', message: `Save failed: ${error.message}` }], values },
      { headers, status: 500 },
    );
  }
  throw redirect('/employer/roles?created=1', { headers });
}

export default function NewEmployerRole() {
  const actionData = useActionData<typeof action>();
  const nav = useNavigation();
  const errs = errorsByField(actionData?.errors ?? []);
  const v = (actionData?.values ?? {}) as Partial<Record<string, string | null>>;
  const formError = errs._form;
  return (
    <>
      <PageHead
        breadcrumb={
          <>
            <Link to="/employer/roles" style={{ color: 'inherit', textDecoration: 'none' }}>
              EMPLOYER / ROLES
            </Link>
            {' / NEW'}
          </>
        }
        title="NEW ROLE."
        sub="Define a role template. Your program admin can attach it to a cohort."
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
              <Link to="/employer/roles" className="btn btn--outline">
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
        </div>
      </section>
    </>
  );
}
