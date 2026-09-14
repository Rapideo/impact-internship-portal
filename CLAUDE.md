# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

The **IMPACT Internship Assessment Portal** is a web app for an Indiana-based internship program. The clickable 34-page prototype is **locked** in a separate sibling repo (`Rapideo/impact-prototype`). The production rebuild's **Sub-projects 0 through 5 plus Sub-project 7 (frontend rebuild) are complete as of 2026-05-19**: React Router v7 scaffold, Drizzle schema for all 15 public tables, 32+ RLS policies + JWT custom-access-token hook, dev seed, full admin CRUD, question-engine with 6 renderer types + 3-tier competency stitching, all 5 assessment forms (intern anonymous self-submit + admin-completed Competency + Exit Employer Survey), employer shell with branded auth + dashboard + scoped flows, pixel-for-pixel frontend rebuild against the prototype. Test pyramid: 326 unit/component + RLS suite + 14 Playwright spec files (Playwright CI un-gated in SP6 Phase F, PR #105). **Production went live on impact-prod 2026-05-26** — impact-prod bootstrapped (schema + RLS + JWT hook + reference-data seed + admin account), GitHub→Netlify auto-deploy wired (push/merge to `main` auto-deploys to prod), DB password rotated. **Remaining launch items are tracked in `docs/launch-todo.md`** (custom SMTP, branded email templates, admin invite→accept E2E, `#77` DB-role hardening), as is the **client punchlist 9.11.26** status table (as of 2026-09-14: item 3 done in #156, item 5 delete-users done in #157, item 6 was already built — cohort dates exist since SP2; client-originated files live outside this public repo at `C:\Projects\impact-client-docs\`); the full pipeline is explained in `docs/cicd-overview.md`. The **Reports dashboards** (`/admin/reports` + `/employer/reports`) are built (SP6 Phase C) — a dependency-free SVG/CSS chart kit (KPI tiles, bars, radial gauges, meters, activity trend) fed by a scope-aware data layer (`app/lib/reports-queries.server.ts`) with admin global→employer→cohort filtering and employer views pinned to the signed-in employer. Visual-fidelity source-of-truth: `docs/superpowers/visual-fidelity-audit-2026-05-14.md` (closed) + `docs/superpowers/visual-fidelity-screenshots/2026-05-19-final/` (75 side-by-side captures). A branded ~10-page **Quick Start & Testing Guide** for the program team lives at `docs/quick-start-guide/` (the PDF plus `capture.ts`/`render.ts` to regenerate it from staging screenshots via the repo's existing Playwright/Chromium — no new deps).

The app tracks:
- Intake / Entry Assessment (captured on the intern record at creation)
- Competency assessments (multi-phase, admin-completed on behalf of employers)
- Intern self-assessments (one-time, intern-submitted during the program)
- 90-day and 180-day employment outcomes

## Source-of-truth documents

