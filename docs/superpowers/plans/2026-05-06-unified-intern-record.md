# Unified Intern Record + Readiness Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `intern-new.html` and `intern-edit.html` with a single `intern-record.html` (7 numbered rubric panels) and delete the entire Readiness Assessment area.

**Architecture:** New unified page reuses the existing `rubric-panel` design language. Mode is driven by `?id=` URL param: present hydrates from `IMPACT.INTERNS` and locks identity panels; absent shows blank input panels. New helpers in `app.js` (`hydrateInternRecord`, `INTERN_BARRIERS`) handle the per-mode rendering. Readiness removal is a sweep across ~13 admin pages plus surgical edits to `admin.html`, `app.js`, and the docs.

**Tech Stack:** Static HTML, vanilla JS (IIFE pattern), CSS custom properties. **No test runner** per CLAUDE.md — verification is via manual code inspection and browser walk-through.

**Spec:** `docs/superpowers/specs/2026-05-06-unified-intern-record-design.md`

**Working directory for all paths:** `C:/Users/matts/OneDrive - Koehler Partners/Projects/IMPACT/Internship Assessment/IMPACT Intretnship Assessment Portal/`

---

## Task 1: Extend `app.js` — mock data, barriers, hydrator, remove Readiness

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`

This task makes all the `app.js` changes in a single commit: extending the `INTERNS` mock, adding `INTERN_BARRIERS` and `hydrateInternRecord`, and removing the Readiness pieces.

- [ ] **Step 1: Extend the `INTERNS` mock dataset with `first`, `dob`, `endDate` fields**

Find the `INTERNS` array (currently around lines 12-18) and replace it with:

```js
  const INTERNS = [
    { id: 'bayer',     first: 'Marcus',  last: 'Bayer',     cohortId: 'eskenazi-2026',   dob: '1998-03-12', zip: '46202', start: '04.14.2026', endDate: '09.30.2026', phase: 'Week 2',    outcome: 'none' },
    { id: 'clark',     first: 'Devon',   last: 'Clark',     cohortId: 'ttt-2026',        dob: '1996-07-04', zip: '46205', start: '04.12.2026', endDate: '09.30.2026', phase: 'Week 4',    outcome: 'none' },
    { id: 'evans',     first: 'Jasmine', last: 'Evans',     cohortId: 'elevate-2026',    dob: '1999-01-23', zip: '46227', start: '04.09.2026', endDate: '08.31.2026', phase: 'Midpoint',  outcome: '90d'  },
    { id: 'holt',      first: 'Trevor',  last: 'Holt',      cohortId: 'geminus-2026',    dob: '1997-11-08', zip: '46304', start: '04.07.2026', endDate: '09.30.2026', phase: 'Week 4',    outcome: 'none' },
    { id: 'patterson', first: 'Sasha',   last: 'Patterson', cohortId: 'eskenazi-2026',   dob: '1995-05-19', zip: '46208', start: '04.02.2026', endDate: '09.30.2026', phase: 'Final',     outcome: '180d' },
  ];
```

- [ ] **Step 2: Add `INTERN_BARRIERS` constant**

Find the `SELF` array declaration (currently around line 40). Insert this block immediately after the `SELF` array's closing `];`:

```js

  const INTERN_BARRIERS = [
    'No reliable transportation to placement site',
    'No childcare arrangements during placement hours',
    'Housing instability or lack of permanent address',
    'Limited access to professional or work-appropriate clothing',
    'Limited internet or phone access at home',
    'Health or medical concerns affecting attendance',
    'Limited literacy, numeracy, or English-language proficiency',
    'Justice involvement or background-related barriers',
    'Caregiving responsibilities for adult family members',
    'Limited financial reserves before first paycheck',
    'Missing required documentation (ID, SSN, work auth)',
    'Limited prior work history, references, or formal employment'
  ];
```

- [ ] **Step 3: Add `hydrateInternRecord` and helpers**

Find the closing `}` of the existing `validate(fieldSpecs)` function (currently around line 266, immediately before `// -------- Assessment completion state ...`). Insert the following BEFORE that "Assessment completion state" comment:

```js
  // -------- Intern Record (unified new + edit page) --------

  function hydrateInternRecord() {
    // Render the 12-barrier checkbox list (always present in both modes)
    var barrierList = document.querySelector('[data-barrier-list]');
    if (barrierList) {
      barrierList.innerHTML = '';
      INTERN_BARRIERS.forEach(function (text, i) {
        var idx = String(i + 1).padStart(2, '0');
        var row = document.createElement('div');
        row.className = 'outcome-check';
        row.innerHTML =
          '<input type="checkbox" id="barrier-' + idx + '" />' +
          '<label for="barrier-' + idx + '">' + text + '</label>';
        barrierList.appendChild(row);
      });
    }

    var id = qs('id');
    var titleEl = document.querySelector('[data-record="title"]');
    var crumbEl = document.querySelector('[data-record="breadcrumb"]');
    var metaStrip = document.querySelector('[data-record="meta-strip"]');
    var deleteBtn = document.querySelector('[data-record="delete-button"]');
    var statusChip = document.querySelector('[data-field="status-chip"]');
    var personalInfoPanel = document.querySelector('[data-section="personal-info"]');
    var internshipDetailsPanel = document.querySelector('[data-section="internship-details"]');

    if (!id) {
      // ---- New mode ----
      if (titleEl) titleEl.textContent = 'NEW INTERN.';
      if (crumbEl) crumbEl.innerHTML = '<a href="interns-dashboard.html" style="color:inherit; text-decoration:none;">ADMIN / INTERNS</a> / NEW';
      if (statusChip) statusChip.textContent = 'INTERN RECORD · NEW';

      // Disable Panel 07 (Employment Details) in new mode
      var o1 = document.getElementById('o1-check');
      var o2 = document.getElementById('o2-check');
      var o1Hint = document.querySelector('[data-field="o1-hint"]');
      var o2Hint = document.querySelector('[data-field="o2-hint"]');
      var o1Notes = document.getElementById('o1-notes');
      var o2Notes = document.getElementById('o2-notes');
      if (o1) o1.disabled = true;
      if (o2) o2.disabled = true;
      if (o1Hint) o1Hint.textContent = 'To be tracked once placed';
      if (o2Hint) o2Hint.textContent = 'To be tracked once placed';
      if (o1Notes) o1Notes.disabled = true;
      if (o2Notes) o2Notes.disabled = true;

      renderSelfAssessmentLinks(null);
      renderEvaluationLinks(null);
      return;
    }

    // ---- Edit mode ----
    if (titleEl) titleEl.textContent = 'EDIT INTERN.';
    if (crumbEl) crumbEl.innerHTML = '<a href="interns-dashboard.html" style="color:inherit; text-decoration:none;">ADMIN / INTERNS</a> / EDIT';
    if (deleteBtn) deleteBtn.hidden = false;

    var intern = internById(id);
    if (!intern) {
      toast({ kind: 'danger', label: 'NOT FOUND', message: 'No intern with that ID.' });
      if (statusChip) statusChip.textContent = 'INTERN RECORD · NOT FOUND';
      if (personalInfoPanel) personalInfoPanel.hidden = true;
      if (internshipDetailsPanel) internshipDetailsPanel.hidden = true;
      if (metaStrip) metaStrip.hidden = false;
      renderSelfAssessmentLinks(null);
      renderEvaluationLinks(null);
      return;
    }

    // Hide editable identity panels; show meta-strip with intern data
    if (personalInfoPanel) personalInfoPanel.hidden = true;
    if (internshipDetailsPanel) internshipDetailsPanel.hidden = true;
    if (metaStrip) metaStrip.hidden = false;

    var cohort = cohortById(intern.cohortId);
    fillText('[data-field="first"]',    intern.first || '—');
    fillText('[data-field="last"]',     intern.last);
    fillText('[data-field="dob"]',      intern.dob || '—');
    fillText('[data-field="zip"]',      intern.zip);
    fillText('[data-field="cohort"]',   cohort ? cohort.name : '—');
    fillText('[data-field="employer"]', cohort ? cohort.employer : '—');
    fillText('[data-field="start"]',    intern.start || '—');
    fillText('[data-field="end"]',      intern.endDate || '—');

    if (statusChip) {
      statusChip.textContent = 'INTERN RECORD · ' + intern.last.toUpperCase() +
        (cohort ? ' / ' + cohort.name.toUpperCase() : '');
    }

    // Hydrate Panel 07 outcome checkboxes from the intern's outcome status
    var o1 = document.getElementById('o1-check');
    var o2 = document.getElementById('o2-check');
    if (o1) o1.checked = intern.outcome === '90d' || intern.outcome === '180d';
    if (o2) o2.checked = intern.outcome === '180d';

    renderSelfAssessmentLinks(intern);
    renderEvaluationLinks(intern);
  }

  function renderSelfAssessmentLinks(intern) {
    var grid = document.querySelector('[data-record-link-grid="self-assessments"]');
    if (!grid) return;
    grid.innerHTML = '';

    var items = [
      { type: 'personal-goals',       label: 'PERSONAL GOALS',       title: 'Personal Goals' },
      { type: 'midpoint-reflection',  label: 'MID-POINT GOALS',      title: 'Mid-Point Goals' },
      { type: 'participant-feedback', label: 'PARTICIPANT FEEDBACK', title: 'Participant Feedback Form' }
    ];

    items.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'record-link record-link--placeholder';
      var statusText;
      if (!intern) {
        statusText = 'Will appear after this intern record is saved';
      } else if (item.type === 'participant-feedback') {
        statusText = 'Form coming soon';
      } else {
        var status = assessmentStatus(item.type);
        if (status.completed) {
          statusText = 'Submitted on ' + formatCompletionDate(status.completedAt) + ' · Detail view coming soon';
        } else {
          statusText = 'Not yet submitted';
        }
      }
      card.innerHTML =
        '<div class="record-link__head">' +
          '<span class="record-link__label">' + item.label + '</span>' +
          '<span class="record-link__title">' + item.title + '</span>' +
        '</div>' +
        '<span class="record-link__status">' + statusText + '</span>';
      grid.appendChild(card);
    });
  }

  function renderEvaluationLinks(intern) {
    var grid = document.querySelector('[data-record-link-grid="evaluations"]');
    if (!grid) return;
    grid.innerHTML = '';

    if (intern) {
      var competencyRecords = COMPETENCY.filter(function (c) { return c.internId === intern.id; });
      if (competencyRecords.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'record-link record-link--placeholder';
        empty.innerHTML =
          '<div class="record-link__head">' +
            '<span class="record-link__label">COMPETENCY</span>' +
            '<span class="record-link__title">Competency Assessments</span>' +
          '</div>' +
          '<span class="record-link__status">No competency assessments yet</span>';
        grid.appendChild(empty);
      } else {
        competencyRecords.forEach(function (c) {
          var a = document.createElement('a');
          a.className = 'record-link';
          a.href = 'competency-detail.html?id=' + c.id;
          a.innerHTML =
            '<div class="record-link__head">' +
              '<span class="record-link__label">COMPETENCY · ' + c.phase.toUpperCase() + '</span>' +
              '<span class="record-link__title">Competency Detail</span>' +
            '</div>' +
            '<span class="record-link__status">' + c.date + ' · ' + (c.result === 'pass' ? 'Pass' : 'Fail') + '</span>';
          grid.appendChild(a);
        });
      }
    } else {
      var newCard = document.createElement('div');
      newCard.className = 'record-link record-link--placeholder';
      newCard.innerHTML =
        '<div class="record-link__head">' +
          '<span class="record-link__label">COMPETENCY</span>' +
          '<span class="record-link__title">Competency Assessments</span>' +
        '</div>' +
        '<span class="record-link__status">Will appear after this intern record is saved</span>';
      grid.appendChild(newCard);
    }

    // Exit Employer Survey placeholder (always — form deferred to iteration 2)
    var exit = document.createElement('div');
    exit.className = 'record-link record-link--placeholder';
    exit.innerHTML =
      '<div class="record-link__head">' +
        '<span class="record-link__label">EXIT SURVEY</span>' +
        '<span class="record-link__title">Exit Employer Survey</span>' +
      '</div>' +
      '<span class="record-link__status">Form coming soon</span>';
    grid.appendChild(exit);
  }
```

