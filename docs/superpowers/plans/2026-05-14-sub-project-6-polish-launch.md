# Sub-Project 6: Polish & Launch — Implementation Plan (Revised)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the feature-complete app from sub-projects 0–5 to a live, observable, accessible, performant production deployment on `impact-portal-app.netlify.app` — visual fidelity pass against the prototype, transactional emails wired through Resend, Sentry error tracking, axe-core a11y pass, perf budget enforced in CI, Playwright suite un-gated and complete, all SP1/SP4/SP5 carry-overs closed, production data seed finalized, first production deploy, and a launch-day runbook.

**Architecture:** Integration / launch sub-project. No new domain features. Closes the deck on (a) the carry-overs accumulated across SP0–5, (b) the cross-cutting concerns (observability, a11y, perf) the design spec calls for, (c) visual fidelity to the locked prototype, and (d) the first production cutover — which is dramatically simpler than the original SP6 plan assumed because the production app already has its own dedicated Netlify project (`impact-portal-app`) wired to this repo. No publish-dir flip is needed.

**Tech Stack:** TypeScript 5.7, React Router v7 (framework mode), Vite 6 + `rollup-plugin-visualizer`, Node 22 LTS, Drizzle 0.36 + postgres-js 3.4, @supabase/supabase-js 2.46, @supabase/ssr 0.5, Resend 4 (already in dependencies), Vitest 3, Playwright 1.49 + `@axe-core/playwright`, ESLint 9, Prettier 3, `@sentry/react-router` (or `@sentry/react` + `@sentry/node` if the framework-mode adapter is not yet published), GitHub Actions, Netlify (`@netlify/react-router-adapter`).

**Spec:** `docs/superpowers/specs/2026-05-10-production-rebuild-design.md` (sections 8.3 "Launch shape — big-bang", 8.4 row 6 "Polish & launch", and all of section 9 "Cross-Cutting Concerns").

**Supersedes:** `docs/superpowers/plans/2026-05-10-sub-project-6-polish-launch.md`. That plan was drafted before SP1–5 shipped and made assumptions about scaffolds that don't match reality (publish-dir cutover, fictional `app/emails/_layout.ts` paths, missing carry-overs). It is kept on disk for historical record only.

