# Questions Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder content in two intern-facing forms with real DOCS-sourced questions (C1), then refactor four question-bearing forms to render from a shared `IMPACT.QUESTION_SETS` data structure with a Settings → Questions admin editor (C2).

**Architecture:** Two-phase delivery separated by an explicit gate. C1 is text-edits to two HTML files. C2 adds a renderer module and `IMPACT.QUESTION_SETS` to `app.js`, refactors 4 forms to use them, builds 2 new admin pages, and rewires the sidebar Questions link. Competency Rubric stays bespoke (deferred). Live preview pane in editor was dropped (deferred). C2 is sub-divided into three sub-gates (2a/2b/2c) for early-failure detection.

**Tech Stack:** Static HTML + CSS + IIFE-style JavaScript on top of the shared `Prototypes/PROTOTYPE/app.js` module. No build tooling, no framework, no test runner. Persistence: hardcoded mock arrays + sessionStorage overlay (same pattern as `IMPACT.PROGRAM_INFO`).

**Source spec:** `docs/superpowers/specs/2026-05-07-questions-design.md` (committed at `75382a0`).

**Sub-project boundary:** This is sub-project C of three. A and B are shipped. After C2c, all six Settings sidebar items have real implementations and `settings-stub.html` is deleted.

**Phase gates:** Implementation pauses at four explicit checkpoints:
- **Gate 1** — after Task 2 (C1 ships). User reviews real DOCS content in browser.
- **Gate 2a** — after Task 6 (renderer module + Personal Goals refactor). User verifies pixel fidelity on the simplest form.
- **Gate 2b** — after Task 9 (all 4 forms refactored). User verifies all renderer paths.
- **Gate 2c** — after Task 13 (admin editor + sidebar rewires + stub deletion). Sub-project C done.

---

## Task 1: C1 — Migrate `personal-goals.html` to real DOCS content

Replace the 7 placeholder textareas with 4 reflection prompts (textareas) + 1 short-text confidence closer, sourced from `DOCS/Documents for Today's Meeting/Personal Goals.docx`. Update the page intro copy to match the DOCS framing. Update the `minRequired` count in the inline validate from 4-of-7 → 4-of-5. Add a section header "My Focus for This Internship" between Q4 and Q5.

**Files:**
- Modify: `Prototypes/PROTOTYPE/personal-goals.html`

- [ ] **Step 1: Update page-head sub-copy**

Open `Prototypes/PROTOTYPE/personal-goals.html`. Find the existing `page-head__sub` paragraph near the top (likely around lines 40-50). It currently reads something like "Document your goals for the internship before you start..." Replace its inner text with:

```html
This internship is an opportunity for you to build professional skills, explore your career interests, and take steps toward your future. Take a few minutes to reflect on what you want to get out of this experience.
```

Use the Edit tool. Match the existing surrounding `<p class="page-head__sub">` markup; only the inner text changes.

- [ ] **Step 2: Replace the 7 hardcoded questions with the 4 real reflection textareas**

Find the block of 7 `.assessment-question` divs (around lines 84-165). Replace the FIRST FOUR with the real DOCS prompts. Use the Edit tool to replace each one's `__text` and `__hint` content; leave the surrounding `.assessment-question`, `__head`, `__num`, `__label`, and `__input` markup intact.

Question 01:
- `__text`: `What skills do you want to build or improve during this internship?`
- `__hint`: `Think about both workplace skills and personal strengths.`

Question 02:
- `__text`: `What are you hoping to gain from this experience?`
- `__hint`: `This could include confidence, experience, clarity about your goals — or something else.`

Question 03:
- `__text`: `What would success look like for you by the end of this internship?`
- `__hint`: `2–3 sentences is ideal.` (keep existing hint — same shape)

Question 04:
- `__text`: `What is one area you want to challenge yourself in?`
- `__hint`: `Something new, uncomfortable, or a skill you want to grow.`

After this step, questions 5-7 still exist with placeholder content.

- [ ] **Step 3: Replace question 5 with the section header + short-text closer**

Find the question-05 `.assessment-question` div (it should now follow the question-04 div you just edited). DELETE the entire question-05 block.

In its place, INSERT:

```html
        <h3 class="assessment-section-head" style="font-family: var(--font-display); font-size: 22px; margin: 32px 0 16px; color: var(--navy);">My Focus for This Internship</h3>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">05</span>
            <div>
              <span class="assessment-question__label">Question 05</span>
              <p class="assessment-question__text">I want to leave this experience feeling more confident in:</p>
              <span class="assessment-question__hint">A short phrase or single word is fine.</span>
            </div>
          </div>
          <input class="assessment-question__input" type="text" placeholder="…" style="font-family: var(--font-body); font-size: 15px;" />
        </div>
```