**Production rebuild (authoritative):**
- `docs/superpowers/specs/2026-05-10-production-rebuild-design.md` — architectural design spec. Stack (RR v7 + Drizzle + Supabase Postgres + Supabase Auth + Netlify), 15-table data model, 3-tier permission model, question-set engine, phasing. §2.4 specifies 2 Supabase projects (`impact-dev` + `impact-prod`) with CI using `supabase start`.
- `docs/superpowers/specs/2026-05-11-development-workflow-design.md` — workflow spec. Branching, Conventional Commits, PR conventions, branch protection, CI, Netlify topology (2 projects), per-deploy-context secrets.
- `docs/superpowers/plans/2026-05-11-sub-project-0-project-infrastructure.md` — 58 tasks / 8 phases. **Complete** (PRs #1–#14 minus probe #12).
- `docs/superpowers/plans/2026-05-10-sub-project-1-foundation.md` — 60 tasks. **Complete** (Phase A amended for 2-Supabase / 2-Netlify reality).
- `docs/superpowers/plans/2026-05-10-sub-project-2-admin-core.md` — 37 tasks. **Complete**.
- `docs/superpowers/plans/2026-05-10-sub-project-3-question-engine.md` — 38 tasks. **Complete**.
- `docs/superpowers/plans/2026-05-10-sub-project-4-assessment-forms.md` — 31 tasks. **Complete**.
- `docs/superpowers/plans/2026-05-10-sub-project-5-employer-shell.md` — 38 tasks. **Complete**.
- `docs/superpowers/plans/2026-05-10-sub-project-6-polish-launch.md` — 52 tasks. **Remaining**. Phase H "Netlify cutover" tasks are obsolete (two-Netlify-project structure removes the publish-dir flip); left in place with obsolescence notes.
- `docs/methodology.md` — 414-line replayable brainstorm → spec → plan → execute playbook (prescriptive/generalized).
- `docs/case-study-2026-08-02.md` — the post-mortem case study: what actually happened across the full arc (prototype 2026-04-16 → hardening 2026-06-19), with figures verified from git. Descriptive counterpart to `methodology.md`. Key claim: prototype-to-production fidelity came from promoting the prototype to *literal specification* (SP7's spec §1), not from care — SP1–SP5 treated it as reference and the 2026-05-18 audit found P0 gaps on nearly every route despite green tests. §9.1 is the recommended reorder (primitives before features); §8 lists what the process missed. A standalone brand-styled `docs/case-study-2026-08-02.html` carries the same content.
- `docs/dev-portal/` — management dashboard at `https://rapideo.github.io/impact-internship-portal/dev-portal/`. 7 tabs; Status tab driven by `docs/dev-portal/data/status.json` (update on milestone-close PRs).

**Prototype-era reference (still authoritative for prototype behavior; superseded by the production spec for production scope):**
- `PRD.md` — original requirements (v0 PRD predates the 3-tier user model).
- `IMPACT Internship Assessment Portal - App Outline.md` — field-level screen/view inventory.
- `Self-Assessment Questions (Placeholder).md` — placeholder rubric content (final content pending from program staff).
- `Sample Assessments for IMPACT Internship.docx` — source rubrics from the program lead.
- `docs/BACKLOG.md` — prototype-era defer log (historical; cross-reference production spec).
- `docs/plans/2026-04-16-prototype-enhancements.md` — completed.
- Three iter spec+plan pairs under `docs/superpowers/{specs,plans}/2026-05-06-*` — chooser, unified intern record, iter2 feedback + exit survey (all completed).

Check these before inventing answers about scope, field names, or flows. Production scope: design spec + 6 plans. Prototype behavior: App Outline + PRD (with the 3-tier scope expansion noted above).

## Prototype

The selected design lives at `Prototypes/PROTOTYPE/` — static HTML/CSS with a shared `app.js` module. No build tooling, no framework, no test runner. To view: `start "" "Prototypes/PROTOTYPE/index.html"` (git bash on Windows). The full 34-page inventory and `app.js` API reference live in the prototype repo (`Rapideo/impact-prototype`); the copy here is a reference-only seed. `Prototypes/archive/` (and `archive.zip`) hold discarded earlier design variations — don't modify archived files.

**Key prototype facts that the production rebuild inherits:**
- Admin navbar order: Home · Interns · Assessments · Reports · Settings · admin-chip.
- 5 question-bearing forms (Personal Goals, Midpoint Reflection, Participant Feedback, Exit Employer Survey, Competency Rubric) share one data-driven render/collect/validate/restore pipeline.
- Competency Rubric stitches 3 tiers at assessment time: program-wide Core + per-cohort + per-intern.
- Intern identity in the prototype is `localStorage`-backed at the chooser; the production app uses an HMAC-signed cookie (see SP4 below).

## Brand & style system

**Equus branding since 2026-09-14** (client punchlist 9.11 items 7–8): the brand mark is the **Equus Workforce Solutions** logo and the accent is **Equus green**; the navy/cyan/canvas set from the IMPACT era stays. All tokens are CSS custom properties in `:root` (`app/styles/tokens.css`).

| Token | Hex | Role |
|---|---|---|
| `--navy` | `#153A98` | Primary brand / buttons / headings |
| `--navy-deep` | `#051028` | Dark-surface backgrounds (nav, footer) |
| `--cyan` | `#00A6F6` | Secondary / info / focus accent |
| `--green` | `#73AF2F` | Accent — active-state rail, CTA pill, KPI/pill/toast modifiers (sampled from the Equus logo; **replaced `--gold #FFD71F`**) |
| `--green-soft` / `--green-deep` | `#E3EFD5` / `#5C9424` | Light fill tint / dark gradient stop |
| `--success` | `#1B8F4A` | Pass/positive semantics — a *different* green, kept distinct on purpose |
| `--canvas` | `#EFF1F5` | Body canvas (cool off-white) |

**Logo files** (`public/`): `logo.svg` is the Equus mark as delivered — a *light-surface* logo (near-black wordmark, Equus-blue `#004081` tagline) that vanishes on the dark nav. `logo-reverse.svg` is our derived reversed variant (wordmark + tagline white, green "E" kept) and is what all six nav/footer components render, at 44px inside the 64px `.wordmark` band (the mark is ~4.4:1). `tests/components/BrandMark.test.tsx` pins the `src`/`alt` across all six. If Equus supplies an official reversed logo, drop it in as `logo-reverse.svg`. There is no `--gold` token or `--gold` class modifier any more — `.kpi-card--green`, `.pill--green`, `.toast--green`, `.modal__card--green`, `.barlist__fill--green`, and the `'green'` variant/tone/kind unions.

Fonts (Google Fonts): Display **Archivo Black** · Body **IBM Plex Sans** · Micro/tabular **IBM Plex Mono**.

The frozen prototype (`Prototypes/PROTOTYPE/`) and its `logo.png` keep the IMPACT gold branding — it is a reference-only seed, not restyled. The Quick Start guide (`docs/quick-start-guide/`) carries its own token copy and screenshots and needs a regeneration pass to pick up the rebrand.

## Product rules to know (from PRD)

- **Two roles in the PRD** (Admin + Intern); the production rebuild expands to **three** (Admin, Employer, anonymous Intern).
- **Intern identity** is a portal-assigned **Intern ID** (`IMP-YY-NNNN`, e.g. `IMP-26-0417`). The portal stores **no name of any kind** (client decision 2026-09-11; PRs #143/#144/#150). Program staff keep the ID↔person roster offline. Cohort implies employer; the intern chooser asks for employer, cohort and ID.
- **Minimum-PII policy**: the intern record carries the Intern ID, cohort, role, start/end dates and assessment data. No first name, initial, last name, DOB, or zipcode — anywhere, including the create form.
- **Intake**: `intern-record.html` is the canonical creation path. The old Readiness Assessment (`dashboard.html`, `readiness-*.html`) has been removed; intake is captured directly on the Entry Assessment panel.
- **Competency phases**: a global admin-managed list (Settings → Phases). Each cohort selects a subset; the Competency assessment's Phase dropdown filters to the intern's cohort's phases.
- **Intern self-assessments**: each is **one submission per intern, immutable after submit**. Identity is captured upstream once on the chooser, validated, and persisted; form pages bounce to the chooser if missing.
- **Competency rubric**: 3-tier stitched (Core 7 Professional Competencies + per-cohort role-specific + per-intern customization). All authored in Settings → Questions → Competency.
- **Interns** = post-placement outcome tracking (90-day + 180-day employment checkboxes + notes).
- **Out of scope for v1**: Midpoint Performance Review, intern logins, notifications.

## Working conventions

- Update both HTML and `styles.css` when tweaking the prototype. CSS tokens are the primary palette knob; don't hardcode hex inline.
- New screens base on an existing page so navbar, typography, and button treatments stay consistent.
- Navbar/footer span the full viewport (no max-width container); body sections use `.container` (1240px). That asymmetry is intentional.
- Modal markup goes AFTER `</footer>`, BEFORE closing `</body>`. Inline IIFE wiring goes at the very end of the body.
- Demo login: any/no credentials work; Sign In routes to `admin.html` in the prototype.

## Git

Branch `main` (renamed from `master` 2026-05-11). GitHub remote: `https://github.com/Rapideo/impact-internship-portal.git` — public, under the `Rapideo` GitHub user (not an org). Branch protection requires PRs with passing CI; direct pushes rejected.

**Local working path:** `C:\Projects\impact-internship-portal\` (moved out of OneDrive 2026-05-11).

**Repo split (2 repos):**
- **This repo** (`Rapideo/impact-internship-portal`, public) — production rebuild. `Prototypes/PROTOTYPE/` is a reference-only seed.
- **`Rapideo/impact-prototype`** (public) — frozen 34-page prototype, full 177-commit history. Local clone at `C:\Projects\impact-prototype\`. Rare maintenance edits only.

**Netlify (2 projects):**
- **Prototype**: `impact-internship-portal.netlify.app` (`65497097-8b5c-471e-a0c9-dc7ddea0fb2c`). Watches `Rapideo/impact-prototype`, publishes `Prototypes/PROTOTYPE/`. **Live since SP0.**
- **App**: `impact-portal-app.netlify.app` (`6e071577-7adb-4cae-82d6-b2b2b66a47aa`). **Live on impact-prod since 2026-05-26.** GitHub→Netlify **auto-deploy is wired** (`build_settings.installation_id` populated) — **push/merge to `main` auto-deploys to production**; PRs build deploy-previews (impact-dev). Adapter: `@netlify/vite-plugin-react-router` (PR #102). **Staging** = the long-lived `staging` branch, fast-forwarded from `main` by `.github/workflows/sync-staging.yml` and served at **`staging--impact-portal-app.netlify.app`** under the `branch-deploy` context on impact-dev (PR #137; `allowed_branches = [main, staging]`). Use it, not deploy-preview URLs — those are frozen at one PR's code and Netlify **ages them out** (#123/#130/#131 were already 404 by 2026-08-10). `main--impact-portal-app.netlify.app` appears as a production deploy's `deploy_ssl_url` but **502s — don't use it**; `main` is the production branch, so it has no working branch-deploy URL. Env vars are **per-context**: `production` (impact-prod), `deploy-preview` and `branch-deploy` (both impact-dev) carry `DATABASE_URL`/`DATABASE_POOL_URL`/`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`/`SESSION_SECRET`/`APP_URL`. **`APP_URL` is required** — `env.server.ts` is a lazy Proxy that *throws on access* of a missing required var, which 500s the forgot/invite/intern-confirm actions. Netlify-env gotchas: vars flagged **"secret" are masked** in both `env:list` and `env:get` (diagnose connection strings by shape — a real one ends in `/postgres`, not a bare password); `env:pull` has **no `--context` flag** (use `env:list --plain --context <ctx>`); after a Supabase DB-password reset the direct conn updates instantly but the **pooler (Supavisor) lags ~1 min**. **`DATABASE_POOL_URL` must be the session pooler (`:5432`) in every context** — see the Supabase bullet below for the 2026-09-12 transaction-pooler incident. **Migrations/policies/seeds are NOT run by the Netlify build** — apply them manually per environment (`npm run db:migrate` / `db:apply-policies` / `db:seed-prod` / `admin:create`, with the prod env pre-loaded so dotenv's no-override keeps it). CI/CD walkthrough: `docs/cicd-overview.md`.

**Supabase (2 projects):**
- **`impact-dev`** — ref `zdrxxcbhiovoaubkcqfj`, `us-east-2`. Local dev + Netlify previews + branch deploys.
- **`impact-prod`** — ref `ptnhzdkspzquwcxdoqbt`, `us-east-2`. Netlify production context only.
- **CI uses `supabase start`** (local Docker Postgres); no separate cloud test project. The Supabase CLI is **pinned** in `ci.yml` (`supabase/setup-cli` → `version: 2.107.0`, not `latest`): v2.106/v2.107 stopped auto-granting public-table privileges to `anon`/`authenticated`/`service_role` on freshly-migrated tables, which silently turned the RLS suite red on `main` (2026-06-19, PRs #128/#129). Bump the pin deliberately, never back to `latest`.
- **Backups (Supabase Pro).** Daily **physical** backups only — they cannot be downloaded, and there is no on-demand backup (PITR is a paid add-on). To recover data without touching a live project: Database → Backups → **Restore to new project** clones a backup into a fresh project (quoted $0 on Pro; same org/region; roles copy but the DB password does NOT — reset it in the clone; its pooler host may be `aws-0` where ours is `aws-1`; the pooler lags ~1 min after a reset). Then read the clone with postgres-js and lift only the rows you need. Seed-generated rows are distinguishable from human ones by their fixed time-of-day (`03:26:44.74x`). Used 2026-09-13 to recover the July 2026 KP submissions + 10 profiles into impact-dev; delete the clone afterwards. Before assuming anything is lost, check the Backups tab.
- **Supabase MCP** (`.mcp.json`, project root, added 2026-09-11) exposes both databases to Claude Code as `supabase-dev` and `supabase-prod`, so "what's actually in this DB?" is a one-line `execute_sql` instead of a hunt for credentials. **`supabase-prod` is read-only three layers deep** — `&read_only=true` on the URL, which (1) narrows the OAuth grant to `database:read`, (2) removes `apply_migration` from the tool surface, and (3) runs every statement in a read-only transaction (`ERROR 25006` on any write, even `CREATE TEMP TABLE`). Keep it that way: prod *writes* go through the migration scripts, not ad-hoc SQL (see next bullet). `supabase-dev` is writable — ask before any mutation; impact-dev holds the program team's real testing data and has no backups. Auth is OAuth via the browser; changing either URL invalidates its grant and forces a re-auth on next launch.
- **Running scripts against impact-prod** (password reset 2026-09-11 — the previous one existed only as a write-only Netlify secret and nobody could read it). The canonical copy is in Matt's password manager ("Supabase impact-prod — postgres DB password"); the local working copy is **`.env.prod.local`** at the project root (gitignored via `.env.*.local` — never rename it to `.env.prod`, which is NOT ignored). The scripts load `.env.local` via dotenv, which never overrides vars already in the environment, so pre-load the prod file: `set -a; source .env.prod.local; set +a; npm run db:migrate` (git bash; same for `db:apply-policies`, `db:seed-prod`, `admin:create`). `db:seed` and `db:seed:demo` both refuse to run when `DATABASE_URL` contains the prod project ref. Pooler host is **`aws-1-us-east-2`** (not `aws-0`) for both projects. **Both `DATABASE_URL` and `DATABASE_POOL_URL` use the SESSION pooler (`:5432`) — never the transaction pooler (`:6543`) with this app.** Incident 2026-09-12: prod's `DATABASE_POOL_URL` was set to 6543 during the password rotation and every warm Lambda instance that ran a `Promise.all` over `db` (the intern chooser's loader; admin dashboards) hung to Netlify's 26 s limit — postgres-js pipelines concurrent queries onto its single `max: 1` socket and Supavisor transaction mode stalls on pipelined statements (reproduced 10/10 from a workstation; session mode 10/10 clean). `max_pipeline: 0` is NOT a fix — it crashes postgres-js 3.4.9's connection state machine. Both clients also carry `idle_timeout`/`max_lifetime`/`connect_timeout` (#145) for Lambda freezes. Rotating the password again: reset in Supabase → `netlify env:set DATABASE_URL/DATABASE_POOL_URL … --context production --secret --force` → `netlify deploy --prod --trigger` (functions only pick up env changes on deploy) → update the password manager and `.env.prod.local`. Prod is down between the reset and the redeploy (~3 min).

**Dev portal:** `https://rapideo.github.io/impact-internship-portal/dev-portal/` (7 tabs). The bare URL redirects to `/dev-portal/` via `docs/index.html`. Status tab driven by `docs/dev-portal/data/status.json`.

**Conventions in place:**
- **Conventional Commits** enforced via commitlint + Husky `commit-msg`. Subject ≤ 72 chars; body ≤ 100 chars.
- **Branch protection on `main`** — no direct pushes; squash-merge PRs only; required check is the CI workflow.
- **Hook chain**: Husky 9 + commitlint 19 + lint-staged 15. `pre-commit` runs `npx lint-staged`.
- **CI** (`.github/workflows/ci.yml`): runs on PRs to `main` and pushes to `main`. Five jobs — `Sanity checks (stub)` (required), `Lint & Typecheck`, `Vitest (unit)`, `Vitest (integration + RLS) on supabase start`, gated `Playwright`.
- **PR workflow**: branch (`feat/`, `fix/`, `chore/`, `docs/`, `test/`, `refactor/`) → push → `gh pr create` → green CI → **staging verification (see below)** → `gh pr merge --squash --delete-branch`.
- **STAGING BEFORE PRODUCTION — standing rule.** Nothing reaches production until Matt has seen it working on staging. Applies to every change, however small or well-tested; green CI proves the code is correct, not that the change is *right*. **The normal flow cannot do this**: `main` IS Netlify's production branch and `staging` is fast-forwarded *from* `main`, so a plain merge hits prod first. Use the escape hatch — `git push --force origin <branch>:staging` parks the branch on the staging URL (branch-deploy context, impact-dev data) with production untouched; after merging, reset with `git push --force origin main:staging`. If the change needs a migration, apply it to impact-dev first, since staging runs on that database. Merging is a production deploy: get explicit approval every time, never carried over from a previous merge.
- **Secrets**: `.env.local` (gitignored) with impact-dev values for local; Netlify env vars per-deploy-context; GitHub Secrets placeholder-only.

## Production app

The app at `app/` is a React Router v7 server (framework mode, config-based routing) that authenticates against Supabase, scopes data via RLS, and routes admins/employers to their respective shells.

### Stack

RR v7 + TypeScript 5.7 + Vite 6 + Vitest 3 + Playwright + ESLint 9 + Prettier 3 + Supabase Postgres (Auth + RLS) + Drizzle ORM 0.36 + postgres-js + Resend (dead code until SP6) + Netlify.

### Local dev

```bash
npm install
# .env.local already has impact-dev credentials (gitignored)
npm run db:migrate          # apply schema (idempotent)
npm run db:apply-policies   # apply RLS policies (idempotent, DROP IF EXISTS)
npm run db:seed             # SMALL base seed: wipes + reseeds ~6 interns, ZERO submissions
npm run db:seed:demo        # rich ADDITIVE demo data: ~140 interns, ~236 submissions
npm run admin:create -- --email=admin@example.com --password=DevPassword123!
npm run dev                 # http://localhost:5173
```

### Three roles

- **Anonymous intern** — identified by a portal-assigned Intern ID (`IMP-YY-NNNN`) plus the selected cohort; no Supabase Auth account. Lookup helper at `app/lib/identity.server.ts:lookupInternByCode`.
- **Employer** — Supabase Auth, JWT carries `role='employer'` + `employer_id` claims via `public.custom_access_token_hook` (SECURITY DEFINER, registered in `supabase/config.toml`). RLS scopes every employer query to their `employer_id`.
- **Admin** — Supabase Auth, JWT carries `role='admin'`. RLS grants admin full access.

### Working in the app

- **Routes** are listed explicitly in `app/routes.ts` (config-based, NOT file-system routing). Three top-level layouts: `_public.tsx` (login + auth flow), `admin.tsx`, `employer.tsx`.
- **Server-only modules** end with `.server.ts`. Files in `app/lib/*.server.ts` and under `db/` cannot be imported from client components — Vite enforces at build time.
- **Auth** in `app/lib/auth.server.ts`. Use `getAuthContext(request, headers)` in loaders for signature-verified JWT claims via Supabase `getClaims()` — **NOT `getSession()`**, which doesn't verify in cookie-storage mode. The login action re-uses its in-memory client after `signInWithPassword` (the new auth cookies aren't on the request yet).
- **Drizzle schema** at `db/schema.ts`. `npm run db:generate` / `npm run db:migrate`. The initial migration filters out drizzle-kit's `CREATE TABLE auth.users` (Supabase rejects writes to `auth`); FKs to `auth.users` still resolve.
- **RLS policies** live in `db/policies/*.sql` (raw SQL, more readable than Drizzle-generated). Applied via `npm run db:apply-policies`. Every `CREATE POLICY` is preceded by `DROP POLICY IF EXISTS` for idempotency. **`db/policies/0000_grants.sql`** runs first and explicitly grants base table/sequence privileges to `anon`/`authenticated`/`service_role`, so RLS no longer relies on Supabase's *implicit* default-privilege grants (the CLI changed that behavior in v2.106+ — see CI note above). Grants don't bypass RLS — rows are still gated by the policies in `0001`–`0004`; the grants only let a role *attempt* a query. Idempotent on prod/dev (which already carry the implicit grants).
- **Tests**: `npm test` (Vitest unit, 326 today); `npm run test:rls` (RLS integration, requires explicit `BEGIN`/`COMMIT` to make `SET LOCAL ROLE authenticated` take effect against the BYPASSRLS connection); `npm run test:e2e` (Playwright, reads `.env.test`).
- **`supabase/config.toml`** registers the `custom_access_token_hook`; `supabase start` reads it too, so CI mirrors impact-dev.

## SP2 (Admin core) — key carry-over

- **Admin User Management** lives at `/admin/settings/users` (`app/lib/users.server.ts`): create admin/employer accounts (password or invite), change role/employer, reversibly deactivate via Supabase ban, and **delete — deactivate-first** (client punchlist 9.11 #5, decided 2026-09-14): `guardDelete` refuses self and any account not already deactivated, then `deleteAccount` hard-deletes the auth user (`profiles` cascades; `assessment_submissions.submitted_by` → null, rows kept). Account status is derived from `auth.users` fields at read time (no schema change).

## SP4 (Assessment forms) — contracts to preserve

### Intern identity (anonymous flow)

- **Cookie**: `impact_intern_identity` — HMAC-signed via `SESSION_SECRET` (read lazily from `process.env`, intentionally NOT in `env.server.ts`'s eager required list so the CI fake-env block keeps working). Helpers in `app/lib/intern-identity.server.ts`.
- **Revalidation**: `getCurrentInternIdentity(request)` does NOT trust the signature alone. It re-resolves the `(internCode, cohortId)` pair against the live `interns` table on every read, returning `null` if the resolved id no longer matches the cookie's `internId`. Catches soft-deletes and cohort moves without explicit logout. Cookie payload is `{ internId, internCode, cohortId, employerId }`; a validly-signed cookie in the pre-Intern-ID (name-shaped) payload fails the type guard and is treated as absent.
- **Identity gate at `/intern/assessments`**: the confirm action must verify both that the normalised Intern ID resolves in the chosen cohort AND that the cohort belongs to the chosen employer before signing the cookie. The cookie's `employerId` is derived from the verified cohort row — **never trust form-supplied employerId** for the cookie payload.

### Anonymous submission path (do NOT generalize)

Intern submissions to `assessment_submissions` use `dbService` (service-role Drizzle client in `app/lib/db.service.server.ts`) because RLS policies block anon writes. The narrow contract: action handler → revalidate identity via `getCurrentInternIdentity` → `dbService` insert via `insertAnonymousSubmission()`. **`dbService` has exactly two sanctioned anonymous callers: this submission path and the identity throttle (`app/lib/identity-throttle.server.ts`). Never add a third.** Admin writes use the regular `db` client.

Known carry-over **#77**: today both `db` and `dbService` connect via the same `DATABASE_POOL_URL` as the same BYPASSRLS user — the separation is semantic. Future hardening (split `DATABASE_SERVICE_URL` from `DATABASE_POOL_URL`, downgrade pool to real `anon` role) will make it real. `getOneShotSubmission` already uses the service-role client (PR #84).

### One-shot enforcement

Three intern self-assessments are uniquely scoped per `(intern_id, type)` by a partial unique index on `assessment_submissions` (filtered on `deleted_at IS NULL` AND the three one-shot types). Enforced at two layers:

1. **Loader-side guard**: each form route's loader calls `getOneShotSubmission(internId, type)`; if found, `throw redirect('/intern/confirmation?type=…')`.
2. **Action-side race catch**: the action catches `AssessmentAlreadySubmittedError` (translated from PG `23505`) and redirects to `/intern/confirmation?type=…&already=1`.

Adding a new one-shot type requires updating both layers AND the DB partial index together.

### Querystring validation

Admin routes reading `?internId=` validate against `UUID_RE` (exported from `app/lib/validation.ts`) before hitting the DB. Malformed UUIDs return 400 instead of bubbling up as PG `22P02` / unhandled 500. One regex check at the top of each loader/action.

## SP5 (Employer shell) — contracts to preserve

### Employer layout = single source of redirect truth

`app/routes/employer.tsx` is the trust boundary for the entire `/employer/*` subtree. It enforces:

1. Unauthenticated → `/login`.
2. Wrong role (admin) → `/admin`.
3. Authenticated employer with no `employerId` → `/login?error=no-employer` (profiles check constraint should make this unreachable; runtime guard remains as defense in depth).
4. Employer with an `employerId` that doesn't resolve to an `employers` row → `/login?error=employer-missing`.

Child loaders/actions get `auth?.employerId` via `getAuthContext` and use a single thin `if (!auth?.employerId) throw redirect('/login', { headers })` for TypeScript narrowing — **not the redirect ladder**. **Do NOT duplicate the layout's role/employerId enforcement in every child route**; one trust boundary is enough.

### Employer writes go through the authenticated supabase client

Per-table RLS for the employer role:
- `assessment_submissions` — `employer_write_submissions` (INSERT) + `employer_update_submissions` (UPDATE) enforce `type IN ('competency', 'exit-employer-survey')` AND intern-in-employer-scope.
- `employers` — `employer_own_employer` (FOR ALL) restricts to the signed-in user's own employer row.
- `roles` — `employer_own_roles` (FOR ALL) restricts to roles where `employer_id = caller's employerId`.

Routes mutating these tables (competency new/edit, exit-survey, profile, roles CRUD) **must use `createSupabaseServerClient(request, headers)`**, not the service-role `db` client. JS-level `internInEmployerScope()` runs first as defense-in-depth on submission writes.

### Employer-scope helpers (`app/lib/employer-scope.server.ts`)

Read through service-role `db` and return employer-scoped result sets. They do NOT enforce RLS themselves (BYPASSRLS connection skips it); caller passes `employerId` as the trust boundary:

- `kpisForEmployer(employerId)` → `{ activeCohorts, activeInterns, assessmentsNeeded }`.
- `cohortsForEmployer(employerId)`, `internsForEmployer(employerId)` — scoped lists.
- `internInEmployerScope(internId, employerId)` → boolean. **Single INNER JOIN query** (one round-trip), not the two-query version in some plan drafts. Precondition for every read/write of an intern-scoped resource in employer routes.

`assessmentsNeeded` ("interns without a competency submission") is a placeholder rule pending program-staff input. OK for v1.

### Branded auth pages — AuthShell pattern

The five auth routes (`_public.login.tsx`, `_public.auth.forgot.tsx`, `_public.auth.reset.tsx`, `_public.auth.accept.tsx`, `_public.auth.callback.tsx`) wrap content in `<AuthShell>` (`app/components/auth/AuthShell.tsx`) with navy/cyan/green tokens in `app/styles/auth.css`. The callback route's `?next=` is open-redirect-protected with regex `/^\/(?!\/)/.test(rawNext)` — only same-origin paths that don't start with `//`. **Don't loosen without re-reviewing.**

`/auth/reset` calls SP1's `signOut()` after a successful reset (UX defense — invalidates the recovery session so the user logs in fresh with the new password). Keep that behavior.

### Email template builders (plain string, NOT JSX)

`app/emails/_layout.tsx` exports `emailLayout()` and `escapeHtml()`. Each template (`employer-invite.tsx`, `password-reset.tsx`) is a function returning `{ subject, html, text }` via template literals + inline hex colors. **Do not render with React or JSX** — Supabase templates need raw HTML strings, and clients won't render React. Email CSS must be inline (no class selectors).

The Supabase dashboard paste flow is documented in `docs/deployment.md`. Until SP6 wires `RESEND_API_KEY` in prod, `sendEmail` is wrapped in `try/catch` with `console.warn` (non-fatal) — failed sends don't break the invite flow.

### Form component reuse — confirmed contract

- `<CompetencyAssessmentForm>` props: `internId`, `phases`, `questions`, `sectionBoundaries`, `initialAnswers`, `initialPhase`, `errors`, `setLevelError`, `actionPath`, `submitLabel`, `readOnly`, `meta` (`{ internName, cohortName, employerName, roleName, startDate, endDate }`). Mirror `app/routes/admin.assessments.competency.new.tsx` exactly.
- `<AssessmentForm>` (used by exit-survey): `actionPath`, `questions`, `initialAnswers`, `errors`, `setLevelError`, `submitLabel`, `modalTitle`, `modalBody`, `readOnly`. **No separate `<ExitEmployerSurveyForm>`** — that name in plan drafts is fictional.
- **"Submit" is the word** on every assessment form (decided 2026-09-14 after KP testers could not tell Save from Submit): buttons say *Submit Assessment / Submit Changes / Submit Survey*, the competency confirm modal's title is `"${submitLabel}?"` with a *Submit* confirm, and post-submit toasts say "submitted". Only the intern one-shot forms are locked after submit; the modal body on admin/employer forms says they stay editable. Don't reintroduce "Save" on these.
- Both forms submit `answers` as a JSON-stringified blob in formData (+ a separate `phase` field for competency). Actions parse with `JSON.parse(String(formData.get('answers') ?? '{}'))`. **Never** call `serializeAnswers(formData, questions)` — the real signature takes already-parsed answers.

### Toast provider wraps any layout whose children call useToast()

Admin layout does this; employer layout now does too (SP5 Phase L caught a latent crash). If you add a third role/layout, remember.

### CSS class registry (avoid plan-doc traps)

Plan docs frequently reference classes that don't exist. The real registry:

- `.identity-card` (+ `__head`, `__title`, `__sub`, `__meta`, `__link`) — generic content card. **Do NOT use `.card`, `.card__head`, `.card__title`, `.card__list`, `.card__empty`, `.card__meta`** — never defined.
- `.assessments` is the table class used by admin self-assessment lists and employer cohorts/interns lists. **Do NOT use `.data-table`** — non-existent.
- `.btn`, `.btn--primary`, `.btn--outline`, `.btn--sm`, `.btn--danger`, `.btn--ghost-danger` — in admin.css.
- `.field`, `.field__label`, `.field__error`, `.field--error`, `.input` — form primitives.
- `.auth__alert`, `.auth__alert--danger`, `.auth__alert--success` — added in SP5 Phase C.
- `.employer-chip` (+ `__name`, `__email`, `__logout`) — top-right nav chip.
- `.kpi-card` (+ `__label`, `__value`, `__sub`, `__delta`) — admin.css defines first four; `__sub` added in Phase F for employer-dashboard reuse. Don't redefine in employer-shell.css; reuse admin.css.
- `.intern-code` (+ `--lg`), `.issued-callout` (+ `__label`, `__row`, `__body`) — added 2026-09-11 (Intern ID).

### SP5 follow-ups (carry into SP6)

- **Task 37 deferred** — admin invite → accept E2E (with a NODE_ENV-gated `/dev/invite-link` route) was skipped pending security review. SP6 should either build it with belt-and-suspenders gating (`if (process.env.NODE_ENV === 'production') return 404` PLUS a separate `vite.config` env check) or replace with a direct Supabase admin API call from the test (no public route at all).
- **Playwright still skipping in CI** — every PR shows `Playwright    skipping`. Specs pass locally but no CI signal. SP6 either un-gates the job or documents permanent local-only. The 10 specs today (`auth`, `admin-crud`, `admin-competency`, `admin-exit-employer-survey`, `admin-question-editor`, `intern-self-submit`, `employer-login`, `employer-competency`) are the floor for launch.

## Internship Participation Factors (2026-09-11) — contracts to preserve

The Entry-Assessment "Barriers" list was renamed and its values replaced, after the client
raised PII concerns: the old twelve named personal circumstances (`Housing instability`,
`Mental health`, `Substance use recovery`, `Justice-system involvement`). The replacements
describe **effects on participation**, never the underlying cause.

- **Tables**: `participation_factors` (was `barriers`) and `intern_participation_factors`
  (was `intern_entry_barriers`, column `participation_factor_id`, was `barrier_id`).
  Route is `/admin/settings/participation-factors`. PR #139 (merged) was a **pure rename** —
  values unchanged — so its green CI proved the rename alone. PR #140 brings the eight values.
- **`participation_factors.description`** — nullable. Shown as helper text beneath each label
  on the entry-assessment checklist and editable in Settings. Two of the eight values have none.
- **`participation_factors.code`** — nullable, **invisible and non-editable in the UI**. Seeded
  as `'none'` on the "No participation factors identified" row only. The Reports distribution
  query keys on it, NOT on the label, because admins can rename any row in Settings and a
  label-matched rule would silently stop working the first time someone did.
- **Reports counting rule**: an intern counts toward the `code = 'none'` factor **only if they
  have no other factor rows**. Data entry is deliberately unconstrained — admins may tick
  contradictory combinations — so without this the bars over-sum and the "no factors" number
  means something untrue.
- **"Other participation-related factor" takes NO free text**, deliberately. The client asked to
  shrink the PII surface; a prose field there would work against the request.
- **Out of scope, flagged to the client**: `db/seed-data/question-sets.ts` still says "barriers"
  in the Participant Feedback (`pf-barriers`, `pf-barriers-detail`) and Exit Employer Survey
  (`ees-barriers`) question content. Those are user-facing survey copy, not this reference list —
  and they contain the free-text fields this change was meant to avoid.

### Migration gotchas learned here

- `drizzle-kit generate` **guesses drop-and-recreate non-interactively** and will emit
  `DROP TABLE`. Table/column renames must be generated interactively by a human. `--custom` is
  not a workaround: it writes a journal entry but copies the PREVIOUS snapshot.
- A drizzle snapshot records the **destination** schema, not the route taken — so a correct
  snapshot plus hand-written SQL is consistent. Prove it by re-running `generate`: it must say
  "No schema changes, nothing to migrate".
- Postgres keeps **old constraint names** through a table rename, and **policies travel with the
  renamed table**. So `DROP POLICY IF EXISTS x ON public.<oldname>` ERRORS afterwards —
  `IF EXISTS` guards the policy, not the table. Drop stale policies inside the migration, on the
  NEW table names, before `db:apply-policies` runs.

## Intern ID (2026-09-11) — contracts to preserve

Interns are identified by a portal-assigned **Intern ID**, `IMP-YY-NNNN` (e.g. `IMP-26-0417`).
Spec: `docs/superpowers/specs/2026-09-11-intern-id-identity-design.md`. Delivered in three PRs:
A (issue IDs, names kept), B (anonymous identity switches to the ID + throttle), C (names removed).

- **Format/normalize/year live in `app/lib/intern-code.ts`** (pure, client-safe). `IMP` is a code
  constant, not a setting — interns hold printed cards. `YY` = Start Date's year if given, else
  "now" in `PROGRAM_TIME_ZONE` (exported from `format.ts`; Lambda is UTC). `NNNN` is random
  0001–9999 via `crypto.randomInt`, never sequential.
- **`createInternWithCode` (`intern-code.server.ts`) is the only *app-code* writer of
  `intern_code`** (the seeds and the RLS fixture supply fixed or deterministic codes by design).
  It redraws on PG `23505` *on the `intern_code` index only* (checks `constraint_name`), up to 10
  times, then throws `InternCodeExhaustedError`. No route, action or script updates the code
  after insert — immutability is the contract.
- **`interns_intern_code_unique` is a plain unique index, not partial on `deleted_at`.** A
  soft-deleted intern's code stays reserved forever. Do not "fix" this to allow reuse.
- **Migration 0005 is hand-written** (add nullable → PL/pgSQL backfill → SET NOT NULL → index)
  with a drizzle snapshot recording the destination. `drizzle-kit generate --name x` was used only
  for the snapshot/journal; its SQL was replaced.
- **Admin create redirects to `/admin/interns/:id?issued=1`**; the detail page renders
  `<InternIdIssuedCallout>` off that flag (query-string driven, no state). The callout copy is
  fixed by the spec.
- **`<InternCode>` (`.intern-code`, `.intern-code--lg`) is the one way to render an ID.**
- **Chooser order is Employer → Cohort → Intern ID**; the action runs throttle → normalise →
  cohort∈employer → lookup → sign, and returns ONE message for unknown-ID and wrong-cohort.
- **Throttle**: ≥10 failures/IP/15 min (`identity_attempts`, service-role only, RLS on with no
  policies). Fails open. The action reserves the failure row before the lookup and releases it on
  success (reserve-then-count) so a parallel burst cannot exceed the threshold; do not reorder the
  action. `x-nf-client-connection-ip` beats `x-forwarded-for`. The e2e throttle
  spec pins `x-forwarded-for: 203.0.113.7` so it never locks out `intern-self-submit`; a local
  rerun inside 15 minutes is throttled by design — clear that IP's rows or wait.
- **Legacy cookies** (name-shaped payload) fail the type guard and fall back to the chooser.
- **PR C removed the name columns (migration 0007).** `first_initial`/`last_name` exist only in migration history (0000–0006 SQL and snapshots). Do not reintroduce a name field under any label — the client asked for none, and the roster lives offline.
- **Every intern rendering is `<InternCode>`.** The interns list, the Assessments-hub picker and the cohort-members table have the ID as their only identity column (`strong`); the old `.col-name--quiet` helper is gone. `.name-initial` avatars remain for employer/role names only.
- **Seeds**: `SEED_INTERNS` carry only `internCode` (fixed values, see `db/seed-data/interns.ts`); the demo seed derives codes deterministically per index.
- **PR C rollout window.** Until migration 0007 is applied, the new code's `createInternWithCode` inserts without the (still `NOT NULL`) name columns → PG `23502` → create-intern 500s; every read works. So: apply 0007 to impact-dev *before* parking C on staging, and on prod run `db:migrate` the moment the production deploy is `ready` (spec §9: merge → migrate). Zero prod interns made the window acceptable.

## Local development cheat-sheet (for SP6+)

- `npm run dev` — Vite + RR v7 dev server.
- `npm run db:seed` — **small base seed** (~6 interns, **zero** assessment submissions). TRUNCATEs. Since 2026-09-11 it snapshots **all** `profiles` rows and restores them (pure `planProfileRestore()` in `db/profile-restore-plan.ts`); before that it restored only `admin@example.com` + `employer1@example.com` and silently locked out every other account.
- `npm run db:seed:demo` — **the rich dataset** (~140 interns, ~236 submissions). Additive, idempotent, no TRUNCATE. This is what produces realistic Reports data — `db:seed` alone will leave the app looking empty.
- `npm test -- --run` — vitest unit + dom projects (342 tests today). **`tests/setup.ts` loads `.env.local`, so on a dev machine the unit project can reach impact-dev.** Live-DB tests that WRITE must live under `tests/rls/` (the guarded project); `tests/guards/unit-project-no-raw-sql.test.ts` fails the unit run if any unit test opens a raw `postgres(` client or carries `DELETE FROM` / `TRUNCATE` / `INSERT INTO`. Incident 2026-09-14: `tests/lib/assessment-submissions.server.test.ts` had been erasing one seed intern's submissions on impact-dev on every `npm test` since 2026-05-13 — that was the whole "Whitaker data-loss" report.
- `npm run test:rls` — RLS integration; requires `supabase start`. **Guarded since 2026-09-11**: `tests/rls/setup.rls.ts` refuses to run unless `DATABASE_URL` — and `DATABASE_POOL_URL` / `DATABASE_SERVICE_URL` when set — resolve to a local host (`localhost`/`127.0.0.1`/`::1`/`host.docker.internal`). Every `tests/rls/*.ts` loads `.env.local` — i.e. **impact-dev cloud credentials** — and these specs DELETE rows; without `supabase start` the suite once connected straight to impact-dev and destroyed every `assessment_submissions` row (free tier, no backups). Never disable the guard.
- `npm run test:e2e` — Playwright.
- `npm run lint && npm run typecheck` — green on main today.
- `npm run build` — green on main (PR #79, ~6s).
