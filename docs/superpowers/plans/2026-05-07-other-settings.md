# Other Settings (Phases + Barriers + Roles + Program Info) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four `settings-stub.html?section=…` placeholder routes with real implementations: a global Phases list with per-cohort multi-select, a Barriers list that powers the Entry Assessment, a Roles list (cohort.role → roleId FK migration), and a Program Info singleton.

**Architecture:** Three sibling inline-editable-list pages (Phases, Barriers, Roles) + one singleton form (Program Info), all built on the existing `.settings-shell` from sub-project A. Cohort form's Role becomes a select; the per-cohort phase editor (Name+Weeks rows) is removed and replaced with a checkbox group sourced from `IMPACT.PHASES`. Competency new/edit forms filter the Phase dropdown to the intern's cohort's selected phases. `IMPACT.INTERN_BARRIERS` (array of strings) is replaced by `IMPACT.BARRIERS` (array of `{id, label}`).

**Tech Stack:** Static HTML + CSS + IIFE-style JavaScript on top of the shared `Prototypes/PROTOTYPE/app.js` module. No build tooling, no framework, no test runner. Persistence: hardcoded mock arrays for the lists; sessionStorage overlay for `PROGRAM_INFO` only (same pattern as the exit-survey payload).

**Source spec:** `docs/superpowers/specs/2026-05-07-other-settings-design.md` (committed at `6a3c114`).

**Sub-project boundary:** This is sub-project B of three. A is shipped (Settings shell + Employers/Cohorts FK). C is future (Questions library).

---

## Task 1: Data-model migration in `app.js` (PHASES + BARRIERS + ROLES + PROGRAM_INFO + cohort migration + helpers)

Add the four new datasets, migrate cohort `role` → `roleId` and add `phaseIds`, add the helper functions, drop the `INTERN_BARRIERS` export, and update the `window.IMPACT` export. This is the foundation every later task depends on.

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`

- [ ] **Step 1: Add the four new mock-data declarations**

Open `Prototypes/PROTOTYPE/app.js`. Find the existing `EMPLOYERS` declaration (added in sub-project A, before `COHORTS`). Immediately after `EMPLOYERS` and before `COHORTS`, insert:

```js
  const PHASES = [
    { id: 'intake',   label: 'Intake'   },
    { id: 'week-2',   label: 'Week 2'   },
    { id: 'week-4',   label: 'Week 4'   },
    { id: 'midpoint', label: 'Midpoint' },
    { id: 'week-8',   label: 'Week 8'   },
    { id: 'final',    label: 'Final'    }
  ];

  const ROLES = [
    { id: 'medical-assistant',      label: 'Medical Assistant'      },
    { id: 'construction-apprentice', label: 'Construction Apprentice' },
    { id: 'community-builder',      label: 'Community Builder'      },
    { id: 'customer-service',       label: 'Customer Service'       },
    { id: 'behavioral-health',      label: 'Behavioral Health'      },
    { id: 'clinic-admin',           label: 'Clinic Admin'           }
  ];

  const BARRIERS = [
    { id: 'transport',     label: 'No reliable transportation to placement site' },
    { id: 'childcare',     label: 'No childcare arrangements during placement hours' },
    { id: 'housing',       label: 'Housing instability or lack of permanent address' },
    { id: 'clothing',      label: 'Limited access to professional or work-appropriate clothing' },
    { id: 'connectivity',  label: 'Limited internet or phone access at home' },
    { id: 'health',        label: 'Health or medical concerns affecting attendance' },
    { id: 'literacy',      label: 'Limited literacy, numeracy, or English-language proficiency' },
    { id: 'justice',       label: 'Justice involvement or background-related barriers' },
    { id: 'caregiving',    label: 'Caregiving responsibilities for adult family members' },
    { id: 'finances',      label: 'Limited financial reserves before first paycheck' },
    { id: 'documentation', label: 'Missing required documentation (ID, SSN, work auth)' },
    { id: 'work-history',  label: 'Limited prior work history, references, or formal employment' }
  ];

  const PROGRAM_INFO_DEFAULTS = {
    programName:              'IMPACT Internship Program',
    organizationName:         'IMPACT / Indiana',
    contactEmail:             'kortney@impact.org',
    phone:                    '(317) 555-0100',
    defaultCohortLengthWeeks: 26,
    fiscalYearStartMonth:     'July'
  };

  // PROGRAM_INFO is the live record (defaults + sessionStorage overlay).
  // Reads sessionStorage at module init; writes happen via saveProgramInfo().
  var PROGRAM_INFO = (function () {
    try {
      var raw = window.sessionStorage.getItem('impact.settings.programInfo');
      if (!raw) return Object.assign({}, PROGRAM_INFO_DEFAULTS);
      var parsed = JSON.parse(raw);
      return Object.assign({}, PROGRAM_INFO_DEFAULTS, parsed || {});
    } catch (e) {
      return Object.assign({}, PROGRAM_INFO_DEFAULTS);
    }
  })();
