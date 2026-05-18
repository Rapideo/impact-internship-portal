// KPI card primitive — ported from the prototype's `.kpi-card` block
// (admin.html). White card with a 3px navy accent rail by default; variant
// modifiers swap the rail color to gold / cyan / success. The `value` slot
// renders in Archivo Black at 52px line-height:1; `label` is a mono
// micro-label; `delta` is a mono sub-line (cyan by default) and `sub`
// renders as a prose sub-line beneath the value.

import type { ReactNode } from 'react';

export type KpiCardVariant = 'default' | 'gold' | 'cyan' | 'success';

export interface KpiCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Cyan mono sub-line (e.g. "ALL 2026 CYCLE"). */
  delta?: ReactNode;
  /** Prose sub-line beneath the value (alternative to `delta`). */
  sub?: ReactNode;
  variant?: KpiCardVariant;
}

export function KpiCard({ label, value, delta, sub, variant = 'default' }: KpiCardProps) {
  const cls = variant === 'default' ? 'kpi-card' : `kpi-card kpi-card--${variant}`;
  return (
    <div className={cls}>
      <span className="kpi-card__label">{label}</span>
      <div className="kpi-card__value">{value}</div>
      {delta ? <span className="kpi-card__delta">{delta}</span> : null}
      {sub ? <span className="kpi-card__sub">{sub}</span> : null}
    </div>
  );
}
