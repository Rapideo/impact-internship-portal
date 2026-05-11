# Competency Questions Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all 3 tiers of competency question authoring (Core, per-cohort, per-intern) out of the Cohort and Intern records into Settings → Questions, persisted in `IMPACT.QUESTION_SETS`, stitched at assessment time.

**Architecture:** Two-phase delivery. E1 builds the Settings-side authoring path (data + helpers + 3 new admin pages + scoped renderer CSS). At Gate E1 the assessment form still uses its hardcoded markup; Settings UX is invisible to assessors. E2 refactors `competency-new.html` / `competency-edit.html` / `competency-detail.html` to render from the stitched 3-tier data and removes the now-orphaned inline panels from cohort and intern pages.

**Tech Stack:** Static HTML + CSS + IIFE-style JavaScript on top of `Prototypes/PROTOTYPE/app.js`. Builds on the renderer / collectAnswers / validateAnswers / restoreAnswers helpers shipped in sub-project C. No build tooling, no test runner. Persistence: hardcoded mock arrays + sessionStorage overlay.

**Source spec:** `docs/superpowers/specs/2026-05-07-competency-consolidation-design.md` (committed at `d7adcc7`).

**Sub-project boundary:** This is sub-project E. A, B, C are shipped; D (responsive audit) is deferred. E is the last queued sub-project.

**Phase gates:** Implementation pauses at two explicit checkpoints:
- **Gate E1** — after Task 7 (Settings authoring works in isolation; assessment form unchanged).
- **Gate E2** — after Task 13 (assessment refactor + cleanups + docs done).

---

## Phase E1 — Settings authoring path

## Task 1: E1 — Add competency data + helpers + persistence patches to `app.js`

Add `competency-core` + `competency-cohort-eskenazi-2026` to `QUESTION_SETS_DEFAULTS`, add 4 new lookup/stitching helpers, and patch two existing functions so cohort/intern sets authored at runtime persist correctly across page reloads.

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`

- [ ] **Step 1: Append the 2 competency seeds to `QUESTION_SETS_DEFAULTS`**

Find `QUESTION_SETS_DEFAULTS` in `app.js`. The array currently ends after the `exit-employer-survey` entry. Append a comma after that entry's closing `}` and add:

```js
    {
      id: 'competency-core',
      name: 'Competency Rubric — Core',
      minRequired: 0,
      questions: [
        {
          id:         'comp-attendance',
          type:       'competency-rubric-row',
          label:      'Attendance & Punctuality',
          helperText: 'Arrives on time, communicates absences appropriately, meets hour expectations',
          required:   false,
          config:     {}
        },
        {
          id:         'comp-conduct',
          type:       'competency-rubric-row',
          label:      'Professional Conduct',
          helperText: 'Respectful, follows workplace norms, appropriate language and behavior',
          required:   false,
          config:     {}
        },
        {
          id:         'comp-communication',
          type:       'competency-rubric-row',
          label:      'Communication',
          helperText: 'Asks clarifying questions, provides updates, communicates professionally with supervisor and coworkers',
          required:   false,
          config:     {}
        },
        {
          id:         'comp-direction',
          type:       'competency-rubric-row',
          label:      'Following Direction',
          helperText: 'Understands instructions, completes tasks as assigned, confirms priorities',
          required:   false,
          config:     {}
        },
        {
          id:         'comp-problem-solving',
          type:       'competency-rubric-row',
          label:      'Problem-Solving',
          helperText: 'Identifies issues, proposes solutions, escalates appropriately',
          required:   false,
          config:     {}
        },
        {
          id:         'comp-teamwork',
          type:       'competency-rubric-row',
          label:      'Teamwork',
          helperText: 'Collaborates effectively, supports peers, contributes to shared work',
          required:   false,
          config:     {}
        },
        {
          id:         'comp-quality',
          type:       'competency-rubric-row',
          label:      'Quality & Attention to Detail',
          helperText: 'Produces accurate work, double-checks before submitting, takes pride in output',
          required:   false,
          config:     {}
        }
      ]
    },
    {
      id: 'competency-cohort-eskenazi-2026',
      name: 'Eskenazi 2026 — Role-Specific',
      cohortId: 'eskenazi-2026',
      minRequired: 0,
      questions: [
        {
          id:         'cc-eskenazi-intake',
          type:       'competency-rubric-row',
          label:      'Patient Intake & Vitals',
          helperText: 'Captures vitals accurately, follows intake protocol, documents in EHR',
          required:   false,
          config:     {}
        },
        {
          id:         'cc-eskenazi-ehr',
          type:       'competency-rubric-row',
          label:      'EHR Tooling',
          helperText: 'Navigates EHR, completes notes, uses templates appropriately',
          required:   false,
          config:     {}
        },
        {
          id:         'cc-eskenazi-pace',
          type:       'competency-rubric-row',
          label:      'Pace & Accuracy',
          helperText: 'Maintains throughput without sacrificing patient safety',
          required:   false,
          config:     {}
        },
        {
          id:         'cc-eskenazi-hipaa',
          type:       'competency-rubric-row',
          label:      'HIPAA & Compliance',
          helperText: 'Handles PHI appropriately, follows privacy protocols, escalates concerns',
          required:   false,
          config:     {}
        }
      ]
    }
```

- [ ] **Step 2: Patch the `QUESTION_SETS` IIFE to include sessionStorage-only sets**

Find the `var QUESTION_SETS = (function () { ... })();` IIFE (currently uses a per-set merge that only iterates `QUESTION_SETS_DEFAULTS`). Replace the success-path body with one that also surfaces sessionStorage-only entries (cohort/intern sets authored at runtime that aren't in defaults). Replace the entire IIFE with:

```js
  // QUESTION_SETS is the live record (defaults + sessionStorage overlay).
  // Reads sessionStorage at module init; writes happen via saveQuestionSet().
  // Includes sessionStorage-only entries (e.g. competency-cohort-* / competency-intern-*
  // authored at runtime) so they survive page reloads in the same tab.
  var QUESTION_SETS = (function () {
    try {
      var raw = window.sessionStorage.getItem('impact.settings.questionSets');
      if (!raw) {
        return QUESTION_SETS_DEFAULTS.map(function (s) {
          return JSON.parse(JSON.stringify(s));
        });
      }
      var parsed = JSON.parse(raw);
      // Per-set merge: fall back to defaults for any default missing from sessionStorage.
      var out = QUESTION_SETS_DEFAULTS.map(function (def) {
        return (parsed && parsed[def.id]) ? parsed[def.id] : JSON.parse(JSON.stringify(def));
      });
      // Append any sessionStorage-only sets (not in defaults — e.g. runtime-authored
      // cohort/intern competency sets).
      Object.keys(parsed || {}).forEach(function (id) {
        var inDefaults = QUESTION_SETS_DEFAULTS.some(function (d) { return d.id === id; });
        if (!inDefaults) out.push(parsed[id]);
      });
      return out;
    } catch (e) {
      return QUESTION_SETS_DEFAULTS.map(function (s) {
        return JSON.parse(JSON.stringify(s));
      });
    }
  })();
```

- [ ] **Step 3: Patch `saveQuestionSet` to push if the set is new**

Find `function saveQuestionSet(setId, payload)`. The current body has `if (idx !== -1) QUESTION_SETS[idx] = payload;` — only updates existing entries. New cohort/intern sets need to be APPENDED. Replace the function with:

```js
  function saveQuestionSet(setId, payload) {
    try {
      var raw = window.sessionStorage.getItem('impact.settings.questionSets');
      var existing = raw ? JSON.parse(raw) : {};
      // Stamp the lastEdited timestamp so the Settings list page can show it.
      payload.lastEdited = new Date().toISOString();
      existing[setId] = payload;
      window.sessionStorage.setItem('impact.settings.questionSets', JSON.stringify(existing));
      // Update the live reference (replace if exists, push if new).
      var idx = QUESTION_SETS.findIndex(function (s) { return s.id === setId; });
      if (idx !== -1) QUESTION_SETS[idx] = payload;
      else QUESTION_SETS.push(payload);
    } catch (e) { /* sessionStorage unavailable; silently no-op */ }
  }
```

(Two changes: removed the unreachable `if (!existing) existing = {};` dead branch flagged in earlier review; added the `else QUESTION_SETS.push(payload)` branch.)

- [ ] **Step 4: Add a `deleteQuestionSet(setId)` helper**

Used by the cohort/intern editor when admin deletes a set. Add immediately after `saveQuestionSet`:

```js
  function deleteQuestionSet(setId) {
    try {
      var raw = window.sessionStorage.getItem('impact.settings.questionSets');
      var existing = raw ? JSON.parse(raw) : {};
      delete existing[setId];
      window.sessionStorage.setItem('impact.settings.questionSets', JSON.stringify(existing));
      var idx = QUESTION_SETS.findIndex(function (s) { return s.id === setId; });
      if (idx !== -1) QUESTION_SETS.splice(idx, 1);
    } catch (e) { /* sessionStorage unavailable; silently no-op */ }
  }
```

- [ ] **Step 5: Add the 4 competency lookup helpers + stitching helper**

Immediately after `deleteQuestionSet`, add:

```js
  function competencyCoreSet() {
    return questionSetById('competency-core');
  }

  function competencyCohortSet(cohortId) {
    if (!cohortId) return null;
    return questionSetById('competency-cohort-' + cohortId);
  }

  function competencyInternSet(internId) {
    if (!internId) return null;
    return questionSetById('competency-intern-' + internId);
  }

  function stitchedCompetencyQuestions(internId) {
    var intern = internById(internId);
    var core = competencyCoreSet();
    var cohort = intern ? competencyCohortSet(intern.cohortId) : null;
    var perIntern = competencyInternSet(internId);
    var out = [];
    if (core) {
      core.questions.forEach(function (q) { out.push(q); });
    }
    if (cohort) {
      cohort.questions.forEach(function (q) { out.push(q); });
    }
    if (perIntern) {
      perIntern.questions.forEach(function (q) { out.push(q); });
    }
    return out;
  }
```

- [ ] **Step 6: Update the `window.IMPACT` export**

Find the export block. Add the 5 new helpers (`deleteQuestionSet`, `competencyCoreSet`, `competencyCohortSet`, `competencyInternSet`, `stitchedCompetencyQuestions`) to the existing exports row that already includes `questionSetById, saveQuestionSet, renderQuestion, collectAnswers, validateAnswers, restoreAnswers`. Replace that line with:

```js
    questionSetById, saveQuestionSet, deleteQuestionSet, renderQuestion, collectAnswers, validateAnswers, restoreAnswers,
    competencyCoreSet, competencyCohortSet, competencyInternSet, stitchedCompetencyQuestions,
```

- [ ] **Step 7: Verify**

```bash
grep -nE "id: 'competency-core'|id: 'competency-cohort-eskenazi-2026'" Prototypes/PROTOTYPE/app.js
```
Expected: 2 lines.

```bash
grep -nE 'function (competencyCoreSet|competencyCohortSet|competencyInternSet|stitchedCompetencyQuestions|deleteQuestionSet)' Prototypes/PROTOTYPE/app.js
```
Expected: 5 lines.

```bash
grep -c 'else QUESTION_SETS.push' Prototypes/PROTOTYPE/app.js
```
Expected: 1.

```bash
grep -c 'comp-attendance\|comp-conduct\|comp-communication\|comp-direction\|comp-problem-solving\|comp-teamwork\|comp-quality' Prototypes/PROTOTYPE/app.js
```
Expected: 7 (one per Core question id).

```bash
grep -c 'cc-eskenazi-intake\|cc-eskenazi-ehr\|cc-eskenazi-pace\|cc-eskenazi-hipaa' Prototypes/PROTOTYPE/app.js
```
Expected: 4.

- [ ] **Step 8: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "E1: add competency data + helpers + persistence patches

Adds competency-core (7 Professional Competencies) and
competency-cohort-eskenazi-2026 (4 MA-specific) seeds to
QUESTION_SETS_DEFAULTS. Adds 4 lookup/stitching helpers
(competencyCoreSet, competencyCohortSet, competencyInternSet,
stitchedCompetencyQuestions) plus deleteQuestionSet for the
new editor's delete flow. Patches the QUESTION_SETS IIFE to
include sessionStorage-only sets (so runtime-authored cohort/
intern sets persist across reloads) and patches saveQuestionSet
to push new sets to the live array (was update-only)."
```

---

## Task 2: E1 — Helper API overload (set object | setId)

