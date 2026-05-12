import { Form, NavLink } from 'react-router';

type AdminTab = 'home' | 'interns' | 'assessments' | 'reports' | 'settings';

export interface AdminNavProps {
  active: AdminTab;
  userEmail: string;
}

function isActive(active: AdminTab, tab: AdminTab) {
  return active === tab ? 'nav__link nav__link--active' : 'nav__link';
}

export function AdminNav({ active, userEmail }: AdminNavProps) {
  const avatarInitial = (userEmail[0] ?? 'A').toUpperCase();
  return (
    <header className="nav">
      <div className="nav__inner">
        <NavLink to="/admin" className="wordmark" aria-label="IMPACT — Expand Your Opportunities">
          <img src="/logo.png" alt="IMPACT — Expand Your Opportunities" className="wordmark__img" />
        </NavLink>
        <nav className="nav__links">
          <NavLink to="/admin" end className={() => isActive(active, 'home')}>
            Home
          </NavLink>
          <NavLink to="/admin/interns" className={() => isActive(active, 'interns')}>
            Interns
          </NavLink>
          <NavLink to="/admin/assessments" className={() => isActive(active, 'assessments')}>
            Assessments
          </NavLink>
          <NavLink to="/admin/reports" className={() => isActive(active, 'reports')}>
            Reports
          </NavLink>
          <NavLink to="/admin/settings" className={() => isActive(active, 'settings')}>
            Settings
          </NavLink>
          <span className="admin-chip">
            <span className="admin-chip__avatar">{avatarInitial}</span>
            {userEmail}
            <span className="admin-chip__divider"></span>
            <Form method="post" action="/sign-out" style={{ display: 'inline' }}>
              <button
                type="submit"
                className="admin-chip__logout"
                style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}
              >
                Logout
              </button>
            </Form>
          </span>
        </nav>
      </div>
    </header>
  );
}
