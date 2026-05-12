import type { ReactNode } from 'react';

export function ActionBar({ status, children }: { status: string; children: ReactNode }) {
  return (
    <div className="action-bar">
      <div className="action-bar__inner">
        <div className="action-bar__status">
          <span className="mono" style={{ color: 'var(--navy)' }}>
            {status}
          </span>
        </div>
        <div className="action-bar__buttons">{children}</div>
      </div>
    </div>
  );
}
