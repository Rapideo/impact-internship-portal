# Settings shell + Employers/Cohorts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a top-level Settings area to the admin app with a sidebar rail, introduce the `Employer` data type as parent of `Cohort` (replacing the existing `cohort.employer` string field), and migrate cohort management from the standalone `cohorts.html` list into Settings → Employer detail.

**Architecture:** Four new HTML pages reusing the existing prototype's nav / page-head / footer / modal primitives, with a new shared sidebar-rail layout class added to `styles.css`. New `IMPACT.EMPLOYERS` mock array + helpers in `app.js`; existing `cohort.employer` string field is replaced with `cohort.employerId` FK across the dataset and every read site. Existing `cohort-detail.html`, `cohort-new.html`, `cohort-edit.html` stay (now reached through Settings) but get small wiring updates; `cohorts.html` is deleted; the Interns/Cohorts sub-nav on `interns-dashboard.html` is removed. Cohort names are renamed at the same time to drop the redundant employer prefix.

**Tech Stack:** Static HTML, vanilla JS (no framework), CSS custom properties. **No test runner exists in this repo** (per CLAUDE.md: "No build tooling, no framework, no test runner"). Verification steps in this plan are manual: open the page in a browser, perform the described action, confirm the expected DOM/visual result. Where useful, the plan includes Grep/git invariants the spec compliance reviewer can check without a browser.

**Spec:** `docs/superpowers/specs/2026-05-06-settings-shell-employers-cohorts-design.md`

**Working directory for all paths below:** `C:/Users/matts/OneDrive - Koehler Partners/Projects/IMPACT/Internship Assessment/IMPACT Intretnship Assessment Portal/`

---

## Task 1: Data-model migration in `app.js` (Employers + employerId FK + helpers)

Add the new `EMPLOYERS` array, replace `cohort.employer` strings with `employerId` FKs, rename existing cohort `name` strings, update the `IMPACT.COHORTS` array to the new shape, add `employerById` / `cohortsForEmployer` / `employerNameFor` helpers, and update the four existing read-sites (`hydrateCohortDetail`, `hydrateInternRecord`, plus the inline IIFEs on `exit-employer-survey.html` and `intern-record.html` — those are touched in later tasks; the helper exports they need are added here). Export the new helpers via `window.IMPACT`.

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`

- [ ] **Step 1: Replace the `COHORTS` array (currently lines 3–10) with the migrated version**

Open `Prototypes/PROTOTYPE/app.js`. Find the `const COHORTS = [...]` block and replace it with:

```js
  const COHORTS = [
    { id: 'eskenazi-2026',   name: 'MA — 2026',                  employerId: 'eskenazi-health',     role: 'Medical Assistant',       start: '04.01.2026', end: '09.30.2026', members: 15 },
    { id: 'ttt-2026',        name: 'Construction — 2026',        employerId: 'indy-tech-trades',    role: 'Construction Apprentice', start: '04.01.2026', end: '09.30.2026', members: 12 },
    { id: 'habitat-2026',    name: 'Community Builder — 2026',   employerId: 'habitat-indy',        role: 'Community Builder',       start: '04.05.2026', end: '10.05.2026', members: 8  },
    { id: 'elevate-2026',    name: 'Customer Service — 2026',    employerId: 'elevate-ventures',    role: 'Customer Service',        start: '04.01.2026', end: '08.31.2026', members: 10 },
    { id: 'geminus-2026',    name: 'Behavioral Health — 2026',   employerId: 'geminus-behavioral',  role: 'Behavioral Health',       start: '04.05.2026', end: '09.30.2026', members: 6  },
    { id: 'healthlink-2026', name: 'Clinic Admin — 2026',        employerId: 'healthlink-indiana',  role: 'Clinic Admin',            start: '04.01.2026', end: '09.30.2026', members: 11 },
  ];
```

`id` values are UNCHANGED so existing `intern.cohortId` references keep working.

- [ ] **Step 2: Add the new `EMPLOYERS` array immediately above the `COHORTS` declaration**

Insert this block ABOVE the `const COHORTS = [...]` line (so the new constant is declared first, since `cohortsForEmployer` will read from `COHORTS` and helpers use both):

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

- [ ] **Step 3: Add three new helper functions next to the existing lookup helpers**

Find the existing `function cohortById(id)  { return COHORTS.find(c => c.id === id); }` line (around line 52). Insert these THREE functions immediately after `cohortNameFor`:

```js
  function employerById(id) {
    return EMPLOYERS.find(function (e) { return e.id === id; }) || null;
  }

  function cohortsForEmployer(employerId) {
    return COHORTS.filter(function (c) { return c.employerId === employerId; });
  }

  function employerNameFor(cohort) {
    if (!cohort) return '';
    var e = employerById(cohort.employerId);
    return e ? e.name : '';
  }
```

- [ ] **Step 4: Update `hydrateCohortDetail` (around line 132) to read employer via FK**

Find this line inside `hydrateCohortDetail`:

```js
    fillText('[data-field="employer"]',    cohort.employer);
```

Replace with:

```js
    var employer = employerById(cohort.employerId);
    var employerEl = document.querySelector('[data-field="employer"]');
    if (employerEl && employer) {
      employerEl.innerHTML = '<a href="settings-employer.html?id=' + employer.id +
        '" style="color:inherit;">' + employer.name + '</a>';
    } else if (employerEl) {
      employerEl.textContent = '—';
    }
```

This both rewires the data source AND makes the employer name a clickable link to the new Settings detail page. The `style="color:inherit"` matches the breadcrumb-link convention already used elsewhere in the prototype.

- [ ] **Step 5: Update `hydrateInternRecord` (around line 311) to read employer via FK**

Find the line:

```js
    fillText('[data-field="employer"]', cohort ? cohort.employer : '—');
```

Replace with:

```js
    var iEmployer = cohort ? employerById(cohort.employerId) : null;
    var iEmployerEl = document.querySelector('[data-field="employer"]');
    if (iEmployerEl && iEmployer) {
      iEmployerEl.innerHTML = '<a href="settings-employer.html?id=' + iEmployer.id +
        '" style="color:inherit;">' + iEmployer.name + '</a>';
    } else if (iEmployerEl) {
      iEmployerEl.textContent = '—';
    }
```

- [ ] **Step 6: Export the new helpers via `window.IMPACT`**

Find the `window.IMPACT = { ... };` block at the bottom of the file. Replace its contents with:

```js
  window.IMPACT = {
    COHORTS, INTERNS, COMPETENCY, SELF, INTERN_BARRIERS, EMPLOYERS,
    cohortById, internById, cohortNameFor, qs, wireModals, toast,
    fillText, hydrateInternRecord,
    competencyById, selfById, resolveParticipant,
    hydrateCompetencyDetail, hydrateCohortDetail, hydrateSelfDetail,
    wireTableFilter, internsByCohort, validate,
    employerById, cohortsForEmployer, employerNameFor,
    ASSESSMENT_TYPES, assessmentStatus, markAssessmentComplete, formatCompletionDate,
  };
```

The only changes vs. the existing block are: `EMPLOYERS` added to the data-array list on line 1, and `employerById, cohortsForEmployer, employerNameFor,` added on its own line in the helpers section.

- [ ] **Step 7: Manual verification (DevTools console)**

Open `Prototypes/PROTOTYPE/index.html` in a browser. Open DevTools Console. Run:

```js
IMPACT.EMPLOYERS.length
```

Expected: `6`.

```js
IMPACT.employerById('eskenazi-health').name
```

Expected: `"Eskenazi Health"`.

```js
IMPACT.employerById('not-real')
```

Expected: `null`.

```js
IMPACT.cohortsForEmployer('eskenazi-health').map(c => c.name)
```

Expected: `["MA — 2026"]`.

```js
IMPACT.cohortById('eskenazi-2026').name
```

Expected: `"MA — 2026"` (the rename took effect).

```js
IMPACT.cohortById('eskenazi-2026').employer
```

Expected: `undefined` (the old field is gone).

```js
IMPACT.employerNameFor(IMPACT.cohortById('eskenazi-2026'))
```

Expected: `"Eskenazi Health"`.

- [ ] **Step 8: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "Add IMPACT.EMPLOYERS + employerId FK on cohorts; rename cohort names

New EMPLOYERS mock array (6 records, hand-curated). Each cohort gains
employerId and drops the redundant employer string. Cohort names drop
the employer prefix and use role-anchored short names. New helpers:
employerById, cohortsForEmployer, employerNameFor.

hydrateCohortDetail and hydrateInternRecord rewired to look up the
employer via FK; the meta-strip employer cell becomes a clickable
link to settings-employer.html?id=<employerId>."
```