**Working directory:** `C:\Projects\impact-internship-portal\` (the repo root).

---

## What's already on `main` at the start of SP6

Verified 2026-05-14 against commit `b587507`.

| Concern | Status |
|---|---|
| Build (`npm run build`) | **Green** — task #84 fixed in PR #79 |
| Typecheck | Green |
| Vitest (unit) | 196/196 passing |
| Vitest (RLS integration) | 19 cases passing under `supabase start` |
| Playwright | 10 specs exist, ALL pass locally, CI job `skipping` |
| Routes shipped | Admin: home + Settings (Employers/Cohorts/Roles/Phases/Barriers/Program Info) + Interns CRUD + Assessments (Competency/Exit/Self-results); Employer: shell + dashboard + cohorts + interns + competency + exit-survey + profile + roles; Public: login + auth pages + intern assessments + 3 intern self-assessments + confirmation; 404 |
| Auth | Supabase Auth + JWT custom-access-token hook + 32 RLS policies + HMAC intern identity cookie |
| Email | `app/lib/email.server.ts` (Resend wrapper) + `app/emails/_layout.tsx`, `employer-invite.tsx`, `password-reset.tsx`. `RESEND_API_KEY` unset in prod → `sendEmail` is non-fatal (try/catch + console.warn) |
| Seed | `db/seed.ts` (dev) + `db/seed-prod.ts` (production scaffold) + 8 `db/seed-data/*.ts` modules |
| CI | `Lint & Typecheck`, `Sanity checks (stub)`, `Vitest (unit)`, `Vitest (integration + RLS) on supabase start` all green; `Playwright` permanently `skipping` |
| Netlify | `impact-portal-app` project wired to this repo, env vars set for production + deploy-preview contexts |
| Dev-portal status | `docs/dev-portal/data/status.json` shows SP0–5 complete, SP6 not-started |

## Carry-overs entering SP6

These were filed during SP1–5 reviews and are folded into this plan. All are tracked in the in-session task list (`#48, #49, #69, #76, #77, #89` plus the deferred SP5 Task 37 and the Playwright CI un-gate). The Visual Fidelity gap and Sentry/perf/a11y items come from the original SP6 spec.

| ID | What | Phase |
|---|---|---|
| #48 | Lazy-evaluate `app/lib/env.server.ts` (currently throws at module load) | B |
| #49 | Add range CHECK on `program_info.fiscal_year_start_month` (1–12) | B |
| #69 | `db/seed.ts` should restore admin + employer1 profile rows after `TRUNCATE ... CASCADE` | B |
| #76 | `getOneShotSubmission` should use service-role `dbService` for write/read consistency | B |
| #77 | Split `DATABASE_SERVICE_URL` from `DATABASE_POOL_URL`; downgrade pool client to real `anon` role | B |
| #89 | Decide ON DELETE behavior for `cohorts.role_id` / `interns.role_id` (schema is SET NULL, docs say restrict) | B |
| SP5 Task 37 | Admin invite → accept E2E with NODE_ENV-gated `/dev/invite-link` (security review pending) | F |
| Playwright CI un-gate | The `Playwright` job in `ci.yml` shows `skipping` on every PR. Un-gate or document permanently local-only. | F |
| Visual fidelity | Compare every shipped route against the prototype; close gaps | A |

---

## File Structure

Files this plan creates or modifies. Files marked `(modify)` already exist from a prior sub-project.

**Visual fidelity (Phase A):**
- (No fixed new files — fix list emerges from the audit; expected modifications across `app/styles/*.css`, `app/components/**/*.tsx`, occasional small route tweaks)
- `docs/superpowers/visual-fidelity-audit-2026-05-14.md` — audit log

**Carry-overs (Phase B):**
- `app/lib/env.server.ts` (modify — lazy getters)
- `db/migrations/0002_program_info_check.sql` — new migration: CHECK on fiscal_year_start_month
- `db/seed.ts` (modify — restore admin + employer1 profiles after TRUNCATE)
- `scripts/restore-dev-profiles.ts` (delete — folded into seed.ts)
- `app/lib/assessment-submissions.server.ts` (modify — `getOneShotSubmission` uses `dbService`)
- `app/lib/db.server.ts` (modify — split `DATABASE_POOL_URL` consumer; add real anon-role pool)
- `app/lib/env.server.ts` (modify — register `DATABASE_SERVICE_URL`)
- `.env.local` (modify — add `DATABASE_SERVICE_URL`)
- `db/migrations/0003_role_fk_decision.sql` — new migration (only if Phase B Task 6 chooses "tighten")
- `tests/lib/env.server.test.ts` — new tests for lazy eval

**Reports stub (Phase C):**
- `app/styles/reports.css` — new (lifted from prototype)
- `app/components/BarChart.tsx` — new
- `app/lib/reports.server.ts` — new (aggregate queries)
- `app/routes/admin.reports.tsx` (modify — flesh out from placeholder)
- `tests/lib/reports.server.test.ts` — new

**Email polish + Resend wiring (Phase D):**
- `app/emails/_layout.tsx` (modify — bring up to brand-spec parity)
- `app/emails/employer-invite.tsx` (modify — final pass)
- `app/emails/password-reset.tsx` (modify — final pass)
- `app/emails/account-revoked.tsx` — new (notify employer when admin revokes login)
- `app/emails/email-changed.tsx` — new (Supabase event)
- `tests/emails/render.test.ts` — new (snapshot)
- `scripts/render-email.ts` — new CLI for rendering a template to stdout for Supabase paste
- `docs/email-templates-paste-runbook.md` — new
- `app/lib/email.server.ts` (modify — emit structured log on send/fail)

**Observability (Phase E):**
- `app/lib/sentry.client.ts` — new
- `app/lib/sentry.server.ts` — new
- `app/lib/logger.server.ts` — new (JSON-line request logger)
- `app/lib/request-id.server.ts` — new (X-Request-Id middleware)
- `app/entry.client.tsx` (modify — wire Sentry.init + ErrorBoundary)
- `app/entry.server.tsx` (modify — wire Sentry.init + global error handler)
- `app/root.tsx` (modify — Sentry-aware ErrorBoundary surfacing event ID)
- `app/lib/env.server.ts` (modify — add SENTRY_DSN, SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT)
- `.env.example` (modify)
- `vite.config.ts` (modify — add `@sentry/vite-plugin` for source-map upload)
- `tests/lib/logger.server.test.ts` — new

**E2E coverage + CI un-gate (Phase F):**
- `.github/workflows/ci.yml` (modify — un-gate Playwright job)
- `tests/e2e/admin-intern-lifecycle.spec.ts` — new
- `tests/e2e/employer-onboarding.spec.ts` — new (admin invite → accept; SP5 Task 37)
- `app/routes/dev.invite-link.tsx` — new, gated route for the onboarding spec
- `tests/e2e/fixtures/seeded-db.ts` — new fixture (re-run `db:seed` before suite)
- `playwright.config.ts` (modify — projects, baseURL from env, html+github reporters)

**Accessibility pass (Phase G):**
- `tests/e2e/a11y.spec.ts` — new (axe-core sweep over every key route)
- `app/components/VisuallyHidden.tsx` — new if not already shipped
- Inline form / button fixes across components — list emerges from audit; expected edits to `IdentityCard`, `ActionBar`, `Modal`, `AssessmentForm`

**Performance pass (Phase H):**
- `vite.config.ts` (modify — add `rollup-plugin-visualizer`)
- `scripts/check-bundle-size.ts` — new (fails CI if critical-route chunk > 200KB gzipped)
- `.github/workflows/ci.yml` (modify — add bundle-size gate)

**Production data seed (Phase I):**
- `db/seed-prod.ts` (modify — add `--dry-run`, `--force`; load real employer/cohort/role lists)
- `db/seed-data/employers-prod.ts` — new (placeholders → real rows during launch)
- `db/seed-data/cohorts-prod.ts` — new
- `db/seed-data/roles-prod.ts` — new
- `scripts/create-admin.ts` (modify — idempotency check + `--dry-run`)
- `docs/seed-prod-runbook.md` — new

**Launch day (Phase J):**
- `docs/launch-checklist.md` — new (pre-launch + day-of + post-launch verification)
- `docs/rollback-runbook.md` — new (how to redeploy a prior Netlify deploy + how to roll back a Supabase migration)
- `README.md` (modify — full rewrite as the stack overview and dev-onboarding doc)
- `CLAUDE.md` (modify — append launch-state section)
- `docs/dev-portal/data/status.json` (modify — SP6 → complete on close-out PR)

---

## Phases overview

| Phase | Name | Tasks | PR # (target) | Purpose |
|---|---|---|---|---|
| A | Visual fidelity audit + fixes | 1–6 | 80 (audit), 81–84 (fix batches) | Compare every shipped route to the prototype; close gaps batch-by-batch |
| B | Carry-over cleanup | 7–12 | 85–90 | Close #48, #49, #69, #76, #77, #89 |
| C | Reports stub | 13–15 | 91 | Live admin Reports page with real aggregate queries; CSS bar charts only |
| D | Email polish + Resend wiring | 16–21 | 92–93 | Final brand polish on shipped templates; add account-revoked + email-changed; wire RESEND_API_KEY; paste into Supabase prod |
| E | Observability (Sentry + structured logging) | 22–27 | 94 | Sentry client + server init, source-map upload, request-id, JSON-line logger |
| F | E2E coverage + Playwright CI un-gate | 28–33 | 95 | Un-gate the Playwright CI job; add `admin-intern-lifecycle`, `employer-onboarding` (SP5 Task 37), seeded-DB fixture |
| G | Accessibility pass | 34–37 | 96 | axe-core sweep; WCAG 2.1 AA fixes |
| H | Performance pass | 38–40 | 97 | Bundle visualizer, perf budget CI gate, code-split verification |
| I | Production data seed + admin bootstrap | 41–43 | 98 | Finalize seed-prod, runbook, create-admin idempotency |
| J | Launch day | 44–50 | 99 (cutover), 100 (close-out) | First prod deploy via deploy-preview → promote, smoke, README + CLAUDE.md handoff, status.json flip |

Target: ~50 tasks, ~10 PRs. One PR per phase has been the consistent SP1–5 pattern; the visual fidelity audit may split into multiple PRs depending on the size of the fix list.

**Recommended execution order:** A → B in parallel batches (visual fidelity audit can spawn while carry-over fixes land), then C, D, E sequentially, then F (un-gate gives us a CI guardrail for G/H), then G, H in parallel (different surfaces of the same change set), then I, then J. The plan is written sequentially for clarity but the dependency graph allows for parallelism after Phase F.

---

## Phase A: Visual fidelity audit + fixes

The clickable prototype at `Prototypes/PROTOTYPE/` is the **authoritative visual reference** for v1. Every route shipped in SP2–5 has at least basic brand styling, but no one has systematically walked the live app side-by-side with the prototype to check spacing, copy, button treatments, table layouts, breadcrumbs, micro-labels, and the dozens of small things that separate "wired up" from "looks like the prototype."

This phase is exploratory: the audit produces a fix list, then 3–5 batched PRs close the gaps. Don't try to predict the fix list up front.

### Task 1: Inventory + side-by-side audit

**Files:**
- Create: `docs/superpowers/visual-fidelity-audit-2026-05-14.md`

- [ ] **Step 1: Start the dev server + open the prototype**

  Run in one terminal: `npm run dev` (serves the production app at http://localhost:5173).
  Run in another terminal: `start "" "C:\Projects\impact-prototype\Prototypes\PROTOTYPE\index.html"` (opens the prototype in the default browser).

  Both surfaces use the same brand tokens, so any difference visible in the page is a real gap.

- [ ] **Step 2: Enumerate every shipped production route**

  Open `app/routes.ts`. List every leaf route grouped by shell. Cross-reference each to the matching prototype HTML file:

  | Production route | Prototype counterpart |
  |---|---|
  | `/login` | `login.html` |
  | `/auth/forgot` | (new in SP5 — no prototype) |
  | `/auth/reset` | (new in SP5 — no prototype) |
  | `/auth/accept` | (new in SP5 — no prototype) |
  | `/admin` | `admin.html` |
  | `/admin/interns` | `interns-dashboard.html` |
  | `/admin/interns/new` + `/admin/interns/:id` | `intern-record.html` |
  | `/admin/settings/employers` + `/:employerId` | `settings-employers.html` + `settings-employer.html` |
  | `/admin/settings/cohorts/:cohortId` | `cohort-detail.html` |
  | `/admin/settings/roles/:roleId` + `/new` + `/edit` | `role-detail.html` / `role-new.html` / `role-edit.html` |
  | `/admin/settings/phases` | `settings-phases.html` |
  | `/admin/settings/barriers` | `settings-barriers.html` |
  | `/admin/settings/program-info` | `settings-program-info.html` |
  | `/admin/settings/questions` + `/:setId` | `settings-questions.html` + `settings-question-set.html` |
  | `/admin/settings/questions/competency` | `settings-competency.html` |
  | `/admin/assessments/competency/new` + `/edit` | `competency-new.html` + `competency-edit.html` |
  | `/admin/assessments/exit-employer-survey` | `exit-employer-survey.html` |
  | `/admin/assessments/self-results` + `:id` | `self-assessment-results.html` + `self-assessment-detail.html` |
  | `/employer` | (new in SP5 — no prototype; design follows admin shell with employer-specific accents) |
  | `/employer/cohorts` + `/:cohortId` | (new in SP5) |
  | `/employer/interns` + `/:internId` | (new in SP5) |
  | `/employer/competency/new` + `/edit` + `/:id` | (new in SP5) |
  | `/employer/exit-survey` | (new in SP5) |
  | `/employer/profile` + `/roles` | (new in SP5) |
  | `/intern/assessments` | `intern-assessments.html` |
  | `/intern/personal-goals` | `personal-goals.html` |
  | `/intern/midpoint-reflection` | `midpoint-reflection.html` |
  | `/intern/participant-feedback` | `participant-feedback.html` |
  | `/intern/confirmation` | `assessment-confirmation.html` |
  | `/*` (404) | `404.html` |

- [ ] **Step 3: Walk each pair side-by-side; record gaps**

  For each route, open both in side-by-side browser windows. Record gaps as bulleted entries in `docs/superpowers/visual-fidelity-audit-2026-05-14.md`. Categorize by severity:

  - **P0 (blocks launch)** — broken layout, wrong color, missing brand mark, illegible text
  - **P1 (high)** — spacing off, wrong button treatment, missing breadcrumb, wrong micro-label casing
  - **P2 (polish)** — minor padding, hover state mismatch, label phrasing

  Employer routes have no prototype counterpart — audit them against the admin shell instead (do nav chip alignment, table styling, action-bar placement match?).

  Routes with hard-to-reach states (e.g., `/auth/reset` requires a Supabase recovery token) — note them and defer to a manual test pass.

- [ ] **Step 4: Commit the audit doc**

  ```bash
  git checkout -b docs/sp6-visual-fidelity-audit
  git add docs/superpowers/visual-fidelity-audit-2026-05-14.md
  git commit -m "docs(sp6): visual fidelity audit (production app vs prototype)"
  git push -u origin docs/sp6-visual-fidelity-audit
  gh pr create --title "docs(sp6): visual fidelity audit" --body "Audit log captures the gap list before Phase A fix batches."
  ```

  Merge before opening fix-batch PRs so the fix list is on `main`.

### Task 2: Fix batch 1 — auth + public surface

**Files:**
- Modify: anything flagged P0/P1 under `_public.*` routes and `app/styles/auth.css`, `app/styles/public.css`

- [ ] **Step 1: Open the audit, filter to the auth + public group**

  Group: `/login`, `/auth/forgot`, `/auth/reset`, `/auth/accept`, `/auth/callback`, `/intern/assessments`, `/intern/personal-goals`, `/intern/midpoint-reflection`, `/intern/participant-feedback`, `/intern/confirmation`, `/*`.

- [ ] **Step 2: Apply each P0 + P1 fix in turn**

  For each fix, edit the relevant component/CSS file. Run `npm run dev` in the background and verify in browser before moving on. Keep edits surgical — no opportunistic refactors.

- [ ] **Step 3: Verify build + typecheck**

  ```bash
  npm run typecheck
  npm run build
  ```

  Both must pass.

- [ ] **Step 4: Commit + open PR**

  ```bash
  git checkout -b feat/sp6-visual-fidelity-batch-1-auth-public
  git add -p   # review hunks
  git commit -m "feat(sp6): visual fidelity pass — auth + public surface"
  git push -u origin feat/sp6-visual-fidelity-batch-1-auth-public
  gh pr create --title "feat(sp6): visual fidelity batch 1 — auth + public" --body "$(cat <<'EOF'
## Summary
Phase A fix batch 1. Closes the P0 + P1 gaps for the auth flow (`/login`, `/auth/forgot|reset|accept|callback`) and the public intern surface (`/intern/*`, `/*` 404), per `docs/superpowers/visual-fidelity-audit-2026-05-14.md`.

## Test plan
- [ ] npm run build + typecheck
- [ ] Manual walk-through: each touched route side-by-side with the prototype
- [ ] CI green
EOF
)"
  ```

### Task 3: Fix batch 2 — admin shell + Settings

Same shape as Task 2, scoped to `/admin` + `/admin/settings/*`.

- [ ] **Step 1–4: same as Task 2 with this branch name**

  Branch: `feat/sp6-visual-fidelity-batch-2-admin`. PR title: `feat(sp6): visual fidelity batch 2 — admin shell + Settings`.

### Task 4: Fix batch 3 — admin Interns + Assessments

Same shape. Routes: `/admin/interns/*`, `/admin/assessments/*`. Branch: `feat/sp6-visual-fidelity-batch-3-admin-interns-assessments`.

### Task 5: Fix batch 4 — employer shell

Same shape. Routes: `/employer/*`. No prototype counterpart — audit against admin shell for consistency. Branch: `feat/sp6-visual-fidelity-batch-4-employer`.

### Task 6: Phase A close-out — verify all fixes

- [ ] **Step 1: Re-walk every route in the audit doc**

  Confirm each entry is closed or has a "deferred to backlog" note explaining why.

- [ ] **Step 2: Update the audit doc**

  Mark closed items with ✅ and the merging PR number. Deferred items go in `docs/BACKLOG.md` under a new SP6 section.

- [ ] **Step 3: Commit**

  ```bash
  git checkout -b docs/sp6-visual-fidelity-audit-closeout
  git add docs/superpowers/visual-fidelity-audit-2026-05-14.md docs/BACKLOG.md
  git commit -m "docs(sp6): close visual fidelity audit"
  git push -u origin docs/sp6-visual-fidelity-audit-closeout
  gh pr create --title "docs(sp6): visual fidelity audit close-out" --body "Marks every audit item as ✅ shipped or → deferred-to-backlog."
  ```

---

## Phase B: Carry-over cleanup

Six small, well-scoped fixes that clear technical debt from SP0–5. Each lands as its own PR.

### Task 7: #48 — lazy-evaluate `app/lib/env.server.ts`

Today `env.server.ts` reads every required env var at module-load time and throws if any is missing. This bites test setup: any test that imports a module that imports `env` (transitively) fails unless all 8+ vars are populated.

**Files:**
- Modify: `app/lib/env.server.ts`
- Create: `tests/lib/env.server.test.ts`

- [ ] **Step 1: Write failing tests**

  ```ts
  // tests/lib/env.server.test.ts
  import { describe, it, expect, beforeEach, afterEach } from 'vitest';

  describe('env.server lazy evaluation', () => {
    const original = { ...process.env };
    afterEach(() => { process.env = { ...original }; });

    it('does not throw on module import when vars are missing', async () => {
      delete process.env.DATABASE_POOL_URL;
      delete process.env.SUPABASE_URL;
      const mod = await import('~/lib/env.server');
      expect(mod.env).toBeDefined();
    });

    it('throws when a missing var is accessed', async () => {
      delete process.env.DATABASE_POOL_URL;
      const { env } = await import('~/lib/env.server');
      expect(() => env.DATABASE_POOL_URL).toThrow(/DATABASE_POOL_URL/);
    });

    it('returns the value when the var is present', async () => {
      process.env.DATABASE_POOL_URL = 'postgresql://example';
      const { env } = await import('~/lib/env.server');
      expect(env.DATABASE_POOL_URL).toBe('postgresql://example');
    });
  });
  ```

- [ ] **Step 2: Run; verify failure**

  ```bash
  npm test -- --run tests/lib/env.server.test.ts
  ```

  Expect FAIL (module currently throws at import).

- [ ] **Step 3: Convert `env` to a getter-backed proxy**

  Refactor `app/lib/env.server.ts` so the module export is a `Proxy` over a config descriptor. Each key has a definition `{ name: 'DATABASE_POOL_URL', required: true }`; on access, the proxy reads `process.env[name]` and throws if `required` and missing. Keep the existing exported type shape so call sites don't need to change.

- [ ] **Step 4: Run tests; verify all pass**

  ```bash
  npm test -- --run tests/lib/env.server.test.ts
  npm test -- --run
  ```

  Both must pass.

- [ ] **Step 5: Verify build + typecheck**

  ```bash
  npm run typecheck && npm run build
  ```

- [ ] **Step 6: Commit + push + PR**

  Branch: `fix/sp6-task48-lazy-env`. PR title: `fix(sp6): lazy-evaluate env.server (task #48)`.

### Task 8: #49 — CHECK constraint on `program_info.fiscal_year_start_month`

**Files:**
- Create: `db/migrations/0002_program_info_fiscal_check.sql`
- Modify: `db/schema.ts` (Drizzle column definition for `fiscal_year_start_month`)

- [ ] **Step 1: Author the migration**

  ```sql
  -- db/migrations/0002_program_info_fiscal_check.sql
  ALTER TABLE program_info
    ADD CONSTRAINT program_info_fiscal_year_start_month_check
      CHECK (fiscal_year_start_month BETWEEN 1 AND 12);
  ```

- [ ] **Step 2: Mirror the constraint in the Drizzle schema**

  Add `.check('program_info_fiscal_year_start_month_check', sql\`fiscal_year_start_month BETWEEN 1 AND 12\`)` on the column. Run `npm run db:generate` afterwards — if drizzle-kit wants to write a duplicate migration, delete it; the hand-written SQL is the source of truth.

- [ ] **Step 3: Apply locally + verify**

  ```bash
  npm run db:migrate
  psql $DATABASE_POOL_URL -c "INSERT INTO program_info (program_name, fiscal_year_start_month, default_cohort_length_weeks) VALUES ('x', 13, 4);"
  ```

  Expected: ERROR — check constraint violated.

- [ ] **Step 4: Commit + push + PR**

  Branch: `fix/sp6-task49-fiscal-check`. PR title: `fix(sp6): CHECK program_info.fiscal_year_start_month 1..12 (task #49)`.

### Task 9: #69 — `db/seed.ts` should restore admin + employer1 profiles after TRUNCATE

Today the dev seed TRUNCATEs every table, which cascades to `profiles` and wipes the admin + employer1 rows that map Supabase Auth users → roles. The workaround is the uncommitted `scripts/restore-dev-profiles.ts`. Fold it into `seed.ts` so `npm run db:seed` leaves a working DB.

**Files:**
- Modify: `db/seed.ts`
- Delete: `scripts/restore-dev-profiles.ts`

- [ ] **Step 1: Read the existing restore script**

  ```bash
  cat scripts/restore-dev-profiles.ts
  ```

  It upserts two rows into `profiles`: `admin@example.com` → `role='admin'`, `employer1@example.com` → `role='employer'` + `employer_id=<first employer>`.

- [ ] **Step 2: Lift the upsert into `db/seed.ts`**

  After the TRUNCATE + before the COMMIT, add a `profiles` upsert that resolves the two known auth user IDs via `auth.users` lookups. Don't hardcode UUIDs — look them up by email so a re-created auth user keeps working.

- [ ] **Step 3: Run + verify**

  ```bash
  npm run db:seed
  npm run dev
  # log in as admin@example.com and as employer1@example.com — both should land on their shells without needing the workaround
  ```

- [ ] **Step 4: Remove the now-redundant helper**

  ```bash
  rm scripts/restore-dev-profiles.ts
  ```

- [ ] **Step 5: Update CLAUDE.md**

  Remove the line in the "Local development cheat-sheet" that tells contributors to run `npx tsx scripts/restore-dev-profiles.ts` after every seed.

- [ ] **Step 6: Commit + push + PR**

  Branch: `fix/sp6-task69-seed-profiles`. PR title: `fix(sp6): seed restores admin + employer profiles (task #69)`.

### Task 10: #76 — `getOneShotSubmission` uses service-role client

**Files:**
- Modify: `app/lib/assessment-submissions.server.ts`

- [ ] **Step 1: Import `dbService` instead of `db` in the function body**

  Find `getOneShotSubmission` in `app/lib/assessment-submissions.server.ts`. Swap the `db` reference for `dbService` (already exported from `app/lib/db.service.server.ts`). All other functions in the file remain on whatever client they use today.

- [ ] **Step 2: Verify tests still pass**

  ```bash
  npm test -- --run tests/lib/assessment-submissions.server.test.ts
  ```

  (If no direct test exists for `getOneShotSubmission`, the e2e specs that exercise the intern flow cover it.)

- [ ] **Step 3: Commit + push + PR**

  Branch: `fix/sp6-task76-oneshot-service-role`. PR title: `fix(sp6): getOneShotSubmission uses service-role client (task #76)`.

### Task 11: #77 — split `DATABASE_SERVICE_URL` from `DATABASE_POOL_URL`

Today both `db` (pool client) and `dbService` (service client) connect via the same `DATABASE_POOL_URL` env var, which is a `BYPASSRLS` connection. The separation is semantic only. SP6 splits the variable so the pool client can be downgraded to a real `anon`-role connection — this makes RLS bugs in admin/employer routes surface as 401s in tests instead of silently passing.

**Files:**
- Modify: `app/lib/env.server.ts` (register `DATABASE_SERVICE_URL` as required)
- Modify: `app/lib/db.service.server.ts` (use `env.DATABASE_SERVICE_URL`)
- Modify: `app/lib/db.server.ts` (keep using `env.DATABASE_POOL_URL` — but now this URL points at a real anon-role user)
- Modify: `.env.local` (add `DATABASE_SERVICE_URL`)
- Modify: `.env.example`
- Modify: `docs/superpowers/specs/2026-05-10-production-rebuild-design.md` (update §2.4 to document the two URLs)

- [ ] **Step 1: Provision the anon-role Postgres user in impact-dev**

  In the Supabase dashboard SQL editor for `impact-dev`:

  ```sql
  -- Run as the bypassrls superuser
  CREATE ROLE app_anon NOLOGIN;
  GRANT anon TO app_anon;
  CREATE USER app_pool WITH PASSWORD '<generate-strong>' IN ROLE app_anon;
  -- Grant the minimum schema usage
  GRANT USAGE ON SCHEMA public TO anon;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;  -- RLS will further restrict
  ```

  (Repeat for `impact-prod` later in Phase J.)

- [ ] **Step 2: Build the new `DATABASE_POOL_URL`**

  Connection string format: `postgresql://app_pool.<project-ref>:<password>@<pool-host>:6543/postgres?sslmode=require`. Get pool host from Supabase dashboard → Project Settings → Database → Connection string → "Transaction" mode.

  Put it in `.env.local` under `DATABASE_POOL_URL=`. Keep the current bypassrls URL as `DATABASE_SERVICE_URL=` (it's the existing value).

- [ ] **Step 3: Run RLS tests to verify the pool client now sees RLS**

  ```bash
  npm run test:rls
  ```

  Some tests may fail if they relied on the pool client bypassing RLS. Fix the tests by switching them to `dbService` OR by adding the missing RLS policy. **Do not loosen RLS to make tests pass.**

- [ ] **Step 4: Run unit + e2e**

  ```bash
  npm test -- --run
  npm run test:e2e
  ```

- [ ] **Step 5: Commit + push + PR**

  Branch: `fix/sp6-task77-split-db-urls`. PR title: `fix(sp6): split DATABASE_SERVICE_URL from DATABASE_POOL_URL (task #77)`.

  PR description should call out: prod env vars are still wired against the bypassrls URL — Phase J will provision the prod anon-role user and flip prod env vars.

### Task 12: #89 — decide ON DELETE behavior for `cohorts.role_id` / `interns.role_id`

The schema is `ON DELETE SET NULL`; the design spec says `restrict`. Today an employer can delete a role and silently null out cohort/intern references. SP5 left a defensive `23503` handler in `employer.roles.$roleId.tsx` as forward-compat for if we tighten.

**Decision options (choose during this task — both are valid):**

1. **Tighten to `restrict`** — match the spec. Migration changes the FK. Employer roles UI gets a soft-delete or refusal flow for roles with references. The 23503 handler in `employer.roles.$roleId.tsx` becomes load-bearing.
2. **Document `SET NULL` as intentional** — update the spec; remove the dead 23503 handler. Cohort/intern role can be null; the UI shows "Role: —" for those rows; an admin must manually re-assign. This is the simplest path but loses referential information.

Brainstorm with Matt before picking. Pick during planning; do not pick mid-implementation.

**Files (option 1, tighten):**
- Create: `db/migrations/0003_role_fk_restrict.sql`
- Modify: `db/schema.ts`
- Modify: `app/routes/employer.roles.$roleId.tsx` (promote 23503 handler from dead code to the primary delete path)
- Modify: `app/routes/admin.settings.roles.$roleId.edit.tsx` (same handler)

**Files (option 2, document):**
- Modify: `docs/superpowers/specs/2026-05-10-production-rebuild-design.md` (update the schema section)
- Modify: `app/routes/employer.roles.$roleId.tsx` (remove dead 23503 handler)
- Modify: `app/routes/admin.settings.roles.$roleId.edit.tsx`

- [ ] **Step 1: Decide with Matt**

  Present the two options and the trade-off (data integrity vs. UI complexity). Wait for explicit choice before writing code.

- [ ] **Step 2: Implement the chosen option**

  Follow the corresponding file list. Migrations are idempotent (`DROP CONSTRAINT IF EXISTS` then `ADD CONSTRAINT`).

- [ ] **Step 3: Run the full test pyramid**

  ```bash
  npm test -- --run && npm run test:rls && npm run typecheck && npm run build
  ```

- [ ] **Step 4: Commit + push + PR**

  Branch: `fix/sp6-task89-role-fk-decision` (rename to reflect chosen option in the PR title).

---

## Phase C: Reports stub

Spec section 8.1: "Reports stub (CSS bar charts only — no real analytics)." Numbers are computed from real DB aggregates; the chart set is fixed at three reports.

The existing `app/routes/admin.reports.tsx` is a SP2 placeholder. This phase fleshes it out.

### Task 13: Port reports CSS + build BarChart component

**Files:**
- Create: `app/styles/reports.css`
- Create: `app/components/BarChart.tsx`
- Modify: `app/root.tsx` (import reports.css)

- [ ] **Step 1: Lift the bar-chart + report-card CSS from the prototype**

  Source: `C:\Projects\impact-prototype\Prototypes\PROTOTYPE\styles.css` — search for `.report-card`, `.bar-chart`, `.report-demo-badge` rules. Copy verbatim into `app/styles/reports.css`. Brand tokens (`--navy`, `--gold`, `--cyan`) already in `app/styles/tokens.css`.

- [ ] **Step 2: Import the stylesheet from `app/root.tsx`**

  Add `import '~/styles/reports.css';` alongside the existing global imports.

- [ ] **Step 3: Write the BarChart component**

  ```tsx
  // app/components/BarChart.tsx
  import type { ReactNode } from 'react';

  export type BarColor = 'navy' | 'gold' | 'cyan' | 'success' | 'danger' | 'muted';

  export interface BarChartDatum {
    label: ReactNode;
    value: number | string;
    /** 0–100; clipped if out of range */
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