`collectAnswers`, `validateAnswers`, `restoreAnswers` currently take a setId string and call `questionSetById` internally. The competency assessment form needs to pass a synthesized stitched set object directly (the stitched questions aren't a stored set). Add a tiny overload to each.

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`

- [ ] **Step 1: Patch `collectAnswers`**

Find `function collectAnswers(setId, container)`. Change the parameter name and the lookup line:

Current first 2 lines:
```js
  function collectAnswers(setId, container) {
    var set = questionSetById(setId);
```

Replace with:
```js
  function collectAnswers(setOrId, container) {
    var set = (typeof setOrId === 'object' && setOrId !== null) ? setOrId : questionSetById(setOrId);
```

Leave the rest of the function unchanged.

- [ ] **Step 2: Patch `validateAnswers`**

Find `function validateAnswers(setId, answers)`. Replace the first 2 lines:

```js
  function validateAnswers(setOrId, answers) {
    var set = (typeof setOrId === 'object' && setOrId !== null) ? setOrId : questionSetById(setOrId);
```

Leave the rest unchanged.

- [ ] **Step 3: Patch `restoreAnswers`**

Find `function restoreAnswers(setId, container, payload)`. Replace the first 2 lines:

```js
  function restoreAnswers(setOrId, container, payload) {
    var set = (typeof setOrId === 'object' && setOrId !== null) ? setOrId : questionSetById(setOrId);
```

Leave the rest unchanged.

- [ ] **Step 4: Verify**

```bash
grep -nE 'function (collectAnswers|validateAnswers|restoreAnswers)' Prototypes/PROTOTYPE/app.js
```
Expected: 3 lines, each with `setOrId` as the first param.

```bash
grep -c "typeof setOrId === 'object'" Prototypes/PROTOTYPE/app.js
```
Expected: 3.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "E1: helper API overload — accept set object or setId

collectAnswers, validateAnswers, restoreAnswers now accept
either a setId string (existing 4 form callers unchanged) or
a set object directly (used by the competency assessment form
to pass a synthesized stitched set). Each function's first line
gains: var set = (typeof setOrId === 'object' && setOrId !== null)
? setOrId : questionSetById(setOrId);"
```

---

## Task 3: E1 — Rename competency-rubric-row renderer classes + add scoped CSS

The C2a Task 4 renderer for `competency-rubric-row` outputs class names (`.rubric-row`, `.rubric-pill`, etc.) that collide with `self-assessment-detail.html`'s bespoke markup. Rename the renderer's output to `.assessment-rubric-*` (matches the renderer's existing `.assessment-options` / `.assessment-likert*` naming convention) and add the matching CSS.

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`
- Modify: `Prototypes/PROTOTYPE/styles.css`

- [ ] **Step 1: Rewrite `_renderCompetencyRubricRow` in `app.js`**

Find `function _renderCompetencyRubricRow(question, idx)`. Replace the entire function with:

```js
  function _renderCompetencyRubricRow(question, idx) {
    // Compound: 3-segment radio (Emerging/Developing/Ready) + Notes textarea.
    // Output classes use the .assessment-rubric-* prefix (matching the renderer's
    // .assessment-options / .assessment-likert* convention) so they don't collide
    // with .rubric-row / .rubric-pill in self-assessment-detail.html.
    var qid = _escapeHtml(question.id);
    var segments = ['emerging', 'developing', 'ready'].map(function (val) {
      var inputId = 'q-' + qid + '-' + val;
      var label = val.charAt(0).toUpperCase() + val.slice(1);
      return (
        '<label class="assessment-rubric-pill">' +
          '<input type="radio" id="' + inputId + '" name="q-' + qid +
            '" value="' + val + '" data-qinput />' +
          '<span>' + label + '</span>' +
        '</label>'
      );
    }).join('');
    var input = (
      '<div class="assessment-rubric-row" data-qoptions>' +
        '<div class="assessment-rubric-pills">' + segments + '</div>' +
        '<textarea class="assessment-rubric-notes" placeholder="Notes…" rows="2" data-qnotes></textarea>' +
      '</div>'
    );
    return _renderQuestionWrapper(question, idx, input);
  }
```

- [ ] **Step 2: Append the 4 CSS rules to `styles.css`**

Find the end of the renderer CSS block in `styles.css` (the `.assessment-likert__seg:has(...)` rule from C2a, followed by the `.assessment-question.input--error` rule from the C2a polish). Append immediately after the `.assessment-question.input--error` rule:

```css

/* Competency rubric row (renderer-driven, namespaced to avoid collision with
   the .rubric-row / .rubric-pill rules used by self-assessment-detail.html) */

.assessment-rubric-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.assessment-rubric-pills {
  display: flex;
  gap: 8px;
}

.assessment-rubric-pill {
  flex: 1;
  text-align: center;
  padding: 10px 12px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink);
  background: #fff;
}

.assessment-rubric-pill input[type="radio"] { display: none; }

.assessment-rubric-pill:has(input[type="radio"]:checked) {
  background: var(--navy);
  color: #fff;
  border-color: var(--navy);
}

.assessment-rubric-notes {
  width: 100%;
  font-family: var(--font-body);
  font-size: 14px;
  padding: 8px 10px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
}
```

- [ ] **Step 3: Verify**

```bash
grep -nE 'assessment-rubric-(row|pill|pills|notes)' Prototypes/PROTOTYPE/app.js
```
Expected: 4 distinct class references in `_renderCompetencyRubricRow` (one per class).

```bash
grep -nE '^\.assessment-rubric-' Prototypes/PROTOTYPE/styles.css
```
Expected: 5 selectors (`.assessment-rubric-row`, `.assessment-rubric-pills`, `.assessment-rubric-pill`, `.assessment-rubric-pill input...`, `.assessment-rubric-pill:has(...)`, `.assessment-rubric-notes`).

```bash
grep -c '\.rubric-row\|\.rubric-pill' Prototypes/PROTOTYPE/app.js
```
Expected: 0 (the old class names are gone from the renderer; the legacy rules in styles.css remain for self-assessment-detail.html).

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js Prototypes/PROTOTYPE/styles.css
git commit -m "E1: namespace competency-rubric-row renderer classes + add CSS

Renderer's _renderCompetencyRubricRow now emits .assessment-rubric-row
/ .assessment-rubric-pills / .assessment-rubric-pill / .assessment-
rubric-notes (matching the .assessment-options / .assessment-likert*
naming convention). The C2a-deferred CSS lands here, scoped to the
namespaced classes so it doesn't collide with .rubric-row / .rubric-
pill still used by self-assessment-detail.html's bespoke markup."
```

---

## Task 4: E1 — `settings-questions.html` row click + dead-guard cleanup

Make the Competency Rubric row clickable, hydrate its display data from `IMPACT.QUESTION_SETS`, drop the READ-ONLY badge + readonly modifier. Also delete the dead `competency-rubric` redirect guard from `settings-question-set.html` (now stale).

**Files:**
- Modify: `Prototypes/PROTOTYPE/settings-questions.html`
- Modify: `Prototypes/PROTOTYPE/settings-question-set.html`

- [ ] **Step 1: Filter the main `.map()` to exclude competency-* sets**

After Task 1's persistence patches, `IMPACT.QUESTION_SETS` contains `competency-core` plus any cohort/intern sets persisted to sessionStorage. Without filtering, those would render as duplicate rows. Find the existing block:

```js
      // Render the 4 editable sets from IMPACT.QUESTION_SETS.
      var html = IMPACT.QUESTION_SETS.map(function (set) {
```

Replace that line with:

```js
      // Render the 4 standard editable sets. Competency tiers (competency-core,
      // competency-cohort-*, competency-intern-*) are aggregated into a single
      // 'Competency Rubric' row appended below.
      var html = IMPACT.QUESTION_SETS.filter(function (set) {
        return set.id.indexOf('competency-') !== 0;
      }).map(function (set) {
```

Leave the rest of the `.map(...)` body unchanged (still emits one `<tr data-id="...">` per standard set).

- [ ] **Step 2: Replace the hardcoded readonly Competency Rubric row**

Locate the block that builds `html += '<tr class="settings-list__row--readonly" data-readonly>...READ-ONLY badge...</tr>'`. Replace that entire block with one that hydrates from `IMPACT.QUESTION_SETS`:

```js
      // Append the Competency Rubric aggregate row (clickable, links to settings-competency.html).
      var coreSet = IMPACT.competencyCoreSet();
      var coreCount = coreSet ? coreSet.questions.length : 0;
      // Collect lastEdited from all 3 competency tiers and pick the most recent.
      var competencyEdits = [];
      if (coreSet && coreSet.lastEdited) competencyEdits.push(coreSet.lastEdited);
      IMPACT.QUESTION_SETS.forEach(function (s) {
        if (s.id.indexOf('competency-cohort-') === 0 && s.lastEdited) competencyEdits.push(s.lastEdited);
        if (s.id.indexOf('competency-intern-') === 0 && s.lastEdited) competencyEdits.push(s.lastEdited);
      });
      var compLastEdited = competencyEdits.length ? competencyEdits.sort().pop() : null;
      html += '<tr data-id="competency" style="cursor:pointer;">' +
        '<td><div class="col-name"><span class="name-initial">CR</span>Competency Rubric</div></td>' +
        '<td>' + coreCount + '</td>' +
        '<td>' + fmtDate(compLastEdited) + '</td>' +
        '<td></td>' +
        '</tr>';
```

- [ ] **Step 3: Update the row-click handler to special-case the competency row**

Find the existing `tbody.addEventListener('click', ...)` block. The current handler navigates to `settings-question-set.html?id=<setId>` for any clicked `tr[data-id]`. The competency row has `data-id="competency"` (not a real setId), so it needs to navigate to `settings-competency.html` instead. Replace the click handler with:

```js
      // Row click → editor (skip read-only row).
      tbody.addEventListener('click', function (ev) {
        var row = ev.target.closest('tr[data-id]');
        if (!row) return;
        var id = row.dataset.id;
        if (id === 'competency') {
          location.href = 'settings-competency.html';
          return;
        }
        location.href = 'settings-question-set.html?id=' + id;
      });
```

- [ ] **Step 4: Delete the dead `competency-rubric` guard from `settings-question-set.html`**

Find the inline IIFE in `settings-question-set.html`. Locate the guard block:

```js
      if (setId === 'competency-rubric') {
        IMPACT.toast({ kind: 'danger', label: 'RUBRIC NOT EDITABLE HERE', message: 'Edit role-specific competencies on the cohort form.' });
        setTimeout(function () { location.href = 'settings-questions.html'; }, 1500);
        return;
      }
```

DELETE this entire block. (The `competency-rubric` id is no longer used anywhere; the new `competency-core` id is just another normal set, editable through this same page.)

- [ ] **Step 5: Verify**

```bash
grep -c 'settings-list__row--readonly\|data-readonly\|READ-ONLY' Prototypes/PROTOTYPE/settings-questions.html
```
Expected: 0.

```bash
grep -c 'settings-competency.html' Prototypes/PROTOTYPE/settings-questions.html
```
Expected: 1.

```bash
grep -c 'competency-rubric' Prototypes/PROTOTYPE/settings-question-set.html
```
Expected: 0.

```bash
grep -c "data-id=\"competency\"" Prototypes/PROTOTYPE/settings-questions.html
```
Expected: 1.

```bash
grep -nE "competency-(core|cohort-|intern-)" Prototypes/PROTOTYPE/settings-questions.html
```
Expected: 1 line — the `s.id.indexOf('competency-cohort-')` / `competency-intern-` filter checks; NO lines rendering competency-* set rows from the main `.map()`.

- [ ] **Step 6: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-questions.html Prototypes/PROTOTYPE/settings-question-set.html
git commit -m "E1: settings-questions Competency Rubric row clickable + drop dead guard

Settings → Questions list page: the Competency Rubric row's
READ-ONLY badge and readonly modifier are removed; row hydrates
from IMPACT.QUESTION_SETS (Core question count + max lastEdited
across all 3 tiers); click navigates to settings-competency.html
(new in Task 5).

settings-question-set.html: drops the now-stale 'RUBRIC NOT
EDITABLE HERE' redirect for ?id=competency-rubric. The new id is
'competency-core' which is a normal editable set."
```

---

## Task 5: E1 — Build `settings-competency.html` (new detail page)

The 3-section detail page. Mirrors `settings-employer.html`'s shape (entity card + child tables). Core summary card + Cohort Questions table + Intern Questions table.

**Files:**
- Create: `Prototypes/PROTOTYPE/settings-competency.html`

- [ ] **Step 1: Create the page**

Create `Prototypes/PROTOTYPE/settings-competency.html` with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Competency Questions — Settings — IMPACT Admin</title>

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
        <span class="micro-label">
          <a href="settings-questions.html" style="color:inherit; text-decoration:none;">ADMIN / SETTINGS / QUESTIONS</a> / COMPETENCY
        </span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title">COMPETENCY QUESTIONS.</h1>
          <p class="page-head__sub">
            Authoring for the 3-tier Competency rubric: program-wide Core, optional per-cohort, and optional per-intern.
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
        <a class="settings-rail__item settings-rail__item--active" href="settings-questions.html">Questions</a>
        <a class="settings-rail__item" href="settings-phases.html">Phases</a>
        <a class="settings-rail__item" href="settings-barriers.html">Barriers</a>
        <a class="settings-rail__item" href="settings-roles.html">Roles</a>
        <a class="settings-rail__item" href="settings-program-info.html">Program Info</a>
      </aside>

      <main>

        <!-- Core summary card -->
        <article class="qs-editor-card">
          <div class="qs-editor-card__head">
            <h2 class="qs-editor-card__title">Core Competencies</h2>
            <span class="micro-label">PROGRAM-WIDE</span>
          </div>
          <p style="color: var(--muted); font-size: 14px; margin: 0 0 16px;">
            Applied to every Competency assessment. Edit to change the program-wide rubric.
          </p>
          <div class="id-grid id-grid--4">
            <div class="field" style="grid-column: span 1;">
              <label>Questions</label>
              <input class="input" type="text" id="coreCount" disabled value="—" />
            </div>
            <div class="field" style="grid-column: span 2;">
              <label>Last Edited</label>
              <input class="input" type="text" id="coreLastEdited" disabled value="—" />
            </div>
            <div class="field" style="grid-column: span 1; display: flex; align-items: end;">
              <a href="settings-question-set.html?id=competency-core" class="btn btn--primary" style="width: 100%; text-align: center;">Edit Core</a>
            </div>
          </div>
        </article>

        <!-- Cohort Questions table -->
        <article class="qs-editor-card">
          <div class="qs-editor-card__head">
            <h2 class="qs-editor-card__title">Cohort Questions</h2>
            <span class="micro-label">PER-COHORT (OPTIONAL)</span>
          </div>
          <p style="color: var(--muted); font-size: 14px; margin: 0 0 16px;">
            Add role-specific competencies that apply to one cohort's interns.
          </p>
          <table class="assessments" id="cohortQuestionsTable">
            <thead>
              <tr>
                <th style="width: 30%;">Cohort</th>
                <th style="width: 30%;">Employer</th>
                <th style="width: 15%;">Questions</th>
                <th style="width: 25%;">Last Edited</th>
              </tr>
            </thead>
            <tbody id="cohortQuestionsTbody"></tbody>
          </table>
          <button type="button" class="settings-list__add" id="addCohortBtn">+ New Cohort Questions</button>
        </article>

        <!-- Intern Questions table -->
        <article class="qs-editor-card">
          <div class="qs-editor-card__head">
            <h2 class="qs-editor-card__title">Intern Questions</h2>
            <span class="micro-label">PER-INTERN (OPTIONAL)</span>
          </div>
          <p style="color: var(--muted); font-size: 14px; margin: 0 0 16px;">
            Add competencies tailored to one intern's specific learning goals.
          </p>
          <table class="assessments" id="internQuestionsTable">
            <thead>
              <tr>
                <th style="width: 30%;">Intern</th>
                <th style="width: 30%;">Cohort</th>
                <th style="width: 15%;">Questions</th>
                <th style="width: 25%;">Last Edited</th>
              </tr>
            </thead>
            <tbody id="internQuestionsTbody"></tbody>
          </table>
          <button type="button" class="settings-list__add" id="addInternBtn">+ New Intern Questions</button>
        </article>

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
      function fmtDate(iso) {
        if (!iso) return '—';
        try {
          var d = new Date(iso);
          return d.toLocaleDateString();
        } catch (e) { return '—'; }
      }

      // --- Hydrate Core summary ---
      var coreSet = IMPACT.competencyCoreSet();
      document.getElementById('coreCount').value = coreSet ? String(coreSet.questions.length) : '—';
      document.getElementById('coreLastEdited').value = coreSet ? fmtDate(coreSet.lastEdited) : '—';

      // --- Hydrate Cohort Questions table ---
      var cohortTbody = document.getElementById('cohortQuestionsTbody');
      var cohortSets = IMPACT.QUESTION_SETS.filter(function (s) {
        return s.id.indexOf('competency-cohort-') === 0;
      });
      if (cohortSets.length === 0) {
        cohortTbody.innerHTML = '<tr><td colspan="4" style="color: var(--muted); font-style: italic; text-align: center; padding: 16px;">No cohort-specific competency sets yet. Click "+ New Cohort Questions" to add one.</td></tr>';
      } else {
        cohortTbody.innerHTML = cohortSets.map(function (set) {
          var cohort = IMPACT.cohortById(set.cohortId);
          var employerName = cohort ? IMPACT.employerNameFor(cohort) : '—';
          var cohortName = cohort ? cohort.name : set.cohortId;
          return '<tr data-cohort-id="' + set.cohortId + '" style="cursor:pointer;">' +
            '<td>' + cohortName + '</td>' +
            '<td>' + employerName + '</td>' +
            '<td>' + set.questions.length + '</td>' +
            '<td>' + fmtDate(set.lastEdited) + '</td>' +
            '</tr>';
        }).join('');
      }

      cohortTbody.addEventListener('click', function (ev) {
        var row = ev.target.closest('tr[data-cohort-id]');
        if (!row) return;
        location.href = 'competency-cohort-set.html?id=' + row.dataset.cohortId;
      });

      document.getElementById('addCohortBtn').addEventListener('click', function () {
        location.href = 'competency-cohort-set.html';
      });

      // --- Hydrate Intern Questions table ---
      var internTbody = document.getElementById('internQuestionsTbody');
      var internSets = IMPACT.QUESTION_SETS.filter(function (s) {
        return s.id.indexOf('competency-intern-') === 0;
      });
      if (internSets.length === 0) {
        internTbody.innerHTML = '<tr><td colspan="4" style="color: var(--muted); font-style: italic; text-align: center; padding: 16px;">No intern-specific competency sets yet. Click "+ New Intern Questions" to add one.</td></tr>';
      } else {
        internTbody.innerHTML = internSets.map(function (set) {
          var intern = IMPACT.internById(set.internId);
          var internName = intern ? (intern.first + ' ' + intern.last) : set.internId;
          var cohortName = intern ? IMPACT.cohortNameFor(intern) : '—';
          return '<tr data-intern-id="' + set.internId + '" style="cursor:pointer;">' +
            '<td>' + internName + '</td>' +
            '<td>' + cohortName + '</td>' +
            '<td>' + set.questions.length + '</td>' +
            '<td>' + fmtDate(set.lastEdited) + '</td>' +
            '</tr>';
        }).join('');
      }

      internTbody.addEventListener('click', function (ev) {
        var row = ev.target.closest('tr[data-intern-id]');
        if (!row) return;
        location.href = 'competency-intern-set.html?id=' + row.dataset.internId;
      });

      document.getElementById('addInternBtn').addEventListener('click', function () {
        location.href = 'competency-intern-set.html';
      });
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Verify**

```bash
grep -c 'settings-competency.html' Prototypes/PROTOTYPE/settings-competency.html
```
Expected: 0 (page doesn't link to itself).

```bash
grep -c 'competency-cohort-set.html\|competency-intern-set.html' Prototypes/PROTOTYPE/settings-competency.html
```
Expected: ≥4 (link from row click + button click for each table).

```bash
grep -c 'competencyCoreSet\|cohortById\|internById\|employerNameFor\|cohortNameFor' Prototypes/PROTOTYPE/settings-competency.html
```
Expected: ≥5.

```bash
grep -c 'nav__link--active' Prototypes/PROTOTYPE/settings-competency.html
grep -c 'settings-rail__item--active' Prototypes/PROTOTYPE/settings-competency.html
```
Expected: 1 each.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-competency.html
git commit -m "E1: build settings-competency.html (3-tier Competency detail page)

Three stacked cards: Core Competencies summary (count, last
edited, Edit Core button → existing settings-question-set.html
?id=competency-core); Cohort Questions table hydrated from
QUESTION_SETS where id starts with competency-cohort-; Intern
Questions table from competency-intern-. Each table has a row
click → competency-cohort/intern-set.html?id=<entityId> and a
+ New button → same page in new mode (no ?id=). Empty-state row
on each table when no sets exist."
```

---

## Task 6: E1 — Build `competency-cohort-set.html` (cohort competency editor)

New/edit page for a single cohort's competency set. Reuses the editor pattern from `settings-question-set.html`, swapping the disabled "Set Name" input for a Cohort dropdown filtered to cohorts WITHOUT existing sets.

**Files:**
- Create: `Prototypes/PROTOTYPE/competency-cohort-set.html`

- [ ] **Step 1: Create the page**

Create `Prototypes/PROTOTYPE/competency-cohort-set.html` with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cohort Competency Questions — Settings — IMPACT Admin</title>

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
        <span class="micro-label">
          <a href="settings-questions.html" style="color:inherit; text-decoration:none;">ADMIN / SETTINGS / QUESTIONS</a> /
          <a href="settings-competency.html" style="color:inherit; text-decoration:none;">COMPETENCY</a> / <span data-field="title-name">—</span>
        </span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title"><span data-field="name">COHORT QUESTIONS</span>.</h1>
          <p class="page-head__sub">
            Role-specific competency questions for one cohort. Stitched after Core questions when assessing this cohort's interns.
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
        <a class="settings-rail__item settings-rail__item--active" href="settings-questions.html">Questions</a>
        <a class="settings-rail__item" href="settings-phases.html">Phases</a>
        <a class="settings-rail__item" href="settings-barriers.html">Barriers</a>
        <a class="settings-rail__item" href="settings-roles.html">Roles</a>
        <a class="settings-rail__item" href="settings-program-info.html">Program Info</a>
      </aside>

      <main>

        <article class="qs-editor-card">
          <div class="qs-editor-card__head">
            <h2 class="qs-editor-card__title">Set Configuration</h2>
            <span class="micro-label">SET INFO</span>
          </div>
          <div class="id-grid id-grid--4">
            <div class="field" style="grid-column: span 4;">
              <label for="qs-cohort">Cohort</label>
              <select class="select" id="qs-cohort"></select>
            </div>
          </div>
        </article>

        <article class="qs-editor-card">
          <div class="qs-editor-card__head">
            <h2 class="qs-editor-card__title">Questions</h2>
            <span class="micro-label">EDITOR</span>
          </div>
          <div id="qsQuestions"></div>
          <div class="qs-type-picker" id="qsTypePicker" style="display:none;">
            <button type="button" class="qs-type-picker__btn" data-add-type="textarea">Textarea</button>
            <button type="button" class="qs-type-picker__btn" data-add-type="short-text">Short Text</button>
            <button type="button" class="qs-type-picker__btn" data-add-type="radio">Radio</button>
            <button type="button" class="qs-type-picker__btn" data-add-type="checkbox-group">Checkbox Group</button>
            <button type="button" class="qs-type-picker__btn" data-add-type="likert">Likert</button>
            <button type="button" class="qs-type-picker__btn" data-add-type="competency-rubric-row">Rubric Row</button>
          </div>
          <button type="button" class="settings-list__add" id="qsAddBtn">+ Add Question</button>
        </article>

      </main>

    </div>
  </section>

  <!-- ACTION BAR -->
  <div class="action-bar">
    <div class="action-bar__inner">
      <div class="action-bar__status">
        <span class="mono" style="color: var(--navy);">COHORT COMPETENCY SET · EDIT</span>
      </div>
      <div class="action-bar__buttons">
        <a href="settings-competency.html" class="btn btn--outline">Cancel</a>
        <button type="button" class="btn btn--danger" id="qsDeleteBtn" style="display:none;">Delete Set</button>
        <button type="button" class="btn btn--primary" id="qsSaveBtn">
          Save Changes
          <span class="btn__arrow">&rarr;</span>
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL: Delete Confirmation -->
  <div class="modal" id="deleteModal" role="dialog" aria-modal="true" hidden>
    <div class="modal__overlay" data-close></div>
    <div class="modal__card">
      <span class="modal__label">CONFIRM DELETE</span>
      <h3 class="modal__title">Delete this cohort's competency set?</h3>
      <p class="modal__body">
        Removes all <span id="deleteQCount">N</span> question(s) for this cohort. Core competencies and other cohort/intern sets are unaffected. You can re-create the set later.
      </p>
      <div class="modal__actions">
        <button type="button" class="btn btn--outline" data-close>Keep</button>
        <button type="button" class="btn btn--danger" id="confirmDeleteBtn">Delete</button>
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
      </div>
      <div class="footer__meta">&copy; 2026 IMPACT / Indiana</div>
    </div>
  </footer>

  <script src="app.js"></script>
  <script>
    (function () {
      var bindCohortId = IMPACT.qs('id');           // edit mode if present
      var isNew = !bindCohortId;
      var cohortSelect = document.getElementById('qs-cohort');

      // Populate cohort dropdown.
      // New mode: filter to cohorts WITHOUT existing competency-cohort-* sets.
      // Edit mode: dropdown contains only the bound cohort, disabled.
      var existingCohortIds = IMPACT.QUESTION_SETS
        .filter(function (s) { return s.id.indexOf('competency-cohort-') === 0; })
        .map(function (s) { return s.cohortId; });

      if (isNew) {
        var availableCohorts = IMPACT.COHORTS.filter(function (c) {
          return existingCohortIds.indexOf(c.id) === -1;
        });
        if (availableCohorts.length === 0) {
          IMPACT.toast({ kind: 'danger', label: 'NO COHORTS AVAILABLE', message: 'All cohorts already have competency sets. Edit an existing one instead.' });
          setTimeout(function () { location.href = 'settings-competency.html'; }, 1500);
          return;
        }
        cohortSelect.innerHTML = '<option value="">Select a cohort…</option>' +
          availableCohorts.map(function (c) {
            return '<option value="' + c.id + '">' + c.name + ' (' + IMPACT.employerNameFor(c) + ')</option>';
          }).join('');
      } else {
        var cohort = IMPACT.cohortById(bindCohortId);
        if (!cohort) {
          IMPACT.toast({ kind: 'danger', label: 'COHORT NOT FOUND', message: 'Cohort id required.' });
          setTimeout(function () { location.href = 'settings-competency.html'; }, 1500);
          return;
        }
        cohortSelect.innerHTML = '<option value="' + cohort.id + '" selected>' + cohort.name + ' (' + IMPACT.employerNameFor(cohort) + ')</option>';
        cohortSelect.disabled = true;
      }

      // Working copy of questions.
      var existingSet = bindCohortId ? IMPACT.competencyCohortSet(bindCohortId) : null;
      var working = existingSet
        ? existingSet.questions.map(function (q) { return JSON.parse(JSON.stringify(q)); })
        : [];

      // Hydrate page-head title with cohort name.
      function refreshTitle() {
        var selectedId = cohortSelect.value;
        var cohort = selectedId ? IMPACT.cohortById(selectedId) : null;
        var name = cohort ? cohort.name : 'Cohort Questions';
        IMPACT.fillText('[data-field="name"]', name);
        IMPACT.fillText('[data-field="title-name"]', name.toUpperCase());
      }
      refreshTitle();
      cohortSelect.addEventListener('change', refreshTitle);

      // Show delete button only in edit mode.
      var deleteBtn = document.getElementById('qsDeleteBtn');
      if (!isNew) deleteBtn.style.display = '';

      var qsContainer = document.getElementById('qsQuestions');
      var addBtn = document.getElementById('qsAddBtn');
      var typePicker = document.getElementById('qsTypePicker');
      var saveBtn = document.getElementById('qsSaveBtn');

      function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
          return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
        });
      }

      function renderTypeBody(q) {
        var common = (
          '<div class="field"><label>Prompt label</label>' +
            '<input class="input qs-field" type="text" data-field="label" value="' + escapeHtml(q.label) + '" /></div>' +
          '<div class="field"><label>Helper text</label>' +
            '<textarea class="textarea qs-field" rows="2" data-field="helperText">' + escapeHtml(q.helperText || '') + '</textarea></div>' +
          '<div class="field"><label><input type="checkbox" class="qs-field" data-field="required"' +
            (q.required ? ' checked' : '') + ' /> Required (must be answered)</label></div>'
        );
        var cfg = q.config || {};
        var typeBody = '';
        if (q.type === 'textarea') {
          typeBody = '<div class="id-grid id-grid--4">' +
            '<div class="field" style="grid-column: span 2;"><label>Rows</label>' +
              '<input class="input qs-field" type="number" min="1" data-field="config.rows" value="' + (cfg.rows == null ? 4 : cfg.rows) + '" /></div>' +
            '<div class="field" style="grid-column: span 2;"><label>Placeholder</label>' +
              '<input class="input qs-field" type="text" data-field="config.placeholder" value="' + escapeHtml(cfg.placeholder || '') + '" /></div>' +
            '</div>';
        } else if (q.type === 'short-text') {
          typeBody = '<div class="id-grid id-grid--4">' +
            '<div class="field" style="grid-column: span 2;"><label>Placeholder</label>' +
              '<input class="input qs-field" type="text" data-field="config.placeholder" value="' + escapeHtml(cfg.placeholder || '') + '" /></div>' +
            '<div class="field" style="grid-column: span 2;"><label>Max length</label>' +
              '<input class="input qs-field" type="number" min="1" data-field="config.maxLength" value="' + (cfg.maxLength == null ? 200 : cfg.maxLength) + '" /></div>' +
            '</div>';
        } else if (q.type === 'radio' || q.type === 'checkbox-group') {
          var optsHtml = (cfg.options || []).map(function (o, i) {
            return '<div class="qs-options-row" data-opt-idx="' + i + '">' +
              '<input class="input qs-field" type="text" data-field="config.options.' + i + '.value" value="' + escapeHtml(o.value) + '" placeholder="value" />' +
              '<input class="input qs-field" type="text" data-field="config.options.' + i + '.label" value="' + escapeHtml(o.label) + '" placeholder="label" />' +
              '<button type="button" class="settings-list__handle-btn" data-opt-action="up">&uarr;</button>' +
              '<button type="button" class="settings-list__handle-btn" data-opt-action="down">&darr;</button>' +
              '<button type="button" class="settings-list__remove-btn" data-opt-action="remove">&times;</button>' +
              '</div>';
          }).join('');
          typeBody = '<div class="qs-options-list" data-opts-container>' + optsHtml + '</div>' +
            '<button type="button" class="settings-list__add" data-add-option>+ Add Option</button>' +
            '<div class="field" style="margin-top:12px;"><label><input type="checkbox" class="qs-field" data-field="config.otherWithText"' +
              (cfg.otherWithText ? ' checked' : '') + ' /> Allow "Other" with text reveal</label></div>';
        } else if (q.type === 'likert') {
          typeBody = '<div class="id-grid id-grid--4">' +
            '<div class="field"><label>Min</label>' +
              '<input class="input qs-field" type="number" data-field="config.min" value="' + (cfg.min == null ? 1 : cfg.min) + '" /></div>' +
            '<div class="field"><label>Max</label>' +
              '<input class="input qs-field" type="number" data-field="config.max" value="' + (cfg.max == null ? 5 : cfg.max) + '" /></div>' +
            '<div class="field" style="grid-column: span 2;"><label>Left anchor label</label>' +
              '<input class="input qs-field" type="text" data-field="config.leftLabel" value="' + escapeHtml(cfg.leftLabel || '') + '" /></div>' +
            '<div class="field" style="grid-column: span 4;"><label>Right anchor label</label>' +
              '<input class="input qs-field" type="text" data-field="config.rightLabel" value="' + escapeHtml(cfg.rightLabel || '') + '" /></div>' +
            '</div>';
        } else if (q.type === 'competency-rubric-row') {
          typeBody = '<p style="color: var(--muted); font-size: 13px; margin: 8px 0;">No additional config — fixed Emerging/Developing/Ready + Notes layout.</p>';
        }
        return common + typeBody;
      }

      function render() {
        qsContainer.innerHTML = '';
        working.forEach(function (q, i) {
          var idx = String(i + 1).padStart(2, '0');
          var row = document.createElement('div');
          row.className = 'qs-question-row';
          row.dataset.index = String(i);
          row.innerHTML =
            '<div class="qs-question-row__head" data-toggle>' +
              '<span class="qs-question-row__num">' + idx + '</span>' +
              '<span class="qs-question-row__label">' + escapeHtml(q.label || '(untitled)') + '</span>' +
              '<span class="qs-question-row__type">' + escapeHtml(q.type) + '</span>' +
              '<span class="qs-question-row__controls">' +
                '<button type="button" class="settings-list__handle-btn" data-q-action="up"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move up">&uarr;</button>' +
                '<button type="button" class="settings-list__handle-btn" data-q-action="down"' + (i === working.length - 1 ? ' disabled' : '') + ' aria-label="Move down">&darr;</button>' +
                '<button type="button" class="settings-list__remove-btn" data-q-action="remove" aria-label="Remove">&times;</button>' +
              '</span>' +
            '</div>' +
            '<div class="qs-question-row__body" data-body>' +
              renderTypeBody(q) +
            '</div>';
          qsContainer.appendChild(row);
        });
      }

      function syncFromInputs() {
        var rows = qsContainer.querySelectorAll('.qs-question-row');
        rows.forEach(function (row, i) {
          var q = working[i];
          if (!q) return;
          row.querySelectorAll('.qs-field').forEach(function (inp) {
            var path = inp.dataset.field;
            if (!path) return;
            var val;
            if (inp.type === 'checkbox') val = !!inp.checked;
            else if (inp.type === 'number') {
              var n = parseInt(inp.value, 10);
              val = isNaN(n) ? null : n;
            }
            else val = inp.value;
            var parts = path.split('.');
            var target = q;
            for (var p = 0; p < parts.length - 1; p++) {
              if (!target[parts[p]]) target[parts[p]] = isNaN(parseInt(parts[p+1], 10)) ? {} : [];
              target = target[parts[p]];
            }
            target[parts[parts.length - 1]] = val;
          });
        });
      }

      qsContainer.addEventListener('click', function (e) {
        var actionBtn = e.target.closest('button[data-q-action], button[data-opt-action], button[data-add-option]');
        if (actionBtn) {
          syncFromInputs();
          var row = actionBtn.closest('.qs-question-row');
          var i = row ? parseInt(row.dataset.index, 10) : -1;
          if (i < 0) return;
          if (actionBtn.dataset.qAction === 'up' && i > 0) { var t=working[i]; working[i]=working[i-1]; working[i-1]=t; render(); return; }
          if (actionBtn.dataset.qAction === 'down' && i < working.length - 1) { var t2=working[i]; working[i]=working[i+1]; working[i+1]=t2; render(); return; }
          if (actionBtn.dataset.qAction === 'remove') { working.splice(i, 1); render(); return; }
          if (actionBtn.dataset.optAction || actionBtn.dataset.addOption) {
            var q = working[i];
            if (!q) return;
            if (!q.config) q.config = {};
            if (!q.config.options) q.config.options = [];
            if (actionBtn.dataset.addOption !== undefined) {
              q.config.options.push({ value: '', label: '' });
              render();
              return;
            }
            var optRow = actionBtn.closest('[data-opt-idx]');
            var oi = optRow ? parseInt(optRow.dataset.optIdx, 10) : -1;
            if (actionBtn.dataset.optAction === 'up' && oi > 0) { var ot=q.config.options[oi]; q.config.options[oi]=q.config.options[oi-1]; q.config.options[oi-1]=ot; render(); return; }
            if (actionBtn.dataset.optAction === 'down' && oi < q.config.options.length - 1) { var ot2=q.config.options[oi]; q.config.options[oi]=q.config.options[oi+1]; q.config.options[oi+1]=ot2; render(); return; }
            if (actionBtn.dataset.optAction === 'remove') { q.config.options.splice(oi, 1); render(); return; }
          }
          return;
        }
        var head = e.target.closest('[data-toggle]');
        if (head) {
          var row = head.closest('.qs-question-row');
          if (row) row.classList.toggle('qs-question-row--expanded');
        }
      });

      addBtn.setAttribute('aria-expanded', 'false');
      addBtn.addEventListener('click', function () {
        var willOpen = typePicker.style.display === 'none';
        typePicker.style.display = willOpen ? 'flex' : 'none';
        addBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        addBtn.textContent = willOpen ? '× Cancel adding' : '+ Add Question';
      });

      typePicker.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-add-type]');
        if (!btn) return;
        syncFromInputs();
        var newType = btn.dataset.addType;
        var newQ = {
          id:         'cc-new-' + Math.random().toString(36).slice(2, 8),
          type:       newType,
          label:      '',
          helperText: '',
          required:   false,
          config:     {}
        };
        if (newType === 'textarea')           newQ.config = { rows: 4, placeholder: '' };
        else if (newType === 'short-text')    newQ.config = { placeholder: '', maxLength: 200 };
        else if (newType === 'radio')         newQ.config = { options: [], otherWithText: false };
        else if (newType === 'checkbox-group') newQ.config = { options: [], otherWithText: false };
        else if (newType === 'likert')        newQ.config = { min: 1, max: 5, leftLabel: '', rightLabel: '' };
        working.push(newQ);
        typePicker.style.display = 'none';
        addBtn.setAttribute('aria-expanded', 'false');
        addBtn.textContent = '+ Add Question';
        render();
        var rows = qsContainer.querySelectorAll('.qs-question-row');
        if (rows.length) rows[rows.length - 1].classList.add('qs-question-row--expanded');
      });

      saveBtn.addEventListener('click', function () {
        syncFromInputs();
        var cohortId = cohortSelect.value;
        var errors = [];
        if (!cohortId) errors.push('Please select a cohort.');
        if (working.length === 0) errors.push('At least one question is required.');
        var seenIds = {};
        working.forEach(function (q, i) {
          if (!String(q.label || '').trim()) errors.push('Question ' + (i+1) + ' has an empty label.');
          if (!q.id) errors.push('Question ' + (i+1) + ' has no id.');
          if (seenIds[q.id]) errors.push('Duplicate question id: ' + q.id);
          else seenIds[q.id] = true;
          if (q.type === 'radio' || q.type === 'checkbox-group') {
            if (!q.config || !Array.isArray(q.config.options) || q.config.options.length === 0) {
              errors.push('Question ' + (i+1) + ' (' + q.type + ') has no options.');
            } else {
              q.config.options.forEach(function (o, oi) {
                if (!String(o.value || '').trim()) errors.push('Question ' + (i+1) + ', option ' + (oi+1) + ': missing value.');
                if (!String(o.label || '').trim()) errors.push('Question ' + (i+1) + ', option ' + (oi+1) + ': missing label.');
              });
            }
          }
        });
        if (errors.length) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: errors[0] });
          return;
        }
        var cohort = IMPACT.cohortById(cohortId);
        var payload = {
          id:          'competency-cohort-' + cohortId,
          name:        cohort.name + ' — Role-Specific',
          cohortId:    cohortId,
          minRequired: 0,
          questions:   working
        };
        IMPACT.saveQuestionSet(payload.id, payload);
        IMPACT.toast({ kind: 'success', label: 'SAVED', message: cohort.name + ' competency set updated.' });
        setTimeout(function () { location.href = 'settings-competency.html'; }, 1200);
      });

      // Delete flow.
      deleteBtn.addEventListener('click', function () {
        document.getElementById('deleteQCount').textContent = String(working.length);
        document.getElementById('deleteModal').hidden = false;
      });
      document.getElementById('confirmDeleteBtn').addEventListener('click', function () {
        IMPACT.deleteQuestionSet('competency-cohort-' + bindCohortId);
        IMPACT.toast({ kind: 'success', label: 'DELETED', message: 'Cohort competency set removed.' });
        setTimeout(function () { location.href = 'settings-competency.html'; }, 1200);
      });

      // Modal close (overlay + Escape).
      document.addEventListener('click', function (e) {
        var c = e.target.closest('[data-close]');
        if (c) { var m = c.closest('.modal'); if (m) m.hidden = true; }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal:not([hidden])').forEach(function (m) { m.hidden = true; });
        }
      });

      render();
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Verify**

