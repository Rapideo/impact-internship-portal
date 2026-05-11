# Other Settings (Phases + Barriers + Roles + Program Info) — Design

> **Sub-project B** of the Settings program. Sub-project A delivered the Settings shell + Employers/Cohorts (specs `2026-05-06-settings-shell-employers-cohorts-*`). This spec replaces the four `settings-stub.html?section=…` placeholders for Phase Library, Barriers, Roles, and Program Info with real implementations.

---

## Goal

Make the four currently-stubbed Settings sections real, demo-functional pages that consolidate program-wide configuration currently scattered across hardcoded arrays in `app.js`, free-text cohort fields, and per-cohort phase definitions.

---

## What's in scope

- **Phases** — admin-managed canonical list of competency-test phases. Each cohort selects which phases apply to it (multi-select). The Competency Test phase dropdown is filtered to the intern's cohort's selected phases. Replaces the existing per-cohort phase editor.
- **Barriers** — admin-managed list of Entry-Assessment barriers, replacing the hardcoded `IMPACT.INTERN_BARRIERS` array.
- **Roles** — admin-managed canonical list of cohort roles. `cohort.role` (string) migrates to `cohort.roleId` (FK), parallel to the Employer migration in sub-project A.
- **Program Info** — singleton settings record with program identity + a small set of defaults that pre-populate cohort creation.

---

## Out of scope (explicit non-goals)

- Sub-project C: Questions library, versioning, custom question-type builder. The Questions sidebar item continues to route to `settings-stub.html?section=questions`.
- Phase week-ranges. Phases are name-only. Week-scheduling is cohort start/end dates (already exist) plus whatever calendar staff keep externally; phases inside a cohort are unbounded ordering.
- Per-cohort phase reordering. The order of phases inside a cohort follows the global `IMPACT.PHASES` order. If staff want phase 2 before phase 1, they reorder the global list.
- Phase templates / starter sets. Cohorts pick directly from the global list with no intermediate template layer.
- Soft-delete / undo for any of these entities.
- Bulk import or export of phases, barriers, roles.
- Per-cohort barrier overrides (every cohort uses the same global Barriers list).
- Localization or per-locale label overrides.
- Branding settings (logo override, color override). Branding stays controlled by `:root` CSS tokens.
- Persisting new/edited records across page reloads (mock data resets, same as sub-project A; Program Info is the one exception — sessionStorage-backed).

---

## Architecture

Four new pages, all built on the existing `.settings-shell` (sidebar rail + main content) introduced in sub-project A. Each page is self-contained and renders from `IMPACT.*` arrays exported by `app.js`.

```
Settings shell (existing)
├── Employers (existing — sub-project A)
├── Phases                   → settings-phases.html       (NEW)
├── Barriers                 → settings-barriers.html     (NEW)
├── Roles                    → settings-roles.html        (NEW)
├── Program Info             → settings-program-info.html (NEW)
└── Questions                → settings-stub.html (sub-project C)
```

Phases, Barriers, and Roles are all flat lists of `{id, label}` records. They share the same page shape: a single inline-editable list with reorder + add + remove + Save. Program Info is a singleton form.

---

## Data model

### `IMPACT.PHASES`

Array of `{ id, label }` records. Six demo entries — names chosen to align with the existing prototype's competency assessment data (`IMPACT.COMPETENCY` records have `phase: 'Week 2'`, `'Intake'`, etc.) so demo records continue to render without a string-to-FK data migration.

| id | label |
|---|---|
| `intake` | Intake |
| `week-2` | Week 2 |
| `week-4` | Week 4 |
| `midpoint` | Midpoint |
| `week-8` | Week 8 |
| `final` | Final |

### `IMPACT.BARRIERS`

Array of `{ id, label }` records. Replaces the existing `IMPACT.INTERN_BARRIERS` (which was a flat array of 12 strings). Labels stay verbatim from the previous array.

| id | label |
|---|---|
| `transport` | No reliable transportation to placement site |
| `childcare` | No childcare arrangements during placement hours |
| `housing` | Housing instability or lack of permanent address |
| `clothing` | Limited access to professional or work-appropriate clothing |
| `connectivity` | Limited internet or phone access at home |
| `health` | Health or medical concerns affecting attendance |
| `literacy` | Limited literacy, numeracy, or English-language proficiency |
| `justice` | Justice involvement or background-related barriers |
| `caregiving` | Caregiving responsibilities for adult family members |
| `finances` | Limited financial reserves before first paycheck |
| `documentation` | Missing required documentation (ID, SSN, work auth) |
| `work-history` | Limited prior work history, references, or formal employment |

