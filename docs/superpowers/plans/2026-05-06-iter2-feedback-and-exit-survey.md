# Iteration 2 — Participant Feedback + Exit Employer Survey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new assessment forms — `participant-feedback.html` (intern-side, public, 7 mixed-format questions, immutable on submit) and `exit-employer-survey.html` (admin-side, per-intern, 8 mixed-format questions, editable). Wire them into the existing chooser hub (3rd card with `AT START` / `AT MIDPOINT` / `AT EXIT` stage hints) and the intern record's Self-Assessments and Evaluations panels.

**Architecture:** Two new HTML pages reusing the existing prototype's nav / page-head / identity-card / modal / toast primitives. New CSS classes appended to `styles.css` for stage-hint pills and 5-segment Likerts, plus a fluid `auto-fit` chooser grid. The assessment-state helpers in `app.js` are extended with optional per-intern keying and optional payload persistence — backward-compatible with iter 1 callers (Personal Goals + Midpoint Reflection still pass a single `type` argument and read/write plain ISO strings). `renderSelfAssessmentLinks` and `renderEvaluationLinks` (also in `app.js`) gain real status reads/links for the two new forms; the previous "Form coming soon" placeholders are replaced. CLAUDE.md / PRD.md / App Outline.md are updated to reflect the new pages.

**Tech Stack:** Static HTML, vanilla JS (no framework), CSS custom properties, `sessionStorage` (per-tab persistence). **No test runner exists in this repo** (per CLAUDE.md: "No build tooling, no framework, no test runner"). Verification steps in this plan are manual: open the page in a browser, perform the described action, confirm the expected DOM/visual result.

**Spec:** `docs/superpowers/specs/2026-05-06-iter2-feedback-and-exit-survey-design.md`

**Working directory for all paths below:** `C:/Users/matts/OneDrive - Koehler Partners/Projects/IMPACT/Internship Assessment/IMPACT Intretnship Assessment Portal/`

---

## Task 1: Extend assessment helpers in `app.js`

Make `assessmentStorageKey`, `assessmentStatus`, and `markAssessmentComplete` accept an optional `internId` argument (for per-intern keying) and an optional `payload` argument (for editable forms). Existing single-argument callers (`assessmentStatus('personal-goals')` etc.) must continue to work unchanged. Add `PARTICIPANT_FEEDBACK` and `EXIT_EMPLOYER_SURVEY` to `ASSESSMENT_TYPES`.

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js:422-459`

- [ ] **Step 1: Replace the helper block (lines 422–459)**

Open `Prototypes/PROTOTYPE/app.js`. Find the block that starts with `// -------- Assessment completion state (sessionStorage-backed) --------` (currently around line 422) and ends with the closing `}` of `formatCompletionDate` (currently around line 459). Replace the entire block with the following:

```js
  // -------- Assessment completion state (sessionStorage-backed) --------

  const ASSESSMENT_TYPES = {
    PERSONAL_GOALS:        'personal-goals',
    MIDPOINT:              'midpoint-reflection',
    PARTICIPANT_FEEDBACK:  'participant-feedback',
    EXIT_EMPLOYER_SURVEY:  'exit-employer-survey'
  };

  function assessmentStorageKey(type, internId) {
    return 'impact.assessment.' + type + (internId ? '.' + internId : '') + '.completedAt';
  }

  function assessmentStatus(type, internId) {
    try {
      var raw = window.sessionStorage.getItem(assessmentStorageKey(type, internId));
      if (!raw) return { completed: false, completedAt: null, payload: null };

      // Try to parse as JSON ({ completedAt, payload }); fall back to raw ISO string.
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
      // No-op on storage failure (privacy mode, etc.)
    }
  }

  function formatCompletionDate(date) {
    try {
      return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
    } catch (err) {
      return '';
    }
  }
```

The `window.IMPACT = { ... }` export block immediately below already lists `ASSESSMENT_TYPES, assessmentStatus, markAssessmentComplete, formatCompletionDate` — leave that block untouched.

- [ ] **Step 2: Manual verification — backward compatibility (iter 1 callers)**

Open `Prototypes/PROTOTYPE/index.html` in a browser. Open DevTools Console. Run:

```js
sessionStorage.clear();
IMPACT.assessmentStatus('personal-goals')
```

Expected: `{ completed: false, completedAt: null, payload: null }`

Then run:

```js
IMPACT.markAssessmentComplete('personal-goals');
sessionStorage.getItem('impact.assessment.personal-goals.completedAt');
```

Expected: a plain ISO string like `"2026-05-06T..."` (NOT a JSON object — the omitted-payload path must write the bare timestamp so iter 1 storage shape is preserved).

Then:

```js
IMPACT.assessmentStatus('personal-goals')
```

Expected: `{ completed: true, completedAt: Date <today>, payload: null }`

- [ ] **Step 3: Manual verification — new per-intern + payload path**

In the same Console, run:

```js
IMPACT.markAssessmentComplete('exit-employer-survey', 'evans', { outcomeStatus: 'hired', performanceRating: '4' });
sessionStorage.getItem('impact.assessment.exit-employer-survey.evans.completedAt');
```

Expected: a JSON-shaped string like `'{"completedAt":"2026-05-06T...","payload":{"outcomeStatus":"hired","performanceRating":"4"}}'`.

Then:

```js
IMPACT.assessmentStatus('exit-employer-survey', 'evans')
```

Expected: `{ completed: true, completedAt: Date <today>, payload: { outcomeStatus: 'hired', performanceRating: '4' } }`

Then verify per-intern isolation:

```js
IMPACT.assessmentStatus('exit-employer-survey', 'bayer')
```

Expected: `{ completed: false, completedAt: null, payload: null }` (a different intern id reads a different key).

Verify the new types are present:

```js
IMPACT.ASSESSMENT_TYPES.PARTICIPANT_FEEDBACK
IMPACT.ASSESSMENT_TYPES.EXIT_EMPLOYER_SURVEY
```

Expected: `'participant-feedback'` and `'exit-employer-survey'`.

Clean up so we don't pollute downstream tasks:

```js
sessionStorage.clear();
```

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "Extend assessment helpers — optional per-intern keying + payload

assessmentStorageKey(type, internId?), assessmentStatus(type, internId?)
returning {completed, completedAt, payload}, markAssessmentComplete(type,
internId?, payload?). Backward-compatible: existing single-arg callers
(personal-goals, midpoint-reflection) continue to read/write plain ISO
strings. Adds PARTICIPANT_FEEDBACK and EXIT_EMPLOYER_SURVEY to
ASSESSMENT_TYPES."
```

---

## Task 2: Add CSS for stage-hint pills, 5-segment Likert, and fluid chooser grid

Append the iter-2 CSS additions to `styles.css`. These are purely additive — no existing rule is modified except the `.assessment-grid` width override, which is replaced with a fluid `auto-fit` rule.

**Files:**
- Modify: `Prototypes/PROTOTYPE/styles.css`

- [ ] **Step 1: Locate the existing `.assessment-grid` rule**

Open `Prototypes/PROTOTYPE/styles.css`. Search for `.assessment-grid` (Ctrl+F). You will find a block similar to:

```css
.assessment-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin: 32px 0 32px;
}

@media (min-width: 720px) {
  .assessment-grid {
    grid-template-columns: 1fr 1fr;
  }
}
```

Replace **both** the base rule and the `@media (min-width: 720px)` override with:

```css
.assessment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin: 32px 0 32px;
}
```

Delete the `@media (min-width: 720px) { .assessment-grid { ... } }` block entirely. The `auto-fit` rule handles all breakpoints.

- [ ] **Step 2: Append iter-2 additions to the bottom of `styles.css`**

Scroll to the very end of `Prototypes/PROTOTYPE/styles.css`. Add a new section header comment and the iter-2 rules:

```css

/* ============================================================
   ITER 2 — Participant Feedback + Exit Employer Survey
   ============================================================ */

/* Stage-hint label on assessment cards (AT START / AT MIDPOINT / AT EXIT) */
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

/* 5-segment Likert variant of .segmented (used as a wrapper class).
   Stretches to full width and overrides the default 122px min-width per
   segment so all 5 fit cleanly on most desktop widths. */
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

/* Caption beneath a Likert (e.g., "1 = Limited / 5 = Strong") */
.likert-caption {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--muted);
  text-align: center;
  margin-top: 8px;
}

/* Conditional reveal pattern for "Other (please specify)" inputs */
.conditional-reveal {
  margin-top: 12px;
}
.conditional-reveal[hidden] {
  display: none !important;
}
```

- [ ] **Step 3: Manual verification**

Open `Prototypes/PROTOTYPE/intern-assessments.html` in a browser. Confirm the existing 2-card layout still renders (no visual regression — the `auto-fit` rule produces the same 2-up layout at desktop widths).

Resize the browser to roughly 600px wide. Confirm the cards stack to 1 column (the `minmax(280px, 1fr)` should drop to a single column when there isn't room for two 280px cards plus the 24px gap).

Stage-hint pills, the Likert, and the conditional-reveal class are not yet used by any markup; the CSS is verified visually in Task 3, Task 4, and Task 7 respectively.

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/styles.css
git commit -m "Add iter-2 CSS — stage-hint pills, 5-segment Likert, fluid chooser grid

.assessment-card__stage (gold pill), .segmented.likert-5 (5-column grid),
.likert-caption, .conditional-reveal. Replaces the explicit 720px
breakpoint on .assessment-grid with a fluid auto-fit grid that handles
1/2/3-card layouts at all widths."
```

