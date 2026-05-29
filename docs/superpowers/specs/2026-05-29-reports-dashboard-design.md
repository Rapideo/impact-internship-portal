# Reports Dashboard — Design Spec

**Date:** 2026-05-29
**Status:** Approved (brainstorm), pending implementation plan
**Sub-project:** SP6 Phase C (Reports)

## Context

`/admin/reports` is a "coming soon" placeholder (`app/routes/admin.reports.tsx`).
There is no employer reports route. This spec replaces the placeholder with a
robust, chart-driven dashboard and adds a scoped equivalent for employers.

The data model already carries everything we need: `employers`, `cohorts`,
`roles`, `interns` (soft-deletable), `intern_entry_barriers` + `barriers`,
`intern_employment_outcomes` (90/180-day), competency `phases`, and
`assessment_submissions` (5 types, timestamped). No new tables or columns.

## Goals

- A program-wide ("global") dashboard for admins.
- A scoped dashboard for employers, showing only their own data.
- Admin drill-down: narrow the global view to one employer, then one cohort.
- Visually rich, brand-consistent charts (bars, gauges, meters, trend).
- Zero new runtime dependencies.

## Non-goals (v1)

- CSV / PDF export.
- Custom date-range pickers.
- Click-to-drill bars (a noted future enhancement; the filter bar is v1).
- Live / real-time refresh.

## Core idea: one dashboard, scoped

A single set of chart components, fed by one scope-aware data layer. The only
thing that varies between the global view, the admin-scoped view, and the
employer view is a **scope** value applied as a `WHERE` clause. The charts are
scope-agnostic.

```ts
type ReportsScope =
  | { level: 'global' }
  | { level: 'employer'; employerId: string }
  | { level: 'cohort'; employerId: string; cohortId: string };
```

The employer view simply has its scope pinned to the signed-in employer; the
admin view resolves its scope from query params. "The per-employer dashboard"
is not a separate artifact — it is the global dashboard with a scope applied.

## Data layer — `app/lib/reports-queries.server.ts` (new)

One module exposing `getReportsData(db, scope): Promise<ReportsData>`, which
runs the metric queries in parallel and returns a single typed object. Metric
builders each accept the resolved scope and translate it to a SQL predicate.

Following the established `employer-scope.server.ts` pattern, queries run on the
service-role `db` client with the **caller-passed scope as the trust boundary**.
The admin guard (admin routes) and the `employer.tsx` layout (employer route)
have already verified the caller before the scope reaches this module. (Carry-
over #77 — splitting a true `anon` RLS connection — applies here as it does to
the existing employer-scope helpers; out of scope for this feature.)

### Scope → predicate

The in-scope intern set is the spine of nearly every metric:

- `global`: `interns.deleted_at IS NULL`
- `employer`: above AND `interns.cohort_id IN (SELECT id FROM cohorts WHERE employer_id = :employerId)`
- `cohort`: above AND `interns.cohort_id = :cohortId`

### `ReportsData` shape

```ts
interface ReportsData {
  scope: ResolvedScope;          // includes resolved display labels (see below)
  kpis: {
    employers: number | null;    // null unless scope.level === 'global'
    activeInterns: number;
    employed90Pct: number;       // 0–100, rounded
    assessedPct: number;         // 0–100, rounded (>=1 competency submission)
  };
  internsByGroup: {
    groupBy: 'employer' | 'cohort';   // 'employer' at global, else 'cohort'
    rows: { id: string; label: string; count: number }[];   // desc by count
  };
  outcomes: {
    ninetyDay: { numerator: number; denominator: number };
    oneEightyDay: { numerator: number; denominator: number };
  };
  assessmentCompletion: {
    key: 'competency' | 'personal-goals' | 'midpoint-reflection'
       | 'participant-feedback' | 'exit-employer-survey';
    label: string;
    completed: number;           // distinct in-scope interns with >=1 submission
    total: number;               // in-scope intern count
  }[];
  barriers: { id: string; label: string; count: number }[];   // desc by count
  trend: { weekStart: string; count: number }[];               // ascending weeks
}
```

### Metric definitions (v1)

- **KPI · Employers** (global only): count of all `employers` rows.
- **KPI · Active interns:** count of in-scope interns.
- **KPI · 90-day employed %:** `employed_90_day = true` over in-scope interns.
- **KPI · Assessed %:** in-scope interns with ≥1 non-deleted `competency`
  submission, over in-scope interns.
