# IMPACT Internship Assessment Portal — Product Requirements Document

**Document status:** Draft v1
**Related documents:**
- `IMPACT Internship Assessment Portal - App Outline.md` — screen/field reference
- `Sample Assessments for IMPACT Internship.docx` — source rubrics
- `Self-Assessment Questions (Placeholder).md` — placeholder content

---

## 1. Overview

The IMPACT Internship Assessment Portal is a web application that supports the IMPACT internship program across its full lifecycle: onboarding and tracking interns through intake, tracking intern competency across multiple program phases, capturing self-assessments from each intern, and recording long-term employment outcomes.

The portal replaces paper-based rubric collection with consistent, auditable digital records, and gives program administrators a single source of truth for each participant's trajectory.

---

## 2. Goals

- Provide a structured, auditable assessment trail for every participant from program entry through 90-day post-placement outcomes.
- Standardize the competency rubrics across cohorts and employers.
- Give administrators a clear view of each intern's progress across program phases.
- Offer interns a simple one-time self-reflection step during the program.
- Support the program's six 2026 cohorts (Eskenazi, TTT, Habitat, Elevate, Geminus, Health Link) and future cohorts on the same model.

---

## 3. Non-Goals (v1)

- **No employer logins.** Competency ratings are entered by an administrator on behalf of the employer.
- **No Midpoint Performance Review workflow.** Deferred; remains paper/PDF for now.
- **No signatures, notifications, reminders, or automated outcome follow-ups.**
- **No aggregate dashboards or reporting.** Data can be read through the admin list views described here.
- **No mobile-native app.** Browser-based, responsive layout only.

---

## 4. Users & Roles

| Role  | Authentication | Access |
|-------|----------------|--------|
| Admin | Email + password with recovery flow | Full access: all assessments, interns, cohorts, and the self-assessment admin view. |
| Intern | No login. Identity established at submission via First Initial + Last Name + Employer + Cohort. | Landing page + one-time Self-Assessment submission + Assessment Confirmation. |

There are no employer, supervisor, or participant-applicant accounts in v1.

---

## 5. Unique Identifier

A participant is uniquely identified by the combination of **First Initial + Last Name + Employer + Cohort**. This composite key is used to:

- Match a Self-Assessment submission to an Intern record.
- Link Competency Assessments to the correct Intern record.

Cohorts belong to employers, so storing `cohortId` on the intern implicitly captures the employer. The intern self-identification flow surfaces both the employer and cohort at submission time (employer dropdown filters the cohort dropdown) so the participant can disambiguate themselves human-readably without exposing additional PII.

### Minimum-PII policy

The intern record persists only the four identifier fields above. **No first name, no date of birth, no zipcode** is stored. The admin Create Intern form accepts a "First Name" textbox for usability, but only the first initial is saved to the record. This was a security/privacy requirement added by the client to minimize the personally identifiable information held in the system.

---

## 6. Core Entities

- **Employer** — Program partner organization. Fields: `id`, `name`, `contactName`, `contactEmail`, `phone`, `notes`. One Employer has many Cohorts.
- **Phase** — Competency assessment phase. Fields: `id`, `label`. Editable in Settings → Phases. Cohorts reference applicable phases via `cohort.phaseIds`.
- **Barrier** — Entry Assessment barrier label. Fields: `id`, `label`. Editable in Settings → Barriers. Replaces the previous hardcoded list.
- **Role** — Placement role belonging to a single employer. Fields: `id`, `label`, `employerId` (FK to Employer), `description`. Listed and managed under each employer's detail page in Settings → Employers (mirrors the Cohort → Employer relationship; role-new/edit/detail forms parallel cohort-new/edit/detail). Cohorts reference their role via `cohort.roleId` (FK); intern records reference their role via `intern.roleId` (FK), defaulting from the selected cohort's role at intake but overridable per intern.
- **Program Info** — Singleton record. Fields: `programName`, `organizationName`, `contactEmail`, `phone`, `defaultCohortLengthWeeks`, `fiscalYearStartMonth`. Editable in Settings → Program Info. SessionStorage-backed in the prototype.
- **Question Set** — Authored content for one of the program's assessment forms. Fields: `id`, `name`, `minRequired`, `questions` (array). 4 standard sets (Personal Goals, Midpoint Reflection, Participant Feedback, Exit Employer Survey) plus a 3-tier Competency Rubric: program-wide Core (`competency-core`) + optional per-cohort sets (`competency-cohort-<cohortId>`, with an additional `cohortId` field) + optional per-intern sets (`competency-intern-<internId>`, with an additional `internId` field). All editable in Settings → Questions.
- **Question** — One row inside a Question Set. Fields: `id`, `type`, `label`, `helperText`, `required`, `config` (type-specific). 6 built-in types: textarea, short-text, radio, checkbox-group, likert, competency-rubric-row. Radio + checkbox-group support an optional "Other-with-text" reveal.

