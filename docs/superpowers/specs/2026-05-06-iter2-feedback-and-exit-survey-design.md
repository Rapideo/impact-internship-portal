# Iteration 2 — Participant Feedback + Exit Employer Survey Design

**Status:** Approved (brainstormed 2026-05-06)
**Iteration:** 2 of 3 (phased decomposition; iter 1 = unified intern record)
**Scope:** Build two new forms — `participant-feedback.html` (intern-side, public) and `exit-employer-survey.html` (admin-side, per-intern). Wire them into the existing chooser hub and intern record. Defer admin detail viewer pages to iteration 3.

## Goal

The program needs two assessments at the intern's exit:
1. The intern reflects on their experience via a public **Participant Feedback** form.
2. The admin captures the **Exit Employer Survey** on behalf of the employer for that specific intern.

Both forms are sourced faithfully from existing program documents (`Participant Exit Feedback.docx` and `Participant Outcome Form.docx` in the DOCS folder) and use mixed-format fields (radios, checkboxes, 1–5 ratings, free-form text) — not the pure free-form pattern of Personal Goals / Midpoint Reflection.

The Participant Feedback form follows the existing immutable-after-submit pattern. The Exit Employer Survey is editable: admin can save, return later, and update.

## Page inventory

### Created (2)
- **`participant-feedback.html`** — public/intern form. Identity card + 7 mixed-format questions. Routes to `assessment-confirmation.html?type=participant-feedback` on submit.
- **`exit-employer-survey.html`** — admin form. URL contract: `?internId=<id>` (required). Read-only identity meta-strip auto-populated from the intern record + 8 mixed-format questions. Editable: re-loading with the same `?internId=` re-hydrates all controls from the persisted payload.

### Modified
- **`intern-assessments.html`** — add a third card (Participant Feedback). Add a stage-hint label above each card's micro-label: `AT START` / `AT MIDPOINT` / `AT EXIT`. Grid switches from 2-column to fluid `auto-fit`.
- **`app.js`** — extend the assessment helpers to support optional per-intern keying and optional payload persistence (backward compatible with iter 1 callers).
- **`assessment-confirmation.html`** — extend the `copy` table with entries for `participant-feedback` and `exit-employer-survey`.
- **`intern-record.html`'s `renderSelfAssessmentLinks`** (in `app.js`) — Participant Feedback card now reads real status; no longer "Form coming soon."
- **`intern-record.html`'s `renderEvaluationLinks`** (in `app.js`) — Exit Employer Survey card becomes a real `<a class="record-link">` linking to `exit-employer-survey.html?internId=<id>`. Status text reads from `assessmentStatus('exit-employer-survey', internId)`.
- **`styles.css`** — add `.assessment-card__stage` (stage-hint label), grid update for fluid 3-card layout, `.likert-5` (5-segment scale variant of the existing `.segmented`), and any new patterns for the form.
- **`CLAUDE.md`** — page count 21 → 23; add Public section entries for the two new files; update app.js helper bullet to mention extended helpers and new ASSESSMENT_TYPES.

### Untouched / out of scope (deferred to iteration 3)
- Admin detail viewer pages for Personal Goals, Midpoint Reflection, Participant Feedback (read-only views of submissions)
- Site Review (employer-quality survey from `Site Review.docx`) — separate concept, not an exit survey
- Real backend persistence
- Cross-tab / cross-device completion sync
- Validation that the `internId` actually exists when typed by hand (basic check covers this; a hard schema would need real auth)

## Routing & URL contracts

| URL | Page | Behavior |
|---|---|---|
| `participant-feedback.html` | Participant Feedback form | Public form. Identity captured at submission. |
| `assessment-confirmation.html?type=participant-feedback` | Confirmation | Type-specific copy added to existing `copy` table. |
| `exit-employer-survey.html?internId=<id>` | Exit Employer Survey form | Admin form. Identity hydrated from `IMPACT.INTERNS[id]`. |
| `exit-employer-survey.html` (no query) | Same page | Danger toast `"NO INTERN — This survey requires an intern context."`; redirect to `interns-dashboard.html` after 1500ms. |
| `exit-employer-survey.html?internId=<unknown>` | Same page | Same error fallback. |
| `assessment-confirmation.html?type=exit-employer-survey` | Confirmation | Reached after the survey is saved. |

## `participant-feedback.html`

