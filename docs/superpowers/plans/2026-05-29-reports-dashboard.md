# Reports Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/admin/reports` placeholder with a chart-driven dashboard and add a scoped `/employer/reports`, both fed by one scope-aware data layer.

**Architecture:** A single set of dependency-free SVG/CSS chart components renders a `ReportsData` object produced by `getReportsData(db, scope)`. The scope (`global` | `employer` | `cohort`) is the only thing that varies between views; admins resolve it from `?employerId=&cohortId=` search params, employers have it pinned to their JWT `employerId`.

**Tech Stack:** React Router v7 (framework mode), Drizzle ORM (postgres-js), Vitest (unit/dom/rls projects), Playwright, brand CSS tokens in `app/styles/tokens.css`.

**Source spec:** `docs/superpowers/specs/2026-05-29-reports-dashboard-design.md`

**Two deviations from the spec, intentional:**
1. `ReportsData` carries metric data only (no `scope`/label field). Scope labels are produced by the route resolvers and passed straight to `ReportsScopeBar`. This keeps `ReportsDashboard` a pure presentational component.
2. Shared types (`ReportsScope`, `ReportsData`) live in a non-`.server` file (`app/lib/reports-types.ts`) so client components can import them without tripping Vite's server-only guard.

**Seed facts these tests rely on** (current `db/seed.ts` + `db:seed`; mirrors the style of `tests/rls/employer-scope.test.ts`):
- 6 employers (`…101`–`…106`), 6 cohorts (`…301`–`…306`), 1 cohort per employer.
- 6 active interns, all `deleted_at IS NULL`, all `employed_90_day`/`employed_180_day` = false:
  - Riverbend (emp `…101`, cohort `…301`): 1 intern (A Whitaker).
  - Northside (emp `…102`, cohort `…302`): 4 interns (B Okafor + T Test1/2/3).
  - CapCity (emp `…103`, cohort `…303`): 1 intern (C Delgado).
  - Employers `…104`/`…105`/`…106`: 0 interns.
- **No `assessment_submissions` are seeded** (the table is truncated at seed start and never repopulated), so assessed %, completion meters, and the trend are all empty/zero against seed data.
- Entry barriers across all interns: Transportation×1, Justice-system involvement×1, Childcare×1, Substance use recovery×1, Limited work history×1 (5 distinct, each count 1). Northside alone has only Childcare×1.

---

## Task 1: Percent helper (`reports-format.ts`)

A pure, shared `pct()` used by both the query layer and the gauge/meter components. Lives outside `.server` so components can import it.

**Files:**
- Create: `app/lib/reports-format.ts`
- Test: `tests/reports-format.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/reports-format.test.ts
import { describe, it, expect } from 'vitest';
import { pct } from '../app/lib/reports-format';

describe('pct', () => {
  it('returns a rounded percentage', () => {
    expect(pct(1, 4)).toBe(25);
    expect(pct(2, 3)).toBe(67); // 66.6 -> 67
  });

  it('returns 0 when the denominator is 0 (no divide-by-zero)', () => {
    expect(pct(0, 0)).toBe(0);
    expect(pct(5, 0)).toBe(0);
  });

  it('clamps nothing — 100% is possible', () => {
    expect(pct(4, 4)).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit tests/reports-format.test.ts`
Expected: FAIL — `Failed to resolve import "../app/lib/reports-format"` / `pct is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/reports-format.ts
// Shared, framework-agnostic helpers for the reports dashboard. Pure
// functions only — safe to import from both server query code and client
// chart components (kept out of *.server.ts on purpose).

/** Whole-number percentage of n/d, or 0 when d <= 0 (no divide-by-zero). */
export function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit tests/reports-format.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/reports-format.ts tests/reports-format.test.ts
git commit -m "feat(reports): add pct percent helper"
```

---

## Task 2: Shared types (`reports-types.ts`)

No test (type-only module); it unblocks every later task.

**Files:**
- Create: `app/lib/reports-types.ts`

- [ ] **Step 1: Write the types**

```ts
// app/lib/reports-types.ts
// Shared, non-server types for the reports dashboard. Imported by both the
// server query layer and client chart components, so this file must NOT end
// in .server.ts (Vite would block the client import).

export type ReportsScope =
  | { level: 'global' }
  | { level: 'employer'; employerId: string }
  | { level: 'cohort'; employerId: string; cohortId: string };

export interface ReportsData {
  kpis: {
    employers: number | null; // null unless scope.level === 'global'
    activeInterns: number;
    employed90Pct: number; // 0–100
    assessedPct: number; // 0–100 (>=1 competency submission)
  };
  internsByGroup: {
    groupBy: 'employer' | 'cohort';
    rows: { id: string; label: string; count: number }[]; // desc by count
  };
  outcomes: {
    ninetyDay: { numerator: number; denominator: number };
    oneEightyDay: { numerator: number; denominator: number };
  };
  assessmentCompletion: { key: string; label: string; completed: number; total: number }[];
  barriers: { id: string; label: string; count: number }[]; // desc by count
  trend: { weekStart: string; count: number }[]; // ascending weeks
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: PASS (no new errors).

- [ ] **Step 3: Commit**

```bash
git add app/lib/reports-types.ts
git commit -m "feat(reports): add shared reports types"
```

---

## Task 3: `BarList` chart component

Horizontal bars (navy default, gold variant) with an empty state.

**Files:**
- Create: `app/components/charts/BarList.tsx`
- Create: `app/styles/reports.css` (started here; appended in later tasks)
- Test: `tests/components/BarList.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/BarList.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarList } from '../../app/components/charts/BarList';