```

- [ ] **Step 2: Migrate the COHORTS array — drop `role` strings, add `roleId` FK + `phaseIds`**

Find the `const COHORTS = [` block (six rows, each currently with `role: 'Medical Assistant'` etc.). Replace the entire array with:

```js
  const COHORTS = [
    { id: 'eskenazi-2026',   name: 'MA — 2026',                  employerId: 'eskenazi-health',     roleId: 'medical-assistant',       phaseIds: ['intake','week-2','week-4','midpoint','week-8','final'], start: '04.01.2026', end: '09.30.2026', members: 15 },
    { id: 'ttt-2026',        name: 'Construction — 2026',        employerId: 'indy-tech-trades',    roleId: 'construction-apprentice', phaseIds: ['intake','week-2','week-4','week-8','final'],            start: '04.01.2026', end: '09.30.2026', members: 12 },
    { id: 'habitat-2026',    name: 'Community Builder — 2026',   employerId: 'habitat-indy',        roleId: 'community-builder',       phaseIds: ['intake','week-2','week-4','midpoint','final'],          start: '04.05.2026', end: '10.05.2026', members: 8  },
    { id: 'elevate-2026',    name: 'Customer Service — 2026',    employerId: 'elevate-ventures',    roleId: 'customer-service',        phaseIds: ['intake','week-2','midpoint','final'],                   start: '04.01.2026', end: '08.31.2026', members: 10 },
    { id: 'geminus-2026',    name: 'Behavioral Health — 2026',   employerId: 'geminus-behavioral',  roleId: 'behavioral-health',       phaseIds: ['intake','week-2','week-4','midpoint','final'],          start: '04.05.2026', end: '09.30.2026', members: 6  },
    { id: 'healthlink-2026', name: 'Clinic Admin — 2026',        employerId: 'healthlink-indiana',  roleId: 'clinic-admin',            phaseIds: ['intake','week-2','week-4','midpoint','week-8','final'], start: '04.01.2026', end: '09.30.2026', members: 11 },
  ];
```

The old `role: '<string>'` field is gone. The new `roleId: '<id>'` and `phaseIds: ['<id>', ...]` fields are present on every cohort.

- [ ] **Step 3: Delete the old `INTERN_BARRIERS` array**

Find the existing `const INTERN_BARRIERS = [` block (12 hardcoded strings, around lines 88–101). Delete the entire `const INTERN_BARRIERS = […];` declaration. The new `BARRIERS` array added in Step 1 takes its place.

- [ ] **Step 4: Add the new helper functions near the existing `employer*`/`cohort*`/`internById` helpers**

Find the existing helpers block (where `cohortById`, `internById`, `cohortNameFor`, `employerById`, `cohortsForEmployer`, `employerNameFor` live). Immediately after `employerNameFor`, insert:

```js
  function phaseById(id) {
    return PHASES.find(function (p) { return p.id === id; }) || null;
  }

  function barrierById(id) {
    return BARRIERS.find(function (b) { return b.id === id; }) || null;
  }

  function roleById(id) {
    return ROLES.find(function (r) { return r.id === id; }) || null;
  }

  function roleNameFor(cohort) {
    if (!cohort) return '';
    var r = roleById(cohort.roleId);
    return r ? r.label : '';
  }

  function phasesForCohort(cohort) {
    if (!cohort || !Array.isArray(cohort.phaseIds)) return [];
    var ids = cohort.phaseIds;
    return PHASES.filter(function (p) { return ids.indexOf(p.id) !== -1; });
  }

  function saveProgramInfo(payload) {
    try {
      var merged = Object.assign({}, PROGRAM_INFO_DEFAULTS, payload || {});
      window.sessionStorage.setItem('impact.settings.programInfo', JSON.stringify(merged));
      // Update the live reference so subsequent reads in this tab see the new values.
      Object.keys(merged).forEach(function (k) { PROGRAM_INFO[k] = merged[k]; });
    } catch (e) { /* sessionStorage unavailable; silently no-op */ }
  }
```

- [ ] **Step 5: Update the `window.IMPACT = { … };` export block**

Find the existing export block (added/modified in sub-project A; currently exports `EMPLOYERS, employerById, cohortsForEmployer, employerNameFor`, plus `INTERN_BARRIERS`, etc.). Replace with:

```js
  window.IMPACT = {
    COHORTS, INTERNS, COMPETENCY, SELF, EMPLOYERS,
    PHASES, BARRIERS, ROLES, PROGRAM_INFO,
    cohortById, internById, cohortNameFor, qs, wireModals, toast,
    fillText, hydrateInternRecord,
    competencyById, selfById, resolveParticipant,
    hydrateCompetencyDetail, hydrateCohortDetail, hydrateSelfDetail,
    wireTableFilter, internsByCohort, validate,
    employerById, cohortsForEmployer, employerNameFor, renderEmployerLink,
    phaseById, barrierById, roleById, roleNameFor, phasesForCohort,
    saveProgramInfo,
    ASSESSMENT_TYPES, assessmentStatus, markAssessmentComplete, formatCompletionDate,
  };
```

Note: `INTERN_BARRIERS` is gone from this list. `BARRIERS, PHASES, ROLES, PROGRAM_INFO` are added. Five new helpers are exported. The order otherwise matches the existing block.

- [ ] **Step 6: Verify no remaining `INTERN_BARRIERS` references in `app.js`**

Run:

```bash
grep -n 'INTERN_BARRIERS' Prototypes/PROTOTYPE/app.js
```

Expected: empty output. Any match indicates a reference that wasn't migrated. The intern-record.html barrier renderer is fixed in Task 2; if it lives inside `app.js` (which it does — `hydrateInternRecord`), it will be matched here. **If grep returns matches inside `hydrateInternRecord`, do NOT fix them in this task — Task 2 covers them. Just verify there are no OTHER references.** A typical correct result at this point shows `INTERN_BARRIERS.forEach(...)` inside `hydrateInternRecord`, which will be replaced in Task 2. To confirm only the hydrate site remains, run:

```bash
grep -nE 'INTERN_BARRIERS' Prototypes/PROTOTYPE/app.js | grep -v 'INTERN_BARRIERS.forEach'
```

Expected: empty (the only surviving match is the forEach call, which Task 2 will replace).

- [ ] **Step 7: Verify no remaining `cohort.role` (without `Id` suffix) in `app.js`**

Run:

```bash
grep -nE 'cohort\.role\b' Prototypes/PROTOTYPE/app.js
```

Expected: empty (the migrated field is `cohort.roleId` — the `\b` word boundary excludes that). If a reference remains, fix it inline.

- [ ] **Step 8: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "Add IMPACT.PHASES/BARRIERS/ROLES/PROGRAM_INFO + cohort roleId+phaseIds migration

Replaces IMPACT.INTERN_BARRIERS (array of strings) with IMPACT.BARRIERS
(array of {id, label}) and the corresponding intern-record renderer
will be rewired in a follow-up task. Cohort role string -> roleId FK
parallels the sub-project A Employer migration. New cohort.phaseIds
array stores the per-cohort multi-select. Adds helpers phaseById,
barrierById, roleById, roleNameFor, phasesForCohort, saveProgramInfo.
PROGRAM_INFO reads sessionStorage with hardcoded defaults as fallback."
```

---

## Task 2: Rewire Entry Assessment barriers in `intern-record.html` to consume the new `BARRIERS` shape

The Entry Assessment panel on `intern-record.html` currently iterates `IMPACT.INTERN_BARRIERS` (an array of strings) inside `hydrateInternRecord` (in `app.js`) to render 12 checkboxes. Task 1 replaced that data with `IMPACT.BARRIERS` (array of `{id, label}`). This task updates the renderer.

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`

- [ ] **Step 1: Locate the existing barrier-render loop in `hydrateInternRecord`**

Run:

```bash
grep -nE 'INTERN_BARRIERS' Prototypes/PROTOTYPE/app.js
```

The expected result (after Task 1) is one match: a `INTERN_BARRIERS.forEach(function (text, i) { … });` block inside the `hydrateInternRecord` function. Open the file at that line.

- [ ] **Step 2: Replace the loop body**

Find the surrounding block. It currently looks roughly like:

```js
      INTERN_BARRIERS.forEach(function (text, i) {
        // builds a checkbox + label using `text` and index `i`
      });
```

Replace with:

```js
      BARRIERS.forEach(function (barrier, i) {
        var idx = String(i + 1).padStart(2, '0');
        var checkboxId = 'barrier-' + barrier.id;
        var row = document.createElement('div');
        row.className = 'barrier-row';
        row.innerHTML =
          '<span class="barrier-row__idx">' + idx + '</span>' +
          '<input type="checkbox" id="' + checkboxId + '" name="barriers" value="' + barrier.id + '" />' +
          '<label for="' + checkboxId + '" class="barrier-row__label">' + barrier.label + '</label>';
        barrierContainer.appendChild(row);
      });
```

(If the existing implementation builds different markup — e.g., uses `IMPACT.fillText` against pre-rendered checkbox rows in HTML, or uses a different parent element name — preserve that exact markup pattern. The only required changes are: iterate `BARRIERS` instead of `INTERN_BARRIERS`; read `barrier.label` instead of using the string directly; set `value="barrier.id"` so the checkbox value is the FK; respect array order by using `BARRIERS.forEach` order. Keep the surrounding container/lookup logic unchanged.)

- [ ] **Step 3: Verify the rewrite**

Run:

```bash
grep -nE 'INTERN_BARRIERS' Prototypes/PROTOTYPE/app.js
```

Expected: empty.

```bash
grep -nE 'BARRIERS\.forEach' Prototypes/PROTOTYPE/app.js
```

Expected: one match in `hydrateInternRecord`.

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "Rewire Entry Assessment barriers to consume IMPACT.BARRIERS records

hydrateInternRecord now iterates the new {id, label} shape rather
than the old array of strings. Each checkbox value is the barrier
id (FK-ready for a future intern.barrierIds array). Render order
respects IMPACT.BARRIERS array order, matching the order set on
the Settings -> Barriers page."
```

---

## Task 3: Update `hydrateCohortDetail` — Role as plain text, Phases as comma-separated list

Today `hydrateCohortDetail` calls `fillText('[data-field="role"]', cohort.role)` and renders Phases via inline phase rows in the cohort-detail HTML. Both must change: Role pulls its label via `roleNameFor(cohort)` (since `cohort.role` no longer exists), and Phases renders as a comma-separated list via `phasesForCohort(cohort)`.

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`

- [ ] **Step 1: Locate the existing Role renderer in `hydrateCohortDetail`**

Run:

```bash
grep -nE 'data-field="role"' Prototypes/PROTOTYPE/app.js
```

Expected: one match inside `hydrateCohortDetail` — likely a `fillText('[data-field="role"]', cohort.role)` line.

- [ ] **Step 2: Replace the Role renderer**

Open the file at that line. Replace:

```js
    fillText('[data-field="role"]',        cohort.role);
```

with:

```js
    fillText('[data-field="role"]',        roleNameFor(cohort) || '—');
```

(Match the surrounding indentation. The `|| '—'` fallback gracefully handles the case where a Role has been deleted while leaving an orphaned cohort.)

- [ ] **Step 3: Add the Phases renderer**

Inside `hydrateCohortDetail`, immediately after the Role line just edited, add:

```js
    // Render the cohort's phases as a comma-separated list.
    var phaseEl = document.querySelector('[data-field="phases"]');
    if (phaseEl) {
      var phases = phasesForCohort(cohort);
      phaseEl.textContent = phases.length
        ? phases.map(function (p) { return p.label; }).join(', ')
        : 'No phases configured.';
    }
```

(The cohort-detail.html markup will be updated in Task 13 to expose a `[data-field="phases"]` target for this renderer to bind to. Until Task 13 lands, this `if (phaseEl)` guard means the renderer is a no-op when the target doesn't exist — safe to land independently.)

- [ ] **Step 4: Verify no stale `cohort.role` reads remain**

Run:

```bash
grep -rnE 'cohort\.role\b' Prototypes/PROTOTYPE/
```

Expected: empty (any surviving line uses `cohort.roleId` and matches `cohort\.role` but is excluded by the `\b` word boundary). If a hit appears anywhere besides the `app.js` change just made, fix it inline.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "Update hydrateCohortDetail: Role via roleNameFor, Phases via phasesForCohort

Role cell on cohort-detail.html now resolves cohort.roleId through
the new ROLES library; falls back to em-dash for orphaned cohorts.
Adds a Phases renderer that fills [data-field='phases'] with a
comma-separated list of phase labels (no-op until cohort-detail.html
exposes the binding target in Task 13)."
```

---

## Task 4: Add Settings inline-list + phase multi-select CSS

Three new pages (Phases, Barriers, Roles) share an inline-editable-list shape that doesn't yet exist in `styles.css`. The cohort form's new phase multi-select also needs styling. Validation styles for inline-error inputs are also new.

**Files:**
- Modify: `Prototypes/PROTOTYPE/styles.css`

- [ ] **Step 1: Append the new CSS to the end of `styles.css`**

Open `Prototypes/PROTOTYPE/styles.css`. Scroll to the very end (after the Settings shell block added in sub-project A Task 2). Append:

```css

/* ============================================================
   SETTINGS INLINE-EDITABLE LISTS
   Shared shell for settings-phases, settings-barriers, settings-roles.
   ============================================================ */

.settings-list {
  display: table;
  width: 100%;
  border-collapse: collapse;
}

.settings-list__row {
  display: table-row;
}

.settings-list__cell {
  display: table-cell;
  vertical-align: middle;
  padding: 8px 6px;
  border-bottom: 1px solid var(--rule);
}

.settings-list__cell--handle {
  width: 56px;
  white-space: nowrap;
  text-align: left;
  color: var(--muted);
}

.settings-list__cell--label {
  width: auto;
}

.settings-list__cell--remove {
  width: 40px;
  text-align: right;
}

.settings-list__handle-btn {
  appearance: none;
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm, 4px);
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  color: var(--ink);
}

.settings-list__handle-btn:hover {
  background: var(--canvas-alt, #F5F7FA);
}

.settings-list__handle-btn[disabled] {
  opacity: 0.35;
  cursor: not-allowed;
}

.settings-list__label-input {
  width: 100%;
  padding: 8px 10px;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink);
  background: #fff;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  transition: border-color 120ms ease;
}

.settings-list__label-input:focus {
  outline: none;
  border-color: var(--navy);
}

.settings-list__label-input.input--error {
  border-color: #B81F1F;
  background: #FFF5F5;
}

.settings-list__error-msg {
  display: block;
  margin-top: 4px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: #B81F1F;
}

.settings-list__remove-btn {
  appearance: none;
  background: transparent;
  border: none;
  font-size: 18px;
  line-height: 1;
  color: var(--muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm, 4px);
}

.settings-list__remove-btn:hover {
  background: #FFF0F0;
  color: #B81F1F;
}

/* Add-row button styled as a subtle dashed-border row at the bottom */
.settings-list__add {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  text-align: center;
  background: transparent;
  border: 1px dashed var(--rule);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted);
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.settings-list__add:hover {
  background: var(--canvas-alt, #F5F7FA);
  color: var(--ink);
}

/* ============================================================
   PHASE MULTI-SELECT (cohort form)
   ============================================================ */

.phase-multi-select {
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 16px 18px;
  margin: 0;
  background: #fff;
}

.phase-multi-select > legend {
  padding: 0 6px;
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
}

.phase-multi-select__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
}

.phase-multi-select__item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--navy);
  cursor: pointer;
}

.phase-multi-select.input--error {
  border-color: #B81F1F;
  background: #FFF5F5;
}
```

- [ ] **Step 2: Verify additions-only**

Run:

```bash
git diff --stat Prototypes/PROTOTYPE/styles.css
```

Expected: insertions only, zero deletions.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/styles.css
git commit -m "Add Settings inline-list + phase multi-select CSS

.settings-list (display:table-style row layout used by phases/barriers/
roles pages: handle column for up/down reorder, editable label input,
remove button, and a dashed add-row button at the bottom).
.phase-multi-select (cohort form's checkbox group, styled as a card
with mono micro-label legend and navy-accented checkboxes).
.input--error variants for inline validation. Purely additive."
```

---

## Task 5: Build `settings-phases.html` (inline-editable global Phases list)

Create the Phases settings page. It's a flat list of `{id, label}` records with inline editing, reorder, add, remove, and a Save Changes action. Renders from `IMPACT.PHASES`. This is the FIRST of the three sibling inline-list pages — Tasks 6 and 7 follow the same pattern with different data sources.

**Files:**
- Create: `Prototypes/PROTOTYPE/settings-phases.html`

- [ ] **Step 1: Create the file**

Create `Prototypes/PROTOTYPE/settings-phases.html` with this exact content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Phases — Settings — IMPACT Admin</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="styles.css" />
</head>
<body>

  <!-- NAV -->
  <header class="nav">
    <div class="nav__inner">
      <a href="index.html" class="wordmark" aria-label="IMPACT — Expand Your Opportunities">
        <img src="logo.png" alt="IMPACT — Expand Your Opportunities" class="wordmark__img" />
      </a>
      <nav class="nav__links">
        <a href="admin.html" class="nav__link">Home</a>
        <a href="interns-dashboard.html" class="nav__link">Interns</a>
        <a href="assessments.html" class="nav__link">Assessments</a>
        <a href="self-assessment-results.html" class="nav__link">Self-Assessment Results</a>
        <a href="reports.html" class="nav__link">Reports</a>
        <a href="settings-employers.html" class="nav__link nav__link--active">Settings</a>
        <span class="admin-chip">
          <span class="admin-chip__avatar">K</span>
          kortney@impact.org
          <span class="admin-chip__divider"></span>
          <a href="index.html" class="admin-chip__logout">Logout</a>
        </span>
      </nav>
    </div>
  </header>

  <!-- PAGE HEAD -->
  <section class="page-head">
    <div class="container">
      <div class="page-head__breadcrumb">
        <span class="micro-label">ADMIN / SETTINGS / PHASES</span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title">PHASES.</h1>
          <p class="page-head__sub">
            Phases used by the Competency Assessment. Each cohort selects which phases apply to it.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- SHELL -->
  <section class="container">
    <div class="settings-shell">

      <aside class="settings-rail">
        <span class="settings-rail__group">Settings</span>
        <a class="settings-rail__item" href="settings-employers.html">Employers</a>
        <a class="settings-rail__item" href="settings-stub.html?section=questions">Questions</a>
        <a class="settings-rail__item settings-rail__item--active" href="settings-phases.html">Phases</a>
        <a class="settings-rail__item" href="settings-barriers.html">Barriers</a>
        <a class="settings-rail__item" href="settings-roles.html">Roles</a>
        <a class="settings-rail__item" href="settings-program-info.html">Program Info</a>
      </aside>

      <main>
        <div class="detail-header" style="margin-top: 0;">
          <h2 class="detail-header__title">Competency Phases</h2>
        </div>

        <div class="settings-list" id="phasesList" role="list"></div>
        <button type="button" class="settings-list__add" id="addPhaseBtn">+ Add Phase</button>

        <div class="action-bar" style="margin-top: 24px;">
          <div class="action-bar__inner">
            <div class="action-bar__status">
              <span class="mono" style="color: var(--navy);">PHASES · EDIT</span>
            </div>
            <div class="action-bar__buttons">
              <button type="button" class="btn btn--outline" id="cancelBtn">Cancel</button>
              <button type="button" class="btn btn--primary" id="saveBtn">
                Save Changes
                <span class="btn__arrow">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </main>

    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="container footer__row">
      <a href="index.html" class="wordmark" aria-label="IMPACT — Expand Your Opportunities">
        <img src="logo.png" alt="IMPACT — Expand Your Opportunities" class="wordmark__img" />
      </a>
      <div class="footer__links">
        <a href="settings-employers.html">Settings</a>
        <a href="interns-dashboard.html">Interns</a>
      </div>
      <div class="footer__meta">&copy; 2026 IMPACT / Indiana</div>
    </div>
  </footer>

  <script src="app.js"></script>
  <script>
    (function () {
      // Working copy of the list (mutated as user edits; committed on Save).
      var working = IMPACT.PHASES.map(function (p) { return { id: p.id, label: p.label }; });

      var listEl = document.getElementById('phasesList');
      var addBtn = document.getElementById('addPhaseBtn');
      var saveBtn = document.getElementById('saveBtn');
      var cancelBtn = document.getElementById('cancelBtn');

      function render() {
        listEl.innerHTML = '';
        working.forEach(function (item, i) {
          var row = document.createElement('div');
          row.className = 'settings-list__row';
          row.setAttribute('role', 'listitem');
          row.dataset.index = String(i);
          row.innerHTML =
            '<div class="settings-list__cell settings-list__cell--handle">' +
              '<button type="button" class="settings-list__handle-btn" data-action="up"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move up">&uarr;</button>' +
              ' ' +
              '<button type="button" class="settings-list__handle-btn" data-action="down"' + (i === working.length - 1 ? ' disabled' : '') + ' aria-label="Move down">&darr;</button>' +
            '</div>' +
            '<div class="settings-list__cell settings-list__cell--label">' +
              '<input type="text" class="settings-list__label-input" value="' + (item.label || '').replace(/"/g, '&quot;') + '" />' +
            '</div>' +
            '<div class="settings-list__cell settings-list__cell--remove">' +
              '<button type="button" class="settings-list__remove-btn" data-action="remove" aria-label="Remove">&times;</button>' +
            '</div>';
          listEl.appendChild(row);
        });
      }

      function addRow() {
        // New rows get an empty id slot — id is generated on save (slug from label).
        working.push({ id: '', label: '' });
        render();
        // Focus the new input.
        var inputs = listEl.querySelectorAll('.settings-list__label-input');
        if (inputs.length) inputs[inputs.length - 1].focus();
      }

      function removeRow(i) {
        working.splice(i, 1);
        render();
      }

      function moveRow(i, dir) {
        var j = i + dir;
        if (j < 0 || j >= working.length) return;
        var tmp = working[i];
        working[i] = working[j];
        working[j] = tmp;
        render();
      }

      // Read input values back into the working array before validation/save.
      function syncFromInputs() {
        var inputs = listEl.querySelectorAll('.settings-list__label-input');
        inputs.forEach(function (inp, i) {
          if (working[i]) working[i].label = inp.value;
        });
      }

      function slugify(s) {
        return String(s).toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      }

      function validate() {
        // Returns true if all rules pass; otherwise highlights offending inputs and returns false.
        var inputs = listEl.querySelectorAll('.settings-list__label-input');
        var ok = true;
        // Reset error state.
        inputs.forEach(function (inp) { inp.classList.remove('input--error'); });
        // Rule: at least one row.
        if (working.length === 0) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'At least one phase is required.' });
          return false;
        }
        // Rule: no empty labels (after trim).
        working.forEach(function (item, i) {
          if (!String(item.label || '').trim()) {
            if (inputs[i]) inputs[i].classList.add('input--error');
            ok = false;
          }
        });
        // Rule: no duplicates (case-insensitive).
        var seen = {};
        working.forEach(function (item, i) {
          var key = String(item.label || '').trim().toLowerCase();
          if (!key) return; // empty handled above
          if (seen[key] !== undefined) {
            if (inputs[i]) inputs[i].classList.add('input--error');
            if (inputs[seen[key]]) inputs[seen[key]].classList.add('input--error');
            ok = false;
          } else {
            seen[key] = i;
          }
        });
        if (!ok) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please fix the highlighted rows.' });
        }
        return ok;
      }

      // Event delegation on the list container.
      listEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-action]');
        if (!btn) return;
        var row = btn.closest('.settings-list__row');
        if (!row) return;
        var i = parseInt(row.dataset.index, 10);
        var action = btn.dataset.action;
        // Sync inputs first so editor state isn't lost when re-rendering.
        syncFromInputs();
        if (action === 'remove') removeRow(i);
        else if (action === 'up')   moveRow(i, -1);
        else if (action === 'down') moveRow(i, +1);
      });

      addBtn.addEventListener('click', function () {
        syncFromInputs();
        addRow();
      });

      cancelBtn.addEventListener('click', function () {
        location.href = 'settings-employers.html';
      });

      saveBtn.addEventListener('click', function () {
        syncFromInputs();
        if (!validate()) return;
        // For the prototype, we don't persist mutations to IMPACT.PHASES across reloads.
        // Just generate slug ids for any new rows and toast success.
        working.forEach(function (item) {
          if (!item.id) item.id = slugify(item.label) || 'phase-' + Math.random().toString(36).slice(2, 8);
        });
        IMPACT.toast({ kind: 'success', label: 'SAVED', message: 'Phases updated.' });
        setTimeout(function () { location.href = 'settings-employers.html'; }, 700);
      });

      render();
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Verify the file's structural integrity**

Run:

```bash
grep -c 'nav__link--active' Prototypes/PROTOTYPE/settings-phases.html
grep -c 'settings-rail__item--active' Prototypes/PROTOTYPE/settings-phases.html
grep -c 'IMPACT.PHASES' Prototypes/PROTOTYPE/settings-phases.html
grep -c 'IMPACT.toast' Prototypes/PROTOTYPE/settings-phases.html
```

Expected: 1, 1, 1, 2.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-phases.html
git commit -m "Add settings-phases.html — inline-editable global Phases list

5 phases hydrated from IMPACT.PHASES into a settings-list working
copy. Each row: up/down reorder, inline label input, remove button.
Add button appends an empty row. Save validates non-empty labels +
no duplicates + at least one row, then toasts SAVED and redirects
to the Settings landing. Cancel redirects without committing."
```

---

## Task 6: Build `settings-barriers.html` (inline-editable Barriers list)

Same shape as `settings-phases.html` but bound to `IMPACT.BARRIERS`. Copying the pattern intentionally — DRY would require an abstraction we don't have yet, and the three pages diverge slightly in copy and IDs.

**Files:**
- Create: `Prototypes/PROTOTYPE/settings-barriers.html`

- [ ] **Step 1: Create the file**

Create `Prototypes/PROTOTYPE/settings-barriers.html` with this exact content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Barriers — Settings — IMPACT Admin</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="styles.css" />
</head>
<body>

  <!-- NAV -->
  <header class="nav">
    <div class="nav__inner">
      <a href="index.html" class="wordmark" aria-label="IMPACT — Expand Your Opportunities">
        <img src="logo.png" alt="IMPACT — Expand Your Opportunities" class="wordmark__img" />
      </a>
      <nav class="nav__links">
        <a href="admin.html" class="nav__link">Home</a>
        <a href="interns-dashboard.html" class="nav__link">Interns</a>
        <a href="assessments.html" class="nav__link">Assessments</a>
        <a href="self-assessment-results.html" class="nav__link">Self-Assessment Results</a>
        <a href="reports.html" class="nav__link">Reports</a>
        <a href="settings-employers.html" class="nav__link nav__link--active">Settings</a>
        <span class="admin-chip">
          <span class="admin-chip__avatar">K</span>
          kortney@impact.org
          <span class="admin-chip__divider"></span>
          <a href="index.html" class="admin-chip__logout">Logout</a>
        </span>
      </nav>
    </div>
  </header>

  <!-- PAGE HEAD -->
  <section class="page-head">
    <div class="container">
      <div class="page-head__breadcrumb">
        <span class="micro-label">ADMIN / SETTINGS / BARRIERS</span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title">BARRIERS.</h1>
          <p class="page-head__sub">
            Entry Assessment barrier checklist used on every intern record.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- SHELL -->
  <section class="container">
    <div class="settings-shell">

      <aside class="settings-rail">
        <span class="settings-rail__group">Settings</span>
        <a class="settings-rail__item" href="settings-employers.html">Employers</a>
        <a class="settings-rail__item" href="settings-stub.html?section=questions">Questions</a>
        <a class="settings-rail__item" href="settings-phases.html">Phases</a>
        <a class="settings-rail__item settings-rail__item--active" href="settings-barriers.html">Barriers</a>
        <a class="settings-rail__item" href="settings-roles.html">Roles</a>
        <a class="settings-rail__item" href="settings-program-info.html">Program Info</a>
      </aside>

      <main>
        <div class="detail-header" style="margin-top: 0;">
          <h2 class="detail-header__title">Entry-Assessment Barriers</h2>
        </div>

        <div class="settings-list" id="barriersList" role="list"></div>
        <button type="button" class="settings-list__add" id="addBarrierBtn">+ Add Barrier</button>

        <div class="action-bar" style="margin-top: 24px;">
          <div class="action-bar__inner">
            <div class="action-bar__status">
              <span class="mono" style="color: var(--navy);">BARRIERS · EDIT</span>
            </div>
            <div class="action-bar__buttons">
              <button type="button" class="btn btn--outline" id="cancelBtn">Cancel</button>
              <button type="button" class="btn btn--primary" id="saveBtn">
                Save Changes
                <span class="btn__arrow">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </main>

    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="container footer__row">
      <a href="index.html" class="wordmark" aria-label="IMPACT — Expand Your Opportunities">
        <img src="logo.png" alt="IMPACT — Expand Your Opportunities" class="wordmark__img" />
      </a>
      <div class="footer__links">
        <a href="settings-employers.html">Settings</a>
        <a href="interns-dashboard.html">Interns</a>
      </div>
      <div class="footer__meta">&copy; 2026 IMPACT / Indiana</div>
    </div>
  </footer>

  <script src="app.js"></script>
  <script>
    (function () {
      var working = IMPACT.BARRIERS.map(function (b) { return { id: b.id, label: b.label }; });
      var listEl = document.getElementById('barriersList');
      var addBtn = document.getElementById('addBarrierBtn');
      var saveBtn = document.getElementById('saveBtn');
      var cancelBtn = document.getElementById('cancelBtn');

      function render() {
        listEl.innerHTML = '';
        working.forEach(function (item, i) {
          var row = document.createElement('div');
          row.className = 'settings-list__row';
          row.setAttribute('role', 'listitem');
          row.dataset.index = String(i);
          row.innerHTML =
            '<div class="settings-list__cell settings-list__cell--handle">' +
              '<button type="button" class="settings-list__handle-btn" data-action="up"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move up">&uarr;</button>' +
              ' ' +
              '<button type="button" class="settings-list__handle-btn" data-action="down"' + (i === working.length - 1 ? ' disabled' : '') + ' aria-label="Move down">&darr;</button>' +
            '</div>' +
            '<div class="settings-list__cell settings-list__cell--label">' +
              '<input type="text" class="settings-list__label-input" value="' + (item.label || '').replace(/"/g, '&quot;') + '" />' +
            '</div>' +
            '<div class="settings-list__cell settings-list__cell--remove">' +
              '<button type="button" class="settings-list__remove-btn" data-action="remove" aria-label="Remove">&times;</button>' +
            '</div>';
          listEl.appendChild(row);
        });
      }

      function addRow() {
        working.push({ id: '', label: '' });
        render();
        var inputs = listEl.querySelectorAll('.settings-list__label-input');
        if (inputs.length) inputs[inputs.length - 1].focus();
      }

      function removeRow(i) { working.splice(i, 1); render(); }

      function moveRow(i, dir) {
        var j = i + dir;
        if (j < 0 || j >= working.length) return;
        var tmp = working[i]; working[i] = working[j]; working[j] = tmp;
        render();
      }

      function syncFromInputs() {
        var inputs = listEl.querySelectorAll('.settings-list__label-input');
        inputs.forEach(function (inp, i) { if (working[i]) working[i].label = inp.value; });
      }

      function slugify(s) {
        return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }

      function validate() {
        var inputs = listEl.querySelectorAll('.settings-list__label-input');
        var ok = true;
        inputs.forEach(function (inp) { inp.classList.remove('input--error'); });
        if (working.length === 0) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'At least one barrier is required.' });
          return false;
        }
        working.forEach(function (item, i) {
          if (!String(item.label || '').trim()) {
            if (inputs[i]) inputs[i].classList.add('input--error');
            ok = false;
          }
        });
        var seen = {};
        working.forEach(function (item, i) {
          var key = String(item.label || '').trim().toLowerCase();
          if (!key) return;
          if (seen[key] !== undefined) {
            if (inputs[i]) inputs[i].classList.add('input--error');
            if (inputs[seen[key]]) inputs[seen[key]].classList.add('input--error');
            ok = false;
          } else { seen[key] = i; }
        });
        if (!ok) IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please fix the highlighted rows.' });
        return ok;
      }

      listEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-action]');
        if (!btn) return;
        var row = btn.closest('.settings-list__row');
        if (!row) return;
        var i = parseInt(row.dataset.index, 10);
        var action = btn.dataset.action;
        syncFromInputs();
        if (action === 'remove') removeRow(i);
        else if (action === 'up')   moveRow(i, -1);
        else if (action === 'down') moveRow(i, +1);
      });

      addBtn.addEventListener('click', function () { syncFromInputs(); addRow(); });
      cancelBtn.addEventListener('click', function () { location.href = 'settings-employers.html'; });
      saveBtn.addEventListener('click', function () {
        syncFromInputs();
        if (!validate()) return;
        working.forEach(function (item) {
          if (!item.id) item.id = slugify(item.label) || 'barrier-' + Math.random().toString(36).slice(2, 8);
        });
        IMPACT.toast({ kind: 'success', label: 'SAVED', message: 'Barriers updated.' });
        setTimeout(function () { location.href = 'settings-employers.html'; }, 700);
      });

      render();
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Structural verification**

