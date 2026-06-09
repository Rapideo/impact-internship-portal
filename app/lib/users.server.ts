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
  if (user.banned_until && new Date(user.banned_until).getTime() > now.getTime())
    return 'deactivated';
  if (!user.email_confirmed_at) return 'invited';
  return 'active';
}

/** Enforce the profiles check constraint at the app layer. Returns an error string or null. Pure. */
export function validateRoleEmployer(role: AccountRole, employerId: string | null): string | null {
  if (role === 'employer' && !employerId)
    return 'An employer must be selected for employer accounts.';
  if (role === 'admin' && employerId) return 'Admin accounts cannot be tied to an employer.';
  return null;
}

/** Join profile rows to auth users and derive status. Pure. */
export function mergeAccounts(
  profileRows: ProfileRow[],
  authUsers: AuthUserLike[],
  now: Date,
): AccountRow[] {
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
    action === 'deactivate'
      ? target?.role === 'admin'
      : target?.role === 'admin' && nextRole !== 'admin';

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
    .values({
      userId: data.user.id,
      role: args.role,
      employerId: args.role === 'admin' ? null : args.employerId,
    })
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
    .values({
      userId: data.user.id,
      role: args.role,
      employerId: args.role === 'admin' ? null : args.employerId,
    })
    .onConflictDoNothing({ target: profiles.userId });

  return { userId: data.user.id };
}

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
  await db
    .update(profiles)
    .set({ role: args.role, employerId })
    .where(eq(profiles.userId, args.userId));
}

export async function deactivateAccount(args: { userId: string }): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(args.userId, {
    ban_duration: DEACTIVATE_BAN,
  });
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
