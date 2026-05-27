# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

The **IMPACT Internship Assessment Portal** is a web app for an Indiana-based internship program. The clickable 34-page prototype is **locked** in a separate sibling repo (`Rapideo/impact-prototype`). The production rebuild's **Sub-projects 0 through 5 plus Sub-project 7 (frontend rebuild) are complete as of 2026-05-19**: React Router v7 scaffold, Drizzle schema for all 15 public tables, 32+ RLS policies + JWT custom-access-token hook, dev seed, full admin CRUD, question-engine with 6 renderer types + 3-tier competency stitching, all 5 assessment forms (intern anonymous self-submit + admin-completed Competency + Exit Employer Survey), employer shell with branded auth + dashboard + scoped flows, pixel-for-pixel frontend rebuild against the prototype. Test pyramid: 204 unit + 19 RLS + 22 Playwright e2e specs (Playwright CI un-gated in SP6 Phase F, PR #105). **Production went live on impact-prod 2026-05-26** — impact-prod bootstrapped (schema + RLS + JWT hook + reference-data seed + admin account), GitHub→Netlify auto-deploy wired (push/merge to `main` auto-deploys to prod), DB password rotated. **Remaining launch items are tracked in `docs/launch-todo.md`** (custom SMTP, branded email templates, Reports content, Sentry DSN, admin invite→accept E2E, `#77` DB-role hardening); the full pipeline is explained in `docs/cicd-overview.md`. Visual-fidelity source-of-truth: `docs/superpowers/visual-fidelity-audit-2026-05-14.md` (closed) + `docs/superpowers/visual-fidelity-screenshots/2026-05-19-final/` (75 side-by-side captures).

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
- `docs/methodology.md` — 414-line replayable brainstorm → spec → plan → execute playbook.
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

Palette **sampled directly from pixels in the IMPACT logo**. All tokens are CSS custom properties in `:root`.

| Token | Hex | Role |
|---|---|---|
| `--navy` | `#153A98` | Primary brand / "IMPACT" wordmark |
| `--navy-deep` | `#051028` | Dark-surface backgrounds (nav, footer) |
| `--cyan` | `#00A6F6` | Secondary / info / focus accent |
| `--gold` | `#FFD71F` | Highlight / CTA / active-state |
| `--canvas` | `#EFF1F5` | Body canvas (cool off-white) |

Navbar/footer use the dark surface so the logo's glow bleed blends. **Don't place the logo PNG on the light canvas** — the baked-in glow reads as a dirty halo. For a brand mark on a light surface, use a typographic wordmark (Archivo Black, `--navy`).

Fonts (Google Fonts): Display **Archivo Black** · Body **IBM Plex Sans** · Micro/tabular **IBM Plex Mono**.

`Prototypes/PROTOTYPE/logo.png` is tight-cropped from `References/IMPACT LOGO.png`. The source has soft glow baked in; prefer a vector/SVG if one is provided later.

## Product rules to know (from PRD)