---

## Task 3: Add `?type=participant-feedback` and `?type=exit-employer-survey` copy to `assessment-confirmation.html`

Extend the inline `copy` table in `assessment-confirmation.html` with two new entries so the confirmation page reads correctly when the new forms redirect to it. (The Exit Survey actually redirects to `intern-record.html?id=<id>` directly, but the entry exists in case a future flow uses it.)

**Files:**
- Modify: `Prototypes/PROTOTYPE/assessment-confirmation.html:102-113`

- [ ] **Step 1: Replace the `copy` object literal**

Open `Prototypes/PROTOTYPE/assessment-confirmation.html`. Find the `var copy = { ... };` block inside the inline `<script>` tag near the bottom (currently around lines 102–113). Replace it with:

```js
      var copy = {
        'personal-goals':      {
          micro: 'PERSONAL GOALS / 2026 / SUBMITTED',
          title: 'Personal Goals submitted.',
          body:  'Thanks for sharing your goals. Your cohort administrator can now see your starting reflection.'
        },
        'midpoint-reflection': {
          micro: 'MIDPOINT REFLECTION / 2026 / SUBMITTED',
          title: 'Midpoint Reflection submitted.',
          body:  'Thanks for the thoughtful reflection. Your cohort administrator can now see your mid-program update.'
        },
        'participant-feedback': {
          micro: 'PARTICIPANT FEEDBACK / 2026 / SUBMITTED',
          title: 'Participant Feedback submitted.',
          body:  'Thanks for sharing your reflection. Your cohort administrator can now see your end-of-program feedback.'
        },
        'exit-employer-survey': {
          micro: 'EXIT EMPLOYER SURVEY / 2026 / SAVED',
          title: 'Exit Employer Survey saved.',
          body:  'The survey has been saved against this intern\'s record. You can return to edit it from the Evaluations panel.'
        }
      };
```

- [ ] **Step 2: Manual verification**

Open `Prototypes/PROTOTYPE/assessment-confirmation.html?type=participant-feedback` in a browser. Confirm:
- micro-label reads `PARTICIPANT FEEDBACK / 2026 / SUBMITTED`
- title reads `Participant Feedback submitted.`
- body starts `Thanks for sharing your reflection.`

Open `Prototypes/PROTOTYPE/assessment-confirmation.html?type=exit-employer-survey`. Confirm:
- micro-label reads `EXIT EMPLOYER SURVEY / 2026 / SAVED`
- title reads `Exit Employer Survey saved.`

Open `Prototypes/PROTOTYPE/assessment-confirmation.html?type=personal-goals` (regression check). Confirm the title still reads `Personal Goals submitted.` (iter 1 entry still works).

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/assessment-confirmation.html
git commit -m "Add confirmation-page copy for participant-feedback + exit-employer-survey