- **Interns by group:** bars — by employer (global) or by cohort (scoped).
- **Outcomes 90 / 180-day:** gauges. Numerator = interns flagged employed at
  that milestone; **denominator = all in-scope active interns** (simple,
  defensible; a "time-eligible" denominator is a future refinement, consistent
  with today's placeholder `assessmentsNeeded` rule).
- **Assessment completion:** progress meters; for each of the five types, the
  share of in-scope interns with ≥1 non-deleted submission of that type.
- **Entry barriers:** counts of each barrier across in-scope interns
  (`intern_entry_barriers` → `barriers`), descending.
- **Submissions over time:** non-deleted submissions for in-scope interns,
  bucketed by `date_trunc('week', submitted_at)`, last 8 weeks (ascending).

## Chart components — `app/components/charts/` (new)

Pure SVG/CSS, server-rendered, themed with the brand tokens. New styles in
`app/styles/reports.css`. Each component renders a graceful **empty state**
("No data yet") — production starts empty, so this is mandatory, not optional.

- `BarList` — horizontal bars; `variant` `navy` (default) | `gold`. Props:
  `rows: { label; value }[]`, `max?`, `variant?`, `emptyLabel?`.
- `RadialGauge` — SVG donut dial; props `value`, `total`, `label`, `tone`
  (`success` | `navy` | `cyan` | `gold`). Renders center % and `n of m`.
- `ProgressList` (+ internal `ProgressMeter`) — labeled cyan completion meters;
  props `rows: { label; completed; total }[]`.
- `AreaTrend` — SVG area + line sparkline; props `points: { label; value }[]`.
- Reuse the existing `KpiCard` for the stat tiles (no new component).

Components take already-shaped data and own only their rendering — no DB or
formatting logic inside. This keeps each one independently testable.

## Scope filter — `ReportsScopeBar` component

The approved "Option A" control: a slim bar beneath the page header.

- **Admin:** an **Employer** `<select>` (All Employers + each employer) and a
  **Cohort** `<select>` (All Cohorts of the chosen employer; disabled until an
  employer is chosen), plus a mono scope chip echoing the current view.
- **Employer:** the employer select is omitted (their employer is pinned); only
  the **Cohort** select and chip render.

It is a plain navigation control: changing a select navigates to the same route
with updated `?employerId=&cohortId=` search params, and the loader re-queries
server-side. This mirrors how existing admin routes read query params; no
client-side data fetching, no charting-lib hydration.

## Routes

### `/admin/reports` (replaces placeholder)

- `requireAdmin` guard.
- Read `?employerId=` and `?cohortId=`; validate each against `UUID_RE`
  (return 400 on malformed, per the existing querystring-validation contract).
- Resolve scope via `resolveAdminScope`:
  - both absent → `global`.
  - `employerId` only (valid, resolves to a row) → `employer`.
  - `employerId` + `cohortId` where the cohort belongs to that employer →
    `cohort`. If the cohort does not belong to the employer, drop the cohort and
    fall back to `employer`.
  - `cohortId` without `employerId` → ignore the cohort (fall back to `global`).
- Load `getReportsData(db, scope)` plus the employer list (for the select) and,
  when an employer is selected, that employer's cohort list.
- Render `ReportsScopeBar` + the dashboard grid.

### `/employer/reports` (new)

- Lives under the `employer.tsx` trust boundary; pull `auth.employerId` via
  `getAuthContext` with the thin `if (!auth?.employerId) throw redirect('/login')`
  narrowing guard (not the redirect ladder — the layout owns that).
- Read `?cohortId=`; validate `UUID_RE`; verify it belongs to `auth.employerId`
  (reuse `cohortsForEmployer` / a scoped check). Invalid or foreign → ignore and
  use `employer` scope.
- Scope is pinned: `employer` (or `cohort` when a valid own-cohort is selected).
  An employer can never widen scope past their own `employerId`.
- Render the dashboard with the cohort-only scope bar.
- Register in `app/routes.ts`; add a **Reports** link to `EmployerNav` (between
  Assessments and Org Details) and to the employer home Quick Links.

## Security / scope guards

- Employer scope is derived solely from the verified JWT `employerId`; form- and
  query-supplied employer ids are never trusted on the employer route.
- Admin cohort filtering requires a matching employer; a cohort that does not
  belong to the selected employer is dropped rather than honored.
- All query-param ids are `UUID_RE`-validated before touching the DB.

## Empty states

Every chart renders a neutral empty state when its dataset is empty, and the
KPI tiles render `0` / `0%` cleanly. The page itself renders normally with an
empty dataset (no crash, no blank screen) so a freshly-launched prod looks
intentional rather than broken.

## Testing (matches the existing pyramid)

- **Unit / integration** (`rls` project — real Postgres via `supabase start`):
  the scope-aware query builders and `resolveAdminScope` / employer-scope
  resolution, asserted against seed data at each scope level.
- **DOM render tests** (`dom` project): each chart component with populated
  data and with empty data; `ReportsScopeBar` renders the right controls for
  admin vs employer.
- **Playwright happy-path:** admin reports loads and the employer filter
  re-scopes the KPI tiles; employer reports loads pinned to their scope and
  cannot reach another employer's data.

## Files

**New**
- `app/lib/reports-queries.server.ts`
- `app/components/charts/BarList.tsx`
- `app/components/charts/RadialGauge.tsx`
- `app/components/charts/ProgressList.tsx`
- `app/components/charts/AreaTrend.tsx`
- `app/components/reports/ReportsScopeBar.tsx`
- `app/components/reports/ReportsDashboard.tsx` (composes the grid; shared by both routes)
- `app/styles/reports.css`
- `app/routes/employer.reports.tsx`
- Tests alongside the above (`*.test.ts` / `*.test.tsx`) + a Playwright spec.

**Modified**
- `app/routes/admin.reports.tsx` (placeholder → real dashboard)
- `app/routes.ts` (register `/employer/reports`)
- `app/components/nav/EmployerNav.tsx` (add Reports link)
- `app/routes/employer._index.tsx` (add Reports quick link)
- import `app/styles/reports.css` where global styles are registered

## Build sequence (phasing)

- **A — Chart kit:** build the chart components + `reports.css` + DOM render
  tests in isolation (no data dependency).
- **B — Data layer:** `reports-queries.server.ts` + scope resolvers + integration
  tests against seed.
- **C — Admin route:** replace the placeholder, wire `ReportsScopeBar` +
  `ReportsDashboard`, server-side scope resolution.
- **D — Employer route:** new route, nav link, quick link, pinned scope.
- **E — E2E + polish:** Playwright happy-path, empty-state QA, visual pass.

## Open questions / future refinements

- Outcome denominator: switch from "all in-scope interns" to "time-eligible"
  once program staff define eligibility windows.
- Click-to-drill bars (Option B) as a shortcut layered over the filter bar.
- Export (CSV) and date-range filtering if stakeholders request them.
