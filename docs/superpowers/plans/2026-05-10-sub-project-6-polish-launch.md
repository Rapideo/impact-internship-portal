# Sub-Project 6: Polish & Launch — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the feature-complete app from sub-projects 1-5 to a live, observable, accessible, performant production deployment on `https://impact-internship-portal.netlify.app` — branded transactional emails, the Reports stub, Sentry error tracking, axe-core + Lighthouse passes, full Playwright smoke matrix, finalized prod seed, and a documented, reversible Netlify cutover from the prototype to the real app.

**Architecture:** This is the integration / launch sub-project. It introduces no new domain features — instead it (a) wires cross-cutting concerns (observability, structured logging, accessibility audits, performance budgets) across the app shipped by sub-projects 1-5, (b) finalizes the production data seed and admin-bootstrap script that sub-project 1 scaffolded, and (c) executes the Netlify publish-directory cutover from `Prototypes/PROTOTYPE/` to the React Router v7 build output. The cutover is the single highest-risk event in the whole rebuild and is staged behind a Netlify draft deploy with an explicit rollback procedure.

**Tech Stack:** TypeScript 5.7, React Router v7 (framework mode), Vite 6 + `rollup-plugin-visualizer`, Node 22 LTS, Drizzle 0.36 + postgres-js 3.4, @supabase/supabase-js 2.46, @supabase/ssr 0.5, Resend 4, Vitest 2, Playwright 1.49 + `@axe-core/playwright`, ESLint 9, Prettier 3, `@sentry/react-router` (or `@sentry/react` + `@sentry/node` if the RR v7 adapter isn't published), `@lhci/cli` (optional Lighthouse CI), GitHub Actions, Netlify (`@netlify/react-router-adapter`).

**Spec:** `docs/superpowers/specs/2026-05-10-production-rebuild-design.md` (sections 8.3 "Launch shape — big-bang", 8.4 row 6 "Polish & launch", and all of section 9 "Cross-Cutting Concerns").

**Working directory for all paths below:** `IMPACT Internship Assessment Portal/` (the repo root, post the sub-project 1 folder rename).

---

## Cross-sub-project contracts consumed by this sub-project

Sub-project 6 starts from the post-sub-project-5 state. The plan assumes the following artifacts already exist; if they don't, the relevant predecessor sub-project owes the gap.

| Artifact | Owner sub-project | Used by |
|---|---|---|
| `app/lib/email.server.ts` (Resend wrapper, `sendEmail({to, subject, text, html})`) | 1 | Phase B (branded email finalization) |
| `app/emails/invite.html` + `invite.txt` (or equivalent template module) — admin-driven employer invite | 5 | Phase B Task 7 (review + rebrand pass) |
| `app/emails/password-reset.html` + `password-reset.txt` | 5 | Phase B Task 8 (review + rebrand pass) |
| `db/seed-prod.ts` (idempotent skeleton; only standard + competency-core question sets; phases, barriers, program_info) | 1 (Task 37) | Phase D (Production data seed finalization) |
| `db/seed-data/phases.ts`, `db/seed-data/barriers.ts`, `db/seed-data/program-info.ts` | 1 (Task 33) | Phase D |
| `db/seed-data/question-sets.ts` with **full content** (Personal Goals 7 Q, Midpoint Reflection 8 Q, Participant Feedback 7 Q, Exit Employer Survey, Competency Core 7 Professional Competencies) | 3 | Phase D Task 17 |
| `scripts/create-admin.ts` (CLI scaffold) | 1 (Task 50) | Phase D Task 19 (finalize + document) |
| Admin Reports route shell `app/routes/admin.reports.tsx` (may be a placeholder containing only the page-head from sub-project 2) | 2 | Phase A (Reports stub flesh-out) |
| `.github/workflows/ci.yml` (lint, typecheck, unit only; e2e gated `if: false`) | 1 (Task 57) | Phase G (CI tightening — flip e2e gate) |
| `netlify.toml` pinned to `publish = "Prototypes/PROTOTYPE"` with security headers | 1 (Task 58) | Phase H (cutover) |
| `app/lib/auth.server.ts` exporting `getAuthContext(request, headers)` returning `{role, employerId}` | 1 (Task 40) | Phase C (structured logging request-id middleware) |
| `app/lib/env.server.ts` with `env.SUPABASE_URL`, `env.SUPABASE_ANON_KEY`, `env.SUPABASE_SERVICE_ROLE_KEY`, `env.DATABASE_URL`, `env.DATABASE_POOL_URL`, `env.RESEND_API_KEY`, `env.RESEND_FROM`, `env.APP_URL` | 1 (Task 20) | All — Phase C extends with `env.SENTRY_DSN` |
| All admin, employer, and intern routes implemented + form actions wired to DB | 2-5 | Phase E (Playwright suite), Phase F (a11y pass), Phase G (perf pass) |
| Account-provisioning flow: admin invite → employer first-login → `/auth/set-password` | 5 | Phase E Task 27 (end-to-end smoke) |

If any of the above is missing when sub-project 6 begins, **stop and back-fill the owning sub-project** rather than building a workaround here.

---

## File Structure

Sub-project 6 creates the following files and modifies existing ones. Files marked `(modify)` already exist from a prior sub-project; everything else is new.

**Reports stub (Phase A):**
- `app/routes/admin.reports.tsx` (modify — flesh out from placeholder)
- `app/lib/reports.server.ts` — lightweight aggregate queries
- `app/components/bar-chart.tsx` — CSS-only bar chart component, brand tokens
- `app/styles/reports.css` — bar-chart + report-card styles (lifted from `Prototypes/PROTOTYPE/styles.css`)
- `tests/lib/reports.server.test.ts` — aggregate-query unit tests

**Branded emails (Phase B):**
- `app/emails/_layout.ts` — shared table-based HTML wrapper with brand tokens inlined
- `app/emails/_styles.ts` — inline-style strings derived from brand tokens
- `app/emails/invite.ts` (modify — replace sub-project-5 version with branded layout)
- `app/emails/password-reset.ts` (modify)
- `app/emails/account-revoked.ts` — new: notifies employer when admin revokes login
- `app/emails/email-changed.ts` — new: confirmation of email-address change (Supabase event)
- `tests/emails/render.test.ts` — snapshot tests for each rendered email (HTML + text)
- `db/sql/supabase-email-templates.sql` — `auth.config.email_templates` overrides (Supabase Auth invite + magiclink + recovery templates pointed at the same brand HTML)

**Observability (Phase C):**
- `app/lib/sentry.client.ts` — browser Sentry init
- `app/lib/sentry.server.ts` — server Sentry init + breadcrumb helpers
- `app/lib/logger.server.ts` — structured request logger (JSON-line to stdout; Netlify captures function logs natively)
- `app/lib/request-id.server.ts` — request-id middleware helper
- `app/entry.client.tsx` (modify — wire Sentry.init + ErrorBoundary)
- `app/entry.server.tsx` (modify — wire Sentry.init + global error handler)
- `app/root.tsx` (modify — replace fallback ErrorBoundary with Sentry-aware boundary that surfaces the event ID)
- `.env.example` (modify — add `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`)
- `vite.config.ts` (modify — add `@sentry/vite-plugin` for source-map upload)
- `tests/lib/logger.server.test.ts`

**Production data seed (Phase D):**
- `db/seed-prod.ts` (modify — refactor: drop `sql_eq` helper, add seeds for the full question-set library, add an `--force` flag plus dry-run mode)
- `db/seed-data/employers-prod.ts` — real employer list (placeholder list with TODO_FROM_PROGRAM_STAFF markers; actual rows added during the launch checklist run)
- `db/seed-data/cohorts-prod.ts` — real cohort list (same shape)
- `db/seed-data/roles-prod.ts` — real role list (same shape)
- `scripts/create-admin.ts` (modify — add idempotency check, better error messages, `--dry-run` flag)
- `docs/seed-prod-runbook.md` — manual procedure for running the prod seed (env vars, dry-run first, verify counts)

**Performance pass (Phase G):**
- `vite.config.ts` (further modify — add `rollup-plugin-visualizer`)
- `scripts/check-bundle-size.ts` — fails CI if any client chunk exceeds 200KB gzipped on critical routes
- `lighthouserc.json` — Lighthouse CI config (optional; may be deferred to next iteration if `@lhci/cli` doesn't behave under Netlify draft deploys)

**Accessibility pass (Phase F):**
- `tests/e2e/a11y.spec.ts` — Playwright suite running axe on every key route
- `app/lib/a11y-helpers.ts` — `VisuallyHidden`, focus-trap helpers if not already shipped in sub-project 2
- (Likely minor edits to existing form components for label/aria fixes; identified during the audit and listed inline in Task 23)

**Playwright smoke matrix (Phase E):**
- `tests/e2e/intern.spec.ts` — golden path: identity → submit each of Personal Goals, Midpoint Reflection, Participant Feedback
- `tests/e2e/admin-intern-lifecycle.spec.ts` — admin login → create intern → submit competency → see in record
- `tests/e2e/admin-exit-survey.spec.ts` — admin submits Exit Employer Survey
- `tests/e2e/employer-competency.spec.ts` — employer login → competency assessment
- `tests/e2e/employer-onboarding.spec.ts` — admin invites employer → employer accepts → first login
- `tests/e2e/auth.spec.ts` (modify — extend the sub-project 1 smoke with edge cases: wrong-shell bounce, reset password full flow)
- `tests/e2e/fixtures/seeded-db.ts` — Playwright fixture that re-runs `db:seed` before suite
- `playwright.config.ts` (modify — add `projects: [{name: 'chromium'}]`, baseURL from env, `reporter: [['html'], ['github']]`)

**CI tightening (Phase G):**
- `.github/workflows/ci.yml` (modify — flip e2e from `if: false` to enabled; add a11y job; add bundle-size check job)
- `.github/workflows/lighthouse.yml` — optional, separate workflow

**Netlify cutover (Phase H):**
- `netlify.toml` (modify — switch `publish` from `Prototypes/PROTOTYPE` to `build/client`, add `build.command = "npm run build"`, add `[functions]` block for the RR v7 server bundle)
- `docs/deployment.md` (modify — full rewrite for the production app shape; document publish dir, env vars, build command, function locations, rollback)
- `docs/cutover-runbook.md` — step-by-step cutover + rollback runbook (referenced from `deployment.md`)

**Launch day & documentation (Phase J):**
- `docs/launch-checklist.md` — pre-launch + day-of + post-launch verification
- `README.md` (modify — full rewrite as the stack overview and dev-onboarding doc)
- `CLAUDE.md` (modify — add the launch-state section)

---

## Phases overview

| Phase | Name | Tasks | Purpose |
|---|---|---|---|
| A | Reports stub | 1-3 | Port the prototype's `reports.html` to a live admin route with real aggregate queries; CSS bar charts only |
| B | Branded transactional emails | 4-9 | Finalize all transactional emails: shared layout, invite, password reset, account-revoked, email-changed, plus the Supabase Auth template overrides |
| C | Observability + logging | 10-14 | Sentry (client + server), source-map upload, structured request logging, request IDs, RLS-denial breadcrumb |
| D | Production data seed + admin bootstrap | 15-20 | Finalize `seed-prod.ts`, add real-employer/cohort/role placeholders, finalize `create-admin.ts`, write the runbook |
| E | Playwright smoke matrix | 21-27 | Six golden-path suites covering admin, employer, intern, and onboarding; seeded-DB fixture |
| F | Accessibility pass | 28-31 | axe-core in Playwright, manual WCAG 2.1 AA pass on forms, contrast verification, fixes |
| G | Performance pass + CI tightening | 32-37 | Bundle analysis, route-level code-split verification, bundle-size CI gate, optional Lighthouse CI, enable e2e in CI |
| H | Netlify production cutover | 38-43 | Dry-run via draft deploy, env-var checklist, switch publish dir, verify all routes, rollback procedure |
| I | DNS / domain (documented but optional) | 44-45 | Custom-domain path documented; no DNS change required to ship |
| J | Launch day | 46-52 | Pre-launch checklist execution, post-launch smoke, README finalization, CLAUDE.md handoff |

---

## Phase A: Reports stub

Port `Prototypes/PROTOTYPE/reports.html` (3 demo bar charts) into the production admin shell. Spec section 8.1 is explicit: "Reports stub (CSS bar charts only — no real analytics)." Numbers are live (computed from real DB aggregates) but the chart set is fixed at three reports.

### Task 1: Port the reports CSS into the app

**Files:**
- Create: `app/styles/reports.css`
- Modify: `app/root.tsx` (import the new stylesheet)

- [ ] **Step 1: Lift the bar-chart + report-card CSS from the prototype**

  Source: `Prototypes/PROTOTYPE/styles.css` lines 2380-2475 (the `.report-card`, `.report-card__head`, `.report-card__title`, `.bar-chart`, `.bar-chart__col`, `.bar-chart__bar`, `.bar-chart__bar--navy|gold|cyan|success|danger|muted`, `.bar-chart__label`, `.bar-chart__value`, `.report-demo-badge` rules + the `@media (max-width: 720px)` overrides at 2470-2473).

  Copy verbatim into `app/styles/reports.css`. Brand tokens (`--navy`, `--gold`, `--cyan`, `--success`, `--danger`, `--canvas-alt`) are already in `app/styles/tokens.css` from sub-project 1, so no token edits.

- [ ] **Step 2: Import the stylesheet from `app/root.tsx`**

  Add an import for `~/styles/reports.css` alongside the existing global stylesheets. RR v7 will inline-link it on every route, which is fine — the rules are scoped enough that they only apply on the reports page.

- [ ] **Step 3: Commit**

  ```bash
  git add app/styles/reports.css app/root.tsx
  git commit -m "Port reports CSS (bar charts + report-card) from prototype"
  ```

### Task 2: Build the bar-chart React component

**Files:**
- Create: `app/components/bar-chart.tsx`

- [ ] **Step 1: Write the component**

  ```tsx
  import type { ReactNode } from 'react';

  export type BarColor = 'navy' | 'gold' | 'cyan' | 'success' | 'danger' | 'muted';

  export interface BarChartDatum {
    label: ReactNode;        // can include <br/> for multi-line labels
    value: number | string;  // "67%" or 3 — what's printed above the bar
    /** 0-100 — what fraction of the chart's max-height to draw */
    heightPct: number;
    color: BarColor;
  }

  export function BarChart({ data }: { data: BarChartDatum[] }) {
    return (
      <div className="bar-chart">
        {data.map((d, idx) => (
          <div className="bar-chart__col" key={idx}>
            <span className="bar-chart__value">{d.value}</span>
            <div
              className={`bar-chart__bar bar-chart__bar--${d.color}`}
              style={{ height: `${Math.max(0, Math.min(100, d.heightPct))}%` }}
              aria-hidden="true"
            />
            <span className="bar-chart__label">{d.label}</span>
          </div>
        ))}
      </div>
    );
  }
  ```

  Note: each `<BarChart>` is a presentational component; aggregation lives in the loader. The bar height % is computed in the loader from raw counts so the component stays dumb.

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/bar-chart.tsx
  git commit -m "Add BarChart presentational component"
  ```

### Task 3: Build the Reports route with aggregate loaders — TDD

**Files:**
- Create: `app/lib/reports.server.ts`
- Create: `tests/lib/reports.server.test.ts`
- Modify: `app/routes/admin.reports.tsx`

- [ ] **Step 1: Write `tests/lib/reports.server.test.ts` (failing)**

  Three reports, three aggregate functions, each with one happy-path test that asserts shape against a seeded DB. Gate with `describe.skipIf(!process.env.DATABASE_POOL_URL || process.env.DATABASE_POOL_URL.includes('fake'))` (same pattern as `tests/lib/identity.server.test.ts` from sub-project 1, Task 57 Step 2).

  ```ts
  import { describe, it, expect } from 'vitest';
  import {
    topEntryBarriers,
    competencyProgressionByPhase,
    outcomeCounts,
  } from '~/lib/reports.server';

  const SKIP_DB_TESTS = !process.env.DATABASE_POOL_URL || process.env.DATABASE_POOL_URL.includes('fake');

  describe.skipIf(SKIP_DB_TESTS)('reports.server', () => {
    it('topEntryBarriers returns rows ordered by count desc', async () => {
      const rows = await topEntryBarriers({ limit: 6 });
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeLessThanOrEqual(6);
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i - 1].count).toBeGreaterThanOrEqual(rows[i].count);
      }
    });

    it('competencyProgressionByPhase returns one row per phase with passRate 0-1', async () => {
      const rows = await competencyProgressionByPhase();
      for (const r of rows) {
        expect(r.passRate).toBeGreaterThanOrEqual(0);
        expect(r.passRate).toBeLessThanOrEqual(1);
      }
    });

    it('outcomeCounts returns three buckets that sum to total interns', async () => {
      const counts = await outcomeCounts();
      expect(counts.notYetTracked + counts.employedAt90 + counts.stillAt180).toBeGreaterThanOrEqual(0);
    });
  });
  ```

- [ ] **Step 2: Implement `app/lib/reports.server.ts`**

  ```ts
  import { sql } from 'drizzle-orm';
  import { db } from './db.server';

  export interface BarrierCount { label: string; count: number; }
  export async function topEntryBarriers({ limit = 6 }: { limit?: number } = {}): Promise<BarrierCount[]> {
    const rows = await db.execute<{ label: string; count: number }>(sql`
      SELECT b.label, COUNT(*)::int AS count
        FROM intern_entry_barriers ieb
        JOIN barriers b ON b.id = ieb.barrier_id
        JOIN interns i ON i.id = ieb.intern_id
       WHERE i.deleted_at IS NULL
       GROUP BY b.label
       ORDER BY count DESC, b.label ASC
       LIMIT ${limit}
    `);
    return rows.map((r) => ({ label: r.label, count: r.count }));
  }

  export interface PhaseProgression { phase: string; submissions: number; passRate: number; }
  export async function competencyProgressionByPhase(): Promise<PhaseProgression[]> {
    // "Pass" rule: every competency-rubric-row answer in the submission has rating='Ready'.
    // Spec section 10 question 2 flags the final pass/fail rule as a placeholder; this
    // matches the prototype's "all Ready" display.
    const rows = await db.execute<{ phase: string; submissions: number; passes: number }>(sql`
      SELECT
        p.label AS phase,
        COUNT(*)::int AS submissions,
        COUNT(*) FILTER (
          WHERE NOT EXISTS (
            SELECT 1 FROM jsonb_each(s.answers) a
            WHERE (a.value->>'rating') IS NOT NULL
              AND (a.value->>'rating') <> 'Ready'
          )
        )::int AS passes
      FROM assessment_submissions s
      JOIN phases p ON p.label = s.phase
      WHERE s.type = 'competency'
        AND s.deleted_at IS NULL
      GROUP BY p.label, p.sort_order
      ORDER BY p.sort_order ASC
    `);
    return rows.map((r) => ({
      phase: r.phase,
      submissions: r.submissions,
      passRate: r.submissions > 0 ? r.passes / r.submissions : 0,
    }));
  }

  export interface OutcomeCounts { notYetTracked: number; employedAt90: number; stillAt180: number; }
  export async function outcomeCounts(): Promise<OutcomeCounts> {
    const rows = await db.execute<{ status: string; count: number }>(sql`
      SELECT
        CASE
          WHEN o.employed_180 = true THEN 'stillAt180'
          WHEN o.employed_90 = true THEN 'employedAt90'
          ELSE 'notYetTracked'
        END AS status,
        COUNT(*)::int AS count
      FROM interns i
      LEFT JOIN intern_employment_outcomes o ON o.intern_id = i.id
      WHERE i.deleted_at IS NULL
      GROUP BY status
    `);
    const result: OutcomeCounts = { notYetTracked: 0, employedAt90: 0, stillAt180: 0 };
    for (const r of rows) {
      if (r.status === 'stillAt180') result.stillAt180 = r.count;
      else if (r.status === 'employedAt90') result.employedAt90 = r.count;
      else result.notYetTracked = r.count;
    }
    return result;
  }
  ```

  **Note:** these queries hit RLS-protected tables but `db` here is the service-role connection from `app/lib/db.server.ts`, which bypasses RLS by design. The route loader below additionally calls `getAuthContext` and rejects non-admins.

- [ ] **Step 3: Rebuild `app/routes/admin.reports.tsx`**

  ```tsx
  import type { Route } from './+types/admin.reports';
  import { BarChart, type BarChartDatum } from '~/components/bar-chart';
  import { topEntryBarriers, competencyProgressionByPhase, outcomeCounts } from '~/lib/reports.server';
  import { getAuthContext } from '~/lib/auth.server';
  import { redirect } from 'react-router';

  export async function loader({ request }: Route.LoaderArgs) {
    const headers = new Headers();
    const ctx = await getAuthContext(request, headers);
    if (!ctx || ctx.role !== 'admin') throw redirect('/login');

    const [barriers, progression, outcomes] = await Promise.all([
      topEntryBarriers({ limit: 6 }),
      competencyProgressionByPhase(),
      outcomeCounts(),
    ]);

    const maxBarrierCount = Math.max(1, ...barriers.map((b) => b.count));

    const barrierBars: BarChartDatum[] = barriers.map((b) => ({
      label: b.label,
      value: b.count,
      heightPct: (b.count / maxBarrierCount) * 100,
      color: 'navy',
    }));

    const progressionBars: BarChartDatum[] = progression.map((p) => {
      const pct = Math.round(p.passRate * 100);
      return {
        label: p.phase,
        value: p.submissions === 0 ? '—' : `${pct}%`,
        heightPct: p.submissions === 0 ? 8 : pct,
        color: p.submissions === 0 ? 'muted' : pct >= 80 ? 'gold' : 'cyan',
      };
    });

    const outcomeBars: BarChartDatum[] = [
      { label: 'Not Yet Tracked', value: outcomes.notYetTracked, heightPct: 60, color: 'muted' },
      { label: 'Employed at 90d', value: outcomes.employedAt90, heightPct: 40, color: 'gold' },
      { label: 'Still at 180d', value: outcomes.stillAt180, heightPct: 40, color: 'success' },
    ];

    return { barrierBars, progressionBars, outcomeBars };
  }

  export default function AdminReports({ loaderData }: Route.ComponentProps) {
    return (
      <section>
        <div className="container" style={{ paddingBottom: 80 }}>
          <article className="report-card">
            <div className="report-card__head">
              <h2 className="report-card__title">Top Entry Assessment Barriers</h2>
              <span className="micro-label">PROGRAM-WIDE · ACTIVE INTERNS</span>
            </div>
            <BarChart data={loaderData.barrierBars} />
          </article>

          <article className="report-card">
            <div className="report-card__head">
              <h2 className="report-card__title">Competency Progression Across Phases</h2>
              <span className="micro-label">ALL COHORTS · PASS RATE PER PHASE</span>
            </div>
            <BarChart data={loaderData.progressionBars} />
          </article>

          <article className="report-card">
            <div className="report-card__head">
              <h2 className="report-card__title">90/180-Day Outcome Tracking</h2>
              <span className="micro-label">POST-PLACEMENT</span>
            </div>
            <BarChart data={loaderData.outcomeBars} />
          </article>
        </div>
      </section>
    );
  }
  ```

  The `report-demo-badge` from the prototype is intentionally **not** ported — these are live numbers now.

- [ ] **Step 4: Run the test**

  ```bash
  npm test -- reports.server
  ```

  Expected: skipped locally without a DB; pass against a seeded DB.

- [ ] **Step 5: Manually verify in dev**

  ```bash
  npm run db:seed
  npm run dev
  ```

  Sign in as admin, navigate to `/admin/reports`, confirm three bar charts render with seeded numbers, no console errors.

- [ ] **Step 6: Commit**

  ```bash
  git add app/lib/reports.server.ts app/routes/admin.reports.tsx tests/lib/reports.server.test.ts
  git commit -m "Wire admin Reports stub to live aggregate queries (3 bar charts)"
  ```

---

## Phase B: Branded transactional emails

Finalize every transactional email. The shared layout lives in `app/emails/_layout.ts` and is a single `<table>`-based wrapper (Outlook-safe) with brand tokens inlined as `style="…"` strings (because no mail client respects external stylesheets). Both an HTML and a plain-text alternative are produced for every email.

Spec section 5.6 specifies the password-reset email; section 5.4 specifies the invite email; section 9.6 notes Supabase's default email-enumeration behavior must be preserved.

### Task 4: Build the shared email layout

**Files:**
- Create: `app/emails/_styles.ts`
- Create: `app/emails/_layout.ts`

- [ ] **Step 1: Create `app/emails/_styles.ts`**

  Brand tokens inlined as JS string literals so they end up as `style="…"` attributes. Sourced from `Prototypes/PROTOTYPE/styles.css` lines 5-43.

  ```ts
  export const palette = {
    navy: '#153A98',
    navyDeep: '#051028',
    cyan: '#00A6F6',
    gold: '#FFD71F',
    canvas: '#EFF1F5',
    canvasAlt: '#E5E8EF',
    ink: '#0B1020',
    muted: '#51596B',
    success: '#1B8F4A',
  };

  export const fonts = {
    display: '"Archivo Black", Arial Black, sans-serif',
    body: '"IBM Plex Sans", Helvetica, Arial, sans-serif',
    mono: '"IBM Plex Mono", Courier, monospace',
  };
  ```

- [ ] **Step 2: Create `app/emails/_layout.ts`**

  ```ts
  import { palette, fonts } from './_styles';

  export interface LayoutOpts {
    title: string;     // <title>
    preheader: string; // hidden preview text
    body: string;      // inner HTML — receives the styled paragraphs / button
  }

  export function renderLayout({ title, preheader, body }: LayoutOpts): string {
    return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin:0;padding:0;background:${palette.canvas};font-family:${fonts.body};color:${palette.ink};">
      <span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${palette.canvas};">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#fff;border:1px solid ${palette.canvasAlt};border-radius:8px;">
              <tr>
                <td style="background:${palette.navyDeep};padding:24px 32px;border-radius:8px 8px 0 0;">
                  <span style="font-family:${fonts.display};color:#fff;font-size:20px;letter-spacing:0.04em;">IMPACT</span>
                  <span style="font-family:${fonts.mono};color:${palette.gold};font-size:11px;margin-left:12px;letter-spacing:0.18em;text-transform:uppercase;">Internship Portal</span>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  ${body}
                </td>
              </tr>
              <tr>
                <td style="background:${palette.canvas};padding:16px 32px;border-radius:0 0 8px 8px;font-family:${fonts.body};font-size:12px;color:${palette.muted};">
                  &copy; 2026 IMPACT / Indiana. You're receiving this because you have an account on the IMPACT Internship Portal.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
  }

  export function button({ href, label }: { href: string; label: string }): string {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td style="background:${palette.navy};border-radius:4px;">
          <a href="${escapeAttr(href)}" style="display:inline-block;padding:14px 28px;font-family:${fonts.body};font-weight:600;color:#fff;text-decoration:none;font-size:15px;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
  }

  function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }
  function escapeAttr(s: string): string {
    return escapeHtml(s);
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/emails/_styles.ts app/emails/_layout.ts
  git commit -m "Add shared brand-token email layout + button helper"
  ```

### Task 5: Rebuild the invite email on the shared layout

**Files:**
- Modify: `app/emails/invite.ts`

- [ ] **Step 1: Read the sub-project-5 version**

  ```bash
  cat app/emails/invite.ts
  ```

  Capture what variables it accepts (likely `{employerName, inviteUrl, expiresAt}`).

- [ ] **Step 2: Rewrite using `renderLayout` + `button`**

  ```ts
  import { renderLayout, button } from './_layout';

  export interface InviteEmailOpts {
    employerName: string;     // e.g., "Eskenazi Health"
    inviteUrl: string;        // Supabase-generated set-password URL
    expiresAt: Date;          // for the "expires in 7 days" line
  }

  export function renderInviteEmail(opts: InviteEmailOpts): { subject: string; html: string; text: string } {
    const subject = `You're invited to the IMPACT Internship Portal`;
    const expiresStr = opts.expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const html = renderLayout({
      title: subject,
      preheader: `Set up your ${opts.employerName} login for the IMPACT Internship Portal.`,
      body: `
        <h1 style="font-family:'Archivo Black',Arial Black,sans-serif;color:#153A98;font-size:24px;margin:0 0 16px 0;">Welcome to IMPACT.</h1>
        <p style="margin:0 0 16px 0;line-height:1.55;">An IMPACT program admin has set up an account for <strong>${escape(opts.employerName)}</strong> on the IMPACT Internship Portal.</p>
        <p style="margin:0 0 16px 0;line-height:1.55;">Click the button below to set your password and sign in for the first time.</p>
        ${button({ href: opts.inviteUrl, label: 'Set your password' })}
        <p style="margin:0 0 8px 0;font-size:13px;color:#51596B;">This invitation expires on ${expiresStr}.</p>
        <p style="margin:0;font-size:13px;color:#51596B;">If the button doesn't work, copy and paste this link into your browser:<br/><span style="word-break:break-all;color:#153A98;">${escape(opts.inviteUrl)}</span></p>
      `,
    });

    const text = [
      `Welcome to IMPACT.`,
      ``,
      `An IMPACT program admin has set up an account for ${opts.employerName} on the IMPACT Internship Portal.`,
      ``,
      `Set your password and sign in for the first time at:`,
      opts.inviteUrl,
      ``,
      `This invitation expires on ${expiresStr}.`,
    ].join('\n');

    return { subject, html, text };
  }

  function escape(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }
  ```

- [ ] **Step 3: Update any call sites in `app/routes/admin.settings.employers.*` to use the new return shape `{subject, html, text}`**

  Search for `renderInviteEmail` usage and adapt; the sub-project-5 version may have returned a different shape.

- [ ] **Step 4: Commit**

  ```bash
  git add app/emails/invite.ts app/routes/admin.settings.employers.*.tsx
  git commit -m "Rebrand invite email on shared layout"
  ```

### Task 6: Rebuild the password-reset email on the shared layout

**Files:**
- Modify: `app/emails/password-reset.ts`

- [ ] **Step 1: Mirror the Task 5 pattern**

  ```ts
  import { renderLayout, button } from './_layout';

  export interface PasswordResetEmailOpts {
    resetUrl: string;
    expiresAt: Date;
  }

  export function renderPasswordResetEmail(opts: PasswordResetEmailOpts): { subject: string; html: string; text: string } {
    const subject = `Reset your IMPACT Internship Portal password`;
    const expiresStr = opts.expiresAt.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', month: 'long', day: 'numeric' });

    const html = renderLayout({
      title: subject,
      preheader: `Reset your IMPACT Internship Portal password.`,
      body: `
        <h1 style="font-family:'Archivo Black',Arial Black,sans-serif;color:#153A98;font-size:24px;margin:0 0 16px 0;">Reset your password.</h1>
        <p style="margin:0 0 16px 0;line-height:1.55;">We received a request to reset the password on your IMPACT Internship Portal account.</p>
        <p style="margin:0 0 16px 0;line-height:1.55;">Click the button below to choose a new password. This link expires at ${expiresStr}.</p>
        ${button({ href: opts.resetUrl, label: 'Reset your password' })}
        <p style="margin:0;font-size:13px;color:#51596B;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      `,
    });

    const text = [
      `Reset your password.`,
      ``,
      `We received a request to reset the password on your IMPACT Internship Portal account.`,
      ``,
      `Choose a new password at:`,
      opts.resetUrl,
      ``,
      `This link expires at ${expiresStr}.`,
      ``,
      `If you didn't request this, you can safely ignore this email — your password won't change.`,
    ].join('\n');

    return { subject, html, text };
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/emails/password-reset.ts
  git commit -m "Rebrand password-reset email on shared layout"
  ```

### Task 7: Add the account-revoked email

**Files:**
- Create: `app/emails/account-revoked.ts`
- Modify: `app/routes/admin.settings.employers.$id.tsx` (or wherever revoke is wired in sub-project 5)

- [ ] **Step 1: Create the template**

  Pattern mirrors Task 5 but with no button:

  ```ts
  import { renderLayout } from './_layout';

  export interface AccountRevokedEmailOpts {
    employerName: string;
    contactEmail: string; // who to ask about it (program admin)
  }

  export function renderAccountRevokedEmail(opts: AccountRevokedEmailOpts): { subject: string; html: string; text: string } {
    const subject = `Your IMPACT Internship Portal access has been revoked`;
    const html = renderLayout({
      title: subject,
      preheader: `Your IMPACT Internship Portal login for ${opts.employerName} has been revoked.`,
      body: `
        <h1 style="font-family:'Archivo Black',Arial Black,sans-serif;color:#153A98;font-size:24px;margin:0 0 16px 0;">Access revoked.</h1>
        <p style="margin:0 0 16px 0;line-height:1.55;">Your IMPACT Internship Portal login for <strong>${escape(opts.employerName)}</strong> has been revoked by an IMPACT program admin.</p>
        <p style="margin:0;line-height:1.55;">If you believe this was in error, contact <a href="mailto:${escape(opts.contactEmail)}" style="color:#153A98;">${escape(opts.contactEmail)}</a>.</p>
      `,
    });
    const text = [
      `Access revoked.`,
      ``,
      `Your IMPACT Internship Portal login for ${opts.employerName} has been revoked by an IMPACT program admin.`,
      ``,
      `If you believe this was in error, contact ${opts.contactEmail}.`,
    ].join('\n');
    return { subject, html, text };
  }

  function escape(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }
  ```

- [ ] **Step 2: Wire the send into the revoke action**

  In the employer-detail route action that handles revoke (built in sub-project 5), call `sendEmail({to, ...renderAccountRevokedEmail({employerName, contactEmail: env.SUPPORT_EMAIL})})`. Add `SUPPORT_EMAIL` to `env.server.ts` and `.env.example` (defaults to `kortney@impact.org` based on the program-info seed).

- [ ] **Step 3: Commit**

  ```bash
  git add app/emails/account-revoked.ts app/routes/admin.settings.employers.$id.tsx app/lib/env.server.ts .env.example
  git commit -m "Add account-revoked notification email + SUPPORT_EMAIL env var"
  ```

### Task 8: Override Supabase Auth's built-in email templates

Supabase Auth sends its own emails for invite, magic-link, and recovery. By default these are unbranded. We override them so the entire user-facing email surface is consistent.

**Files:**
- Create: `db/sql/supabase-email-templates.sql`
- Modify: `db/apply-policies.ts` (or the equivalent SQL-runner script) — apply this SQL too

- [ ] **Step 1: Capture the branded HTML for each template**

  Supabase exposes 3 user-facing templates: `invite`, `recovery`, `confirmation`. The simplest way to ship branded versions is to **disable Supabase's own send** (Auth → Email → SMTP Settings → "Disable Confirm Email" / "Disable Email Change Confirmation"), then send our own via Resend from a route action.

  However, the magic-link path used by `inviteUserByEmail` (sub-project 5 Task: invite flow) still goes through Supabase. For that one we keep Supabase's send and override the template body via the Dashboard or the Management API.

  **Decision:** Override via the **Supabase Dashboard** (not the Management API) — same way the Resend SMTP config is set. There's no programmatic SQL override for Auth templates in Supabase's current shape. So this file becomes a **documentation artifact**, not an executable SQL file.

- [ ] **Step 2: Rename the file and write it as a runbook**

  Rename to `docs/supabase-email-templates.md` and document, for each template (Invite, Recovery, Magic Link, Email Change), the exact HTML to paste into the Supabase Dashboard → Authentication → Email Templates. Reuse the same `_layout` + `button` strings — paste the rendered output (with the Supabase variable placeholders `{{ .ConfirmationURL }}` and `{{ .Email }}` substituted into the relevant spots).

  ```bash
  mv db/sql/supabase-email-templates.sql docs/supabase-email-templates.md
  # (or just create docs/supabase-email-templates.md directly)
  ```

- [ ] **Step 3: Write the doc**

  Three sections (Invite, Recovery, Magic Link), each with the subject line, the HTML to paste, and the corresponding plain-text alternative.

- [ ] **Step 4: Commit**

  ```bash
  git add docs/supabase-email-templates.md
  git commit -m "Document Supabase Auth email-template overrides (Dashboard paste-in)"
  ```

### Task 9: Render-snapshot tests for all email templates

**Files:**
- Create: `tests/emails/render.test.ts`

- [ ] **Step 1: Write Vitest snapshot tests**

  ```ts
  import { describe, it, expect } from 'vitest';
  import { renderInviteEmail } from '~/emails/invite';
  import { renderPasswordResetEmail } from '~/emails/password-reset';
  import { renderAccountRevokedEmail } from '~/emails/account-revoked';

  // Use a fixed date so snapshots are stable.
  const FIXED = new Date('2026-06-01T15:00:00Z');

  describe('email templates', () => {
    it('invite renders stable HTML + text', () => {
      const out = renderInviteEmail({
        employerName: 'Eskenazi Health',
        inviteUrl: 'https://impact-internship-portal.netlify.app/auth/set-password?token=abc',
        expiresAt: FIXED,
      });
      expect(out.subject).toMatchSnapshot('subject');
      expect(out.html).toMatchSnapshot('html');
      expect(out.text).toMatchSnapshot('text');
    });

    it('password-reset renders stable HTML + text', () => {
      const out = renderPasswordResetEmail({
        resetUrl: 'https://impact-internship-portal.netlify.app/auth/reset-password?token=xyz',
        expiresAt: FIXED,
      });
      expect(out.subject).toMatchSnapshot('subject');
      expect(out.html).toMatchSnapshot('html');
      expect(out.text).toMatchSnapshot('text');
    });

    it('account-revoked renders stable HTML + text', () => {
      const out = renderAccountRevokedEmail({
        employerName: 'Eskenazi Health',
        contactEmail: 'kortney@impact.org',
      });
      expect(out.subject).toMatchSnapshot('subject');
      expect(out.html).toMatchSnapshot('html');
      expect(out.text).toMatchSnapshot('text');
    });
  });
  ```

- [ ] **Step 2: Run; review the generated `__snapshots__` file by eye**

  ```bash
  npm test -- emails/render
  ```

  Open `tests/emails/__snapshots__/render.test.ts.snap` and confirm the HTML and text look correct. Snapshot files get committed.

- [ ] **Step 3: Commit**

  ```bash
  git add tests/emails/render.test.ts tests/emails/__snapshots__/
  git commit -m "Add snapshot tests for branded email templates"
  ```

---

## Phase C: Observability + structured logging

Spec section 9.2 names Sentry as the front-end + server error tracker on free tier (5k events/month). Server-side structured logs land in Netlify's native function-log capture; we just emit JSON lines to stdout.

### Task 10: Install Sentry + add env vars

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `app/lib/env.server.ts`

- [ ] **Step 1: Install Sentry packages**

  ```bash
  npm install @sentry/react @sentry/node @sentry/profiling-node
  npm install -D @sentry/vite-plugin
  ```

  > **Note:** As of 2026-01, `@sentry/react-router` is the dedicated adapter. If it's published by sub-project 6 execution time, use it instead of the `@sentry/react` + `@sentry/node` combo. Either shape works; the adapter just collapses init boilerplate.

- [ ] **Step 2: Add env vars to `.env.example`**

  Append:

  ```
  # Sentry — error tracking
  SENTRY_DSN=
  SENTRY_AUTH_TOKEN=
  SENTRY_ORG=
  SENTRY_PROJECT=
  ```

- [ ] **Step 3: Extend `env.server.ts` schema**

  Add `SENTRY_DSN` (optional, string), `SENTRY_AUTH_TOKEN` (build-time only, optional), `SENTRY_ORG`, `SENTRY_PROJECT`. Mark all four as optional so missing values fall back to no-op behavior in dev.

- [ ] **Step 4: Commit**

  ```bash
  git add package.json package-lock.json .env.example app/lib/env.server.ts
  git commit -m "Install Sentry + add SENTRY_* env vars"
  ```

### Task 11: Wire client-side Sentry

**Files:**
- Create: `app/lib/sentry.client.ts`
- Modify: `app/entry.client.tsx`
- Modify: `app/root.tsx` — error boundary surfaces the Sentry event ID

- [ ] **Step 1: Create `app/lib/sentry.client.ts`**

  ```ts
  import * as Sentry from '@sentry/react';

  export function initSentryClient() {
    const dsn = (window as unknown as { __ENV?: { SENTRY_DSN?: string } }).__ENV?.SENTRY_DSN;
    if (!dsn) return;
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,    // off — free-tier budget
      replaysOnErrorSampleRate: 1.0,
      release: import.meta.env.VITE_RELEASE,
      environment: import.meta.env.MODE,
    });
  }

  export { Sentry };
  ```

  The DSN reaches the browser via `window.__ENV` — set in `root.tsx`'s loader and dropped into the document head as a `<script>` tag. (Anon-safe; Sentry DSNs are public.)

- [ ] **Step 2: Modify `app/entry.client.tsx`**

  Add `initSentryClient()` call before `hydrateRoot()`.

- [ ] **Step 3: Modify `app/root.tsx` `ErrorBoundary`**

  Wrap with `Sentry.ErrorBoundary` (or, equivalently, manually call `Sentry.captureException(error)` in the existing boundary) and read `Sentry.lastEventId()` to surface a "Reference: …" line to the user.

- [ ] **Step 4: Commit**

  ```bash
  git add app/lib/sentry.client.ts app/entry.client.tsx app/root.tsx
  git commit -m "Wire client-side Sentry init + ErrorBoundary event-ID surface"
  ```

### Task 12: Wire server-side Sentry + the RLS-denial breadcrumb

**Files:**
- Create: `app/lib/sentry.server.ts`
- Modify: `app/entry.server.tsx`

- [ ] **Step 1: Create `app/lib/sentry.server.ts`**

  ```ts
  import * as Sentry from '@sentry/node';
  import { env } from './env.server';

  let initialized = false;
  export function initSentryServer() {
    if (initialized || !env.SENTRY_DSN) return;
    Sentry.init({
      dsn: env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      release: process.env.SENTRY_RELEASE,
      environment: process.env.NODE_ENV ?? 'production',
    });
    initialized = true;
  }

  /**
   * Emit a breadcrumb when a Supabase query returns PGRST403 (RLS denial).
   * Spec section 9.2 explicitly calls this out.
   */
  export function logRlsDenial(ctx: { route: string; role: string; employerId: string | null }) {
    Sentry.addBreadcrumb({
      category: 'rls',
      level: 'warning',
      message: 'RLS denial',
      data: ctx,
    });
  }

  export { Sentry };
  ```

- [ ] **Step 2: Modify `app/entry.server.tsx`**

  Call `initSentryServer()` at module load, and wrap the existing `handleError` (or `handleRequest`) so any thrown error is captured via `Sentry.captureException`.

- [ ] **Step 3: Source-map upload in `vite.config.ts`**

  Add `@sentry/vite-plugin` to the plugin chain (guarded behind `if (process.env.SENTRY_AUTH_TOKEN)` so dev builds don't fail when the token is missing):

  ```ts
  import { sentryVitePlugin } from '@sentry/vite-plugin';

  // …
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [sentryVitePlugin({
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          release: { name: process.env.SENTRY_RELEASE },
        })]
      : []),
  ],
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add app/lib/sentry.server.ts app/entry.server.tsx vite.config.ts
  git commit -m "Wire server-side Sentry + RLS-denial breadcrumb + source-map upload"
  ```

### Task 13: Structured request logging — TDD

**Files:**
- Create: `app/lib/logger.server.ts`
- Create: `app/lib/request-id.server.ts`
- Create: `tests/lib/logger.server.test.ts`

- [ ] **Step 1: Write the failing test**

  ```ts
  import { describe, it, expect, vi } from 'vitest';
  import { logRequest } from '~/lib/logger.server';

  describe('logRequest', () => {
    it('emits a JSON-line with the expected fields', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      logRequest({
        requestId: 'req-123',
        method: 'POST',
        route: '/admin/interns',
        durationMs: 42,
        status: 200,
        role: 'admin',
        employerId: null,
      });
      expect(spy).toHaveBeenCalledTimes(1);
      const line = spy.mock.calls[0]![0] as string;
      const parsed = JSON.parse(line);
      expect(parsed).toMatchObject({
        level: 'info',
        requestId: 'req-123',
        method: 'POST',
        route: '/admin/interns',
        durationMs: 42,
        status: 200,
        role: 'admin',
      });
      expect(parsed.timestamp).toBeDefined();
      spy.mockRestore();
    });
  });
  ```

- [ ] **Step 2: Implement**

  `app/lib/request-id.server.ts`:

  ```ts
  export function getRequestId(request: Request): string {
    const existing = request.headers.get('X-Request-Id');
    if (existing) return existing;
    return crypto.randomUUID();
  }
  ```

  `app/lib/logger.server.ts`:

  ```ts
  export interface RequestLog {
    requestId: string;
    method: string;
    route: string;
    durationMs: number;
    status: number;
    role: 'admin' | 'employer' | 'anonymous';
    employerId: string | null;
    error?: string;
  }

  export function logRequest(rec: RequestLog) {
    console.log(JSON.stringify({
      level: rec.error ? 'error' : 'info',
      timestamp: new Date().toISOString(),
      ...rec,
    }));
  }
  ```

  Netlify Functions capture stdout natively; the logs surface at `https://app.netlify.com/projects/impact-internship-portal/logs/functions`.