Extend the inline copy table so the two iter-2 forms render the right
micro-label, title, and body when redirected via ?type=...."
```

---

## Task 4: Build `participant-feedback.html` (intern-side, public)

Create the new public form. Mirrors the shell of `personal-goals.html` (top nav with "Back to assessments", page-head, identity card, action bar, confirm modal, footer). Replaces the 7-textarea pattern with the 7 mixed-format questions from `Participant Exit Feedback.docx` (radio group with Other-with-text reveal, 5-segment Likert, Yes/No, 3-segment, free-form textarea).

**Files:**
- Create: `Prototypes/PROTOTYPE/participant-feedback.html`

- [ ] **Step 1: Create the file with full markup**

Create the file `Prototypes/PROTOTYPE/participant-feedback.html` with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Participant Feedback — IMPACT 2026</title>

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
        <a href="intern-assessments.html" class="back-link">&larr; Back to assessments</a>
      </nav>
    </div>
  </header>

  <!-- PAGE HEAD -->
  <section class="page-head">
    <div class="container">
      <div class="page-head__breadcrumb">
        <span class="micro-label">PARTICIPANT FEEDBACK / 2026 / ONE SUBMISSION</span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title">LOOK BACK ON<br/>YOUR JOURNEY.</h1>
          <p class="page-head__sub">
            A short reflection on your internship experience. One submission per intern, so take
            your time and answer honestly.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- FORM -->
  <section class="assessment-wrap">
    <div class="container">

      <!-- Identity card -->
      <div class="identity-card">
        <div class="identity-card__head">
          <h3 class="identity-card__title">Identity</h3>
          <span class="micro-label">UNIQUE KEY · LAST NAME + COHORT + ZIPCODE</span>
        </div>
        <div class="id-grid">
          <div class="field">
            <label for="last">Last Name</label>
            <input class="input" id="last" type="text" placeholder="e.g., Patterson" />
          </div>
          <div class="field">
            <label for="cohort">Cohort</label>
            <select class="select" id="cohort">
              <option value="">Select cohort</option>
              <option>Eskenazi 2026</option>
              <option>TTT 2026</option>
              <option>Habitat 2026</option>
              <option>Elevate 2026</option>
              <option>Geminus 2026</option>
              <option>Health Link 2026</option>
            </select>
          </div>
          <div class="field">
            <label for="zip">Zipcode</label>
            <input class="input" id="zip" type="text" inputmode="numeric" maxlength="5" placeholder="46204" />
          </div>
        </div>
      </div>

      <!-- Questions -->
      <div class="rubric">

        <!-- Q1: Why are you leaving? (radio + Other-with-text) -->
        <div class="assessment-question" data-question="1">
          <div class="assessment-question__head">
            <span class="assessment-question__num">01</span>
            <div>
              <span class="assessment-question__label">Question 01</span>
              <p class="assessment-question__text">Why are you leaving this internship?</p>
            </div>
          </div>
          <div class="barrier-check-list" role="radiogroup" aria-label="Reason for leaving">
            <div class="outcome-check"><input type="radio" name="reason" id="reason-completed-successfully" value="completed-successfully" /><label for="reason-completed-successfully">Completed successfully</label></div>
            <div class="outcome-check"><input type="radio" name="reason" id="reason-hired-by-employer" value="hired-by-employer" /><label for="reason-hired-by-employer">Hired by employer</label></div>
            <div class="outcome-check"><input type="radio" name="reason" id="reason-found-other" value="found-other" /><label for="reason-found-other">Found other employment</label></div>
            <div class="outcome-check"><input type="radio" name="reason" id="reason-schedule-conflict" value="schedule-conflict" /><label for="reason-schedule-conflict">Schedule conflict</label></div>
            <div class="outcome-check"><input type="radio" name="reason" id="reason-not-good-fit" value="not-good-fit" /><label for="reason-not-good-fit">Not a good fit</label></div>
            <div class="outcome-check"><input type="radio" name="reason" id="reason-barriers" value="barriers" /><label for="reason-barriers">Transportation/childcare barriers</label></div>
            <div class="outcome-check"><input type="radio" name="reason" id="reason-other" value="other" /><label for="reason-other">Other</label></div>
          </div>
          <div class="conditional-reveal" id="reason-other-wrap" hidden>
            <input class="input" type="text" id="reason-other-text" placeholder="Please describe…" />
          </div>
        </div>

        <!-- Q2: Overall experience (5-segment Likert) -->
        <div class="assessment-question" data-question="2">
          <div class="assessment-question__head">
            <span class="assessment-question__num">02</span>
            <div>
              <span class="assessment-question__label">Question 02</span>
              <p class="assessment-question__text">Overall, how would you describe your experience?</p>
            </div>
          </div>
          <div class="segmented likert-5" role="radiogroup" aria-label="Overall experience">
            <div class="segmented__option"><input type="radio" name="overall" id="overall-1" value="1" /><label for="overall-1">Very negative</label></div>
            <div class="segmented__option"><input type="radio" name="overall" id="overall-2" value="2" /><label for="overall-2">Mostly negative</label></div>
            <div class="segmented__option"><input type="radio" name="overall" id="overall-3" value="3" /><label for="overall-3">Mixed</label></div>
            <div class="segmented__option"><input type="radio" name="overall" id="overall-4" value="4" /><label for="overall-4">Mostly positive</label></div>
            <div class="segmented__option"><input type="radio" name="overall" id="overall-5" value="5" /><label for="overall-5">Very positive</label></div>
          </div>
        </div>

        <!-- Q3: More prepared? (Yes/No) -->
        <div class="assessment-question" data-question="3">
          <div class="assessment-question__head">
            <span class="assessment-question__num">03</span>
            <div>
              <span class="assessment-question__label">Question 03</span>
              <p class="assessment-question__text">Do you feel more prepared for employment after this experience?</p>
            </div>
          </div>
          <div class="segmented" role="radiogroup" aria-label="More prepared">
            <div class="segmented__option"><input type="radio" name="prepared" id="prepared-yes" value="yes" /><label for="prepared-yes">Yes</label></div>
            <div class="segmented__option"><input type="radio" name="prepared" id="prepared-no" value="no" /><label for="prepared-no">No</label></div>
          </div>
        </div>

        <!-- Q4: Supported? (Yes/Somewhat/No + textarea) -->
        <div class="assessment-question" data-question="4">
          <div class="assessment-question__head">
            <span class="assessment-question__num">04</span>
            <div>
              <span class="assessment-question__label">Question 04</span>
              <p class="assessment-question__text">Did you feel supported during your internship?</p>
            </div>
          </div>
          <div class="segmented" role="radiogroup" aria-label="Felt supported">
            <div class="segmented__option"><input type="radio" name="supported" id="supported-yes" value="yes" /><label for="supported-yes">Yes</label></div>
            <div class="segmented__option"><input type="radio" name="supported" id="supported-somewhat" value="somewhat" /><label for="supported-somewhat">Somewhat</label></div>
            <div class="segmented__option"><input type="radio" name="supported" id="supported-no" value="no" /><label for="supported-no">No</label></div>
          </div>
          <textarea class="assessment-question__input" id="supported-explain" rows="3" placeholder="Please explain (optional)…" style="margin-top: 12px;"></textarea>
        </div>

        <!-- Q5: Barriers? (Yes/No + textarea) -->
        <div class="assessment-question" data-question="5">
          <div class="assessment-question__head">
            <span class="assessment-question__num">05</span>
            <div>
              <span class="assessment-question__label">Question 05</span>
              <p class="assessment-question__text">Did you experience any barriers or challenges during this experience?</p>
            </div>
          </div>
          <div class="segmented" role="radiogroup" aria-label="Experienced barriers">
            <div class="segmented__option"><input type="radio" name="barriers-experienced" id="barriers-experienced-yes" value="yes" /><label for="barriers-experienced-yes">Yes</label></div>
            <div class="segmented__option"><input type="radio" name="barriers-experienced" id="barriers-experienced-no" value="no" /><label for="barriers-experienced-no">No</label></div>
          </div>
          <textarea class="assessment-question__input" id="barriers-explain" rows="3" placeholder="If yes, were you able to get your needs addressed?" style="margin-top: 12px;"></textarea>
        </div>

        <!-- Q6: Recommend? (Yes/Maybe/No) -->
        <div class="assessment-question" data-question="6">
          <div class="assessment-question__head">
            <span class="assessment-question__num">06</span>
            <div>
              <span class="assessment-question__label">Question 06</span>
              <p class="assessment-question__text">Would you recommend this internship experience to others?</p>
            </div>
          </div>
          <div class="segmented" role="radiogroup" aria-label="Would recommend">
            <div class="segmented__option"><input type="radio" name="recommend" id="recommend-yes" value="yes" /><label for="recommend-yes">Yes</label></div>
            <div class="segmented__option"><input type="radio" name="recommend" id="recommend-maybe" value="maybe" /><label for="recommend-maybe">Maybe</label></div>
            <div class="segmented__option"><input type="radio" name="recommend" id="recommend-no" value="no" /><label for="recommend-no">No</label></div>
          </div>
        </div>

        <!-- Q7: Anything to improve? (free-form) -->
        <div class="assessment-question" data-question="7">
          <div class="assessment-question__head">
            <span class="assessment-question__num">07</span>
            <div>
              <span class="assessment-question__label">Question 07</span>
              <p class="assessment-question__text">Is there anything we could improve?</p>
              <span class="assessment-question__hint">A few sentences is fine.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" id="improve" rows="4" placeholder="Your response…"></textarea>
        </div>

      </div>
    </div>
  </section>

  <!-- ACTION BAR -->
  <div class="action-bar">
    <div class="action-bar__inner">
      <div class="action-bar__status">
        <span class="mono" style="color: var(--navy);">PARTICIPANT FEEDBACK · ONE SUBMISSION</span>
      </div>
      <div class="action-bar__buttons">
        <a href="intern-assessments.html" class="btn btn--outline">Cancel</a>
        <button type="button" class="btn btn--primary" data-action="submit-assessment">
          Submit Participant Feedback
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
        <a href="index.html">Home</a>
        <a href="intern-assessments.html">Intern Assessments</a>
        <a href="#">Contact</a>
      </div>
      <div class="footer__meta">&copy; 2026 IMPACT / Indiana</div>
    </div>
  </footer>

  <!-- MODAL: Submit Confirmation -->
  <div class="modal" id="submitModal" role="dialog" aria-modal="true" hidden>
    <div class="modal__overlay" data-close></div>
    <div class="modal__card">
      <span class="modal__label">CONFIRM SUBMISSION</span>
      <h3 class="modal__title">Submit your Participant Feedback?</h3>
      <p class="modal__body">
        Your responses will be locked once submitted. You won't be able to edit them afterward.
      </p>
      <div class="modal__actions">
        <button type="button" class="btn btn--outline" data-close>Keep Editing</button>
        <button type="button" class="btn btn--primary" data-action="confirm-submit">
          Submit
          <span class="btn__arrow">&rarr;</span>
        </button>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
  <script>
    (function () {
      var ASSESSMENT_TYPE = 'participant-feedback';

      // Modal close (overlay + Escape)
      document.addEventListener('click', function (e) {
        var c = e.target.closest('[data-close]');
        if (c) { var m = c.closest('.modal'); if (m) m.hidden = true; }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal:not([hidden])').forEach(function (m) { m.hidden = true; });
        }
      });

      // Q1 "Other" reveal: show/hide the text input based on the radio selection.
      var reasonRadios = document.querySelectorAll('input[name="reason"]');
      var reasonOtherWrap = document.getElementById('reason-other-wrap');
      var reasonOtherInput = document.getElementById('reason-other-text');
      reasonRadios.forEach(function (r) {
        r.addEventListener('change', function () {
          if (r.checked && r.value === 'other') {
            reasonOtherWrap.hidden = false;
          } else if (r.checked) {
            reasonOtherWrap.hidden = true;
            reasonOtherInput.value = '';
          }
        });
      });

      // "Has answer?" check used by both the answered-count rule and per-question scan.
      function questionHasAnswer(num) {
        switch (num) {
          case 1:
            var reason = document.querySelector('input[name="reason"]:checked');
            if (!reason) return false;
            if (reason.value === 'other') return reasonOtherInput.value.trim().length > 0;
            return true;
          case 2: return !!document.querySelector('input[name="overall"]:checked');
          case 3: return !!document.querySelector('input[name="prepared"]:checked');
          case 4:
            return !!document.querySelector('input[name="supported"]:checked')
                || document.getElementById('supported-explain').value.trim().length > 0;
          case 5:
            return !!document.querySelector('input[name="barriers-experienced"]:checked')
                || document.getElementById('barriers-explain').value.trim().length > 0;
          case 6: return !!document.querySelector('input[name="recommend"]:checked');
          case 7: return document.getElementById('improve').value.trim().length > 0;
          default: return false;
        }
      }

      // Submit click → validate → open confirm modal
      document.querySelector('[data-action="submit-assessment"]').addEventListener('click', function () {
        var idValid = IMPACT.validate([
          { selector: '#last',   required: true },
          { selector: '#cohort', required: true },
          { selector: '#zip',    required: true, pattern: /^\d{5}$/, message: '5 digits' }
        ]);
        if (!idValid) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please fill in your identity before submitting.' });
          return;
        }
        var answered = 0;
        for (var i = 1; i <= 7; i++) { if (questionHasAnswer(i)) answered++; }
        if (answered < 4) {
          IMPACT.toast({ kind: 'danger', label: 'INCOMPLETE', message: 'Please answer at least 4 questions before submitting.' });
          return;
        }
        document.getElementById('submitModal').hidden = false;
      });

      // Confirm modal "Submit" → mark complete (type-only key, no payload) → toast → confirmation page
      document.querySelector('[data-action="confirm-submit"]').addEventListener('click', function () {
        IMPACT.markAssessmentComplete(ASSESSMENT_TYPE);
        IMPACT.toast({ kind: 'success', label: 'SUBMITTED', message: 'Your Participant Feedback has been recorded.' });
        setTimeout(function () {
          location.href = 'assessment-confirmation.html?type=' + ASSESSMENT_TYPE;
        }, 700);
      });
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Manual verification — empty submit**

Open `Prototypes/PROTOTYPE/participant-feedback.html` in a browser. Click "Submit Participant Feedback" without filling anything. Expected:
- Inline error highlights on Last Name, Cohort, Zip.
- Bottom-right toast "CHECK FIELDS — Please fill in your identity before submitting."
- Modal does NOT open.

- [ ] **Step 3: Manual verification — identity but <4 questions**

Fill Last Name=`Patterson`, Cohort=`Eskenazi 2026`, Zip=`46208`. Answer only Q3 (click "Yes"). Click Submit. Expected:
- No identity errors.
- Toast "INCOMPLETE — Please answer at least 4 questions before submitting."
- Modal does NOT open.

- [ ] **Step 4: Manual verification — Q1 "Other" reveal**

Click the "Other" segment under Q1. Expected: a single-line text input appears below the radio group. Click any other Q1 segment. Expected: the text input disappears and any text in it is cleared.

- [ ] **Step 5: Manual verification — happy path**

With identity still filled, answer Q1 (Completed successfully), Q2 (Mixed), Q3 (Yes), Q7 ("More structure on day 1 would help."). That's 4 answers. Click Submit. Expected:
- Confirm modal opens with title "Submit your Participant Feedback?"
- Click "Submit" inside the modal.
- Success toast "SUBMITTED — Your Participant Feedback has been recorded."
- After ~700ms, page navigates to `assessment-confirmation.html?type=participant-feedback`.
- Confirmation page reads "Participant Feedback submitted." (verifies Task 3 wiring).

In DevTools Console, verify:

```js
sessionStorage.getItem('impact.assessment.participant-feedback.completedAt');
```

Expected: a plain ISO string (NOT JSON — Participant Feedback uses the type-only no-payload path).

Clean up:

```js
sessionStorage.clear();
```

- [ ] **Step 6: Commit**

```bash
git add Prototypes/PROTOTYPE/participant-feedback.html
git commit -m "Add participant-feedback.html — intern-side exit reflection

