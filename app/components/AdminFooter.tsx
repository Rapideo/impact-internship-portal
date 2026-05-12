import { Link } from 'react-router';

export function AdminFooter() {
  return (
    <footer className="footer">
      <div className="container footer__row">
        <Link to="/admin" className="wordmark" aria-label="IMPACT — Expand Your Opportunities">
          <img src="/logo.png" alt="IMPACT — Expand Your Opportunities" className="wordmark__img" />
        </Link>
        <div className="footer__links">
          <Link to="/admin/assessments">Assessments</Link>
          <Link to="/admin/interns">Interns</Link>
        </div>
        <div className="footer__meta">&copy; 2026 IMPACT / Indiana</div>
      </div>
    </footer>
  );
}
