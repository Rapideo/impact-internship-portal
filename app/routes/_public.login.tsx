// Admin sign-in — SP7 Phase D1 rebuild against Prototypes/PROTOTYPE/login.html.
//
// The loader + action are PRESERVED VERBATIM from the SP1 implementation —
// they handle Supabase password sign-in, role decode via getClaims(), and
// post-auth redirect. Only the default-export render body is rebuilt:
// composes <PublicNav> (with prototype's login-page link set) + <AuthShell>
// (the SP5 branded two-column shell, prototype's `.login` block) + the
// prototype's `.login__form-head` "Credentials / Demo — any value works"
// strip (the demo-note retained for dev clarity — see Deviations in PR) +
// the email/password fields wrapped in `.auth__field` + the
// `.auth__submit` action + an `.login__divider`-equivalent OR rail + a
// `.login__secondary` outbound link to /intern/assessments.

import { Form, Link, redirect, useActionData, useNavigation } from 'react-router';
import {
  createSupabaseServerClient,
  decodeRoleFromJwtPayload,
  getAuthContext,
} from '~/lib/auth.server';
import type { Route } from './+types/_public.login';
import { AuthShell } from '~/components/auth/AuthShell';
import { PublicNav } from '~/components/nav/PublicNav';
import { PublicFooter } from '~/components/nav/PublicFooter';

const LOGIN_NAV_LINKS = [
  { to: '/', label: 'Back to home' },
  { to: '/intern/assessments', label: 'Intern Assessments' },
] as const;

const LOGIN_FOOTER_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/intern/assessments', label: 'Intern Assessments' },
] as const;

export const meta: Route.MetaFunction = () => [
  { title: 'Sign in · IMPACT Portal' },
  {
    name: 'description',
    content: 'Administrator and employer sign-in for the IMPACT Internship Assessment Portal.',
  },
];

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
    <>
      <PublicNav links={LOGIN_NAV_LINKS} />

      <AuthShell
        microLabel="SIGN IN / 2026"
        title="Welcome back."
        sub="Administrator access for the IMPACT Internship Assessment Portal. Manage cohorts, run competency assessments, and record placement outcomes."
        facts={[
          { mono: '01', label: 'Intake — at placement' },
          { mono: '02', label: 'Competency — multi-phase' },
          { mono: '03', label: 'Outcomes — 90-day window' },
        ]}
      >
        <div className="auth__form-head">
          <span className="micro-label micro-label--navy">Credentials</span>
        </div>

        {actionData?.error ? (
          <div role="alert" className="auth__alert auth__alert--danger">
            {actionData.error}
          </div>
        ) : null}

        <Form method="post">
          <label className="auth__field" htmlFor="login-email">
            <span className="auth__field-label">Email</span>
            <input
              className="input"
              type="email"
              id="login-email"
              name="email"
              required
              autoComplete="email"
              placeholder="kortney@impact.org"
            />
          </label>

          <label className="auth__field" htmlFor="login-password">
            <span className="auth__field-label">Password</span>
            <input
              className="input"
              type="password"
              id="login-password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>

          <button type="submit" className="auth__submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
            <span className="btn__arrow"> &rarr;</span>
          </button>
        </Form>

        <div className="auth__recover-row">
          <Link to="/auth/forgot" className="auth__recover">
            Recover password &rarr;
          </Link>
        </div>

        <div className="auth__divider">
          <span>OR</span>
        </div>

        <Link to="/intern/assessments" className="auth__secondary">
          Intern? Go to Intern Assessments &rarr;
        </Link>
      </AuthShell>

      <PublicFooter links={LOGIN_FOOTER_LINKS} />
    </>
  );
}