(Match the surrounding indentation. The `<input type="text">` replaces the textarea on this question only — it's a short fill-in, not a long-form reflection. The inline `style` on the section header keeps the page chrome additive without requiring a CSS task; for production these would migrate to dedicated rules.)

- [ ] **Step 4: Delete the 6th and 7th question blocks**

Find and DELETE the question-06 and question-07 `.assessment-question` divs (now hanging out below the new question-05 short-text input). Use the Edit tool with the full block text as `old_string`. After this step the form has exactly 5 questions: 4 textareas + 1 short-text closer.

- [ ] **Step 5: Update the inline validate's count rule**

Run:

```bash
grep -n 'minAnswered\|4 of 7\|answered' Prototypes/PROTOTYPE/personal-goals.html
```

Expected: 1-3 matches in the inline IIFE that handles save validation. Find the rule that counts answered textareas; it likely reads something like:

```js
var answered = document.querySelectorAll('.assessment-question__input').length; /* or a filtered count */
if (answeredCount < 4) { /* danger toast */ }
```

The rule's THRESHOLD (`< 4`) stays the same — still answer-at-least-4. But the form now has 5 inputs instead of 7, so the rule is "4-of-5 instead of 4-of-7". The threshold is unchanged; only the message in the toast (if it mentions "4 of 7") needs updating to "4 of 5". If the validate logic uses a hard-coded comparison that references "7", update it to "5".

If the inline IIFE doesn't reference 7 anywhere, no change to the JS is needed — the validate just counts non-empty inputs. Verify by reading the inline IIFE carefully.

- [ ] **Step 6: Verify the page renders the 5 expected questions**

Run:

```bash
grep -c 'class="assessment-question"' Prototypes/PROTOTYPE/personal-goals.html
```

Expected: 5.

```bash
grep -nE '<input class="assessment-question__input" type="text"' Prototypes/PROTOTYPE/personal-goals.html
```

Expected: 1 match (the short-text closer).

```bash
grep -nE '<textarea class="assessment-question__input"' Prototypes/PROTOTYPE/personal-goals.html
```

Expected: 4 matches (questions 1-4).

```bash
grep -c 'My Focus for This Internship' Prototypes/PROTOTYPE/personal-goals.html
```

Expected: 1.

- [ ] **Step 7: Commit**

```bash
git add Prototypes/PROTOTYPE/personal-goals.html
git commit -m "C1: migrate personal-goals.html to real DOCS content

7 generic placeholder textareas -> 4 reflection prompts (real DOCS)
+ 1 short-text confidence closer ('I want to leave this experience
feeling more confident in: ___'). Adds 'My Focus for This Internship'
section header between Q4 and Q5. Updates the page intro to the
DOCS framing copy. minRequired threshold stays at 4 (now 4-of-5
rather than 4-of-7)."
```

---

## Task 2: C1 — Migrate `midpoint-reflection.html` to real DOCS content

Replace the 8 placeholder textareas with 6 reflection prompts (all textareas), sourced from `DOCS/Documents for Today's Meeting/Midpoint Reflection.docx`. Update page intro copy. Update minRequired from 5-of-8 → 4-of-6.

**Files:**
- Modify: `Prototypes/PROTOTYPE/midpoint-reflection.html`

- [ ] **Step 1: Update page-head sub-copy**

Find the `page-head__sub` paragraph. Replace its inner text with:

```html
Take a moment to reflect on your experience so far. This is an opportunity to recognize your progress, identify areas for growth, and adjust your goals moving forward.
```

- [ ] **Step 2: Replace the 8 hardcoded questions with the 6 real reflection prompts**

Find the 8 `.assessment-question` divs. Replace the FIRST SIX questions' `__text` and `__hint` with the real DOCS prompts (markup pattern unchanged). Then DELETE the 7th and 8th question blocks entirely.

Question 01:
- `__text`: `What have you learned or improved since starting your internship?`
- `__hint`: `Think about skills, confidence, or new experiences.`

Question 02:
- `__text`: `What has gone well for you so far? What are you proud of?`
- `__hint`: `Be specific — call out a moment if you can.` (helper inferred — DOCS doesn't specify; keep existing helper if there is one)

Question 03:
- `__text`: `What challenges have you experienced?`
- `__hint`: `Name them honestly — this helps your team support you.`

Question 04:
- `__text`: `What is one area you want to continue improving?`
- `__hint`: `Pick one — focus matters.`

Question 05:
- `__text`: `What support would help you be more successful moving forward?`
- `__hint`: `Think about people, tools, or training.`

Question 06:
- `__text`: `Looking ahead, what would success look like for the rest of your internship?`
- `__hint`: `Paint a picture of what "going well" means.`

After replacing, delete the original questions 7 and 8 entirely.

- [ ] **Step 3: Update inline validate threshold**

Run:

```bash
grep -nE '< 5|minAnswered|5 of 8' Prototypes/PROTOTYPE/midpoint-reflection.html
```

If the inline IIFE has a hardcoded threshold of 5 (matching "5 of 8"), update it to 4 (the new "4 of 6"). If the message mentions "5 of 8", change to "4 of 6". If neither, no change needed — the validate just counts non-empty inputs.

- [ ] **Step 4: Verify the page renders 6 expected questions**

```bash
grep -c 'class="assessment-question"' Prototypes/PROTOTYPE/midpoint-reflection.html
```

Expected: 6.

```bash
grep -c '<textarea class="assessment-question__input"' Prototypes/PROTOTYPE/midpoint-reflection.html
```

Expected: 6.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/midpoint-reflection.html
git commit -m "C1: migrate midpoint-reflection.html to real DOCS content

8 generic placeholder textareas -> 6 reflection prompts (real DOCS).
Updates the page intro to the DOCS framing copy. minRequired
threshold updates from 5 to 4 (now 4-of-6 rather than 5-of-8)."
```

---

## 🚦 Gate 1 — review C1

C1 is complete. Pause for user review:

- Open `Prototypes/PROTOTYPE/personal-goals.html` in a browser. Walk through the 5 questions. Confirm wording and the section header for the closer.
- Open `Prototypes/PROTOTYPE/midpoint-reflection.html`. Walk through the 6 questions.
- Both forms still submit (toast + redirect to assessment-confirmation.html); the answer-count rule fires correctly when fewer than 4 questions are filled.

User decides: proceed to C2, or pause / redirect.

---

## Task 3: C2a — Add `IMPACT.QUESTION_SETS` data + persistence helpers to `app.js`

Add the data structure for the first set (`personal-goals` only — additional sets land in C2b tasks), `saveQuestionSet` helper, and update the `window.IMPACT` export. Sets the foundation for the renderer.

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`

- [ ] **Step 1: Add the QUESTION_SETS_DEFAULTS constant + sessionStorage merge**

Find the existing `PROGRAM_INFO_DEFAULTS` declaration in `app.js` (added in sub-project B Task 1). After the `PROGRAM_INFO` IIFE that follows it, add:

```js
  const QUESTION_SETS_DEFAULTS = [
    {
      id: 'personal-goals',
      name: 'Personal Goals',
      minRequired: 4,
      questions: [
        {
          id:         'pg-skills',
          type:       'textarea',
          label:      'What skills do you want to build or improve during this internship?',
          helperText: 'Think about both workplace skills and personal strengths.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'pg-gain',
          type:       'textarea',
          label:      'What are you hoping to gain from this experience?',
          helperText: 'This could include confidence, experience, clarity about your goals — or something else.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'pg-success',
          type:       'textarea',
          label:      'What would success look like for you by the end of this internship?',
          helperText: '2–3 sentences is ideal.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'pg-challenge',
          type:       'textarea',
          label:      'What is one area you want to challenge yourself in?',
          helperText: 'Something new, uncomfortable, or a skill you want to grow.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'pg-confident',
          type:       'short-text',
          label:      'I want to leave this experience feeling more confident in:',
          helperText: 'A short phrase or single word is fine.',
          required:   false,
          config:     { placeholder: '…', maxLength: 200 }
        }
      ]
    }
  ];

  // QUESTION_SETS is the live record (defaults + sessionStorage overlay).
  // Reads sessionStorage at module init; writes happen via saveQuestionSet().
  var QUESTION_SETS = (function () {
    try {
      var raw = window.sessionStorage.getItem('impact.settings.questionSets');
      if (!raw) {
        return QUESTION_SETS_DEFAULTS.map(function (s) {
          // Deep-ish clone so caller mutations don't leak into the defaults.
          return JSON.parse(JSON.stringify(s));
        });
      }
      var parsed = JSON.parse(raw);
      // Per-set merge: fall back to defaults for any set missing from sessionStorage.
      return QUESTION_SETS_DEFAULTS.map(function (def) {
        return (parsed && parsed[def.id]) ? parsed[def.id] : JSON.parse(JSON.stringify(def));
      });
    } catch (e) {
      return QUESTION_SETS_DEFAULTS.map(function (s) {
        return JSON.parse(JSON.stringify(s));
      });
    }
  })();
```

- [ ] **Step 2: Add `questionSetById` and `saveQuestionSet` helpers**

Find the existing helpers block (where `phaseById`, `barrierById`, `roleById`, `roleNameFor`, `phasesForCohort`, `saveProgramInfo` live — added in sub-project B). Immediately after `saveProgramInfo`, insert:

```js
  function questionSetById(id) {
    return QUESTION_SETS.find(function (s) { return s.id === id; }) || null;
  }

  function saveQuestionSet(setId, payload) {
    try {
      var raw = window.sessionStorage.getItem('impact.settings.questionSets');
      var existing = raw ? JSON.parse(raw) : {};
      if (!existing) existing = {};
      // Stamp the lastEdited timestamp so the Settings list page can show it.
      payload.lastEdited = new Date().toISOString();
      existing[setId] = payload;
      window.sessionStorage.setItem('impact.settings.questionSets', JSON.stringify(existing));
      // Update the live reference so subsequent reads in this tab see the new values.
      var idx = QUESTION_SETS.findIndex(function (s) { return s.id === setId; });
      if (idx !== -1) QUESTION_SETS[idx] = payload;
    } catch (e) { /* sessionStorage unavailable; silently no-op */ }
  }
```

- [ ] **Step 3: Update the `window.IMPACT` export**

Find the existing `window.IMPACT = { … };` block. Replace it with:

```js
  window.IMPACT = {
    COHORTS, INTERNS, COMPETENCY, SELF, EMPLOYERS,
    PHASES, BARRIERS, ROLES, PROGRAM_INFO, QUESTION_SETS,
    cohortById, internById, cohortNameFor, qs, wireModals, toast,
    fillText, hydrateInternRecord,
    competencyById, selfById, resolveParticipant,
    hydrateCompetencyDetail, hydrateCohortDetail, hydrateSelfDetail,
    wireTableFilter, internsByCohort, validate,
    employerById, cohortsForEmployer, employerNameFor, renderEmployerLink,
    phaseById, barrierById, roleById, roleNameFor, phasesForCohort,
    saveProgramInfo,
    questionSetById, saveQuestionSet,
    ASSESSMENT_TYPES, assessmentStatus, markAssessmentComplete, formatCompletionDate,
  };
```

`QUESTION_SETS, questionSetById, saveQuestionSet` are added. The renderer functions are added in Task 4.

- [ ] **Step 4: Verify**

```bash
grep -nE 'QUESTION_SETS_DEFAULTS|saveQuestionSet|questionSetById' Prototypes/PROTOTYPE/app.js
```

Expected: 6+ matches (declaration, IIFE, helper definitions, export entries).

```bash
grep -c 'id: .personal-goals.' Prototypes/PROTOTYPE/app.js
```

Expected: 2 (the defaults entry + the cohort entry from sub-project A's data… wait, no — cohorts have ids like `eskenazi-2026`, not `personal-goals`. Should be exactly 1 match.)

Actually run:

```bash
grep -c "id: *'personal-goals'" Prototypes/PROTOTYPE/app.js
```

Expected: 1.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "C2a: add IMPACT.QUESTION_SETS data + persistence helpers (personal-goals only)

Seeds QUESTION_SETS with the personal-goals set (matches the C1 HTML).
Adds questionSetById and saveQuestionSet helpers (sessionStorage
overlay, same pattern as saveProgramInfo). Adds QUESTION_SETS,
questionSetById, saveQuestionSet to the window.IMPACT export.
Renderer functions land in Task 4."
```

---

## Task 4: C2a — Add the 6 type-specific renderers + `IMPACT.renderQuestion` dispatcher to `app.js`

Add private helpers (`_renderTextarea`, `_renderShortText`, `_renderRadio`, `_renderCheckboxGroup`, `_renderLikert`, `_renderCompetencyRubricRow`) and the public `IMPACT.renderQuestion(question, container)` dispatcher. The renderer must produce DOM matching the existing `.assessment-question` markup pattern used by `personal-goals.html` so the refactor in Task 6 is visually invisible.

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`

- [ ] **Step 1: Add the renderers near the existing `fillText` / `validate` helpers**

Find the existing `fillText` function in `app.js`. After the `validate` helper (or wherever the closing brace of the rendering-helpers block lives — find a clean insertion point near other DOM helpers), insert this block:

```js
  // -------- Question renderers --------
  // Each _render* helper takes a question record and a container element,
  // appends a complete .assessment-question wrapper, and returns nothing.
  // The wrapper includes data-qid="<question.id>" so collectAnswers can
  // walk the DOM and find each answer element by id.

  function _escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function _questionNum(idx) {
    return String(idx + 1).padStart(2, '0');
  }

  function _renderQuestionWrapper(question, idx, inputHtml) {
    // Common wrapper used by every type. Only the inputHtml differs.
    var helper = question.helperText
      ? '<span class="assessment-question__hint">' + _escapeHtml(question.helperText) + '</span>'
      : '';
    return (
      '<div class="assessment-question" data-qid="' + _escapeHtml(question.id) + '" data-qtype="' + _escapeHtml(question.type) + '">' +
        '<div class="assessment-question__head">' +
          '<span class="assessment-question__num">' + _questionNum(idx) + '</span>' +
          '<div>' +
            '<span class="assessment-question__label">Question ' + _questionNum(idx) + '</span>' +
            '<p class="assessment-question__text">' + _escapeHtml(question.label) + '</p>' +
            helper +
          '</div>' +
        '</div>' +
        inputHtml +
      '</div>'
    );
  }

  function _renderTextarea(question, idx) {
    var cfg = question.config || {};
    var rows = cfg.rows || 4;
    var placeholder = cfg.placeholder || 'Your response…';
    var input = '<textarea class="assessment-question__input" rows="' + rows +
      '" placeholder="' + _escapeHtml(placeholder) + '" data-qinput></textarea>';
    return _renderQuestionWrapper(question, idx, input);
  }

  function _renderShortText(question, idx) {
    var cfg = question.config || {};
    var placeholder = cfg.placeholder || '…';
    var maxLength = cfg.maxLength ? ' maxlength="' + cfg.maxLength + '"' : '';
    var input = '<input class="assessment-question__input" type="text"' + maxLength +
      ' placeholder="' + _escapeHtml(placeholder) +
      '" style="font-family: var(--font-body); font-size: 15px;" data-qinput />';
    return _renderQuestionWrapper(question, idx, input);
  }

  function _renderRadio(question, idx) {
    var cfg = question.config || {};
    var opts = Array.isArray(cfg.options) ? cfg.options : [];
    var includeOther = !!cfg.otherWithText;
    var qid = _escapeHtml(question.id);
    var optHtml = opts.map(function (o, i) {
      var inputId = 'q-' + qid + '-' + i;
      return (
        '<label class="assessment-radio">' +
          '<input type="radio" id="' + inputId + '" name="q-' + qid +
            '" value="' + _escapeHtml(o.value) + '" data-qinput />' +
          '<span>' + _escapeHtml(o.label) + '</span>' +
        '</label>'
      );
    }).join('');
    if (includeOther) {
      var otherId = 'q-' + qid + '-other';
      var otherTextId = 'q-' + qid + '-other-text';
      optHtml += (
        '<label class="assessment-radio">' +
          '<input type="radio" id="' + otherId + '" name="q-' + qid +
            '" value="__other" data-qinput data-other-trigger />' +
          '<span>Other</span>' +
        '</label>' +
        '<input type="text" id="' + otherTextId + '" class="assessment-question__input assessment-other-text" ' +
          'placeholder="Please specify…" data-other-text style="display:none; margin-top: 8px;" />'
      );
    }
    var input = '<div class="assessment-options" data-qoptions>' + optHtml + '</div>';
    return _renderQuestionWrapper(question, idx, input);
  }

  function _renderCheckboxGroup(question, idx) {
    var cfg = question.config || {};
    var opts = Array.isArray(cfg.options) ? cfg.options : [];
    var includeOther = !!cfg.otherWithText;
    var qid = _escapeHtml(question.id);
    var optHtml = opts.map(function (o, i) {
      var inputId = 'q-' + qid + '-' + i;
      return (
        '<label class="assessment-check">' +
          '<input type="checkbox" id="' + inputId + '" name="q-' + qid +
            '" value="' + _escapeHtml(o.value) + '" data-qinput />' +
          '<span>' + _escapeHtml(o.label) + '</span>' +
        '</label>'
      );
    }).join('');
    if (includeOther) {
      var otherId = 'q-' + qid + '-other';
      var otherTextId = 'q-' + qid + '-other-text';
      optHtml += (
        '<label class="assessment-check">' +
          '<input type="checkbox" id="' + otherId + '" name="q-' + qid +
            '" value="__other" data-qinput data-other-trigger />' +
          '<span>Other</span>' +
        '</label>' +
        '<input type="text" id="' + otherTextId + '" class="assessment-question__input assessment-other-text" ' +
          'placeholder="Please specify…" data-other-text style="display:none; margin-top: 8px;" />'
      );
    }
    var input = '<div class="assessment-options" data-qoptions>' + optHtml + '</div>';
    return _renderQuestionWrapper(question, idx, input);
  }

  function _renderLikert(question, idx) {
    var cfg = question.config || {};
    var min = cfg.min || 1;
    var max = cfg.max || 5;
    var leftLabel = cfg.leftLabel || '';
    var rightLabel = cfg.rightLabel || '';
    var qid = _escapeHtml(question.id);
    var segments = '';
    for (var n = min; n <= max; n++) {
      var inputId = 'q-' + qid + '-' + n;
      segments += (
        '<label class="assessment-likert__seg">' +
          '<input type="radio" id="' + inputId + '" name="q-' + qid +
            '" value="' + n + '" data-qinput />' +
          '<span>' + n + '</span>' +
        '</label>'
      );
    }
    var input = (
      '<div class="assessment-likert" data-qoptions>' +
        '<span class="assessment-likert__anchor assessment-likert__anchor--left">' + _escapeHtml(leftLabel) + '</span>' +
        '<div class="assessment-likert__segments">' + segments + '</div>' +
        '<span class="assessment-likert__anchor assessment-likert__anchor--right">' + _escapeHtml(rightLabel) + '</span>' +
      '</div>'
    );
    return _renderQuestionWrapper(question, idx, input);
  }

  function _renderCompetencyRubricRow(question, idx) {
    // Compound: 3-segment radio (Emerging/Developing/Ready) + Notes textarea.
    // Used today inside competency-new.html via bespoke markup; this renderer
    // is in the catalog for future Competency-Rubric refactor (deferred).
    var qid = _escapeHtml(question.id);
    var segments = ['emerging', 'developing', 'ready'].map(function (val) {
      var inputId = 'q-' + qid + '-' + val;
      var label = val.charAt(0).toUpperCase() + val.slice(1);
      return (
        '<label class="rubric-pill">' +
          '<input type="radio" id="' + inputId + '" name="q-' + qid +
            '" value="' + val + '" data-qinput />' +
          '<span>' + label + '</span>' +
        '</label>'
      );
    }).join('');
    var input = (
      '<div class="rubric-row" data-qoptions>' +
        '<div class="rubric-row__pills">' + segments + '</div>' +
        '<textarea class="rubric-row__notes" placeholder="Notes…" rows="2" data-qnotes></textarea>' +
      '</div>'
    );
    return _renderQuestionWrapper(question, idx, input);
  }

  function renderQuestion(question, container, idx) {
    if (!question || !container) return;
    var i = (typeof idx === 'number') ? idx : container.querySelectorAll('.assessment-question').length;
    var html;
    switch (question.type) {
      case 'textarea':              html = _renderTextarea(question, i); break;
      case 'short-text':            html = _renderShortText(question, i); break;
      case 'radio':                 html = _renderRadio(question, i); break;
      case 'checkbox-group':        html = _renderCheckboxGroup(question, i); break;
      case 'likert':                html = _renderLikert(question, i); break;
      case 'competency-rubric-row': html = _renderCompetencyRubricRow(question, i); break;
      default:
        html = '<div class="assessment-question input--error" data-qid="' + _escapeHtml(question.id) +
          '">Unknown question type: ' + _escapeHtml(question.type) + '</div>';
    }
    container.insertAdjacentHTML('beforeend', html);
    // After inserting, wire the "Other-with-text" reveal if applicable.
    if (question.type === 'radio' || question.type === 'checkbox-group') {
      _wireOtherReveal(container.querySelector('[data-qid="' + question.id + '"]'));
    }
  }

  function _wireOtherReveal(qWrapper) {
    if (!qWrapper) return;
    var trigger = qWrapper.querySelector('[data-other-trigger]');
    var textInput = qWrapper.querySelector('[data-other-text]');
    if (!trigger || !textInput) return;
    var radios = qWrapper.querySelectorAll('input[type="radio"][data-qinput]');
    var checks = qWrapper.querySelectorAll('input[type="checkbox"][data-qinput]');
    function update() {
      textInput.style.display = trigger.checked ? 'block' : 'none';
    }
    if (radios.length) radios.forEach(function (r) { r.addEventListener('change', update); });
    if (checks.length) checks.forEach(function (c) { c.addEventListener('change', update); });
    update();
  }
```

- [ ] **Step 2: Update the `window.IMPACT` export to include `renderQuestion`**

Find the export block from Task 3 Step 3. Add `renderQuestion` to the helpers row:

```js
    questionSetById, saveQuestionSet, renderQuestion,
```

(Replace the existing `questionSetById, saveQuestionSet,` line with this expanded one.)

- [ ] **Step 3: Add CSS for any new classes the renderer references**

The renderer references several classes that may NOT exist in `styles.css` yet. Run:

```bash
grep -nE '\.assessment-question|\.assessment-radio|\.assessment-check|\.assessment-options|\.assessment-likert|\.rubric-row|\.rubric-pill|\.assessment-other-text' Prototypes/PROTOTYPE/styles.css
```

For any missing class, ADD a default style. Most existing forms already define `.assessment-question`, `.assessment-question__num`, `.assessment-question__head`, `.assessment-question__text`, `.assessment-question__hint`, `.assessment-question__input` (these come from `personal-goals.html`'s existing CSS). But these may NOT exist:

- `.assessment-radio`, `.assessment-check`, `.assessment-options` — used by radio/checkbox-group renderers.
- `.assessment-likert`, `.assessment-likert__seg`, `.assessment-likert__anchor`, `.assessment-likert__segments` — used by likert renderer.
- `.rubric-row`, `.rubric-row__pills`, `.rubric-row__notes`, `.rubric-pill` — used by competency-rubric-row renderer.
- `.assessment-other-text` — used by Other-with-reveal.

If any are missing, append the following block to the END of `styles.css`. (If a class is already defined elsewhere in styles.css, leave its definition alone; only add the missing ones.)

```css

/* ============================================================
   QUESTION RENDERER (sub-project C C2a)
   Output by IMPACT.renderQuestion. Mirrors the existing
   .assessment-question* shape introduced by personal-goals.html.
   ============================================================ */

.assessment-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.assessment-radio,
.assessment-check {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 120ms ease;
}

.assessment-radio:hover,
.assessment-check:hover {
  background: var(--canvas-alt, #F5F7FA);
}

.assessment-radio input[type="radio"]:checked + span,
.assessment-check input[type="checkbox"]:checked + span {
  font-weight: 600;
  color: var(--navy);
}

.assessment-radio input[type="radio"],
.assessment-check input[type="checkbox"] {
  accent-color: var(--navy);
}

.assessment-other-text {
  width: 100%;
  font-family: var(--font-body);
  font-size: 14px;
}

/* Likert N-segment row */
.assessment-likert {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  margin-top: 12px;
}

.assessment-likert__anchor {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--muted);
}

.assessment-likert__segments {
  display: flex;
  gap: 0;
}

.assessment-likert__seg {
  flex: 1;
  text-align: center;
  padding: 12px 8px;
  border: 1px solid var(--rule);
  border-right: none;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--ink);
  background: #fff;
  transition: background 120ms ease, color 120ms ease;
}

.assessment-likert__seg:first-of-type { border-top-left-radius: var(--radius-md); border-bottom-left-radius: var(--radius-md); }
.assessment-likert__seg:last-of-type { border-right: 1px solid var(--rule); border-top-right-radius: var(--radius-md); border-bottom-right-radius: var(--radius-md); }

.assessment-likert__seg input[type="radio"] { display: none; }

.assessment-likert__seg:has(input[type="radio"]:checked) {
  background: var(--navy);
  color: #fff;
  border-color: var(--navy);
}

/* Competency rubric row */
.rubric-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.rubric-row__pills {
  display: flex;
  gap: 8px;
}

.rubric-pill {
  flex: 1;
  text-align: center;
  padding: 10px 12px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 12px;
}

.rubric-pill input[type="radio"] { display: none; }

.rubric-pill:has(input[type="radio"]:checked) {
  background: var(--navy);
  color: #fff;
  border-color: var(--navy);
}

.rubric-row__notes {
  width: 100%;
  font-family: var(--font-body);
  font-size: 14px;
  padding: 8px 10px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
}
```

(Some of these classes may turn out to be redundant when they collide with hand-tuned styles already on `participant-feedback.html` or `exit-employer-survey.html`. Tasks 8 and 9 will surface any conflicts; for now this gives Task 6 enough CSS to render personal-goals correctly.)

- [ ] **Step 4: Verify**

```bash
grep -nE 'function (renderQuestion|_renderTextarea|_renderShortText|_renderRadio|_renderCheckboxGroup|_renderLikert|_renderCompetencyRubricRow)' Prototypes/PROTOTYPE/app.js
```

Expected: 7 matches (one per function).

```bash
grep -n 'renderQuestion' Prototypes/PROTOTYPE/app.js | wc -l
```

Expected: ≥3 (definition, dispatcher reference, export entry).

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js Prototypes/PROTOTYPE/styles.css
git commit -m "C2a: add 6 question renderers + IMPACT.renderQuestion dispatcher

Each _render* private helper produces a complete .assessment-question
wrapper for one question type (textarea / short-text / radio /
checkbox-group / likert / competency-rubric-row). The dispatcher
inserts the rendered HTML into a container element and wires
'Other-with-text' reveal for radio + checkbox-group when configured.
Adds CSS for the renderer's output classes (purely additive)."
```

---

## Task 5: C2a — Add `IMPACT.collectAnswers` + `IMPACT.validateAnswers` to `app.js`

Walks the rendered DOM to collect answers; validates them against the question set's rules.

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`

- [ ] **Step 1: Add `collectAnswers` and `validateAnswers` after `renderQuestion` and the `_wireOtherReveal` helper**

```js
  function collectAnswers(setId, container) {
    var set = questionSetById(setId);
    if (!set || !container) return {};
    var answers = {};
    set.questions.forEach(function (q) {
      var wrapper = container.querySelector('[data-qid="' + q.id + '"]');
      if (!wrapper) { answers[q.id] = null; return; }
      switch (q.type) {
        case 'textarea':
        case 'short-text': {
          var input = wrapper.querySelector('[data-qinput]');
          answers[q.id] = input ? input.value : '';
          break;
        }
        case 'radio':
        case 'likert': {
          var checked = wrapper.querySelector('input[type="radio"][data-qinput]:checked');
          if (!checked) { answers[q.id] = null; break; }
          if (checked.value === '__other') {
            var otherText = wrapper.querySelector('[data-other-text]');
            answers[q.id] = { value: '__other', otherText: otherText ? otherText.value : '' };
          } else {
            answers[q.id] = checked.value;
          }
          break;
        }
        case 'checkbox-group': {
          var checks = wrapper.querySelectorAll('input[type="checkbox"][data-qinput]:checked');
          var values = [];
          var otherSelected = false;
          checks.forEach(function (c) {
            if (c.value === '__other') { otherSelected = true; }
            else { values.push(c.value); }
          });
          if (otherSelected) {
            var otherText2 = wrapper.querySelector('[data-other-text]');
            answers[q.id] = { values: values, otherText: otherText2 ? otherText2.value : '' };
          } else {
            answers[q.id] = values;
          }
          break;
        }
        case 'competency-rubric-row': {
          var checked3 = wrapper.querySelector('input[type="radio"][data-qinput]:checked');
          var notes = wrapper.querySelector('[data-qnotes]');
          answers[q.id] = {
            rating: checked3 ? checked3.value : null,
            notes:  notes ? notes.value : ''
          };
          break;
        }
        default:
          answers[q.id] = null;
      }
    });
    return answers;
  }

  function validateAnswers(setId, answers) {
    var set = questionSetById(setId);
    if (!set) return { ok: true, errors: {} };
    var errors = {};
    var answeredCount = 0;
    set.questions.forEach(function (q) {
      var a = answers[q.id];
      var isAnswered = _isAnswered(q, a);
      if (q.required && !isAnswered) {
        errors[q.id] = 'Required';
      }
      if (isAnswered) answeredCount++;
    });
    if (typeof set.minRequired === 'number' && answeredCount < set.minRequired) {
      // Set-level error — applies to the form as a whole, not a specific question.
      errors.__minRequired = 'Please answer at least ' + set.minRequired + ' of ' +
        set.questions.length + ' questions.';
    }
    return { ok: Object.keys(errors).length === 0, errors: errors };
  }

  function _isAnswered(question, answer) {
    if (answer == null) return false;
    switch (question.type) {
      case 'textarea':
      case 'short-text':
        return String(answer).trim().length > 0;
      case 'radio':
      case 'likert':
        if (typeof answer === 'object') {
          // "Other-with-text" — must have non-empty otherText.
          return answer.value === '__other' && String(answer.otherText || '').trim().length > 0;
        }
        return String(answer).length > 0;
      case 'checkbox-group':
        if (typeof answer === 'object' && !Array.isArray(answer)) {
          // "Other-with-text" — at least one value OR a non-empty otherText.
          return (answer.values && answer.values.length > 0) ||
                 String(answer.otherText || '').trim().length > 0;
        }
        return Array.isArray(answer) && answer.length > 0;
      case 'competency-rubric-row':
        return answer.rating != null;
      default:
        return false;
    }
  }
```

- [ ] **Step 2: Update the `window.IMPACT` export to include `collectAnswers` and `validateAnswers`**

Find the export entry that includes `renderQuestion`. Replace with:

```js
    questionSetById, saveQuestionSet, renderQuestion, collectAnswers, validateAnswers,
```

- [ ] **Step 3: Verify**

```bash
grep -nE 'function (collectAnswers|validateAnswers|_isAnswered)' Prototypes/PROTOTYPE/app.js
```

Expected: 3 matches.

```bash
grep -n 'collectAnswers\|validateAnswers' Prototypes/PROTOTYPE/app.js | wc -l
```

Expected: ≥4 (definitions + export).

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "C2a: add collectAnswers + validateAnswers helpers

collectAnswers walks the rendered DOM, returning a flat object
keyed by question id with type-specific value shapes (string for
textarea/short-text/radio/likert; array for checkbox-group;
{value,otherText} for Other-with-text; {rating,notes} for
competency-rubric-row). validateAnswers applies the set's
required + minRequired rules and returns {ok, errors}."
```

---

## Task 6: C2a — Refactor `personal-goals.html` to render from `IMPACT.QUESTION_SETS`

Replace the 5 hardcoded `.assessment-question` divs (just landed in C1) with a single empty container; render via `IMPACT.renderQuestion`. Update the save handler to use `IMPACT.collectAnswers` and `IMPACT.validateAnswers`.

The visual output must match the C1 result exactly.

**Files:**
- Modify: `Prototypes/PROTOTYPE/personal-goals.html`

- [ ] **Step 1: Replace the question markup**

Open `Prototypes/PROTOTYPE/personal-goals.html`. Find the surrounding container that holds the 5 `.assessment-question` divs (and the section header between Q4 and Q5). Identify its outer wrapper — likely a `<div class="assessment-questions">` or similar; find the line immediately after the wrapper's opening tag.

DELETE all 5 `.assessment-question` divs and the `<h3 class="assessment-section-head">` header. Replace with:

```html
        <div id="questions-main"></div>
        <h3 class="assessment-section-head" style="font-family: var(--font-display); font-size: 22px; margin: 32px 0 16px; color: var(--navy);">My Focus for This Internship</h3>
        <div id="questions-focus"></div>
```

Two containers because the section header sits between question 4 and question 5; the renderer can't introduce arbitrary chrome, so we split the loop.

- [ ] **Step 2: Add the renderer IIFE near the bottom of the file**

Find the existing inline IIFE that handles save validation (probably attached to a `data-action="save"` button or similar). At the TOP of that IIFE (before the existing save handler), insert:

```js
      // Render questions from IMPACT.QUESTION_SETS.
      var setId = 'personal-goals';
      var set = IMPACT.questionSetById(setId);
      if (set) {
        var mainContainer = document.getElementById('questions-main');
        var focusContainer = document.getElementById('questions-focus');
        // First 4 questions in the main container; last (short-text closer) in the focus container.
        set.questions.slice(0, 4).forEach(function (q, i) {
          IMPACT.renderQuestion(q, mainContainer, i);
        });
        set.questions.slice(4).forEach(function (q, i) {
          IMPACT.renderQuestion(q, focusContainer, i + 4);
        });
      }
```

- [ ] **Step 3: Update the save handler to use the renderer's helpers**

Find the existing inline save handler. The handler currently does some variant of:
1. Count non-empty `.assessment-question__input` elements
2. If count < 4, show a danger toast and return
3. Otherwise mark assessment complete and redirect

Replace the count + threshold logic with:

```js
      // Validate answers against the question set's rules.
      var allContainer = document.querySelector('.assessment-questions') || document.body;
      var answers = IMPACT.collectAnswers(setId, allContainer);
      var v = IMPACT.validateAnswers(setId, answers);
      if (!v.ok) {
        // Surface error: highlight individual questions or show the minRequired message.
        if (v.errors.__minRequired) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: v.errors.__minRequired });
        } else {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please answer the required questions.' });
        }
        Object.keys(v.errors).forEach(function (qId) {
          if (qId === '__minRequired') return;
          var row = allContainer.querySelector('[data-qid="' + qId + '"]');
          if (row) row.classList.add('input--error');
        });
        return;
      }
```

(`allContainer` uses the existing `.assessment-questions` wrapper if it exists; otherwise falls back to document.body. The `collectAnswers` walks within that subtree to find every rendered question.)

The downstream existing logic — `markAssessmentComplete`, redirect to assessment-confirmation, etc. — stays unchanged.

- [ ] **Step 4: Verify**

```bash
grep -c 'class="assessment-question"' Prototypes/PROTOTYPE/personal-goals.html
```

Expected: 0 (no more hardcoded question divs in the source HTML; they're rendered at runtime).

```bash
grep -c 'IMPACT.renderQuestion\|IMPACT.collectAnswers\|IMPACT.validateAnswers' Prototypes/PROTOTYPE/personal-goals.html
```

Expected: ≥3.

```bash
grep -c 'questions-main\|questions-focus' Prototypes/PROTOTYPE/personal-goals.html
```

Expected: 4 (each id appears in the markup AND the IIFE).

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/personal-goals.html
git commit -m "C2a: refactor personal-goals.html to render from IMPACT.QUESTION_SETS

5 hardcoded .assessment-question divs replaced by 2 empty
containers (#questions-main, #questions-focus, split by the 'My
Focus for This Internship' section header). IIFE renders questions
1-4 into main + question 5 into focus via IMPACT.renderQuestion.
Save handler uses IMPACT.collectAnswers + validateAnswers.
Behavior identical to the C1 version (4-of-5 minimum)."
```

---

## 🚦 Gate 2a — review C2a (renderer + Personal Goals refactor)

Pause for user review:

- Open `Prototypes/PROTOTYPE/personal-goals.html` in a browser. Walk through all 5 questions. Verify the visual layout matches the C1 (hardcoded) version pixel-for-pixel — same question numbers, same hint styling, same input shapes, same section header.
- Try submitting with fewer than 4 answers — confirm the "Please answer at least 4 of 5 questions" toast fires.
- Try submitting with 4+ answers — confirm the assessment-confirmation page loads.
- (Optional debug experiment) Open `app.js` in a text editor, edit one of the question labels in `QUESTION_SETS_DEFAULTS`, refresh personal-goals.html, confirm the new label appears.

If anything looks wrong, the renderer markup or CSS likely needs adjustment BEFORE Tasks 7-9 generalize the pattern.

User decides: proceed to C2b, or pause / fix.

---

## Task 7: C2b — Add midpoint-reflection set + refactor `midpoint-reflection.html`

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js` (add midpoint-reflection set to QUESTION_SETS_DEFAULTS)
- Modify: `Prototypes/PROTOTYPE/midpoint-reflection.html`

- [ ] **Step 1: Add the midpoint-reflection set to `QUESTION_SETS_DEFAULTS`**

Find the `QUESTION_SETS_DEFAULTS` array in `app.js`. After the closing `}` of the `personal-goals` set entry but before the final `]`, append a comma + the new set:

```js
    ,
    {
      id: 'midpoint-reflection',
      name: 'Midpoint Reflection',
      minRequired: 4,
      questions: [
        {
          id:         'mr-learned',
          type:       'textarea',
          label:      'What have you learned or improved since starting your internship?',
          helperText: 'Think about skills, confidence, or new experiences.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'mr-gone-well',
          type:       'textarea',
          label:      'What has gone well for you so far? What are you proud of?',
          helperText: 'Be specific — call out a moment if you can.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'mr-challenges',
          type:       'textarea',
          label:      'What challenges have you experienced?',
          helperText: 'Name them honestly — this helps your team support you.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'mr-improving',
          type:       'textarea',
          label:      'What is one area you want to continue improving?',
          helperText: 'Pick one — focus matters.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'mr-support',
          type:       'textarea',
          label:      'What support would help you be more successful moving forward?',
          helperText: 'Think about people, tools, or training.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        },
        {
          id:         'mr-success',
          type:       'textarea',
          label:      'Looking ahead, what would success look like for the rest of your internship?',
          helperText: 'Paint a picture of what "going well" means.',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        }
      ]
    }
```

- [ ] **Step 2: Refactor `midpoint-reflection.html`**

Open `Prototypes/PROTOTYPE/midpoint-reflection.html`. Find the 6 hardcoded `.assessment-question` divs (just landed in C1). Identify the wrapping container.

Replace all 6 divs with a single empty container:

```html
        <div id="questions"></div>
```

- [ ] **Step 3: Add the renderer IIFE**

Find the existing inline save IIFE. At its top (before the save handler), add:

```js
      var setId = 'midpoint-reflection';
      var set = IMPACT.questionSetById(setId);
      if (set) {
        var container = document.getElementById('questions');
        set.questions.forEach(function (q, i) {
          IMPACT.renderQuestion(q, container, i);
        });
      }
```

- [ ] **Step 4: Update the save handler**

Replace the existing answer-counting validation logic with:

```js
      var allContainer = document.querySelector('.assessment-questions') || document.body;
      var answers = IMPACT.collectAnswers(setId, allContainer);
      var v = IMPACT.validateAnswers(setId, answers);
      if (!v.ok) {
        if (v.errors.__minRequired) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: v.errors.__minRequired });
        } else {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please answer the required questions.' });
        }
        Object.keys(v.errors).forEach(function (qId) {
          if (qId === '__minRequired') return;
          var row = allContainer.querySelector('[data-qid="' + qId + '"]');
          if (row) row.classList.add('input--error');
        });
        return;
      }