- [ ] **Step 3: Wire into `app/entry.server.tsx`**

  In `handleRequest`, compute duration around `await handleDocumentRequest`, capture `getRequestId`, call `logRequest` once per request, and inject `X-Request-Id` into the response headers (so the client can quote it when reporting a bug).

- [ ] **Step 4: Commit**

  ```bash
  git add app/lib/logger.server.ts app/lib/request-id.server.ts app/entry.server.tsx tests/lib/logger.server.test.ts
  git commit -m "Add structured request logger + request-id middleware"
  ```

### Task 14: Wire the RLS-denial detector into the auth helper

**Files:**
- Modify: `app/lib/auth.server.ts`

- [ ] **Step 1: Add a query-wrapper helper**

  Add to `auth.server.ts`:

  ```ts
  import { logRlsDenial } from './sentry.server';
  import type { PostgrestError } from '@supabase/supabase-js';

  /**
   * Detect Supabase RLS denials (PGRST403) and emit a breadcrumb.
   * Use whenever a route action/loader runs an RLS-gated query.
   */
  export function checkForRlsDenial(
    error: PostgrestError | null,
    ctx: { route: string; role: string; employerId: string | null },
  ): void {
    if (error?.code === 'PGRST403' || error?.code === '42501') {
      logRlsDenial(ctx);
    }
  }
  ```

  Sub-projects 2-5 may not have used this; that's fine — it's available going forward.

