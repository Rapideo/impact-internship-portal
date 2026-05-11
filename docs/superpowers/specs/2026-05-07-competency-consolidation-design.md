# Competency Questions Consolidation — Design Spec

**Date:** 2026-05-07
**Sub-project:** E (D — responsive audit — deferred to BACKLOG)

## Goal

Move ALL competency question authoring out of the Cohort and Intern records into Settings → Questions, replacing today's bespoke 3-tier system (program-wide hardcoded HTML + per-cohort inline + per-intern inline) with a unified data-driven model: one Core set program-wide, optional per-cohort sets, optional per-intern sets — all stored in `IMPACT.QUESTION_SETS`, all stitched at assessment time.

## Architecture

**3 new entity types in `IMPACT.QUESTION_SETS`:**
- `competency-core` — singleton, program-wide. Default seeds with the 7 existing Professional Competencies.
- `competency-cohort-<cohortId>` — optional, one per cohort. Sample seed: `competency-cohort-eskenazi-2026` with the 4 existing MA-specific competencies.
- `competency-intern-<internId>` — optional, one per intern. No sample seed.

**3 new admin pages:**
- `settings-competency.html` — detail page mirroring `settings-employer.html`'s Card-with-child-tables shape: Core summary card + Cohort Questions table + Intern Questions table.
- `competency-cohort-set.html` — new/edit page for one cohort's set (cohort dropdown + accordion editor).
- `competency-intern-set.html` — same shape, intern dropdown.

**3 form refactors:**
- `competency-new.html`, `competency-edit.html`, `competency-detail.html` — rebuilt to render via `IMPACT.renderQuestion`, stitching Core → Cohort → Intern based on the assessed intern's cohort. Save uses `collectAnswers`/`validateAnswers`; restore (and read-only render on detail) uses `restoreAnswers`.

**3 page cleanups:**
- `cohort-new.html` and `cohort-edit.html` — delete the Role-Specific Competency Questions section.
- `intern-record.html` — delete Panel 04 (Role-Specific Competency Questions); renumber subsequent panels.

**CSS:** the 4 `competency-rubric-row` renderer classes deferred in C2a Task 4 land here, scoped via `.assessment-question[data-qtype="competency-rubric-row"]` to avoid colliding with `.rubric-row` still used by `self-assessment-detail.html` (which stays bespoke).

## Data model

```js
// Core (singleton)
{
  id: 'competency-core',
  name: 'Competency Rubric — Core',
  minRequired: 0,
  questions: [
    { id: 'comp-attendance',      type: 'competency-rubric-row',
      label: 'Attendance & Punctuality',
      helperText: 'Arrives on time, communicates absences appropriately, meets hour expectations',
      required: false, config: {} },
    { id: 'comp-conduct',         type: 'competency-rubric-row',
      label: 'Professional Conduct',
      helperText: 'Respectful, follows workplace norms, appropriate language and behavior',
      required: false, config: {} },
    { id: 'comp-communication',   type: 'competency-rubric-row',
      label: 'Communication',
      helperText: 'Asks clarifying questions, provides updates, communicates professionally with supervisor and coworkers',
      required: false, config: {} },
    { id: 'comp-direction',       type: 'competency-rubric-row',
      label: 'Following Direction',
      helperText: 'Understands instructions, completes tasks as assigned, confirms priorities',
      required: false, config: {} },
    { id: 'comp-problem-solving', type: 'competency-rubric-row',
      label: 'Problem-Solving',
      helperText: 'Identifies issues, proposes solutions, escalates appropriately',
      required: false, config: {} },
    { id: 'comp-teamwork',        type: 'competency-rubric-row',
      label: 'Teamwork',
      helperText: 'Collaborates effectively, supports peers, contributes to shared work',
      required: false, config: {} },
    { id: 'comp-quality',         type: 'competency-rubric-row',
      label: 'Quality & Attention to Detail',
      helperText: 'Produces accurate work, double-checks before submitting, takes pride in output',
      required: false, config: {} }
  ]
}

// Per-cohort sample seed
{
  id: 'competency-cohort-eskenazi-2026',
  name: 'Eskenazi 2026 — Role-Specific',
  cohortId: 'eskenazi-2026',
  minRequired: 0,
  questions: [
    { id: 'cc-eskenazi-intake', type: 'competency-rubric-row',
      label: 'Patient Intake & Vitals',
      helperText: 'Captures vitals accurately, follows intake protocol, documents in EHR',
      required: false, config: {} },
    { id: 'cc-eskenazi-ehr',    type: 'competency-rubric-row',
      label: 'EHR Tooling',
      helperText: 'Navigates EHR, completes notes, uses templates appropriately',
      required: false, config: {} },
    { id: 'cc-eskenazi-pace',   type: 'competency-rubric-row',
      label: 'Pace & Accuracy',
      helperText: 'Maintains throughput without sacrificing patient safety',
      required: false, config: {} },
    { id: 'cc-eskenazi-hipaa',  type: 'competency-rubric-row',
      label: 'HIPAA & Compliance',
      helperText: 'Handles PHI appropriately, follows privacy protocols, escalates concerns',
      required: false, config: {} }
  ]
}
```