```

The existing `markAssessmentComplete` + redirect logic stays.

- [ ] **Step 5: Verify**

```bash
grep -c 'class="assessment-question"' Prototypes/PROTOTYPE/midpoint-reflection.html
```

Expected: 0 (no more hardcoded divs).

```bash
grep -c 'midpoint-reflection' Prototypes/PROTOTYPE/app.js
```

Expected: ≥2 (set id in defaults + maybe export-list reference).

- [ ] **Step 6: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js Prototypes/PROTOTYPE/midpoint-reflection.html
git commit -m "C2b: add midpoint-reflection question set + refactor form

Adds the midpoint-reflection set to IMPACT.QUESTION_SETS_DEFAULTS
(6 reflection textareas, minRequired=4). Refactors
midpoint-reflection.html to render from data via IMPACT.renderQuestion;
save handler uses collectAnswers + validateAnswers. Behavior
identical to the C1 version."
```

---

## Task 8: C2b — Add participant-feedback set + refactor `participant-feedback.html`

This is the first form to exercise the renderer's full type catalog: `radio` (with Other-with-reveal), `likert`, mixed yes/no/maybe radios, and the compound pattern (parent radio + sibling textarea).

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`
- Modify: `Prototypes/PROTOTYPE/participant-feedback.html`

- [ ] **Step 1: Add the participant-feedback set to `QUESTION_SETS_DEFAULTS`**

Append the set inside the array, after the `midpoint-reflection` entry:

```js
    ,
    {
      id: 'participant-feedback',
      name: 'Participant Feedback',
      minRequired: 4,
      questions: [
        {
          id:         'pf-leaving',
          type:       'radio',
          label:      'Why are you leaving this internship?',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'completed',   label: 'Completed the program' },
              { value: 'job',         label: 'Got a job offer' },
              { value: 'school',      label: 'Returning to school' },
              { value: 'family',      label: 'Family or caregiving needs' },
              { value: 'health',      label: 'Health reasons' },
              { value: 'fit',         label: 'Not a good fit' }
            ],
            otherWithText: true
          }
        },
        {
          id:         'pf-overall',
          type:       'likert',
          label:      'Overall, how would you rate your experience?',
          helperText: '',
          required:   false,
          config: { min: 1, max: 5, leftLabel: 'Very negative', rightLabel: 'Very positive' }
        },
        {
          id:         'pf-prepared',
          type:       'radio',
          label:      'Do you feel more prepared for employment after this internship?',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no',  label: 'No' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'pf-supported',
          type:       'radio',
          label:      'Did you feel supported during the internship?',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'yes',      label: 'Yes' },
              { value: 'somewhat', label: 'Somewhat' },
              { value: 'no',       label: 'No' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'pf-supported-detail',
          type:       'textarea',
          label:      'Tell us more about the support you received (or didn\'t):',
          helperText: '',
          required:   false,
          config:     { rows: 3, placeholder: 'Your response…' }
        },
        {
          id:         'pf-barriers',
          type:       'radio',
          label:      'Did you experience any barriers during the internship?',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no',  label: 'No' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'pf-barriers-detail',
          type:       'textarea',
          label:      'If yes, what were the barriers — and were they addressed?',
          helperText: '',
          required:   false,
          config:     { rows: 3, placeholder: 'Your response…' }
        },
        {
          id:         'pf-recommend',
          type:       'radio',
          label:      'Would you recommend this experience to others?',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'yes',   label: 'Yes' },
              { value: 'maybe', label: 'Maybe' },
              { value: 'no',    label: 'No' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'pf-improve',
          type:       'textarea',
          label:      'Anything we could improve?',
          helperText: '',
          required:   false,
          config:     { rows: 4, placeholder: 'Your response…' }
        }
      ]
    }
