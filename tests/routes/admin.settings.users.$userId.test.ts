// tests/routes/admin.settings.users.$userId.test.ts
// The "delete" intent is deactivate-first (client punchlist 9.11 #5, Matt's
// call 2026-09-14): a live account is refused with a message, a deactivated
// one is hard-deleted and the admin lands back on the list.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { action } from '~/routes/admin.settings.users.$userId';
import * as guard from '~/lib/admin-guard.server';
import * as auth from '~/lib/auth.server';
import * as users from '~/lib/users.server';
import type { AccountRow } from '~/lib/users.server';

const ACTING = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TARGET = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const target = (status: AccountRow['status']): AccountRow => ({
  userId: TARGET,
  email: 'e1@example.com',
  role: 'employer',
  employerId: 'e1',
  employerName: 'Riverbend',
  status,
});

function mockSession() {
  vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
    auth: { role: 'admin', employerId: null },
    headers: new Headers(),
  });
  vi.spyOn(auth, 'createSupabaseServerClient').mockReturnValue({
    auth: { getClaims: async () => ({ data: { claims: { sub: ACTING } } }) },
  } as never);
}

function deleteRequest() {
  const fd = new FormData();
  fd.set('intent', 'delete');
  return new Request(`https://x.test/admin/settings/users/${TARGET}`, {
    method: 'POST',
    body: fd,
  });
}

const run = () =>
  action({ request: deleteRequest(), params: { userId: TARGET }, context: {} } as never);

describe('admin.settings.users.$userId action — delete', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('refuses to delete an active account and does not call deleteAccount', async () => {
    mockSession();
    vi.spyOn(users, 'getAccount').mockResolvedValue(target('active'));
    const del = vi.spyOn(users, 'deleteAccount').mockResolvedValue();
    const res = (await run()) as { data: { error?: string } };
    expect(res.data.error).toBe('Deactivate the account before deleting it.');
    expect(del).not.toHaveBeenCalled();
  });

  it('deletes a deactivated account and redirects to the list', async () => {
    mockSession();
    vi.spyOn(users, 'getAccount').mockResolvedValue(target('deactivated'));
    const del = vi.spyOn(users, 'deleteAccount').mockResolvedValue();
    await expect(run()).rejects.toMatchObject({ status: 302 });
    expect(del).toHaveBeenCalledWith({ userId: TARGET });
    try {
      await run();
    } catch (e) {
      expect((e as Response).headers.get('Location')).toBe('/admin/settings/users?deleted=1');
    }
  });
});