```bash
grep -c 'qs-cohort\|cohortSelect' Prototypes/PROTOTYPE/competency-cohort-set.html
```
Expected: ≥4.

```bash
grep -c "competency-cohort-" Prototypes/PROTOTYPE/competency-cohort-set.html
```
Expected: ≥3 (filter, payload id, delete id).

```bash
grep -c "IMPACT.saveQuestionSet\|IMPACT.deleteQuestionSet\|IMPACT.competencyCohortSet" Prototypes/PROTOTYPE/competency-cohort-set.html
```
Expected: ≥3.

```bash
grep -c 'nav__link--active' Prototypes/PROTOTYPE/competency-cohort-set.html
grep -c 'settings-rail__item--active' Prototypes/PROTOTYPE/competency-cohort-set.html
```
Expected: 1 each.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/competency-cohort-set.html
git commit -m "E1: build competency-cohort-set.html (cohort competency editor)

Reuses the settings-question-set.html editor pattern (accordion +
6-type picker + validation) but swaps the disabled Set Name input
for a Cohort dropdown. New mode (no ?id=): dropdown filtered to
cohorts WITHOUT existing competency-cohort-* sets. Edit mode (?id=
<cohortId>): dropdown disabled, showing the bound cohort. Save
commits to competency-cohort-<cohortId> via IMPACT.saveQuestionSet.
Delete button (edit mode only) opens a modal confirm; on confirm
calls IMPACT.deleteQuestionSet."
```

---

## Task 7: E1 — Build `competency-intern-set.html` (intern competency editor)

Same shape as Task 6 but with an Intern dropdown instead of Cohort.

**Files:**
- Create: `Prototypes/PROTOTYPE/competency-intern-set.html`

- [ ] **Step 1: Create the page**

Create `Prototypes/PROTOTYPE/competency-intern-set.html` with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Intern Competency Questions — Settings — IMPACT Admin</title>

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
        <span class="micro-label">
          <a href="settings-questions.html" style="color:inherit; text-decoration:none;">ADMIN / SETTINGS / QUESTIONS</a> /
          <a href="settings-competency.html" style="color:inherit; text-decoration:none;">COMPETENCY</a> / <span data-field="title-name">—</span>
        </span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title"><span data-field="name">INTERN QUESTIONS</span>.</h1>
          <p class="page-head__sub">
            Custom competency questions for one intern. Stitched after Core and Cohort questions when assessing this intern.
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
        <a class="settings-rail__item settings-rail__item--active" href="settings-questions.html">Questions</a>
        <a class="settings-rail__item" href="settings-phases.html">Phases</a>
        <a class="settings-rail__item" href="settings-barriers.html">Barriers</a>
        <a class="settings-rail__item" href="settings-roles.html">Roles</a>
        <a class="settings-rail__item" href="settings-program-info.html">Program Info</a>
      </aside>

      <main>

        <article class="qs-editor-card">
          <div class="qs-editor-card__head">
            <h2 class="qs-editor-card__title">Set Configuration</h2>
            <span class="micro-label">SET INFO</span>
          </div>
          <div class="id-grid id-grid--4">
            <div class="field" style="grid-column: span 4;">
              <label for="qs-intern">Intern</label>
              <select class="select" id="qs-intern"></select>
            </div>
          </div>
        </article>

        <article class="qs-editor-card">
          <div class="qs-editor-card__head">
            <h2 class="qs-editor-card__title">Questions</h2>
            <span class="micro-label">EDITOR</span>
          </div>
          <div id="qsQuestions"></div>
          <div class="qs-type-picker" id="qsTypePicker" style="display:none;">
            <button type="button" class="qs-type-picker__btn" data-add-type="textarea">Textarea</button>
            <button type="button" class="qs-type-picker__btn" data-add-type="short-text">Short Text</button>
            <button type="button" class="qs-type-picker__btn" data-add-type="radio">Radio</button>
            <button type="button" class="qs-type-picker__btn" data-add-type="checkbox-group">Checkbox Group</button>
            <button type="button" class="qs-type-picker__btn" data-add-type="likert">Likert</button>
            <button type="button" class="qs-type-picker__btn" data-add-type="competency-rubric-row">Rubric Row</button>
          </div>
          <button type="button" class="settings-list__add" id="qsAddBtn">+ Add Question</button>
        </article>

      </main>

    </div>
  </section>

  <!-- ACTION BAR -->
  <div class="action-bar">
    <div class="action-bar__inner">
      <div class="action-bar__status">
        <span class="mono" style="color: var(--navy);">INTERN COMPETENCY SET · EDIT</span>
      </div>
      <div class="action-bar__buttons">
        <a href="settings-competency.html" class="btn btn--outline">Cancel</a>
        <button type="button" class="btn btn--danger" id="qsDeleteBtn" style="display:none;">Delete Set</button>
        <button type="button" class="btn btn--primary" id="qsSaveBtn">
          Save Changes
          <span class="btn__arrow">&rarr;</span>
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL: Delete Confirmation -->
  <div class="modal" id="deleteModal" role="dialog" aria-modal="true" hidden>
    <div class="modal__overlay" data-close></div>
    <div class="modal__card">
      <span class="modal__label">CONFIRM DELETE</span>
      <h3 class="modal__title">Delete this intern's competency set?</h3>
      <p class="modal__body">
        Removes all <span id="deleteQCount">N</span> question(s) for this intern. Core and cohort competencies are unaffected. You can re-create the set later.
      </p>
      <div class="modal__actions">
        <button type="button" class="btn btn--outline" data-close>Keep</button>
        <button type="button" class="btn btn--danger" id="confirmDeleteBtn">Delete</button>
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
      </div>
      <div class="footer__meta">&copy; 2026 IMPACT / Indiana</div>
    </div>
  </footer>

  <script src="app.js"></script>
  <script>
    (function () {
      var bindInternId = IMPACT.qs('id');
      var isNew = !bindInternId;
      var internSelect = document.getElementById('qs-intern');

      var existingInternIds = IMPACT.QUESTION_SETS
        .filter(function (s) { return s.id.indexOf('competency-intern-') === 0; })
        .map(function (s) { return s.internId; });

      if (isNew) {
        var availableInterns = IMPACT.INTERNS.filter(function (i) {
          return existingInternIds.indexOf(i.id) === -1;
        });
        if (availableInterns.length === 0) {
          IMPACT.toast({ kind: 'danger', label: 'NO INTERNS AVAILABLE', message: 'All interns already have competency sets. Edit an existing one instead.' });
          setTimeout(function () { location.href = 'settings-competency.html'; }, 1500);
          return;
        }
        internSelect.innerHTML = '<option value="">Select an intern…</option>' +
          availableInterns.map(function (i) {
            return '<option value="' + i.id + '">' + i.first + ' ' + i.last + ' (' + IMPACT.cohortNameFor(i) + ')</option>';
          }).join('');
      } else {
        var intern = IMPACT.internById(bindInternId);
        if (!intern) {
          IMPACT.toast({ kind: 'danger', label: 'INTERN NOT FOUND', message: 'Intern id required.' });
          setTimeout(function () { location.href = 'settings-competency.html'; }, 1500);
          return;
        }
        internSelect.innerHTML = '<option value="' + intern.id + '" selected>' + intern.first + ' ' + intern.last + ' (' + IMPACT.cohortNameFor(intern) + ')</option>';
        internSelect.disabled = true;
      }

      var existingSet = bindInternId ? IMPACT.competencyInternSet(bindInternId) : null;
      var working = existingSet
        ? existingSet.questions.map(function (q) { return JSON.parse(JSON.stringify(q)); })
        : [];

      function refreshTitle() {
        var selectedId = internSelect.value;
        var intern = selectedId ? IMPACT.internById(selectedId) : null;
        var name = intern ? (intern.first + ' ' + intern.last) : 'Intern Questions';
        IMPACT.fillText('[data-field="name"]', name);
        IMPACT.fillText('[data-field="title-name"]', name.toUpperCase());
      }
      refreshTitle();
      internSelect.addEventListener('change', refreshTitle);

      var deleteBtn = document.getElementById('qsDeleteBtn');
      if (!isNew) deleteBtn.style.display = '';

      var qsContainer = document.getElementById('qsQuestions');
      var addBtn = document.getElementById('qsAddBtn');
      var typePicker = document.getElementById('qsTypePicker');
      var saveBtn = document.getElementById('qsSaveBtn');

      function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
          return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
        });
      }

      function renderTypeBody(q) {
        var common = (
          '<div class="field"><label>Prompt label</label>' +
            '<input class="input qs-field" type="text" data-field="label" value="' + escapeHtml(q.label) + '" /></div>' +
          '<div class="field"><label>Helper text</label>' +
            '<textarea class="textarea qs-field" rows="2" data-field="helperText">' + escapeHtml(q.helperText || '') + '</textarea></div>' +
          '<div class="field"><label><input type="checkbox" class="qs-field" data-field="required"' +
            (q.required ? ' checked' : '') + ' /> Required (must be answered)</label></div>'
        );
        var cfg = q.config || {};
        var typeBody = '';
        if (q.type === 'textarea') {
          typeBody = '<div class="id-grid id-grid--4">' +
            '<div class="field" style="grid-column: span 2;"><label>Rows</label>' +
              '<input class="input qs-field" type="number" min="1" data-field="config.rows" value="' + (cfg.rows == null ? 4 : cfg.rows) + '" /></div>' +
            '<div class="field" style="grid-column: span 2;"><label>Placeholder</label>' +
              '<input class="input qs-field" type="text" data-field="config.placeholder" value="' + escapeHtml(cfg.placeholder || '') + '" /></div>' +
            '</div>';
        } else if (q.type === 'short-text') {
          typeBody = '<div class="id-grid id-grid--4">' +
            '<div class="field" style="grid-column: span 2;"><label>Placeholder</label>' +
              '<input class="input qs-field" type="text" data-field="config.placeholder" value="' + escapeHtml(cfg.placeholder || '') + '" /></div>' +
            '<div class="field" style="grid-column: span 2;"><label>Max length</label>' +
              '<input class="input qs-field" type="number" min="1" data-field="config.maxLength" value="' + (cfg.maxLength == null ? 200 : cfg.maxLength) + '" /></div>' +
            '</div>';
        } else if (q.type === 'radio' || q.type === 'checkbox-group') {
          var optsHtml = (cfg.options || []).map(function (o, i) {
            return '<div class="qs-options-row" data-opt-idx="' + i + '">' +
              '<input class="input qs-field" type="text" data-field="config.options.' + i + '.value" value="' + escapeHtml(o.value) + '" placeholder="value" />' +
              '<input class="input qs-field" type="text" data-field="config.options.' + i + '.label" value="' + escapeHtml(o.label) + '" placeholder="label" />' +
              '<button type="button" class="settings-list__handle-btn" data-opt-action="up">&uarr;</button>' +
              '<button type="button" class="settings-list__handle-btn" data-opt-action="down">&darr;</button>' +
              '<button type="button" class="settings-list__remove-btn" data-opt-action="remove">&times;</button>' +
              '</div>';
          }).join('');
          typeBody = '<div class="qs-options-list" data-opts-container>' + optsHtml + '</div>' +
            '<button type="button" class="settings-list__add" data-add-option>+ Add Option</button>' +
            '<div class="field" style="margin-top:12px;"><label><input type="checkbox" class="qs-field" data-field="config.otherWithText"' +
              (cfg.otherWithText ? ' checked' : '') + ' /> Allow "Other" with text reveal</label></div>';
        } else if (q.type === 'likert') {
          typeBody = '<div class="id-grid id-grid--4">' +
            '<div class="field"><label>Min</label>' +
              '<input class="input qs-field" type="number" data-field="config.min" value="' + (cfg.min == null ? 1 : cfg.min) + '" /></div>' +
            '<div class="field"><label>Max</label>' +
              '<input class="input qs-field" type="number" data-field="config.max" value="' + (cfg.max == null ? 5 : cfg.max) + '" /></div>' +
            '<div class="field" style="grid-column: span 2;"><label>Left anchor label</label>' +
              '<input class="input qs-field" type="text" data-field="config.leftLabel" value="' + escapeHtml(cfg.leftLabel || '') + '" /></div>' +
            '<div class="field" style="grid-column: span 4;"><label>Right anchor label</label>' +
              '<input class="input qs-field" type="text" data-field="config.rightLabel" value="' + escapeHtml(cfg.rightLabel || '') + '" /></div>' +
            '</div>';
        } else if (q.type === 'competency-rubric-row') {
          typeBody = '<p style="color: var(--muted); font-size: 13px; margin: 8px 0;">No additional config — fixed Emerging/Developing/Ready + Notes layout.</p>';
        }
        return common + typeBody;
      }

      function render() {
        qsContainer.innerHTML = '';
        working.forEach(function (q, i) {
          var idx = String(i + 1).padStart(2, '0');
          var row = document.createElement('div');
          row.className = 'qs-question-row';
          row.dataset.index = String(i);
          row.innerHTML =
            '<div class="qs-question-row__head" data-toggle>' +
              '<span class="qs-question-row__num">' + idx + '</span>' +
              '<span class="qs-question-row__label">' + escapeHtml(q.label || '(untitled)') + '</span>' +
              '<span class="qs-question-row__type">' + escapeHtml(q.type) + '</span>' +
              '<span class="qs-question-row__controls">' +
                '<button type="button" class="settings-list__handle-btn" data-q-action="up"' + (i === 0 ? ' disabled' : '') + ' aria-label="Move up">&uarr;</button>' +
                '<button type="button" class="settings-list__handle-btn" data-q-action="down"' + (i === working.length - 1 ? ' disabled' : '') + ' aria-label="Move down">&darr;</button>' +
                '<button type="button" class="settings-list__remove-btn" data-q-action="remove" aria-label="Remove">&times;</button>' +
              '</span>' +
            '</div>' +
            '<div class="qs-question-row__body" data-body>' +
              renderTypeBody(q) +
            '</div>';
          qsContainer.appendChild(row);
        });
      }

      function syncFromInputs() {
        var rows = qsContainer.querySelectorAll('.qs-question-row');
        rows.forEach(function (row, i) {
          var q = working[i];
          if (!q) return;
          row.querySelectorAll('.qs-field').forEach(function (inp) {
            var path = inp.dataset.field;
            if (!path) return;
            var val;
            if (inp.type === 'checkbox') val = !!inp.checked;
            else if (inp.type === 'number') {
              var n = parseInt(inp.value, 10);
              val = isNaN(n) ? null : n;
            }
            else val = inp.value;
            var parts = path.split('.');
            var target = q;
            for (var p = 0; p < parts.length - 1; p++) {
              if (!target[parts[p]]) target[parts[p]] = isNaN(parseInt(parts[p+1], 10)) ? {} : [];
              target = target[parts[p]];
            }
            target[parts[parts.length - 1]] = val;
          });
        });
      }

      qsContainer.addEventListener('click', function (e) {
        var actionBtn = e.target.closest('button[data-q-action], button[data-opt-action], button[data-add-option]');
        if (actionBtn) {
          syncFromInputs();
          var row = actionBtn.closest('.qs-question-row');
          var i = row ? parseInt(row.dataset.index, 10) : -1;
          if (i < 0) return;
          if (actionBtn.dataset.qAction === 'up' && i > 0) { var t=working[i]; working[i]=working[i-1]; working[i-1]=t; render(); return; }
          if (actionBtn.dataset.qAction === 'down' && i < working.length - 1) { var t2=working[i]; working[i]=working[i+1]; working[i+1]=t2; render(); return; }
          if (actionBtn.dataset.qAction === 'remove') { working.splice(i, 1); render(); return; }
          if (actionBtn.dataset.optAction || actionBtn.dataset.addOption) {
            var q = working[i];
            if (!q) return;
            if (!q.config) q.config = {};
            if (!q.config.options) q.config.options = [];
            if (actionBtn.dataset.addOption !== undefined) {
              q.config.options.push({ value: '', label: '' });
              render();
              return;
            }
            var optRow = actionBtn.closest('[data-opt-idx]');
            var oi = optRow ? parseInt(optRow.dataset.optIdx, 10) : -1;
            if (actionBtn.dataset.optAction === 'up' && oi > 0) { var ot=q.config.options[oi]; q.config.options[oi]=q.config.options[oi-1]; q.config.options[oi-1]=ot; render(); return; }
            if (actionBtn.dataset.optAction === 'down' && oi < q.config.options.length - 1) { var ot2=q.config.options[oi]; q.config.options[oi]=q.config.options[oi+1]; q.config.options[oi+1]=ot2; render(); return; }
            if (actionBtn.dataset.optAction === 'remove') { q.config.options.splice(oi, 1); render(); return; }
          }
          return;
        }
        var head = e.target.closest('[data-toggle]');
        if (head) {
          var row = head.closest('.qs-question-row');
          if (row) row.classList.toggle('qs-question-row--expanded');
        }
      });

      addBtn.setAttribute('aria-expanded', 'false');
      addBtn.addEventListener('click', function () {
        var willOpen = typePicker.style.display === 'none';
        typePicker.style.display = willOpen ? 'flex' : 'none';
        addBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        addBtn.textContent = willOpen ? '× Cancel adding' : '+ Add Question';
      });

      typePicker.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-add-type]');
        if (!btn) return;
        syncFromInputs();
        var newType = btn.dataset.addType;
        var newQ = {
          id:         'ci-new-' + Math.random().toString(36).slice(2, 8),
          type:       newType,
          label:      '',
          helperText: '',
          required:   false,
          config:     {}
        };
        if (newType === 'textarea')           newQ.config = { rows: 4, placeholder: '' };
        else if (newType === 'short-text')    newQ.config = { placeholder: '', maxLength: 200 };
        else if (newType === 'radio')         newQ.config = { options: [], otherWithText: false };
        else if (newType === 'checkbox-group') newQ.config = { options: [], otherWithText: false };
        else if (newType === 'likert')        newQ.config = { min: 1, max: 5, leftLabel: '', rightLabel: '' };
        working.push(newQ);
        typePicker.style.display = 'none';
        addBtn.setAttribute('aria-expanded', 'false');
        addBtn.textContent = '+ Add Question';
        render();
        var rows = qsContainer.querySelectorAll('.qs-question-row');
        if (rows.length) rows[rows.length - 1].classList.add('qs-question-row--expanded');
      });

      saveBtn.addEventListener('click', function () {
        syncFromInputs();
        var internId = internSelect.value;
        var errors = [];
        if (!internId) errors.push('Please select an intern.');
        if (working.length === 0) errors.push('At least one question is required.');
        var seenIds = {};
        working.forEach(function (q, i) {
          if (!String(q.label || '').trim()) errors.push('Question ' + (i+1) + ' has an empty label.');
          if (!q.id) errors.push('Question ' + (i+1) + ' has no id.');
          if (seenIds[q.id]) errors.push('Duplicate question id: ' + q.id);
          else seenIds[q.id] = true;
          if (q.type === 'radio' || q.type === 'checkbox-group') {
            if (!q.config || !Array.isArray(q.config.options) || q.config.options.length === 0) {
              errors.push('Question ' + (i+1) + ' (' + q.type + ') has no options.');
            } else {
              q.config.options.forEach(function (o, oi) {
                if (!String(o.value || '').trim()) errors.push('Question ' + (i+1) + ', option ' + (oi+1) + ': missing value.');
                if (!String(o.label || '').trim()) errors.push('Question ' + (i+1) + ', option ' + (oi+1) + ': missing label.');
              });
            }
          }
        });
        if (errors.length) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: errors[0] });
          return;
        }
        var intern = IMPACT.internById(internId);
        var payload = {
          id:          'competency-intern-' + internId,
          name:        intern.last + ' — Custom',
          internId:    internId,
          minRequired: 0,
          questions:   working
        };
        IMPACT.saveQuestionSet(payload.id, payload);
        IMPACT.toast({ kind: 'success', label: 'SAVED', message: intern.first + ' ' + intern.last + ' competency set updated.' });
        setTimeout(function () { location.href = 'settings-competency.html'; }, 1200);
      });

      deleteBtn.addEventListener('click', function () {
        document.getElementById('deleteQCount').textContent = String(working.length);
        document.getElementById('deleteModal').hidden = false;
      });
      document.getElementById('confirmDeleteBtn').addEventListener('click', function () {
        IMPACT.deleteQuestionSet('competency-intern-' + bindInternId);
        IMPACT.toast({ kind: 'success', label: 'DELETED', message: 'Intern competency set removed.' });
        setTimeout(function () { location.href = 'settings-competency.html'; }, 1200);
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

      render();
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Verify**

```bash
grep -c 'qs-intern\|internSelect' Prototypes/PROTOTYPE/competency-intern-set.html
```
Expected: ≥4.

```bash
grep -c "competency-intern-" Prototypes/PROTOTYPE/competency-intern-set.html
```
Expected: ≥3.

```bash
grep -c "IMPACT.saveQuestionSet\|IMPACT.deleteQuestionSet\|IMPACT.competencyInternSet" Prototypes/PROTOTYPE/competency-intern-set.html
```
Expected: ≥3.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/competency-intern-set.html
git commit -m "E1: build competency-intern-set.html (intern competency editor)

Same shape as competency-cohort-set.html but with an Intern
dropdown filtered to interns WITHOUT existing competency-intern-*
sets (new mode) or showing the bound intern (edit mode). Save
commits to competency-intern-<internId>; delete via the same
modal + IMPACT.deleteQuestionSet flow."
```