```

(Note: this set has 9 questions — 7 in the original spec + 2 additional "detail" textareas paired with the supported / barriers radios. The compound pattern is modeled as 2 separate question records, so participant-feedback's authoring count is 9 in the data, even though the user perceives 7 question groupings. minRequired stays at 4 — same threshold.)

- [ ] **Step 2: Refactor `participant-feedback.html`**

Open `Prototypes/PROTOTYPE/participant-feedback.html`. Find the existing 7 hardcoded question blocks. They likely use a mix of markup styles (radio groups, segmented Likert, textareas). Identify the wrapping container.

Replace all 7 question blocks with a single empty container:

```html
        <div id="questions"></div>
```

- [ ] **Step 3: Add the renderer IIFE**

Append the renderer IIFE after the existing `<script src="app.js"></script>` (or at the top of an existing IIFE):

```js
      var setId = 'participant-feedback';
      var set = IMPACT.questionSetById(setId);
      if (set) {
        var container = document.getElementById('questions');
        set.questions.forEach(function (q, i) {
          IMPACT.renderQuestion(q, container, i);
        });
      }
```

- [ ] **Step 4: Update the save handler**

Replace the existing inline-validate logic with the standard pattern (same as Tasks 6 and 7):

```js
      var allContainer = document.querySelector('.assessment-questions') || document.body;
      var answers = IMPACT.collectAnswers(setId, allContainer);
      var v = IMPACT.validateAnswers(setId, answers);
      if (!v.ok) {
        if (v.errors.__minRequired) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: v.errors.__minRequired });
        } else {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please answer the required questions.' });
        }
        Object.keys(v.errors).forEach(function (qId) {
          if (qId === '__minRequired') return;
          var row = allContainer.querySelector('[data-qid="' + qId + '"]');
          if (row) row.classList.add('input--error');
        });
        return;
      }
