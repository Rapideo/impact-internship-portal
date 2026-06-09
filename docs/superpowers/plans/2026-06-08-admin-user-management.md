# Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Settings → Users area where admins create and manage admin + employer login accounts (password or invite), change role/employer, and reversibly deactivate them.

**Architecture:** A new `app/lib/users.server.ts` generalizes the existing `invites.server.ts` plumbing over the service-role Supabase admin API + the `profiles` table (the canonical set of app accounts; interns have no auth row, so they never appear). Status is **derived** from `auth.users` (no schema change): banned → Deactivated, unconfirmed → Invited, else Active. Three settings sub-routes (list / new / detail-edit) mirror the existing employer settings pages and reuse `PageHead` + `SettingsShell` + the `.assessments` table.

**Tech Stack:** React Router v7 (framework mode, config routing in `app/routes.ts`), Drizzle ORM (postgres-js), Supabase Auth admin API (`@supabase/supabase-js`), Vitest (unit/dom/rls projects), Playwright.

**Source spec:** `docs/superpowers/specs/2026-06-08-admin-user-management-design.md`

**Environment note (same as the Reports build):** this dev machine has **no Docker / no local Supabase**, so the `rls` Vitest project and Playwright can't run locally — write + commit those tests and let CI's `supabase start` job + Playwright job verify them. Local gate per task: `npm run typecheck` + `npx vitest run --project unit --project dom`. Never point DB tests at cloud impact-dev.

**Commit trailer:** every commit ends with
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

## File structure

- **Create** `app/lib/users.server.ts` — types, pure helpers (status/validation/merge/lockout), and the admin-API + `profiles` operations.
- **Create** `app/components/UserStatusPill.tsx` — small presentational status chip (inline token styles; no shared-CSS edit).
- **Create** `app/routes/admin.settings.users._index.tsx` — accounts list.
- **Create** `app/routes/admin.settings.users.new.tsx` — create form + action.
- **Create** `app/routes/admin.settings.users.$userId.tsx` — detail/edit + lifecycle actions.
- **Modify** `app/components/SettingsRail.tsx` — add the `users` tab + rail item under Employers.
- **Modify** `app/routes.ts` — register the three routes.
- **Tests:** `tests/lib/users-helpers.test.ts` (pure), `tests/lib/users.server.test.ts` (mock-based), `tests/components/UserStatusPill.test.tsx` (dom), `tests/e2e/users.spec.ts`.

---

## Task 1: SettingsRail — add the Users tab

**Files:**
- Modify: `app/components/SettingsRail.tsx`
- Test: `tests/components/SettingsRail.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/SettingsRail.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { SettingsRail } from '../../app/components/SettingsRail';

function renderRail(active: React.ComponentProps<typeof SettingsRail>['active']) {
  const Stub = createRoutesStub([{ path: '/', Component: () => <SettingsRail active={active} /> }]);
  return render(<Stub initialEntries={['/']} />);
}

describe('SettingsRail', () => {
  it('renders a Users item linking to the users settings page', () => {
    renderRail('users');
    const link = screen.getByRole('link', { name: 'Users' });
    expect(link).toHaveAttribute('href', '/admin/settings/users');
  });

  it('marks Users active when active="users"', () => {
    renderRail('users');
    expect(screen.getByRole('link', { name: 'Users' }).className).toContain('settings-rail__item--active');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project dom tests/components/SettingsRail.test.tsx`
Expected: FAIL — `'users'` is not assignable to `SettingsTab` / no Users link.

- [ ] **Step 3: Add the tab + item**

In `app/components/SettingsRail.tsx`, add `'users'` to the union and insert the item directly after Employers:

```tsx
export type SettingsTab = 'employers' | 'users' | 'questions' | 'phases' | 'barriers' | 'program-info';

const ITEMS: Array<{ tab: SettingsTab; to: string; label: string }> = [
  { tab: 'employers', to: '/admin/settings/employers', label: 'Employers' },
  { tab: 'users', to: '/admin/settings/users', label: 'Users' },
  { tab: 'questions', to: '/admin/settings/questions', label: 'Assessments' },
  { tab: 'phases', to: '/admin/settings/phases', label: 'Assessment Phases' },
  { tab: 'barriers', to: '/admin/settings/barriers', label: 'Barriers' },
  { tab: 'program-info', to: '/admin/settings/program-info', label: 'Program Info' },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project dom tests/components/SettingsRail.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/SettingsRail.tsx tests/components/SettingsRail.test.tsx
git commit -m "feat(users): add Users tab to the settings rail"
```

---

## Task 2: users.server.ts — types + pure helpers

Pure, dependency-free functions so the core logic is unit-tested without a DB.

