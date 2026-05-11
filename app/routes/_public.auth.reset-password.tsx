import { Form, redirect, useActionData, useNavigation } from 'react-router';
import { createSupabaseServerClient, getAuthContext } from '~/lib/auth.server';
import type { Route } from './+types/_public.auth.reset-password';

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth) {
    // No valid session — the recovery link is invalid or expired.
    throw redirect('/login');
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (!password || password.length < 12) {
    return { error: 'Password must be at least 12 characters.' };
  }
  if (password !== confirm) {
    return { error: 'Passwords do not match.' };
  }

  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: 'Could not update password. Please try again.' };
  }

  // Sign out the recovery session so the user actually has to enter the new password.
  // Without this, the recovery session cookie remains valid and the user is silently
  // bounced from /login to their dashboard, skipping the "use the new password" UX.
  await supabase.auth.signOut();

  throw redirect('/login?reset=ok', { headers });
}

export default function ResetPassword() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>Set a new password</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem' }}>
        Choose a new password for your account.
      </p>

      <Form method="post" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--navy-deep)' }}>New password</span>
          <input
            type="password"
            name="password"
            required
            minLength={12}
            autoComplete="new-password"
            style={{
              padding: '0.625rem 0.75rem',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--navy-deep)' }}>Confirm password</span>
          <input
            type="password"
            name="confirm"
            required
            minLength={12}
            autoComplete="new-password"
            style={{
              padding: '0.625rem 0.75rem',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              fontSize: '1rem',
            }}
          />
        </label>

        {actionData?.error ? (
          <p style={{ color: '#b00020', fontSize: '0.875rem', margin: 0 }}>{actionData.error}</p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--navy)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '1rem',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? 'Updating…' : 'Update password'}
        </button>
      </Form>
    </main>
  );
}
