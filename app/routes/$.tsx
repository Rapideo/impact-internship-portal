import { Link } from 'react-router';
import type { Route } from './+types/$';

export const meta: Route.MetaFunction = () => [{ title: '404 — Page Not Found — IMPACT' }];

export function loader() {
  // Return a 404 status so search engines and Sentry treat it correctly.
  throw new Response('Not Found', { status: 404 });
}

export function ErrorBoundary() {
  return (
    <main className="confirm">
      <div className="container confirm__inner">
        <span className="micro-label">ERROR / 404 / PAGE NOT FOUND</span>
        <h1 className="confirm__title" style={{ color: 'var(--muted)' }}>
          <span style={{ color: 'var(--gold)' }}>404.</span>
          <br />
          Page not found.
        </h1>
        <p className="confirm__body">
          This page doesn&apos;t exist, or the resource you&apos;re looking for has been moved. If
          you followed a link from inside the portal, please let your program admin know.
        </p>
        <div className="confirm__actions" style={{ gap: 14 }}>
          <Link to="/" className="btn btn--primary">
            Return Home <span className="btn__arrow">&rarr;</span>
          </Link>
          <Link to="/admin" className="btn btn--outline">
            Admin Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function NotFound() {
  // Default export is unreachable because loader throws; keep for the
  // framework's type contract.
  return null;
}