- [ ] **Step 4: Remove the Readiness mock array and helpers**

Delete the entire `READINESS` const declaration (currently around lines 20-28) — the `const READINESS = [ ... ];` block.

Delete the `readinessById` function (one line, around line 114): `function readinessById(id)   { return READINESS.find(r => r.id === id); }`

Delete the `hydrateReadinessDetail` function (around lines 131-147) — the entire `function hydrateReadinessDetail() { ... }` block.

Update the `resolveParticipant` doc comment that still mentions readiness. Find:

```js
  // Resolve the participant name/cohort/zip for a READINESS or COMPETENCY record,
  // whether it references an existing intern or contains its own (fail-case) fields.
```

Replace with:

```js
  // Resolve the participant name/cohort/zip for a COMPETENCY record,
  // whether it references an existing intern or contains its own (fail-case) fields.
```

- [ ] **Step 5: Update the `window.IMPACT` export**

Find the current export block (currently around lines 268-275). Replace it with:

```js
  window.IMPACT = {
    COHORTS, INTERNS, COMPETENCY, SELF, INTERN_BARRIERS,
    cohortById, internById, cohortNameFor, qs, wireModals, toast,
    fillText, hydrateInternEdit, hydrateInternRecord,
    competencyById, selfById, resolveParticipant,
    hydrateCompetencyDetail, hydrateCohortDetail, hydrateSelfDetail,
    wireTableFilter, internsByCohort, validate,
    ASSESSMENT_TYPES, assessmentStatus, markAssessmentComplete, formatCompletionDate,
  };
```

(Removed `READINESS`, `readinessById`, `hydrateReadinessDetail`. Added `INTERN_BARRIERS` and `hydrateInternRecord`.)

- [ ] **Step 6: Manual verification**

Read the modified `Prototypes/PROTOTYPE/app.js` and verify:
- `INTERNS` mock has 5 entries each with `first`, `dob`, `endDate` fields
- `INTERN_BARRIERS` is declared with exactly 12 strings
- `hydrateInternRecord`, `renderSelfAssessmentLinks`, `renderEvaluationLinks` are defined inside the IIFE
- `READINESS`, `readinessById`, `hydrateReadinessDetail` no longer appear anywhere in the file
- `window.IMPACT` exports the new names and not the removed ones

Run a grep to confirm Readiness is gone from `app.js`:

```bash
grep -ni "readiness\|READINESS" Prototypes/PROTOTYPE/app.js
```

Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "Extend app.js for unified intern record; remove Readiness mock and helpers

Adds INTERN_BARRIERS const (12 placeholder barriers), extends INTERNS mock
with first/dob/endDate fields for all 5 demo entries, and adds three new
helpers for the unified intern record page: hydrateInternRecord,
renderSelfAssessmentLinks, renderEvaluationLinks. Removes IMPACT.READINESS,
readinessById, and hydrateReadinessDetail."
```

---

## Task 2: Add CSS for the unified intern record page

**Files:**
- Modify: `Prototypes/PROTOTYPE/styles.css`

- [ ] **Step 1: Append the new CSS block to the end of `styles.css`**

Open `Prototypes/PROTOTYPE/styles.css`. Append this block at the very end of the file:

```css

/* ---------- Intern Record (unified new + edit page) ---------- */

/* Single-input variant of role-question-row (intern record uses one column instead of skill+criterion) */
.role-question-row--intern {
  grid-template-columns: 60px 1fr auto;
}

/* 2-column grid of barrier checkboxes (Panel 03 — Entry Assessment) */
.barrier-check-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

@media (max-width: 720px) {
  .barrier-check-list { grid-template-columns: 1fr; }
}

/* Sub-cards inside Panel 05 (Self-Assessments) and Panel 06 (Evaluations) */
.record-link-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-link {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  background: #fff;
  text-decoration: none;
  color: inherit;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
a.record-link:hover {
  border-color: var(--navy);
  box-shadow: var(--shadow-md);
}

.record-link--placeholder {
  background: var(--canvas);
  border-color: rgba(5, 16, 40, 0.08);
}

.record-link__head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-link__label {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}

.record-link__title {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--ink);
}

.record-link__status {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  color: var(--navy);
  align-self: center;
  text-align: right;
}