```

- [ ] **Step 5: Verify the renderer's output**

```bash
grep -c 'class="assessment-question"' Prototypes/PROTOTYPE/participant-feedback.html
```

Expected: 0.

```bash
grep -nE 'IMPACT\.renderQuestion|IMPACT\.collectAnswers' Prototypes/PROTOTYPE/participant-feedback.html
```

Expected: 2 matches.

⚠️ **Visual check note:** the renderer's CSS for radio groups, Likert pills, and Other-with-reveal may not exactly match the previous hand-tuned styles in `participant-feedback.html`'s existing CSS. If a visual regression appears (e.g., radio rows look different, Likert segments don't connect properly), inspect the diff in `styles.css` from Task 4 Step 3 vs. whatever pre-existing `participant-feedback`-specific styles there are. Adjust the renderer CSS to match. Document any tweaks in the commit message.

- [ ] **Step 6: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js Prototypes/PROTOTYPE/participant-feedback.html
git commit -m "C2b: add participant-feedback question set + refactor form

Adds the participant-feedback set to IMPACT.QUESTION_SETS_DEFAULTS
(9 questions: radio with Other-with-reveal, 5-segment Likert,
multiple yes/no/somewhat/maybe radios, and 2 compound 'detail'
textareas paired with their parent radios). Refactors
participant-feedback.html to render from data."
```

---

## Task 9: C2b — Add exit-employer-survey set + refactor `exit-employer-survey.html`

This form exercises `checkbox-group` (with Other-with-reveal) for the first time. The bespoke meta-strip stays as-is — only the question content area refactors.

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`
- Modify: `Prototypes/PROTOTYPE/exit-employer-survey.html`

- [ ] **Step 1: Add the exit-employer-survey set**

Append after `participant-feedback`:

```js
    ,
    {
      id: 'exit-employer-survey',
      name: 'Exit Employer Survey',
      minRequired: 4,
      questions: [
        {
          id:         'ees-outcome',
          type:       'radio',
          label:      'Outcome status:',
          helperText: '',
          required:   true,
          config: {
            options: [
              { value: 'hired',                label: 'Hired by this employer' },
              { value: 'completed',            label: 'Completed — not hired' },
              { value: 'extended',             label: 'Internship extended' },
              { value: 'early-exit-perf',      label: 'Early exit — performance' },
              { value: 'early-exit-fit',       label: 'Early exit — fit' },
              { value: 'early-exit-circ',      label: 'Early exit — personal circumstances' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'ees-offered',
          type:       'radio',
          label:      'Was employment offered?',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'yes', label: 'Yes' },
              { value: 'no',  label: 'No' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'ees-offered-detail',
          type:       'textarea',
          label:      'If not, what was the primary reason?',
          helperText: '',
          required:   false,
          config:     { rows: 3, placeholder: 'Your response…' }
        },
        {
          id:         'ees-performance',
          type:       'likert',
          label:      'Overall performance rating:',
          helperText: '1 = Limited / 5 = Strong',
          required:   true,
          config: { min: 1, max: 5, leftLabel: 'Limited', rightLabel: 'Strong' }
        },
        {
          id:         'ees-strengths',
          type:       'textarea',
          label:      'Strengths:',
          helperText: '',
          required:   false,
          config:     { rows: 3, placeholder: 'Your response…' }
        },
        {
          id:         'ees-improvements',
          type:       'textarea',
          label:      'Areas for improvement:',
          helperText: '',
          required:   false,
          config:     { rows: 3, placeholder: 'Your response…' }
        },
        {
          id:         'ees-readiness',
          type:       'checkbox-group',
          label:      'Work readiness indicators (check all that apply):',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'punctual',     label: 'Reliable and punctual' },
              { value: 'communicates', label: 'Communicates clearly' },
              { value: 'feedback',     label: 'Receives feedback well' },
              { value: 'teamwork',     label: 'Works well on a team' },
              { value: 'initiative',   label: 'Takes initiative' },
              { value: 'workplace',    label: 'Understands workplace norms' }
            ],
            otherWithText: false
          }
        },
        {
          id:         'ees-barriers',
          type:       'checkbox-group',
          label:      'Barriers observed (check all that apply):',
          helperText: '',
          required:   false,
          config: {
            options: [
              { value: 'transport',     label: 'Transportation' },
              { value: 'attendance',    label: 'Attendance' },
              { value: 'communication', label: 'Communication' },
              { value: 'tasks',         label: 'Difficulty with tasks' },
              { value: 'feedback',      label: 'Trouble with feedback' },
              { value: 'family',        label: 'Family or personal' }
            ],
            otherWithText: true
          }
        },
        {
          id:         'ees-comments',
          type:       'textarea',
          label:      'Additional comments:',
          helperText: '',
          required:   false,
          config:     { rows: 3, placeholder: 'Your response…' }
        }
      ]
    }
```

(9 questions: 8 from the original spec + 1 "detail" textarea for ees-offered. minRequired=4.)

- [ ] **Step 2: Refactor `exit-employer-survey.html`**

Find the question content area on `exit-employer-survey.html` — should be a wrapping container with the existing 8 hardcoded question blocks. The meta-strip (Employer / Position / Start / End / Participant) is page chrome and stays as-is.

Replace the 8 question blocks with:

```html
        <div id="questions"></div>