```bash
grep -c 'nav__link--active' Prototypes/PROTOTYPE/settings-barriers.html
grep -c 'settings-rail__item--active' Prototypes/PROTOTYPE/settings-barriers.html
grep -c 'IMPACT.BARRIERS' Prototypes/PROTOTYPE/settings-barriers.html
```

Expected: 1, 1, 1.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-barriers.html
git commit -m "Add settings-barriers.html — inline-editable Barriers list

12 barriers hydrated from IMPACT.BARRIERS into a settings-list
working copy. Same row layout / validation / save flow as
settings-phases.html. Edits do not persist across reloads."
```

---

## Task 7: Build `settings-roles.html` (inline-editable Roles list)

Same shape again, bound to `IMPACT.ROLES`.

**Files:**
- Create: `Prototypes/PROTOTYPE/settings-roles.html`

- [ ] **Step 1: Create the file**

Create `Prototypes/PROTOTYPE/settings-roles.html` with this exact content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Roles — Settings — IMPACT Admin</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="styles.css" />
</head>
<body>

  <!-- NAV -->
  <header class="nav">
    <div class="nav__inner">
      <a href="index.html" class="wordmark" aria-label="IMPACT — Expand Your Opportunities">
        <img src="logo.png" alt="IMPACT — Expand Your Opportunities" class="wordmark__img" />
      </a>
      <nav class="nav__links">
        <a href="admin.html" class="nav__link">Home</a>
        <a href="interns-dashboard.html" class="nav__link">Interns</a>
        <a href="assessments.html" class="nav__link">Assessments</a>
        <a href="self-assessment-results.html" class="nav__link">Self-Assessment Results</a>
        <a href="reports.html" class="nav__link">Reports</a>
        <a href="settings-employers.html" class="nav__link nav__link--active">Settings</a>
        <span class="admin-chip">
          <span class="admin-chip__avatar">K</span>
          kortney@impact.org
          <span class="admin-chip__divider"></span>
          <a href="index.html" class="admin-chip__logout">Logout</a>
        </span>
      </nav>
    </div>
  </header>

  <!-- PAGE HEAD -->
  <section class="page-head">
    <div class="container">
      <div class="page-head__breadcrumb">
        <span class="micro-label">ADMIN / SETTINGS / ROLES</span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title">ROLES.</h1>
          <p class="page-head__sub">
            Canonical roles cohorts can be assigned to.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- SHELL -->
  <section class="container">
    <div class="settings-shell">

      <aside class="settings-rail">
        <span class="settings-rail__group">Settings</span>
        <a class="settings-rail__item" href="settings-employers.html">Employers</a>
        <a class="settings-rail__item" href="settings-stub.html?section=questions">Questions</a>
        <a class="settings-rail__item" href="settings-phases.html">Phases</a>
        <a class="settings-rail__item" href="settings-barriers.html">Barriers</a>
        <a class="settings-rail__item settings-rail__item--active" href="settings-roles.html">Roles</a>
        <a class="settings-rail__item" href="settings-program-info.html">Program Info</a>
      </aside>

      <main>
        <div class="detail-header" style="margin-top: 0;">
          <h2 class="detail-header__title">Roles</h2>
        </div>

        <div class="settings-list" id="rolesList" role="list"></div>
        <button type="button" class="settings-list__add" id="addRoleBtn">+ Add Role</button>

        <div class="action-bar" style="margin-top: 24px;">
          <div class="action-bar__inner">
            <div class="action-bar__status">
              <span class="mono" style="color: var(--navy);">ROLES · EDIT</span>
            </div>
            <div class="action-bar__buttons">
              <button type="button" class="btn btn--outline" id="cancelBtn">Cancel</button>
              <button type="button" class="btn btn--primary" id="saveBtn">
                Save Changes
                <span class="btn__arrow">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </main>

    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="container footer__row">
      <a href="index.html" class="wordmark" aria-label="IMPACT — Expand Your Opportunities">
        <img src="logo.png" alt="IMPACT — Expand Your Opportunities" class="wordmark__img" />
      </a>
      <div class="footer__links">
        <a href="settings-employers.html">Settings</a>
        <a href="interns-dashboard.html">Interns</a>
      </div>
      <div class="footer__meta">&copy; 2026 IMPACT / Indiana</div>
    </div>
  </footer>

  <script src="app.js"></script>
  <script>
    (function () {
      var working = IMPACT.ROLES.map(function (r) { return { id: r.id, label: r.label }; });
      var listEl = document.getElementById('rolesList');
      var addBtn = document.getElementById('addRoleBtn');
      var saveBtn = document.getElementById('saveBtn');
      var cancelBtn = document.getElementById('cancelBtn');

      function render() {
        listEl.innerHTML = '';
        working.forEach(function (item, i) {
          var row = document.createElement('div');
          row.className = 'settings-list__row';
          row.setAttribute('role', 'listitem');
          row.dataset.index = String(i);
          row.innerHTML =
            '<div class="settings-list__cell settings-list__cell--handle">' +
              '<button type="button" class="settings-list__handle-btn" data-action="up"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move up">&uarr;</button>' +
              ' ' +
              '<button type="button" class="settings-list__handle-btn" data-action="down"' + (i === working.length - 1 ? ' disabled' : '') + ' aria-label="Move down">&darr;</button>' +
            '</div>' +
            '<div class="settings-list__cell settings-list__cell--label">' +
              '<input type="text" class="settings-list__label-input" value="' + (item.label || '').replace(/"/g, '&quot;') + '" />' +
            '</div>' +
            '<div class="settings-list__cell settings-list__cell--remove">' +
              '<button type="button" class="settings-list__remove-btn" data-action="remove" aria-label="Remove">&times;</button>' +
            '</div>';
          listEl.appendChild(row);
        });
      }

      function addRow() {
        working.push({ id: '', label: '' });
        render();
        var inputs = listEl.querySelectorAll('.settings-list__label-input');
        if (inputs.length) inputs[inputs.length - 1].focus();
      }

      function removeRow(i) {
        // Note: in production this would warn if the role is referenced by
        // ≥1 cohort and offer to set those cohorts' roleId to null.
        // The prototype mock data is read-only across reloads, so we
        // just remove the row from the working copy.
        working.splice(i, 1);
        render();
      }

      function moveRow(i, dir) {
        var j = i + dir;
        if (j < 0 || j >= working.length) return;
        var tmp = working[i]; working[i] = working[j]; working[j] = tmp;
        render();
      }

      function syncFromInputs() {
        var inputs = listEl.querySelectorAll('.settings-list__label-input');
        inputs.forEach(function (inp, i) { if (working[i]) working[i].label = inp.value; });
      }

      function slugify(s) {
        return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }

      function validate() {
        var inputs = listEl.querySelectorAll('.settings-list__label-input');
        var ok = true;
        inputs.forEach(function (inp) { inp.classList.remove('input--error'); });
        if (working.length === 0) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'At least one role is required.' });
          return false;
        }
        working.forEach(function (item, i) {
          if (!String(item.label || '').trim()) {
            if (inputs[i]) inputs[i].classList.add('input--error');
            ok = false;
          }
        });
        var seen = {};
        working.forEach(function (item, i) {
          var key = String(item.label || '').trim().toLowerCase();
          if (!key) return;
          if (seen[key] !== undefined) {
            if (inputs[i]) inputs[i].classList.add('input--error');
            if (inputs[seen[key]]) inputs[seen[key]].classList.add('input--error');
            ok = false;
          } else { seen[key] = i; }
        });
        if (!ok) IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please fix the highlighted rows.' });
        return ok;
      }

      listEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-action]');
        if (!btn) return;
        var row = btn.closest('.settings-list__row');
        if (!row) return;
        var i = parseInt(row.dataset.index, 10);
        var action = btn.dataset.action;
        syncFromInputs();
        if (action === 'remove') removeRow(i);
        else if (action === 'up')   moveRow(i, -1);
        else if (action === 'down') moveRow(i, +1);
      });

      addBtn.addEventListener('click', function () { syncFromInputs(); addRow(); });
      cancelBtn.addEventListener('click', function () { location.href = 'settings-employers.html'; });
      saveBtn.addEventListener('click', function () {
        syncFromInputs();
        if (!validate()) return;
        working.forEach(function (item) {
          if (!item.id) item.id = slugify(item.label) || 'role-' + Math.random().toString(36).slice(2, 8);
        });
        IMPACT.toast({ kind: 'success', label: 'SAVED', message: 'Roles updated.' });
        setTimeout(function () { location.href = 'settings-employers.html'; }, 700);
      });

      render();
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Structural verification**

```bash
grep -c 'nav__link--active' Prototypes/PROTOTYPE/settings-roles.html
grep -c 'settings-rail__item--active' Prototypes/PROTOTYPE/settings-roles.html
grep -c 'IMPACT.ROLES' Prototypes/PROTOTYPE/settings-roles.html
```

Expected: 1, 1, 1.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-roles.html
git commit -m "Add settings-roles.html — inline-editable Roles list

6 roles hydrated from IMPACT.ROLES into a settings-list working copy.
Same row layout / validation / save flow as settings-phases.html and
settings-barriers.html. Real cohort cascade-clean is documented as a
production concern in the inline comment; mock data is read-only."
```