@media (max-width: 720px) {
  .record-link { grid-template-columns: 1fr; }
  .record-link__status { text-align: left; }
}
```

- [ ] **Step 2: Manual verification**

Open `Prototypes/PROTOTYPE/index.html` to confirm existing styles still work. The new rules don't take effect until the new page consumes them.

Confirm `.id-grid--4` already exists at styles.css:1089 (it does, no addition needed for the 4-column identity grid in Panels 01 and 02).

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/styles.css
git commit -m "Add CSS for unified intern record page

.role-question-row--intern (single-column variant), .barrier-check-list
(2-col responsive grid for Entry Assessment), .record-link family
(sub-cards for Self-Assessments and Evaluations panels), with mobile
breakpoints. Reuses existing .outcome-check, .id-grid--4, .role-question-row,
.meta-strip, and .rubric-panel patterns."
```

---

## Task 3: Create `intern-record.html` (the unified page)

**Files:**
- Create: `Prototypes/PROTOTYPE/intern-record.html`

- [ ] **Step 1: Create the new file**

Create `Prototypes/PROTOTYPE/intern-record.html` with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Intern Record — IMPACT Admin</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="styles.css" />
</head>
<body>

  <!-- NAV (admin, post-Readiness-removal) -->
  <header class="nav">
    <div class="nav__inner">
      <a href="index.html" class="wordmark" aria-label="IMPACT — Expand Your Opportunities">
        <img src="logo.png" alt="IMPACT — Expand Your Opportunities" class="wordmark__img" />
      </a>
      <nav class="nav__links">
        <a href="admin.html" class="nav__link">Home</a>
        <a href="interns-dashboard.html" class="nav__link nav__link--active">Interns</a>
        <a href="competency-dashboard.html" class="nav__link">Competency</a>
        <a href="self-assessment-results.html" class="nav__link">Self-Assessment Results</a>
        <a href="reports.html" class="nav__link">Reports</a>
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
        <span class="micro-label" data-record="breadcrumb">
          <a href="interns-dashboard.html" style="color:inherit; text-decoration:none;">ADMIN / INTERNS</a> / NEW
        </span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title" data-record="title">NEW INTERN.</h1>
          <p class="page-head__sub">
            Capture the intern's intake information. Personal details and internship assignment lock once saved; ongoing fields stay editable.
          </p>
        </div>
      </div>

      <!-- Edit-mode meta strip (hidden in new mode; shown by hydrateInternRecord when ?id= present) -->
      <div class="meta-strip" data-record="meta-strip" hidden>
        <div class="meta-strip__item">
          <span class="meta-strip__label">First Name</span>
          <span class="meta-strip__value" data-field="first"></span>
        </div>
        <div class="meta-strip__item">
          <span class="meta-strip__label">Last Name</span>
          <span class="meta-strip__value" data-field="last"></span>
        </div>
        <div class="meta-strip__item">
          <span class="meta-strip__label">Date of Birth</span>
          <span class="meta-strip__value mono" data-field="dob"></span>
        </div>
        <div class="meta-strip__item">
          <span class="meta-strip__label">Zipcode</span>
          <span class="meta-strip__value mono" data-field="zip"></span>
        </div>
        <div class="meta-strip__item">
          <span class="meta-strip__label">Cohort</span>
          <span class="meta-strip__value" data-field="cohort"></span>
        </div>
        <div class="meta-strip__item">
          <span class="meta-strip__label">Employer</span>
          <span class="meta-strip__value" data-field="employer"></span>
        </div>
        <div class="meta-strip__item">
          <span class="meta-strip__label">Start</span>
          <span class="meta-strip__value mono" data-field="start"></span>
        </div>
        <div class="meta-strip__item">
          <span class="meta-strip__label">End</span>
          <span class="meta-strip__value mono" data-field="end"></span>
        </div>
      </div>
    </div>
  </section>

  <!-- FORM -->
  <section class="assessment-wrap">
    <div class="container">
      <div class="rubric">

        <!-- Panel 01 — Personal Information (new mode only; hidden in edit mode by hydrateInternRecord) -->
        <article class="rubric-panel" data-section="personal-info">
          <header class="rubric-panel__head">
            <span class="rubric-panel__num">01</span>
            <div class="rubric-panel__title-block">
              <h3 class="rubric-panel__title">Personal Information</h3>
              <span class="rubric-panel__meta">Identity captured at intake; locks once saved.</span>
            </div>
          </header>
          <div class="id-grid id-grid--4" style="padding: 22px 28px;">
            <div class="field">
              <label for="first">First Name</label>
              <input class="input" id="first" type="text" placeholder="e.g., Marcus" />
            </div>
            <div class="field">
              <label for="last">Last Name</label>
              <input class="input" id="last" type="text" placeholder="e.g., Patterson" />
            </div>
            <div class="field">
              <label for="dob">Date of Birth</label>
              <input class="input" id="dob" type="date" />
            </div>
            <div class="field">
              <label for="zip">Zipcode</label>
              <input class="input" id="zip" type="text" inputmode="numeric" maxlength="5" placeholder="46204" />
            </div>
          </div>
        </article>

        <!-- Panel 02 — Internship Details (new mode only) -->
        <article class="rubric-panel" data-section="internship-details">
          <header class="rubric-panel__head">
            <span class="rubric-panel__num">02</span>
            <div class="rubric-panel__title-block">
              <h3 class="rubric-panel__title">Internship Details</h3>
              <span class="rubric-panel__meta">Cohort assignment; employer auto-fills; dates default to cohort window.</span>
            </div>
          </header>
          <div class="id-grid id-grid--4" style="padding: 22px 28px;">
            <div class="field">
              <label for="cohort">Cohort</label>
              <select class="select" id="cohort">
                <option value="">Select cohort</option>
                <option value="eskenazi-2026">Eskenazi 2026</option>
                <option value="ttt-2026">TTT 2026</option>
                <option value="habitat-2026">Habitat 2026</option>
                <option value="elevate-2026">Elevate 2026</option>
                <option value="geminus-2026">Geminus 2026</option>
                <option value="healthlink-2026">Health Link 2026</option>
              </select>
            </div>
            <div class="field">
              <label>Employer</label>
              <div class="input" id="employer-display" style="background: var(--canvas); color: var(--muted);">—</div>
            </div>
            <div class="field">
              <label for="startDate">Start Date</label>
              <input class="input" id="startDate" type="date" />
            </div>
            <div class="field">
              <label for="endDate">End Date</label>
              <input class="input" id="endDate" type="date" />
            </div>
          </div>
        </article>

        <!-- Panel 03 — Entry Assessment -->
        <article class="rubric-panel" data-section="entry-assessment">
          <header class="rubric-panel__head">
            <span class="rubric-panel__num">03</span>
            <div class="rubric-panel__title-block">
              <h3 class="rubric-panel__title">Entry Assessment</h3>
              <span class="rubric-panel__meta">Barriers to entry identified at intake. Notes feed support planning.</span>
            </div>
          </header>
          <div class="barrier-check-list" data-barrier-list></div>
          <div class="rubric-notes" style="padding: 22px 28px; border-top: 1px solid var(--rule);">
            <label class="rubric-notes__label" for="barrier-notes">Notes</label>
            <textarea class="textarea" id="barrier-notes" rows="3" placeholder="Additional context, supports, or follow-up needed…"></textarea>
          </div>
        </article>

        <!-- Panel 04 — Role-Specific Competency Questions -->
        <article class="rubric-panel" data-section="role-specific">
          <header class="rubric-panel__head">
            <span class="rubric-panel__num">04</span>
            <div class="rubric-panel__title-block">
              <h3 class="rubric-panel__title">Role-Specific Competency Questions</h3>
              <span class="rubric-panel__meta">Tailor competency expectations for this intern. Add or remove rows as needed.</span>
            </div>
          </header>
          <div class="role-questions-list" data-role-questions style="padding: 22px 28px;">
            <article class="role-question-row role-question-row--intern">
              <span class="role-question-row__idx">01</span>
              <div class="field">
                <label>Question</label>
                <input class="input" type="text" value="Performs core role tasks independently and correctly" />
              </div>
              <button type="button" class="phase-remove" aria-label="Remove question" data-action="role-remove">&times;</button>
            </article>
            <article class="role-question-row role-question-row--intern">
              <span class="role-question-row__idx">02</span>
              <div class="field">
                <label>Question</label>
                <input class="input" type="text" value="Uses required tools or systems safely and appropriately" />
              </div>
              <button type="button" class="phase-remove" aria-label="Remove question" data-action="role-remove">&times;</button>
            </article>
            <article class="role-question-row role-question-row--intern">
              <span class="role-question-row__idx">03</span>
              <div class="field">
                <label>Question</label>
                <input class="input" type="text" value="Meets role pace and accuracy expectations for entry-level readiness" />
              </div>
              <button type="button" class="phase-remove" aria-label="Remove question" data-action="role-remove">&times;</button>
            </article>
            <article class="role-question-row role-question-row--intern">
              <span class="role-question-row__idx">04</span>
              <div class="field">
                <label>Question</label>
                <input class="input" type="text" value="Follows key role procedures (safety, confidentiality, process steps)" />
              </div>
              <button type="button" class="phase-remove" aria-label="Remove question" data-action="role-remove">&times;</button>
            </article>
            <article class="role-question-row role-question-row--intern">
              <span class="role-question-row__idx">05</span>
              <div class="field">
                <label>Question</label>
                <input class="input" type="text" value="Communicates professionally with clients, students, or customers as required" />
              </div>
              <button type="button" class="phase-remove" aria-label="Remove question" data-action="role-remove">&times;</button>
            </article>
            <article class="role-question-row role-question-row--intern">
              <span class="role-question-row__idx">06</span>
              <div class="field">
                <label>Question</label>
                <input class="input" type="text" value="Maintains required documentation accurately and on time" />
              </div>
              <button type="button" class="phase-remove" aria-label="Remove question" data-action="role-remove">&times;</button>
            </article>
          </div>
          <div class="role-questions-editor__add" style="padding: 0 28px 22px;">
            <button type="button" class="btn btn--outline btn--sm" data-action="role-add">+ Add question</button>
          </div>
        </article>

        <!-- Panel 05 — Intern Self-Assessments -->
        <article class="rubric-panel" data-section="self-assessments">
          <header class="rubric-panel__head">
            <span class="rubric-panel__num">05</span>
            <div class="rubric-panel__title-block">
              <h3 class="rubric-panel__title">Intern Self-Assessments</h3>
              <span class="rubric-panel__meta">Submissions made by the intern through the public portal.</span>
            </div>
          </header>
          <div class="record-link-grid" data-record-link-grid="self-assessments" style="padding: 22px 28px;">
            <!-- Populated by hydrateInternRecord() -->
          </div>
        </article>

        <!-- Panel 06 — Evaluations -->
        <article class="rubric-panel" data-section="evaluations">
          <header class="rubric-panel__head">
            <span class="rubric-panel__num">06</span>
            <div class="rubric-panel__title-block">
              <h3 class="rubric-panel__title">Evaluations</h3>
              <span class="rubric-panel__meta">Competency assessments and exit surveys for this intern.</span>
            </div>
          </header>
          <div class="record-link-grid" data-record-link-grid="evaluations" style="padding: 22px 28px;">
            <!-- Populated by hydrateInternRecord() -->
          </div>
        </article>

        <!-- Panel 07 — Employment Details -->
        <article class="rubric-panel" data-section="employment-details">
          <header class="rubric-panel__head">
            <span class="rubric-panel__num">07</span>
            <div class="rubric-panel__title-block">
              <h3 class="rubric-panel__title">Employment Details</h3>
              <span class="rubric-panel__meta">Post-placement outcomes confirmed at 90 and 180 days.</span>
            </div>
          </header>

          <div class="outcome-check">
            <input type="checkbox" id="o1-check" />
            <label for="o1-check">Employed at 90 days</label>
            <span class="outcome-check__hint" data-field="o1-hint"></span>
          </div>
          <div class="rubric-notes" style="padding: 0 28px 22px;">
            <label class="rubric-notes__label" for="o1-notes">90-Day Notes</label>
            <textarea class="textarea" id="o1-notes" rows="2" placeholder="Hire details, role, start date…"></textarea>
          </div>

          <div class="outcome-check">
            <input type="checkbox" id="o2-check" />
            <label for="o2-check">Still employed at 180 days</label>
            <span class="outcome-check__hint" data-field="o2-hint"></span>
          </div>
          <div class="rubric-notes" style="padding: 0 28px 22px;">
            <label class="rubric-notes__label" for="o2-notes">180-Day Notes</label>
            <textarea class="textarea" id="o2-notes" rows="2" placeholder="Continuity notes, role changes, promotions…"></textarea>
          </div>
        </article>

      </div>
    </div>
  </section>

  <!-- ACTION BAR -->
  <div class="action-bar">
    <div class="action-bar__inner">
      <div class="action-bar__status">
        <span class="mono" data-field="status-chip" style="color: var(--navy);">INTERN RECORD · NEW</span>
      </div>
      <div class="action-bar__buttons">
        <a href="interns-dashboard.html" class="btn btn--outline">Cancel</a>
        <button type="button" class="btn btn--danger" data-record="delete-button" data-open="deleteModal" hidden>Delete Intern</button>
        <button type="button" class="btn btn--primary" data-action="save">Save Changes <span class="btn__arrow">&rarr;</span></button>
      </div>
    </div>
  </div>

  <!-- MODAL: Save Confirmation -->
  <div class="modal" id="updateModal" role="dialog" aria-modal="true" hidden>
    <div class="modal__overlay" data-close></div>
    <div class="modal__card modal__card--success">
      <span class="modal__label">SAVE CHANGES</span>
      <h3 class="modal__title">Save this intern record?</h3>
      <p class="modal__body">
        Identity fields will lock once saved. Ongoing fields (Entry Assessment, Role-Specific Questions, Employment Details) remain editable.
      </p>
      <div class="modal__actions">
        <button type="button" class="btn btn--outline" data-close>Keep Editing</button>
        <button type="button" class="btn btn--primary" data-action="confirm-save">Save</button>
      </div>
    </div>
  </div>

  <!-- MODAL: Delete Confirmation (edit mode only) -->
  <div class="modal" id="deleteModal" role="dialog" aria-modal="true" hidden>
    <div class="modal__overlay" data-close></div>
    <div class="modal__card modal__card--danger">
      <span class="modal__label">DELETE RECORD</span>
      <h3 class="modal__title">Delete this intern record?</h3>
      <p class="modal__body">
        This intern will be removed from the cohort roster. Any competency assessments tied to their identifier will remain for historical reference.
      </p>
      <div class="modal__actions">
        <button type="button" class="btn btn--outline" data-close>Cancel</button>
        <button type="button" class="btn btn--danger" data-action="confirm-delete">Delete Permanently</button>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
  <script>
    (function () {
      // Modal open / close (data-open / data-close / Escape)
      document.querySelectorAll('[data-open]').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          var m = document.getElementById(el.dataset.open);
          if (m) m.hidden = false;
        });
      });
      document.addEventListener('click', function (e) {
        var c = e.target.closest('[data-close]');
        if (c) { var m = c.closest('.modal'); if (m) m.hidden = true; }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal:not([hidden])').forEach(function (m) { m.hidden = true; });
        }
      });

      // Hydrate the page (new mode if no ?id=, edit mode if ?id= present)
      if (window.IMPACT && IMPACT.hydrateInternRecord) IMPACT.hydrateInternRecord();

      // Cohort change cascading (new mode only — in edit mode the cohort field is replaced by meta-strip)
      var cohortSelect = document.getElementById('cohort');
      if (cohortSelect) {
        cohortSelect.addEventListener('change', function () {
          var cohort = IMPACT.cohortById(cohortSelect.value);
          if (!cohort) return;
          var employerEl = document.getElementById('employer-display');
          if (employerEl) employerEl.textContent = cohort.employer;
          var startEl = document.getElementById('startDate');
          var endEl = document.getElementById('endDate');
          // Convert "MM.DD.YYYY" to "YYYY-MM-DD" for the date input
          function toIso(d) {
            if (!d || !/^\d{2}\.\d{2}\.\d{4}$/.test(d)) return '';
            var parts = d.split('.');
            return parts[2] + '-' + parts[0] + '-' + parts[1];
          }
          if (startEl && !startEl.value) startEl.value = toIso(cohort.start);
          if (endEl && !endEl.value) endEl.value = toIso(cohort.end);
        });
      }

      // Role-specific add / remove (delegated)
      document.addEventListener('click', function (e) {
        var addBtn = e.target.closest('[data-action="role-add"]');
        if (addBtn) {
          var list = document.querySelector('[data-role-questions]');
          if (!list) return;
          var row = document.createElement('article');
          row.className = 'role-question-row role-question-row--intern';
          row.innerHTML =
            '<span class="role-question-row__idx"></span>' +
            '<div class="field">' +
              '<label>Question</label>' +
              '<input class="input" type="text" value="" placeholder="New role-specific question…" />' +
            '</div>' +
            '<button type="button" class="phase-remove" aria-label="Remove question" data-action="role-remove">&times;</button>';
          list.appendChild(row);
          renumberRoleQuestions();
          return;
        }
        var removeBtn = e.target.closest('[data-action="role-remove"]');
        if (removeBtn) {
          var rowToRemove = removeBtn.closest('.role-question-row');
          if (rowToRemove) rowToRemove.remove();
          renumberRoleQuestions();
        }
      });

      function renumberRoleQuestions() {
        var rows = document.querySelectorAll('[data-role-questions] .role-question-row');
        rows.forEach(function (row, i) {
          var idx = row.querySelector('.role-question-row__idx');
          if (idx) idx.textContent = String(i + 1).padStart(2, '0');
        });
      }

      // Save flow
      var saveBtn = document.querySelector('[data-action="save"]');
      if (saveBtn) {
        saveBtn.addEventListener('click', function () {
          var isEditMode = !!IMPACT.qs('id');
          if (!isEditMode) {
            var idValid = IMPACT.validate([
              { selector: '#first',  required: true },
              { selector: '#last',   required: true },
              { selector: '#dob',    required: true },
              { selector: '#zip',    required: true, pattern: /^\d{5}$/, message: '5 digits' },
              { selector: '#cohort', required: true }
            ]);
            if (!idValid) {
              IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please fix the highlighted fields before saving.' });
              return;
            }
          }
          document.getElementById('updateModal').hidden = false;
        });
      }

      var confirmSaveBtn = document.querySelector('[data-action="confirm-save"]');
      if (confirmSaveBtn) {
        confirmSaveBtn.addEventListener('click', function () {
          IMPACT.toast({ kind: 'success', label: 'SAVED', message: 'Intern record saved.' });
          setTimeout(function () { location.href = 'interns-dashboard.html'; }, 700);
        });
      }

      // Delete flow (edit mode only — Delete button is hidden in new mode)
      var confirmDeleteBtn = document.querySelector('[data-action="confirm-delete"]');
      if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function () {
          IMPACT.toast({ kind: 'danger', label: 'DELETED', message: 'Intern record removed.' });
          setTimeout(function () { location.href = 'interns-dashboard.html'; }, 700);
        });
      }
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Manual verification — code inspection**

