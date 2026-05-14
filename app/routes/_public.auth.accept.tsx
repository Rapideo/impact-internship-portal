import { Form, redirect, useActionData, useNavigation } from 'react-router';
import type { Route } from './+types/_public.auth.accept';
import { AuthShell } from '~/components/auth/AuthShell';
import { createSupabaseServerClient, getAuthContext } from '~/lib/auth.server';

export const meta: Route.MetaFunction = () => [{ title: 'Accept your invite · IMPACT Portal' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth) {
    // No session — most likely they bookmarked the page or the invite link
    // expired without hitting /auth/callback first. Send them to /login.
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
    return { error: 'Could not save password. Please try again.' };
  }

  // Re-read role from the (still-valid) session to route to the correct shell.
  const auth = await getAuthContext(request, headers);
  const dest = auth?.role === 'admin' ? '/admin' : '/employer';
  throw redirect(dest, { headers });
}

export default function AcceptInvitePage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <AuthShell
      microLabel="INVITE / ACCEPT / 2026"
      title="Set your password."
      sub="Welcome to IMPACT. Pick a strong password — at least 12 characters. You’ll use this to sign in alongside your email."
      facts={[
        { mono: '01', label: 'Read your cohorts and interns' },
        { mono: '02', label: 'Submit competency assessments' },
        { mono: '03', label: 'Complete Exit Employer Surveys' },
      ]}
    >
      <div className="auth__form-head">
        <span className="micro-label">CREDENTIALS</span>
        <span className="auth__demo-note">One account per employer</span>
      </div>

      {actionData?.error ? (
        <div role="alert" className="auth__alert auth__alert--danger">
          {actionData.error}
        </div>
      ) : null}

      <Form method="post">
        <label className="auth__field">
          <span className="auth__field-label">New password</span>
          <input
            className="input"
            type="password"
            name="password"
            required
            minLength={12}
            autoComplete="new-password"
          />
        </label>
        <label className="auth__field">
          <span className="auth__field-label">Confirm password</span>
          <input
            className="input"
            type="password"
            name="confirm"
            required
            minLength={12}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="auth__submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save password and sign in'}
        </button>
      </Form>
    </AuthShell>
  );
}