The export name `IMPACT.INTERN_BARRIERS` is dropped; no compat shim. Sub-project A established the convention of clean rename without a deprecation cycle.

### `IMPACT.ROLES`

Array of `{ id, label }` records. Six entries mirroring the role strings used by the six demo cohorts.

| id | label |
|---|---|
| `medical-assistant` | Medical Assistant |
| `construction-apprentice` | Construction Apprentice |
| `community-builder` | Community Builder |
| `customer-service` | Customer Service |
| `behavioral-health` | Behavioral Health |
| `clinic-admin` | Clinic Admin |

### `IMPACT.PROGRAM_INFO`

Singleton object. Hardcoded defaults at module load; overlaid by sessionStorage-persisted edits when present.

```js
{
  programName:              'IMPACT Internship Program',
  organizationName:         'IMPACT / Indiana',
  contactEmail:             'kortney@impact.org',
  phone:                    '(317) 555-0100',
  defaultCohortLengthWeeks: 26,
  fiscalYearStartMonth:     'July'
}
```

Indiana state fiscal year runs July–June; the default reflects that. Editable on `settings-program-info.html`.

### Cohort migration

Two FK migrations on the `COHORTS` array:

1. `cohort.role` (string) → `cohort.roleId` (FK to `ROLES`). Parallel to the Employer migration in sub-project A.
2. New field: `cohort.phaseIds` — array of strings, each an FK into `PHASES`. Replaces the inline phase rows (with Name + Weeks) that previously lived only in the cohort form's HTML and were never persisted to `app.js`.

Migrated demo cohort data:

| cohort id | new `roleId` | new `phaseIds` |
|---|---|---|
| `eskenazi-2026` | `medical-assistant` | `['intake','week-2','week-4','midpoint','week-8','final']` |
| `ttt-2026` | `construction-apprentice` | `['intake','week-2','week-4','week-8','final']` |
| `habitat-2026` | `community-builder` | `['intake','week-2','week-4','midpoint','final']` |
| `elevate-2026` | `customer-service` | `['intake','week-2','midpoint','final']` |
| `geminus-2026` | `behavioral-health` | `['intake','week-2','week-4','midpoint','final']` |
| `healthlink-2026` | `clinic-admin` | `['intake','week-2','week-4','midpoint','week-8','final']` |

Cohort *names* are unchanged.

### New helpers exported on `window.IMPACT`

- `PHASES`, `BARRIERS`, `ROLES`, `PROGRAM_INFO` — the new data arrays/object.
- `phaseById(id)`, `barrierById(id)`, `roleById(id)` — lookup helpers (return record or `null`).
- `roleNameFor(cohort)` — returns the display name for a cohort's role, `''` if missing. Mirrors `employerNameFor`.
- `phasesForCohort(cohort)` — returns an array of phase records (in `PHASES` order) for a given cohort's `phaseIds`. Returns `[]` if cohort has no phases.
- `saveProgramInfo(payload)` — writes to sessionStorage under `impact.settings.programInfo`. The `IMPACT.PROGRAM_INFO` reference reads sessionStorage at module init and falls back to the hardcoded defaults if the key is empty or malformed.

The dropped export: `IMPACT.INTERN_BARRIERS`.

---

## Pages

### `settings-phases.html` — Inline-editable phase list

- **Page-head:** breadcrumb `ADMIN / SETTINGS / PHASES` · title `PHASES.` · sub copy "Phases used by the Competency Assessment. Each cohort selects which phases apply to it."
- **Sidebar rail:** Phases active.
- **Detail-header:** title "Competency Phases" + `+ Add Phase` button (appends an empty editable row at the end of the list).
- **List table** — one row per phase:
  - Reorder controls (up/down arrow buttons; the order set here is the order phases appear in cohort multi-selects and the competency dropdown)
  - Inline `<input class="input">` showing the label, editable in place
  - "Remove" button (×)
- **Action bar:** Cancel (reverts edits to last-saved state) · Save Changes.
- **Save validation** (runs before commit):
  - Every visible row's label is non-empty after `.trim()`.
  - No two rows have the same label (case-insensitive comparison).
  - At least one row exists (cannot delete to zero — that would render an empty multi-select on cohort forms and break the competency phase dropdown).
- **Failures show inline:** the offending input gets a `.input--error` class and a small "Required" / "Duplicate" message; toast `CHECK FIELDS · Please fix the highlighted rows.`

### `settings-barriers.html` — Inline-editable barrier list

Identical shape to `settings-phases.html`. The only field per record is the label string.