**Shell:** Mirrors `personal-goals.html`/`midpoint-reflection.html`:
- Public top-nav (logo + "Back to assessments" link to `intern-assessments.html`)
- `page-head` with breadcrumb micro-label `PARTICIPANT FEEDBACK / 2026 / ONE SUBMISSION` and Archivo Black title (e.g., `LOOK BACK ON<br/>YOUR JOURNEY.`)
- Identity card (Last Name + Cohort + Zip), reused
- Action bar with Cancel + Submit Participant Feedback
- Confirm modal + inline IIFE (modal close, validate, mark complete, redirect)
- Footer (logo + Home + Intern Assessments + Contact)

**Questions** (7 total — faithful to `Participant Exit Feedback.docx`):

1. **Why are you leaving this internship?** — single-select segmented (radio group). Six options + Other-with-text:
   - `completed-successfully` — Completed successfully
   - `hired-by-employer` — Hired by employer
   - `found-other` — Found other employment
   - `schedule-conflict` — Schedule conflict
   - `not-good-fit` — Workplace was not a good fit
   - `barriers` — Transportation or childcare barriers
   - `other` — Other (when selected, an inline text input is revealed via JS)

2. **Overall, how would you describe your experience?** — 5-segment Likert (`.likert-5`). Labels under each segment: Very negative · Mostly negative · Mixed · Mostly positive · Very positive.

3. **Do you feel more prepared for employment after this experience?** — Yes/No segmented (2-segment).

4. **Did you feel supported during your internship?** — Yes / Somewhat / No segmented (3-segment) + an always-visible "Please explain (optional)" textarea below.

5. **Did you experience any barriers or challenges during this experience?** — Yes/No segmented (2-segment) + an always-visible "If yes, were you able to get your needs addressed?" textarea below.

6. **Would you recommend this internship experience to others?** — Yes / Maybe / No segmented (3-segment).

7. **Is there anything we could improve?** — free-form textarea.

**Validation rules:**
- Identity: last/cohort required; zip required + matches `/^\d{5}$/`.
- At least 4 of the 7 questions must have a non-empty answer (matching the existing Personal Goals / Midpoint Reflection rule). A "non-empty answer" means: a radio is selected, a Likert segment is chosen, OR a textarea has at least one non-whitespace character.

**On submit:**
1. Validate. If invalid, surface inline errors + `toast({kind:'danger', label:'CHECK FIELDS', ...})`. Modal does not open.
2. Open confirm modal.
3. On modal Submit: call `IMPACT.markAssessmentComplete('participant-feedback')` (no internId, no payload — type-only keying matches Personal Goals/Midpoint). Fire success toast. After 700ms, navigate to `assessment-confirmation.html?type=participant-feedback`.

## `exit-employer-survey.html`

**Shell:** Admin top-nav (Home · Interns · Competency · Self-Assessment Results · Reports · admin-chip). Page-head breadcrumb `ADMIN / EVALUATIONS / EXIT EMPLOYER SURVEY`. Read-only `meta-strip` showing intern context auto-populated by an inline IIFE that calls `IMPACT.internById(IMPACT.qs('internId'))` and `IMPACT.cohortById(intern.cohortId)`:

| Meta-strip field | Source |
|---|---|
| Employer | `cohort.employer` |
| Participant | `intern.first + ' ' + intern.last` |
| Position | `cohort.role` |
| Start Date | `intern.start` |
| End Date | `intern.endDate` |

If `internId` is missing or the intern is not found, the IIFE fires the danger toast and redirects (see Routing table above).

**Questions** (8 total — faithful to `Participant Outcome Form.docx`):

1. **Outcome Status** — single-select radio, vertical list (uses the existing `.outcome-check` pattern adapted for radio-style single-select):
   - `hired` — Hired
   - `completed-not-hired` — Completed - Not Hired
   - `extended` — Extended for Additional Training
   - `early-exit-voluntary` — Early Exit - Voluntary
   - `early-exit-employer` — Early Exit - Employer Decision
   - `early-exit-program` — Early Exit - Program Decision

2. **Was the participant offered employment?** — Yes/No segmented (2-segment) + always-visible "If not, primary reason" textarea.

3. **Overall Performance Rating** — 5-segment numbered Likert (1 · 2 · 3 · 4 · 5). Below: small caption "1 = Limited / 5 = Strong."

4. **Strengths** — free-form textarea (3 rows).

5. **Areas for Improvement** — free-form textarea (3 rows).

6. **Work Readiness Indicators** — multi-select checklist (`.outcome-check` pattern, 6 rows in a 2-column grid):
   - `attendance` — Reliable attendance
   - `communication` — Communication
   - `instructions` — Follows instructions
   - `independent` — Works independently
   - `feedback` — Accepts feedback
   - `initiative` — Demonstrates initiative

