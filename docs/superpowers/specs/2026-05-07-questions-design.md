# Questions Management — Design

> **Sub-project C** of the Settings program. Sub-project A delivered the Settings shell + Employers/Cohorts. Sub-project B delivered Phases / Barriers / Roles / Program Info. This spec replaces the last placeholder route — `settings-stub.html?section=questions` — with real implementations across two phases (C1 + C2), separated by an explicit review gate.

---

## Goal

Replace placeholder content in two intern-facing forms with real DOCS-sourced questions (C1), then refactor four of the five question-bearing forms to render from a shared `IMPACT.QUESTION_SETS` data structure with a Settings → Questions admin editor that lets staff edit question wording, types, and options without developer help (C2).

---

## What's in scope

### Phase C1 — DOCS content migration
- **`personal-goals.html`** — replace 7 generic placeholder textareas with 4 reflection prompts + 1 short-text confidence closer, sourced from `DOCS/Documents for Today's Meeting/Personal Goals.docx`.
- **`midpoint-reflection.html`** — replace 8 generic placeholder textareas with 6 reflection prompts, sourced from `DOCS/Documents for Today's Meeting/Midpoint Reflection.docx`.
- No data structure changes. Direct HTML edits + `minRequired` count tweaks in the existing inline validators (Personal Goals: 4-of-7 → 4-of-5; Midpoint: 5-of-8 → 4-of-6).

### Phase C2 — Data-driven forms + Settings → Questions admin UI
- New `IMPACT.QUESTION_SETS` data structure (4 sets). Each set has `{id, name, minRequired, questions[]}`.
- New shared renderer: `IMPACT.renderQuestion(question, container)`, plus `IMPACT.collectAnswers(setId, container)` and `IMPACT.validateAnswers(setId, answers)`.
- 6 built-in question types: `textarea`, `short-text`, `radio`, `checkbox-group`, `likert`, `competency-rubric-row`. `radio` and `checkbox-group` support an optional "Other-with-text" reveal.
- Refactor 4 forms (Personal Goals, Midpoint Reflection, Participant Feedback, Exit Employer Survey) to render their question content from `IMPACT.QUESTION_SETS` via the shared renderer. Each form's identity card, page chrome, modals, action bar, and per-form orchestration (payload shape, redirect target) stays as it is today.
- Settings → Questions UI: list page (5 sets visible — including a read-only Competency Rubric placeholder) + per-set editor with per-question accordion + type-specific config sub-forms.
- sessionStorage persistence via `IMPACT.saveQuestionSet(setId, payload)`, parallel to `saveProgramInfo`.
- Sidebar rail rewires: the Questions item on every settings page now points at `settings-questions.html` (real page) instead of `settings-stub.html?section=questions`.
- Delete `settings-stub.html` after C2 (orphaned — Questions was its last consumer).

---

## What's deferred (logged in `docs/BACKLOG.md`)

- **Settings → Questions live preview pane.** Original design had a sticky right-pane preview that re-renders on every editor change. Dropped to cut C2 complexity; admin verifies edits by opening the intern-facing form in a new tab.
- **Competency Rubric data-driven refactor.** The fifth form stays on its current bespoke implementation. Reason: it's the one form where the renderer must splice two data sources (program-wide Professional Competencies + per-cohort Role-Specific). `competency-rubric` does NOT exist in `IMPACT.QUESTION_SETS` after C2. Settings → Questions list shows it as a 5th row in a read-only / "view source code" state so staff know it exists but can't edit it via this UI. Worth a focused later pass.
- **Versioning of question sets.**
- **Custom question-type builder.**
- **Creating new question sets / forms** (Level B editing only — fixed forms).
- **Renaming question sets** (set name is read-only).
- **Per-cohort role-specific competency questions migration** (stays on the cohort form).
- **Section headers / intermediate copy in question-set data** (page chrome stays in HTML).
- **Cross-tab sessionStorage sync.**

---

## Architecture (C2)

