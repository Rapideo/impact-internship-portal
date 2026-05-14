// Footer for the employer shell. Mirrors AdminFooter visually but uses
// employer-scoped links.

import { Link } from 'react-router';

export function EmployerFooter() {
  return (
    <footer className="footer">
      <div className="container footer__row">
        <Link
          to="/employer"
          className="wordmark"
          aria-label="IMPACT — Expand Your Opportunities"
          style={{
            color: 'var(--white)',
            textDecoration: 'none',
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          <strong>IMPACT</strong>
        </Link>
        <div className="footer__links">
          <Link to="/employer">Home</Link>
          <Link to="/employer/cohorts">Cohorts</Link>
          <Link to="/employer/interns">Interns</Link>
        </div>
        <div className="footer__meta">&copy; 2026 IMPACT / Indiana</div>
      </div>
    </footer>
  );
}