- [ ] **Step 4: Verify build**

  ```bash
  npm run build
  ```

- [ ] **Step 5: Commit (no PR yet — task 15 ships all of Phase C in one PR)**

  ```bash
  git checkout -b feat/sp6-reports-stub
  git add app/styles/reports.css app/root.tsx app/components/BarChart.tsx
  git commit -m "feat(sp6): port reports CSS + BarChart presentational component"
  ```

### Task 14: Reports aggregate queries — TDD

**Files:**
- Create: `app/lib/reports.server.ts`
- Create: `tests/lib/reports.server.test.ts`

- [ ] **Step 1: Write the failing test**

  ```ts
  // tests/lib/reports.server.test.ts
  import { describe, it, expect } from 'vitest';
  import {
    topEntryBarriers,
    competencyProgressionByPhase,
    outcomeCounts,
  } from '~/lib/reports.server';

  const SKIP = !process.env.DATABASE_POOL_URL || process.env.DATABASE_POOL_URL.includes('fake');

  describe.skipIf(SKIP)('reports.server', () => {
    it('topEntryBarriers returns rows ordered by count desc', async () => {
      const rows = await topEntryBarriers({ limit: 6 });
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i - 1].count).toBeGreaterThanOrEqual(rows[i].count);
      }
    });

    it('competencyProgressionByPhase returns one row per phase with passRate 0..1', async () => {
      const rows = await competencyProgressionByPhase();
      for (const r of rows) {
        expect(r.passRate).toBeGreaterThanOrEqual(0);
        expect(r.passRate).toBeLessThanOrEqual(1);
      }
    });

    it('outcomeCounts returns three buckets that sum to >= 0', async () => {
      const c = await outcomeCounts();
      expect(c.notYetTracked + c.employedAt90 + c.stillAt180).toBeGreaterThanOrEqual(0);
    });
  });
  ```