**Files:**
- Create: `app/lib/users.server.ts`
- Test: `tests/lib/users-helpers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/users-helpers.test.ts
import { describe, it, expect } from 'vitest';
import {
  deriveAccountStatus,
  validateRoleEmployer,
  mergeAccounts,
  guardLockout,
  type AccountRow,
} from '../../app/lib/users.server';

const NOW = new Date('2026-06-08T00:00:00Z');

describe('deriveAccountStatus', () => {
  it('deactivated when banned_until is in the future', () => {
    expect(deriveAccountStatus({ banned_until: '2999-01-01T00:00:00Z', email_confirmed_at: '2026-01-01T00:00:00Z' }, NOW)).toBe('deactivated');
  });
  it('invited when email not confirmed', () => {
    expect(deriveAccountStatus({ banned_until: null, email_confirmed_at: null }, NOW)).toBe('invited');
  });
  it('active otherwise (and ignores a past ban)', () => {
    expect(deriveAccountStatus({ banned_until: '2000-01-01T00:00:00Z', email_confirmed_at: '2026-01-01T00:00:00Z' }, NOW)).toBe('active');
  });
});

describe('validateRoleEmployer', () => {
  it('requires an employer for employer accounts', () => {
    expect(validateRoleEmployer('employer', null)).toMatch(/employer must be selected/i);
  });
  it('forbids an employer on admin accounts', () => {
    expect(validateRoleEmployer('admin', 'emp-1')).toMatch(/cannot be tied/i);
  });
  it('accepts valid pairings', () => {
    expect(validateRoleEmployer('admin', null)).toBeNull();
    expect(validateRoleEmployer('employer', 'emp-1')).toBeNull();
  });
});

describe('mergeAccounts', () => {
  it('joins profile rows to auth users and derives status', () => {
    const rows = mergeAccounts(
      [{ userId: 'u1', role: 'admin', employerId: null, employerName: null },
       { userId: 'u2', role: 'employer', employerId: 'e1', employerName: 'Riverbend' }],
      [{ id: 'u1', email: 'a@x.org', banned_until: null, email_confirmed_at: '2026-01-01T00:00:00Z' },
       { id: 'u2', email: 'b@x.org', banned_until: null, email_confirmed_at: null }],
      NOW,
    );
    expect(rows).toEqual([
      { userId: 'u1', email: 'a@x.org', role: 'admin', employerId: null, employerName: null, status: 'active' },
      { userId: 'u2', email: 'b@x.org', role: 'employer', employerId: 'e1', employerName: 'Riverbend', status: 'invited' },
    ]);
  });
});

describe('guardLockout', () => {
  const accounts: AccountRow[] = [
    { userId: 'admin1', email: 'a1@x', role: 'admin', employerId: null, employerName: null, status: 'active' },
    { userId: 'admin2', email: 'a2@x', role: 'admin', employerId: null, employerName: null, status: 'active' },
    { userId: 'emp1', email: 'e1@x', role: 'employer', employerId: 'e1', employerName: 'R', status: 'active' },
  ];
  it('blocks deactivating your own account', () => {
    expect(guardLockout({ accounts, actingUserId: 'admin1', targetUserId: 'admin1', action: 'deactivate' })).toMatch(/your own/i);
  });
  it('blocks demoting your own admin account', () => {
    expect(guardLockout({ accounts, actingUserId: 'admin1', targetUserId: 'admin1', action: 'change-role', nextRole: 'employer' })).toMatch(/your own/i);
  });
  it('blocks removing the last active admin', () => {
    const oneAdmin = accounts.filter((a) => a.userId !== 'admin2');
    expect(guardLockout({ accounts: oneAdmin, actingUserId: 'emp1', targetUserId: 'admin1', action: 'deactivate' })).toMatch(/last/i);
  });
  it('allows deactivating an employer', () => {
    expect(guardLockout({ accounts, actingUserId: 'admin1', targetUserId: 'emp1', action: 'deactivate' })).toBeNull();
  });
  it('allows demoting one admin when another active admin remains', () => {
    expect(guardLockout({ accounts, actingUserId: 'admin1', targetUserId: 'admin2', action: 'change-role', nextRole: 'employer' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit tests/lib/users-helpers.test.ts`
Expected: FAIL — cannot resolve `../../app/lib/users.server`.

- [ ] **Step 3: Write the module skeleton + pure helpers**

