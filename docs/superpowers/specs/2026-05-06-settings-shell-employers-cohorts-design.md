# Settings shell + Employers/Cohorts Design

**Status:** Approved (brainstormed 2026-05-06)
**Sub-project:** A of 3 (Settings area decomposition)
**Future sub-projects:** B = Other Settings (Phase Library, Barriers, Roles, Program Info, …); C = Questions management (data-driven forms + versioning + custom question-type builder).

## Goal

Introduce a Settings area to the admin app, anchored by a left sidebar rail. Add a new top-level **Employer** data type, with **Cohorts** as nested children of an Employer. Migrate the existing flat Cohorts management into Settings. Scaffold the sidebar with placeholder destinations for the future sub-projects so the IA is established now.

## Why this sub-project comes first

It establishes the Settings shell (top-nav tab, sidebar layout) that B and C will plug into, and refactors the cohort data model (employer string → Employer FK) before sub-project B (which may want phase library / role catalog references that interact with employer/cohort data) and C (which doesn't touch employer/cohort but will hang off the same shell).

## Scope summary

**In scope:**
- Add "Settings" tab to admin nav across all admin pages.
- Build the Settings sidebar rail (one live section + five placeholder sections).
- New `IMPACT.EMPLOYERS` mock array; Cohort gains `employerId`, drops the `employer` string, name shortens.
- New pages: Employers list, Employer detail/view, Employer new/edit form, generic stub page.
- Update existing pages that read `cohort.employer` to look up via `employerId`.
- Make employer name in meta-strips a clickable link to the new Employer detail page.
- Add Employer dropdown to `cohort-new.html` / `cohort-edit.html` (replaces free-text employer field).
- Pre-select employer when `cohort-new.html?employerId=<id>` is reached from inside an employer detail.
- Delete `cohorts.html` and the Interns/Cohorts sub-nav.
- Cohort renames: drop the redundant employer prefix; use role-anchored names.

**Out of scope (deferred to B or C):**
- Real implementations of the Questions / Phase Library / Barriers / Roles / Program Info sidebar items.
- Soft-delete / undo on employer or cohort deletions.
- Employer logos, employer types (healthcare/manufacturing/non-profit), websites, addresses, or any non-listed Employer fields.
- Bulk import of employers or cohorts.
- Search/filter on the employers list (six employers don't need it; revisit when the list grows).
- User/admin role management.

## Architecture & navigation

### New top-level admin nav tab

Order becomes: `Home · Interns · Assessments · Self-Assessment Results · Reports · Settings · admin-chip`. Settings sits between Reports and the admin-chip, matching the SaaS convention of placing Settings near the user menu.

### Settings page model

Clicking the Settings nav lands on the Employers list (no separate Settings hub page). Every Settings sub-page renders the same sidebar rail; the page-content area on the right swaps based on the active section.

### Sidebar rail

A persistent vertical list on the left of every Settings page. Items use the same brand tokens as the rest of the design (mono micro-labels, navy active, cyan focus ring).

| Sidebar item | v1 destination | Status |
|---|---|---|
| Employers | `settings-employers.html` | **Live** |
| Questions | `settings-stub.html?section=questions` | Placeholder (sub-project C) |
| Phase Library | `settings-stub.html?section=phases` | Placeholder (sub-project B) |
| Barriers | `settings-stub.html?section=barriers` | Placeholder (sub-project B) |
| Roles | `settings-stub.html?section=roles` | Placeholder (sub-project B) |
| Program Info | `settings-stub.html?section=program-info` | Placeholder (sub-project B) |

The placeholder items are clickable links (not greyed-out) that route to a shared stub page. The stub renders the same sidebar (with the corresponding item active) and a centered "Coming soon" message naming the section.

## Data model

### `IMPACT.EMPLOYERS` (new)

A new top-level mock array. Six curated records, one per existing employer string. Hand-authored, not auto-derived, so contact info reads like real demo data.

```js
const EMPLOYERS = [
  {
    id: 'eskenazi-health',
    name: 'Eskenazi Health',
    contactName: 'Maya Reyes',
    contactEmail: 'maya.reyes@eskenazihealth.edu',
    phone: '(317) 555-0148',
    notes: 'Primary-care MA placements across 4 clinics. Quarterly cohorts.'
  },
  {
    id: 'indy-tech-trades',
    name: 'Indy Tech Trades',
    contactName: 'Wesley Park',
    contactEmail: 'wesley@indytechtrades.org',
    phone: '(317) 555-0291',
    notes: 'Construction apprenticeship pipeline; OSHA + tooling certs included.'
  },
  {
    id: 'habitat-indy',
    name: 'Habitat Indianapolis',
    contactName: 'Renee Coleman',
    contactEmail: 'rcoleman@habitatindy.org',
    phone: '(317) 555-0762',
    notes: 'Community builder track; runs alongside neighborhood revitalization sites.'
  },
  {
    id: 'elevate-ventures',
    name: 'Elevate Ventures',
    contactName: 'Priya Shah',
    contactEmail: 'priya.shah@elevateventures.com',
    phone: '(317) 555-0413',
    notes: 'Customer-service track at growth-stage portfolio companies.'
  },
  {
    id: 'geminus-behavioral',
    name: 'Geminus Behavioral',
    contactName: 'Aaron Mendez',
    contactEmail: 'aaron.mendez@geminusbh.org',
    phone: '(219) 555-0184',
    notes: 'Behavioral-health intake placements across NW Indiana clinics.'
  },
  {
    id: 'healthlink-indiana',
    name: 'HealthLink Indiana',
    contactName: 'Tasha Whitlock',
    contactEmail: 'twhitlock@healthlinkin.org',
    phone: '(317) 555-0856',
    notes: 'Clinic admin / care coordination roles; multi-site rotations.'
  }
];
```

### `IMPACT.COHORTS` (modified)

Each cohort gains `employerId`, drops the redundant `employer` string, and gets a shorter role-anchored `name`. The `id` field is unchanged so existing `intern.cohortId` references keep working.

| Cohort id | Old `name` | New `name` | New `employerId` | `role` (unchanged) |
|---|---|---|---|---|
| eskenazi-2026 | Eskenazi 2026 | MA — 2026 | eskenazi-health | Medical Assistant |
| ttt-2026 | TTT 2026 | Construction — 2026 | indy-tech-trades | Construction Apprentice |
| habitat-2026 | Habitat 2026 | Community Builder — 2026 | habitat-indy | Community Builder |
| elevate-2026 | Elevate 2026 | Customer Service — 2026 | elevate-ventures | Customer Service |
| geminus-2026 | Geminus 2026 | Behavioral Health — 2026 | geminus-behavioral | Behavioral Health |
| healthlink-2026 | Health Link 2026 | Clinic Admin — 2026 | healthlink-indiana | Clinic Admin |

### New helpers (in `app.js`, exported via `window.IMPACT`)

```js
function employerById(id) {
  return EMPLOYERS.find(function (e) { return e.id === id; }) || null;
}

function cohortsForEmployer(employerId) {
  return COHORTS.filter(function (c) { return c.employerId === employerId; });
}

// employerNameFor(cohort) is a convenience for the many display sites that
// previously read cohort.employer directly.
function employerNameFor(cohort) {
  if (!cohort) return '';
  var e = employerById(cohort.employerId);
  return e ? e.name : '';
}
```

The `cohortNameFor(intern)` helper continues to work unchanged because it only reads `cohort.name`.

## Pages

### New (4)

#### `settings-employers.html`
The Settings landing page. Shell:
- Admin nav with **Settings** active.
- Sidebar rail with **Employers** active.
- Content area: page-head with `ADMIN / SETTINGS / EMPLOYERS` breadcrumb and an `Employers.` h1. `+ New Employer` button (top-right of the list). Table-style list of employer rows: name (with initial chip), contact name, contact email, cohort count. Click row → `settings-employer.html?id=<employerId>`.
- Footer.

#### `settings-employer.html?id=<id>`
Read view of a single employer plus the cohorts under them.
- Sidebar rail (Employers active).
- Page-head: breadcrumb `ADMIN / SETTINGS / EMPLOYERS / <Employer Name>`. h1 `<Employer Name>.`. Subtitle "Contact and cohort overview." Meta-strip: Contact Name · Contact Email · Phone.
- Section: **Employer info** card — shows Name, Contact Name, Contact Email, Phone, Notes as label/value pairs. Action row: `Edit Employer` (links to `settings-employer-form.html?id=<id>`), `Delete Employer` (opens delete-confirmation modal).
- Section: **Cohorts** — table of cohorts under this employer (columns: Cohort name, Role, Start, Members). Top-right: `+ New Cohort` button → `cohort-new.html?employerId=<id>`. Click row → `cohort-detail.html?id=<cohortId>`.
- Footer.

If `?id=` is missing or unknown: fire a danger toast (`NO EMPLOYER — Employer not found.`) and redirect to `settings-employers.html` after 1500ms (mirrors the missing-internId pattern on `exit-employer-survey.html`).

#### `settings-employer-form.html`
Unified new+edit form (mirrors the `intern-record.html` pattern: `?id=<id>` for edit, no param for new).
- Sidebar rail (Employers active).
- Page-head: breadcrumb `ADMIN / SETTINGS / EMPLOYERS / NEW` (or `… / EDIT` when `?id=`). h1 `New Employer.` or `Edit Employer.`.
- Form fields:
  - **Name** — required text input.
  - **Contact Name** — text input.
  - **Contact Email** — email input (optional, but if present must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
  - **Phone** — text input (no format validation in v1).
  - **Notes** — textarea, 3 rows.
- Action bar: `Cancel` (→ `settings-employers.html`) + `Save` button.
- Save → toast (`SAVED — Employer saved.` for new; `UPDATED — Employer updated.` for edit) → 700ms → `settings-employers.html`.
- Edit-mode hydration: read `?id=`, look up `IMPACT.employerById`, pre-fill all fields. If id missing/unknown → danger toast and redirect like `settings-employer.html`.

#### `settings-stub.html?section=<name>`
Shared placeholder for the not-yet-built sidebar items.
- Sidebar rail with the section corresponding to `?section=` active.
- Content area: centered card with the section name and a "Coming soon" message ("This section will be available in a future update. For now, [mention what currently handles that data — e.g., for `barriers`, 'the Entry Assessment panel on the intern record uses the built-in barrier list'].").
- Section name → human label mapping is hardcoded in the inline IIFE: `questions` → "Questions", `phases` → "Phase Library", `barriers` → "Barriers", `roles` → "Roles", `program-info` → "Program Info". Unknown sections fall back to a generic "Settings" heading.

### Modified

#### Top nav (all admin pages)
Insert `<a href="settings-employers.html" class="nav__link">Settings</a>` between the Reports link and the admin-chip span. The `nav__link--active` modifier is applied on the four Settings pages above.

#### `cohort-new.html` / `cohort-edit.html`
Replace the (currently free-text) employer field with an **Employer dropdown** (`<select>`) populated from `IMPACT.EMPLOYERS`. Each `<option>` uses `value="<employerId>"` so the form captures the FK directly.

When `cohort-new.html` is reached with `?employerId=<id>`, the dropdown is pre-selected to that id (admin coming from inside an employer detail doesn't have to re-pick the parent).

`cohort-edit.html?id=<cohortId>`: dropdown pre-selects `cohort.employerId`.

Save behavior: `cohort-new.html` redirects to `settings-employer.html?id=<employerId>` on success when `?employerId=<id>` was in the URL (returns the admin to the employer they were adding under), otherwise to `settings-employers.html` (the previous redirect target was `cohorts.html`, which is being deleted). `cohort-edit.html` continues to redirect to `cohort-detail.html?id=<cohortId>` (no change).

#### `cohort-detail.html`
Meta-strip: the **Employer** cell becomes a clickable link to `settings-employer.html?id=<employerId>` (with the existing `style="color:inherit"` link styling so it doesn't visually jar). Reads via `IMPACT.employerById(cohort.employerId).name`.

#### `intern-record.html`
The Internship Details panel (panel 02) shows employer info. Same change: read employer via `cohort.employerId` lookup; display as a clickable link to `settings-employer.html?id=<employerId>`.

#### `exit-employer-survey.html`
Meta-strip employer cell (`data-meta="employer"`): swap the data source from `cohort.employer` → `IMPACT.employerNameFor(intern's cohort)`. Render as a clickable link to `settings-employer.html?id=<employerId>`.

#### `interns-dashboard.html`
Remove the **Interns / Cohorts** sub-nav at the top of the page (Cohorts has moved out of the Interns section). The page becomes single-purpose: an interns list.

### Deleted (1)

#### `cohorts.html`
Functionally replaced by `settings-employers.html` → drill into employer → see cohorts in context. All inbound links (admin home quick-link, footer references) get rewired to `settings-employers.html`.

### Page count

Was 23, now: +4 new (`settings-employers.html`, `settings-employer.html`, `settings-employer-form.html`, `settings-stub.html`) − 1 deleted (`cohorts.html`) = **26 pages**.

## CSS additions

The Settings layout introduces a couple of new structural classes that go in `styles.css`:

```css
/* ============================================================
   SETTINGS SHELL
   ============================================================ */

/* Two-column layout: sidebar rail + content area */
.settings-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 32px;
  margin: 32px 0;
}

@media (max-width: 880px) {
  .settings-shell {
    grid-template-columns: 1fr;
  }
}

/* Sidebar rail */
.settings-rail {
  position: sticky;
  top: 24px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-rail__group {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 12px 14px 6px;
}

.settings-rail__item {
  display: block;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--ink);
  text-decoration: none;
  transition: background 120ms ease, color 120ms ease;
}

.settings-rail__item:hover {
  background: var(--canvas-alt, #F5F7FA);
}

.settings-rail__item--active {
  background: var(--navy);
  color: #fff;
}

.settings-rail__item--active:hover {
  background: var(--navy);
}

/* Centered "Coming soon" card on the stub page */
.settings-stub {
  max-width: 540px;
  margin: 80px auto;
  padding: 48px 32px;
  text-align: center;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  background: #fff;
}
```

The existing list-table, button, modal, and form classes are reused unchanged.

## Edge cases & decisions

- **Employer with zero cohorts** — the cohorts table on `settings-employer.html` shows a single empty-state row ("No cohorts yet for this employer.") and the `+ New Cohort` button is still active.
- **Employer delete with active cohorts** — the delete-confirmation modal warns ("This employer has N cohort(s). Cohorts will need to be reassigned or deleted before the employer can be removed."). For v1, the delete-permanently button still completes (consistent with the existing delete-cohort behavior) and the toast says "DELETED — Employer removed." A real implementation would block the delete or cascade; the prototype documents the warning and proceeds.
- **Cohort orphaned by employer delete** — out of scope to handle gracefully in mock data. Documented as a known prototype limitation.
- **Email validation** — `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` is the simplest regex that catches obvious typos. Phone is unvalidated (free-text in v1).
- **Employer dropdown options** — `<option value="<employerId>"><employer.name></option>`. The empty placeholder option is `<option value="">Select employer…</option>` (matches existing cohort dropdown style).
- **Pre-select via URL on `cohort-new.html`** — reads `IMPACT.qs('employerId')`; if present and matches an employer, sets the dropdown's value at IIFE time.
- **Sub-nav removal on `interns-dashboard.html`** — drop the entire `<div class="sub-nav">…</div>` block. The page-head H1 ("Interns.") stays as the page title.
- **Stub page section labels** — the inline IIFE handles unknown `?section=` values by showing a generic "Settings" heading rather than throwing.
- **Sticky sidebar** — `position: sticky; top: 24px;` keeps the sidebar visible during long Employer lists; collapses to a stacked layout below 880px viewport width.
- **Active-state class on sidebar items** — single `nav__link--active`-style modifier on the active item; navigations between Settings sub-pages re-render the sidebar with a different item active. (No SPA routing — each page is a static HTML render that hardcodes which sidebar item is active.)

## Manual test plan

1. Click `Settings` in admin nav → lands on `settings-employers.html`. Sidebar shows 6 items; **Employers** is active. Six employer rows visible with name, contact, contact email, cohort count.
2. Click an employer row → `settings-employer.html?id=eskenazi-health`. Meta-strip shows Maya Reyes / maya.reyes@eskenazihealth.edu / (317) 555-0148. Cohorts table shows `MA — 2026` with role Medical Assistant, 15 members.
3. Click `+ New Cohort` from inside the employer detail → `cohort-new.html?employerId=eskenazi-health`. Employer dropdown is pre-selected to "Eskenazi Health". Other fields blank.
4. Click `+ New Employer` from `settings-employers.html` → `settings-employer-form.html`. Empty form. Submit blank → "Name is required" toast. Fill in valid fields → save toast → redirect to `settings-employers.html`. New employer appears in the list (in-memory only — refresh resets, since this is a prototype).
5. From an employer detail, click `Edit Employer` → `settings-employer-form.html?id=<id>`. All five fields are pre-filled. Save → "Updated" toast → returns to `settings-employers.html`.
6. From an employer detail, click `Delete Employer` → modal warns about cohorts → click Delete Permanently → "DELETED" toast → returns to `settings-employers.html`.
7. Click each placeholder sidebar item (Questions, Phase Library, Barriers, Roles, Program Info) → lands on `settings-stub.html?section=<name>`. Sidebar still shows the corresponding item active. Centered "Coming soon" card visible.
8. Visit `cohort-detail.html?id=eskenazi-2026` → meta-strip employer cell reads "Eskenazi Health" and is a clickable link to `settings-employer.html?id=eskenazi-health`.
9. Visit `intern-record.html?id=evans` → Internship Details panel shows employer "Elevate Ventures" as a link.
10. Visit `exit-employer-survey.html?internId=evans` → meta-strip Employer cell shows "Elevate Ventures" as a link.
11. Visit the old `cohorts.html` URL directly → 404 (file deleted).
12. Visit `interns-dashboard.html` → no Interns/Cohorts sub-nav at the top.
13. Print preview on `settings-employers.html` → action bars and modal markup hidden by existing `@media print` rules; sidebar hidden too (add a print rule if needed during implementation).
14. Direct URL `settings-employer.html` (no `?id=`) → danger toast + redirect to `settings-employers.html`. Same for `?id=garbage`.
15. Direct URL `settings-employer-form.html?id=garbage` → danger toast + redirect.

## Doc updates

- **`CLAUDE.md`** — page count 23 → 26; admin navbar order line gains "Settings" between Reports and admin-chip; Admin section in the page inventory adds the four new pages and removes `cohorts.html`; data model bullet for `IMPACT.EMPLOYERS` and the cohort-shape change.
- **`PRD.md`** — section 9 (Screens reference) gains a Settings entry. Section 6 (Data Model) describes the new Employer entity and the Cohort employerId FK.
- **`IMPACT Internship Assessment Portal - App Outline.md`** — new `# SCREEN: Settings` block with VIEWs for Employers list / Employer detail / Employer form / Stub. Existing Cohort entries get a note that they're now reached through Settings.

## Known prototype limitations

- New / edited / deleted employers persist only in the current page session (the prototype reads from a hardcoded `IMPACT.EMPLOYERS` array; no real persistence). Refresh restores the original six.
- Cohort delete from `cohort-edit.html` doesn't cascade-clean orphaned interns. Same limitation existed before.
- The Employer dropdown on `cohort-new.html` shows all employers including any that were just deleted in this session (the prototype doesn't track delete state).
- Sidebar "Coming soon" pages have no real content — sub-projects B and C will fill them in.
