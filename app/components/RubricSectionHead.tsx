// Rubric section divider — ported from the prototype's
// `.rubric-section-head` block (cohort-detail.html, competency rubric
// boundaries). A nested section divider with a mono label, display title,
// and an optional right-side aside (e.g. "Assessment phases applicable to
// this cohort"). Used to break up multi-tier rubrics and detail pages.

import type { ReactNode } from 'react';

export interface RubricSectionHeadProps {
  /** Mono label above the title (e.g. "PHASES", "ROLE-SPECIFIC"). */
  label?: ReactNode;
  /** Display-font heading. Optional when used purely as a label strip. */
  title?: ReactNode;
  /** Right-side mono aside. */
  aside?: ReactNode;
  /** Apply the `--spaced` modifier for extra top margin. */
  spaced?: boolean;
}

export function RubricSectionHead({ label, title, aside, spaced }: RubricSectionHeadProps) {
  const cls = `rubric-section-head${spaced ? ' rubric-section-head--spaced' : ''}`;
  return (
    <header className={cls}>
      <div>
        {label ? <span className="rubric-section-head__label">{label}</span> : null}
        {title ? <h3 className="rubric-section-head__title">{title}</h3> : null}
      </div>
      {aside ? <span className="rubric-section-head__aside">{aside}</span> : null}
    </header>
  );
}