- [ ] **Step 2: Run; verify failure**

  ```bash
  npm test -- --run tests/lib/reports.server.test.ts
  ```

- [ ] **Step 3: Implement**

  ```ts
  // app/lib/reports.server.ts
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
    // Spec §10 question 2 flags the final pass/fail rule as a placeholder; this matches the
    // prototype's "all Ready" display.
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
      WHERE s.type = 'competency' AND s.deleted_at IS NULL
      GROUP BY p.label, p.sort_order
      ORDER BY p.sort_order ASC
    `);
    return rows.map((r) => ({
      phase: r.phase,
      submissions: r.submissions,
      passRate: r.submissions === 0 ? 0 : r.passes / r.submissions,
    }));
  }

  export interface OutcomeBuckets { notYetTracked: number; employedAt90: number; stillAt180: number; }
  export async function outcomeCounts(): Promise<OutcomeBuckets> {
    const rows = await db.execute<{ bucket: string; count: number }>(sql`
      SELECT
        CASE
          WHEN employed_at_180_days = true THEN 'stillAt180'
          WHEN employed_at_90_days = true THEN 'employedAt90'
          ELSE 'notYetTracked'
        END AS bucket,
        COUNT(*)::int AS count
      FROM interns
      WHERE deleted_at IS NULL
      GROUP BY bucket
    `);
    const out: OutcomeBuckets = { notYetTracked: 0, employedAt90: 0, stillAt180: 0 };
    for (const r of rows) (out as any)[r.bucket] = r.count;
    return out;
  }
  ```

- [ ] **Step 4: Run tests; verify pass**

  ```bash
  npm test -- --run tests/lib/reports.server.test.ts
  ```

- [ ] **Step 5: Commit (still on feat/sp6-reports-stub branch)**

  ```bash
  git add app/lib/reports.server.ts tests/lib/reports.server.test.ts
  git commit -m "feat(sp6): reports aggregate queries (TDD)"
  ```

### Task 15: Wire the Reports route + ship the PR

**Files:**
- Modify: `app/routes/admin.reports.tsx`

- [ ] **Step 1: Implement the loader + render**

  Loader returns the three aggregates. Component renders three `<article class="report-card">` with `<BarChart>` inside each. Match the prototype's `reports.html` structure exactly (PageHead, breadcrumb, container, three side-by-side cards, demo badge if data is empty).

- [ ] **Step 2: Manual smoke**

  ```bash
  npm run db:seed
  npm run dev
  # visit http://localhost:5173/admin/reports — should render three cards with real numbers
  ```

- [ ] **Step 3: Verify build + typecheck + tests**

  ```bash
  npm run typecheck && npm run build && npm test -- --run
  ```

- [ ] **Step 4: Push + PR**

  ```bash
  git add app/routes/admin.reports.tsx
  git commit -m "feat(sp6): wire admin Reports route to live aggregate queries"
  git push -u origin feat/sp6-reports-stub
  gh pr create --title "feat(sp6): admin Reports stub with live aggregates" --body "Phase C. Three CSS bar charts (barriers, competency by phase, outcomes) wired to real DB aggregates. Matches prototype reports.html."
  ```

---

## Phase D: Email polish + Resend wiring

SP5 shipped the employer-invite and password-reset templates as plain-string functions. This phase brings them up to brand-spec parity, adds two missing templates (account-revoked, email-changed), and wires `RESEND_API_KEY` in Netlify so emails actually send in production. The Supabase Auth dashboard also needs the HTML pasted into the invite/recovery template fields.

### Task 16: Audit + polish `_layout.tsx` + existing templates

**Files:**
- Modify: `app/emails/_layout.tsx`
- Modify: `app/emails/employer-invite.tsx`
- Modify: `app/emails/password-reset.tsx`

- [ ] **Step 1: Open each template + render a sample**

  ```bash
  # Add a quick render harness (or use the rendering script from Task 19 if it exists)
  node -e "console.log(require('./app/emails/employer-invite').buildEmployerInviteEmail({ employerName: 'Acme', acceptUrl: 'https://example.com', adminName: 'Admin' }).html)" > /tmp/invite.html
  start "" "/tmp/invite.html"   # PowerShell: Invoke-Item C:\temp\invite.html
  ```

  Compare to the brand spec (navy + cyan + gold tokens, Archivo Black headline, IBM Plex Sans body). Note discrepancies.

- [ ] **Step 2: Apply polish**

  Edits limited to:
  - Inline-style additions for spacing + typography
  - Adding the IMPACT wordmark (text only — not the PNG; logo PNG doesn't render well in email clients)
  - Footer line with "IMPACT Internship Program · [organization name placeholder]"
  - CTA button styling (navy bg + white text, 12px padding, 4px radius)

- [ ] **Step 3: Verify both templates render without errors**

  Re-run the render command from Step 1 for each.

- [ ] **Step 4: Commit**

  Branch: `feat/sp6-email-polish`.
  ```bash
  git checkout -b feat/sp6-email-polish
  git add app/emails/
  git commit -m "feat(sp6): brand polish for employer-invite + password-reset emails"
  ```

### Task 17: Add `account-revoked` template

**Files:**
- Create: `app/emails/account-revoked.tsx`

Triggered manually from `app/routes/admin.settings.employers.$employerId._index.tsx` (the "Revoke login" action that already exists from SP5). Today it only revokes the auth user; SP6 also sends a courtesy email.

- [ ] **Step 1: Build the template** following the existing pattern (function returning `{subject, html, text}`).

  Subject: `Your IMPACT employer login has been revoked`.
  Body: short, factual, with a sentence on how to re-request access (contact the program admin).

- [ ] **Step 2: Hook into the revoke action**

  In `app/routes/admin.settings.employers.$employerId._index.tsx`, after the existing `supabaseAdmin.auth.admin.deleteUser` call, build the email and `sendEmail({...})` it. Wrap in `try/catch` — failed email is non-fatal.

- [ ] **Step 3: Commit**

  ```bash
  git add app/emails/account-revoked.tsx app/routes/admin.settings.employers.$employerId._index.tsx
  git commit -m "feat(sp6): account-revoked email + wire into revoke action"
  ```

### Task 18: Add `email-changed` template (Supabase event)

**Files:**
- Create: `app/emails/email-changed.tsx`

Supabase Auth sends a confirmation email when an employer changes their address. The template is owned by Supabase but uses our HTML — we paste this into the Supabase dashboard in Task 21.

- [ ] **Step 1: Build the template**

  Subject: `Confirm your new email address for IMPACT`. Body shows the new + old addresses and a confirm link (Supabase substitutes `{{ .ConfirmationURL }}`).

- [ ] **Step 2: Commit**

  ```bash
  git add app/emails/email-changed.tsx
  git commit -m "feat(sp6): email-changed template for Supabase address-change event"
  ```

### Task 19: Render-to-stdout CLI + snapshot tests

**Files:**
- Create: `scripts/render-email.ts`
- Create: `tests/emails/render.test.ts`

- [ ] **Step 1: Build the CLI**

  ```ts
  // scripts/render-email.ts
  import { buildEmployerInviteEmail } from '../app/emails/employer-invite';
  import { buildPasswordResetEmail } from '../app/emails/password-reset';
  import { buildAccountRevokedEmail } from '../app/emails/account-revoked';
  import { buildEmailChangedEmail } from '../app/emails/email-changed';

  const SAMPLES = {
    'employer-invite': buildEmployerInviteEmail({ employerName: 'Acme Hospital', acceptUrl: 'https://impact-portal-app.netlify.app/auth/accept?token=SAMPLE', adminName: 'Program Admin' }),
    'password-reset': buildPasswordResetEmail({ resetUrl: 'https://impact-portal-app.netlify.app/auth/reset?token=SAMPLE' }),
    'account-revoked': buildAccountRevokedEmail({ employerName: 'Acme Hospital' }),
    'email-changed': buildEmailChangedEmail({ newEmail: 'new@example.com', oldEmail: 'old@example.com', confirmUrl: 'https://example.com' }),
  };

  const which = process.argv[2];
  const fmt = process.argv[3] ?? 'html';
  if (!(which in SAMPLES)) {
    console.error(`Usage: tsx scripts/render-email.ts <${Object.keys(SAMPLES).join('|')}> [html|text]`);
    process.exit(1);
  }
  const out = (SAMPLES as any)[which][fmt];
  process.stdout.write(out);
  ```

  Usage: `npx tsx scripts/render-email.ts employer-invite html > /tmp/invite.html`.

- [ ] **Step 2: Add snapshot tests**

  ```ts
  // tests/emails/render.test.ts
  import { describe, it, expect } from 'vitest';
  import { buildEmployerInviteEmail } from '../../app/emails/employer-invite';
  import { buildPasswordResetEmail } from '../../app/emails/password-reset';
  import { buildAccountRevokedEmail } from '../../app/emails/account-revoked';
  import { buildEmailChangedEmail } from '../../app/emails/email-changed';

  describe('email templates render', () => {
    it('employer-invite has subject + html + text', () => {
      const e = buildEmployerInviteEmail({ employerName: 'X', acceptUrl: 'https://x', adminName: 'A' });
      expect(e.subject).toMatch(/IMPACT/);
      expect(e.html).toContain('https://x');
      expect(e.text).toContain('https://x');
    });
    // Repeat for the other three. Use toMatchSnapshot() once the visual pass settles.
  });
  ```

- [ ] **Step 3: Run tests; verify pass**

  ```bash
  npm test -- --run tests/emails/render.test.ts
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add scripts/render-email.ts tests/emails/render.test.ts
  git commit -m "feat(sp6): email render CLI + snapshot tests"
  ```

### Task 20: Wire `RESEND_API_KEY` in Netlify (prod context)

**Files:**
- (No code changes — Netlify UI / CLI)

- [ ] **Step 1: Get the Resend API key**

  Confirm with Matt whether the production Resend account is set up. If not, set it up at resend.com (free tier supports 3000 sends/month and 100/day, plenty for v1). Verify the sending domain or use Resend's default sandbox domain for v1.

- [ ] **Step 2: Set the env var in Netlify**

  ```bash
  netlify env:set RESEND_API_KEY <key> --context production
  netlify env:set RESEND_FROM 'IMPACT Internship Program <notifications@<domain>>' --context production
  ```

  Use a sandbox-domain `from` if no custom domain is verified yet.

- [ ] **Step 3: Trigger a redeploy + smoke-test the invite flow**

  Trigger a deploy preview (`git push` to a branch), then in the deploy preview log in as admin, invite a test employer to your personal email. Confirm receipt.

  If the email doesn't arrive, check the Netlify function logs — `sendEmail` logs the Resend response. The most common failure is a non-verified `from` address.

- [ ] **Step 4: Commit (docs only)**

  Append a section to `docs/deployment.md` (or create it if missing) documenting the env vars and how to verify a send.

  ```bash
  git add docs/deployment.md
  git commit -m "docs(sp6): document Resend env var wiring in Netlify"
  ```

### Task 21: Paste templates into Supabase Auth dashboard (impact-prod)

**Files:**
- Create: `docs/email-templates-paste-runbook.md`

Supabase Auth controls the invite-link / recovery-link / email-change emails. The Auth UI has a "Templates" tab where you paste HTML; Supabase substitutes `{{ .ConfirmationURL }}`, `{{ .Token }}`, etc. SP5 used the dashboard defaults; SP6 swaps them for the branded HTML.

- [ ] **Step 1: Render each template to a file**

  ```bash
  npx tsx scripts/render-email.ts employer-invite html > /tmp/invite.html
  npx tsx scripts/render-email.ts password-reset html > /tmp/reset.html
  npx tsx scripts/render-email.ts email-changed html > /tmp/email-changed.html
  ```

- [ ] **Step 2: Paste into Supabase dashboard for impact-prod**

  Auth → Templates → swap "Invite user", "Reset password", and "Change email" with the rendered HTML. Replace `{{ "{{" }}.ConfirmationURL{{ "}}" }}` style tokens in the rendered HTML — the templates currently hardcode `https://...` from the sample params; the Supabase template needs the dynamic tokens. Simplest: edit each template module to use `{{ .ConfirmationURL }}` as a placeholder in the HTML, render to file, paste.

