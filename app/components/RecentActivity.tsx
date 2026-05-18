// Recent-activity primitive — ported from the prototype's `.activity-list`
// + `.activity-row` block (admin.html). White card with a divided list of
// entries: an actor + verb on the left (with `<strong>` actor wrap) and a
// mono timestamp on the right.

import type { ReactNode } from 'react';

export interface ActivityEntry {
  /** Lead actor — rendered with `<strong>`. */
  actor: ReactNode;
  /** Body text after the actor (e.g. "completed Competency phase Week 4"). */
  body: ReactNode;
  /** Mono timestamp displayed on the right. */
  time: string;
}

export interface RecentActivityProps {
  entries: ReadonlyArray<ActivityEntry>;
}

export function RecentActivity({ entries }: RecentActivityProps) {
  return (
    <div className="activity-list">
      {entries.map((entry, i) => (
        <div className="activity-row" key={i}>
          <span>
            <strong>{entry.actor}</strong> {entry.body}
          </span>
          <span className="activity-row__time">{entry.time}</span>
        </div>
      ))}
    </div>
  );
}