Read the file back. Verify:
- Exactly 7 `<article class="rubric-panel">` elements with `data-section` values: `personal-info`, `internship-details`, `entry-assessment`, `role-specific`, `self-assessments`, `evaluations`, `employment-details`
- The meta-strip has 8 `meta-strip__item` entries (first/last/dob/zip/cohort/employer/start/end)
- 6 initial `role-question-row--intern` entries
- `<script src="app.js">` precedes the inline IIFE
- The IIFE calls `IMPACT.hydrateInternRecord()`

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/intern-record.html
git commit -m "Add intern-record.html — unified new + edit page with 7 rubric panels

Personal Information, Internship Details, Entry Assessment (12 barrier
checkboxes + notes), Role-Specific Competency Questions (with add/remove),
Intern Self-Assessments (placeholder cards), Evaluations (Competency
sub-cards filtered by intern + Exit Survey placeholder), Employment Details
(90/180-day outcomes). New mode shows editable Personal/Internship inputs;
edit mode replaces them with a read-only meta-strip and shows the Delete
button. Cohort change in new mode auto-fills employer + start/end dates."
```

---

## Task 4: Update `interns-dashboard.html` to point at the new page

**Files:**
- Modify: `Prototypes/PROTOTYPE/interns-dashboard.html`

- [ ] **Step 1: Re-point the "+ New Intern" button**

Find this line (around line 56):

```html
        <a href="intern-new.html" class="btn btn--primary">+ New Intern</a>