---

## 🚦 Gate E1 — review Settings authoring path

C2c-style pause for browser review.

What works after E1:
- Settings → Questions → Competency Rubric row is now clickable, lands on `settings-competency.html`.
- Core Competencies summary card shows count + last-edited; Edit Core button opens the existing per-set editor.
- Cohort Questions table shows the Eskenazi seed + sample data; "+ New Cohort Questions" works (filters out already-customized cohorts); row click opens editor; save persists; delete removes.
- Intern Questions table is empty by default; same "+ New" / row click / save / delete flow.
- Competency assessment forms (`competency-new.html`, `competency-edit.html`, `competency-detail.html`) STILL use their hardcoded markup — no behavior change yet for assessors.

User decides: proceed to E2, or pause / redirect.

---

## Phase E2 — Assessment refactor + cleanups

## Task 8: E2 — Refactor `competency-new.html` to render via the renderer

Replace the hardcoded 7 Professional Competencies + 4 Eskenazi MA markup with a single render container; render the stitched 3-tier set via `IMPACT.renderQuestion`; rebuild the save handler around `IMPACT.collectAnswers` + `IMPACT.validateAnswers`.

**Files:**
- Modify: `Prototypes/PROTOTYPE/competency-new.html`

- [ ] **Step 1: Replace the rubric body markup AND delete the now-orphaned sync IIFE**

