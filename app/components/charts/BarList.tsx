// app/components/charts/BarList.tsx
// Horizontal bar list — dependency-free CSS bars. Widths are scaled to the
// largest value in the set. `variant` switches the fill gradient. Renders a
// neutral empty state when there is no data (production starts empty).

export interface BarListRow {
  label: string;
  value: number;
}

export interface BarListProps {
  rows: BarListRow[];
  variant?: 'navy' | 'gold';
  emptyLabel?: string;
}

export function BarList({ rows, variant = 'navy', emptyLabel = 'No data yet.' }: BarListProps) {
  if (rows.length === 0) {
    return <p className="chart-empty">{emptyLabel}</p>;
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="barlist">
      {rows.map((r, i) => (
        <div className="barlist__row" key={`${r.label}-${i}`}>
          <span className="barlist__name" title={r.label}>
            {r.label}
          </span>
          <div className="barlist__track">
            <div
              className={`barlist__fill${variant === 'gold' ? ' barlist__fill--gold' : ''}`}
              style={{ width: `${Math.round((r.value / max) * 100)}%` }}
            />
          </div>
          <span className="barlist__val">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