```ts
// app/lib/users.server.ts
// Admin user-management: create / list / change-role / deactivate for admin +
// employer login accounts. Generalizes invites.server.ts over the service-role
// Supabase admin API + the profiles table (the canonical set of app accounts).
// Interns have no auth.users/profiles row, so they never appear here.
//
// Status is DERIVED from auth.users (no schema change): banned -> deactivated,
// unconfirmed -> invited, else active. Admin-only; the service-role client is
// used server-side only (callers are gated by requireAdmin / the admin layout).

import { eq } from 'drizzle-orm';
import { getSupabaseAdmin } from './supabase-admin.server';
import { db } from './db.server';
import { env } from './env.server';
import { employers, profiles } from '../../db/schema';

export type AccountRole = 'admin' | 'employer';
export type AccountStatus = 'active' | 'invited' | 'deactivated';

export interface AccountRow {
  userId: string;
  email: string;
  role: AccountRole;
  employerId: string | null;
  employerName: string | null;
  status: AccountStatus;
}

export interface ProfileRow {
  userId: string;
  role: AccountRole;
  employerId: string | null;
  employerName: string | null;
}

/** Minimal shape of the auth.users fields we read (avoids depending on the SDK User type). */
export interface AuthUserLike {
  id?: string;
  email?: string | null;
  banned_until?: string | null;
  email_confirmed_at?: string | null;
}

/** A ~100-year ban disables login without deleting the account; 'none' restores it. */
export const DEACTIVATE_BAN = '876000h';

/** Derive display status from an auth.users record. Pure. */
export function deriveAccountStatus(
  user: Pick<AuthUserLike, 'banned_until' | 'email_confirmed_at'>,
  now: Date,
): AccountStatus {
  if (user.banned_until && new Date(user.banned_until).getTime() > now.getTime()) return 'deactivated';
  if (!user.email_confirmed_at) return 'invited';
  return 'active';
}

/** Enforce the profiles check constraint at the app layer. Returns an error string or null. Pure. */
export function validateRoleEmployer(role: AccountRole, employerId: string | null): string | null {
  if (role === 'employer' && !employerId) return 'An employer must be selected for employer accounts.';
  if (role === 'admin' && employerId) return 'Admin accounts cannot be tied to an employer.';
  return null;
}

/** Join profile rows to auth users and derive status. Pure. */
export function mergeAccounts(profileRows: ProfileRow[], authUsers: AuthUserLike[], now: Date): AccountRow[] {
  const byId = new Map(authUsers.map((u) => [u.id ?? '', u]));
  return profileRows.map((p) => {
    const u = byId.get(p.userId);
    return {
      userId: p.userId,
      email: u?.email ?? '',
      role: p.role,
      employerId: p.employerId,
      employerName: p.employerName,
      status: deriveAccountStatus(u ?? {}, now),
    };
  });
}

/** Prevent self-lockout and removing the last active admin. Returns an error string or null. Pure. */
export function guardLockout(opts: {
  accounts: AccountRow[];
  actingUserId: string;
  targetUserId: string;
  action: 'deactivate' | 'change-role';
  nextRole?: AccountRole;
}): string | null {
  const { accounts, actingUserId, targetUserId, action, nextRole } = opts;
  const target = accounts.find((a) => a.userId === targetUserId);
  const losesAdmin =
    action === 'deactivate' ? target?.role === 'admin' : target?.role === 'admin' && nextRole !== 'admin';

  if (targetUserId === actingUserId && (action === 'deactivate' || losesAdmin)) {
    return "You can't change your own account's access.";
  }
  if (losesAdmin && target?.status === 'active') {
    const remaining = accounts.filter(
      (a) => a.role === 'admin' && a.status === 'active' && a.userId !== targetUserId,
    ).length;
    if (remaining < 1) return 'You cannot remove the last active admin.';
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit tests/lib/users-helpers.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add app/lib/users.server.ts tests/lib/users-helpers.test.ts
git commit -m "feat(users): add account types and pure helpers"
```

---

## Task 3: users.server.ts — list + create (password / invite)

