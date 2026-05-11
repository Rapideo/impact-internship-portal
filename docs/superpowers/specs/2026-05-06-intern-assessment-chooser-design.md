# Intern Assessment Chooser — Design

**Status:** Approved (brainstormed 2026-05-06)
**Scope:** Public/intern-facing pages only. Admin-side restructure deferred.

## Goal

An intern can complete one of two free-form assessments — **Personal Goals** (start of program) and **Midpoint Reflection** (mid-program). A new chooser page presents both options, and after either is submitted in the current browser session, the chooser shows that assessment as completed with a date.

## Page inventory

### New (3)
- **`intern-assessments.html`** — Chooser hub. Two-card layout, status-aware via sessionStorage.
- **`personal-goals.html`** — Form: identity card + 6–8 free-form textarea questions + submit.
- **`midpoint-reflection.html`** — Same shape as Personal Goals, different questions.

### Modified (3)
- **`index.html`** — Both hero CTAs (`Start Personal Goals`, `Start Midpoint Reflection`) re-pointed to `intern-assessments.html`. Footer's `Self-Assessment` link → `intern-assessments.html`.
- **`login.html`** — Top-nav `Intern Assessments` link → `intern-assessments.html`. Footer link too.
- **`assessment-confirmation.html`** — Reads `?type=` query param on load and swaps title/body for the right assessment. Falls back to a generic message if the param is missing or unknown.

### Deleted (1)
- **`self-assessment.html`** — Superseded by the two new forms.

### Untouched (deferred)
The admin side keeps referring to "Self-Assessment Results" — `self-assessment-results.html`, `self-assessment-detail.html`, the admin-nav link, the admin home activity feed entry. These will be restructured in a separate iteration.

## Routing

All public entry points funnel through the chooser:

| Source | Destination |
|---|---|
| Top-nav `Intern Assessments` link (`index.html`, `login.html`) | `intern-assessments.html` |
| Hero CTA `Start Personal Goals` | `intern-assessments.html` |
| Hero CTA `Start Midpoint Reflection` | `intern-assessments.html` |
| Footer `Self-Assessment` link | `intern-assessments.html` |
| Chooser → "Begin Personal Goals" card CTA | `personal-goals.html` |
| Chooser → "Begin Midpoint Reflection" card CTA | `midpoint-reflection.html` |
| Either form submit | `assessment-confirmation.html?type=personal-goals` or `?type=midpoint-reflection` |


## Chooser page (`intern-assessments.html`)

**Header** matches existing public pages — public top-nav (logo + "Back to home"), then a `page-head` block:
- Micro-label breadcrumb: `INTERN ASSESSMENTS / 2026`
- Archivo Black title: `CHOOSE YOUR<br/>ASSESSMENT.`
- One-line subhead introducing the two paths

**Body** — two cards in a 2-column grid (collapsing to a single column at the existing tablet/phone breakpoints). Card structure:
- Top: monospaced micro-label (`PERSONAL GOALS` / `MIDPOINT REFLECTION`)
- Display headline (e.g., "Set your starting line." / "Reflect on the journey.")
- One-sentence description of when/why an intern fills this out
- Status row at the bottom that swaps based on completion:
  - **Not yet completed:** primary navy `Begin Personal Goals →` button (`btn btn--primary`) routing to the form
  - **Completed:** card gets a `.assessment-card--done` modifier (canvas-tinted background, lighter border, muted text, no hover lift). A gold check icon + "Submitted on April 21, 2026" replaces the button with an inert pill. The card itself is not clickable in this state — the entire `<a>` is replaced with a non-anchor element.

**Visual rhythm:** Card shell reuses the existing `.stat-card` shape (1px rule border, `var(--radius-md)`, 28px padding, white bg) so the page lands inside the established design language without inventing a new card primitive.

**Below the cards:** a small footer note: "Each assessment can only be submitted once. Completion is recorded for your cohort administrator."

## Form pages (`personal-goals.html`, `midpoint-reflection.html`)

Both forms mirror the shell of the existing `self-assessment.html`:

- Public top-nav with "Back to home" link
- `page-head` with micro-label breadcrumb (`PERSONAL GOALS / 2026 / ONE SUBMISSION`) and Archivo Black title
- **Identity card** — Last Name + Cohort + Zipcode (reused as-is from current self-assessment, including the 6-cohort dropdown)
- **Questions section** — 6–8 textareas, each with a question label + a 1-line helper ("2–3 sentences is ideal")
- **Submit row** — confirm modal (data-open / data-close), toast on confirm, navigation to `assessment-confirmation.html?type=...`

### Validation