7 mixed-format questions sourced from Participant Exit Feedback.docx:
reason (radio + Other-with-text), overall (5-segment Likert), prepared
(Yes/No), supported (Yes/Somewhat/No + textarea), barriers (Yes/No +
textarea), recommend (Yes/Maybe/No), improve (free-form). Identity card
+ 4-of-7 answered rule + confirm modal + immutable submit. Routes to
assessment-confirmation.html?type=participant-feedback."
```

---

## Task 5: Add the Participant Feedback card to `intern-assessments.html`

Add a third `<article class="assessment-card">` for Participant Feedback after Midpoint Reflection. Add `<span class="assessment-card__stage">` pills (`AT START` / `AT MIDPOINT` / `AT EXIT`) above each card's existing `.assessment-card__meta` line. Update the inline IIFE's `types` array to include `'participant-feedback'` so the "Submitted on …" pill swap works for the third card.

**Files:**
- Modify: `Prototypes/PROTOTYPE/intern-assessments.html:36-87` and `:107-109`

- [ ] **Step 1: Update the page-head subtitle**

Open `Prototypes/PROTOTYPE/intern-assessments.html`. Find the current `<p class="page-head__sub">` block (around lines 37–40):

```html
<p class="page-head__sub">
  You'll complete two reflections during the program — one at the start to set your goals,
  and another at the midpoint to take stock of your progress. Pick the one you're ready for.
</p>
```

Replace with:

```html
<p class="page-head__sub">
  You'll complete three reflections during the program — one at the start to set your goals,
  one at the midpoint to take stock, and one at the end to share what worked. Pick the one
  you're ready for.
</p>
```

- [ ] **Step 2: Replace the `<div class="assessment-grid">` block with the 3-card version**

Find the entire `<div class="assessment-grid"> ... </div>` block (currently lines 49–81). Replace it with the following 3-card version (note the `assessment-card__stage` pill on each card):

```html
      <div class="assessment-grid">

        <article class="assessment-card" data-assessment="personal-goals">
          <span class="assessment-card__stage">AT START</span>
          <span class="assessment-card__meta">PERSONAL GOALS</span>
          <h2 class="assessment-card__title">Set your starting line.</h2>
          <p class="assessment-card__body">
            Capture what you're hoping to learn, the skills you want to build, and how you'll know
            you're making progress. Submit this in your first weeks.
          </p>
          <div class="assessment-card__status" data-status-slot>
            <a href="personal-goals.html" class="btn btn--primary">
              Begin Personal Goals
              <span class="btn__arrow">&rarr;</span>
            </a>
          </div>
        </article>

        <article class="assessment-card" data-assessment="midpoint-reflection">
          <span class="assessment-card__stage">AT MIDPOINT</span>
          <span class="assessment-card__meta">MIDPOINT REFLECTION</span>
          <h2 class="assessment-card__title">Reflect on the journey.</h2>
          <p class="assessment-card__body">
            Look back at your goals, what's gone well, what's been hard, and where you want to focus
            for the second half. Submit this around the midpoint of your internship.
          </p>
          <div class="assessment-card__status" data-status-slot>
            <a href="midpoint-reflection.html" class="btn btn--primary">
              Begin Midpoint Reflection
              <span class="btn__arrow">&rarr;</span>
            </a>
          </div>
        </article>

        <article class="assessment-card" data-assessment="participant-feedback">
          <span class="assessment-card__stage">AT EXIT</span>
          <span class="assessment-card__meta">PARTICIPANT FEEDBACK</span>
          <h2 class="assessment-card__title">Look back on your journey.</h2>
          <p class="assessment-card__body">
            A short reflection on your experience — what went well, what was hard, and what you'd
            recommend. Submit this near the end of your internship.
          </p>
          <div class="assessment-card__status" data-status-slot>
            <a href="participant-feedback.html" class="btn btn--primary">
              Begin Participant Feedback
              <span class="btn__arrow">&rarr;</span>
            </a>
          </div>
        </article>

      </div>
```

- [ ] **Step 3: Update the inline status-hydration script's `types` array**

Find the inline IIFE near the bottom of the file (currently lines 107–123):

```js
var types = ['personal-goals', 'midpoint-reflection'];
```

Replace with:

```js
var types = ['personal-goals', 'midpoint-reflection', 'participant-feedback'];
```

The rest of the IIFE (status lookup → swap CTA for "Submitted on …" pill) needs no changes; it iterates whatever the array contains.

- [ ] **Step 4: Manual verification — fresh tab, 3 cards**

In a fresh browser tab (or after `sessionStorage.clear()`), open `Prototypes/PROTOTYPE/intern-assessments.html`. Expected:
- Three cards in a row (or wrapped depending on viewport): Personal Goals, Midpoint Reflection, Participant Feedback.
- Each card has a small gold pill above its micro-label: `AT START`, `AT MIDPOINT`, `AT EXIT`.
- Each card shows a "Begin …" primary button.
- Subtitle reads "You'll complete three reflections during the program …".

- [ ] **Step 5: Manual verification — completed-state pill swap**

In DevTools Console, run:

```js
IMPACT.markAssessmentComplete('participant-feedback');
location.reload();
```

Expected: Participant Feedback card now shows a "Submitted on [today]" pill instead of the Begin button. The other two cards still show Begin buttons.

Clean up:

```js
sessionStorage.clear();
location.reload();
```

- [ ] **Step 6: Manual verification — responsive reflow**

Resize the browser window. Expected breakpoints:
- ~1100px+: 3 cards in a row
- ~720–1000px: 2 cards on top, 1 below (auto-fit)
- <600px: 1 column

- [ ] **Step 7: Commit**

```bash
git add Prototypes/PROTOTYPE/intern-assessments.html
git commit -m "Add Participant Feedback card to chooser + AT START/MIDPOINT/EXIT pills

Third card on intern-assessments.html links to participant-feedback.html.
Each card now shows a stage-hint pill above its micro-label so interns
can scan when each assessment is meant to happen. Status-hydration IIFE
extends to all three types."
```

---

## Task 6: Update `renderSelfAssessmentLinks` to render real Participant Feedback status

Currently `renderSelfAssessmentLinks` has a special-case branch for `participant-feedback` that always renders "Form coming soon." Remove that branch so PF follows the same path as Personal Goals and Midpoint Reflection (read `assessmentStatus(item.type)`, render "Submitted on [date] · Detail view coming soon" or "Not yet submitted").

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js:330-365`

- [ ] **Step 1: Replace the function body**

Open `Prototypes/PROTOTYPE/app.js`. Find `function renderSelfAssessmentLinks(intern) { ... }` (currently around lines 330–365). Replace the entire function with:

```js
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
```

The only change vs. the existing implementation is the removal of the `else if (item.type === 'participant-feedback')` branch. The rest is byte-identical.

- [ ] **Step 2: Manual verification — Not yet submitted state**