---

## Task 8: Build `settings-program-info.html` (singleton form)

Single editable record for program identity + defaults. Loads from `IMPACT.PROGRAM_INFO`; persists to sessionStorage via `IMPACT.saveProgramInfo`.

**Files:**
- Create: `Prototypes/PROTOTYPE/settings-program-info.html`

- [ ] **Step 1: Create the file**

Create `Prototypes/PROTOTYPE/settings-program-info.html` with this exact content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Program Info — Settings — IMPACT Admin</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="styles.css" />
</head>
<body>

  <!-- NAV -->
  <header class="nav">
    <div class="nav__inner">
      <a href="index.html" class="wordmark" aria-label="IMPACT — Expand Your Opportunities">
        <img src="logo.png" alt="IMPACT — Expand Your Opportunities" class="wordmark__img" />
      </a>
      <nav class="nav__links">
        <a href="admin.html" class="nav__link">Home</a>
        <a href="interns-dashboard.html" class="nav__link">Interns</a>
        <a href="assessments.html" class="nav__link">Assessments</a>
        <a href="self-assessment-results.html" class="nav__link">Self-Assessment Results</a>
        <a href="reports.html" class="nav__link">Reports</a>
        <a href="settings-employers.html" class="nav__link nav__link--active">Settings</a>
        <span class="admin-chip">
          <span class="admin-chip__avatar">K</span>
          kortney@impact.org
          <span class="admin-chip__divider"></span>
          <a href="index.html" class="admin-chip__logout">Logout</a>
        </span>
      </nav>
    </div>
  </header>

  <!-- PAGE HEAD -->
  <section class="page-head">
    <div class="container">
      <div class="page-head__breadcrumb">
        <span class="micro-label">ADMIN / SETTINGS / PROGRAM INFO</span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title">PROGRAM INFO.</h1>
          <p class="page-head__sub">
            Program identity and defaults applied to new cohorts.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- SHELL -->
  <section class="container">
    <div class="settings-shell">

      <aside class="settings-rail">
        <span class="settings-rail__group">Settings</span>
        <a class="settings-rail__item" href="settings-employers.html">Employers</a>
        <a class="settings-rail__item" href="settings-stub.html?section=questions">Questions</a>
        <a class="settings-rail__item" href="settings-phases.html">Phases</a>
        <a class="settings-rail__item" href="settings-barriers.html">Barriers</a>
        <a class="settings-rail__item" href="settings-roles.html">Roles</a>
        <a class="settings-rail__item settings-rail__item--active" href="settings-program-info.html">Program Info</a>
      </aside>

      <main>
        <article class="identity-card">
          <div class="identity-card__head">
            <h2 class="identity-card__title">Program Record</h2>
            <span class="micro-label">PROGRAM INFO · IDENTITY</span>
          </div>

          <div class="id-grid id-grid--4">
            <div class="field" style="grid-column: span 2;">
              <label for="pi-name">Program Name</label>
              <input class="input" type="text" id="pi-name" />
            </div>
            <div class="field" style="grid-column: span 2;">
              <label for="pi-org">Organization Name</label>
              <input class="input" type="text" id="pi-org" />
            </div>
            <div class="field" style="grid-column: span 2;">
              <label for="pi-email">Contact Email</label>
              <input class="input" type="email" id="pi-email" />
            </div>
            <div class="field" style="grid-column: span 2;">
              <label for="pi-phone">Phone</label>
              <input class="input" type="text" id="pi-phone" />
            </div>
          </div>

          <div style="padding-top: 22px; margin-top: 22px; border-top: 1px solid var(--rule);">
            <span class="micro-label">PROGRAM INFO · DEFAULTS</span>
            <div class="id-grid id-grid--4" style="margin-top: 12px;">
              <div class="field" style="grid-column: span 2;">
                <label for="pi-cohort-length">Default Cohort Length (weeks)</label>
                <input class="input" type="number" min="1" id="pi-cohort-length" />
              </div>
              <div class="field" style="grid-column: span 2;">
                <label for="pi-fy-start">Fiscal Year Start</label>
                <select class="select" id="pi-fy-start">
                  <option value="January">January</option>
                  <option value="February">February</option>
                  <option value="March">March</option>
                  <option value="April">April</option>
                  <option value="May">May</option>
                  <option value="June">June</option>
                  <option value="July">July</option>
                  <option value="August">August</option>
                  <option value="September">September</option>
                  <option value="October">October</option>
                  <option value="November">November</option>
                  <option value="December">December</option>
                </select>
              </div>
            </div>
          </div>
        </article>
      </main>

    </div>
  </section>

  <!-- ACTION BAR -->
  <div class="action-bar">
    <div class="action-bar__inner">
      <div class="action-bar__status">
        <span class="mono" style="color: var(--navy);">PROGRAM INFO · EDIT</span>
      </div>
      <div class="action-bar__buttons">
        <a href="settings-employers.html" class="btn btn--outline">Cancel</a>
        <button type="button" class="btn btn--primary" data-action="save">
          Save Changes
          <span class="btn__arrow">&rarr;</span>
        </button>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="container footer__row">
      <a href="index.html" class="wordmark" aria-label="IMPACT — Expand Your Opportunities">
        <img src="logo.png" alt="IMPACT — Expand Your Opportunities" class="wordmark__img" />
      </a>
      <div class="footer__links">
        <a href="settings-employers.html">Settings</a>
        <a href="interns-dashboard.html">Interns</a>
      </div>
      <div class="footer__meta">&copy; 2026 IMPACT / Indiana</div>
    </div>
  </footer>

  <script src="app.js"></script>
  <script>
    (function () {
      var pi = IMPACT.PROGRAM_INFO || {};
      document.getElementById('pi-name').value          = pi.programName              || '';
      document.getElementById('pi-org').value           = pi.organizationName         || '';
      document.getElementById('pi-email').value         = pi.contactEmail             || '';
      document.getElementById('pi-phone').value         = pi.phone                    || '';
      document.getElementById('pi-cohort-length').value = pi.defaultCohortLengthWeeks || '';
      document.getElementById('pi-fy-start').value      = pi.fiscalYearStartMonth     || 'January';

      document.querySelector('[data-action="save"]').addEventListener('click', function () {
        var ok = IMPACT.validate([
          { selector: '#pi-name',          required: true },
          { selector: '#pi-email',         pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
          { selector: '#pi-cohort-length', required: true }
        ]);
        if (!ok) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please fix the highlighted fields.' });
          return;
        }
        var lengthVal = parseInt(document.getElementById('pi-cohort-length').value, 10);
        if (!(lengthVal >= 1)) {
          document.getElementById('pi-cohort-length').classList.add('input--error');
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Default Cohort Length must be a positive integer.' });
          return;
        }
        IMPACT.saveProgramInfo({
          programName:              document.getElementById('pi-name').value.trim(),
          organizationName:         document.getElementById('pi-org').value.trim(),
          contactEmail:             document.getElementById('pi-email').value.trim(),
          phone:                    document.getElementById('pi-phone').value.trim(),
          defaultCohortLengthWeeks: lengthVal,
          fiscalYearStartMonth:     document.getElementById('pi-fy-start').value
        });
        IMPACT.toast({ kind: 'success', label: 'UPDATED', message: 'Program Info updated.' });
        setTimeout(function () { location.href = 'settings-employers.html'; }, 700);
      });
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Structural verification**

```bash
grep -c 'nav__link--active' Prototypes/PROTOTYPE/settings-program-info.html
grep -c 'settings-rail__item--active' Prototypes/PROTOTYPE/settings-program-info.html
grep -c 'IMPACT.saveProgramInfo' Prototypes/PROTOTYPE/settings-program-info.html
grep -c 'IMPACT.PROGRAM_INFO' Prototypes/PROTOTYPE/settings-program-info.html
```

Expected: 1, 1, 1, 1.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-program-info.html
git commit -m "Add settings-program-info.html — singleton form

Identity card (Program Name, Organization, Email, Phone) + Defaults
card (Default Cohort Length weeks, Fiscal Year Start month). Loads
from IMPACT.PROGRAM_INFO; saves via IMPACT.saveProgramInfo to
sessionStorage. Email regex matches the Employer form's. Cohort
length validated as positive integer."
```

---

## Task 9: Update sidebar-rail items in existing Settings pages (point at real pages, rename "Phase Library" → "Phases")

The four settings pages already shipped (`settings-employers.html`, `settings-employer.html`, `settings-employer-form.html`, `settings-stub.html`) have sidebar-rail entries pointing at `settings-stub.html?section=…` for Phases, Barriers, Roles, and Program Info. Update them to point at the real pages just created. Also rename the "Phase Library" label to "Phases" everywhere.

**Files:**
- Modify: `Prototypes/PROTOTYPE/settings-employers.html`
- Modify: `Prototypes/PROTOTYPE/settings-employer.html`
- Modify: `Prototypes/PROTOTYPE/settings-employer-form.html`
- Modify: `Prototypes/PROTOTYPE/settings-stub.html`

- [ ] **Step 1: Bulk-rewire the four sidebar items in the four files**

Run from the prototype directory:

```bash
cd "Prototypes/PROTOTYPE" && for f in settings-employers.html settings-employer.html settings-employer-form.html settings-stub.html; do
  sed -i 's|<a class="settings-rail__item" href="settings-stub.html?section=phases">Phase Library</a>|<a class="settings-rail__item" href="settings-phases.html">Phases</a>|' "$f"
  sed -i 's|<a class="settings-rail__item" href="settings-stub.html?section=barriers">Barriers</a>|<a class="settings-rail__item" href="settings-barriers.html">Barriers</a>|' "$f"
  sed -i 's|<a class="settings-rail__item" href="settings-stub.html?section=roles">Roles</a>|<a class="settings-rail__item" href="settings-roles.html">Roles</a>|' "$f"
  sed -i 's|<a class="settings-rail__item" href="settings-stub.html?section=program-info">Program Info</a>|<a class="settings-rail__item" href="settings-program-info.html">Program Info</a>|' "$f"
done && echo "DONE"
```

- [ ] **Step 2: Verify the rewires**

Run:

```bash
cd "Prototypes/PROTOTYPE" && grep -nE 'settings-stub\.html\?section=(phases|barriers|roles|program-info)' settings-employers.html settings-employer.html settings-employer-form.html settings-stub.html
```

Expected: empty. The only remaining `settings-stub.html?section=…` link in the codebase should be `?section=questions` (Questions stays on the stub).

Sanity-check the new hrefs:

```bash
cd "Prototypes/PROTOTYPE" && grep -nE 'settings-phases\.html|settings-barriers\.html|settings-roles\.html|settings-program-info\.html' settings-employers.html settings-employer.html settings-employer-form.html settings-stub.html | head -30
```

Expected: each of the 4 files has 4 matches (one per real page).

- [ ] **Step 3: Verify "Phase Library" label is gone** (replaced by "Phases")

```bash
cd "Prototypes/PROTOTYPE" && grep -nE 'Phase Library' settings-employers.html settings-employer.html settings-employer-form.html settings-stub.html
```

Expected: empty.

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-employers.html Prototypes/PROTOTYPE/settings-employer.html Prototypes/PROTOTYPE/settings-employer-form.html Prototypes/PROTOTYPE/settings-stub.html
git commit -m "Rewire Settings sidebar rail to real pages (Phases/Barriers/Roles/Program Info)

Phase Library label simplifies to Phases everywhere. Sidebar items
on the 4 sub-project A settings pages now link to the real pages
introduced in tasks 5-8 instead of the settings-stub placeholder.
Questions remains stubbed (sub-project C)."
```

---

## Task 10: Shrink `settings-stub.html` LABELS map to just `{questions: 'Questions'}`

The stub page's inline IIFE has a `LABELS` map listing all 5 not-yet-built sections. Now that 4 of those sections have real implementations, the stub only handles Questions. Trim the map.

**Files:**
- Modify: `Prototypes/PROTOTYPE/settings-stub.html`

- [ ] **Step 1: Locate the LABELS map**

Run:

```bash
grep -n 'LABELS' Prototypes/PROTOTYPE/settings-stub.html
```

Expected: a few matches around the inline IIFE.

- [ ] **Step 2: Replace the LABELS object literal**

Open `Prototypes/PROTOTYPE/settings-stub.html`. Find the block:

```js
      var LABELS = {
        questions:     'Questions',
        phases:        'Phase Library',
        barriers:      'Barriers',
        roles:         'Roles',
        'program-info':'Program Info'
      };
```

Replace with:

```js
      var LABELS = {
        questions: 'Questions'
      };
```

- [ ] **Step 3: Verify the map shrunk**

Run:

```bash
grep -A 3 'var LABELS' Prototypes/PROTOTYPE/settings-stub.html
```

Expected output: only `questions` is listed inside the LABELS map.

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-stub.html
git commit -m "Shrink settings-stub LABELS map to just {questions} after Tasks 5-8

The other 4 section slugs now route to real pages and never reach
the stub. Unknown sections still fall through to the generic
'Settings' heading."
```

---

## Task 11: Cohort form Role dropdown (cohort-new + cohort-edit)

`cohort-new.html` and `cohort-edit.html` have an `<input id="co-role">` text field. Replace with a `<select>` populated from `IMPACT.ROLES`. New form pre-selects from `?roleId=`; edit form pre-selects from the cohort's current `roleId`. Mirrors the Employer-dropdown task in sub-project A.

**Files:**
- Modify: `Prototypes/PROTOTYPE/cohort-new.html`
- Modify: `Prototypes/PROTOTYPE/cohort-edit.html`

- [ ] **Step 1: Locate the existing Role field on each cohort form**

Run:

```bash
grep -n 'id="co-role"' Prototypes/PROTOTYPE/cohort-new.html Prototypes/PROTOTYPE/cohort-edit.html
```

Expected: one match per file, currently a `<input class="input" type="text" id="co-role" ...>` line.

- [ ] **Step 2: Replace the input with a select on `cohort-new.html`**

Open `Prototypes/PROTOTYPE/cohort-new.html`. Find the field block (around the matching line, with `<label for="co-role">Role</label>` directly above):

```html
          <div class="field">
            <label for="co-role">Role</label>
            <input class="input" type="text" id="co-role" placeholder="e.g. Medical Assistant" />
          </div>
```

(Indentation may differ; preserve whatever the file uses.)

Replace with:

```html
          <div class="field">
            <label for="co-role">Role</label>
            <select class="select" id="co-role">
              <option value="">Select role…</option>
            </select>
          </div>
```

- [ ] **Step 3: Add a populate-options IIFE on `cohort-new.html`**

Find the existing `<script src="app.js"></script>` line near the bottom of `cohort-new.html`. Add a NEW `<script>` block AFTER it (and BEFORE `</body>`):

```html
  <script>
    (function () {
      var sel = document.getElementById('co-role');
      if (!sel) return;
      // Populate options from ROLES.
      IMPACT.ROLES.forEach(function (r) {
        var opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.label;
        sel.appendChild(opt);
      });
      // Pre-select if ?roleId= is present.
      var preselect = IMPACT.qs('roleId');
      if (preselect && IMPACT.roleById(preselect)) {
        sel.value = preselect;
      }
    })();
  </script>
```

- [ ] **Step 4: Confirm the existing validate spec on `cohort-new.html` covers `#co-role`**

Run:

```bash
grep -n "selector: '#co-role'" Prototypes/PROTOTYPE/cohort-new.html
```

If the result shows a `{selector: '#co-role', required: true}` entry inside the form's validate spec, no change is needed. If `#co-role` is NOT in the existing validate spec, add it. Locate the `IMPACT.validate([` call in the file and append `{selector: '#co-role', required: true},` to the array. (The validate helper handles SELECT placeholder values — if the selected option's value is empty, the field is treated as empty.)

- [ ] **Step 5: Same input → select replacement on `cohort-edit.html`**

Open `Prototypes/PROTOTYPE/cohort-edit.html`. Find the same `<input id="co-role">` field block. Replace with the SAME `<select>` markup as Step 2 (matching the file's local indentation).

- [ ] **Step 6: Add a hydration IIFE on `cohort-edit.html`**

Find the existing `<script src="app.js"></script>` line. Add a new `<script>` block AFTER it (BEFORE `</body>`):

```html
  <script>
    (function () {
      var sel = document.getElementById('co-role');
      if (!sel) return;
      // Populate options from ROLES.
      IMPACT.ROLES.forEach(function (r) {
        var opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.label;
        sel.appendChild(opt);
      });
      // Pre-select from the current cohort's roleId.
      var id = IMPACT.qs('id');
      var cohort = id ? IMPACT.cohortById(id) : null;
      if (cohort) {
        sel.value = cohort.roleId;
      }
    })();
  </script>
```

⚠️ Important: this new IIFE must come AFTER any other IIFE that hydrates the form fields. If the existing form-hydrate IIFE sets `co-role.value` from the cohort's old `cohort.role` string field, that line is now stale (the field doesn't exist) — it will set the input value to `undefined`, which the new role IIFE then overwrites correctly. Either way, search the file for `co-role` references and make sure nothing else writes to it. If you find a stale `cohort.role` read on the page, delete just that line — your new IIFE supersedes it.

- [ ] **Step 7: Verify**

```bash
grep -n 'id="co-role"' Prototypes/PROTOTYPE/cohort-new.html Prototypes/PROTOTYPE/cohort-edit.html
```

Each line should show `<select` (not `<input`).

```bash
grep -nE 'IMPACT\.ROLES\.forEach' Prototypes/PROTOTYPE/cohort-new.html Prototypes/PROTOTYPE/cohort-edit.html
```

Each file: 1 match.

- [ ] **Step 8: Commit**

```bash
git add Prototypes/PROTOTYPE/cohort-new.html Prototypes/PROTOTYPE/cohort-edit.html
git commit -m "Replace cohort Role text input with Role dropdown sourced from IMPACT.ROLES

cohort-new.html reads ?roleId= for pre-selection (cheap to support
even though no current call sites pass it). cohort-edit.html
pre-selects from the current cohort's roleId. The same dropdown
pattern as the sub-project A Employer migration."
```

---

## Task 12: Cohort form Phase multi-select replaces the inline phase editor (cohort-new + cohort-edit)

The existing per-cohort phase editor on both cohort forms (auto-numbered rows of Phase Name + Week Range, with Add/Remove buttons) is removed. In its place: a checkbox group sourced from `IMPACT.PHASES`. Cohort-new: no phases pre-checked. Cohort-edit: pre-checks the cohort's `phaseIds`.

**Files:**
- Modify: `Prototypes/PROTOTYPE/cohort-new.html`
- Modify: `Prototypes/PROTOTYPE/cohort-edit.html`
- Modify: `Prototypes/PROTOTYPE/styles.css` (cleanup of unused `.phases-editor` rules — only if no other page references them)

- [ ] **Step 1: Locate the existing phase editor block on `cohort-new.html`**

Run:

```bash
grep -n 'phases-editor\|phase-edit-row\|phase-remove' Prototypes/PROTOTYPE/cohort-new.html
```

Expected: a cluster of matches around the phase editor section (likely `<div class="phases-editor" id="phasesEditor">` plus several `.phase-edit-row` divs). Note the line range — you'll be removing all of it.

- [ ] **Step 2: Read the surrounding markup to find the section's containing element**

Open `cohort-new.html` and locate the larger panel that wraps the phase editor (look for a comment like `<!-- Phases editor -->` or a `.rubric-section-head` / `.id-grid` / `.field` parent). The replacement multi-select fits inside that same panel.

- [ ] **Step 3: Replace the phase editor markup on `cohort-new.html`**

Delete the entire phase editor — from its surrounding section header (the "Phases" section title, micro-label, and the `<div class="phases-editor" …>` block, plus any "+ Add Phase" button below the rows) — and replace it with:

```html
      <!-- Phase multi-select -->
      <div class="rubric-section-head">
        <span class="rubric-section-head__label">Phases</span>
      </div>
      <fieldset class="phase-multi-select" id="cohortPhasesFieldset">
        <legend>Phases applicable to this cohort</legend>
        <!-- Populated by IIFE from IMPACT.PHASES -->
      </fieldset>
```

(Match the surrounding indentation. The exact `.rubric-section-head` markup may differ from what's currently in the file — preserve the file's existing pattern for section headings if it differs from this snippet.)

- [ ] **Step 4: Add a populate-checkboxes IIFE on `cohort-new.html`**

Find the existing `<script>` block(s) near the bottom (the role-dropdown IIFE from Task 11 should already be there). Append a new `<script>` block AFTER the role IIFE (BEFORE `</body>`):

```html
  <script>
    (function () {
      var fs = document.getElementById('cohortPhasesFieldset');
      if (!fs) return;
      IMPACT.PHASES.forEach(function (p) {
        var label = document.createElement('label');
        label.className = 'phase-multi-select__item';
        label.innerHTML =
          '<input type="checkbox" name="cohort-phases" value="' + p.id + '" />' +
          '<span>' + p.label + '</span>';
        fs.appendChild(label);
      });
    })();
  </script>
```

(For new cohorts, no boxes are pre-checked. The user picks the applicable phases for the cohort being created.)

- [ ] **Step 5: Same removal + replacement on `cohort-edit.html`**

Repeat Steps 1-3 on `cohort-edit.html`: locate and delete the phase-editor markup, insert the same `<fieldset class="phase-multi-select" id="cohortPhasesFieldset">` block in its place.

- [ ] **Step 6: Add a populate + pre-check IIFE on `cohort-edit.html`**

Append a new `<script>` block AFTER the role IIFE from Task 11:

```html
  <script>
    (function () {
      var fs = document.getElementById('cohortPhasesFieldset');
      if (!fs) return;
      var id = IMPACT.qs('id');
      var cohort = id ? IMPACT.cohortById(id) : null;
      var checked = (cohort && Array.isArray(cohort.phaseIds)) ? cohort.phaseIds : [];
      IMPACT.PHASES.forEach(function (p) {
        var label = document.createElement('label');
        label.className = 'phase-multi-select__item';
        var isChecked = checked.indexOf(p.id) !== -1;
        label.innerHTML =
          '<input type="checkbox" name="cohort-phases" value="' + p.id + '"' + (isChecked ? ' checked' : '') + ' />' +
          '<span>' + p.label + '</span>';
        fs.appendChild(label);
      });
    })();
  </script>
```

- [ ] **Step 7: Update the form's save flow on both cohort forms to require ≥1 phase**

The cohort forms each have a Save / Submit handler (often inside a confirmation modal IIFE). Locate it on each form and add a guard before the toast/redirect: if no checkboxes in `name="cohort-phases"` are checked, show a danger toast and abort.

On both `cohort-new.html` and `cohort-edit.html`, find the existing save-confirmation handler. The exact selector depends on the file — search for the `<button>` (or `<a>`) that opens the save modal (e.g., `data-action="confirm-save"` or `data-action="save"`). Inside its click handler, AT THE TOP, add:

```js
        var checkedPhases = document.querySelectorAll('input[name="cohort-phases"]:checked');
        if (checkedPhases.length === 0) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Pick at least one phase for this cohort.' });
          var fs = document.getElementById('cohortPhasesFieldset');
          if (fs) fs.classList.add('input--error');
          return;
        }
```

If there's a modal-confirm flow, add the guard BEFORE opening the modal (so the user fixes the error before the confirm prompt appears).

- [ ] **Step 8: Clean up unused CSS rules**

Check whether `.phases-editor`, `.phase-edit-row`, `.phase-remove`, and related styles are still referenced anywhere:

```bash
grep -rnE 'phases-editor|phase-edit-row|phase-remove' Prototypes/PROTOTYPE/
```

If only `Prototypes/PROTOTYPE/styles.css` matches (i.e., no HTML/JS files still reference these classes), delete the corresponding rules from `styles.css`. Use the Edit tool. If any HTML/JS file still references them, leave the CSS rules in place and note this in your task report.

- [ ] **Step 9: Verify**

```bash
grep -nE 'phases-editor' Prototypes/PROTOTYPE/cohort-new.html Prototypes/PROTOTYPE/cohort-edit.html
```

Expected: empty.

```bash
grep -nE 'phase-multi-select' Prototypes/PROTOTYPE/cohort-new.html Prototypes/PROTOTYPE/cohort-edit.html
```

Expected: each file has multiple matches (the fieldset class, the legend, the IIFE).

```bash
grep -nE 'IMPACT\.PHASES\.forEach' Prototypes/PROTOTYPE/cohort-new.html Prototypes/PROTOTYPE/cohort-edit.html
```

Expected: 1 match per file.

- [ ] **Step 10: Commit**

```bash
git add Prototypes/PROTOTYPE/cohort-new.html Prototypes/PROTOTYPE/cohort-edit.html Prototypes/PROTOTYPE/styles.css
git commit -m "Replace cohort phase editor with phase multi-select sourced from IMPACT.PHASES

Per-cohort phase rows (Name + Weeks) are gone — phases are now a
global Settings concept and each cohort just picks which phases
apply (multi-select checkboxes). cohort-edit pre-checks the
cohort's phaseIds. Save aborts with a danger toast if zero phases
are selected. Removed unused .phases-editor / .phase-edit-row /
.phase-remove CSS rules (verified no other reference)."
```

---

## Task 13: `cohort-detail.html` phases display rewire

The existing cohort-detail page renders phases as inline rows using markup like `.phases-readout` or similar (the visual mock from earlier iterations). Update the markup so `hydrateCohortDetail`'s new Phases renderer (added in Task 3) has a `[data-field="phases"]` target to bind to. Comma-separated list is the new display.

**Files:**
- Modify: `Prototypes/PROTOTYPE/cohort-detail.html`

- [ ] **Step 1: Locate the existing phases display in cohort-detail.html**

Run:

```bash
grep -n 'phase\|Phase' Prototypes/PROTOTYPE/cohort-detail.html | head -20
```

Look for the Phases section. The current markup is likely a panel with hardcoded phase row mock-ups (e.g., `<div class="phase-readout">…</div>` or similar) or a static phase list.

- [ ] **Step 2: Replace the phases markup with a single bound element**

Find the Phases section. Replace its body with:

```html
      <!-- Phases panel -->
      <div class="rubric-section-head">
        <span class="rubric-section-head__label">Phases</span>
      </div>
      <p class="cohort-detail__phases" data-field="phases">No phases configured.</p>
```

(Preserve the surrounding section's indentation. The `.cohort-detail__phases` class is purely descriptive — no styling required for this prototype iteration unless the file has a similar class elsewhere; in that case match it.)

- [ ] **Step 3: Verify the binding target exists exactly once**

```bash
grep -c 'data-field="phases"' Prototypes/PROTOTYPE/cohort-detail.html
```

Expected: 1.

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/cohort-detail.html
git commit -m "Render cohort-detail Phases as a comma-separated list

Replaces the inline phase row mockups with a single
[data-field=phases] target that hydrateCohortDetail's new renderer
populates via phasesForCohort(cohort). Empty cohorts show
'No phases configured.'."
```

---

## Task 14: Filter Competency Phase dropdown to the intern's cohort's phases (`competency-new.html`)

`competency-new.html` has `<select id="ph">` at line ~96 with 5 hardcoded options (Intake / Week 2 / Week 4 / Midpoint / Week 8). Replace the hardcoded list with a placeholder option and an IIFE that populates options from the intern's cohort's `phaseIds`. Cohort with zero phases disables Save.

**Note on competency-edit.html:** Phase is rendered as a read-only meta-strip cell (`data-field="phase"`) on competency-edit, NOT an editable select. The assessment's `phase` field is a string (e.g., `'Week 2'`), set at creation time and treated as part of the record's identity. `hydrateCompetencyDetail` in `app.js` already calls `fillText('[data-field="phase"]', rec.phase)` and that continues to work unchanged. No edits to competency-edit.html or `hydrateCompetencyDetail` are needed in this task — the orphan-phase concern from the spec doesn't apply because Phase isn't editable. The new `IMPACT.PHASES` library and `cohort.phaseIds` are used only by competency-new.html (this task) and the cohort form (Task 12).

**Files:**
- Modify: `Prototypes/PROTOTYPE/competency-new.html`

- [ ] **Step 1: Replace the hardcoded Phase select options on `competency-new.html`**

Open `Prototypes/PROTOTYPE/competency-new.html`. Find the block at line ~96:

```html
            <select class="select" id="ph">
              <option>Select phase…</option>
              <option>Intake</option>
              <option>Week 2</option>
              <option>Week 4</option>
              <option>Midpoint</option>
              <option>Week 8</option>
            </select>
```

(There may be additional options — preserve only the placeholder.)

Replace with:

```html
            <select class="select" id="ph">
              <option value="">Select phase…</option>
            </select>
```

- [ ] **Step 2: Add a phase-population IIFE on `competency-new.html`**

`competency-new.html` is reached with `?internId=<id>` from the assessments hub. Find the existing `<script src="app.js"></script>` near the bottom. Append a new `<script>` block AFTER it (BEFORE `</body>`):

```html
  <script>
    (function () {
      var sel = document.getElementById('ph');
      if (!sel) return;
      var internId = IMPACT.qs('internId');
      var intern = internId ? IMPACT.internById(internId) : null;
      var cohort = intern ? IMPACT.cohortById(intern.cohortId) : null;
      var phases = cohort ? IMPACT.phasesForCohort(cohort) : [];

      if (phases.length === 0) {
        // No phases configured for this cohort — disable Save with helper messaging.
        sel.innerHTML = '<option value="">(no phases configured for this cohort)</option>';
        sel.disabled = true;
        var saveBtn = document.querySelector('[data-action="save"], [data-action="confirm-save"]');
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.title = 'Add phases to this cohort before assessing.';
        }
        return;
      }

      // Populate the dropdown from the cohort's phases (label rendered; value is the id).
      phases.forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.label;
        sel.appendChild(opt);
      });
    })();
  </script>