Reuses `IMPACT.validate()`:
- Last Name: required
- Cohort: required, must not be the placeholder "Select cohort"
- Zip: required, must match `/^\d{5}$/`
- At least 4 of the question textareas must be non-empty (so an intern can't submit blank)

### On submit

1. Validate. If invalid, surface inline errors and abort.
2. Open confirmation modal.
3. On modal "Submit": call `IMPACT.markAssessmentComplete(type)`, fire success toast, navigate to `assessment-confirmation.html?type=<type>`.
4. On modal "Cancel": close modal, do nothing else.

### Drafted question content (placeholder)

**Personal Goals:**

1. What are you most hoping to learn or experience during this internship?
2. What 2–3 specific skills or competencies do you want to develop?
3. Describe a professional goal you'd like to achieve by the end of the program.
4. What does success look like for you in this role?
5. What support, feedback, or resources will help you reach these goals?
6. What's one habit or behavior you want to strengthen during the program?
7. How will you know you're making progress on these goals?

**Midpoint Reflection:**

1. What's gone better than you expected so far?
2. What's been harder than you anticipated, and how have you responded?
3. Describe a moment in the past several weeks where you grew or learned something significant.
4. Looking back at the goals you set at the start, where have you made the most progress?
5. Where do you feel stuck or want more support?
6. What feedback have you received from your supervisor or team, and how are you applying it?
7. What's your focus for the second half of the internship?
8. Anything else you want your cohort administrator to know?

Final question content from program staff will replace these.

## Confirmation page (`assessment-confirmation.html`)

Reads `?type=` from `window.location.search` on load. A small inline IIFE looks up a `{ title, body }` config keyed by type and injects it into existing markup:

| `type` | Title | Body |
|---|---|---|
| `personal-goals` | "Personal Goals submitted." | "Thanks for sharing your goals. Your cohort administrator can now see your starting reflection." |
| `midpoint-reflection` | "Midpoint Reflection submitted." | "Thanks for the thoughtful reflection. Your cohort administrator can now see your mid-program update." |
| _(missing or unknown)_ | "Submission received." | Generic fallback copy. |

The existing receipt card and "Back to home" CTA stay as-is.

## Data flow — sessionStorage

### Keys

```
"impact.assessment.personal-goals.completedAt"  → ISO 8601 string
"impact.assessment.midpoint-reflection.completedAt" → ISO 8601 string
```

Absence of the key means "not completed."

### Helpers in `app.js`

```js
IMPACT.ASSESSMENT_TYPES = {
  PERSONAL_GOALS: 'personal-goals',
  MIDPOINT: 'midpoint-reflection'
};

IMPACT.assessmentStatus(type)
  → { completed: boolean, completedAt: Date | null }
  Reads sessionStorage; returns { completed: false, completedAt: null }
  if the key is missing, sessionStorage throws, or the stored value
  fails to parse as a valid date.

IMPACT.markAssessmentComplete(type)
  → writes new Date().toISOString() to the key for `type`.
  Wraps the write in try/catch and silently no-ops on failure.

IMPACT.formatCompletionDate(date)
  → "April 21, 2026"-style string via
  Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).
```

### Wiring

**Chooser page** (inline IIFE at end of `<body>`):
On `DOMContentLoaded`, for each card: call `IMPACT.assessmentStatus(type)`. If `completed`, add the `.assessment-card--done` class, replace the `<a class="btn">` with the inert "Submitted on …" pill markup, and inject `IMPACT.formatCompletionDate(completedAt)`.

**Form pages** (inline IIFE at end of `<body>`):
1. Submit click → `IMPACT.validate(fieldSpecs)`. If valid, open confirm modal (existing `data-open`/`data-close` pattern).
2. Confirm modal "Submit" → `IMPACT.markAssessmentComplete(type)` → `IMPACT.toast(...)` → `window.location.href = 'assessment-confirmation.html?type=' + type`.
3. Cancel modal → close, do nothing.

**Confirmation page** (inline IIFE at end of `<body>`): parse `?type=`, swap title and body text via the config table. Default to generic copy on missing/unknown.

## CSS additions (in `styles.css`)

- `.assessment-grid` — 2-column grid for the chooser cards, gap 24px, collapsing to 1 column at the existing tablet breakpoint
- `.assessment-card` — extends `.stat-card`'s shape, includes the micro-label / headline / description / status-row layout
- `.assessment-card--done` — muted state: `background: var(--canvas)`, lighter border, muted text color, no hover lift
- `.assessment-card__pill` — inert "Submitted on …" pill: small uppercase IBM Plex Mono, gold check icon, navy text on canvas
- `.assessment-card__check` — gold check icon (SVG inline or unicode ✓ in a circular nav-deep background)

No hex values inline; all use existing CSS custom properties.

## Edge cases & decisions

- **sessionStorage is per-tab.** A submission in tab A is not visible in tab B. Acceptable for prototype; aligns with chosen persistence option.
- **Direct URL access to a form page after completion.** Not gated. The intern can manually navigate to `personal-goals.html` and resubmit, overwriting the timestamp. Known prototype limitation.
- **sessionStorage unavailable** (privacy mode, embedded contexts): helpers fall back gracefully — chooser always shows "Begin," form submission still navigates to confirmation.
- **Identity mismatch across submissions.** No enforcement that the same intern submits both. sessionStorage tracks per-tab completion state, not per-intern identity. Acceptable for prototype.
- **Stale `Self-Assessment Results` references on the admin side.** Out of scope. Will be addressed when admin views are restructured to handle both assessment types.

## Manual test plan

1. Fresh tab → `intern-assessments.html` → both cards show "Begin" CTAs.
2. Click "Begin Personal Goals" → fill identity + ≥4 textareas → Submit → confirm modal → toast → land on confirmation page with Personal Goals copy.
3. Back to home → "Intern Assessments" → Personal Goals card now reads "Submitted on [today]"; Midpoint card still shows "Begin."
4. Submit Midpoint → both cards show "Submitted on [today]."
5. Submit Personal Goals with no identity → validation blocks. Submit with <4 textareas filled → validation blocks.
6. Close tab → reopen → both cards reset to "Begin."
7. Resize to mobile breakpoint → cards stack vertically.
8. Print preview on a form page → existing `@media print` rules produce a clean printout.
9. Hero CTAs on `index.html` → both navigate to `intern-assessments.html`.
10. Confirmation page hit directly without `?type=` → generic fallback copy renders.

## Out of scope

- Admin-side restructure to view Personal Goals + Midpoint Reflection submissions
- Real backend / persistence beyond `sessionStorage`
- Cross-tab or cross-device completion sync
- Identity-aware completion ("show this intern's status anywhere")
- Editing or deleting a submitted assessment