- [ ] **Step 2: Commit**

  ```bash
  git add app/lib/auth.server.ts
  git commit -m "Add RLS-denial detector helper for Sentry breadcrumbs"
  ```

---

## Phase D: Production data seed + admin bootstrap

Finalize `seed-prod.ts` (idempotent) so an operator can run it once against the empty prod DB.

### Task 15: Refactor seed-prod.ts — drop the sql_eq stand-in, add dry-run

**Files:**
- Modify: `db/seed-prod.ts`

The sub-project 1 plan (Task 37) flagged the `sql_eq` helper as a cleanup item. Replace with a proper top-level `eq` import.

- [ ] **Step 1: Read the existing file**

  Confirm it matches sub-project 1 Task 37 step 1. Replace the `sql_eq` helper with `import { eq } from 'drizzle-orm'` at the top.

- [ ] **Step 2: Add a `--dry-run` flag**

  Use `node:util` `parseArgs`. When `--dry-run`, print what would be inserted but call no mutations.

- [ ] **Step 3: Add a `--force` flag**

  When `--force`, allow re-running even if rows exist (intended for re-seeding question content after edits in dev fixtures). Without `--force`, the existing `if (existing.length === 0)` gates stand.

- [ ] **Step 4: Commit**

  ```bash
  git add db/seed-prod.ts
  git commit -m "Refactor seed-prod.ts: drop sql_eq, add --dry-run and --force flags"
  ```

