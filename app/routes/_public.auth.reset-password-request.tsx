import { Form, Link, useActionData, useNavigation } from 'react-router';
import { createSupabaseServerClient } from '~/lib/auth.server';
import { env } from '~/lib/env.server';
import type { Route } from './+types/_public.auth.reset-password-request';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '').trim();

  if (!email) {
    return { error: 'Email is required.' };
  }

  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  // Always return success — we don't reveal whether an account exists.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.APP_URL}/auth/callback?next=/auth/reset-password`,
  });

  return { sent: true };
}

export default function ResetPasswordRequest() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  if (actionData?.sent) {
    return (
      <main style={{ maxWidth: 420, margin: '4rem auto', padding: '0 1.5rem' }}>
        <h1 style={{ color: 'var(--navy)' }}>Check your email</h1>
        <p style={{ color: 'var(--ink-soft)' }}>
          If an account exists for that email, we&rsquo;ve sent a password reset link.
        </p>
        <p style={{ marginTop: '1.5rem', fontSize: '0.875rem' }}>
          <Link to="/login" style={{ color: 'var(--navy)' }}>
            Back to sign in
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>Reset password</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem' }}>
        Enter your email address and we&rsquo;ll send you a reset link.
      </p>

      <Form method="post" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--navy-deep)' }}>Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
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
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </button>
      </Form>

      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem' }}>
        <Link to="/login" style={{ color: 'var(--navy)' }}>
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