```

- [ ] **Step 3: Add the renderer IIFE**

Append after the existing `<script src="app.js"></script>` IIFE that hydrates the meta-strip:

```js
      var setId = 'exit-employer-survey';
      var set = IMPACT.questionSetById(setId);
      if (set) {
        var container = document.getElementById('questions');
        set.questions.forEach(function (q, i) {
          IMPACT.renderQuestion(q, container, i);
        });
      }
```

- [ ] **Step 4: Update the save handler**

Replace the existing validate + `markAssessmentComplete` payload-build logic. The save handler's payload currently builds an object from hardcoded form-element references — switch to using `collectAnswers`. The `markAssessmentComplete` 3-arg form is sub-project A's pattern; preserve it:

```js
      var allContainer = document.querySelector('.exit-employer-survey-questions') || document.body;
      var answers = IMPACT.collectAnswers(setId, allContainer);
      var v = IMPACT.validateAnswers(setId, answers);
      if (!v.ok) {
        if (v.errors.__minRequired) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: v.errors.__minRequired });
        } else {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please answer the required questions.' });
        }
        Object.keys(v.errors).forEach(function (qId) {
          if (qId === '__minRequired') return;
          var row = allContainer.querySelector('[data-qid="' + qId + '"]');
          if (row) row.classList.add('input--error');
        });
        return;
      }
      // markAssessmentComplete persists the answers payload for re-edit on next open.
      IMPACT.markAssessmentComplete('exit-employer-survey', internId, answers);
```

(`internId` should already exist in the surrounding IIFE from sub-project A's exit-employer-survey work.)

- [ ] **Step 5: Verify**

```bash
grep -c 'class="assessment-question"' Prototypes/PROTOTYPE/exit-employer-survey.html
```

Expected: 0.

```bash
grep -nE 'IMPACT\.renderQuestion|IMPACT\.collectAnswers|markAssessmentComplete' Prototypes/PROTOTYPE/exit-employer-survey.html
```

Expected: 3+ matches.

⚠️ **Same visual-check note as Task 8:** the renderer's checkbox-group + Likert CSS may need adjustment to match exit-employer-survey's hand-tuned styles. Inspect after rendering; if regressions appear, tweak the renderer CSS.

- [ ] **Step 6: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js Prototypes/PROTOTYPE/exit-employer-survey.html
git commit -m "C2b: add exit-employer-survey question set + refactor form

Adds the exit-employer-survey set (9 questions: outcome radio,
yes/no with detail textarea, 1-5 Likert, 2 textareas, 2
checkbox-groups including one with Other-with-reveal). Refactors
exit-employer-survey.html to render from data; save handler now
uses collectAnswers + validateAnswers and persists the payload
via markAssessmentComplete (existing 3-arg form)."
```

---

## 🚦 Gate 2b — review C2b (all 4 forms refactored)

Pause for user review:

- Open each of the 4 forms: `personal-goals.html`, `midpoint-reflection.html`, `participant-feedback.html`, `exit-employer-survey.html?internId=evans` (or any valid internId). Walk through each. Verify:
  - Visual layout matches what was there before (or close enough — minor pixel drift is acceptable; structural breakage is not).
  - All question types render correctly: textarea, short-text, radio, checkbox-group, likert, with proper Other-with-reveal behavior on participant-feedback Q1 and exit-employer-survey Q7.
  - Submitting works. minRequired enforcement triggers when not enough questions are answered.
  - Exit Survey re-opens preserved (sessionStorage payload) — submit, then re-open the page; answers should pre-fill.

If anything's broken, fix it BEFORE moving to C2c (admin editor depends on the renderer working correctly).

User decides: proceed to C2c, or pause / fix.

---

## Task 10: C2c — Build `settings-questions.html` (list page)

The Settings landing for question authoring. 5 rows: 4 editable sets + 1 read-only Competency Rubric placeholder.

**Files:**
- Create: `Prototypes/PROTOTYPE/settings-questions.html`
- Modify: `Prototypes/PROTOTYPE/styles.css` (add `.settings-list__row--readonly`)

- [ ] **Step 1: Append `.settings-list__row--readonly` style to `styles.css`**

Find the existing `/* SETTINGS INLINE-EDITABLE LISTS */` block (added in sub-project B Task 4). After the existing rules, append:

```css

.settings-list__row--readonly {
  opacity: 0.65;
  cursor: default;
}

.settings-list__row--readonly:hover {
  background: transparent;
}

.settings-list__readonly-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm, 4px);
  background: var(--canvas-alt, #F5F7FA);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--muted);
  text-transform: uppercase;
}
```

- [ ] **Step 2: Create `settings-questions.html`**

Create `Prototypes/PROTOTYPE/settings-questions.html` with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Questions — Settings — IMPACT Admin</title>

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
        <span class="micro-label">ADMIN / SETTINGS / QUESTIONS</span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title">QUESTIONS.</h1>
          <p class="page-head__sub">
            Authoring for the program's intern-facing and admin-facing assessment forms.
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
        <div class="detail-header" style="margin-top: 0;">
          <h2 class="detail-header__title">Question Sets</h2>
        </div>

        <table class="assessments" id="questionSetsTable">
          <thead>
            <tr>
              <th style="width: 35%;">Set</th>
              <th style="width: 20%;">Questions</th>
              <th style="width: 25%;">Last Edited</th>
              <th style="width: 20%;"></th>
            </tr>
          </thead>
          <tbody id="questionSetsTbody"></tbody>
        </table>
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
      var tbody = document.getElementById('questionSetsTbody');

      function fmtDate(iso) {
        if (!iso) return '—';
        try {
          var d = new Date(iso);
          return d.toLocaleDateString();
        } catch (e) { return '—'; }
      }

      // Render the 4 editable sets from IMPACT.QUESTION_SETS.
      var html = IMPACT.QUESTION_SETS.map(function (set) {
        return '<tr data-id="' + set.id + '" style="cursor:pointer;">' +
          '<td><div class="col-name"><span class="name-initial">' +
            set.name.slice(0, 2).toUpperCase() + '</span>' + set.name + '</div></td>' +
          '<td>' + set.questions.length + '</td>' +
          '<td>' + fmtDate(set.lastEdited) + '</td>' +
          '<td></td>' +
          '</tr>';
      }).join('');

      // Append the read-only Competency Rubric placeholder row.
      html += '<tr class="settings-list__row--readonly" data-readonly>' +
        '<td><div class="col-name"><span class="name-initial">CR</span>Competency Rubric</div></td>' +
        '<td>—</td>' +
        '<td>Edit on cohort form</td>' +
        '<td><span class="settings-list__readonly-badge">READ-ONLY</span></td>' +
        '</tr>';

      tbody.innerHTML = html;

      // Row click → editor (skip read-only row).
      tbody.addEventListener('click', function (ev) {
        var row = ev.target.closest('tr[data-id]');
        if (!row) return;
        location.href = 'settings-question-set.html?id=' + row.dataset.id;
      });
    })();
  </script>

</body>
</html>
```

- [ ] **Step 3: Verify**

```bash
grep -c 'nav__link--active' Prototypes/PROTOTYPE/settings-questions.html
grep -c 'settings-rail__item--active' Prototypes/PROTOTYPE/settings-questions.html
grep -c 'IMPACT.QUESTION_SETS' Prototypes/PROTOTYPE/settings-questions.html
grep -c 'settings-list__row--readonly' Prototypes/PROTOTYPE/settings-questions.html
```

Expected: 1, 1, 1, 1.

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-questions.html Prototypes/PROTOTYPE/styles.css
git commit -m "C2c: build settings-questions.html — Question Sets list

5-row table: 4 editable sets hydrated from IMPACT.QUESTION_SETS
(name, question count, last edited timestamp from sessionStorage)
+ 1 read-only Competency Rubric placeholder row with a READ-ONLY
badge. Row click on editable sets navigates to
settings-question-set.html?id=<setId>; the read-only row is
non-clickable. Adds .settings-list__row--readonly + the badge
style to styles.css."
```

---

## Task 11: C2c — Build `settings-question-set.html` (per-set editor)

Per-set editor with a single-column layout: set-level config + per-question accordion + type-specific config sub-forms + Add Question type-picker. **No live preview pane** (deferred per the spec).

**Files:**
- Create: `Prototypes/PROTOTYPE/settings-question-set.html`
- Modify: `Prototypes/PROTOTYPE/styles.css` (add accordion styles)

This task is large but its parts are well-bounded. Steps below.

- [ ] **Step 1: Append accordion + type-picker CSS to `styles.css`**

Append to the END of `styles.css`:

```css

/* ============================================================
   QUESTION-SET EDITOR (sub-project C C2c)
   ============================================================ */

.qs-editor-card {
  background: #fff;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 20px 24px;
  margin: 24px 0;
}

.qs-editor-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.qs-editor-card__title {
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--ink);
  margin: 0;
}

.qs-question-row {
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  margin-bottom: 12px;
  background: #fff;
  overflow: hidden;
}

.qs-question-row__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  background: var(--canvas-alt, #F5F7FA);
}

.qs-question-row__head:hover {
  background: #ECF0F5;
}

.qs-question-row__num {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  color: var(--muted);
}

.qs-question-row__label {
  flex: 1;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink);
}

.qs-question-row__type {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 2px 6px;
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm, 4px);
}

.qs-question-row__controls {
  display: flex;
  gap: 4px;
}

.qs-question-row__body {
  padding: 16px;
  display: none;
}

.qs-question-row--expanded .qs-question-row__body {
  display: block;
}

.qs-type-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  border: 1px dashed var(--rule);
  border-radius: var(--radius-md);
}

.qs-type-picker__btn {
  appearance: none;
  background: #fff;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 8px 14px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  cursor: pointer;
  text-transform: uppercase;
  color: var(--ink);
}

.qs-type-picker__btn:hover {
  background: var(--canvas-alt, #F5F7FA);
}

.qs-options-list {
  margin: 8px 0;
}

.qs-options-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto auto auto;
  gap: 8px;
  margin-bottom: 6px;
}

.qs-options-row input.input {
  width: 100%;
}
```

- [ ] **Step 2: Create `settings-question-set.html`**

