// Forgot password — SP7 Phase D1 rebuild against Prototypes/PROTOTYPE/login.html
// (the Recover Password modal). Loader + action unchanged; default-export
// body now wraps the AuthShell in <PublicNav>/<PublicFooter> so the dark
// brand shell surrounds the recovery card. Copy mirrors the prototype's
// RECOVER PASSWORD modal ("Send a recovery link.").

import { Form, Link, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/_public.auth.forgot';
import { AuthShell } from '~/components/auth/AuthShell';
import { PublicNav } from '~/components/nav/PublicNav';
import { PublicFooter } from '~/components/nav/PublicFooter';
import { createSupabaseServerClient } from '~/lib/auth.server';
import { env } from '~/lib/env.server';

const NAV_LINKS = [
  { to: '/', label: 'Back to home' },
  { to: '/login', label: 'Sign in' },
] as const;

const FOOTER_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/login', label: 'Sign in' },
] as const;

export const meta: Route.MetaFunction = () => [{ title: 'Forgot password · IMPACT Portal' }];

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    return { error: 'Email is required.' };
  }

  const supabase = createSupabaseServerClient(request, headers);
  // Always return success — Supabase intentionally does not reveal whether
  // the email maps to an account, and we preserve that.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.APP_URL}/auth/callback?next=/auth/reset`,
  });
  return { sent: true };
}

export default function ForgotPasswordPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  if (actionData?.sent) {
    return (
      <>
        <PublicNav links={NAV_LINKS} />
        <AuthShell
          microLabel="RECOVER PASSWORD / 2026"
          title="Check your email."
          sub="If an account exists for that email, we’ve sent a branded reset link from IMPACT. It expires in 1 hour."
        >
          <p className="auth__secondary">
            <Link to="/login">Back to sign in &rarr;</Link>
          </p>
        </AuthShell>
        <PublicFooter links={FOOTER_LINKS} />
      </>
    );
  }

  return (
    <>
      <PublicNav links={NAV_LINKS} />
      <AuthShell
        microLabel="RECOVER PASSWORD / 2026"
        title="Send a recovery link."
        sub="Enter the admin email on file. We’ll send a password reset link within a few minutes. If you don’t receive it, contact your program lead."
      >
        <div className="auth__form-head">
          <span className="micro-label micro-label--navy">Recover</span>
        </div>

        {actionData?.error ? (
          <div role="alert" className="auth__alert auth__alert--danger">
            {actionData.error}
          </div>
        ) : null}

        <Form method="post">
          <label className="auth__field" htmlFor="forgot-email">
            <span className="auth__field-label">Admin Email</span>
            <input
              className="input"
              type="email"
              id="forgot-email"
              name="email"
              required
              autoComplete="email"
              placeholder="kortney@impact.org"
            />
          </label>
          <button type="submit" className="auth__submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send Link'}
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