Open `Prototypes/PROTOTYPE/intern-record.html?id=evans` in a browser (in a fresh tab, with empty `sessionStorage`). Scroll to the "Intern Self-Assessments" panel (panel #5). Expected: three cards — Personal Goals, Mid-Point Goals, Participant Feedback. The Participant Feedback card now reads "Not yet submitted" instead of "Form coming soon".

- [ ] **Step 3: Manual verification — Submitted state**

In DevTools Console, run:

```js
IMPACT.markAssessmentComplete('participant-feedback');
location.reload();
```

Expected: the Participant Feedback card on the intern record now reads "Submitted on [today] · Detail view coming soon".

Clean up:

```js
sessionStorage.clear();
```

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "Render real Participant Feedback status in intern record self-assessments

Remove the 'Form coming soon' special-case in renderSelfAssessmentLinks
now that participant-feedback.html exists. PF cards on intern-record
now read 'Submitted on [date]' or 'Not yet submitted' like the other
two self-assessment types."
```

---

## Task 7: Build `exit-employer-survey.html` (admin-side, per-intern, editable)

Create the admin form. Reuses the admin-page shell (top nav with Home/Interns/Competency/Self-Assessment Results/Reports/admin-chip; breadcrumb `ADMIN / EVALUATIONS / EXIT EMPLOYER SURVEY`). Identity is read-only and auto-populated from the intern record. The 8 questions follow `Participant Outcome Form.docx`. URL contract: `?internId=<id>` required; missing or unknown id triggers a danger toast and redirects to `interns-dashboard.html`. On load, if a payload exists in sessionStorage for this `(type, internId)`, hydrate all controls from it. On save, store the payload via `markAssessmentComplete('exit-employer-survey', internId, payload)` and redirect to `intern-record.html?id=<internId>`.

**Files:**
- Create: `Prototypes/PROTOTYPE/exit-employer-survey.html`

- [ ] **Step 1: Create the file with full markup**

Create the file `Prototypes/PROTOTYPE/exit-employer-survey.html` with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Exit Employer Survey — IMPACT Admin</title>

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
        <span class="micro-label">
          <a href="interns-dashboard.html" style="color:inherit; text-decoration:none;">ADMIN / INTERNS</a> /
          EVALUATIONS / EXIT EMPLOYER SURVEY
        </span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title">EXIT EMPLOYER<br/>SURVEY.</h1>
          <p class="page-head__sub">
            Captured on behalf of the employer at the close of the placement. Save now, edit later.
          </p>
        </div>
      </div>

      <!-- META STRIP (auto-populated from ?internId=) -->
      <div class="meta-strip">
        <div class="meta-strip__item"><span class="meta-strip__label">Employer</span>     <span class="meta-strip__value" data-meta="employer">—</span></div>
        <div class="meta-strip__item"><span class="meta-strip__label">Participant</span>  <span class="meta-strip__value" data-meta="participant">—</span></div>
        <div class="meta-strip__item"><span class="meta-strip__label">Position</span>     <span class="meta-strip__value" data-meta="position">—</span></div>
        <div class="meta-strip__item"><span class="meta-strip__label">Start Date</span>   <span class="meta-strip__value mono" data-meta="start">—</span></div>
        <div class="meta-strip__item"><span class="meta-strip__label">End Date</span>     <span class="meta-strip__value mono" data-meta="end">—</span></div>
      </div>
    </div>
  </section>

  <!-- FORM -->
  <section class="assessment-wrap">
    <div class="container">
      <div class="rubric">

        <!-- Q1: Outcome Status (single-select radio list) -->
        <div class="assessment-question" data-question="1">
          <div class="assessment-question__head">
            <span class="assessment-question__num">01</span>
            <div>
              <span class="assessment-question__label">Question 01 · Required</span>
              <p class="assessment-question__text">Outcome Status</p>
            </div>
          </div>
          <div class="barrier-check-list" role="radiogroup" aria-label="Outcome Status">
            <div class="outcome-check"><input type="radio" name="outcomeStatus" id="outcomeStatus-hired" value="hired" /><label for="outcomeStatus-hired">Hired</label></div>
            <div class="outcome-check"><input type="radio" name="outcomeStatus" id="outcomeStatus-completed-not-hired" value="completed-not-hired" /><label for="outcomeStatus-completed-not-hired">Completed — Not Hired</label></div>
            <div class="outcome-check"><input type="radio" name="outcomeStatus" id="outcomeStatus-extended" value="extended" /><label for="outcomeStatus-extended">Extended for Additional Training</label></div>
            <div class="outcome-check"><input type="radio" name="outcomeStatus" id="outcomeStatus-early-exit-voluntary" value="early-exit-voluntary" /><label for="outcomeStatus-early-exit-voluntary">Early Exit — Voluntary</label></div>
            <div class="outcome-check"><input type="radio" name="outcomeStatus" id="outcomeStatus-early-exit-employer" value="early-exit-employer" /><label for="outcomeStatus-early-exit-employer">Early Exit — Employer Decision</label></div>
            <div class="outcome-check"><input type="radio" name="outcomeStatus" id="outcomeStatus-early-exit-program" value="early-exit-program" /><label for="outcomeStatus-early-exit-program">Early Exit — Program Decision</label></div>
          </div>
        </div>

        <!-- Q2: Was the participant offered employment? -->
        <div class="assessment-question" data-question="2">
          <div class="assessment-question__head">
            <span class="assessment-question__num">02</span>
            <div>
              <span class="assessment-question__label">Question 02</span>
              <p class="assessment-question__text">Was the participant offered employment?</p>
            </div>
          </div>
          <div class="segmented" role="radiogroup" aria-label="Offered employment">
            <div class="segmented__option"><input type="radio" name="offeredEmployment" id="offeredEmployment-yes" value="yes" /><label for="offeredEmployment-yes">Yes</label></div>
            <div class="segmented__option"><input type="radio" name="offeredEmployment" id="offeredEmployment-no" value="no" /><label for="offeredEmployment-no">No</label></div>
          </div>
          <textarea class="assessment-question__input" id="notOfferedReason" rows="3" placeholder="If not offered, primary reason (optional)…" style="margin-top: 12px;"></textarea>
        </div>

        <!-- Q3: Overall Performance Rating (1-5 Likert) -->
        <div class="assessment-question" data-question="3">
          <div class="assessment-question__head">
            <span class="assessment-question__num">03</span>
            <div>
              <span class="assessment-question__label">Question 03 · Required</span>
              <p class="assessment-question__text">Overall Performance Rating</p>
            </div>
          </div>
          <div class="segmented likert-5" role="radiogroup" aria-label="Performance rating">
            <div class="segmented__option"><input type="radio" name="performanceRating" id="performanceRating-1" value="1" /><label for="performanceRating-1">1</label></div>
            <div class="segmented__option"><input type="radio" name="performanceRating" id="performanceRating-2" value="2" /><label for="performanceRating-2">2</label></div>
            <div class="segmented__option"><input type="radio" name="performanceRating" id="performanceRating-3" value="3" /><label for="performanceRating-3">3</label></div>
            <div class="segmented__option"><input type="radio" name="performanceRating" id="performanceRating-4" value="4" /><label for="performanceRating-4">4</label></div>
            <div class="segmented__option"><input type="radio" name="performanceRating" id="performanceRating-5" value="5" /><label for="performanceRating-5">5</label></div>
          </div>
          <p class="likert-caption">1 = Limited &nbsp; / &nbsp; 5 = Strong</p>
        </div>

        <!-- Q4: Strengths -->
        <div class="assessment-question" data-question="4">
          <div class="assessment-question__head">
            <span class="assessment-question__num">04</span>
            <div>
              <span class="assessment-question__label">Question 04</span>
              <p class="assessment-question__text">Strengths</p>
            </div>
          </div>
          <textarea class="assessment-question__input" id="strengths" rows="3" placeholder="What did the participant do well?"></textarea>
        </div>

        <!-- Q5: Areas for Improvement -->
        <div class="assessment-question" data-question="5">
          <div class="assessment-question__head">
            <span class="assessment-question__num">05</span>
            <div>
              <span class="assessment-question__label">Question 05</span>
              <p class="assessment-question__text">Areas for Improvement</p>
            </div>
          </div>
          <textarea class="assessment-question__input" id="improvementAreas" rows="3" placeholder="Where could the participant grow?"></textarea>
        </div>

        <!-- Q6: Work Readiness Indicators -->
        <div class="assessment-question" data-question="6">
          <div class="assessment-question__head">
            <span class="assessment-question__num">06</span>
            <div>
              <span class="assessment-question__label">Question 06</span>
              <p class="assessment-question__text">Work Readiness Indicators</p>
            </div>
          </div>
          <div class="barrier-check-list">
            <div class="outcome-check"><input type="checkbox" name="workReadiness" id="workReadiness-attendance" value="attendance" /><label for="workReadiness-attendance">Reliable attendance</label></div>
            <div class="outcome-check"><input type="checkbox" name="workReadiness" id="workReadiness-communication" value="communication" /><label for="workReadiness-communication">Communication</label></div>
            <div class="outcome-check"><input type="checkbox" name="workReadiness" id="workReadiness-instructions" value="instructions" /><label for="workReadiness-instructions">Follows instructions</label></div>
            <div class="outcome-check"><input type="checkbox" name="workReadiness" id="workReadiness-independent" value="independent" /><label for="workReadiness-independent">Works independently</label></div>
            <div class="outcome-check"><input type="checkbox" name="workReadiness" id="workReadiness-feedback" value="feedback" /><label for="workReadiness-feedback">Accepts feedback</label></div>
            <div class="outcome-check"><input type="checkbox" name="workReadiness" id="workReadiness-initiative" value="initiative" /><label for="workReadiness-initiative">Demonstrates initiative</label></div>
          </div>
        </div>

        <!-- Q7: Barriers Observed -->
        <div class="assessment-question" data-question="7">
          <div class="assessment-question__head">
            <span class="assessment-question__num">07</span>
            <div>
              <span class="assessment-question__label">Question 07</span>
              <p class="assessment-question__text">Barriers Observed</p>
            </div>
          </div>
          <div class="barrier-check-list">
            <div class="outcome-check"><input type="checkbox" name="barriers" id="barriers-transportation" value="transportation" /><label for="barriers-transportation">Transportation</label></div>
            <div class="outcome-check"><input type="checkbox" name="barriers" id="barriers-health" value="health" /><label for="barriers-health">Health Complications</label></div>
            <div class="outcome-check"><input type="checkbox" name="barriers" id="barriers-childcare" value="childcare" /><label for="barriers-childcare">Childcare</label></div>
            <div class="outcome-check"><input type="checkbox" name="barriers" id="barriers-scheduling" value="scheduling" /><label for="barriers-scheduling">Scheduling Conflicts</label></div>
            <div class="outcome-check"><input type="checkbox" name="barriers" id="barriers-skill-gap" value="skill-gap" /><label for="barriers-skill-gap">Skill Gaps</label></div>
            <div class="outcome-check"><input type="checkbox" name="barriers" id="barriers-other" value="other" /><label for="barriers-other">Other</label></div>
          </div>
          <div class="conditional-reveal" id="barriers-other-wrap" hidden>
            <input class="input" type="text" id="barriers-other-text" placeholder="Please describe…" />
          </div>
        </div>

        <!-- Q8: Additional Comments -->
        <div class="assessment-question" data-question="8">
          <div class="assessment-question__head">
            <span class="assessment-question__num">08</span>
            <div>
              <span class="assessment-question__label">Question 08</span>
              <p class="assessment-question__text">Additional Comments</p>
            </div>
          </div>
          <textarea class="assessment-question__input" id="comments" rows="3" placeholder="Anything else worth noting?"></textarea>
        </div>

      </div>
    </div>
  </section>

  <!-- ACTION BAR -->
  <div class="action-bar">
    <div class="action-bar__inner">
      <div class="action-bar__status">
        <span class="mono" style="color: var(--navy);">EXIT EMPLOYER SURVEY · EDITABLE</span>
      </div>
      <div class="action-bar__buttons">
        <a class="btn btn--outline" data-action="cancel">Cancel</a>
        <button type="button" class="btn btn--primary" data-action="submit-assessment">
          Save Survey
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
        <a href="competency-dashboard.html">Competency</a>
        <a href="interns-dashboard.html">Interns</a>
      </div>
      <div class="footer__meta">&copy; 2026 IMPACT / Indiana</div>
    </div>
  </footer>

  <!-- MODAL: Save Confirmation -->
  <div class="modal" id="saveModal" role="dialog" aria-modal="true" hidden>
    <div class="modal__overlay" data-close></div>
    <div class="modal__card">
      <span class="modal__label">CONFIRM SAVE</span>
      <h3 class="modal__title">Save this Exit Employer Survey?</h3>
      <p class="modal__body">
        The survey will be stored against this intern's record. You can return to edit it from the
        Evaluations panel.
      </p>
      <div class="modal__actions">
        <button type="button" class="btn btn--outline" data-close>Keep Editing</button>
        <button type="button" class="btn btn--primary" data-action="confirm-submit">
          Save
          <span class="btn__arrow">&rarr;</span>
        </button>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
  <script>
    (function () {
      var ASSESSMENT_TYPE = 'exit-employer-survey';
      var internId = IMPACT.qs('internId');
      var intern = internId ? IMPACT.internById(internId) : null;

      // No internId or unknown id → bounce back to dashboard.
      if (!intern) {
        IMPACT.toast({ kind: 'danger', label: 'NO INTERN', message: 'This survey requires an intern context.' });
        setTimeout(function () { location.href = 'interns-dashboard.html'; }, 1500);
        return;
      }

      // Populate meta strip from intern + cohort.
      var cohort = IMPACT.cohortById(intern.cohortId) || {};
      function setMeta(key, val) {
        var el = document.querySelector('[data-meta="' + key + '"]');
        if (el) el.textContent = val || '—';
      }
      setMeta('employer',    cohort.employer);
      setMeta('participant', (intern.first ? intern.first + ' ' : '') + intern.last);
      setMeta('position',    cohort.role);
      setMeta('start',       intern.start);
      setMeta('end',         intern.endDate);

      // Cancel returns to the intern record.
      document.querySelector('[data-action="cancel"]').setAttribute('href', 'intern-record.html?id=' + internId);

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

      // Q7 "Other" reveal.
      var barriersOtherWrap  = document.getElementById('barriers-other-wrap');
      var barriersOtherInput = document.getElementById('barriers-other-text');
      var barriersOtherCheckbox = document.getElementById('barriers-other');
      barriersOtherCheckbox.addEventListener('change', function () {
        if (barriersOtherCheckbox.checked) {
          barriersOtherWrap.hidden = false;
        } else {
          barriersOtherWrap.hidden = true;
          barriersOtherInput.value = '';
        }
      });

      // Hydrate from existing payload (edit mode).
      var status = IMPACT.assessmentStatus(ASSESSMENT_TYPE, internId);
      if (status.completed && status.payload) {
        var p = status.payload;
        function setRadio(name, value) {
          if (!value) return;
          var input = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
          if (input) input.checked = true;
        }
        function setText(id, value) {
          if (value == null) return;
          var el = document.getElementById(id);
          if (el) el.value = value;
        }
        function setChecks(name, values) {
          if (!Array.isArray(values)) return;
          values.forEach(function (v) {
            var input = document.querySelector('input[name="' + name + '"][value="' + v + '"]');
            if (input) input.checked = true;
          });
        }
        setRadio('outcomeStatus',     p.outcomeStatus);
        setRadio('offeredEmployment', p.offeredEmployment);
        setText ('notOfferedReason',  p.notOfferedReason);
        setRadio('performanceRating', p.performanceRating);
        setText ('strengths',         p.strengths);
        setText ('improvementAreas',  p.improvementAreas);
        setChecks('workReadiness',    p.workReadiness);
        setChecks('barriers',         p.barriers);
        if (Array.isArray(p.barriers) && p.barriers.indexOf('other') !== -1) {
          barriersOtherWrap.hidden = false;
          setText('barriers-other-text', p.barriersOther);
        }
      }

      // Build payload from current form state.
      function collectPayload() {
        function rv(name) {
          var checked = document.querySelector('input[name="' + name + '"]:checked');
          return checked ? checked.value : '';
        }
        function tv(id) {
          var el = document.getElementById(id);
          return el ? el.value.trim() : '';
        }
        function cvs(name) {
          return Array.prototype.map.call(
            document.querySelectorAll('input[name="' + name + '"]:checked'),
            function (i) { return i.value; }
          );
        }
        return {
          outcomeStatus:     rv('outcomeStatus'),
          offeredEmployment: rv('offeredEmployment'),
          notOfferedReason:  tv('notOfferedReason'),
          performanceRating: rv('performanceRating'),
          strengths:         tv('strengths'),
          improvementAreas:  tv('improvementAreas'),
          workReadiness:     cvs('workReadiness'),
          barriers:          cvs('barriers'),
          barriersOther:     tv('barriers-other-text'),
          comments:          tv('comments')
        };
      }

      // Submit click → validate → open confirm modal.
      document.querySelector('[data-action="submit-assessment"]').addEventListener('click', function () {
        var outcome = document.querySelector('input[name="outcomeStatus"]:checked');
        var rating  = document.querySelector('input[name="performanceRating"]:checked');
        if (!outcome || !rating) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Outcome Status and Performance Rating are required.' });
          return;
        }
        document.getElementById('saveModal').hidden = false;
      });

      // Confirm modal "Save" → store payload → toast → return to intern record.
      document.querySelector('[data-action="confirm-submit"]').addEventListener('click', function () {
        var payload = collectPayload();
        IMPACT.markAssessmentComplete(ASSESSMENT_TYPE, internId, payload);
        IMPACT.toast({ kind: 'success', label: 'SAVED', message: 'Exit Employer Survey saved.' });
        setTimeout(function () {
          location.href = 'intern-record.html?id=' + internId;
        }, 700);
      });
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Manual verification — missing internId fallback**

Open `Prototypes/PROTOTYPE/exit-employer-survey.html` (no query string) in a browser. Expected:
- Bottom-right danger toast "NO INTERN — This survey requires an intern context."
- After ~1500ms, page redirects to `interns-dashboard.html`.

Open `Prototypes/PROTOTYPE/exit-employer-survey.html?internId=garbage`. Expected: same fallback behavior.

- [ ] **Step 3: Manual verification — meta strip hydration**

Open `Prototypes/PROTOTYPE/exit-employer-survey.html?internId=evans` in a fresh tab (with empty `sessionStorage`). Expected meta-strip values (auto-populated from `IMPACT.INTERNS['evans']` + `IMPACT.cohortById(intern.cohortId)`):
- Employer: `Elevate Ventures` (or whatever the mock dataset reports for Jasmine Evans's cohort)
- Participant: `Jasmine Evans` (first + last)
- Position: the cohort role
- Start Date: intern's `start` field
- End Date: intern's `endDate` field

If any of those read `—`, double-check the mock dataset on the intern record (`intern-record.html?id=evans`) — the values must match.

- [ ] **Step 4: Manual verification — empty submit fails validation**

Click "Save Survey" without selecting anything. Expected:
- Danger toast "CHECK FIELDS — Outcome Status and Performance Rating are required."
- Modal does NOT open.

- [ ] **Step 5: Manual verification — happy path + payload persistence**

Set:
- Outcome Status = Hired
- Performance Rating = 4
- Strengths = "Strong communication"
- Work Readiness Indicators = check `Reliable attendance` and `Communication`
- Barriers Observed = check `Transportation`

Click "Save Survey". Expected:
- Confirm modal opens.
- Click "Save" inside modal.
- Success toast "SAVED — Exit Employer Survey saved."
- After ~700ms, redirects to `intern-record.html?id=evans`.

In DevTools Console, verify:

```js
JSON.parse(sessionStorage.getItem('impact.assessment.exit-employer-survey.evans.completedAt')).payload
```

Expected: an object with `outcomeStatus: 'hired'`, `performanceRating: '4'`, `strengths: 'Strong communication'`, `workReadiness: ['attendance', 'communication']`, `barriers: ['transportation']`.

- [ ] **Step 6: Manual verification — edit-mode hydration**

Without clearing storage, navigate back to `Prototypes/PROTOTYPE/exit-employer-survey.html?internId=evans`. Expected:
- Outcome Status: `Hired` is selected.
- Performance Rating: `4` is selected.
- Strengths textarea reads "Strong communication".
- Work Readiness Indicators: `Reliable attendance` and `Communication` are checked.
- Barriers Observed: `Transportation` is checked.

Change Performance Rating to `5`, click Save → Save in modal. Verify in Console:

```js
JSON.parse(sessionStorage.getItem('impact.assessment.exit-employer-survey.evans.completedAt')).payload.performanceRating
```

Expected: `'5'`.

- [ ] **Step 7: Manual verification — Q7 "Other" reveal + edit-mode**

Check `Other` under Barriers Observed. Expected: a single-line text input appears below. Type `"Court date"`. Click Save → Save in modal.

Re-open `exit-employer-survey.html?internId=evans`. Expected: `Other` is checked AND the text input is revealed AND its value is "Court date".

Un-check `Other`. Expected: text input disappears AND clears.

- [ ] **Step 8: Manual verification — per-intern isolation**

Open `Prototypes/PROTOTYPE/exit-employer-survey.html?internId=bayer` (a different intern). Expected: a fresh empty form (no hydration). Outcome Status and Performance Rating are unselected.

Clean up:

```js
sessionStorage.clear();
```

- [ ] **Step 9: Commit**

```bash
git add Prototypes/PROTOTYPE/exit-employer-survey.html
git commit -m "Add exit-employer-survey.html — admin-side per-intern outcome form

8 mixed-format questions sourced from Participant Outcome Form.docx:
outcome status (radio list), offered employment (Yes/No + textarea),
performance rating (1-5 Likert), strengths/areas/comments (free-form),
work readiness + barriers (checkboxes, with Other-with-text on barriers).
URL contract: ?internId=<id> required; missing/unknown bounces with a
danger toast. Save persists payload via markAssessmentComplete and
returns to intern-record. Re-open hydrates all controls from the
persisted payload."
```

---

## Task 8: Update `renderEvaluationLinks` to render the real Exit Employer Survey card

Replace the inert "Form coming soon" placeholder for the Exit Employer Survey with a real `<a class="record-link">` that links to `exit-employer-survey.html?internId=<id>` and shows per-intern completion status. Existing-intern path renders a real link; new-intern path keeps a placeholder ("Will appear after this intern record is saved") to match the rest of the panel.

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js:367-420`

- [ ] **Step 1: Replace the function body**

Open `Prototypes/PROTOTYPE/app.js`. Find `function renderEvaluationLinks(intern) { ... }` (currently around lines 367–420). Replace the entire function with:

```js
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

    // Exit Employer Survey card — real link with per-intern status (existing intern only).
    if (intern) {
      var exitStatus = assessmentStatus('exit-employer-survey', intern.id);
      var exitCard = document.createElement('a');
      exitCard.className = 'record-link';
      exitCard.href = 'exit-employer-survey.html?internId=' + intern.id;
      var exitStatusText = exitStatus.completed
        ? 'Submitted on ' + formatCompletionDate(exitStatus.completedAt) + ' · Edit'
        : 'Not yet submitted';
      exitCard.innerHTML =
        '<div class="record-link__head">' +
          '<span class="record-link__label">EXIT SURVEY</span>' +
          '<span class="record-link__title">Exit Employer Survey</span>' +
        '</div>' +
        '<span class="record-link__status">' + exitStatusText + '</span>';
      grid.appendChild(exitCard);
    } else {
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
  }
```

The competency-records section is byte-identical to the existing implementation. The only change is the trailing Exit Survey block: previously a static `record-link--placeholder` with "Form coming soon"; now a real `<a class="record-link">` for the existing-intern path with status text driven by `assessmentStatus('exit-employer-survey', intern.id)`, and a placeholder card on the new-intern path.

- [ ] **Step 2: Manual verification — existing intern, not yet submitted**

Open `Prototypes/PROTOTYPE/intern-record.html?id=evans` in a fresh tab (empty `sessionStorage`). Scroll to the "Evaluations" panel (panel #6). Expected:
- Competency cards (or "No competency assessments yet").
- Last card: Exit Survey · Exit Employer Survey · "Not yet submitted". Hover: cursor turns into a hand (it's an `<a>` now, not a div).
- Click the Exit Survey card → navigates to `exit-employer-survey.html?internId=evans`.

- [ ] **Step 3: Manual verification — existing intern, submitted**

Back on `intern-record.html?id=evans`. In DevTools Console:

```js
IMPACT.markAssessmentComplete('exit-employer-survey', 'evans', { outcomeStatus: 'hired', performanceRating: '4' });
location.reload();
```

Expected: Exit Survey card now reads "Submitted on [today] · Edit" and remains a link.

Click it → navigates to `exit-employer-survey.html?internId=evans` and the form is hydrated (Outcome=Hired, Rating=4 are pre-selected).

- [ ] **Step 4: Manual verification — per-intern isolation**

Open `Prototypes/PROTOTYPE/intern-record.html?id=bayer` (different intern). Expected: Exit Survey card reads "Not yet submitted" (Bayer has no payload — only Evans does).

- [ ] **Step 5: Manual verification — new intern path**

Open `Prototypes/PROTOTYPE/intern-record.html` (no `?id=`). Scroll to Evaluations. Expected: Exit Survey card reads "Will appear after this intern record is saved" and is a non-clickable placeholder (`record-link--placeholder`).

Clean up:

```js
sessionStorage.clear();
```

- [ ] **Step 6: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "Render real Exit Employer Survey link in intern-record evaluations panel

renderEvaluationLinks now produces a real <a class='record-link'> for
the Exit Employer Survey on the existing-intern path, with per-intern
status text ('Submitted on … · Edit' or 'Not yet submitted') driven by
assessmentStatus('exit-employer-survey', intern.id). New-intern path
keeps a 'Will appear after this intern record is saved' placeholder."
```

---

## Task 9: End-to-end manual integration test

Run the complete user journey across both new forms, in a single fresh browser session, to catch any cross-page regressions.

**Files:**
- (None — verification only.)

- [ ] **Step 1: Reset to fresh state**

In DevTools Console, run:

```js
sessionStorage.clear();
```

Close all browser tabs.

- [ ] **Step 2: Walk the chooser path**

Open `Prototypes/PROTOTYPE/intern-assessments.html`. Expected: 3 cards (Personal Goals · AT START / Midpoint Reflection · AT MIDPOINT / Participant Feedback · AT EXIT), all showing "Begin …" CTAs.

- [ ] **Step 3: Submit Participant Feedback**

Click "Begin Participant Feedback". Fill: Last=`Patterson`, Cohort=`Eskenazi 2026`, Zip=`46208`. Answer Q1 (Completed successfully), Q2 (Mixed), Q3 (Yes), Q7 ("More structure on day 1 would help."). Submit → confirm → expect redirect to `assessment-confirmation.html?type=participant-feedback` with title "Participant Feedback submitted."

- [ ] **Step 4: Verify chooser updates**

Click "Back to home" → click "Intern Assessments" in nav → expect Participant Feedback card now shows "Submitted on [today]" pill instead of Begin button. The other two cards still show Begin buttons.

- [ ] **Step 5: Verify intern record integration**

Navigate to `Prototypes/PROTOTYPE/intern-record.html?id=evans`. Scroll to Self-Assessments panel. Expected: Participant Feedback card now reads "Submitted on [today] · Detail view coming soon" (per-tab cross-intern view — documented limitation).

Scroll to Evaluations panel. Expected: Exit Survey card reads "Not yet submitted" (per-intern keying — Evans has no exit payload yet).

- [ ] **Step 6: Submit Exit Employer Survey for Evans**

Click the Exit Survey card → lands on `exit-employer-survey.html?internId=evans`. Verify meta-strip is populated. Set Outcome=Hired, Rating=4, Strengths="Strong communication", Work Readiness: attendance + communication, Barriers: transportation. Click Save → Save in modal → expect redirect to `intern-record.html?id=evans`.

- [ ] **Step 7: Verify Exit Survey card update**

On the intern record, Evaluations panel: Exit Survey card now reads "Submitted on [today] · Edit". Click it → form opens with all selections hydrated. Change Rating to 5 → Save → redirects back. Card timestamp updates (same date but the timestamp inside the JSON value updates — verify in Console: `JSON.parse(sessionStorage.getItem('impact.assessment.exit-employer-survey.evans.completedAt')).payload.performanceRating` returns `'5'`).

- [ ] **Step 8: Verify per-intern isolation**

Navigate to `Prototypes/PROTOTYPE/intern-record.html?id=bayer`. Scroll to Evaluations. Expected: Exit Survey card reads "Not yet submitted" (Bayer has no payload).

- [ ] **Step 9: Verify direct-URL fallback for Exit Survey**

Navigate to `Prototypes/PROTOTYPE/exit-employer-survey.html` (no query). Expected: danger toast "NO INTERN — …" + redirect to `interns-dashboard.html` after ~1500ms.

- [ ] **Step 10: Verify backward compat — Personal Goals iter 1 still works**

Open `Prototypes/PROTOTYPE/intern-assessments.html` → click "Begin Personal Goals" → fill identity + 4 textareas → Submit → confirm → expect redirect to `assessment-confirmation.html?type=personal-goals` with title "Personal Goals submitted." Back on chooser, Personal Goals card now shows "Submitted on [today]" pill.

In Console:

```js
sessionStorage.getItem('impact.assessment.personal-goals.completedAt');
```

Expected: a plain ISO string (NOT JSON — backward-compat preserved).

- [ ] **Step 11: Final cleanup commit (only if any fixes were made above)**

If steps 2–10 surfaced no issues, skip this step. If you fixed any regression, commit it:

```bash
git add <files>
git commit -m "Iter 2 integration fixes — <summary>"
```

---

## Task 10: Update documentation (CLAUDE.md, PRD.md, App Outline)

Update the source-of-truth docs to reflect the two new pages and the extended helpers. Keep changes targeted — don't rewrite unrelated sections.

**Files:**
- Modify: `CLAUDE.md`
- Modify: `PRD.md`
- Modify: `IMPACT Internship Assessment Portal - App Outline.md`

- [ ] **Step 1: Update `CLAUDE.md` page count and inventory**

Open `CLAUDE.md`. Find the line `### Page inventory (21 pages)` and change it to:

```markdown
### Page inventory (23 pages)
```

In the **Public (intern-facing):** subsection, after the `intern-assessments.html` and `personal-goals.html` / `midpoint-reflection.html` lines, add a new bullet for Participant Feedback:

```markdown
- `participant-feedback.html` — Free-form Participant Feedback assessment (7 mixed-format questions: radio + Likert + Yes/No + textarea)
```

Update the existing `assessment-confirmation.html` line to mention all four supported types:

```markdown
- `assessment-confirmation.html` — Post-submit thank-you, parameterized by `?type=personal-goals|midpoint-reflection|participant-feedback|exit-employer-survey`
```

In the **Admin:** subsection, after the `self-assessment-results.html` / `self-assessment-detail.html` line, add:

```markdown
- `exit-employer-survey.html` — Per-intern Exit Employer Survey (admin-completed, editable). URL contract: `?internId=<id>` required.
```

- [ ] **Step 2: Update `CLAUDE.md` `app.js` helper bullet**

Find the `assessmentStatus(type)`, `markAssessmentComplete(type)` bullet under "Shared module: `app.js`". Replace with:

```markdown
- **`assessmentStatus(type, internId?)`**, **`markAssessmentComplete(type, internId?, payload?)`**, **`formatCompletionDate(date)`**, **`ASSESSMENT_TYPES`** — sessionStorage-backed tracking of assessment completion. Single-arg form (Personal Goals / Midpoint Reflection / Participant Feedback) writes a plain ISO string under `impact.assessment.<type>.completedAt`. Three-arg form (Exit Employer Survey) writes JSON `{completedAt, payload}` under `impact.assessment.<type>.<internId>.completedAt` so the form can be re-edited with full state restored. Backward-compatible: existing single-arg callers behave exactly as before.
```

- [ ] **Step 3: Update `PRD.md`**

Open `PRD.md`. Find the section that describes the intern-facing assessments (the "Intern assessments (Personal Goals + Midpoint Reflection)" paragraph, search for "Personal Goals"). Update to:

```markdown
- **Intern assessments (Personal Goals + Midpoint Reflection + Participant Feedback)**: each is one submission per intern, immutable after submit. The chooser page (`intern-assessments.html`) shows per-tab completion status from `sessionStorage`. Personal Goals uses free-form textareas (7 questions); Midpoint Reflection uses free-form textareas (8 questions); Participant Feedback uses mixed-format questions sourced from `Participant Exit Feedback.docx` (radio + Likert + Yes/No + textarea, 7 questions). Admin-side detail viewers for these submissions are deferred.
```

Find the Evaluations paragraph (search for "Competency rubric" or "Evaluations"). After the existing competency rules, append:

```markdown
- **Exit Employer Survey**: admin-completed on behalf of the employer at the close of placement. Per-intern, editable (admin can save and return). 8 mixed-format questions sourced from `Participant Outcome Form.docx`: outcome status, offered employment, performance rating (1–5), strengths, improvement areas, work readiness indicators, barriers observed, comments. Reachable from the Evaluations panel on the intern record (URL: `exit-employer-survey.html?internId=<id>`).
```

- [ ] **Step 4: Update `IMPACT Internship Assessment Portal - App Outline.md`**

Open `IMPACT Internship Assessment Portal - App Outline.md`. Find the section that lists the Intern Assessments pages (search for "Personal Goals" or "intern-assessments"). After the Midpoint Reflection outline, add a new outline block for Participant Feedback:

```markdown
### Participant Feedback (`participant-feedback.html`)
- Public, intern-facing
- Identity card (Last Name + Cohort + Zipcode) — same shape as Personal Goals / Midpoint
- 7 mixed-format questions (faithful to `Participant Exit Feedback.docx`):
  1. Why are you leaving this internship? — radio + Other-with-text reveal
  2. Overall experience — 5-segment Likert (Very negative … Very positive)
  3. Do you feel more prepared for employment? — Yes/No
  4. Did you feel supported? — Yes/Somewhat/No + free-form textarea
  5. Did you experience barriers? — Yes/No + free-form textarea (needs addressed)
  6. Would you recommend this experience to others? — Yes/Maybe/No
  7. Anything we could improve? — free-form textarea
- Validation: identity fields required, 5-digit zip; at least 4 of 7 questions answered.
- Single submission per intern (immutable after submit). Routes to `assessment-confirmation.html?type=participant-feedback` on success.
```

After the outline for the Evaluations panel of the intern record, add a new outline block for Exit Employer Survey:

```markdown
### Exit Employer Survey (`exit-employer-survey.html`)
- Admin, per-intern (URL: `?internId=<id>` required; missing/unknown bounces with a danger toast).
- Read-only meta strip auto-populated from the intern record + cohort: Employer · Participant · Position · Start · End.
- 8 mixed-format questions (faithful to `Participant Outcome Form.docx`):
  1. Outcome Status — single-select radio list (Hired / Completed-Not-Hired / Extended / Early Exit ×3) — required
  2. Offered employment? — Yes/No + free-form textarea (primary reason if not)
  3. Overall Performance Rating — 1–5 numbered Likert — required (caption: "1 = Limited / 5 = Strong")
  4. Strengths — free-form textarea
  5. Areas for Improvement — free-form textarea
  6. Work Readiness Indicators — multi-select checklist (6 items)
  7. Barriers Observed — multi-select checklist (5 items + Other-with-text reveal)
  8. Additional Comments — free-form textarea
- Editable: re-opening with the same `?internId=` re-hydrates all controls from the persisted payload.
- Save persists payload via `markAssessmentComplete('exit-employer-survey', internId, payload)` and redirects to the intern record.
```

- [ ] **Step 5: Manual verification**

Open each of the three docs. Visually confirm:
- `CLAUDE.md` page count reads `23 pages` and the new `participant-feedback.html` and `exit-employer-survey.html` entries are listed under the right subsections.
- `PRD.md` mentions Participant Feedback alongside Personal Goals and Midpoint Reflection.
- `App Outline.md` includes the two new outline blocks.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md PRD.md "IMPACT Internship Assessment Portal - App Outline.md"
git commit -m "Update CLAUDE.md / PRD / App Outline for iter 2 — Participant Feedback + Exit Survey

Page count 21 → 23. New entries for participant-feedback.html (public)
and exit-employer-survey.html (admin, per-intern). Updated app.js
helper bullet to reflect optional per-intern keying and payload
persistence."
```

---

## Out of scope (deferred to iteration 3)

These are explicitly NOT part of this plan. Do not implement them here.

- Admin detail viewer pages for Personal Goals, Midpoint Reflection, Participant Feedback (read-only views of submissions).
- Site Review (employer-quality survey from `Site Review.docx`) — separate concept, not an exit survey.
- Real backend persistence (the prototype uses sessionStorage, which is per-tab).
- Cross-tab / cross-device completion sync.
- Hard validation that a typed-in `internId` actually exists (the basic `internById` check covers known interns; a hard schema would need real auth).
- Delete-survey affordance — admin can only overwrite by re-submitting with corrected data.

## Known prototype limitations carried into this iteration

- Participant Feedback uses per-tab type-only sessionStorage (consistent with Personal Goals / Midpoint Reflection). Different interns in the same browser tab share completion state for Participant Feedback. Documented; deferred until real backend.
- Exit Employer Survey is per-tab per-intern, so re-edit only works within the same browser session. Closing the tab clears the saved survey.
- Re-edit re-renders all questions every time; partial-payload backward compat handles missing fields gracefully.
