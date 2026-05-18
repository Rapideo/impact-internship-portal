// Public site footer — ported from Prototypes/PROTOTYPE/index.html. Dark navy
// surface, 64px wordmark, IBM Plex Mono link row.

import { NavLink } from 'react-router';

export interface PublicFooterLink {
  to: string;
  label: string;
}

export interface PublicFooterProps {
  /** Defaults to landing-page link set. */
  links?: ReadonlyArray<PublicFooterLink>;
  /** Brand logo destination. Defaults to `/`. */
  homeHref?: string;
  /** Copyright string. Defaults to `© 2026 IMPACT / Indiana`. */
  copyright?: string;
}

const DEFAULT_LINKS: ReadonlyArray<PublicFooterLink> = [
  { to: '/#about', label: 'About' },
  { to: '/intern/assessments', label: 'Intern Assessments' },
  { to: '/login', label: 'Admin' },
];

export function PublicFooter({
  links = DEFAULT_LINKS,
  homeHref = '/',
  copyright = '© 2026 IMPACT / Indiana',
}: PublicFooterProps) {
  return (
    <footer className="footer">
      <div className="container footer__row">
        <NavLink to={homeHref} className="wordmark" aria-label="IMPACT — Expand Your Opportunities">
          <img src="/logo.png" alt="IMPACT — Expand Your Opportunities" className="wordmark__img" />
        </NavLink>
        <div className="footer__links">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to}>
              {l.label}
            </NavLink>
          ))}
        </div>
        <div className="footer__meta">{copyright}</div>
      </div>
    </footer>
  );
}