**Files:**
- Modify: `app/lib/users.server.ts`
- Test: `tests/lib/users.server.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/users.server.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAdmin, mockDb } = vi.hoisted(() => ({
  mockAdmin: {
    auth: {
      admin: {
        createUser: vi.fn(),
        inviteUserByEmail: vi.fn(),
        updateUserById: vi.fn(),
        deleteUser: vi.fn(),
        listUsers: vi.fn(),
      },
    },
  },
  mockDb: {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoNothing: vi.fn().mockResolvedValue([]) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
  },
}));

vi.mock('~/lib/supabase-admin.server', () => ({ getSupabaseAdmin: () => mockAdmin }));
vi.mock('~/lib/db.server', () => ({ db: mockDb }));
vi.mock('~/lib/env.server', () => ({ env: { APP_URL: 'http://localhost:5173' } }));

import { createAccountWithPassword, inviteAccount } from '~/lib/users.server';

beforeEach(() => vi.clearAllMocks());

describe('createAccountWithPassword', () => {
  it('rejects an employer with no employer_id (no API call)', async () => {
    await expect(
      createAccountWithPassword({ email: 'x@y.org', role: 'employer', employerId: null, password: 'pw123456' }),
    ).rejects.toThrow(/employer must be selected/i);
    expect(mockAdmin.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it('creates a confirmed admin and inserts a profile', async () => {
    mockAdmin.auth.admin.createUser.mockResolvedValue({ data: { user: { id: 'u9' } }, error: null });
    const res = await createAccountWithPassword({ email: 'a@y.org', role: 'admin', employerId: null, password: 'pw123456' });
    expect(res).toEqual({ userId: 'u9' });
    expect(mockAdmin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@y.org', password: 'pw123456', email_confirm: true }),
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('surfaces a duplicate-email error from Supabase', async () => {
    mockAdmin.auth.admin.createUser.mockResolvedValue({ data: { user: null }, error: { message: 'already been registered' } });
    await expect(
      createAccountWithPassword({ email: 'dupe@y.org', role: 'admin', employerId: null, password: 'pw123456' }),
    ).rejects.toThrow(/already/i);
  });
});

describe('inviteAccount', () => {
  it('invites with role + employer_id metadata and inserts a profile', async () => {
    mockAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({ data: { user: { id: 'u7' } }, error: null });
    const res = await inviteAccount({ email: 'e@y.org', role: 'employer', employerId: 'emp-1' });
    expect(res).toEqual({ userId: 'u7' });
    expect(mockAdmin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      'e@y.org',
      expect.objectContaining({ data: { role: 'employer', employer_id: 'emp-1' } }),
    );
    expect(mockDb.insert).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit tests/lib/users.server.test.ts`
Expected: FAIL — `createAccountWithPassword` / `inviteAccount` not exported.

- [ ] **Step 3: Implement list + create**

Append to `app/lib/users.server.ts`:

```ts
/** Fetch profile rows joined to employer names. */
export async function queryProfileRows(): Promise<ProfileRow[]> {
  const rows = await db
    .select({
      userId: profiles.userId,
      role: profiles.role,
      employerId: profiles.employerId,
      employerName: employers.name,
    })
    .from(profiles)
    .leftJoin(employers, eq(employers.id, profiles.employerId));
  return rows.map((r) => ({
    userId: r.userId,
    role: r.role as AccountRole,
    employerId: r.employerId,
    employerName: r.employerName ?? null,
  }));
}

/** All admin + employer accounts with derived status. */
export async function listAccounts(): Promise<AccountRow[]> {
  const admin = getSupabaseAdmin();
  const [profileRows, userList] = await Promise.all([
    queryProfileRows(),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  if (userList.error) throw new Error(userList.error.message);
  return mergeAccounts(profileRows, userList.data.users as AuthUserLike[], new Date());
}

export async function createAccountWithPassword(args: {
  email: string;
  role: AccountRole;
  employerId: string | null;
  password: string;
}): Promise<{ userId: string }> {
  const invalid = validateRoleEmployer(args.role, args.employerId);
  if (invalid) throw new Error(invalid);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email: args.email,
    password: args.password,
    email_confirm: true,
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Supabase returned no user');

  await db
    .insert(profiles)
    .values({ userId: data.user.id, role: args.role, employerId: args.role === 'admin' ? null : args.employerId })
    .onConflictDoNothing({ target: profiles.userId });

  return { userId: data.user.id };
}

export async function inviteAccount(args: {
  email: string;
  role: AccountRole;
  employerId: string | null;
}): Promise<{ userId: string }> {
  const invalid = validateRoleEmployer(args.role, args.employerId);
  if (invalid) throw new Error(invalid);

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(args.email, {
    redirectTo: `${env.APP_URL}/auth/callback?next=/auth/accept`,
    data: { role: args.role, employer_id: args.employerId },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Supabase invite returned no user');

  await db
    .insert(profiles)
    .values({ userId: data.user.id, role: args.role, employerId: args.role === 'admin' ? null : args.employerId })
    .onConflictDoNothing({ target: profiles.userId });

  return { userId: data.user.id };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit tests/lib/users.server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/users.server.ts tests/lib/users.server.test.ts
git commit -m "feat(users): add listAccounts + create (password/invite)"
```

---

## Task 4: users.server.ts — change role, deactivate, invite lifecycle

**Files:**
- Modify: `app/lib/users.server.ts`
- Modify: `tests/lib/users.server.test.ts`