describe('BarList', () => {
  it('renders one row per data point with its value', () => {
    render(
      <BarList
        rows={[
          { label: 'Riverbend', value: 12 },
          { label: 'Northside', value: 9 },
        ]}
      />,
    );
    expect(screen.getByText('Riverbend')).toBeInTheDocument();
    expect(screen.getByText('Northside')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('renders the empty label when there are no rows', () => {
    render(<BarList rows={[]} emptyLabel="No interns yet." />);
    expect(screen.getByText('No interns yet.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project dom tests/components/BarList.test.tsx`
Expected: FAIL — cannot resolve `BarList`.

- [ ] **Step 3: Write the component + base CSS**

```tsx
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
```

```css
/* app/styles/reports.css */
/* Reports dashboard — chart kit + layout. Dependency-free SVG/CSS, themed
   with the brand tokens in tokens.css. Added in SP6 Phase C (Reports). */

.chart-empty {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted);
  padding: 18px 4px;
  margin: 0;
}

/* Horizontal bars */
.barlist {
  display: flex;
  flex-direction: column;
  gap: 11px;
}
.barlist__row {
  display: grid;
  grid-template-columns: 130px 1fr 36px;
  align-items: center;
  gap: 12px;
}
.barlist__name {
  font-size: 13px;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.barlist__track {
  height: 13px;
  background: var(--canvas-alt);
  border-radius: 7px;
  overflow: hidden;
}
.barlist__fill {
  height: 100%;
  border-radius: 7px;
  background: linear-gradient(90deg, var(--navy), var(--navy-mid));
}
.barlist__fill--gold {
  background: linear-gradient(90deg, #e9b800, var(--gold));
}
.barlist__val {
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: right;
  color: var(--muted);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project dom tests/components/BarList.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/charts/BarList.tsx app/styles/reports.css tests/components/BarList.test.tsx
git commit -m "feat(reports): add BarList chart component"
```

---

## Task 4: `RadialGauge` chart component

**Files:**
- Create: `app/components/charts/RadialGauge.tsx`
- Modify: `app/styles/reports.css` (append gauge rules)
- Test: `tests/components/RadialGauge.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/RadialGauge.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadialGauge } from '../../app/components/charts/RadialGauge';

describe('RadialGauge', () => {
  it('shows the rounded percentage and the n-of-m caption', () => {
    render(<RadialGauge value={27} total={37} label="90-Day" tone="success" />);
    expect(screen.getByText('73%')).toBeInTheDocument(); // 27/37 = 72.9 -> 73
    expect(screen.getByText('27 of 37')).toBeInTheDocument();
    expect(screen.getByText('90-Day')).toBeInTheDocument();
  });

  it('shows 0% when total is 0', () => {
    render(<RadialGauge value={0} total={0} label="180-Day" />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 of 0')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project dom tests/components/RadialGauge.test.tsx`
Expected: FAIL — cannot resolve `RadialGauge`.

- [ ] **Step 3: Write the component + CSS**

```tsx
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
      <svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label={`${label}: ${percent}%`}>
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
```

Append to `app/styles/reports.css`:

```css
/* Radial gauges */
.gauge-row {
  display: flex;
  gap: 8px;
  justify-content: space-around;
  flex-wrap: wrap;
}
.gauge {
  text-align: center;
}
.gauge__val {
  font-family: var(--font-display);
  font-size: 22px;
  fill: var(--navy-deep);
}
.gauge__cap {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 4px;
}
.gauge__sub {
  font-size: 11px;
  color: var(--muted);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project dom tests/components/RadialGauge.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/charts/RadialGauge.tsx app/styles/reports.css tests/components/RadialGauge.test.tsx
git commit -m "feat(reports): add RadialGauge chart component"
```

---

## Task 5: `ProgressList` chart component

**Files:**
- Create: `app/components/charts/ProgressList.tsx`
- Modify: `app/styles/reports.css` (append meter rules)
- Test: `tests/components/ProgressList.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/ProgressList.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressList } from '../../app/components/charts/ProgressList';

describe('ProgressList', () => {
  it('renders a labeled meter with a rounded percentage per row', () => {
    render(
      <ProgressList
        rows={[
          { label: 'Competency', completed: 30, total: 37 },
          { label: 'Personal Goals', completed: 0, total: 37 },
        ]}
      />,
    );
    expect(screen.getByText('Competency')).toBeInTheDocument();
    expect(screen.getByText('81%')).toBeInTheDocument(); // 30/37 = 81.0
    expect(screen.getByText('Personal Goals')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders an empty state with no rows', () => {
    render(<ProgressList rows={[]} />);
    expect(screen.getByText('No data yet.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project dom tests/components/ProgressList.test.tsx`
Expected: FAIL — cannot resolve `ProgressList`.

- [ ] **Step 3: Write the component + CSS**

```tsx
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
```

Append to `app/styles/reports.css`:

```css
/* Progress meters */
.meterlist {
  display: flex;
  flex-direction: column;
  gap: 13px;
}
.meter__top {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 5px;
}
.meter__pct {
  font-family: var(--font-mono);
  color: var(--navy);
  font-weight: 600;
}
.meter__track {
  height: 9px;
  background: var(--canvas-alt);
  border-radius: 6px;
  overflow: hidden;
}
.meter__fill {
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--cyan), #5ec8ff);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project dom tests/components/ProgressList.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/charts/ProgressList.tsx app/styles/reports.css tests/components/ProgressList.test.tsx
git commit -m "feat(reports): add ProgressList chart component"
```

---

## Task 6: `AreaTrend` chart component

**Files:**
- Create: `app/components/charts/AreaTrend.tsx`
- Modify: `app/styles/reports.css` (append trend rule)
- Test: `tests/components/AreaTrend.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/AreaTrend.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AreaTrend } from '../../app/components/charts/AreaTrend';

describe('AreaTrend', () => {
  it('renders an svg when there are >=2 non-zero points', () => {
    const { container } = render(
      <AreaTrend
        points={[
          { label: '2026-04-06', value: 2 },
          { label: '2026-04-13', value: 5 },
          { label: '2026-04-20', value: 4 },
        ]}
      />,
    );
    expect(container.querySelector('svg.areatrend')).toBeTruthy();
  });

  it('renders the empty state when fewer than 2 points or all zero', () => {
    render(<AreaTrend points={[]} />);
    expect(screen.getByText('No submissions in this period.')).toBeInTheDocument();
  });

  it('renders the empty state when every value is zero', () => {
    render(
      <AreaTrend
        points={[
          { label: 'a', value: 0 },
          { label: 'b', value: 0 },
        ]}
      />,
    );
    expect(screen.getByText('No submissions in this period.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project dom tests/components/AreaTrend.test.tsx`
Expected: FAIL — cannot resolve `AreaTrend`.

- [ ] **Step 3: Write the component + CSS**

```tsx
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
```

Append to `app/styles/reports.css`:

```css
/* Area trend */
.areatrend {
  display: block;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project dom tests/components/AreaTrend.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/charts/AreaTrend.tsx app/styles/reports.css tests/components/AreaTrend.test.tsx
git commit -m "feat(reports): add AreaTrend chart component"
```

---

## Task 7: Data layer — scope predicate + KPIs

This task creates `app/lib/reports-queries.server.ts` with the scope predicate and `getKpis`. Later tasks append the remaining metric functions. Tests run in the `rls` project (real Postgres), require `supabase start` + a seeded DB (`npm run db:seed`).

**Files:**
- Create: `app/lib/reports-queries.server.ts`
- Test: `tests/rls/reports-queries.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/rls/reports-queries.test.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';
import { getKpis } from '../../app/lib/reports-queries.server';

const RIVERBEND = '11111111-1111-1111-1111-111111111101';
const NORTHSIDE = '11111111-1111-1111-1111-111111111102';

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  db = drizzle(sql, { schema });
});
afterAll(async () => {
  await sql.end();
});

describe('reports-queries: getKpis', () => {
  it('global KPIs reflect the full seed', async () => {
    const k = await getKpis(db, { level: 'global' });
    expect(k.employers).toBe(6);
    expect(k.activeInterns).toBe(6);
    expect(k.employed90Pct).toBe(0); // seed has no employment outcomes set true
    expect(k.assessedPct).toBe(0); // seed has no submissions
  });

  it('employer scope counts only that employer and hides the employers KPI', async () => {
    const k = await getKpis(db, { level: 'employer', employerId: NORTHSIDE });
    expect(k.employers).toBeNull();
    expect(k.activeInterns).toBe(4);
  });

  it('a single-intern employer counts 1', async () => {
    const k = await getKpis(db, { level: 'employer', employerId: RIVERBEND });
    expect(k.activeInterns).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project rls tests/rls/reports-queries.test.ts`
Expected: FAIL — cannot resolve `getKpis` from `reports-queries.server`.
(If it errors on the DB connection instead, start Supabase first: `supabase start` then `npm run db:seed`.)

- [ ] **Step 3: Write the module with the predicate + getKpis**

```ts
// app/lib/reports-queries.server.ts
// Scope-aware aggregation queries for the reports dashboard. Each function
// takes a Drizzle `db` and a ReportsScope, and translates the scope into a
// WHERE predicate over the interns table. Follows the employer-scope.server.ts
// pattern: the service-role connection bypasses RLS, so the CALLER (admin
// guard / employer layout) is the trust boundary — the scope passed in here is
// already verified. (#77 hardening applies as it does to employer-scope.)

import { and, asc, count, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import type { DB } from './db.server';
import type { ReportsScope } from './reports-types';
import { pct } from './reports-format';
import {
  interns,
  cohorts,
  employers,
  assessmentSubmissions,
  internEmploymentOutcomes,
} from '../../db/schema';

/** WHERE predicate selecting the in-scope, non-deleted interns. */
function internScopePredicate(scope: ReportsScope): SQL {
  if (scope.level === 'employer') {
    return and(
      isNull(interns.deletedAt),
      sql`${interns.cohortId} IN (SELECT id FROM ${cohorts} WHERE ${cohorts.employerId} = ${scope.employerId})`,
    )!;
  }
  if (scope.level === 'cohort') {
    return and(isNull(interns.deletedAt), eq(interns.cohortId, scope.cohortId))!;
  }
  return isNull(interns.deletedAt);
}

export async function getKpis(db: DB, scope: ReportsScope) {
  const wherePred = internScopePredicate(scope);

  const [activeRow] = await db.select({ n: count() }).from(interns).where(wherePred);
  const activeInterns = Number(activeRow?.n ?? 0);

  const [emp90Row] = await db
    .select({ n: count() })
    .from(interns)
    .innerJoin(internEmploymentOutcomes, eq(internEmploymentOutcomes.internId, interns.id))
    .where(and(wherePred, eq(internEmploymentOutcomes.employed90Day, true))!);
  const employed90 = Number(emp90Row?.n ?? 0);

  const [assessedRow] = await db
    .select({ n: sql<number>`count(distinct ${interns.id})::int` })
    .from(interns)
    .innerJoin(
      assessmentSubmissions,
      and(
        eq(assessmentSubmissions.internId, interns.id),
        eq(assessmentSubmissions.type, 'competency'),
        isNull(assessmentSubmissions.deletedAt),
      )!,
    )
    .where(wherePred);
  const assessed = Number(assessedRow?.n ?? 0);

  const employersCount =
    scope.level === 'global'
      ? Number((await db.select({ n: count() }).from(employers))[0]?.n ?? 0)
      : null;

  return {
    employers: employersCount,
    activeInterns,
    employed90Pct: pct(employed90, activeInterns),
    assessedPct: pct(assessed, activeInterns),
  };
}

// Re-export the predicate for sibling metric functions added in later tasks.
export { internScopePredicate };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project rls tests/rls/reports-queries.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/reports-queries.server.ts tests/rls/reports-queries.test.ts
git commit -m "feat(reports): add scope predicate and KPI query"
```

---

## Task 8: Data layer — interns-by-group + outcome rates

**Files:**
- Modify: `app/lib/reports-queries.server.ts` (add `getInternsByGroup`, `getOutcomeRates`)
- Modify: `tests/rls/reports-queries.test.ts` (add cases)

- [ ] **Step 1: Add the failing tests**

Append inside `tests/rls/reports-queries.test.ts` (after the existing `describe`), and add the imports `getInternsByGroup, getOutcomeRates` to the existing import from `reports-queries.server`:

```ts
describe('reports-queries: getInternsByGroup', () => {
  it('groups by employer at global scope, desc by count', async () => {
    const g = await getInternsByGroup(db, { level: 'global' });
    expect(g.groupBy).toBe('employer');
    expect(g.rows).toHaveLength(3); // only employers with interns
    expect(g.rows[0]).toMatchObject({ label: 'Northside Hospital Network', count: 4 });
  });

  it('groups by cohort when scoped to an employer', async () => {
    const g = await getInternsByGroup(db, { level: 'employer', employerId: NORTHSIDE });
    expect(g.groupBy).toBe('cohort');
    expect(g.rows).toHaveLength(1);
    expect(g.rows[0]).toMatchObject({ label: 'Northside — Winter 2026 CNA Track', count: 4 });
  });
});

describe('reports-queries: getOutcomeRates', () => {
  it('uses all in-scope interns as the denominator', async () => {
    const o = await getOutcomeRates(db, { level: 'global' });
    expect(o.ninetyDay).toEqual({ numerator: 0, denominator: 6 });
    expect(o.oneEightyDay).toEqual({ numerator: 0, denominator: 6 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project rls tests/rls/reports-queries.test.ts`
Expected: FAIL — `getInternsByGroup` / `getOutcomeRates` not exported.

- [ ] **Step 3: Implement both functions**

Append to `app/lib/reports-queries.server.ts`:

```ts
export async function getInternsByGroup(db: DB, scope: ReportsScope) {
  const cnt = count(interns.id);
  if (scope.level === 'global') {
    const rows = await db
      .select({ id: employers.id, label: employers.name, count: cnt })
      .from(interns)
      .innerJoin(cohorts, eq(cohorts.id, interns.cohortId))
      .innerJoin(employers, eq(employers.id, cohorts.employerId))
      .where(isNull(interns.deletedAt))
      .groupBy(employers.id)
      .orderBy(desc(cnt), asc(employers.name));
    return {
      groupBy: 'employer' as const,
      rows: rows.map((r) => ({ id: r.id, label: r.label, count: Number(r.count) })),
    };
  }
  const rows = await db
    .select({ id: cohorts.id, label: cohorts.name, count: cnt })
    .from(interns)
    .innerJoin(cohorts, eq(cohorts.id, interns.cohortId))
    .where(internScopePredicate(scope))
    .groupBy(cohorts.id)
    .orderBy(desc(cnt), asc(cohorts.name));
  return {
    groupBy: 'cohort' as const,
    rows: rows.map((r) => ({ id: r.id, label: r.label, count: Number(r.count) })),
  };
}

export async function getOutcomeRates(db: DB, scope: ReportsScope) {
  const wherePred = internScopePredicate(scope);
  const [activeRow] = await db.select({ n: count() }).from(interns).where(wherePred);
  const denominator = Number(activeRow?.n ?? 0);

  const [n90] = await db
    .select({ n: count() })
    .from(interns)
    .innerJoin(internEmploymentOutcomes, eq(internEmploymentOutcomes.internId, interns.id))
    .where(and(wherePred, eq(internEmploymentOutcomes.employed90Day, true))!);

  const [n180] = await db
    .select({ n: count() })
    .from(interns)
    .innerJoin(internEmploymentOutcomes, eq(internEmploymentOutcomes.internId, interns.id))
    .where(and(wherePred, eq(internEmploymentOutcomes.employed180Day, true))!);

  return {
    ninetyDay: { numerator: Number(n90?.n ?? 0), denominator },
    oneEightyDay: { numerator: Number(n180?.n ?? 0), denominator },
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run --project rls tests/rls/reports-queries.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add app/lib/reports-queries.server.ts tests/rls/reports-queries.test.ts
git commit -m "feat(reports): add interns-by-group and outcome-rate queries"
```

---

## Task 9: Data layer — assessment completion + barriers + trend

**Files:**
- Modify: `app/lib/reports-queries.server.ts` (add `getAssessmentCompletion`, `getBarrierDistribution`, `getSubmissionsTrend`)
- Modify: `tests/rls/reports-queries.test.ts` (add cases)

- [ ] **Step 1: Add the failing tests**

Add `getAssessmentCompletion, getBarrierDistribution, getSubmissionsTrend` to the import, then append:

```ts
describe('reports-queries: completion / barriers / trend', () => {
  it('returns all five assessment types with a zero seed', async () => {
    const rows = await getAssessmentCompletion(db, { level: 'global' });
    expect(rows).toHaveLength(5);
    const competency = rows.find((r) => r.key === 'competency');
    expect(competency).toMatchObject({ completed: 0, total: 6 });
  });

  it('counts distinct interns per barrier, desc', async () => {
    const rows = await getBarrierDistribution(db, { level: 'global' });
    expect(rows).toHaveLength(5); // 5 distinct barriers across seeded interns
    rows.forEach((r) => expect(r.count).toBe(1));
    expect(rows.map((r) => r.label)).toContain('Transportation');
  });

  it('scopes barriers to the employer', async () => {
    const rows = await getBarrierDistribution(db, { level: 'employer', employerId: NORTHSIDE });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ label: 'Childcare', count: 1 });
  });

  it('returns an empty trend when there are no submissions', async () => {
    const rows = await getSubmissionsTrend(db, { level: 'global' });
    expect(rows).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project rls tests/rls/reports-queries.test.ts`
Expected: FAIL — the three new functions are not exported.

- [ ] **Step 3: Implement the three functions**

First add `internEntryBarriers, barriers` to the existing schema import at the top of `app/lib/reports-queries.server.ts`:

```ts
import {
  interns,
  cohorts,
  employers,
  assessmentSubmissions,
  internEmploymentOutcomes,
  internEntryBarriers,
  barriers,
} from '../../db/schema';
```

Then append:

```ts
const ASSESSMENT_TYPES = [
  { key: 'competency', label: 'Competency' },
  { key: 'personal-goals', label: 'Personal Goals' },
  { key: 'midpoint-reflection', label: 'Midpoint Reflection' },
  { key: 'participant-feedback', label: 'Participant Feedback' },
  { key: 'exit-employer-survey', label: 'Exit Employer Survey' },
] as const;

export async function getAssessmentCompletion(db: DB, scope: ReportsScope) {
  const wherePred = internScopePredicate(scope);
  const [activeRow] = await db.select({ n: count() }).from(interns).where(wherePred);
  const total = Number(activeRow?.n ?? 0);

  const rows = await db
    .select({
      type: assessmentSubmissions.type,
      completed: sql<number>`count(distinct ${assessmentSubmissions.internId})::int`,
    })
    .from(assessmentSubmissions)
    .innerJoin(interns, eq(interns.id, assessmentSubmissions.internId))
    .where(and(wherePred, isNull(assessmentSubmissions.deletedAt))!)
    .groupBy(assessmentSubmissions.type);

  const byType = new Map(rows.map((r) => [r.type as string, Number(r.completed)]));
  return ASSESSMENT_TYPES.map((t) => ({
    key: t.key,
    label: t.label,
    completed: byType.get(t.key) ?? 0,
    total,
  }));
}

export async function getBarrierDistribution(db: DB, scope: ReportsScope) {
  const wherePred = internScopePredicate(scope);
  const cnt = sql<number>`count(distinct ${interns.id})::int`;
  const rows = await db
    .select({ id: barriers.id, label: barriers.label, count: cnt })
    .from(internEntryBarriers)
    .innerJoin(interns, eq(interns.id, internEntryBarriers.internId))
    .innerJoin(barriers, eq(barriers.id, internEntryBarriers.barrierId))
    .where(wherePred)
    .groupBy(barriers.id, barriers.label)
    .orderBy(desc(cnt), asc(barriers.label));
  return rows.map((r) => ({ id: r.id, label: r.label, count: Number(r.count) }));
}

export async function getSubmissionsTrend(db: DB, scope: ReportsScope) {
  const wherePred = internScopePredicate(scope);
  const rows = await db
    .select({
      weekStart: sql<string>`to_char(date_trunc('week', ${assessmentSubmissions.submittedAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(assessmentSubmissions)
    .innerJoin(interns, eq(interns.id, assessmentSubmissions.internId))
    .where(
      and(
        wherePred,
        isNull(assessmentSubmissions.deletedAt),
        sql`${assessmentSubmissions.submittedAt} >= now() - interval '8 weeks'`,
      )!,
    )
    .groupBy(sql`date_trunc('week', ${assessmentSubmissions.submittedAt})`)
    .orderBy(sql`date_trunc('week', ${assessmentSubmissions.submittedAt})`);
  return rows.map((r) => ({ weekStart: r.weekStart, count: Number(r.count) }));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run --project rls tests/rls/reports-queries.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/reports-queries.server.ts tests/rls/reports-queries.test.ts
git commit -m "feat(reports): add completion, barrier, and trend queries"
```

---

## Task 10: `getReportsData` aggregator + scope resolvers

`getReportsData` fans out the six metric queries. `resolveAdminScope` / `resolveEmployerScope` turn raw (validated) ids into a scope plus display labels, validating that a cohort belongs to its employer.

**Files:**
- Modify: `app/lib/reports-queries.server.ts`
- Modify: `tests/rls/reports-queries.test.ts`

- [ ] **Step 1: Add the failing tests**

Add `getReportsData, resolveAdminScope, resolveEmployerScope` to the import, plus these constants near the top of the test file:

```ts
const COHORT_RIVERBEND = '33333333-3333-3333-3333-333333333301';
const COHORT_NORTHSIDE = '33333333-3333-3333-3333-333333333302';
```

Append:

```ts
describe('reports-queries: getReportsData', () => {
  it('assembles every metric block', async () => {
    const d = await getReportsData(db, { level: 'global' });
    expect(d.kpis.activeInterns).toBe(6);
    expect(d.internsByGroup.groupBy).toBe('employer');
    expect(d.outcomes.ninetyDay.denominator).toBe(6);
    expect(d.assessmentCompletion).toHaveLength(5);
    expect(Array.isArray(d.barriers)).toBe(true);
    expect(Array.isArray(d.trend)).toBe(true);
  });
});

describe('reports-queries: resolveAdminScope', () => {
  it('no params -> global', async () => {
    const r = await resolveAdminScope(db, null, null);
    expect(r.scope).toEqual({ level: 'global' });
    expect(r.label).toBe('Program-wide');
  });

  it('employer only -> employer scope with the employer name', async () => {
    const r = await resolveAdminScope(db, RIVERBEND, null);
    expect(r.scope).toEqual({ level: 'employer', employerId: RIVERBEND });
    expect(r.label).toBe('Riverbend Manufacturing');
  });

  it('matching employer+cohort -> cohort scope', async () => {
    const r = await resolveAdminScope(db, RIVERBEND, COHORT_RIVERBEND);
    expect(r.scope).toEqual({
      level: 'cohort',
      employerId: RIVERBEND,
      cohortId: COHORT_RIVERBEND,
    });
  });

  it('drops a cohort that does not belong to the employer', async () => {
    const r = await resolveAdminScope(db, RIVERBEND, COHORT_NORTHSIDE);
    expect(r.scope).toEqual({ level: 'employer', employerId: RIVERBEND });
    expect(r.cohort).toBeNull();
  });

  it('unknown employer id -> global', async () => {
    const r = await resolveAdminScope(db, '11111111-1111-1111-1111-1111111199aa', null);
    expect(r.scope).toEqual({ level: 'global' });
  });
});

describe('reports-queries: resolveEmployerScope', () => {
  it('no cohort -> employer scope pinned to the caller', async () => {
    const r = await resolveEmployerScope(db, NORTHSIDE, null);
    expect(r.scope).toEqual({ level: 'employer', employerId: NORTHSIDE });
    expect(r.label).toBe('All cohorts');
  });

  it('own cohort -> cohort scope', async () => {
    const r = await resolveEmployerScope(db, NORTHSIDE, COHORT_NORTHSIDE);
    expect(r.scope).toEqual({
      level: 'cohort',
      employerId: NORTHSIDE,
      cohortId: COHORT_NORTHSIDE,
    });
    expect(r.label).toBe('Northside — Winter 2026 CNA Track');
  });

  it("a foreign cohort is ignored (stays employer scope)", async () => {
    const r = await resolveEmployerScope(db, NORTHSIDE, COHORT_RIVERBEND);
    expect(r.scope).toEqual({ level: 'employer', employerId: NORTHSIDE });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run --project rls tests/rls/reports-queries.test.ts`
Expected: FAIL — aggregator/resolvers not exported.

- [ ] **Step 3: Implement aggregator + resolvers**

Add this import near the top of `app/lib/reports-queries.server.ts` (reuses existing admin-query helpers):

```ts
import { getEmployerOrNull, getCohortOrNull } from './admin-queries.server';
```

Append:

```ts
import type { ReportsData } from './reports-types';

export async function getReportsData(db: DB, scope: ReportsScope): Promise<ReportsData> {
  const [kpis, internsByGroup, outcomes, assessmentCompletion, barrierRows, trend] =
    await Promise.all([
      getKpis(db, scope),
      getInternsByGroup(db, scope),
      getOutcomeRates(db, scope),
      getAssessmentCompletion(db, scope),
      getBarrierDistribution(db, scope),
      getSubmissionsTrend(db, scope),
    ]);
  return { kpis, internsByGroup, outcomes, assessmentCompletion, barriers: barrierRows, trend };
}

export interface ResolvedAdminScope {
  scope: ReportsScope;
  employer: { id: string; name: string } | null;
  cohort: { id: string; name: string } | null;
  label: string;
}

export async function resolveAdminScope(
  db: DB,
  employerId: string | null,
  cohortId: string | null,
): Promise<ResolvedAdminScope> {
  if (!employerId) {
    return { scope: { level: 'global' }, employer: null, cohort: null, label: 'Program-wide' };
  }
  const employer = await getEmployerOrNull(db, employerId);
  if (!employer) {
    return { scope: { level: 'global' }, employer: null, cohort: null, label: 'Program-wide' };
  }
  if (cohortId) {
    const cohort = await getCohortOrNull(db, cohortId);
    if (cohort && cohort.employerId === employer.id) {
      return {
        scope: { level: 'cohort', employerId: employer.id, cohortId: cohort.id },
        employer: { id: employer.id, name: employer.name },
        cohort: { id: cohort.id, name: cohort.name },
        label: `${employer.name} › ${cohort.name}`,
      };
    }
  }
  return {
    scope: { level: 'employer', employerId: employer.id },
    employer: { id: employer.id, name: employer.name },
    cohort: null,
    label: employer.name,
  };
}

export interface ResolvedEmployerScope {
  scope: ReportsScope;
  cohort: { id: string; name: string } | null;
  label: string;
}

export async function resolveEmployerScope(
  db: DB,
  employerId: string,
  cohortId: string | null,
): Promise<ResolvedEmployerScope> {
  if (cohortId) {
    const cohort = await getCohortOrNull(db, cohortId);
    if (cohort && cohort.employerId === employerId) {
      return {
        scope: { level: 'cohort', employerId, cohortId: cohort.id },
        cohort: { id: cohort.id, name: cohort.name },
        label: cohort.name,
      };
    }
  }
  return { scope: { level: 'employer', employerId }, cohort: null, label: 'All cohorts' };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run --project rls tests/rls/reports-queries.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add app/lib/reports-queries.server.ts tests/rls/reports-queries.test.ts
git commit -m "feat(reports): add getReportsData aggregator and scope resolvers"
```

---

## Task 11: `ReportsScopeBar` component

Controlled selects that navigate via search params. Tested with RR v7's `createRoutesStub` (provides router context for `useNavigate`).

**Files:**
- Create: `app/components/reports/ReportsScopeBar.tsx`
- Modify: `app/styles/reports.css` (append scope-bar rules)
- Test: `tests/components/ReportsScopeBar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/ReportsScopeBar.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { ReportsScopeBar } from '../../app/components/reports/ReportsScopeBar';

function renderBar(props: React.ComponentProps<typeof ReportsScopeBar>) {
  const Stub = createRoutesStub([{ path: '/', Component: () => <ReportsScopeBar {...props} /> }]);
  return render(<Stub initialEntries={['/']} />);
}

describe('ReportsScopeBar', () => {
  it('admin mode shows the employer select and the scope chip', () => {
    renderBar({
      mode: 'admin',
      employers: [{ id: 'e1', name: 'Riverbend' }],
      cohorts: [],
      selectedEmployerId: null,
      selectedCohortId: null,
      scopeLabel: 'Program-wide',
    });
    expect(screen.getByLabelText(/filter by employer/i)).toBeInTheDocument();
    expect(screen.getByText('Program-wide')).toBeInTheDocument();
  });

  it('disables the cohort select until an employer is chosen (admin)', () => {
    renderBar({
      mode: 'admin',
      employers: [{ id: 'e1', name: 'Riverbend' }],
      cohorts: [],
      selectedEmployerId: null,
      selectedCohortId: null,
      scopeLabel: 'Program-wide',
    });
    expect(screen.getByLabelText(/filter by cohort/i)).toBeDisabled();
  });

  it('employer mode hides the employer select', () => {
    renderBar({
      mode: 'employer',
      cohorts: [{ id: 'c1', name: 'CNA Track' }],
      selectedEmployerId: null,
      selectedCohortId: null,
      scopeLabel: 'All cohorts',
    });
    expect(screen.queryByLabelText(/filter by employer/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/filter by cohort/i)).not.toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project dom tests/components/ReportsScopeBar.test.tsx`
Expected: FAIL — cannot resolve `ReportsScopeBar`.

- [ ] **Step 3: Write the component + CSS**

```tsx
// app/components/reports/ReportsScopeBar.tsx
// The reports scope filter (spec "Option A"). Controlled selects that reflect
// the current loader scope and navigate via search params on change. Server
// re-queries on navigation — no client data fetching. Admin mode shows an
// employer select; employer mode pins the employer server-side and shows only
// the cohort select.

import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router';

export interface ReportsScopeBarProps {
  mode: 'admin' | 'employer';
  employers?: { id: string; name: string }[];
  cohorts: { id: string; name: string }[];
  selectedEmployerId: string | null;
  selectedCohortId: string | null;
  scopeLabel: string;
}

export function ReportsScopeBar({
  mode,
  employers = [],
  cohorts,
  selectedEmployerId,
  selectedCohortId,
  scopeLabel,
}: ReportsScopeBarProps) {
  const navigate = useNavigate();

  function go(next: URLSearchParams) {
    const qs = next.toString();
    navigate(qs ? `?${qs}` : '?');
  }

  function onEmployer(e: ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const next = new URLSearchParams();
    if (v) next.set('employerId', v); // changing employer clears the cohort
    go(next);
  }

  function onCohort(e: ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const next = new URLSearchParams();
    if (selectedEmployerId) next.set('employerId', selectedEmployerId);
    if (v) next.set('cohortId', v);
    go(next);
  }

  const cohortDisabled = mode === 'admin' && !selectedEmployerId;

  return (
    <div className="reports-scopebar">
      <span className="reports-scopebar__label">Viewing</span>
      {mode === 'admin' && (
        <select
          className="reports-scopebar__select"
          aria-label="Filter by employer"
          value={selectedEmployerId ?? ''}
          onChange={onEmployer}
        >
          <option value="">All Employers</option>
          {employers.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      )}
      <select
        className="reports-scopebar__select"
        aria-label="Filter by cohort"
        value={selectedCohortId ?? ''}
        onChange={onCohort}
        disabled={cohortDisabled}
      >
        <option value="">All Cohorts</option>
        {cohorts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <span className="reports-scopebar__chip">{scopeLabel}</span>
    </div>
  );
}
```

Append to `app/styles/reports.css`:

```css
/* Scope filter bar */
.reports-scopebar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--white);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  padding: 10px 14px;
  margin: 16px 0 4px;
  flex-wrap: wrap;
}
.reports-scopebar__label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--muted);
}
.reports-scopebar__select {
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--ink);
  background: var(--canvas);
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 7px 10px;
}
.reports-scopebar__select:disabled {
  opacity: 0.5;
}
.reports-scopebar__chip {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.5px;
  background: var(--navy);
  color: var(--white);
  border-radius: 20px;
  padding: 6px 12px;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project dom tests/components/ReportsScopeBar.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/reports/ReportsScopeBar.tsx app/styles/reports.css tests/components/ReportsScopeBar.test.tsx
git commit -m "feat(reports): add ReportsScopeBar filter component"
```

---

## Task 12: `ReportsDashboard` component

Composes the KPI grid + chart grid from a `ReportsData`. Pure presentational.

**Files:**
- Create: `app/components/reports/ReportsDashboard.tsx`
- Modify: `app/styles/reports.css` (append grid rules)
- Test: `tests/components/ReportsDashboard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/ReportsDashboard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportsDashboard } from '../../app/components/reports/ReportsDashboard';
import type { ReportsData } from '../../app/lib/reports-types';

const GLOBAL: ReportsData = {
  kpis: { employers: 6, activeInterns: 37, employed90Pct: 74, assessedPct: 81 },
  internsByGroup: {
    groupBy: 'employer',
    rows: [{ id: 'e1', label: 'Riverbend', count: 12 }],
  },
  outcomes: {
    ninetyDay: { numerator: 27, denominator: 37 },
    oneEightyDay: { numerator: 19, denominator: 31 },
  },
  assessmentCompletion: [{ key: 'competency', label: 'Competency', completed: 30, total: 37 }],
  barriers: [{ id: 'b1', label: 'Transportation', count: 22 }],
  trend: [],
};

describe('ReportsDashboard', () => {
  it('renders the KPI tiles including Employers at global scope', () => {
    render(<ReportsDashboard data={GLOBAL} />);
    expect(screen.getByText('Employers')).toBeInTheDocument();
    expect(screen.getByText('Active Interns')).toBeInTheDocument();
    expect(screen.getByText('Interns by Employer')).toBeInTheDocument();
  });

  it('omits the Employers tile and uses cohort heading when scoped', () => {
    const scoped: ReportsData = {
      ...GLOBAL,
      kpis: { ...GLOBAL.kpis, employers: null },
      internsByGroup: { groupBy: 'cohort', rows: [] },
    };
    render(<ReportsDashboard data={scoped} />);
    expect(screen.queryByText('Employers')).not.toBeInTheDocument();
    expect(screen.getByText('Interns by Cohort')).toBeInTheDocument();
  });

  it('renders the trend empty state when there is no activity', () => {
    render(<ReportsDashboard data={GLOBAL} />);
    expect(screen.getByText('No submissions in this period.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project dom tests/components/ReportsDashboard.test.tsx`
Expected: FAIL — cannot resolve `ReportsDashboard`.

- [ ] **Step 3: Write the component + CSS**

```tsx
// app/components/reports/ReportsDashboard.tsx
// Presentational composition of the reports dashboard: a KPI grid (reusing the
// admin.css .kpi-grid/.kpi-card) plus a responsive chart grid. Takes a fully
// computed ReportsData; no data or formatting logic lives here.

import { KpiCard } from '~/components/KpiCard';
import { BarList } from '~/components/charts/BarList';
import { RadialGauge } from '~/components/charts/RadialGauge';
import { ProgressList } from '~/components/charts/ProgressList';
import { AreaTrend } from '~/components/charts/AreaTrend';
import type { ReportsData } from '~/lib/reports-types';

export function ReportsDashboard({ data }: { data: ReportsData }) {
  const { kpis, internsByGroup, outcomes, assessmentCompletion, barriers, trend } = data;
  const pad2 = (n: number) => String(n).padStart(2, '0');

  return (
    <>
      <section>
        <div className="container">
          <div className="kpi-grid">
            {kpis.employers !== null && (
              <KpiCard label="Employers" value={pad2(kpis.employers)} delta="ACTIVE PARTNERS" />
            )}
            <KpiCard label="Active Interns" value={pad2(kpis.activeInterns)} delta="IN SCOPE" variant="cyan" />
            <KpiCard
              label="90-Day Employed"
              value={`${kpis.employed90Pct}%`}
              delta="OF ACTIVE INTERNS"
              variant="success"
            />
            <KpiCard
              label="Assessed"
              value={`${kpis.assessedPct}%`}
              delta="HAVE A COMPETENCY"
              variant="gold"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="reports-grid">
            <article className="report-card">
              <div className="report-card__head">
                <h3 className="report-card__title">
                  {internsByGroup.groupBy === 'employer' ? 'Interns by Employer' : 'Interns by Cohort'}
                </h3>
                <span className="micro-label">ROSTER</span>
              </div>
              <BarList
                rows={internsByGroup.rows.map((r) => ({ label: r.label, value: r.count }))}
                emptyLabel="No interns yet."
              />
            </article>

            <article className="report-card">
              <div className="report-card__head">
                <h3 className="report-card__title">Employment Outcomes</h3>
                <span className="micro-label">OUTCOMES</span>
              </div>
              <div className="gauge-row">
                <RadialGauge
                  value={outcomes.ninetyDay.numerator}
                  total={outcomes.ninetyDay.denominator}
                  label="90-Day"
                  tone="success"
                />
                <RadialGauge
                  value={outcomes.oneEightyDay.numerator}
                  total={outcomes.oneEightyDay.denominator}
                  label="180-Day"
                  tone="navy"
                />
              </div>
            </article>

            <article className="report-card">
              <div className="report-card__head">
                <h3 className="report-card__title">Assessment Completion</h3>
                <span className="micro-label">PROGRESS</span>
              </div>
              <ProgressList
                rows={assessmentCompletion.map((a) => ({
                  label: a.label,
                  completed: a.completed,
                  total: a.total,
                }))}
              />
            </article>

            <article className="report-card">
              <div className="report-card__head">
                <h3 className="report-card__title">Entry Barriers</h3>
                <span className="micro-label">POPULATION</span>
              </div>
              <BarList
                rows={barriers.map((b) => ({ label: b.label, value: b.count }))}
                variant="gold"
                emptyLabel="No barriers recorded."
              />
            </article>

            <article className="report-card report-card--wide">
              <div className="report-card__head">
                <h3 className="report-card__title">Submissions Over Time</h3>
                <span className="micro-label">LAST 8 WEEKS</span>
              </div>
              <AreaTrend points={trend.map((t) => ({ label: t.weekStart, value: t.count }))} />
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
```

Append to `app/styles/reports.css`:

```css
/* Dashboard grid */
.reports-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin-top: 18px;
}
.report-card {
  background: var(--white);
  border: 1px solid var(--rule);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
  box-shadow: var(--shadow-sm);
}
.report-card--wide {
  grid-column: 1 / -1;
}
.report-card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}
.report-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--navy);
}
@media (max-width: 760px) {
  .reports-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project dom tests/components/ReportsDashboard.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/reports/ReportsDashboard.tsx app/styles/reports.css tests/components/ReportsDashboard.test.tsx
git commit -m "feat(reports): add ReportsDashboard composition component"
```

---

## Task 13: Register `reports.css` globally

**Files:**
- Modify: `app/root.tsx`

- [ ] **Step 1: Add the import + link**

In `app/root.tsx`, after the `employerShellCss` import line (`import employerShellCss from './styles/employer-shell.css?url';`), add:

```ts
import reportsCss from './styles/reports.css?url';
```

In the `links` array, after `{ rel: 'stylesheet', href: employerShellCss },` add:

```ts
  { rel: 'stylesheet', href: reportsCss },
```

- [ ] **Step 2: Verify build + typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/root.tsx
git commit -m "feat(reports): register reports.css stylesheet"
```

---

## Task 14: Admin reports route (replace placeholder)

**Files:**
- Modify (replace contents): `app/routes/admin.reports.tsx`

- [ ] **Step 1: Replace the placeholder with the real route**

```tsx
// app/routes/admin.reports.tsx
import { data, useLoaderData } from 'react-router';
import type { Route } from './+types/admin.reports';
import { requireAdmin } from '~/lib/admin-guard.server';
import { db } from '~/lib/db.server';
import { UUID_RE } from '~/lib/validation';
import { listAllEmployers } from '~/lib/admin-queries.server';
import { cohortsForEmployer } from '~/lib/employer-scope.server';
import { getReportsData, resolveAdminScope } from '~/lib/reports-queries.server';
import { PageHead } from '~/components/PageHead';
import { ReportsScopeBar } from '~/components/reports/ReportsScopeBar';
import { ReportsDashboard } from '~/components/reports/ReportsDashboard';

export const meta: Route.MetaFunction = () => [{ title: 'Reports · IMPACT Admin' }];

export async function loader({ request }: Route.LoaderArgs) {
  const { headers } = await requireAdmin(request);
  const url = new URL(request.url);
  const employerIdRaw = url.searchParams.get('employerId');
  const cohortIdRaw = url.searchParams.get('cohortId');

  if (employerIdRaw && !UUID_RE.test(employerIdRaw)) {
    throw new Response('Bad Request', { status: 400 });
  }
  if (cohortIdRaw && !UUID_RE.test(cohortIdRaw)) {
    throw new Response('Bad Request', { status: 400 });
  }

  const resolved = await resolveAdminScope(db, employerIdRaw, cohortIdRaw);
  const [reports, employerList, cohortRows] = await Promise.all([
    getReportsData(db, resolved.scope),
    listAllEmployers(db),
    resolved.employer ? cohortsForEmployer(resolved.employer.id) : Promise.resolve([]),
  ]);

  return data(
    {
      reports,
      employerList,
      cohortList: cohortRows.map((c) => ({ id: c.id, name: c.name })),
      selectedEmployerId: resolved.employer?.id ?? null,
      selectedCohortId: resolved.cohort?.id ?? null,
      scopeLabel: resolved.label,
    },
    { headers },
  );
}

export default function AdminReports() {
  const { reports, employerList, cohortList, selectedEmployerId, selectedCohortId, scopeLabel } =
    useLoaderData<typeof loader>();
  return (
    <>
      <PageHead
        breadcrumb="ADMIN / REPORTS"
        title="PROGRAM REPORTS."
        sub="Program-wide metrics. Filter by employer and cohort to scope every chart."
      />
      <section>
        <div className="container">
          <ReportsScopeBar
            mode="admin"
            employers={employerList}
            cohorts={cohortList}
            selectedEmployerId={selectedEmployerId}
            selectedCohortId={selectedCohortId}
            scopeLabel={scopeLabel}
          />
        </div>
      </section>
      <ReportsDashboard data={reports} />
    </>
  );
}
```

- [ ] **Step 2: Verify typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS (build ~a few seconds).

- [ ] **Step 3: Manual smoke (optional but recommended)**

Run: `npm run dev`, sign in as admin (`admin@example.com` / `DevPassword123!`), open `/admin/reports`. Expect KPI tiles, the bar/gauge/meter charts, and an empty trend ("No submissions in this period."). Pick an employer in the filter → the KPI "Employers" tile disappears and charts re-scope. Append `?employerId=not-a-uuid` → expect a 400 page.

- [ ] **Step 4: Commit**

```bash
git add app/routes/admin.reports.tsx
git commit -m "feat(reports): build admin reports dashboard route"
```

---

## Task 15: Employer reports route + navigation

**Files:**
- Create: `app/routes/employer.reports.tsx`
- Modify: `app/routes.ts` (register the route)
- Modify: `app/components/nav/EmployerNav.tsx` (add Reports link)
- Modify: `app/routes/employer._index.tsx` (add Reports quick link)

- [ ] **Step 1: Create the route**

```tsx
// app/routes/employer.reports.tsx
// Employer-scoped reports dashboard. Scope is pinned to the signed-in
// employer's id (from the verified JWT); an optional ?cohortId narrows to one
// of their own cohorts. Auth is enforced by the employer.tsx layout; the
// !auth?.employerId check here is belt-and-suspenders for TS narrowing.

import { data, redirect, useLoaderData } from 'react-router';
import type { Route } from './+types/employer.reports';
import { getAuthContext } from '~/lib/auth.server';
import { db } from '~/lib/db.server';
import { UUID_RE } from '~/lib/validation';
import { cohortsForEmployer } from '~/lib/employer-scope.server';
import { getReportsData, resolveEmployerScope } from '~/lib/reports-queries.server';
import { PageHead } from '~/components/PageHead';
import { ReportsScopeBar } from '~/components/reports/ReportsScopeBar';
import { ReportsDashboard } from '~/components/reports/ReportsDashboard';

export const meta: Route.MetaFunction = () => [{ title: 'Reports — IMPACT Employer' }];

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const auth = await getAuthContext(request, headers);
  if (!auth?.employerId) {
    throw redirect('/login', { headers });
  }
  const url = new URL(request.url);
  const cohortIdRaw = url.searchParams.get('cohortId');
  if (cohortIdRaw && !UUID_RE.test(cohortIdRaw)) {
    throw new Response('Bad Request', { status: 400 });
  }

  const resolved = await resolveEmployerScope(db, auth.employerId, cohortIdRaw);
  const [reports, cohortRows] = await Promise.all([
    getReportsData(db, resolved.scope),
    cohortsForEmployer(auth.employerId),
  ]);

  return data(
    {
      reports,
      cohortList: cohortRows.map((c) => ({ id: c.id, name: c.name })),
      selectedCohortId: resolved.cohort?.id ?? null,
      scopeLabel: resolved.label,
    },
    { headers },
  );
}

export default function EmployerReports() {
  const { reports, cohortList, selectedCohortId, scopeLabel } = useLoaderData<typeof loader>();
  return (
    <>
      <PageHead
        breadcrumb="EMPLOYER / REPORTS / 2026"
        title="YOUR REPORTS."
        sub="Metrics scoped to your organization. Filter to a single cohort to narrow every chart."
      />
      <section>
        <div className="container">
          <ReportsScopeBar
            mode="employer"
            cohorts={cohortList}
            selectedEmployerId={null}
            selectedCohortId={selectedCohortId}
            scopeLabel={scopeLabel}
          />
        </div>
      </section>
      <ReportsDashboard data={reports} />
    </>
  );
}
```

- [ ] **Step 2: Register the route**

In `app/routes.ts`, inside the `layout('routes/employer.tsx', [...])` block, add after the `employer/assessments` line:

```ts
    route('employer/reports', 'routes/employer.reports.tsx'),
```

- [ ] **Step 3: Add the nav link**

In `app/components/nav/EmployerNav.tsx`, update the `LINKS` array to insert Reports after Assessments:

```ts
const LINKS: ReadonlyArray<{ to: string; label: string; end?: boolean }> = [
  { to: '/employer', label: 'Home', end: true },
  { to: '/employer/cohorts', label: 'Cohorts' },
  { to: '/employer/interns', label: 'Interns' },
  { to: '/employer/assessments', label: 'Assessments' },
  { to: '/employer/reports', label: 'Reports' },
  { to: '/employer/profile', label: 'Org Details' },
];
```

- [ ] **Step 4: Add the quick link**

In `app/routes/employer._index.tsx`, update `QUICK_LINKS`:

```ts
const QUICK_LINKS = [
  { to: '/employer/cohorts', label: 'Cohorts' },
  { to: '/employer/interns', label: 'Interns' },
  { to: '/employer/reports', label: 'Reports' },
  { to: '/employer/profile', label: 'Org Details' },
] as const;
```

- [ ] **Step 5: Verify typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 6: Manual smoke (optional)**

`npm run dev`, sign in as employer (`employer1@example.com` / `DevPassword123!`), click **Reports**. Expect the dashboard scoped to Riverbend (1 intern, no Employers KPI tile, "Interns by Cohort" heading). The cohort filter lists only Riverbend's cohort.

- [ ] **Step 7: Commit**

```bash
git add app/routes/employer.reports.tsx app/routes.ts app/components/nav/EmployerNav.tsx app/routes/employer._index.tsx
git commit -m "feat(reports): add employer reports route and nav links"
```

---

## Task 16: Playwright happy-path E2E

**Files:**
- Create: `tests/e2e/reports.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
// tests/e2e/reports.spec.ts
// Reports dashboard happy-path. Mirrors the login flow in
// tests/e2e/admin-crud.spec.ts and tests/e2e/employer-login.spec.ts.
//
// Seed assumption: `npm run db:seed` then `npx tsx scripts/restore-dev-profiles.ts`
// (so employer1@example.com is bound to Riverbend). Playwright loads .env.test.

import { test, expect } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';
const EMPLOYER_EMAIL = process.env.E2E_EMPLOYER_EMAIL ?? 'employer1@example.com';
const EMPLOYER_PASSWORD = process.env.E2E_EMPLOYER_PASSWORD ?? 'DevPassword123!';

test.describe('Reports dashboard', () => {
  test('admin sees the global reports dashboard and can scope by employer', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.goto('/admin/reports');
    await expect(page.getByRole('heading', { name: /program reports/i })).toBeVisible();
    // Global scope shows the Employers KPI tile.
    await expect(page.getByText('Employers')).toBeVisible();
    await expect(page.locator('.reports-scopebar__chip')).toContainText(/program-wide/i);

    // Scope to one employer via the filter; the chart heading flips to cohort.
    await page.getByLabel(/filter by employer/i).selectOption({ label: 'Riverbend Manufacturing' });
    await expect(page.locator('.reports-scopebar__chip')).toContainText('Riverbend');
    await expect(page.getByText('Interns by Cohort')).toBeVisible();
  });

  test('employer sees only their own scoped reports', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(EMPLOYER_EMAIL);
    await page.getByLabel(/password/i).fill(EMPLOYER_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/employer$/);

    await page.getByRole('link', { name: /^Reports$/ }).first().click();
    await expect(page).toHaveURL(/\/employer\/reports/);
    await expect(page.getByRole('heading', { name: /your reports/i })).toBeVisible();
    // Employer scope omits the global-only Employers KPI tile and pins scope.
    await expect(page.getByText('Employers')).toHaveCount(0);
    await expect(page.getByText('Interns by Cohort')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the spec**

Run: `npx playwright test tests/e2e/reports.spec.ts`
Expected: PASS (2 tests). (Requires local Supabase running + a seeded DB + restored dev profiles, per the spec header.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/reports.spec.ts
git commit -m "test(reports): add reports dashboard e2e happy-path"
```

---

## Task 17: Full verification + docs

**Files:**
- Modify: `docs/launch-todo.md` (check off Reports)
- Modify: `CLAUDE.md` (note Reports is built)

- [ ] **Step 1: Run the full local gate**

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
Expected: all PASS. (Unit + dom projects run in `npm test`; the `rls` project needs `supabase start` and runs via `npm run test:rls`.)

- [ ] **Step 2: Run the DB-backed query tests**

Run: `npm run test:rls`
Expected: PASS, including the new `tests/rls/reports-queries.test.ts`.

- [ ] **Step 3: Update the launch to-do**

In `docs/launch-todo.md`, change the Reports line under "SP6 launch-plan phases still open" from unchecked to checked:

```markdown
- [x] **Reports (Phase C).** Admin + employer reports dashboards built — KPI
      tiles, bars, gauges, meters, and an activity trend, with employer/cohort
      scope filtering. Outcome denominator = all in-scope interns (v1 rule).
```

- [ ] **Step 4: Note it in CLAUDE.md**

In `CLAUDE.md`, in the SP6 status line where Reports is listed as remaining, add a short note that the Reports dashboards (`/admin/reports` + `/employer/reports`) are now built with a dependency-free SVG/CSS chart kit and a scope-aware data layer (`app/lib/reports-queries.server.ts`). Keep it to one or two sentences consistent with the surrounding prose.

- [ ] **Step 5: Commit**

```bash
git add docs/launch-todo.md CLAUDE.md
git commit -m "docs(reports): mark Reports phase complete"
```

- [ ] **Step 6: Finish the branch**

Use the `superpowers:finishing-a-development-branch` skill to decide how to integrate `feat/reports-dashboard` (push + open PR for CI, then squash-merge per the repo convention).

---

## Self-review notes (author)

- **Spec coverage:** roster bars (Tasks 3/8/12), outcomes gauges (4/8/12), assessment completion meters (5/9/12), barriers bars (3/9/12), trend (6/9/12), KPI tiles (7/12), scope filter (11), admin route incl. UUID-400 + cohort-belongs-to-employer (10/14), employer route pinned scope (10/15), nav/quick links (15), empty states (3/5/6/12), tests at all three layers (unit 1, dom 3–6/11/12, rls 7–10, e2e 16). All spec sections map to a task.
- **Placeholder scan:** no TBD/TODO; every code step is complete.
- **Type consistency:** `ReportsScope`/`ReportsData` defined once in `reports-types.ts` (Task 2) and consumed unchanged; `pct` (Task 1) used in queries + gauge + meter; `getReportsData`/resolver return shapes match their route consumers (Tasks 14/15); `ReportsScopeBar` props match both call sites.