Create `Prototypes/PROTOTYPE/settings-question-set.html` with this content. It's substantial — about 250 lines — so it's broken into sections (chrome / shell / editor markup / IIFE).

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Edit Question Set — Settings — IMPACT Admin</title>

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
          <a href="settings-questions.html" style="color:inherit; text-decoration:none;">ADMIN / SETTINGS / QUESTIONS</a> / <span data-field="title-name">—</span>
        </span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title"><span data-field="name">—</span>.</h1>
          <p class="page-head__sub">
            Edit questions, types, and options. Changes apply to new submissions.
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
        <!-- Set-level config -->
        <article class="qs-editor-card">
          <div class="qs-editor-card__head">
            <h2 class="qs-editor-card__title">Set Configuration</h2>
            <span class="micro-label">SET INFO</span>
          </div>
          <div class="id-grid id-grid--4">
            <div class="field" style="grid-column: span 2;">
              <label>Set Name</label>
              <input class="input" type="text" id="qs-name" disabled />
            </div>
            <div class="field" style="grid-column: span 2;">
              <label for="qs-min-required">Min. Required (answered count to allow submit)</label>
              <input class="input" type="number" min="0" id="qs-min-required" />
            </div>
          </div>
        </article>

        <!-- Question editor -->
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
        <span class="mono" style="color: var(--navy);">QUESTION SET · EDIT</span>
      </div>
      <div class="action-bar__buttons">
        <a href="settings-questions.html" class="btn btn--outline">Cancel</a>
        <button type="button" class="btn btn--primary" id="qsSaveBtn">
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
      var setId = IMPACT.qs('id');

      // Guard: missing or unknown id, or competency-rubric (deferred).
      if (!setId) {
        IMPACT.toast({ kind: 'danger', label: 'NO QUESTION SET', message: 'Question set id required.' });
        setTimeout(function () { location.href = 'settings-questions.html'; }, 1500);
        return;
      }
      if (setId === 'competency-rubric') {
        IMPACT.toast({ kind: 'danger', label: 'RUBRIC NOT EDITABLE HERE', message: 'Edit role-specific competencies on the cohort form.' });
        setTimeout(function () { location.href = 'settings-questions.html'; }, 1500);
        return;
      }
      var set = IMPACT.questionSetById(setId);
      if (!set) {
        IMPACT.toast({ kind: 'danger', label: 'NO QUESTION SET', message: 'Question set not found.' });
        setTimeout(function () { location.href = 'settings-questions.html'; }, 1500);
        return;
      }

      // Hydrate page-head + set-level config.
      IMPACT.fillText('[data-field="name"]', set.name);
      IMPACT.fillText('[data-field="title-name"]', set.name.toUpperCase());
      document.getElementById('qs-name').value = set.name;
      document.getElementById('qs-min-required').value = set.minRequired;

      // Working copy of questions (mutated as user edits).
      var working = set.questions.map(function (q) {
        return JSON.parse(JSON.stringify(q));
      });

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
        // Returns HTML for the type-specific config sub-form.
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
              '<input class="input qs-field" type="number" min="1" data-field="config.rows" value="' + (cfg.rows || 4) + '" /></div>' +
            '<div class="field" style="grid-column: span 2;"><label>Placeholder</label>' +
              '<input class="input qs-field" type="text" data-field="config.placeholder" value="' + escapeHtml(cfg.placeholder || '') + '" /></div>' +
            '</div>';
        } else if (q.type === 'short-text') {
          typeBody = '<div class="id-grid id-grid--4">' +
            '<div class="field" style="grid-column: span 2;"><label>Placeholder</label>' +
              '<input class="input qs-field" type="text" data-field="config.placeholder" value="' + escapeHtml(cfg.placeholder || '') + '" /></div>' +
            '<div class="field" style="grid-column: span 2;"><label>Max length</label>' +
              '<input class="input qs-field" type="number" min="1" data-field="config.maxLength" value="' + (cfg.maxLength || 200) + '" /></div>' +
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
              '<input class="input qs-field" type="number" data-field="config.min" value="' + (cfg.min || 1) + '" /></div>' +
            '<div class="field"><label>Max</label>' +
              '<input class="input qs-field" type="number" data-field="config.max" value="' + (cfg.max || 5) + '" /></div>' +
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
        // Walk every qs-field input and write its value back into the working array.
        var rows = qsContainer.querySelectorAll('.qs-question-row');
        rows.forEach(function (row, i) {
          var q = working[i];
          if (!q) return;
          row.querySelectorAll('.qs-field').forEach(function (inp) {
            var path = inp.dataset.field;
            if (!path) return;
            var val;
            if (inp.type === 'checkbox') val = !!inp.checked;
            else if (inp.type === 'number') val = parseInt(inp.value, 10);
            else val = inp.value;
            // Path examples: 'label', 'helperText', 'config.rows', 'config.options.2.value'
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

      // Click delegation on the editor.
      qsContainer.addEventListener('click', function (e) {
        var actionBtn = e.target.closest('button[data-q-action], button[data-opt-action], button[data-add-option]');
        if (actionBtn) {
          syncFromInputs();
          var row = actionBtn.closest('.qs-question-row');
          var i = row ? parseInt(row.dataset.index, 10) : -1;
          if (actionBtn.dataset.qAction === 'up' && i > 0) { var t=working[i]; working[i]=working[i-1]; working[i-1]=t; render(); return; }
          if (actionBtn.dataset.qAction === 'down' && i < working.length - 1) { var t2=working[i]; working[i]=working[i+1]; working[i+1]=t2; render(); return; }
          if (actionBtn.dataset.qAction === 'remove') { working.splice(i, 1); render(); return; }
          if (actionBtn.dataset.optAction || actionBtn.dataset.addOption) {
            // Option-list edits: find the question's options array via the closest qs-question-row.
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
        // Toggle accordion.
        var head = e.target.closest('[data-toggle]');
        if (head) {
          var row = head.closest('.qs-question-row');
          if (row) row.classList.toggle('qs-question-row--expanded');
        }
      });

      // Add Question flow.
      addBtn.addEventListener('click', function () {
        typePicker.style.display = typePicker.style.display === 'none' ? 'flex' : 'none';
      });
      typePicker.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-add-type]');
        if (!btn) return;
        syncFromInputs();
        var newType = btn.dataset.addType;
        var newQ = {
          id:         'q-new-' + Math.random().toString(36).slice(2, 8),
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
        render();
        // Auto-expand the new row so admin can fill in the label.
        var rows = qsContainer.querySelectorAll('.qs-question-row');
        if (rows.length) rows[rows.length - 1].classList.add('qs-question-row--expanded');
      });

      // Save flow.
      saveBtn.addEventListener('click', function () {
        syncFromInputs();
        // Validate.
        var errors = [];
        if (working.length === 0) errors.push('At least one question is required.');
        var minReqInput = document.getElementById('qs-min-required');
        var minReq = parseInt(minReqInput.value, 10);
        if (isNaN(minReq) || minReq < 0) errors.push('Min. Required must be a non-negative integer.');
        if (minReq > working.length) errors.push('Min. Required cannot exceed the number of questions.');
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
        // Persist.
        var payload = {
          id:          set.id,
          name:        set.name,
          minRequired: minReq,
          questions:   working
        };
        IMPACT.saveQuestionSet(set.id, payload);
        IMPACT.toast({ kind: 'success', label: 'SAVED', message: set.name + ' updated.' });
        setTimeout(function () { location.href = 'settings-questions.html'; }, 700);
      });

      render();
    })();
  </script>

</body>
</html>
```

- [ ] **Step 3: Verify**

```bash
grep -c 'nav__link--active' Prototypes/PROTOTYPE/settings-question-set.html
grep -c 'settings-rail__item--active' Prototypes/PROTOTYPE/settings-question-set.html
grep -c 'IMPACT.questionSetById\|IMPACT.saveQuestionSet' Prototypes/PROTOTYPE/settings-question-set.html
grep -c 'qs-question-row\|qs-type-picker' Prototypes/PROTOTYPE/settings-question-set.html
```

Expected: 1, 1, ≥2, ≥4.

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-question-set.html Prototypes/PROTOTYPE/styles.css
git commit -m "C2c: build settings-question-set.html — per-set editor

Per-set editor with per-question accordion + type-specific config
sub-forms. Add Question button reveals an inline 6-button type
picker (textarea / short-text / radio / checkbox-group / likert /
rubric-row). Each question row supports up/down reorder + remove.
Save validates non-empty labels, no duplicate ids, options
present and labeled for radio/checkbox-group, minRequired <=
question count. ?id=competency-rubric is hard-blocked with a
'RUBRIC NOT EDITABLE HERE' redirect (deferred). No live preview
pane (deferred per spec)."
```

---

## Task 12: C2c — Sidebar rewires + delete `settings-stub.html`

Update every settings page's sidebar Questions item to point at `settings-questions.html`. After the rewires, `settings-stub.html` has zero inbound links — delete it (and its file).

**Files:**
- Modify: `Prototypes/PROTOTYPE/settings-employers.html`, `settings-employer.html`, `settings-employer-form.html`, `settings-phases.html`, `settings-barriers.html`, `settings-roles.html`, `settings-program-info.html`, `settings-questions.html`, `settings-question-set.html` (already correct from Tasks 10/11 — verify only)
- Delete: `Prototypes/PROTOTYPE/settings-stub.html`

- [ ] **Step 1: Bulk-rewire the Questions sidebar item across the 7 existing settings pages**

```bash
cd "Prototypes/PROTOTYPE" && for f in settings-employers.html settings-employer.html settings-employer-form.html settings-phases.html settings-barriers.html settings-roles.html settings-program-info.html; do
  sed -i 's|<a class="settings-rail__item" href="settings-stub.html?section=questions">Questions</a>|<a class="settings-rail__item" href="settings-questions.html">Questions</a>|' "$f"
done && echo "DONE"
```

- [ ] **Step 2: Verify zero remaining `settings-stub.html` references**

```bash
cd "Prototypes/PROTOTYPE" && grep -nE 'settings-stub\.html' *.html
```

Expected: only `settings-stub.html` matches (the file referencing itself in nav, etc.). All OTHER files should have zero matches.

- [ ] **Step 3: Sanity-check the new hrefs are present**

```bash
cd "Prototypes/PROTOTYPE" && grep -c 'href="settings-questions.html">Questions' settings-employers.html settings-employer.html settings-employer-form.html settings-phases.html settings-barriers.html settings-roles.html settings-program-info.html
```

Each file should report 1.

- [ ] **Step 4: Delete `settings-stub.html`**

```bash
git rm Prototypes/PROTOTYPE/settings-stub.html
```

- [ ] **Step 5: Verify zero remaining references in the codebase**

```bash
cd "Prototypes/PROTOTYPE" && grep -rn 'settings-stub' *.html *.css *.js 2>/dev/null
```

Expected: empty. Any match indicates a file that still references the deleted page.

- [ ] **Step 6: Commit**

```bash
git add Prototypes/PROTOTYPE && git commit -m "C2c: rewire Questions sidebar items + delete settings-stub.html

Sidebar Questions item on the 7 existing settings pages now
points at settings-questions.html (the real page from Task 10).
settings-stub.html had Questions as its last consumer; with that
gone, it has zero inbound links and is deleted from the codebase."
```

---

## Task 13: C2c — Documentation updates

Reflect sub-project C in CLAUDE.md, PRD.md, and the App Outline. Page count drops from 30 (after sub-project B) → 31 (added 2 new pages, deleted 1: net +1). Mock-dataset bullet adds `IMPACT.QUESTION_SETS` and the renderer helpers. New entity bullets in PRD.md. New VIEW sections in App Outline.

**Files:**
- Modify: `CLAUDE.md`
- Modify: `PRD.md`
- Modify: `IMPACT Internship Assessment Portal - App Outline.md`

- [ ] **Step 1: Update CLAUDE.md page count**

Find the line `### Page inventory (30 pages)`. Change to `### Page inventory (31 pages)`.

- [ ] **Step 2: Update CLAUDE.md admin page list**

In the Admin: subsection, remove the bullet for `settings-stub.html` (deleted in Task 12). Add bullets for the 2 new pages immediately after the existing settings-* pages:

Add:
```markdown
- `settings-questions.html` — Question Sets list (Settings → Questions): 4 editable sets + 1 read-only Competency Rubric placeholder
- `settings-question-set.html` — Per-set editor with per-question accordion + type-specific config sub-forms
```

Remove (was added in earlier sub-project):
```markdown
- `settings-stub.html` — Shared placeholder for not-yet-built Settings sections (`?section=<name>`)
```

- [ ] **Step 3: Update CLAUDE.md mock-dataset bullet**

Find the bullet listing IMPACT data structures. Append `IMPACT.QUESTION_SETS` to the list and add the helper trio. The line should now end with something like:

```markdown
…and the `IMPACT.PROGRAM_INFO` singleton (sessionStorage-backed). Lookup helpers: …, `phasesForCohort`, `questionSetById`. The 4 editable question sets are persisted via `IMPACT.saveQuestionSet(setId, payload)` to sessionStorage. The shared `IMPACT.renderQuestion(question, container)`, `IMPACT.collectAnswers(setId, container)`, and `IMPACT.validateAnswers(setId, answers)` helpers drive the data-driven 4 forms (Personal Goals, Midpoint Reflection, Participant Feedback, Exit Employer Survey). The 5th question-bearing form (Competency Rubric) stays bespoke.
```

- [ ] **Step 4: Update PRD.md**

In the data model section, add new entity bullets:

```markdown
- **Question Set** — Authored content for one of 4 intern-facing or admin-facing forms. Fields: `id`, `name`, `minRequired`, `questions` (array). Editable in Settings → Questions.
- **Question** — One row inside a Question Set. Fields: `id`, `type`, `label`, `helperText`, `required`, `config` (type-specific). 6 built-in types: textarea, short-text, radio, checkbox-group, likert, competency-rubric-row. Radio + checkbox-group support an optional "Other-with-text" reveal.
```

In the Screens section, update the Settings entry to mention Questions:

```markdown
… Settings (admin) — Employers, Phases, Barriers, Roles, Program Info, Questions (4-set editor + 1 read-only Competency Rubric placeholder).
```

- [ ] **Step 5: Update App Outline.md**

Find the existing `# SCREEN: Settings` block. After the Program Info VIEW block, append:

```markdown

## VIEW: Questions list (`settings-questions.html`)

ADMIN NAV (Settings active)
PAGE HEAD [ADMIN / SETTINGS / QUESTIONS · "Questions."]
SETTINGS SIDEBAR (Questions active)
TABLE [4 editable sets: Name · Question Count · Last Edited (sessionStorage timestamp or em-dash) | 1 read-only Competency Rubric placeholder row]
ROW CLICK → settings-question-set.html?id=<setId> (read-only row is non-clickable)

## VIEW: Per-set editor (`settings-question-set.html?id=<setId>`)

ADMIN NAV (Settings active)
PAGE HEAD [breadcrumb to Questions list, set name as title]
SETTINGS SIDEBAR (Questions active)
SET CONFIGURATION CARD [Set Name (read-only) · Min. Required (number)]
QUESTION EDITOR CARD [per-question accordion: idx · label · type badge · up/down/remove controls; expanded body shows type-specific config sub-form]
ADD QUESTION FLOW [button reveals 6-type picker: textarea / short-text / radio / checkbox-group / likert / rubric-row → click adds new accordion row, expanded, focused on label input]
ACTION BAR [Cancel · Save Changes (validates non-empty labels, no duplicate ids, options present for radio/checkbox-group, minRequired ≤ question count) → IMPACT.saveQuestionSet]

URL contract: ?id=<setId> required. Missing/unknown → danger toast + 1500ms redirect. ?id=competency-rubric → "RUBRIC NOT EDITABLE HERE" toast + redirect (deferred).
```

- [ ] **Step 6: Verify the doc edits land**

```bash
grep -nE '31 pages|Page inventory \(31' CLAUDE.md
grep -c 'settings-stub' CLAUDE.md
grep -nE 'IMPACT\.QUESTION_SETS|saveQuestionSet|renderQuestion' CLAUDE.md
grep -nE 'Question Set|questionSetById|saveQuestionSet' PRD.md | head -5
grep -nE 'VIEW: Questions list|VIEW: Per-set editor' "IMPACT Internship Assessment Portal - App Outline.md"
```

Each grep should match.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md PRD.md "IMPACT Internship Assessment Portal - App Outline.md"
git commit -m "C2c: update docs for Questions Management (sub-project C)

CLAUDE.md: page count 30 -> 31 (add 2, remove settings-stub).
Admin list adds settings-questions.html + settings-question-set.html;
removes settings-stub.html. Mock-dataset bullet adds IMPACT.QUESTION_SETS,
saveQuestionSet, renderQuestion, collectAnswers, validateAnswers,
questionSetById. PRD.md: new Question Set + Question entity bullets;
Settings screen entry mentions Questions. App Outline: 2 new VIEW
sub-sections under SCREEN: Settings."
```

---

## Task 14: C2c — End-to-end manual integration test

Walk every flow added or modified in sub-project C. Catch cross-task regressions before declaring it done.

**Files:**
- (None — verification only.)

- [ ] **Step 1: Reset to a fresh state**

Close all browser tabs. Open `Prototypes/PROTOTYPE/admin.html` in a fresh tab. Top nav still shows `Home · Interns · Assessments · Self-Assessment Results · Reports · Settings · admin-chip`.

- [ ] **Step 2: Navigate Settings → Questions**

Click Settings → click Questions sidebar item → land on `settings-questions.html`. Confirm:
- Top nav: Settings active.
- Sidebar: Questions active.
- Table shows 5 rows: Personal Goals (5 questions), Midpoint Reflection (6), Participant Feedback (9), Exit Employer Survey (9), Competency Rubric (read-only with "READ-ONLY" badge).
- Hover: editable rows show pointer cursor; read-only row stays default cursor.

- [ ] **Step 3: Open the Personal Goals editor**

Click the Personal Goals row → land on `settings-question-set.html?id=personal-goals`. Confirm:
- Set Name field is filled with "Personal Goals" and disabled.
- Min. Required field is `4`.
- 5 question rows in the editor (collapsed). Each shows idx + label + type badge.
- Click question 5 (the short-text closer) → accordion expands; sub-form shows label, helper text, required toggle, placeholder, max length.
- Edit the label of question 5 from "I want to leave this experience feeling more confident in:" to "I want to leave this experience feeling more confident about:" (one word change).
- Click Save Changes → toast shows "SAVED — Personal Goals updated." → redirect to settings-questions.html.

- [ ] **Step 4: Verify the edit propagates to the intern-facing form**

Open `Prototypes/PROTOTYPE/personal-goals.html` IN THE SAME TAB (e.g., type the URL in the address bar). Scroll to question 5 — confirm the label now reads "I want to leave this experience feeling more confident about:". (sessionStorage propagation is per-tab.)

- [ ] **Step 5: Open the read-only Competency Rubric row**

Return to `settings-questions.html`. Click the Competency Rubric row → nothing happens (read-only).

Try directly: navigate to `settings-question-set.html?id=competency-rubric` → danger toast "RUBRIC NOT EDITABLE HERE" + 1500ms redirect to the list.

- [ ] **Step 6: Add a new question to Midpoint Reflection**

Click Midpoint Reflection row → editor. Click "+ Add Question" → 6-button type picker appears. Click "Textarea" → new question row appended at the bottom, expanded, label input focused.

Fill label: "Test Question — what's your name?". Save Changes → toast → list. Re-open → 7 questions visible.

- [ ] **Step 7: Save validation tests**

In the Midpoint Reflection editor, delete the new test question (× button). Save → succeeds.

In a fresh editor session: clear the label of question 1 → Save → toast "Question 1 has an empty label."

Set Min. Required to 99 → Save → toast "Min. Required cannot exceed the number of questions."

Add a `radio` question with no options → Save → toast "Question N (radio) has no options."

- [ ] **Step 8: Walk all 4 intern-facing forms**

Open each in turn. Confirm visual fidelity, type rendering, Other-with-reveal, Likert pills, save flows. Already done at Gate 2b but worth re-verifying after the Settings edits in Steps 3-4 to confirm nothing regressed.

- [ ] **Step 9: Verify cross-page settings nav**

From `settings-questions.html`, click each sidebar item → land on the right page. From `settings-employers.html`, click Questions → land on `settings-questions.html`. From any settings page, the Questions item is highlighted only when on questions-related pages.

- [ ] **Step 10: Verify no stale references remain**

```bash
cd "Prototypes/PROTOTYPE" && grep -rn 'settings-stub' *.html *.css *.js 2>/dev/null
```

Expected: empty.

```bash
grep -rn 'INTERN_BARRIERS\|cohort\.role\b' Prototypes/PROTOTYPE/ 2>/dev/null
```

Expected: empty (carried over from sub-projects A/B; should still be clean).

- [ ] **Step 11: Final cleanup commit (only if any fixes were made above)**

If steps 1-10 surfaced no issues, skip this step. Otherwise:

```bash
git add <files>
git commit -m "Sub-project C integration fixes — <summary>"
```

---

## 🚦 Gate 2c — review C2c (admin editor + sidebar rewires + stub deletion)

Sub-project C is complete. Pause for user review.

If everything passed Task 14: sub-project C ships. The Settings program (A + B + C) is done; all six sidebar items are real implementations.

If anything's broken: fix before declaring done.

---

## Task 15: Final cross-task code review

Dispatch the code-reviewer subagent for the full sub-project C delta to surface cross-cutting concerns the per-task reviews didn't catch.

**Files:**
- (None — review-only task.)

- [ ] **Step 1: Get the commit range**

Sub-project C started at the spec commit (`75382a0`). Current HEAD includes Task 14's optional fix commit if any.

- [ ] **Step 2: Dispatch the final reviewer**

Use the `superpowers:code-reviewer` subagent with a prompt covering: the full diff, deferred items (live preview, Competency Rubric refactor, etc.), known per-task code-quality flags, and a request for cross-cutting issues + integration concerns.

- [ ] **Step 3: Apply any final-pass fixes**

If the reviewer flags real issues (e.g., a renderer bug that only surfaces in one form, a stale reference somewhere), fix them in a final polish commit. Mirror the sub-project B "polish" commit pattern.

---

## Out of scope (deferred to future passes)

These are explicitly NOT part of this plan. Logged in `docs/BACKLOG.md`.

- Settings → Questions live preview pane.
- Competency Rubric data-driven refactor.
- Versioning of question sets.
- Custom question-type builder.
- Creating new question sets / forms.
- Renaming question sets.
- Per-cohort role-specific competency questions migration.
- Section headers / intermediate copy in question-set data.
- Cross-tab sessionStorage sync.
- Migration of persisted Exit Survey payloads when labels change.

## Known prototype limitations carried into this plan

- New / edited question sets do persist (sessionStorage), but reset when the tab closes.
- Cross-tab divergence: sessionStorage is per-tab; admin edits in tab A won't appear in tab B until reload.
- The Competency Rubric placeholder row in the Settings list is informational only — clicking it does nothing.
- Compound questions (radio + always-visible textarea) are modeled as 2 separate question records with related ids and a shared label prefix (e.g., `pf-supported` + `pf-supported-detail`). Editor sees them as 2 rows; this is a known UX quirk.
- `competency-rubric-row` type exists in the renderer catalog and editor type picker, but no question set actually uses it after C2 (Competency Rubric refactor is deferred).