- [ ] **Step 1: Add the failing tests**

Add `changeAccountRole, deactivateAccount, reactivateAccount, getAccount` to the import in `tests/lib/users.server.test.ts`, then append:

```ts
describe('changeAccountRole', () => {
  it('clears employer_id when changing to admin', async () => {
    await changeAccountRole({ userId: 'u1', role: 'admin', employerId: 'emp-1' });
    const setArg = mockDb.update.mock.results[0]!.value.set.mock.calls[0][0];
    expect(setArg).toEqual({ role: 'admin', employerId: null });
  });
  it('keeps employer_id for employer and rejects a missing one', async () => {
    await expect(changeAccountRole({ userId: 'u1', role: 'employer', employerId: null })).rejects.toThrow(/employer must be selected/i);
  });
});

describe('deactivate / reactivate', () => {
  it('deactivate bans the user', async () => {
    mockAdmin.auth.admin.updateUserById.mockResolvedValue({ data: {}, error: null });
    await deactivateAccount({ userId: 'u1' });
    expect(mockAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('u1', { ban_duration: '876000h' });
  });
  it('reactivate lifts the ban', async () => {
    mockAdmin.auth.admin.updateUserById.mockResolvedValue({ data: {}, error: null });
    await reactivateAccount({ userId: 'u1' });
    expect(mockAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('u1', { ban_duration: 'none' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project unit tests/lib/users.server.test.ts`
Expected: FAIL — new functions not exported.

- [ ] **Step 3: Implement the operations**

Append to `app/lib/users.server.ts`:

```ts
export async function getAccount(userId: string): Promise<AccountRow | null> {
  const all = await listAccounts();
  return all.find((a) => a.userId === userId) ?? null;
}

export async function changeAccountRole(args: {
  userId: string;
  role: AccountRole;
  employerId: string | null;
}): Promise<void> {
  const employerId = args.role === 'admin' ? null : args.employerId;
  const invalid = validateRoleEmployer(args.role, employerId);
  if (invalid) throw new Error(invalid);
  await db.update(profiles).set({ role: args.role, employerId }).where(eq(profiles.userId, args.userId));
}

export async function deactivateAccount(args: { userId: string }): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(args.userId, { ban_duration: DEACTIVATE_BAN });
  if (error) throw new Error(error.message);
}

export async function reactivateAccount(args: { userId: string }): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(args.userId, { ban_duration: 'none' });
  if (error) throw new Error(error.message);
}

/** Cancel a pending invite (or remove an account): delete the auth user; profiles cascades. */
export async function cancelInvite(args: { userId: string }): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.deleteUser(args.userId);
  if (error) throw new Error(error.message);
}

/** Resend an invite: delete + re-invite using the existing profile's role/employer. */
export async function resendInvite(args: { userId: string }): Promise<void> {
  const account = await getAccount(args.userId);
  if (!account || !account.email) throw new Error('Account not found');
  await cancelInvite({ userId: args.userId });
  await inviteAccount({ email: account.email, role: account.role, employerId: account.employerId });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run --project unit tests/lib/users.server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/users.server.ts tests/lib/users.server.test.ts
git commit -m "feat(users): add change-role, deactivate, and invite lifecycle"
```

---

## Task 5: UserStatusPill component

**Files:**
- Create: `app/components/UserStatusPill.tsx`
- Test: `tests/components/UserStatusPill.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/UserStatusPill.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserStatusPill } from '../../app/components/UserStatusPill';

describe('UserStatusPill', () => {
  it('renders the human label for each status', () => {
    const { rerender } = render(<UserStatusPill status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    rerender(<UserStatusPill status="invited" />);
    expect(screen.getByText('Invited')).toBeInTheDocument();
    rerender(<UserStatusPill status="deactivated" />);
    expect(screen.getByText('Deactivated')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project dom tests/components/UserStatusPill.test.tsx`
Expected: FAIL — cannot resolve `UserStatusPill`.

- [ ] **Step 3: Write the component**

```tsx
// app/components/UserStatusPill.tsx
// Small status chip for the Users area. Inline token styles keep it self-
// contained (no shared-CSS edit). Colors map to the brand tokens.
import type { CSSProperties } from 'react';
import type { AccountStatus } from '~/lib/users.server';

const STYLE: Record<AccountStatus, { label: string; bg: string; color: string }> = {
  active: { label: 'Active', bg: 'rgba(27,143,74,.14)', color: 'var(--success)' },
  invited: { label: 'Invited', bg: 'rgba(255,215,31,.22)', color: '#8a6a00' },
  deactivated: { label: 'Deactivated', bg: 'var(--canvas-alt)', color: 'var(--muted)' },
};

export function UserStatusPill({ status }: { status: AccountStatus }) {
  const s = STYLE[status];
  const style: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '.3px',
    padding: '3px 10px',
    borderRadius: 20,
    background: s.bg,
    color: s.color,
    whiteSpace: 'nowrap',
  };
  return <span style={style}>{s.label}</span>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project dom tests/components/UserStatusPill.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/components/UserStatusPill.tsx tests/components/UserStatusPill.test.tsx
git commit -m "feat(users): add UserStatusPill component"
```