- **Page-head:** breadcrumb `ADMIN / SETTINGS / BARRIERS` · title `BARRIERS.` · sub copy "Entry Assessment barrier checklist used on every intern record."
- **Sidebar rail:** Barriers active.
- **Detail-header:** title "Entry-Assessment Barriers" + `+ Add Barrier` button.
- **Validation:** same three rules (non-empty, no duplicates, at least one row).

### `settings-roles.html` — Inline-editable role list

Identical shape to `settings-phases.html` and `settings-barriers.html`.

- **Page-head:** breadcrumb `ADMIN / SETTINGS / ROLES` · title `ROLES.` · sub copy "Canonical roles cohorts can be assigned to."
- **Sidebar rail:** Roles active.
- **Detail-header:** "Roles" + `+ Add Role`.
- **Validation:** same three rules.
- **Delete with references:** if the user removes a role that ≥1 cohort references, the confirm step lists the affected cohorts (`MA — 2026, …`); proceeding sets those cohorts' `roleId` to `null`. The cohort's Role cell renders `—` until reassigned.

### `settings-program-info.html` — Singleton form

- **Page-head:** breadcrumb `ADMIN / SETTINGS / PROGRAM INFO` · title `PROGRAM INFO.` · sub copy "Program identity and defaults applied to new cohorts."
- **Sidebar rail:** Program Info active.
- **Identity card** (4-column grid like the Employer form):
  - Program Name (required)
  - Organization Name
  - Contact Email (regex-validated, same regex as the Employer form)
  - Phone (free text, no validation)
- **Defaults card** (separated by border-top):
  - Default Cohort Length (number input, integer ≥ 1)
  - Fiscal Year Start (`<select>` of the 12 month names)
- **Action bar:** Cancel · Save Changes.
- **Save:** validates → calls `IMPACT.saveProgramInfo(payload)` → `UPDATED` toast → 700ms redirect to `settings-employers.html` (the Settings landing). If validation fails, no save, danger toast.
- **Hydration:** loads from `IMPACT.PROGRAM_INFO` (which itself merges sessionStorage over hardcoded defaults at module init).

---

## Cross-page modifications

### `cohort-new.html` and `cohort-edit.html`

**Role field.** The free-text `<input id="co-role">` becomes `<select id="co-role">` populated from `IMPACT.ROLES`. Pattern mirrors the Task 8 Employer dropdown:

```html
<select class="select" id="co-role">
  <option value="">Select role…</option>
</select>
```

Inline IIFE populates options from `IMPACT.ROLES`. `cohort-new.html` reads `?roleId=` and pre-selects when present (cheap to support; no current call sites). `cohort-edit.html` pre-selects from the current cohort's `roleId`. Validation: `{selector: '#co-role', required: true}` added to (or already covering) the `IMPACT.validate` spec.

**Phase editor → Phase multi-select.** The existing phase editor (auto-numbered rows of Phase Name + Week Range with Add/Remove buttons) is removed entirely. Replaced by a checkbox group sourced from `IMPACT.PHASES`:

```html
<fieldset class="phase-multi-select">
  <legend class="micro-label">Phases applicable to this cohort</legend>
  <!-- One label/input pair per phase, populated by IIFE -->
  <label class="phase-multi-select__item">
    <input type="checkbox" name="cohort-phases" value="<phase-id>" />
    <span><phase-label></span>
  </label>
  …
</fieldset>
```

The IIFE renders one checkbox per `IMPACT.PHASES` entry. Cohort-new: no phases pre-checked. Cohort-edit: pre-checks the boxes whose `value` is in the cohort's `phaseIds` array. Save reads the list of checked values into `cohort.phaseIds` (the cohort form already submits via the existing modal/redirect flow — it just needs to capture the array of checked phase ids, which is already a one-liner).

The previous markup for the phase editor (`.phases-editor`, `.phase-edit-row`, the `+ Add phase` button, the `phase-remove` × buttons, related styles) is deleted from both cohort forms. Related CSS rules in `styles.css` may also be deleted if no other page uses them — verify with grep before removing.

**Validation:** `cohort-new.html` adds `{selector: 'input[name="cohort-phases"]', requiredCheckboxGroup: true}` (or equivalent — we may need to extend `IMPACT.validate` to handle "at least one checkbox in a named group is required"). At least one phase must be selected. Empty phase selection blocks save with a danger toast.

### `cohort-detail.html`

The Phases panel that previously rendered inline phase rows now renders a comma-separated list of phase labels using `IMPACT.phasesForCohort(cohort)`. Empty state: "No phases configured."

### `competency-new.html`

The Phase dropdown is sourced from the **selected intern's cohort's `phaseIds`**, not from a hardcoded list or the global `PHASES` array.