```

The `<select>`'s `value` becomes a phase id (e.g., `'week-2'`). When the form submits, the existing demo flow toasts a success message and redirects — the prototype doesn't actually persist new competency records to `IMPACT.COMPETENCY`, so there's no follow-up data shape concern.

- [ ] **Step 3: Verify**

```bash
grep -n 'IMPACT\.phasesForCohort' Prototypes/PROTOTYPE/competency-new.html
```

Expected: 1 match.

```bash
grep -nE '<option>(Intake|Week 2|Week 4|Midpoint|Week 8)</option>' Prototypes/PROTOTYPE/competency-new.html
```

Expected: empty (the hardcoded options are gone).

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/competency-new.html
git commit -m "Filter competency-new Phase dropdown to the intern's cohort's phases

Hardcoded phase options (Intake / Week 2 / Week 4 / Midpoint /
Week 8) are replaced with a placeholder and an IIFE that
populates from phasesForCohort(intern.cohort). Cohorts with zero
phases configured disable Save with a helper tooltip."
```

---

## Task 15: Documentation updates (CLAUDE.md, PRD.md, App Outline)

Reflect sub-project B in the source-of-truth docs: page count, page list, data model entries, navigation structure, and a new SCREEN: Settings (Phases / Barriers / Roles / Program Info) block in the App Outline.

