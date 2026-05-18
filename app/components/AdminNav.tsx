// Admin shell nav — rewritten in SP7 Phase B to match the prototype's
// admin.html structure verbatim: dark navy surface, 64px wordmark, 5 nav
// links (Home / Interns / Assessments / Reports / Settings), 3px gold
// underline rail under the active link, admin-chip on the right with
// square gold avatar, divider, and logout form. Tokens come from
// app/styles/tokens.css; component rules ported into app/styles/admin.css
// (sp7-b block, appended).

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
            <span className="admin-chip__divider" />
            <Form method="post" action="/sign-out" style={{ display: 'inline' }}>
              <button type="submit" className="admin-chip__logout">
                Logout
              </button>
            </Form>
          </span>
        </nav>
      </div>
    </header>
  );
}
