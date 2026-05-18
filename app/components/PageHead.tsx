// Page head primitive — rewritten in SP7 Phase B against the prototype's
// `.page-head` block (admin.html, interns-dashboard.html, etc.). The page-
// head sits directly under the nav, hosts a mono micro-label breadcrumb
// row and an Archivo Black display title, plus an optional sub-copy and an
// optional right-side actions slot (e.g., "+ New Intern").
//
// `title` is `ReactNode` so callers can pass multi-line headlines with
// inline `<br />` ("GOOD MORNING,<br/>MATT.") per the prototype's literal
// usage. Existing string-typed call sites stay valid (ReactNode supersedes
// string in the prop type, so the API is additive — no breaking change).

import type { ReactNode } from 'react';

export interface PageHeadProps {
  /** Mono micro-label row above the title (e.g. "ADMIN / HOME / 2026"). */
  breadcrumb: ReactNode;
  /** Display-font title — pass JSX for multi-line ("FOO,<br/>BAR.") usage. */
  title: ReactNode;
  /** Lede paragraph beneath the title. */
  sub?: ReactNode;
  /** Right-side slot for primary actions (e.g. "+ New Intern" button). */
  actions?: ReactNode;
  /** Additional content rendered inside the container, below the row. */
  children?: ReactNode;
}

export function PageHead({ breadcrumb, title, sub, actions, children }: PageHeadProps) {
  return (
    <section className="page-head">
      <div className="container">
        <div className="page-head__breadcrumb">
          <span className="micro-label">{breadcrumb}</span>
        </div>
        <div className="page-head__row">
          <div>
            <h1 className="page-head__title">{title}</h1>
            {sub ? <p className="page-head__sub">{sub}</p> : null}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </section>
  );
}
