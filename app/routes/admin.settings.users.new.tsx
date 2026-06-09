// app/routes/admin.settings.users.new.tsx
import {
  data,
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import { useState } from 'react';
import type { Route } from './+types/admin.settings.users.new';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { listAllEmployers } from '~/lib/admin-queries.server';
import { createAccountWithPassword, inviteAccount, type AccountRole } from '~/lib/users.server';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';

export const meta: Route.MetaFunction = () => [{ title: 'New User — Settings — IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const employerList = await listAllEmployers(db);
  return data({ employers: employerList.map((e) => ({ id: e.id, name: e.name })) }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  const role = String(form.get('role') ?? '') as AccountRole;
  const employerId = role === 'employer' ? String(form.get('employerId') ?? '') || null : null;
  const credential = String(form.get('credential') ?? 'password');
  const password = String(form.get('password') ?? '');

  if (!email) return data({ error: 'Email is required.' }, { headers });
  if (role !== 'admin' && role !== 'employer') return data({ error: 'Pick a role.' }, { headers });
  if (role === 'employer' && !employerId)
    return data({ error: 'Select an employer for employer accounts.' }, { headers });

  try {
    if (credential === 'invite') {
      await inviteAccount({ email, role, employerId });
    } else {
      if (password.length < 8)
        return data({ error: 'Password must be at least 8 characters.' }, { headers });
      await createAccountWithPassword({ email, role, employerId, password });
    }
    throw redirect('/admin/settings/users?created=1', { headers });
  } catch (err) {
    if (err instanceof Response) throw err;
    const message = err instanceof Error ? err.message : 'Could not create the user.';
    return data({ error: message }, { headers });
  }
}

export default function NewUser() {
  const { employers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = navigation.state === 'submitting';
  const [role, setRole] = useState<AccountRole>('employer');
  const [credential, setCredential] = useState<'password' | 'invite'>('password');

  return (
    <>
      <PageHead
        breadcrumb="ADMIN / SETTINGS / USERS / NEW"
        title="NEW USER."
        sub="Create an admin or employer login account."
      />
      <SettingsShell active="users">
        {actionData?.error ? (
          <div
            role="alert"
            className="auth__alert auth__alert--danger"
            style={{ marginBottom: 16 }}
          >
            {actionData.error}
          </div>
        ) : null}
        <Form method="post" style={{ maxWidth: 560 }}>
          <div className="field">
            <label className="field__label" htmlFor="email">
              Email
            </label>
            <input
              className="input"
              id="email"
              name="email"
              type="email"
              required
              autoComplete="off"
              placeholder="name@organization.org"
            />
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label className="field__label" htmlFor="role">
              Role
            </label>
            <select
              className="input"
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as AccountRole)}
            >
              <option value="employer">Employer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {role === 'employer' ? (
            <div className="field" style={{ marginTop: 16 }}>
              <label className="field__label" htmlFor="employerId">
                Employer
              </label>
              <select className="input" id="employerId" name="employerId" required>
                <option value="">Select an employer…</option>
                {employers.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <fieldset className="field" style={{ marginTop: 18, border: 0, padding: 0 }}>
            <legend className="field__label">Credentials</legend>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="radio"
                name="credential"
                value="password"
                checked={credential === 'password'}
                onChange={() => setCredential('password')}
              />
              Set a password now
            </label>
            {credential === 'password' ? (
              <input
                className="input"
                name="password"
                type="password"
                autoComplete="off"
                minLength={8}
                placeholder="At least 8 characters"
                style={{ marginTop: 8 }}
              />
            ) : null}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
              <input
                type="radio"
                name="credential"
                value="invite"
                checked={credential === 'invite'}
                onChange={() => setCredential('invite')}
              />
              Send invite email
            </label>
            {credential === 'invite' ? (
              <p className="field__label" style={{ marginTop: 6, color: 'var(--muted)' }}>
                Note: invite emails won&apos;t deliver until custom SMTP is configured on
                production.
              </p>
            ) : null}
          </fieldset>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create User'}
            </button>
            <Link to="/admin/settings/users" className="btn btn--outline">
              Cancel
            </Link>
          </div>
        </Form>
      </SettingsShell>
    </>
  );
}
