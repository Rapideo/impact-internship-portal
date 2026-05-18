// Employer shell footer — mirrors AdminFooter's prototype structure with
// employer-scoped link set. Dark navy bookend per the prototype.

import { NavLink } from 'react-router';

export function EmployerFooter() {
  return (
    <footer className="footer">
      <div className="container footer__row">
        <NavLink
          to="/employer"
          className="wordmark"
          aria-label="IMPACT — Expand Your Opportunities"
        >
          <img src="/logo.png" alt="IMPACT — Expand Your Opportunities" className="wordmark__img" />
        </NavLink>
        <div className="footer__links">
          <NavLink to="/employer">Home</NavLink>
          <NavLink to="/employer/cohorts">Cohorts</NavLink>
          <NavLink to="/employer/interns">Interns</NavLink>
        </div>
        <div className="footer__meta">&copy; 2026 IMPACT / Indiana</div>
      </div>
    </footer>
  );
}