Find the section in `competency-new.html` that contains the `<header class="rubric-section-head">` (around line 107) followed by the `<div class="rubric">` containing 11 hardcoded `<article class="rubric-panel">` blocks (extending through ~line 405). Identify the outer `<div class="rubric">` opening tag and its closing `</div>` — DELETE everything inside that outer div (the section header, all 11 rubric-panel articles, all internal markup).

Also DELETE the section header `<header class="rubric-section-head">...</header>` immediately above the outer rubric div, and any Section B "Role-Specific Competencies" header. The renderer will produce section headers.

Replace BOTH the section header AND the rubric-div interior with this single container:

```html
      <!-- Question container — populated by renderer at page load -->
      <div class="rubric assessment-questions" id="competencyQuestionsContainer"></div>
```

DELETE the now-orphaned "progress sync" IIFE near line 462–478 (the one that begins by selecting `panels` / `.rubric-panel` and runs a `sync()` function on radio change). It depends on the deleted markup. Look for the `<script>` block whose IIFE references `panels.forEach(panel =>` / `input[type=radio]` / `progress.textContent = labelText`. DELETE the entire `<script>...</script>` block.

The Phase dropdown IIFE further down the file (lines ~542–571, the one populating `#ph` from `IMPACT.phasesForCohort`) STAYS — it's independent of the rubric markup.