Shared renderer in `app.js` (consistent with the existing `fillText`, `validate`, `wireTableFilter` helpers). Each form keeps its bespoke orchestration but delegates question rendering to the renderer. The Settings editor uses the same renderer where it makes sense (the type-config sub-forms use type-specific UI, not the renderer; the editor doesn't have a live preview, so the renderer is consumed only by the 4 refactored forms).

```
app.js
├── QUESTION_SETS (4 hardcoded defaults + sessionStorage overlay)
├── questionSetById(id)
├── saveQuestionSet(id, payload)            // writes sessionStorage
├── renderQuestion(question, container)     // dispatches to one of 6 _render* helpers
├── collectAnswers(setId, container)        // walks DOM, returns {qId: answer}
├── validateAnswers(setId, answers)         // applies required + minRequired rules

settings-questions.html       // list page (5 rows; competency-rubric row read-only)
settings-question-set.html    // per-set editor, ?id=<setId>

personal-goals.html              // refactored: <div id="questions"></div> + IIFE call
midpoint-reflection.html         // refactored: same
participant-feedback.html        // refactored: same
exit-employer-survey.html        // refactored: same
competency-new.html              // unchanged
competency-edit.html             // unchanged
```

---

## Data model (C2)

### `IMPACT.QUESTION_SETS`

Array of 4 question-set records. The 5th conceptual set (Competency Rubric) is tracked in the Settings list page as a placeholder but has no data structure — the cohort form continues to drive it.

```js
{
  id: 'personal-goals',
  name: 'Personal Goals',
  minRequired: 4,                  // answered count threshold for submit
  questions: [ /* see below */ ]
}
```

Persistence: hardcoded defaults at module init, overlaid by sessionStorage. Same merge pattern as `IMPACT.PROGRAM_INFO`.

### Question record schema

```js
{
  id:         'q-success-look-like',
  type:       'textarea',          // one of 6 built-ins
  label:      'What would success look like for you...',
  helperText: '',                  // optional, rendered as small grey copy under prompt
  required:   false,               // hard-required (separate from set-level minRequired)
  config:     { /* type-specific */ }
}
```

### Type-specific `config` shapes

| Type | Config |
|---|---|
| `textarea` | `{ rows: 4, placeholder: '' }` |
| `short-text` | `{ placeholder: '', maxLength: 200 }` |
| `radio` | `{ options: [{ value, label }, …], otherWithText: false }` |
| `checkbox-group` | `{ options: [{ value, label }, …], otherWithText: false }` |
| `likert` | `{ min: 1, max: 5, leftLabel: 'Very negative', rightLabel: 'Very positive' }` |
| `competency-rubric-row` | `{}` — fixed 3-segment Emerging/Developing/Ready radio + always-visible Notes textarea (used today inside `competency-new.html`; not actually used in `IMPACT.QUESTION_SETS` because Competency Rubric is deferred — type catalog is in place for future use) |

### "Other-with-reveal" sub-feature

When `config.otherWithText: true` on a `radio` or `checkbox-group`, the renderer appends an "Other" option (value `'__other'`) followed by an inline `<input type="text">` that's hidden by default and revealed when "Other" is selected. The collected answer for that question is `{ value: '__other', otherText: '<typed string>' }` instead of a plain string.

### New helpers exported on `window.IMPACT`

`QUESTION_SETS`, `questionSetById`, `saveQuestionSet`, `renderQuestion`, `collectAnswers`, `validateAnswers`.

---

## Phase gates (sub-divided)

The implementation plan structures C2 into three sub-gates rather than one monolithic gate, to surface bugs earlier:

### Gate 1 — after C1 ships
Real DOCS content lives in `personal-goals.html` and `midpoint-reflection.html`. No data structure yet. **Pause.** User opens both forms in a browser, walks through the new questions, signs off on wording. Decide whether to proceed to C2.

### Gate 2a — after the renderer module + Personal Goals refactor (first form only)
`IMPACT.QUESTION_SETS` exists with one entry (`personal-goals`). The renderer module ships in `app.js`. `personal-goals.html` renders from data. **Pause.** Open the form, verify pixel-identical visual to today's hardcoded version. Edit the question array directly in `app.js` (a local debug experiment) — confirm the renderer reflects changes. Catches visual-regression risk early on the simplest form before scaling.

### Gate 2b — after all 4 forms refactor
Three more sets land in `IMPACT.QUESTION_SETS` and the corresponding forms refactor: Midpoint Reflection, Participant Feedback (mixed types — exercises radio, Likert, Yes/No, "Other-with-reveal"), Exit Employer Survey (mixed types — exercises checkbox-group, Likert, Other-with-reveal). **Pause.** All 4 forms visible to interns/admins. Verify visual fidelity on each. Catches the broader "all 6 types render correctly" risk.

### Gate 2c — after the admin editor + sidebar rewires + stub deletion
`settings-questions.html` and `settings-question-set.html` ship. Sidebar Questions item points at the real page. `settings-stub.html` is deleted. **Pause.** Sub-project C done. Decide what's next (sub-project D, or something else).

---

## Pages (C2)

### `settings-questions.html` — Question Sets list

- Page-head: `ADMIN / SETTINGS / QUESTIONS` · "QUESTIONS." · sub-copy "Authoring for the program's intern-facing and admin-facing assessment forms."
- Sidebar rail: Questions active.
- Detail-header: title "Question Sets" (no `+ New` — Level B editing).
- Table (5 rows):
  - 4 editable sets (Personal Goals, Midpoint Reflection, Participant Feedback, Exit Employer Survey): Name · Question Count · Last Edited timestamp from sessionStorage (or em-dash for hardcoded defaults). Row click → `settings-question-set.html?id=<setId>`.
  - 1 read-only Competency Rubric row: Name · Question Count (computed from `IMPACT.QUESTION_SETS['competency-rubric']` if present, else "—") · "Edit on cohort form" (text instead of timestamp). Row is non-clickable; cursor: default. Visual treatment: the row has a `.settings-list__row--readonly` modifier giving it a slightly muted appearance, and a small "READ-ONLY" mono badge in the rightmost cell to telegraph why.

### `settings-question-set.html` — Per-set editor

- URL contract: `?id=<setId>` required. Missing/unknown id, or id pointing at `'competency-rubric'` (deferred), → danger toast `NO QUESTION SET` (or `RUBRIC NOT EDITABLE HERE` for the Competency case) + 1500ms redirect to the list.
- Page-head: breadcrumb `ADMIN / SETTINGS / QUESTIONS / <SET NAME>` · title `<SET NAME>.` · sub-copy "Edit questions, types, and options. Changes apply to new submissions."
- Sidebar rail: Questions active.
- **Single-column main layout** (no preview pane — deferred):
  - **Set-level config** (top): Set Name (read-only display), `minRequired` (number input).
  - **Question editor** (below): card listing one row per question. Each row is an accordion: collapsed shows position + label + type badge; expanded shows the type-specific config sub-form. Per-row controls: up-arrow / down-arrow / remove (×). "+ Add Question" button at the bottom.
  - **Add Question flow**: button opens a small inline picker (no modal needed) with 6 type buttons. Click a type → a new accordion row inserts at the bottom, expanded, focused on the label input.
- **Type-specific config sub-form** rendered when an accordion row is expanded:
  - All types: Prompt label (text input, required), Helper text (textarea, optional), Required toggle.
  - `textarea`: rows (number, default 4), placeholder.
  - `short-text`: placeholder, max length.
  - `radio` / `checkbox-group`: option list (inline-editable rows of `value` + `label` with up/down/remove + "+ Add Option"), "Allow Other-with-text" toggle.
  - `likert`: min, max, left label, right label.
  - `competency-rubric-row`: no extra fields beyond the universal ones (note: this type is in the catalog but the only set that uses it — Competency Rubric — isn't editable in this UI, so this branch is currently unreachable; included for catalog completeness and future Competency-Rubric-refactor work).
- **Action bar:** Cancel · Save Changes. Save validates → `IMPACT.saveQuestionSet(setId, payload)` → success toast → redirect to `settings-questions.html`.
- **Validation-error treatment:** offending question rows auto-expand; offending input gets `.input--error`; toast says "Please fix the highlighted fields."

### Existing pages — sidebar rewires (touch every settings page)

The Questions item across all settings pages currently points at `settings-stub.html?section=questions`. Update to `settings-questions.html`. Pages affected: `settings-employers.html`, `settings-employer.html`, `settings-employer-form.html`, `settings-phases.html`, `settings-barriers.html`, `settings-roles.html`, `settings-program-info.html`, plus the two new `settings-questions.html` and `settings-question-set.html`.

After the rewire, `settings-stub.html` has zero inbound links. Delete it (and its file) at the end of C2.

---

## Form refactors (C2)

Each refactored form keeps its identity card, page chrome, modals, action bar, and per-form orchestration. The hardcoded `<form>` body of inputs collapses to a single `<div id="questions"></div>` placeholder. Each form's IIFE gains:

```js
var setId = 'personal-goals';   // (or 'midpoint-reflection', 'participant-feedback', 'exit-employer-survey')
var container = document.getElementById('questions');
IMPACT.questionSetById(setId).questions.forEach(function (q) {
  IMPACT.renderQuestion(q, container);
});
```

The existing save handler then uses `IMPACT.collectAnswers` and `IMPACT.validateAnswers`:

```js
saveBtn.addEventListener('click', function () {
  var answers = IMPACT.collectAnswers(setId, container);
  var v = IMPACT.validateAnswers(setId, answers);
  if (!v.ok) {
    // Mark each errored question's row, show toast.
    Object.keys(v.errors).forEach(function (qId) {
      var row = container.querySelector('[data-qid="' + qId + '"]');
      if (row) row.classList.add('input--error');
    });
    IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please answer the highlighted questions.' });
    return;
  }
  // Existing payload build + persist + redirect, unchanged.
});
```

### Per-form notes

- **Personal Goals (5 questions, 1 short-text + 4 textarea):** simplest. The "I want to feel more confident in:" closer is a `short-text` type. The "My Focus for This Internship" section header is preserved as page chrome in the HTML, OUTSIDE the `#questions` container — it sits between the 4th and 5th question's render targets. Implementation note: split the container into two adjacent `<div>`s (e.g., `#questions-main` and `#questions-focus`) and split the IIFE's loop accordingly: questions 1-4 render into the first, question 5 into the second.

- **Midpoint Reflection (6 questions, all textarea):** straightforward.

- **Participant Feedback (7 questions, mixed types):** exercises `radio` (Q1 with Other-with-reveal), `likert` (Q2, 5-segment), `radio` (Q3 yes/no, Q6 yes/maybe/no), and "compound" Q4/Q5 patterns. The compound pattern is modeled as **one parent question of type `radio` (yes/no/somewhat) followed by a sibling question of type `textarea`**, both with related ids (e.g., `q-supported` and `q-supported-detail`). The editor sees them as two separate questions; the renderer renders them adjacently. Visual grouping in the form is achieved via the existing CSS class on the surrounding `<div>` and shared label prefix in the data — no schema "group" concept.

- **Exit Employer Survey (8 questions, mixed types):** exercises `checkbox-group` (Q6, Q7 — with Other-with-reveal on Q7), `likert` (Q3, 1-5), and the same compound pattern (Q2). Existing meta-strip (Employer / Position / Start / End / Participant) stays as-is — page chrome, not part of the question set. Existing "Outcome Status" radio (Q1) stays as a `radio` type.

---

## Validation rules (consolidated, C2)

| Surface | Rules |
|---|---|
| Intern-facing forms | `required: true` questions must have an answer. `minRequired` applies across the set (count non-empty answers ≥ minRequired). Type-specific: `short-text` respects maxLength; `radio`/`checkbox-group` "Other" requires the text input when "Other" is selected. Errored rows get `.input--error` class. |
| Settings → Questions editor | Question label non-empty. Every radio/checkbox option has non-empty label + non-empty value. No duplicate question IDs in a set. `minRequired` is a non-negative integer ≤ question count. At least one question (cannot delete to zero). |
| Settings → Questions list | No save/cancel — read-only navigation page. |

---

## Edge cases

- **Question deleted in editor while a draft response is in-flight.** Out of scope (no draft responses in the prototype).
- **Question label edited after a response is persisted.** No versioning per Q4. The Exit Survey's `markAssessmentComplete` payload lives independently of the question set; if labels change, persisted answer keys may end up referring to renamed questions. Acceptable prototype caveat.
- **"Other-with-text" toggled off after responses with "Other" exist.** Same as above — no migration. Renderer just stops offering the option going forward.
- **Set has zero questions** (admin removed them all). Editor blocks save with toast "At least one question is required."
- **`minRequired` > question count.** Editor blocks save with inline error.
- **Two-tab divergence on a single set.** sessionStorage is per-tab; no cross-talk. Acceptable prototype caveat.
- **Admin tries to open `settings-question-set.html?id=competency-rubric`.** Danger toast `RUBRIC NOT EDITABLE HERE — Edit role-specific competencies on the cohort form.` + 1500ms redirect to the list.
- **Renderer encounters a question with an unknown `type`.** Renders an inline error block (`<div class="input--error">Unknown question type: <type></div>`) so the form doesn't silently skip questions. Defensive — shouldn't happen in practice since types are constrained by the editor.

---

## Persistence (prototype-only)

- Hardcoded `IMPACT.QUESTION_SETS` defaults reset on full page reload.
- `IMPACT.saveQuestionSet(setId, payload)` writes to sessionStorage under `impact.settings.questionSets` (single object keyed by setId). Same lifetime as `IMPACT.PROGRAM_INFO`: persists across same-tab navigation, resets on tab close.
- At module init, `IMPACT.QUESTION_SETS` reads sessionStorage and merges over the hardcoded defaults. Per-key merge (one set's edits don't clobber other sets' edits).
- Intern-facing forms always read the live merged `QUESTION_SETS`, so admin edits become visible during the same tab session.

---

## Sub-project boundaries

This spec closes out the Settings program (sub-project A: shell + Employers; sub-project B: Phases / Barriers / Roles / Program Info; sub-project C: Questions). After C2 ships, all six sidebar items in Settings are real:

| Sidebar item | Page | Sub-project |
|---|---|---|
| Employers | settings-employers.html | A |
| Phases | settings-phases.html | B |
| Barriers | settings-barriers.html | B |
| Roles | settings-roles.html | B |
| Program Info | settings-program-info.html | B |
| Questions | settings-questions.html | C |

`settings-stub.html` is deleted at the end of C2 (no remaining consumers).

Sub-project D (responsive audit + hamburger menu) is queued separately; its brainstorming hasn't started.