---

## Task 2: Settings shell CSS

Add the sidebar-rail layout, sidebar item styling, and stub-card styling to `styles.css`. Purely additive — no existing rules are modified.

**Files:**
- Modify: `Prototypes/PROTOTYPE/styles.css`

- [ ] **Step 1: Append the Settings shell CSS to the end of the file**

Open `Prototypes/PROTOTYPE/styles.css`. Scroll to the very end. Append:

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

- [ ] **Step 2: Commit**

```bash
git add Prototypes/PROTOTYPE/styles.css
git commit -m "Add Settings shell CSS — sidebar rail + stub card

.settings-shell (2-col grid), .settings-rail (sticky vertical list),
.settings-rail__group (mono micro-label section header),
.settings-rail__item with --active modifier (navy filled), and
.settings-stub (centered coming-soon card). Purely additive."
```

---

## Task 3: Build `settings-stub.html` (placeholder for not-yet-built sections)

Create the shared "Coming soon" stub page. The same file handles all five disabled sidebar items (Questions, Phase Library, Barriers, Roles, Program Info) via a `?section=<name>` query parameter; an inline IIFE looks up the human label and applies the active state to the corresponding sidebar item.

**Files:**
- Create: `Prototypes/PROTOTYPE/settings-stub.html`

- [ ] **Step 1: Create the file**