- [ ] **Step 3: Repeat for impact-dev**

  Same paste, against the impact-dev project, so deploy-preview testing exercises the branded templates too.

- [ ] **Step 4: Document the procedure**

  Write `docs/email-templates-paste-runbook.md` listing each template path, the Supabase dashboard URL, and the substitution tokens. So we don't lose this knowledge.

- [ ] **Step 5: Final commit + push + PR**

  ```bash
  git add docs/email-templates-paste-runbook.md
  git commit -m "docs(sp6): Supabase Auth template paste runbook"
  git push -u origin feat/sp6-email-polish
  gh pr create --title "feat(sp6): email polish + Resend wiring + Supabase template paste" --body "Phase D. Brand-polished templates, two new templates (revoked, email-changed), Resend wired in Netlify prod, Supabase Auth templates updated for both projects."
  ```

---

## Phase E: Observability — Sentry + structured logging

### Task 22: Server Sentry init

**Files:**
- Create: `app/lib/sentry.server.ts`
- Modify: `app/lib/env.server.ts` (register `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`)
- Modify: `.env.example`
- Modify: `app/entry.server.tsx`

- [ ] **Step 1: Add Sentry packages**

  ```bash
  npm install @sentry/node @sentry/profiling-node
  npm install -D @sentry/vite-plugin
  ```

