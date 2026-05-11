# Unified Intern Record + Readiness Removal — Design

**Status:** Approved (brainstormed 2026-05-06)
**Iteration:** 1 of 3 (phased decomposition)
**Scope:** Replace `intern-new.html` and `intern-edit.html` with a single `intern-record.html` that renders 7 categorized rubric panels. Remove the entire Readiness Assessment area. Defer related detail pages and the two new forms (Participant Feedback, Exit Employer Survey) to follow-up iterations.

## Goal

The program no longer runs a separate Readiness Assessment as the gateway into an internship. Instead, intern intake captures all of the relevant data on a unified intern record. This iteration reshapes the prototype to match.

A single `intern-record.html` page handles both creation (new intern) and editing (existing intern), routed by the `?id=` URL param. The page presents 7 numbered rubric panels — `Personal Information`, `Internship Details`, `Entry Assessment`, `Role-Specific Competency Questions`, `Intern Self-Assessments`, `Evaluations`, `Employment Details` — using the same `01/02/03` design language as the deleted Readiness rubric.

## Page inventory

### Created (1)
- **`intern-record.html`** — Unified intern record page (new + edit modes via `?id=`). 7 rubric panels.

### Deleted (6)
- **`intern-new.html`** — superseded by `intern-record.html`
- **`intern-edit.html`** — superseded by `intern-record.html`
- **`dashboard.html`** — Readiness Completed Assessments list (no replacement; whole feature removed)
- **`readiness-new.html`**
- **`readiness-edit.html`**
- **`readiness-detail.html`**

### Modified
- **All admin pages with the top nav** (~15 files) — drop the `Readiness` nav link. New nav order: `Home · Interns · Competency · Self-Assessment Results · Reports · admin-chip`.
- **`admin.html`** — remove Readiness KPI tile (KPI grid drops to 3 tiles), remove "View Readiness" quick-link card, remove Readiness mentions from the activity feed.
- **`interns-dashboard.html`** — "Add Intern" button → `intern-record.html`; row edit links → `intern-record.html?id=<internId>`.
- **`app.js`** — see "app.js changes" below.
- **Mock data in `app.js`** — extend `IMPACT.INTERNS` with `first` (first name), `dob`, and `endDate` fields.
- **`CLAUDE.md`** — page count 26 → 21; rewrite Public/Admin page inventory; trim app.js helper list (remove readiness helpers, add new ones); replace the "Promotion: passing readiness auto-creates intern" rule with an "Add Intern is the canonical creation path" rule.
- **`PRD.md`** — remove the Readiness Assessment section. Add a one-paragraph note that the unified Intern Record consolidates intake, role-specific competency tracking, self-assessment links, and post-placement outcomes.
- **`App Outline.md`** — remove Readiness screens; replace the separate `Add Intern` and `Edit Intern` outlines with a single `Intern Record` outline reflecting the 7 panels.

### Out of scope (deferred to iterations 2 and 3)
- **Iteration 2 — new forms:** `participant-feedback.html`, `exit-employer-survey.html` (intern-side feedback form; admin-entered employer survey).
- **Iteration 3 — admin detail pages:** `personal-goals-detail.html`, `midpoint-reflection-detail.html`, `participant-feedback-detail.html`, `exit-employer-survey-detail.html`.
- **Admin restructure for the public-side Personal Goals / Midpoint Reflection submissions** (still deferred from the prior chooser spec).
- **Admin home polish** — the freed KPI/quick-link space stays empty in this iteration; layout polish handled separately.

## Routing & URL contract

`intern-record.html` reads `?id=<internId>` from `window.location.search`:

| URL | Mode | Title | Breadcrumb | Action bar |
|---|---|---|---|---|
| `intern-record.html` | New | `NEW INTERN.` | `ADMIN / INTERNS / NEW` | Cancel · Save Changes |
| `intern-record.html?id=<known-id>` | Edit | `EDIT INTERN.` | `ADMIN / INTERNS / EDIT` | Cancel · Delete · Save Changes |
| `intern-record.html?id=<unknown-id>` | Edit (empty) | `EDIT INTERN.` | same | same | + danger toast on load: "NOT FOUND — No intern with that ID."

## The 7 panels

Each panel uses the existing `<article class="rubric-panel">` markup with `.rubric-panel__num` (`01`–`07`), `.rubric-panel__title-block` (title + meta), and panel-specific content. The panels render in this order top to bottom:

### Panel 01 — Personal Information

Four `.field` inputs in an `.id-grid`-style 4-column row (collapsing to 2 columns on tablet, 1 on phone):
- `firstName` — `<input class="input" type="text">`, required
- `lastName` — `<input class="input" type="text">`, required
- `dob` — `<input class="input" type="date">`, required
- `zip` — `<input class="input" type="text" inputmode="numeric" maxlength="5">`, required, pattern `/^\d{5}$/`

**Edit mode locking:** All four fields render as a read-only `meta-strip` (existing pattern from `intern-edit.html`) instead of inputs. Identity is immutable post-creation per the PRD.

### Panel 02 — Internship Details

Four `.field` inputs in a 4-column row:
- `cohort` — `<select class="select">` with the 6-cohort list (placeholder + Eskenazi 2026 / TTT 2026 / Habitat 2026 / Elevate 2026 / Geminus 2026 / Health Link 2026), required
- `employer` — read-only display, auto-populated from `IMPACT.cohortById(cohortId).employer` when cohort changes
- `startDate` — `<input type="date">`, auto-fills to `cohort.start` when cohort is picked AND the field is empty (don't overwrite user edits); otherwise editable
- `endDate` — `<input type="date">`, same behavior with `cohort.end`

**Edit mode locking:** All four fields render as read-only meta-strip values (cohort, employer, start, end). Cohort change cascading only applies in new mode.

### Panel 03 — Entry Assessment

12 barrier checkboxes in a single-column list (or a 2-column grid on desktop):

```
[ ] No reliable transportation to placement site
[ ] No childcare arrangements during placement hours
[ ] Housing instability or lack of permanent address
[ ] Limited access to professional/work-appropriate clothing
[ ] Limited internet or phone access at home
[ ] Health or medical concerns affecting attendance
[ ] Limited literacy, numeracy, or English-language proficiency
[ ] Justice involvement or background-related barriers
[ ] Caregiving responsibilities for adult family members
[ ] Limited financial reserves before first paycheck
[ ] Missing required documentation (ID, SSN, work auth)
[ ] Limited prior work history, references, or formal employment
```

Below the checkboxes, a `Notes` textarea (3 rows, `placeholder="Additional context, supports, or follow-up needed…"`).

The 12 strings live in `app.js` as `IMPACT.INTERN_BARRIERS` (an exported array) so they're reusable and not duplicated across HTML.

This panel is editable in both new and edit modes.

### Panel 04 — Role-Specific Competency Questions

A list of 6 sample placeholder questions, each as an editable row:

```
[01] [Performs core role tasks independently and correctly        ] [Remove]
[02] [Uses required tools or systems safely and appropriately    ] [Remove]
[03] [Meets role pace and accuracy expectations for entry-level  ] [Remove]
[04] [Follows key role procedures (safety, confidentiality, ...) ] [Remove]
[05] [Communicates professionally with clients/students/customers] [Remove]
[06] [Maintains required documentation accurately and on time    ] [Remove]
            [+ Add question]
```

Reuses the existing role-specific question editor pattern from `cohort-new.html`/`cohort-edit.html` (selector class `role-question-row` per `styles.css`). Add inserts a new empty row; Remove splices the row and re-numbers visible rows. UI-only — no persistence (refreshing resets to the 6 samples).

This panel is editable in both new and edit modes.

### Panel 05 — Intern Self-Assessments

Three sub-cards stacked or in a row, one per assessment:
- **Personal Goals**
- **Mid-Point Reflection**
- **Participant Feedback Form**

Each card shows status text and (per the phased-decomposition decision) a placeholder:

| Mode | Card content |
|---|---|
| New (no `?id=`) | Faded card with text "Will appear after this intern record is saved" |
| Edit, intern has submitted | "Submitted on [date] · Detail view coming soon" (non-clickable pill) |
| Edit, intern has not submitted | "Not yet submitted" (faded pill) |

For Personal Goals and Mid-Point Reflection in edit mode, status reads from `sessionStorage` keys established by the prior chooser feature (`impact.assessment.personal-goals.completedAt` etc.). Note: this is per-tab, so the admin viewing a record won't see what an intern submitted in a different browser session — acceptable prototype limitation, documented as such.

For Participant Feedback Form, the source data doesn't exist yet (form is iteration 2). Always renders the "Not yet submitted" or new-mode placeholder.

This panel is read-only in all modes.

### Panel 06 — Evaluations

Two sub-card groups:

**Competency Assessments** — queries `IMPACT.COMPETENCY` filtered to records matching this intern (by `internId`). For each match, renders a mini-card showing phase, date, and pass/fail pill, linking to `competency-detail.html?id=<recordId>`. If no matches, renders "No competency assessments yet" placeholder.

**Exit Employer Survey** — placeholder card, "Detail view coming soon" (the form doesn't exist yet — iteration 2).

This panel is read-only in all modes.

### Panel 07 — Employment Details

Two outcome rows mirroring the current pattern in `intern-edit.html`:

```
[✓] Employed at 90 days
    Notes: [textarea, 2 rows]

[ ] Still employed at 180 days
    Notes: [textarea, 2 rows]
```

In edit mode, checkbox state hydrates from `IMPACT.INTERNS[id].outcome` (`'90d'` → 90-day checked; `'180d'` → both checked). In new mode, both checkboxes are disabled with hint text "To be tracked once placed." Notes textareas are also disabled in new mode.

This panel is editable in edit mode (for placed interns) and informational in new mode.

## `app.js` changes

### Removed
- `IMPACT.READINESS` mock array
- `readinessById()` function
- `hydrateReadinessDetail()` function
- All three names removed from the `window.IMPACT` export

### Kept (with cleanup)
- `resolveParticipant()` — currently shared with competency. Keep as-is; the readiness call sites that consumed it disappear with the page deletions. The function itself is unchanged.

### Added
- `IMPACT.INTERN_BARRIERS` — exported `const` array of 12 placeholder barrier strings (the list above). Used by the Entry Assessment panel for rendering.
- `hydrateInternRecord(id?)` — populates the intern record page based on the `?id=` param:
  - **No id (new mode):** sets the page-head title to `NEW INTERN.`, breadcrumb to `... / NEW`, hides the Delete button, leaves all editable fields empty, sets Panels 05/06/07 to disabled/placeholder state.
  - **Known id (edit mode):** sets title to `EDIT INTERN.`, breadcrumb to `... / EDIT`, shows the Delete button, hydrates Personal Information + Internship Details from `IMPACT.INTERNS[id]` (rendering as read-only meta-strip values, not inputs), hydrates Panel 07 outcome checkboxes from `intern.outcome`, populates Panel 05 sub-cards from sessionStorage, populates Panel 06 Competency sub-cards from `IMPACT.COMPETENCY` filtered by `internId`.
  - **Unknown id (edit mode, empty):** sets title/breadcrumb to edit-mode chrome but leaves all fields empty; fires danger toast `"NOT FOUND — No intern with that ID."` once the page is loaded.

### Mock data extensions
Each entry in `IMPACT.INTERNS` gains three fields. Example:

```js
{
  id: 'bayer',
  first: 'Marcus',
  last: 'Bayer',
  dob: '1998-03-12',
  cohortId: 'eskenazi-2026',
  zip: '46202',
  start: '04.14.2026',
  endDate: '09.30.2026',
  phase: 'Week 2',
  outcome: 'none'
}
```

Apply consistent placeholder first names + DOBs to all 5 existing entries. End dates default to the cohort's `end` value.

## Save and Delete flows

**Save** (new and edit modes):
1. Click Save Changes → `IMPACT.validate(...)` runs on the required fields:
   - New mode: `firstName`, `lastName`, `dob`, `zip` (with `/^\d{5}$/`), `cohort`. Start/end optional but if filled must be valid dates.
   - Edit mode: only the editable fields validate (Entry Assessment notes can be empty; Role-Specific rows are not validated; Employment Details checkboxes/notes have no required state).
2. On invalid: inline field errors + `IMPACT.toast({kind:'danger', label:'CHECK FIELDS', message:'Please fix the highlighted fields before saving.'})`. Modal does not open.
3. On valid: open save modal (`#updateModal` style from existing edit page).
4. On modal Submit: `IMPACT.toast({kind:'success', label:'SAVED', message:'Intern record saved.'})` then `setTimeout(700) → location.href = 'interns-dashboard.html'`.
5. On modal Cancel/Escape: close modal, no-op.

**Delete** (edit mode only):
1. Click Delete → opens delete modal (`#deleteModal` style from existing edit page).
2. On modal confirm: danger toast `"DELETED — Intern record removed."` then redirect to `interns-dashboard.html` after 700ms.

No real persistence — the prototype's mock dataset isn't mutated. Save and Delete just navigate; the dashboard re-renders from the unchanged mock data.

## Edit-mode locking

In edit mode, the following fields are read-only (rendered as `meta-strip` values, not inputs):
- Panel 01: First Name, Last Name, DOB, Zip
- Panel 02: Cohort, Employer, Start Date, End Date

The remaining panels are editable in edit mode:
- Panel 03 (Entry Assessment): checkboxes + notes
- Panel 04 (Role-Specific Competency Questions): add/remove/edit
- Panel 07 (Employment Details): checkboxes + notes

Panels 05 (Self-Assessments) and 06 (Evaluations) are always read-only by nature.

## Cohort change cascading (new mode only)

When the user changes the Cohort select in Panel 02:
1. Look up the cohort via `IMPACT.cohortById(cohortId)`.
2. Set the Employer display to `cohort.employer`.
3. If Start Date is currently empty, set it to `cohort.start`. If non-empty, leave it.
4. If End Date is currently empty, set it to `cohort.end`. Same.

Edit mode doesn't run this — the cohort field is locked.

## Manual test plan

1. From `interns-dashboard.html` click **Add Intern** → lands on `intern-record.html` (no query string). Page-head reads `NEW INTERN.`, breadcrumb `ADMIN / INTERNS / NEW`. Action bar: Cancel + Save Changes (no Delete).
2. Click a row's edit icon (e.g., Bayer) → lands on `intern-record.html?id=bayer`. Title `EDIT INTERN.`, identity meta-strip shows `Marcus Bayer / Eskenazi 2026 / 46202 / 04.14.2026`. Action bar: Cancel + Delete + Save Changes.
3. New mode, click Save with empty fields → inline errors on First Name / Last Name / DOB / Zip / Cohort + danger toast. No modal.
4. New mode, fill required fields, change Cohort to "TTT 2026" → Employer auto-populates to "Indy Tech Trades", Start/End auto-fill to TTT cohort dates.
5. New mode, fill required fields, click Save → save modal opens. Confirm → success toast → land on dashboard.
6. Edit mode, identity meta-strip is read-only (no inputs).
7. Panel 04: click `+ Add question` → new empty row with auto-numbered prefix. Click Remove on row 03 → row removes, remaining rows re-number.
8. Panel 06 in edit mode for Bayer (who has 2 competency records in mock data) → renders 2 stacked Competency mini-cards each linking to `competency-detail.html?id=...`.
9. Panel 06 in edit mode for an intern with no competency records → renders "No competency assessments yet" placeholder.
10. Panel 05 in edit mode reads sessionStorage; if Personal Goals is "completed", shows "Submitted on [date] · Detail view coming soon" non-clickable pill.
11. Panel 07 in new mode: both checkboxes disabled with "To be tracked once placed." hint.
12. `intern-record.html?id=garbage` → edit-mode chrome with empty fields + danger NOT FOUND toast on load.
13. Top nav on every admin page no longer shows "Readiness" link.
14. Admin home dashboard has 3 KPI tiles (no Readiness), no "View Readiness" quick-link, no Readiness mentions in activity feed.
15. Visiting any of `dashboard.html`, `readiness-*.html` directly → 404 (file no longer exists).

## Known prototype limitations

- **No real persistence.** Save and Delete redirect; mock data unchanged.
- **Role-Specific Competency Questions add/remove is per-page-load.** Refresh resets to the 6 samples. Consistent with the prototype's existing behavior for similar editors on cohort forms.
- **Self-Assessment status uses sessionStorage (per-tab).** An admin viewing an intern's record won't see what the intern submitted in a different browser tab. Documented; acceptable for prototype.
- **Participant Feedback and Exit Employer Survey** never have status to show in this iteration — the underlying forms don't exist yet (deferred to iteration 2).

## Doc updates

- **`CLAUDE.md`** — section-by-section rewrite of Public/Admin pages, app.js helpers, product rules. Page count drops 26 → 21.
- **`PRD.md`** — strike the Readiness Assessment section; replace with a "Unified Intern Record" paragraph naming the 7 panels. Update the "Promotion" rule.
- **`App Outline.md`** — replace `Add Intern` and `Edit Intern` outlines with a single `Intern Record` outline. Remove `Readiness` outlines.