```

Replace with:

```html
        <a href="intern-record.html" class="btn btn--primary">+ New Intern</a>
```

- [ ] **Step 2: Re-point the row click handler**

Find this script block (around lines 237-244):

```html
  <script>
    // Rows clickable → intern edit (with ?id= from data-id)
    document.querySelectorAll('.assessments tbody tr[data-id]').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        window.location.href = 'intern-edit.html?id=' + row.dataset.id;
      });
    });
    // Rewrite Edit links to include the row's id
    document.querySelectorAll('a[data-edit-link]').forEach(function (a) {
      var row = a.closest('tr[data-id]');
      if (row) a.href = 'intern-edit.html?id=' + row.dataset.id;
    });
  </script>
```

Replace with:

```html
  <script>
    // Rows clickable → intern record (with ?id= from data-id)
    document.querySelectorAll('.assessments tbody tr[data-id]').forEach(function (row) {
      row.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        window.location.href = 'intern-record.html?id=' + row.dataset.id;
      });
    });
    // Rewrite Edit links to include the row's id
    document.querySelectorAll('a[data-edit-link]').forEach(function (a) {
      var row = a.closest('tr[data-id]');
      if (row) a.href = 'intern-record.html?id=' + row.dataset.id;
    });
  </script>
```

- [ ] **Step 3: Update the static `href="intern-edit.html"` placeholders in the table rows**

The five `<a href="intern-edit.html" class="action-link" data-edit-link>Edit</a>` Edit links (lines 135, 154, 173, 192, 211) — these are rewritten by the script above on page load, so the static href is just a fallback. Update them all to point at the new file too, so direct copy-paste of the URL works without JS:

For each occurrence, change `href="intern-edit.html"` to `href="intern-record.html"`.

You can do this in one Edit operation using the `replace_all` flag if your editor supports it, since the line is identical across all 5 occurrences.

- [ ] **Step 4: Manual verification**

```bash
grep -n "intern-new\|intern-edit" Prototypes/PROTOTYPE/interns-dashboard.html
```

Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/interns-dashboard.html
git commit -m "Point interns-dashboard at intern-record.html

+ New Intern button, row click handler, and per-row Edit link fallback hrefs
all now route to intern-record.html (new mode) or intern-record.html?id=<id>
(edit mode)."
```

---

## Task 5: Remove the Readiness link from admin top navs (and footers)