---

## Task 6: Users list route + route registration

**Files:**
- Create: `app/routes/admin.settings.users._index.tsx`
- Modify: `app/routes.ts`

- [ ] **Step 1: Create the list route**

```tsx
// app/routes/admin.settings.users._index.tsx
import { data, Link, useLoaderData, useNavigate } from 'react-router';
import type { Route } from './+types/admin.settings.users._index';
import { requireAdmin } from '~/lib/admin-guard.server';
import { listAccounts } from '~/lib/users.server';
import { PageHead } from '~/components/PageHead';
import { SettingsShell } from '~/components/SettingsShell';
import { EmptyRow } from '~/components/EmptyRow';
import { UserStatusPill } from '~/components/UserStatusPill';

export const meta: Route.MetaFunction = () => [{ title: 'Users — Settings — IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const accounts = await listAccounts();
  return data({ accounts }, { headers });
}

export default function UsersList() {
  const { accounts } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  return (
    <>
      <PageHead
        breadcrumb="ADMIN / SETTINGS / USERS"
        title="USERS."
        sub="Administrator and employer login accounts. Employer accounts are attributed to a specific employer."
      />
      <SettingsShell active="users">
        <div className="detail-header" style={{ marginTop: 0 }}>
          <h2 className="detail-header__title">Users</h2>
          <Link to="/admin/settings/users/new" className="btn btn--primary">
            + New User
          </Link>
        </div>
        <table className="assessments">
          <thead>
            <tr>
              <th style={{ width: '34%' }}>Email</th>
              <th style={{ width: '12%' }}>Role</th>
              <th style={{ width: '28%' }}>Employer</th>
              <th style={{ width: '14%' }}>Status</th>
              <th style={{ width: '12%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <EmptyRow colSpan={5} message="No users yet." />
            ) : (
              accounts.map((a) => (
                <tr
                  key={a.userId}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/settings/users/${a.userId}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/admin/settings/users/${a.userId}`);
                    }
                  }}
                >
                  <td>{a.email}</td>
                  <td>{a.role === 'admin' ? 'Admin' : 'Employer'}</td>
                  <td>{a.employerName ?? '—'}</td>
                  <td>
                    <UserStatusPill status={a.status} />
                  </td>
                  <td>
                    <Link
                      to={`/admin/settings/users/${a.userId}`}
                      className="action-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </SettingsShell>
    </>
  );
}
```

- [ ] **Step 2: Register the three routes**

In `app/routes.ts`, inside the `layout('routes/admin.tsx', [...])` block, immediately after the `route('admin/settings/program-info', 'routes/admin.settings.program-info.tsx'),` line, add:

```ts
    route('admin/settings/users', 'routes/admin.settings.users._index.tsx'),
    route('admin/settings/users/new', 'routes/admin.settings.users.new.tsx'),
    route('admin/settings/users/:userId', 'routes/admin.settings.users.$userId.tsx'),
