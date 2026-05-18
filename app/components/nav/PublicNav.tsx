// Public site nav — ported from Prototypes/PROTOTYPE/index.html, login.html,
// 404.html. Used by the landing page, login, auth flow, and intern self-
// assessment flow. Dark navy surface, 64px wordmark, links sized 13px /
// 0.04em letter-spacing per the prototype spec.

import { NavLink } from 'react-router';

export interface PublicNavLink {
  to: string;
  label: string;
  /** Render as the gold pill CTA (e.g. "Admin Sign In") instead of a plain link. */
  cta?: boolean;
  /** Render as the muted back-link variant (e.g. "← Back to home"). */
  back?: boolean;
  /** Match only on exact path (for `/` Home). */
  end?: boolean;
}

export interface PublicNavProps {
  /** Defaults to landing-page link set. Pass an explicit list for login / 404. */
  links?: ReadonlyArray<PublicNavLink>;
  /** Brand logo destination. Defaults to `/`. */
  homeHref?: string;
}

const DEFAULT_LINKS: ReadonlyArray<PublicNavLink> = [
  { to: '/#about', label: 'About' },
  { to: '/intern/assessments', label: 'Intern Assessments' },
  { to: '/login', label: 'Admin Sign In', cta: true },
];

export function PublicNav({ links = DEFAULT_LINKS, homeHref = '/' }: PublicNavProps) {
  return (
    <header className="nav">
      <div className="nav__inner">
        <NavLink to={homeHref} className="wordmark" aria-label="IMPACT — Expand Your Opportunities">
          <img src="/logo.png" alt="IMPACT — Expand Your Opportunities" className="wordmark__img" />
        </NavLink>
        <nav className="nav__links">
          {links.map((l) => {
            if (l.cta) {
              return (
                <NavLink key={l.to} to={l.to} className="nav__cta">
                  {l.label}
                </NavLink>
              );
            }
            if (l.back) {
              return (
                <NavLink key={l.to} to={l.to} className="back-link">
                  &larr; {l.label}
                </NavLink>
              );
            }
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
              >
                {l.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