The `cohortId` / `internId` field on cohort/intern sets is technically redundant (encoded in the set id), but explicit makes the picker's filter-out-already-customized logic O(n) instead of substring-parsing.

**Set name auto-derivation.** When admin creates a new cohort/intern set, the `name` field is computed from the bound entity, not typed:
- Cohort: `<Cohort Name> — Role-Specific` (e.g., "Eskenazi 2026 — Role-Specific").
- Intern: `<Intern Last Name> — Custom` (e.g., "Bayer — Custom").

Names are read-only in the editor (consistent with the C2 convention that set names are fixed identities).

**`minRequired: 0` rationale.** Competency assessments are rating-based and admin-completed; an admin may legitimately leave some domains unrated when the intern hasn't been observed against them yet. The "answer at least N" enforcement doesn't apply. All 3 tiers ship with `minRequired: 0`.

## New helpers in `app.js`

```js
function competencyCoreSet() { return questionSetById('competency-core'); }
function competencyCohortSet(cohortId)  { return questionSetById('competency-cohort-' + cohortId); }
function competencyInternSet(internId)  { return questionSetById('competency-intern-' + internId); }

function stitchedCompetencyQuestions(internId) {
  var intern = internById(internId);
  var core = competencyCoreSet();
  var cohort = intern ? competencyCohortSet(intern.cohortId) : null;
  var perIntern = competencyInternSet(internId);
  var out = [];
  if (core)      core.questions.forEach(function (q) { out.push(q); });
  if (cohort)    cohort.questions.forEach(function (q) { out.push(q); });
  if (perIntern) perIntern.questions.forEach(function (q) { out.push(q); });
  return out;
}
```

The stitched array is what the assessment form renders. It's an ad-hoc set — no `id` because it isn't stored in `QUESTION_SETS`; it's computed at render time. The renderer + collect + validate + restore helpers operate on the stitched questions array, so they don't need to know about the 3-tier concept.

## Helper API enhancement

The C2a helpers (`collectAnswers`, `validateAnswers`, `restoreAnswers`) currently accept a `setId` string and call `questionSetById(setId)` internally. To operate on the synthesized stitched set, each helper gains a tiny overload — accept **either** a setId string **or** a set object as the first param:

```js
function collectAnswers(setOrId, container) {
  var set = (typeof setOrId === 'object') ? setOrId : questionSetById(setOrId);
  // ...rest unchanged
}
```

Same for `validateAnswers`, `restoreAnswers`. The 4 string-based callers from sub-project C are unaffected; the 3 competency forms pass `{ questions: stitched, minRequired: 0 }` directly.

## Settings UX

### `settings-questions.html` change

- Competency Rubric row's READ-ONLY badge + readonly modifier removed; the row becomes clickable.
- Click navigates to `settings-competency.html`.
- Last-Edited column hydrates from the most recent `lastEdited` across all 3 competency tiers (Core, all cohort sets, all intern sets), or em-dash if none.
- Question count column hydrates from the Core set's question count (since Core is the always-present tier; cohort/intern counts are visible on the detail page).

### `settings-competency.html` (new detail page)

Three stacked cards in main panel:

