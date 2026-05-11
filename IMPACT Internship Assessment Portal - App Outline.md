# IMPACT Internship Assessment Portal

# SHELL:

## NAVBAR: Top

LOGIN BUTTON
LOGOUT BUTTON (ADMIN)
SELF-ASSESSMENT BUTTON
INTERNS (ADMIN)
COMPETENCY BUTTON (ADMIN)
SELF-ASSESSMENT RESULTS (ADMIN)

## MODAL: Delete Confirmation

## MODAL: Submit Confirmation

## MODAL: Updated Confirmation

## MODAL: Recover Email Confirmation

# SCREEN: Landing

## VIEW: Landing

LOGO and CONTENT

## VIEW: Login

EMAIL ADDRESS FIELD
PASSWORD FIELD 
SUBMIT BUTTON
CANCEL BUTTON
RECOVER BUTTON

## VIEW: Self-Assessment

FIRST INITIAL FIELD
LAST NAME FIELD
EMPLOYER DROPDOWN
COHORT DROPDOWN (filtered by selected employer)
SUBMIT BUTTON
CANCEL BUTTON

# SCREEN: Self-Assessment

## VIEW: Self-Assessment

FIRST INITIAL DISPLAY
LAST NAME DISPLAY
EMPLOYER DISPLAY
COHORT DISPLAY
DATE SELECTOR
SURVEY SUMMARY DISPLAY
SURVEY QUESTION #X DISPLAY
SURVEY QUESTION #X RADIO BUTTONS *w/ Validation* [EMERGING/DEVELOPING/READY]
SUBMIT BUTTON
CANCEL BUTTON

## VIEW: Assessment Confirmation

FIRST INITIAL DISPLAY
LAST NAME DISPLAY
EMPLOYER DISPLAY
COHORT DISPLAY
DATE DISPLAY
THANK YOU MESSAGE DISPLAY

### Participant Feedback (`participant-feedback.html`)
- Public, intern-facing
- Identity card (First Initial + Last Name + Employer + Cohort) — same shape as Personal Goals / Midpoint
- 7 mixed-format questions (faithful to `Participant Exit Feedback.docx`):
  1. Why are you leaving this internship? — radio + Other-with-text reveal
  2. Overall experience — 5-segment Likert (Very negative … Very positive)
  3. Do you feel more prepared for employment? — Yes/No
  4. Did you feel supported? — Yes/Somewhat/No + free-form textarea
  5. Did you experience barriers? — Yes/No + free-form textarea (needs addressed)
  6. Would you recommend this experience to others? — Yes/Maybe/No
  7. Anything we could improve? — free-form textarea
- Validation: identity fields required (first initial = single letter; last name; employer; cohort); at least 4 of 7 questions answered.
- Single submission per intern (immutable after submit). Routes to `assessment-confirmation.html?type=participant-feedback` on success.

# SCREEN: Self-Assessment Results

## VIEW: Completed Self-Assessments

ASSESSMENTS TABLE [LAST NAME/COHORT/DATE]
VIEW ASSESSMENT BUTTON
DELETE ASSESSMENT BUTTON

## VIEW: Assessment Detail

FIRST INITIAL DISPLAY
LAST NAME DISPLAY
EMPLOYER DISPLAY
COHORT DISPLAY
DATE DISPLAY
SURVEY QUESTION DISPLAY #X
SURVEY RESULT DISPLAY [TEXT]
CLOSE BUTTON
DELETE BUTTON

# SCREEN: Assessments

## VIEW: Chooser Hub (`assessments.html`)

ADMIN NAV (with Assessments tab active)
PAGE HEAD [ADMIN / ASSESSMENTS · "Start an assessment."]
TWO-CARD GRID:
  CARD: COMPETENCY ASSESSMENT [stage hint, body copy, Begin button → opens picker]
  CARD: EXIT EMPLOYER SURVEY [stage hint, body copy, Begin button → opens picker]
INTERN PICKER MODAL [search input, table of interns: Last Name/Cohort/Start/Phase, row-click navigates to selected form with `?internId=<id>` pre-filled]
FOOTNOTE [link to Interns dashboard for reviewing past assessments]



## VIEW: Competency assessment — New (`competency-new.html`)

