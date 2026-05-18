// Identity card primitive — rewritten in SP7 Phase B against the
// prototype's `.identity-card` block (cohort-detail.html,
// settings-employer.html, competency-new.html). White surface card with
// a 3px gold accent rail (`.identity-card::before`), micro-label subnote
// in the head row, and a flexible body slot for grids of fields or
// content blocks.
//
// Existing prop API (`title` + `subnote` + `children`) is preserved.
// Optional `sub` / `meta` / `link` slots are additive — used by the
// content-card variant (cohort-detail.html, settings-employer.html row
// cards) where the head also carries a description paragraph and a "view
// detail" link.

import type { ReactNode } from 'react';
import { Link } from 'react-router';

export interface IdentityCardProps {
  /** Display-font heading (e.g. "Cohort Record"). */
  title: string;
  /** Mono micro-label subnote on the right of the head row. */
  subnote: string;
  /** Body slot — grids of fields or content blocks. */
  children?: ReactNode;
  /** Optional description paragraph below the head row (content-card variant). */
  sub?: ReactNode;
  /** Optional mono meta row (e.g. "6 ACTIVE · INDIANAPOLIS"). */
  meta?: ReactNode;
  /** Optional "view detail" link in the bottom-right of the card. */
  link?: { to: string; label: string };
}

export function IdentityCard({ title, subnote, children, sub, meta, link }: IdentityCardProps) {
  return (
    <article className="identity-card">
      <div className="identity-card__head">
        <h2 className="identity-card__title">{title}</h2>
        <span className="identity-card__subnote">{subnote}</span>
      </div>
      {sub ? <p className="identity-card__sub">{sub}</p> : null}
      {meta ? <div className="identity-card__meta">{meta}</div> : null}
      {children}
      {link ? (
        <Link to={link.to} className="identity-card__link">
          {link.label} &rarr;
        </Link>
      ) : null}
    </article>
  );
}