**1. Core Competencies summary card.**
- Question count (live).
- Last-edited timestamp.
- **Edit Core** button → `settings-question-set.html?id=competency-core` (the existing per-set editor — zero new code).

**2. Cohort Questions table.**
- Columns: Cohort Name | Employer | Question Count | Last Edited.
- Hydrated from `IMPACT.QUESTION_SETS.filter(s => s.id.startsWith('competency-cohort-'))`.
- Row click → `competency-cohort-set.html?id=<cohortId>`.
- **+ New Cohort Questions** button at bottom → `competency-cohort-set.html` (new mode, no `?id=`).

**3. Intern Questions table.**
- Columns: Intern Name | Cohort | Question Count | Last Edited.
- Hydrated from `IMPACT.QUESTION_SETS.filter(s => s.id.startsWith('competency-intern-'))`.
- Row click → `competency-intern-set.html?id=<internId>`.
- **+ New Intern Questions** button at bottom.

### `competency-cohort-set.html` and `competency-intern-set.html`

Reuse the editor pattern from `settings-question-set.html` with one swap:

- "Set Name" disabled input → Cohort/Intern dropdown.
  - **New mode** (no `?id=`): dropdown enabled, filtered to entities WITHOUT existing sets (enforces 1-per-entity uniqueness).
  - **Edit mode** (`?id=<entityId>`): dropdown disabled, showing the bound entity name.
- Same accordion + 6-type picker editor + validation flow + save flow as `settings-question-set.html`.
- Save commits to `competency-cohort-<cohortId>` (or `competency-intern-<internId>`) in `QUESTION_SETS`.

### URL contract

- `settings-competency.html` — no params.
- `competency-cohort-set.html` — `?id=<cohortId>` (edit) or absent (new).
- `competency-intern-set.html` — `?id=<internId>` (edit) or absent (new).
- Missing/unknown id → danger toast + 1500ms redirect to `settings-competency.html`.

## Assessment form refactor

`competency-new.html`, `competency-edit.html`, `competency-detail.html` rebuilt to:

1. Read URL params (existing intern + phase context).
2. Compute stitched set: `var set = { questions: IMPACT.stitchedCompetencyQuestions(internId), minRequired: 0 };`
3. Render the 3 tiers into a single container, with section headers between tiers:
   - "Professional Competencies" header (always rendered).
   - Iterate Core questions → `IMPACT.renderQuestion(q, container, idx)`.
   - If cohort set exists: render header "Role-Specific: <Cohort Name>" → render cohort questions.
   - If intern set exists: render header "Intern-Specific" → render intern questions.
   - Use the same inline-styled `<h3 class="assessment-section-head">` pattern from `personal-goals.html`.
4. **Save (`competency-new.html`, `competency-edit.html`):**
   - `var answers = IMPACT.collectAnswers(set, container);`
   - `var v = IMPACT.validateAnswers(set, answers);`
   - On valid: persist via existing `markAssessmentComplete('competency', internId, { phase, answers, ...meta })` pattern.
5. **Restore (`competency-edit.html`):** `IMPACT.restoreAnswers(set, container, savedPayload.answers);`
6. **Read-only (`competency-detail.html`):** render via the same path, then disable all inputs (`querySelectorAll('input,textarea').forEach(el => el.disabled = true)`).

## Cleanups

**HTML removals:**
- `cohort-new.html` — delete the Role-Specific Competency Questions section.
- `cohort-edit.html` — same.
- `intern-record.html` — delete Panel 04 entirely. Renumber subsequent panels (current convention is sequential).

**JS removals:**
- `cohort-new.html` and `cohort-edit.html` — inline JS handlers for role-specific question Add/Remove rows.
- `intern-record.html` — inline JS for Panel 04 hydrate/save.

**CSS:**
- ADD: 4 `competency-rubric-row` renderer rules, scoped via `.assessment-question[data-qtype="competency-rubric-row"]` selectors so they don't collide with `.rubric-row` still used by `self-assessment-detail.html`.
- KEEP: legacy `.rubric-panel`, `.rubric-section-head`, `.segmented__option`, `.rubric-row`, `.rubric-row__label` rules — `self-assessment-detail.html` still uses them.