**Files:**
- Modify: `CLAUDE.md`
- Modify: `PRD.md`
- Modify: `IMPACT Internship Assessment Portal - App Outline.md`

- [ ] **Step 1: Update `CLAUDE.md` page count and admin list**

Open `CLAUDE.md`. Find the line:

```markdown
### Page inventory (26 pages)
```

Change to:

```markdown
### Page inventory (30 pages)
```

In the Admin: subsection, find the existing `settings-employer-form.html` line (or wherever the existing settings-* pages are listed). After the existing settings-* bullet block, insert:

```markdown
- `settings-phases.html` — Inline-editable Competency Phases list (Settings → Phases)
- `settings-barriers.html` — Inline-editable Entry Assessment Barriers list (Settings → Barriers)
- `settings-roles.html` — Inline-editable Roles list (Settings → Roles)
- `settings-program-info.html` — Singleton form for program identity + defaults (Settings → Program Info; sessionStorage-backed)
```

- [ ] **Step 2: Update `CLAUDE.md` mock-dataset bullet**

Find the bullet listing `IMPACT.EMPLOYERS, IMPACT.COHORTS, …`. Replace with:

```markdown
- **Mock dataset** — `IMPACT.EMPLOYERS`, `IMPACT.COHORTS`, `IMPACT.INTERNS`, `IMPACT.COMPETENCY`, `IMPACT.SELF`, `IMPACT.PHASES`, `IMPACT.BARRIERS`, `IMPACT.ROLES`, and the `IMPACT.PROGRAM_INFO` singleton (sessionStorage-backed). Lookup helpers: `employerById`, `cohortById`, `internById`, `cohortsForEmployer`, `employerNameFor`, `phaseById`, `barrierById`, `roleById`, `roleNameFor`, `phasesForCohort`. Cohorts reference their parent employer via `cohort.employerId`, their role via `cohort.roleId`, and their applicable phases via the `cohort.phaseIds` array. The deprecated `IMPACT.INTERN_BARRIERS` (array of strings) is replaced by `IMPACT.BARRIERS` (array of `{id, label}`). Program Info edits persist via `IMPACT.saveProgramInfo(payload)` to sessionStorage.
```

