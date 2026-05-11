# Development Workflow & Project Infrastructure — Design Spec

**Document status:** Draft v1
**Date:** 2026-05-11
**Author:** Matt + collaborator
**Related documents:**
- `docs/superpowers/specs/2026-05-10-production-rebuild-design.md` — architectural design for the production rebuild
- `docs/superpowers/plans/2026-05-10-sub-project-{1-6}-*.md` — six implementation plans (256 tasks total)
- `CLAUDE.md` — project memory

---

## 1. Overview

The production rebuild planning is complete — one architectural design spec plus six sub-project implementation plans, totalling 256 tasks. Before any of those tasks begin, the project needs proper development infrastructure: a real Git remote (GitHub) instead of OneDrive sync, a defined branching and PR workflow, automated CI on every change, deploy previews, secrets handling, and a management-facing communication artifact that explains all of the above.

This spec defines that workflow and packages the setup work as a new **Sub-project 0: Project Infrastructure**, executed *before* Sub-project 1 (Foundation). It also defines the design of the management-facing web page that documents the planning state and the workflow itself.

**What this spec is:** the agreed development workflow (Git/GitHub mechanics, CI/CD, deployment, secrets, conventions) plus the scope and design of the management-facing communication artifact.

**What this spec is not:** the implementation plan. After approval, the writing-plans skill turns this into `docs/superpowers/plans/2026-05-11-sub-project-0-project-infrastructure.md`.

### 1.1 Why now

Three reasons drove this conversation:

1. **The OneDrive risk is real.** The repo currently lives inside OneDrive, which actively syncs files mid-write. Git operations are corruption-prone in that environment (.git/index locks, partial writes, refs roundtripped). One bad sync collision could destroy commit history. We've been lucky.
2. **No remote means no real collaboration story.** Even as a solo developer, having no GitHub remote means no backup, no PR review, no CI, no deploy previews, and no audit trail for management. Production work should not start until this is fixed.
3. **Management needs visibility.** The work being kicked off is multi-week. Stakeholders need a single, refreshable artifact that shows what's planned, how it's phased, what the timeline looks like, and where the project currently stands.

---

## 2. Locked decisions

These are the decisions reached during the workflow brainstorming on 2026-05-11. They are the baseline; the implementation plan operationalises them.

### 2.1 GitHub repo identity

| Field | Value |
|---|---|
| Owner | `Rapideo` GitHub user account (existing personal account, hosts other Rapideo private repos like `kp-web`, `kp-website`) |
| Repo name | `impact-internship-portal` |
| Visibility | **Private** |
| Default branch | `main` |
| Git protocol | **HTTPS** (uses existing `gh` OAuth token) |
| License | Proprietary (no LICENSE file committed) |

The repo is the single source of truth from sub-project 0 onward.

**Amendment 2026-05-11:** Pre-execution prereq check revealed that `Rapideo` is a personal GitHub user account, not an organization, and no org exists. Decision: use the user account as-is rather than creating a new org. Existing Rapideo repos (`kp-web`, `kp-website`) already follow this pattern. Re-evaluate if a multi-dev team materializes.

**Amendment 2026-05-11 (two-repo split):** During Phase B execution, Matt decided to split the work into two GitHub repos rather than the consolidated single-repo plan in §2.3 of the production rebuild design spec:

| Repo | Purpose | History |
|---|---|---|
| `Rapideo/impact-prototype` | Frozen archive of the 34-page locked prototype | Full 177-commit history of prototype + planning iterations |
| `Rapideo/impact-internship-portal` (this spec's target) | Production rebuild | Fresh initial commit (`792d239`) seeded with planning docs + `Prototypes/PROTOTYPE/` reference + `netlify.toml`; sub-projects 1-6 build on top |

Planning docs (specs, plans, CLAUDE.md, BACKLOG.md, PRD.md, App Outline, etc.) are authoritative in the production app repo only going forward. The prototype repo's copies are frozen at the rename point. Sub-projects 1-6 commit only to the production app repo; the prototype repo receives only rare maintenance commits if any. Netlify-GitHub integration (Phase G) connects to the production app repo, not the prototype repo.

### 2.2 Local working location

The production app repo lives locally at `C:\Projects\impact-internship-portal\`. The prototype repo lives at `C:\Projects\impact-prototype\`. Both are outside OneDrive. The OneDrive copy of the original combined repo is preserved in-place as `_archived_<date>/` for a two-week safety net before deletion.

(Earlier draft of this section specified a single `C:\Projects\impact-portal\` location, before the two-repo split was decided.)

### 2.3 Branching strategy: GitHub Flow

One long-lived branch (`main`). All work goes on short-lived feature branches off `main`, opens a PR, runs CI, gets reviewed, then merges.

**Branch naming convention:**
- `feat/<topic>` — new features (e.g., `feat/admin-employer-crud`)
- `fix/<topic>` — bug fixes
- `chore/<topic>` — tooling, deps, config, repo housekeeping
- `docs/<topic>` — documentation-only
- `test/<topic>` — test-only changes
- `refactor/<topic>` — internal refactors with no behaviour change

All lowercase, hyphen-separated, no slashes beyond the type prefix.

### 2.4 PR scope: one PR per phase

Each sub-project plan has 6-12 phases (Phase A, B, C, …). One PR per phase. With 6 sub-projects averaging ~8 phases each, that's ~40-60 reviewable PRs over the life of the project. Each PR contains 4-10 tasks and averages 15-30 minutes of review time.

This sits between two extremes:
- *Per-task PRs* (256 PRs) — too granular; high overhead, lots of merge conflicts.
- *Per-sub-project PRs* (6 PRs) — unreviewable; defeats the purpose of code review.

The phase boundary aligns with how the plans are already structured, so PR scope is decided by the plan, not by judgment in the moment.

### 2.5 Commit message format: Conventional Commits

All commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) spec, enforced via `commitlint` running as a `commit-msg` Husky hook.

**Allowed types:** `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `perf`, `build`, `ci`, `revert`.

**Format:** `<type>(<scope>): <subject>`

Examples:
- `feat(auth): add Supabase email/password login`
- `fix(question-engine): preserve answers when set is re-stitched`
- `chore(deps): bump @netlify/functions to 2.6.0`
- `docs(claude-md): note 3-tier competency stitching`
- `test(rls): assert cross-tenant insert denied`

Subject line ≤ 72 characters. Body wraps at 100. Trailers (`Co-Authored-By`, `BREAKING CHANGE`) follow the spec.

### 2.6 Code review: AI + self-review

Every PR runs through:
1. `/review` (Claude reviews the full diff)
2. `/security-review` *if* the PR touches: auth, RLS policies, DB schema migrations, `app/lib/**.server.ts`, secrets handling, or any endpoint that accepts untrusted input
3. Matt's own eyeballs on the diff before clicking merge

The AI review is non-blocking but its output is read and acted on. Self-review is the final gate. No human teammate review is required for sub-projects 1-6; we revisit if scope or staffing changes.

### 2.7 CI/CD pipeline: full suite on every PR

A single `.github/workflows/ci.yml` workflow runs on every PR and every push to `main`:

| Stage | Tool | Time budget | Parallelizable |
|---|---|---|---|
| Lint | ESLint 9 (flat config) | 30s | yes |
| Format check | Prettier 3 (--check) | 15s | yes |
| Typecheck | `tsc --noEmit` | 60s | yes |
| Unit tests | Vitest | 45s | yes |
| Integration / RLS tests | Vitest + Supabase test project | 90s | partial |
| E2E tests | Playwright 1.49 (headless Chromium) | 180s | yes |
| Accessibility | axe-core (inside Playwright) | included | n/a |
| Bundle size check | `rollup-plugin-visualizer` + custom script | 30s | yes |
| Production build | RR v7 build + Netlify adapter | 90s | yes |

Total wall-clock target: ~5-8 minutes with parallel jobs.

CI gates merge — a PR cannot merge if any stage fails. Cache key includes lockfile hash to make node_modules install ~10s on warm runs.

### 2.8 Deployment: Netlify-GitHub integration

Netlify watches each GitHub repo natively (no GitHub Actions deploy step).

**Amendment 2026-05-11 (two Netlify projects):** Originally drafted around a single Netlify project that would later cut over from publishing the prototype to publishing the production app. During Sub-project 0 wrap-up, Matt decided the prototype should keep its own Netlify project and URL independently of the app's deployment lifecycle. Two Netlify projects now exist:

| Netlify project | URL | Project ID | Watches | Publishes |
|---|---|---|---|---|
| **Prototype** | `https://impact-internship-portal.netlify.app` | `65497097-8b5c-471e-a0c9-dc7ddea0fb2c` | `Rapideo/impact-prototype` (now public) | `Prototypes/PROTOTYPE/` on every push to that repo's `main` |
| **App** | `https://impact-portal-app.netlify.app` | `6e071577-7adb-4cae-82d6-b2b2b66a47aa` | `Rapideo/impact-internship-portal` (wired in Sub-project 1 Phase 1) | `build/client/` once the build pipeline lands |

- **Prototype Netlify project** — serves the frozen 34-page prototype indefinitely. Continues to receive deploys whenever the prototype repo's `main` advances (rare, mostly maintenance only).
- **App Netlify project** — already exists with per-context env vars pre-seeded (production context = prod Supabase values, deploy-preview + branch-deploy contexts = dev Supabase values), but is **not yet connected to a GitHub repo**. Sub-project 1 Phase 1 wires it to `Rapideo/impact-internship-portal`. Once wired: every PR gets a deploy preview at `https://deploy-preview-<PR>--impact-portal-app.netlify.app`, and every push to `main` deploys to the app's production URL.
- **No cutover step needed.** Because the prototype lives in its own Netlify project, there is no `netlify.toml` `publish`-dir flip and no DNS swap. The previously planned Sub-project 6 cutover phase is obsolete (see that plan's amendment).

The `Rapideo/impact-prototype` repo was switched from private to public during Sub-project 0 wrap-up so Netlify could deploy it without requiring per-repo GitHub App permission setup.

### 2.9 Branch protection on `main`

**Amendment 2026-05-11 (visibility shift):** Classic branch protection and the newer Rulesets API both require **GitHub Pro** on private repos for personal accounts (free-tier returns HTTP 403 on PUT `/branches/main/protection`). To enable protection without a paid subscription, the production app repo `Rapideo/impact-internship-portal` was changed from **private** to **public** during Phase E execution. The prototype repo `Rapideo/impact-prototype` remains private. Only placeholder values are stored in `.env.example`; real secrets live exclusively in GitHub Secrets and Netlify environment variables, neither of which are public.

**Amendment 2026-05-11 (status check name):** The required status check is registered as `"Sanity checks (stub)"` (the job's display name from `.github/workflows/ci.yml`), not `"ci / Sanity checks (stub)"` as initially specified in the plan. GitHub's check-runs API uses the job display name only — the workflow name (`ci`) appears in the Actions UI but is not part of the check identifier.

Configured in GitHub repo settings:
- Require pull request before merge
- Require status checks to pass before merging (the CI workflow is the only required check)
- Require linear history (forces squash merge — keeps `main` clean and bisectable)
- No direct pushes to `main` from anyone, including admins (admin bypass disabled by default; can be temporarily re-enabled in genuine emergencies, but should remain off)
- Require conversation resolution before merging
- Do not require signed commits (unnecessary friction for solo work; revisit if other devs join)

### 2.10 Pre-commit hooks: Husky + lint-staged + commitlint

Configured in the repo as part of sub-project 0:

- `husky` v9 — installs Git hooks
- `lint-staged` — runs tools only on staged files
- `commitlint` + `@commitlint/config-conventional` — validates commit message format

Hooks:
- **`pre-commit`**: `lint-staged` runs Prettier `--write` and ESLint `--fix` on staged `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, `.md` files. Auto-formats and auto-fixes; only blocks the commit if ESLint reports an unfixable error.
- **`commit-msg`**: `commitlint` validates the commit message against Conventional Commits. Blocks the commit on format violations with a clear error message.
- **No `pre-push`, no `pre-commit` test runs.** Tests are slow; they belong in CI.

Note: Husky and commitlint are installed as part of sub-project 0. ESLint/Prettier are installed by sub-project 1's Foundation phases — until then, the `lint-staged` config exists but the linters are not yet wired. This is intentional and not a blocker: sub-project 0's PRs are documentation, config, and scaffolding only.

### 2.11 Secrets management

| Location | Used for | Source |
|---|---|---|
| `.env.local` (gitignored) | Local development | Hand-rolled per-developer; copied from `.env.example` |
| `.env.example` (committed) | Documentation of required vars | Committed to repo as the canonical reference |
| GitHub Secrets | CI workflow (test DB, test Supabase keys) | Configured in repo settings → Secrets → Actions |
| Netlify environment variables | Production runtime | Configured in Netlify UI; never logged or committed |

**Secrets in play (all defined in `.env.example` with placeholder values):**

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Drizzle / postgres-js connection |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public, client-readable |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; bypasses RLS — never expose to the browser |
| `SESSION_SECRET` | HMAC signing for intern identity cookie (sub-project 4) |
| `RESEND_API_KEY` | Transactional email (sub-project 6) |
| `SENTRY_DSN` | Error tracking endpoint |
| `SENTRY_AUTH_TOKEN` | Source-map upload during build |
| `NETLIFY_AUTH_TOKEN` | If CI ever needs to talk to Netlify (not yet) |

**Guardrails:**
- `.env.local`, `.env`, `.env.*.local` are in `.gitignore` from sub-project 0 day one.
- A pre-commit secret-scanning hook (`gitleaks` or similar) is **deferred to sub-project 6**. Until then, the discipline relies on `.gitignore` plus a one-time review of staged files.
- The Supabase service role key never appears in any file outside `app/lib/db.service.server.ts` (the `.server.ts` suffix is a React Router convention that prevents bundling into client code).

**Amendment 2026-05-11 (two-environment secret split):** Originally drafted as a three-environment split (`impact-dev`, `impact-test`, `impact-prod`). **Revised the same day during Sub-project 0 wrap-up:** the test environment is no longer a cloud Supabase project — CI uses `supabase start` (the Supabase CLI's local Docker stack) for integration + RLS tests. See the production rebuild design spec §2.4 for rationale. The four environment-sensitive Supabase secrets and `SESSION_SECRET` now have **two values each**, deployed as follows:

| Secret | `.env.local` (dev) | GitHub Secrets (placeholder only) | Netlify prod context | Netlify deploy-preview + branch-deploy contexts |
|---|---|---|---|---|
| `DATABASE_URL` | impact-dev | placeholder | impact-prod | impact-dev |
| `SUPABASE_URL` | impact-dev | placeholder | impact-prod | impact-dev |
| `SUPABASE_ANON_KEY` | impact-dev | placeholder | impact-prod | impact-dev |
| `SUPABASE_SERVICE_ROLE_KEY` | impact-dev | placeholder | impact-prod | impact-dev |
| `SESSION_SECRET` | unique-dev | placeholder | unique-prod | unique-dev |
| `RESEND_API_KEY` | shared | shared | shared | shared |
| `SENTRY_DSN` | env-tagged or per-env | env-tagged or per-env | env-tagged or per-env | env-tagged or per-env |

**GitHub Secrets are placeholders.** CI integration tests run against a local Postgres+Auth stack spun up via `supabase start` at the top of the job and torn down via `supabase stop` at the end. The Supabase CLI emits its own ephemeral `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for the running stack; tests pick those up directly. GitHub Secrets therefore don't need real Supabase credentials — they exist only as inert fallbacks so the workflow doesn't fail an env-var presence check.

Netlify supports per-deploy-context env var values natively (Site settings → Environment variables → "Different value for each deploy context"). The app Netlify project (`impact-portal-app`) already has per-context values seeded: PR deploy previews and branch deploys point at `impact-dev`, production points at `impact-prod`. This eliminates the risk of a preview-deploy mutation hitting prod data.

The current `.env.example` (sub-project 0) carries placeholders only. **Sub-project 1 expands** `.env.example` with comments noting which project each variable should reference. The Netlify per-context values were seeded during Sub-project 0 kickoff prep; Sub-project 1 verifies rather than seeds them.

### 2.12 Issue tracking and milestones

GitHub Issues replaces `docs/BACKLOG.md` for any new work that arises during or after sub-project 1.

- **Six milestones**, one per production sub-project: `Sub-project 1: Foundation`, … `Sub-project 6: Polish & Launch`. Plus `Sub-project 0: Project Infrastructure` for the current effort.
- **Labels:** `bug`, `enhancement`, `blocked`, `client-feedback`, `tech-debt`, `discussion`, plus a per-sub-project label (`sub-project-1` … `sub-project-6`) for filtering across milestones.
- **No issue templates for sub-project 0** (low volume; one-off setup work). Issue templates for `bug` and `enhancement` are added in sub-project 1 once the project is in flight.
- `docs/BACKLOG.md` stays in the repo as a historical record of prototype-era defer items but is not edited going forward. The CLAUDE.md note already flags it as historical.

### 2.13 Documentation cadence

- `CLAUDE.md` is updated **as part of PRs that change architecture, stack, or conventions** — not every PR. If a PR adds a new dependency, restructures the routing tree, or changes a convention, the PR includes a `CLAUDE.md` edit. Otherwise it doesn't.
- The seven production rebuild docs (1 spec + 6 plans) are **frozen**. They describe the agreed plan; the source of truth for current state is the code and Git history. Deviations from the plans are documented in the PR description, not by editing the plans.
- The management-facing web page's "Status" tab is driven by a committed `dev-portal/data/status.json` file (see §5.4). That JSON file is updated as part of milestone-close PRs — not per PR. The page itself does not get re-edited per milestone; it re-reads the JSON on every load.

---

## 3. Sub-project 0: Project Infrastructure

The setup work in §2 gets executed as a new sub-project that precedes sub-project 1 (Foundation). It is the only sub-project whose work is mostly *not* code; it's repo configuration, GitHub integration, and a static communication artifact.

### 3.1 Goals

By the end of sub-project 0:

1. The repo lives in a Rapideo GitHub organization, private, with full commit history preserved from the OneDrive copy.
2. Branch protection, CI, and Netlify deploy previews are configured and verified by a trivial test PR.
3. Husky, commitlint, and lint-staged are installed and stub-configured.
4. The management-facing web page is live (either as a self-contained HTML deliverable or, ideally, on GitHub Pages at `https://<rapideo-org>.github.io/impact-internship-portal/`).
5. Matt is comfortable opening a branch, pushing it, opening a PR, watching CI run, reading a Claude review, and merging via squash.

### 3.2 Phasing (provisional — finalised in the implementation plan)

The implementation plan will flesh these out, but the natural phase boundaries are:

| Phase | Scope | PR count |
|---|---|---|
| A. Repo migration | Clone OneDrive copy → new location, verify integrity, push to GitHub | 1 |
| B. GitHub org + repo creation | Create org if missing, create repo, configure default branch | 1 |
| C. `.github/` scaffolding | PR template, CODEOWNERS, Dependabot config, basic issue templates | 1 |
| D. CI workflow stub | `.github/workflows/ci.yml` with placeholder steps that pass (real steps fill in during sub-project 1) | 1 |
| E. Branch protection + GitHub Secrets | Configure rules in GitHub UI; verify with a deliberate failing PR | 1 |
| F. Husky + commitlint + lint-staged | Install, configure, verify with a deliberate bad-format commit | 1 |
| G. Netlify-GitHub integration | Connect repo to existing Netlify project, configure deploy previews, set env vars | 1 |
| H. Management web page | The static HTML deliverable described in §5 | 2-3 (drafted, refined) |

Total: ~9-10 PRs across sub-project 0. Estimated effort: 8-14 hours.

### 3.3 Dependencies into sub-project 1

Sub-project 1 (Foundation) currently assumes the repo exists and CI runs. Once sub-project 0 lands:

- Sub-project 1 Phase 1 ("repo scaffold") **does not** need to set up CI from scratch; instead it expands the existing stub workflow with real tools (Vitest, Playwright, ESLint, Prettier) as those tools are installed.
- Sub-project 1's first PR will be the first real test of the CI pipeline.

No re-planning of sub-project 1 is required; the plan's first phase notes simply get cross-referenced against the now-existing stub workflow. The writing-plans skill flags any actual conflicts when sub-project 0's plan is written.

---

## 4. Repo migration safety procedure

The OneDrive-to-new-location move is the single highest-risk step. The procedure:

1. **Verify clean state in OneDrive copy.** Run `git status` (clean) and `git log --oneline | wc -l` (current commit count = `N`); record `git rev-parse HEAD` as the head SHA.
2. **Clone via Git, not file copy.** From a PowerShell prompt: `git clone "C:\Users\matts\OneDrive - Koehler Partners\Projects\IMPACT\Internship Assessment\IMPACT Intretnship Assessment Portal" C:\Projects\impact-portal`. Git natively walks the object database and writes a fresh `.git`, sidestepping any in-flight OneDrive locks.
3. **Verify new copy.** From new location: `git log --oneline | wc -l` matches `N`, `git rev-parse HEAD` matches the recorded SHA, and `git status` is clean. Spot-check three known files for content equality.
4. **Add GitHub remote in the new copy:** `git remote add origin https://github.com/Rapideo/impact-internship-portal.git`. HTTPS uses the existing `gh` OAuth token via git-credential-manager — no SSH key setup required. (Earlier draft of this doc specified SSH; amended 2026-05-11 because the user's machine is configured for HTTPS.)
5. **Push:** `git push -u origin master` (current branch is `master` per CLAUDE.md; renamed to `main` immediately after push via `git branch -m master main` + `git push -u origin main` + GitHub UI default-branch swap + `git push origin --delete master`).
6. **Verify on GitHub:** commit count and head SHA visible in the GitHub UI match the recorded values.
7. **Archive the OneDrive copy in-place:** rename the OneDrive folder to `IMPACT Intretnship Assessment Portal _archived_2026-05-11`. Do *not* delete; the rename alone is enough to prevent any tooling (e.g., editor recent-files lists, terminal history) from re-opening it. Two-week soak before deletion.
8. **Update the user's mental model and tooling:** new working directory, new CLAUDE.md path, update any IDE / terminal shortcuts.

This procedure is in the implementation plan with explicit verification commands at each step.

---

## 5. Management-facing web page

### 5.1 Audience and goal

- **Audience:** Matt's management (Rapideo leadership) plus likely IMPACT program staff if Matt chooses to share with the client.
- **Reading mode:** Click-through on a laptop or tablet; not phone-first. Stakeholders read, scan, and refresh; they do not interact with the prototype itself from this page.
- **Goal:** answer in <5 minutes the questions: *What are we building? How is it planned? When can we expect to test things? How is the work happening? Where are we right now?*

### 5.2 Format

Single self-contained HTML page in `docs/dev-portal/index.html` with sibling `styles.css`, `app.js`, and a `screens/` folder of inline-able images (re-uses the existing `docs/client-handout/screens/` set where applicable).

Two delivery modes, both worked toward in the implementation plan:
- **Mode A (always works):** Email or share the HTML file (or a zip of the folder) directly. Anyone can open `index.html` locally.
- **Mode B (preferred):** Published via **GitHub Pages** from the repo's `docs/` folder. Gives a stable shareable URL: `https://<rapideo-org>.github.io/impact-internship-portal/dev-portal/`. Requires the repo to be configured for GitHub Pages, which is one step in sub-project 0 Phase H.

The page **inherits the prototype's design tokens** (navy/cyan/gold palette, Archivo Black + IBM Plex Sans, the `.container` rhythm). This keeps it visually consistent with the application itself and reduces design effort.

### 5.3 Information architecture

Tabbed single-page layout with six tabs across the top. State is preserved in `?tab=<slug>` so individual tabs are shareable links.

| Tab | Slug | Purpose |
|---|---|---|
| Overview | `overview` | What is this project? Who's it for? At-a-glance status panel. |
| Phasing & Timeline | `phasing` | Six sub-projects + sub-project 0, what each delivers, dependencies, rough order-of-magnitude effort |
| Tech Stack | `stack` | The chosen technologies and *why* each was picked (with explicit Supabase coverage) |
| Supabase Deep-Dive | `supabase` | Dedicated tab explaining what Supabase is, what we use it for (Postgres + Auth + RLS), and the security model |
| Workflow & SDLC | `workflow` | Everything in §2 of this spec, told as a narrative: branching, PR mechanics, CI, deploy previews, secrets |
| Status | `status` | Live(ish) view of sub-project progress: which sub-projects are done / in flight / not started. Drives confidence with management. |

### 5.4 Per-tab content notes

**Overview tab.** Short paragraph framing. Three callout cards: *Production rebuild planned* (with the 256-task figure), *Prototype locked* (with a link to the prototype), *Pre-development infrastructure in flight* (the current sub-project 0 work). One screenshot of the prototype landing page as a visual anchor.

**Phasing & Timeline tab.** A 7-row table: sub-project 0 + sub-projects 1-6. Columns: number, name, scope summary (one sentence), task count, what gets demo-able at the end, dependencies on prior sub-projects. Below the table, a Gantt-style horizontal bar chart (CSS-only, no JS library) showing the order. No firm calendar dates — instead, sequential "Sprint 1, Sprint 2, …" labels, since we have not committed to a calendar timeline.

**Tech Stack tab.** A 12-row table: each chosen technology, role in the system, one-sentence rationale, link to the official docs. Below it, an architecture diagram (CSS or static SVG) showing browser → RR v7 server runtime → Supabase / Resend / Sentry.

**Supabase Deep-Dive tab.** Three sections:
1. *What it is* — one paragraph. "Hosted Postgres + Auth + Storage."
2. *What we use* — Postgres (the database), Auth (admin and employer login), RLS (database-enforced permission rules). Explicitly call out what we don't use yet: Storage, Edge Functions, Realtime.
3. *Why this matters for security* — RLS means an app-code bug cannot leak one employer's data to another. The database itself refuses the query. This is the key reason Supabase was chosen.

**Workflow & SDLC tab.** A narrative walk-through:
1. *How code reaches production* — branch → PR → CI → review → merge → Netlify deploy. Diagram.
2. *Quality gates* — CI table from §2.7, slightly simplified.
3. *Deploy previews* — explained with a screenshot/mockup of a PR with a preview URL.
4. *Branch protection* — what cannot happen on `main`.
5. *Secrets and security* — a short explanation framed for a non-technical reader: secret names, where they live, why they're never in the repo.

**Status tab.** Driven by data; not hand-edited. Three options for the data source, in order of preference:
1. **GitHub Milestones API (preferred).** A small client-side script fetches the seven milestones and shows open/closed issue counts as progress bars. Requires no auth for a public repo or a public Pages site reading a public-readable JSON via a tiny middleman; since the repo is private, the practical implementation is:
2. **Static JSON, regenerated on milestone close.** A `dev-portal/data/status.json` file committed to the repo, updated by a small script when a milestone closes. The page reads it client-side. Simple, robust, no auth.
3. **Manual update.** Edit the HTML directly. Fallback only.

Implementation chooses option 2 — pragmatic, no auth required, refreshes the page on every commit.

### 5.5 What the page is *not*

- It is not the user-facing app. The prototype walkthrough in `docs/client-handout/IMPACT_Prototype_Walkthrough.docx` already exists for product-of-the-app communication.
- It does not need to be interactive. Static HTML with CSS-only animations is sufficient.
- It is not a marketing site. It is a project communication artifact.

---

## 6. Implementation order

Sub-project 0 runs **before** sub-project 1, with a clean dependency hand-off:

```
                           ┌──────────────────────────────────────┐
                           │ Sub-project 0: Project Infrastructure │
                           │  (this spec → its plan → execution)   │
                           └──────────────────┬───────────────────┘
                                              │
                                              ▼
                           ┌──────────────────────────────────────┐
                           │ Sub-project 1: Foundation             │
                           │  (existing plan, unchanged)           │
                           └──────────────────┬───────────────────┘
                                              │
                                              ▼
                                  …sub-projects 2 → 6
```

The sub-project 1 plan is **not re-written** — its Phase 1 will simply expand the stub CI workflow rather than create one from scratch.

---

## 7. Open questions

These do not block writing the implementation plan but should be answered during execution.

1. **Does the Rapideo GitHub organization already exist?** If not, it needs to be created (one-time setup; Matt's call on naming). If it exists, Matt needs admin rights to create the repo and configure org settings.
2. **GitHub Pages source folder.** Plan is to publish from the repo's `docs/` folder with the management page at `docs/dev-portal/`. Sub-project 0 Phase H configures this. The only reason to revisit is if Pages can't be enabled on a private repo at the current GitHub plan tier — in which case we fall back to Mode A (zipped HTML delivery) until the plan is upgraded.
3. **Are there Rapideo branding requirements** for the management page (logo placement, footer disclaimer)? The page currently inherits the IMPACT prototype's brand; if Rapideo has separate requirements, they are layered in. Defaults to IMPACT brand only.
4. **Long-term maintenance ownership.** Who has admin rights to the repo six months after launch? Matt today; later, possibly an IMPACT operations contact or a Rapideo successor. Decided post-launch.

---

## 8. Non-goals for this spec

- **No CI/CD infrastructure beyond GitHub Actions + Netlify.** No Jenkins, no CircleCI, no self-hosted runners.
- **No staging environment yet.** Netlify deploy previews serve as the de facto staging for now. A formal staging URL is deferred to post-launch if it becomes necessary.
- **No automated release notes / changelog.** Conventional Commits make this trivial to add later (e.g., `release-please`), but it's not in scope.
- **No automated dependency updates *yet*.** Dependabot is configured to *open PRs* in sub-project 0, but the merge cadence is manual and decided per PR.
- **No formal code-owner enforcement.** CODEOWNERS file exists for clarity (Matt owns everything) but is not enforced via branch protection until a second contributor is added.
- **No GitHub Pages custom domain.** The default `github.io` URL is enough; a custom subdomain (e.g., `impact.rapideo.com`) is deferred.

---

## 9. Definition of done for sub-project 0

Sub-project 0 is complete when all of the following are true:

- Repo lives in the Rapideo GitHub org, private, default branch `main`, with full commit history preserved.
- OneDrive copy is renamed to `_archived_2026-05-11` and not actively used.
- Branch protection rules on `main` are configured per §2.9 and verified (a direct push attempt is rejected).
- A test PR has run the stub CI workflow end-to-end and merged successfully via squash.
- Husky, commitlint, lint-staged are installed; a deliberate bad-format commit is rejected at the `commit-msg` hook.
- Netlify is connected to the GitHub repo. A PR has produced a deploy-preview URL that loads the current prototype.
- All required GitHub Secrets and Netlify environment variables are populated with placeholder or real values (placeholders for things sub-project 1 will configure properly).
- The management-facing web page is deployed to GitHub Pages and accessible at its URL.
- The page's six tabs all render and link to the correct content; the status tab shows sub-project 0 as in-flight or complete.
- `CLAUDE.md` is updated to reflect the new repo location, the GitHub URL, and the existence of sub-project 0.

---

## 10. Estimated effort

Sub-project 0 is small relative to the production sub-projects. Rough estimate: **8-14 hours of focused work**, plausibly fits in 2-3 sessions.

- Phase A-G (infrastructure): ~4-7 hours total. Most of the time is one-step-at-a-time verification (GitHub UI clicking, watching CI run for the first time, etc.), not coding.
- Phase H (management page): ~4-7 hours. Most of the time is content writing for the six tabs; layout reuses the prototype's design tokens.

The production rebuild remains an 8-14 week estimate as documented in the production rebuild design spec.