- [ ] **Step 2: Replace the existing identity-prefill IIFE with the new renderer IIFE**

Find the inline `<script>` IIFE near line 497 that begins with the `data-open` modal handler. The existing IIFE has these responsibilities mixed together: modal open/close handlers, identity pre-fill from `?internId=`, and the confirm-submit click handler.

REPLACE the entire body of that IIFE (between `(function () {` and `})();`) with:

```js
      // --- Modal open/close ---
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

      // --- Resolve intern context ---
      var internId = IMPACT.qs('internId');
      if (!internId) {
        IMPACT.toast({ kind: 'danger', label: 'NO INTERN', message: 'Intern id required.' });
        setTimeout(function () { location.href = 'assessments.html'; }, 1500);
        return;
      }
      var intern = IMPACT.internById(internId);
      if (!intern) {
        IMPACT.toast({ kind: 'danger', label: 'INTERN NOT FOUND', message: 'Intern not found in roster.' });
        setTimeout(function () { location.href = 'assessments.html'; }, 1500);
        return;
      }

      // --- Identity pre-fill (kept from prior behavior) ---
      var cohortName = IMPACT.cohortNameFor(intern) || '';
      var ln = document.getElementById('ln');
      var co = document.getElementById('co');
      var zp = document.getElementById('zp');
      if (ln) ln.value = intern.last || '';
      if (co) co.value = cohortName;
      if (zp) zp.value = intern.zip || '';

      // --- Render stitched 3-tier competency questions ---
      var container = document.getElementById('competencyQuestionsContainer');
      var core = IMPACT.competencyCoreSet();
      var cohortSet = IMPACT.competencyCohortSet(intern.cohortId);
      var internSet = IMPACT.competencyInternSet(internId);

      function appendSectionHeader(text, sub) {
        var h = document.createElement('header');
        h.className = 'rubric-section-head';
        h.innerHTML = '<div><span class="rubric-section-head__label">Section</span>' +
          '<h2 class="rubric-section-head__title">' + text + '</h2></div>' +
          (sub ? '<span class="rubric-section-head__aside">' + sub + '</span>' : '');
        container.appendChild(h);
      }

      var qIdx = 0;
      if (core && core.questions.length) {
        appendSectionHeader('Professional Competencies', core.questions.length + ' Domains · Shared across all roles');
        core.questions.forEach(function (q) { IMPACT.renderQuestion(q, container, qIdx++); });
      }
      if (cohortSet && cohortSet.questions.length) {
        var cohort = IMPACT.cohortById(intern.cohortId);
        var cohortLabel = cohort ? cohort.name : intern.cohortId;
        appendSectionHeader('Role-Specific: ' + cohortLabel, cohortSet.questions.length + ' Domains · This cohort');
        cohortSet.questions.forEach(function (q) { IMPACT.renderQuestion(q, container, qIdx++); });
      }
      if (internSet && internSet.questions.length) {
        appendSectionHeader('Intern-Specific', internSet.questions.length + ' Domain' + (internSet.questions.length === 1 ? '' : 's') + ' · Custom for this intern');
        internSet.questions.forEach(function (q) { IMPACT.renderQuestion(q, container, qIdx++); });
      }

      // Synthesized stitched set object (pass directly to collect/validate; no setId lookup).
      var stitchedSet = {
        questions: IMPACT.stitchedCompetencyQuestions(internId),
        minRequired: 0
      };

      // --- Submit click → validate → open confirm modal ---
      document.querySelector('[data-action="submit-assessment"]').addEventListener('click', function () {
        var answers = IMPACT.collectAnswers(stitchedSet, container);
        var v = IMPACT.validateAnswers(stitchedSet, answers);
        if (!v.ok) {
          if (v.errors.__minRequired) {
            IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: v.errors.__minRequired });
          } else {
            IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please answer the required questions.' });
          }
          Object.keys(v.errors).forEach(function (qId) {
            if (qId === '__minRequired') return;
            var row = container.querySelector('[data-qid="' + qId + '"]');
            if (row) row.classList.add('input--error');
          });
          return;
        }
        document.getElementById('submitModal').hidden = false;
      });

      // --- Confirm-submit → persist → toast → redirect ---
      // The existing flow only toasts + redirects (no persistence). Add a real
      // markAssessmentComplete call here so competency-edit.html (Task 9) can
      // restore the answers via IMPACT.restoreAnswers on its next visit.
      var confirmBtn = document.querySelector('[data-action="confirm-submit"]');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', function () {
          var answers = IMPACT.collectAnswers(stitchedSet, container);
          var phaseEl = document.getElementById('ph');
          var phase = phaseEl ? phaseEl.value : '';
          IMPACT.markAssessmentComplete('competency', internId, { phase: phase, answers: answers });
          IMPACT.toast({ kind: 'success', label: 'SUBMITTED', message: 'Competency assessment saved.' });
          setTimeout(function () { location.href = 'intern-record.html?id=' + internId; }, 700);
        });
      }
```

**Now wire the markup to the JS:** the existing action-bar Submit button has a multi-line inline `onclick="..."` that runs `IMPACT.validate([...])` (for the header fields `#ln`, `#co`, `#zp`, `#ph`, `#dt`) and then opens `submitModal`. REPLACE that button. Find:

```html
        <button type="button" class="btn btn--primary" onclick="
          if (!IMPACT.validate([
            {selector: '#ln', required: true},
            ...
          ])) return;
          document.getElementById('submitModal').hidden = false;
        ">Submit Assessment <span class="btn__arrow">&rarr;</span></button>
```

Replace with:

```html
        <button type="button" class="btn btn--primary" data-action="submit-assessment">Submit Assessment <span class="btn__arrow">&rarr;</span></button>
```

Then update the IIFE's submit handler (the `[data-action="submit-assessment"]` click handler shown above) to ALSO run the header field validation BEFORE the answer validation. Insert this BEFORE the `IMPACT.collectAnswers` call inside that handler:

```js
        if (!IMPACT.validate([
          {selector: '#ln', required: true},
          {selector: '#co', required: true},
          {selector: '#zp', pattern: /^\d{5}$/, message: '5 digits'},
          {selector: '#ph', required: true},
          {selector: '#dt', required: true}
        ])) return;
```

Also DELETE the now-orphaned progress bar markup in the action bar status area: find `<span id="progressLabel">0 / 11 rated</span>` and `<div class="action-bar__progress"><span id="progressFill"></span></div>`. DELETE both lines. They depended on the old sync IIFE; without it, they show stale "0 / 11 rated" forever. The "PASS = ALL READY" mono span next to them stays.

- [ ] **Step 3: Verify**

```bash
grep -c '<article class="rubric-panel"' Prototypes/PROTOTYPE/competency-new.html
```
Expected: 0 (no more hardcoded rubric panels).

```bash
grep -c 'IMPACT.renderQuestion\|IMPACT.collectAnswers\|IMPACT.validateAnswers\|IMPACT.stitchedCompetencyQuestions' Prototypes/PROTOTYPE/competency-new.html
```
Expected: ≥4.

```bash
grep -c 'competencyQuestionsContainer' Prototypes/PROTOTYPE/competency-new.html
```
Expected: 2 (markup + IIFE).

