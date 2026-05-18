// Detail header primitive — ported from the prototype's `.detail-header`
// block (cohort-detail.html, admin.html "Quick Links" + "Recent Activity"
// strips). A divider strip with an Archivo Black title on the left and an
// optional mono micro-label aside on the right.

import type { ReactNode } from 'react';

export interface DetailHeaderProps {
  title: ReactNode;
  /** Right-side micro-label / aside (e.g. "LAST 7 DAYS", "JUMP TO SECTION"). */
  aside?: ReactNode;
}

export function DetailHeader({ title, aside }: DetailHeaderProps) {
  return (
    <div className="detail-header">
      <h2 className="detail-header__title">{title}</h2>
      {aside ? <span className="micro-label">{aside}</span> : null}
    </div>
  );
}