ADMIN NAV (Assessments active)
PAGE HEAD [ADMIN / ASSESSMENTS / COMPETENCY · "New Competency Assessment."]
META CARD [First Initial · Last Name · Employer · Cohort pre-filled from intern record via `?internId=<id>`; Date selector; Phase dropdown filtered to cohort's phases]
RUBRIC CARD — rendered via `IMPACT.renderQuestion` from stitched 3-tier set (`IMPACT.stitchedCompetencyQuestions(internId)`):
  SECTION: "Professional Competencies" — Core tier questions (competency-rubric-row type, each with EMERGING/DEVELOPING/READY radio + Notes textarea)
  SECTION: "Role-Specific: <Cohort Name>" — Cohort tier questions (if `competency-cohort-<cohortId>` set exists)
  SECTION: "Intern-Specific" — Intern tier questions (if `competency-intern-<internId>` set exists)
ACTION BAR [Cancel · Submit → `markAssessmentComplete('competency', internId, { phase, answers })` → intern record]

## VIEW: Competency assessment — Edit (`competency-edit.html`)

ADMIN NAV (Assessments active)
PAGE HEAD [ADMIN / ASSESSMENTS / COMPETENCY · "Edit Competency Assessment."]
META CARD [First Initial · Last Name · Employer · Cohort · Date · Phase — all read-only]
RUBRIC CARD — same 3-tier render as new; answers restored from `IMPACT.assessmentStatus('competency', internId)` payload (falls back to record-level `answers` field)
ACTION BAR [Cancel · Delete (modal-confirm) · Save Changes → re-persists via `markAssessmentComplete`]

## VIEW: Competency assessment — Detail (`competency-detail.html`)

ADMIN NAV (Assessments active)
PAGE HEAD [ADMIN / ASSESSMENTS / COMPETENCY · "Competency Assessment."]
META CARD [First Initial · Last Name · Employer · Cohort · Date · Phase — all read-only]
RUBRIC CARD — same 3-tier render; all inputs disabled after restore for read-only view
ACTION BAR [Close · Edit button → competency-edit.html?id=... · Delete button (modal-confirm)]

# SCREEN: Intern Results

## VIEW: Intern Results

NEW INTERN BUTTON
COHORTS BUTTON
INTERNS TABLE [LAST NAME/COHORT/DATE/CURRENT/RESULTS
DELETE INTERN BUTTON
EDIT INTERN BUTTON

### Intern Record (`intern-record.html`)

URL: `intern-record.html` (new) or `intern-record.html?id=<internId>` (edit)

**Page-head**: `ADMIN / INTERNS / NEW` or `... / EDIT` breadcrumb. Title `NEW INTERN.` or `EDIT INTERN.`. Edit-mode meta strip shows First Initial, Last Name, Employer, Cohort, Role, Start, End (all read-only). No date of birth, zipcode, or full first name is shown — they are not stored.

**Panels**:

01. Personal Information — First Name input, Last Name input (new mode editable; only the first initial is persisted; edit mode hidden in favor of meta-strip)
02. Internship Details — Employer dropdown, Cohort dropdown (filtered by employer; disabled until employer is picked), Role dropdown (filtered by employer; disabled until employer is picked; auto-fills from cohort.roleId on cohort selection but admin can override), Start Date, End Date (all 5 fields on a single row at desktop; new mode editable; edit mode hidden in favor of meta-strip)
03. Entry Assessment — 12 barrier checkboxes + Notes textarea (editable in both modes)
04. Intern Self-Assessments — sub-cards for Personal Goals, Mid-Point Goals, Participant Feedback Form (read-only; status text only — detail views deferred)
05. Evaluations — Competency sub-cards (clickable to `competency-detail.html?id=...`; one per record); Exit Employer Survey placeholder (read-only)
06. Employment Details — 90-day checkbox + notes; 180-day checkbox + notes. Disabled in new mode.

**Action bar**: Cancel · (Delete in edit mode) · Save Changes

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
  7. Barriers Observed — multi-select checklist (6 items including Other-with-text reveal)
  8. Additional Comments — free-form textarea
- Editable: re-opening with the same `?internId=` re-hydrates all controls from the persisted payload.
- Save persists payload via `markAssessmentComplete('exit-employer-survey', internId, payload)` and redirects to the intern record.

## VIEW: COHORTS

NEW COHORT BUTTON
COHORTS TABLE [NAME/MEMBER COUNT/STARTDATE/ENDDATE]
EDIT COHORT
DELETE COHORT



## VIEW: Cohort Detail

NAME DISPLAY
EMPLOYER DISPLAY
START DATE DISPLAY
END DATE DISPLAY
DESCRIPTION DISPLAY
PHASE #X NAME DISPLAY
PHASE #X WEEK DISPLAY
EDIT BUTTON
CLOSE BUTTON




## VIEW: New Cohort

NAME FIELD
EMPLOYER FIELD
START DATE SELECTOR
END DATE SELECTOR
DESCRIPTION TEXTBOX
PHASE #X NAME FIELD
PHASE #X WEEK FIELD *w/ Validation*
ADD PHASE BUTTON
REMOVE PHASE #X BUTTON
CREATE BUTTON
CANCEL BUTTON




## VIEW: Edit Cohort

NAME FIELD
EMPLOYER FIELD
START DATE SELECTOR
END DATE SELECTOR
DESCRIPTION TEXTBOX
PHASE #X NAME FIELD
PHASE #X WEEK FIELD *w/ Validation*
ADD PHASE BUTTON
REMOVE PHASE #X BUTTON
UPDATE BUTTON
CANCEL BUTTON
DELETE BUTTON

# SCREEN: Settings

## VIEW: Employers list (`settings-employers.html`)

ADMIN NAV (with Settings tab active)
PAGE HEAD [ADMIN / SETTINGS / EMPLOYERS · "Employers."]
SETTINGS SIDEBAR (with Employers active)
+ NEW EMPLOYER BUTTON
EMPLOYERS TABLE [NAME / CONTACT / EMAIL / COHORT-COUNT]
ROW CLICK → settings-employer.html?id=<employerId>

## VIEW: Employer detail (`settings-employer.html?id=<id>`)

ADMIN NAV (Settings active)
PAGE HEAD [breadcrumb to Employers list, employer name as title]
META STRIP [Contact Name · Email · Phone]
SETTINGS SIDEBAR (Employers active)
EMPLOYER NOTES CARD
EDIT BUTTON / DELETE BUTTON
COHORTS TABLE under this employer [Cohort name / Role / Start / Members]
+ NEW COHORT BUTTON → cohort-new.html?employerId=<id>
ROW CLICK on cohort → cohort-detail.html?id=<cohortId>
ROLES TABLE under this employer [Role / Description / Cohorts Using]
+ NEW ROLE BUTTON → role-new.html?employerId=<id>
ROW CLICK on role → role-detail.html?id=<roleId>

## VIEW: Employer new+edit form (`settings-employer-form.html`)

ADMIN NAV (Settings active)
PAGE HEAD [breadcrumb · "New Employer." or "Edit Employer." based on ?id=]
SETTINGS SIDEBAR (Employers active)
FORM CARD [Name (required), Contact Name, Phone, Email (regex-validated), Notes]
ACTION BAR [Cancel + Save]

## VIEW: Assessment Phases (`settings-phases.html`)

ADMIN NAV (Settings active)
PAGE HEAD [ADMIN / SETTINGS / ASSESSMENT PHASES · "Assessment Phases."]
SETTINGS SIDEBAR (Assessment Phases active)
INLINE-EDITABLE LIST [up/down reorder · label input · remove · "+ Add Phase"]
ACTION BAR [Cancel · Save Changes]

## VIEW: Barriers (`settings-barriers.html`)

ADMIN NAV (Settings active)
PAGE HEAD [ADMIN / SETTINGS / BARRIERS · "Barriers."]
SETTINGS SIDEBAR (Barriers active)
INLINE-EDITABLE LIST [up/down reorder · label input · remove · "+ Add Barrier"]
ACTION BAR [Cancel · Save Changes]

## VIEW: Role new+edit+detail (`role-new.html` / `role-edit.html` / `role-detail.html`)

Roles are scoped to a parent employer (mirrors Cohort → Employer). They no longer appear as a top-level item in the Settings rail; the list lives on each employer's detail page.

`role-new.html?employerId=<id>` — ADMIN NAV (Settings active). Page head breadcrumb back to the originating employer. FORM CARD [Role Name (required), Employer dropdown (pre-selected from `?employerId=`), Description textarea]. ACTION BAR [Cancel + Create Role + confirm modal].

`role-detail.html?id=<roleId>` — ADMIN NAV (Settings active). META STRIP [Role Name · Employer · Cohorts Using count]. ROLE DESCRIPTION CARD. COHORTS-USING-THIS-ROLE TABLE [Cohort / Start / Members; row-click → cohort-detail.html]. ACTION BAR [Close · Edit · Delete + confirm modal].

`role-edit.html?id=<roleId>` — ADMIN NAV (Settings active). FORM CARD [Role Name, Employer (changeable), Description] hydrated from the existing record. ACTION BAR [Cancel · Delete + confirm modal · Save Changes + confirm modal].

## VIEW: Program Info (`settings-program-info.html`)

ADMIN NAV (Settings active)
PAGE HEAD [ADMIN / SETTINGS / PROGRAM INFO · "Program Info."]
SETTINGS SIDEBAR (Program Info active)
IDENTITY CARD [Program Name (required) · Organization Name · Contact Email (regex) · Phone]
DEFAULTS CARD [Default Cohort Length (positive int) · Fiscal Year Start (month dropdown)]
DANGER ZONE CARD [Reset Demo Data button → modal-confirm → sessionStorage.clear() + toast + redirect to admin.html. Lets stakeholders re-run demos from a clean state. Affects only the current browser tab.]
ACTION BAR [Cancel · Save Changes (writes to sessionStorage via IMPACT.saveProgramInfo)]

## VIEW: Assessments list (`settings-questions.html`)

ADMIN NAV (Settings active)
PAGE HEAD [ADMIN / SETTINGS / ASSESSMENTS · "Assessments."]
SETTINGS SIDEBAR (Assessments active)
TABLE [4 standard editable sets: Name · Question Count · Last Edited | 1 clickable Competency Rubric aggregate row showing Core question count + max-lastEdited across all 3 tiers]
ROW CLICK → standard rows go to settings-question-set.html?id=<setId>; the Competency Rubric aggregate row routes to settings-competency.html (3-tier detail page)

## VIEW: Per-set editor (`settings-question-set.html?id=<setId>`)

ADMIN NAV (Settings active)
PAGE HEAD [breadcrumb to Questions list, set name as title]
SETTINGS SIDEBAR (Assessments active)
SET CONFIGURATION CARD [Set Name (read-only) · Min. Required (number) · Allow Multiple? (checkbox — toggles whether submitters may complete this assessment more than once)]
QUESTION EDITOR CARD [per-question accordion: idx · label · type badge · up/down/remove controls; expanded body shows type-specific config sub-form]
ADD QUESTION FLOW [button reveals 6-type picker: textarea / short-text / radio / checkbox-group / likert / rubric-row → click adds new accordion row, expanded, focused on label input]
ACTION BAR [Cancel · Save Changes (validates non-empty labels, no duplicate ids, options present for radio/checkbox-group, minRequired ≤ question count) → IMPACT.saveQuestionSet]

URL contract: ?id=<setId> required. Missing/unknown id → danger toast + 1500ms redirect.

## VIEW: Competency Questions detail (`settings-competency.html`)

ADMIN NAV (Settings active)
PAGE HEAD [ADMIN / SETTINGS / ASSESSMENTS / COMPETENCY · "Competency Questions."]
SETTINGS SIDEBAR (Assessments active)
CARD 1 — Core Competencies summary [Question count · Last edited · Edit Core button → settings-question-set.html?id=competency-core]
CARD 2 — Cohort Questions table [Cohort · Employer · Question count · Last edited; row click → competency-cohort-set.html?id=<cohortId>; + New button → competency-cohort-set.html (new mode)]
CARD 3 — Intern Questions table [Intern · Cohort · Question count · Last edited; row click → competency-intern-set.html?id=<internId>; + New button → competency-intern-set.html (new mode)]

## VIEW: Cohort competency editor (`competency-cohort-set.html?id=<cohortId>`)

ADMIN NAV (Settings active)
PAGE HEAD [breadcrumb to Competency, set name as title]
SETTINGS SIDEBAR (Assessments active)
SET CONFIGURATION CARD [Cohort dropdown — filtered to uncustomized cohorts in new mode; disabled in edit mode · Allow Multiple? (checkbox — toggles whether submitters may complete this assessment more than once)]
QUESTION EDITOR CARD [accordion + 6-type picker (same shape as settings-question-set.html)]
ACTION BAR [Cancel · Delete (edit mode only, modal-confirm) · Save Changes → IMPACT.saveQuestionSet]

URL contract: `?id=<cohortId>` for edit; absent for new. Missing/unknown id → toast + redirect.

## VIEW: Intern competency editor (`competency-intern-set.html?id=<internId>`)

Same shape as the cohort editor with an Intern dropdown instead of Cohort.

URL contract: `?id=<internId>` for edit; absent for new.