Create `Prototypes/PROTOTYPE/settings-stub.html` with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Settings — IMPACT Admin</title>

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
        <a href="interns-dashboard.html" class="nav__link">Interns</a>
        <a href="assessments.html" class="nav__link">Assessments</a>
        <a href="self-assessment-results.html" class="nav__link">Self-Assessment Results</a>
        <a href="reports.html" class="nav__link">Reports</a>
        <a href="settings-employers.html" class="nav__link nav__link--active">Settings</a>
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
        <span class="micro-label" id="stubCrumb">ADMIN / SETTINGS / —</span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title" id="stubTitle">SETTINGS.</h1>
          <p class="page-head__sub">
            Pick a section from the sidebar to manage program-wide settings.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- SHELL -->
  <section class="container">
    <div class="settings-shell">

      <aside class="settings-rail" id="settingsRail">
        <span class="settings-rail__group">Settings</span>
        <a class="settings-rail__item" href="settings-employers.html" data-section="employers">Employers</a>
        <a class="settings-rail__item" href="settings-stub.html?section=questions" data-section="questions">Questions</a>
        <a class="settings-rail__item" href="settings-stub.html?section=phases" data-section="phases">Phase Library</a>
        <a class="settings-rail__item" href="settings-stub.html?section=barriers" data-section="barriers">Barriers</a>
        <a class="settings-rail__item" href="settings-stub.html?section=roles" data-section="roles">Roles</a>
        <a class="settings-rail__item" href="settings-stub.html?section=program-info" data-section="program-info">Program Info</a>
      </aside>

      <main>
        <div class="settings-stub">
          <span class="micro-label" id="stubLabel">COMING SOON</span>
          <h2 style="font-family: var(--font-display); font-size: 28px; margin: 16px 0 12px;" id="stubHeader">This section is coming soon.</h2>
          <p style="color: var(--muted); margin: 0;" id="stubBody">
            We're working on this part of Settings. Check back in a future update.
          </p>
        </div>
      </main>

    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="container footer__row">
      <a href="index.html" class="wordmark" aria-label="IMPACT — Expand Your Opportunities">
        <img src="logo.png" alt="IMPACT — Expand Your Opportunities" class="wordmark__img" />
      </a>
      <div class="footer__links">
        <a href="settings-employers.html">Settings</a>
        <a href="interns-dashboard.html">Interns</a>
      </div>
      <div class="footer__meta">&copy; 2026 IMPACT / Indiana</div>
    </div>
  </footer>

  <script src="app.js"></script>
  <script>
    (function () {
      var LABELS = {
        questions:     'Questions',
        phases:        'Phase Library',
        barriers:      'Barriers',
        roles:         'Roles',
        'program-info':'Program Info'
      };
      var section = IMPACT.qs('section') || '';
      var label = LABELS[section] || 'Settings';

      // Apply active state to the matching sidebar item
      var items = document.querySelectorAll('.settings-rail__item');
      items.forEach(function (a) {
        if (a.dataset.section === section) {
          a.classList.add('settings-rail__item--active');
        } else {
          a.classList.remove('settings-rail__item--active');
        }
      });

      // Header text
      var crumb = document.getElementById('stubCrumb');
      var title = document.getElementById('stubTitle');
      var header = document.getElementById('stubHeader');
      if (crumb) crumb.textContent = 'ADMIN / SETTINGS / ' + label.toUpperCase();
      if (title) title.textContent = label.toUpperCase() + '.';
      if (header) header.textContent = label + ' is coming soon.';
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Manual verification**

Open `Prototypes/PROTOTYPE/settings-stub.html?section=questions` in a browser. Confirm:
- Top nav shows the admin links with **Settings** active.
- Sidebar shows 6 items; **Questions** is highlighted (navy background, white text).
- Page-head reads `ADMIN / SETTINGS / QUESTIONS` and the title is `QUESTIONS.`
- The center card shows "Questions is coming soon." with the descriptive sub-paragraph.

Then try `?section=phases`, `?section=barriers`, `?section=roles`, `?section=program-info` — each should highlight the matching item and update the header.

Then try `?section=garbage` (unknown) — falls back to `Settings.` heading and no sidebar item is active.

Then try the bare `settings-stub.html` (no query) — also falls back.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-stub.html
git commit -m "Add settings-stub.html — shared placeholder for not-yet-built sections

Single file handles all 5 disabled sidebar items (Questions, Phase
Library, Barriers, Roles, Program Info) via ?section=<name>. Inline
IIFE applies the active state to the corresponding sidebar item and
sets the breadcrumb / title / coming-soon header from a hardcoded
label map. Unknown sections fall back to a generic Settings heading."
```

---

## Task 4: Build `settings-employers.html` (Employers list — Settings landing)

Create the Employers list page. This is the Settings landing target — clicking the Settings nav tab on any admin page lands here. Renders six employer rows from `IMPACT.EMPLOYERS`, each clickable to its detail page. Top-right `+ New Employer` button.

**Files:**
- Create: `Prototypes/PROTOTYPE/settings-employers.html`

- [ ] **Step 1: Create the file**

Create `Prototypes/PROTOTYPE/settings-employers.html` with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Employers — Settings — IMPACT Admin</title>

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
        <a href="interns-dashboard.html" class="nav__link">Interns</a>
        <a href="assessments.html" class="nav__link">Assessments</a>
        <a href="self-assessment-results.html" class="nav__link">Self-Assessment Results</a>
        <a href="reports.html" class="nav__link">Reports</a>
        <a href="settings-employers.html" class="nav__link nav__link--active">Settings</a>
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
        <span class="micro-label">ADMIN / SETTINGS / EMPLOYERS</span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title">EMPLOYERS.</h1>
          <p class="page-head__sub">
            Program partners and the cohorts running under them.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- SHELL -->
  <section class="container">
    <div class="settings-shell">

      <aside class="settings-rail">
        <span class="settings-rail__group">Settings</span>
        <a class="settings-rail__item settings-rail__item--active" href="settings-employers.html">Employers</a>
        <a class="settings-rail__item" href="settings-stub.html?section=questions">Questions</a>
        <a class="settings-rail__item" href="settings-stub.html?section=phases">Phase Library</a>
        <a class="settings-rail__item" href="settings-stub.html?section=barriers">Barriers</a>
        <a class="settings-rail__item" href="settings-stub.html?section=roles">Roles</a>
        <a class="settings-rail__item" href="settings-stub.html?section=program-info">Program Info</a>
      </aside>

      <main>
        <div class="detail-header" style="margin-top: 0;">
          <h2 class="detail-header__title">Employers</h2>
          <a href="settings-employer-form.html" class="btn btn--primary">+ New Employer</a>
        </div>

        <table class="assessments" id="employerTable">
          <thead>
            <tr>
              <th style="width: 30%;">Name</th>
              <th style="width: 25%;">Contact</th>
              <th style="width: 30%;">Email</th>
              <th style="width: 15%;">Cohorts</th>
            </tr>
          </thead>
          <tbody id="employerTbody"></tbody>
        </table>
      </main>

    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="container footer__row">
      <a href="index.html" class="wordmark" aria-label="IMPACT — Expand Your Opportunities">
        <img src="logo.png" alt="IMPACT — Expand Your Opportunities" class="wordmark__img" />
      </a>
      <div class="footer__links">
        <a href="settings-employers.html">Settings</a>
        <a href="interns-dashboard.html">Interns</a>
      </div>
      <div class="footer__meta">&copy; 2026 IMPACT / Indiana</div>
    </div>
  </footer>

  <script src="app.js"></script>
  <script>
    (function () {
      var tbody = document.getElementById('employerTbody');
      tbody.innerHTML = IMPACT.EMPLOYERS.map(function (e) {
        var cohortCount = IMPACT.cohortsForEmployer(e.id).length;
        return '<tr data-id="' + e.id + '" style="cursor:pointer;">' +
          '<td><div class="col-name"><span class="name-initial">' +
            e.name.slice(0, 2).toUpperCase() + '</span>' + e.name + '</div></td>' +
          '<td>' + (e.contactName || '—') + '</td>' +
          '<td>' + (e.contactEmail || '—') + '</td>' +
          '<td><span class="col-phase">' + cohortCount + '</span></td>' +
          '</tr>';
      }).join('');

      tbody.addEventListener('click', function (ev) {
        var row = ev.target.closest('tr[data-id]');
        if (!row) return;
        location.href = 'settings-employer.html?id=' + row.dataset.id;
      });
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Manual verification**

Open `Prototypes/PROTOTYPE/settings-employers.html` in a browser. Confirm:
- Admin nav shows **Settings** active.
- Sidebar rail with 6 items; **Employers** is active.
- Page-head reads `ADMIN / SETTINGS / EMPLOYERS` / `EMPLOYERS.`
- Detail-header has title "Employers" + `+ New Employer` button.
- Table shows 6 rows: Eskenazi Health, Indy Tech Trades, Habitat Indianapolis, Elevate Ventures, Geminus Behavioral, HealthLink Indiana — each with contact name, email, and a cohort count of 1.
- Click any row → navigates to `settings-employer.html?id=<id>` (will 404 until Task 5 lands; that's expected for now).

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-employers.html
git commit -m "Add settings-employers.html — Settings landing + Employers list

Renders 6 employer rows from IMPACT.EMPLOYERS with contact name,
email, and live cohort count via cohortsForEmployer. Top-right
+ New Employer CTA links to the unified form (Task 6). Row click
navigates to settings-employer.html?id=<id> (Task 5)."
```

---

## Task 5: Build `settings-employer.html` (Employer detail view)

Create the Employer detail page. Reads `?id=<employerId>` and renders the employer's contact info plus a list of their cohorts. Edit and Delete actions on the employer; `+ New Cohort` button under the Cohorts list (links to `cohort-new.html?employerId=<id>`). Missing/unknown id → danger toast + 1500ms redirect to `settings-employers.html`.

**Files:**
- Create: `Prototypes/PROTOTYPE/settings-employer.html`

- [ ] **Step 1: Create the file**

Create `Prototypes/PROTOTYPE/settings-employer.html` with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Employer — Settings — IMPACT Admin</title>

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
        <a href="interns-dashboard.html" class="nav__link">Interns</a>
        <a href="assessments.html" class="nav__link">Assessments</a>
        <a href="self-assessment-results.html" class="nav__link">Self-Assessment Results</a>
        <a href="reports.html" class="nav__link">Reports</a>
        <a href="settings-employers.html" class="nav__link nav__link--active">Settings</a>
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
          <a href="settings-employers.html" style="color:inherit; text-decoration:none;">ADMIN / SETTINGS / EMPLOYERS</a> / <span data-field="title-name">—</span>
        </span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title"><span data-field="name">—</span>.</h1>
          <p class="page-head__sub">
            Contact and cohort overview.
          </p>
        </div>
      </div>

      <!-- META STRIP -->
      <div class="meta-strip">
        <div class="meta-strip__item">
          <span class="meta-strip__label">Contact Name</span>
          <span class="meta-strip__value" data-field="contactName">—</span>
        </div>
        <div class="meta-strip__item">
          <span class="meta-strip__label">Email</span>
          <span class="meta-strip__value" data-field="contactEmail">—</span>
        </div>
        <div class="meta-strip__item">
          <span class="meta-strip__label">Phone</span>
          <span class="meta-strip__value mono" data-field="phone">—</span>
        </div>
      </div>
    </div>
  </section>

  <!-- SHELL -->
  <section class="container">
    <div class="settings-shell">

      <aside class="settings-rail">
        <span class="settings-rail__group">Settings</span>
        <a class="settings-rail__item settings-rail__item--active" href="settings-employers.html">Employers</a>
        <a class="settings-rail__item" href="settings-stub.html?section=questions">Questions</a>
        <a class="settings-rail__item" href="settings-stub.html?section=phases">Phase Library</a>
        <a class="settings-rail__item" href="settings-stub.html?section=barriers">Barriers</a>
        <a class="settings-rail__item" href="settings-stub.html?section=roles">Roles</a>
        <a class="settings-rail__item" href="settings-stub.html?section=program-info">Program Info</a>
      </aside>

      <main>
        <!-- Employer info -->
        <article class="prose-card">
          <span class="prose-card__label">Employer Notes</span>
          <p class="prose-card__body" data-field="notes">—</p>
        </article>

        <div class="detail-actions" style="margin-top: 16px;">
          <a href="#" id="editEmployerLink" class="btn btn--outline">Edit Employer</a>
          <button type="button" class="btn btn--danger" data-open="deleteEmployerModal">Delete Employer</button>
        </div>

        <!-- Cohorts -->
        <div class="detail-header" style="margin-top: 48px;">
          <h2 class="detail-header__title">Cohorts</h2>
          <a href="#" id="newCohortLink" class="btn btn--primary">+ New Cohort</a>
        </div>

        <table class="assessments" id="cohortsTable" style="margin-bottom: 40px;">
          <thead>
            <tr>
              <th style="width: 35%;">Cohort</th>
              <th style="width: 25%;">Role</th>
              <th style="width: 20%;">Start</th>
              <th style="width: 20%;">Members</th>
            </tr>
          </thead>
          <tbody id="cohortsTbody"></tbody>
        </table>
      </main>

    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="container footer__row">
      <a href="index.html" class="wordmark" aria-label="IMPACT — Expand Your Opportunities">
        <img src="logo.png" alt="IMPACT — Expand Your Opportunities" class="wordmark__img" />
      </a>
      <div class="footer__links">
        <a href="settings-employers.html">Settings</a>
        <a href="interns-dashboard.html">Interns</a>
      </div>
      <div class="footer__meta">&copy; 2026 IMPACT / Indiana</div>
    </div>
  </footer>

  <!-- MODAL: Delete Employer -->
  <div class="modal" id="deleteEmployerModal" role="dialog" aria-modal="true" hidden>
    <div class="modal__overlay" data-close></div>
    <div class="modal__card modal__card--danger">
      <span class="modal__label">DELETE EMPLOYER</span>
      <h3 class="modal__title">Delete this employer?</h3>
      <p class="modal__body" id="deleteWarning">
        This employer will be removed from the program. This cannot be undone.
      </p>
      <div class="modal__actions">
        <button type="button" class="btn btn--outline" data-close>Cancel</button>
        <button type="button" class="btn btn--danger" data-action="confirm-delete">Delete Permanently</button>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
  <script>
    (function () {
      // Modal close (overlay + Escape + Cancel button)
      document.querySelectorAll('[data-open]').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          var m = document.getElementById(el.dataset.open);
          if (m) m.hidden = false;
        });
      });
      document.addEventListener('click', function (e) {
        var c = e.target.closest('[data-close]');
        if (c) { var m = c.closest('.modal'); if (m) m.hidden = true; }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal:not([hidden])').forEach(function (m) { m.hidden = true; });
        }
      });

      var id = IMPACT.qs('id');
      var emp = id ? IMPACT.employerById(id) : null;
      if (!emp) {
        IMPACT.toast({ kind: 'danger', label: 'NO EMPLOYER', message: 'Employer not found.' });
        setTimeout(function () { location.href = 'settings-employers.html'; }, 1500);
        return;
      }

      // Hydrate identity / meta-strip / notes
      IMPACT.fillText('[data-field="title-name"]', emp.name.toUpperCase());
      IMPACT.fillText('[data-field="name"]',         emp.name);
      IMPACT.fillText('[data-field="contactName"]',  emp.contactName || '—');
      IMPACT.fillText('[data-field="contactEmail"]', emp.contactEmail || '—');
      IMPACT.fillText('[data-field="phone"]',        emp.phone || '—');
      IMPACT.fillText('[data-field="notes"]',        emp.notes || 'No notes recorded.');

      // Wire Edit + New Cohort links
      document.getElementById('editEmployerLink').setAttribute('href', 'settings-employer-form.html?id=' + emp.id);
      document.getElementById('newCohortLink').setAttribute('href', 'cohort-new.html?employerId=' + emp.id);

      // Render cohorts list
      var cohorts = IMPACT.cohortsForEmployer(emp.id);
      var tbody = document.getElementById('cohortsTbody');
      if (cohorts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No cohorts yet for this employer.</td></tr>';
      } else {
        tbody.innerHTML = cohorts.map(function (c) {
          return '<tr data-id="' + c.id + '" style="cursor:pointer;">' +
            '<td><div class="col-name"><span class="name-initial">' +
              c.name.slice(0, 2).toUpperCase() + '</span>' + c.name + '</div></td>' +
            '<td>' + (c.role || '—') + '</td>' +
            '<td class="col-date">' + (c.start || '—') + '</td>' +
            '<td><span class="col-phase">' + (c.members || 0) + '</span></td>' +
            '</tr>';
        }).join('');
        tbody.addEventListener('click', function (ev) {
          var row = ev.target.closest('tr[data-id]');
          if (!row) return;
          location.href = 'cohort-detail.html?id=' + row.dataset.id;
        });
      }

      // Personalize delete-warning copy
      if (cohorts.length > 0) {
        var warn = document.getElementById('deleteWarning');
        if (warn) {
          warn.textContent = 'This employer has ' + cohorts.length +
            ' cohort(s). Cohorts will need to be reassigned or deleted before the employer can be removed. ' +
            'In this prototype, the delete still completes (mock data only).';
        }
      }

      // Confirm-delete handler
      document.querySelector('[data-action="confirm-delete"]').addEventListener('click', function () {
        IMPACT.toast({ kind: 'danger', label: 'DELETED', message: 'Employer removed.' });
        setTimeout(function () { location.href = 'settings-employers.html'; }, 700);
      });
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Manual verification**