- [ ] **Step 2: Build the server init**

  ```ts
  // app/lib/sentry.server.ts
  import * as Sentry from '@sentry/node';
  import { env } from './env.server';

  let initialized = false;
  export function initSentryServer() {
    if (initialized) return;
    if (!process.env.SENTRY_DSN) {
      console.warn('Sentry server not initialized (no SENTRY_DSN).');
      return;
    }
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NETLIFY_CONTEXT ?? process.env.NODE_ENV ?? 'development',
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1,
      release: process.env.COMMIT_REF,
    });
    initialized = true;
  }

  export { Sentry };
  ```

- [ ] **Step 3: Wire into entry.server.tsx**

  At the top of `app/entry.server.tsx`, call `initSentryServer()`. Wrap the existing request handler so unhandled errors are reported.

- [ ] **Step 4: Register the env vars as optional**

  In `env.server.ts`, add `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` as `{ required: false }`.

- [ ] **Step 5: Commit (on a new branch `feat/sp6-observability`)**

  ```bash
  git checkout -b feat/sp6-observability
  git add app/lib/sentry.server.ts app/lib/env.server.ts .env.example app/entry.server.tsx package.json package-lock.json
  git commit -m "feat(sp6): wire Sentry server-side init"
  ```

### Task 23: Client Sentry init + ErrorBoundary

**Files:**
- Create: `app/lib/sentry.client.ts`
- Modify: `app/entry.client.tsx`
- Modify: `app/root.tsx`

- [ ] **Step 1: Add browser package**

  ```bash
  npm install @sentry/react
  ```

- [ ] **Step 2: Build the client init**

  ```ts
  // app/lib/sentry.client.ts
  import * as Sentry from '@sentry/react';

  let initialized = false;
  export function initSentryClient() {
    if (initialized) return;
    const dsn = (window as any).ENV?.SENTRY_DSN;
    if (!dsn) return;
    Sentry.init({
      dsn,
      environment: (window as any).ENV?.NETLIFY_CONTEXT ?? 'development',
      tracesSampleRate: 0.1,
      release: (window as any).ENV?.COMMIT_REF,
    });
    initialized = true;
  }

  export { Sentry };
  ```

- [ ] **Step 3: Expose ENV to the client**

  In `app/root.tsx`'s loader, return `{ ENV: { SENTRY_DSN: process.env.SENTRY_DSN, NETLIFY_CONTEXT: process.env.NETLIFY_CONTEXT, COMMIT_REF: process.env.COMMIT_REF } }`. Inject as a `<script>window.ENV = ...</script>` before the app mounts.

- [ ] **Step 4: Call `initSentryClient()` from entry.client.tsx**

- [ ] **Step 5: Replace the root ErrorBoundary with `<Sentry.ErrorBoundary>`**

  Surface the Sentry event ID in the boundary's render so users can quote it when reporting.

- [ ] **Step 6: Commit**

  ```bash
  git add app/lib/sentry.client.ts app/entry.client.tsx app/root.tsx package.json package-lock.json
  git commit -m "feat(sp6): wire Sentry client + ErrorBoundary"
  ```

### Task 24: Source-map upload via @sentry/vite-plugin

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Add the plugin**

  ```ts
  // vite.config.ts (relevant addition)
  import { sentryVitePlugin } from '@sentry/vite-plugin';

  export default defineConfig({
    plugins: [
      // ... existing plugins
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: { assets: './build/**' },
        release: { name: process.env.COMMIT_REF },
        disable: !process.env.SENTRY_AUTH_TOKEN,
      }),
    ],
  });
  ```

- [ ] **Step 2: Verify build still passes**

  ```bash
  npm run build
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add vite.config.ts
  git commit -m "feat(sp6): Sentry source-map upload via vite plugin"
  ```

### Task 25: Structured request logger

**Files:**
- Create: `app/lib/logger.server.ts`
- Create: `tests/lib/logger.server.test.ts`

- [ ] **Step 1: Write the failing test**

  ```ts
  // tests/lib/logger.server.test.ts
  import { describe, it, expect, vi } from 'vitest';
  import { log } from '~/lib/logger.server';

  describe('logger.server', () => {
    it('emits JSON line to stdout with required fields', () => {
      const spy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      log({ level: 'info', msg: 'hello', requestId: 'abc' });
      expect(spy).toHaveBeenCalled();
      const written = (spy.mock.calls[0][0] as string);
      const parsed = JSON.parse(written);
      expect(parsed).toMatchObject({ level: 'info', msg: 'hello', requestId: 'abc' });
      expect(parsed.timestamp).toBeDefined();
      spy.mockRestore();
    });
  });
  ```

- [ ] **Step 2: Run; verify failure**

- [ ] **Step 3: Implement**

  ```ts
  // app/lib/logger.server.ts
  type Level = 'debug' | 'info' | 'warn' | 'error';
  interface LogEntry {
    level: Level;
    msg: string;
    requestId?: string;
    userId?: string;
    role?: string;
    [k: string]: unknown;
  }
  export function log(entry: LogEntry) {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...entry,
    });
    process.stdout.write(line + '\n');
  }
  ```

- [ ] **Step 4: Run tests; verify pass**

- [ ] **Step 5: Commit**

  ```bash
  git add app/lib/logger.server.ts tests/lib/logger.server.test.ts
  git commit -m "feat(sp6): structured JSON-line request logger"
  ```

### Task 26: Request-ID middleware

**Files:**
- Create: `app/lib/request-id.server.ts`
- Modify: `app/entry.server.tsx`

- [ ] **Step 1: Build the helper**

  ```ts
  // app/lib/request-id.server.ts
  export function getOrCreateRequestId(request: Request): string {
    const existing = request.headers.get('x-request-id');
    if (existing && /^[A-Za-z0-9-]{8,64}$/.test(existing)) return existing;
    return crypto.randomUUID();
  }
  ```

- [ ] **Step 2: Wire into the request handler**

  In `app/entry.server.tsx`, generate/extract the ID, attach to response headers (`X-Request-Id`), and pass into Sentry scope (`Sentry.getCurrentScope().setTag('request_id', id)`).

- [ ] **Step 3: Verify smoke**

  ```bash
  npm run dev
  curl -i http://localhost:5173/login | grep -i x-request-id
  ```

  Expected: `X-Request-Id: <uuid>` in response headers.

- [ ] **Step 4: Commit**

  ```bash
  git add app/lib/request-id.server.ts app/entry.server.tsx
  git commit -m "feat(sp6): request-id middleware + Sentry scope tag"
  ```

### Task 27: Set Sentry env vars in Netlify + close Phase E

**Files:**
- (No code — Netlify UI / CLI + final PR)

- [ ] **Step 1: Provision Sentry project**

  Create a `impact-internship-portal` Sentry project. Get the DSN + auth token + org slug + project slug.

- [ ] **Step 2: Set Netlify env vars**

  ```bash
  netlify env:set SENTRY_DSN <dsn> --context production --context deploy-preview --context branch-deploy
  netlify env:set SENTRY_AUTH_TOKEN <token> --context production
  netlify env:set SENTRY_ORG <org> --context production
  netlify env:set SENTRY_PROJECT <project> --context production
  ```

  Auth token is build-time only (source-map upload) so prod-only is fine; DSN goes into every context for runtime reporting.