```

(The `new` and `:userId` route modules are created in Tasks 7–8; `typecheck`/`build` won't be green until then, so verify at the end of Task 8.)

- [ ] **Step 3: Commit**

```bash
git add app/routes/admin.settings.users._index.tsx app/routes.ts
git commit -m "feat(users): add users list route and register routes"
```

---

## Task 7: New User route (create form + action)

**Files:**
- Create: `app/routes/admin.settings.users.new.tsx`

- [ ] **Step 1: Create the route**

```tsx
// app/routes/admin.settings.users.new.tsx
import { data, Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
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
  if (role === 'employer' && !employerId) return data({ error: 'Select an employer for employer accounts.' }, { headers });

  try {
    if (credential === 'invite') {
      await inviteAccount({ email, role, employerId });
    } else {
      if (password.length < 8) return data({ error: 'Password must be at least 8 characters.' }, { headers });
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
      <PageHead breadcrumb="ADMIN / SETTINGS / USERS / NEW" title="NEW USER." sub="Create an admin or employer login account." />
      <SettingsShell active="users">
        {actionData?.error ? (
          <div role="alert" className="auth__alert auth__alert--danger" style={{ marginBottom: 16 }}>
            {actionData.error}
          </div>
        ) : null}
        <Form method="post" style={{ maxWidth: 560 }}>
          <div className="field">
            <label className="field__label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required autoComplete="off" placeholder="name@organization.org" />
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label className="field__label" htmlFor="role">Role</label>
            <select className="input" id="role" name="role" value={role} onChange={(e) => setRole(e.target.value as AccountRole)}>
              <option value="employer">Employer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {role === 'employer' ? (
            <div className="field" style={{ marginTop: 16 }}>
              <label className="field__label" htmlFor="employerId">Employer</label>
              <select className="input" id="employerId" name="employerId" required>
                <option value="">Select an employer…</option>
                {employers.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
          ) : null}

          <fieldset className="field" style={{ marginTop: 18, border: 0, padding: 0 }}>
            <legend className="field__label">Credentials</legend>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="radio" name="credential" value="password" checked={credential === 'password'} onChange={() => setCredential('password')} />
              Set a password now
            </label>
            {credential === 'password' ? (
              <input className="input" name="password" type="text" minLength={8} placeholder="At least 8 characters" style={{ marginTop: 8 }} />
            ) : null}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
              <input type="radio" name="credential" value="invite" checked={credential === 'invite'} onChange={() => setCredential('invite')} />
              Send invite email
            </label>
            {credential === 'invite' ? (
              <p className="field__label" style={{ marginTop: 6, color: 'var(--muted)' }}>
                Note: invite emails won’t deliver until custom SMTP is configured on production.
              </p>
            ) : null}
          </fieldset>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create User'}
            </button>
            <Link to="/admin/settings/users" className="btn btn--outline">Cancel</Link>
          </div>
        </Form>
      </SettingsShell>
    </>
  );
}
```

- [ ] **Step 2: Verify typecheck (routes now resolve for new + list)**

Run: `npm run typecheck`
Expected: PASS for `admin.settings.users.new` (the `$userId` route is still missing, so its module import may warn — finish Task 8 before the full build). If typecheck errors only reference `admin.settings.users.$userId`, that's expected here.

- [ ] **Step 3: Commit**

```bash
git add app/routes/admin.settings.users.new.tsx
git commit -m "feat(users): add new-user route (password or invite)"
```

---

## Task 8: User detail route (role change + lifecycle) + full verify

**Files:**
- Create: `app/routes/admin.settings.users.$userId.tsx`

- [ ] **Step 1: Create the route**

```tsx
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
  if (!params.userId || !UUID_RE.test(params.userId)) throw new Response('Bad Request', { status: 400, headers });
  const [account, employerList] = await Promise.all([getAccount(params.userId), listAllEmployers(db)]);
  if (!account) throw new Response('Not found', { status: 404, headers });
  return data({ account, employers: employerList.map((e) => ({ id: e.id, name: e.name })) }, { headers });
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
      const block = guardLockout({ accounts: await listAccounts(), actingUserId, targetUserId: userId, action: 'change-role', nextRole: role });
      if (block) return data({ error: block }, { headers });
      await changeAccountRole({ userId, role, employerId });
      throw redirect(`${backTo}?updated=1`, { headers });
    }
    if (intent === 'deactivate') {
      const block = guardLockout({ accounts: await listAccounts(), actingUserId, targetUserId: userId, action: 'deactivate' });
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
      if (userId === actingUserId) return data({ error: "You can't remove your own account." }, { headers });
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
      <PageHead breadcrumb="ADMIN / SETTINGS / USERS / MANAGE" title="MANAGE USER." sub={account.email} />
      <SettingsShell active="users">
        {actionData?.error ? (
          <div role="alert" className="auth__alert auth__alert--danger" style={{ marginBottom: 16 }}>
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
            <label className="field__label" htmlFor="role">Role</label>
            <select className="input" id="role" name="role" defaultValue={account.role}>
              <option value="employer">Employer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label className="field__label" htmlFor="employerId">Employer (employer accounts only)</label>
            <select className="input" id="employerId" name="employerId" defaultValue={account.employerId ?? ''}>
              <option value="">— none (admin) —</option>
              {employers.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn--primary" style={{ marginTop: 18 }}>Save changes</button>
        </Form>

        {/* Lifecycle */}
        <div className="detail-header"><h2 className="detail-header__title">Account access</h2></div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {account.status === 'deactivated' ? (
            <Form method="post"><input type="hidden" name="intent" value="reactivate" /><button className="btn btn--outline" type="submit">Reactivate</button></Form>
          ) : (
            <Form method="post"><input type="hidden" name="intent" value="deactivate" /><button className="btn btn--ghost-danger" type="submit">Deactivate</button></Form>
          )}
          {account.status === 'invited' ? (
            <>
              <Form method="post"><input type="hidden" name="intent" value="resend" /><button className="btn btn--outline" type="submit">Resend invite</button></Form>
              <Form method="post"><input type="hidden" name="intent" value="cancel" /><button className="btn btn--ghost-danger" type="submit">Cancel invite</button></Form>
            </>
          ) : null}
          <Link to="/admin/settings/users" className="btn btn--outline">Back to Users</Link>
        </div>
      </SettingsShell>
    </>
  );
}
```

- [ ] **Step 2: Full local verification**

```bash
npm run typecheck
npm run build
npx vitest run --project unit --project dom
```
Expected: typecheck + build PASS; unit/dom green (the new `users-helpers`, `users.server`, `SettingsRail`, `UserStatusPill` tests pass alongside the existing suite; pre-existing `(live DB)` unit tests stay red only because there is no local DB).

- [ ] **Step 3: Commit**

```bash
git add app/routes/admin.settings.users.$userId.tsx
git commit -m "feat(users): add manage-user route (role change + lifecycle)"
```

---

## Task 9: E2E + docs + finish

**Files:**
- Create: `tests/e2e/users.spec.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write the e2e spec**

```ts
// tests/e2e/users.spec.ts
// Admin user-management happy path. Mirrors the login flow in
// tests/e2e/admin-crud.spec.ts. Runs in CI (supabase start); not runnable
// locally without Docker. Uses a unique email per run so reruns don't collide.
import { test, expect } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';

async function signInAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test('admin creates an employer user via the password path and sees it listed', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/admin/settings/users');
  await expect(page.getByRole('heading', { name: /users/i }).first()).toBeVisible();

  await page.getByRole('link', { name: /\+ New User/i }).click();
  await expect(page).toHaveURL(/\/admin\/settings\/users\/new/);

  const email = `e2e+${Date.now()}@example.com`;
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/role/i).selectOption('employer');
  await page.getByLabel(/employer/i).selectOption({ index: 1 });
  await page.getByLabel(/set a password now/i).check();
  await page.getByPlaceholder(/at least 8 characters/i).fill('Tk7mQ2x9pLa');
  await page.getByRole('button', { name: /create user/i }).click();

  await expect(page).toHaveURL(/\/admin\/settings\/users/);
  await expect(page.getByText(email)).toBeVisible();
});
```

- [ ] **Step 2: Commit the spec**

```bash
git add tests/e2e/users.spec.ts
git commit -m "test(users): add user-management e2e happy path"
```

- [ ] **Step 3: Note it in CLAUDE.md**

In `CLAUDE.md`, add a short sentence near the SP6/admin notes that **admin User Management** lives at `/admin/settings/users` (`app/lib/users.server.ts`): create admin/employer accounts (password or invite), change role/employer, and reversibly deactivate (Supabase ban); status is derived from `auth.users` (no schema change). Keep it to one or two sentences consistent with surrounding prose.

- [ ] **Step 4: Commit docs**

```bash
git add CLAUDE.md
git commit -m "docs(users): note admin user-management area"
```

- [ ] **Step 5: Finish the branch**

Run the full local gate (`npm run lint && npm run typecheck && npm run build`), then use the `superpowers:finishing-a-development-branch` skill to push `feat/admin-user-management` and open a PR. CI's `supabase start` job + Playwright verify the DB-backed `users.server` paths and the e2e. Squash-merge once green (auto-deploys to prod).

---

## Self-review notes (author)

- **Spec coverage:** Settings→Users placement under Employers (Task 1); list with Email/Role/Employer/Status/Actions (Task 6); create password-or-invite with employer attribution + SMTP caveat (Tasks 3, 7); change role/employer (Tasks 4, 8); reversible deactivate via ban (Tasks 4, 8); resend/cancel invite (Tasks 4, 8); status derived from auth.users, no schema change (Task 2); safety rails self + last-admin (Task 2 `guardLockout`, enforced in Task 8); admin-gating + UUID validation + header threading (Tasks 6–8); tests at unit/dom/e2e (Tasks 1–5, 9). Existing per-employer Account card left untouched (no task modifies it).
- **Type consistency:** `AccountRole`/`AccountStatus`/`AccountRow`/`ProfileRow` defined once (Task 2), consumed unchanged in Tasks 3–8; `guardLockout` signature matches its call sites (Task 8); `DEACTIVATE_BAN = '876000h'` matches the deactivate test (Task 4).
- **Placeholder scan:** none — every code step is complete.
- **Known v1 limitation (from spec):** the legacy per-employer card assumes one account per employer; the central area is the source of truth for multi-account employers.