Open `Prototypes/PROTOTYPE/settings-employer.html?id=eskenazi-health` in a browser. Confirm:
- Page-head meta-strip shows Maya Reyes / maya.reyes@eskenazihealth.edu / (317) 555-0148.
- Employer Notes card reads "Primary-care MA placements across 4 clinics. Quarterly cohorts."
- `Edit Employer` button links to `settings-employer-form.html?id=eskenazi-health` (will 404 until Task 6).
- `Delete Employer` opens the confirm modal. Modal body mentions "1 cohort(s)" warning. Click Cancel — modal closes.
- Cohorts table shows ONE row: `MA — 2026` / Medical Assistant / 04.01.2026 / 15.
- Click the cohort row → navigates to `cohort-detail.html?id=eskenazi-2026`.
- `+ New Cohort` button links to `cohort-new.html?employerId=eskenazi-health`.

Open `settings-employer.html` (no `?id=`) → expect danger toast `NO EMPLOYER — Employer not found.` and redirect to `settings-employers.html` after ~1500ms.

Open `settings-employer.html?id=garbage` → same fallback.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-employer.html
git commit -m "Add settings-employer.html — Employer detail view

Reads ?id=<employerId>. Page-head meta-strip with contact name/email/
phone. Notes card. Edit + Delete actions. Cohorts list under the
employer with + New Cohort button (links to cohort-new.html?employerId=).
Row click on a cohort navigates to cohort-detail.html. Missing or
unknown id triggers danger toast + 1500ms redirect to the list."
```

---

## Task 6: Build `settings-employer-form.html` (unified Employer new + edit form)

Create the unified Employer form. `?id=<id>` puts it in edit mode (pre-fills fields, breadcrumb says EDIT, save toast says UPDATED); no param = new mode (blank, breadcrumb says NEW, save toast says SAVED). Email validates with a simple regex; phone is unvalidated; notes is a textarea. Save → toast → 700ms redirect to `settings-employers.html`. Cancel returns there too.

**Files:**
- Create: `Prototypes/PROTOTYPE/settings-employer-form.html`

- [ ] **Step 1: Create the file**

Create `Prototypes/PROTOTYPE/settings-employer-form.html` with this content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Employer Form — Settings — IMPACT Admin</title>

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
        <a href="interns-dashboard.html" class="nav__link">Interns</a>
        <a href="assessments.html" class="nav__link">Assessments</a>
        <a href="self-assessment-results.html" class="nav__link">Self-Assessment Results</a>
        <a href="reports.html" class="nav__link">Reports</a>
        <a href="settings-employers.html" class="nav__link nav__link--active">Settings</a>
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
          <a href="settings-employers.html" style="color:inherit; text-decoration:none;">ADMIN / SETTINGS / EMPLOYERS</a> / <span id="modeCrumb">NEW</span>
        </span>
      </div>
      <div class="page-head__row">
        <div>
          <h1 class="page-head__title" id="modeTitle">NEW EMPLOYER.</h1>
          <p class="page-head__sub">
            Capture the program's point of contact at the placement organization.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- SHELL -->
  <section class="container">
    <div class="settings-shell">

      <aside class="settings-rail">
        <span class="settings-rail__group">Settings</span>
        <a class="settings-rail__item settings-rail__item--active" href="settings-employers.html">Employers</a>
        <a class="settings-rail__item" href="settings-stub.html?section=questions">Questions</a>
        <a class="settings-rail__item" href="settings-stub.html?section=phases">Phase Library</a>
        <a class="settings-rail__item" href="settings-stub.html?section=barriers">Barriers</a>
        <a class="settings-rail__item" href="settings-stub.html?section=roles">Roles</a>
        <a class="settings-rail__item" href="settings-stub.html?section=program-info">Program Info</a>
      </aside>

      <main>
        <article class="identity-card">
          <div class="identity-card__head">
            <h2 class="identity-card__title">Employer Record</h2>
            <span class="micro-label" id="formSubnote">NEW EMPLOYER · CAPTURE CONTACT INFO</span>
          </div>

          <div class="id-grid id-grid--4">
            <div class="field" style="grid-column: span 2;">
              <label for="emp-name">Name</label>
              <input class="input" type="text" id="emp-name" placeholder="e.g. Eskenazi Health" />
            </div>
            <div class="field">
              <label for="emp-contact">Contact Name</label>
              <input class="input" type="text" id="emp-contact" placeholder="e.g. Maya Reyes" />
            </div>
            <div class="field">
              <label for="emp-phone">Phone</label>
              <input class="input" type="text" id="emp-phone" placeholder="(317) 555-0100" />
            </div>
            <div class="field" style="grid-column: span 2;">
              <label for="emp-email">Contact Email</label>
              <input class="input" type="email" id="emp-email" placeholder="contact@example.com" />
            </div>
          </div>

          <div style="padding-top: 22px; margin-top: 22px; border-top: 1px solid var(--rule);">
            <div class="field">
              <label for="emp-notes">Notes</label>
              <textarea class="textarea" id="emp-notes" rows="3" placeholder="Placement specifics, scheduling notes, account caveats…"></textarea>
            </div>
          </div>
        </article>
      </main>

    </div>
  </section>

  <!-- ACTION BAR -->
  <div class="action-bar">
    <div class="action-bar__inner">
      <div class="action-bar__status">
        <span class="mono" style="color: var(--navy);" id="actionLabel">EMPLOYER · NEW</span>
      </div>
      <div class="action-bar__buttons">
        <a href="settings-employers.html" class="btn btn--outline">Cancel</a>
        <button type="button" class="btn btn--primary" data-action="save">
          Save Employer
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
        <a href="settings-employers.html">Settings</a>
        <a href="interns-dashboard.html">Interns</a>
      </div>
      <div class="footer__meta">&copy; 2026 IMPACT / Indiana</div>
    </div>
  </footer>

  <script src="app.js"></script>
  <script>
    (function () {
      var id = IMPACT.qs('id');
      var emp = id ? IMPACT.employerById(id) : null;

      // Edit mode but unknown id → bounce
      if (id && !emp) {
        IMPACT.toast({ kind: 'danger', label: 'NO EMPLOYER', message: 'Employer not found.' });
        setTimeout(function () { location.href = 'settings-employers.html'; }, 1500);
        return;
      }

      var isEdit = !!emp;
      if (isEdit) {
        document.getElementById('modeCrumb').textContent  = 'EDIT';
        document.getElementById('modeTitle').textContent  = 'EDIT EMPLOYER.';
        document.getElementById('formSubnote').textContent = 'EDIT EMPLOYER · UPDATE CONTACT INFO';
        document.getElementById('actionLabel').textContent = 'EMPLOYER · EDIT';
        document.getElementById('emp-name').value    = emp.name || '';
        document.getElementById('emp-contact').value = emp.contactName || '';
        document.getElementById('emp-email').value   = emp.contactEmail || '';
        document.getElementById('emp-phone').value   = emp.phone || '';
        document.getElementById('emp-notes').value   = emp.notes || '';
      }

      document.querySelector('[data-action="save"]').addEventListener('click', function () {
        var ok = IMPACT.validate([
          { selector: '#emp-name',  required: true },
          { selector: '#emp-email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
        ]);
        if (!ok) {
          IMPACT.toast({ kind: 'danger', label: 'CHECK FIELDS', message: 'Please fix the highlighted fields.' });
          return;
        }
        IMPACT.toast({
          kind:    'success',
          label:   isEdit ? 'UPDATED' : 'SAVED',
          message: isEdit ? 'Employer updated.' : 'Employer saved.'
        });
        setTimeout(function () { location.href = 'settings-employers.html'; }, 700);
      });
    })();
  </script>

</body>
</html>
```

