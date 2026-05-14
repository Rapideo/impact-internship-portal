import type { ReactNode } from 'react';

export interface AuthFact {
  mono: string;
  label: string;
}

export interface AuthShellProps {
  /** Small monospace eyebrow above the title, e.g. "INVITE / ACCEPT / 2026". */
  microLabel: string;
  /** Display headline, e.g. "Set your password.". */
  title: string;
  /** Lede paragraph beneath the headline. */
  sub: string;
  /** The auth form (or success state) to render in the right column. */
  children: ReactNode;
  /** Optional numbered facts shown beneath the lede in the intro column. */
  facts?: AuthFact[];
}

/**
 * Shared two-column shell for branded auth pages (/auth/accept, /auth/reset,
 * /auth/forgot). Mirrors the prototype's `login.html` aesthetic — split intro
 * + form-card layout, navy/cyan/gold tokens, IBM Plex Sans body, Archivo Black
 * headline. Styles live in app/styles/auth.css.
 */
export function AuthShell({ microLabel, title, sub, children, facts }: AuthShellProps) {
  return (
    <main className="auth">
      <div className="container auth__inner">
        <div className="auth__intro">
          <span className="micro-label">{microLabel}</span>
          <h1 className="auth__title">{title}</h1>
          <p className="auth__sub">{sub}</p>
          {facts && facts.length > 0 && (
            <ul className="auth__facts">
              {facts.map((f) => (
                <li key={f.mono}>
                  <span className="mono">{f.mono}</span> {f.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="auth__form-wrap">{children}</div>
      </div>
    </main>
  );
}
