// app/components/charts/AreaTrend.tsx
// SVG area + line sparkline. Y is scaled to the largest value. Falls back to
// an empty state when there is not enough signal to draw a line (fewer than 2
// points, or every value is zero).

export interface TrendPoint {
  label: string;
  value: number;
}

export function AreaTrend({ points }: { points: TrendPoint[] }) {
  const maxVal = Math.max(...points.map((p) => p.value), 0);
  if (points.length < 2 || maxVal === 0) {
    return <p className="chart-empty">No submissions in this period.</p>;
  }
  const W = 640;
  const H = 120;
  const pad = 8;
  const stepX = W / (points.length - 1);
  const y = (v: number) => (H - pad - (v / maxVal) * (H - pad * 2)).toFixed(1);
  const pts = points.map((p, i) => `${(i * stepX).toFixed(1)},${y(p.value)}`);
  const line = `M${pts.join(' L')}`;
  const area = `M0,${H} L${pts.join(' L')} L${W},${H} Z`;
  return (
    <svg
      className="areatrend"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      role="img"
      aria-label="Submissions over time"
    >
      <defs>
        <linearGradient id="areatrend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--cyan)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areatrend-fill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--cyan)"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