- [ ] **Step 2: Manual verification — new mode**

Open `Prototypes/PROTOTYPE/settings-employer-form.html` (no query) in a browser. Confirm:
- Breadcrumb reads `ADMIN / SETTINGS / EMPLOYERS / NEW`. Title is `NEW EMPLOYER.`.
- All five fields are blank.
- Click `Save Employer` immediately → CHECK FIELDS toast and the Name field shows a "Required" error.
- Fill Name = "Test Employer", Email = "not-an-email" → click Save → CHECK FIELDS toast and the email field shows "Invalid email".
- Fix Email to "test@example.com" → click Save → SAVED toast → after ~700ms redirects to `settings-employers.html`. (The new employer does NOT persist across reloads — mock data is hardcoded.)

- [ ] **Step 3: Manual verification — edit mode**

Open `settings-employer-form.html?id=eskenazi-health`. Confirm:
- Breadcrumb reads `… / EMPLOYERS / EDIT`. Title is `EDIT EMPLOYER.`.
- Fields are pre-filled: Name=Eskenazi Health, Contact=Maya Reyes, Email=maya.reyes@eskenazihealth.edu, Phone=(317) 555-0148, Notes filled.
- Click Save → UPDATED toast → redirects to `settings-employers.html`.

Open `settings-employer-form.html?id=garbage` → danger toast + redirect.

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/settings-employer-form.html
git commit -m "Add settings-employer-form.html — unified Employer new + edit form

?id=<id> hydrates edit mode (pre-fills fields, breadcrumb EDIT, toast
UPDATED). No param = new mode (blank fields, breadcrumb NEW, toast
SAVED). Validation: Name required; Email matches simple email regex
when present. Phone unvalidated. Save redirects to settings-employers.
Missing/unknown id in edit mode redirects with a danger toast."
```

---

## Task 7: Add the Settings nav tab to all admin pages

The new Settings tab needs to be inserted into the top nav of every admin page (between Reports and the admin-chip span). Bulk-update via `sed`, then verify no admin page is missed.

**Files:**
- Modify: 14 admin HTML files in `Prototypes/PROTOTYPE/`

The pages that have an admin nav: `admin.html`, `assessments.html`, `cohort-detail.html`, `cohort-edit.html`, `cohort-new.html`, `cohorts.html`, `competency-detail.html`, `competency-edit.html`, `competency-new.html`, `exit-employer-survey.html`, `intern-record.html`, `interns-dashboard.html`, `reports.html`, `self-assessment-detail.html`, `self-assessment-results.html`. (`cohorts.html` is in the list because it still exists at this point — Task 10 deletes it.)

- [ ] **Step 1: Bulk-insert the Settings nav link**

Run this `sed` script. It finds the existing Reports nav-link line and inserts the Settings link immediately after it. The `\` line continuation is bash-specific; this command must be run in bash (git-bash on Windows is fine).

```bash
cd "Prototypes/PROTOTYPE" && for f in admin.html assessments.html cohort-detail.html cohort-edit.html cohort-new.html cohorts.html competency-detail.html competency-edit.html competency-new.html exit-employer-survey.html intern-record.html interns-dashboard.html reports.html self-assessment-detail.html self-assessment-results.html; do
  if grep -q '<a href="settings-employers.html"' "$f"; then continue; fi
  sed -i 's|<a href="reports.html" class="nav__link">Reports</a>|<a href="reports.html" class="nav__link">Reports</a>\n        <a href="settings-employers.html" class="nav__link">Settings</a>|' "$f"
