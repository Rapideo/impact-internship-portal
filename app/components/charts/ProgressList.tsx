// app/components/charts/ProgressList.tsx
// Labeled completion meters (cyan fill). One row per metric; the percentage
// is completed/total, rounded, 0 when total is 0.

import { pct } from '~/lib/reports-format';

export interface ProgressRow {
  label: string;
  completed: number;
  total: number;
}

export function ProgressList({ rows }: { rows: ProgressRow[] }) {
  if (rows.length === 0) {
    return <p className="chart-empty">No data yet.</p>;
  }
  return (
    <div className="meterlist">
      {rows.map((r, i) => {
        const percent = pct(r.completed, r.total);
        return (
          <div className="meter" key={`${r.label}-${i}`}>
            <div className="meter__top">
              <span>{r.label}</span>
              <span className="meter__pct">{percent}%</span>
            </div>
            <div className="meter__track">
              <div className="meter__fill" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
