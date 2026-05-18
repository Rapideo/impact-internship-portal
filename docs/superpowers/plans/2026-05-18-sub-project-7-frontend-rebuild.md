# Sub-Project 7: Frontend Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **The Fidelity Mandate (spec §1) is non-negotiable: every PR must include side-by-side screenshot pairs and pass its review gate.**

**Goal:** Rebuild the entire frontend of the production app to match the prototype pixel-for-pixel. Port `Prototypes/PROTOTYPE/styles.css` verbatim. Translate each prototype HTML page into a React component that emits matching markup. Preserve all loaders, actions, server modules, RLS, auth, and routing untouched. Ship behind 8 mandatory review gates (G1–G8).

**Architecture:** UI-only rebuild. Data layer, auth, routing config, server logic, schema, and migrations are not modified. Touch surface is `app/components/`, `app/styles/`, `app/routes/*.tsx` (default-export bodies only), and `app/root.tsx` (font links). New `app/lib/utils.ts` for pure helpers ported from prototype `app.js`.

**Tech Stack:** Unchanged — TypeScript 5.7, React Router v7 (framework mode), Vite 6, Vitest 3, Playwright 1.49, ESLint 9, Prettier 3. **No new dependencies.** No CSS-in-JS, no Tailwind, no design-system framework. Plain CSS, ported verbatim from the prototype.

**Spec:** `docs/superpowers/specs/2026-05-18-frontend-rebuild-design.md`. **Read it before starting any task.** §1 (Fidelity Mandate), §6a (Review gates), §8 (Resolved decisions) are required reading per phase.

**Supersedes:** SP6 Phase A (Tasks 1–6) in `docs/superpowers/plans/2026-05-14-sub-project-6-polish-launch.md`. SP6 Phases B–J are queued to run after SP7 closes.

