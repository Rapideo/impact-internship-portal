// Sticky-bottom action bar primitive — rewritten in SP7 Phase B against
// the prototype's `.action-bar` block (intern-record.html,
// competency-new.html). Position is fixed bottom (per spec §8 decision 6),
// container has a mono status caption on the left and button slot on the
// right. Optional progress fill mirrors the prototype's
// `.action-bar__progress > span` usage on rubric forms.
//
// Existing API (`status` string + `children` slot) is preserved verbatim;
// `progress` is an additive optional prop with no default behavior change.

import type { ReactNode } from 'react';

export interface ActionBarProps {
  /** Mono status caption displayed on the left (e.g., "FORM / SAVE / CLEAN"). */
  status: ReactNode;
  /** Button slot — typically Cancel + Submit, in that order. */
  children: ReactNode;
  /** Optional 0..1 progress fill (renders the rubric-style progress bar). */
  progress?: number;
}

export function ActionBar({ status, children, progress }: ActionBarProps) {
  const showProgress = typeof progress === 'number';
  const pct = showProgress ? Math.max(0, Math.min(1, progress)) * 100 : 0;
  return (
    <div className="action-bar">
      <div className="action-bar__inner">
        <div className="action-bar__status">
          <span className="mono">{status}</span>
          {showProgress && (
            <span className="action-bar__progress" aria-hidden="true">
              <span style={{ width: `${pct}%` }} />
            </span>
          )}
        </div>
        <div className="action-bar__buttons">{children}</div>
      </div>
    </div>
  );
}