### Task 16: Add real-employer / cohort / role seed scaffolds

**Files:**
- Create: `db/seed-data/employers-prod.ts`
- Create: `db/seed-data/cohorts-prod.ts`
- Create: `db/seed-data/roles-prod.ts`

These files contain the real employer/cohort/role rows that go into production. Per spec section 7.2 these are **not** seeded in prod by default (employers, cohorts, interns are admin-created from the UI), so this Task creates empty/placeholder arrays. The launch checklist Task 47 documents that the program admin chooses to either (a) seed them by editing these files and re-running `seed-prod.ts --force`, or (b) create them by hand via the admin UI on day one.

- [ ] **Step 1: Create `db/seed-data/employers-prod.ts`**

  ```ts
  import type { SeedEmployer } from './employers';

  /**
   * Real production employer list. Empty by default — fill in before launch if seeding,
   * or leave empty and create via the admin UI post-launch.
   * Use stable UUIDs (e.g., `uuidgen` output) so cohorts-prod.ts can reference them.
   */
  export const SEED_EMPLOYERS_PROD: SeedEmployer[] = [
    // Example shape (commented out — fill in before launch):
    // {
    //   id: '<uuid-here>',
    //   name: 'Eskenazi Health',
    //   contactName: '<name>',
    //   contactEmail: '<email>',
    //   phone: '<phone>',
    //   notes: '',
    // },
  ];
  ```

  Same shape for `cohorts-prod.ts` and `roles-prod.ts`, referencing their respective seed-data types from sub-project 1 Task 32.

- [ ] **Step 2: Add a `--include-org-data` flag to `seed-prod.ts`**

  When passed, the script also inserts `SEED_EMPLOYERS_PROD`, `SEED_ROLES_PROD`, `SEED_COHORTS_PROD` (in that order, respecting FKs). Without the flag the script only inserts library content (phases, barriers, program_info, question sets) — the default safe behavior.

- [ ] **Step 3: Commit**

  ```bash
  git add db/seed-data/employers-prod.ts db/seed-data/cohorts-prod.ts db/seed-data/roles-prod.ts db/seed-prod.ts
  git commit -m "Add real-employer/cohort/role seed scaffolds (empty by default) + --include-org-data flag"
  ```

### Task 17: Verify the production question-set library is complete

**Files:**
- Modify: `db/seed-data/question-sets.ts` (if any sub-project 3 gaps exist)

Sub-project 3 owns the full question content. Sub-project 6 verifies completeness.

- [ ] **Step 1: Count the rows in `db/seed-data/question-sets.ts`**

  Expected after sub-project 3:
  - `personal-goals`: 7 questions (free-form textareas) — source `Self-Assessment Questions (Placeholder).md`
  - `midpoint-reflection`: 8 questions (free-form textareas)
  - `participant-feedback`: 7 questions (mixed: radio + Likert + Yes/No + textarea) — source `Participant Exit Feedback.docx`
  - `exit-employer-survey`: per the sub-project 3 spec
  - `competency-core`: 7 Professional Competencies (`competency-rubric-row`)

  Confirm each kind is present with the expected question count. If any are short, file the gap against sub-project 3 — do **not** patch here.

- [ ] **Step 2: No commit** if no edits needed; document the verification in the launch checklist.

### Task 18: Document the prod-seed runbook

**Files:**
- Create: `docs/seed-prod-runbook.md`

- [ ] **Step 1: Write the doc**

  ```markdown
  # Production Seed Runbook

  Run this **once**, against the production Supabase project, before the first admin signs in.

  ## Prerequisites

  1. Production Supabase project provisioned (per `docs/deployment.md`).
  2. `db:migrate` has been run against prod — schema is in place.
  3. `db:apply-policies` has been run against prod — RLS is enforced.
  4. A `.env.prod` file (gitignored) contains:
     - `DATABASE_URL` — direct connection string to prod
     - `DATABASE_POOL_URL` — pooled connection (not needed by seed-prod, but used by app)
     - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — for the admin-create script

  ## Step 1: Dry-run

  ```bash
  DOTENV_CONFIG_PATH=.env.prod npm run db:seed-prod -- --dry-run
  ```

  Expected output: a list of inserts that would happen — phases (4), barriers (12), program_info (1 row), question sets (5 standard kinds + competency-core). No mutations occur. Zero employers/cohorts/roles/interns at this stage.

  ## Step 2: Real run (library only)

  ```bash
  DOTENV_CONFIG_PATH=.env.prod npm run db:seed-prod
  ```

  Expected: all of step 1 inserts actually happen. Re-running is safe (idempotent — won't duplicate).

  ## Step 3: Verify counts

  ```sql
  SELECT 'phases' AS table, COUNT(*) FROM phases
  UNION ALL SELECT 'barriers', COUNT(*) FROM barriers
  UNION ALL SELECT 'program_info', COUNT(*) FROM program_info
  UNION ALL SELECT 'question_sets', COUNT(*) FROM question_sets
  UNION ALL SELECT 'questions', COUNT(*) FROM questions;
  ```

  Expected:
  - phases: 4
  - barriers: 12
  - program_info: 1
  - question_sets: at least 5 (Personal Goals, Midpoint Reflection, Participant Feedback, Exit Employer Survey, Competency Core)
  - questions: ≥ 30 (7 + 8 + 7 + N + 7)

  ## Step 4: Create the first admin

  ```bash
  DOTENV_CONFIG_PATH=.env.prod npm run admin:create -- --email=<admin email> --password=<temp password>
  ```

  Hand the temp password to the admin out-of-band; they should immediately use the password-reset flow to set their own.

  ## Step 5: (Optional) seed real employers / cohorts / roles

  Only if you've populated `db/seed-data/{employers,cohorts,roles}-prod.ts`:

  ```bash
  DOTENV_CONFIG_PATH=.env.prod npm run db:seed-prod -- --include-org-data
  ```

  Otherwise, leave this for the admin to do via the UI.

  ## Rollback

  If the seed produces wrong content:
  1. The seed is idempotent — running it again won't worsen the state.
  2. To fully reset: `DOTENV_CONFIG_PATH=.env.prod npm run db:seed -- --reset-prod-confirm` (intentional friction; the dev seed script's `TRUNCATE` is gated behind that flag when pointed at prod).
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add docs/seed-prod-runbook.md
  git commit -m "Document production seed runbook"
  ```

### Task 19: Finalize the create-admin script

**Files:**
- Modify: `scripts/create-admin.ts`

- [ ] **Step 1: Add a `--dry-run` flag**

  Print what would happen without invoking Supabase admin API.

- [ ] **Step 2: Improve error handling**

  - If email is invalid format → exit with a clear message.
  - If a user with that email already exists → check if a profile row exists; if not, insert it (recovery path). If both exist, exit with "Admin already provisioned" message.

- [ ] **Step 3: Improve security ergonomics**

  Add `--prompt-password` mode: when no `--password` is given, read from stdin (using `readline` with `output` muted) so the password doesn't appear in shell history.

