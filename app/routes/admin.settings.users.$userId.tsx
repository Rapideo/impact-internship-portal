// app/routes/admin.settings.users.$userId.tsx
import { data, Form, Link, redirect, useActionData, useLoaderData } from 'react-router';
import type { Route } from './+types/admin.settings.users.$userId';
import { requireAdmin } from '~/lib/admin-guard.server';
import { createSupabaseServerClient } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { UUID_RE } from '~/lib/validation';
import { listAllEmployers } from '~/lib/admin-queries.server';
import {
  changeAccountRole,
  deactivateAccount,
  reactivateAccount,
  resendInvite,
  cancelInvite,
  getAccount,
  guardLockout,
  listAccounts,
  type AccountRole,
} from '~/lib/users.server';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import { UserStatusPill } from '~/components/UserStatusPill';

export const meta: Route.MetaFunction = () => [{ title: 'Manage User — Settings — IMPACT Admin' }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  if (!params.userId || !UUID_RE.test(params.userId))
    throw new Response('Bad Request', { status: 400, headers });
  const [account, employerList] = await Promise.all([
    getAccount(params.userId),
    listAllEmployers(db),
  ]);
  if (!account) throw new Response('Not found', { status: 404, headers });
  return data(
    { account, employers: employerList.map((e) => ({ id: e.id, name: e.name })) },
    { headers },
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const { headers } = await requireAdmin(request);
  const userId = params.userId;
  if (!userId || !UUID_RE.test(userId)) throw new Response('Bad Request', { status: 400, headers });

  const supabase = createSupabaseServerClient(request, headers);
  const { data: claims } = await supabase.auth.getClaims();
  const actingUserId = (claims?.claims?.sub as string | undefined) ?? '';

  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const backTo = `/admin/settings/users/${userId}`;

  try {
    if (intent === 'change-role') {
      const role = String(form.get('role') ?? '') as AccountRole;
      const employerId = role === 'employer' ? String(form.get('employerId') ?? '') || null : null;
      const block = guardLockout({
        accounts: await listAccounts(),
        actingUserId,
        targetUserId: userId,
        action: 'change-role',
        nextRole: role,
      });
      if (block) return data({ error: block }, { headers });
      await changeAccountRole({ userId, role, employerId });
      throw redirect(`${backTo}?updated=1`, { headers });
    }
    if (intent === 'deactivate') {
      const block = guardLockout({
        accounts: await listAccounts(),
        actingUserId,
        targetUserId: userId,
        action: 'deactivate',
      });
      if (block) return data({ error: block }, { headers });
      await deactivateAccount({ userId });
      throw redirect(`${backTo}?updated=1`, { headers });
    }
    if (intent === 'reactivate') {
      await reactivateAccount({ userId });
      throw redirect(`${backTo}?updated=1`, { headers });
    }
    if (intent === 'resend') {
      await resendInvite({ userId });
      throw redirect('/admin/settings/users?resent=1', { headers });
    }
    if (intent === 'cancel') {
      if (userId === actingUserId)
        return data({ error: "You can't remove your own account." }, { headers });
      await cancelInvite({ userId });
      throw redirect('/admin/settings/users?cancelled=1', { headers });
    }
    return data({ error: `Unknown action: ${intent}` }, { headers });
  } catch (err) {
    if (err instanceof Response) throw err;
    return data({ error: err instanceof Error ? err.message : 'Action failed.' }, { headers });
  }
}

export default function ManageUser() {
  const { account, employers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <>
      <PageHead
        breadcrumb="ADMIN / SETTINGS / USERS / MANAGE"
        title="MANAGE USER."
        sub={account.email}
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

        <div className="detail-header" style={{ marginTop: 0 }}>
          <h2 className="detail-header__title">{account.email}</h2>
          <UserStatusPill status={account.status} />
        </div>

        {/* Role + employer */}
        <Form method="post" style={{ maxWidth: 560, marginBottom: 28 }}>
          <input type="hidden" name="intent" value="change-role" />
          <div className="field">
            <label className="field__label" htmlFor="role">
              Role
            </label>
            <select className="input" id="role" name="role" defaultValue={account.role}>
              <option value="employer">Employer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label className="field__label" htmlFor="employerId">
              Employer (employer accounts only)
            </label>
            <select
              className="input"
              id="employerId"
              name="employerId"
              defaultValue={account.employerId ?? ''}
            >
              <option value="">— none (admin) —</option>
              {employers.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn--primary" style={{ marginTop: 18 }}>
            Save changes
          </button>
        </Form>

        {/* Lifecycle */}
        <div className="detail-header">
          <h2 className="detail-header__title">Account access</h2>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {account.status === 'deactivated' ? (
            <Form method="post">
              <input type="hidden" name="intent" value="reactivate" />
              <button className="btn btn--outline" type="submit">
                Reactivate
              </button>
            </Form>
          ) : (
            <Form method="post">
              <input type="hidden" name="intent" value="deactivate" />
              <button className="btn btn--ghost-danger" type="submit">
                Deactivate
              </button>
            </Form>
          )}
          {account.status === 'invited' ? (
            <>
              <Form method="post">
                <input type="hidden" name="intent" value="resend" />
                <button className="btn btn--outline" type="submit">
                  Resend invite
                </button>
              </Form>
              <Form method="post">
                <input type="hidden" name="intent" value="cancel" />
                <button className="btn btn--ghost-danger" type="submit">
                  Cancel invite
                </button>
              </Form>
            </>
          ) : null}
          <Link to="/admin/settings/users" className="btn btn--outline">
            Back to Users
          </Link>
        </div>
      </SettingsShell>
    </>
  );
}
