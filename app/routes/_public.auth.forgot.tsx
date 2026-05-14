import { Form, Link, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/_public.auth.forgot';
import { AuthShell } from '~/components/auth/AuthShell';
import { createSupabaseServerClient } from '~/lib/auth.server';
import { env } from '~/lib/env.server';

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
      <AuthShell
        microLabel="ACCOUNT / RECOVER / 2026"
        title="Check your email."
        sub="If an account exists for that email, we’ve sent a branded reset link from IMPACT. It expires in 1 hour."
      >
        <p className="auth__secondary">
          <Link to="/login">Back to sign in</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      microLabel="ACCOUNT / RECOVER / 2026"
      title="Forgot password?"
      sub="Enter your email and we’ll send a reset link. If you don’t receive it within a few minutes, contact your program lead."
    >
      {actionData?.error ? (
        <div role="alert" className="auth__alert auth__alert--danger">
          {actionData.error}
        </div>
      ) : null}

      <Form method="post">
        <label className="auth__field">
          <span className="auth__field-label">Email</span>
          <input className="input" type="email" name="email" required autoComplete="email" />
        </label>
        <button type="submit" className="auth__submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </Form>
      <p className="auth__secondary">
        <Link to="/login">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
