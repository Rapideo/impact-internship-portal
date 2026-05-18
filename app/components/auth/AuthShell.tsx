// Two-column auth shell — rewritten in SP7 Phase B against the prototype's
// login.html: left intro column with micro-label + Archivo Black headline +
// lede + optional numbered facts list, right column with form card sporting
// a 3px gold accent rail (`.login__form::before`). Existing prop API is
// preserved verbatim (microLabel / title / sub / children / facts) so the
// five auth routes that consume this don't change.
//
// Class renaming note: the prototype uses `.login`, `.login__inner`,
// `.login__intro`, `.login__title`, `.login__sub`, `.login__facts`,
// `.login__form` etc. To keep the production semantics (this shell hosts
// /auth/* pages too, not just /login), we keep the `.auth__*` prefix and
// the prototype rules are mirrored under that prefix in app/styles/auth.css.

import type { ReactNode } from 'react';

export interface AuthFact {
  mono: string;
  label: string;
}

export interface AuthShellProps {
  /** Small monospace eyebrow above the title, e.g. "ADMIN / SIGN-IN / 2026". */
  microLabel: string;
  /** Display headline, e.g. "Sign in.". */
  title: string;
  /** Lede paragraph beneath the headline. */
  sub: string;
  /** The auth form (or success state) to render in the right column. */
  children: ReactNode;
  /** Optional numbered facts shown beneath the lede in the intro column. */
  facts?: AuthFact[];
}

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
