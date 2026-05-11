# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

The **IMPACT Internship Assessment Portal** is a web app for an Indiana-based internship program. The clickable 34-page prototype is **locked**, and the **production rebuild is fully planned** — 1 architectural design spec plus 6 sub-project implementation plans (256 tasks total), all committed. Sub-project 1 (Foundation) execution has not yet begun.

The app tracks:
- Intake / Entry Assessment (captured on the intern record at creation)
- Competency assessments (multi-phase, admin-completed on behalf of employers)
- Intern self-assessments (one-time, intern-submitted during the program)
- 90-day and 180-day employment outcomes

## Source-of-truth documents

**Production rebuild (authoritative for production scope):**
- **`docs/superpowers/specs/2026-05-10-production-rebuild-design.md`** — architectural design spec. Single source of truth for production stack (RR v7 + Drizzle + Supabase Postgres + Supabase Auth + Netlify), data model (15 tables), 3-tier permission model (admin / employer / anonymous intern), question-set engine, phasing, deferred items.
- **`docs/superpowers/plans/2026-05-10-sub-project-1-foundation.md`** — 60 tasks. Repo scaffold, Supabase project, Drizzle schema, RLS policies, dev seed, CI/CD, login routing to placeholder dashboards.
- **`docs/superpowers/plans/2026-05-10-sub-project-2-admin-core.md`** — 37 tasks. Admin shell + Settings (Employers/Cohorts/Roles/Phases/Barriers/Program Info) + Interns CRUD + unified intern record.
- **`docs/superpowers/plans/2026-05-10-sub-project-3-question-engine.md`** — 38 tasks. 6 question type renderers + set editor (with accordion-collapse fix) + 3-tier competency stitching + verbatim seed content.
- **`docs/superpowers/plans/2026-05-10-sub-project-4-assessment-forms.md`** — 31 tasks. All 5 assessment forms on the engine + intern identity gate (HMAC cookie) + anonymous submission via service-role bypass.
- **`docs/superpowers/plans/2026-05-10-sub-project-5-employer-shell.md`** — 38 tasks. Employer login + scoped views + account provisioning + branded auth pages + self-service competency / exit-survey.
- **`docs/superpowers/plans/2026-05-10-sub-project-6-polish-launch.md`** — 52 tasks. Reports stub + Resend branded emails + Sentry + e2e smoke + a11y + perf + Netlify publish-dir cutover + launch.

**Prototype-era and reference (still authoritative for prototype behavior; superseded by the production design spec for production scope):**
- **`PRD.md`** — original requirements, business rules, roles, open questions, non-goals. v0 PRD predates the 3-tier user model added in production planning.
- **`IMPACT Internship Assessment Portal - App Outline.md`** — field-level screen/view inventory.
- **`Self-Assessment Questions (Placeholder).md`** — placeholder rubric content (final content pending from program staff).
- **`Sample Assessments for IMPACT Internship.docx`** — source rubrics (Readiness + Competency) from the program lead.
- **`docs/BACKLOG.md`** — prototype-era defer log (sub-projects A–E). Most items either land as quality fold-ins in the production rebuild or are covered by the design spec's deferred list — treat as historical, cross-reference the spec for production-scope decisions.
- **`docs/plans/2026-04-16-prototype-enhancements.md`** — prototype enhancement plan (completed).
- **`docs/superpowers/specs/2026-05-06-intern-assessment-chooser-design.md`** + **`.../plans/2026-05-06-intern-assessment-chooser.md`** — iter 1 spec/plan (completed): public-side chooser + Personal Goals + Midpoint Reflection forms.
- **`docs/superpowers/specs/2026-05-06-unified-intern-record-design.md`** + **`.../plans/2026-05-06-unified-intern-record.md`** — iter 1.5 spec/plan (completed): unified `intern-record.html` + Readiness Assessment removal.
- **`docs/superpowers/specs/2026-05-06-iter2-feedback-and-exit-survey-design.md`** + **`.../plans/2026-05-06-iter2-feedback-and-exit-survey.md`** — iter 2 spec/plan (completed): Participant Feedback + Exit Employer Survey.

Check these before inventing answers about scope, field names, or flows. For production work: design spec + 6 plans are authoritative. For prototype behavior: the App Outline is authoritative for component composition; the PRD covers rules and permissions (with the 3-tier scope expansion noted above).

## Prototype

The selected design direction lives at **`Prototypes/PROTOTYPE/`** — static HTML/CSS with a shared `app.js` module. **No build tooling, no framework, no test runner.** To view:

