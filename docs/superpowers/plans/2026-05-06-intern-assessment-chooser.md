# Intern Assessment Chooser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a chooser page that lets an intern pick between Personal Goals or Midpoint Reflection, build out both forms (6–8 free-form textareas each), and persist completion state in `sessionStorage` so the chooser shows "Submitted on [date]" after a submission.

**Architecture:** Three new public HTML pages (`intern-assessments.html`, `personal-goals.html`, `midpoint-reflection.html`) reusing the existing prototype's nav/page-head/identity-card/modal/toast primitives. New CSS modifiers added to `styles.css`. Helper functions added to `app.js`. The existing `assessment-confirmation.html` is parameterized via `?type=...`. The old `self-assessment.html` is deleted; admin-side self-assessment views are deferred (out of scope).

**Tech Stack:** Static HTML, vanilla JS (no framework), CSS custom properties, `sessionStorage`. **No test runner exists in this repo** (per CLAUDE.md: "No build tooling, no framework, no test runner"). Verification steps in this plan are manual: open the page in a browser, perform the described action, confirm the expected DOM/visual result.

**Spec:** `docs/superpowers/specs/2026-05-06-intern-assessment-chooser-design.md`

**Working directory for all paths below:** `C:/Users/matts/OneDrive - Koehler Partners/Projects/IMPACT/Internship Assessment/IMPACT Intretnship Assessment Portal/`

---

## Task 1: Add sessionStorage helpers and assessment type enum to `app.js`

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`

- [ ] **Step 1: Add the type enum and helper functions inside the IIFE**

In `Prototypes/PROTOTYPE/app.js`, after the `validate(fieldSpecs)` function definition (which ends at the closing `}` immediately before the `window.IMPACT = { ... }` export block), insert these declarations:

```js
  // -------- Assessment completion state (sessionStorage-backed) --------

  const ASSESSMENT_TYPES = {
    PERSONAL_GOALS: 'personal-goals',
    MIDPOINT: 'midpoint-reflection'
  };

  function assessmentStorageKey(type) {
    return 'impact.assessment.' + type + '.completedAt';
  }

  function assessmentStatus(type) {
    try {
      var raw = window.sessionStorage.getItem(assessmentStorageKey(type));
      if (!raw) return { completed: false, completedAt: null };
      var date = new Date(raw);
      if (isNaN(date.getTime())) return { completed: false, completedAt: null };
      return { completed: true, completedAt: date };
    } catch (err) {
      return { completed: false, completedAt: null };
    }
  }

  function markAssessmentComplete(type) {
    try {
      window.sessionStorage.setItem(assessmentStorageKey(type), new Date().toISOString());
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

- [ ] **Step 2: Export the new helpers via `window.IMPACT`**

In the same file, find the `window.IMPACT = { ... }` block at the bottom. Replace it with:

```js
  window.IMPACT = {
    COHORTS, INTERNS, READINESS, COMPETENCY, SELF,
    cohortById, internById, cohortNameFor, qs, wireModals, toast,
    fillText, hydrateInternEdit,
    readinessById, competencyById, selfById, resolveParticipant,
    hydrateReadinessDetail, hydrateCompetencyDetail, hydrateCohortDetail, hydrateSelfDetail,
    wireTableFilter, internsByCohort, validate,
    ASSESSMENT_TYPES, assessmentStatus, markAssessmentComplete, formatCompletionDate,
  };
```

- [ ] **Step 3: Manual verification**

Open `Prototypes/PROTOTYPE/index.html` in a browser. Open DevTools Console. Run:

```js
IMPACT.assessmentStatus('personal-goals')
```

Expected: `{ completed: false, completedAt: null }`

Then run:

```js
IMPACT.markAssessmentComplete('personal-goals');
IMPACT.assessmentStatus('personal-goals');
```

Expected: second call returns `{ completed: true, completedAt: Date <today> }`. Then run:

```js
IMPACT.formatCompletionDate(IMPACT.assessmentStatus('personal-goals').completedAt)
```

Expected: a string like `"May 6, 2026"`.

Clean up so we don't pollute downstream tasks:

```js
sessionStorage.removeItem('impact.assessment.personal-goals.completedAt');
```

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "Add sessionStorage helpers for assessment completion tracking

ASSESSMENT_TYPES enum, assessmentStatus(type), markAssessmentComplete(type),
formatCompletionDate(date) — all wrapped in try/catch to silently fall back
if sessionStorage is unavailable."
```

---

## Task 2: Add CSS for chooser cards and free-form question cards

**Files:**
- Modify: `Prototypes/PROTOTYPE/styles.css`

- [ ] **Step 1: Append the new CSS block to the end of `styles.css`**

Open `Prototypes/PROTOTYPE/styles.css`. Append this block at the end of the file (after the last existing rule, before the file ends):

```css

/* ---------- Assessment chooser ---------- */

.assessment-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin: 32px 0 32px;
}

.assessment-card {
  border: 1px solid var(--rule);
  background: #fff;
  border-radius: var(--radius-md);
  padding: 32px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}

.assessment-card:hover:not(.assessment-card--done) {
  border-color: var(--navy);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.assessment-card__meta {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 18px;
}

.assessment-card__title {
  font-family: var(--font-display);
  font-size: clamp(28px, 3vw, 36px);
  line-height: 1.05;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 0 0 14px;
}

.assessment-card__body {
  margin: 0 0 24px;
  color: var(--muted);
  font-size: 15px;
  line-height: 1.55;
  flex: 1;
}

.assessment-card__status {
  margin-top: auto;
}

/* Completed state */
.assessment-card--done {
  background: var(--canvas);
  border-color: rgba(5, 16, 40, 0.08);
}
.assessment-card--done .assessment-card__title,
.assessment-card--done .assessment-card__body {
  color: var(--muted);
}
.assessment-card--done .assessment-card__meta {
  color: var(--navy);
}

.assessment-card__pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  background: #fff;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--navy);
}

.assessment-card__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--gold);
  color: var(--navy-deep);
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