- [ ] **Step 3: Update `CLAUDE.md` "intern self-assessments" or "competency rubric" bullet that mentioned phases**

Find the bullet in "Product rules to know (from PRD)" that says "Competency phases: defined per cohort during cohort setup, not a global enum." Update to:

```markdown
- **Competency phases**: a global, admin-managed list (`IMPACT.PHASES`) defined in Settings → Phases. Each cohort selects a subset (`cohort.phaseIds`) that applies to it. The Competency assessment's Phase dropdown filters to the intern's cohort's phases.
```

- [ ] **Step 4: Update `PRD.md` data model + screens**

Open `PRD.md`. Find the Cohort entity bullet in the data-model section (probably called Section 6). The cohort field list previously included Employer (string). Update to mention `roleId` (FK to Roles) and `phaseIds` (array of FKs to Phases). Add new entity bullets immediately above or below the Cohort bullet:

```markdown
- **Phase** — Competency assessment phase. Fields: `id`, `label`. Editable in Settings → Phases. Cohorts reference applicable phases via `cohort.phaseIds`.
- **Barrier** — Entry Assessment barrier label. Fields: `id`, `label`. Editable in Settings → Barriers. Replaces the previous hardcoded list.
- **Role** — Cohort role. Fields: `id`, `label`. Editable in Settings → Roles. Cohorts reference their role via `cohort.roleId` (FK).
- **Program Info** — Singleton record. Fields: `programName`, `organizationName`, `contactEmail`, `phone`, `defaultCohortLengthWeeks`, `fiscalYearStartMonth`. Editable in Settings → Program Info. SessionStorage-backed in the prototype.
```

