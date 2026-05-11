# Sub-Project 2: Admin Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port every prototype admin page to React Router v7 with a real Postgres backend, so an admin can sign in and run the program: configure employers/cohorts/roles/phases/barriers/program info, create and edit intern records, and view KPIs and recent activity.

**Architecture:** Builds on the sub-project 1 foundation. New code lives under `app/routes/admin.*`, `app/components/`, and `app/lib/`. Each admin route is a RR v7 module: `loader` reads from Drizzle (subject to RLS via the user's Supabase session); `action` writes; the default export renders the page. A small set of shared primitives (`AdminShell`, `Modal`, `ConfirmModal`, `Toast`, `ToastProvider`, `TableFilter`, `formValidate`) backs every page. The 15-table Postgres schema and RLS policies from sub-project 1 are unchanged; this plan only adds CRUD UI, a `requireAdmin(request)` helper, and seed data for runtime KPI counts.

**Tech Stack:** TypeScript 5.7, React Router v7 (framework mode), Drizzle 0.36 + postgres-js 3.4, @supabase/supabase-js 2.46 + @supabase/ssr 0.5, Vite 6, Vitest 2, Playwright 1.49, ESLint 9, Prettier 3.

**Spec:** `docs/superpowers/specs/2026-05-10-production-rebuild-design.md` (sections 2-5, 8.1)

**Working directory for all paths below:** repo root (`IMPACT Internship Assessment Portal/`).

---

## Assumptions from sub-projects 3-6

These contracts are stubbed out in sub-project 2 and filled in by later sub-projects. Sub-project 2 must not break these signatures.

- **Sub-project 3 (Question engine)** will own the Settings → Questions/Competency pages. Sub-project 2 reserves the route slot `/admin/settings/questions` with a "Coming in sub-project 3" placeholder, and the Settings rail's "Assessments" link points to it. The `question_sets` and `questions` tables exist (sub-project 1) but are read-only from sub-project 2's perspective.
- **Sub-project 4 (Assessment forms)** will own all admin assessment pages under `/admin/assessments/*`. Sub-project 2 reserves the route slot `/admin/assessments` with a placeholder, and the navbar's "Assessments" link points to it. The `assessment_submissions` table exists but sub-project 2 only reads `COUNT(*)` from it for the Admin Home KPIs.
- **Sub-project 5 (Employer shell)** owns `/employer/*` (already stubbed in sub-project 1). Sub-project 2 leaves `app/routes/employer.tsx` and `app/routes/employer._index.tsx` untouched.
- **Sub-project 6 (Polish & launch)** owns the Reports page. Sub-project 2 reserves `/admin/reports` with a placeholder and a navbar link.
- The intern-facing `/intern/*` routes (sub-project 4) are independent and untouched.

---

## File Structure

Sub-project 2 creates the following files. Files marked `(stub)` get expanded in later sub-projects.

**Lib additions:**
- `app/lib/admin-guard.server.ts` — `requireAdmin(request)` helper
- `app/lib/format.ts` — `formatDate(iso)`, `formatDateLong(iso)`, `formatPhone(s)`, `slugify(s)`, `initials(s)`
- `app/lib/validation.ts` — `requireString`, `optionalString`, `requireEmail`, `requirePositiveInt`, `requireDate`, `requireUuid` — server-side form validators
- `app/lib/admin-queries.server.ts` — read-side helpers (KPI counts, list joins, lookups by id)

**Components (`app/components/`):**
- `app/components/AdminShell.tsx` — navbar + footer wrapper
- `app/components/AdminNav.tsx` — top nav
- `app/components/AdminFooter.tsx` — footer
- `app/components/PageHead.tsx` — breadcrumb + title + sub
- `app/components/MetaStrip.tsx` — kv strip below page head
- `app/components/SettingsShell.tsx` — settings-rail + main two-column layout
- `app/components/SettingsRail.tsx`
- `app/components/IdentityCard.tsx` — card + header used by forms
- `app/components/RubricPanel.tsx` — numbered panel used by intern record
- `app/components/ActionBar.tsx` — fixed bottom action bar
- `app/components/Modal.tsx` — base modal primitive
- `app/components/ConfirmModal.tsx` — confirmation modal preset
- `app/components/Toast.tsx` + `app/components/ToastProvider.tsx` — toast notifications
- `app/components/TableFilter.tsx` — live filter primitive
- `app/components/FieldError.tsx` — inline form error
- `app/components/RecordLinkCard.tsx` — self-assessments / evaluations panel card
- `app/components/BarrierCheckList.tsx`
- `app/components/PhaseMultiSelect.tsx`
- `app/components/InlineEditableList.tsx` — phases + barriers shared editor
- `app/components/EmptyRow.tsx` — table empty-state row

**Styles (`app/styles/`):**
- `app/styles/admin.css` — admin-only classes lifted from the prototype's `styles.css`
- Extend `app/styles/tokens.css` with `--muted`, `--canvas-alt`, `--rule`, `--gold-soft` if not already there

**Routes (`app/routes/`):**
- `app/routes/admin._index.tsx` — *modify* (replace placeholder)
- `app/routes/admin.interns._index.tsx` — Interns list
- `app/routes/admin.interns.new.tsx` — Create intern
- `app/routes/admin.interns.$internId.tsx` — Edit intern
- `app/routes/admin.assessments._index.tsx` — placeholder for sub-project 4
- `app/routes/admin.reports.tsx` — placeholder for sub-project 6
- `app/routes/admin.settings._index.tsx` — Settings landing
- `app/routes/admin.settings.employers._index.tsx` — Employers list
- `app/routes/admin.settings.employers.new.tsx`
- `app/routes/admin.settings.employers.$employerId._index.tsx` — Employer detail
- `app/routes/admin.settings.employers.$employerId.edit.tsx`
- `app/routes/admin.settings.employers.$employerId.cohorts.new.tsx`
- `app/routes/admin.settings.employers.$employerId.roles.new.tsx`
- `app/routes/admin.settings.cohorts.$cohortId._index.tsx`
- `app/routes/admin.settings.cohorts.$cohortId.edit.tsx`
- `app/routes/admin.settings.roles.$roleId._index.tsx`
- `app/routes/admin.settings.roles.$roleId.edit.tsx`
- `app/routes/admin.settings.phases.tsx`
- `app/routes/admin.settings.barriers.tsx`
- `app/routes/admin.settings.program-info.tsx`
- `app/routes/admin.settings.questions.tsx` — placeholder for sub-project 3
- `app/routes/$.tsx` — 404 catch-all

**Routes table:**
- `app/routes.ts` — *modify* (add the new entries)

**Layout / admin shell:**
- `app/routes/admin.tsx` — *modify* (real nav + footer + ToastProvider)

**Tests (`tests/`):**
- `tests/lib/admin-guard.server.test.ts`
- `tests/lib/format.test.ts`
- `tests/lib/validation.test.ts`
- `tests/lib/admin-queries.server.test.ts`
- `tests/components/Modal.test.tsx`
- `tests/components/TableFilter.test.tsx`
- `tests/components/InlineEditableList.test.tsx`
- `tests/routes/admin._index.test.ts`
- `tests/routes/admin.interns._index.test.ts`
- `tests/routes/admin.interns.new.test.ts`
- `tests/routes/admin.interns.$internId.test.ts`
- `tests/routes/admin.settings.employers._index.test.ts`
- `tests/routes/admin.settings.employers.new.test.ts`
- `tests/routes/admin.settings.employers.$employerId.test.ts`
- `tests/routes/admin.settings.cohorts.new.test.ts`
- `tests/routes/admin.settings.cohorts.$cohortId.test.ts`
- `tests/routes/admin.settings.roles.new.test.ts`
- `tests/routes/admin.settings.roles.$roleId.test.ts`
- `tests/routes/admin.settings.phases.test.ts`
- `tests/routes/admin.settings.barriers.test.ts`
- `tests/routes/admin.settings.program-info.test.ts`
- `tests/e2e/admin-crud.spec.ts` — end-to-end smoke

---

## Pre-flight checklist (before Task 1)

The engineer/agent executing this plan needs:

1. **Sub-project 1 complete and merged** — verify with `git log --oneline | grep "sub-project 1"` and `pnpm test` passes on the current `master`.
2. **Local Postgres reachable** — `npm run db:push` ran clean and `npm run db:seed` populated employers, cohorts, roles, phases, barriers, interns, program_info.
3. **Local admin account exists** — `npm run admin:create -- --email=matthew.smith@rapideo.com` ran in sub-project 1's task 50; you can sign in at `/login` and reach `/admin`.
4. **Browser tab to live prototype** — `Prototypes/PROTOTYPE/admin.html`, `interns-dashboard.html`, `settings-employers.html` open locally so you can compare visual output as you build.

---

## Phase A: Shared admin shell (nav, footer, page-head, settings rail)

The prototype's chrome lives in every admin HTML page. We extract it once.

### Task 1: Lift admin CSS from prototype into `app/styles/admin.css`

**Files:**
- Create: `app/styles/admin.css`
- Modify: `app/root.tsx` (import the new stylesheet)

- [ ] **Step 1: Create `app/styles/admin.css`**

  Copy the following class definitions verbatim from `Prototypes/PROTOTYPE/styles.css`. Use the prototype's source-of-truth values; do not redesign. The block below lists the class selectors to pull. After lifting, run `npm run dev` and visually compare a prototype page to your styled route to confirm tokens line up.

  ```css
  /* Layout primitives */
  .container { max-width: 1240px; margin: 0 auto; padding: 0 24px; }

  /* Nav */
  .nav { background: var(--navy-deep); color: #fff; }
  .nav__inner { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; max-width: none; }
  .nav__links { display: flex; align-items: center; gap: 24px; }
  .nav__link { color: rgba(255,255,255,0.78); text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 0.02em; }
  .nav__link:hover { color: var(--gold); }
  .nav__link--active { color: var(--gold); }
  .wordmark__img { height: 32px; display: block; }

  /* Admin chip */
  .admin-chip { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; color: rgba(255,255,255,0.9); font-size: 13px; }
  .admin-chip__avatar { width: 22px; height: 22px; border-radius: 50%; background: var(--gold); color: var(--navy-deep); display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
  .admin-chip__divider { width: 1px; height: 14px; background: rgba(255,255,255,0.18); }
  .admin-chip__logout { color: rgba(255,255,255,0.78); text-decoration: none; font-size: 13px; }
  .admin-chip__logout:hover { color: var(--gold); }

  /* Page head */
  .page-head { padding: 32px 0 24px; }
  .page-head__breadcrumb { margin-bottom: 12px; }
  .page-head__row { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
  .page-head__title { font-family: 'Archivo Black', sans-serif; font-size: 48px; line-height: 1.05; margin: 0; color: var(--navy); }
  .page-head__sub { color: var(--muted); margin: 8px 0 0; max-width: 60ch; }

  /* Micro labels */
  .micro-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .mono { font-family: 'IBM Plex Mono', monospace; }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 6px; font-weight: 600; font-size: 14px; text-decoration: none; cursor: pointer; border: 1px solid transparent; background: transparent; color: inherit; }
  .btn--primary { background: var(--navy); border-color: var(--navy); color: #fff; }
  .btn--primary:hover { background: var(--navy-deep); border-color: var(--navy-deep); }
  .btn--outline { border-color: var(--rule); color: var(--ink); }
  .btn--outline:hover { background: var(--canvas-alt); }
  .btn--danger { background: #B3261E; border-color: #B3261E; color: #fff; }
  .btn--sm { padding: 6px 10px; font-size: 13px; }
  .btn__arrow { font-weight: 700; }

  /* KPI grid */
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0 40px; }
  .kpi-card { padding: 22px 24px; border-radius: 10px; background: #fff; border: 1px solid var(--rule); }
  .kpi-card__label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .kpi-card__value { font-family: 'Archivo Black', sans-serif; font-size: 56px; color: var(--navy); margin-top: 8px; line-height: 1; }
  .kpi-card__delta { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-top: 8px; display: block; }
  .kpi-card--cyan .kpi-card__value { color: var(--cyan); }
  .kpi-card--success .kpi-card__value { color: #1F8A3B; }

  /* Quick links */
  .quick-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 12px 0 40px; }
  .quick-link { display: flex; justify-content: space-between; padding: 18px 22px; background: #fff; border: 1px solid var(--rule); border-radius: 10px; color: var(--navy); font-weight: 600; text-decoration: none; }
  .quick-link:hover { background: var(--canvas-alt); }

  /* Activity */
  .activity-list { background: #fff; border: 1px solid var(--rule); border-radius: 10px; overflow: hidden; }
  .activity-row { display: flex; justify-content: space-between; padding: 14px 22px; border-top: 1px solid var(--rule); font-size: 14px; }
  .activity-row:first-child { border-top: 0; }
  .activity-row__time { font-family: 'IBM Plex Mono', monospace; color: var(--muted); font-size: 12px; }

  /* Detail header */
  .detail-header { display: flex; justify-content: space-between; align-items: center; margin: 32px 0 12px; }
  .detail-header__title { font-family: 'Archivo Black', sans-serif; font-size: 22px; color: var(--navy); margin: 0; }

  /* Tables */
  .assessments { width: 100%; background: #fff; border: 1px solid var(--rule); border-radius: 10px; border-collapse: separate; border-spacing: 0; overflow: hidden; }
  .assessments th { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--rule); background: var(--canvas-alt); }
  .assessments td { padding: 14px 16px; border-bottom: 1px solid var(--rule); font-size: 14px; }
  .assessments tbody tr:last-child td { border-bottom: 0; }
  .col-name { display: flex; align-items: center; gap: 10px; font-weight: 600; }
  .name-initial { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: var(--canvas-alt); color: var(--navy); font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 12px; }
  .col-cohort, .col-date { color: var(--muted); }
  .col-phase { display: inline-block; padding: 3px 9px; border-radius: 999px; background: var(--canvas-alt); font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
  .col-actions { display: flex; gap: 12px; }
  .action-link { color: var(--navy); text-decoration: none; font-weight: 600; font-size: 13px; }
  .action-link--danger { color: #B3261E; }
  .empty-cell { text-align: center; color: var(--muted); padding: 22px; }
  .table-meta { display: flex; justify-content: space-between; margin-bottom: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--muted); }
  .table-meta__count strong { color: var(--ink); font-weight: 700; }

  /* Pills */
  .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
  .pill--tracked { background: var(--canvas-alt); color: var(--muted); }
  .pill--employed-90 { background: #E6F4EA; color: #1F8A3B; }
  .pill--employed-180 { background: var(--gold-soft); color: #6A4F00; }

  /* Filters */
  .filters { display: flex; gap: 14px; align-items: end; margin: 8px 0 18px; flex-wrap: wrap; }
  .filter-group { display: flex; flex-direction: column; gap: 4px; }
  .filter-group__label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .input, .select, .textarea { font-family: 'IBM Plex Sans', sans-serif; font-size: 14px; padding: 10px 12px; border: 1px solid var(--rule); border-radius: 6px; background: #fff; color: var(--ink); }
  .input--search { min-width: 280px; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .field--error .input, .field--error .select, .field--error .textarea { border-color: #B3261E; }
  .field__error { color: #B3261E; font-size: 12px; }
  .input--error { border-color: #B3261E; }

  /* Settings shell */
  .settings-shell { display: grid; grid-template-columns: 220px 1fr; gap: 32px; margin: 8px 0 60px; }
  .settings-rail { display: flex; flex-direction: column; gap: 4px; }
  .settings-rail__group { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); padding: 8px 10px; }
  .settings-rail__item { padding: 8px 10px; border-radius: 6px; color: var(--ink); text-decoration: none; font-size: 14px; }
  .settings-rail__item:hover { background: var(--canvas-alt); }
  .settings-rail__item--active { background: var(--navy); color: #fff; }

  /* Meta strip */
  .meta-strip { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 12px; padding: 12px 16px; background: #fff; border: 1px solid var(--rule); border-radius: 8px; }
  .meta-strip__item { display: flex; flex-direction: column; gap: 2px; }
  .meta-strip__label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .meta-strip__value { font-size: 14px; font-weight: 600; }

  /* Rubric panel (intern record) */
  .rubric { display: flex; flex-direction: column; gap: 16px; }
  .rubric-panel { background: #fff; border: 1px solid var(--rule); border-radius: 10px; }
  .rubric-panel__head { display: flex; gap: 14px; padding: 18px 24px; border-bottom: 1px solid var(--rule); }
  .rubric-panel__num { font-family: 'IBM Plex Mono', monospace; font-weight: 700; color: var(--cyan); padding-top: 2px; }
  .rubric-panel__title { font-family: 'Archivo Black', sans-serif; font-size: 18px; color: var(--navy); margin: 0; }
  .rubric-panel__meta { font-size: 13px; color: var(--muted); display: block; }

  /* ID grid */
  .id-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .id-grid--4 { grid-template-columns: repeat(4, 1fr); }
  .id-grid--5 { grid-template-columns: repeat(5, 1fr); }

  /* Identity card */
  .identity-card { background: #fff; border: 1px solid var(--rule); border-radius: 10px; padding: 22px 28px; }
  .identity-card__head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 18px; }
  .identity-card__title { font-family: 'Archivo Black', sans-serif; font-size: 20px; color: var(--navy); margin: 0; }

  /* Action bar */
  .action-bar { position: sticky; bottom: 0; background: #fff; border-top: 1px solid var(--rule); margin-top: 32px; }
  .action-bar__inner { max-width: 1240px; margin: 0 auto; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  .action-bar__buttons { display: flex; gap: 10px; }

  /* Modal */
  .modal { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 50; }
  .modal__overlay { position: absolute; inset: 0; background: rgba(5, 16, 40, 0.5); }
  .modal__card { position: relative; background: #fff; border-radius: 12px; padding: 26px 28px; max-width: 480px; width: 90%; box-shadow: 0 24px 48px rgba(0,0,0,0.18); }
  .modal__card--danger { border-top: 4px solid #B3261E; }
  .modal__card--success { border-top: 4px solid var(--navy); }
  .modal__label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .modal__title { font-family: 'Archivo Black', sans-serif; font-size: 20px; margin: 6px 0 10px; color: var(--navy); }
  .modal__body { color: var(--muted); margin: 0 0 18px; line-height: 1.5; }
  .modal__actions { display: flex; gap: 10px; justify-content: flex-end; }

  /* Toast */
  .toast-stack { position: fixed; right: 24px; bottom: 24px; display: flex; flex-direction: column; gap: 10px; z-index: 60; }
  .toast { background: #fff; border: 1px solid var(--rule); border-left: 4px solid var(--navy); padding: 12px 16px; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); min-width: 260px; font-size: 14px; }
  .toast__label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 4px; }
  .toast--success { border-left-color: var(--navy); }
  .toast--danger { border-left-color: #B3261E; }
  .toast--gold { border-left-color: var(--gold); }

  /* Outcome check */
  .outcome-check { display: flex; align-items: center; gap: 10px; padding: 10px 28px; }
  .outcome-check__hint { color: var(--muted); font-size: 12px; }

  /* Barrier list */
  .barrier-check-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; padding: 14px 24px; }

  /* Settings list (inline editable) */
  .settings-list { display: flex; flex-direction: column; gap: 6px; }
  .settings-list__row { display: grid; grid-template-columns: 90px 1fr 40px; gap: 8px; align-items: center; padding: 8px 12px; background: #fff; border: 1px solid var(--rule); border-radius: 8px; }
  .settings-list__handle-btn { background: transparent; border: 1px solid var(--rule); border-radius: 6px; padding: 2px 8px; cursor: pointer; }
  .settings-list__handle-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .settings-list__label-input { width: 100%; padding: 8px 10px; border: 1px solid var(--rule); border-radius: 6px; font-size: 14px; }
  .settings-list__remove-btn { background: transparent; border: 0; cursor: pointer; color: #B3261E; font-size: 20px; }
  .settings-list__add { margin-top: 10px; background: transparent; border: 1px dashed var(--rule); padding: 10px; border-radius: 8px; cursor: pointer; color: var(--navy); font-weight: 600; }

  /* Phase multi select */
  .phase-multi-select { border: 1px solid var(--rule); border-radius: 10px; padding: 16px 20px; background: #fff; }
  .phase-multi-select legend { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); padding: 0 8px; }
  .phase-multi-select__item { display: inline-flex; align-items: center; gap: 8px; margin-right: 18px; padding: 6px 0; }

  /* Record-link cards */
  .record-link-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .record-link { background: #fff; border: 1px solid var(--rule); border-radius: 10px; padding: 14px 16px; text-decoration: none; color: var(--ink); display: flex; flex-direction: column; gap: 8px; }
  .record-link--placeholder { background: var(--canvas-alt); color: var(--muted); }
  .record-link__head { display: flex; flex-direction: column; gap: 2px; }
  .record-link__label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .record-link__title { font-weight: 700; color: var(--navy); }
  .record-link__status { font-size: 12px; color: var(--muted); }

  /* Footer */
  .footer { background: var(--navy-deep); color: rgba(255,255,255,0.75); padding: 28px 0; margin-top: 60px; }
  .footer__row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  .footer__links { display: flex; gap: 16px; }
  .footer__links a { color: rgba(255,255,255,0.78); text-decoration: none; font-size: 14px; }
  .footer__meta { font-family: 'IBM Plex Mono', monospace; font-size: 12px; }

  /* Prose card */
  .prose-card { background: #fff; border: 1px solid var(--rule); border-radius: 10px; padding: 22px 28px; }
  .prose-card__label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
  .prose-card__body { margin: 8px 0 0; line-height: 1.5; }
  ```

- [ ] **Step 2: Import the stylesheet from `app/root.tsx`**

  Append to the existing `links` export in `app/root.tsx`:

  ```ts
  import adminCss from './styles/admin.css?url';

  export const links: Route.LinksFunction = () => [
    // ...existing entries from sub-project 1
    { rel: 'stylesheet', href: adminCss },
  ];
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/styles/admin.css app/root.tsx
  git commit -m "feat(admin): lift admin chrome styles from prototype"
  ```

### Task 2: Write `requireAdmin(request)` helper — TDD

**Files:**
- Create: `app/lib/admin-guard.server.ts`
- Create: `tests/lib/admin-guard.server.test.ts`

- [ ] **Step 1: Write the failing test**

  `tests/lib/admin-guard.server.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import * as authMod from '~/lib/auth.server';

  describe('requireAdmin', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('returns auth context when user is admin', async () => {
      vi.spyOn(authMod, 'getAuthContext').mockResolvedValue({ role: 'admin', employerId: null });
      const req = new Request('https://x.test/admin');
      const { auth, headers } = await requireAdmin(req);
      expect(auth).toEqual({ role: 'admin', employerId: null });
      expect(headers).toBeInstanceOf(Headers);
    });

    it('throws a redirect to /login when no session', async () => {
      vi.spyOn(authMod, 'getAuthContext').mockResolvedValue(null);
      const req = new Request('https://x.test/admin');
      await expect(requireAdmin(req)).rejects.toMatchObject({
        status: 302,
        headers: expect.any(Headers),
      });
      try {
        await requireAdmin(req);
      } catch (e) {
        const r = e as Response;
        expect(r.headers.get('Location')).toBe('/login');
      }
    });

    it('throws a redirect to /employer when role is employer', async () => {
      vi.spyOn(authMod, 'getAuthContext').mockResolvedValue({ role: 'employer', employerId: 'e1' });
      const req = new Request('https://x.test/admin');
      try {
        await requireAdmin(req);
        throw new Error('expected redirect');
      } catch (e) {
        const r = e as Response;
        expect(r.status).toBe(302);
        expect(r.headers.get('Location')).toBe('/employer');
      }
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin-guard
  ```

  Expected: FAIL — `Cannot find module '~/lib/admin-guard.server'`.

- [ ] **Step 3: Implement**

  `app/lib/admin-guard.server.ts`:

  ```ts
  import { redirect } from 'react-router';
  import { getAuthContext, type AuthContext } from './auth.server';

  /**
   * Server-side guard for /admin/* routes. Returns the auth context if
   * the current session is an admin. Throws a redirect Response if not
   * (anonymous → /login; employer → /employer).
   *
   * The returned `headers` object is the one passed to getAuthContext —
   * the loader/action must include it in any Response/redirect it
   * eventually returns so that refreshed Supabase cookies are sent.
   */
  export async function requireAdmin(
    request: Request,
  ): Promise<{ auth: AuthContext; headers: Headers }> {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth) {
      throw redirect('/login', { headers });
    }
    if (auth.role !== 'admin') {
      throw redirect('/employer', { headers });
    }
    return { auth, headers };
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- admin-guard
  ```

  Expected: 3 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add app/lib/admin-guard.server.ts tests/lib/admin-guard.server.test.ts
  git commit -m "feat(admin): add requireAdmin guard helper"
  ```

### Task 3: Build the `<AdminNav>` and `<AdminFooter>` components

**Files:**
- Create: `app/components/AdminNav.tsx`
- Create: `app/components/AdminFooter.tsx`

- [ ] **Step 1: Create `app/components/AdminNav.tsx`**

  ```tsx
  import { Form, NavLink } from 'react-router';

  type AdminTab = 'home' | 'interns' | 'assessments' | 'reports' | 'settings';

  export interface AdminNavProps {
    active: AdminTab;
    userEmail: string;
  }

  function isActive(active: AdminTab, tab: AdminTab) {
    return active === tab ? 'nav__link nav__link--active' : 'nav__link';
  }

  export function AdminNav({ active, userEmail }: AdminNavProps) {
    const avatarInitial = (userEmail[0] ?? 'A').toUpperCase();
    return (
      <header className="nav">
        <div className="nav__inner">
          <NavLink to="/admin" className="wordmark" aria-label="IMPACT — Expand Your Opportunities">
            <img src="/logo.png" alt="IMPACT — Expand Your Opportunities" className="wordmark__img" />
          </NavLink>
          <nav className="nav__links">
            <NavLink to="/admin" end className={() => isActive(active, 'home')}>Home</NavLink>
            <NavLink to="/admin/interns" className={() => isActive(active, 'interns')}>Interns</NavLink>
            <NavLink to="/admin/assessments" className={() => isActive(active, 'assessments')}>Assessments</NavLink>
            <NavLink to="/admin/reports" className={() => isActive(active, 'reports')}>Reports</NavLink>
            <NavLink to="/admin/settings" className={() => isActive(active, 'settings')}>Settings</NavLink>
            <span className="admin-chip">
              <span className="admin-chip__avatar">{avatarInitial}</span>
              {userEmail}
              <span className="admin-chip__divider"></span>
              <Form method="post" action="/sign-out" style={{ display: 'inline' }}>
                <button type="submit" className="admin-chip__logout" style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}>
                  Logout
                </button>
              </Form>
            </span>
          </nav>
        </div>
      </header>
    );
  }
  ```

- [ ] **Step 2: Create `app/components/AdminFooter.tsx`**

  ```tsx
  import { Link } from 'react-router';

  export function AdminFooter() {
    return (
      <footer className="footer">
        <div className="container footer__row">
          <Link to="/admin" className="wordmark" aria-label="IMPACT — Expand Your Opportunities">
            <img src="/logo.png" alt="IMPACT — Expand Your Opportunities" className="wordmark__img" />
          </Link>
          <div className="footer__links">
            <Link to="/admin/assessments">Assessments</Link>
            <Link to="/admin/interns">Interns</Link>
          </div>
          <div className="footer__meta">&copy; 2026 IMPACT / Indiana</div>
        </div>
      </footer>
    );
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/components/AdminNav.tsx app/components/AdminFooter.tsx
  git commit -m "feat(admin): add AdminNav + AdminFooter components"
  ```

### Task 4: Rebuild `app/routes/admin.tsx` with real shell + ToastProvider

**Files:**
- Modify: `app/routes/admin.tsx` (replace placeholder from sub-project 1)
- Create: `app/components/ToastProvider.tsx`
- Create: `app/components/Toast.tsx`

- [ ] **Step 1: Create `app/components/Toast.tsx`**

  ```tsx
  export type ToastKind = 'success' | 'danger' | 'gold' | 'info';

  export interface ToastMessage {
    id: string;
    kind: ToastKind;
    label: string;
    message: string;
  }

  export function ToastView({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
    return (
      <div className={`toast toast--${toast.kind}`} role="status" onClick={() => onDismiss(toast.id)}>
        <span className="toast__label">{toast.label}</span>
        {toast.message}
      </div>
    );
  }
  ```

- [ ] **Step 2: Create `app/components/ToastProvider.tsx`**

  ```tsx
  import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
  import { ToastView, type ToastKind, type ToastMessage } from './Toast';

  interface ToastApi {
    show: (opts: { kind: ToastKind; label: string; message: string }) => void;
  }

  const ToastCtx = createContext<ToastApi | null>(null);

  export function useToast(): ToastApi {
    const ctx = useContext(ToastCtx);
    if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
    return ctx;
  }

  export function ToastProvider({ children, initial }: { children: ReactNode; initial?: ToastMessage[] }) {
    const [items, setItems] = useState<ToastMessage[]>(initial ?? []);
    const counter = useRef(0);

    const dismiss = useCallback((id: string) => {
      setItems((xs) => xs.filter((t) => t.id !== id));
    }, []);

    const show = useCallback<ToastApi['show']>((opts) => {
      counter.current += 1;
      const id = `t${Date.now()}-${counter.current}`;
      setItems((xs) => [...xs, { id, ...opts }]);
      setTimeout(() => dismiss(id), 3200);
    }, [dismiss]);

    useEffect(() => {
      // No setup beyond timers above; placeholder for future global listeners.
    }, []);

    return (
      <ToastCtx.Provider value={{ show }}>
        {children}
        <div className="toast-stack" aria-live="polite">
          {items.map((t) => (
            <ToastView key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      </ToastCtx.Provider>
    );
  }
  ```

- [ ] **Step 3: Replace `app/routes/admin.tsx`**

  ```tsx
  import { Outlet, useLoaderData, useLocation } from 'react-router';
  import type { Route } from './+types/admin';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { createSupabaseServerClient } from '~/lib/auth.server';
  import { AdminNav } from '~/components/AdminNav';
  import { AdminFooter } from '~/components/AdminFooter';
  import { ToastProvider } from '~/components/ToastProvider';

  export async function loader({ request }: Route.LoaderArgs) {
    const { auth, headers } = await requireAdmin(request);
    const supabase = createSupabaseServerClient(request, headers);
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email ?? 'admin@impact';
    return Response.json({ auth, email }, { headers });
  }

  function activeTab(pathname: string): 'home' | 'interns' | 'assessments' | 'reports' | 'settings' {
    if (pathname.startsWith('/admin/interns')) return 'interns';
    if (pathname.startsWith('/admin/assessments')) return 'assessments';
    if (pathname.startsWith('/admin/reports')) return 'reports';
    if (pathname.startsWith('/admin/settings')) return 'settings';
    return 'home';
  }

  export default function AdminLayout() {
    const { email } = useLoaderData<typeof loader>();
    const { pathname } = useLocation();
    return (
      <ToastProvider>
        <AdminNav active={activeTab(pathname)} userEmail={email} />
        <Outlet />
        <AdminFooter />
      </ToastProvider>
    );
  }
  ```

- [ ] **Step 4: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.tsx app/components/Toast.tsx app/components/ToastProvider.tsx
  git commit -m "feat(admin): wire real admin shell with toast provider"
  ```

### Task 5: Build `<PageHead>`, `<MetaStrip>`, `<SettingsRail>`, `<SettingsShell>`, `<IdentityCard>`, `<ActionBar>`, `<RubricPanel>`, `<EmptyRow>`

**Files:**
- Create: `app/components/PageHead.tsx`
- Create: `app/components/MetaStrip.tsx`
- Create: `app/components/SettingsRail.tsx`
- Create: `app/components/SettingsShell.tsx`
- Create: `app/components/IdentityCard.tsx`
- Create: `app/components/ActionBar.tsx`
- Create: `app/components/RubricPanel.tsx`
- Create: `app/components/EmptyRow.tsx`

- [ ] **Step 1: Create the components**

  `app/components/PageHead.tsx`:

  ```tsx
  import type { ReactNode } from 'react';

  export function PageHead({
    breadcrumb,
    title,
    sub,
    actions,
    children,
  }: {
    breadcrumb: ReactNode;
    title: string;
    sub?: ReactNode;
    actions?: ReactNode;
    children?: ReactNode;
  }) {
    return (
      <section className="page-head">
        <div className="container">
          <div className="page-head__breadcrumb">
            <span className="micro-label">{breadcrumb}</span>
          </div>
          <div className="page-head__row">
            <div>
              <h1 className="page-head__title">{title}</h1>
              {sub ? <p className="page-head__sub">{sub}</p> : null}
            </div>
            {actions}
          </div>
          {children}
        </div>
      </section>
    );
  }
  ```

  `app/components/MetaStrip.tsx`:

  ```tsx
  export interface MetaItem {
    label: string;
    value: string;
    mono?: boolean;
  }

  export function MetaStrip({ items }: { items: MetaItem[] }) {
    return (
      <div className="meta-strip">
        {items.map((it) => (
          <div className="meta-strip__item" key={it.label}>
            <span className="meta-strip__label">{it.label}</span>
            <span className={`meta-strip__value${it.mono ? ' mono' : ''}`}>{it.value || '—'}</span>
          </div>
        ))}
      </div>
    );
  }
  ```

  `app/components/SettingsRail.tsx`:

  ```tsx
  import { NavLink } from 'react-router';

  export type SettingsTab =
    | 'employers'
    | 'questions'
    | 'phases'
    | 'barriers'
    | 'program-info';

  const ITEMS: Array<{ tab: SettingsTab; to: string; label: string }> = [
    { tab: 'employers', to: '/admin/settings/employers', label: 'Employers' },
    { tab: 'questions', to: '/admin/settings/questions', label: 'Assessments' },
    { tab: 'phases', to: '/admin/settings/phases', label: 'Assessment Phases' },
    { tab: 'barriers', to: '/admin/settings/barriers', label: 'Barriers' },
    { tab: 'program-info', to: '/admin/settings/program-info', label: 'Program Info' },
  ];

  export function SettingsRail({ active }: { active: SettingsTab }) {
    return (
      <aside className="settings-rail">
        <span className="settings-rail__group">Settings</span>
        {ITEMS.map((it) => (
          <NavLink
            key={it.tab}
            to={it.to}
            className={() => `settings-rail__item${active === it.tab ? ' settings-rail__item--active' : ''}`}
          >
            {it.label}
          </NavLink>
        ))}
      </aside>
    );
  }
  ```

  `app/components/SettingsShell.tsx`:

  ```tsx
  import type { ReactNode } from 'react';
  import { SettingsRail, type SettingsTab } from './SettingsRail';

  export function SettingsShell({ active, children }: { active: SettingsTab; children: ReactNode }) {
    return (
      <section className="container">
        <div className="settings-shell">
          <SettingsRail active={active} />
          <main>{children}</main>
        </div>
      </section>
    );
  }
  ```

  `app/components/IdentityCard.tsx`:

  ```tsx
  import type { ReactNode } from 'react';

  export function IdentityCard({
    title,
    subnote,
    children,
  }: {
    title: string;
    subnote: string;
    children: ReactNode;
  }) {
    return (
      <article className="identity-card">
        <div className="identity-card__head">
          <h2 className="identity-card__title">{title}</h2>
          <span className="micro-label">{subnote}</span>
        </div>
        {children}
      </article>
    );
  }
  ```

  `app/components/ActionBar.tsx`:

  ```tsx
  import type { ReactNode } from 'react';

  export function ActionBar({ status, children }: { status: string; children: ReactNode }) {
    return (
      <div className="action-bar">
        <div className="action-bar__inner">
          <div className="action-bar__status">
            <span className="mono" style={{ color: 'var(--navy)' }}>{status}</span>
          </div>
          <div className="action-bar__buttons">{children}</div>
        </div>
      </div>
    );
  }
  ```

  `app/components/RubricPanel.tsx`:

  ```tsx
  import type { ReactNode } from 'react';

  export function RubricPanel({
    num,
    title,
    meta,
    hidden,
    children,
  }: {
    num: string;
    title: string;
    meta?: string;
    hidden?: boolean;
    children: ReactNode;
  }) {
    if (hidden) return null;
    return (
      <article className="rubric-panel">
        <header className="rubric-panel__head">
          <span className="rubric-panel__num">{num}</span>
          <div>
            <h3 className="rubric-panel__title">{title}</h3>
            {meta ? <span className="rubric-panel__meta">{meta}</span> : null}
          </div>
        </header>
        {children}
      </article>
    );
  }
  ```

  `app/components/EmptyRow.tsx`:

  ```tsx
  export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
    return (
      <tr>
        <td colSpan={colSpan} className="empty-cell">{message}</td>
      </tr>
    );
  }
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add app/components/
  git commit -m "feat(admin): add shell primitives (PageHead, MetaStrip, SettingsShell, IdentityCard, ActionBar, RubricPanel, EmptyRow)"
  ```

### Task 6: Build the `<Modal>` + `<ConfirmModal>` primitive — TDD

**Files:**
- Create: `app/components/Modal.tsx`
- Create: `app/components/ConfirmModal.tsx`
- Create: `tests/components/Modal.test.tsx`

- [ ] **Step 1: Write the failing test**

  `tests/components/Modal.test.tsx`:

  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, fireEvent } from '@testing-library/react';
  import { Modal } from '~/components/Modal';

  describe('Modal', () => {
    it('renders null when closed', () => {
      const { container } = render(<Modal open={false} onClose={() => {}} labelledBy="t"><div>x</div></Modal>);
      expect(container.firstChild).toBeNull();
    });

    it('renders children when open', () => {
      render(
        <Modal open onClose={() => {}} labelledBy="t">
          <h3 id="t">My modal</h3>
        </Modal>
      );
      expect(screen.getByText('My modal')).toBeInTheDocument();
    });

    it('closes on overlay click', () => {
      const onClose = vi.fn();
      const { container } = render(
        <Modal open onClose={onClose} labelledBy="t">
          <h3 id="t">My modal</h3>
        </Modal>
      );
      const overlay = container.querySelector('.modal__overlay')!;
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes on Escape', () => {
      const onClose = vi.fn();
      render(
        <Modal open onClose={onClose} labelledBy="t">
          <h3 id="t">My modal</h3>
        </Modal>
      );
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- Modal
  ```

  Expected: FAIL — `Cannot find module '~/components/Modal'`.

- [ ] **Step 3: Implement**

  `app/components/Modal.tsx`:

  ```tsx
  import { useEffect, type ReactNode } from 'react';

  export interface ModalProps {
    open: boolean;
    onClose: () => void;
    labelledBy: string;
    variant?: 'default' | 'danger' | 'success';
    children: ReactNode;
  }

  export function Modal({ open, onClose, labelledBy, variant = 'default', children }: ModalProps) {
    useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    const cardClass =
      variant === 'danger' ? 'modal__card modal__card--danger'
      : variant === 'success' ? 'modal__card modal__card--success'
      : 'modal__card';

    return (
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <div className="modal__overlay" onClick={onClose} />
        <div className={cardClass}>{children}</div>
      </div>
    );
  }
  ```

  `app/components/ConfirmModal.tsx`:

  ```tsx
  import { Modal, type ModalProps } from './Modal';

  export interface ConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    label: string;
    title: string;
    body: string;
    confirmText: string;
    cancelText?: string;
    variant?: ModalProps['variant'];
  }

  export function ConfirmModal({
    open, onClose, onConfirm, label, title, body, confirmText, cancelText = 'Cancel', variant = 'default',
  }: ConfirmModalProps) {
    const titleId = `confirm-title-${label.replace(/\W+/g, '-').toLowerCase()}`;
    const confirmClass = variant === 'danger' ? 'btn btn--danger' : 'btn btn--primary';
    return (
      <Modal open={open} onClose={onClose} labelledBy={titleId} variant={variant}>
        <span className="modal__label">{label}</span>
        <h3 className="modal__title" id={titleId}>{title}</h3>
        <p className="modal__body">{body}</p>
        <div className="modal__actions">
          <button type="button" className="btn btn--outline" onClick={onClose}>{cancelText}</button>
          <button type="button" className={confirmClass} onClick={onConfirm}>{confirmText}</button>
        </div>
      </Modal>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- Modal
  ```

  Expected: 4 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add app/components/Modal.tsx app/components/ConfirmModal.tsx tests/components/Modal.test.tsx
  git commit -m "feat(admin): add Modal and ConfirmModal primitives with tests"
  ```

### Task 7: Build `<TableFilter>` primitive — TDD

**Files:**
- Create: `app/components/TableFilter.tsx`
- Create: `tests/components/TableFilter.test.tsx`

- [ ] **Step 1: Write the failing test**

  `tests/components/TableFilter.test.tsx`:

  ```tsx
  import { describe, it, expect } from 'vitest';
  import { render, screen, fireEvent, within } from '@testing-library/react';
  import { useState } from 'react';
  import { TableFilter } from '~/components/TableFilter';

  interface Row { id: string; name: string; cohort: string }

  function Harness() {
    const [search, setSearch] = useState('');
    const [cohort, setCohort] = useState('all');
    const rows: Row[] = [
      { id: '1', name: 'M. Bayer', cohort: 'Eskenazi 2026' },
      { id: '2', name: 'D. Clark', cohort: 'TTT 2026' },
    ];
    const filtered = rows.filter((r) => {
      const txt = (r.name + ' ' + r.cohort).toLowerCase();
      if (search && !txt.includes(search.toLowerCase())) return false;
      if (cohort !== 'all' && r.cohort !== cohort) return false;
      return true;
    });
    return (
      <TableFilter
        countLabel="Active interns"
        count={filtered.length}
        inputs={
          <>
            <input aria-label="search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select aria-label="cohort" value={cohort} onChange={(e) => setCohort(e.target.value)}>
              <option value="all">All cohorts</option>
              <option value="Eskenazi 2026">Eskenazi 2026</option>
              <option value="TTT 2026">TTT 2026</option>
            </select>
          </>
        }
      >
        <table>
          <thead><tr><th>Name</th><th>Cohort</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={2}>No records match the current filters.</td></tr> : filtered.map(r => (
              <tr key={r.id}><td>{r.name}</td><td>{r.cohort}</td></tr>
            ))}
          </tbody>
        </table>
      </TableFilter>
    );
  }

  describe('TableFilter', () => {
    it('renders count and inputs', () => {
      render(<Harness />);
      expect(screen.getByText(/02/)).toBeInTheDocument();
      expect(screen.getByText('Active interns', { exact: false })).toBeInTheDocument();
    });

    it('updates count on filter change', () => {
      render(<Harness />);
      fireEvent.change(screen.getByLabelText('search'), { target: { value: 'clark' } });
      expect(screen.getByText(/01/)).toBeInTheDocument();
    });

    it('shows empty-state row when no matches', () => {
      render(<Harness />);
      fireEvent.change(screen.getByLabelText('search'), { target: { value: 'nonexistent' } });
      expect(screen.getByText('No records match the current filters.')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- TableFilter
  ```

  Expected: FAIL.

- [ ] **Step 3: Implement**

  `app/components/TableFilter.tsx`:

  ```tsx
  import type { ReactNode } from 'react';

  export function TableFilter({
    countLabel,
    count,
    inputs,
    rightAside,
    children,
  }: {
    countLabel: string;
    count: number;
    inputs: ReactNode;
    rightAside?: ReactNode;
    children: ReactNode;
  }) {
    const countStr = String(count).padStart(2, '0');
    return (
      <>
        <div className="filters">{inputs}</div>
        <div className="table-wrap">
          <div className="table-meta">
            <span className="table-meta__count">
              <strong>{countStr}</strong> &nbsp;/&nbsp; {countLabel}
            </span>
            {rightAside ? <span className="table-meta__sort">{rightAside}</span> : null}
          </div>
          {children}
        </div>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- TableFilter
  ```

  Expected: 3 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add app/components/TableFilter.tsx tests/components/TableFilter.test.tsx
  git commit -m "feat(admin): add TableFilter primitive"
  ```

---

## Phase B: Lib helpers (format, validation, admin-queries)

### Task 8: Write `app/lib/format.ts` — TDD

**Files:**
- Create: `app/lib/format.ts`
- Create: `tests/lib/format.test.ts`

- [ ] **Step 1: Write the failing test**

  `tests/lib/format.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest';
  import { formatDate, formatDateLong, formatPhone, slugify, initials } from '~/lib/format';

  describe('formatDate', () => {
    it('formats ISO date as MM.DD.YYYY', () => {
      expect(formatDate('2026-04-14')).toBe('04.14.2026');
    });
    it('returns em-dash for null/empty', () => {
      expect(formatDate(null)).toBe('—');
      expect(formatDate('')).toBe('—');
    });
  });

  describe('formatDateLong', () => {
    it('formats as Month Day, Year', () => {
      expect(formatDateLong('2026-04-14')).toBe('April 14, 2026');
    });
  });

  describe('formatPhone', () => {
    it('returns input unchanged when already formatted', () => {
      expect(formatPhone('(317) 555-0148')).toBe('(317) 555-0148');
    });
    it('formats 10-digit US number', () => {
      expect(formatPhone('3175550148')).toBe('(317) 555-0148');
    });
    it('returns em-dash for empty', () => {
      expect(formatPhone('')).toBe('—');
    });
  });

  describe('slugify', () => {
    it('lowercases and dasherizes', () => {
      expect(slugify('Phase 1')).toBe('phase-1');
    });
    it('trims leading/trailing dashes', () => {
      expect(slugify('  --hello--world--  ')).toBe('hello-world');
    });
  });

  describe('initials', () => {
    it('takes first two letters of name', () => {
      expect(initials('Eskenazi Health')).toBe('ES');
    });
    it('returns empty for empty', () => {
      expect(initials('')).toBe('');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- format
  ```

  Expected: FAIL.

- [ ] **Step 3: Implement**

  `app/lib/format.ts`:

  ```ts
  /**
   * Format an ISO date string (YYYY-MM-DD) as MM.DD.YYYY (matches the
   * prototype's compact date style).
   */
  export function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso;
    const [, y, mo, d] = m;
    return `${mo}.${d}.${y}`;
  }

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  /**
   * Format an ISO date string as "Month Day, Year".
   */
  export function formatDateLong(iso: string | null | undefined): string {
    if (!iso) return '—';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso;
    const [, y, mo, d] = m;
    return `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
  }

  /**
   * Format a US phone number. If 10 digits, render (NNN) NNN-NNNN.
   * Otherwise return the input unchanged.
   */
  export function formatPhone(raw: string | null | undefined): string {
    if (!raw) return '—';
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return raw;
  }

  /**
   * Convert a label to a stable URL/id slug.
   */
  export function slugify(s: string): string {
    return String(s).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '');
  }

  /**
   * Take the first 2 letters of a string, uppercase. Used for table avatar circles.
   */
  export function initials(s: string): string {
    return (s || '').slice(0, 2).toUpperCase();
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- format
  ```

  Expected: 10 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add app/lib/format.ts tests/lib/format.test.ts
  git commit -m "feat(admin): add format helpers (date, phone, slug, initials)"
  ```

### Task 9: Write `app/lib/validation.ts` — TDD

**Files:**
- Create: `app/lib/validation.ts`
- Create: `tests/lib/validation.test.ts`

- [ ] **Step 1: Write the failing test**

  `tests/lib/validation.test.ts`:

  ```ts
  import { describe, it, expect } from 'vitest';
  import {
    parseFormFields,
    requireString,
    optionalString,
    requireEmail,
    requirePositiveInt,
    requireDate,
    requireUuid,
    type FieldError,
  } from '~/lib/validation';

  describe('parseFormFields', () => {
    it('runs validators and collects errors', () => {
      const fd = new FormData();
      fd.set('name', '');
      fd.set('email', 'not-an-email');
      const { values, errors } = parseFormFields(fd, {
        name: requireString('Name'),
        email: requireEmail('Email'),
      });
      expect(values).toEqual({ name: '', email: 'not-an-email' });
      const errMap: Record<string, FieldError> = Object.fromEntries(errors.map(e => [e.field, e]));
      expect(errMap.name.message).toMatch(/required/i);
      expect(errMap.email.message).toMatch(/email/i);
    });

    it('returns no errors for valid input', () => {
      const fd = new FormData();
      fd.set('name', 'Acme');
      fd.set('email', 'a@b.co');
      const { errors } = parseFormFields(fd, {
        name: requireString('Name'),
        email: requireEmail('Email'),
      });
      expect(errors).toEqual([]);
    });
  });

  describe('requirePositiveInt', () => {
    it('accepts positive integer', () => {
      const fd = new FormData();
      fd.set('n', '26');
      const { errors } = parseFormFields(fd, { n: requirePositiveInt('N') });
      expect(errors).toEqual([]);
    });
    it('rejects zero', () => {
      const fd = new FormData();
      fd.set('n', '0');
      const { errors } = parseFormFields(fd, { n: requirePositiveInt('N') });
      expect(errors).toHaveLength(1);
    });
    it('rejects non-numeric', () => {
      const fd = new FormData();
      fd.set('n', 'abc');
      const { errors } = parseFormFields(fd, { n: requirePositiveInt('N') });
      expect(errors).toHaveLength(1);
    });
  });

  describe('requireDate', () => {
    it('accepts YYYY-MM-DD', () => {
      const fd = new FormData();
      fd.set('d', '2026-04-14');
      const { errors } = parseFormFields(fd, { d: requireDate('Date') });
      expect(errors).toEqual([]);
    });
    it('rejects empty', () => {
      const fd = new FormData();
      fd.set('d', '');
      const { errors } = parseFormFields(fd, { d: requireDate('Date') });
      expect(errors).toHaveLength(1);
    });
    it('rejects bad shape', () => {
      const fd = new FormData();
      fd.set('d', '04/14/2026');
      const { errors } = parseFormFields(fd, { d: requireDate('Date') });
      expect(errors).toHaveLength(1);
    });
  });

  describe('requireUuid', () => {
    it('accepts well-formed uuid', () => {
      const fd = new FormData();
      fd.set('id', '11111111-1111-1111-1111-111111111101');
      const { errors } = parseFormFields(fd, { id: requireUuid('Id') });
      expect(errors).toEqual([]);
    });
    it('rejects empty', () => {
      const fd = new FormData();
      fd.set('id', '');
      const { errors } = parseFormFields(fd, { id: requireUuid('Id') });
      expect(errors).toHaveLength(1);
    });
  });

  describe('optionalString', () => {
    it('coalesces empty to null', () => {
      const fd = new FormData();
      fd.set('n', '   ');
      const { values, errors } = parseFormFields(fd, { n: optionalString('N') });
      expect(values.n).toBeNull();
      expect(errors).toEqual([]);
    });
    it('trims whitespace', () => {
      const fd = new FormData();
      fd.set('n', '  hi  ');
      const { values } = parseFormFields(fd, { n: optionalString('N') });
      expect(values.n).toBe('hi');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- validation
  ```

  Expected: FAIL.

- [ ] **Step 3: Implement**

  `app/lib/validation.ts`:

  ```ts
  export interface FieldError {
    field: string;
    message: string;
  }

  export type Validator<T> = (raw: string, fieldName: string) => { value: T } | { error: string };

  /**
   * Parse a FormData against a schema of per-field validators.
   * Returns the parsed values (typed) and a list of field errors.
   *
   * Behaviour: every validator runs, so a form submission produces ALL
   * relevant inline errors at once.
   */
  export function parseFormFields<S extends Record<string, Validator<unknown>>>(
    formData: FormData,
    schema: S,
  ): {
    values: { [K in keyof S]: S[K] extends Validator<infer T> ? T : never };
    errors: FieldError[];
  } {
    const values = {} as { [K in keyof S]: unknown };
    const errors: FieldError[] = [];
    for (const key in schema) {
      const raw = String(formData.get(key) ?? '');
      const out = schema[key](raw, key);
      if ('error' in out) {
        values[key] = null;
        errors.push({ field: key, message: out.error });
      } else {
        values[key] = out.value;
      }
    }
    return { values: values as never, errors };
  }

  export function requireString(label: string): Validator<string> {
    return (raw) => {
      const v = raw.trim();
      if (!v) return { error: `${label} is required.` };
      return { value: v };
    };
  }

  export function optionalString(_label: string): Validator<string | null> {
    return (raw) => {
      const v = raw.trim();
      return { value: v === '' ? null : v };
    };
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  export function requireEmail(label: string): Validator<string> {
    return (raw) => {
      const v = raw.trim();
      if (!v) return { error: `${label} is required.` };
      if (!EMAIL_RE.test(v)) return { error: `${label} must be a valid email.` };
      return { value: v };
    };
  }

  export function optionalEmail(label: string): Validator<string | null> {
    return (raw) => {
      const v = raw.trim();
      if (v === '') return { value: null };
      if (!EMAIL_RE.test(v)) return { error: `${label} must be a valid email.` };
      return { value: v };
    };
  }

  export function requirePositiveInt(label: string): Validator<number> {
    return (raw) => {
      const v = raw.trim();
      if (!v) return { error: `${label} is required.` };
      const n = Number(v);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
        return { error: `${label} must be a positive integer.` };
      }
      return { value: n };
    };
  }

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  export function requireDate(label: string): Validator<string> {
    return (raw) => {
      const v = raw.trim();
      if (!v) return { error: `${label} is required.` };
      if (!DATE_RE.test(v)) return { error: `${label} must be a date.` };
      return { value: v };
    };
  }

  export function optionalDate(label: string): Validator<string | null> {
    return (raw) => {
      const v = raw.trim();
      if (v === '') return { value: null };
      if (!DATE_RE.test(v)) return { error: `${label} must be a date.` };
      return { value: v };
    };
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  export function requireUuid(label: string): Validator<string> {
    return (raw) => {
      const v = raw.trim();
      if (!v) return { error: `${label} is required.` };
      if (!UUID_RE.test(v)) return { error: `${label} is not a valid id.` };
      return { value: v };
    };
  }

  export function optionalUuid(label: string): Validator<string | null> {
    return (raw) => {
      const v = raw.trim();
      if (v === '') return { value: null };
      if (!UUID_RE.test(v)) return { error: `${label} is not a valid id.` };
      return { value: v };
    };
  }

  export function requireSingleCharUpper(label: string): Validator<string> {
    return (raw) => {
      const v = raw.trim();
      if (!v) return { error: `${label} is required.` };
      if (!/^[A-Za-z]$/.test(v)) return { error: `${label} must be one letter.` };
      return { value: v.toUpperCase() };
    };
  }

  /**
   * Convenience: return errors as a Record<string, string> for easy
   * field-level lookup in components.
   */
  export function errorsByField(errors: FieldError[]): Record<string, string> {
    return Object.fromEntries(errors.map((e) => [e.field, e.message]));
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- validation
  ```

  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add app/lib/validation.ts tests/lib/validation.test.ts
  git commit -m "feat(admin): add form validation helpers"
  ```

### Task 10: Write `app/lib/admin-queries.server.ts` — TDD

**Files:**
- Create: `app/lib/admin-queries.server.ts`
- Create: `tests/lib/admin-queries.server.test.ts`

These helpers wrap Drizzle queries used across multiple admin routes (KPI counts, join-heavy list queries, lookup-or-404 helpers).

- [ ] **Step 1: Write the failing test**

  `tests/lib/admin-queries.server.test.ts`:

  ```ts
  import { describe, it, expect, beforeAll, afterAll } from 'vitest';
  import {
    getAdminHomeKpis,
    listEmployersWithCohortCount,
    listCohortsForEmployer,
    listRolesForEmployerWithCohortCount,
    getEmployerOrNull,
    getCohortOrNull,
    getRoleOrNull,
    getInternOrNull,
    listInternsForListing,
  } from '~/lib/admin-queries.server';
  import { db } from '~/lib/db.server';

  // Use the dev-seeded data from sub-project 1. Run `npm run db:seed` first.
  beforeAll(async () => {
    // Sanity: at least one employer exists.
    const employers = await listEmployersWithCohortCount(db);
    if (employers.length === 0) {
      throw new Error('Tests require dev seed; run `npm run db:seed` before running admin-queries tests.');
    }
  });
  afterAll(async () => { /* postgres-js client closes on process exit */ });

  describe('listEmployersWithCohortCount', () => {
    it('returns all 6 seeded employers with cohort counts', async () => {
      const out = await listEmployersWithCohortCount(db);
      expect(out.length).toBeGreaterThanOrEqual(6);
      const eskenazi = out.find((e) => e.name === 'Eskenazi Health');
      expect(eskenazi).toBeDefined();
      expect(eskenazi!.cohortCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getAdminHomeKpis', () => {
    it('returns counts as numbers', async () => {
      const kpis = await getAdminHomeKpis(db);
      expect(typeof kpis.activeCohorts).toBe('number');
      expect(typeof kpis.activeInterns).toBe('number');
      expect(typeof kpis.outcomes90Day).toBe('number');
      expect(typeof kpis.submissions).toBe('number');
    });
  });

  describe('getEmployerOrNull', () => {
    it('returns null for unknown id', async () => {
      const e = await getEmployerOrNull(db, '00000000-0000-0000-0000-000000000000');
      expect(e).toBeNull();
    });
    it('returns the employer for a known id', async () => {
      const e = await getEmployerOrNull(db, '11111111-1111-1111-1111-111111111101');
      expect(e?.name).toBe('Eskenazi Health');
    });
  });

  describe('listCohortsForEmployer', () => {
    it('returns Eskenazi 2026 cohort under Eskenazi Health', async () => {
      const cohorts = await listCohortsForEmployer(db, '11111111-1111-1111-1111-111111111101');
      expect(cohorts.length).toBeGreaterThanOrEqual(1);
      expect(cohorts[0].employerId).toBe('11111111-1111-1111-1111-111111111101');
    });
  });

  describe('listRolesForEmployerWithCohortCount', () => {
    it('returns role rows with cohort counts', async () => {
      const out = await listRolesForEmployerWithCohortCount(db, '11111111-1111-1111-1111-111111111101');
      expect(out.length).toBeGreaterThanOrEqual(1);
      expect(out[0]).toMatchObject({ id: expect.any(String), label: expect.any(String), cohortCount: expect.any(Number) });
    });
  });

  describe('listInternsForListing', () => {
    it('returns interns with cohort + employer joined', async () => {
      const rows = await listInternsForListing(db);
      expect(rows.length).toBeGreaterThanOrEqual(3);
      const sample = rows[0];
      expect(sample).toMatchObject({
        id: expect.any(String),
        firstInitial: expect.any(String),
        lastName: expect.any(String),
        cohortName: expect.any(String),
        employerName: expect.any(String),
      });
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin-queries
  ```

  Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

  `app/lib/admin-queries.server.ts`:

  ```ts
  import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm';
  import type { db as Db } from './db.server';
  import {
    employers,
    cohorts,
    roles,
    interns,
    phases,
    cohortPhases,
    barriers,
    internEntryAssessment,
    internEntryBarriers,
    internEmploymentOutcomes,
    assessmentSubmissions,
    programInfo,
  } from '../../db/schema';

  type Database = typeof Db;

  // ---------- KPIs ----------

  export async function getAdminHomeKpis(db: Database) {
    const [cohortRow] = await db.select({ n: count() }).from(cohorts);
    const [internRow] = await db.select({ n: count() }).from(interns).where(isNull(interns.deletedAt));
    const [outcomeRow] = await db
      .select({ n: count() })
      .from(internEmploymentOutcomes)
      .where(eq(internEmploymentOutcomes.employed90Day, true));
    const [submissionRow] = await db
      .select({ n: count() })
      .from(assessmentSubmissions)
      .where(isNull(assessmentSubmissions.deletedAt));
    return {
      activeCohorts: Number(cohortRow.n),
      activeInterns: Number(internRow.n),
      outcomes90Day: Number(outcomeRow.n),
      submissions: Number(submissionRow.n),
    };
  }

  // ---------- Employers ----------

  export async function listEmployersWithCohortCount(db: Database) {
    return db
      .select({
        id: employers.id,
        name: employers.name,
        contactName: employers.contactName,
        contactEmail: employers.contactEmail,
        phone: employers.phone,
        notes: employers.notes,
        cohortCount: sql<number>`COALESCE(COUNT(${cohorts.id})::int, 0)`.as('cohort_count'),
      })
      .from(employers)
      .leftJoin(cohorts, eq(cohorts.employerId, employers.id))
      .groupBy(employers.id)
      .orderBy(asc(employers.name));
  }

  export async function getEmployerOrNull(db: Database, id: string) {
    const rows = await db.select().from(employers).where(eq(employers.id, id)).limit(1);
    return rows[0] ?? null;
  }

  // ---------- Cohorts ----------

  export async function listCohortsForEmployer(db: Database, employerId: string) {
    const cohortRows = await db
      .select({
        id: cohorts.id,
        employerId: cohorts.employerId,
        roleId: cohorts.roleId,
        roleLabel: roles.label,
        name: cohorts.name,
        startDate: cohorts.startDate,
        endDate: cohorts.endDate,
        description: cohorts.description,
        members: sql<number>`COALESCE((
          SELECT COUNT(*)::int FROM ${interns}
          WHERE ${interns.cohortId} = ${cohorts.id} AND ${interns.deletedAt} IS NULL
        ), 0)`.as('members'),
      })
      .from(cohorts)
      .leftJoin(roles, eq(roles.id, cohorts.roleId))
      .where(eq(cohorts.employerId, employerId))
      .orderBy(asc(cohorts.name));
    return cohortRows;
  }

  export async function getCohortOrNull(db: Database, id: string) {
    const rows = await db
      .select({
        id: cohorts.id,
        employerId: cohorts.employerId,
        roleId: cohorts.roleId,
        name: cohorts.name,
        startDate: cohorts.startDate,
        endDate: cohorts.endDate,
        description: cohorts.description,
      })
      .from(cohorts)
      .where(eq(cohorts.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  export async function listPhasesForCohort(db: Database, cohortId: string) {
    return db
      .select({
        id: phases.id,
        label: phases.label,
        sortOrder: cohortPhases.sortOrder,
      })
      .from(cohortPhases)
      .innerJoin(phases, eq(phases.id, cohortPhases.phaseId))
      .where(eq(cohortPhases.cohortId, cohortId))
      .orderBy(asc(cohortPhases.sortOrder));
  }

  export async function listInternsByCohort(db: Database, cohortId: string) {
    return db
      .select({
        id: interns.id,
        firstInitial: interns.firstInitial,
        lastName: interns.lastName,
        startDate: interns.startDate,
        endDate: interns.endDate,
      })
      .from(interns)
      .where(and(eq(interns.cohortId, cohortId), isNull(interns.deletedAt)))
      .orderBy(asc(interns.lastName));
  }

  // ---------- Roles ----------

  export async function listRolesForEmployerWithCohortCount(db: Database, employerId: string) {
    return db
      .select({
        id: roles.id,
        employerId: roles.employerId,
        label: roles.label,
        description: roles.description,
        cohortCount: sql<number>`COALESCE((
          SELECT COUNT(*)::int FROM ${cohorts} WHERE ${cohorts.roleId} = ${roles.id}
        ), 0)`.as('cohort_count'),
      })
      .from(roles)
      .where(eq(roles.employerId, employerId))
      .orderBy(asc(roles.label));
  }

  export async function getRoleOrNull(db: Database, id: string) {
    const rows = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    return rows[0] ?? null;
  }

  export async function listCohortsUsingRole(db: Database, roleId: string) {
    return db
      .select({
        id: cohorts.id,
        name: cohorts.name,
        startDate: cohorts.startDate,
        endDate: cohorts.endDate,
        members: sql<number>`COALESCE((
          SELECT COUNT(*)::int FROM ${interns}
          WHERE ${interns.cohortId} = ${cohorts.id} AND ${interns.deletedAt} IS NULL
        ), 0)`.as('members'),
      })
      .from(cohorts)
      .where(eq(cohorts.roleId, roleId))
      .orderBy(asc(cohorts.name));
  }

  // ---------- Interns ----------

  export async function listInternsForListing(db: Database) {
    return db
      .select({
        id: interns.id,
        firstInitial: interns.firstInitial,
        lastName: interns.lastName,
        startDate: interns.startDate,
        endDate: interns.endDate,
        cohortId: cohorts.id,
        cohortName: cohorts.name,
        employerId: employers.id,
        employerName: employers.name,
        roleLabel: roles.label,
        employed90: internEmploymentOutcomes.employed90Day,
        employed180: internEmploymentOutcomes.employed180Day,
      })
      .from(interns)
      .innerJoin(cohorts, eq(cohorts.id, interns.cohortId))
      .innerJoin(employers, eq(employers.id, cohorts.employerId))
      .leftJoin(roles, eq(roles.id, interns.roleId))
      .leftJoin(internEmploymentOutcomes, eq(internEmploymentOutcomes.internId, interns.id))
      .where(isNull(interns.deletedAt))
      .orderBy(desc(interns.startDate));
  }

  export async function getInternOrNull(db: Database, id: string) {
    const rows = await db
      .select({
        id: interns.id,
        cohortId: interns.cohortId,
        roleId: interns.roleId,
        firstInitial: interns.firstInitial,
        lastName: interns.lastName,
        startDate: interns.startDate,
        endDate: interns.endDate,
        deletedAt: interns.deletedAt,
      })
      .from(interns)
      .where(and(eq(interns.id, id), isNull(interns.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  export async function getInternEntry(db: Database, internId: string) {
    const rows = await db
      .select()
      .from(internEntryAssessment)
      .where(eq(internEntryAssessment.internId, internId))
      .limit(1);
    return rows[0] ?? null;
  }

  export async function getInternEntryBarrierIds(db: Database, internId: string): Promise<string[]> {
    const rows = await db
      .select({ barrierId: internEntryBarriers.barrierId })
      .from(internEntryBarriers)
      .where(eq(internEntryBarriers.internId, internId));
    return rows.map((r) => r.barrierId);
  }

  export async function getInternEmploymentOutcomes(db: Database, internId: string) {
    const rows = await db
      .select()
      .from(internEmploymentOutcomes)
      .where(eq(internEmploymentOutcomes.internId, internId))
      .limit(1);
    return rows[0] ?? null;
  }

  // ---------- Library tables ----------

  export async function listPhases(db: Database) {
    return db.select().from(phases).orderBy(asc(phases.sortOrder));
  }

  export async function listBarriers(db: Database) {
    return db.select().from(barriers).orderBy(asc(barriers.sortOrder));
  }

  export async function getProgramInfo(db: Database) {
    const rows = await db.select().from(programInfo).where(eq(programInfo.id, 1)).limit(1);
    return rows[0] ?? null;
  }

  export async function listAllEmployers(db: Database) {
    return db.select({ id: employers.id, name: employers.name }).from(employers).orderBy(asc(employers.name));
  }

  // ---------- Recent activity ----------

  export async function listRecentActivity(db: Database, limit = 10) {
    return db
      .select({
        id: assessmentSubmissions.id,
        type: assessmentSubmissions.type,
        phase: assessmentSubmissions.phase,
        submittedAt: assessmentSubmissions.submittedAt,
        internLastName: interns.lastName,
        internFirstInitial: interns.firstInitial,
        cohortName: cohorts.name,
      })
      .from(assessmentSubmissions)
      .innerJoin(interns, eq(interns.id, assessmentSubmissions.internId))
      .innerJoin(cohorts, eq(cohorts.id, interns.cohortId))
      .where(isNull(assessmentSubmissions.deletedAt))
      .orderBy(desc(assessmentSubmissions.submittedAt))
      .limit(limit);
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm run db:seed
  npm test -- admin-queries
  ```

  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add app/lib/admin-queries.server.ts tests/lib/admin-queries.server.test.ts
  git commit -m "feat(admin): add server-side query helpers (KPIs, lookups, list joins)"
  ```

---

## Phase C: Route table + placeholders + 404

### Task 11: Extend the route table with all admin routes + 404

**Files:**
- Modify: `app/routes.ts`

- [ ] **Step 1: Replace `app/routes.ts`**

  ```ts
  import {
    type RouteConfig,
    layout,
    index,
    route,
  } from '@react-router/dev/routes';

  export default [
    layout('routes/_public.tsx', [
      index('routes/_public._index.tsx'),
      route('login', 'routes/_public.login.tsx'),
      route('auth/reset-password-request', 'routes/_public.auth.reset-password-request.tsx'),
      route('auth/reset-password', 'routes/_public.auth.reset-password.tsx'),
      route('auth/callback', 'routes/_public.auth.callback.tsx'),
      route('sign-out', 'routes/sign-out.ts'),
    ]),
    layout('routes/admin.tsx', [
      route('admin', 'routes/admin._index.tsx'),
      route('admin/interns', 'routes/admin.interns._index.tsx'),
      route('admin/interns/new', 'routes/admin.interns.new.tsx'),
      route('admin/interns/:internId', 'routes/admin.interns.$internId.tsx'),
      route('admin/assessments', 'routes/admin.assessments._index.tsx'),
      route('admin/reports', 'routes/admin.reports.tsx'),
      route('admin/settings', 'routes/admin.settings._index.tsx'),
      route('admin/settings/employers', 'routes/admin.settings.employers._index.tsx'),
      route('admin/settings/employers/new', 'routes/admin.settings.employers.new.tsx'),
      route('admin/settings/employers/:employerId', 'routes/admin.settings.employers.$employerId._index.tsx'),
      route('admin/settings/employers/:employerId/edit', 'routes/admin.settings.employers.$employerId.edit.tsx'),
      route('admin/settings/employers/:employerId/cohorts/new', 'routes/admin.settings.employers.$employerId.cohorts.new.tsx'),
      route('admin/settings/employers/:employerId/roles/new', 'routes/admin.settings.employers.$employerId.roles.new.tsx'),
      route('admin/settings/cohorts/:cohortId', 'routes/admin.settings.cohorts.$cohortId._index.tsx'),
      route('admin/settings/cohorts/:cohortId/edit', 'routes/admin.settings.cohorts.$cohortId.edit.tsx'),
      route('admin/settings/roles/:roleId', 'routes/admin.settings.roles.$roleId._index.tsx'),
      route('admin/settings/roles/:roleId/edit', 'routes/admin.settings.roles.$roleId.edit.tsx'),
      route('admin/settings/phases', 'routes/admin.settings.phases.tsx'),
      route('admin/settings/barriers', 'routes/admin.settings.barriers.tsx'),
      route('admin/settings/program-info', 'routes/admin.settings.program-info.tsx'),
      route('admin/settings/questions', 'routes/admin.settings.questions.tsx'),
    ]),
    layout('routes/employer.tsx', [
      route('employer', 'routes/employer._index.tsx'),
    ]),
    route('*', 'routes/$.tsx'),
  ] satisfies RouteConfig;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes.ts
  git commit -m "feat(admin): expand route table with admin core + 404 catch-all"
  ```

### Task 12: 404 catch-all route

**Files:**
- Create: `app/routes/$.tsx`

- [ ] **Step 1: Create the file**

  Copy strings verbatim from `Prototypes/PROTOTYPE/404.html`.

  ```tsx
  import { Link } from 'react-router';
  import type { Route } from './+types/$';

  export const meta: Route.MetaFunction = () => [{ title: '404 — Page Not Found — IMPACT' }];

  export function loader() {
    // Return a 404 status so search engines and Sentry treat it correctly.
    throw new Response('Not Found', { status: 404 });
  }

  export function ErrorBoundary() {
    return (
      <main className="confirm">
        <div className="container confirm__inner">
          <span className="micro-label">ERROR / 404 / PAGE NOT FOUND</span>
          <h1 className="confirm__title" style={{ color: 'var(--muted)' }}>
            <span style={{ color: 'var(--gold)' }}>404.</span><br/>Page not found.
          </h1>
          <p className="confirm__body">
            This page doesn't exist, or the resource you're looking for has been moved.
            If you followed a link from inside the portal, please let your program admin know.
          </p>
          <div className="confirm__actions" style={{ gap: 14 }}>
            <Link to="/" className="btn btn--primary">Return Home <span className="btn__arrow">&rarr;</span></Link>
            <Link to="/admin" className="btn btn--outline">Admin Home</Link>
          </div>
        </div>
      </main>
    );
  }

  export default function NotFound() {
    // Default export is unreachable because loader throws; keep for the
    // framework's type contract.
    return null;
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/$.tsx
  git commit -m "feat(admin): add branded 404 catch-all route"
  ```

### Task 13: Placeholder routes for sub-projects 3, 4, 6

**Files:**
- Create: `app/routes/admin.assessments._index.tsx`
- Create: `app/routes/admin.reports.tsx`
- Create: `app/routes/admin.settings.questions.tsx`

- [ ] **Step 1: Create `app/routes/admin.assessments._index.tsx`**

  ```tsx
  import type { Route } from './+types/admin.assessments._index';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { PageHead } from '~/components/PageHead';

  export const meta: Route.MetaFunction = () => [{ title: 'Assessments · IMPACT Admin' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    return Response.json({}, { headers });
  }

  export default function AdminAssessmentsPlaceholder() {
    return (
      <>
        <PageHead breadcrumb="ADMIN / ASSESSMENTS" title="ASSESSMENTS." sub="Coming in sub-project 4." />
        <section className="container" style={{ padding: '24px 0' }}>
          <article className="identity-card">
            <p>Competency Assessment + Exit Employer Survey will land in sub-project 4.</p>
          </article>
        </section>
      </>
    );
  }
  ```

- [ ] **Step 2: Create `app/routes/admin.reports.tsx`**

  ```tsx
  import type { Route } from './+types/admin.reports';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { PageHead } from '~/components/PageHead';

  export const meta: Route.MetaFunction = () => [{ title: 'Reports · IMPACT Admin' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    return Response.json({}, { headers });
  }

  export default function AdminReportsPlaceholder() {
    return (
      <>
        <PageHead breadcrumb="ADMIN / REPORTS" title="REPORTS." sub="Coming in sub-project 6." />
        <section className="container" style={{ padding: '24px 0' }}>
          <article className="identity-card">
            <p>Program reports (CSS bar charts) will land in sub-project 6.</p>
          </article>
        </section>
      </>
    );
  }
  ```

- [ ] **Step 3: Create `app/routes/admin.settings.questions.tsx`**

  ```tsx
  import type { Route } from './+types/admin.settings.questions';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { PageHead } from '~/components/PageHead';
  import { SettingsShell } from '~/components/SettingsShell';

  export const meta: Route.MetaFunction = () => [{ title: 'Assessments · Settings · IMPACT Admin' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    return Response.json({}, { headers });
  }

  export default function SettingsQuestionsPlaceholder() {
    return (
      <>
        <PageHead breadcrumb="ADMIN / SETTINGS / ASSESSMENTS" title="ASSESSMENTS." sub="Coming in sub-project 3." />
        <SettingsShell active="questions">
          <article className="identity-card">
            <p>Question-set editor (Personal Goals, Midpoint Reflection, Participant Feedback, Exit Employer Survey, Competency Core/Cohort/Intern) will land in sub-project 3.</p>
          </article>
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add app/routes/admin.assessments._index.tsx app/routes/admin.reports.tsx app/routes/admin.settings.questions.tsx
  git commit -m "feat(admin): add placeholder routes for sub-projects 3, 4, 6"
  ```

---

## Phase D: Admin Home dashboard

### Task 14: Admin Home loader + KPI cards + quick links + activity

**Files:**
- Modify: `app/routes/admin._index.tsx` (replace sub-project 1 placeholder)
- Create: `tests/routes/admin._index.test.ts`

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin._index.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { loader } from '~/routes/admin._index';
  import * as guard from '~/lib/admin-guard.server';
  import * as queries from '~/lib/admin-queries.server';

  describe('admin._index loader', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('returns KPIs and recent activity', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
        auth: { role: 'admin', employerId: null },
        headers: new Headers(),
      });
      vi.spyOn(queries, 'getAdminHomeKpis').mockResolvedValue({
        activeCohorts: 6, activeInterns: 5, outcomes90Day: 2, submissions: 11,
      });
      vi.spyOn(queries, 'listRecentActivity').mockResolvedValue([
        {
          id: 's1', type: 'competency', phase: 'Week 4',
          submittedAt: new Date('2026-04-14T08:40:00Z'),
          internLastName: 'Clark', internFirstInitial: 'D', cohortName: 'TTT 2026',
        },
      ] as never);

      const req = new Request('https://x.test/admin');
      const res = await loader({ request: req, params: {}, context: {} } as never);
      const body = await (res as Response).json();
      expect(body.kpis.activeCohorts).toBe(6);
      expect(body.activity).toHaveLength(1);
      expect(body.activity[0].cohortName).toBe('TTT 2026');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin._index
  ```

  Expected: FAIL — module not implemented.

- [ ] **Step 3: Replace `app/routes/admin._index.tsx`**

  Copy strings verbatim from `Prototypes/PROTOTYPE/admin.html`.

  ```tsx
  import { Link, useLoaderData } from 'react-router';
  import type { Route } from './+types/admin._index';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import { getAdminHomeKpis, listRecentActivity } from '~/lib/admin-queries.server';
  import { PageHead } from '~/components/PageHead';
  import { formatDate } from '~/lib/format';

  export const meta: Route.MetaFunction = () => [{ title: 'Admin Home — IMPACT' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const [kpis, activity] = await Promise.all([
      getAdminHomeKpis(db),
      listRecentActivity(db, 5),
    ]);
    return Response.json({ kpis, activity }, { headers });
  }

  function activityLabel(type: string, phase: string | null): string {
    if (type === 'competency') return `completed Competency phase ${phase ?? ''}`.trim();
    if (type === 'personal-goals') return 'submitted Personal Goals';
    if (type === 'midpoint-reflection') return 'submitted Midpoint Reflection';
    if (type === 'participant-feedback') return 'submitted Participant Feedback';
    if (type === 'exit-employer-survey') return 'Exit Employer Survey submitted';
    return `submitted ${type}`;
  }

  function activityTime(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getMonth() + 1)}.${pad(date.getDate())}.${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  export default function AdminHome() {
    const { kpis, activity } = useLoaderData<typeof loader>();
    const pad2 = (n: number) => String(n).padStart(2, '0');
    return (
      <>
        <PageHead
          breadcrumb="ADMIN / HOME / 2026"
          title={'GOOD MORNING.'}
          sub="Program overview for the current cohort cycle."
        />
        <section>
          <div className="container">
            <div className="kpi-grid">
              <div className="kpi-card">
                <span className="kpi-card__label">Active Cohorts</span>
                <div className="kpi-card__value">{pad2(kpis.activeCohorts)}</div>
                <span className="kpi-card__delta">ALL 2026 CYCLE</span>
              </div>
              <div className="kpi-card kpi-card--cyan">
                <span className="kpi-card__label">Active Interns</span>
                <div className="kpi-card__value">{pad2(kpis.activeInterns)}</div>
                <span className="kpi-card__delta">{kpis.activeCohorts > 0 ? `ACROSS ${kpis.activeCohorts} COHORTS` : 'NO COHORTS'}</span>
              </div>
              <div className="kpi-card kpi-card--success">
                <span className="kpi-card__label">90-Day Outcomes</span>
                <div className="kpi-card__value">{pad2(kpis.outcomes90Day)}</div>
                <span className="kpi-card__delta">{`OF ${kpis.activeInterns} CONFIRMED`}</span>
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="container">
            <div className="detail-header">
              <h2 className="detail-header__title">Quick Links</h2>
              <span className="micro-label">JUMP TO SECTION</span>
            </div>
            <div className="quick-links">
              <Link to="/admin/assessments" className="quick-link">Assessments <span className="quick-link__arrow">&rarr;</span></Link>
              <Link to="/admin/interns" className="quick-link">Interns <span className="quick-link__arrow">&rarr;</span></Link>
              <Link to="/admin/settings/employers" className="quick-link">Employers <span className="quick-link__arrow">&rarr;</span></Link>
            </div>
          </div>
        </section>
        <section>
          <div className="container">
            <div className="detail-header">
              <h2 className="detail-header__title">Recent Activity</h2>
              <span className="micro-label">LAST 5 SUBMISSIONS</span>
            </div>
            <div className="activity-list">
              {activity.length === 0 ? (
                <div className="activity-row">
                  <span style={{ color: 'var(--muted)' }}>No recent activity yet.</span>
                </div>
              ) : (
                activity.map((a) => {
                  const display = `${a.internFirstInitial}. ${a.internLastName}`;
                  return (
                    <div className="activity-row" key={a.id}>
                      <span><strong>{a.internLastName}</strong> {activityLabel(a.type, a.phase)} &mdash; {a.cohortName}</span>
                      <span className="activity-row__time">{activityTime(a.submittedAt)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- admin._index
  ```

  Expected: PASS.

- [ ] **Step 5: Visual check**

  ```bash
  npm run dev
  ```

  Visit `http://localhost:5173/admin`. Sign in if necessary. Expected: nav with active "Home", KPI grid showing seeded counts (e.g. 6/3/0), Quick Links, Recent Activity with seeded submissions or empty-state message.

- [ ] **Step 6: Commit**

  ```bash
  git add app/routes/admin._index.tsx tests/routes/admin._index.test.ts
  git commit -m "feat(admin): build admin home dashboard with KPIs, quick links, activity"
  ```

### Task 15: Settings landing page

**Files:**
- Create: `app/routes/admin.settings._index.tsx`

The settings landing redirects to the Employers list (matching the prototype, where Settings nav always lands on Employers).

- [ ] **Step 1: Create the file**

  ```tsx
  import { redirect } from 'react-router';
  import type { Route } from './+types/admin.settings._index';
  import { requireAdmin } from '~/lib/admin-guard.server';

  export async function loader({ request }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    throw redirect('/admin/settings/employers', { headers });
  }

  export default function SettingsIndex() {
    return null;
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/admin.settings._index.tsx
  git commit -m "feat(admin): redirect /admin/settings → /admin/settings/employers"
  ```

---

## Phase E: Interns list + record (create + edit)

### Task 16: Interns list `/admin/interns`

**Files:**
- Create: `app/routes/admin.interns._index.tsx`
- Create: `tests/routes/admin.interns._index.test.ts`

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin.interns._index.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { loader } from '~/routes/admin.interns._index';
  import * as guard from '~/lib/admin-guard.server';
  import * as queries from '~/lib/admin-queries.server';

  describe('admin.interns._index loader', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('returns interns + cohort filter options', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      vi.spyOn(queries, 'listInternsForListing').mockResolvedValue([
        { id: 'i1', firstInitial: 'A', lastName: 'Williams', startDate: '2026-04-01', endDate: '2026-09-30', cohortId: 'c1', cohortName: 'Eskenazi 2026', employerId: 'e1', employerName: 'Eskenazi Health', roleLabel: 'Medical Assistant', employed90: false, employed180: false },
      ] as never);

      const req = new Request('https://x.test/admin/interns');
      const res = await loader({ request: req, params: {}, context: {} } as never);
      const body = await (res as Response).json();
      expect(body.interns).toHaveLength(1);
      expect(body.cohortOptions).toEqual(expect.arrayContaining(['Eskenazi 2026']));
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin.interns._index
  ```

  Expected: FAIL.

- [ ] **Step 3: Create `app/routes/admin.interns._index.tsx`**

  ```tsx
  import { Link, useLoaderData, useNavigate } from 'react-router';
  import { useMemo, useState } from 'react';
  import type { Route } from './+types/admin.interns._index';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import { listInternsForListing } from '~/lib/admin-queries.server';
  import { PageHead } from '~/components/PageHead';
  import { TableFilter } from '~/components/TableFilter';
  import { EmptyRow } from '~/components/EmptyRow';
  import { formatDate, initials } from '~/lib/format';

  export const meta: Route.MetaFunction = () => [{ title: 'Interns — IMPACT Admin' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const interns = await listInternsForListing(db);
    const cohortOptions = Array.from(new Set(interns.map((i) => i.cohortName))).sort();
    return Response.json({ interns, cohortOptions }, { headers });
  }

  function outcomePill(employed90: boolean | null, employed180: boolean | null) {
    if (employed180) return <span className="pill pill--employed-180">Employed + Still at 180d</span>;
    if (employed90)  return <span className="pill pill--employed-90">Employed at 90d</span>;
    return <span className="pill pill--tracked">Not yet tracked</span>;
  }

  export default function AdminInterns() {
    const { interns, cohortOptions } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [cohort, setCohort] = useState('all');
    const [outcome, setOutcome] = useState('all');

    const filtered = useMemo(() => {
      return interns.filter((i) => {
        const haystack = `${i.firstInitial}. ${i.lastName} ${i.cohortName}`.toLowerCase();
        if (search && !haystack.includes(search.toLowerCase())) return false;
        if (cohort !== 'all' && i.cohortName !== cohort) return false;
        if (outcome === 'employed-90' && !i.employed90) return false;
        if (outcome === 'employed-180' && !i.employed180) return false;
        if (outcome === 'not-tracked' && (i.employed90 || i.employed180)) return false;
        return true;
      });
    }, [interns, search, cohort, outcome]);

    return (
      <>
        <PageHead
          breadcrumb="ADMIN / INTERNS / 2026"
          title="INTERNS."
          sub="Active participants across the 2026 cohorts, with current phase and post-placement outcomes."
          actions={<Link to="/admin/interns/new" className="btn btn--primary">+ New Intern</Link>}
        />
        <section>
          <div className="container">
            <TableFilter
              countLabel="Active interns"
              count={filtered.length}
              rightAside="Sort: Start Date ↓"
              inputs={
                <>
                  <input
                    className="input input--search"
                    type="search"
                    placeholder="Search by last name or cohort..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search interns"
                  />
                  <div className="filter-group">
                    <label className="filter-group__label" htmlFor="cohort-filter">Cohort</label>
                    <select className="select" id="cohort-filter" value={cohort} onChange={(e) => setCohort(e.target.value)}>
                      <option value="all">All cohorts</option>
                      {cohortOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="filter-group">
                    <label className="filter-group__label" htmlFor="outcome-filter">Outcome</label>
                    <select className="select" id="outcome-filter" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                      <option value="all">All</option>
                      <option value="employed-90">Employed at 90d</option>
                      <option value="employed-180">Employed + Still at 180d</option>
                      <option value="not-tracked">Not yet tracked</option>
                    </select>
                  </div>
                </>
              }
            >
              <table className="assessments">
                <thead>
                  <tr>
                    <th style={{ width: '24%' }}>Intern</th>
                    <th style={{ width: '22%' }}>Cohort</th>
                    <th style={{ width: '14%' }}>Start Date</th>
                    <th style={{ width: '16%' }}>Role</th>
                    <th style={{ width: '24%' }}>90-Day Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <EmptyRow colSpan={5} message="No records match the current filters." />
                  ) : (
                    filtered.map((i) => (
                      <tr
                        key={i.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/admin/interns/${i.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/admin/interns/${i.id}`);
                          }
                        }}
                        tabIndex={0}
                      >
                        <td>
                          <div className="col-name">
                            <span className="name-initial">{initials(i.lastName)}</span>
                            {i.firstInitial}. {i.lastName}
                          </div>
                        </td>
                        <td className="col-cohort">{i.cohortName}</td>
                        <td className="col-date">{formatDate(i.startDate)}</td>
                        <td>{i.roleLabel ?? '—'}</td>
                        <td>{outcomePill(i.employed90, i.employed180)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableFilter>
          </div>
        </section>
      </>
    );
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  ```bash
  npm test -- admin.interns._index
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.interns._index.tsx tests/routes/admin.interns._index.test.ts
  git commit -m "feat(admin): build interns list with search/cohort/outcome filters"
  ```

### Task 17: `<BarrierCheckList>` component

**Files:**
- Create: `app/components/BarrierCheckList.tsx`

- [ ] **Step 1: Create the file**

  ```tsx
  export interface BarrierItem { id: string; label: string }

  export function BarrierCheckList({
    barriers,
    checkedIds,
    name = 'barrierIds',
    disabled,
  }: {
    barriers: BarrierItem[];
    checkedIds: string[];
    name?: string;
    disabled?: boolean;
  }) {
    const set = new Set(checkedIds);
    return (
      <div className="barrier-check-list" data-barrier-list>
        {barriers.map((b) => {
          const id = `barrier-${b.id}`;
          return (
            <div className="outcome-check" key={b.id}>
              <input
                type="checkbox"
                id={id}
                name={name}
                value={b.id}
                defaultChecked={set.has(b.id)}
                disabled={disabled}
              />
              <label htmlFor={id}>{b.label}</label>
            </div>
          );
        })}
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/BarrierCheckList.tsx
  git commit -m "feat(admin): add BarrierCheckList component"
  ```

### Task 18: Intern record — create (`/admin/interns/new`)

**Files:**
- Create: `app/routes/admin.interns.new.tsx`
- Create: `tests/routes/admin.interns.new.test.ts`

The form has 6 numbered panels. In "new" mode panels 04 + 05 + 06 (Self-Assessments, Evaluations, Employment Details) render as disabled placeholders ("Will appear after this intern record is saved" / "To be tracked once placed") per the prototype.

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin.interns.new.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { loader, action } from '~/routes/admin.interns.new';
  import * as guard from '~/lib/admin-guard.server';
  import * as queries from '~/lib/admin-queries.server';
  import * as dbMod from '~/lib/db.server';

  describe('admin.interns.new', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('loader returns employers, cohorts, roles, barriers', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      vi.spyOn(queries, 'listAllEmployers').mockResolvedValue([{ id: 'e1', name: 'Eskenazi Health' }] as never);
      vi.spyOn(queries, 'listBarriers').mockResolvedValue([{ id: 'b1', label: 'No reliable transportation to placement site', sortOrder: 1, createdAt: new Date() }] as never);
      const dbStub = {
        select: () => ({ from: () => ({ orderBy: () => Promise.resolve([]) }) }),
      } as never;
      vi.spyOn(dbMod, 'db', 'get').mockReturnValue(dbStub);

      const req = new Request('https://x.test/admin/interns/new');
      const res = await loader({ request: req, params: {}, context: {} } as never);
      const body = await (res as Response).json();
      expect(body.employers[0].name).toBe('Eskenazi Health');
      expect(body.barriers[0].label).toMatch(/transportation/);
    });

    it('action returns errors when required fields are missing', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      const fd = new FormData();
      fd.set('firstName', '');
      fd.set('lastName', '');
      fd.set('cohortId', '');
      fd.set('startDate', '');
      fd.set('endDate', '');
      const req = new Request('https://x.test/admin/interns/new', { method: 'POST', body: fd });
      const res = await action({ request: req, params: {}, context: {} } as never);
      const body = await (res as Response).json();
      expect(body.errors.length).toBeGreaterThan(0);
      const fieldsWithErrors = body.errors.map((e: { field: string }) => e.field);
      expect(fieldsWithErrors).toEqual(expect.arrayContaining(['firstName', 'lastName', 'cohortId']));
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin.interns.new
  ```

  Expected: FAIL.

- [ ] **Step 3: Create `app/routes/admin.interns.new.tsx`**

  ```tsx
  import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
  import { useMemo, useState } from 'react';
  import type { Route } from './+types/admin.interns.new';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import { listAllEmployers, listBarriers } from '~/lib/admin-queries.server';
  import { cohorts as cohortsTbl, roles as rolesTbl, interns, internEntryAssessment, internEntryBarriers } from '../../db/schema';
  import { eq, asc } from 'drizzle-orm';
  import {
    parseFormFields,
    requireString,
    requireUuid,
    requireDate,
    requireSingleCharUpper,
    optionalUuid,
    optionalString,
    errorsByField,
  } from '~/lib/validation';
  import { PageHead } from '~/components/PageHead';
  import { RubricPanel } from '~/components/RubricPanel';
  import { ActionBar } from '~/components/ActionBar';
  import { BarrierCheckList } from '~/components/BarrierCheckList';

  export const meta: Route.MetaFunction = () => [{ title: 'New Intern — IMPACT Admin' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const [employers, allCohorts, allRoles, barriers] = await Promise.all([
      listAllEmployers(db),
      db.select({ id: cohortsTbl.id, employerId: cohortsTbl.employerId, roleId: cohortsTbl.roleId, name: cohortsTbl.name }).from(cohortsTbl).orderBy(asc(cohortsTbl.name)),
      db.select({ id: rolesTbl.id, employerId: rolesTbl.employerId, label: rolesTbl.label }).from(rolesTbl).orderBy(asc(rolesTbl.label)),
      listBarriers(db),
    ]);
    return Response.json({ employers, allCohorts, allRoles, barriers }, { headers });
  }

  export async function action({ request }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const formData = await request.formData();
    const { values, errors } = parseFormFields(formData, {
      firstName: requireString('First Name'),
      lastName: requireString('Last Name'),
      employerId: requireUuid('Employer'),
      cohortId: requireUuid('Cohort'),
      roleId: optionalUuid('Role'),
      startDate: requireDate('Start Date'),
      endDate: requireDate('End Date'),
      entryNotes: optionalString('Notes'),
    });
    if (values.firstName) {
      const initial = requireSingleCharUpper('First Name')(values.firstName, 'firstName');
      if ('error' in initial) {
        errors.push({ field: 'firstName', message: initial.error });
      }
    }
    const barrierIds = formData.getAll('barrierIds').map((v) => String(v)).filter(Boolean);
    if (errors.length > 0) {
      return Response.json({ errors, values: { ...values, barrierIds } }, { headers, status: 400 });
    }

    const firstInitial = values.firstName.trim()[0].toUpperCase();

    const inserted = await db.transaction(async (tx) => {
      const [intern] = await tx
        .insert(interns)
        .values({
          cohortId: values.cohortId,
          roleId: values.roleId,
          firstInitial,
          lastName: values.lastName,
          startDate: values.startDate,
          endDate: values.endDate,
        })
        .returning({ id: interns.id });

      await tx.insert(internEntryAssessment).values({
        internId: intern.id,
        notes: values.entryNotes,
        completedAt: new Date(),
      });

      if (barrierIds.length > 0) {
        await tx.insert(internEntryBarriers).values(
          barrierIds.map((bid) => ({ internId: intern.id, barrierId: bid })),
        );
      }
      return intern;
    });

    throw redirect(`/admin/interns/${inserted.id}?created=1`, { headers });
  }

  export default function NewIntern() {
    const { employers, allCohorts, allRoles, barriers } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const nav = useNavigation();
    const errs = errorsByField(actionData?.errors ?? []);

    const [employerId, setEmployerId] = useState<string>('');
    const [cohortId, setCohortId] = useState<string>('');
    const [roleId, setRoleId] = useState<string>('');

    const filteredCohorts = useMemo(
      () => allCohorts.filter((c) => c.employerId === employerId),
      [allCohorts, employerId],
    );
    const filteredRoles = useMemo(
      () => allRoles.filter((r) => r.employerId === employerId),
      [allRoles, employerId],
    );

    // When the user picks a cohort, default the role to that cohort's role.
    function handleCohortChange(newId: string) {
      setCohortId(newId);
      const c = allCohorts.find((c) => c.id === newId);
      if (c?.roleId) setRoleId(c.roleId);
    }

    return (
      <>
        <PageHead
          breadcrumb={<><Link to="/admin/interns" style={{ color: 'inherit', textDecoration: 'none' }}>ADMIN / INTERNS</Link> / NEW</>}
          title="NEW INTERN."
          sub="Capture the intern's intake information. Personal details and internship assignment lock once saved; ongoing fields stay editable."
        />
        <section className="assessment-wrap">
          <div className="container">
            <Form method="post">
              <div className="rubric">

                <RubricPanel num="01" title="Personal Information" meta="Only the first initial and last name are stored. Identity locks once saved.">
                  <div className="id-grid" style={{ padding: '22px 28px' }}>
                    <div className={`field${errs.firstName ? ' field--error' : ''}`}>
                      <label htmlFor="first">First Name</label>
                      <input className="input" id="first" name="firstName" type="text" placeholder="e.g., Marcus" defaultValue={String(actionData?.values?.firstName ?? '')} />
                      <span className="field__hint" style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>
                        Only the first initial is saved to the record.
                      </span>
                      {errs.firstName ? <span className="field__error">{errs.firstName}</span> : null}
                    </div>
                    <div className={`field${errs.lastName ? ' field--error' : ''}`}>
                      <label htmlFor="last">Last Name</label>
                      <input className="input" id="last" name="lastName" type="text" placeholder="e.g., Patterson" defaultValue={String(actionData?.values?.lastName ?? '')} />
                      {errs.lastName ? <span className="field__error">{errs.lastName}</span> : null}
                    </div>
                  </div>
                </RubricPanel>

                <RubricPanel num="02" title="Internship Details" meta="Pick an employer to narrow the cohort and role choices. Role defaults to the cohort's role; admin may override.">
                  <div className="id-grid id-grid--5" style={{ padding: '22px 28px' }}>
                    <div className={`field${errs.employerId ? ' field--error' : ''}`}>
                      <label htmlFor="employer">Employer</label>
                      <select className="select" id="employer" name="employerId" value={employerId} onChange={(e) => { setEmployerId(e.target.value); setCohortId(''); setRoleId(''); }}>
                        <option value="">Select employer</option>
                        {employers.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                      {errs.employerId ? <span className="field__error">{errs.employerId}</span> : null}
                    </div>
                    <div className={`field${errs.cohortId ? ' field--error' : ''}`}>
                      <label htmlFor="cohort">Cohort</label>
                      <select className="select" id="cohort" name="cohortId" value={cohortId} onChange={(e) => handleCohortChange(e.target.value)} disabled={!employerId}>
                        <option value="">{employerId ? 'Select cohort' : 'Select employer first'}</option>
                        {filteredCohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {errs.cohortId ? <span className="field__error">{errs.cohortId}</span> : null}
                    </div>
                    <div className="field">
                      <label htmlFor="role">Role</label>
                      <select className="select" id="role" name="roleId" value={roleId} onChange={(e) => setRoleId(e.target.value)} disabled={!employerId}>
                        <option value="">{employerId ? 'Select role' : 'Select employer first'}</option>
                        {filteredRoles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    </div>
                    <div className={`field${errs.startDate ? ' field--error' : ''}`}>
                      <label htmlFor="startDate">Start Date</label>
                      <input className="input" id="startDate" name="startDate" type="date" defaultValue={String(actionData?.values?.startDate ?? '')} />
                      {errs.startDate ? <span className="field__error">{errs.startDate}</span> : null}
                    </div>
                    <div className={`field${errs.endDate ? ' field--error' : ''}`}>
                      <label htmlFor="endDate">End Date</label>
                      <input className="input" id="endDate" name="endDate" type="date" defaultValue={String(actionData?.values?.endDate ?? '')} />
                      {errs.endDate ? <span className="field__error">{errs.endDate}</span> : null}
                    </div>
                  </div>
                </RubricPanel>

                <RubricPanel num="03" title="Entry Assessment" meta="Barriers to entry identified at intake. Notes feed support planning.">
                  <BarrierCheckList barriers={barriers} checkedIds={(actionData?.values?.barrierIds as string[] | undefined) ?? []} />
                  <div className="rubric-notes" style={{ padding: '22px 28px', borderTop: '1px solid var(--rule)' }}>
                    <label className="rubric-notes__label" htmlFor="barrier-notes">Notes</label>
                    <textarea className="textarea" id="barrier-notes" name="entryNotes" rows={3} placeholder="Additional context, supports, or follow-up needed…" defaultValue={String(actionData?.values?.entryNotes ?? '')} />
                  </div>
                </RubricPanel>

                <RubricPanel num="04" title="Intern Self-Assessments" meta="Submissions made by the intern through the public portal.">
                  <div className="record-link-grid" style={{ padding: '22px 28px' }}>
                    {['PERSONAL GOALS', 'MID-POINT GOALS', 'PARTICIPANT FEEDBACK'].map((label) => (
                      <div className="record-link record-link--placeholder" key={label}>
                        <div className="record-link__head">
                          <span className="record-link__label">{label}</span>
                          <span className="record-link__title">{label === 'PERSONAL GOALS' ? 'Personal Goals' : label === 'MID-POINT GOALS' ? 'Mid-Point Goals' : 'Participant Feedback Form'}</span>
                        </div>
                        <span className="record-link__status">Will appear after this intern record is saved</span>
                      </div>
                    ))}
                  </div>
                </RubricPanel>

                <RubricPanel num="05" title="Evaluations" meta="Competency assessments and exit surveys for this intern.">
                  <div className="record-link-grid" style={{ padding: '22px 28px' }}>
                    <div className="record-link record-link--placeholder">
                      <div className="record-link__head">
                        <span className="record-link__label">COMPETENCY</span>
                        <span className="record-link__title">Competency Assessments</span>
                      </div>
                      <span className="record-link__status">Will appear after this intern record is saved</span>
                    </div>
                    <div className="record-link record-link--placeholder">
                      <div className="record-link__head">
                        <span className="record-link__label">EXIT SURVEY</span>
                        <span className="record-link__title">Exit Employer Survey</span>
                      </div>
                      <span className="record-link__status">Will appear after this intern record is saved</span>
                    </div>
                  </div>
                </RubricPanel>

                <RubricPanel num="06" title="Employment Details" meta="Post-placement outcomes confirmed at 90 and 180 days.">
                  <div className="outcome-check">
                    <input type="checkbox" id="o1-check" disabled />
                    <label htmlFor="o1-check">Employed at 90 days</label>
                    <span className="outcome-check__hint">To be tracked once placed</span>
                  </div>
                  <div className="outcome-check">
                    <input type="checkbox" id="o2-check" disabled />
                    <label htmlFor="o2-check">Still employed at 180 days</label>
                    <span className="outcome-check__hint">To be tracked once placed</span>
                  </div>
                </RubricPanel>

              </div>
              <ActionBar status="INTERN RECORD · NEW">
                <Link to="/admin/interns" className="btn btn--outline">Cancel</Link>
                <button type="submit" className="btn btn--primary" disabled={nav.state === 'submitting'}>
                  {nav.state === 'submitting' ? 'Saving…' : <>Save Changes <span className="btn__arrow">&rarr;</span></>}
                </button>
              </ActionBar>
            </Form>
          </div>
        </section>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- admin.interns.new
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.interns.new.tsx tests/routes/admin.interns.new.test.ts
  git commit -m "feat(admin): build intern create form (6 panels, minimum-PII)"
  ```

### Task 19: Intern record — edit (`/admin/interns/:internId`)

**Files:**
- Create: `app/routes/admin.interns.$internId.tsx`
- Create: `tests/routes/admin.interns.$internId.test.ts`

Edit mode hides panels 01-02 (identity locks once saved), shows a meta-strip with identity, and panels 03-06 stay editable. Panels 04 + 05 render the intern's self-assessment + competency cards via `assessment_submissions` lookups (read-only in this sub-project; sub-project 4 adds the editors). Delete posts to the same action with a `_intent=delete` flag and soft-deletes via `interns.deletedAt`.

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin.interns.$internId.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { loader, action } from '~/routes/admin.interns.$internId';
  import * as guard from '~/lib/admin-guard.server';
  import * as queries from '~/lib/admin-queries.server';

  describe('admin.interns.$internId loader', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('returns 404 when intern not found', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      vi.spyOn(queries, 'getInternOrNull').mockResolvedValue(null);
      const req = new Request('https://x.test/admin/interns/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      await expect(loader({ request: req, params: { internId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }, context: {} } as never)).rejects.toMatchObject({ status: 404 });
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin.interns.\$internId
  ```

  Expected: FAIL.

- [ ] **Step 3: Create `app/routes/admin.interns.$internId.tsx`**

  ```tsx
  import { Form, Link, redirect, useActionData, useLoaderData, useNavigation, useSearchParams } from 'react-router';
  import { useEffect, useState } from 'react';
  import type { Route } from './+types/admin.interns.$internId';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import {
    getInternOrNull, getInternEntry, getInternEntryBarrierIds, getInternEmploymentOutcomes,
    getCohortOrNull, getEmployerOrNull, getRoleOrNull, listBarriers,
  } from '~/lib/admin-queries.server';
  import {
    interns, internEntryAssessment, internEntryBarriers, internEmploymentOutcomes, assessmentSubmissions,
  } from '../../db/schema';
  import { and, eq, isNull, desc } from 'drizzle-orm';
  import { parseFormFields, optionalString, errorsByField } from '~/lib/validation';
  import { PageHead } from '~/components/PageHead';
  import { MetaStrip } from '~/components/MetaStrip';
  import { RubricPanel } from '~/components/RubricPanel';
  import { ActionBar } from '~/components/ActionBar';
  import { ConfirmModal } from '~/components/ConfirmModal';
  import { BarrierCheckList } from '~/components/BarrierCheckList';
  import { useToast } from '~/components/ToastProvider';
  import { formatDate } from '~/lib/format';

  export const meta: Route.MetaFunction = () => [{ title: 'Edit Intern — IMPACT Admin' }];

  export async function loader({ request, params }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const internId = params.internId!;
    const intern = await getInternOrNull(db, internId);
    if (!intern) throw new Response('Not Found', { status: 404 });
    const [cohort, entry, entryBarrierIds, outcomes, allBarriers] = await Promise.all([
      getCohortOrNull(db, intern.cohortId),
      getInternEntry(db, internId),
      getInternEntryBarrierIds(db, internId),
      getInternEmploymentOutcomes(db, internId),
      listBarriers(db),
    ]);
    const employer = cohort ? await getEmployerOrNull(db, cohort.employerId) : null;
    const role = intern.roleId ? await getRoleOrNull(db, intern.roleId) : null;

    // Per-intern submissions for panels 04 (self-assessments) + 05 (evaluations).
    const submissions = await db
      .select({
        id: assessmentSubmissions.id,
        type: assessmentSubmissions.type,
        phase: assessmentSubmissions.phase,
        submittedAt: assessmentSubmissions.submittedAt,
      })
      .from(assessmentSubmissions)
      .where(and(eq(assessmentSubmissions.internId, internId), isNull(assessmentSubmissions.deletedAt)))
      .orderBy(desc(assessmentSubmissions.submittedAt));

    return Response.json({
      intern, cohort, employer, role, entry, entryBarrierIds, outcomes, allBarriers, submissions,
    }, { headers });
  }

  export async function action({ request, params }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const internId = params.internId!;
    const formData = await request.formData();
    const intent = String(formData.get('_intent') ?? 'save');

    if (intent === 'delete') {
      await db.update(interns).set({ deletedAt: new Date() }).where(eq(interns.id, internId));
      throw redirect('/admin/interns?deleted=1', { headers });
    }

    const { values, errors } = parseFormFields(formData, {
      entryNotes: optionalString('Notes'),
      employed90Notes: optionalString('90-Day Notes'),
      employed180Notes: optionalString('180-Day Notes'),
    });
    const barrierIds = formData.getAll('barrierIds').map((v) => String(v)).filter(Boolean);
    const employed90 = formData.get('employed90') === 'on';
    const employed180 = formData.get('employed180') === 'on';

    if (errors.length > 0) {
      return Response.json({ errors }, { headers, status: 400 });
    }

    await db.transaction(async (tx) => {
      // Upsert entry assessment notes.
      await tx
        .insert(internEntryAssessment)
        .values({ internId, notes: values.entryNotes })
        .onConflictDoUpdate({
          target: internEntryAssessment.internId,
          set: { notes: values.entryNotes, updatedAt: new Date() },
        });

      // Replace entry barriers.
      await tx.delete(internEntryBarriers).where(eq(internEntryBarriers.internId, internId));
      if (barrierIds.length > 0) {
        await tx.insert(internEntryBarriers).values(
          barrierIds.map((bid) => ({ internId, barrierId: bid })),
        );
      }

      // Upsert employment outcomes.
      await tx
        .insert(internEmploymentOutcomes)
        .values({
          internId,
          employed90Day: employed90,
          employed90Notes: values.employed90Notes,
          employed180Day: employed180,
          employed180Notes: values.employed180Notes,
        })
        .onConflictDoUpdate({
          target: internEmploymentOutcomes.internId,
          set: {
            employed90Day: employed90,
            employed90Notes: values.employed90Notes,
            employed180Day: employed180,
            employed180Notes: values.employed180Notes,
            updatedAt: new Date(),
          },
        });
    });

    return Response.json({ ok: true }, { headers });
  }

  function selfCard(type: 'personal-goals' | 'midpoint-reflection' | 'participant-feedback', submission: { submittedAt: Date | string } | undefined, internId: string) {
    const label = type === 'personal-goals' ? 'PERSONAL GOALS' : type === 'midpoint-reflection' ? 'MID-POINT GOALS' : 'PARTICIPANT FEEDBACK';
    const title = type === 'personal-goals' ? 'Personal Goals' : type === 'midpoint-reflection' ? 'Mid-Point Goals' : 'Participant Feedback Form';
    if (!submission) {
      return (
        <div className="record-link record-link--placeholder" key={type}>
          <div className="record-link__head">
            <span className="record-link__label">{label}</span>
            <span className="record-link__title">{title}</span>
          </div>
          <span className="record-link__status">Not yet submitted</span>
        </div>
      );
    }
    const d = typeof submission.submittedAt === 'string' ? new Date(submission.submittedAt) : submission.submittedAt;
    return (
      <a className="record-link" href={`/admin/assessments/self/${type}?internId=${internId}`} key={type}>
        <div className="record-link__head">
          <span className="record-link__label">{label}</span>
          <span className="record-link__title">{title}</span>
        </div>
        <span className="record-link__status">Submitted on {d.toLocaleDateString()} · View →</span>
      </a>
    );
  }

  export default function EditIntern() {
    const { intern, cohort, employer, role, entry, entryBarrierIds, outcomes, allBarriers, submissions } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const nav = useNavigation();
    const errs = errorsByField(actionData?.errors ?? []);
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [deleteOpen, setDeleteOpen] = useState(false);

    useEffect(() => {
      if (searchParams.get('created') === '1') {
        toast.show({ kind: 'success', label: 'SAVED', message: 'Intern record created.' });
        searchParams.delete('created');
        setSearchParams(searchParams, { replace: true });
      }
      if (actionData && 'ok' in actionData && actionData.ok) {
        toast.show({ kind: 'success', label: 'UPDATED', message: 'Intern record updated.' });
      }
      if (actionData && 'errors' in actionData && actionData.errors.length > 0) {
        toast.show({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please fix the highlighted fields.' });
      }
    }, [actionData, searchParams, setSearchParams, toast]);

    const competencySubmissions = submissions.filter((s) => s.type === 'competency');
    const personalGoals = submissions.find((s) => s.type === 'personal-goals');
    const midpoint = submissions.find((s) => s.type === 'midpoint-reflection');
    const participant = submissions.find((s) => s.type === 'participant-feedback');
    const exit = submissions.find((s) => s.type === 'exit-employer-survey');

    return (
      <>
        <PageHead
          breadcrumb={<><Link to="/admin/interns" style={{ color: 'inherit', textDecoration: 'none' }}>ADMIN / INTERNS</Link> / EDIT</>}
          title="EDIT INTERN."
          sub="Identity and internship assignment are locked. Entry assessment and employment outcomes stay editable."
        >
          <MetaStrip items={[
            { label: 'First Initial', value: intern.firstInitial, mono: true },
            { label: 'Last Name', value: intern.lastName },
            { label: 'Employer', value: employer?.name ?? '—' },
            { label: 'Cohort', value: cohort?.name ?? '—' },
            { label: 'Role', value: role?.label ?? '—' },
            { label: 'Start', value: formatDate(intern.startDate), mono: true },
            { label: 'End', value: formatDate(intern.endDate), mono: true },
          ]} />
        </PageHead>

        <section className="assessment-wrap">
          <div className="container">
            <Form method="post">
              <div className="rubric">
                <RubricPanel num="03" title="Entry Assessment" meta="Barriers to entry identified at intake. Notes feed support planning.">
                  <BarrierCheckList barriers={allBarriers} checkedIds={entryBarrierIds} />
                  <div className="rubric-notes" style={{ padding: '22px 28px', borderTop: '1px solid var(--rule)' }}>
                    <label className="rubric-notes__label" htmlFor="barrier-notes">Notes</label>
                    <textarea className="textarea" id="barrier-notes" name="entryNotes" rows={3} placeholder="Additional context, supports, or follow-up needed…" defaultValue={entry?.notes ?? ''} />
                  </div>
                </RubricPanel>

                <RubricPanel num="04" title="Intern Self-Assessments" meta="Submissions made by the intern through the public portal.">
                  <div className="record-link-grid" style={{ padding: '22px 28px' }}>
                    {selfCard('personal-goals', personalGoals, intern.id)}
                    {selfCard('midpoint-reflection', midpoint, intern.id)}
                    {selfCard('participant-feedback', participant, intern.id)}
                  </div>
                </RubricPanel>

                <RubricPanel num="05" title="Evaluations" meta="Competency assessments and exit surveys for this intern.">
                  <div className="record-link-grid" style={{ padding: '22px 28px' }}>
                    {competencySubmissions.length === 0 ? (
                      <div className="record-link record-link--placeholder">
                        <div className="record-link__head">
                          <span className="record-link__label">COMPETENCY</span>
                          <span className="record-link__title">Competency Assessments</span>
                        </div>
                        <span className="record-link__status">No competency assessments yet</span>
                      </div>
                    ) : competencySubmissions.map((c) => (
                      <a className="record-link" href={`/admin/assessments/competency/${c.id}`} key={c.id}>
                        <div className="record-link__head">
                          <span className="record-link__label">COMPETENCY · {(c.phase ?? '').toUpperCase()}</span>
                          <span className="record-link__title">Competency Detail</span>
                        </div>
                        <span className="record-link__status">{new Date(c.submittedAt as never).toLocaleDateString()}</span>
                      </a>
                    ))}
                    {exit ? (
                      <a className="record-link" href={`/admin/assessments/exit-employer-survey?internId=${intern.id}`}>
                        <div className="record-link__head">
                          <span className="record-link__label">EXIT SURVEY</span>
                          <span className="record-link__title">Exit Employer Survey</span>
                        </div>
                        <span className="record-link__status">Submitted on {new Date(exit.submittedAt as never).toLocaleDateString()} · Edit</span>
                      </a>
                    ) : (
                      <a className="record-link" href={`/admin/assessments/exit-employer-survey?internId=${intern.id}`}>
                        <div className="record-link__head">
                          <span className="record-link__label">EXIT SURVEY</span>
                          <span className="record-link__title">Exit Employer Survey</span>
                        </div>
                        <span className="record-link__status">Not yet submitted</span>
                      </a>
                    )}
                  </div>
                </RubricPanel>

                <RubricPanel num="06" title="Employment Details" meta="Post-placement outcomes confirmed at 90 and 180 days.">
                  <div className="outcome-check">
                    <input type="checkbox" id="o1-check" name="employed90" defaultChecked={outcomes?.employed90Day ?? false} />
                    <label htmlFor="o1-check">Employed at 90 days</label>
                  </div>
                  <div className="rubric-notes" style={{ padding: '0 28px 22px' }}>
                    <label className="rubric-notes__label" htmlFor="o1-notes">90-Day Notes</label>
                    <textarea className="textarea" id="o1-notes" name="employed90Notes" rows={2} placeholder="Hire details, role, start date…" defaultValue={outcomes?.employed90Notes ?? ''} />
                  </div>
                  <div className="outcome-check">
                    <input type="checkbox" id="o2-check" name="employed180" defaultChecked={outcomes?.employed180Day ?? false} />
                    <label htmlFor="o2-check">Still employed at 180 days</label>
                  </div>
                  <div className="rubric-notes" style={{ padding: '0 28px 22px' }}>
                    <label className="rubric-notes__label" htmlFor="o2-notes">180-Day Notes</label>
                    <textarea className="textarea" id="o2-notes" name="employed180Notes" rows={2} placeholder="Continuity notes, role changes, promotions…" defaultValue={outcomes?.employed180Notes ?? ''} />
                  </div>
                </RubricPanel>
              </div>

              <ActionBar status={`INTERN RECORD · ${intern.lastName.toUpperCase()}${cohort ? ' / ' + cohort.name.toUpperCase() : ''}`}>
                <Link to="/admin/interns" className="btn btn--outline">Cancel</Link>
                <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>Delete Intern</button>
                <button type="submit" className="btn btn--primary" disabled={nav.state === 'submitting'}>
                  {nav.state === 'submitting' ? 'Saving…' : <>Save Changes <span className="btn__arrow">&rarr;</span></>}
                </button>
              </ActionBar>
            </Form>

            <Form method="post" id="delete-form">
              <input type="hidden" name="_intent" value="delete" />
            </Form>
          </div>
        </section>

        <ConfirmModal
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => {
            (document.getElementById('delete-form') as HTMLFormElement).submit();
          }}
          label="DELETE RECORD"
          title="Delete this intern record?"
          body="This intern will be removed from the cohort roster. Any competency assessments tied to their identifier will remain for historical reference."
          confirmText="Delete Permanently"
          variant="danger"
        />
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- admin.interns.\$internId
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.interns.\$internId.tsx tests/routes/admin.interns.\$internId.test.ts
  git commit -m "feat(admin): build intern record edit page with entry/employment + delete"
  ```

---

## Phase F: Settings → Employers (list, detail, new+edit)

### Task 20: Employers list `/admin/settings/employers`

**Files:**
- Create: `app/routes/admin.settings.employers._index.tsx`
- Create: `tests/routes/admin.settings.employers._index.test.ts`

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin.settings.employers._index.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { loader } from '~/routes/admin.settings.employers._index';
  import * as guard from '~/lib/admin-guard.server';
  import * as queries from '~/lib/admin-queries.server';

  describe('admin.settings.employers._index loader', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('returns employer rows with cohort counts', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      vi.spyOn(queries, 'listEmployersWithCohortCount').mockResolvedValue([
        { id: 'e1', name: 'Eskenazi Health', contactName: 'Maya', contactEmail: 'm@x.org', phone: '', notes: '', cohortCount: 2 },
      ] as never);
      const req = new Request('https://x.test/admin/settings/employers');
      const res = await loader({ request: req, params: {}, context: {} } as never);
      const body = await (res as Response).json();
      expect(body.rows[0].cohortCount).toBe(2);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin.settings.employers._index
  ```

  Expected: FAIL.

- [ ] **Step 3: Create the file**

  ```tsx
  import { Link, useLoaderData, useNavigate } from 'react-router';
  import type { Route } from './+types/admin.settings.employers._index';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import { listEmployersWithCohortCount } from '~/lib/admin-queries.server';
  import { PageHead } from '~/components/PageHead';
  import { SettingsShell } from '~/components/SettingsShell';
  import { EmptyRow } from '~/components/EmptyRow';
  import { initials } from '~/lib/format';

  export const meta: Route.MetaFunction = () => [{ title: 'Employers — Settings — IMPACT Admin' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const rows = await listEmployersWithCohortCount(db);
    return Response.json({ rows }, { headers });
  }

  export default function EmployersList() {
    const { rows } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    return (
      <>
        <PageHead breadcrumb="ADMIN / SETTINGS / EMPLOYERS" title="EMPLOYERS." sub="Program partners and the cohorts running under them." />
        <SettingsShell active="employers">
          <div className="detail-header" style={{ marginTop: 0 }}>
            <h2 className="detail-header__title">Employers</h2>
            <Link to="/admin/settings/employers/new" className="btn btn--primary">+ New Employer</Link>
          </div>
          <table className="assessments">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Name</th>
                <th style={{ width: '25%' }}>Contact</th>
                <th style={{ width: '30%' }}>Email</th>
                <th style={{ width: '15%' }}>Cohorts</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? <EmptyRow colSpan={4} message="No employers yet." /> : rows.map((e) => (
                <tr
                  key={e.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/settings/employers/${e.id}`)}
                  tabIndex={0}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); navigate(`/admin/settings/employers/${e.id}`); } }}
                >
                  <td>
                    <div className="col-name">
                      <span className="name-initial">{initials(e.name)}</span>
                      {e.name}
                    </div>
                  </td>
                  <td>{e.contactName ?? '—'}</td>
                  <td>{e.contactEmail ?? '—'}</td>
                  <td><span className="col-phase">{e.cohortCount}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- admin.settings.employers._index
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.settings.employers._index.tsx tests/routes/admin.settings.employers._index.test.ts
  git commit -m "feat(admin): build employers list page"
  ```

### Task 21: Employer create form `/admin/settings/employers/new`

**Files:**
- Create: `app/routes/admin.settings.employers.new.tsx`
- Create: `tests/routes/admin.settings.employers.new.test.ts`

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin.settings.employers.new.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { action } from '~/routes/admin.settings.employers.new';
  import * as guard from '~/lib/admin-guard.server';

  describe('admin.settings.employers.new action', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('returns errors for missing name', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      const fd = new FormData();
      fd.set('name', '');
      fd.set('contactEmail', 'a@b.co');
      const req = new Request('https://x.test/admin/settings/employers/new', { method: 'POST', body: fd });
      const res = await action({ request: req, params: {}, context: {} } as never);
      const body = await (res as Response).json();
      const fields = body.errors.map((e: { field: string }) => e.field);
      expect(fields).toContain('name');
    });

    it('returns email validation error', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      const fd = new FormData();
      fd.set('name', 'Acme');
      fd.set('contactEmail', 'not-an-email');
      const req = new Request('https://x.test/admin/settings/employers/new', { method: 'POST', body: fd });
      const res = await action({ request: req, params: {}, context: {} } as never);
      const body = await (res as Response).json();
      const fields = body.errors.map((e: { field: string }) => e.field);
      expect(fields).toContain('contactEmail');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin.settings.employers.new
  ```

  Expected: FAIL.

- [ ] **Step 3: Create `app/routes/admin.settings.employers.new.tsx`**

  ```tsx
  import { Form, Link, redirect, useActionData, useNavigation } from 'react-router';
  import type { Route } from './+types/admin.settings.employers.new';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import { employers } from '../../db/schema';
  import {
    parseFormFields, requireString, optionalEmail, optionalString, errorsByField,
  } from '~/lib/validation';
  import { PageHead } from '~/components/PageHead';
  import { SettingsShell } from '~/components/SettingsShell';
  import { IdentityCard } from '~/components/IdentityCard';
  import { ActionBar } from '~/components/ActionBar';

  export const meta: Route.MetaFunction = () => [{ title: 'New Employer — Settings — IMPACT Admin' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    return Response.json({}, { headers });
  }

  export async function action({ request }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const formData = await request.formData();
    const { values, errors } = parseFormFields(formData, {
      name: requireString('Name'),
      contactName: optionalString('Contact Name'),
      contactEmail: optionalEmail('Contact Email'),
      phone: optionalString('Phone'),
      notes: optionalString('Notes'),
    });
    if (errors.length > 0) {
      return Response.json({ errors, values }, { headers, status: 400 });
    }
    const [row] = await db
      .insert(employers)
      .values({
        name: values.name,
        contactName: values.contactName,
        contactEmail: values.contactEmail,
        phone: values.phone,
        notes: values.notes,
      })
      .returning({ id: employers.id });
    throw redirect(`/admin/settings/employers/${row.id}?created=1`, { headers });
  }

  export default function NewEmployer() {
    const actionData = useActionData<typeof action>();
    const nav = useNavigation();
    const errs = errorsByField(actionData?.errors ?? []);
    const v = (actionData?.values ?? {}) as Partial<Record<string, string | null>>;
    return (
      <>
        <PageHead
          breadcrumb={<><Link to="/admin/settings/employers" style={{ color: 'inherit', textDecoration: 'none' }}>ADMIN / SETTINGS / EMPLOYERS</Link> / NEW</>}
          title="NEW EMPLOYER."
          sub="Capture the program's point of contact at the placement organization."
        />
        <SettingsShell active="employers">
          <Form method="post">
            <IdentityCard title="Employer Record" subnote="NEW EMPLOYER · CAPTURE CONTACT INFO">
              <div className="id-grid id-grid--4">
                <div className={`field${errs.name ? ' field--error' : ''}`} style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="emp-name">Name</label>
                  <input className="input" type="text" id="emp-name" name="name" placeholder="e.g. Eskenazi Health" defaultValue={String(v.name ?? '')} />
                  {errs.name ? <span className="field__error">{errs.name}</span> : null}
                </div>
                <div className="field">
                  <label htmlFor="emp-contact">Contact Name</label>
                  <input className="input" type="text" id="emp-contact" name="contactName" placeholder="e.g. Maya Reyes" defaultValue={String(v.contactName ?? '')} />
                </div>
                <div className="field">
                  <label htmlFor="emp-phone">Phone</label>
                  <input className="input" type="text" id="emp-phone" name="phone" placeholder="(317) 555-0100" defaultValue={String(v.phone ?? '')} />
                </div>
                <div className={`field${errs.contactEmail ? ' field--error' : ''}`} style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="emp-email">Contact Email</label>
                  <input className="input" type="email" id="emp-email" name="contactEmail" placeholder="contact@example.com" defaultValue={String(v.contactEmail ?? '')} />
                  {errs.contactEmail ? <span className="field__error">{errs.contactEmail}</span> : null}
                </div>
              </div>
              <div style={{ paddingTop: 22, marginTop: 22, borderTop: '1px solid var(--rule)' }}>
                <div className="field">
                  <label htmlFor="emp-notes">Notes</label>
                  <textarea className="textarea" id="emp-notes" name="notes" rows={3} placeholder="Placement specifics, scheduling notes, account caveats…" defaultValue={String(v.notes ?? '')} />
                </div>
              </div>
            </IdentityCard>
            <ActionBar status="EMPLOYER · NEW">
              <Link to="/admin/settings/employers" className="btn btn--outline">Cancel</Link>
              <button type="submit" className="btn btn--primary" disabled={nav.state === 'submitting'}>
                {nav.state === 'submitting' ? 'Saving…' : <>Save Employer <span className="btn__arrow">&rarr;</span></>}
              </button>
            </ActionBar>
          </Form>
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- admin.settings.employers.new
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.settings.employers.new.tsx tests/routes/admin.settings.employers.new.test.ts
  git commit -m "feat(admin): build new-employer form with validation"
  ```

### Task 22: Employer detail `/admin/settings/employers/:employerId`

**Files:**
- Create: `app/routes/admin.settings.employers.$employerId._index.tsx`
- Create: `tests/routes/admin.settings.employers.$employerId.test.ts`

The page shows the employer's contact info (meta-strip + notes prose-card) + a Cohorts sub-table + a Roles sub-table, with a Delete button that posts `_intent=delete`. Delete is allowed only when no cohorts reference this employer (FK is `ON DELETE CASCADE` but we still confirm via UI; sub-projects 3-6 may add referential warnings).

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin.settings.employers.$employerId.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { loader, action } from '~/routes/admin.settings.employers.$employerId._index';
  import * as guard from '~/lib/admin-guard.server';
  import * as queries from '~/lib/admin-queries.server';

  describe('admin.settings.employers.$employerId._index', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('throws 404 when employer not found', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      vi.spyOn(queries, 'getEmployerOrNull').mockResolvedValue(null);
      const req = new Request('https://x.test/admin/settings/employers/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      await expect(loader({ request: req, params: { employerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }, context: {} } as never)).rejects.toMatchObject({ status: 404 });
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin.settings.employers.\$employerId
  ```

  Expected: FAIL.

- [ ] **Step 3: Create `app/routes/admin.settings.employers.$employerId._index.tsx`**

  ```tsx
  import { Form, Link, redirect, useLoaderData, useNavigate, useSearchParams } from 'react-router';
  import { useEffect, useState } from 'react';
  import type { Route } from './+types/admin.settings.employers.$employerId._index';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import { getEmployerOrNull, listCohortsForEmployer, listRolesForEmployerWithCohortCount } from '~/lib/admin-queries.server';
  import { employers } from '../../db/schema';
  import { eq } from 'drizzle-orm';
  import { PageHead } from '~/components/PageHead';
  import { MetaStrip } from '~/components/MetaStrip';
  import { SettingsShell } from '~/components/SettingsShell';
  import { ConfirmModal } from '~/components/ConfirmModal';
  import { EmptyRow } from '~/components/EmptyRow';
  import { useToast } from '~/components/ToastProvider';
  import { formatDate, formatPhone, initials } from '~/lib/format';

  export const meta: Route.MetaFunction = ({ data }) => [{ title: `${(data as { employer?: { name: string } } | undefined)?.employer?.name ?? 'Employer'} — Settings — IMPACT Admin` }];

  export async function loader({ request, params }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const employer = await getEmployerOrNull(db, params.employerId!);
    if (!employer) throw new Response('Not Found', { status: 404 });
    const [cohorts, roles] = await Promise.all([
      listCohortsForEmployer(db, employer.id),
      listRolesForEmployerWithCohortCount(db, employer.id),
    ]);
    return Response.json({ employer, cohorts, roles }, { headers });
  }

  export async function action({ request, params }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const fd = await request.formData();
    if (String(fd.get('_intent')) === 'delete') {
      await db.delete(employers).where(eq(employers.id, params.employerId!));
      throw redirect('/admin/settings/employers?deleted=1', { headers });
    }
    return Response.json({}, { headers });
  }

  export default function EmployerDetail() {
    const { employer, cohorts, roles } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const toast = useToast();
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [search] = useSearchParams();

    useEffect(() => {
      if (search.get('created') === '1') toast.show({ kind: 'success', label: 'CREATED', message: 'Employer created.' });
      if (search.get('updated') === '1') toast.show({ kind: 'success', label: 'UPDATED', message: 'Employer updated.' });
      if (search.get('cohortCreated') === '1') toast.show({ kind: 'success', label: 'CREATED', message: 'Cohort created.' });
      if (search.get('roleCreated') === '1') toast.show({ kind: 'success', label: 'CREATED', message: 'Role created.' });
    }, [search, toast]);

    return (
      <>
        <PageHead
          breadcrumb={<><Link to="/admin/settings/employers" style={{ color: 'inherit', textDecoration: 'none' }}>ADMIN / SETTINGS / EMPLOYERS</Link> / {employer.name.toUpperCase()}</>}
          title={`${employer.name}.`}
          sub="Contact and cohort overview."
        >
          <MetaStrip items={[
            { label: 'Contact Name', value: employer.contactName ?? '—' },
            { label: 'Email', value: employer.contactEmail ?? '—' },
            { label: 'Phone', value: formatPhone(employer.phone ?? ''), mono: true },
          ]} />
        </PageHead>
        <SettingsShell active="employers">
          <article className="prose-card">
            <span className="prose-card__label">Employer Notes</span>
            <p className="prose-card__body">{employer.notes || '—'}</p>
          </article>

          <div className="detail-actions" style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <Link to={`/admin/settings/employers/${employer.id}/edit`} className="btn btn--outline">Edit Employer</Link>
            <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>Delete Employer</button>
          </div>

          <div className="detail-header" style={{ marginTop: 48 }}>
            <h2 className="detail-header__title">Cohorts</h2>
            <Link to={`/admin/settings/employers/${employer.id}/cohorts/new`} className="btn btn--primary">+ New Cohort</Link>
          </div>
          <table className="assessments" style={{ marginBottom: 40 }}>
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Cohort</th>
                <th style={{ width: '25%' }}>Role</th>
                <th style={{ width: '20%' }}>Start</th>
                <th style={{ width: '20%' }}>Members</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.length === 0 ? <EmptyRow colSpan={4} message="No cohorts yet." /> : cohorts.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/settings/cohorts/${c.id}`)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/admin/settings/cohorts/${c.id}`); } }}>
                  <td><div className="col-name"><span className="name-initial">{initials(c.name)}</span>{c.name}</div></td>
                  <td>{c.roleLabel ?? '—'}</td>
                  <td className="col-date">{formatDate(c.startDate)}</td>
                  <td><span className="col-phase">{c.members}</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="detail-header" style={{ marginTop: 48 }}>
            <h2 className="detail-header__title">Roles</h2>
            <Link to={`/admin/settings/employers/${employer.id}/roles/new`} className="btn btn--primary">+ New Role</Link>
          </div>
          <table className="assessments" style={{ marginBottom: 40 }}>
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Role</th>
                <th style={{ width: '35%' }}>Description</th>
                <th style={{ width: '20%' }}>Cohorts Using</th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? <EmptyRow colSpan={3} message="No roles yet." /> : roles.map((r) => (
                <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/settings/roles/${r.id}`)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/admin/settings/roles/${r.id}`); } }}>
                  <td><div className="col-name"><span className="name-initial">{initials(r.label)}</span>{r.label}</div></td>
                  <td>{r.description ?? '—'}</td>
                  <td><span className="col-phase">{r.cohortCount}</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          <Form method="post" id="delete-form">
            <input type="hidden" name="_intent" value="delete" />
          </Form>
          <ConfirmModal
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onConfirm={() => (document.getElementById('delete-form') as HTMLFormElement).submit()}
            label="DELETE EMPLOYER"
            title="Delete this employer?"
            body="This employer will be removed from the program. All cohorts and roles under this employer will be cascade-deleted. This cannot be undone."
            confirmText="Delete Permanently"
            variant="danger"
          />
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- admin.settings.employers.\$employerId
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.settings.employers.\$employerId._index.tsx tests/routes/admin.settings.employers.\$employerId.test.ts
  git commit -m "feat(admin): build employer detail with cohorts + roles sub-tables + delete"
  ```

### Task 23: Employer edit `/admin/settings/employers/:employerId/edit`

**Files:**
- Create: `app/routes/admin.settings.employers.$employerId.edit.tsx`

- [ ] **Step 1: Create the file**

  ```tsx
  import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
  import type { Route } from './+types/admin.settings.employers.$employerId.edit';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import { getEmployerOrNull } from '~/lib/admin-queries.server';
  import { employers } from '../../db/schema';
  import { eq } from 'drizzle-orm';
  import {
    parseFormFields, requireString, optionalEmail, optionalString, errorsByField,
  } from '~/lib/validation';
  import { PageHead } from '~/components/PageHead';
  import { SettingsShell } from '~/components/SettingsShell';
  import { IdentityCard } from '~/components/IdentityCard';
  import { ActionBar } from '~/components/ActionBar';

  export const meta: Route.MetaFunction = () => [{ title: 'Edit Employer — Settings — IMPACT Admin' }];

  export async function loader({ request, params }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const employer = await getEmployerOrNull(db, params.employerId!);
    if (!employer) throw new Response('Not Found', { status: 404 });
    return Response.json({ employer }, { headers });
  }

  export async function action({ request, params }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const fd = await request.formData();
    const { values, errors } = parseFormFields(fd, {
      name: requireString('Name'),
      contactName: optionalString('Contact Name'),
      contactEmail: optionalEmail('Contact Email'),
      phone: optionalString('Phone'),
      notes: optionalString('Notes'),
    });
    if (errors.length > 0) {
      return Response.json({ errors, values }, { headers, status: 400 });
    }
    await db
      .update(employers)
      .set({
        name: values.name,
        contactName: values.contactName,
        contactEmail: values.contactEmail,
        phone: values.phone,
        notes: values.notes,
        updatedAt: new Date(),
      })
      .where(eq(employers.id, params.employerId!));
    throw redirect(`/admin/settings/employers/${params.employerId}?updated=1`, { headers });
  }

  export default function EditEmployer() {
    const { employer } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const nav = useNavigation();
    const errs = errorsByField(actionData?.errors ?? []);
    const v = (actionData?.values ?? employer) as { name?: string; contactName?: string | null; contactEmail?: string | null; phone?: string | null; notes?: string | null };
    return (
      <>
        <PageHead
          breadcrumb={<><Link to="/admin/settings/employers" style={{ color: 'inherit', textDecoration: 'none' }}>ADMIN / SETTINGS / EMPLOYERS</Link> / EDIT</>}
          title="EDIT EMPLOYER."
          sub="Update the program's point of contact at the placement organization."
        />
        <SettingsShell active="employers">
          <Form method="post">
            <IdentityCard title="Employer Record" subnote="EDIT EMPLOYER · UPDATE CONTACT INFO">
              <div className="id-grid id-grid--4">
                <div className={`field${errs.name ? ' field--error' : ''}`} style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="emp-name">Name</label>
                  <input className="input" type="text" id="emp-name" name="name" defaultValue={v.name ?? ''} />
                  {errs.name ? <span className="field__error">{errs.name}</span> : null}
                </div>
                <div className="field">
                  <label htmlFor="emp-contact">Contact Name</label>
                  <input className="input" type="text" id="emp-contact" name="contactName" defaultValue={v.contactName ?? ''} />
                </div>
                <div className="field">
                  <label htmlFor="emp-phone">Phone</label>
                  <input className="input" type="text" id="emp-phone" name="phone" defaultValue={v.phone ?? ''} />
                </div>
                <div className={`field${errs.contactEmail ? ' field--error' : ''}`} style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="emp-email">Contact Email</label>
                  <input className="input" type="email" id="emp-email" name="contactEmail" defaultValue={v.contactEmail ?? ''} />
                  {errs.contactEmail ? <span className="field__error">{errs.contactEmail}</span> : null}
                </div>
              </div>
              <div style={{ paddingTop: 22, marginTop: 22, borderTop: '1px solid var(--rule)' }}>
                <div className="field">
                  <label htmlFor="emp-notes">Notes</label>
                  <textarea className="textarea" id="emp-notes" name="notes" rows={3} defaultValue={v.notes ?? ''} />
                </div>
              </div>
            </IdentityCard>
            <ActionBar status="EMPLOYER · EDIT">
              <Link to={`/admin/settings/employers/${employer.id}`} className="btn btn--outline">Cancel</Link>
              <button type="submit" className="btn btn--primary" disabled={nav.state === 'submitting'}>
                {nav.state === 'submitting' ? 'Saving…' : <>Save Employer <span className="btn__arrow">&rarr;</span></>}
              </button>
            </ActionBar>
          </Form>
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/admin.settings.employers.\$employerId.edit.tsx
  git commit -m "feat(admin): build employer edit form"
  ```

---

## Phase G: Settings → Cohorts (under employer)

### Task 24: `<PhaseMultiSelect>` component

**Files:**
- Create: `app/components/PhaseMultiSelect.tsx`

- [ ] **Step 1: Create the file**

  ```tsx
  export interface PhaseItem { id: string; label: string }

  export function PhaseMultiSelect({
    phases,
    selectedIds,
    name = 'phaseIds',
    legend = 'Phases applicable to this cohort',
    error,
  }: {
    phases: PhaseItem[];
    selectedIds: string[];
    name?: string;
    legend?: string;
    error?: string;
  }) {
    const set = new Set(selectedIds);
    return (
      <fieldset className={`phase-multi-select${error ? ' input--error' : ''}`}>
        <legend>{legend}</legend>
        {phases.map((p) => {
          const id = `phase-${p.id}`;
          return (
            <label className="phase-multi-select__item" key={p.id} htmlFor={id}>
              <input type="checkbox" id={id} name={name} value={p.id} defaultChecked={set.has(p.id)} />
              <span>{p.label}</span>
            </label>
          );
        })}
        {error ? <div className="field__error" style={{ marginTop: 8 }}>{error}</div> : null}
      </fieldset>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/PhaseMultiSelect.tsx
  git commit -m "feat(admin): add PhaseMultiSelect component"
  ```

### Task 25: Cohort new `/admin/settings/employers/:employerId/cohorts/new`

**Files:**
- Create: `app/routes/admin.settings.employers.$employerId.cohorts.new.tsx`
- Create: `tests/routes/admin.settings.cohorts.new.test.ts`

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin.settings.cohorts.new.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { action } from '~/routes/admin.settings.employers.$employerId.cohorts.new';
  import * as guard from '~/lib/admin-guard.server';
  import * as queries from '~/lib/admin-queries.server';

  describe('cohort new action', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('rejects when no phases are picked', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      vi.spyOn(queries, 'getEmployerOrNull').mockResolvedValue({ id: 'e1', name: 'Eskenazi Health' } as never);
      const fd = new FormData();
      fd.set('name', 'C1');
      fd.set('roleId', '22222222-2222-2222-2222-222222222201');
      fd.set('startDate', '2026-04-01');
      fd.set('endDate', '2026-09-30');
      const req = new Request('https://x.test/admin/settings/employers/e1/cohorts/new', { method: 'POST', body: fd });
      const res = await action({ request: req, params: { employerId: 'e1' }, context: {} } as never);
      const body = await (res as Response).json();
      const fields = body.errors.map((e: { field: string }) => e.field);
      expect(fields).toContain('phaseIds');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin.settings.cohorts.new
  ```

  Expected: FAIL.

- [ ] **Step 3: Create the file**

  ```tsx
  import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
  import type { Route } from './+types/admin.settings.employers.$employerId.cohorts.new';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import {
    getEmployerOrNull, listRolesForEmployerWithCohortCount, listPhases,
  } from '~/lib/admin-queries.server';
  import { cohorts, cohortPhases } from '../../db/schema';
  import {
    parseFormFields, requireString, requireDate, optionalString, optionalUuid, errorsByField,
  } from '~/lib/validation';
  import { PageHead } from '~/components/PageHead';
  import { SettingsShell } from '~/components/SettingsShell';
  import { IdentityCard } from '~/components/IdentityCard';
  import { ActionBar } from '~/components/ActionBar';
  import { PhaseMultiSelect } from '~/components/PhaseMultiSelect';

  export const meta: Route.MetaFunction = () => [{ title: 'New Cohort — IMPACT Admin' }];

  export async function loader({ request, params }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const employer = await getEmployerOrNull(db, params.employerId!);
    if (!employer) throw new Response('Not Found', { status: 404 });
    const [roles, phases] = await Promise.all([
      listRolesForEmployerWithCohortCount(db, employer.id),
      listPhases(db),
    ]);
    return Response.json({ employer, roles, phases }, { headers });
  }

  export async function action({ request, params }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const employer = await getEmployerOrNull(db, params.employerId!);
    if (!employer) throw new Response('Not Found', { status: 404 });
    const fd = await request.formData();
    const { values, errors } = parseFormFields(fd, {
      name: requireString('Name'),
      roleId: optionalUuid('Role'),
      startDate: requireDate('Start Date'),
      endDate: requireDate('End Date'),
      description: optionalString('Description'),
    });
    const phaseIds = fd.getAll('phaseIds').map((v) => String(v)).filter(Boolean);
    if (phaseIds.length === 0) {
      errors.push({ field: 'phaseIds', message: 'Pick at least one phase for this cohort.' });
    }
    if (errors.length > 0) {
      return Response.json({ errors, values, phaseIds }, { headers, status: 400 });
    }

    const cohortId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(cohorts)
        .values({
          employerId: employer.id,
          roleId: values.roleId,
          name: values.name,
          startDate: values.startDate,
          endDate: values.endDate,
          description: values.description,
        })
        .returning({ id: cohorts.id });
      await tx.insert(cohortPhases).values(
        phaseIds.map((pid, idx) => ({ cohortId: row.id, phaseId: pid, sortOrder: idx + 1 })),
      );
      return row.id;
    });

    throw redirect(`/admin/settings/cohorts/${cohortId}?created=1`, { headers });
  }

  export default function NewCohort() {
    const { employer, roles, phases } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const nav = useNavigation();
    const errs = errorsByField(actionData?.errors ?? []);
    const v = (actionData?.values ?? {}) as Partial<Record<string, string | null>>;
    const phaseIds = (actionData?.phaseIds ?? []) as string[];
    return (
      <>
        <PageHead
          breadcrumb={<>
            <Link to="/admin/settings/employers" style={{ color: 'inherit', textDecoration: 'none' }}>ADMIN / SETTINGS / EMPLOYERS</Link>
            {' / '}
            <Link to={`/admin/settings/employers/${employer.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{employer.name.toUpperCase()}</Link>
            {' / NEW COHORT'}
          </>}
          title="NEW COHORT."
          sub="Create a cohort and define its assessment phases."
        />
        <SettingsShell active="employers">
          <Form method="post">
            <IdentityCard title="Cohort Record" subnote="NEW COHORT · DEFINE IDENTITY AND PHASES">
              <div className="id-grid id-grid--4">
                <div className={`field${errs.name ? ' field--error' : ''}`}>
                  <label htmlFor="co-name">Name</label>
                  <input className="input" type="text" id="co-name" name="name" placeholder="e.g. Eskenazi 2026" defaultValue={String(v.name ?? '')} />
                  {errs.name ? <span className="field__error">{errs.name}</span> : null}
                </div>
                <div className="field">
                  <label htmlFor="co-role">Role</label>
                  <select className="select" id="co-role" name="roleId" defaultValue={String(v.roleId ?? '')}>
                    <option value="">Select role…</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div className={`field${errs.startDate ? ' field--error' : ''}`}>
                  <label htmlFor="co-start">Start Date</label>
                  <input className="input" type="date" id="co-start" name="startDate" defaultValue={String(v.startDate ?? '')} />
                  {errs.startDate ? <span className="field__error">{errs.startDate}</span> : null}
                </div>
                <div className={`field${errs.endDate ? ' field--error' : ''}`}>
                  <label htmlFor="co-end">End Date</label>
                  <input className="input" type="date" id="co-end" name="endDate" defaultValue={String(v.endDate ?? '')} />
                  {errs.endDate ? <span className="field__error">{errs.endDate}</span> : null}
                </div>
              </div>
              <div style={{ paddingTop: 22, marginTop: 22, borderTop: '1px solid var(--rule)' }}>
                <div className="field">
                  <label htmlFor="co-desc">Description</label>
                  <textarea className="textarea" id="co-desc" name="description" rows={3} placeholder="Role overview, rotation structure, credentials earned…" defaultValue={String(v.description ?? '')} />
                </div>
              </div>
            </IdentityCard>
            <div className="detail-header" style={{ marginTop: 32 }}>
              <h2 className="detail-header__title">Phases</h2>
            </div>
            <PhaseMultiSelect phases={phases} selectedIds={phaseIds} error={errs.phaseIds} />
            <ActionBar status="COHORT RECORD · NEW">
              <Link to={`/admin/settings/employers/${employer.id}`} className="btn btn--outline">Cancel</Link>
              <button type="submit" className="btn btn--primary" disabled={nav.state === 'submitting'}>
                {nav.state === 'submitting' ? 'Saving…' : <>Create Cohort <span className="btn__arrow">&rarr;</span></>}
              </button>
            </ActionBar>
          </Form>
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- admin.settings.cohorts.new
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.settings.employers.\$employerId.cohorts.new.tsx tests/routes/admin.settings.cohorts.new.test.ts
  git commit -m "feat(admin): build new-cohort form under employer"
  ```

### Task 26: Cohort detail `/admin/settings/cohorts/:cohortId`

**Files:**
- Create: `app/routes/admin.settings.cohorts.$cohortId._index.tsx`
- Create: `tests/routes/admin.settings.cohorts.$cohortId.test.ts`

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin.settings.cohorts.$cohortId.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { loader } from '~/routes/admin.settings.cohorts.$cohortId._index';
  import * as guard from '~/lib/admin-guard.server';
  import * as queries from '~/lib/admin-queries.server';

  describe('cohort detail loader', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('throws 404 when cohort not found', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      vi.spyOn(queries, 'getCohortOrNull').mockResolvedValue(null);
      const req = new Request('https://x.test/admin/settings/cohorts/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      await expect(loader({ request: req, params: { cohortId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }, context: {} } as never)).rejects.toMatchObject({ status: 404 });
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin.settings.cohorts.\$cohortId
  ```

  Expected: FAIL.

- [ ] **Step 3: Create the file**

  ```tsx
  import { Form, Link, redirect, useLoaderData, useNavigate } from 'react-router';
  import { useState } from 'react';
  import type { Route } from './+types/admin.settings.cohorts.$cohortId._index';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import {
    getCohortOrNull, getEmployerOrNull, getRoleOrNull, listPhasesForCohort, listInternsByCohort,
  } from '~/lib/admin-queries.server';
  import { cohorts as cohortsTbl } from '../../db/schema';
  import { eq } from 'drizzle-orm';
  import { PageHead } from '~/components/PageHead';
  import { MetaStrip } from '~/components/MetaStrip';
  import { SettingsShell } from '~/components/SettingsShell';
  import { ConfirmModal } from '~/components/ConfirmModal';
  import { EmptyRow } from '~/components/EmptyRow';
  import { formatDate, initials } from '~/lib/format';

  export const meta: Route.MetaFunction = ({ data }) => [{ title: `${(data as { cohort?: { name: string } } | undefined)?.cohort?.name ?? 'Cohort'} — Cohort — IMPACT Admin` }];

  export async function loader({ request, params }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const cohort = await getCohortOrNull(db, params.cohortId!);
    if (!cohort) throw new Response('Not Found', { status: 404 });
    const [employer, role, phases, interns] = await Promise.all([
      getEmployerOrNull(db, cohort.employerId),
      cohort.roleId ? getRoleOrNull(db, cohort.roleId) : Promise.resolve(null),
      listPhasesForCohort(db, cohort.id),
      listInternsByCohort(db, cohort.id),
    ]);
    return Response.json({ cohort, employer, role, phases, interns }, { headers });
  }

  export async function action({ request, params }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const fd = await request.formData();
    if (String(fd.get('_intent')) === 'delete') {
      const cohort = await getCohortOrNull(db, params.cohortId!);
      await db.delete(cohortsTbl).where(eq(cohortsTbl.id, params.cohortId!));
      throw redirect(`/admin/settings/employers/${cohort?.employerId ?? ''}?deleted=1`, { headers });
    }
    return Response.json({}, { headers });
  }

  export default function CohortDetail() {
    const { cohort, employer, role, phases, interns } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const [deleteOpen, setDeleteOpen] = useState(false);
    return (
      <>
        <PageHead
          breadcrumb={<>
            <Link to="/admin/settings/employers" style={{ color: 'inherit', textDecoration: 'none' }}>ADMIN / SETTINGS / EMPLOYERS</Link>
            {' / '}
            {employer ? <Link to={`/admin/settings/employers/${employer.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{employer.name.toUpperCase()}</Link> : 'EMPLOYER'}
            {' / COHORT'}
          </>}
          title={`${cohort.name}.`}
          sub="Cohort overview, phase structure, and placement details."
        >
          <MetaStrip items={[
            { label: 'Employer', value: employer?.name ?? '—' },
            { label: 'Role', value: role?.label ?? '—' },
            { label: 'Start', value: formatDate(cohort.startDate), mono: true },
            { label: 'End', value: formatDate(cohort.endDate), mono: true },
            { label: 'Members', value: String(interns.length).padStart(2, '0'), mono: true },
          ]} />
        </PageHead>
        <SettingsShell active="employers">
          <article className="prose-card">
            <span className="prose-card__label">Cohort Description</span>
            <p className="prose-card__body">{cohort.description || 'No description recorded.'}</p>
          </article>

          <div className="detail-header" style={{ marginTop: 32 }}>
            <h2 className="detail-header__title">Phases</h2>
            <span className="micro-label">Assessment phases applicable to this cohort</span>
          </div>
          <p style={{ color: 'var(--muted)' }}>{phases.length === 0 ? 'No phases configured.' : phases.map((p) => p.label).join(', ')}</p>

          <div className="detail-header" style={{ marginTop: 48 }}>
            <h2 className="detail-header__title">Enrolled Interns</h2>
            <span className="micro-label">{String(interns.length).padStart(2, '0')} ACTIVE</span>
          </div>
          <table className="assessments" style={{ marginBottom: 40 }}>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Last Name</th>
                <th style={{ width: '25%' }}>Start Date</th>
                <th style={{ width: '35%' }}>End Date</th>
              </tr>
            </thead>
            <tbody>
              {interns.length === 0 ? <EmptyRow colSpan={3} message="No interns enrolled yet." /> : interns.map((i) => {
                const name = `${i.firstInitial}. ${i.lastName}`;
                return (
                  <tr key={i.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/interns/${i.id}`)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/admin/interns/${i.id}`); } }}>
                    <td><div className="col-name"><span className="name-initial">{initials(i.lastName)}</span>{name}</div></td>
                    <td className="col-date">{formatDate(i.startDate)}</td>
                    <td className="col-date">{formatDate(i.endDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="detail-actions" style={{ display: 'flex', gap: 10 }}>
            <Link to={employer ? `/admin/settings/employers/${employer.id}` : '/admin/settings/employers'} className="btn btn--outline">&larr; Close</Link>
            <Link to={`/admin/settings/cohorts/${cohort.id}/edit`} className="btn btn--primary">Edit Cohort</Link>
            <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>Delete Cohort</button>
          </div>

          <Form method="post" id="delete-cohort-form">
            <input type="hidden" name="_intent" value="delete" />
          </Form>
          <ConfirmModal
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onConfirm={() => (document.getElementById('delete-cohort-form') as HTMLFormElement).submit()}
            label="DELETE RECORD"
            title="Delete this cohort?"
            body="Removing this cohort will not delete its assessment records, but the cohort will no longer appear in dropdowns or filters. This cannot be undone."
            confirmText="Delete Permanently"
            variant="danger"
          />
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- admin.settings.cohorts.\$cohortId
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.settings.cohorts.\$cohortId._index.tsx tests/routes/admin.settings.cohorts.\$cohortId.test.ts
  git commit -m "feat(admin): build cohort detail with phases + enrolled interns + delete"
  ```

### Task 27: Cohort edit `/admin/settings/cohorts/:cohortId/edit`

**Files:**
- Create: `app/routes/admin.settings.cohorts.$cohortId.edit.tsx`

- [ ] **Step 1: Create the file**

  ```tsx
  import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
  import type { Route } from './+types/admin.settings.cohorts.$cohortId.edit';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import {
    getCohortOrNull, getEmployerOrNull, listRolesForEmployerWithCohortCount, listPhases, listPhasesForCohort,
  } from '~/lib/admin-queries.server';
  import { cohorts as cohortsTbl, cohortPhases } from '../../db/schema';
  import { eq } from 'drizzle-orm';
  import {
    parseFormFields, requireString, requireDate, optionalString, optionalUuid, errorsByField,
  } from '~/lib/validation';
  import { PageHead } from '~/components/PageHead';
  import { SettingsShell } from '~/components/SettingsShell';
  import { IdentityCard } from '~/components/IdentityCard';
  import { ActionBar } from '~/components/ActionBar';
  import { PhaseMultiSelect } from '~/components/PhaseMultiSelect';

  export const meta: Route.MetaFunction = () => [{ title: 'Edit Cohort — IMPACT Admin' }];

  export async function loader({ request, params }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const cohort = await getCohortOrNull(db, params.cohortId!);
    if (!cohort) throw new Response('Not Found', { status: 404 });
    const employer = await getEmployerOrNull(db, cohort.employerId);
    const [roles, phases, cohortPhaseRows] = await Promise.all([
      employer ? listRolesForEmployerWithCohortCount(db, employer.id) : Promise.resolve([]),
      listPhases(db),
      listPhasesForCohort(db, cohort.id),
    ]);
    return Response.json({ cohort, employer, roles, phases, selectedPhaseIds: cohortPhaseRows.map((p) => p.id) }, { headers });
  }

  export async function action({ request, params }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const fd = await request.formData();
    const { values, errors } = parseFormFields(fd, {
      name: requireString('Name'),
      roleId: optionalUuid('Role'),
      startDate: requireDate('Start Date'),
      endDate: requireDate('End Date'),
      description: optionalString('Description'),
    });
    const phaseIds = fd.getAll('phaseIds').map((v) => String(v)).filter(Boolean);
    if (phaseIds.length === 0) {
      errors.push({ field: 'phaseIds', message: 'Pick at least one phase for this cohort.' });
    }
    if (errors.length > 0) {
      return Response.json({ errors, values, phaseIds }, { headers, status: 400 });
    }
    await db.transaction(async (tx) => {
      await tx
        .update(cohortsTbl)
        .set({
          name: values.name,
          roleId: values.roleId,
          startDate: values.startDate,
          endDate: values.endDate,
          description: values.description,
          updatedAt: new Date(),
        })
        .where(eq(cohortsTbl.id, params.cohortId!));
      await tx.delete(cohortPhases).where(eq(cohortPhases.cohortId, params.cohortId!));
      await tx.insert(cohortPhases).values(
        phaseIds.map((pid, idx) => ({ cohortId: params.cohortId!, phaseId: pid, sortOrder: idx + 1 })),
      );
    });
    throw redirect(`/admin/settings/cohorts/${params.cohortId}?updated=1`, { headers });
  }

  export default function EditCohort() {
    const { cohort, employer, roles, phases, selectedPhaseIds } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const nav = useNavigation();
    const errs = errorsByField(actionData?.errors ?? []);
    const v = (actionData?.values ?? cohort) as { name?: string; roleId?: string | null; startDate?: string | null; endDate?: string | null; description?: string | null };
    const phaseIds = (actionData?.phaseIds ?? selectedPhaseIds) as string[];
    return (
      <>
        <PageHead
          breadcrumb={<>
            <Link to="/admin/settings/employers" style={{ color: 'inherit', textDecoration: 'none' }}>ADMIN / SETTINGS / EMPLOYERS</Link>
            {' / '}
            {employer ? <Link to={`/admin/settings/employers/${employer.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{employer.name.toUpperCase()}</Link> : 'EMPLOYER'}
            {' / EDIT COHORT'}
          </>}
          title="EDIT COHORT."
          sub="Update the cohort's identity, role, dates, and phases."
        />
        <SettingsShell active="employers">
          <Form method="post">
            <IdentityCard title="Cohort Record" subnote="EDIT COHORT · UPDATE IDENTITY AND PHASES">
              <div className="id-grid id-grid--4">
                <div className={`field${errs.name ? ' field--error' : ''}`}>
                  <label htmlFor="co-name">Name</label>
                  <input className="input" type="text" id="co-name" name="name" defaultValue={v.name ?? ''} />
                  {errs.name ? <span className="field__error">{errs.name}</span> : null}
                </div>
                <div className="field">
                  <label htmlFor="co-role">Role</label>
                  <select className="select" id="co-role" name="roleId" defaultValue={v.roleId ?? ''}>
                    <option value="">Select role…</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div className={`field${errs.startDate ? ' field--error' : ''}`}>
                  <label htmlFor="co-start">Start Date</label>
                  <input className="input" type="date" id="co-start" name="startDate" defaultValue={v.startDate ?? ''} />
                  {errs.startDate ? <span className="field__error">{errs.startDate}</span> : null}
                </div>
                <div className={`field${errs.endDate ? ' field--error' : ''}`}>
                  <label htmlFor="co-end">End Date</label>
                  <input className="input" type="date" id="co-end" name="endDate" defaultValue={v.endDate ?? ''} />
                  {errs.endDate ? <span className="field__error">{errs.endDate}</span> : null}
                </div>
              </div>
              <div style={{ paddingTop: 22, marginTop: 22, borderTop: '1px solid var(--rule)' }}>
                <div className="field">
                  <label htmlFor="co-desc">Description</label>
                  <textarea className="textarea" id="co-desc" name="description" rows={3} defaultValue={v.description ?? ''} />
                </div>
              </div>
            </IdentityCard>
            <div className="detail-header" style={{ marginTop: 32 }}>
              <h2 className="detail-header__title">Phases</h2>
            </div>
            <PhaseMultiSelect phases={phases} selectedIds={phaseIds} error={errs.phaseIds} />
            <ActionBar status="COHORT RECORD · EDIT">
              <Link to={`/admin/settings/cohorts/${cohort.id}`} className="btn btn--outline">Cancel</Link>
              <button type="submit" className="btn btn--primary" disabled={nav.state === 'submitting'}>
                {nav.state === 'submitting' ? 'Saving…' : <>Save Cohort <span className="btn__arrow">&rarr;</span></>}
              </button>
            </ActionBar>
          </Form>
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/admin.settings.cohorts.\$cohortId.edit.tsx
  git commit -m "feat(admin): build cohort edit form"
  ```

---

## Phase H: Settings → Roles (under employer)

### Task 28: Role new `/admin/settings/employers/:employerId/roles/new`

**Files:**
- Create: `app/routes/admin.settings.employers.$employerId.roles.new.tsx`
- Create: `tests/routes/admin.settings.roles.new.test.ts`

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin.settings.roles.new.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { action } from '~/routes/admin.settings.employers.$employerId.roles.new';
  import * as guard from '~/lib/admin-guard.server';
  import * as queries from '~/lib/admin-queries.server';

  describe('role new action', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('rejects empty name', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      vi.spyOn(queries, 'getEmployerOrNull').mockResolvedValue({ id: 'e1', name: 'X' } as never);
      const fd = new FormData();
      fd.set('label', '');
      const req = new Request('https://x.test/admin/settings/employers/e1/roles/new', { method: 'POST', body: fd });
      const res = await action({ request: req, params: { employerId: 'e1' }, context: {} } as never);
      const body = await (res as Response).json();
      expect(body.errors.map((e: { field: string }) => e.field)).toContain('label');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin.settings.roles.new
  ```

  Expected: FAIL.

- [ ] **Step 3: Create the file**

  ```tsx
  import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
  import type { Route } from './+types/admin.settings.employers.$employerId.roles.new';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import { getEmployerOrNull } from '~/lib/admin-queries.server';
  import { roles as rolesTbl } from '../../db/schema';
  import {
    parseFormFields, requireString, optionalString, errorsByField,
  } from '~/lib/validation';
  import { PageHead } from '~/components/PageHead';
  import { SettingsShell } from '~/components/SettingsShell';
  import { IdentityCard } from '~/components/IdentityCard';
  import { ActionBar } from '~/components/ActionBar';

  export const meta: Route.MetaFunction = () => [{ title: 'New Role — IMPACT Admin' }];

  export async function loader({ request, params }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const employer = await getEmployerOrNull(db, params.employerId!);
    if (!employer) throw new Response('Not Found', { status: 404 });
    return Response.json({ employer }, { headers });
  }

  export async function action({ request, params }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const employer = await getEmployerOrNull(db, params.employerId!);
    if (!employer) throw new Response('Not Found', { status: 404 });
    const fd = await request.formData();
    const { values, errors } = parseFormFields(fd, {
      label: requireString('Role Name'),
      description: optionalString('Description'),
    });
    if (errors.length > 0) {
      return Response.json({ errors, values }, { headers, status: 400 });
    }
    const [row] = await db
      .insert(rolesTbl)
      .values({ employerId: employer.id, label: values.label, description: values.description })
      .returning({ id: rolesTbl.id });
    throw redirect(`/admin/settings/employers/${employer.id}?roleCreated=1#role-${row.id}`, { headers });
  }

  export default function NewRole() {
    const { employer } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const nav = useNavigation();
    const errs = errorsByField(actionData?.errors ?? []);
    const v = (actionData?.values ?? {}) as Partial<Record<string, string | null>>;
    return (
      <>
        <PageHead
          breadcrumb={<>
            <Link to="/admin/settings/employers" style={{ color: 'inherit', textDecoration: 'none' }}>ADMIN / SETTINGS / EMPLOYERS</Link>
            {' / '}
            <Link to={`/admin/settings/employers/${employer.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{employer.name.toUpperCase()}</Link>
            {' / NEW ROLE'}
          </>}
          title="NEW ROLE."
          sub="Define a role under this employer. Cohorts and intern records can reference roles when assigning placements."
        />
        <SettingsShell active="employers">
          <Form method="post">
            <IdentityCard title="Role Record" subnote="NEW ROLE · DEFINE DETAILS">
              <div className="id-grid id-grid--4">
                <div className={`field${errs.label ? ' field--error' : ''}`} style={{ gridColumn: 'span 4' }}>
                  <label htmlFor="r-name">Role Name</label>
                  <input className="input" type="text" id="r-name" name="label" placeholder="e.g. Medical Assistant" defaultValue={String(v.label ?? '')} />
                  {errs.label ? <span className="field__error">{errs.label}</span> : null}
                </div>
              </div>
              <div style={{ paddingTop: 22, marginTop: 22, borderTop: '1px solid var(--rule)' }}>
                <div className="field">
                  <label htmlFor="r-desc">Description</label>
                  <textarea className="textarea" id="r-desc" name="description" rows={3} placeholder="Role overview, responsibilities, credentials earned…" defaultValue={String(v.description ?? '')} />
                </div>
              </div>
            </IdentityCard>
            <ActionBar status="ROLE RECORD · NEW">
              <Link to={`/admin/settings/employers/${employer.id}`} className="btn btn--outline">Cancel</Link>
              <button type="submit" className="btn btn--primary" disabled={nav.state === 'submitting'}>
                {nav.state === 'submitting' ? 'Saving…' : <>Create Role <span className="btn__arrow">&rarr;</span></>}
              </button>
            </ActionBar>
          </Form>
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- admin.settings.roles.new
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.settings.employers.\$employerId.roles.new.tsx tests/routes/admin.settings.roles.new.test.ts
  git commit -m "feat(admin): build new-role form under employer"
  ```

### Task 29: Role detail `/admin/settings/roles/:roleId`

**Files:**
- Create: `app/routes/admin.settings.roles.$roleId._index.tsx`
- Create: `tests/routes/admin.settings.roles.$roleId.test.ts`

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin.settings.roles.$roleId.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { loader } from '~/routes/admin.settings.roles.$roleId._index';
  import * as guard from '~/lib/admin-guard.server';
  import * as queries from '~/lib/admin-queries.server';

  describe('role detail loader', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('throws 404 when not found', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      vi.spyOn(queries, 'getRoleOrNull').mockResolvedValue(null);
      const req = new Request('https://x.test/admin/settings/roles/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      await expect(loader({ request: req, params: { roleId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }, context: {} } as never)).rejects.toMatchObject({ status: 404 });
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin.settings.roles.\$roleId
  ```

  Expected: FAIL.

- [ ] **Step 3: Create the file**

  ```tsx
  import { Form, Link, redirect, useLoaderData, useNavigate } from 'react-router';
  import { useState } from 'react';
  import type { Route } from './+types/admin.settings.roles.$roleId._index';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import {
    getRoleOrNull, getEmployerOrNull, listCohortsUsingRole,
  } from '~/lib/admin-queries.server';
  import { roles as rolesTbl } from '../../db/schema';
  import { eq } from 'drizzle-orm';
  import { PageHead } from '~/components/PageHead';
  import { MetaStrip } from '~/components/MetaStrip';
  import { SettingsShell } from '~/components/SettingsShell';
  import { ConfirmModal } from '~/components/ConfirmModal';
  import { EmptyRow } from '~/components/EmptyRow';
  import { formatDate, initials } from '~/lib/format';

  export const meta: Route.MetaFunction = ({ data }) => [{ title: `${(data as { role?: { label: string } } | undefined)?.role?.label ?? 'Role'} — Role — IMPACT Admin` }];

  export async function loader({ request, params }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const role = await getRoleOrNull(db, params.roleId!);
    if (!role) throw new Response('Not Found', { status: 404 });
    const [employer, cohorts] = await Promise.all([
      getEmployerOrNull(db, role.employerId),
      listCohortsUsingRole(db, role.id),
    ]);
    return Response.json({ role, employer, cohorts }, { headers });
  }

  export async function action({ request, params }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const fd = await request.formData();
    if (String(fd.get('_intent')) === 'delete') {
      const role = await getRoleOrNull(db, params.roleId!);
      await db.delete(rolesTbl).where(eq(rolesTbl.id, params.roleId!));
      throw redirect(`/admin/settings/employers/${role?.employerId ?? ''}?deleted=1`, { headers });
    }
    return Response.json({}, { headers });
  }

  export default function RoleDetail() {
    const { role, employer, cohorts } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const [deleteOpen, setDeleteOpen] = useState(false);
    return (
      <>
        <PageHead
          breadcrumb={<>
            <Link to="/admin/settings/employers" style={{ color: 'inherit', textDecoration: 'none' }}>ADMIN / SETTINGS / EMPLOYERS</Link>
            {' / '}
            {employer ? <Link to={`/admin/settings/employers/${employer.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{employer.name.toUpperCase()}</Link> : 'EMPLOYER'}
            {' / '}{role.label.toUpperCase()}
          </>}
          title={`${role.label}.`}
          sub="Role detail. Cohorts and intern records under this employer can reference this role when assigning placements."
        >
          <MetaStrip items={[
            { label: 'Role Name', value: role.label },
            { label: 'Employer', value: employer?.name ?? '—' },
            { label: 'Cohorts using', value: String(cohorts.length).padStart(2, '0'), mono: true },
          ]} />
        </PageHead>
        <SettingsShell active="employers">
          <article className="prose-card">
            <span className="prose-card__label">Role Description</span>
            <p className="prose-card__body">{role.description || 'No description recorded.'}</p>
          </article>

          <div className="detail-header" style={{ marginTop: 48 }}>
            <h2 className="detail-header__title">Cohorts Using This Role</h2>
            <span className="micro-label">{String(cohorts.length).padStart(2, '0')} COHORT{cohorts.length === 1 ? '' : 'S'}</span>
          </div>
          <table className="assessments" style={{ marginBottom: 40 }}>
            <thead>
              <tr>
                <th style={{ width: '50%' }}>Cohort</th>
                <th style={{ width: '25%' }}>Start</th>
                <th style={{ width: '25%' }}>Members</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.length === 0 ? <EmptyRow colSpan={3} message="No cohorts currently use this role." /> : cohorts.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/admin/settings/cohorts/${c.id}`)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/admin/settings/cohorts/${c.id}`); } }}>
                  <td><div className="col-name"><span className="name-initial">{initials(c.name)}</span>{c.name}</div></td>
                  <td className="col-date">{formatDate(c.startDate)}</td>
                  <td><span className="col-phase">{c.members}</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="detail-actions" style={{ display: 'flex', gap: 10 }}>
            <Link to={employer ? `/admin/settings/employers/${employer.id}` : '/admin/settings/employers'} className="btn btn--outline">&larr; Close</Link>
            <Link to={`/admin/settings/roles/${role.id}/edit`} className="btn btn--primary">Edit Role</Link>
            <button type="button" className="btn btn--danger" onClick={() => setDeleteOpen(true)}>Delete Role</button>
          </div>

          <Form method="post" id="delete-role-form">
            <input type="hidden" name="_intent" value="delete" />
          </Form>
          <ConfirmModal
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onConfirm={() => (document.getElementById('delete-role-form') as HTMLFormElement).submit()}
            label="DELETE ROLE"
            title="Delete this role?"
            body="Removing this role will not delete cohorts that reference it, but those cohorts will need a new role assignment. This cannot be undone."
            confirmText="Delete Permanently"
            variant="danger"
          />
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- admin.settings.roles.\$roleId
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.settings.roles.\$roleId._index.tsx tests/routes/admin.settings.roles.\$roleId.test.ts
  git commit -m "feat(admin): build role detail with cohorts-using sub-table + delete"
  ```

### Task 30: Role edit `/admin/settings/roles/:roleId/edit`

**Files:**
- Create: `app/routes/admin.settings.roles.$roleId.edit.tsx`

- [ ] **Step 1: Create the file**

  ```tsx
  import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
  import type { Route } from './+types/admin.settings.roles.$roleId.edit';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import { getRoleOrNull, getEmployerOrNull } from '~/lib/admin-queries.server';
  import { roles as rolesTbl } from '../../db/schema';
  import { eq } from 'drizzle-orm';
  import {
    parseFormFields, requireString, optionalString, errorsByField,
  } from '~/lib/validation';
  import { PageHead } from '~/components/PageHead';
  import { SettingsShell } from '~/components/SettingsShell';
  import { IdentityCard } from '~/components/IdentityCard';
  import { ActionBar } from '~/components/ActionBar';

  export const meta: Route.MetaFunction = () => [{ title: 'Edit Role — IMPACT Admin' }];

  export async function loader({ request, params }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const role = await getRoleOrNull(db, params.roleId!);
    if (!role) throw new Response('Not Found', { status: 404 });
    const employer = await getEmployerOrNull(db, role.employerId);
    return Response.json({ role, employer }, { headers });
  }

  export async function action({ request, params }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const fd = await request.formData();
    const { values, errors } = parseFormFields(fd, {
      label: requireString('Role Name'),
      description: optionalString('Description'),
    });
    if (errors.length > 0) {
      return Response.json({ errors, values }, { headers, status: 400 });
    }
    await db
      .update(rolesTbl)
      .set({ label: values.label, description: values.description, updatedAt: new Date() })
      .where(eq(rolesTbl.id, params.roleId!));
    throw redirect(`/admin/settings/roles/${params.roleId}?updated=1`, { headers });
  }

  export default function EditRole() {
    const { role, employer } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const nav = useNavigation();
    const errs = errorsByField(actionData?.errors ?? []);
    const v = (actionData?.values ?? role) as { label?: string; description?: string | null };
    return (
      <>
        <PageHead
          breadcrumb={<>
            <Link to="/admin/settings/employers" style={{ color: 'inherit', textDecoration: 'none' }}>ADMIN / SETTINGS / EMPLOYERS</Link>
            {' / '}
            {employer ? <Link to={`/admin/settings/employers/${employer.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{employer.name.toUpperCase()}</Link> : 'EMPLOYER'}
            {' / EDIT ROLE'}
          </>}
          title="EDIT ROLE."
          sub="Update the role's name and description."
        />
        <SettingsShell active="employers">
          <Form method="post">
            <IdentityCard title="Role Record" subnote="EDIT ROLE · UPDATE DETAILS">
              <div className="id-grid id-grid--4">
                <div className={`field${errs.label ? ' field--error' : ''}`} style={{ gridColumn: 'span 4' }}>
                  <label htmlFor="r-name">Role Name</label>
                  <input className="input" type="text" id="r-name" name="label" defaultValue={v.label ?? ''} />
                  {errs.label ? <span className="field__error">{errs.label}</span> : null}
                </div>
              </div>
              <div style={{ paddingTop: 22, marginTop: 22, borderTop: '1px solid var(--rule)' }}>
                <div className="field">
                  <label htmlFor="r-desc">Description</label>
                  <textarea className="textarea" id="r-desc" name="description" rows={3} defaultValue={v.description ?? ''} />
                </div>
              </div>
            </IdentityCard>
            <ActionBar status="ROLE RECORD · EDIT">
              <Link to={`/admin/settings/roles/${role.id}`} className="btn btn--outline">Cancel</Link>
              <button type="submit" className="btn btn--primary" disabled={nav.state === 'submitting'}>
                {nav.state === 'submitting' ? 'Saving…' : <>Save Role <span className="btn__arrow">&rarr;</span></>}
              </button>
            </ActionBar>
          </Form>
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/admin.settings.roles.\$roleId.edit.tsx
  git commit -m "feat(admin): build role edit form"
  ```

---

## Phase I: Settings → Phases & Barriers (inline-editable lists)

### Task 31: `<InlineEditableList>` component — TDD

**Files:**
- Create: `app/components/InlineEditableList.tsx`
- Create: `tests/components/InlineEditableList.test.tsx`

This component drives both `/admin/settings/phases` and `/admin/settings/barriers`. It maintains a working copy of `{id, label, sortOrder}` rows: add, remove, move up/down, edit label inline. Validates: at least one row, no empty labels, no duplicates (case-insensitive). Submits the working copy as `rows[<i>].id`, `rows[<i>].label` form fields.

- [ ] **Step 1: Write the failing test**

  `tests/components/InlineEditableList.test.tsx`:

  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, fireEvent } from '@testing-library/react';
  import { InlineEditableList } from '~/components/InlineEditableList';

  describe('InlineEditableList', () => {
    it('renders initial rows', () => {
      render(<InlineEditableList initial={[{ id: '1', label: 'Phase 1' }, { id: '2', label: 'Phase 2' }]} addLabel="+ Add Phase" name="phases" />);
      expect(screen.getByDisplayValue('Phase 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Phase 2')).toBeInTheDocument();
    });

    it('adds a new row', () => {
      render(<InlineEditableList initial={[{ id: '1', label: 'Phase 1' }]} addLabel="+ Add Phase" name="phases" />);
      fireEvent.click(screen.getByText('+ Add Phase'));
      const inputs = screen.getAllByPlaceholderText('Label');
      expect(inputs).toHaveLength(2);
    });

    it('removes a row', () => {
      render(<InlineEditableList initial={[{ id: '1', label: 'Phase 1' }, { id: '2', label: 'Phase 2' }]} addLabel="+ Add Phase" name="phases" />);
      const removes = screen.getAllByLabelText('Remove');
      fireEvent.click(removes[0]);
      expect(screen.queryByDisplayValue('Phase 1')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('Phase 2')).toBeInTheDocument();
    });

    it('disables Move-Up on first row and Move-Down on last row', () => {
      render(<InlineEditableList initial={[{ id: '1', label: 'Phase 1' }, { id: '2', label: 'Phase 2' }]} addLabel="+ Add Phase" name="phases" />);
      const ups = screen.getAllByLabelText('Move up');
      const downs = screen.getAllByLabelText('Move down');
      expect(ups[0]).toBeDisabled();
      expect(downs[1]).toBeDisabled();
    });

    it('swaps rows on move-down click', () => {
      render(<InlineEditableList initial={[{ id: '1', label: 'A' }, { id: '2', label: 'B' }]} addLabel="+ Add" name="phases" />);
      const downs = screen.getAllByLabelText('Move down');
      fireEvent.click(downs[0]);
      const inputs = screen.getAllByPlaceholderText('Label') as HTMLInputElement[];
      expect(inputs[0].value).toBe('B');
      expect(inputs[1].value).toBe('A');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- InlineEditableList
  ```

  Expected: FAIL.

- [ ] **Step 3: Implement**

  `app/components/InlineEditableList.tsx`:

  ```tsx
  import { useState } from 'react';

  export interface InlineRow { id: string; label: string }

  export function InlineEditableList({
    initial,
    addLabel,
    name,
    errorIndices,
  }: {
    initial: InlineRow[];
    addLabel: string;
    /** Form field name root; rows are submitted as `${name}[<i>].id` and `${name}[<i>].label`. */
    name: string;
    /** Indices to render with .input--error (server-validation feedback) */
    errorIndices?: number[];
  }) {
    const [rows, setRows] = useState<InlineRow[]>(() => initial.map((r) => ({ id: r.id, label: r.label })));
    const errSet = new Set(errorIndices ?? []);

    function update(i: number, label: string) {
      setRows((rs) => rs.map((r, j) => (j === i ? { ...r, label } : r)));
    }
    function add() {
      setRows((rs) => [...rs, { id: '', label: '' }]);
    }
    function remove(i: number) {
      setRows((rs) => rs.filter((_, j) => j !== i));
    }
    function move(i: number, dir: -1 | 1) {
      const j = i + dir;
      if (j < 0 || j >= rows.length) return;
      const copy = rows.slice();
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
      setRows(copy);
    }

    return (
      <>
        <div className="settings-list" role="list">
          {rows.map((row, i) => (
            <div className="settings-list__row" role="listitem" key={`${row.id}-${i}`}>
              <input type="hidden" name={`${name}[${i}].id`} value={row.id} />
              <div className="settings-list__cell settings-list__cell--handle">
                <button type="button" className="settings-list__handle-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                {' '}
                <button type="button" className="settings-list__handle-btn" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>↓</button>
              </div>
              <div className="settings-list__cell settings-list__cell--label">
                <input
                  type="text"
                  className={`settings-list__label-input${errSet.has(i) ? ' input--error' : ''}`}
                  name={`${name}[${i}].label`}
                  value={row.label}
                  placeholder="Label"
                  onChange={(e) => update(i, e.target.value)}
                />
              </div>
              <div className="settings-list__cell settings-list__cell--remove">
                <button type="button" className="settings-list__remove-btn" aria-label="Remove" onClick={() => remove(i)}>×</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="settings-list__add" onClick={add}>{addLabel}</button>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- InlineEditableList
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/components/InlineEditableList.tsx tests/components/InlineEditableList.test.tsx
  git commit -m "feat(admin): add InlineEditableList component for phases + barriers"
  ```

### Task 32: Server-side helper `parseInlineRows`

**Files:**
- Modify: `app/lib/validation.ts` (append)

- [ ] **Step 1: Append to `app/lib/validation.ts`**

  ```ts
  export interface ParsedInlineRow { id: string | null; label: string }

  /**
   * Parse rows posted by <InlineEditableList> (fields named `${name}[<i>].id`
   * and `${name}[<i>].label`). Returns rows in their submitted order plus
   * an array of FieldError messages — one per invalid row, indexed via
   * `errorIndices` on the component.
   *
   * Rules:
   * - At least one row.
   * - No empty labels (after trim).
   * - No duplicate labels (case-insensitive).
   */
  export function parseInlineRows(
    formData: FormData,
    name: string,
  ): { rows: ParsedInlineRow[]; errors: FieldError[]; errorIndices: number[] } {
    const indices = new Set<number>();
    for (const key of formData.keys()) {
      const m = new RegExp(`^${name}\\[(\\d+)\\]\\.(id|label)$`).exec(key);
      if (m) indices.add(parseInt(m[1], 10));
    }
    const ordered = Array.from(indices).sort((a, b) => a - b);
    const rows: ParsedInlineRow[] = ordered.map((i) => ({
      id: (String(formData.get(`${name}[${i}].id`) ?? '').trim() || null),
      label: String(formData.get(`${name}[${i}].label`) ?? '').trim(),
    }));

    const errors: FieldError[] = [];
    const errorIndices: number[] = [];
    if (rows.length === 0) {
      errors.push({ field: name, message: 'At least one row is required.' });
      return { rows, errors, errorIndices };
    }
    rows.forEach((r, i) => {
      if (!r.label) {
        errorIndices.push(i);
        errors.push({ field: `${name}[${i}].label`, message: 'Label is required.' });
      }
    });
    const seen = new Map<string, number>();
    rows.forEach((r, i) => {
      if (!r.label) return;
      const key = r.label.toLowerCase();
      if (seen.has(key)) {
        errorIndices.push(i);
        errorIndices.push(seen.get(key)!);
        errors.push({ field: `${name}[${i}].label`, message: 'Duplicate label.' });
      } else {
        seen.set(key, i);
      }
    });
    return { rows, errors, errorIndices: Array.from(new Set(errorIndices)) };
  }
  ```

- [ ] **Step 2: Add a quick test for `parseInlineRows`**

  Append to `tests/lib/validation.test.ts`:

  ```ts
  import { parseInlineRows } from '~/lib/validation';

  describe('parseInlineRows', () => {
    it('parses ordered rows from form data', () => {
      const fd = new FormData();
      fd.set('phases[0].id', 'p1');
      fd.set('phases[0].label', 'Phase 1');
      fd.set('phases[1].id', '');
      fd.set('phases[1].label', 'Phase 2');
      const { rows, errors } = parseInlineRows(fd, 'phases');
      expect(rows).toEqual([
        { id: 'p1', label: 'Phase 1' },
        { id: null, label: 'Phase 2' },
      ]);
      expect(errors).toEqual([]);
    });

    it('errors on empty label + duplicates', () => {
      const fd = new FormData();
      fd.set('phases[0].id', '');
      fd.set('phases[0].label', '');
      fd.set('phases[1].id', '');
      fd.set('phases[1].label', 'Phase 1');
      fd.set('phases[2].id', '');
      fd.set('phases[2].label', 'phase 1');
      const { errors, errorIndices } = parseInlineRows(fd, 'phases');
      expect(errors.length).toBeGreaterThanOrEqual(2);
      expect(errorIndices).toEqual(expect.arrayContaining([0, 1, 2]));
    });

    it('errors when zero rows', () => {
      const fd = new FormData();
      const { errors } = parseInlineRows(fd, 'phases');
      expect(errors).toEqual([{ field: 'phases', message: 'At least one row is required.' }]);
    });
  });
  ```

- [ ] **Step 3: Run tests**

  ```bash
  npm test -- validation
  ```

  Expected: all pass.

- [ ] **Step 4: Commit**

  ```bash
  git add app/lib/validation.ts tests/lib/validation.test.ts
  git commit -m "feat(admin): add parseInlineRows for inline-editable lists"
  ```

### Task 33: Phases route `/admin/settings/phases`

**Files:**
- Create: `app/routes/admin.settings.phases.tsx`
- Create: `tests/routes/admin.settings.phases.test.ts`

The action diff-updates the `phases` table: inserts new rows (id === null), updates existing rows whose label changed, deletes any rows not present in the form, and rewrites `sortOrder` from the submitted order. Wrapped in a transaction.

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin.settings.phases.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { action } from '~/routes/admin.settings.phases';
  import * as guard from '~/lib/admin-guard.server';

  describe('phases action validation', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('rejects zero rows', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      const fd = new FormData();
      const req = new Request('https://x.test/admin/settings/phases', { method: 'POST', body: fd });
      const res = await action({ request: req, params: {}, context: {} } as never);
      const body = await (res as Response).json();
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it('rejects duplicate labels', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      const fd = new FormData();
      fd.set('phases[0].id', '');
      fd.set('phases[0].label', 'X');
      fd.set('phases[1].id', '');
      fd.set('phases[1].label', 'x');
      const req = new Request('https://x.test/admin/settings/phases', { method: 'POST', body: fd });
      const res = await action({ request: req, params: {}, context: {} } as never);
      const body = await (res as Response).json();
      expect(body.errors.some((e: { message: string }) => /Duplicate/i.test(e.message))).toBe(true);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin.settings.phases
  ```

  Expected: FAIL.

- [ ] **Step 3: Create the file**

  ```tsx
  import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
  import { useEffect } from 'react';
  import type { Route } from './+types/admin.settings.phases';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import { listPhases } from '~/lib/admin-queries.server';
  import { phases } from '../../db/schema';
  import { eq, inArray } from 'drizzle-orm';
  import { parseInlineRows } from '~/lib/validation';
  import { PageHead } from '~/components/PageHead';
  import { SettingsShell } from '~/components/SettingsShell';
  import { ActionBar } from '~/components/ActionBar';
  import { InlineEditableList } from '~/components/InlineEditableList';
  import { useToast } from '~/components/ToastProvider';

  export const meta: Route.MetaFunction = () => [{ title: 'Assessment Phases — Settings — IMPACT Admin' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const rows = await listPhases(db);
    return Response.json({ rows: rows.map((r) => ({ id: r.id, label: r.label })) }, { headers });
  }

  export async function action({ request }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const fd = await request.formData();
    const { rows, errors, errorIndices } = parseInlineRows(fd, 'phases');
    if (errors.length > 0) {
      return Response.json({ errors, errorIndices, rows }, { headers, status: 400 });
    }
    await db.transaction(async (tx) => {
      const keptIds = rows.map((r) => r.id).filter((id): id is string => !!id);
      // Delete rows the user removed.
      if (keptIds.length > 0) {
        const existing = await tx.select({ id: phases.id }).from(phases);
        const toDelete = existing.map((e) => e.id).filter((id) => !keptIds.includes(id));
        if (toDelete.length > 0) await tx.delete(phases).where(inArray(phases.id, toDelete));
      } else {
        await tx.delete(phases);
      }
      // Upsert each row in order; rewrite sortOrder.
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.id) {
          await tx.update(phases).set({ label: r.label, sortOrder: i + 1 }).where(eq(phases.id, r.id));
        } else {
          await tx.insert(phases).values({ label: r.label, sortOrder: i + 1 });
        }
      }
    });
    throw redirect('/admin/settings/phases?saved=1', { headers });
  }

  export default function PhasesSettings() {
    const { rows } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const nav = useNavigation();
    const toast = useToast();
    useEffect(() => {
      if (actionData && 'errors' in actionData && actionData.errors.length > 0) {
        toast.show({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please fix the highlighted rows.' });
      }
    }, [actionData, toast]);
    const initial = (actionData && 'rows' in actionData ? actionData.rows.map((r: { id: string | null; label: string }) => ({ id: r.id ?? '', label: r.label })) : rows) as { id: string; label: string }[];
    return (
      <>
        <PageHead breadcrumb="ADMIN / SETTINGS / ASSESSMENT PHASES" title="ASSESSMENT PHASES." sub="Phases used by the Competency Assessment. Each cohort selects which phases apply to it." />
        <SettingsShell active="phases">
          <Form method="post">
            <div className="detail-header" style={{ marginTop: 0 }}>
              <h2 className="detail-header__title">Assessment Phases</h2>
            </div>
            <InlineEditableList
              key={initial.map((r) => r.id).join(',') + ':' + (actionData?.errorIndices?.join(',') ?? '')}
              initial={initial}
              addLabel="+ Add Phase"
              name="phases"
              errorIndices={actionData?.errorIndices}
            />
            <ActionBar status="ASSESSMENT PHASES · EDIT">
              <Link to="/admin/settings/employers" className="btn btn--outline">Cancel</Link>
              <button type="submit" className="btn btn--primary" disabled={nav.state === 'submitting'}>
                {nav.state === 'submitting' ? 'Saving…' : <>Save Changes <span className="btn__arrow">&rarr;</span></>}
              </button>
            </ActionBar>
          </Form>
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- admin.settings.phases
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.settings.phases.tsx tests/routes/admin.settings.phases.test.ts
  git commit -m "feat(admin): build inline-editable phases settings page"
  ```

### Task 34: Barriers route `/admin/settings/barriers`

**Files:**
- Create: `app/routes/admin.settings.barriers.tsx`
- Create: `tests/routes/admin.settings.barriers.test.ts`

Same pattern as Phases but targets the `barriers` table.

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin.settings.barriers.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { action } from '~/routes/admin.settings.barriers';
  import * as guard from '~/lib/admin-guard.server';

  describe('barriers action validation', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('rejects empty label rows', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      const fd = new FormData();
      fd.set('barriers[0].id', '');
      fd.set('barriers[0].label', '');
      const req = new Request('https://x.test/admin/settings/barriers', { method: 'POST', body: fd });
      const res = await action({ request: req, params: {}, context: {} } as never);
      const body = await (res as Response).json();
      expect(body.errors.length).toBeGreaterThan(0);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- admin.settings.barriers
  ```

  Expected: FAIL.

- [ ] **Step 3: Create the file**

  ```tsx
  import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
  import { useEffect } from 'react';
  import type { Route } from './+types/admin.settings.barriers';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import { listBarriers } from '~/lib/admin-queries.server';
  import { barriers } from '../../db/schema';
  import { eq, inArray } from 'drizzle-orm';
  import { parseInlineRows } from '~/lib/validation';
  import { PageHead } from '~/components/PageHead';
  import { SettingsShell } from '~/components/SettingsShell';
  import { ActionBar } from '~/components/ActionBar';
  import { InlineEditableList } from '~/components/InlineEditableList';
  import { useToast } from '~/components/ToastProvider';

  export const meta: Route.MetaFunction = () => [{ title: 'Barriers — Settings — IMPACT Admin' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const rows = await listBarriers(db);
    return Response.json({ rows: rows.map((r) => ({ id: r.id, label: r.label })) }, { headers });
  }

  export async function action({ request }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const fd = await request.formData();
    const { rows, errors, errorIndices } = parseInlineRows(fd, 'barriers');
    if (errors.length > 0) {
      return Response.json({ errors, errorIndices, rows }, { headers, status: 400 });
    }
    await db.transaction(async (tx) => {
      const keptIds = rows.map((r) => r.id).filter((id): id is string => !!id);
      if (keptIds.length > 0) {
        const existing = await tx.select({ id: barriers.id }).from(barriers);
        const toDelete = existing.map((e) => e.id).filter((id) => !keptIds.includes(id));
        if (toDelete.length > 0) await tx.delete(barriers).where(inArray(barriers.id, toDelete));
      } else {
        await tx.delete(barriers);
      }
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.id) {
          await tx.update(barriers).set({ label: r.label, sortOrder: i + 1 }).where(eq(barriers.id, r.id));
        } else {
          await tx.insert(barriers).values({ label: r.label, sortOrder: i + 1 });
        }
      }
    });
    throw redirect('/admin/settings/barriers?saved=1', { headers });
  }

  export default function BarriersSettings() {
    const { rows } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const nav = useNavigation();
    const toast = useToast();
    useEffect(() => {
      if (actionData && 'errors' in actionData && actionData.errors.length > 0) {
        toast.show({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please fix the highlighted rows.' });
      }
    }, [actionData, toast]);
    const initial = (actionData && 'rows' in actionData ? actionData.rows.map((r: { id: string | null; label: string }) => ({ id: r.id ?? '', label: r.label })) : rows) as { id: string; label: string }[];
    return (
      <>
        <PageHead breadcrumb="ADMIN / SETTINGS / BARRIERS" title="BARRIERS." sub="Entry Assessment barrier checklist used on every intern record." />
        <SettingsShell active="barriers">
          <Form method="post">
            <div className="detail-header" style={{ marginTop: 0 }}>
              <h2 className="detail-header__title">Entry-Assessment Barriers</h2>
            </div>
            <InlineEditableList
              key={initial.map((r) => r.id).join(',') + ':' + (actionData?.errorIndices?.join(',') ?? '')}
              initial={initial}
              addLabel="+ Add Barrier"
              name="barriers"
              errorIndices={actionData?.errorIndices}
            />
            <ActionBar status="BARRIERS · EDIT">
              <Link to="/admin/settings/employers" className="btn btn--outline">Cancel</Link>
              <button type="submit" className="btn btn--primary" disabled={nav.state === 'submitting'}>
                {nav.state === 'submitting' ? 'Saving…' : <>Save Changes <span className="btn__arrow">&rarr;</span></>}
              </button>
            </ActionBar>
          </Form>
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- admin.settings.barriers
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.settings.barriers.tsx tests/routes/admin.settings.barriers.test.ts
  git commit -m "feat(admin): build inline-editable barriers settings page"
  ```

---

## Phase J: Settings → Program Info (singleton)

### Task 35: Program Info route `/admin/settings/program-info`

**Files:**
- Create: `app/routes/admin.settings.program-info.tsx`
- Create: `tests/routes/admin.settings.program-info.test.ts`

Per the spec call-out at the top of this plan: do NOT port the Reset Demo Data button (prototype-only).

- [ ] **Step 1: Write the failing test**

  `tests/routes/admin.settings.program-info.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { action } from '~/routes/admin.settings.program-info';
  import * as guard from '~/lib/admin-guard.server';

  describe('program-info action validation', () => {
    beforeEach(() => vi.restoreAllMocks());

    it('errors on missing program name', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      const fd = new FormData();
      fd.set('programName', '');
      fd.set('contactEmail', 'a@b.co');
      fd.set('defaultCohortLengthWeeks', '26');
      fd.set('fiscalYearStartMonth', '7');
      const req = new Request('https://x.test/admin/settings/program-info', { method: 'POST', body: fd });
      const res = await action({ request: req, params: {}, context: {} } as never);
      const body = await (res as Response).json();
      expect(body.errors.map((e: { field: string }) => e.field)).toContain('programName');
    });

    it('errors on non-positive cohort length', async () => {
      vi.spyOn(guard, 'requireAdmin').mockResolvedValue({ auth: { role: 'admin', employerId: null }, headers: new Headers() });
      const fd = new FormData();
      fd.set('programName', 'X');
      fd.set('contactEmail', 'a@b.co');
      fd.set('defaultCohortLengthWeeks', '0');
      fd.set('fiscalYearStartMonth', '7');
      const req = new Request('https://x.test/admin/settings/program-info', { method: 'POST', body: fd });
      const res = await action({ request: req, params: {}, context: {} } as never);
      const body = await (res as Response).json();
      expect(body.errors.map((e: { field: string }) => e.field)).toContain('defaultCohortLengthWeeks');
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npm test -- program-info
  ```

  Expected: FAIL.

- [ ] **Step 3: Create the file**

  ```tsx
  import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
  import { useEffect } from 'react';
  import type { Route } from './+types/admin.settings.program-info';
  import { requireAdmin } from '~/lib/admin-guard.server';
  import { db } from '~/lib/db.server';
  import { getProgramInfo } from '~/lib/admin-queries.server';
  import { programInfo } from '../../db/schema';
  import { eq } from 'drizzle-orm';
  import {
    parseFormFields, requireString, optionalString, optionalEmail, requirePositiveInt, errorsByField,
  } from '~/lib/validation';
  import { PageHead } from '~/components/PageHead';
  import { SettingsShell } from '~/components/SettingsShell';
  import { IdentityCard } from '~/components/IdentityCard';
  import { ActionBar } from '~/components/ActionBar';
  import { useToast } from '~/components/ToastProvider';

  export const meta: Route.MetaFunction = () => [{ title: 'Program Info — Settings — IMPACT Admin' }];

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  export async function loader({ request }: Route.LoaderArgs) {
    const { headers } = await requireAdmin(request);
    const row = await getProgramInfo(db);
    return Response.json({ row }, { headers });
  }

  export async function action({ request }: Route.ActionArgs) {
    const { headers } = await requireAdmin(request);
    const fd = await request.formData();
    const { values, errors } = parseFormFields(fd, {
      programName: requireString('Program Name'),
      organizationName: optionalString('Organization Name'),
      contactEmail: optionalEmail('Contact Email'),
      phone: optionalString('Phone'),
      defaultCohortLengthWeeks: requirePositiveInt('Default Cohort Length'),
      fiscalYearStartMonth: requirePositiveInt('Fiscal Year Start Month'),
    });
    if (errors.length > 0) {
      return Response.json({ errors, values }, { headers, status: 400 });
    }
    await db
      .insert(programInfo)
      .values({
        id: 1,
        programName: values.programName,
        organizationName: values.organizationName,
        contactEmail: values.contactEmail,
        phone: values.phone,
        defaultCohortLengthWeeks: values.defaultCohortLengthWeeks,
        fiscalYearStartMonth: values.fiscalYearStartMonth,
      })
      .onConflictDoUpdate({
        target: programInfo.id,
        set: {
          programName: values.programName,
          organizationName: values.organizationName,
          contactEmail: values.contactEmail,
          phone: values.phone,
          defaultCohortLengthWeeks: values.defaultCohortLengthWeeks,
          fiscalYearStartMonth: values.fiscalYearStartMonth,
          updatedAt: new Date(),
        },
      });
    throw redirect('/admin/settings/program-info?saved=1', { headers });
  }

  export default function ProgramInfoSettings() {
    const { row } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const nav = useNavigation();
    const toast = useToast();
    const errs = errorsByField(actionData?.errors ?? []);
    useEffect(() => {
      if (actionData && 'errors' in actionData && actionData.errors.length > 0) {
        toast.show({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please fix the highlighted fields.' });
      }
    }, [actionData, toast]);
    const v = (actionData?.values ?? row ?? {}) as {
      programName?: string; organizationName?: string | null; contactEmail?: string | null; phone?: string | null;
      defaultCohortLengthWeeks?: number | null; fiscalYearStartMonth?: number | null;
    };
    return (
      <>
        <PageHead breadcrumb="ADMIN / SETTINGS / PROGRAM INFO" title="PROGRAM INFO." sub="Program identity and defaults applied to new cohorts." />
        <SettingsShell active="program-info">
          <Form method="post">
            <IdentityCard title="Program Record" subnote="PROGRAM INFO · IDENTITY">
              <div className="id-grid id-grid--4">
                <div className={`field${errs.programName ? ' field--error' : ''}`} style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="pi-name">Program Name</label>
                  <input className="input" type="text" id="pi-name" name="programName" defaultValue={v.programName ?? ''} />
                  {errs.programName ? <span className="field__error">{errs.programName}</span> : null}
                </div>
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="pi-org">Organization Name</label>
                  <input className="input" type="text" id="pi-org" name="organizationName" defaultValue={v.organizationName ?? ''} />
                </div>
                <div className={`field${errs.contactEmail ? ' field--error' : ''}`} style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="pi-email">Contact Email</label>
                  <input className="input" type="email" id="pi-email" name="contactEmail" defaultValue={v.contactEmail ?? ''} />
                  {errs.contactEmail ? <span className="field__error">{errs.contactEmail}</span> : null}
                </div>
                <div className="field" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="pi-phone">Phone</label>
                  <input className="input" type="text" id="pi-phone" name="phone" defaultValue={v.phone ?? ''} />
                </div>
              </div>
              <div style={{ paddingTop: 22, marginTop: 22, borderTop: '1px solid var(--rule)' }}>
                <span className="micro-label">PROGRAM INFO · DEFAULTS</span>
                <div className="id-grid id-grid--4" style={{ marginTop: 12 }}>
                  <div className={`field${errs.defaultCohortLengthWeeks ? ' field--error' : ''}`} style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="pi-cohort-length">Default Cohort Length (weeks)</label>
                    <input className="input" type="number" min={1} id="pi-cohort-length" name="defaultCohortLengthWeeks" defaultValue={v.defaultCohortLengthWeeks ?? 26} />
                    {errs.defaultCohortLengthWeeks ? <span className="field__error">{errs.defaultCohortLengthWeeks}</span> : null}
                  </div>
                  <div className="field" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="pi-fy-start">Fiscal Year Start</label>
                    <select className="select" id="pi-fy-start" name="fiscalYearStartMonth" defaultValue={String(v.fiscalYearStartMonth ?? 7)}>
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </IdentityCard>
            <ActionBar status="PROGRAM INFO · EDIT">
              <Link to="/admin/settings/employers" className="btn btn--outline">Cancel</Link>
              <button type="submit" className="btn btn--primary" disabled={nav.state === 'submitting'}>
                {nav.state === 'submitting' ? 'Saving…' : <>Save Changes <span className="btn__arrow">&rarr;</span></>}
              </button>
            </ActionBar>
          </Form>
        </SettingsShell>
      </>
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npm test -- program-info
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add app/routes/admin.settings.program-info.tsx tests/routes/admin.settings.program-info.test.ts
  git commit -m "feat(admin): build singleton program-info settings form"
  ```

---

## Phase K: E2E smoke + sub-project 2 close-out

### Task 36: Admin CRUD smoke test (Playwright)

**Files:**
- Create: `tests/e2e/admin-crud.spec.ts`

This is one Playwright test that walks the most important happy paths: login → home → create employer → create cohort under it → create intern in cohort → edit intern → return to interns list.

- [ ] **Step 1: Create the file**

  ```ts
  import { test, expect } from '@playwright/test';

  const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'matthew.smith@rapideo.com';
  const ADMIN_PASS = process.env.E2E_ADMIN_PASSWORD ?? '';

  test.skip(!ADMIN_PASS, 'E2E_ADMIN_PASSWORD not set; skipping admin-crud smoke');

  test('admin can create employer → cohort → intern, then edit the intern', async ({ page }) => {
    // Sign in
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASS);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin$/);

    // Home renders
    await expect(page.getByRole('heading', { name: /GOOD MORNING\./ })).toBeVisible();

    // Create employer
    await page.getByRole('link', { name: /Settings/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/settings\/employers$/);
    await page.getByRole('link', { name: /\+ New Employer/i }).click();
    const stamp = Date.now();
    const employerName = `E2E Employer ${stamp}`;
    await page.getByLabel(/^Name$/).fill(employerName);
    await page.getByLabel(/Contact Email/i).fill(`e2e-${stamp}@example.com`);
    await page.getByRole('button', { name: /Save Employer/i }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`^${employerName}\\.$`) })).toBeVisible();

    // Create cohort under it
    await page.getByRole('link', { name: /\+ New Cohort/i }).click();
    await page.getByLabel(/^Name$/).fill(`E2E Cohort ${stamp}`);
    await page.getByLabel(/Start Date/i).fill('2026-04-01');
    await page.getByLabel(/End Date/i).fill('2026-09-30');
    // Pick the first available phase checkbox.
    const firstPhase = page.locator('input[name="phaseIds"]').first();
    await firstPhase.check();
    await page.getByRole('button', { name: /Create Cohort/i }).click();
    await expect(page).toHaveURL(/\/admin\/settings\/cohorts\//);
    const cohortUrl = page.url();

    // Create intern in the new cohort
    await page.getByRole('link', { name: /^Interns$/ }).first().click();
    await expect(page).toHaveURL(/\/admin\/interns$/);
    await page.getByRole('link', { name: /\+ New Intern/i }).click();
    await page.getByLabel(/First Name/i).fill('Emma');
    await page.getByLabel(/Last Name/i).fill(`E2E${stamp}`);
    await page.getByLabel(/^Employer$/).selectOption({ label: employerName });
    await page.getByLabel(/^Cohort$/).selectOption({ label: `E2E Cohort ${stamp}` });
    await page.getByLabel(/Start Date/i).fill('2026-04-01');
    await page.getByLabel(/End Date/i).fill('2026-09-30');
    await page.getByRole('button', { name: /Save Changes/i }).click();
    await expect(page).toHaveURL(/\/admin\/interns\//);
    await expect(page.getByRole('heading', { name: /EDIT INTERN\./ })).toBeVisible();

    // Edit: toggle 90-day employment + save
    await page.locator('#o1-check').check();
    await page.locator('#o1-notes').fill('Hired full-time at Acme.');
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // Return to interns list and confirm the new intern shows there.
    await page.getByRole('link', { name: /^Interns$/ }).first().click();
    await page.getByPlaceholder(/Search by last name/i).fill(`E2E${stamp}`);
    await expect(page.locator(`text=E2E${stamp}`).first()).toBeVisible();
  });
  ```

- [ ] **Step 2: Run the smoke against a local dev server**

  ```bash
  npm run dev   # in another shell
  E2E_ADMIN_PASSWORD=<password> npx playwright test admin-crud
  ```

  Expected: PASS (or SKIPPED if no password env var set; gate is intentional so CI without secret skips).

- [ ] **Step 3: Commit**

  ```bash
  git add tests/e2e/admin-crud.spec.ts
  git commit -m "test(e2e): admin CRUD smoke (employer → cohort → intern)"
  ```

### Task 37: Sub-project 2 final smoke + housekeeping

**Files:**
- Modify: `CLAUDE.md` (append a short note that admin core is live)
- Modify: `README.md` (one-line under "Status" if present)

- [ ] **Step 1: Run the full test suite**

  ```bash
  npm run typecheck
  npm run lint
  npm test
  ```

  Expected: zero errors, all Vitest tests pass.

- [ ] **Step 2: Run the dev server end-to-end manually**

  ```bash
  npm run dev
  ```

  Walk: sign in → `/admin` shows KPIs → `/admin/interns` shows seed interns → create new intern → edit intern → `/admin/settings/employers` list → click an employer → create cohort + role under it → `/admin/settings/phases` rename a phase + save → `/admin/settings/barriers` add a barrier + save → `/admin/settings/program-info` change cohort length to 28 + save → click an unknown URL (e.g. `/admin/foo`) and see the branded 404.

- [ ] **Step 3: Append to `CLAUDE.md`**

  Append to the end of the file:

  ```markdown
  ## Production app — sub-project 2 complete

  Admin core is live. Routes under `/admin/*` are real: home dashboard, interns list + record, all Settings pages (Employers, Cohorts, Roles, Phases, Barriers, Program Info). Auth requires admin role; non-admins land at `/employer` (sub-project 5).

  Sub-projects 3 (question engine), 4 (assessment forms), 5 (employer shell), and 6 (polish + launch) remain — see their plans under `docs/superpowers/plans/`.
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add CLAUDE.md
  git commit -m "docs: mark sub-project 2 (admin core) complete in CLAUDE.md"
  ```

- [ ] **Step 5: Final verification**

  Run `git log --oneline` to confirm all 37 task commits landed. Confirm no `app/routes/admin.*.tsx` paths are missing by running:

  ```bash
  npm run typecheck && npm test && npm run build
  ```

  Expected: typecheck zero errors, all tests pass, production build succeeds.

---

## Sub-project 2 done

After this plan you have:

- A real admin shell with brand-correct nav, footer, toasts, modals, settings rail.
- Full CRUD on Employers / Cohorts / Roles, with parent-child URL structure and FK-consistent navigation.
- Inline-editable Phases + Barriers lists with diff-based saves.
- Singleton Program Info form with optimistic UI + server validation.
- Intern records: minimum-PII create flow + edit flow with entry assessment, evaluations-view-only cards, and 90/180-day outcome tracking.
- Admin Home dashboard with real KPIs and recent-activity feed.
- Branded 404.
- Placeholder routes reserving slots for sub-projects 3 (questions), 4 (assessments), 6 (reports).
- 30+ Vitest unit/integration tests + one Playwright E2E smoke covering the critical CRUD path.

Sub-project 3 (Question engine) is next.