- [ ] **Step 3: Trigger a redeploy + verify**

  Push a branch, watch the deploy preview build the source maps and upload to Sentry. Trigger a deliberate runtime error (e.g., visit a route that loaders into a 500) and confirm it appears in Sentry with the source-map symbolicated.

- [ ] **Step 4: Push + open PR**

  ```bash
  git push -u origin feat/sp6-observability
  gh pr create --title "feat(sp6): observability — Sentry + structured logging + request-id" --body "Phase E."
  ```

---

## Phase F: E2E coverage + Playwright CI un-gate

### Task 28: Un-gate the Playwright job

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Read the current workflow**

  ```bash
  cat .github/workflows/ci.yml | grep -A 10 -i playwright
  ```

  Identify the `if:` condition that makes the job skip (likely `if: false` or a string condition).

- [ ] **Step 2: Replace the gate with a real run**

  The Playwright job should:
  - depend on the unit job
  - run on a fresh `supabase start` container (or reuse the integration job's Postgres)
  - install Playwright browsers via `npx playwright install --with-deps chromium`
  - run `npm run test:e2e -- --reporter=github,html`
  - upload `playwright-report/` as an artifact on failure

- [ ] **Step 3: Push the branch + watch CI**

  Branch: `feat/sp6-playwright-ci-ungate`. Push, open PR, watch CI. Expect 1–2 failing specs the first time — fix as needed.

- [ ] **Step 4: Verify all 10 specs pass in CI**

  Specs today: `auth`, `admin-crud`, `admin-competency`, `admin-exit-employer-survey`, `admin-question-editor`, `intern-self-submit`, `employer-login`, `employer-competency`. (Two more will be added in Tasks 29 + 30.)

- [ ] **Step 5: Merge once CI is green** (10 specs passing in CI)

### Task 29: Write `admin-intern-lifecycle.spec.ts`

**Files:**
- Create: `tests/e2e/admin-intern-lifecycle.spec.ts`

- [ ] **Step 1: Walk the prototype's admin-side intern lifecycle**

  Path: login → /admin/interns/new → create intern → land on intern record → submit one competency assessment via /admin/assessments/competency/new?internId=<id> → return to record and verify the assessment appears.

- [ ] **Step 2: Build the spec**

  Use the existing `auth.spec.ts` as the boilerplate template (test fixtures, base URL, admin login helper). Each step in the lifecycle is an assertion + interaction. ~80–100 lines.

- [ ] **Step 3: Run locally**

  ```bash
  npm run test:e2e -- tests/e2e/admin-intern-lifecycle.spec.ts
  ```

- [ ] **Step 4: Commit (still on `feat/sp6-playwright-ci-ungate` if not yet merged, else new branch)**

### Task 30: Write `employer-onboarding.spec.ts` (deferred SP5 Task 37)

This is the trickiest spec to author safely. The flow is: admin invites employer → employer receives email → employer clicks link → first-time sign-in → password set → land on `/employer`. Two strategies are viable:

**Strategy A — NODE_ENV-gated dev endpoint**

A `/dev/invite-link` route that returns the most recently issued invite token for a given email. **MUST** be gated:
- Returns 404 unconditionally if `process.env.NODE_ENV === 'production'`
- Returns 404 unconditionally if `process.env.CI !== 'true' && process.env.NODE_ENV !== 'test'`
- Mounted via `app/routes.ts` only when the env condition is true (build-time gate)

**Strategy B — Direct Supabase admin API call from the test**

The test uses the service-role key to call `supabaseAdmin.auth.admin.generateLink({ type: 'invite', email })` directly, skipping the public route entirely. Safer (no public surface) but couples the test to the Supabase SDK.

**Pick Strategy B unless Matt has a reason to ship the dev route to prod (e.g., for QA staging access).** Strategy B has no production exposure.

**Files (Strategy B):**
- Create: `tests/e2e/employer-onboarding.spec.ts`

- [ ] **Step 1: Build the spec using Supabase admin API**

  ```ts
  // tests/e2e/employer-onboarding.spec.ts (skeleton)
  import { test, expect } from '@playwright/test';
  import { createClient } from '@supabase/supabase-js';

  test('admin invite → employer accept → land on /employer', async ({ page, request }) => {
    const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Setup: get the first employer + a test email
    const testEmail = `e2e-${Date.now()}@example.test`;
    // ... (insert a profiles row tied to employer1)

    // Generate invite link via admin API
    const { data } = await supa.auth.admin.generateLink({ type: 'invite', email: testEmail });
    expect(data.properties?.action_link).toBeDefined();

    // Follow the link
    await page.goto(data.properties!.action_link!);
    // Should land on /auth/accept; set a password
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    // Should redirect to /employer
    await expect(page).toHaveURL(/\/employer/);
    await expect(page.locator('.employer-chip__email')).toContainText(testEmail);

    // Teardown: delete the test auth user
    const { data: users } = await supa.auth.admin.listUsers();
    const created = users.users.find((u) => u.email === testEmail);
    if (created) await supa.auth.admin.deleteUser(created.id);
  });
  ```

- [ ] **Step 2: Run locally**

  ```bash
  npm run test:e2e -- tests/e2e/employer-onboarding.spec.ts
  ```

- [ ] **Step 3: Commit**

### Task 31: Seeded-DB Playwright fixture

**Files:**
- Create: `tests/e2e/fixtures/seeded-db.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Build the fixture**

  Re-run `npm run db:seed` once at suite start. Use the Playwright global-setup pattern.

- [ ] **Step 2: Wire into `playwright.config.ts`**

  Add `globalSetup: './tests/e2e/fixtures/seeded-db.ts'`.

- [ ] **Step 3: Verify spec suite runs against a fresh seed**

### Task 32: Polish playwright.config + add projects

**Files:**
- Modify: `playwright.config.ts`

- [ ] **Step 1: Pin the project to Chromium + add reporters**

  ```ts
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  reporter: process.env.CI ? [['github'], ['html']] : 'list',
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173' },
  ```

### Task 33: Phase F close-out — push + PR + verify CI

- [ ] **Step 1: Push the combined branch + open the PR**

  Branch: `feat/sp6-playwright-suite`. PR title: `feat(sp6): playwright CI un-gate + intern-lifecycle + employer-onboarding + seeded-db fixture`.

- [ ] **Step 2: Watch CI — verify all e2e specs pass in CI**

- [ ] **Step 3: Merge**

---

## Phase G: Accessibility pass

### Task 34: Add `tests/e2e/a11y.spec.ts` with axe-core

**Files:**
- Create: `tests/e2e/a11y.spec.ts`

- [ ] **Step 1: Install axe-core for Playwright**

  ```bash
  npm install -D @axe-core/playwright
  ```

- [ ] **Step 2: Write the spec**

  Visit every key route as both admin + employer, run `await new AxeBuilder({ page }).analyze()`, assert no critical or serious violations.

- [ ] **Step 3: Run locally**

  ```bash
  npm run test:e2e -- tests/e2e/a11y.spec.ts
  ```

  Expected: failures across multiple routes. Each failure is a fix item for Task 36.

### Task 35: Categorize + prioritize a11y violations

**Files:**
- Append to: `docs/superpowers/visual-fidelity-audit-2026-05-14.md` (new "Accessibility" section, or split into its own doc)

- [ ] **Step 1: Group axe output by violation type** (color-contrast, missing-label, region, etc.)

- [ ] **Step 2: Assign each to a fix task** in Task 36

### Task 36: Apply a11y fixes

**Files (typical):**
- Modify: `app/components/Modal.tsx` (focus trap, `aria-labelledby`)
- Modify: `app/components/forms/*.tsx` (missing `for` / `id` pairing, error region `aria-live`)
- Modify: `app/styles/*.css` (color-contrast adjustments — careful, do NOT shift brand tokens; instead darken text-on-color combinations)
- Modify: any `<a>` with `cursor: pointer` row-click pattern (add `tabindex="0"` + Enter/Space keyboard handler)

- [ ] **Step 1–N: Fix each, re-run axe, repeat until clean**

- [ ] **Step N+1: Commit + push + PR**

  Branch: `feat/sp6-a11y`. PR title: `feat(sp6): a11y pass (axe-core sweep + WCAG fixes)`.

### Task 37: Phase G close-out — manual screen-reader pass

- [ ] **Step 1: Walk every key route with NVDA or VoiceOver**

  Verify keyboard-only navigation works (no mouse). Verify table-row navigation in interns/cohorts lists. Verify modals trap focus + Escape closes.

- [ ] **Step 2: File any remaining issues in BACKLOG.md** (not all will be fixable in v1)

---

## Phase H: Performance pass

### Task 38: Bundle visualizer + size analysis

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Install rollup-plugin-visualizer**

  ```bash
  npm install -D rollup-plugin-visualizer
  ```

- [ ] **Step 2: Wire into vite.config.ts**

  ```ts
  import { visualizer } from 'rollup-plugin-visualizer';
  // ... in plugins array:
  process.env.ANALYZE ? visualizer({ filename: 'build/bundle-stats.html', open: true }) : null,
  ```

- [ ] **Step 3: Run analysis**

  ```bash
  ANALYZE=1 npm run build   # or in PowerShell: $env:ANALYZE=1; npm run build
  ```

  Inspect the resulting `build/bundle-stats.html`. Identify any unexpectedly-large chunks (anything that surprises you).

- [ ] **Step 4: Commit (no PR yet — Task 40 bundles all of Phase H)**

  Branch: `feat/sp6-perf`.

### Task 39: Bundle-size CI gate

**Files:**
- Create: `scripts/check-bundle-size.ts`
- Modify: `.github/workflows/ci.yml` (add a `bundle-size` job)

- [ ] **Step 1: Set the budgets**

  Critical routes:
  - `/` (root entry) — < 200KB gzipped
  - `/admin` (admin shell entry) — < 150KB gzipped
  - `/employer` — < 150KB gzipped
  - `/intern/assessments` — < 100KB gzipped (no auth context)

  Tune budgets based on the visualizer output from Task 38 — set 10% above current size as the ceiling.

- [ ] **Step 2: Write the check script**

  Reads the Vite manifest from `build/.vite/manifest.json`, sums chunk sizes per route entry, fails non-zero if any route exceeds budget.

- [ ] **Step 3: Wire into CI**

  Add a new job that runs `npm run build && tsx scripts/check-bundle-size.ts`.

- [ ] **Step 4: Verify**

  Run locally; should pass.

### Task 40: Phase H close-out — push + PR

- [ ] **Step 1: Push the branch + open the PR**

  Branch: `feat/sp6-perf`. PR title: `feat(sp6): performance — bundle visualizer + CI size gate`.

---

## Phase I: Production data seed + admin bootstrap

### Task 41: Real employer/cohort/role placeholders

**Files:**
- Create: `db/seed-data/employers-prod.ts`
- Create: `db/seed-data/cohorts-prod.ts`
- Create: `db/seed-data/roles-prod.ts`
- Modify: `db/seed-prod.ts`

- [ ] **Step 1: Stub placeholder rows**

  Each file exports a typed array of rows. Use `// TODO_FROM_PROGRAM_STAFF` markers next to fields that need real values. The Phase J launch checklist will replace these with real data.

- [ ] **Step 2: Wire into seed-prod.ts**

  After the existing program-info + phases + barriers + question-sets seeds, insert employers → cohorts → roles in dependency order. All inserts are `ON CONFLICT DO NOTHING` keyed by `name`-or-natural-key so re-runs are safe.

### Task 42: `--dry-run` and `--force` flags for seed-prod

**Files:**
- Modify: `db/seed-prod.ts`

- [ ] **Step 1: Add a CLI arg parser** (minimist or hand-rolled)

  `--dry-run` prints the planned INSERTs without running them. `--force` is required to actually run; without it, the script aborts with a "you didn't pass --force; here's what would happen, use --dry-run to preview, then re-run with --force" message.

- [ ] **Step 2: Verify**

  ```bash
  DATABASE_POOL_URL=$IMPACT_PROD_URL npx tsx db/seed-prod.ts --dry-run
  ```

### Task 43: create-admin idempotency

**Files:**
- Modify: `scripts/create-admin.ts`

- [ ] **Step 1: Add an existence check**

  Before calling `supabaseAdmin.auth.admin.createUser`, list users and check if `email` already exists. If yes, exit 0 with "Admin already exists." If no, proceed.

- [ ] **Step 2: Add `--dry-run`**

  Same shape as seed-prod's flag.

- [ ] **Step 3: Write the runbook**

  Create `docs/seed-prod-runbook.md`:

  - Pre-conditions (impact-prod migrations applied, anon-role user provisioned per Task 11)
  - Step-by-step: dry-run seed → review → force seed → create admin → verify counts
  - Sanity queries (`SELECT COUNT(*) FROM employers; SELECT email FROM auth.users LIMIT 5;`)
  - Rollback (drop the seeded rows; admin user remains for re-runs)

- [ ] **Step 4: Push + PR**

  Branch: `feat/sp6-prod-seed`. PR title: `feat(sp6): production seed + admin bootstrap + runbook`.

---

## Phase J: Launch day

### Task 44: Pre-launch checklist

**Files:**
- Create: `docs/launch-checklist.md`

- [ ] **Step 1: Author the checklist**

  Sections:
  - **T-7 days:** real employer/cohort/role data collected from program staff; impact-prod Supabase project provisioned (already done in SP1); impact-prod anon-role user provisioned (Phase B Task 11); impact-prod Sentry DSN configured
  - **T-1 day:** all PRs merged; CI green on main; bundle-size + a11y gates passing; impact-prod migrations applied; impact-prod RLS policies applied; impact-prod seed dry-run reviewed
  - **Launch day:** seed-prod --force; create-admin; smoke test (login → create test cohort + intern → verify dashboard); flip status.json; announce
  - **T+1 day:** Sentry triage; review function logs in Netlify; verify Resend send counts

### Task 45: Rollback runbook

**Files:**
- Create: `docs/rollback-runbook.md`

- [ ] **Step 1: Author the rollback procedure**

  - **Netlify deploy rollback:** `netlify rollback --to <previous-deploy-id>` or via UI ("Publish deploy" on a prior deploy)
  - **DB migration rollback:** for each migration in `db/migrations/`, document the inverse SQL (DROP CONSTRAINT, ALTER COLUMN, etc.). Migrations are mostly additive so most rollbacks are straightforward.
  - **Communication template:** brief email to stakeholders explaining the rollback

### Task 46: First production deploy

**Files:**
- (No code — Netlify UI + deploy verification)

- [ ] **Step 1: Provision impact-prod anon-role user**

  Repeat Phase B Task 11 Step 1 against impact-prod. Get the connection string. Set as `DATABASE_POOL_URL` in Netlify production context.

- [ ] **Step 2: Apply migrations + policies to impact-prod**

  ```bash
  DATABASE_POOL_URL=$IMPACT_PROD_URL npm run db:migrate
  DATABASE_POOL_URL=$IMPACT_PROD_URL npm run db:apply-policies
  ```

- [ ] **Step 3: Run seed-prod**

  ```bash
  DATABASE_POOL_URL=$IMPACT_PROD_URL npx tsx db/seed-prod.ts --dry-run
  # Review output
  DATABASE_POOL_URL=$IMPACT_PROD_URL npx tsx db/seed-prod.ts --force
  ```

- [ ] **Step 4: Create the production admin user**

  ```bash
  DATABASE_POOL_URL=$IMPACT_PROD_URL npm run admin:create -- --email=<real-admin-email> --password=<TEMP_PASSWORD>
  ```

  Communicate the temporary password to the admin out-of-band; require password change on first login.

- [ ] **Step 5: Trigger the production deploy**

  Push to main triggers the production-context deploy on `impact-portal-app`. Watch the build log + smoke immediately after green.

### Task 47: Post-launch smoke

- [ ] **Step 1: Manual smoke on prod**

  Walk the same flow as the seeded-DB Playwright fixture: admin login, create employer (real one), create cohort, create intern. Verify employer login flow works end-to-end. Verify Resend sends the invite email. Verify Sentry receives a deliberate test error.

- [ ] **Step 2: Capture screenshots of the live app** for the dev-portal status page.

### Task 48: README rewrite

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite README from the launch perspective**

  Replace any "this is in development" language with "this is the production app at <URL>." Sections:
  - What this is + who it's for
  - Stack
  - Local dev (link to CLAUDE.md for full detail)
  - Deployment
  - Support / contact

### Task 49: CLAUDE.md handoff section

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append a "Production app — sub-project 6 complete (launched)" section**

  Pattern matches the SP1–5 "complete" sections. Include:
  - Launch date + first prod commit ref
  - Production URL
  - Sentry project link
  - Resend account link
  - Carry-overs that landed
  - Carry-overs that did not (move to BACKLOG.md)

### Task 50: Status board flip + close-out PR

**Files:**
- Modify: `docs/dev-portal/data/status.json`

- [ ] **Step 1: Flip SP6 to complete**

  ```json
  {
    "id": 6,
    "name": "Polish & Launch",
    "status": "complete",
    "taskCount": 50,
    "prCount": <actual PR count>,
    "summary": "<one-line summary of what shipped>"
  }
  ```

  Bump `asOf` to the launch date.

- [ ] **Step 2: Open the final close-out PR**

  Branch: `docs/sp6-launch-closeout`. PR title: `docs(sp6): launch close-out — status board + README + CLAUDE.md`.

- [ ] **Step 3: Merge — production rebuild is shipped.**

---

## Self-Review

**Spec coverage:** SP6 spec sections (8.3 launch shape, 8.4 row 6, all of 9 cross-cutting concerns) are covered by Phases C (reports), D (emails), E (Sentry + logging), F (e2e), G (a11y), H (perf), I (seed), J (launch). Visual fidelity (A) and carry-overs (B) are added on top of the spec. **Gap:** the spec calls for "DNS / custom domain" as optional Phase I in the old plan — this plan omits it; if a custom domain is needed, add a one-task addendum to Phase J. Acceptable for v1 launch on `*.netlify.app`.

**Placeholder scan:** No `TBD` / `TODO_FROM_PROGRAM_STAFF` outside of the explicit Phase I seed placeholders (which are intentional — they're filled at launch checklist time). No "implement later" / "fill in details" steps.

**Type consistency:** `BarChart` component, `BarChartDatum`, and `BarColor` are consistent across Phase C tasks. `log(entry)` signature in Phase E Task 25 matches the test. `getOrCreateRequestId(request)` signature is consistent in Tasks 26 + 27.

**Carry-over coverage:** all six numbered carry-overs (#48, #49, #69, #76, #77, #89) have a dedicated task in Phase B. SP5 Task 37 (admin invite-accept E2E) is Task 30. Playwright CI un-gate is Task 28.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-14-sub-project-6-polish-launch.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Matches the SP1–5 pattern.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