**Files (13 admin pages with the Readiness nav link, per `grep` results — `intern-new.html` and `intern-edit.html` excluded because they'll be deleted in Task 7):**
- Modify: `Prototypes/PROTOTYPE/admin.html`
- Modify: `Prototypes/PROTOTYPE/cohort-detail.html`
- Modify: `Prototypes/PROTOTYPE/cohort-edit.html`
- Modify: `Prototypes/PROTOTYPE/cohort-new.html`
- Modify: `Prototypes/PROTOTYPE/cohorts.html`
- Modify: `Prototypes/PROTOTYPE/competency-dashboard.html`
- Modify: `Prototypes/PROTOTYPE/competency-detail.html`
- Modify: `Prototypes/PROTOTYPE/competency-edit.html`
- Modify: `Prototypes/PROTOTYPE/competency-new.html`
- Modify: `Prototypes/PROTOTYPE/interns-dashboard.html`
- Modify: `Prototypes/PROTOTYPE/self-assessment-detail.html`
- Modify: `Prototypes/PROTOTYPE/self-assessment-results.html`
- Modify: `Prototypes/PROTOTYPE/reports.html`

The exact target line is identical across all 13 files:

```html
        <a href="dashboard.html" class="nav__link">Readiness</a>
```

- [ ] **Step 1: Confirm the exact text matches in every file**

```bash
grep -nF '<a href="dashboard.html" class="nav__link">Readiness</a>' Prototypes/PROTOTYPE/*.html
```

Expected: 13 matches, one per file in the list above.

- [ ] **Step 2: For each file, remove the line**

For each of the 13 files, perform this Edit operation:

- `old_string`: the exact line including its leading whitespace:
  ```
          <a href="dashboard.html" class="nav__link">Readiness</a>
  ```
- `new_string`: empty string (the empty line replacement removes the line and its trailing newline; an empty line in the result is acceptable since the file pattern usually has blank lines around nav blocks)

If your Edit tool needs surrounding context to ensure uniqueness, use 2 lines of context above and below — but the line is unique per file because it's the only `dashboard.html` link in the nav block.

- [ ] **Step 3: Sweep footers for stray `dashboard.html` references**

Run:

```bash
grep -nF 'dashboard.html' Prototypes/PROTOTYPE/*.html
```

For each remaining match (footer links), check whether it's a `<a href="dashboard.html">Readiness</a>` footer link, and remove it. Expected files with footer Readiness links (based on prior reads):
- `admin.html` line 153: `<a href="dashboard.html">Readiness</a>` (inside footer__links)
- `interns-dashboard.html` line 229: same pattern (inside footer__links)

For each such footer occurrence, remove the line.

After removal, re-run:

```bash
grep -nF 'dashboard.html' Prototypes/PROTOTYPE/*.html
```

Expected: zero matches across all files.

- [ ] **Step 4: Manual verification — readiness label**

```bash
grep -niF 'readiness' Prototypes/PROTOTYPE/*.html
```

Expected matches at this point: only the activity-feed entries in `admin.html` (which are removed in Task 6) and the cohort-detail / readiness-* HTML files (deleted in Task 7). No nav or footer occurrences.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/admin.html Prototypes/PROTOTYPE/cohort-detail.html Prototypes/PROTOTYPE/cohort-edit.html Prototypes/PROTOTYPE/cohort-new.html Prototypes/PROTOTYPE/cohorts.html Prototypes/PROTOTYPE/competency-dashboard.html Prototypes/PROTOTYPE/competency-detail.html Prototypes/PROTOTYPE/competency-edit.html Prototypes/PROTOTYPE/competency-new.html Prototypes/PROTOTYPE/interns-dashboard.html Prototypes/PROTOTYPE/self-assessment-detail.html Prototypes/PROTOTYPE/self-assessment-results.html Prototypes/PROTOTYPE/reports.html
git commit -m "Remove Readiness link from admin top nav and footers

Drops the 'Readiness' entry from the admin top nav across 13 admin pages
and from the footer__links blocks on admin.html and interns-dashboard.html.
Sets up Task 7's deletion of dashboard.html / readiness-*.html with no
remaining incoming links."
```

---

## Task 6: Clean up `admin.html` (KPI tile, quick-link, activity feed)

**Files:**
- Modify: `Prototypes/PROTOTYPE/admin.html`

- [ ] **Step 1: Remove the Readiness Pass Rate KPI tile**

Find this block (around lines 75-79):

```html
        <div class="kpi-card kpi-card--gold">
          <span class="kpi-card__label">Readiness Pass Rate</span>
          <div class="kpi-card__value">71%</div>
          <span class="kpi-card__delta">5 OF 7 PASSED</span>
        </div>

```

Replace with the empty string (delete the entire block including its trailing blank line).

- [ ] **Step 2: Remove the Readiness quick-link**

Find this line (around line 100):

```html
        <a href="dashboard.html" class="quick-link">Readiness <span class="quick-link__arrow">&rarr;</span></a>
```

Replace with the empty string.

(Note: this should already be gone from the prior task's footer/nav sweep if `dashboard.html` was caught — confirm it's the quick-link block's line specifically. If Step 5 of Task 5 already deleted this line, skip Step 2 here.)

- [ ] **Step 3: Remove the Readiness-related activity-feed rows**

Find this row (around lines 118-121):

```html
        <div class="activity-row">
          <span><strong>Bayer</strong> passed Readiness assessment &mdash; Eskenazi 2026</span>
          <span class="activity-row__time">04.14.2026 · 09:18</span>
        </div>
```

Replace with the empty string.

Find this row (around lines 130-133):

```html
        <div class="activity-row">
          <span><strong>Diaz</strong> failed Readiness assessment &mdash; Habitat 2026</span>
          <span class="activity-row__time">04.11.2026 · 11:22</span>
        </div>
```

Replace with the empty string.

Find this row (around lines 138-141):

```html
        <div class="activity-row">
          <span><strong>Holt</strong> passed Readiness assessment &mdash; Geminus 2026</span>
          <span class="activity-row__time">04.07.2026 · 10:12</span>
        </div>
```

Replace with the empty string.

- [ ] **Step 4: Manual verification**

```bash
grep -niF 'readiness' Prototypes/PROTOTYPE/admin.html
```

Expected: zero matches.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/admin.html
git commit -m "Drop Readiness from admin home dashboard

Removes the Readiness Pass Rate KPI tile (KPI grid drops to 3 tiles), the
'Readiness' quick-link card, and the three activity-feed rows mentioning
Readiness assessments. Empty grid cells remain — admin home polish is a
separate iteration."
```

---

## Task 7: Delete the 6 obsolete files

**Files:**
- Delete: `Prototypes/PROTOTYPE/intern-new.html`
- Delete: `Prototypes/PROTOTYPE/intern-edit.html`
- Delete: `Prototypes/PROTOTYPE/dashboard.html`
- Delete: `Prototypes/PROTOTYPE/readiness-new.html`
- Delete: `Prototypes/PROTOTYPE/readiness-edit.html`
- Delete: `Prototypes/PROTOTYPE/readiness-detail.html`

- [ ] **Step 1: Confirm zero incoming references to any of these files**

```bash
grep -nE 'intern-new\.html|intern-edit\.html|dashboard\.html|readiness-(new|edit|detail)\.html' Prototypes/PROTOTYPE/*.html
```

Expected: zero matches across all `.html` files in `Prototypes/PROTOTYPE/` (other than the files about to be deleted themselves — which is fine, they'll vanish in the next step).

If any incoming references are found in pages that survive (e.g., a stray reference in a quick-link or footer that earlier tasks missed), fix that before deleting.

- [ ] **Step 2: Delete the 6 files (and stage the deletions)**

```bash
git rm Prototypes/PROTOTYPE/intern-new.html Prototypes/PROTOTYPE/intern-edit.html Prototypes/PROTOTYPE/dashboard.html Prototypes/PROTOTYPE/readiness-new.html Prototypes/PROTOTYPE/readiness-edit.html Prototypes/PROTOTYPE/readiness-detail.html
```

- [ ] **Step 3: Manual verification**

```bash
ls Prototypes/PROTOTYPE/intern-new.html Prototypes/PROTOTYPE/intern-edit.html Prototypes/PROTOTYPE/dashboard.html Prototypes/PROTOTYPE/readiness-new.html Prototypes/PROTOTYPE/readiness-edit.html Prototypes/PROTOTYPE/readiness-detail.html 2>&1
```

Expected: all 6 paths report `cannot access ... No such file or directory`.

```bash
git status
```

Expected: 6 files listed under "Changes to be committed" as `deleted:`.

- [ ] **Step 4: Commit**

```bash
git commit -m "Delete obsolete intern + readiness pages

Deletes intern-new.html and intern-edit.html (both replaced by the unified
intern-record.html). Deletes the entire Readiness Assessment area
(dashboard.html, readiness-new.html, readiness-edit.html,
readiness-detail.html) — the program no longer runs a separate readiness
gateway; intake data is now captured on the intern record at creation."
```

---

## Task 8: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md` (at the repo root)

- [ ] **Step 1: Update the page count**

Find the line at the top:

```markdown
The **IMPACT Internship Assessment Portal** is a web app for an Indiana-based internship program. Currently in the **prototype stage** — a fully clickable 26-page static HTML/CSS/JS demo with a shared mock dataset. The next phase is converting this into a production application.
```

Replace `26-page` with `21-page`.

- [ ] **Step 2: Update the page-inventory section heading**

Find:

```markdown
### Page inventory (26 pages)
```

Replace with:

```markdown
### Page inventory (21 pages)
```

- [ ] **Step 3: Replace the Admin section of the page inventory**

Find the existing Admin block (starting with `**Admin:**` and including the lines for `dashboard.html`, `readiness-*.html`, `intern-new.html`, `intern-edit.html`, etc.). Replace the `dashboard.html`, `readiness-new.html`, `readiness-edit.html`, `readiness-detail.html`, `intern-new.html`, and `intern-edit.html` bullets with a single `intern-record.html` bullet. The full Admin block should read:

```markdown
**Admin:**
- `admin.html` — Home dashboard with KPIs, quick links, activity feed
- `competency-dashboard.html` — Competency Completed Assessments (list)
- `competency-new.html` / `competency-edit.html` / `competency-detail.html`
- `interns-dashboard.html` — Interns (list, with Interns/Cohorts sub-nav)
- `intern-record.html` — Unified intern record (`?id=<internId>` for edit; absent for new). Replaces the old `intern-new.html` and `intern-edit.html`. 7 numbered rubric panels: Personal Information, Internship Details, Entry Assessment, Role-Specific Competency Questions, Intern Self-Assessments, Evaluations, Employment Details.
- `cohorts.html` — Cohorts list
- `cohort-new.html` / `cohort-edit.html` / `cohort-detail.html`
- `self-assessment-results.html` / `self-assessment-detail.html`
- `reports.html` — Reports stub with CSS-only bar charts
- `404.html` — Branded not-found page
```

(Remove the lines for `dashboard.html — Readiness Completed Assessments (list)`, `readiness-new.html / readiness-edit.html / readiness-detail.html`, and the standalone `intern-new.html / intern-edit.html` line.)

- [ ] **Step 4: Update the `app.js` shared-module bullets**

Find this list under the "Shared module: `app.js`" section. Replace the existing bullets that mention `READINESS`, `hydrateReadinessDetail`, etc., and add the new helpers. The updated list should read:

```markdown
- **Mock dataset** — `IMPACT.COHORTS`, `IMPACT.INTERNS`, `IMPACT.COMPETENCY`, `IMPACT.SELF`, `IMPACT.INTERN_BARRIERS` arrays with lookup helpers (`cohortById`, `internById`, etc.)
- **`wireModals()`** — data-open/data-close/Escape modal toggling (also duplicated as inline IIFEs on each page for reliability)
- **`toast(opts)`** — bottom-right notification with kind (success/danger/gold), label, message, auto-dismiss
- **`validate(fieldSpecs)`** — inline form validation (required, SELECT detection, regex patterns)
- **`wireTableFilter(spec)`** — live search/filter on list tables with automatic empty-state row and count update
- **`hydrateInternEdit()`**, **`hydrateInternRecord()`**, **`hydrateCompetencyDetail()`**, etc. — `?id=` URL param lookup to populate detail/edit pages. `hydrateInternRecord` drives both new and edit modes on `intern-record.html`, including rendering the 12 barrier checkboxes from `IMPACT.INTERN_BARRIERS` and the Self-Assessments / Evaluations sub-cards.
- **`internsByCohort(cohortId)`** — filter interns by cohort for the enrolled-interns table on cohort-detail
- **`assessmentStatus(type)`**, **`markAssessmentComplete(type)`**, **`formatCompletionDate(date)`**, **`ASSESSMENT_TYPES`** — sessionStorage-backed tracking of public-side assessment completion (Personal Goals / Midpoint Reflection)
```

(`READINESS`, `readinessById`, `hydrateReadinessDetail` are not mentioned because they're gone.)

- [ ] **Step 5: Replace the "Promotion" product rule**

Find this bullet under "Product rules to know":

```markdown
- **Promotion**: a passing Readiness Assessment auto-creates the Intern record.
```

Replace with:

```markdown
- **Intake**: `intern-record.html` is the canonical creation path for an intern. The previous Readiness Assessment area (`dashboard.html`, `readiness-*.html`) has been removed; intake data is captured directly on the intern record's Entry Assessment panel at creation.
```

- [ ] **Step 6: Remove the "Readiness rubric" product rule**

Find this bullet:

```markdown
- **Readiness rubric**: 7 domains from the source docx table (Attendance & Punctuality through Quality & Attention to Detail), each with per-domain notes.
```

Delete the entire line.

- [ ] **Step 7: Update the Pass/Fail product rule**

Find this bullet:

```markdown
- **Pass/Fail** (placeholder rule): all domains rated "Ready" passes; any "Emerging" or "Developing" fails. Real rule pending.
```

Delete the entire line. (This rule was specific to Readiness, which no longer exists.)

- [ ] **Step 8: Update the assessment-tracking product rule**

The existing "Intern assessments (Personal Goals + Midpoint Reflection)" bullet (added in the prior chooser feature) stays as-is. Confirm it's still present and correct after the other edits — no changes needed.

- [ ] **Step 9: Manual verification**

```bash
grep -niE 'readiness|dashboard\.html|intern-new\.html|intern-edit\.html' CLAUDE.md
```

Expected: zero matches.

- [ ] **Step 10: Commit**

```bash
git add CLAUDE.md
git commit -m "Update CLAUDE.md for unified intern record + Readiness removal

Page count 26 → 21. Public/Admin page inventory updates: drop Readiness +
intern-new + intern-edit; add intern-record.html with the 7-panel summary.
app.js helpers list updates: drop readiness helpers; add INTERN_BARRIERS and
hydrateInternRecord. Product rules: replace Promotion rule with an Intake
rule pointing at intern-record.html; drop Readiness rubric and Pass/Fail
rules entirely."
```

---

## Task 9: Update `PRD.md` and `App Outline.md`

**Files:**
- Modify: `IMPACT Intretnship Assessment Portal/PRD.md` *(actual repo path is `PRD.md` from the working directory)*
- Modify: `IMPACT Intretnship Assessment Portal/IMPACT Internship Assessment Portal - App Outline.md`

- [ ] **Step 1: Read both files first**

Both files are at the repo root. Read them in full to understand their current structure:

```bash
# PRD.md is small, ~12k characters. App Outline ~5k.
ls -la PRD.md "IMPACT Internship Assessment Portal - App Outline.md"
```

Then use the Read tool to read both files end to end before editing.

- [ ] **Step 2: Update `PRD.md`**

PRD.md likely contains a section describing the Readiness Assessment as a flow. The exact wording will depend on the file content, but the goal is:
- Remove or strike through any section labeled "Readiness Assessment" (or similar)
- Update any reference to "passing readiness auto-creates intern" to reflect the new intake flow
- Add a one-paragraph summary of the unified intern record. Suggested text:

```markdown
### Intern Record (unified)

`intern-record.html` is the single page used to create, view, and update an intern. It is reached by the "+ New Intern" button (no `?id=`) or by clicking a row on Interns (`?id=<internId>`). The page is composed of seven numbered rubric panels: **Personal Information**, **Internship Details**, **Entry Assessment** (12 barriers + notes), **Role-Specific Competency Questions** (admin can add/remove), **Intern Self-Assessments** (links to the intern's submitted Personal Goals / Mid-Point Reflection / Participant Feedback), **Evaluations** (links to Competency assessments and Exit Employer Survey), and **Employment Details** (90-day and 180-day outcomes).

Identity is captured at intake on the Personal Information and Internship Details panels and locks once the record is saved (read-only meta strip in edit mode). The remaining panels remain editable as the intern progresses.

The previous Readiness Assessment area (a separate gateway flow with its own dashboard and detail pages) has been removed from the prototype.
```

Place this paragraph in a sensible location in `PRD.md` — typically alongside the existing intern-related sections.

- [ ] **Step 3: Update `App Outline.md`**

The App Outline likely contains separate outlines for `Add Intern`, `Edit Intern`, and `Readiness Assessment` views. Replace those with a single outline for the unified `intern-record.html`:

```markdown
### Intern Record (`intern-record.html`)

URL: `intern-record.html` (new) or `intern-record.html?id=<internId>` (edit)

**Page-head**: `ADMIN / INTERNS / NEW` or `... / EDIT` breadcrumb. Title `NEW INTERN.` or `EDIT INTERN.`. Edit-mode meta strip shows First Name, Last Name, Date of Birth, Zipcode, Cohort, Employer, Start, End (all read-only).

**Panels**:

01. Personal Information — First Name, Last Name, Date of Birth, Zipcode (new mode editable; edit mode hidden in favor of meta-strip)
02. Internship Details — Cohort select, Employer (auto from cohort), Start Date, End Date (new mode editable; edit mode hidden in favor of meta-strip)
03. Entry Assessment — 12 barrier checkboxes + Notes textarea (editable in both modes)
04. Role-Specific Competency Questions — 6 starter questions with per-row Remove and a "+ Add question" button (editable in both modes)
05. Intern Self-Assessments — sub-cards for Personal Goals, Mid-Point Goals, Participant Feedback Form (read-only; status text only — detail views deferred)
06. Evaluations — Competency sub-cards (clickable to `competency-detail.html?id=...`; one per record); Exit Employer Survey placeholder (read-only)
07. Employment Details — 90-day checkbox + notes; 180-day checkbox + notes. Disabled in new mode.

**Action bar**: Cancel · (Delete in edit mode) · Save Changes
```

Remove the previous separate outlines for Add Intern, Edit Intern, and Readiness Assessment.

- [ ] **Step 4: Manual verification**

```bash
grep -niE 'readiness|intern-new|intern-edit' PRD.md "IMPACT Internship Assessment Portal - App Outline.md"
```

Expected: zero or only historical/strikethrough references that explicitly note the area is removed.

- [ ] **Step 5: Commit**

```bash
git add PRD.md "IMPACT Internship Assessment Portal - App Outline.md"
git commit -m "Update PRD and App Outline for unified intern record + Readiness removal

Removes the Readiness Assessment section/outline; replaces the separate
Add Intern and Edit Intern outlines with a single unified Intern Record
outline reflecting the seven panels and edit-mode locking."
```

---

## Task 10: End-to-end manual sweep

**Files:** None modified — verification only.

- [ ] **Step 1: Static integrity checks**

Run from the repo root:

```bash
# All four expected new pieces exist
ls Prototypes/PROTOTYPE/intern-record.html

# All six deleted pages are gone
ls Prototypes/PROTOTYPE/intern-new.html Prototypes/PROTOTYPE/intern-edit.html Prototypes/PROTOTYPE/dashboard.html Prototypes/PROTOTYPE/readiness-new.html Prototypes/PROTOTYPE/readiness-edit.html Prototypes/PROTOTYPE/readiness-detail.html 2>&1
```

Expected: `intern-record.html` listed; the six deleted files all report "No such file or directory."

```bash
# No remaining references to any of the deleted files
grep -nE 'intern-new\.html|intern-edit\.html|dashboard\.html|readiness-(new|edit|detail)\.html' Prototypes/PROTOTYPE/*.html
```

Expected: zero matches.

```bash
# No remaining "Readiness" labels in admin pages (other than the deleted Readiness rubric description in PRD.md if it's referenced historically)
grep -niF 'readiness' Prototypes/PROTOTYPE/*.html
```

Expected: zero matches.

```bash
# No leftover IMPACT.READINESS or IMPACT.readinessById references
grep -nE 'IMPACT\.(READINESS|readinessById|hydrateReadinessDetail)' Prototypes/PROTOTYPE/*.html Prototypes/PROTOTYPE/*.js
```

Expected: zero matches.

- [ ] **Step 2: Browser walk-through**

Open `Prototypes/PROTOTYPE/intern-record.html` in a browser:

Expected:
- Page-head: `ADMIN / INTERNS / NEW` breadcrumb, "NEW INTERN." title
- Action bar shows Cancel + Save Changes (no Delete button)
- 7 numbered rubric panels visible: Personal Information, Internship Details, Entry Assessment (with 12 barrier checkboxes + Notes), Role-Specific Competency Questions (6 sample questions with per-row × buttons + "+ Add question" footer), Intern Self-Assessments (3 placeholder cards saying "Will appear after this intern record is saved"), Evaluations (Competency placeholder + Exit Survey placeholder), Employment Details (2 disabled checkboxes with "To be tracked once placed" hint)

Open `Prototypes/PROTOTYPE/intern-record.html?id=evans` in a browser:

Expected:
- Page-head: `... / EDIT` breadcrumb, "EDIT INTERN." title
- Meta strip displays Jasmine / Evans / 1999-01-23 / 46227 / Elevate 2026 / Elevate Ventures / 04.09.2026 / 08.31.2026
- Panel 01 and Panel 02 are HIDDEN
- Action bar shows Cancel + Delete + Save Changes
- Panel 06: Competency sub-card showing Evans's Midpoint record linking to `competency-detail.html?id=c-evans-mid`; Exit Employer Survey placeholder
- Panel 07: 90-day checkbox is CHECKED (Evans's outcome is `'90d'`); 180-day checkbox is unchecked

Open `Prototypes/PROTOTYPE/intern-record.html?id=garbage` in a browser:

Expected:
- Edit-mode chrome with empty meta-strip
- Danger toast: "NOT FOUND — No intern with that ID."

- [ ] **Step 3: Cohort cascading + add/remove**

In a fresh new-mode tab on `intern-record.html`:

- Pick "Eskenazi 2026" from the Cohort select. Employer should display "Eskenazi Health". Start Date should auto-fill to `2026-04-01`. End Date should auto-fill to `2026-09-30`. (Cohort dates in `IMPACT.COHORTS` are in `MM.DD.YYYY` format and are converted to `YYYY-MM-DD` for the date inputs.)
- Manually edit Start Date to `2026-04-15`. Then change Cohort to "TTT 2026". Employer should update to "Indy Tech Trades", but Start Date should NOT be overwritten (it's no longer empty); End Date should still auto-fill (still empty before the cohort change).

In Panel 04:
- Click "+ Add question" → a new empty row labeled `07` appears at the bottom.
- Click the × on row 03 → row removes and remaining rows re-number to 01, 02, 03, 04, 05, 06.
- Refresh the page → the panel resets to the original 6 sample questions.

- [ ] **Step 4: Save and Delete flows**

In new mode, click Save with empty fields → inline errors on First / Last / DOB / Zip / Cohort + danger toast "CHECK FIELDS". Modal does NOT open.

Fill all required fields (First, Last, DOB, Zip, Cohort) → click Save → modal opens. Click Save in modal → green toast "SAVED" → redirects to `interns-dashboard.html`.

In edit mode (`?id=evans`), click Delete → modal opens. Click Delete Permanently → red toast "DELETED" → redirects to `interns-dashboard.html`.

- [ ] **Step 5: Admin nav check**

Open `Prototypes/PROTOTYPE/admin.html`:

Expected:
- Top nav order: Home · Interns · Competency · Self-Assessment Results · Reports · admin chip (no Readiness)
- KPI grid has 3 tiles (Active Cohorts, Active Interns, 90-Day Outcomes — no Readiness Pass Rate)
- Quick Links has 4 cards (Competency, Interns, Cohorts, Self-Assessment Results — no Readiness)
- Activity feed has 3 rows (Clark / Evans / Bayer — Bayer's row is the Self-Assessment one, not the readiness-passed one)
- Footer has 2 link entries (Competency, Interns — no Readiness)

- [ ] **Step 6: Direct-link 404 check**

In a browser, visit `Prototypes/PROTOTYPE/dashboard.html`. The browser should report a file-not-found (or fall back to the OS file viewer). Same for `readiness-new.html`, `readiness-edit.html`, `readiness-detail.html`, `intern-new.html`, `intern-edit.html`.

- [ ] **Step 7: Print preview on the new page**

Open `intern-record.html?id=evans` and Ctrl+P (or Cmd+P).

Expected: nav, action bar, and modal markup are hidden by the existing `@media print` rules; meta-strip and panels render cleanly.

- [ ] **Step 8: No commit**

This task makes no code changes. If anything fails, file the issue and fix in a follow-up commit before considering the plan done.

---

## File Structure Summary

**Created (1):**
- `Prototypes/PROTOTYPE/intern-record.html`

**Modified:**
- `Prototypes/PROTOTYPE/app.js` (extends INTERNS, adds INTERN_BARRIERS + hydrateInternRecord, removes Readiness)
- `Prototypes/PROTOTYPE/styles.css` (adds intern-record CSS)
- `Prototypes/PROTOTYPE/interns-dashboard.html` (re-points to intern-record.html)
- `Prototypes/PROTOTYPE/admin.html` (drops Readiness KPI/quick-link/activity)
- 12 other admin pages (drop Readiness from top nav): `cohort-detail.html`, `cohort-edit.html`, `cohort-new.html`, `cohorts.html`, `competency-dashboard.html`, `competency-detail.html`, `competency-edit.html`, `competency-new.html`, `self-assessment-detail.html`, `self-assessment-results.html`, `reports.html` (and `interns-dashboard.html` already counted above; `admin.html` also counted above)
- `CLAUDE.md`
- `PRD.md`
- `IMPACT Internship Assessment Portal - App Outline.md`

**Deleted (6):**
- `Prototypes/PROTOTYPE/intern-new.html`
- `Prototypes/PROTOTYPE/intern-edit.html`
- `Prototypes/PROTOTYPE/dashboard.html`
- `Prototypes/PROTOTYPE/readiness-new.html`
- `Prototypes/PROTOTYPE/readiness-edit.html`
- `Prototypes/PROTOTYPE/readiness-detail.html`

**Out of scope (deferred to iterations 2 and 3):**
- New forms: `participant-feedback.html`, `exit-employer-survey.html`
- Admin detail pages: `personal-goals-detail.html`, `midpoint-reflection-detail.html`, `participant-feedback-detail.html`, `exit-employer-survey-detail.html`
- Admin home polish (filling the freed KPI/quick-link space)
- Admin restructure for public-side Personal Goals / Midpoint Reflection submissions