## Phase gates

Two-phase split:

### Phase E1 — Settings authoring path

User can author Core / Cohort / Intern competency sets via Settings, but the assessment form still uses the old hardcoded markup. Settings UX is invisible to assessors.

- Data model + helpers + Eskenazi cohort seed
- Helper API overload (set object as first param)
- CSS for `competency-rubric-row` renderer (scoped)
- `settings-competency.html` (new detail page)
- `settings-questions.html` update (Competency Rubric clickable, no badge)
- `competency-cohort-set.html` (new editor)
- `competency-intern-set.html` (new editor)

🚦 **Gate E1** — pause for user review of the Settings authoring flow before E2.

### Phase E2 — Assessment refactor + cleanups

Assessment form pivots to render from data; old inline panels removed; documentation updated.

- `competency-new.html` refactor
- `competency-edit.html` refactor (with restore)
- `competency-detail.html` refactor (read-only render)
- Remove Role-Specific section from `cohort-new.html` + `cohort-edit.html`
- Remove Panel 04 from `intern-record.html`
- Documentation updates (CLAUDE.md, PRD.md, App Outline)

🚦 **Gate E2** — final pause. Manual integration test (edit Core → assess intern; create cohort set → assess Eskenazi intern → see role-specific section; create per-intern set → assess that intern → see intern-specific section) + final cross-task review.

## Sample data seed

`QUESTION_SETS_DEFAULTS` array grows from 4 sets to 6:
- Existing 4: `personal-goals`, `midpoint-reflection`, `participant-feedback`, `exit-employer-survey`.
- New 2: `competency-core` (7 questions), `competency-cohort-eskenazi-2026` (4 questions).

No per-intern seed.

## Page count

Adds 3 new pages (`settings-competency.html`, `competency-cohort-set.html`, `competency-intern-set.html`).
- Before: 31.
- After: 34.

## Done criteria

Sub-project E is complete when:
- `IMPACT.QUESTION_SETS_DEFAULTS` contains 6 sets (4 standard + competency-core + competency-cohort-eskenazi-2026).
- `settings-competency.html`, `competency-cohort-set.html`, `competency-intern-set.html` exist and work.
- `competency-new.html`, `competency-edit.html`, `competency-detail.html` render via `IMPACT.renderQuestion` from the stitched set.
- The Role-Specific Competency Questions section is gone from `cohort-new.html` and `cohort-edit.html`.
- Panel 04 is gone from `intern-record.html`.
- CLAUDE.md page count is 34.
- All 3 docs (CLAUDE.md, PRD.md, App Outline) reflect the new model.
- BACKLOG.md updated with the deferrals listed below.

## Deferrals (logged in `docs/BACKLOG.md` as new sub-project E entries)

- **Cascade-delete of cohort/intern with attached competency-cohort/competency-intern set.** When admin deletes a cohort/intern, any attached set is orphaned. Same shape as existing role/phase cascade deferrals.
- **Phase-scoped questions.** The 3 tiers render identically across all phases of an intern's competency assessment. Future enhancement could allow per-question phase scoping.
- **Bulk-author cohort sets from a template.** Admin must create each cohort's set manually. Could provide a "duplicate from another cohort" shortcut.
- **Per-intern set discoverability shortcut.** With Panel 04 gone, admins navigate to Settings → Questions → Competency to find an intern. A small "Customize competency questions" link on `intern-record.html` deep-linking to `competency-intern-set.html?id=<internId>` would shorten the path.
- **Inline Core editor on `settings-competency.html`.** Currently the Core summary card has an "Edit Core" button that navigates away. A future enhancement could render the full Core editor inline on the detail page, mirroring the user's original UX vision more directly. Tradeoff: adds ~150 lines and duplicates the editor.

## Out of scope (not even in BACKLOG)

- **Versioning of competency question sets** — same as the C2 deferral; edit-as-you-go semantics.
- **Custom competency question types beyond the 6 already in the renderer catalog** — same as the C2 deferral.
- **Renaming Core / cohort / intern sets** — names auto-derive from entity bindings.
- **Cross-cohort question reuse** — each cohort's set is independent.