done && echo "DONE"
```

The `if grep -q ... ; then continue; fi` guards against double-insertion if the script is run twice.

This pattern matches the inactive Reports link. There is also one variant where Reports is the active page (`reports.html` itself): handle that case in the next step.

- [ ] **Step 2: Patch the Reports-active variant**

`reports.html` has `<a href="reports.html" class="nav__link nav__link--active">Reports</a>`, which the previous sed didn't match. Run:

```bash
cd "Prototypes/PROTOTYPE" && sed -i 's|<a href="reports.html" class="nav__link nav__link--active">Reports</a>|<a href="reports.html" class="nav__link nav__link--active">Reports</a>\n        <a href="settings-employers.html" class="nav__link">Settings</a>|' reports.html && echo "DONE"
```

If reports.html already had Settings inserted by the previous step, this no-op (the search target won't match). Otherwise it inserts.

- [ ] **Step 3: Verify all 15 pages now reference Settings in the nav**

Run from the repo root:

```bash
cd "Prototypes/PROTOTYPE" && grep -L 'href="settings-employers.html" class="nav__link"' admin.html assessments.html cohort-detail.html cohort-edit.html cohort-new.html cohorts.html competency-detail.html competency-edit.html competency-new.html exit-employer-survey.html intern-record.html interns-dashboard.html reports.html self-assessment-detail.html self-assessment-results.html
```

Expected output: nothing (every file matches; `grep -L` lists files that DON'T contain the pattern). If any filename appears, manually inspect that file's nav block and add the Settings link by hand before continuing.

- [ ] **Step 4: Manual verification**

Open `admin.html` in a browser. Confirm the top nav now shows: `Home · Interns · Assessments · Self-Assessment Results · Reports · Settings · admin-chip`. Click **Settings** → lands on `settings-employers.html` (Task 4). Sidebar's Employers item is active.

Click around: open any other admin page (e.g., `interns-dashboard.html`) and confirm Settings is in the nav there too.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE
git commit -m "Add Settings tab to admin nav on all 15 admin pages

Bulk-inserts Settings link between Reports and admin-chip. Active
state lives only on the four settings-* pages (already in their nav
markup); other admin pages link to Settings as a non-active item."
```

---

## Task 8: Replace the free-text employer field on `cohort-new.html` and `cohort-edit.html` with an Employer dropdown

Both cohort forms currently have a `<input id="co-emp">` text input for employer. Replace with a `<select>` populated from `IMPACT.EMPLOYERS`. On `cohort-new.html`, the IIFE reads `?employerId=<id>` and pre-selects the matching option. On `cohort-edit.html`, the existing hydration reads the current cohort's `employerId` and pre-selects.

**Files:**
- Modify: `Prototypes/PROTOTYPE/cohort-new.html`
- Modify: `Prototypes/PROTOTYPE/cohort-edit.html`

- [ ] **Step 1: Replace the employer field markup on `cohort-new.html`**

Open `Prototypes/PROTOTYPE/cohort-new.html`. Find these lines (around line 77–80):

```html
          <div class="field">
            <label for="co-emp">Employer</label>
            <input class="input" type="text" id="co-emp" placeholder="e.g. Eskenazi Health" />
          </div>
```

Replace with:

```html
          <div class="field">
            <label for="co-emp">Employer</label>
            <select class="select" id="co-emp">
              <option value="">Select employer…</option>
            </select>
          </div>
```

- [ ] **Step 2: Add the IIFE that populates the dropdown + handles `?employerId=` pre-select on `cohort-new.html`**

Find the closing `</body>` tag in `cohort-new.html`. Immediately above `</body>`, locate the existing `<script src="app.js"></script>` (or add one if absent). Add a NEW `<script>` block AFTER `<script src="app.js"></script>` (and before `</body>`):

```html
  <script>
    (function () {
      var sel = document.getElementById('co-emp');
      if (!sel) return;
      // Populate options from EMPLOYERS
      IMPACT.EMPLOYERS.forEach(function (e) {
        var opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.name;
        sel.appendChild(opt);
      });
      // Pre-select if ?employerId= present
      var preselect = IMPACT.qs('employerId');
      if (preselect && IMPACT.employerById(preselect)) {
        sel.value = preselect;
      }
    })();
  </script>
```

If `cohort-new.html` doesn't yet have `<script src="app.js"></script>` somewhere on the page, add that line BEFORE the new IIFE block. (Most admin pages do; verify by Grep.)

- [ ] **Step 3: Verify `cohort-new.html`'s validation logic still works for the new SELECT**

The existing validation rule should already handle `<select>` correctly via `IMPACT.validate`'s "if SELECT and value starts with 'Select'" check. Find the existing validate call in `cohort-new.html` (search for `IMPACT.validate(`). Confirm it includes:

```js
{selector: '#co-emp', required: true}
```

If the existing rule has `required: true` for `#co-emp`, no change needed. The new `<option value="">Select employer…</option>` first option satisfies the placeholder check (validate.js treats the placeholder as empty when the value is empty string).

If `#co-emp` is NOT in the existing validate spec, add it:

```js
{selector: '#co-emp', required: true},
```

- [ ] **Step 4: Replace the employer field markup on `cohort-edit.html`**

Open `Prototypes/PROTOTYPE/cohort-edit.html`. Find the same employer-field block (a similar `<input id="co-emp">` block). Replace with the same `<select>` markup from Step 1.

- [ ] **Step 5: Add a hydration IIFE for `cohort-edit.html`**

Find the existing `<script src="app.js"></script>` line near the bottom of `cohort-edit.html`. Add a new `<script>` block AFTER it (and before `</body>`):

```html
  <script>
    (function () {
      var sel = document.getElementById('co-emp');
      if (!sel) return;
      // Populate options from EMPLOYERS
      IMPACT.EMPLOYERS.forEach(function (e) {
        var opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.name;
        sel.appendChild(opt);
      });
      // Pre-select from the current cohort's employerId
      var id = IMPACT.qs('id');
      var cohort = id ? IMPACT.cohortById(id) : null;
      if (cohort) {
        sel.value = cohort.employerId;
      }
    })();
  </script>
```

- [ ] **Step 6: Manual verification — cohort-new with no query**

Open `Prototypes/PROTOTYPE/cohort-new.html` in a browser. Confirm:
- Employer field is now a dropdown with "Select employer…" + the 6 employer names.
- Submitting with the placeholder selected fires a "Required" error on the Employer field.

- [ ] **Step 7: Manual verification — cohort-new with `?employerId=`**

Open `Prototypes/PROTOTYPE/cohort-new.html?employerId=eskenazi-health`. Confirm the Employer dropdown is pre-selected to "Eskenazi Health".

- [ ] **Step 8: Manual verification — cohort-edit**

Open `Prototypes/PROTOTYPE/cohort-edit.html?id=eskenazi-2026` (assuming this URL works in the existing prototype — adjust if needed). Confirm the Employer dropdown is pre-selected to "Eskenazi Health".

- [ ] **Step 9: Commit**

```bash
git add Prototypes/PROTOTYPE/cohort-new.html Prototypes/PROTOTYPE/cohort-edit.html
git commit -m "Replace cohort employer text input with Employer dropdown

cohort-new.html and cohort-edit.html now render a SELECT populated
from IMPACT.EMPLOYERS (id as option value). cohort-new.html reads
?employerId=<id> to pre-select when launched from the new Employer
detail page. cohort-edit.html pre-selects the current cohort's
employerId. Validation already treats the placeholder option as empty."
```

---

## Task 9: Make employer name a clickable link on `exit-employer-survey.html`

`hydrateCohortDetail` and `hydrateInternRecord` were updated in Task 1 to render the employer cell as a clickable link. The `exit-employer-survey.html` page sets its meta-strip via an inline IIFE (not via the hydrate helpers), so it needs a parallel update here.

**Files:**
- Modify: `Prototypes/PROTOTYPE/exit-employer-survey.html`

- [ ] **Step 1: Replace the employer set-meta call in the IIFE**

Open `Prototypes/PROTOTYPE/exit-employer-survey.html`. Find the line in the inline IIFE (around line 277):

```js
      setMeta('employer',    cohort.employer);
```

Replace with:

```js
      // Employer cell becomes a link to the new Settings detail page.
      var employer = IMPACT.employerById(cohort.employerId);
      var employerEl = document.querySelector('[data-meta="employer"]');
      if (employerEl && employer) {
        employerEl.innerHTML = '<a href="settings-employer.html?id=' + employer.id +
          '" style="color:inherit;">' + employer.name + '</a>';
      } else if (employerEl) {
        employerEl.textContent = '—';
      }
```

The other `setMeta(...)` calls (participant, position, start, end) are unchanged.

- [ ] **Step 2: Manual verification**

Open `Prototypes/PROTOTYPE/exit-employer-survey.html?internId=evans` in a browser. Confirm:
- Meta-strip Employer cell shows "Elevate Ventures" as a hyperlink.
- Click it → navigates to `settings-employer.html?id=elevate-ventures`.
- The other meta-strip cells (Participant, Position, Start, End) still render correctly.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/exit-employer-survey.html
git commit -m "Make employer name a link on exit-employer-survey meta-strip

