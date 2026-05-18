// Admin shell footer — rewritten in SP7 Phase B to match the prototype's
// admin.html footer markup verbatim. Dark navy surface bookend, 64px
// wordmark (overridden to 56px by `.footer .wordmark` per prototype),
// IBM Plex Mono link row. Layout rules live in app/styles/admin.css
// (Phase B block).

import { NavLink } from 'react-router';

export function AdminFooter() {
  return (
    <footer className="footer">
      <div className="container footer__row">
        <NavLink to="/admin" className="wordmark" aria-label="IMPACT — Expand Your Opportunities">
          <img src="/logo.png" alt="IMPACT — Expand Your Opportunities" className="wordmark__img" />
        </NavLink>
        <div className="footer__links">
          <NavLink to="/admin/assessments">Assessments</NavLink>
          <NavLink to="/admin/interns">Interns</NavLink>
        </div>
        <div className="footer__meta">&copy; 2026 IMPACT / Indiana</div>
      </div>
    </footer>
  );
}