7. **Barriers Observed** — multi-select checklist (6 rows in a 2-column grid):
   - `transportation` — Transportation
   - `health` — Health Complications
   - `childcare` — Childcare
   - `scheduling` — Scheduling Conflicts
   - `skill-gap` — Skill Gaps
   - `other` — Other (when checked, an inline text input is revealed via JS)

8. **Additional Comments** — free-form textarea (3 rows).

**Validation rules:**
- Outcome Status: required (single-select must have a value).
- Performance Rating: required (Likert must have a segment selected).
- Everything else optional.
- "If not offered, primary reason" textarea is NOT required even when offeredEmployment is "no" (admin may not have a documented reason yet).
- "Other" barriers text input is NOT required even when "other" is checked.

**On submit (new + edit modes):**
1. Validate. If invalid, inline errors + danger toast.
2. Open confirm modal.
3. On modal Submit: assemble the payload object (see "Form payload structure" below). Call `IMPACT.markAssessmentComplete('exit-employer-survey', internId, payload)`. Fire success toast. After 700ms, navigate to `intern-record.html?id=<internId>` (return to the intern's record).

**On load (edit mode):**
On `DOMContentLoaded`, the IIFE checks `IMPACT.assessmentStatus('exit-employer-survey', internId)`. If `completed === true`, walk through `payload` and:
- For radios: `document.querySelector('input[name="outcomeStatus"][value="' + payload.outcomeStatus + '"]').checked = true;`
- For Likert segments: same shape — radios under the hood
- For textareas: `document.getElementById('strengths').value = payload.strengths || '';`
- For checkboxes: iterate `payload.workReadiness` and `payload.barriers`, set each matching checkbox to `checked`
- For "Other" with text: if `'other'` is in `payload.barriers`, reveal the text input AND set its value to `payload.barriersOther`

## `app.js` extensions

### Extended helper signatures

```js
function assessmentStorageKey(type, internId) {
  return 'impact.assessment.' + type + (internId ? '.' + internId : '') + '.completedAt';
}

function assessmentStatus(type, internId) {
  try {
    var raw = window.sessionStorage.getItem(assessmentStorageKey(type, internId));
    if (!raw) return { completed: false, completedAt: null, payload: null };

    // Try to parse as JSON ({ completedAt, payload }); fall back to raw ISO string
    var parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = null; }
    var iso, payload;
    if (parsed && typeof parsed === 'object' && parsed.completedAt) {
      iso = parsed.completedAt;
      payload = parsed.payload || null;
    } else {
      iso = raw;
      payload = null;
    }

    var date = new Date(iso);
    if (isNaN(date.getTime())) return { completed: false, completedAt: null, payload: null };
    return { completed: true, completedAt: date, payload: payload };
  } catch (err) {
    return { completed: false, completedAt: null, payload: null };
  }
}

function markAssessmentComplete(type, internId, payload) {
  try {
    var key = assessmentStorageKey(type, internId);
    var value;
    if (payload) {
      value = JSON.stringify({ completedAt: new Date().toISOString(), payload: payload });
    } else {
      value = new Date().toISOString();
    }
    window.sessionStorage.setItem(key, value);
  } catch (err) {
    // No-op
  }
}
```

**Backward compatibility:** Existing iter 1 callers — `assessmentStatus('personal-goals')` and `markAssessmentComplete('personal-goals')` — continue to work unchanged. They omit `internId` and `payload`; the helpers return the same `{ completed, completedAt }` shape (with an extra `payload: null` they ignore) and write/read plain ISO strings.

### New ASSESSMENT_TYPES entries

```js
const ASSESSMENT_TYPES = {
  PERSONAL_GOALS: 'personal-goals',
  MIDPOINT: 'midpoint-reflection',
  PARTICIPANT_FEEDBACK: 'participant-feedback',     // new
  EXIT_EMPLOYER_SURVEY: 'exit-employer-survey'      // new
};
```

### `renderSelfAssessmentLinks(intern)` update

The existing implementation specifically branched on `item.type === 'participant-feedback'` to render "Form coming soon." Remove that branch. Participant Feedback now follows the same path as the other two (read `assessmentStatus(item.type)`, render "Submitted on [date]" or "Not yet submitted").

### `renderEvaluationLinks(intern)` update

The existing implementation rendered the Exit Employer Survey as an inert `<div class="record-link record-link--placeholder">` with text "Form coming soon." Replace with:

```js
// Exit Employer Survey — real link with per-intern status
if (intern) {
  var exitStatus = assessmentStatus('exit-employer-survey', intern.id);
  var exitCard;
  if (exitStatus.completed) {
    exitCard = document.createElement('a');
    exitCard.className = 'record-link';
    exitCard.href = 'exit-employer-survey.html?internId=' + intern.id;
    exitCard.innerHTML =
      '<div class="record-link__head">' +
        '<span class="record-link__label">EXIT SURVEY</span>' +
        '<span class="record-link__title">Exit Employer Survey</span>' +
      '</div>' +
      '<span class="record-link__status">Submitted on ' +
        formatCompletionDate(exitStatus.completedAt) + ' · Edit</span>';
  } else {
    exitCard = document.createElement('a');
    exitCard.className = 'record-link';
    exitCard.href = 'exit-employer-survey.html?internId=' + intern.id;
    exitCard.innerHTML =
      '<div class="record-link__head">' +
        '<span class="record-link__label">EXIT SURVEY</span>' +
        '<span class="record-link__title">Exit Employer Survey</span>' +
      '</div>' +
      '<span class="record-link__status">Not yet submitted</span>';
  }
  grid.appendChild(exitCard);
} else {
  // New intern (no id yet) — placeholder
  var newExit = document.createElement('div');
  newExit.className = 'record-link record-link--placeholder';
  newExit.innerHTML =
    '<div class="record-link__head">' +
      '<span class="record-link__label">EXIT SURVEY</span>' +
      '<span class="record-link__title">Exit Employer Survey</span>' +
    '</div>' +
    '<span class="record-link__status">Will appear after this intern record is saved</span>';
  grid.appendChild(newExit);
}
```

## `intern-assessments.html` changes

**Markup:** Add a third `<article class="assessment-card" data-assessment="participant-feedback">` block after the Midpoint Reflection card. Each of the three cards gets a new `<span class="assessment-card__stage">AT START</span>` (or `AT MIDPOINT` / `AT EXIT`) above the existing `.assessment-card__meta` micro-label.

```html
<article class="assessment-card" data-assessment="personal-goals">
  <span class="assessment-card__stage">AT START</span>
  <span class="assessment-card__meta">PERSONAL GOALS</span>
  ...
```

**IIFE update:** Extend the `types` array to include `'participant-feedback'`. The existing iteration logic handles the rest (looks up status, swaps the CTA for an inert pill if completed).

## `assessment-confirmation.html` changes

Extend the `copy` table:

```js
'participant-feedback': {
  micro: 'PARTICIPANT FEEDBACK / 2026 / SUBMITTED',
  title: 'Participant Feedback submitted.',
  body:  'Thanks for sharing your reflection. Your cohort administrator can now see your end-of-program feedback.'
},
'exit-employer-survey': {
  micro: 'EXIT EMPLOYER SURVEY / 2026 / SAVED',
  title: 'Exit Employer Survey saved.',
  body:  'The survey has been saved against this intern\'s record. You can return to edit it from the Evaluations panel.'
},
```

Note: the Exit Employer Survey actually redirects to `intern-record.html?id=<internId>` directly on save (not to the confirmation page), but the confirmation entry exists in case a future flow changes that. For this iteration, the entry is unused but harmless.

## CSS additions

```css
/* Stage-hint label on assessment cards */
.assessment-card__stage {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--navy);
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--gold);
  margin-bottom: 12px;
}

/* 5-segment Likert (extension of existing .segmented). The compound
   selector `.segmented.likert-5` is required so the grid override wins
   against the base `.segmented { display: inline-flex; ... }` rule —
   a bare `.likert-5` would tie on specificity and lose on cascade order. */
.segmented.likert-5 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0;
  width: 100%;
}
.segmented.likert-5 .segmented__option label {
  min-width: 0;
  width: 100%;
  padding: 12px 6px;
  font-size: 11px;
}

.likert-caption {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--muted);
  text-align: center;
  margin-top: 8px;
}

/* Updated chooser grid for fluid 3-card layout */
.assessment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin: 32px 0 32px;
}
/* (Drop the existing 720px override — auto-fit handles all breakpoints.) */
```

The existing `.segmented` class already supports 2 / 3-option groups (Yes/No, Yes/Somewhat/No, Yes/Maybe/No, etc.). For the 5-segment Likert, we use `.likert-5` as a wrapper class on the `<div class="segmented">`.

For multi-select checklists in the Exit Employer Survey, we reuse the existing `.outcome-check` pattern in a 2-column grid (the `.barrier-check-list` class from iter 1 already provides this layout, or we can use a similar new class).

## Edge cases & decisions

- **Per-tab limitation for Participant Feedback** — sessionStorage is per-tab; if Bayer submits Participant Feedback in tab A, Evans's record card in the same tab will reflect "Submitted on ..." too. Same documented limitation as iter 1.
- **Re-edit hydration handles missing fields gracefully** — the IIFE uses optional chaining-style `payload.foo || ''` so a partial payload (from a future schema change) still hydrates what it can.
- **"Other" reveal patterns** — when the user types in the "Other" field but later un-selects the parent radio/checkbox, the text input clears. Captured by an `input` event handler on the parent control.
- **Direct URL access to `participant-feedback.html`** — works fine; identity captured at submission.
- **Direct URL access to `exit-employer-survey.html`** — bounces if no `internId`. Documented.
- **Backward compat for iter 1 keys** — `assessmentStatus('personal-goals')` reading a plain ISO timestamp string continues to work via the JSON-parse fallback in the helper.
- **Save without changes (edit mode)** — admin opens the form, sees previous answers, doesn't change anything, hits Save. Result: same payload re-stored, new timestamp. Card on intern record updates timestamp.
- **Delete an Exit Survey?** — Out of scope. There's no delete affordance; admin can only overwrite. If a survey was submitted in error, admin would re-submit with corrected data.

## Manual test plan

1. Open `intern-assessments.html` → 3 cards: Personal Goals (AT START) · Midpoint Reflection (AT MIDPOINT) · Participant Feedback (AT EXIT). All show "Begin …" CTAs in a fresh tab.
2. Resize to mid-tablet (~840px) → cards reflow to 2 columns. Below 720px → 1 column.
3. Click "Begin Participant Feedback" → form loads with identity card + 7 questions (radio groups, 5-segment Likert, Yes/No segments, free-form textareas).
4. Submit empty → CHECK FIELDS toast; modal does not open.
5. Fill identity (Patterson / Eskenazi 2026 / 46208) + select 4 answers across the 7 questions → confirm modal opens.
6. Click Save → success toast → redirect to `assessment-confirmation.html?type=participant-feedback`. Confirmation reads "Participant Feedback submitted."
7. Back to chooser → Participant Feedback card shows "Submitted on [today]."
8. Open `intern-record.html?id=evans` → Self-Assessments panel Participant Feedback card shows "Submitted on [today]" (per-tab cross-intern view, documented).
9. From Evans's intern record, click Exit Employer Survey card → lands on `exit-employer-survey.html?internId=evans`. Identity strip shows Elevate Ventures / Jasmine Evans / Customer Service / 04.09.2026 / 08.31.2026.
10. Submit empty → validation errors on Outcome Status and Rating + danger toast.
11. Fill Outcome=Hired, Rating=4, Strengths="Strong communication", check workReadiness items: attendance + communication, check barriers: transportation → confirm modal → Save → success toast → redirect to `intern-record.html?id=evans`.
12. Evaluations panel Exit Employer Survey card now reads "Submitted on [today] · Edit."
13. Click the survey card again → form loads with `?internId=evans`. Confirm: Outcome=Hired is selected, Rating=4 is selected, Strengths text is filled, attendance + communication checkboxes are checked, transportation checkbox is checked.
14. Change Rating to 5, save → status pill timestamp updates.
15. Visit `intern-record.html?id=bayer` → Exit Employer Survey card shows "Not yet submitted" (per-intern keying).
16. Visit `exit-employer-survey.html` directly (no `?internId=`) → danger toast + redirect to `interns-dashboard.html`.
17. `exit-employer-survey.html?internId=garbage` → same fallback.
18. Print preview on either form → action bar/modal hidden by existing `@media print` rules.
19. Close tab → reopen `intern-assessments.html` → all 3 cards reset to "Begin …" CTAs.

## Known prototype limitations

- Participant Feedback uses per-tab type-only sessionStorage (consistent with Personal Goals / Midpoint Reflection). Different interns in the same browser tab share completion state for Participant Feedback. Documented; deferred until real backend.
- Exit Employer Survey is per-tab per-intern, so re-edit only works within the same browser session. Closing the tab clears the saved survey.
- Re-edit re-renders all questions every time; partial-payload backward compat handles missing fields gracefully.

## Doc updates

- **`CLAUDE.md`** — page count 21 → 23. Public section gets entries for `participant-feedback.html`. (Exit Employer Survey is admin-side, gets an entry under Admin section.) app.js helpers bullet updated to mention extended helpers, the two new ASSESSMENT_TYPES, and the per-intern keying support.
- **`PRD.md`** — extend the existing intern-assessments paragraph to mention three forms. Add a one-paragraph entry for Exit Employer Survey under Evaluations.
- **`App Outline.md`** — add outlines for both new pages (similar shape to the Intern Record outline).