`competency-new.html` receives `?internId=<id>` from the assessments hub. Inline IIFE: looks up the intern → looks up cohort → populates the Phase dropdown via `IMPACT.phasesForCohort(cohort)`. The `<select>`'s `value` becomes a phase id (e.g., `'week-2'`); the `<option>`'s text content is the phase label. If the cohort has zero phases, the dropdown shows a single "(no phases configured for this cohort)" option, the placeholder is selected, and Save is disabled with a tooltip explaining the cohort needs phases assigned.

### `competency-edit.html` — no changes

Phase is rendered as a **read-only meta-strip cell** (`data-field="phase"`) on competency-edit, NOT an editable select. The assessment's `phase` field is a string set at creation time and treated as part of the record's identity (the file's own copy describes it as part of the unique participant/phase key). `hydrateCompetencyDetail` continues to render the persisted string via `fillText('[data-field="phase"]', rec.phase)` — no FK resolution is needed because existing assessment records keep their phase strings.

This sub-project does NOT migrate `IMPACT.COMPETENCY` records' `phase` field from string to FK. Doing so would require updating four read sites (`hydrateCompetencyDetail` line 197, `app.js` line 467 record-link label, `assessments.html` line 186, `cohort-detail.html` line 234) and rewiring the existing demo data, all without a clear product reason. Phase-as-FK on assessment records is deferred — sub-project C or later, if needed.

### `intern-record.html`

Entry Assessment barriers: the inline IIFE that renders the 12 checkboxes consumes `IMPACT.BARRIERS` (records of `{id, label}`) instead of `IMPACT.INTERN_BARRIERS` (strings).

- Each checkbox `value` is the barrier `id` (forward-compatible with a future `intern.barrierIds` array).
- Each checkbox label text comes from `barrier.label`.
- Render order respects array order in `BARRIERS`.
- The checkbox count is dynamic: the markup is fully generated by the IIFE rather than 12 hardcoded `<input>` rows. (This may already be the case; if the existing implementation has hardcoded markup, it gets converted to dynamic.)

### `app.js`

- Add the four new datasets and helpers listed in the Data model section.
- Drop the `INTERN_BARRIERS` export.
- `hydrateInternRecord`: rewire the barrier rendering to use the new `BARRIERS` shape (id + label).
- `hydrateCohortDetail`: render Role as plain text (not a clickable link). Roles is a flat list with no per-role detail page — linking would lead to an unfiltered Roles list, which adds friction without value. Employer remains a clickable link because it has a real detail page. Render Phases as a comma-separated list via `phasesForCohort(cohort)`.
- Add `IMPACT.saveProgramInfo(payload)` and the matching sessionStorage merge at module init.
- Add `IMPACT.phasesForCohort(cohort)` helper (returns array of phase records for a cohort, in `PHASES` array order).

### Sidebar rail across all settings pages

Every settings page's `.settings-rail` block currently links the four sub-project-B sidebar items at `settings-stub.html?section=…`. Update them to point at the real pages:

| sidebar item | old href | new href |
|---|---|---|
| Phase Library | `settings-stub.html?section=phases` | `settings-phases.html` |
| Barriers | `settings-stub.html?section=barriers` | `settings-barriers.html` |
| Roles | `settings-stub.html?section=roles` | `settings-roles.html` |
| Program Info | `settings-stub.html?section=program-info` | `settings-program-info.html` |

The "Phase Library" sidebar label simplifies to "Phases" since there's no library-vs-template distinction anymore.

The "Questions" item continues to route to `settings-stub.html?section=questions`.

### `settings-stub.html`

The `LABELS` map shrinks to a single entry: `{ questions: 'Questions' }`. All other section slugs fall through to the default "Settings" heading. The page itself stays in the codebase as the Questions placeholder.

---

## Validation rules (consolidated)

| Page | Rules |
|---|---|
| Phases list | Each label non-empty after trim. No duplicate labels (case-insensitive). At least one row. |
| Barriers list | Same three rules as Phases. |
| Roles list | Same three rules as Phases. |
| Program Info | Program Name required. Contact Email matches `^[^\s@]+@[^\s@]+\.[^\s@]+$` (same regex as Employer form). Default Cohort Length is a positive integer. Fiscal Year Start is one of the 12 month names. |
| Cohort form (Role dropdown) | `{selector: '#co-role', required: true}` — placeholder option treated as empty. |
| Cohort form (Phase multi-select) | At least one checkbox in `name="cohort-phases"` must be checked. |
| Competency-new (Phase dropdown) | Phase dropdown required; if cohort has zero phases, the form blocks Save with a clear message. (Competency-edit's Phase is read-only — no validation needed.) |

---

## Edge cases

- **Delete a Phase referenced by ≥1 cohort** — confirm modal lists the affected cohorts; on confirm, deletion proceeds and each cohort's `phaseIds` array has the deleted id filtered out. Existing competency assessment records keep their persisted `phase` strings unchanged (those records aren't FK-linked to `IMPACT.PHASES`).
- **Delete a Phase that's the only one selected by a cohort** — proceeds; the cohort ends up with `phaseIds: []`, which means new competency assessments for that cohort can't be saved until phases are re-assigned. Surfaced via a warning banner on the cohort detail page when `phaseIds` is empty.
- **Delete a Role referenced by ≥1 cohort** — confirm modal lists the cohort names; on confirm, deletion proceeds and orphaned cohorts get `roleId: null`. The cohort detail page's Role cell renders `—` until reassigned.
- **Delete a Barrier** — no cascade because intern records don't currently store selected barriers in `app.js`. The checkbox simply disappears from the Entry Assessment.
- **Hit a settings-* page directly with no cached state** — the page renders from `IMPACT.<ARRAY>` defaults. SessionStorage is opportunistic, not required.
- **Two tabs editing different settings pages** — sessionStorage is per-tab in browsers; cross-tab divergence isn't a concern. Same caveat as sub-project A (already documented).
- **Open competency-new with no phases configured for the intern's cohort** — dropdown shows a disabled "(no phases configured for this cohort)" option, Save button is disabled, helper text below the dropdown reads "Add phases to this cohort before assessing." with a link back to the cohort edit form.

---

## Manual test plan (high level)

1. **Navigate Settings → Phases.** 6 rows visible (Intake / Week 2 / Week 4 / Midpoint / Week 8 / Final). Edit one label, add a row, reorder, save → success toast.
2. **Save with a duplicate / empty phase label.** Inline error highlights the offending row(s); save aborts.
3. **Navigate Settings → Barriers.** 12 rows visible. Edit one label, add one row, reorder, save → success toast. Open `intern-record.html?id=evans` → Entry Assessment reflects the new label, new barrier, new order.
4. **Navigate Settings → Roles.** 6 rows visible. Add a 7th, save. Delete one referenced by Eskenazi 2026 → confirm modal lists the cohort. Proceed → cohort-detail Role cell now reads `—`.
5. **Navigate Settings → Program Info.** Form pre-fills with defaults. Edit Contact Email, save → success toast → returns to Employers list. Re-open → edit persists.
6. **Create a new cohort.** Role dropdown lists current `IMPACT.ROLES`. Phase multi-select lists all `IMPACT.PHASES`. Pick role + 3 phases → save. Open the cohort detail → phases render as a comma-separated list.
7. **Edit an existing cohort.** Role dropdown pre-selects the cohort's current `roleId`. Phase multi-select pre-checks the cohort's current `phaseIds`.
8. **Save a cohort with zero phases checked.** Save aborts with a danger toast.
9. **Run a Competency Assessment.** Open `assessments.html`, pick an `MA — 2026` intern, click Begin. Phase dropdown shows the cohort's selected phases (Intake, Week 2, Week 4, Midpoint, Week 8, Final — full set). Pick a different intern from `Customer Service — 2026` and confirm only 4 phases appear (Intake, Week 2, Midpoint, Final).
10. **Edit a Competency Assessment.** Open `competency-edit.html?id=c-bayer-w2`. Phase displays as a read-only meta-strip cell (`Week 2`). No editable select on this page.
11. **Delete a Phase referenced by ≥1 cohort.** Confirm modal lists the affected cohorts. Proceed. Open one of those cohorts → its phase multi-select no longer includes the deleted phase. Run a new competency assessment for that cohort → dropdown excludes the deleted phase. Existing assessment records keep their persisted phase strings unchanged.
12. **Hit `settings-stub.html?section=questions`.** Still renders the "Questions is coming soon." card. `?section=phases` etc. now fall through to the generic "Settings" heading because the LABELS map shrank.

---

## Sub-project boundaries

This spec is one of three sub-projects under the larger Settings program:

- **Sub-project A** (`2026-05-06-settings-shell-employers-cohorts-design.md`) — Settings shell, Employers, Cohort migration to `employerId` FK. **Shipped.**
- **Sub-project B** (this spec) — Phases, Barriers, Roles, Program Info.
- **Sub-project C** (future) — Questions library, data-driven forms, versioning, custom question-type builder. Will replace the remaining Questions stub and migrate the existing Personal Goals + Midpoint Reflection placeholder forms to real content.

Each sub-project ships its own implementation plan and lands as a self-contained set of commits.
