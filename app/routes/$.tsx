// 404 catch-all — SP7 Phase D1 rebuild against Prototypes/PROTOTYPE/404.html.
//
// The loader throws a Response so React Router escalates immediately to
// ErrorBoundary. Since this is a root-level splat (NOT under _public.tsx),
// the public shell does NOT inherit automatically — we duplicate
// <PublicNav>/<PublicFooter> inside the ErrorBoundary so the dark brand
// shell still wraps the 404 page. Body uses <ConfirmReceipt variant="error">
// which ships the prototype's `.confirm__badge` X-glyph + muted styling.

import { Link } from 'react-router';
import type { Route } from './+types/$';
import { ConfirmReceipt } from '~/components/ConfirmReceipt';
import { PublicNav } from '~/components/nav/PublicNav';
import { PublicFooter } from '~/components/nav/PublicFooter';

const NOT_FOUND_NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/login', label: 'Admin Sign In', cta: true },
] as const;

const NOT_FOUND_FOOTER_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/login', label: 'Admin' },
] as const;

export const meta: Route.MetaFunction = () => [{ title: '404 — Page Not Found — IMPACT' }];

export function loader() {
  // Return a 404 status so search engines and Sentry treat it correctly.
  throw new Response('Not Found', { status: 404 });
}

export function ErrorBoundary() {
  return (
    <>
      <PublicNav links={NOT_FOUND_NAV_LINKS} />
      <ConfirmReceipt
        variant="error"
        microLabel="ERROR / 404 / PAGE NOT FOUND"
        title={
          <>
            <span style={{ color: 'var(--gold)' }}>404.</span>
            <br />
            Page not found.
          </>
        }
        body="This page doesn’t exist, or the resource you’re looking for has been moved. If you followed a link from inside the portal, please let your program admin know."
        actions={
          <>
            <Link to="/" className="btn btn--primary">
              Return Home <span className="btn__arrow">&rarr;</span>
            </Link>
            <Link to="/admin" className="btn btn--outline">
              Admin Home
            </Link>
          </>
        }
      />
      <PublicFooter links={NOT_FOUND_FOOTER_LINKS} />
    </>
  );
}

export default function NotFound() {
  // Default export is unreachable because loader throws; keep for the
  // framework's type contract.
  return null;
}