.assessment-foot-note {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  text-align: center;
  margin: 8px 0 64px;
}

@media (max-width: 720px) {
  .assessment-grid { grid-template-columns: 1fr; }
}

/* ---------- Free-form question cards (Personal Goals / Midpoint) ---------- */

.assessment-question {
  border: 1px solid var(--rule);
  background: #fff;
  border-radius: var(--radius-md);
  padding: 24px 28px;
  margin-bottom: 16px;
}

.assessment-question__head {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 14px;
  margin-bottom: 14px;
  align-items: start;
}

.assessment-question__num {
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--navy);
  line-height: 1;
  padding-top: 2px;
}

.assessment-question__label {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  display: block;
  margin-bottom: 6px;
}

.assessment-question__text {
  margin: 0 0 6px;
  font-size: 16px;
  line-height: 1.45;
  color: var(--ink);
}

.assessment-question__hint {
  font-size: 12.5px;
  color: var(--muted);
  font-style: italic;
}

.assessment-question__input {
  width: 100%;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  font-family: var(--font-body);
  font-size: 14.5px;
  line-height: 1.5;
  color: var(--ink);
  background: #fff;
  resize: vertical;
  min-height: 100px;
  box-sizing: border-box;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}
.assessment-question__input:focus {
  outline: none;
  border-color: var(--cyan);
  box-shadow: 0 0 0 3px rgba(0, 166, 246, 0.18);
}
```

- [ ] **Step 2: Manual verification**

Open `Prototypes/PROTOTYPE/index.html`. Verify it still renders correctly (we haven't broken existing styles). The new rules don't take effect until pages use them.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/styles.css
git commit -m "Add CSS for assessment chooser cards and free-form question cards

.assessment-grid + .assessment-card (with --done modifier, pill, check icon)
for the chooser. .assessment-question family for free-form textarea questions
on the new Personal Goals and Midpoint Reflection forms."
```

---

## Task 3: Create the chooser page `intern-assessments.html`

**Files:**
- Create: `Prototypes/PROTOTYPE/intern-assessments.html`

- [ ] **Step 1: Create the new file with the full chooser markup**

