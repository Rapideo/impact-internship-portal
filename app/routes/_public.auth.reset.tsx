// Reset password — SP7 Phase D1 rebuild. Loader + action unchanged
// (Supabase updateUser + signOut + redirect to /login). Default-export body
// now wraps the AuthShell in <PublicNav>/<PublicFooter> for brand-shell
// parity with the rest of the auth flow.

import { Form, Link, redirect, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/_public.auth.reset';
import { AuthShell } from '~/components/auth/AuthShell';
import { PublicNav } from '~/components/nav/PublicNav';
import { PublicFooter } from '~/components/nav/PublicFooter';
import { createSupabaseServerClient, getAuthContext } from '~/lib/auth.server';

const NAV_LINKS = [
  { to: '/', label: 'Back to home' },
  { to: '/login', label: 'Sign in' },
] as const;

const FOOTER_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/login', label: 'Sign in' },
] as const;

export const meta: Route.MetaFunction = () => [{ title: 'Reset your password · IMPACT Portal' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth) {
    // No valid session — the recovery link is invalid or expired.
    throw redirect('/login', { headers });
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();
  const formData = await request.formData();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (password.length < 12) {
    return { error: 'Password must be at least 12 characters.' };
  }
  if (password !== confirm) {
    return { error: 'Passwords do not match.' };
  }

  const supabase = createSupabaseServerClient(request, headers);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: 'Could not update password. Please try again.' };
  }

  // Sign out the recovery session so the user actually has to enter the new
  // password. Without this the recovery session cookie remains valid and the
  // user is silently bounced from /login to their dashboard, skipping the
  // "use the new password" UX. (Behaviour inherited from the SP1 placeholder.)
  await supabase.auth.signOut();

  throw redirect('/login?reset=ok', { headers });
}

export default function ResetPasswordPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <>
      <PublicNav links={NAV_LINKS} />
      <AuthShell
        microLabel="RESET PASSWORD / 2026"
        title="Set a new password."
        sub="Choose a new password to regain access. At least 12 characters. You’ll use this to sign in next time."
      >
        <div className="auth__form-head">
          <span className="micro-label micro-label--navy">New Credentials</span>
        </div>

        {actionData?.error ? (
          <div role="alert" className="auth__alert auth__alert--danger">
            {actionData.error}
          </div>
        ) : null}

        <Form method="post">
          <label className="auth__field" htmlFor="reset-password">
            <span className="auth__field-label">New password</span>
            <input
              className="input"
              type="password"
              id="reset-password"
              name="password"
              required
              minLength={12}
              autoComplete="new-password"
            />
          </label>
          <label className="auth__field" htmlFor="reset-confirm">
            <span className="auth__field-label">Confirm password</span>
            <input
              className="input"
              type="password"
              id="reset-confirm"
              name="confirm"
              required
              minLength={12}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="auth__submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save new password'}
            <span className="btn__arrow"> &rarr;</span>
          </button>
        </Form>
        <p className="auth__secondary">
          <Link to="/login">Back to sign in &rarr;</Link>
        </p>
      </AuthShell>
      <PublicFooter links={FOOTER_LINKS} />
    </>
  );
}