In the Screens enumeration (Section 9 or similar), find the existing Settings entry. Append "Phases, Barriers, Roles, Program Info" to its description so it now lists all 5 implemented sections. Example wording:

```markdown
6. **Settings** (admin) — Employers list, Employer detail, Employer new+edit form, Cohort detail/new/edit (reached from inside an employer), Phases (global list + per-cohort multi-select), Barriers (Entry Assessment library), Roles (canonical role library), Program Info (program identity + defaults). Placeholder stub remains for Questions (sub-project C).
```

- [ ] **Step 5: Update `IMPACT Internship Assessment Portal - App Outline.md`**

Open the file. Find the existing `# SCREEN: Settings` block (added in sub-project A's documentation pass). After its existing `## VIEW: …` sub-sections, append four NEW sub-sections:

```markdown

## VIEW: Phases (`settings-phases.html`)

ADMIN NAV (Settings active)
PAGE HEAD [ADMIN / SETTINGS / PHASES · "Phases."]
SETTINGS SIDEBAR (Phases active)
INLINE-EDITABLE LIST [up/down reorder · label input · remove · "+ Add Phase"]
ACTION BAR [Cancel · Save Changes]

## VIEW: Barriers (`settings-barriers.html`)

ADMIN NAV (Settings active)
PAGE HEAD [ADMIN / SETTINGS / BARRIERS · "Barriers."]
SETTINGS SIDEBAR (Barriers active)
INLINE-EDITABLE LIST [up/down reorder · label input · remove · "+ Add Barrier"]
ACTION BAR [Cancel · Save Changes]

## VIEW: Roles (`settings-roles.html`)

ADMIN NAV (Settings active)
PAGE HEAD [ADMIN / SETTINGS / ROLES · "Roles."]
SETTINGS SIDEBAR (Roles active)
INLINE-EDITABLE LIST [up/down reorder · label input · remove · "+ Add Role"]
ACTION BAR [Cancel · Save Changes]

## VIEW: Program Info (`settings-program-info.html`)

ADMIN NAV (Settings active)
PAGE HEAD [ADMIN / SETTINGS / PROGRAM INFO · "Program Info."]
SETTINGS SIDEBAR (Program Info active)
IDENTITY CARD [Program Name (required) · Organization Name · Contact Email (regex) · Phone]
DEFAULTS CARD [Default Cohort Length (positive int) · Fiscal Year Start (month dropdown)]
ACTION BAR [Cancel · Save Changes (writes to sessionStorage via IMPACT.saveProgramInfo)]
```

- [ ] **Step 6: Verify the doc edits land**

```bash
grep -nE '30 pages|Page inventory \(30' CLAUDE.md
grep -nE 'IMPACT\.PHASES.*IMPACT\.BARRIERS' CLAUDE.md
grep -nE 'phaseIds|roleId.*FK' PRD.md | head -5
grep -nE 'VIEW: Phases|VIEW: Barriers|VIEW: Roles|VIEW: Program Info' "IMPACT Internship Assessment Portal - App Outline.md"
```

Each grep should return at least 1 match.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md PRD.md "IMPACT Internship Assessment Portal - App Outline.md"
git commit -m "Update docs for Other Settings (sub-project B): Phases/Barriers/Roles/Program Info

CLAUDE.md: page count 26 -> 30; admin list adds 4 new settings-*
pages; mock-dataset bullet enumerates new IMPACT arrays + helpers;
competency-phases rule rewritten (global library + per-cohort
multi-select). PRD.md: 4 new entity bullets (Phase, Barrier, Role,
Program Info) + cohort FK fields documented; Settings screen entry
expanded. App Outline: 4 new VIEW sub-sections under SCREEN:
Settings."
```

---

## Task 16: End-to-end manual integration test

Walk every flow added or modified in sub-project B. Catch cross-task regressions before declaring it done.

**Files:**
- (None — verification only.)

- [ ] **Step 1: Reset to a fresh state**

Close all browser tabs. Open `Prototypes/PROTOTYPE/admin.html` in a fresh tab. Top nav should still show `Home · Interns · Assessments · Self-Assessment Results · Reports · Settings · admin-chip`.

- [ ] **Step 2: Walk all five Settings sidebar items**

Click **Settings** → lands on `settings-employers.html`. From the sidebar, click each of the 5 active items in turn (Employers, Phases, Barriers, Roles, Program Info). Each should land on its real page, with the matching sidebar item highlighted in navy.

Click **Questions** → still lands on the stub page with "Questions is coming soon." card.

- [ ] **Step 3: Phases CRUD**

On `settings-phases.html`: see 6 phases (Intake / Week 2 / Week 4 / Midpoint / Week 8 / Final). Edit "Week 4" → "Week 4 — Skill Check". Reorder Midpoint up by one. Add a row, label it "Wrap-Up". Save → SAVED toast → returns to Settings landing.

Re-enter Phases → all changes still visible (sessionStorage persists for the tab session, and the in-memory working array in Phases page reads from `IMPACT.PHASES` which is hardcoded — note: changes only persist if you keep the tab open between visits, since `IMPACT.PHASES` resets on full reload).

Save with an empty label → CHECK FIELDS toast + the empty input gets red border.
Save with two duplicate labels → CHECK FIELDS toast + both rows get red border.
Try to save with all rows removed → "At least one phase is required." toast.

- [ ] **Step 4: Barriers CRUD**

On `settings-barriers.html`: see 12 barriers. Edit one label, add one, reorder one, save → SAVED toast.

Open `intern-record.html?id=evans` (or any existing intern). Scroll to the Entry Assessment panel. The barriers list should reflect: the new label, the new row, the new order — in the same order as on the Settings → Barriers page.

- [ ] **Step 5: Roles CRUD + cascade**

On `settings-roles.html`: see 6 roles. Add a 7th called "Test Role". Save → returns to Settings landing.

Re-enter Roles. Try removing "Medical Assistant" (which is referenced by the Eskenazi 2026 cohort). On Save (the prototype removes it from the working array; production would warn about cascade — see the inline comment in the page's IIFE). Open `cohort-detail.html?id=eskenazi-2026` → in this prototype, the Role cell now reads `—` (or the old role label, depending on whether the working-list state persists into IMPACT.ROLES).

Note: full cascade-to-cohort behavior is a production concern; the prototype's Roles page just removes the row from the working copy and toasts SAVED. Verify the page doesn't crash.

- [ ] **Step 6: Program Info edit**

On `settings-program-info.html`: form pre-fills with the defaults (Program Name = "IMPACT Internship Program", Email = "kortney@impact.org", etc.). Edit Contact Email to "test@example.com". Save → UPDATED toast → returns to Settings landing.

Re-open Program Info → Contact Email shows "test@example.com" (sessionStorage overlay).

Save with empty Program Name → CHECK FIELDS toast.
Save with Email "not-an-email" → CHECK FIELDS toast.
Save with Default Cohort Length = 0 → CHECK FIELDS toast ("must be a positive integer").

- [ ] **Step 7: Cohort form Role + Phases**

From `settings-employers.html` → click Eskenazi Health → click `+ New Cohort` → lands on `cohort-new.html?employerId=eskenazi-health`. Confirm:
- Employer dropdown is pre-selected to Eskenazi Health (sub-project A behavior).
- Role dropdown lists 6 (or 7 if you added "Test Role" earlier) options + the "Select role…" placeholder. Nothing pre-selected.
- Phases section shows 5 (or however many you have after editing) checkboxes — none pre-checked.

Pick Role = "Medical Assistant", check 3 phases. Try to Save with NO phases checked → "Pick at least one phase" toast.
Re-check 3 phases → Save proceeds.

Click Edit on an existing cohort (e.g., Eskenazi 2026) → lands on `cohort-edit.html?id=eskenazi-2026`. Confirm:
- Role dropdown is pre-selected to Medical Assistant.
- Phase checkboxes pre-check the cohort's `phaseIds` (for MA — 2026, all 6 boxes: Intake, Week 2, Week 4, Midpoint, Week 8, Final).

- [ ] **Step 8: Cohort detail phases display**

Open `cohort-detail.html?id=ttt-2026` (which has 5 phases in its `phaseIds`). The Phases panel should render as a comma-separated list: "Intake, Week 2, Week 4, Week 8, Final".

Open `cohort-detail.html?id=elevate-2026` (which has 4 phases). Should render: "Intake, Week 2, Midpoint, Final".

- [ ] **Step 9: Competency Test phase dropdown**

Open `assessments.html` → click Competency Assessment → pick an intern from MA — 2026 (e.g., Bayer or Patterson) → lands on `competency-new.html?internId=<id>`.

The Phase dropdown should show ALL 6 phases (Intake, Week 2, Week 4, Midpoint, Week 8, Final) — MA — 2026 has the full set.

Now pick an intern from Customer Service — 2026 (Evans). Open the same flow → Phase dropdown should show only 4 options (Intake, Week 2, Midpoint, Final), since the elevate-2026 cohort's `phaseIds` is `['intake','week-2','midpoint','final']`. Week 4 and Week 8 are absent.

Now pick an intern from Construction — 2026 (Clark). Phase dropdown should show 5 options: Intake, Week 2, Week 4, Week 8, Final (no Midpoint — that cohort's `phaseIds` deliberately skips it).

- [ ] **Step 10: Competency Test edit page (read-only Phase)**

Open an existing competency assessment with `competency-edit.html?id=c-bayer-w2`.

The Phase value renders in the meta-strip (read-only) — no editable select on this page. The displayed phase is the original `Week 2` string from the assessment record. This is unchanged behavior; sub-project B does NOT migrate Phase from a string to an FK on existing assessment records.

- [ ] **Step 11: Verify no stale `cohort.role` or `INTERN_BARRIERS` references remain**

Run from the repo root:

```bash
grep -rnE 'cohort\.role\b' Prototypes/PROTOTYPE/
grep -rnE 'INTERN_BARRIERS' Prototypes/PROTOTYPE/
```

Both should return EMPTY.

- [ ] **Step 12: Final cleanup commit (only if any fixes were made above)**

If steps 1-11 surfaced no issues, skip this step. Otherwise:

```bash
git add <files>
git commit -m "Sub-project B integration fixes — <summary>"
```

---

## Out of scope (deferred to sub-project C)

These are explicitly NOT part of this plan. Do not implement them here.

- Real implementation of the Questions sidebar item — stays at `settings-stub.html?section=questions`.
- Versioning, data-driven forms, custom question-type builder — all sub-project C.
- Migrating the existing Personal Goals / Midpoint Reflection placeholder forms to real DOCS-sourced content (sub-project C).
- Soft-delete or undo for any sub-project B entity.
- Bulk import/export of phases, barriers, or roles.
- Per-cohort barrier or phase-name overrides.
- Localization or per-locale label overrides.
- Branding settings (logo override, color override).

## Known prototype limitations carried into this plan

- New / edited / deleted phases/barriers/roles do not persist across page reloads (mock data is hardcoded; refresh restores the demo seed).
- Program Info edits DO persist within the session (sessionStorage), but reset when the tab closes.
- Removing a Role does not actually cascade to cohort `roleId` values in the prototype's mock dataset (the inline-list working copy doesn't write back to `IMPACT.ROLES`). Production cascade behavior is documented in `settings-roles.html`'s IIFE comment.
- Removing a Phase does not actually cascade to cohort `phaseIds` arrays for the same reason. Competency edit's orphan handling exists to gracefully handle this case if/when the data layer becomes mutable.