**Working directory:** `C:\Projects\impact-internship-portal\`.

---

## What's on `main` at the start of SP7

Verified 2026-05-18 against commit `6fbcbc1` (post-#88 merge).

| Concern | Status |
|---|---|
| Build (`npm run build`) | Green |
| Typecheck | Green |
| Vitest (unit) | 201/201 passing |
| Vitest (RLS integration) | 19 cases passing under `supabase start` |
| Playwright | 10 specs exist, pass locally, CI job `skipping` (unchanged from SP6 start) |
| Routes shipped | All routes from SP1–5 are wired and functional; visual fidelity is the gap |
| Visual fidelity audit | `docs/superpowers/visual-fidelity-audit-2026-05-14.md` is the per-route delta inventory (informational input) |
| Visual screenshot infra | `scripts/visual-audit-screenshots.ts` exists (pass 1 — index routes + all prototype HTMLs) |

## SP6 carry-overs at start of SP7

| ID | What | Owner phase (post-SP7) |
|---|---|---|
| #77 hardening | Supabase `app_pool` anon-role provision + env flip (dashboard work) | SP6 Phase J |
| SP5 Task 37 | Admin invite → accept E2E | SP6 Phase F |
| Playwright CI un-gate | The `Playwright` CI job is `skipping` | SP6 Phase F |

SP7 does NOT close any of these — it only rebuilds the visible surface.

---

## File Structure

Files this plan creates or modifies. Files marked `(modify)` already exist.

**Phase A — Foundation:**
- `app/styles/tokens.css` (modify — replace with verbatim port of prototype's `:root` block + helpers like `--container 1240px`)
- `app/styles/global.css` (modify — replace base + utility rules with prototype's; include `@media print` block)
- `app/root.tsx` (modify — add Google Fonts links for Archivo Black, IBM Plex Sans 400/500/600/700 Latin subset, IBM Plex Mono 400/500)
- `app/lib/utils.ts` — new (`formatPhone`, `formatCompletionDate` ported from prototype `app.js`)
- `app/public/logo.png` (modify if byte-mismatched — replace with prototype's copy)

**Phase B — Shell + presentation primitives:**
- `app/components/nav/PublicNav.tsx` — new
- `app/components/nav/PublicFooter.tsx` — new
- `app/components/nav/AdminNav.tsx` — new (or modify if exists; rewrite)
- `app/components/nav/AdminFooter.tsx` — new
- `app/components/nav/EmployerNav.tsx` — new (cyan-accent chip variant)
- `app/components/nav/EmployerFooter.tsx` — new
- `app/components/auth/AuthShell.tsx` (modify — keep prop API, rewrite markup to exact prototype `login.html` two-column layout)
- `app/components/PageHead.tsx` (modify — rewrite markup, support `title: ReactNode` for multi-line headlines)
- `app/components/ActionBar.tsx` (modify — make sticky-bottom default; mono status caption + button slot)
- `app/components/MetaStrip.tsx` (modify — rewrite markup; support 5–8 cells with `.mono` per-cell flag)
- `app/components/IdentityCard.tsx` — new (extracted from per-route inline usage)
- `app/components/RubricPanel.tsx` — new (or modify if exists)
- `app/components/DetailHeader.tsx` — new (`.detail-header` strip with title + micro-label)
- `app/components/RubricSectionHead.tsx` — new (`.rubric-section-head` for nested section dividers)
- `app/components/modal/ConfirmModal.tsx` (modify — rewrite to prototype's `#updateModal` / `#deleteModal` markup pattern)
- `app/components/toast/ToastProvider.tsx` (modify — rewrite to prototype's `.toast` styling and dismiss timing)
- `app/components/tables/TableFilter.tsx` (modify — `.filters` block above table, `.table-meta` count strip, separate sections per prototype)
- `app/components/tables/EmptyRow.tsx` (modify — `.empty-cell` per prototype)
- `app/components/tables/NameInitial.tsx` — new (`.col-name + .name-initial` chip)
- `app/components/KpiCard.tsx` — new (with `--cyan`, `--success`, default variants; `__delta` mono caption)
- `app/components/QuickLinks.tsx` — new (`.quick-link` with `.quick-link__arrow`)
- `app/components/RecentActivity.tsx` — new (`.activity-list` with mono timestamps)
- `app/components/HeroSection.tsx` — new (`.hero` with `.hero__corner` gold glyph + `.accent-underline`)
- `app/components/PillarsSection.tsx` — new (3-card numbered pillars with `.pillar__num` mono labels)
- `app/components/ConfirmReceipt.tsx` — new (`.confirm` shell with `.confirm__badge` SVG + `.confirm__receipt` + `.meta-strip` + `.confirm__note`)
- `app/components/AssessmentCard.tsx` — new (for admin/assessments hub — `.assessment-card` with `__stage` + `__meta` + display title)
- `app/components/PickerList.tsx` — new (`.picker-list` table for intern picker modals)
- `app/routes/dev.primitives.tsx` — new (NODE_ENV-gated demo of every shell + presentation primitive)

**Phase C — Form primitives:**
- `app/components/forms/AssessmentForm.tsx` (modify — rewrite markup, support `sectionBreaks` prop, use sticky `<ActionBar>`)
- `app/components/forms/CompetencyAssessmentForm.tsx` (modify — rewrite markup, render 3-tier section headers via `<RubricSectionHead>`)
- `app/components/forms/QuestionSetEditor.tsx` (modify — rewrite to use `.qs-editor-card` markup with accordion)
- `app/components/forms/InlineEditableList.tsx` (modify — rewrite to `.settings-list__row` with up/down handles)
- `app/routes/dev.primitives.tsx` (modify — extend demo with form primitives)

**Phase D — Public + intern routes:**
- `app/routes/_public.tsx` (modify — add `<PublicNav>` + `<PublicFooter>` wrapping the Outlet)
- `app/routes/_public._index.tsx` (modify — full rewrite using `<HeroSection>` + `<PillarsSection>` per prototype `index.html`)
- `app/routes/_public.login.tsx` (modify — wrap in `<AuthShell>` with 2-column intro + form-card per prototype `login.html`)
- `app/routes/_public.auth.forgot.tsx` (modify — verify AuthShell match against prototype style of login.html)
- `app/routes/_public.auth.reset.tsx` (modify — pattern match auth.forgot)
- `app/routes/_public.auth.accept.tsx` (modify — pattern match auth.forgot)
- `app/routes/_public.intern.tsx` (modify — replace ad-hoc nav with `<PublicNav>` + back-link variant; add `<PublicFooter>`)
- `app/routes/_public.intern.assessments.tsx` (modify — full rewrite to identity-gate `<IdentityCard>` + 3-card `<AssessmentCard>` grid with status pills)
- `app/routes/_public.intern.personal-goals.tsx` (modify — rewrite to use `<AssessmentForm>` with section break between Q4 and Q5; 2-line headline)
- `app/routes/_public.intern.midpoint-reflection.tsx` (modify — 2-line headline, same form pattern)
- `app/routes/_public.intern.participant-feedback.tsx` (modify — 2-line headline, mixed-question rendering)
- `app/routes/_public.intern.confirmation.tsx` (modify — rewrite with `<ConfirmReceipt>` shell + verbatim prototype copy)
- `app/routes/$.tsx` (modify — wrap 404 in public shell + `<ConfirmReceipt variant="error">` with X-glyph)
- `app/styles/auth.css` (modify — port prototype's `.login__*` + `.auth__*` rules)
- `app/styles/global.css` (modify — add `.hero`, `.pillar`, `.confirm`, `.action-bar`, `.wordmark` rules from prototype)

**Phase E — Admin shell + Settings:**
- `app/routes/admin.tsx` (modify — replace shell with `<AdminNav>` + `<AdminFooter>`; drop wrapping container; let children own `<section><div className="container">`)
- `app/routes/admin._index.tsx` (modify — full rewrite per prototype `admin.html`: personalized greeting, KPI grid with variants, `<QuickLinks>`, `<RecentActivity>`)
- `app/routes/admin.settings._index.tsx` (modify — rewrite Settings rail per prototype)
- `app/routes/admin.settings.employers._index.tsx` (modify)
- `app/routes/admin.settings.employers.$employerId._index.tsx` (modify)
- `app/routes/admin.settings.employers.$employerId.edit.tsx` (modify)
- `app/routes/admin.settings.employers.new.tsx` (modify)
- `app/routes/admin.settings.employers.$employerId.account.tsx` (modify — keep SP5 EmployerAccountCard; align card framing)
- `app/routes/admin.settings.employers.$employerId.cohorts.new.tsx` (modify)
- `app/routes/admin.settings.employers.$employerId.roles.new.tsx` (modify)
- `app/routes/admin.settings.cohorts.$cohortId._index.tsx` (modify — rewrite per prototype `cohort-detail.html` with `<RubricSectionHead>` for Phases)
- `app/routes/admin.settings.cohorts.$cohortId.edit.tsx` (modify)
- `app/routes/admin.settings.roles.$roleId._index.tsx` (modify)
- `app/routes/admin.settings.roles.$roleId.edit.tsx` (modify)
- `app/routes/admin.settings.phases.tsx` (modify — use rewritten `<InlineEditableList>`)
- `app/routes/admin.settings.barriers.tsx` (modify)
- `app/routes/admin.settings.program-info.tsx` (modify — add "Reseed dev data" Danger Zone card gated `NODE_ENV !== 'production'`)
- `app/routes/dev.reseed.ts` — new (server action invoked by the Reseed dev data button; runs `db/seed.ts` logic; refuses in production)
- `app/routes/admin.settings.questions._index.tsx` (modify)
- `app/routes/admin.settings.questions.$setId.tsx` (modify — port `.qs-editor-card` markup)
- `app/routes/admin.settings.questions.competency._index.tsx` (modify)
- `app/routes/admin.settings.questions.competency.cohort.$cohortId.tsx` (modify)
- `app/routes/admin.settings.questions.competency.intern.$internId.tsx` (modify)
- `app/styles/admin.css` (modify — port prototype's admin-shell rules including nav, footer, page-head, action-bar, kpi-card, quick-link, settings-list, identity-card, rubric-section-head, qs-editor-card)

**Phase F — Admin Interns + Assessments:**
- `app/routes/admin.interns._index.tsx` (modify — add `<NameInitial>` chip column; restore Actions column; `.table-meta` strip with zero-padded count)
- `app/routes/admin.interns.new.tsx` (modify — rewrite per prototype `intern-record.html` create mode with `<ConfirmModal>` on save)
- `app/routes/admin.interns.$internId.tsx` (modify — rewrite per prototype edit mode with `<RubricPanel>` per panel; 7-cell `<MetaStrip>`)
- `app/routes/admin.assessments._index.tsx` (modify — rewrite with `<AssessmentCard>` grid; 2-line headline; `<PickerList>` table in intern-picker modal; footer link to Interns)
- `app/routes/admin.assessments.competency.new.tsx` (modify — identity-card subnote inside form per prototype; 2-line headline; `PASS = ALL READY` action-bar status)
- `app/routes/admin.assessments.competency.edit.$id.tsx` (modify — pattern match new)
- `app/routes/admin.assessments.competency.$id.tsx` (modify — detail with result pill + Reviewed By cell + `<DetailHeader>`)
- `app/routes/admin.assessments.exit-employer-survey.tsx` (modify — 2-line headline; 5-cell `<MetaStrip>` without Cohort; `EXIT EMPLOYER SURVEY · EDITABLE` status)
- `app/routes/admin.self-assessment-results.tsx` (modify — `.filters` row with Cohort + Export CSV placeholder; `<NameInitial>` chip; `.table-meta` strip)
- `app/routes/admin.self-assessment-detail.tsx` (modify — 2-line headline; meta strip with `Locked = Immutable` cell; `<DetailHeader>`; rubric-panel empty state)

**Phase G — Employer shell:**
- `app/routes/employer.tsx` (modify — use `<EmployerNav>` + `<EmployerFooter>` with cyan-accent chip; drop wrapping `<main className="container">`)
- `app/routes/employer._index.tsx` (modify — uppercase greeting; `<QuickLinks>`; `<RecentActivity>`; one cyan-accent KPI tile)
- `app/routes/employer.cohorts._index.tsx` (modify — `<TableFilter>` wrapper; count strip; uppercase title)
- `app/routes/employer.cohorts.$cohortId.tsx` (modify — `<MetaStrip>` summary; phase pill strip)
- `app/routes/employer.interns._index.tsx` (modify — `<NameInitial>` chip; outcome pill column; uppercase title)
- `app/routes/employer.interns.$internId.tsx` (modify — swap inline identity-cards for `<RubricPanel>` panels)
- `app/routes/employer.competency.new.tsx` (modify — `<MetaStrip>` in PageHead)
- `app/routes/employer.competency.edit.tsx` (modify — `<MetaStrip>` in PageHead)
- `app/routes/employer.competency.$id.tsx` (modify — Back-to-intern outline button; breadcrumb intern segment)
- `app/routes/employer.exit-survey.tsx` (modify — last-saved banner on re-open; breadcrumb intern segment)
- `app/routes/employer.profile.tsx` (modify — `<MetaStrip>` Contact + Email + Phone; toast on save instead of inline alert)
- `app/routes/employer.roles._index.tsx` (modify — `<NameInitial>` chip; Cohorts-using column)
- `app/routes/employer.roles.new.tsx` (modify — `<MetaStrip>` showing parent Employer)
- `app/routes/employer.roles.$roleId.tsx` (modify — `<MetaStrip>` with usage counts; Cohorts-using sub-table; pre-flight delete check)
- `app/styles/employer-shell.css` (modify — derive from `admin.css` patterns; add `.admin-chip--employer` cyan divider variant; cyan KPI tile modifier)

**Phase H — Test harness + regression:**
- `tests/e2e/*.spec.ts` — all 10 specs reviewed; selectors updated for new DOM
- `tests/e2e/visual-walk.spec.ts` — new (optional): smoke test that walks every route and confirms a known prototype-aligned selector renders (e.g. `.wordmark__img`, `.action-bar__inner`)
- `scripts/visual-audit-screenshots.ts` (modify — extend with detail-route crawl: from list → first row → follow → capture)
- `docs/superpowers/visual-fidelity-screenshots/2026-05-18/` — populated by the script for the final review
- `docs/superpowers/visual-fidelity-audit-2026-05-14.md` (modify — flip every `[~]` to `[✓]` with PR ref or move to `docs/BACKLOG.md` with justification)

**Phase I — Close-out:**
- `CLAUDE.md` (modify — replace SP1–5 architecture summary's UI section with the rebuilt component primitives + CSS organization + reuse patterns; add "SP7 closed" marker)
- `docs/dev-portal/data/status.json` (modify — add SP7 entry as complete; SP6 stays in-progress with C–J remaining)
- `docs/BACKLOG.md` (modify — add any P2 audit items not folded in)

---

## Phases overview

| Phase | Name | Tasks | PRs | Gate |
|---|---|---|---|---|
| **A** | Foundation port | 1–7 | 1 | **G1: Foundation** |
| **B** | Shell + presentation primitives | 8–13 | 5 | **G2: Shared primitives** |
| **C** | Form primitives | 14–15 | 2 | **G3: Form primitives** |
| **D** | Public + intern rebuild | 16–17 | 2 | **G4: Public + intern** |
| **E** | Admin shell + Settings | 18–21 | 4 | **G5: Admin shell + Settings** |
| **F** | Admin Interns + Assessments | 22–24 | 3 | **G6: Admin Interns + Assessments** |
| **G** | Employer shell | 25–26 | 2 | **G7: Employer shell** |
| **H** | Test harness + regression sweep | 27–28 | 1 | **G8: Regression** |
| **I** | Close-out | 29–30 | 1 | (PR review) |

**Total: ~21 PRs across 9 phases.** Execution time: 1–2 weeks of focused work.

**Phase ordering is strict.** A → B → C are foundational; D ships the first user-visible result. E → F can run in series. G is gated by completion of admin (G6) since the employer shell derives from admin patterns. H is the regression net. I closes the books.

**No phase begins until the prior phase's gate is signed off.**

---

## Phase A: Foundation port

### Task 1: Port `tokens.css` from prototype

**Files:**
- `app/styles/tokens.css` (modify)

- [ ] **Step 1: Read prototype's `:root` block**

  Open `Prototypes/PROTOTYPE/styles.css` and read the `:root { … }` block. Note every CSS custom property defined there: palette tokens (`--navy`, `--navy-deep`, `--cyan`, `--gold`, `--canvas`, `--canvas-alt`, etc.), surface tokens (`--surface-dark`, `--surface-dark-alt`), on-dark tokens (`--on-dark`, `--on-dark-muted`), semantic tokens (`--success`, `--danger`), spacing tokens, radius tokens (`--radius-sm`, `--radius-md`), shadow tokens (`--shadow-sm`, `--shadow-md`), and layout tokens (`--container`).

- [ ] **Step 2: Replace `app/styles/tokens.css` content with the verbatim `:root` block**

  Copy the entire prototype `:root { ... }` block into `app/styles/tokens.css`. Do not modify values. Do not omit tokens production doesn't currently consume — they will be needed by the rebuilt components in Phases B–G.

- [ ] **Step 3: Verify no token loss**

  Grep `app/` for raw hex codes (`#[0-9a-fA-F]{3,6}` outside of `tokens.css`). Confirm every hex literal in the existing codebase has a token equivalent in the new `tokens.css`. (Some will be replaced in later phases; this step only confirms the token registry is complete.)

- [ ] **Step 4: Build + typecheck**

  ```bash
  npm run typecheck
  npm run build
  ```

  Both must pass. Existing routes will look identical (no component changes yet).

### Task 2: Port `global.css` base + utility rules

**Files:**
- `app/styles/global.css` (modify)

- [ ] **Step 1: Read prototype's `styles.css` past the `:root` block**

  Identify rules that belong in `global.css`: `body`, `html`, font defaults (Plex Sans 15px / 1.55), link colors, `.container` (1240px max-width, 40px padding), `.wordmark` + `.wordmark__img` (64px), helpers like `.mono`, `.micro-label`, `.micro-label--navy`, `.accent-underline`, focus-ring rules, button base classes (`.btn`, `.btn--primary`, `.btn--outline`, `.btn--sm`, `.btn--danger`, `.btn--ghost-danger`).

- [ ] **Step 2: Replace `app/styles/global.css` with the ported rules**

  Keep the existing import of `tokens.css` at top. Below it, paste the prototype rules. Where production has additions (e.g. `.toast` if it differs from prototype), reconcile — prototype wins.

- [ ] **Step 3: Verify body font + container width**

  Start dev server (`npm run dev`); load `/login`. Inspect element — `body` should compute to `font-size: 15px; line-height: 1.55`. `.container` should compute to `max-width: 1240px; padding: 0 40px`. If different, the rules didn't land.

- [ ] **Step 4: Build + typecheck**

  Same as Task 1.

### Task 3: Add Google Fonts to `app/root.tsx`

**Files:**
- `app/root.tsx` (modify)

- [ ] **Step 1: Read prototype's `<head>` font links**

  Prototype's `index.html` (and every other HTML file) loads fonts via `<link rel="preconnect" href="https://fonts.googleapis.com" />`, `<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />`, and family-specific `<link href="https://fonts.googleapis.com/css2?family=...">` lines.

- [ ] **Step 2: Add the same `<link>` tags to `app/root.tsx`'s `<head>`**

  Use the Latin subset for Plex Sans (smaller bundle, sufficient for English copy). Final URLs:
  - `https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap`
  - `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&subset=latin&display=swap`
  - `https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&subset=latin&display=swap`

- [ ] **Step 3: Confirm in DevTools that fonts load**

  Reload `/login`. DevTools Network tab should show 3 successful font CSS loads. Inspect a heading; computed `font-family` should resolve to `'Archivo Black'`. Inspect body text; should resolve to `'IBM Plex Sans'`. Inspect a `.micro-label`; should resolve to `'IBM Plex Mono'`.

### Task 4: Port `@media print` rules into `global.css`

**Files:**
- `app/styles/global.css` (modify)

- [ ] **Step 1: Read prototype's `@media print { ... }` block**

  Locate the print stylesheet in `Prototypes/PROTOTYPE/styles.css`. It typically hides `.nav`, `.footer`, `.action-bar`, `.modal*` and adjusts tables/cards for paper.

- [ ] **Step 2: Append the block to `app/styles/global.css`**

  Verbatim port. No modifications.

- [ ] **Step 3: Verify with browser Print Preview**

  Load `/admin/interns/:internId` (after starting dev server + logging in via the existing UI), open Print Preview (Ctrl+P). Nav, footer, action bar should be hidden; the record content should print cleanly.

### Task 5: Create `app/lib/utils.ts`

**Files:**
- `app/lib/utils.ts` — new

- [ ] **Step 1: Identify utility helpers in prototype `app.js` worth keeping**

  Grep `Prototypes/PROTOTYPE/app.js` for `formatPhone`, `formatCompletionDate`, and any other small pure helpers. Read the implementations.

- [ ] **Step 2: Port to `app/lib/utils.ts` as TypeScript**

  Add types. Export each function. Do not include any session/storage/mock-data logic.

- [ ] **Step 3: Add unit tests**

  Create `tests/lib/utils.test.ts` with basic test cases (e.g. `formatPhone('3175551234')` → `'(317) 555-1234'`, `formatCompletionDate(new Date('2026-05-18T14:30:00'))` → expected string).

- [ ] **Step 4: `npm test -- --run` green**

### Task 6: Verify logo asset parity

**Files:**
- `app/public/logo.png` (modify if mismatched)

- [ ] **Step 1: Compare bytes**

  ```bash
  diff <(md5sum app/public/logo.png | cut -d' ' -f1) <(md5sum Prototypes/PROTOTYPE/logo.png | cut -d' ' -f1)
  ```

  Or use PowerShell: `(Get-FileHash app/public/logo.png).Hash` vs `(Get-FileHash Prototypes/PROTOTYPE/logo.png).Hash`.

- [ ] **Step 2: If mismatched, copy prototype's over production's**

  ```bash
  cp Prototypes/PROTOTYPE/logo.png app/public/logo.png
  ```

- [ ] **Step 3: Verify the file loads**

  Reload `/admin` after login; inspect the nav wordmark; logo should render unchanged (since both production routes and prototype reference `logo.png` by path).

### Task 7: Commit + PR + Gate G1

- [ ] **Step 1: Branch + commit**

  ```bash
  git checkout -b feat/sp7-phase-a-foundation
  git add app/styles/tokens.css app/styles/global.css app/root.tsx app/lib/utils.ts tests/lib/utils.test.ts app/public/logo.png
  git commit -m "feat(sp7): phase a — foundation port (tokens, fonts, global, utils)"
  git push -u origin feat/sp7-phase-a-foundation
  ```

- [ ] **Step 2: Open PR**

  ```bash
  gh pr create --title "feat(sp7): phase a — foundation port" --body "$(cat <<'EOF'
## Summary
SP7 Phase A. Foundation port for the frontend rebuild:
- Ports prototype `:root` block verbatim into `tokens.css`
- Ports prototype base + utility rules into `global.css` (incl. `@media print`)
- Adds Archivo Black + Plex Sans (Latin) + Plex Mono Google Fonts links to `root.tsx`
- New `app/lib/utils.ts` with `formatPhone` + `formatCompletionDate` ported from prototype `app.js`
- Confirms `app/public/logo.png` is byte-identical to prototype's

No route changes. No component changes. Existing routes look identical post-merge — Phase B+ depends on this foundation.

## Test plan
- [ ] `npm run typecheck` green
- [ ] `npm run build` green
- [ ] `npm test -- --run` green (unit tests including new utils.test.ts)
- [ ] Manual DevTools verification: body font 15px/1.55, container 1240px/40px, fonts resolve correctly

## Gate G1
Foundation review per spec §6a — Matt confirms tokens match prototype `:root` exactly, font links load Latin-subset Plex, print stylesheet present.
EOF
)"
  ```

- [ ] **Step 3: CI green + merge**

- [ ] **Step 4: Request Gate G1 sign-off**

  Comment in the PR (or in conversation) requesting Matt's gate sign-off. Include a brief screenshot of the tokens.css diff and a DevTools screenshot showing computed body styles. **Do NOT start Phase B until Gate G1 is signed off.**

---

## Phase B: Shell + presentation primitives

Phase B is 5 PRs that rebuild the visual primitives every later phase depends on. After all 5 land, Gate G2 reviews them together via a `/dev/primitives` demo route.

### Task 8: Build the dev-primitives demo route (scaffold)

**Files:**
- `app/routes/dev.primitives.tsx` — new
- `app/routes.ts` (modify — add the route, gated)

- [ ] **Step 1: Add the route to `app/routes.ts` inside a NODE_ENV check**

  The route is dev-only. Wrap the registration:
  ```ts
  ...(process.env.NODE_ENV !== 'production' ? [route('dev/primitives', 'routes/dev.primitives.tsx')] : []),
  ```

- [ ] **Step 2: Create the route file with the layout scaffold**

  An empty grid that lists primitives as they're added in Tasks 9–13. Each primitive gets its own `<section>` with a heading and the primitive rendered with representative props.

- [ ] **Step 3: Build + verify the route loads in dev**

  `npm run dev` → load `http://localhost:5174/dev/primitives`. Should render an empty scaffold page. Production build should not include the route (verify by running `npm run build` and grepping the build output).

- [ ] **Step 4: Commit on the same branch as Task 9**

  This scaffold lands with Task 9's PR.

### Task 9: Nav + Footer primitives (PR 1)

**Files:**
- `app/components/nav/PublicNav.tsx` — new
- `app/components/nav/PublicFooter.tsx` — new
- `app/components/nav/AdminNav.tsx` (rewrite if exists, else new)
- `app/components/nav/AdminFooter.tsx` — new
- `app/components/nav/EmployerNav.tsx` — new
- `app/components/nav/EmployerFooter.tsx` — new
- `app/components/auth/AuthShell.tsx` (modify — preserve prop API; rewrite markup to match prototype `login.html`)
- `app/styles/admin.css` (modify — port nav + footer rules from prototype)
- `app/routes/dev.primitives.tsx` (modify — mount nav/footer demos)

- [ ] **Step 1: Read prototype source**

  Open `Prototypes/PROTOTYPE/index.html` (for `PublicNav`/`PublicFooter`), `admin.html` (for `AdminNav`/`AdminFooter`), and `login.html` (for the `AuthShell` two-column layout). Note every class name, every element, every attribute.

- [ ] **Step 2: Implement each component**

  Each component emits the prototype's markup with React props for variability (logo path, link list, role-specific accents). `<EmployerNav>` extends `<AdminNav>` with the `.admin-chip--employer` cyan-divider modifier (per spec §8 decision 7).

  Key specs from the audit:
  - Nav: `height: 100px`, `padding: 0 32px`, `gap: 36px` on `.nav__links`, font 13px / 0.04em letter-spacing
  - Wordmark image: `height: 64px`
  - Active nav link: muted-white base (`--on-dark-muted`), white when active, **3px gold underline rail under active link, 1px on hover**
  - Admin chip: 4px-radius rounded rect, square gold avatar, mono 11.5px
  - Footer: 64px wordmark, dark surface

- [ ] **Step 3: Mount in `/dev/primitives`**

  Each nav/footer rendered with mock prop values. Visually confirm against the prototype.

- [ ] **Step 4: Build + typecheck + lint**

- [ ] **Step 5: Commit + PR**

  Branch: `feat/sp7-phase-b1-nav-footer-authshell`. PR title: `feat(sp7): phase b — nav + footer + authshell primitives`. Include screenshot pairs of the demo route vs prototype HTML files.

### Task 10: Page + content primitives (PR 2)

**Files:**
- `app/components/PageHead.tsx` (modify)
- `app/components/ActionBar.tsx` (modify — sticky bottom default)
- `app/components/MetaStrip.tsx` (modify)
- `app/components/IdentityCard.tsx` — new
- `app/components/RubricPanel.tsx` (modify if exists, else new)
- `app/components/DetailHeader.tsx` — new
- `app/components/RubricSectionHead.tsx` — new
- `app/styles/admin.css` (modify — port page-head, action-bar, meta-strip, identity-card, rubric, detail-header rules)
- `app/routes/dev.primitives.tsx` (modify — extend demo)

- [ ] **Step 1: Read prototype source for each primitive**

  `intern-record.html` has `.action-bar`, `.meta-strip`, `.rubric`, `.identity-card`. `cohort-detail.html` has `.detail-header` and `.rubric-section-head`. `admin.html` has `.page-head` patterns.

- [ ] **Step 2: Implement each**

  `<ActionBar>` defaults to sticky-bottom (per spec §8 decision 6). Props: `status` (mono caption), `children` (button slot). `<PageHead>` supports `title: ReactNode` so multi-line headlines like `<>YOUR STARTING<br/>LINE.</>` work. `<MetaStrip>` supports 5–8 cells, `mono` flag per cell.

- [ ] **Step 3: Mount in `/dev/primitives`**

  Demo every primitive with representative props.

- [ ] **Step 4: Build + typecheck + lint**

- [ ] **Step 5: Commit + PR**

  Branch: `feat/sp7-phase-b2-page-content-primitives`. Screenshot pairs included.

### Task 11: Modal + Toast primitives (PR 3)

**Files:**
- `app/components/modal/ConfirmModal.tsx` (modify — rewrite to prototype's `#updateModal` / `#deleteModal` markup)
- `app/components/toast/ToastProvider.tsx` (modify — rewrite to prototype's `.toast` styling, 3.2s auto-dismiss, kinds `success` / `danger` / `gold`)
- `app/styles/global.css` (modify — port modal + toast rules)
- `app/routes/dev.primitives.tsx` (modify)

- [ ] **Step 1: Read prototype source**

  Modal markup in `interns-dashboard.html`, `cohort-detail.html`, etc. Toast wiring in `app.js`'s `toast()` function.

- [ ] **Step 2: Implement**

  Preserve existing prop APIs (`<ConfirmModal title body confirmLabel onConfirm ...>` and `useToast()`). Rewrite the markup + styling internally.

- [ ] **Step 3: Mount in `/dev/primitives`**

  Buttons that open each modal + fire each toast variant.

- [ ] **Step 4: Build + typecheck + lint + PR**

  Branch: `feat/sp7-phase-b3-modal-toast`.

### Task 12: Table primitives (PR 4)

**Files:**
- `app/components/tables/TableFilter.tsx` (modify)
- `app/components/tables/EmptyRow.tsx` (modify)
- `app/components/tables/NameInitial.tsx` — new
- `app/components/KpiCard.tsx` — new
- `app/components/QuickLinks.tsx` — new
- `app/components/RecentActivity.tsx` — new
- `app/styles/admin.css` (modify — port table, kpi, quick-link, activity-list rules)
- `app/routes/dev.primitives.tsx` (modify)

- [ ] **Step 1: Read prototype source**

  Tables in `interns-dashboard.html`, `self-assessment-results.html`. KPI cards in `admin.html`. Quick links + activity in `admin.html`.

- [ ] **Step 2: Implement**

  `<TableFilter>` renders the `.filters` block as a separate `<section>` ABOVE the table (not wrapping it). `.table-meta` count strip with zero-padded count (`String(n).padStart(2, '0')`). `<KpiCard>` supports `variant: 'default' | 'cyan' | 'success'` (for use in admin and employer dashboards). `<NameInitial>` is the `.col-name + .name-initial` chip composition.

- [ ] **Step 3: Mount in `/dev/primitives` + PR**

  Branch: `feat/sp7-phase-b4-tables-kpi`.

### Task 13: Hero + landing + receipt + assessment-card + picker primitives (PR 5)

**Files:**
- `app/components/HeroSection.tsx` — new
- `app/components/PillarsSection.tsx` — new
- `app/components/ConfirmReceipt.tsx` — new (supports `variant: 'success' | 'error'` for confirmation + 404)
- `app/components/AssessmentCard.tsx` — new
- `app/components/PickerList.tsx` — new
- `app/styles/global.css` (modify — port `.hero`, `.pillar`, `.confirm`, `.assessment-card`, `.picker-list` rules)
- `app/routes/dev.primitives.tsx` (modify)

- [ ] **Step 1: Read prototype source**

  `index.html` for hero + pillars. `assessment-confirmation.html` + `404.html` for the confirm receipt. `assessments.html` for assessment cards + picker.

- [ ] **Step 2: Implement** — same pattern as previous tasks.

- [ ] **Step 3: Mount + PR**

  Branch: `feat/sp7-phase-b5-hero-receipt-cards-picker`.

### Gate G2: Shared primitives review

After all 5 Phase B PRs land:

- [ ] **Compile the gate-review post:**

  - Demo URL: `http://localhost:5174/dev/primitives`
  - Screenshot pairs: each primitive vs its source prototype HTML, captured via `scripts/visual-audit-screenshots.ts` (extend the script to capture `/dev/primitives` and the source prototype pages)
  - Known limitations (e.g. real data not wired — primitives use mock props)

- [ ] **Request Matt's review.**

  Matt walks `/dev/primitives` in dev with the prototype open side-by-side and signs off OR flags issues.

- [ ] **Address any issues** in follow-up PRs on the same Phase B branches or new fix branches before Phase C begins.

- [ ] **Do NOT start Phase C until Gate G2 is signed off.**

---

## Phase C: Form primitives

### Task 14: Rebuild `<AssessmentForm>` and integrate sticky ActionBar (PR 1)

**Files:**
- `app/components/forms/AssessmentForm.tsx` (modify — rewrite markup, preserve prop API, add `sectionBreaks?: Array<{ afterQuestionIndex: number; title: string }>` prop)
- `app/routes/dev.primitives.tsx` (modify — extend demo with `<AssessmentForm>` examples)

- [ ] **Step 1: Read prototype source**

  Form structure in `personal-goals.html` (free-form textareas, section break between Q4 and Q5), `midpoint-reflection.html` (similar), `participant-feedback.html` (mixed-format: radio + Likert + Yes/No + textarea).

- [ ] **Step 2: Implement**

  Preserve existing prop API (`{ questions, actionPath, initialAnswers, errors, ... }`). Add `sectionBreaks` prop. Body wraps in `<RubricPanel>` per section. Submit row is sticky `<ActionBar>` (NOT inline). Render `IdentityConfirmedChip` once at top (not duplicated with extra `SUBMITTING AS` label).

- [ ] **Step 3: Mount in `/dev/primitives`**

  Three demos: Personal Goals (with section break), Midpoint Reflection (no breaks), Participant Feedback (mixed types).

- [ ] **Step 4: Verify call-site compatibility**

  Grep for existing `<AssessmentForm` usages: `app/routes/_public.intern.personal-goals.tsx`, `_public.intern.midpoint-reflection.tsx`, `_public.intern.participant-feedback.tsx`, `admin.assessments.exit-employer-survey.tsx`, `employer.exit-survey.tsx`. Confirm each still compiles (Phase D + F + G will update the page-level rendering, but the component prop API stays compatible).

- [ ] **Step 5: Build + typecheck + lint + PR**

  Branch: `feat/sp7-phase-c1-assessment-form`.

### Task 15: Rebuild `<CompetencyAssessmentForm>`, `<QuestionSetEditor>`, `<InlineEditableList>` (PR 2)

**Files:**
- `app/components/forms/CompetencyAssessmentForm.tsx` (modify)
- `app/components/forms/QuestionSetEditor.tsx` (modify)
- `app/components/forms/InlineEditableList.tsx` (modify)
- `app/routes/dev.primitives.tsx` (modify)

- [ ] **Step 1: Read prototype source**

  `competency-new.html` for competency form (identity-card subnote `UNIQUE KEY · ... · MULTIPLE PHASES ALLOWED`, 3-tier section headers via `<RubricSectionHead>`). `settings-question-set.html` for `<QuestionSetEditor>` (accordion editor, `.qs-editor-card`). `settings-phases.html` + `settings-barriers.html` for `<InlineEditableList>` (90px / 1fr / 40px grid, up/down handles).

- [ ] **Step 2: Implement**

  Preserve prop APIs across all three. Internal markup rewritten.

- [ ] **Step 3: Mount in `/dev/primitives` + PR**

  Branch: `feat/sp7-phase-c2-form-editors`.

### Gate G3: Form primitives review

Same protocol as G2. Matt walks `/dev/primitives` (form section), confirms forms render correctly with sticky action bar + section breaks + accordion editors per prototype. Sign off before Phase D starts.

---

## Phase D: Public + intern rebuild

### Task 16: Landing + auth flow + 404 (PR 1)

**Files:**
- `app/routes/_public.tsx` (modify)
- `app/routes/_public._index.tsx` (modify)
- `app/routes/_public.login.tsx` (modify)
- `app/routes/_public.auth.forgot.tsx` (modify)
- `app/routes/_public.auth.reset.tsx` (modify)
- `app/routes/_public.auth.accept.tsx` (modify)
- `app/routes/$.tsx` (modify — 404)
- `app/styles/auth.css` (modify)

- [ ] **Step 1: For each route, rewrite the default-export component**

  Preserve all `loader` and `action` exports verbatim. Replace the default-export JSX body with rebuilt markup using Phase B primitives. Reference the prototype HTML file directly for each route.

  - `/`: `<PublicNav />` + `<HeroSection />` + `<PillarsSection />` + `<PublicFooter />`. Hero copy: `EXPAND YOUR OPPORTUNITIES.` per prototype.
  - `/login`: wrap in `<AuthShell>` with 2-column intro (`SIGN IN / 2026` micro-label + `Welcome back.` title + numbered facts list) and form card.
  - `/auth/forgot|reset|accept`: each in `<AuthShell>` with matching micro-label per prototype.
  - `/*`: wrap in `<PublicNav>` + `<PublicFooter>`, render `<ConfirmReceipt variant="error">` with X-glyph badge + `Page not found.` title + `Home` + `Admin Sign In` action links.

- [ ] **Step 2: Manual walk in browser**

  Start dev server. Walk every rebuilt route side-by-side with the prototype HTML. Confirm copy + layout + spacing + tokens.

- [ ] **Step 3: Capture screenshot pairs**

  Re-run `scripts/visual-audit-screenshots.ts` (or extend it if needed) for landing, login, auth pages, 404. Save under `docs/superpowers/visual-fidelity-screenshots/<phase-d-date>/`.

- [ ] **Step 4: Update audit doc**

  In `docs/superpowers/visual-fidelity-audit-2026-05-14.md`, flip the relevant `[~]` markers to `[✓]` with PR ref.

- [ ] **Step 5: Build + typecheck + lint + PR**

  Branch: `feat/sp7-phase-d1-landing-auth-404`. PR description includes screenshot pairs table per spec §6.

### Task 17: Intern flow rebuild (PR 2)

**Files:**
- `app/routes/_public.intern.tsx` (modify)
- `app/routes/_public.intern.assessments.tsx` (modify)
- `app/routes/_public.intern.personal-goals.tsx` (modify)
- `app/routes/_public.intern.midpoint-reflection.tsx` (modify)
- `app/routes/_public.intern.participant-feedback.tsx` (modify)
- `app/routes/_public.intern.confirmation.tsx` (modify)

- [ ] **Step 1: Rewrite the intern layout**

  `_public.intern.tsx` uses `<PublicNav variant="intern">` with back-link, and `<PublicFooter>`. Drop the ad-hoc inline-styled nav.

- [ ] **Step 2: Rewrite `/intern/assessments`**

  Identity-gate: `<IdentityCard>` with `.id-grid--4` (4-column field grid) + top-rule divider + Confirm button. After confirm: `<IdentityConfirmedChip>` header + 3-card `<AssessmentCard>` grid with per-card status pills ("SUBMITTED ON …" / "ONE SUBMISSION").

- [ ] **Step 3: Rewrite the 3 self-assessment forms**

  Each uses `<AssessmentForm>` with:
  - 2-line `<PageHead title={<>YOUR STARTING<br/>LINE.</>}>` (or matching prototype headline per type)
  - Micro-label per prototype: `PERSONAL GOALS / 2026 / ONE SUBMISSION` (not `INTERN / PERSONAL GOALS`)
  - Section break on Personal Goals between Q4 and Q5: `{ afterQuestionIndex: 3, title: 'My Focus for This Internship' }`
  - Sticky `<ActionBar>` at bottom

- [ ] **Step 4: Rewrite `/intern/confirmation`**

  Use `<ConfirmReceipt variant="success">` with:
  - 56px circular `.confirm__badge` SVG checkmark
  - 2-line title per type (e.g. `Personal Goals submitted.`)
  - Verbatim prototype copy per `?type=` param
  - Static `SUBMISSION RECEIPT` strip with mono receipt id (e.g. derive `IMP-SA-2026-<padded-id>` from `submittedAt`)
  - `.confirm__note` warning about no resubmits
  - `<MetaStrip>` instead of inline `<dl>`

- [ ] **Step 5: Manual walk + screenshot capture + audit doc update**

- [ ] **Step 6: Build + typecheck + lint + PR**

  Branch: `feat/sp7-phase-d2-intern-flow`.

### Gate G4: Public + intern review

Matt walks every route (landing, login, all auth, all intern, 404) side-by-side with the prototype. Confirms copy verbatim. Confirms sticky action bar on form pages. Confirms confirmation receipt + badge render. Sign off before Phase E starts.

---

## Phase E: Admin shell + Settings

### Task 18: Admin shell + home (PR 1)

**Files:**
- `app/routes/admin.tsx` (modify)
- `app/routes/admin._index.tsx` (modify)
- `app/routes/admin.settings._index.tsx` (modify)
- `app/styles/admin.css` (modify — port any remaining admin-shell rules)

- [ ] **Step 1: Rewrite admin layout**

  `<AdminNav>` + `<AdminFooter>`. Drop any wrapping `<main className="container">`; children own their own `<section><div className="container">` blocks.

- [ ] **Step 2: Rewrite `/admin` home**

  Personalized greeting per prototype: `GOOD MORNING, <FIRST_NAME>.` (2-line, derived from admin email or first-name field). Sub-copy includes both sentences per prototype. `<KpiCard>` grid with default + cyan + success variants. `<QuickLinks>` with `.quick-link__arrow`. `<RecentActivity>` block.

- [ ] **Step 3: Rewrite Settings rail (`/admin/settings`)**

  Match prototype's `settings-employers.html` rail.

- [ ] **Step 4: Manual walk + screenshots + audit doc update + PR**

  Branch: `feat/sp7-phase-e1-admin-shell-home`.

### Task 19: Settings Employers + Cohorts + Roles (PR 2)

**Files:** all `admin.settings.employers.*.tsx`, `admin.settings.cohorts.*.tsx`, `admin.settings.roles.*.tsx`.

- [ ] **Step 1: For each route, rewrite default export against prototype HTML**

  Preserve loader/action. Rewrite JSX using Phase B primitives.

- [ ] **Step 2: Manual walk + screenshots + audit doc update + PR**

  Branch: `feat/sp7-phase-e2-settings-employers-cohorts-roles`.

### Task 20: Settings Phases + Barriers + Program Info (with Reseed dev data) (PR 3)

**Files:** `admin.settings.phases.tsx`, `admin.settings.barriers.tsx`, `admin.settings.program-info.tsx`, new `app/routes/dev.reseed.ts`.

- [ ] **Step 1: Rewrite phases + barriers**

  Use rewritten `<InlineEditableList>`.

- [ ] **Step 2: Rewrite program-info with Danger Zone**

  Add a second `<IdentityCard>` below the main one. Inside, a `btn--danger` "Reseed dev data" button. Server-side: the loader only includes the Danger Zone payload when `process.env.NODE_ENV !== 'production'`. The button POSTs to `/dev/reseed`.

- [ ] **Step 3: Create `/dev/reseed` route**

  Action that imports and runs the same logic as `db/seed.ts`. Returns a `redirect('/admin/settings/program-info')` with a toast. **Hard-coded refusal in production:** `if (process.env.NODE_ENV === 'production') throw new Response('Not found', { status: 404 });`. Registered in `app/routes.ts` inside the same NODE_ENV gate as `/dev/primitives`.

- [ ] **Step 4: Manual walk + verify Danger Zone doesn't render in `npm run build` output + screenshots + PR**

  Branch: `feat/sp7-phase-e3-settings-phases-barriers-program-info`.

### Task 21: Settings Questions (list + per-set + competency 3-tier) (PR 4)

**Files:** `admin.settings.questions._index.tsx`, `admin.settings.questions.$setId.tsx`, `admin.settings.questions.competency._index.tsx`, `admin.settings.questions.competency.cohort.$cohortId.tsx`, `admin.settings.questions.competency.intern.$internId.tsx`.

- [ ] **Step 1: Rewrite each route using `<QuestionSetEditor>` + Phase B primitives**

- [ ] **Step 2: Manual walk + screenshots + audit doc update + PR**

  Branch: `feat/sp7-phase-e4-settings-questions`.

### Gate G5: Admin shell + Settings review

Matt walks every admin Settings route. Confirms personalized greeting, nav at 100px tall with 64px logo and 3px gold underline rail on active link, Settings rail order, inline editable lists, Reseed dev data is dev-only (verify with `npm run build` output sample). Sign off before Phase F starts.

---

## Phase F: Admin Interns + Assessments

### Task 22: Admin Interns (PR 1)

**Files:** `admin.interns._index.tsx`, `admin.interns.new.tsx`, `admin.interns.$internId.tsx`.

- [ ] **Step 1: Rewrite list route**

  `<TableFilter>` wrapping `<NameInitial>` chips, restore Actions column with inline Edit + Delete, `.table-meta` strip with zero-padded count, Current Phase column (compute from `intern.startDate` vs cohort phases).

- [ ] **Step 2: Rewrite intern-record (new + edit)**

  Use numbered `<RubricPanel num="01"... "06">` for each panel. Edit mode hides panels 01–02 and shows the 7-cell `<MetaStrip>`. Save confirm modal on new mode.

- [ ] **Step 3: Manual walk + screenshots + audit doc + PR**

  Branch: `feat/sp7-phase-f1-admin-interns`.

### Task 23: Admin Assessments hub + Competency (PR 2)

**Files:** `admin.assessments._index.tsx`, `admin.assessments.competency.new.tsx`, `admin.assessments.competency.edit.$id.tsx`, `admin.assessments.competency.$id.tsx`.

- [ ] **Step 1: Rewrite assessments hub**

  `<AssessmentCard>` grid replacing `identity-card`/`kpi-grid`. 2-line title (`START AN<br/>ASSESSMENT.`). Intern-picker modal uses `<PickerList>` table.

- [ ] **Step 2: Rewrite competency new + edit + detail**

  Identity-card with `MULTIPLE PHASES ALLOWED` subnote per prototype. Multi-line titles. Detail page: result pill in page-head row, 8-cell meta-strip with Reviewed By cell.

- [ ] **Step 3: Manual walk + screenshots + audit doc + PR**

  Branch: `feat/sp7-phase-f2-admin-competency`.

### Task 24: Admin Exit Survey + Self-results + Self-detail (PR 3)

**Files:** `admin.assessments.exit-employer-survey.tsx`, `admin.self-assessment-results.tsx`, `admin.self-assessment-detail.tsx`.

- [ ] **Step 1: Rewrite each per prototype** — same pattern.

- [ ] **Step 2: Decide on IA for exit-survey breadcrumb**

  Prototype roots under `ADMIN / INTERNS / EVALUATIONS / EXIT EMPLOYER SURVEY`. Match prototype unless Matt prefers the current `ADMIN / ASSESSMENTS / ...` IA.

- [ ] **Step 3: Manual walk + screenshots + audit doc + PR**

  Branch: `feat/sp7-phase-f3-admin-exit-self-assessments`.

### Gate G6: Admin Interns + Assessments review

Matt walks every admin Interns + Assessments route. Confirms 6 numbered rubric panels render on intern record, competency 3-tier stitching displays section headers, competency detail shows result pill + Reviewed By cell, self-assessment-detail empty state matches prototype. Sign off before Phase G starts.

---

## Phase G: Employer shell

### Task 25: Employer shell + dashboard + cohorts + interns (PR 1)

**Files:** `employer.tsx`, `employer._index.tsx`, `employer.cohorts._index.tsx`, `employer.cohorts.$cohortId.tsx`, `employer.interns._index.tsx`, `employer.interns.$internId.tsx`, `app/styles/employer-shell.css`.

- [ ] **Step 1: Rewrite employer layout**

  `<EmployerNav>` + `<EmployerFooter>` with cyan-accent chip divider. Drop the wrapping `<main className="container">`; children own their own.

- [ ] **Step 2: Rewrite dashboard**

  Uppercase greeting (`WELCOME, {employerName}.` or `YOUR PROGRAM.`). `<QuickLinks>` + `<RecentActivity>` blocks. One cyan-accent KPI tile.

- [ ] **Step 3: Rewrite cohorts + interns + intern-record**

  `<TableFilter>` wrappers. `<NameInitial>` chip on intern list. Outcome pill column. Intern record uses `<RubricPanel>` panels (not inline identity-cards). Breadcrumbs include intern segment per route.

- [ ] **Step 4: Manual walk + screenshots + audit doc + PR**

  Branch: `feat/sp7-phase-g1-employer-shell-dashboard`.

### Task 26: Employer competency + exit-survey + profile + roles (PR 2)

**Files:** `employer.competency.new.tsx`, `employer.competency.edit.tsx`, `employer.competency.$id.tsx`, `employer.exit-survey.tsx`, `employer.profile.tsx`, `employer.roles._index.tsx`, `employer.roles.new.tsx`, `employer.roles.$roleId.tsx`.

- [ ] **Step 1: Rewrite each** with `<MetaStrip>` in PageHead, breadcrumb intern segments, toast for save confirms (not inline alerts), pre-flight delete check on role detail with Cohorts-using sub-table.

- [ ] **Step 2: Manual walk + screenshots + audit doc + PR**

  Branch: `feat/sp7-phase-g2-employer-assessments-profile-roles`.

### Gate G7: Employer shell review

Matt walks every employer route. Confirms cyan accent on chip divider + one KPI tile, no double-container nesting, employer KPI dashboard mirrors admin pattern, intern record uses RubricPanels, breadcrumbs include intern segment. Sign off before Phase H starts.

---

## Phase H: Test harness + regression sweep

### Task 27: Update Playwright selectors

**Files:** all `tests/e2e/*.spec.ts`.

- [ ] **Step 1: Run the full Playwright suite locally**

  ```bash
  npm run test:e2e
  ```

  Most specs will fail because DOM selectors changed. Capture the failure list.

- [ ] **Step 2: For each failing spec, update selectors to match new DOM**

  Use the prototype's class names (e.g. `.assessments tbody tr`, `.action-bar__inner`, `.identity-card__head`) which are now the production DOM.

- [ ] **Step 3: Re-run until green**

  All 10+ specs pass locally.

### Task 28: Final regression sweep + audit close

**Files:**
- `scripts/visual-audit-screenshots.ts` (modify — extend with detail-route crawl)
- `docs/superpowers/visual-fidelity-screenshots/2026-05-18-final/` — populated
- `docs/superpowers/visual-fidelity-audit-2026-05-14.md` (modify — close every `[~]`)

- [ ] **Step 1: Extend screenshot script to crawl detail routes**

  Login → navigate to list → click first row → screenshot. Adds cohort detail, role detail, intern record, question set editor, competency detail, self-assessment detail to the captured set.

- [ ] **Step 2: Re-run the script for the final reference set**

  Output dir: `docs/superpowers/visual-fidelity-screenshots/<close-date>/`.

- [ ] **Step 3: Walk every audit doc entry**

  For each `[~]` route, confirm the rebuild matches the prototype. Flip to `[✓]` with the PR ref. Any not-closed items move to `docs/BACKLOG.md` under a new "Post-SP7 polish" section with explicit justification.

- [ ] **Step 4: Build + typecheck + lint + all tests pass**

  ```bash
  npm run typecheck && npm run lint && npm run build && npm test -- --run && npm run test:rls && npm run test:e2e
  ```

  All green.

- [ ] **Step 5: Commit + PR**

  Branch: `feat/sp7-phase-h-regression-sweep`. PR description includes: list of Playwright spec updates, final screenshot pair set, audit doc summary (`[✓]` count, deferred count).

### Gate G8: Regression review

Matt does the final end-to-end walk through every shipped route. All checks green. Audit doc has every `[~]` flipped to `[✓]` or deferred with justification. Sign off before Phase I starts.

---

## Phase I: Close-out

### Task 29: Update CLAUDE.md + dev-portal status

**Files:**
- `CLAUDE.md` (modify)
- `docs/dev-portal/data/status.json` (modify)

- [ ] **Step 1: Update CLAUDE.md**

  Replace the SP1–5 architecture summary's UI section with the rebuilt component primitives + CSS organization + reuse patterns. Add a "SP7 closed YYYY-MM-DD" marker. Note that the audit doc + screenshots are the reference for the rebuilt design.

- [ ] **Step 2: Update dev-portal status**

  Add SP7 as complete in `docs/dev-portal/data/status.json`. SP6 stays in-progress with phases C–J remaining (queued behind SP7).

- [ ] **Step 3: Append to `docs/BACKLOG.md`**

  Any P2 audit items not folded in. Any deferred prototype features (e.g. specific page treatments) with explicit explanation.

### Task 30: PR + close

- [ ] **Step 1: Commit + PR**

  Branch: `docs/sp7-closeout`. PR title: `docs(sp7): close-out — CLAUDE.md + status + backlog`.

- [ ] **Step 2: Merge after CI green.**

- [ ] **Step 3: Announce SP7 closed.**

  At this point: the production app's frontend matches the prototype pixel-for-pixel. SP6 phases C–J resume with the rebuilt frontend as the surface.

---

## Definition of done (SP7 close-out)

Per spec §10:

1. Every route in `app/routes.ts` renders against rebuilt components using ported prototype CSS. ✓ via Phases D–G
2. Audit doc has every `[~]` resolved to `[✓]` or moved to backlog. ✓ via Task 28
3. Side-by-side screenshot pairs committed under `docs/superpowers/visual-fidelity-screenshots/`. ✓ via Task 28
4. All 196 unit tests pass. ✓ continuously
5. All 19 RLS tests pass. ✓ continuously
6. All 10+ Playwright e2e specs pass (selectors updated). ✓ via Task 27
7. `npm run build` green. ✓
8. `npm run typecheck` green. ✓
9. `npm run lint` no new warnings. ✓
10. CLAUDE.md updated. ✓ via Task 29
11. SP7 marked complete in plan + status.json. ✓ via Task 29
12. Matt has walked the full app end-to-end and confirmed parity. ✓ via Gate G8

---

## Notes for the executing agent

- **Read the spec first.** §1 (Fidelity Mandate), §6a (Review gates), §8 (Resolved decisions). These set the bar.
- **Don't proceed past a gate without sign-off.** Posting screenshots and waiting is the correct behavior. Pushing the next phase's branch without G(n) sign-off is a process failure.
- **The prototype is the spec, literally.** When in doubt about styling, copy, or layout: open the prototype HTML and read it.
- **Loaders and actions are off-limits.** This rebuild does not touch server logic. If a UI change requires a server-side change, raise it as a question — don't make the change.
- **No new dependencies.** No CSS-in-JS, no Tailwind, no design libraries. Plain CSS ported from prototype.
- **Per-PR includes screenshot pairs.** A PR without screenshots cannot be reviewed (per spec §1.4).
- **Phase B PRs can ship in parallel** (they touch different components). But all 5 must land before Gate G2. Phases C onward run in series.
- **If a primitive's prop API needs to change** (not just markup), call it out in the PR and verify all call sites compile before merging.
- **The audit doc is your route-by-route requirements input.** When rebuilding a route, open the audit entry for that route and address every P0/P1 listed there.