```bash
grep -c 'IMPACT.markAssessmentComplete' Prototypes/PROTOTYPE/competency-new.html
```
Expected: 1 (new — the existing page didn't persist).

```bash
grep -c 'panels.forEach' Prototypes/PROTOTYPE/competency-new.html
```
Expected: 0 (the old progress-sync IIFE is gone).

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/competency-new.html
git commit -m "E2: refactor competency-new.html to render from stitched 3-tier set

Replaces 11 hardcoded .rubric-panel articles with a single render
container. Inline IIFE resolves intern from URL, fetches Core +
Cohort + Intern competency sets via IMPACT helpers, renders each
tier with a section header between them. Save uses IMPACT.collect
Answers + IMPACT.validateAnswers against a synthesized stitched
set object (passed directly via the helper API overload from Task
2). Per-question .input--error highlighting on validation failure.
Behavior matches the data: empty cohort/intern sets simply skip
their section header."
```

---

## Task 9: E2 — Refactor `competency-edit.html`

Same as Task 8 but with restore-on-load via `IMPACT.restoreAnswers`.

**Files:**
- Modify: `Prototypes/PROTOTYPE/competency-edit.html`

- [ ] **Step 1: Replace the rubric body markup AND delete the now-orphaned sync IIFE**

Apply the same shape as Task 8 Step 1: delete the section headers + all hardcoded `<article class="rubric-panel">` blocks inside the outer `<div class="rubric">`. Replace with:

```html
      <!-- Question container — populated by renderer at page load -->
      <div class="rubric assessment-questions" id="competencyQuestionsContainer"></div>
```

DELETE the now-orphaned "sync" IIFE near line 420 (the one beginning `const panels = document.querySelectorAll('.rubric-panel');`). It depends on the deleted markup. DELETE the entire `<script>...</script>` block.

Also DELETE the orphaned progress bar markup near line 408-409: `<span id="progressLabel">11 / 11 rated</span>` and `<div class="action-bar__progress"><span id="progressFill" style="width: 100%;"></span></div>`. Both lines go.

- [ ] **Step 2: Replace the existing IIFE with renderer + restore + save**

Find the existing inline `<script>` IIFE (the one that sets up modal handlers + calls `IMPACT.hydrateCompetencyDetail()` near line 507). REPLACE the entire body of that IIFE with:

```js
      // --- Modal open/close (kept; same pattern as competency-new) ---
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

      // --- Identity meta-strip hydrate (kept) ---
      if (window.IMPACT && IMPACT.hydrateCompetencyDetail) IMPACT.hydrateCompetencyDetail();

      // --- Resolve assessment record + intern ---
      var assessmentId = IMPACT.qs('id') || 'c-bayer-w2'; // mirrors hydrateCompetencyDetail's default
      var record = IMPACT.competencyById(assessmentId);
      if (!record) {
        IMPACT.toast({ kind: 'danger', label: 'NOT FOUND', message: 'Competency assessment not found.' });
        setTimeout(function () { location.href = 'interns-dashboard.html'; }, 1500);
        return;
      }
      var internId = record.internId;
      var intern = internId ? IMPACT.internById(internId) : null;
      if (!intern) {
        IMPACT.toast({ kind: 'danger', label: 'INTERN NOT FOUND', message: 'Intern not found for this record.' });
        setTimeout(function () { location.href = 'interns-dashboard.html'; }, 1500);
        return;
      }

      // --- Render stitched 3-tier set with section headers ---
      var container = document.getElementById('competencyQuestionsContainer');
      var core = IMPACT.competencyCoreSet();
      var cohortSet = IMPACT.competencyCohortSet(intern.cohortId);
      var internSet = IMPACT.competencyInternSet(internId);

      function appendSectionHeader(text, sub) {
        var h = document.createElement('header');
        h.className = 'rubric-section-head';
        h.innerHTML = '<div><span class="rubric-section-head__label">Section</span>' +
          '<h2 class="rubric-section-head__title">' + text + '</h2></div>' +
          (sub ? '<span class="rubric-section-head__aside">' + sub + '</span>' : '');
        container.appendChild(h);
      }

      var qIdx = 0;
      if (core && core.questions.length) {
        appendSectionHeader('Professional Competencies', core.questions.length + ' Domains · Shared across all roles');
        core.questions.forEach(function (q) { IMPACT.renderQuestion(q, container, qIdx++); });
      }
      if (cohortSet && cohortSet.questions.length) {
        var cohort = IMPACT.cohortById(intern.cohortId);
        var cohortLabel = cohort ? cohort.name : intern.cohortId;
        appendSectionHeader('Role-Specific: ' + cohortLabel, cohortSet.questions.length + ' Domains · This cohort');
        cohortSet.questions.forEach(function (q) { IMPACT.renderQuestion(q, container, qIdx++); });
      }
      if (internSet && internSet.questions.length) {
        appendSectionHeader('Intern-Specific', internSet.questions.length + ' Domain' + (internSet.questions.length === 1 ? '' : 's') + ' · Custom for this intern');
        internSet.questions.forEach(function (q) { IMPACT.renderQuestion(q, container, qIdx++); });
      }

      var stitchedSet = {
        questions: IMPACT.stitchedCompetencyQuestions(internId),
        minRequired: 0
      };

      // --- Restore previously-saved answers (if any) ---
      // Preferred source: the cross-tab persisted payload from competency-new's
      // markAssessmentComplete call. Fallback: an `answers` field on the COMPETENCY
      // mock record (won't exist for the seed records — acceptable per plan
      // limitations; users will see a blank form in that case).
      var status = IMPACT.assessmentStatus('competency', internId);
      if (status && status.completed && status.payload && status.payload.answers) {
        IMPACT.restoreAnswers(stitchedSet, container, status.payload.answers);
      } else if (record.answers) {
        IMPACT.restoreAnswers(stitchedSet, container, record.answers);
      }

      // --- Save Changes (replaces the inline onclick handler) ---
      // Find the Save button inside #updateModal and rewire it to validate +
      // persist via markAssessmentComplete (preserving any phase from the
      // existing record so re-edits don't lose it).
      var saveBtn = document.querySelector('#updateModal .btn--primary');
      if (saveBtn) {
        // Drop the legacy inline onclick handler.
        saveBtn.removeAttribute('onclick');
        saveBtn.addEventListener('click', function () {
          var answers = IMPACT.collectAnswers(stitchedSet, container);
          var v = IMPACT.validateAnswers(stitchedSet, answers);
          if (!v.ok) {
            if (v.errors.__minRequired) {
              IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: v.errors.__minRequired });
            } else {
              IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please answer the required questions.' });
            }
            Object.keys(v.errors).forEach(function (qId) {
              if (qId === '__minRequired') return;
              var row = container.querySelector('[data-qid="' + qId + '"]');
              if (row) row.classList.add('input--error');
            });
            return;
          }
          IMPACT.markAssessmentComplete('competency', internId, { phase: record.phase, answers: answers });
          IMPACT.toast({ kind: 'success', label: 'SAVED', message: 'Competency ratings saved.' });
          setTimeout(function () { location.href = 'competency-detail.html?id=' + assessmentId; }, 700);
        });
      }
```

- [ ] **Step 3: Verify**

```bash
grep -c '<article class="rubric-panel"' Prototypes/PROTOTYPE/competency-edit.html
```
Expected: 0.

```bash
grep -c 'IMPACT.renderQuestion\|IMPACT.collectAnswers\|IMPACT.validateAnswers\|IMPACT.restoreAnswers' Prototypes/PROTOTYPE/competency-edit.html
```
Expected: ≥4.

```bash
grep -c 'panels.forEach\|onclick=' Prototypes/PROTOTYPE/competency-edit.html
```
Expected: 0 (the legacy sync IIFE + the inline onclick on the Save button are both gone).

```bash
grep -c 'IMPACT.markAssessmentComplete' Prototypes/PROTOTYPE/competency-edit.html
```
Expected: 1.

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/competency-edit.html
git commit -m "E2: refactor competency-edit.html (renderer + restore)

Same shape as competency-new.html but reads the existing
COMPETENCY record from URL ?id=, resolves intern from the
record's internId, and restores previously-saved answers
via IMPACT.restoreAnswers before the user starts editing."
```

---

## Task 10: E2 — Refactor `competency-detail.html` (read-only render)

Same render path as Task 9 but disable all inputs after render — the page is a read-only view of a completed competency assessment.

**Files:**
- Modify: `Prototypes/PROTOTYPE/competency-detail.html`

- [ ] **Step 1: Replace the rubric body markup**

Same as Tasks 8/9 Step 1: replace the hardcoded section headers + all `<article class="rubric-panel">` blocks with:

```html
      <!-- Question container — populated by renderer at page load -->
      <div class="rubric assessment-questions" id="competencyQuestionsContainer"></div>
```

`competency-detail.html` does NOT have a "panels.forEach + sync" IIFE (unlike new/edit), so there's nothing extra to delete from the markup-side.

- [ ] **Step 2: Replace the existing IIFE with renderer + restore + disable**

Find the existing inline `<script>` IIFE (it sets up modal handlers + calls `IMPACT.hydrateCompetencyDetail()` near line 422). REPLACE the entire body of that IIFE with the code below.

REPLACE the entire body of that IIFE with:

```js
      // --- Modal open/close (preserve any existing data-open / data-close behavior) ---
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

      // --- Identity meta-strip hydrate (kept) ---
      if (window.IMPACT && IMPACT.hydrateCompetencyDetail) IMPACT.hydrateCompetencyDetail();

      // --- Resolve assessment record + intern ---
      var assessmentId = IMPACT.qs('id') || 'c-bayer-w2';  // mirrors hydrate default
      var record = IMPACT.competencyById(assessmentId);
      if (!record) {
        IMPACT.toast({ kind: 'danger', label: 'NOT FOUND', message: 'Competency assessment not found.' });
        setTimeout(function () { location.href = 'interns-dashboard.html'; }, 1500);
        return;
      }
      var internId = record.internId;
      var intern = internId ? IMPACT.internById(internId) : null;

      // --- Render stitched 3-tier set with section headers ---
      var container = document.getElementById('competencyQuestionsContainer');
      var core = IMPACT.competencyCoreSet();
      var cohortSet = intern ? IMPACT.competencyCohortSet(intern.cohortId) : null;
      var internSet = IMPACT.competencyInternSet(internId);

      function appendSectionHeader(text, sub) {
        var h = document.createElement('header');
        h.className = 'rubric-section-head';
        h.innerHTML = '<div><span class="rubric-section-head__label">Section</span>' +
          '<h2 class="rubric-section-head__title">' + text + '</h2></div>' +
          (sub ? '<span class="rubric-section-head__aside">' + sub + '</span>' : '');
        container.appendChild(h);
      }

      var qIdx = 0;
      if (core && core.questions.length) {
        appendSectionHeader('Professional Competencies', core.questions.length + ' Domains · Shared across all roles');
        core.questions.forEach(function (q) { IMPACT.renderQuestion(q, container, qIdx++); });
      }
      if (cohortSet && cohortSet.questions.length && intern) {
        var cohort = IMPACT.cohortById(intern.cohortId);
        var cohortLabel = cohort ? cohort.name : intern.cohortId;
        appendSectionHeader('Role-Specific: ' + cohortLabel, cohortSet.questions.length + ' Domains · This cohort');
        cohortSet.questions.forEach(function (q) { IMPACT.renderQuestion(q, container, qIdx++); });
      }
      if (internSet && internSet.questions.length) {
        appendSectionHeader('Intern-Specific', internSet.questions.length + ' Domain' + (internSet.questions.length === 1 ? '' : 's') + ' · Custom for this intern');
        internSet.questions.forEach(function (q) { IMPACT.renderQuestion(q, container, qIdx++); });
      }

      var stitchedSet = {
        questions: internId ? IMPACT.stitchedCompetencyQuestions(internId) : [],
        minRequired: 0
      };

      // --- Restore previously-saved answers if any (preferred: cross-tab payload from
      //     markAssessmentComplete; fallback: an `answers` field on the COMPETENCY mock
      //     record). Seed records have neither; the form renders empty in that case. ---
      var status = internId ? IMPACT.assessmentStatus('competency', internId) : null;
      if (status && status.completed && status.payload && status.payload.answers) {
        IMPACT.restoreAnswers(stitchedSet, container, status.payload.answers);
      } else if (record.answers) {
        IMPACT.restoreAnswers(stitchedSet, container, record.answers);
      }

      // --- Read-only: disable every form control inside the container ---
      container.querySelectorAll('input, textarea, select').forEach(function (el) {
        el.disabled = true;
      });
```

- [ ] **Step 3: Verify**

```bash
grep -c '<article class="rubric-panel"' Prototypes/PROTOTYPE/competency-detail.html
```
Expected: 0.

```bash
grep -c 'el.disabled = true\|disabled = true' Prototypes/PROTOTYPE/competency-detail.html
```
Expected: ≥1.

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/competency-detail.html
git commit -m "E2: refactor competency-detail.html (read-only render)

Same render path as competency-edit.html, then disables every
input/textarea/select inside the container so the page is a
read-only view of a completed competency assessment."
```

---

## Task 11: E2 — Remove Role-Specific section from `cohort-new.html` + `cohort-edit.html`

Both files have an identical "Role-Specific Competency Questions" section (header + editor + Add button) that's now obsolete since cohort-level competency authoring lives in Settings → Questions → Competency.

**Files:**
- Modify: `Prototypes/PROTOTYPE/cohort-new.html`
- Modify: `Prototypes/PROTOTYPE/cohort-edit.html`

- [ ] **Step 1: Delete the section from `cohort-new.html`**

Find the block in `cohort-new.html` starting at:

```html
      <!-- SECTION: Role-Specific Competency Questions -->
      <section class="role-questions-editor">
```

DELETE the entire `<section class="role-questions-editor">...</section>` block, including its closing tag. The block runs ~50 lines (header + 3 starter rows + Add button).

- [ ] **Step 2: Delete the inline JS handler from `cohort-new.html`**

In the inline `<script>` IIFE at the bottom of the file, find the role-question Add/Remove delegation handler. Look for code referencing `addRoleQuestion`, `roleQuestionsList`, or `role-question-row`. DELETE that entire block (the click handler that adds new rows + the delete handler).

- [ ] **Step 3: Repeat for `cohort-edit.html`**

`cohort-edit.html` has the SAME structure (likely identical code). Apply the same two deletions: the `<section class="role-questions-editor">...</section>` block AND the inline JS handler.

- [ ] **Step 4: Verify**

```bash
grep -c 'role-questions-editor\|Role-Specific\|role-question-row' Prototypes/PROTOTYPE/cohort-new.html
```
Expected: 0.

```bash
grep -c 'role-questions-editor\|Role-Specific\|role-question-row' Prototypes/PROTOTYPE/cohort-edit.html
```
Expected: 0.

```bash
grep -c 'addRoleQuestion\|roleQuestionsList' Prototypes/PROTOTYPE/cohort-new.html Prototypes/PROTOTYPE/cohort-edit.html
```
Expected: 0 in each.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/cohort-new.html Prototypes/PROTOTYPE/cohort-edit.html
git commit -m "E2: remove Role-Specific Competency Questions section from cohort forms

Cohort-level competency authoring now lives in Settings → Questions
→ Competency → Cohort Questions. Removes the inline editor +
its Add/Remove JS handlers from both cohort-new.html and
cohort-edit.html."
```

---

## Task 12: E2 — Remove Panel 04 from `intern-record.html`

Delete the Panel 04 "Role-Specific Competency Questions" article and its inline JS. Renumber subsequent panels (05 → 04, etc.) so numbering stays sequential.

**Files:**
- Modify: `Prototypes/PROTOTYPE/intern-record.html`

- [ ] **Step 1: Delete Panel 04**

Find the block starting at:

```html
        <!-- Panel 04 — Role-Specific Competency Questions -->
        <article class="rubric-panel" data-section="role-specific">
```

DELETE the entire `<article class="rubric-panel" data-section="role-specific">...</article>` block, including the comment line above it. The block runs ~45 lines.

- [ ] **Step 2: Renumber subsequent panels**

After the deletion, find each subsequent `<!-- Panel NN — ... -->` comment and the matching `<span class="rubric-panel__num">NN</span>` and `<span class="rubric-panel__label">Question NN</span>`. Renumber from 04 onward so numbering is contiguous:

- The panel formerly numbered 05 becomes 04.
- 06 → 05.
- 07 → 06.
- (Continue for any further panels.)

Use the Edit tool to update each `Panel NN` comment, each `<span class="rubric-panel__num">NN</span>`, and each `Question NN` label string. Use targeted string replacements; do not bulk-rename.

- [ ] **Step 3: Delete the inline JS handler for Panel 04**

In the inline `<script>` IIFE at the bottom of the file, find any handler referencing `role-specific`, `roleQuestionsList`, or the role-specific question Add/Remove logic for the intern-record. DELETE those handler blocks.

