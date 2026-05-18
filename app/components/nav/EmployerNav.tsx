// Employer shell nav — mirrors AdminNav's prototype-true structure but renders
// the employer-scoped link set and a cyan-accented identity chip per spec §8
// decision 7. Dark navy surface, 64px wordmark, 3px gold underline rail on
// active link. The cyan accent on the chip distinguishes the employer surface
// from admin at a glance. Layout rules ported into app/styles/admin.css
// (`.admin-chip--employer` modifier + `.employer-chip__*` extras).

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
  const avatarInitial = (employerName[0] ?? 'E').toUpperCase();
  return (
    <header className="nav">
      <div className="nav__inner">
        <NavLink
          to="/employer"
          className="wordmark"
          aria-label="IMPACT — Expand Your Opportunities"
        >
          <img src="/logo.png" alt="IMPACT — Expand Your Opportunities" className="wordmark__img" />
        </NavLink>
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
          <span className="admin-chip admin-chip--employer">
            <span className="admin-chip__avatar">{avatarInitial}</span>
            <span className="employer-chip__name">{employerName}</span>
            <span className="admin-chip__divider" />
            <span className="employer-chip__email">{userEmail}</span>
            <span className="admin-chip__divider" />
            <Form method="post" action="/sign-out" style={{ display: 'inline' }}>
              <button type="submit" className="admin-chip__logout">
                Sign out
              </button>
            </Form>
          </span>
        </nav>
      </div>
    </header>
  );
}