Create `Prototypes/PROTOTYPE/intern-assessments.html` with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Intern Assessments — IMPACT 2026</title>

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
        <a href="index.html" class="back-link">&larr; Back to home</a>
      </nav>
    </div>
  </header>

  <!-- PAGE HEAD -->
  <section class="page-head">
    <div class="container">
      <div class="page-head__breadcrumb">
        <span class="micro-label">INTERN ASSESSMENTS / 2026</span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title">CHOOSE YOUR<br/>ASSESSMENT.</h1>
          <p class="page-head__sub">
            You'll complete two reflections during the program — one at the start to set your goals,
            and another at the midpoint to take stock of your progress. Pick the one you're ready for.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- CARDS -->
  <section>
    <div class="container">
      <div class="assessment-grid">

        <article class="assessment-card" data-assessment="personal-goals">
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

      </div>

      <p class="assessment-foot-note">
        Each assessment can only be submitted once. Completion is recorded for your cohort administrator.
      </p>
    </div>
  </section>

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

  <script src="app.js"></script>
  <script>
    // Status hydration: replace the CTA with a "Submitted on …" pill if completed.
    (function () {
      var types = ['personal-goals', 'midpoint-reflection'];
      types.forEach(function (type) {
        var card = document.querySelector('[data-assessment="' + type + '"]');
        if (!card) return;
        var status = IMPACT.assessmentStatus(type);
        if (!status.completed) return;
        card.classList.add('assessment-card--done');
        var slot = card.querySelector('[data-status-slot]');
        if (!slot) return;
        slot.innerHTML =
          '<div class="assessment-card__pill">' +
            '<span class="assessment-card__check" aria-hidden="true">&check;</span>' +
            '<span>Submitted on ' + IMPACT.formatCompletionDate(status.completedAt) + '</span>' +
          '</div>';
      });
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Manual verification — fresh state**

Open `Prototypes/PROTOTYPE/intern-assessments.html` in a browser (use a fresh tab so sessionStorage starts empty).

Expected:
- Public nav: logo + "Back to home" link
- Page head: "INTERN ASSESSMENTS / 2026" micro-label, "CHOOSE YOUR ASSESSMENT." Archivo Black title, intro paragraph
- Two cards side-by-side: "Set your starting line." (Personal Goals) and "Reflect on the journey." (Midpoint Reflection)
- Each card has a navy "Begin …" button with an arrow
- Footer note "Each assessment can only be submitted once."
- Site footer with logo + links

- [ ] **Step 3: Manual verification — completed state**

In DevTools Console on the same page:

```js
IMPACT.markAssessmentComplete('personal-goals');
location.reload();
```

Expected: Personal Goals card now has the canvas-tinted background, muted text, no hover lift, and a pill reading "✓ Submitted on [today]" instead of the Begin button. Midpoint Reflection card unchanged.

Now run:

```js
IMPACT.markAssessmentComplete('midpoint-reflection');
location.reload();
```

Expected: both cards now show the completed pill.

Clean up:

```js
sessionStorage.removeItem('impact.assessment.personal-goals.completedAt');
sessionStorage.removeItem('impact.assessment.midpoint-reflection.completedAt');
```

- [ ] **Step 4: Manual verification — mobile width**

Resize the browser to ≤720px wide. Cards should stack vertically (single column).

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/intern-assessments.html
git commit -m "Add intern-assessments.html chooser hub

Two-card layout (Personal Goals + Midpoint Reflection), status-aware via
sessionStorage. Completed cards swap their CTA for an inert 'Submitted on
[date]' pill and pick up a muted .assessment-card--done treatment."
```

---

## Task 4: Create `personal-goals.html` form page

**Files:**
- Create: `Prototypes/PROTOTYPE/personal-goals.html`

- [ ] **Step 1: Create the new file with the full form markup**

Create `Prototypes/PROTOTYPE/personal-goals.html` with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Personal Goals — IMPACT 2026</title>

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
        <span class="micro-label">PERSONAL GOALS / 2026 / ONE SUBMISSION</span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title">YOUR STARTING<br/>LINE.</h1>
          <p class="page-head__sub">
            Set your goals for this internship. Free-form responses, two to three sentences each.
            One submission per intern, so take your time and answer honestly.
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

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">01</span>
            <div>
              <span class="assessment-question__label">Question 01</span>
              <p class="assessment-question__text">What are you most hoping to learn or experience during this internship?</p>
              <span class="assessment-question__hint">2–3 sentences is ideal.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">02</span>
            <div>
              <span class="assessment-question__label">Question 02</span>
              <p class="assessment-question__text">What 2–3 specific skills or competencies do you want to develop?</p>
              <span class="assessment-question__hint">Be concrete — name them.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">03</span>
            <div>
              <span class="assessment-question__label">Question 03</span>
              <p class="assessment-question__text">Describe a professional goal you'd like to achieve by the end of the program.</p>
              <span class="assessment-question__hint">2–3 sentences is ideal.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">04</span>
            <div>
              <span class="assessment-question__label">Question 04</span>
              <p class="assessment-question__text">What does success look like for you in this role?</p>
              <span class="assessment-question__hint">Paint a picture of what "going well" means.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">05</span>
            <div>
              <span class="assessment-question__label">Question 05</span>
              <p class="assessment-question__text">What support, feedback, or resources will help you reach these goals?</p>
              <span class="assessment-question__hint">Think about people, tools, or training.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">06</span>
            <div>
              <span class="assessment-question__label">Question 06</span>
              <p class="assessment-question__text">What's one habit or behavior you want to strengthen during the program?</p>
              <span class="assessment-question__hint">Pick one — focus matters.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">07</span>
            <div>
              <span class="assessment-question__label">Question 07</span>
              <p class="assessment-question__text">How will you know you're making progress on these goals?</p>
              <span class="assessment-question__hint">What signals or milestones will you watch for?</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

      </div>
    </div>
  </section>

  <!-- ACTION BAR -->
  <div class="action-bar">
    <div class="action-bar__inner">
      <div class="action-bar__status">
        <span class="mono" style="color: var(--navy);">PERSONAL GOALS · ONE SUBMISSION</span>
      </div>
      <div class="action-bar__buttons">
        <a href="intern-assessments.html" class="btn btn--outline">Cancel</a>
        <button type="button" class="btn btn--primary" data-action="submit-assessment">
          Submit Personal Goals
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
      <h3 class="modal__title">Submit your Personal Goals?</h3>
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
      var ASSESSMENT_TYPE = 'personal-goals';

      // Modal close (overlay + Escape) — same pattern as other prototype pages
      document.addEventListener('click', function (e) {
        var c = e.target.closest('[data-close]');
        if (c) { var m = c.closest('.modal'); if (m) m.hidden = true; }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal:not([hidden])').forEach(function (m) { m.hidden = true; });
        }
      });

      // Submit click → validate → open confirm modal
      document.querySelector('[data-action="submit-assessment"]').addEventListener('click', function () {
        var idValid = IMPACT.validate([
          { selector: '#last',   required: true },
          { selector: '#cohort', required: true },
          { selector: '#zip',    pattern: /^\d{5}$/, message: '5 digits' }
        ]);
        if (!idValid) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please fill in your identity before submitting.' });
          return;
        }
        var inputs = document.querySelectorAll('.assessment-question__input');
        var answered = 0;
        inputs.forEach(function (t) { if (t.value.trim().length > 0) answered++; });
        if (answered < 4) {
          IMPACT.toast({ kind: 'danger', label: 'INCOMPLETE', message: 'Please answer at least 4 questions before submitting.' });
          return;
        }
        document.getElementById('submitModal').hidden = false;
      });

      // Confirm modal "Submit" → mark complete → toast → confirmation page
      document.querySelector('[data-action="confirm-submit"]').addEventListener('click', function () {
        IMPACT.markAssessmentComplete(ASSESSMENT_TYPE);
        IMPACT.toast({ kind: 'success', label: 'SUBMITTED', message: 'Your Personal Goals have been recorded.' });
        setTimeout(function () {
          location.href = 'assessment-confirmation.html?type=' + ASSESSMENT_TYPE;
        }, 700);
      });
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Manual verification — page renders**

Open `Prototypes/PROTOTYPE/personal-goals.html` in a browser. Expected:
- Nav with "← Back to assessments" link
- Page head: "PERSONAL GOALS / 2026 / ONE SUBMISSION", title "YOUR STARTING LINE."
- Identity card with Last Name / Cohort / Zipcode fields
- 7 question cards numbered 01–07, each with a textarea
- Sticky action bar at the bottom with "Cancel" + "Submit Personal Goals"
- Site footer with logo + links

- [ ] **Step 3: Manual verification — validation: empty identity**

Click **Submit Personal Goals** without filling any field.

Expected:
- All three identity fields show inline "Required" errors (red border, error text)
- A red toast appears: "CHECK FIELDS — Please fill in your identity before submitting."
- The confirm modal does NOT open

- [ ] **Step 4: Manual verification — validation: too few answers**

Fill identity: `Last Name = Patterson`, `Cohort = Eskenazi 2026`, `Zip = 46208`. Leave all textareas blank. Click **Submit Personal Goals**.

Expected:
- No identity errors
- Red toast: "INCOMPLETE — Please answer at least 4 questions before submitting."
- Modal does NOT open

Now fill 3 textareas with anything and click Submit again. Expected: same INCOMPLETE toast (3 < 4).

Fill a 4th textarea and click Submit again.

Expected:
- Confirm modal opens with title "Submit your Personal Goals?"

- [ ] **Step 5: Manual verification — submission flow**

In the open confirm modal, click **Submit**.

Expected:
- Green toast appears: "SUBMITTED — Your Personal Goals have been recorded."
- After ~700ms, browser navigates to `assessment-confirmation.html?type=personal-goals` (the URL bar will show the query string; the page itself will still show the existing self-assessment confirmation copy until Task 6 makes it type-aware)

In DevTools Console (on the confirmation page):

```js
sessionStorage.getItem('impact.assessment.personal-goals.completedAt')
```

Expected: an ISO timestamp string from a few seconds ago.

- [ ] **Step 6: Manual verification — chooser reflects completion**

Navigate to `intern-assessments.html` (in the same tab, so sessionStorage persists).

Expected: Personal Goals card now shows the muted "Submitted on [today]" pill instead of the Begin button.

Clean up:

```js
sessionStorage.removeItem('impact.assessment.personal-goals.completedAt');
```

- [ ] **Step 7: Manual verification — modal cancel**

Reload `personal-goals.html`. Fill identity + 4+ textareas. Click Submit. In the open modal, click **Keep Editing**.

Expected: modal closes, no submission, no toast, still on the form. Page state unchanged.

Press Escape after re-opening the modal once more.

Expected: modal closes via Escape.

- [ ] **Step 8: Commit**

```bash
git add Prototypes/PROTOTYPE/personal-goals.html
git commit -m "Add personal-goals.html — free-form Personal Goals assessment form

Identity card + 7 textarea questions. Validation: identity required (last/cohort/
zip5) and at least 4 textareas non-empty. Confirm modal on submit, mark complete
in sessionStorage, then navigate to assessment-confirmation.html?type=personal-goals."
```

---

## Task 5: Create `midpoint-reflection.html` form page

**Files:**
- Create: `Prototypes/PROTOTYPE/midpoint-reflection.html`

- [ ] **Step 1: Create the new file with the full form markup**

Create `Prototypes/PROTOTYPE/midpoint-reflection.html` with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Midpoint Reflection — IMPACT 2026</title>

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
        <span class="micro-label">MIDPOINT REFLECTION / 2026 / ONE SUBMISSION</span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title">REFLECT ON<br/>THE JOURNEY.</h1>
          <p class="page-head__sub">
            Take stock of your progress so far. Free-form responses, two to three sentences each.
            One submission per intern.
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

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">01</span>
            <div>
              <span class="assessment-question__label">Question 01</span>
              <p class="assessment-question__text">What's gone better than you expected so far?</p>
              <span class="assessment-question__hint">Highlight a specific moment or pattern.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">02</span>
            <div>
              <span class="assessment-question__label">Question 02</span>
              <p class="assessment-question__text">What's been harder than you anticipated, and how have you responded?</p>
              <span class="assessment-question__hint">Be honest — challenges are part of the work.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">03</span>
            <div>
              <span class="assessment-question__label">Question 03</span>
              <p class="assessment-question__text">Describe a moment in the past several weeks where you grew or learned something significant.</p>
              <span class="assessment-question__hint">2–3 sentences with detail.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">04</span>
            <div>
              <span class="assessment-question__label">Question 04</span>
              <p class="assessment-question__text">Looking back at the goals you set at the start, where have you made the most progress?</p>
              <span class="assessment-question__hint">Tie this to your Personal Goals if you remember them.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">05</span>
            <div>
              <span class="assessment-question__label">Question 05</span>
              <p class="assessment-question__text">Where do you feel stuck or want more support?</p>
              <span class="assessment-question__hint">Naming this helps your administrator help you.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">06</span>
            <div>
              <span class="assessment-question__label">Question 06</span>
              <p class="assessment-question__text">What feedback have you received from your supervisor or team, and how are you applying it?</p>
              <span class="assessment-question__hint">Specific examples are best.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">07</span>
            <div>
              <span class="assessment-question__label">Question 07</span>
              <p class="assessment-question__text">What's your focus for the second half of the internship?</p>
              <span class="assessment-question__hint">Name 1–2 priorities.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

        <div class="assessment-question">
          <div class="assessment-question__head">
            <span class="assessment-question__num">08</span>
            <div>
              <span class="assessment-question__label">Question 08</span>
              <p class="assessment-question__text">Anything else you want your cohort administrator to know?</p>
              <span class="assessment-question__hint">Optional — leave blank if nothing comes to mind.</span>
            </div>
          </div>
          <textarea class="assessment-question__input" rows="4" placeholder="Your response…"></textarea>
        </div>

      </div>
    </div>
  </section>

  <!-- ACTION BAR -->
  <div class="action-bar">
    <div class="action-bar__inner">
      <div class="action-bar__status">
        <span class="mono" style="color: var(--navy);">MIDPOINT REFLECTION · ONE SUBMISSION</span>
      </div>
      <div class="action-bar__buttons">
        <a href="intern-assessments.html" class="btn btn--outline">Cancel</a>
        <button type="button" class="btn btn--primary" data-action="submit-assessment">
          Submit Midpoint Reflection
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
      <h3 class="modal__title">Submit your Midpoint Reflection?</h3>
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
      var ASSESSMENT_TYPE = 'midpoint-reflection';

      // Modal close (overlay + Escape) — same pattern as other prototype pages
      document.addEventListener('click', function (e) {
        var c = e.target.closest('[data-close]');
        if (c) { var m = c.closest('.modal'); if (m) m.hidden = true; }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal:not([hidden])').forEach(function (m) { m.hidden = true; });
        }
      });

      // Submit click → validate → open confirm modal
      document.querySelector('[data-action="submit-assessment"]').addEventListener('click', function () {
        var idValid = IMPACT.validate([
          { selector: '#last',   required: true },
          { selector: '#cohort', required: true },
          { selector: '#zip',    pattern: /^\d{5}$/, message: '5 digits' }
        ]);
        if (!idValid) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please fill in your identity before submitting.' });
          return;
        }
        var inputs = document.querySelectorAll('.assessment-question__input');
        var answered = 0;
        inputs.forEach(function (t) { if (t.value.trim().length > 0) answered++; });
        if (answered < 4) {
          IMPACT.toast({ kind: 'danger', label: 'INCOMPLETE', message: 'Please answer at least 4 questions before submitting.' });
          return;
        }
        document.getElementById('submitModal').hidden = false;
      });

      // Confirm modal "Submit" → mark complete → toast → confirmation page
      document.querySelector('[data-action="confirm-submit"]').addEventListener('click', function () {
        IMPACT.markAssessmentComplete(ASSESSMENT_TYPE);
        IMPACT.toast({ kind: 'success', label: 'SUBMITTED', message: 'Your Midpoint Reflection has been recorded.' });
        setTimeout(function () {
          location.href = 'assessment-confirmation.html?type=' + ASSESSMENT_TYPE;
        }, 700);
      });
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Manual verification — page renders**

Open `Prototypes/PROTOTYPE/midpoint-reflection.html`. Expected:
- "← Back to assessments" link in nav
- Page head: "MIDPOINT REFLECTION / 2026 / ONE SUBMISSION", title "REFLECT ON THE JOURNEY."
- Identity card + 8 question cards numbered 01–08
- Action bar with "Submit Midpoint Reflection" button
- Modal markup at the bottom (hidden)

- [ ] **Step 3: Manual verification — submission flow**

In a fresh tab: fill identity + 4+ textareas → click **Submit Midpoint Reflection** → confirm modal opens → click **Submit** → green toast → navigates to `assessment-confirmation.html?type=midpoint-reflection`.

In DevTools Console:

```js
sessionStorage.getItem('impact.assessment.midpoint-reflection.completedAt')
```

Expected: an ISO timestamp string.

Navigate to `intern-assessments.html` in the same tab. Expected: Midpoint Reflection card shows the "Submitted on [today]" pill.

Clean up:

```js
sessionStorage.removeItem('impact.assessment.midpoint-reflection.completedAt');
```

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/midpoint-reflection.html
git commit -m "Add midpoint-reflection.html — free-form Midpoint Reflection assessment form

Identity card + 8 textarea questions. Same validation and submission flow as
personal-goals.html. Marks completion as 'midpoint-reflection' in sessionStorage
and navigates to assessment-confirmation.html?type=midpoint-reflection."
```

---

## Task 6: Make `assessment-confirmation.html` type-aware

**Files:**
- Modify: `Prototypes/PROTOTYPE/assessment-confirmation.html`

- [ ] **Step 1: Update the document title (head)**

Open `Prototypes/PROTOTYPE/assessment-confirmation.html`. Find this line:

```html
  <title>Thank You — Self-Assessment Submitted — IMPACT</title>
```

Replace with:

```html
  <title>Thank You — Submission Received — IMPACT</title>
```

- [ ] **Step 2: Add `data-confirm` hooks to the existing markup**

Find this block (around lines 38-45):

```html
      <span class="micro-label">SELF-ASSESSMENT / 2026 / SUBMITTED</span>

      <h1 class="confirm__title">Thank you,<br/><span class="confirm__name">Bayer.</span></h1>

      <p class="confirm__body">
        Your program reflection has been received and locked. A copy is now part of your
        cohort record and will inform your IMPACT program outcomes.
      </p>
```

Replace with:

```html
      <span class="micro-label" data-confirm="micro">INTERN ASSESSMENT / 2026 / SUBMITTED</span>

      <h1 class="confirm__title" data-confirm="title">Submission received.</h1>

      <p class="confirm__body" data-confirm="body">
        Thanks for your submission. Your cohort administrator will be notified.
      </p>
```

(Removes the hardcoded "Bayer" name since identity is captured on the form, not displayed back here in this iteration.)

- [ ] **Step 3: Add the type-aware IIFE before `</body>`**

Find this line near the end of the file:

```html
</body>
</html>
```

Replace with:

```html
  <script src="app.js"></script>
  <script>
    (function () {
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
        }
      };
      var fallback = {
        micro: 'INTERN ASSESSMENT / 2026 / SUBMITTED',
        title: 'Submission received.',
        body:  'Thanks for your submission. Your cohort administrator will be notified.'
      };
      var entry = copy[IMPACT.qs('type')] || fallback;
      var microEl = document.querySelector('[data-confirm="micro"]');
      var titleEl = document.querySelector('[data-confirm="title"]');
      var bodyEl  = document.querySelector('[data-confirm="body"]');
      if (microEl) microEl.textContent = entry.micro;
      if (titleEl) titleEl.textContent = entry.title;
      if (bodyEl)  bodyEl.textContent  = entry.body;
    })();
  </script>

</body>
</html>
```

- [ ] **Step 4: Manual verification — Personal Goals**

Open `Prototypes/PROTOTYPE/assessment-confirmation.html?type=personal-goals` directly in the browser.

Expected:
- Micro-label reads "PERSONAL GOALS / 2026 / SUBMITTED"
- Title reads "Personal Goals submitted."
- Body reads "Thanks for sharing your goals. Your cohort administrator can now see your starting reflection."
- The check-mark badge, receipt card, and "Return Home" button still render (we left them as-is)

- [ ] **Step 5: Manual verification — Midpoint Reflection**

Open `Prototypes/PROTOTYPE/assessment-confirmation.html?type=midpoint-reflection`.

Expected:
- Micro-label reads "MIDPOINT REFLECTION / 2026 / SUBMITTED"
- Title reads "Midpoint Reflection submitted."
- Body matches the configured copy

- [ ] **Step 6: Manual verification — fallback (no `?type=`)**

Open `Prototypes/PROTOTYPE/assessment-confirmation.html` (no query string).

Expected:
- Micro-label reads "INTERN ASSESSMENT / 2026 / SUBMITTED"
- Title reads "Submission received."
- Body reads "Thanks for your submission. Your cohort administrator will be notified."

- [ ] **Step 7: Manual verification — unknown type**

Open `Prototypes/PROTOTYPE/assessment-confirmation.html?type=garbage`.

Expected: same fallback as Step 6.

- [ ] **Step 8: Commit**

```bash
git add Prototypes/PROTOTYPE/assessment-confirmation.html
git commit -m "Parameterize assessment-confirmation.html via ?type= query param

Reads ?type=personal-goals or ?type=midpoint-reflection and swaps the micro-label,
title, and body copy. Falls back to a generic 'Submission received' message if
the param is missing or unknown. Removes the hardcoded 'Bayer' name."
```

---

## Task 7: Re-point `index.html` entry points to the chooser

**Files:**
- Modify: `Prototypes/PROTOTYPE/index.html`

- [ ] **Step 1: Re-point the top-nav `Intern Assessments` link**

In `Prototypes/PROTOTYPE/index.html`, find this line in the `<nav class="nav__links">` block:

```html
        <a href="self-assessment.html" class="nav__link">Intern Assessments</a>
```

Replace with:

```html
        <a href="intern-assessments.html" class="nav__link">Intern Assessments</a>
```

- [ ] **Step 2: Re-point the hero "Start Personal Goals" CTA**

Find the hero CTA block (around lines 53-62):

```html
              <a href="self-assessment.html" class="btn btn--primary">
                Start Personal Goals
                <span class="btn__arrow">&rarr;</span>
              </a>
              <a href="login.html" class="btn btn--white">
                Start Midpoint Reflection
                <span class="btn__arrow">&rarr;</span>
              </a>
```

Replace with:

```html
              <a href="intern-assessments.html" class="btn btn--primary">
                Start Personal Goals
                <span class="btn__arrow">&rarr;</span>
              </a>
              <a href="intern-assessments.html" class="btn btn--white">
                Start Midpoint Reflection
                <span class="btn__arrow">&rarr;</span>
              </a>
```

- [ ] **Step 3: Re-point the footer link**

Find the footer block (around line 134):

```html
        <a href="self-assessment.html">Self-Assessment</a>
```

Replace with:

```html
        <a href="intern-assessments.html">Intern Assessments</a>
```

- [ ] **Step 4: Manual verification**

Open `Prototypes/PROTOTYPE/index.html`. Click each of these and confirm the destination URL:

| Element | Expected URL after click |
|---|---|
| Top-nav "Intern Assessments" | `intern-assessments.html` |
| Hero "Start Personal Goals" button | `intern-assessments.html` |
| Hero "Start Midpoint Reflection" button | `intern-assessments.html` |
| Footer "Intern Assessments" link | `intern-assessments.html` |

(Use the back button between each click to return to `index.html`.)

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/index.html
git commit -m "Re-point index.html entry points to intern-assessments.html

Top-nav, both hero CTAs, and the footer link now route to the new chooser
page. The chooser is the canonical hub for both Personal Goals and Midpoint
Reflection."
```

---

## Task 8: Re-point `login.html` entry points to the chooser

**Files:**
- Modify: `Prototypes/PROTOTYPE/login.html`

- [ ] **Step 1: Re-point the top-nav link**

In `Prototypes/PROTOTYPE/login.html`, find this line in the nav:

```html
        <a href="self-assessment.html" class="nav__link">Intern Assessments</a>
```

Replace with:

```html
        <a href="intern-assessments.html" class="nav__link">Intern Assessments</a>
```

- [ ] **Step 2: Re-point any "Intern? Go to ..." prompt and footer link**

Search the file for any remaining `self-assessment.html` references:

Run: `grep -n "self-assessment" Prototypes/PROTOTYPE/login.html`

For each match, replace `self-assessment.html` with `intern-assessments.html`. Specifically expect to update:
- Line 73 (or near): `Intern? Go to Self-Assessment →` → `Intern? Go to Intern Assessments →` (link href + text)
- Line 88 (or near): footer `<a href="self-assessment.html">Self-Assessment</a>` → `<a href="intern-assessments.html">Intern Assessments</a>`

- [ ] **Step 3: Manual verification**

Open `Prototypes/PROTOTYPE/login.html`. Click each link and confirm:

| Element | Expected URL after click |
|---|---|
| Top-nav "Intern Assessments" | `intern-assessments.html` |
| "Intern? Go to Intern Assessments →" link in the form area | `intern-assessments.html` |
| Footer "Intern Assessments" link | `intern-assessments.html` |

Run again to confirm no stragglers:

`grep -n "self-assessment" Prototypes/PROTOTYPE/login.html`

Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/login.html
git commit -m "Re-point login.html entry points to intern-assessments.html

Top-nav, intern-prompt link in the login form, and footer link all now route
to the new chooser page."
```

---

## Task 9: Delete the old `self-assessment.html`

**Files:**
- Delete: `Prototypes/PROTOTYPE/self-assessment.html`

- [ ] **Step 1: Confirm there are no remaining incoming links from public pages**

Run: `grep -rn "self-assessment.html" Prototypes/PROTOTYPE/ --include="*.html"`

Expected matches (admin pages — out of scope, leave alone):
- None should appear from `index.html`, `login.html`, `intern-assessments.html`, `personal-goals.html`, `midpoint-reflection.html`, or `assessment-confirmation.html`.

If any of those public pages still references `self-assessment.html`, fix it before continuing.

Note: admin pages like `dashboard.html`, `interns-dashboard.html`, etc. may still reference `self-assessment-results.html` — that's a different file (admin results list) and is out of scope. Only `self-assessment.html` is being deleted in this task.

- [ ] **Step 2: Delete the file (and stage the deletion)**

```bash
git rm Prototypes/PROTOTYPE/self-assessment.html
```

- [ ] **Step 3: Manual verification**

Confirm the file is gone:

```bash
ls Prototypes/PROTOTYPE/self-assessment.html
```

Expected: `cannot access ... No such file or directory`.

Confirm the deletion is staged:

```bash
git status
```

Expected: `deleted: Prototypes/PROTOTYPE/self-assessment.html` under "Changes to be committed".

Open `Prototypes/PROTOTYPE/index.html` in a browser and click the top-nav "Intern Assessments" link. Expected: lands on `intern-assessments.html`, no broken link.

- [ ] **Step 4: Commit**

```bash
git commit -m "Delete self-assessment.html — superseded by chooser + two new forms

Replaced by intern-assessments.html (chooser), personal-goals.html, and
midpoint-reflection.html. Admin-side self-assessment views remain (deferred
restructure)."
```

---

## Task 10: Update `CLAUDE.md` to reflect the new page inventory and helpers

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the page count and Public section**

Open `CLAUDE.md`. Find this paragraph at the top:

```markdown
The **IMPACT Internship Assessment Portal** is a web app for an Indiana-based internship program. Currently in the **prototype stage** — a fully clickable 24-page static HTML/CSS/JS demo with a shared mock dataset. The next phase is converting this into a production application.
```

Replace `24-page` with `26-page`.

Find the Public section in the page inventory:

```markdown
**Public (intern-facing):**
- `index.html` — Landing with hero, program pillars, dual CTA
- `self-assessment.html` — Intern self-assessment form (5 categories × 3 questions)
- `assessment-confirmation.html` — Post-submit thank-you with receipt card
```

Replace with:

```markdown
**Public (intern-facing):**
- `index.html` — Landing with hero, program pillars, dual CTA (both routing to the chooser)
- `intern-assessments.html` — Chooser hub with two cards (Personal Goals, Midpoint Reflection); status-aware via sessionStorage
- `personal-goals.html` — Free-form Personal Goals assessment (7 textarea questions)
- `midpoint-reflection.html` — Free-form Midpoint Reflection assessment (8 textarea questions)
- `assessment-confirmation.html` — Post-submit thank-you, parameterized by `?type=personal-goals|midpoint-reflection`
```

- [ ] **Step 2: Add the new helpers to the `app.js` description**

Find this list under the Shared module section:

```markdown
### Shared module: `app.js`

All admin pages import `app.js`, which provides:
- **Mock dataset** — `IMPACT.COHORTS`, `IMPACT.INTERNS`, `IMPACT.READINESS`, `IMPACT.COMPETENCY`, `IMPACT.SELF` arrays with lookup helpers (`cohortById`, `internById`, etc.)
- **`wireModals()`** — data-open/data-close/Escape modal toggling (also duplicated as inline IIFEs on each page for reliability)
- **`toast(opts)`** — bottom-right notification with kind (success/danger/gold), label, message, auto-dismiss
- **`validate(fieldSpecs)`** — inline form validation (required, SELECT detection, regex patterns)
- **`wireTableFilter(spec)`** — live search/filter on list tables with automatic empty-state row and count update
- **`hydrateInternEdit()`**, **`hydrateReadinessDetail()`**, etc. — `?id=` URL param lookup to show per-row data on detail/edit pages
- **`internsByCohort(cohortId)`** — filter interns by cohort for the enrolled-interns table on cohort-detail
```

After the `internsByCohort` bullet, add:

```markdown
- **`assessmentStatus(type)`**, **`markAssessmentComplete(type)`**, **`formatCompletionDate(date)`**, **`ASSESSMENT_TYPES`** — sessionStorage-backed tracking of public-side assessment completion (Personal Goals / Midpoint Reflection). Used by the chooser and form pages; helpers no-op gracefully if sessionStorage is unavailable.
```

- [ ] **Step 3: Update the Product rules section**

Find the Self-Assessment bullet under "Product rules to know":

```markdown
- **Self-Assessment**: one submission per intern, immutable. Intern cannot edit. Admin has a dedicated view/delete screen.
```

Replace with:

```markdown
- **Intern assessments (Personal Goals + Midpoint Reflection)**: each is one submission per intern, immutable. The chooser page (`intern-assessments.html`) shows per-tab completion status from `sessionStorage`. Admin-side views still reference the old single self-assessment (deferred restructure). The previous `self-assessment.html` rubric form has been deleted.
```

- [ ] **Step 4: Manual verification**

Re-read the updated CLAUDE.md sections. Expected: page count is 26, Public section lists the four new files, app.js helper list mentions the new sessionStorage helpers, product rules describe Personal Goals + Midpoint Reflection.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "Update CLAUDE.md for chooser + Personal Goals + Midpoint Reflection rollout

Page count 24 → 26. Public section lists new chooser hub and two new forms.
app.js helpers section adds the sessionStorage-backed completion helpers.
Product rules describe the new two-assessment shape and note that admin-side
restructure is deferred."
```

---

## Task 11: End-to-end manual sweep

**Files:** None modified — this is a verification task with no code changes.

- [ ] **Step 1: Hero CTA flow → submit Personal Goals**

Open a fresh tab. Navigate to `Prototypes/PROTOTYPE/index.html`.

1. Click the hero "Start Personal Goals" button → lands on `intern-assessments.html`
2. Both cards show "Begin …" CTAs
3. Click "Begin Personal Goals" → lands on `personal-goals.html`
4. Fill identity (`Last = Patterson`, `Cohort = Eskenazi 2026`, `Zip = 46208`)
5. Fill at least 4 textareas
6. Click **Submit Personal Goals** → confirm modal opens
7. Click **Submit** in modal → green toast → redirect to `assessment-confirmation.html?type=personal-goals`
8. Confirmation page reads "Personal Goals submitted." with the right body copy

- [ ] **Step 2: Return to chooser, verify completed state**

From the confirmation page, click "Return Home" → land on `index.html`.

Click top-nav "Intern Assessments" → land on `intern-assessments.html`.

Expected: Personal Goals card is muted with "✓ Submitted on [today]" pill. Midpoint Reflection card still shows "Begin Midpoint Reflection" CTA.

- [ ] **Step 3: Submit Midpoint Reflection**

Click "Begin Midpoint Reflection" → lands on `midpoint-reflection.html`.

Fill identity + 4+ textareas. Submit. Expected: green toast → redirect to `assessment-confirmation.html?type=midpoint-reflection`.

Return to chooser. Expected: both cards show "Submitted on [today]" pills.

- [ ] **Step 4: Validation edges**

Open `personal-goals.html` in a fresh tab.

Click Submit with no fields → identity errors + CHECK FIELDS toast. No modal.

Fill identity, no textareas → INCOMPLETE toast. No modal.

Fill identity + exactly 3 textareas → INCOMPLETE toast. No modal.

Fill identity + 4 textareas → modal opens. Click "Keep Editing" → modal closes, no submission.

Open the modal again. Press Escape → modal closes.

- [ ] **Step 5: Fallback confirmation page**

Navigate to `assessment-confirmation.html` directly (no `?type=`).

Expected: micro-label "INTERN ASSESSMENT / 2026 / SUBMITTED", title "Submission received.", generic body.

Navigate to `assessment-confirmation.html?type=garbage`.

Expected: same generic fallback.

- [ ] **Step 6: Mobile breakpoint**

In DevTools, switch to mobile viewport (≤720px wide). Visit `intern-assessments.html`.

Expected: cards stack vertically, no horizontal overflow, all text legible.

- [ ] **Step 7: Print preview on a form page**

Open `personal-goals.html`. Press Ctrl+P (or Cmd+P).

Expected: nav, action bar, and modal hidden in the print preview (existing `@media print` rules); identity card and questions render cleanly.

- [ ] **Step 8: New-tab reset**

Close all tabs. Open a fresh tab to `intern-assessments.html`.

Expected: both cards reset to "Begin …" CTAs (sessionStorage is per-tab and was cleared with the close).

- [ ] **Step 9: No commit**

This task makes no code changes. If everything passes, the implementation is complete. If anything fails, file the issue and fix in a follow-up commit before considering the plan done.

---

## File Structure Summary

**Created (3 new files):**
- `Prototypes/PROTOTYPE/intern-assessments.html`
- `Prototypes/PROTOTYPE/personal-goals.html`
- `Prototypes/PROTOTYPE/midpoint-reflection.html`

**Modified (5 files):**
- `Prototypes/PROTOTYPE/app.js` (added: ASSESSMENT_TYPES, assessmentStatus, markAssessmentComplete, formatCompletionDate)
- `Prototypes/PROTOTYPE/styles.css` (added: `.assessment-grid`, `.assessment-card` family, `.assessment-question` family, `.assessment-foot-note`)
- `Prototypes/PROTOTYPE/assessment-confirmation.html` (parameterized via `?type=`)
- `Prototypes/PROTOTYPE/index.html` (entry points re-pointed)
- `Prototypes/PROTOTYPE/login.html` (entry points re-pointed)
- `CLAUDE.md` (page inventory + helper docs + product rules)

**Deleted (1 file):**
- `Prototypes/PROTOTYPE/self-assessment.html`

**Out of scope (untouched):**
- `Prototypes/PROTOTYPE/self-assessment-results.html` (admin)
- `Prototypes/PROTOTYPE/self-assessment-detail.html` (admin)
- All admin nav references to "Self-Assessment Results"
- The admin home activity feed entry mentioning Self-Assessment