Replaces the static cohort.employer text with a lookup via
IMPACT.employerById(cohort.employerId). The cell is rendered as an
<a> linking to settings-employer.html?id=<employerId> using the
existing color:inherit link style."
```

---

## Task 10: Delete `cohorts.html`, remove the Interns/Cohorts sub-nav, clean up inbound links

`cohorts.html` is replaced by `settings-employers.html → drill into employer`. Delete it. The Interns/Cohorts sub-nav at the top of `interns-dashboard.html` is now a one-tab sub-nav (Cohorts has moved out) and should be removed. Find and rewire any remaining inbound links to `cohorts.html` (footers, quick-links).

**Files:**
- Delete: `Prototypes/PROTOTYPE/cohorts.html`
- Modify: `Prototypes/PROTOTYPE/interns-dashboard.html`
- Modify: any other admin page referencing `cohorts.html`

- [ ] **Step 1: Find all inbound links to `cohorts.html`**

Run from the repo root:

```bash
cd "Prototypes/PROTOTYPE" && grep -l 'cohorts\.html' *.html
```

Expected files: `cohorts.html` itself (about to be deleted), and any other admin page that links to it (likely `admin.html` quick-link, footers on a few pages, possibly `interns-dashboard.html`'s sub-nav).

- [ ] **Step 2: Bulk-rewire `href="cohorts.html"` → `href="settings-employers.html"` on all OTHER pages**

```bash
cd "Prototypes/PROTOTYPE" && for f in $(grep -l 'cohorts\.html' *.html); do
  if [ "$f" = "cohorts.html" ]; then continue; fi
  sed -i 's|href="cohorts\.html"|href="settings-employers.html"|g' "$f"
done && echo "DONE"
```

- [ ] **Step 3: Re-label any remaining nav/quick-link/footer text that still says "Cohorts" but now points at `settings-employers.html`**

Some links might say `<a href="cohorts.html">Cohorts</a>` — after Step 2 the href is fixed, but the visible label still says "Cohorts" which now links to the Employers list. Decide per-context:

- **Footer links** that say "Cohorts" → relabel to "Settings" (footers should point at top-level concepts):

```bash
cd "Prototypes/PROTOTYPE" && for f in *.html; do
  if [ "$f" = "cohorts.html" ]; then continue; fi
  sed -i 's|<a href="settings-employers\.html">Cohorts</a>|<a href="settings-employers.html">Settings</a>|g' "$f"
done && echo "DONE"
```

- **`admin.html` quick-link** that says "Cohorts": relabel manually. Open `admin.html` and search for the existing `<a href="settings-employers.html" class="quick-link">Cohorts ...</a>` line. Replace its visible text with `Employers` (since the Settings quick-link is more meaningful pointing at the Employers list, the actual landing). Specifically:

```bash
cd "Prototypes/PROTOTYPE" && sed -i 's|<a href="settings-employers.html" class="quick-link">Cohorts |<a href="settings-employers.html" class="quick-link">Employers |' admin.html && echo "DONE"
```

- [ ] **Step 4: Verify no inbound link to `cohorts.html` remains anywhere except `cohorts.html` itself**

```bash
cd "Prototypes/PROTOTYPE" && grep -l 'cohorts\.html' *.html
```

Expected output: only `cohorts.html` (which is about to be deleted in the next step).

- [ ] **Step 5: Remove the Interns/Cohorts sub-nav from `interns-dashboard.html`**

Open `Prototypes/PROTOTYPE/interns-dashboard.html`. Find this block (around lines 58–62):

```html
      <!-- SUB-NAV -->
      <div class="subnav">
        <a href="interns-dashboard.html" class="subnav__item subnav__item--active">Interns</a>
        <a href="cohorts.html" class="subnav__item">Cohorts</a>
      </div>
```

Delete all five lines (the `<!-- SUB-NAV -->` comment + the `<div class="subnav">` block + closing `</div>`).

Verify the block is gone:

```bash
grep -c 'subnav' Prototypes/PROTOTYPE/interns-dashboard.html
```

Expected: `0`.

- [ ] **Step 6: Delete `cohorts.html`**

```bash
git rm Prototypes/PROTOTYPE/cohorts.html
```

- [ ] **Step 7: Manual verification**

Open `Prototypes/PROTOTYPE/interns-dashboard.html` in a browser. Confirm there's no Interns/Cohorts sub-nav at the top — just the standard page-head and the interns table.

Open `Prototypes/PROTOTYPE/admin.html`. Confirm:
- Top nav shows Settings as before.
- Quick Links section shows "Employers" (relabeled from "Cohorts") linking to `settings-employers.html`.

Try visiting `Prototypes/PROTOTYPE/cohorts.html` directly → browser shows file-not-found.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Delete cohorts.html; remove Interns/Cohorts sub-nav; rewire links

cohorts.html replaced by settings-employers.html drill-down.
Interns/Cohorts sub-nav on interns-dashboard.html removed (it would
now have only one tab). admin.html quick-link relabeled Cohorts ->
Employers. Footer 'Cohorts' links across pages relabeled 'Settings'."
```

---

## Task 11: Documentation updates (CLAUDE.md, PRD, App Outline)

Reflect the new IA, data model, page count, and admin nav order in the source-of-truth docs.

**Files:**
- Modify: `CLAUDE.md`
- Modify: `PRD.md`
- Modify: `IMPACT Internship Assessment Portal - App Outline.md`

- [ ] **Step 1: Update `CLAUDE.md` page inventory and nav order**

Open `CLAUDE.md`. Find the line `### Page inventory (23 pages)` and change to:

```markdown
### Page inventory (26 pages)
```

In the **Admin:** subsection, replace the line:

```markdown
- `cohorts.html` — Cohorts list
```

with:

```markdown
- `settings-employers.html` — Settings landing: list of program partner Employers (parent of Cohorts)
- `settings-employer.html` — Per-employer detail: contact info + cohort list under that employer (`?id=<employerId>` required)
- `settings-employer-form.html` — Unified Employer new+edit form (`?id=<id>` for edit; absent for new)
- `settings-stub.html` — Shared placeholder for not-yet-built Settings sections (`?section=<name>`)
```

In the same Admin subsection, find:

```markdown
- `cohort-new.html` / `cohort-edit.html` / `cohort-detail.html`
```

