// Top navigation for the employer shell. Mirrors AdminNav's structure but uses
// the employer link set and renders an employer-branded identity chip (employer
// name + signed-in user email + sign-out form).

import { Form, NavLink } from 'react-router';

export interface EmployerNavProps {
  employerName: string;
  userEmail: string;
}

const LINKS: ReadonlyArray<{ to: string; label: string; end?: boolean }> = [
  { to: '/employer', label: 'Home', end: true },
  { to: '/employer/cohorts', label: 'Cohorts' },
  { to: '/employer/interns', label: 'Interns' },
  { to: '/employer/competency/new', label: 'Assessments' },
  { to: '/employer/profile', label: 'My Employer' },
];

export function EmployerNav({ employerName, userEmail }: EmployerNavProps) {
  return (
    <header className="nav">
      <div className="nav__inner">
        <a
          href="/employer"
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
        </a>
        <nav className="nav__links" aria-label="Employer navigation">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="employer-chip">
          <span className="employer-chip__name">{employerName}</span>
          <span className="employer-chip__email">{userEmail}</span>
          <Form method="post" action="/sign-out" style={{ display: 'inline' }}>
            <button type="submit" className="employer-chip__logout">
              Sign out
            </button>
          </Form>
        </div>
      </div>
    </header>
  );
}