### 6.1 Cohort
- Name (e.g., "Eskenazi 2026")
- Employer (`employerId` FK to Employer; replaces the previous free-text employer field)
- Role (`roleId` FK to Roles)
- Start date
- End date
- Description
- Phases — subset of the global Phases library, referenced via `cohort.phaseIds` (array of Phase IDs)
- (Cross-ref) Role-specific competency questions for the cohort are authored separately in Settings → Questions → Competency → Cohort Questions and stored as `competency-cohort-<cohortId>` Question Sets. Stitched automatically into the Competency assessment for any intern in this cohort.

### 6.2 Intern
- First Initial (only the initial is stored — admin form accepts a full first name but persists just the letter), Last Name, Cohort (composite identity key: First Initial + Last Name + Employer + Cohort, where Employer is implied by cohort)
- Employer (auto from cohort), Start date, End date
- Entry Assessment: 12 barrier checkboxes + notes (captured at intake)
- 90-day outcome fields:
  - Employed at 90 days (checkbox + notes)
  - Still employed at 180 days (checkbox + notes)
- Created directly by an admin on `intern-record.html` (+ New Intern button)

### Intern Record (unified)

`intern-record.html` is the single page used to create, view, and update an intern. It is reached by the "+ New Intern" button (no `?id=`) or by clicking a row on Interns (`?id=<internId>`). The page is composed of six numbered rubric panels: **Personal Information**, **Internship Details**, **Entry Assessment** (12 barriers + notes), **Intern Self-Assessments** (links to the intern's submitted Personal Goals / Mid-Point Reflection / Participant Feedback), **Evaluations** (links to Competency assessments and Exit Employer Survey), and **Employment Details** (90-day and 180-day outcomes). Per-intern competency questions live in Settings → Questions → Competency → Intern Questions and are stitched into the Competency assessment.

Identity is captured at intake on the Personal Information and Internship Details panels and locks once the record is saved (read-only meta strip in edit mode). The remaining panels remain editable as the intern progresses.

The previous Readiness Assessment area (a separate gateway flow with its own dashboard and detail pages) has been removed from the prototype.

### 6.3 Competency Assessment
- Scope: active Intern
- Fields: Last Name, Cohort, Zipcode, Date, Phase
- Per question: Rating (Emerging / Developing / Ready) + Notes
- Derived Pass/Fail
- Question set:
  - Professional Competencies (shared across all cohorts)
  - Role-Specific Competencies (pulled from the cohort's `competency-cohort-<cohortId>` set in Settings → Questions, if one exists)
  - Intern-Specific Competencies (pulled from the intern's `competency-intern-<internId>` set in Settings → Questions, if one exists)
- Multiple assessments per phase per intern are allowed (no uniqueness enforcement)

### 6.4 Self-Assessment
- Scope: active Intern
- Fields: Last Name, Cohort, Zipcode, Date
- Per question: Rating (Emerging / Developing / Ready)
- One submission per intern; immutable after submission
- Admin can view and delete but cannot create or edit

---

## 7. Business Rules

### 7.1 Intern Intake
- An admin creates an Intern record directly via the "+ New Intern" button on Interns, which opens `intern-record.html` (no `?id=` param).
- Identity (Personal Information and Internship Details panels) is entered at creation and locked read-only once the record is saved.
- Entry Assessment (12 barriers + notes) is captured at intake and remains editable after creation.
- The previous Readiness Assessment gateway flow (a separate dashboard and detail pages that auto-promoted a passing assessment to an Intern record) has been removed from the prototype.

### 7.2 Pass / Fail (placeholder rule)
- **Pass** = every question rated "Ready."
- Any "Emerging" or "Developing" results in **Fail**.
- This is a placeholder pending clarification from program staff and applies to Competency Assessments.

### 7.3 Self-Assessment
- One submission per Intern.
- Immutable once submitted. No intern-side edit.
- Admin may delete a record but not edit it.
- If an intern attempts to submit a second time, the system blocks the submission and displays a message.
- **Intern assessments (Personal Goals + Midpoint Reflection + Participant Feedback)**: each is one submission per intern, immutable after submit. The chooser page (`intern-assessments.html`) shows per-tab completion status from `sessionStorage`. Personal Goals uses free-form textareas (7 questions); Midpoint Reflection uses free-form textareas (8 questions); Participant Feedback uses mixed-format questions sourced from `Participant Exit Feedback.docx` (radio + Likert + Yes/No + textarea, 7 questions). Admin-side detail viewers for these submissions are deferred.

### 7.4 Competency Phases
- Phases are defined per cohort during cohort setup; not globally fixed.
- The Competency Assessment's Phase selector pulls from the cohort's phase list.
- Multiple competency assessments per phase per intern are allowed.
- **Exit Employer Survey**: admin-completed on behalf of the employer at the close of placement. Per-intern, editable (admin can save and return). 8 mixed-format questions sourced from `Participant Outcome Form.docx`: outcome status, offered employment, performance rating (1–5), strengths, improvement areas, work readiness indicators, barriers observed, comments. Reachable from the Evaluations panel on the intern record (URL: `exit-employer-survey.html?internId=<id>`).

### 7.5 Deletion
- Any record can be deleted by an admin. Deletions require a confirmation modal.
- Deleting an Intern record does not automatically delete associated Competency or Self-Assessment records; those remain for the historical identifier.

---

## 8. User Journeys

### 8.1 Admin: Onboarding a Cohort
1. Admin logs in.
2. Admin navigates to Interns → Cohorts.
3. Admin creates a New Cohort: enters name, employer, dates, description.
4. Admin defines Phases (name + week) using Add Phase / Remove Phase controls.
5. Admin (optionally) authors role-specific competency questions for this cohort in Settings → Questions → Competency → + New Cohort Questions.
6. Admin saves.

### 8.2 Admin: Adding an Intern
1. Admin navigates to Interns.
2. Admin clicks "+ New Intern."
3. Admin enters Personal Information (First Name, Last Name — only the first initial is stored) and Internship Details (Cohort, Employer auto-fills, Start Date, End Date).
4. Admin completes Entry Assessment: checks applicable barriers and adds notes.
5. Admin (optionally) authors per-intern competency questions in Settings → Questions → Competency → + New Intern Questions.
6. Admin saves. Identity fields lock to read-only; the remaining panels (Entry Assessment, Evaluations, Employment Details) remain editable.

### 8.3 Admin: Running a Competency Assessment
1. Admin navigates to Assessments.
2. Admin clicks the Competency Assessment card → intern-picker modal opens.
3. Admin searches/selects the intern → form opens with First Initial + Last Name + Cohort pre-filled from the intern record.
4. Admin selects Date and Phase.
5. System loads the stitched competency rubric for this intern: Core (program-wide) + Cohort (if any) + Intern (if any).
6. Admin rates each question and adds notes.
7. Admin submits → returns to the intern record.

### 8.4 Intern: Identifying Themselves and Submitting a Self-Assessment
1. Intern visits the landing page.
2. Intern clicks Self-Assessment to open `intern-assessments.html`.
3. **Identity gate:** Intern enters First Initial, Last Name, selects Employer, then Cohort (cohort dropdown filters to the chosen employer's cohorts) and clicks **Confirm**. The system looks them up in the intern roster by composite key (First Initial + Last + Cohort) — if no match, an error directs them to contact their program administrator. On a successful match the identity is persisted to the browser's `localStorage` so the intern doesn't have to re-enter it on subsequent visits; a "Confirmed as …" chip appears with a "Switch" affordance.
4. Once identified, the three assessment cards (Personal Goals, Midpoint Reflection, Participant Feedback) appear with **per-intern** completion status — any card the intern has previously submitted is shown as a "Submitted on …" pill instead of a Begin button.
5. Intern clicks Begin on whichever card they're ready for. The form opens with the identity already known (shown as a "Submitting as …" chip at the top of the form) — they go straight to the questions.
6. Intern answers and submits. The submission is stored under the intern's id (so the chooser-page status pills, the intern record's Self-Assessments panel, and the admin detail viewer all light up).
7. System displays the Assessment Confirmation view with a thank-you message and a receipt of the confirmed identity.

### 8.5 Admin: Recording 90-Day Outcomes
1. Admin navigates to Interns.
2. Admin clicks the row for the intern in question to open `intern-record.html?id=<internId>`.
3. Admin scrolls to the Employment Details panel and updates the 90-day and 180-day outcome checkboxes/notes.
4. Admin saves.

---

## 9. Screens (Reference)

Detailed field-level specifications live in `IMPACT Internship Assessment Portal - App Outline.md`. Screen inventory:

1. **Landing** — Landing, Login, Intern Assessments entry
2. **Intern Assessments** (intern-facing) — Chooser hub, Personal Goals, Midpoint Reflection, Participant Feedback, Assessment Confirmation
3. **Assessments** (admin) — Chooser hub (Competency + Exit Employer Survey cards with intern-picker), Competency New/Edit/Detail, Exit Employer Survey (per-intern, editable)
4. **Interns** (admin) — Interns list, Intern Record (unified new+edit). Self-assessment submissions for an intern are reached from the Self-Assessments panel inside the record. (The legacy `self-assessment-results.html` list page and `self-assessment-detail.html` view still exist as artifacts but are no longer linked from the admin top nav.)
5. **Settings** (admin) — Employers list, Employer detail (now containing both per-employer Cohorts and per-employer Roles sections), Employer new+edit form, Cohort detail/new/edit and Role detail/new/edit (both reached from inside an employer), Assessment Phases (global list + per-cohort multi-select), Barriers (Entry Assessment library), Program Info (program identity + defaults), Assessments (4-set editor + 3-tier Competency: Core program-wide, optional per-cohort, optional per-intern).

Shared modals: Delete Confirmation, Submit Confirmation, Update Confirmation, Recover Email Confirmation.

---

## 10. Validation & Error Handling

- **First Initial:** single letter (A–Z, case-insensitive) on intern self-id and admin form (admin form accepts a longer first name as input but stores only the first character).
- **Email:** valid format on admin login and password recovery.
- **Rating fields:** every rubric question must have a rating before submission is accepted.
- **Required fields:** enforced at submission time with inline messaging.
- **Self-Assessment duplicate submission:** if a record already exists for the given First Initial + Last Name + Employer + Cohort, submission is blocked with a message directing the intern to contact their program admin.
- **Delete actions:** always routed through the Delete Confirmation modal.

---

## 11. Authentication & Access Control

- **Admin login:** email + password. Password recovery via "Recover" flow triggering the Recover Email Confirmation modal.
- **Admin logout:** available from the navbar when authenticated.
- **Intern path:** no login. All intern-facing flows are publicly reachable; identity is captured at the point of submission only.
- **Access checks:** Competency, Interns, Cohorts, and Self-Assessment Results screens require an authenticated admin session.

---

## 12. Data Retention

- All records (Intern, Competency Assessment, Self-Assessment) are retained indefinitely in v1. Bulk cleanup and retention policy are out of scope.

---

## 13. Open Questions

1. **Pass/Fail rule.** Current placeholder is "all Ready." Real rule pending from program staff.
2. **Self-Assessment questions.** Placeholder set in `Self-Assessment Questions (Placeholder).md`; final content pending.
3. **Future employer accounts.** If and when employer logins are added, the Cohort's free-text Employer field will need to be promoted to a structured reference. Not addressed in v1.
4. **Outcome dates.** 90-day and 180-day follow-ups are manual in v1. Whether these should later become scheduled/dated events is an open question.
5. **Midpoint Performance Review.** Deferred, but acknowledged as a likely near-future addition.

---

## 14. Out of Scope / Deferred

- Midpoint Performance Review
- Employer logins and scoped access
- Supervisor / program-staff signatures
- Automated notifications and reminders
- Aggregate reporting and analytics dashboards
- Export to PDF, CSV, or printable formats
- Mobile-native application
- Role templates / question library shared across cohorts

---

## 15. Assumptions

- Multiple cohorts may run concurrently.
- First Initial + Last Name + Employer + Cohort produces distinct combinations within a cohort in practice. (If two interns in the same cohort share both first initial and last name, the program admin will need to disambiguate manually — accepted trade-off in exchange for the minimum-PII policy.)
- Administrators are trusted users; rate limits and activity auditing are not in scope for v1.
- Interns access the portal from a modern desktop or mobile browser.
- The program staff will provide finalized Self-Assessment questions and final Pass/Fail criteria before launch.

---

## 16. Success Criteria (v1)

- An admin can configure a cohort, including phases and role-specific competency questions, without developer involvement.
- An admin can create an Intern record directly via the "+ New Intern" flow, capturing identity and Entry Assessment barriers at intake. Per-intern competency questions (if any) are authored separately in Settings → Questions → Competency → Intern Questions.
- An admin can complete Competency Assessments across multiple phases for the same intern.
- An intern can submit a Self-Assessment (Personal Goals, Midpoint Reflection) without creating an account.
- An admin can view any intern's full record (Entry Assessment, Competency Assessments across phases, Self-Assessments) and update their 90-day and 180-day employment outcomes.