(Stays as-is — the cohort detail/forms still exist; they're now reached through Settings.)

Find the admin navbar order line:

```markdown
- The admin navbar order is: Home · Interns · Assessments · Self-Assessment Results · Reports · admin-chip. Maintain this order when adding pages.
```

Replace with:

```markdown
- The admin navbar order is: Home · Interns · Assessments · Self-Assessment Results · Reports · Settings · admin-chip. Maintain this order when adding pages.
```

Find the data-model bullet under "Shared module: `app.js`" mentioning `IMPACT.COHORTS`. Replace:

```markdown
- **Mock dataset** — `IMPACT.COHORTS`, `IMPACT.INTERNS`, `IMPACT.COMPETENCY`, `IMPACT.SELF`, `IMPACT.INTERN_BARRIERS` arrays with lookup helpers (`cohortById`, `internById`, etc.)
```

with:

```markdown
- **Mock dataset** — `IMPACT.EMPLOYERS`, `IMPACT.COHORTS`, `IMPACT.INTERNS`, `IMPACT.COMPETENCY`, `IMPACT.SELF`, `IMPACT.INTERN_BARRIERS` arrays with lookup helpers (`employerById`, `cohortById`, `internById`, `cohortsForEmployer`, `employerNameFor`, etc.). Cohorts reference their parent employer via `cohort.employerId`.
```

- [ ] **Step 2: Update `PRD.md`**

Open `PRD.md`. Search for "Screens" or the section 9 reference. Find the screen inventory line that includes "Cohorts" — likely:

```markdown
5. **Interns** (admin) — Interns list, Intern Record (unified new+edit), Cohorts list, Cohort Detail, New/Edit Cohort
```

Replace with:

```markdown
5. **Interns** (admin) — Interns list, Intern Record (unified new+edit)
6. **Settings** (admin) — Employers list, Employer detail (with cohort list inside), Employer new+edit form, Cohort detail/new/edit (reached from inside an employer), placeholder stubs for future sections (Questions, Phase Library, Barriers, Roles, Program Info)
```

(Renumber any subsequent items if present.)

In Section 6 (Data Model), if there's a description of the Cohort entity, add a bullet describing the Employer entity. Search for "Cohort" near a data-model heading. Add immediately above the cohort description:

```markdown
- **Employer** — Program partner organization. Fields: `id`, `name`, `contactName`, `contactEmail`, `phone`, `notes`. One Employer has many Cohorts.
```

If the existing Cohort description mentions an `employer` string field, update to mention `employerId` FK:

Find any "Cohort" + "employer" context (likely a bullet describing cohort fields). Add or update the field list to include "`employerId` — FK to Employer". This is a small targeted edit; use the Read tool to locate the exact wording first if `sed` would be brittle.

- [ ] **Step 3: Update `IMPACT Internship Assessment Portal - App Outline.md`**

Open `IMPACT Internship Assessment Portal - App Outline.md`. Find the section listing admin views. Add a new `# SCREEN: Settings` block at an appropriate location (e.g., after the Assessments screen):

```markdown
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

## VIEW: Employer new+edit form (`settings-employer-form.html`)

ADMIN NAV (Settings active)
PAGE HEAD [breadcrumb · "New Employer." or "Edit Employer." based on ?id=]
SETTINGS SIDEBAR (Employers active)
FORM CARD [Name (required), Contact Name, Phone, Email (regex-validated), Notes]
ACTION BAR [Cancel + Save]

## VIEW: Settings stub (`settings-stub.html?section=<name>`)

ADMIN NAV (Settings active)
PAGE HEAD [breadcrumb shows section · title is section name uppercase]
SETTINGS SIDEBAR (active item matches ?section=)
COMING SOON CARD (centered)
```

- [ ] **Step 4: Manual verification of doc updates**

Open each updated doc in your editor. Confirm:
- `CLAUDE.md` page count reads `26 pages`. Admin section lists the four new settings-* pages and no longer lists `cohorts.html`. Admin navbar-order line includes "Settings".
- `PRD.md` Section 9 has a Settings entry mentioning Employer/Cohort relationship. Section 6 (Data Model) describes the Employer entity.
- `App Outline.md` has the new `# SCREEN: Settings` block with four VIEW sub-sections.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md PRD.md "IMPACT Internship Assessment Portal - App Outline.md"
git commit -m "Update docs for Settings shell + Employers/Cohorts (sub-project A)

CLAUDE.md: page count 23 -> 26; admin section gains 4 settings-* pages
and drops cohorts.html; nav order includes Settings; mock dataset bullet
adds EMPLOYERS and the new helpers. PRD.md: section 9 gains Settings
screen entry; section 6 describes the Employer entity. App Outline:
new SCREEN: Settings block with four VIEW sub-sections."
```

---

## Task 12: End-to-end manual integration test

Walk the full user journey across the new Settings area + the rewired existing pages, in a fresh browser session, to catch any cross-task regressions.

**Files:**
- (None — verification only.)

- [ ] **Step 1: Reset to a fresh state**

Close all browser tabs. Open `Prototypes/PROTOTYPE/admin.html` in a fresh tab.

- [ ] **Step 2: Walk the Settings IA**

Top nav shows `Home · Interns · Assessments · Self-Assessment Results · Reports · Settings · admin-chip`. Click **Settings** → lands on `settings-employers.html`. Six employer rows visible.

Click each disabled sidebar item in turn (Questions, Phase Library, Barriers, Roles, Program Info) — each lands on the stub page with the matching item active and a "Coming soon" card.

Return to the Employers list. Click the **Eskenazi Health** row → lands on `settings-employer.html?id=eskenazi-health`. Meta-strip shows Maya Reyes / maya.reyes@eskenazihealth.edu / (317) 555-0148. Cohorts table shows `MA — 2026` / Medical Assistant / 04.01.2026 / 15.

- [ ] **Step 3: Click into a cohort from inside Employer detail**

From the Eskenazi Health page, click the `MA — 2026` row → lands on `cohort-detail.html?id=eskenazi-2026`. Confirm the cohort meta-strip shows the renamed name "ESKENAZI 2026" or "MA — 2026" (depends on whether `data-field="title-name"` was hardcoded in HTML or set by JS — verify the title reflects the rename) and the **Employer** field is a clickable link reading "Eskenazi Health".

Click the employer link → returns to `settings-employer.html?id=eskenazi-health`.

- [ ] **Step 4: Add a new Employer**

From `settings-employers.html`, click **+ New Employer** → lands on `settings-employer-form.html`. Try empty submit → CHECK FIELDS toast. Fill Name=`Test Co`, Email=`test@example.com` → Save → SAVED toast → redirects to the list.

(Note: the prototype doesn't persist new employers; the list will not show "Test Co" after redirect. This is documented behavior.)

- [ ] **Step 5: Edit an existing Employer**

From `settings-employers.html`, click the Habitat Indianapolis row → click **Edit Employer** → form is pre-filled. Make a minor change (e.g., add a period to Notes). Save → UPDATED toast → redirect.

- [ ] **Step 6: Try the per-employer New Cohort flow**

From any employer detail (e.g., Elevate Ventures), click **+ New Cohort** → lands on `cohort-new.html?employerId=elevate-ventures`. Confirm the Employer dropdown is pre-selected to "Elevate Ventures".

- [ ] **Step 7: Verify intern-record meta-strip employer link**

Open `intern-record.html?id=evans` directly. Scroll to the Internship Details panel (panel 02). Confirm the employer cell shows "Elevate Ventures" as a clickable link → settings-employer page for Elevate Ventures.

- [ ] **Step 8: Verify exit-employer-survey meta-strip employer link**

Open `exit-employer-survey.html?internId=evans`. Confirm meta-strip Employer cell shows "Elevate Ventures" as a clickable link.

- [ ] **Step 9: Verify cohorts.html is gone**

Try `Prototypes/PROTOTYPE/cohorts.html` directly → browser shows file-not-found (or git reports no such file).

- [ ] **Step 10: Verify Interns/Cohorts sub-nav is gone**

Open `interns-dashboard.html` → no sub-nav at the top of the page. Just the standard page-head and the interns table.

- [ ] **Step 11: Final cleanup commit (only if any fixes were made above)**

If steps 1–10 surfaced no issues, skip this step. If you fixed any regression, commit it:

```bash
git add <files>
git commit -m "Settings sub-project A integration fixes — <summary>"
```

---

## Out of scope (deferred to sub-projects B and C)

These are explicitly NOT part of this plan. Do not implement them here.

- Real implementations of the Questions / Phase Library / Barriers / Roles / Program Info sidebar items (they all route to the shared stub).
- Sub-project B: Phase Library, Barriers, Roles, Program Info data and management.
- Sub-project C: Questions library / data-driven forms / versioning / custom question-type builder.
- Soft-delete or undo for employer/cohort deletions.
- Employer logos, employer types, websites, addresses, or any non-listed Employer fields.
- Bulk import of employers or cohorts.
- Search/filter on the employers list.
- User/admin role management.

## Known prototype limitations carried into this plan

- New / edited / deleted employers persist only in the current page session (mock data is hardcoded; refresh restores the original 6).
- Employer delete with active cohorts shows a warning and proceeds anyway (no cascade-clean of orphaned cohorts; mock data is read-only at runtime).
- The Employer dropdown on `cohort-new.html` shows all employers including any that were just deleted in this session (the prototype doesn't track delete state).
- Sidebar "Coming soon" pages have no real content — sub-projects B and C will fill them in.
