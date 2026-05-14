// Intern self-assessment shell layout. Loads the current identity cookie (may
// be null) so nested routes can use it via Outlet context if needed, and renders
// a branded top nav above the route content.

import { Outlet } from 'react-router';
import type { Route } from './+types/_public.intern';
import { getCurrentInternIdentity } from '~/lib/intern-identity.server';

export async function loader({ request }: Route.LoaderArgs) {
  const identity = await getCurrentInternIdentity(request);
  return { identity };
}

export default function InternLayout() {
  return (
    <div className="public-shell">
      <header className="nav">
        <div className="nav__inner">
          <a
            href="/"
            className="wordmark"
            aria-label="IMPACT — Expand Your Opportunities"
            style={{
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            <strong>IMPACT</strong>
          </a>
          <nav className="nav__links">
            <a href="/intern/assessments" className="nav__link">
              My Assessments
            </a>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
