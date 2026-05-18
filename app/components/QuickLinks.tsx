// Quick-links primitive — ported from the prototype's `.quick-links` +
// `.quick-link` block (admin.html). A row of navy pill links with a
// trailing arrow glyph; wraps on overflow.

import { Link } from 'react-router';

export interface QuickLinkItem {
  to: string;
  label: string;
}

export interface QuickLinksProps {
  items: ReadonlyArray<QuickLinkItem>;
}

export function QuickLinks({ items }: QuickLinksProps) {
  return (
    <div className="quick-links">
      {items.map((it) => (
        <Link key={it.to} to={it.to} className="quick-link">
          {it.label}
          <span className="quick-link__arrow">&rarr;</span>
        </Link>
      ))}
    </div>
  );
}