- **Two roles in the PRD** (Admin + Intern); the production rebuild expands to **three** (Admin, Employer, anonymous Intern).
- **Unique intern identifier** across all records: First Initial + Last Name + Employer + Cohort. Cohort implies employer for storage; the self-id flow asks for both for human disambiguation (employer filters cohort).
- **Minimum-PII policy**: only First Initial + Last Name + Cohort persist on the intern record. No first name, DOB, or zipcode. Admin's create form accepts a "First Name" textbox for usability but saves only the initial.
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
- **App**: `impact-portal-app.netlify.app` (`6e071577-7adb-4cae-82d6-b2b2b66a47aa`). **Live on impact-prod since 2026-05-26.** GitHub→Netlify **auto-deploy is wired** (`build_settings.installation_id` populated) — **push/merge to `main` auto-deploys to production**; PRs build deploy-previews (impact-dev). Adapter: `@netlify/vite-plugin-react-router` (PR #102). Env vars are **per-context**: both `production` (impact-prod) and `deploy-preview` (impact-dev) carry `DATABASE_URL`/`DATABASE_POOL_URL`/`SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`/`SESSION_SECRET`/`APP_URL`. **`APP_URL` is required** — `env.server.ts` is a lazy Proxy that *throws on access* of a missing required var, which 500s the forgot/invite/intern-confirm actions. Netlify-env gotchas: vars flagged **"secret" are masked** in both `env:list` and `env:get` (diagnose connection strings by shape — a real one ends in `/postgres`, not a bare password); `env:pull` has **no `--context` flag** (use `env:list --plain --context <ctx>`); after a Supabase DB-password reset the direct conn updates instantly but the **pooler (Supavisor) lags ~1 min**. **Migrations/policies/seeds are NOT run by the Netlify build** — apply them manually per environment (`npm run db:migrate` / `db:apply-policies` / `db:seed-prod` / `admin:create`, with the prod env pre-loaded so dotenv's no-override keeps it). CI/CD walkthrough: `docs/cicd-overview.md`.

**Supabase (2 projects):**
- **`impact-dev`** — ref `zdrxxcbhiovoaubkcqfj`, `us-east-2`. Local dev + Netlify previews + branch deploys.
- **`impact-prod`** — ref `ptnhzdkspzquwcxdoqbt`, `us-east-2`. Netlify production context only.
- **CI uses `supabase start`** (local Docker Postgres); no separate cloud test project.

**Dev portal:** `https://rapideo.github.io/impact-internship-portal/dev-portal/` (7 tabs). The bare URL redirects to `/dev-portal/` via `docs/index.html`. Status tab driven by `docs/dev-portal/data/status.json`.

**Conventions in place:**
- **Conventional Commits** enforced via commitlint + Husky `commit-msg`. Subject ≤ 72 chars; body ≤ 100 chars.
- **Branch protection on `main`** — no direct pushes; squash-merge PRs only; required check is the CI workflow.
- **Hook chain**: Husky 9 + commitlint 19 + lint-staged 15. `pre-commit` runs `npx lint-staged`.
- **CI** (`.github/workflows/ci.yml`): runs on PRs to `main` and pushes to `main`. Five jobs — `Sanity checks (stub)` (required), `Lint & Typecheck`, `Vitest (unit)`, `Vitest (integration + RLS) on supabase start`, gated `Playwright`.
- **PR workflow**: branch (`feat/`, `fix/`, `chore/`, `docs/`, `test/`, `refactor/`) → push → `gh pr create` → green CI → `gh pr merge --squash --delete-branch`.
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
npm run db:seed             # wipe + re-seed (refuses to run against impact-prod ref)
npm run admin:create -- --email=admin@example.com --password=DevPassword123!
npm run dev                 # http://localhost:5173
```

### Three roles

- **Anonymous intern** — composite-key identity (first initial + last name + cohort), no Supabase Auth account. Lookup helper at `app/lib/identity.server.ts:lookupInternByIdentity`.
- **Employer** — Supabase Auth, JWT carries `role='employer'` + `employer_id` claims via `public.custom_access_token_hook` (SECURITY DEFINER, registered in `supabase/config.toml`). RLS scopes every employer query to their `employer_id`.
- **Admin** — Supabase Auth, JWT carries `role='admin'`. RLS grants admin full access.

### Working in the app

- **Routes** are listed explicitly in `app/routes.ts` (config-based, NOT file-system routing). Three top-level layouts: `_public.tsx` (login + auth flow), `admin.tsx`, `employer.tsx`.
- **Server-only modules** end with `.server.ts`. Files in `app/lib/*.server.ts` and under `db/` cannot be imported from client components — Vite enforces at build time.
- **Auth** in `app/lib/auth.server.ts`. Use `getAuthContext(request, headers)` in loaders for signature-verified JWT claims via Supabase `getClaims()` — **NOT `getSession()`**, which doesn't verify in cookie-storage mode. The login action re-uses its in-memory client after `signInWithPassword` (the new auth cookies aren't on the request yet).
- **Drizzle schema** at `db/schema.ts`. `npm run db:generate` / `npm run db:migrate`. The initial migration filters out drizzle-kit's `CREATE TABLE auth.users` (Supabase rejects writes to `auth`); FKs to `auth.users` still resolve.
- **RLS policies** live in `db/policies/*.sql` (raw SQL, more readable than Drizzle-generated). Applied via `npm run db:apply-policies`. Every `CREATE POLICY` is preceded by `DROP POLICY IF EXISTS` for idempotency.
- **Tests**: `npm test` (Vitest unit, 196 today); `npm run test:rls` (RLS integration, requires explicit `BEGIN`/`COMMIT` to make `SET LOCAL ROLE authenticated` take effect against the BYPASSRLS connection); `npm run test:e2e` (Playwright, reads `.env.test`).
- **`supabase/config.toml`** registers the `custom_access_token_hook`; `supabase start` reads it too, so CI mirrors impact-dev.

## SP2 (Admin core) — key carry-over

- `app/routes/admin.interns.new.tsx` first-name hint says "Only the first initial is saved" but the validator (`requireSingleCharUpper`) rejects multi-character input. Either fix the hint to "Enter the intern's first initial (one letter)." or have the action accept full names and slice to `firstName.trim()[0]`. Test currently feeds a single letter.

## SP4 (Assessment forms) — contracts to preserve

### Intern identity (anonymous flow)

- **Cookie**: `impact_intern_identity` — HMAC-signed via `SESSION_SECRET` (read lazily from `process.env`, intentionally NOT in `env.server.ts`'s eager required list so the CI fake-env block keeps working). Helpers in `app/lib/intern-identity.server.ts`.
- **Revalidation**: `getCurrentInternIdentity(request)` does NOT trust the signature alone. It re-resolves the `(firstInitial, lastName, cohortId)` triple against the live `interns` table on every read, returning `null` if the resolved id no longer matches the cookie's `internId`. Catches soft-deletes, cohort moves, last-name corrections without explicit logout.
- **Identity gate at `/intern/assessments`**: the confirm action must verify both the intern exists AND the chosen cohort belongs to the chosen employer before signing the cookie. The cookie's `employerId` is derived from the verified cohort row — **never trust form-supplied employerId** for the cookie payload.

### Anonymous submission path (do NOT generalize)

Intern submissions to `assessment_submissions` use `dbService` (service-role Drizzle client in `app/lib/db.service.server.ts`) because RLS policies block anon writes. The narrow contract: action handler → revalidate identity via `getCurrentInternIdentity` → `dbService` insert via `insertAnonymousSubmission()`. **Never call `dbService` outside this path.** Admin writes use the regular `db` client.

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

The five auth routes (`_public.login.tsx`, `_public.auth.forgot.tsx`, `_public.auth.reset.tsx`, `_public.auth.accept.tsx`, `_public.auth.callback.tsx`) wrap content in `<AuthShell>` (`app/components/auth/AuthShell.tsx`) with navy/cyan/gold tokens in `app/styles/auth.css`. The callback route's `?next=` is open-redirect-protected with regex `/^\/(?!\/)/.test(rawNext)` — only same-origin paths that don't start with `//`. **Don't loosen without re-reviewing.**

`/auth/reset` calls SP1's `signOut()` after a successful reset (UX defense — invalidates the recovery session so the user logs in fresh with the new password). Keep that behavior.

### Email template builders (plain string, NOT JSX)

`app/emails/_layout.tsx` exports `emailLayout()` and `escapeHtml()`. Each template (`employer-invite.tsx`, `password-reset.tsx`) is a function returning `{ subject, html, text }` via template literals + inline hex colors. **Do not render with React or JSX** — Supabase templates need raw HTML strings, and clients won't render React. Email CSS must be inline (no class selectors).

The Supabase dashboard paste flow is documented in `docs/deployment.md`. Until SP6 wires `RESEND_API_KEY` in prod, `sendEmail` is wrapped in `try/catch` with `console.warn` (non-fatal) — failed sends don't break the invite flow.

### Form component reuse — confirmed contract

- `<CompetencyAssessmentForm>` props: `internId`, `phases`, `questions`, `sectionBoundaries`, `initialAnswers`, `initialPhase`, `errors`, `setLevelError`, `actionPath`, `submitLabel`, `readOnly`, `meta` (`{ internName, cohortName, employerName, roleName, startDate, endDate }`). Mirror `app/routes/admin.assessments.competency.new.tsx` exactly.
- `<AssessmentForm>` (used by exit-survey): `actionPath`, `questions`, `initialAnswers`, `errors`, `setLevelError`, `submitLabel`, `modalTitle`, `modalBody`, `readOnly`. **No separate `<ExitEmployerSurveyForm>`** — that name in plan drafts is fictional.
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

### SP5 follow-ups (carry into SP6)

- **Task 37 deferred** — admin invite → accept E2E (with a NODE_ENV-gated `/dev/invite-link` route) was skipped pending security review. SP6 should either build it with belt-and-suspenders gating (`if (process.env.NODE_ENV === 'production') return 404` PLUS a separate `vite.config` env check) or replace with a direct Supabase admin API call from the test (no public route at all).
- **Playwright still skipping in CI** — every PR shows `Playwright    skipping`. Specs pass locally but no CI signal. SP6 either un-gates the job or documents permanent local-only. The 10 specs today (`auth`, `admin-crud`, `admin-competency`, `admin-exit-employer-survey`, `admin-question-editor`, `intern-self-submit`, `employer-login`, `employer-competency`) are the floor for launch.

## Local development cheat-sheet (for SP6+)

- `npm run dev` — Vite + RR v7 dev server.
- `npm run db:seed` — refreshes DB (also re-upserts admin + employer1 profile rows after TRUNCATE CASCADE).
- `npm test -- --run` — vitest unit suite (196 tests today).
- `npm run test:rls` — RLS integration; requires `supabase start`.
- `npm run test:e2e` — Playwright.
- `npm run lint && npm run typecheck` — green on main today.
- `npm run build` — green on main (PR #79, ~6s).
