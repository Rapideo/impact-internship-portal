import { Form, Link, redirect, useActionData, useNavigation } from 'react-router';
import {
  createSupabaseServerClient,
  decodeRoleFromJwtPayload,
  getAuthContext,
} from '~/lib/auth.server';
import type { Route } from './+types/_public.login';

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (auth) {
    throw redirect(auth.role === 'admin' ? '/admin' : '/employer', { headers });
  }
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return { error: 'Invalid email or password.' };

  // Re-use this client — it holds the new session in memory. Calling getAuthContext()
  // would build a new client that reads stale cookies from the request and find no session.
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData) {
    return { error: 'Account configured incorrectly. Contact your administrator.' };
  }
  const auth = decodeRoleFromJwtPayload(claimsData.claims);
  if (!auth) {
    return { error: 'Account configured incorrectly. Contact your administrator.' };
  }
  throw redirect(auth.role === 'admin' ? '/admin' : '/employer', { headers });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <main
      style={{
        maxWidth: 420,
        margin: '4rem auto',
        padding: '0 1.5rem',
      }}
    >
      <h1 style={{ color: 'var(--navy)', marginBottom: '0.5rem' }}>Sign in</h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: '2rem' }}>
        IMPACT Internship Assessment Portal
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

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--navy-deep)' }}>Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
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
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </Form>

      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem' }}>
        <Link to="/auth/reset-password-request" style={{ color: 'var(--navy)' }}>
          Forgot password?
        </Link>
      </p>
    </main>
  );
}
