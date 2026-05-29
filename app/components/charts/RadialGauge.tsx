// app/components/charts/RadialGauge.tsx
// SVG donut dial. The filled arc length is the percentage of the
// circumference; the center text is the whole-number percentage and the
// caption is the raw n-of-m. Tone selects the arc color from brand tokens.

import { pct } from '~/lib/reports-format';

export interface RadialGaugeProps {
  value: number;
  total: number;
  label: string;
  tone?: 'success' | 'navy' | 'cyan' | 'gold';
}

const TONE: Record<NonNullable<RadialGaugeProps['tone']>, string> = {
  success: 'var(--success)',
  navy: 'var(--navy)',
  cyan: 'var(--cyan)',
  gold: 'var(--gold)',
};

export function RadialGauge({ value, total, label, tone = 'navy' }: RadialGaugeProps) {
  const percent = pct(value, total);
  const R = 52;
  const C = 2 * Math.PI * R;
  const dash = (percent / 100) * C;
  return (
    <div className="gauge">
      <svg
        viewBox="0 0 120 120"
        width="120"
        height="120"
        role="img"
        aria-label={`${label}: ${percent}%`}
      >
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--rule)" strokeWidth="14" />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={TONE[tone]}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="68" textAnchor="middle" className="gauge__val">
          {percent}%
        </text>
      </svg>
      <div className="gauge__cap">{label}</div>
      <div className="gauge__sub">
        {value} of {total}
      </div>
    </div>
  );
}
