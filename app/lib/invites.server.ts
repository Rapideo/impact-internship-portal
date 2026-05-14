import { eq } from 'drizzle-orm';
import { getSupabaseAdmin } from './supabase-admin.server';
import { sendEmail } from './email.server';
import { db } from './db.server';
import { env } from './env.server';
import { employers, profiles } from '../../db/schema';
import { renderEmployerInvite } from '../emails/employer-invite';

export type EmployerAccountStatus = 'none' | 'pending' | 'active';

export async function inviteEmployerUser(args: {
  employerId: string;
  email: string;
}): Promise<{ userId: string }> {
  // 1. Confirm employer exists (defensive — admin UI also validates).
  const rows = await db
    .select({ id: employers.id, name: employers.name })
    .from(employers)
    .where(eq(employers.id, args.employerId))
    .limit(1);
  if (rows.length === 0) {
    throw new Error(`Employer not found: ${args.employerId}`);
  }
  const employer = rows[0]!;

  const admin = getSupabaseAdmin();
  const redirectTo = `${env.APP_URL}/auth/callback?next=/auth/accept`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(args.email, {
    redirectTo,
    data: { employer_id: args.employerId, role: 'employer' },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Supabase invite returned no user');

  // 2. Insert profiles row with role + employer_id so the JWT hook
  //    resolves claims on the user's first sign-in. Race-safe: if a trigger
  //    in sub-project 1 fires first, this becomes a no-op via ON CONFLICT.
  await db
    .insert(profiles)
    .values({ userId: data.user.id, role: 'employer', employerId: args.employerId })
    .onConflictDoNothing({ target: profiles.userId });

  // 3. Send branded invite email. Supabase's built-in invite email already
  //    went out via `inviteUserByEmail`, so this is purely the branded copy.
  //    With RESEND_API_KEY still a placeholder (set in Phase D), we treat the
  //    send as best-effort: log + continue, so the invite flow doesn't break
  //    in dev. The user can still accept via the Supabase email.
  const acceptUrl = redirectTo;
  const { subject, html, text } = renderEmployerInvite({
    employerName: employer.name,
    acceptUrl,
    programName: 'IMPACT Internship Program',
  });
  // TODO(sp5-phase-d): once RESEND_API_KEY is set, the catch can be tightened.
  try {
    await sendEmail({ to: args.email, subject, html, text });
  } catch (sendErr) {
    console.warn(
      `[invites] branded email send failed for ${args.email}; Supabase invite still delivered. Error: ${
        sendErr instanceof Error ? sendErr.message : String(sendErr)
      }`,
    );
  }

  return { userId: data.user.id };
}

export async function resendEmployerInvite(args: { employerId: string }): Promise<void> {
  const rows = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.employerId, args.employerId));
  if (rows.length === 0) throw new Error('No employer user to resend invite for');

  const admin = getSupabaseAdmin();
  const { data: userList } = await admin.auth.admin.listUsers();
  const user = userList.users.find((u) => u.id === rows[0]!.userId);
  if (!user || !user.email) throw new Error('User record incomplete');

  // Delete + re-invite is the cleanest way; alternatively
  // `generateLink({ type: 'invite' })` regenerates a token.
  await admin.auth.admin.deleteUser(user.id);
  await db.delete(profiles).where(eq(profiles.userId, user.id));
  await inviteEmployerUser({ employerId: args.employerId, email: user.email });
}

export async function revokeEmployerAccess(args: { employerId: string }): Promise<void> {
  const rows = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.employerId, args.employerId));
  const admin = getSupabaseAdmin();
  for (const row of rows) {
    const { error } = await admin.auth.admin.deleteUser(row.userId);
    if (error) throw new Error(`Failed to delete user ${row.userId}: ${error.message}`);
    // profiles row cascades on auth.users delete (FK onDelete: 'cascade').
  }
}

export async function employerAccountStatus(employerId: string): Promise<EmployerAccountStatus> {
  const rows = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.employerId, employerId))
    .limit(1);
  if (rows.length === 0) return 'none';

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw new Error(error.message);
  const user = data.users.find((u) => u.id === rows[0]!.userId);
  if (!user) return 'none';
  return user.email_confirmed_at ? 'active' : 'pending';
}