- [ ] **Step 4: Commit**

  ```bash
  git add scripts/create-admin.ts
  git commit -m "Finalize create-admin: dry-run, recovery path, prompt-password mode"
  ```

### Task 20: Verify seed against a fresh local DB

**Files:**
- N/A — verification only

- [ ] **Step 1: Reset local dev DB and run the full prod-seed flow against it**

  ```bash
  # Use a throwaway local Supabase project (or a separate schema) to avoid wiping dev seed.
  npm run db:seed-prod -- --dry-run
  npm run db:seed-prod
  npm run admin:create -- --email=admin@test.com --password=TempPass123!
  ```

- [ ] **Step 2: Verify against the SQL queries in the runbook**

  All counts should match.

---

## Phase E: Playwright smoke matrix

Six end-to-end suites covering every golden path. The seeded-DB fixture re-runs `db:seed` (which is destructive) **only against a Playwright-specific test DB**, never against dev or prod. Test-DB URL goes in `.env.test` (gitignored).

### Task 21: Update playwright.config.ts + create the seeded-DB fixture

**Files:**
- Modify: `playwright.config.ts`
- Create: `tests/e2e/fixtures/seeded-db.ts`
- Create: `.env.test.example`

- [ ] **Step 1: Update `playwright.config.ts`**

  ```ts
  import { defineConfig, devices } from '@playwright/test';

  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

  export default defineConfig({
    testDir: 'tests/e2e',
    fullyParallel: false,           // tests share a seeded DB; serialize
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['html']],
    use: {
      baseURL,
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: process.env.PLAYWRIGHT_BASE_URL
      ? undefined
      : {
          command: 'npm run dev',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
  });
  ```

- [ ] **Step 2: Create `tests/e2e/fixtures/seeded-db.ts`**

  ```ts
  import { test as base } from '@playwright/test';
  import { execSync } from 'node:child_process';

  // Re-seed the test DB once per worker.
  export const test = base.extend<{}, { seededDb: void }>({
    seededDb: [async ({}, use) => {
      if (process.env.E2E_SKIP_SEED !== '1') {
        execSync('npm run db:seed', { stdio: 'inherit', env: { ...process.env, DOTENV_CONFIG_PATH: '.env.test' } });
      }
      await use();
    }, { scope: 'worker', auto: true }],
  });

  export { expect } from '@playwright/test';
  ```

- [ ] **Step 3: Create `.env.test.example`** with `DATABASE_URL`, `DATABASE_POOL_URL` pointing at a dedicated Supabase project labeled "test"

- [ ] **Step 4: Commit**

  ```bash
  git add playwright.config.ts tests/e2e/fixtures/seeded-db.ts .env.test.example
  git commit -m "Configure Playwright with seeded-DB fixture (per-worker reseed)"
  ```

### Task 22: Smoke test — intern self-assessment golden path

**Files:**
- Create: `tests/e2e/intern.spec.ts`

- [ ] **Step 1: Write the test**

  Steps:
  1. Visit `/`.
  2. Click "Start a self-assessment" → lands on `/intern/assessments`.
  3. Identity gate: fill in First Initial `A`, Last Name `Williams`, Employer `Eskenazi Health`, Cohort `2026 MA Cohort`. Submit.
  4. Confirms identity, three cards visible.
  5. Click "Personal Goals" → form renders.
  6. Fill in all 7 textareas. Submit.
  7. Lands on `/intern/confirmation?type=personal-goals`.
  8. Back to chooser; "Personal Goals" card now shows "Submitted on …" pill.
  9. Repeat for "Midpoint Reflection" (8 textareas).
  10. Repeat for "Participant Feedback" (mixed: radio + Likert + Yes/No + textarea).
  11. All three cards show submitted state.
  12. Tries to revisit Personal Goals form directly: bounces to chooser with "already submitted" affordance.

- [ ] **Step 2: Commit**

  ```bash
  git add tests/e2e/intern.spec.ts
  git commit -m "E2E smoke: intern self-assessment golden path (all 3 forms)"
  ```

### Task 23: Smoke test — admin creates intern + submits competency

**Files:**
- Create: `tests/e2e/admin-intern-lifecycle.spec.ts`

- [ ] **Step 1: Write the test**

  Steps:
  1. Visit `/login`, sign in as `admin@example.com` / `DevPassword123!` → lands on `/admin`.
  2. Navigate to `/admin/interns`. Click "New Intern".
  3. Fill out the intern record form (First Initial, Last Name, Cohort, Role, Start Date, End Date, 2 barriers checked, entry notes).
  4. Submit → lands on `/admin/interns/:id`.
  5. Navigate to `/admin/assessments`. Pick the just-created intern. Choose "Competency Assessment".
  6. Form renders the stitched competency questions (Core + Cohort). Fill in all ratings + notes.
  7. Select Phase = `Phase 1`. Submit.
  8. Lands on `/admin/interns/:id` — competency card shows the just-submitted phase.
  9. Click into the competency detail; all answers visible read-only.

- [ ] **Step 2: Commit**

  ```bash
  git add tests/e2e/admin-intern-lifecycle.spec.ts
  git commit -m "E2E smoke: admin creates intern + submits competency"
  ```

### Task 24: Smoke test — admin submits Exit Employer Survey

**Files:**
- Create: `tests/e2e/admin-exit-survey.spec.ts`

- [ ] **Step 1: Write the test**

  Steps:
  1. Sign in as admin.
  2. Navigate to `/admin/assessments`. Pick an existing intern. Choose "Exit Employer Survey".
  3. Fill the form. Submit.
  4. Lands on confirmation; intern record now shows the submission.

- [ ] **Step 2: Commit**

  ```bash
  git add tests/e2e/admin-exit-survey.spec.ts
  git commit -m "E2E smoke: admin submits Exit Employer Survey"
  ```

### Task 25: Smoke test — employer login + submits competency

**Files:**
- Create: `tests/e2e/employer-competency.spec.ts`

- [ ] **Step 1: Write the test**

  Steps:
  1. Sign in as `employer1@example.com` / `DevPassword123!` (the dev account from sub-project 1 Task 51) → lands on `/employer`.
  2. Navigate to `/employer/interns`. List shows only their employer's interns.
  3. Click into an intern. Navigate to `/employer/assessments` → pick the same intern → "Competency Assessment".
  4. Form is the same as admin's. Submit a Phase 1 competency.
  5. Verify on `/employer/interns/:id` that the new submission is visible.
  6. Try direct-URL hit on `/admin` → bounces to `/employer` (wrong-shell guard).

- [ ] **Step 2: Commit**

  ```bash
  git add tests/e2e/employer-competency.spec.ts
  git commit -m "E2E smoke: employer login + competency assessment + wrong-shell bounce"
  ```

### Task 26: Smoke test — admin invites employer → first login

**Files:**
- Create: `tests/e2e/employer-onboarding.spec.ts`

This one is fiddly because it spans an email round-trip. We intercept Resend by configuring a test-only sender that writes to a local mailbox file (use `@resend/node` test mode, or stub `sendEmail` via a Playwright route-level mock). The simpler path: capture the invite URL from the server log (since the seeded DB fixture allows full inspection).

- [ ] **Step 1: Write the test**

  Strategy: in `.env.test`, set `RESEND_TEST_INBOX=./test-inbox.json`. Modify `email.server.ts` (or wrap with a test shim) to append to that file instead of calling Resend when the env var is set.

  Steps:
  1. Sign in as admin.
  2. Create a fresh employer via `/admin/settings/employers/new`.
  3. Click "Invite Login" on the employer detail page → confirm modal → submit.
  4. Read `./test-inbox.json` — extract the most recent invite URL.
  5. Sign out.
  6. Visit the invite URL directly → lands on `/auth/set-password`.
  7. Set a password. Submit.
  8. Lands on `/employer`.

- [ ] **Step 2: Commit**

  ```bash
  git add tests/e2e/employer-onboarding.spec.ts
  git commit -m "E2E smoke: admin invites employer → employer accepts → first login"
  ```

### Task 27: Smoke test — full password-reset flow

**Files:**
- Modify: `tests/e2e/auth.spec.ts` (extend the sub-project 1 file)

- [ ] **Step 1: Add the reset-flow test**

  Steps:
  1. From `/login`, click "Forgot password".
  2. Submit the admin's email.
  3. Sees "Check your email" page.
  4. Read `./test-inbox.json` for the reset link.
  5. Visit the link → `/auth/reset-password` with a token in the URL.
  6. Enter new password. Submit.
  7. Lands on `/login`.
  8. Sign in with the new password → succeeds.

- [ ] **Step 2: Commit**

  ```bash
  git add tests/e2e/auth.spec.ts
  git commit -m "E2E smoke: extend auth.spec.ts with full password-reset flow"
  ```

---

## Phase F: Accessibility pass

Spec section 9.4 says baseline accessibility is folded into v1; a full WCAG AA audit is deferred. Sub-project 6 does the WCAG 2.1 AA pass on the form-heavy parts (where accessibility most often breaks) plus automated axe checks on every key route.

### Task 28: Add axe-core to Playwright e2e

**Files:**
- Create: `tests/e2e/a11y.spec.ts`

- [ ] **Step 1: Install `@axe-core/playwright`**

  ```bash
  npm install -D @axe-core/playwright
  ```

- [ ] **Step 2: Write the suite**

  Run axe on every key route. Expect zero violations of `serious` or `critical` severity; `moderate` violations are logged but don't fail the test.

  ```ts
  import { test, expect } from '@playwright/test';
  import AxeBuilder from '@axe-core/playwright';

  const ROUTES_ANONYMOUS = ['/', '/intern/assessments', '/login', '/auth/reset-password-request'];
  const ROUTES_ADMIN = ['/admin', '/admin/interns', '/admin/assessments', '/admin/reports', '/admin/settings/employers'];
  const ROUTES_EMPLOYER = ['/employer', '/employer/interns', '/employer/assessments'];

  test.describe('a11y: anonymous routes', () => {
    for (const route of ROUTES_ANONYMOUS) {
      test(`axe: ${route}`, async ({ page }) => {
        await page.goto(route);
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        const seriousOrCritical = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(seriousOrCritical, JSON.stringify(seriousOrCritical, null, 2)).toEqual([]);
      });
    }
  });

  // Similar describe blocks for ROUTES_ADMIN (sign in as admin first) and ROUTES_EMPLOYER.
  ```

- [ ] **Step 3: Run; capture initial violations**

  ```bash
  npm run test:e2e -- a11y
  ```

  Expect a small handful of violations; this is the discovery pass.

- [ ] **Step 4: Commit (with `// TODO: fix` annotations next to any temporarily-skipped routes)**

  ```bash
  git add tests/e2e/a11y.spec.ts package.json package-lock.json
  git commit -m "Add axe-core a11y suite (covers anonymous, admin, employer routes)"
  ```

### Task 29: Fix the violations surfaced by Task 28

**Files:**
- Modify: various — listed inline below as discovered

Common categories of violation, with the standard fix:

- [ ] **Missing form labels** — every `<input>`/`<select>`/`<textarea>` needs an explicit `<label htmlFor="…">` or a wrapping `<label>`. Audit `app/components/question-renderer/*` first (those are the most-rendered).
- [ ] **Insufficient contrast** — re-check brand-token combos. `--canvas-alt` (`#E5E8EF`) on `#fff` is fine; `--gold` text on `#fff` may be flagged (it's 1.5:1). Use `--gold` only on dark surfaces; for light surfaces use `--navy` for emphasis.
- [ ] **Modal focus management** — when a modal opens, focus moves to the modal title; when it closes, focus returns to the trigger. Likely needs an explicit `useEffect` in the `<ConfirmModal>` component.
- [ ] **Heading hierarchy** — verify there's exactly one `<h1>` per page; subsequent headings step down (no `<h3>` directly under `<h1>`).
- [ ] **Missing `aria-describedby` for helper text** — every form input with helper-text gets `aria-describedby="…-helper"`.
- [ ] **Skip link** — add a visually-hidden "Skip to main content" link as the first focusable element in `app/root.tsx`.

- [ ] **Step 1: Fix violations one route at a time, re-running `npm run test:e2e -- a11y` after each**

- [ ] **Step 2: Commit incremental fixes**

  Suggested commit cadence: one commit per route group (anonymous, admin, employer).

### Task 30: Manual WCAG 2.1 AA review checklist

**Files:**
- Create: `docs/a11y-review.md`

- [ ] **Step 1: Write the checklist**

  Items to manually verify on every form page (not catchable by axe):

  - Tab order is sensible (top to bottom, left to right).
  - All interactive elements reachable by keyboard only.
  - Esc closes any open modal.
  - Enter/Space toggles accordion sections.
  - Focus indicators visible on every focusable element (re-check after CSS resets).
  - All error messages associated with their input via `aria-describedby`.
  - Required fields marked with `aria-required="true"` (in addition to visual `*`).
  - No information conveyed by color alone.
  - Screen-reader pass (VoiceOver on macOS or NVDA on Windows): walk through Personal Goals form and one Competency form, verify announcements make sense.

- [ ] **Step 2: Run the checklist; file issues for anything that fails**

- [ ] **Step 3: Commit the checklist**

  ```bash
  git add docs/a11y-review.md
  git commit -m "Add manual WCAG 2.1 AA review checklist"
  ```

### Task 31: Brand-token contrast verification

**Files:**
- N/A — verification only

- [ ] **Step 1: Run every brand-color pair through a contrast checker**

  - `--ink` (`#0B1020`) on `--canvas` (`#EFF1F5`): ≥ 16:1 ✓ (expected pass)
  - `--ink` on `#fff`: ≥ 18:1 ✓
  - `--muted` (`#51596B`) on `#fff`: ≥ 7:1 ✓
  - `--muted` on `--canvas`: ≥ 6:1 ✓
  - `--navy` (`#153A98`) on `#fff`: ≥ 8:1 ✓
  - `--navy` on `--canvas`: ≥ 7:1 ✓
  - `--gold` (`#FFD71F`) on `--navy-deep` (`#051028`): ≥ 13:1 ✓
  - `--gold` on `#fff`: ~1.6:1 ✗ — must not be used for text on light surfaces
  - `--cyan` (`#00A6F6`) on `--navy-deep`: ~7:1 ✓
  - `--cyan` on `#fff`: ~2.9:1 ✗ — must not be used for text on light surfaces

  If any actual usage in the app violates these (e.g., `--cyan` body text on white), file an issue.

- [ ] **Step 2: Document the pairing rules in `docs/a11y-review.md`** (append to the file from Task 30)

---

## Phase G: Performance pass + CI tightening

Spec section 9.5 sets the client-bundle target at <200KB gzipped JS on critical paths. Verify with `rollup-plugin-visualizer` and gate in CI.

### Task 32: Add bundle visualization

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json` (add `analyze` script)

- [ ] **Step 1: Install**

  ```bash
  npm install -D rollup-plugin-visualizer
  ```

- [ ] **Step 2: Add to `vite.config.ts`** (gated behind `ANALYZE=1`)

  ```ts
  import { visualizer } from 'rollup-plugin-visualizer';
  // …
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    ...(process.env.ANALYZE === '1' ? [visualizer({ filename: 'bundle-stats.html', open: true, gzipSize: true })] : []),
  ],
  ```

- [ ] **Step 3: Add a `bundle:analyze` script to `package.json`**

  ```json
  "bundle:analyze": "ANALYZE=1 npm run build"
  ```

- [ ] **Step 4: Run + identify the top 3 offenders**

  ```bash
  npm run bundle:analyze
  ```

  Open `bundle-stats.html`. Note: `@supabase/supabase-js` is the most common big-offender; if it's > 80KB consider importing only `@supabase/ssr` (server-only).

- [ ] **Step 5: Commit**

  ```bash
  git add vite.config.ts package.json package-lock.json
  git commit -m "Add rollup-plugin-visualizer + bundle:analyze script"
  ```

### Task 33: Fix any oversized chunks

**Files:**
- Various — depends on what Task 32 surfaces

Likely culprits + fixes:
- **Sentry browser SDK** — switch to `@sentry/react`'s tree-shakable entry; don't import the full bundle.
- **Date-formatting libraries** — replace `moment` or `date-fns` (if accidentally added) with native `Intl.DateTimeFormat`.
- **Question-engine** — verify it's not pulling in all 6 type renderers eagerly; should be route-level code-split.

- [ ] **Step 1: For any chunk > 200KB gzipped, identify and fix**

- [ ] **Step 2: Re-run bundle:analyze; confirm under-threshold**

- [ ] **Step 3: Commit**

### Task 34: CI bundle-size guard

**Files:**
- Create: `scripts/check-bundle-size.ts`

- [ ] **Step 1: Write the script**

  ```ts
  import { readFileSync } from 'node:fs';
  import { gzipSync } from 'node:zlib';
  import { globSync } from 'glob';

  const LIMIT_BYTES = 200 * 1024;
  const CRITICAL_ENTRIES = ['root', '_public._index', '_public.login', 'admin._index', 'employer._index'];

  const files = globSync('build/client/assets/*.js');
  const failures: string[] = [];
  for (const f of files) {
    const buf = readFileSync(f);
    const gz = gzipSync(buf).length;
    const baseName = f.split('/').pop()!;
    const isCritical = CRITICAL_ENTRIES.some((e) => baseName.includes(e));
    if (isCritical && gz > LIMIT_BYTES) {
      failures.push(`${baseName}: ${(gz / 1024).toFixed(1)}KB gzipped > 200KB`);
    }
  }
  if (failures.length > 0) {
    console.error('Bundle size check FAILED:\n' + failures.join('\n'));
    process.exit(1);
  }
  console.log(`Bundle size check passed (${files.length} chunks).`);
  ```

  > Install `glob` if not already installed: `npm install -D glob`.

- [ ] **Step 2: Add `npm run check:bundle-size` script**

- [ ] **Step 3: Commit**

  ```bash
  git add scripts/check-bundle-size.ts package.json package-lock.json
  git commit -m "Add bundle-size CI guard (200KB gzipped on critical paths)"
  ```

### Task 35: Lighthouse audit (manual + optional CI)

**Files:**
- Create: `lighthouserc.json`
- Create (optional): `.github/workflows/lighthouse.yml`

- [ ] **Step 1: Manual Lighthouse pass against each key route**

  Locally:
  ```bash
  npm run build && npm run start  # production-mode server
  # In another terminal:
  npx lighthouse http://localhost:3000/ --view
  npx lighthouse http://localhost:3000/login --view
  npx lighthouse http://localhost:3000/admin --view  # sign in first
  npx lighthouse http://localhost:3000/intern/assessments --view
  npx lighthouse http://localhost:3000/employer --view
  ```

  Target scores:
  - Performance: ≥ 90
  - Accessibility: ≥ 95
  - Best Practices: ≥ 95
  - SEO: ≥ 90 (intern-facing routes; auth routes can be lower since `noindex`)

  If any score is low, look at the "opportunities" panel — typical fixes: preload key fonts, defer non-critical JS, add `loading="lazy"` to non-LCP images.

- [ ] **Step 2: (Optional) install `@lhci/cli`**

  ```bash
  npm install -D @lhci/cli
  ```

  Add `lighthouserc.json`:

  ```json
  {
    "ci": {
      "collect": {
        "url": ["http://localhost:3000/", "http://localhost:3000/login"],
        "startServerCommand": "npm run start"
      },
      "assert": {
        "preset": "lighthouse:recommended",
        "assertions": {
          "categories:performance": ["error", { "minScore": 0.85 }],
          "categories:accessibility": ["error", { "minScore": 0.95 }]
        }
      }
    }
  }
  ```

  Add `.github/workflows/lighthouse.yml` to run on PRs.

  **Note:** Lighthouse CI can be flaky on Netlify draft deploys. If it produces too much false-positive noise, defer it to a future iteration; the manual pass in Step 1 is the firm requirement.

- [ ] **Step 3: Commit**

  ```bash
  git add lighthouserc.json .github/workflows/lighthouse.yml package.json package-lock.json
  git commit -m "Add manual Lighthouse audit + optional LHCI workflow"
  ```

### Task 36: Verify route-level code-splitting

**Files:**
- N/A — verification only

- [ ] **Step 1: After `npm run build`, list `build/client/assets/*.js`**

  Expected: there's a separate JS file per top-level route module. RR v7 framework mode does this automatically; we just verify.

- [ ] **Step 2: Confirm there's no single mega-bundle**

  If everything is in one ~500KB chunk, route splitting is broken — check `react-router.config.ts` and `vite.config.ts`.

### Task 37: Enable Playwright + a11y + bundle-size in CI

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Flip the e2e gate**

  Change `if: ${{ false }}` → remove the line (always run). The sub-project 1 CI was deliberately gated; sub-project 6 enables it.

- [ ] **Step 2: Add jobs**

  Add (alongside the existing lint-and-typecheck, test-unit, e2e jobs):

  ```yaml
    a11y:
      name: axe (Playwright)
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '22'
            cache: 'npm'
        - run: npm ci
        - run: npx playwright install --with-deps chromium
        - run: npm run test:e2e -- a11y
          env:
            # Same fake-env block as test-unit + actual test-DB secrets from GH Secrets
            DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
            DATABASE_POOL_URL: ${{ secrets.TEST_DATABASE_POOL_URL }}
            SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
            SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
            SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_ROLE_KEY }}
            RESEND_API_KEY: 'test'
            RESEND_FROM: 'test@example.com'
            APP_URL: 'http://localhost:5173'

    bundle-size:
      name: Bundle size guard
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '22'
            cache: 'npm'
        - run: npm ci
        - run: npm run build
          env:
            SUPABASE_URL: 'https://example.supabase.co'
            SUPABASE_ANON_KEY: 'fake'
            SUPABASE_SERVICE_ROLE_KEY: 'fake'
            DATABASE_URL: 'postgresql://fake'
            DATABASE_POOL_URL: 'postgresql://fake'
            RESEND_API_KEY: 'fake'
            RESEND_FROM: 'fake@example.com'
            APP_URL: 'http://localhost:5173'
        - run: npx tsx scripts/check-bundle-size.ts
  ```

- [ ] **Step 3: Add the GitHub Secrets**

  Repo Settings → Secrets and variables → Actions. Add `TEST_DATABASE_URL`, `TEST_DATABASE_POOL_URL`, `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY`. These point at a separate "test" Supabase project.

- [ ] **Step 4: Commit + push; verify CI passes**

  ```bash
  git add .github/workflows/ci.yml
  git commit -m "Enable e2e + a11y + bundle-size jobs in CI"
  git push origin master
  ```

---

## Phase H: Netlify production cutover

> **Amendment 2026-05-11 — Phase H is OBSOLETE.** This phase was written when Sub-project 1 and Sub-project 6 shared a single Netlify project (`impact-internship-portal`) that initially published the prototype and would be flipped to publish `build/client/` here. During Sub-project 0 wrap-up on 2026-05-11, Matt adopted a **two-Netlify-project structure**:
>
> - **Prototype Netlify project** (`impact-internship-portal`, ID `65497097-8b5c-471e-a0c9-dc7ddea0fb2c`) — watches `Rapideo/impact-prototype`, publishes `Prototypes/PROTOTYPE/` at `https://impact-internship-portal.netlify.app` indefinitely.
> - **App Netlify project** (`impact-portal-app`, ID `6e071577-7adb-4cae-82d6-b2b2b66a47aa`) — watches `Rapideo/impact-internship-portal`, publishes `build/client/` at `https://impact-portal-app.netlify.app` from Sub-project 1 Phase 1 onward.
>
> There is no `netlify.toml` `publish`-dir flip and no DNS swap. The app's `netlify.toml` was already configured to publish `build/client/` in Sub-project 1 Task 58. By the time Sub-project 6 runs, the app Netlify project is already serving the production app from `main`; "cutover day" is no longer an event.
>
> The tasks below are retained in place as historical reference rather than deleted, so the plan reads as a coherent document. Each task is marked **obsolete (superseded by two-Netlify-project structure adopted 2026-05-11)** with a brief note. Do not execute them.

The riskiest phase. We do this in three sub-steps: (1) dry-run via a Netlify draft deploy off a feature branch, (2) production cutover on master, (3) verified rollback plan documented.

### Task 38: Update netlify.toml for the production app

> **Obsolete (superseded by two-Netlify-project structure adopted 2026-05-11).** Sub-project 1 Task 58 now writes `netlify.toml` with `publish = "build/client"` and `command = "npm run build"` directly, because this repo's `netlify.toml` is consumed only by the app Netlify project. There is no prototype-to-app flip to perform here.

**Files:**
- Modify: `netlify.toml`

The current `netlify.toml` from sub-project 1 Task 58 is pinned to `publish = "Prototypes/PROTOTYPE"`. Sub-project 6 switches it.

- [ ] **Step 1: Install the Netlify adapter**

  ```bash
  npm install @netlify/react-router-adapter
  ```

  (If the package name has shifted by execution time, the adapter is whatever RR v7's docs name for `react-router build --target netlify`.)

- [ ] **Step 2: Add a `netlify` field to `react-router.config.ts`**

  ```ts
  import type { Config } from '@react-router/dev/config';

  export default {
    ssr: true,
    // Netlify Functions adapter
  } satisfies Config;
  ```

- [ ] **Step 3: Rewrite `netlify.toml`**

  ```toml
  [build]
    command = "npm run build"
    publish = "build/client"

  [functions]
    directory = ".netlify/functions-internal"
    node_bundler = "esbuild"

  [[redirects]]
    from = "/*"
    to = "/.netlify/functions/server"
    status = 200
    force = false
    conditions = { }

  [build.environment]
    NODE_VERSION = "22"
    NPM_FLAGS = "--legacy-peer-deps=false"

  [[headers]]
    for = "/*"
    [headers.values]
      X-Frame-Options = "DENY"
      X-Content-Type-Options = "nosniff"
      Referrer-Policy = "strict-origin-when-cross-origin"
      Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://*.ingest.sentry.io; img-src 'self' data:;"
      Strict-Transport-Security = "max-age=63072000; includeSubDomains"
      Permissions-Policy = "camera=(), microphone=(), geolocation=()"

  # Brotli/gzip compression and immutable caching for hashed assets
  [[headers]]
    for = "/assets/*"
    [headers.values]
      Cache-Control = "public, max-age=31536000, immutable"
  ```

  > The exact `redirects` / `functions` block depends on the Netlify RR v7 adapter shape. If `@netlify/react-router-adapter` provides its own `netlify.toml` template, use that — the above is the manual fallback.

- [ ] **Step 4: Do NOT commit yet — Phase H is a sequence; we commit at the end of Task 41 after the draft deploy succeeds**

### Task 39: Document required Netlify environment variables

> **Partly obsolete (superseded by two-Netlify-project structure adopted 2026-05-11).** The env-var table is still worth documenting, but the framing should target the **app Netlify project** (`impact-portal-app`, ID `6e071577-7adb-4cae-82d6-b2b2b66a47aa`), not `impact-internship-portal` (which now serves the prototype only). Per-context env vars on the app project were seeded during Sub-project 0 kickoff prep and verified in Sub-project 1 Task 5; this task becomes a "write `docs/deployment.md` describing what's already configured" task rather than a "configure for the first time" task.

**Files:**
- Modify: `docs/deployment.md` (full rewrite, no longer prototype-only)

- [ ] **Step 1: Write the updated doc**

  ```markdown
  # Netlify Deployment (Production App)

  > **As of sub-project 6 cutover (2026-XX-XX), the Netlify site publishes the production React Router v7 app, not the prototype. The prototype remains in-repo at `Prototypes/PROTOTYPE/` as a locked design reference but is no longer served.**

  ## URLs

  - **Production:** https://impact-internship-portal.netlify.app
  - **Admin dashboard:** https://app.netlify.com/projects/impact-internship-portal
  - **Build logs:** https://app.netlify.com/projects/impact-internship-portal/deploys
  - **Function logs:** https://app.netlify.com/projects/impact-internship-portal/logs/functions
  - **Edge function logs:** https://app.netlify.com/projects/impact-internship-portal/logs/edge-functions

  ## Site details

  - **Site name:** `impact-internship-portal`
  - **Project ID:** `65497097-8b5c-471e-a0c9-dc7ddea0fb2c`
  - **Team / account slug:** `matthew-smith` (display name: Rapideo)
  - **Owner:** Matthew Smith (matthew.smith@rapideo.com)

  ## Build settings

  | Setting | Value |
  |---|---|
  | Publish directory | `build/client` |
  | Build command | `npm run build` |
  | Node version | 22 |
  | Functions directory | `.netlify/functions-internal` (generated by the RR v7 adapter) |

  ## Required environment variables

  Set under **Site configuration → Environment variables** with scope `Builds` + `Functions` + `Runtime`.

  | Variable | Source | Notes |
  |---|---|---|
  | `SUPABASE_URL` | Supabase Dashboard → Settings → API | Public; safe to expose in client. |
  | `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Public anon key. |
  | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | **Secret. Server-only.** Set Netlify scope to "Functions" only. |
  | `DATABASE_URL` | Supabase Dashboard → Settings → Database → Direct | For migrations + seed only — not used by runtime app. |
  | `DATABASE_POOL_URL` | Supabase Dashboard → Settings → Database → Transaction mode pooler | Runtime app uses this. |
  | `RESEND_API_KEY` | Resend Dashboard → API Keys | Server-only. |
  | `RESEND_FROM` | Hardcode | e.g., `noreply@impact-internship-portal.netlify.app` (or a verified custom domain post-launch). |
  | `SENTRY_DSN` | Sentry Project Settings → Client Keys (DSN) | Public; needed by both client and server. |
  | `SENTRY_AUTH_TOKEN` | Sentry → Settings → Auth Tokens | Build-time only — for source-map upload. Set Netlify scope to "Builds" only. |
  | `SENTRY_ORG` | Sentry org slug | Build-time. |
  | `SENTRY_PROJECT` | Sentry project slug | Build-time. |
  | `SUPPORT_EMAIL` | Hardcode | `kortney@impact.org` per program-info seed. |
  | `APP_URL` | Hardcode | `https://impact-internship-portal.netlify.app` |

  ## Rollback procedure

  If a deploy goes bad post-cutover:

  1. Netlify Dashboard → Deploys → find the last known-good deploy → **Publish deploy**.
  2. Or, via CLI: `netlify rollback`.
  3. For a full revert to the prototype: change `netlify.toml` `publish` back to `Prototypes/PROTOTYPE` and `command = ""`, commit, push. The prototype is still in the repo and immediately re-deploys.

  ## Redeploying

  Pushes to `master` automatically build and deploy.

  Manual:
  ```bash
  netlify deploy --build         # produces a draft preview URL
  netlify deploy --prod --build  # deploys to production
  ```

  ## Cutover history

  - **2026-04-21**: initial prototype deploy (publish=`Prototypes/PROTOTYPE`)
  - **2026-XX-XX**: sub-project 6 cutover to production app (publish=`build/client`)
  ```

- [ ] **Step 2: Commit (the doc — we're still pre-cutover)**

  ```bash
  git add docs/deployment.md
  git commit -m "Rewrite deployment.md for the production-app cutover"
  ```

### Task 40: Set all production env vars in Netlify (manual, pre-cutover)

> **Obsolete (superseded by two-Netlify-project structure adopted 2026-05-11).** The env vars on the app Netlify project (`impact-portal-app`) were seeded per deploy context during Sub-project 0 kickoff prep and verified in Sub-project 1 Task 5. By the time Sub-project 6 runs, no first-time configuration remains; the only valid action here is a re-verification pass, which Task 44 (final smoke) already covers.

**Files:**
- N/A — Netlify Dashboard click-through

- [ ] **Step 1: Open the Netlify Dashboard → Site configuration → Environment variables**

- [ ] **Step 2: Add every variable from the table in Task 39**

  Pay attention to scope:
  - `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DATABASE_POOL_URL`, `RESEND_API_KEY`, `SUPPORT_EMAIL`: **Functions + Runtime** scope only.
  - `SENTRY_AUTH_TOKEN`: **Builds** scope only.
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SENTRY_DSN`: all three scopes.

- [ ] **Step 3: Verify by clicking "View values" — confirm each is set and scope-correct**

- [ ] **Step 4: No commit (this is a Netlify-side change)**

### Task 41: Dry-run via Netlify draft deploy (feature branch)

> **Obsolete (superseded by two-Netlify-project structure adopted 2026-05-11).** A dry-run is no longer needed because there is no cutover event — the app Netlify project has been publishing the production app from `main` since Sub-project 1 Phase 1. Routine pre-merge verification happens automatically via every PR's deploy preview URL.

**Files:**
- N/A — CLI deploy

- [ ] **Step 1: Create a feature branch + commit the `netlify.toml` change from Task 38**

  ```bash
  git checkout -b cutover-dryrun
  git add netlify.toml package.json package-lock.json react-router.config.ts
  git commit -m "[dryrun] switch Netlify publish to build/client"
  ```

- [ ] **Step 2: Trigger a draft deploy**

  ```bash
  netlify deploy --build
  ```

  Netlify uses the `netlify.toml` from the branch HEAD — it builds the app, uploads to a **non-prod** URL (e.g., `https://<random>--impact-internship-portal.netlify.app`).

- [ ] **Step 3: Smoke-test the draft URL**

  Walk through:
  - `/` — landing renders
  - `/login` — sign in as admin
  - `/admin` — admin home renders, KPIs (if any) load
  - `/admin/interns` — list renders
  - `/admin/reports` — three bar charts render
  - `/admin/settings/employers` — list renders
  - Sign out → `/` 
  - Sign in as employer → `/employer` renders
  - `/intern/assessments` (sign out first) — identity gate renders
  - Trigger a password reset email (real Resend send) — receive the branded email
  - Check Sentry → confirm an explicitly-thrown test error appears under the new release

- [ ] **Step 4: Check function logs for any errors**

  Netlify Dashboard → Logs → Functions. Expect clean 200/302 responses.

- [ ] **Step 5: If everything works, proceed to Task 42. If anything is broken, fix it on the feature branch and re-deploy draft.**

  Do NOT merge to master until the draft URL is green.

### Task 42: Production cutover

> **Obsolete (superseded by two-Netlify-project structure adopted 2026-05-11).** There is no cutover commit to merge — `main` has been auto-deploying to the app Netlify project since Sub-project 1 Phase 1. The prototype Netlify project (`impact-internship-portal.netlify.app`) keeps running independently from its own repo.

**Files:**
- N/A — merge + watch

- [ ] **Step 1: Merge the feature branch to master**

  ```bash
  git checkout master
  git merge cutover-dryrun --no-ff -m "Cutover: switch Netlify publish from Prototypes/PROTOTYPE to build/client"
  git push origin master
  ```

  Netlify auto-builds on push to master. The new build replaces the prototype at the production URL.

- [ ] **Step 2: Watch the Netlify build log**

  Dashboard → Deploys → top entry. Wait for "Published". Expected duration: 2-4 minutes.

- [ ] **Step 3: Smoke-test the prod URL (same walkthrough as Task 41 Step 3)**

  `https://impact-internship-portal.netlify.app`. Every route must work.

- [ ] **Step 4: Confirm the prototype is no longer served**

  - The old prototype landing (`Prototypes/PROTOTYPE/index.html`) had a "PROTOTYPE" badge in the page-head. The new app's landing has no such badge.
  - `view-source:https://impact-internship-portal.netlify.app/` should show a React-rendered HTML shell, not the prototype's hand-written HTML.

- [ ] **Step 5: Confirm the prototype is still IN THE REPO**

  ```bash
  ls Prototypes/PROTOTYPE/index.html
  ```

  Per the spec — the prototype is preserved as a reference, just no longer served.

### Task 43: Rollback rehearsal

> **Partly obsolete (superseded by two-Netlify-project structure adopted 2026-05-11).** The "revert to publishing the prototype" half of the rollback is no longer applicable — the prototype is permanently served from its own Netlify project. The "publish a known-good prior deploy on the app project" half is still useful and should be retained as part of routine release hygiene; verify that against the app Netlify project (`impact-portal-app`, ID `6e071577-7adb-4cae-82d6-b2b2b66a47aa`) rather than against `impact-internship-portal`.

**Files:**
- N/A — verify rollback works without using it for real

- [ ] **Step 1: From the Netlify Dashboard, identify the last pre-cutover deploy**

  Dashboard → Deploys → look for the most recent deploy with `publish = "Prototypes/PROTOTYPE"` (the deploy from before the cutover commit).

- [ ] **Step 2: Confirm the "Publish deploy" button is available on that deploy**

  Don't click it — just verify the affordance is there. This is the rollback path.

- [ ] **Step 3: Verify the CLI rollback path**

  ```bash
  netlify status
  ```

  Confirm the linked site is `impact-internship-portal` and the current deploy is the post-cutover one.

  Document the rollback command in `docs/deployment.md` Task 39 (already done — confirm).

---

## Phase I: DNS / domain (documented, optional)

Spec section 8.3 doesn't mandate a custom domain. This phase documents the path so it can be taken later without surprise.

### Task 44: Document the custom-domain path

**Files:**
- Modify: `docs/deployment.md` — append a section

- [ ] **Step 1: Append**

  ```markdown
  ## Custom domain (deferred — documented for future)

  The site currently serves on the Netlify subdomain `impact-internship-portal.netlify.app`. To move to a custom domain (e.g., `portal.impact-indiana.org`):

  1. Netlify Dashboard → Domain management → Add a custom domain.
  2. Add the supplied DNS records (CNAME for `portal` → `impact-internship-portal.netlify.app`).
  3. Wait for DNS propagation + Netlify auto-provisions a Let's Encrypt cert.
  4. Update `APP_URL` env var + `RESEND_FROM` (after verifying the new domain with Resend).
  5. Update Supabase Auth → URL Configuration → Site URL + Redirect URLs.
  6. Update the CSP `connect-src` if the API hostname changes.
  7. Update Sentry's "allowed domains" allowlist.

  The site continues to serve at both URLs (Netlify subdomain + custom domain) until the Netlify subdomain is explicitly removed.
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add docs/deployment.md
  git commit -m "Document custom-domain migration path (deferred)"
  ```

### Task 45: Backup strategy decision

**Files:**
- Modify: `docs/deployment.md` — append

- [ ] **Step 1: Decide on a Supabase backup strategy**

  Supabase free tier does NOT include point-in-time-recovery. Options:
  - **Option A:** upgrade to Supabase Pro for PITR (paid).
  - **Option B:** scheduled `pg_dump` via a GitHub Actions cron (free, but requires storing the dump somewhere — S3, Drive, or commit to a private "backups" repo).
  - **Option C:** rely on Supabase's daily snapshots (7 days retention on free tier — recovers from a catastrophic incident but not from a "wrong row deleted yesterday" mistake).

  **Recommended default for v1: Option C** — the data volume is small and the use case is low-stakes program data, not financial. Document the decision and reconsider after the first month of real use.

- [ ] **Step 2: Append to `docs/deployment.md`**

  ```markdown
  ## Database backup strategy

  Production Supabase project is on the free tier. Daily snapshots auto-retained for 7 days. No point-in-time recovery.

  For v1 this is acceptable: program data is low-frequency-change and not financial. Re-evaluate after 1 month of real use; upgrade to Pro for PITR if needed.

  To export a manual dump:

  ```bash
  pg_dump "$DATABASE_URL" --schema=public --no-owner > backup-$(date +%Y%m%d).sql
  ```

  Store dumps outside the repo (Google Drive folder per `userEmail` context).
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add docs/deployment.md
  git commit -m "Document database backup strategy (snapshots only for v1)"
  ```

---

## Phase J: Launch day

The pre-launch checklist + the final docs pass + the post-launch smoke.

### Task 46: Write the launch checklist

**Files:**
- Create: `docs/launch-checklist.md`

- [ ] **Step 1: Write the doc**

  ```markdown
  # Launch Checklist — IMPACT Internship Portal

  Run through this checklist the day of cutover. Tick each item off in a fresh copy.

  ## T-7 days

  - [ ] Final question content from program staff confirmed (Personal Goals, Midpoint Reflection, Participant Feedback, Exit Employer Survey, Competency Core)
  - [ ] Real employer list confirmed (names + contact emails)
  - [ ] First admin email + temp password ready to hand off out-of-band
  - [ ] Sentry project provisioned + DSN captured
  - [ ] Resend account on free tier, API key captured
  - [ ] Supabase production project provisioned

  ## T-1 day

  ### Database
  - [ ] `npm run db:migrate` run against prod (use `.env.prod`)
  - [ ] `npm run db:apply-policies` run against prod
  - [ ] `npm run db:seed-prod -- --dry-run` passes
  - [ ] `npm run db:seed-prod` run for real
  - [ ] SQL verification queries (per `docs/seed-prod-runbook.md` step 3) match expected counts
  - [ ] First admin created via `npm run admin:create -- --email=<email> --prompt-password`
  - [ ] Test login: sign in as admin via prod URL — succeeds

  ### Environment variables in Netlify
  - [ ] `SUPABASE_URL` set (all scopes)
  - [ ] `SUPABASE_ANON_KEY` set (all scopes)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` set (Functions/Runtime scope only)
  - [ ] `DATABASE_URL` set (Functions/Runtime)
  - [ ] `DATABASE_POOL_URL` set (Functions/Runtime)
  - [ ] `RESEND_API_KEY` set (Functions/Runtime)
  - [ ] `RESEND_FROM` set
  - [ ] `SENTRY_DSN` set (all scopes)
  - [ ] `SENTRY_AUTH_TOKEN` set (Builds scope only)
  - [ ] `SENTRY_ORG` + `SENTRY_PROJECT` set (Builds)
  - [ ] `SUPPORT_EMAIL` set
  - [ ] `APP_URL=https://impact-internship-portal.netlify.app` set

  ### Email
  - [ ] Resend sender configured (`RESEND_FROM` value verified or `onboarding@resend.dev` accepted as v1 placeholder)
  - [ ] Supabase Auth email templates pasted in per `docs/supabase-email-templates.md`
  - [ ] Test invite email: invite a throwaway email account, receive branded email, click link, set password, log in

  ### Observability
  - [ ] Sentry: deliberate `throw new Error('test')` from a temporary debug route confirms client + server events show up
  - [ ] Netlify function logs show structured JSON lines

  ## T-0 (cutover day)

  - [ ] Merge cutover commit (Phase H Task 42)
  - [ ] Watch Netlify build → "Published"
  - [ ] Smoke-test every key route on the prod URL (see "Post-launch smoke" below)
  - [ ] Send admin their credentials out-of-band
  - [ ] Tell admin: "First task — go to Settings → Employers and create the real employers."
  - [ ] Monitor Sentry for 30 minutes — confirm no spike

  ## Post-launch smoke (manual, T-0 + immediately after)

  Run through these IN ORDER on the prod URL. Tick off each:

  - [ ] `/` — landing renders, "Start a self-assessment" CTA visible
  - [ ] `/login` — form renders, "Forgot password" link visible
  - [ ] Admin sign-in succeeds → lands on `/admin`
  - [ ] `/admin/interns` — empty (or seeded) list renders without error
  - [ ] `/admin/settings/employers` — list renders
  - [ ] Create one real employer via the UI → succeeds
  - [ ] Create one real cohort under that employer → succeeds
  - [ ] Create one intern in that cohort → succeeds
  - [ ] Submit a competency assessment for that intern → succeeds, visible on the intern record
  - [ ] Sign out → `/login`
  - [ ] Invite an employer login from the new employer's detail page → invite email received
  - [ ] Employer accepts invite, sets password, lands on `/employer`
  - [ ] Employer sees only their own data
  - [ ] Sign out
  - [ ] Anonymous intern submits Personal Goals → confirmation page renders
  - [ ] `/admin/reports` — three bar charts render (one will be empty since we have 1 intern, that's fine)

  ## Post-launch (T+1 day)

  - [ ] Sentry: zero unresolved errors (or all triaged)
  - [ ] Netlify function logs: no 5xx responses
  - [ ] Supabase Dashboard → Database → Logs: no RLS-denial spikes
  - [ ] Admin confirms they can do everything they need to via the UI
  - [ ] First real employer onboarded
  - [ ] Stakeholder demo / handoff scheduled
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add docs/launch-checklist.md
  git commit -m "Add launch-day checklist"
  ```

### Task 47: Update CLAUDE.md with the launch state

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append a new section near the end (after the existing "Production app" section from sub-project 1 Task 59)**

  ```markdown
  ## Launch state

  As of sub-project 6 (2026-XX-XX):

  - Netlify publishes the React Router v7 app at `https://impact-internship-portal.netlify.app`. The prototype at `Prototypes/PROTOTYPE/` is no longer served but stays in-repo as design reference.
  - All 6 sub-projects shipped. Spec at `docs/superpowers/specs/2026-05-10-production-rebuild-design.md`.
  - First admin account: see `docs/launch-checklist.md`.
  - Branded transactional emails are in `app/emails/` (invite, password-reset, account-revoked). Supabase Auth's own templates are overridden per `docs/supabase-email-templates.md`.
  - Observability: Sentry for both client and server (`app/lib/sentry.*.ts`); structured request logs to Netlify function logs (`app/lib/logger.server.ts`).
  - Performance budget: <200KB gzipped JS per critical route, enforced in CI via `scripts/check-bundle-size.ts`.
  - Accessibility: axe-core in Playwright e2e (`tests/e2e/a11y.spec.ts`); manual WCAG 2.1 AA review checklist at `docs/a11y-review.md`.
  - Pre-launch checklist at `docs/launch-checklist.md`; rollback procedure in `docs/deployment.md`.

  ### Common ops

  - **Re-seed prod question content** after edits in `db/seed-data/question-sets.ts`: `npm run db:seed-prod -- --force`.
  - **Create another admin**: `npm run admin:create -- --email=<e> --prompt-password`.
  - **Roll back a bad deploy**: Netlify Dashboard → Deploys → Publish a known-good prior deploy.
  - **View prod logs**: `https://app.netlify.com/projects/impact-internship-portal/logs/functions`.
  - **View prod errors**: Sentry project (URL in `docs/deployment.md`).
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add CLAUDE.md
  git commit -m "Update CLAUDE.md with sub-project 6 launch state"
  ```

### Task 48: Rewrite README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` contents**

  ```markdown
  # IMPACT Internship Assessment Portal

  Web app for an Indiana-based internship program. Tracks intake, competency assessments, intern self-assessments, and employment outcomes for placements.

  Live at: https://impact-internship-portal.netlify.app

  ## Stack

  - **Framework:** React Router v7 (framework mode) + TypeScript 5.7
  - **Database:** Supabase Postgres + Drizzle ORM 0.36
  - **Auth:** Supabase Auth (email + password) + Postgres Row-Level Security
  - **Email:** Resend
  - **Hosting:** Netlify
  - **Error tracking:** Sentry
  - **Testing:** Vitest 2 (unit + RLS), Playwright 1.49 (e2e), `@axe-core/playwright` (a11y)
  - **CI:** GitHub Actions

  ## Repo layout

  ```
  app/             Production app (React Router v7)
  db/              Drizzle schema + migrations + seeds
  tests/           Unit, RLS, and Playwright e2e
  scripts/         CLI scripts (create-admin, check-bundle-size)
  docs/            Specs, plans, deployment notes
  Prototypes/      Locked design reference (the original static HTML/CSS prototype)
  ```

  ## Local development

  ```bash
  # 1. Install
  npm install

  # 2. Configure env
  cp .env.example .env.local
  # ... fill in Supabase + Resend keys (see .env.example for the full list)

  # 3. Database
  npm run db:migrate            # apply schema
  npm run db:apply-policies     # apply RLS policies
  npm run db:seed               # seed dev data

  # 4. First admin
  npm run admin:create -- --email=you@example.com --prompt-password

  # 5. Dev server
  npm run dev                   # → http://localhost:5173
  ```

  ## Testing

  ```bash
  npm run lint
  npm run typecheck
  npm test                      # Vitest unit
  npm run test:rls              # Vitest RLS policy tests (requires DB)
  npm run test:e2e              # Playwright (requires DB + .env.test)
  ```

  ## Deployment

  See `docs/deployment.md` for full env-var list, build settings, and rollback procedure. Push to `master` auto-deploys.

  ## Sub-projects

  The production app was built across 6 sub-projects. Specs and plans:

  - Foundation: `docs/superpowers/plans/2026-05-10-sub-project-1-foundation.md`
  - Admin core: `docs/superpowers/plans/2026-05-10-sub-project-2-admin-core.md`
  - Question engine: `docs/superpowers/plans/2026-05-10-sub-project-3-question-engine.md`
  - Assessment forms: `docs/superpowers/plans/2026-05-10-sub-project-4-assessment-forms.md`
  - Employer shell: `docs/superpowers/plans/2026-05-10-sub-project-5-employer-shell.md`
  - Polish & launch: `docs/superpowers/plans/2026-05-10-sub-project-6-polish-launch.md`

  Design spec: `docs/superpowers/specs/2026-05-10-production-rebuild-design.md`.

  ## License

  Internal — not for distribution.
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add README.md
  git commit -m "Rewrite README as production-app onboarding doc"
  ```

### Task 49: Run the full launch checklist

**Files:**
- N/A — execute `docs/launch-checklist.md` in real life

- [ ] **Step 1: Print or open a fresh copy of `docs/launch-checklist.md`**

- [ ] **Step 2: Tick through every item**

  Do NOT skip. Anything that fails goes back to the relevant sub-project's plan for a fix before continuing.

### Task 50: Final repository-level verification

**Files:**
- N/A — verification only

- [ ] **Step 1: Run the full test suite locally one last time**

  ```bash
  npm run lint
  npm run typecheck
  npm test
  npm run test:rls
  npm run test:e2e
  npm run build
  npx tsx scripts/check-bundle-size.ts
  ```

  All seven commands must exit 0.

- [ ] **Step 2: Verify CI is green on master**

  GitHub → Actions tab. Latest `master` run shows all jobs green: Lint & Typecheck, Vitest (unit), Playwright, axe (Playwright), Bundle size guard.

- [ ] **Step 3: Verify the live site one more time**

  Walk through the post-launch smoke from `docs/launch-checklist.md` one more time on the prod URL.

### Task 51: Tag the launch commit

**Files:**
- N/A — git tag

- [ ] **Step 1: Tag**

  ```bash
  git tag -a v1.0.0 -m "Production launch: IMPACT Internship Portal v1"
  git push origin v1.0.0
  ```

- [ ] **Step 2: Create a corresponding Sentry release**

  Sentry → Releases → new release `v1.0.0`. (The vite-plugin already uploads source maps tagged with `SENTRY_RELEASE` if set as a build-time env var; cross-check the release shows up with maps attached.)

### Task 52: Hand-off

**Files:**
- N/A — comms

- [ ] **Step 1: Send the admin their credentials + a "what to do first" note**

  Out-of-band (not over email-of-this-app). Include:
  - Production URL
  - Admin email + temp password
  - "Sign in, change your password immediately (Settings → Account, or use the Forgot Password flow), then go to Settings → Employers and create your real employer list."

- [ ] **Step 2: Schedule a 30-minute walkthrough with program staff**

- [ ] **Step 3: Sub-project 6 complete. Spec section 8.4 row 6 is satisfied.**

---

## Sub-project 6 self-review checklist (for the executor)

After Task 52, verify:

- [ ] Spec section 8.4 "Polish & launch" row — every in-scope item shipped (branded emails, observability, smoke tests, prod data seed, performance pass, accessibility pass, launch)
- [ ] Spec section 9 cross-cutting items covered:
  - [ ] 9.1 Error handling — Sentry-aware ErrorBoundary surfaces event ID
  - [ ] 9.2 Observability — Sentry client + server + RLS-denial breadcrumb + structured logs
  - [ ] 9.3 Testing — Playwright suite complete (6 specs + auth + a11y)
  - [ ] 9.4 Accessibility — axe in CI + manual checklist run
  - [ ] 9.5 Performance — bundle < 200KB gzipped on critical paths + Lighthouse pass
  - [ ] 9.6 Security — CSP set, scopes correct, HTTPS + HSTS + Permissions-Policy headers shipped
- [ ] Netlify cutover reversible: known-good prior deploy is one click away in the Netlify Dashboard; `Prototypes/PROTOTYPE/` still in repo
- [ ] All env vars listed in `docs/deployment.md` are set in Netlify with correct scope
- [ ] Pre-launch checklist (`docs/launch-checklist.md`) ticked through to completion
- [ ] CI green on master, including new jobs (e2e, a11y, bundle-size)
- [ ] Tag `v1.0.0` pushed; Sentry release matches
- [ ] Admin handed off; first walkthrough scheduled

If any of these fail, do NOT declare sub-project 6 complete. Fix and re-verify.

---

## Risks flagged inline

1. **Netlify cutover (Phase H).** Highest-impact event in the rebuild. Mitigated by: draft-deploy dry-run (Task 41) before merging to master, explicit rollback procedure (Tasks 39 + 43), prototype preserved in-repo so a one-commit revert restores the prior state.
2. **Supabase Auth email-template overrides (Task 8).** Only configurable via the Dashboard, not via SQL or the Management API. Captured as a `docs/supabase-email-templates.md` paste-in runbook; risk is that a future Supabase project re-creation forgets this step. Mitigation: launch checklist Task 46 explicitly lists "Supabase Auth email templates pasted in".
3. **Sentry free-tier event budget (5k/month).** A traffic spike could blow through it. `tracesSampleRate: 0.1` + replays-on-error only. Re-evaluate after first month.
4. **Lighthouse CI flakiness on Netlify draft deploys (Task 35).** Explicitly flagged as optional; manual audit is the firm requirement.
5. **Final question content from program staff (Task 17, spec section 10.1).** Sub-project 6 verifies completeness but does NOT author. If sub-project 3 shipped without final content, this stalls launch. Mitigation: the checklist T-7 item is "Final question content confirmed".
6. **Pass/Fail rule for competency (`competencyProgressionByPhase` in Task 3).** The "all Ready" heuristic matches the prototype; the real rule is still placeholder per spec section 10.2. Numbers on the Reports stub are best-effort until that rule is finalized — flagged on the chart with a footnote in a future iteration if program staff push back.
7. **`@netlify/react-router-adapter` package shape (Task 38).** Names + config field may shift between sub-project planning (2026-05-10) and execution. The `netlify.toml` block is the manual fallback; check current adapter docs at execution time.
8. **Test DB cost.** The Playwright e2e + RLS test jobs need a dedicated Supabase project. Free tier supports it but pauses after 7 days of inactivity (spec section 10.6). Mitigation: CI runs daily on `master`, which keeps the test project warm.

---

**End of sub-project 6 plan.** Total tasks: 52. Estimated effort: 5-8 days of focused work, including the cutover day itself and the hand-off.