Also update line 329 (the existing copy):
```html
        Identity fields will lock once saved. Ongoing fields (Entry Assessment, Role-Specific Questions, Employment Details) remain editable.
```
Change to:
```html
        Identity fields will lock once saved. Ongoing fields (Entry Assessment, Employment Details) remain editable.
```

- [ ] **Step 4: Verify**

```bash
grep -c 'data-section="role-specific"\|role-question-row\|Role-Specific Competency Questions' Prototypes/PROTOTYPE/intern-record.html
```
Expected: 0.

```bash
grep -nE 'rubric-panel__num">[0-9]+' Prototypes/PROTOTYPE/intern-record.html
```
Expected: numbers should be contiguous (no gap at 04).

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/intern-record.html
git commit -m "E2: remove Panel 04 (Role-Specific Competency Questions) from intern-record

Per-intern competency authoring now lives in Settings → Questions
→ Competency → Intern Questions. Deletes Panel 04, renumbers
subsequent panels so numbering stays contiguous, removes the
inline JS handler for the role-specific row Add/Remove. Updates
the inline copy that referenced 'Role-Specific Questions'."
```

---

## Task 13: E2 — Documentation updates

Reflect sub-project E in `CLAUDE.md`, `PRD.md`, and the App Outline. Page count goes 31 → 34 (add 3, remove 0).

**Files:**
- Modify: `CLAUDE.md`
- Modify: `PRD.md`
- Modify: `IMPACT Internship Assessment Portal - App Outline.md`

- [ ] **Step 1: Update CLAUDE.md page count**

Find `### Page inventory (31 pages)`. Change to `### Page inventory (34 pages)`.

- [ ] **Step 2: Add the 3 new pages to CLAUDE.md admin page list**

In the Admin: subsection, after the existing `settings-question-set.html` bullet, add:

```markdown
- `settings-competency.html` — 3-tier Competency Questions detail (Settings → Questions → Competency): Core summary card + Cohort Questions table + Intern Questions table
- `competency-cohort-set.html` — Per-cohort competency editor (cohort dropdown + accordion editor)
- `competency-intern-set.html` — Per-intern competency editor (intern dropdown + accordion editor)
```

- [ ] **Step 3: Update CLAUDE.md mock-dataset bullet**

Find the bullet listing IMPACT data structures + helpers. Append the new helpers and the 3-tier model summary. Add a sentence describing the new helpers near where `questionSetById` and friends are listed:

```markdown
… `questionSetById`, `competencyCoreSet`, `competencyCohortSet`, `competencyInternSet`, `stitchedCompetencyQuestions`. The Competency assessment renders a stitched 3-tier rubric (Core program-wide + optional per-cohort + optional per-intern), all stored in `IMPACT.QUESTION_SETS` and edited via Settings → Questions → Competency. The 4 standard intern-facing forms (Personal Goals etc.) and the Competency assessment all use the same renderer / collectAnswers / validateAnswers / restoreAnswers helper pipeline.
```

(Adapt phrasing to fit the surrounding paragraph; integrate rather than appending awkwardly.)

- [ ] **Step 4: Update PRD.md**

Find the data model section. Update the Question Set bullet that mentions "4 intern-facing or admin-facing forms" — now it's effectively 5 (the 4 standard + Competency Rubric, which itself stitches 3 tiers). Replace with:

```markdown
- **Question Set** — Authored content for one of the program's assessment forms. 4 standard sets (Personal Goals, Midpoint Reflection, Participant Feedback, Exit Employer Survey) plus a 3-tier Competency Rubric (program-wide Core + optional per-cohort sets keyed `competency-cohort-<cohortId>` + optional per-intern sets keyed `competency-intern-<internId>`). All editable in Settings → Questions.
```

Find the Screens section's Settings entry and update to mention the new sub-pages:

```markdown
… Settings (admin) — Employers, Phases, Barriers, Roles, Program Info, Questions (4-set editor + 3-tier Competency: Core program-wide, optional per-cohort, optional per-intern).
```

- [ ] **Step 5: Update App Outline**

Find the existing Settings → Questions block. After the existing VIEW: Per-set editor, append:

```markdown

## VIEW: Competency Questions detail (`settings-competency.html`)

ADMIN NAV (Settings active)
PAGE HEAD [ADMIN / SETTINGS / QUESTIONS / COMPETENCY · "Competency Questions."]
SETTINGS SIDEBAR (Questions active)
CARD 1 — Core Competencies summary [Question count · Last edited · Edit Core button → settings-question-set.html?id=competency-core]
CARD 2 — Cohort Questions table [Cohort · Employer · Question count · Last edited; row click → competency-cohort-set.html?id=<cohortId>; + New button → competency-cohort-set.html (new mode)]
CARD 3 — Intern Questions table [Intern · Cohort · Question count · Last edited; row click → competency-intern-set.html?id=<internId>; + New button → competency-intern-set.html (new mode)]

## VIEW: Cohort competency editor (`competency-cohort-set.html?id=<cohortId>`)

ADMIN NAV (Settings active)
PAGE HEAD [breadcrumb to Competency, set name as title]
SETTINGS SIDEBAR (Questions active)
SET CONFIGURATION CARD [Cohort dropdown — filtered to uncustomized cohorts in new mode; disabled in edit mode]
QUESTION EDITOR CARD [accordion + 6-type picker (same shape as settings-question-set.html)]
ACTION BAR [Cancel · Delete (edit mode only, modal-confirm) · Save Changes → IMPACT.saveQuestionSet]

URL contract: ?id=<cohortId> for edit; absent for new. Missing/unknown id → toast + redirect.

## VIEW: Intern competency editor (`competency-intern-set.html?id=<internId>`)

Same shape as the cohort editor with an Intern dropdown instead of Cohort.

URL contract: ?id=<internId> for edit; absent for new.
```

Also find the Competency Assessment screen blocks (`competency-new.html`, `competency-edit.html`, `competency-detail.html`) and update them to reflect the new 3-tier rendering:

```markdown
… Competency assessment (`competency-new.html`, `competency-edit.html`, `competency-detail.html`) — renders the stitched Core + Cohort + Intern competency questions via `IMPACT.renderQuestion`. Section headers between tiers ("Professional Competencies" / "Role-Specific: <Cohort>" / "Intern-Specific"). Save persists answers keyed by question id via `markAssessmentComplete('competency', internId, { phase, answers })`.
```

(Replace whatever the existing description was; preserve the existing structure of the entries.)

Find the SCREEN: Intern Record block. Remove any reference to "Panel 04 — Role-Specific Competency Questions" since that panel was deleted.

Find the SCREEN: Cohort Form (cohort-new / cohort-edit) block. Remove any reference to "Role-Specific Competency Questions" since that section was deleted.

- [ ] **Step 6: Verify**

```bash
grep -nE '34 pages' CLAUDE.md
```
Expected: 1.

```bash
grep -c 'settings-competency.html\|competency-cohort-set.html\|competency-intern-set.html' CLAUDE.md
```
Expected: ≥3.

```bash
grep -c 'competencyCoreSet\|competencyCohortSet\|competencyInternSet\|stitchedCompetencyQuestions' CLAUDE.md
```
Expected: ≥4.

```bash
grep -c 'competency-cohort-\|competency-intern-' PRD.md
```
Expected: ≥2.

```bash
grep -c 'VIEW: Competency Questions detail\|VIEW: Cohort competency editor\|VIEW: Intern competency editor' "IMPACT Internship Assessment Portal - App Outline.md"
```
Expected: 3.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md PRD.md "IMPACT Internship Assessment Portal - App Outline.md"
git commit -m "E2: update docs for Competency Questions Consolidation (sub-project E)

CLAUDE.md: page count 31 -> 34; admin page list adds settings-
competency.html + competency-cohort-set.html + competency-intern-
set.html; mock-dataset bullet adds the 4 new helpers and describes
the 3-tier stitched competency rubric.

PRD.md: Question Set bullet revised to describe the 4 standard
sets + 3-tier Competency Rubric. Settings screen entry updated.

App Outline: 3 new VIEW sub-sections (settings-competency,
competency-cohort-set, competency-intern-set). Competency
assessment block rewritten to describe the renderer-driven
stitched-tier rendering. Removes references to Panel 04 from
Intern Record + Role-Specific section from Cohort form."
```

---

## 🚦 Gate E2 — review C2c-style

Sub-project E is complete. Pause for user review.

If everything passed Task 14: sub-project E ships.
If anything's broken: fix before declaring done.

---

## Task 14: E2 — End-to-end manual integration test

Walk every flow added or modified in sub-project E. Catch cross-task regressions before declaring it done.

**Files:**
- (None — verification only.)

- [ ] **Step 1: Reset to a fresh state**

Close all browser tabs. Open `Prototypes/PROTOTYPE/admin.html` in a fresh tab.

- [ ] **Step 2: Navigate Settings → Questions → Competency**

- Click Settings → Questions sidebar item → land on `settings-questions.html`. Confirm 5 rows total: 4 standard + Competency Rubric (no longer READ-ONLY badge; clickable; question count = 7; last edited = em-dash).
- Click Competency Rubric row → land on `settings-competency.html`. Confirm 3 cards: Core summary (count=7) + Cohort Questions table (1 row: Eskenazi 2026, Eskenazi Health, 4 questions) + Intern Questions table (empty).

- [ ] **Step 3: Edit Core**

- Click Edit Core button → land on `settings-question-set.html?id=competency-core`. Confirm 7 questions in the accordion.
- Edit one question's label (e.g., change "Attendance & Punctuality" to "Attendance & Reliability"). Save. Toast → redirect.
- Back on settings-questions.html, the Last Edited column now shows today's date.

- [ ] **Step 4: Add Cohort Questions for a different cohort**

- Open `settings-competency.html`. Click + New Cohort Questions.
- Confirm dropdown excludes Eskenazi 2026 (already customized).
- Pick another cohort (e.g., Habitat 2026). Click + Add Question → Rubric Row → fill label "Site Safety". Save. Toast → redirect.
- Back on settings-competency.html, table now has 2 rows.

- [ ] **Step 5: Add Intern Questions**

- Click + New Intern Questions on settings-competency.html.
- Pick an Eskenazi intern (e.g., Bayer). Click + Add Question → Rubric Row → fill label "Specific learning goal X". Save.
- Back on settings-competency.html, intern table now has 1 row.

- [ ] **Step 6: Run a Competency assessment**

- Navigate to `competency-new.html?internId=bayer&phase=intake` (or via the assessments hub).
- Confirm 3 sections render: Professional Competencies (7 questions, Core + your edited label) + Role-Specific: Eskenazi 2026 (4 questions) + Intern-Specific (1 question).
- Pick Emerging/Developing/Ready on a few; type notes. Click Submit.
- Confirm the submit modal opens; confirm the submission redirects (or completes per existing flow).

- [ ] **Step 7: Re-edit the assessment**

- Navigate to the most recent competency record (`competency-edit.html?id=<id>`). Confirm previously selected ratings + notes are restored.

- [ ] **Step 8: Read-only detail view**

- Navigate to `competency-detail.html?id=<id>`. Confirm same 3 sections render with all inputs disabled.

- [ ] **Step 9: Verify Cohort form has no role-specific section**

- Navigate to `cohort-new.html` and `cohort-edit.html?id=eskenazi-2026`. Confirm the "Role-Specific Competency Questions" section is gone from both.

- [ ] **Step 10: Verify Intern Record has no Panel 04**

- Navigate to `intern-record.html?id=bayer`. Confirm Panel 04 (Role-Specific) is gone; subsequent panels are renumbered (no gap).

- [ ] **Step 11: Verify Settings sidebar nav across pages**

- From any Settings page, click each sidebar item. Confirm proper highlighting.

- [ ] **Step 12: Static checks**

```bash
cd "Prototypes/PROTOTYPE" && grep -rn 'role-questions-editor\|Role-Specific Competency Questions\|data-section="role-specific"' *.html 2>/dev/null
```
Expected: empty.

```bash
ls "Prototypes/PROTOTYPE/"*.html | wc -l
```
Expected: 34.

- [ ] **Step 13: Final cleanup commit (only if any fixes were made above)**

If steps 1-12 surfaced no issues, skip this step. Otherwise:

```bash
git add <files>
git commit -m "Sub-project E integration fixes — <summary>"
```

---

## Task 15: E2 — Final cross-task code review

Dispatch the code-reviewer subagent for the full sub-project E delta to surface cross-cutting concerns the per-task reviews didn't catch.

**Files:**
- (None — review-only task.)

- [ ] **Step 1: Get the commit range**

Sub-project E started at the spec commit (`d7adcc7`). Current HEAD includes Task 14's optional fix commit if any.

- [ ] **Step 2: Dispatch the final reviewer**

Use the `superpowers:code-reviewer` subagent with a prompt covering: the full diff, deferred items, known per-task code-quality flags (especially the Task 11/12 cleanups for cross-page regressions), and a request for cross-cutting issues + integration concerns.

- [ ] **Step 3: Apply any final-pass fixes**

If the reviewer flags real issues (e.g., a regression in a form's validation, a stale reference somewhere), fix them in a final polish commit.

- [ ] **Step 4: Append carry-forward backlog items**

Per the sub-project C precedent, append any track-only carry-forward items the final reviewer surfaces to `docs/BACKLOG.md` under a new "Sub-project E deferrals" section. Then close the sub-project.

---

## Out of scope (deferred to future passes)

These are explicitly NOT part of this plan. Logged in `docs/BACKLOG.md` as new sub-project E deferrals.

- Cascade-delete of cohort/intern with attached competency-cohort/competency-intern set.
- Phase-scoped competency questions.
- Bulk-author cohort sets from a template.
- Per-intern set discoverability shortcut from `intern-record.html`.
- Inline Core editor on `settings-competency.html`.

## Known prototype limitations carried into this plan

- New / edited cohort and intern competency sets persist via sessionStorage (per-tab). Tab close = data resets to defaults.
- Cross-tab divergence: sessionStorage is per-tab; admin edits in tab A won't appear in tab B until reload.
- Renderer's `competency-rubric-row` output uses fixed Emerging/Developing/Ready segmentation. Custom rubric scales (e.g., 4-segment, 5-segment) are not configurable from the editor.
- Saved competency assessments persisted before this work used hardcoded answer keys (`a1`, `a2`, etc.). After the refactor, new submissions use question ids (`comp-attendance`, `cc-eskenazi-intake`, etc.). Existing pre-refactor records won't restore correctly in `competency-edit.html` — acceptable in the prototype where data resets per tab.