```bash
# Windows (git bash):
start "" "Prototypes/PROTOTYPE/index.html"
```

### Page inventory (34 pages)

**Public (intern-facing):**
- `index.html` — Landing with hero, program pillars, dual CTA (both routing to the chooser)
- `intern-assessments.html` — Chooser hub with three cards (Personal Goals, Midpoint Reflection, Participant Feedback); status-aware via sessionStorage
- `personal-goals.html` — Free-form Personal Goals assessment (7 textarea questions)
- `midpoint-reflection.html` — Free-form Midpoint Reflection assessment (8 textarea questions)
- `participant-feedback.html` — Mixed-format Participant Feedback assessment (7 questions: radio + Likert + Yes/No + textarea)
- `assessment-confirmation.html` — Post-submit thank-you, parameterized by `?type=personal-goals|midpoint-reflection|participant-feedback|exit-employer-survey`

**Auth:**
- `login.html` — Admin sign-in (demo: any value works, button advances)

**Admin:**
- `admin.html` — Home dashboard with KPIs, quick links, activity feed
- `assessments.html` — Admin Assessments chooser hub: two cards (Competency Assessment, Exit Employer Survey) → intern-picker modal → respective form with `?internId=<id>` pre-filled
- `competency-new.html` / `competency-edit.html` / `competency-detail.html`
- `interns-dashboard.html` — Interns list (Cohorts moved into the new Settings → Employers drill-down)
- `intern-record.html` — Unified intern record (`?id=<internId>` for edit; absent for new). Replaces the old `intern-new.html` and `intern-edit.html`. 6 numbered rubric panels: Personal Information, Internship Details, Entry Assessment, Intern Self-Assessments, Evaluations, Employment Details. Per-intern competency questions moved to Settings → Questions → Competency in sub-project E.
- `settings-employers.html` — Settings landing: list of program partner Employers (parent of Cohorts)
- `settings-employer.html` — Per-employer detail: contact info + cohort list under that employer (`?id=<employerId>` required)
- `settings-employer-form.html` — Unified Employer new+edit form (`?id=<id>` for edit; absent for new)
- `settings-phases.html` — Inline-editable Competency Phases list (Settings → Phases)
- `settings-barriers.html` — Inline-editable Entry Assessment Barriers list (Settings → Barriers)
- `role-new.html` / `role-edit.html` / `role-detail.html` — Per-employer Role records (mirrors the Cohort 3-page pattern). Reached from the Roles section on `settings-employer.html` (`role-new.html?employerId=<id>`, `role-detail.html?id=<roleId>`, `role-edit.html?id=<roleId>`). Fields: Name, Employer (locked dropdown), Description. The detail page also surfaces a "Cohorts using this role" sub-table.
- `settings-program-info.html` — Singleton form for program identity + defaults (Settings → Program Info; sessionStorage-backed). Includes a Danger Zone card with a Reset Demo Data button → modal-confirm → `sessionStorage.clear()` + redirect to `admin.html`, for re-running stakeholder demos from a clean state
- `settings-questions.html` — Question Sets list (Settings → Questions): 4 standard editable sets + a clickable Competency Rubric aggregate row routing to settings-competency.html
- `settings-question-set.html` — Per-set editor with per-question accordion + type-specific config sub-forms
- `settings-competency.html` — 3-tier Competency Questions detail (Settings → Questions → Competency): Core summary card + Cohort Questions table + Intern Questions table
- `competency-cohort-set.html` — Per-cohort competency editor (cohort dropdown + accordion editor) — `?id=<cohortId>` for edit, absent for new
- `competency-intern-set.html` — Per-intern competency editor (intern dropdown + accordion editor) — `?id=<internId>` for edit, absent for new
- `cohort-new.html` / `cohort-edit.html` / `cohort-detail.html`
- `self-assessment-results.html` — legacy admin list of intern self-assessment submissions. **No longer in the admin top nav** (removed for redundancy with the Interns tab); still reachable by URL.
- `self-assessment-detail.html` — type-aware read-only viewer for an intern self-assessment submission. URL contract: `?type=personal-goals|midpoint-reflection|participant-feedback` (required) + `?internId=<id>` (optional, drives the Close button's back-target). Reads the saved payload from `IMPACT.assessmentStatus(type)` and renders the matching question set with answers restored, then disables every input. Reached from the intern record's Self-Assessments panel (each card becomes an `<a>` once the assessment is submitted).
- `exit-employer-survey.html` — Per-intern Exit Employer Survey (admin-completed, editable). URL contract: `?internId=<id>` required.
- `reports.html` — Reports stub with CSS-only bar charts
- `404.html` — Branded not-found page

### Shared module: `app.js`

All admin pages import `app.js`, which provides:
- **Mock dataset** — `IMPACT.EMPLOYERS`, `IMPACT.COHORTS`, `IMPACT.INTERNS`, `IMPACT.COMPETENCY`, `IMPACT.SELF`, `IMPACT.PHASES`, `IMPACT.BARRIERS`, `IMPACT.ROLES`, `IMPACT.QUESTION_SETS`, and the `IMPACT.PROGRAM_INFO` singleton (both sessionStorage-backed). Lookup helpers: `employerById`, `cohortById`, `internById`, `cohortsForEmployer`, `employerNameFor`, `phaseById`, `barrierById`, `roleById`, `rolesForEmployer`, `roleNameFor`, `phasesForCohort`, `questionSetById`, `competencyCoreSet`, `competencyCohortSet`, `competencyInternSet`, `stitchedCompetencyQuestions`, `deleteQuestionSet`. Cohorts reference their parent employer via `cohort.employerId`, their role via `cohort.roleId`, and their applicable phases via the `cohort.phaseIds` array. **Roles are scoped to a parent employer** via `role.employerId` (mirrors the Cohort → Employer relationship); each employer maintains its own role list editable from `settings-employer.html`. Interns store their role via `intern.roleId` (defaults from cohort.roleId on cohort selection in the create form, but can be overridden). The deprecated `IMPACT.INTERN_BARRIERS` (array of strings) is replaced by `IMPACT.BARRIERS` (array of `{id, label}`). Program Info edits persist via `IMPACT.saveProgramInfo(payload)` to sessionStorage; the 4 editable question sets persist via `IMPACT.saveQuestionSet(setId, payload)` (same sessionStorage pattern). The 5 question-bearing forms (Personal Goals, Midpoint Reflection, Participant Feedback, Exit Employer Survey, Competency Rubric) all use the same data-driven `IMPACT.renderQuestion` / `IMPACT.collectAnswers` / `IMPACT.validateAnswers` / `IMPACT.restoreAnswers` helper pipeline. The Competency Rubric stitches 3 tiers (Core program-wide + per-cohort + per-intern) at assessment time, all stored in `IMPACT.QUESTION_SETS`. The 3 competency assessment pages (`competency-new.html`, `competency-edit.html`, `competency-detail.html`) share `IMPACT.appendCompetencySectionHeader(container, label, sub)` to inject section headers between tiers (escapes both args to defend against XSS via cohort/intern names). Competency answers persist via `IMPACT.markAssessmentComplete(IMPACT.ASSESSMENT_TYPES.COMPETENCY, internId, { phase, answers })`.
- **`wireModals()`** — data-open/data-close/Escape modal toggling (also duplicated as inline IIFEs on each page for reliability)
- **`toast(opts)`** — bottom-right notification with kind (success/danger/gold), label, message, auto-dismiss
- **`validate(fieldSpecs)`** — inline form validation (required, SELECT detection, regex patterns)
- **`wireTableFilter(spec)`** — live search/filter on list tables with automatic empty-state row and count update
- **`hydrateInternRecord()`**, **`hydrateCompetencyDetail()`**, **`hydrateCohortDetail()`**, **`hydrateSelfDetail()`** — `?id=` URL param lookup to populate detail/edit pages. `hydrateInternRecord` drives both new and edit modes on `intern-record.html`, including rendering the 12 barrier checkboxes from `IMPACT.BARRIERS` and the Self-Assessments / Evaluations sub-cards.
- **`internsByCohort(cohortId)`** — filter interns by cohort for the enrolled-interns table on cohort-detail
- **`assessmentStatus(type, internId?)`**, **`markAssessmentComplete(type, internId?, payload?)`**, **`formatCompletionDate(date)`**, **`ASSESSMENT_TYPES`** — sessionStorage-backed tracking of assessment completion. Storage key is `impact.assessment.<type>.completedAt` when no internId is passed, `impact.assessment.<type>.<internId>.completedAt` when it is. When a payload is provided the value is JSON `{completedAt, payload}`; without a payload the value is a plain ISO string (backward-compatible). All 4 question-bearing intern/admin assessments now write per-intern: the 3 intern self-assessments call `markAssessmentComplete(type, intern.id, { firstInitial, last, employerId, cohortId, answers })` after the intern is identified upstream on the chooser; Exit Employer Survey calls `markAssessmentComplete('exit-employer-survey', internId, { ... })` from the admin form.
- **`internByIdentity(firstInitial, last, cohortId)`** — case-insensitive composite-key lookup against `IMPACT.INTERNS`. Used by the chooser-page identity gate. Employer is implied by cohort, so it isn't part of the match.
- **`getInternIdentity()` / `setInternIdentity(payload)` / `clearInternIdentity()`** — `localStorage`-backed (key `impact.intern.identity`) so a confirmed intern persists across visits/tabs. Payload shape: `{internId, firstInitial, last, employerId, cohortId}`. The 3 intern self-assessment form pages gate on `getInternIdentity()` and bounce to the chooser if missing. The Reset Demo Data button on Settings → Program Info clears this in addition to `sessionStorage.clear()` so demos start at the gate.

`Prototypes/archive/` (and `archive.zip`) hold discarded earlier design variations. **Don't modify archived files.**

## Brand & style system

Palette values are **sampled directly from pixels in the IMPACT logo** (not estimated). All tokens are CSS custom properties defined in `:root` at the top of `styles.css`.

| Token | Hex | Role |
|---|---|---|
| `--navy` | `#153A98` | Primary brand / "IMPACT" wordmark color |
| `--navy-deep` | `#051028` | Dark-surface backgrounds (nav, footer) |
| `--cyan` | `#00A6F6` | Secondary / info / focus accent |
| `--gold` | `#FFD71F` | Highlight / CTA / active-state |
| `--canvas` | `#EFF1F5` | Body canvas (cool off-white) |

The navbar and footer use the dark surface so the logo's dark-glow bleed blends seamlessly. **Don't place the logo PNG on the light canvas** — the baked-in glow reads as a dirty halo. If a brand mark is needed on a light surface, use a typographic wordmark (Archivo Black, `--navy`) instead of the image.

Fonts (Google Fonts, loaded via `<link>`):
- Display: **Archivo Black**
- Body: **IBM Plex Sans**
- Micro labels / tabular data: **IBM Plex Mono**

### Logo asset

`Prototypes/PROTOTYPE/logo.png` is a tight-cropped PNG derived from `References/IMPACT LOGO.png`. The source has soft glow/blur baked into the artwork — it scales down softly. If a vector/SVG version is provided later, prefer it.

## Product rules to know (from PRD)

- **Two roles only**: Admin (email+password login, full access) and Intern (no login — identified at self-assessment submission by First Initial + Last Name + Employer + Cohort).
- **Unique identifier** across all records: First Initial + Last Name + Employer + Cohort. Cohorts belong to employers, so cohort implies employer for storage; the intern self-id flow asks for both for human disambiguation (employer dropdown filters the cohort dropdown).
- **Minimum-PII policy**: the intern record persists only First Initial + Last Name + Cohort. No first name, date of birth, or zipcode is stored. Admin's create form accepts a "First Name" textbox for usability, but only the initial is saved.
- **Intake**: `intern-record.html` is the canonical creation path for an intern. The previous Readiness Assessment area (`dashboard.html`, `readiness-*.html`) has been removed; intake data is captured directly on the intern record's Entry Assessment panel at creation.
- **Competency phases**: a global, admin-managed list (`IMPACT.PHASES`) defined in Settings → Phases. Each cohort selects a subset (`cohort.phaseIds`) that applies to it. The Competency assessment's Phase dropdown filters to the intern's cohort's phases.
- **Intern assessments (Personal Goals + Midpoint Reflection + Participant Feedback)**: each is one submission per intern, immutable after submit. **Identity is captured upstream once on `intern-assessments.html`** (the chooser page), validated against `IMPACT.INTERNS` via `IMPACT.internByIdentity(firstInitial, last, cohortId)`, and persisted in `localStorage` via `IMPACT.setInternIdentity(payload)` so a confirmed intern doesn't re-identify on every visit. The 3 form pages read the identity via `IMPACT.getInternIdentity()` and bounce back to the chooser if it's missing. The chooser shows per-intern completion status (each card flips to a "Submitted on …" pill if `assessmentStatus(type, intern.id).completed` is true). Personal Goals uses free-form textareas (7 questions); Midpoint Reflection uses free-form textareas (8 questions); Participant Feedback uses mixed-format questions sourced from `Participant Exit Feedback.docx` (radio + Likert + Yes/No + textarea, 7 questions). Admin-side detail viewers reach the per-intern submission via `self-assessment-detail.html?type=<type>&internId=<id>`.
- **Competency rubric**: 3-tier stitched model — program-wide Core (7 Professional Competencies) + optional per-cohort role-specific (keyed `competency-cohort-<cohortId>`, e.g., 4 Medical Assistant skills for Eskenazi) + optional per-intern customization (keyed `competency-intern-<internId>`). All three tiers are authored in Settings → Questions → Competency and stitched at assessment time via `IMPACT.stitchedCompetencyQuestions(internId)`.
- **Interns** (renamed from "Interns"): post-placement outcome tracking with 90-day and 180-day employment checkboxes + notes.
- **Out of scope for v1**: Midpoint Performance Review, employer logins, notifications.

## Interactive features in the prototype

- **Confirmation modals** on all Submit/Save/Delete actions (data-open/data-close pattern)
- **Toast notifications** on confirm (success/danger variant, auto-dismiss 3.2s)
- **Per-row data hydration** — clicking different rows passes `?id=` URL param; detail/edit pages show the correct record
- **Live search/filter** — search inputs and dropdowns filter list tables in real time; count updates; empty-state row when nothing matches
- **Form validation** — required fields + 5-digit zip on all New/Create forms
- **Dynamic row editors** — phase editor + role-specific question editor on cohort forms (Add/Remove with reindexing)
- **Print stylesheet** — `@media print` hides chrome; detail pages print cleanly

## Working conventions

- When tweaking the prototype, update both HTML and `styles.css` — CSS tokens are the primary knob for palette changes; don't hardcode hex values inline.
- New screens should be based on an existing page so the navbar, typography, and button treatments stay consistent.
- Navbar and footer span the full viewport (no max-width container), while body sections use the `.container` class (1240px max-width). That asymmetry is intentional.
- The admin navbar order is: Home · Interns · Assessments · Reports · Settings · admin-chip. Maintain this order when adding pages.
- Modal markup goes AFTER `</footer>` and BEFORE closing `</body>`. The inline IIFE wiring script goes at the very end of the body.
- `app.js` is imported via `<script src="app.js"></script>` on admin pages. Each page also has its own inline modal IIFE for reliability (doesn't depend on app.js load for modal open/close).
- For demo login: any/no credentials work; the Sign In button routes to `admin.html`.

## Git

This is a git repository on branch `main` (renamed from `master` on 2026-05-11). The GitHub remote is `git@github.com:Rapideo/impact-internship-portal.git` — public repo under the Rapideo organization. Branch protection on `main` requires PRs with passing CI; direct pushes are rejected.

**Local working path:** `C:\Projects\impact-internship-portal\` (moved out of OneDrive on 2026-05-11; the OneDrive copy is renamed to `IMPACT Intretnship Assessment Portal _archived_2026-05-11` for a two-week safety net).

**Repo split:** This repo holds the production rebuild. The frozen 34-page prototype lives in a sibling repo at `Rapideo/impact-prototype` (the prototype HTML is mirrored here under `Prototypes/PROTOTYPE/` for reference, and Netlify continues to publish that directory as the prototype preview).

**Workflow + project dashboard:** `https://rapideo.github.io/impact-internship-portal/dev-portal/` — six-tab management-facing artifact (Overview / Phasing / Stack / Supabase / Workflow / Status). Status tab is JSON-driven from `docs/dev-portal/data/status.json`; updated on milestone-close PRs. The bare URL `https://rapideo.github.io/impact-internship-portal/` redirects to `/dev-portal/` via `docs/index.html`.

**Conventions in place:**
- **Conventional Commits** enforced on every commit (commitlint via Husky `commit-msg` hook). Subject ≤ 72 chars.
- **Branch protection on `main`** — no direct pushes; squash-merge PRs only; required status check is the CI workflow.
- **Hook chain:** Husky 9 + commitlint 19 + lint-staged 15. `pre-commit` runs `npx lint-staged` (currently a no-op stub; real Prettier + ESLint wired in sub-project 1). `commit-msg` runs commitlint against the Conventional Commits format.
- **CI:** `.github/workflows/ci.yml` — runs on PRs to `main` and pushes to `main`. Sanity-check stub until sub-project 1 wires in real stages.
- **Netlify** is connected to the GitHub repo; deploy previews on every PR publish `Prototypes/PROTOTYPE/` until sub-project 6 flips the publish-dir cutover to the production app build.

**Workflow spec:** `docs/superpowers/specs/2026-05-11-development-workflow-design.md` is the source of truth for the workflow described above. The corresponding implementation plan is `docs/superpowers/plans/2026-05-11-sub-project-0-project-infrastructure.md`.
