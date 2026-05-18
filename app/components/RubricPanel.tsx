// Rubric panel primitive — rewritten in SP7 Phase B against the
// prototype's `.rubric-panel` block (intern-record.html, competency-new.html).
// Numbered panel with an Archivo Black 01/02/... numeral, display title,
// optional mono meta sub-line, optional `data-state` progress chip on the
// right, and body slot for rubric questions. Wrap a `<div className="rubric">`
// around the panels (the prototype does) to get the 32px gap stack.
//
// Existing prop API (`num` / `title` / `meta` / `hidden` / `children`) is
// preserved. `progress` is additive — when set, the right-side chip
// renders with the matching `data-state` styling.

import type { ReactNode } from 'react';

export type RubricProgressState = 'unanswered' | 'emerging' | 'developing' | 'ready';

export interface RubricPanelProps {
  num: string;
  title: string;
  meta?: string;
  hidden?: boolean;
  children: ReactNode;
  /** Optional progress chip on the right of the head row. */
  progress?: { state: RubricProgressState; label: string };
}

export function RubricPanel({ num, title, meta, hidden, children, progress }: RubricPanelProps) {
  if (hidden) return null;
  return (
    <article className="rubric-panel">
      <header className="rubric-panel__head">
        <span className="rubric-panel__num">{num}</span>
        <div className="rubric-panel__title-block">
          <h3 className="rubric-panel__title">{title}</h3>
          {meta ? <span className="rubric-panel__meta">{meta}</span> : null}
        </div>
        {progress ? (
          <span className="rubric-panel__progress" data-state={progress.state}>
            {progress.label}
          </span>
        ) : null}
      </header>
      {children}
    </article>
  );
}
