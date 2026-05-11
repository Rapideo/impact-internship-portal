# Prototype Enhancements Implementation Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the IMPACT portal prototype from "staged demo" to "feels live" — wire remaining modal actions, drive detail pages from real row data, make filters filter, add the missing admin home + cohort roster, and polish empty states / mobile / validation.

**Architecture:** All changes live inside `Prototypes/PROTOTYPE/`. Introduce one shared JS file (`app.js`) to host cross-page utilities (mock dataset, detail-page loader, filterable-table helper, modal wiring, toast). Individual pages import it once and call tiny bootstraps. Existing CSS token system is untouched; new patterns (toast, empty-state, print rules) are appended to `styles.css`.

**Tech stack:** Pure static HTML + CSS + vanilla JS. No build step, no framework, no test runner. Verification is manual (click-through in the browser). Commits after each task.

**Out of scope (stated in PRD):** employer logins, Midpoint Performance Review, aggregate analytics beyond the stub, notifications.

---

## File map

| File | Role |
|---|---|
| `Prototypes/PROTOTYPE/app.js` | **NEW.** Shared client module: mock dataset, row-click helpers, detail-page loader (`?id=`), filterable-table helper, modal open/close, toast. |
| `Prototypes/PROTOTYPE/styles.css` | Append: toast, empty-state, form-error, print rules. |
| `Prototypes/PROTOTYPE/admin.html` | **NEW.** Admin home dashboard (login lands here). |
| `Prototypes/PROTOTYPE/reports.html` | **NEW.** Reporting stub. |
| `Prototypes/PROTOTYPE/404.html` | **NEW.** Not-found page. |
| `Prototypes/PROTOTYPE/*detail.html`, `*edit.html` | Add `<script src="app.js">` + per-page bootstrap; swap hardcoded intern/cohort data for `data-id`-driven lookup. |
| `Prototypes/PROTOTYPE/*dashboard.html`, `cohorts.html`, `self-assessment-results.html`, `interns-dashboard.html` | Add filter wiring, empty-state rows, row `data-id`. |
| `Prototypes/PROTOTYPE/cohort-new.html` / `cohort-edit.html` | Add Role-specific competency question editor (another dynamic row pattern). |

---

## Phase overview

| Phase | What | Unlocks |
|---|---|---|
| **1. Shared foundation** | `app.js` + toast + mock dataset + modal helper | Every later task depends on these. |
| **2. Data-driven interactions** | `?id=` detail loading + filterable lists | Makes the prototype feel real. |
| **3. Missing flows** | Admin home, Cohort roster, Role-question editor | Fills the PRD gaps that v1 needs. |
| **4. Polish** | Empty states, form validation, mobile audit | Makes the prototype presentable to stakeholders. |
| **5. Nice-to-haves** | Print, 404, reporting stub | Round-out. |

Each task ends with a commit. Phases are natural demo checkpoints.

---

# Phase 1 — Shared foundation

### Task 1.1: Create `app.js` with mock dataset + modal helper

**Files:**
- Create: `Prototypes/PROTOTYPE/app.js`

- [ ] **Step 1: Author `app.js`**

Place at top of `Prototypes/PROTOTYPE/app.js`:

```js
(function (window) {
  // -------- Mock dataset (single source of truth for demo) --------
  const COHORTS = [
    { id: 'eskenazi-2026',   name: 'Eskenazi 2026',    employer: 'Eskenazi Health',      role: 'Medical Assistant',      start: '04.01.2026', end: '09.30.2026', members: 15 },
    { id: 'ttt-2026',        name: 'TTT 2026',         employer: 'Indy Tech Trades',     role: 'Construction Apprentice',start: '04.01.2026', end: '09.30.2026', members: 12 },
    { id: 'habitat-2026',    name: 'Habitat 2026',     employer: 'Habitat Indianapolis', role: 'Community Builder',      start: '04.05.2026', end: '10.05.2026', members: 8  },
    { id: 'elevate-2026',    name: 'Elevate 2026',     employer: 'Elevate Ventures',     role: 'Customer Service',       start: '04.01.2026', end: '08.31.2026', members: 10 },
    { id: 'geminus-2026',    name: 'Geminus 2026',     employer: 'Geminus Behavioral',   role: 'Behavioral Health',      start: '04.05.2026', end: '09.30.2026', members: 6  },
    { id: 'healthlink-2026', name: 'Health Link 2026', employer: 'HealthLink Indiana',   role: 'Clinic Admin',           start: '04.01.2026', end: '09.30.2026', members: 11 },
  ];

  const INTERNS = [
    { id: 'bayer',     last: 'Bayer',     cohortId: 'eskenazi-2026',   zip: '46202', start: '04.14.2026', phase: 'Week 2',    outcome: 'none' },
    { id: 'clark',     last: 'Clark',     cohortId: 'ttt-2026',        zip: '46205', start: '04.12.2026', phase: 'Week 4',    outcome: 'none' },
    { id: 'evans',     last: 'Evans',     cohortId: 'elevate-2026',    zip: '46227', start: '04.09.2026', phase: 'Midpoint',  outcome: '90d'  },
    { id: 'holt',      last: 'Holt',      cohortId: 'geminus-2026',    zip: '46304', start: '04.07.2026', phase: 'Week 4',    outcome: 'none' },
    { id: 'patterson', last: 'Patterson', cohortId: 'eskenazi-2026',   zip: '46208', start: '04.02.2026', phase: 'Final',     outcome: '180d' },
  ];

  const READINESS = [
    { id: 'r-bayer',     internId: 'bayer',     date: '04.14.2026', result: 'pass' },
    { id: 'r-clark',     internId: 'clark',     date: '04.12.2026', result: 'pass' },
    { id: 'r-diaz',      last: 'Diaz',  cohortId: 'habitat-2026',   zip: '46218', date: '04.11.2026', result: 'fail' },
    { id: 'r-evans',     internId: 'evans',     date: '04.09.2026', result: 'pass' },
    { id: 'r-holt',      internId: 'holt',      date: '04.07.2026', result: 'pass' },
    { id: 'r-nguyen',    last: 'Nguyen', cohortId: 'healthlink-2026', zip: '46307', date: '04.04.2026', result: 'fail' },
    { id: 'r-patterson', internId: 'patterson', date: '04.02.2026', result: 'pass' },
  ];

  const COMPETENCY = [
    { id: 'c-bayer-w2',   internId: 'bayer',     phase: 'Week 2', date: '04.15.2026', result: 'pass' },
    { id: 'c-bayer-in',   internId: 'bayer',     phase: 'Intake', date: '04.01.2026', result: 'pass' },
    { id: 'c-clark-w4',   internId: 'clark',     phase: 'Week 4', date: '04.14.2026', result: 'pass' },
    { id: 'c-clark-w2',   internId: 'clark',     phase: 'Week 2', date: '04.02.2026', result: 'fail' },
    { id: 'c-evans-mid',  internId: 'evans',     phase: 'Midpoint', date: '04.10.2026', result: 'pass' },
    { id: 'c-holt-w2',    internId: 'holt',      phase: 'Week 2', date: '04.08.2026', result: 'pass' },
    { id: 'c-nguyen-in',  last: 'Nguyen', cohortId: 'healthlink-2026', zip: '46307', phase: 'Intake', date: '04.05.2026', result: 'fail' },
  ];

  const SELF = [
    { id: 's-bayer',     internId: 'bayer',     submitted: '04.20.2026' },
    { id: 's-clark',     internId: 'clark',     submitted: '04.19.2026' },
    { id: 's-evans',     internId: 'evans',     submitted: '04.18.2026' },
    { id: 's-patterson', internId: 'patterson', submitted: '04.15.2026' },
  ];

  function cohortById(id)  { return COHORTS.find(c => c.id === id); }
  function internById(id)  { return INTERNS.find(i => i.id === id); }
  function cohortNameFor(intern) { return cohortById(intern.cohortId).name; }
  function qs(name) { return new URLSearchParams(location.search).get(name); }

  // -------- Modal helper --------
  function wireModals() {
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
  }

  window.IMPACT = {
    COHORTS, INTERNS, READINESS, COMPETENCY, SELF,
    cohortById, internById, cohortNameFor, qs, wireModals,
  };
})(window);
```

- [ ] **Step 2: Verify module loads**

Add to the bottom of `readiness-detail.html` (temporary smoke check): `<script src="app.js"></script><script>console.log(IMPACT.INTERNS.length);</script>`. Open the page, confirm DevTools console shows `5`. Revert the smoke console.log; keep the `<script src="app.js">` import (it will be replaced by the proper bootstrap in Phase 2).

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js Prototypes/PROTOTYPE/readiness-detail.html
git commit -m "Add shared app.js with mock dataset and modal helper"
```

---

### Task 1.2: Wire modals on remaining admin pages

**Files:**
- Modify: `Prototypes/PROTOTYPE/competency-detail.html`, `competency-edit.html`, `competency-new.html`, `intern-edit.html`, `cohort-detail.html`, `cohort-edit.html`, `cohort-new.html`, `self-assessment-detail.html`

**What:** Each of these pages still has `alert()` placeholders on Delete or direct navigation on Submit/Save. Replace with modal triggers using the same pattern established in `readiness-new.html` / `readiness-edit.html` / `readiness-detail.html`.

- [ ] **Step 1: Add `<script src="app.js"></script>` + `<script>IMPACT.wireModals();</script>` just before `</body>` on each of the 8 files above.**

- [ ] **Step 2: For each page, append the appropriate modal markup inside `<body>` (before the closing `</body>`):**
  - `competency-detail.html`: Delete modal (copy from `readiness-detail.html` block; change body text to reference the competency record; confirm link → `competency-dashboard.html`)
  - `competency-edit.html`: Update + Delete modals (copy from `readiness-edit.html`; confirm → `competency-detail.html`, delete → `competency-dashboard.html`)
  - `competency-new.html`: Submit modal (copy from `readiness-new.html`; confirm → `competency-dashboard.html`)
  - `intern-edit.html`: Update + Delete modals (confirm/delete → `interns-dashboard.html`)
  - `cohort-detail.html`: Delete modal (confirm → `cohorts.html`)
  - `cohort-edit.html`: Update + Delete modals (confirm/delete → `cohorts.html`)
  - `cohort-new.html`: Submit modal (confirm → `cohorts.html`)
  - `self-assessment-detail.html`: Delete modal (confirm → `self-assessment-results.html`)

- [ ] **Step 3: Replace the triggering buttons on each page:**
  - Change `<a href="#" onclick="alert(…)" class="btn btn--danger">Delete …</a>` → `<button type="button" class="btn btn--danger" data-open="deleteModal">Delete …</button>`
  - Change direct-nav Submit/Save buttons → `<button type="button" class="btn btn--primary" data-open="submitModal">…</button>` (or `updateModal` on edit pages)

- [ ] **Step 4: Verify each page**

Open each of the 8 pages, click Delete → modal opens with correct copy; click outside + press Escape → modal closes. Click Save/Submit on edit/new → modal opens; Confirm button navigates. Check DevTools console for no errors.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/
git commit -m "Wire confirmation modals across all Edit/Delete/Submit actions"
```

---

### Task 1.3: Toast notification component

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js` (add `toast()` function)
- Modify: `Prototypes/PROTOTYPE/styles.css` (append toast styles)

- [ ] **Step 1: Append to `styles.css` (after the Modal block):**

```css
/* ---------- Toast notifications ---------- */
.toast-stack {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 300;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}

.toast {
  min-width: 260px;
  max-width: 360px;
  background: #fff;
  border: 1px solid var(--rule);
  border-left: 3px solid var(--navy);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  box-shadow: 0 20px 48px -18px rgba(5, 16, 40, 0.45);
  font-family: var(--font-body);
  font-size: 13.5px;
  color: var(--ink);
  pointer-events: auto;
  animation: toast-in 180ms ease-out;
}

.toast--success { border-left-color: var(--success); }
.toast--danger  { border-left-color: var(--danger); }
.toast--gold    { border-left-color: var(--gold); }

.toast__label {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 4px;
}

@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Append to `app.js` inside the IIFE, before the `window.IMPACT =` assignment:**

```js
  function toast(opts) {
    opts = opts || {};
    var stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    var t = document.createElement('div');
    t.className = 'toast toast--' + (opts.kind || 'info');
    t.innerHTML = '<span class="toast__label">' + (opts.label || 'OK') + '</span>' + (opts.message || '');
    stack.appendChild(t);
    setTimeout(function () { t.remove(); }, opts.duration || 3200);
  }
```

Add `toast` to the `window.IMPACT = {…}` export.

- [ ] **Step 3: Wire toast into confirm-modal flows on Readiness pages as the exemplar**

On `readiness-new.html`, change the Submit modal's primary button from `<a href="dashboard.html">Submit</a>` to a button that shows a toast then navigates:

```html
<button type="button" class="btn btn--primary" onclick="IMPACT.toast({kind:'success', label:'SUBMITTED', message:'Readiness assessment saved.'}); setTimeout(()=>location.href='dashboard.html', 600);">Submit</button>
```

Do the same for Save on `readiness-edit.html` and Delete on `readiness-detail.html` / `readiness-edit.html`.

- [ ] **Step 4: Verify**

From Readiness dashboard, click + New Assessment → Submit → toast appears in bottom-right → page navigates back to dashboard. Try Delete from Edit → toast ("DELETED") → navigate.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js Prototypes/PROTOTYPE/styles.css Prototypes/PROTOTYPE/readiness-*.html
git commit -m "Add toast notifications and wire Readiness submit/save/delete flows"
```

---

### Task 1.4: Wire toasts across remaining admin pages (Competency, Intern, Cohort, Self-Assessment)

**Files:**
- Modify: same 8 admin pages from Task 1.2

**What:** Repeat Task 1.3 Step 3 on each page's modal confirm buttons, using action-appropriate labels (SAVED, DELETED, CREATED).

- [ ] **Step 1: Update modal confirm buttons across the 8 pages to use `IMPACT.toast()` + `setTimeout` navigation pattern**

- [ ] **Step 2: Verify**

On each page, trigger the modal, confirm → toast fires → page navigates. Repeat for each action type.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/
git commit -m "Wire toast notifications across Competency/Intern/Cohort/Self-Assessment flows"
```

---

# Phase 2 — Data-driven interactions

### Task 2.1: `?id=` detail loading — shared helper + wire intern-edit

**Files:**
- Modify: `Prototypes/PROTOTYPE/app.js`, `interns-dashboard.html`, `intern-edit.html`

**What:** Click on Evans's row → `intern-edit.html?id=evans` → page shows Evans's actual data. Same for all 5 interns.

- [ ] **Step 1: Add to `app.js` inside the IIFE:**

```js
  function fillText(sel, value) {
    document.querySelectorAll(sel).forEach(function (el) { el.textContent = value; });
  }
  function hydrateInternEdit() {
    var id = qs('id') || 'evans';
    var intern = internById(id);
    if (!intern) return;
    var cohort = cohortById(intern.cohortId);
    fillText('[data-field="last"]',    intern.last);
    fillText('[data-field="cohort"]',  cohort.name);
    fillText('[data-field="zip"]',     intern.zip);
    fillText('[data-field="start"]',   intern.start);
    var titleEl = document.querySelector('[data-field="status-chip"]');
    if (titleEl) titleEl.textContent = 'INTERN RECORD · ' + intern.last.toUpperCase() + ' / ' + cohort.name.toUpperCase();
    var o90 = document.getElementById('o1-check');
    var o180 = document.getElementById('o2-check');
    if (o90)  o90.checked  = intern.outcome === '90d'  || intern.outcome === '180d';
    if (o180) o180.checked = intern.outcome === '180d';
  }
```

Export `fillText, hydrateInternEdit` on `window.IMPACT`.

- [ ] **Step 2: Modify `intern-edit.html`**

Add `data-field="last"` etc. to the meta-strip values. Add `data-field="status-chip"` to the action-bar mono label. Just before `</body>`, add:

```html
<script src="app.js"></script>
<script>IMPACT.wireModals(); IMPACT.hydrateInternEdit();</script>
```

- [ ] **Step 3: Modify `interns-dashboard.html`**

Add `data-id="<internId>"` to each `<tr>`. Update the row-click handler at the bottom of the file:

```html
<script>
  document.querySelectorAll('tbody tr[data-id]').forEach(function (row) {
    row.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      location.href = 'intern-edit.html?id=' + row.dataset.id;
    });
  });
  document.querySelectorAll('a.action-link[data-id-link]').forEach(function (a) {
    a.href = 'intern-edit.html?id=' + a.closest('tr').dataset.id;
  });
</script>
```

Change each Edit action link to `<a href="intern-edit.html" data-id-link class="action-link">Edit</a>`.

- [ ] **Step 4: Verify**

From Interns, click Clark's row → URL shows `?id=clark` → edit page meta-strip shows Clark / TTT 2026. Try all 5 interns. URL without `?id=` defaults to Evans.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js Prototypes/PROTOTYPE/intern-edit.html Prototypes/PROTOTYPE/interns-dashboard.html
git commit -m "Hydrate intern-edit from row ?id= param"
```

---

### Task 2.2: Extend hydration to readiness-detail, competency-detail, cohort-detail, self-assessment-detail

**Files:**
- Modify: `app.js` (add `hydrateReadinessDetail`, `hydrateCompetencyDetail`, `hydrateCohortDetail`, `hydrateSelfDetail`)
- Modify: the four detail HTML files to add `data-field="…"` attributes and `<script>IMPACT.hydrate…()</script>` boot
- Modify: the four corresponding list HTML files to add `data-id` on `<tr>` and `?id=` on links

**What:** Same pattern as Task 2.1, applied to each detail screen. Each hydration function:
1. Reads `?id=` from URL (falling back to a sensible default)
2. Looks up the record in the shared dataset
3. Sets the page title, breadcrumb, meta-strip fields, and result pill

- [ ] **Step 1: Add four hydration functions to `app.js` (one per detail page)**

Each function follows the pattern of `hydrateInternEdit`. Skim record (intern or cohort), pull cohort name, fill `[data-field]` spans.

- [ ] **Step 2: Modify each detail page**

Add `data-field="…"` attributes on meta-strip values, page title suffix (e.g., `<h1>`), and result pill. Add `<script src="app.js"></script>` + per-page hydrate call.

- [ ] **Step 3: Modify list pages**

For `dashboard.html`, `competency-dashboard.html`, `cohorts.html`, `self-assessment-results.html`: add `data-id="…"` to rows and `?id=` to the row-click handler + View/Edit links.

- [ ] **Step 4: Verify**

From each list, click different rows → detail pages show the right record. Specifically: Clark's readiness detail should show Clark / TTT 2026, not Bayer. Habitat 2026 cohort detail should show Habitat's 8 members (hint: update cohort-detail's meta-strip "Members: 15" to be hydrated from data).

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/
git commit -m "Hydrate all detail pages from row ?id= params"
```

---

### Task 2.3: Live-filterable tables (shared helper)

**Files:**
- Modify: `app.js` (add `wireTableFilter`)
- Modify: each list page to call `IMPACT.wireTableFilter(…)` with that page's filter selectors

**What:** Typing in search input filters rows in real time. Cohort/Phase/Result/Outcome dropdowns filter rows instantly. Table-meta count updates to reflect visible row count.

- [ ] **Step 1: Add to `app.js`:**

```js
  function wireTableFilter(spec) {
    var table = document.querySelector(spec.table);
    if (!table) return;
    var rows = Array.from(table.querySelectorAll('tbody tr[data-id]'));
    var inputs = (spec.inputs || []).map(function (s) { return document.querySelector(s); }).filter(Boolean);
    var countEl = document.querySelector(spec.countEl);
    function apply() {
      var visible = 0;
      rows.forEach(function (row) {
        var match = inputs.every(function (input) {
          var v = input.value.trim().toLowerCase();
          if (!v || v.indexOf('all ') === 0) return true;
          return row.textContent.toLowerCase().indexOf(v) !== -1;
        });
        row.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      if (countEl) countEl.innerHTML = '<strong>' + String(visible).padStart(2, '0') + '</strong>';
    }
    inputs.forEach(function (input) {
      input.addEventListener('input', apply);
      input.addEventListener('change', apply);
    });
    apply();
  }
```

Export on `window.IMPACT`.

- [ ] **Step 2: Wrap the count span in a consistent selector**

On each list page, ensure the count element is `<span class="table-meta__count"><strong class="js-count">07</strong> …</span>`.

- [ ] **Step 3: Wire per page**

On each of the 5 list pages, before `</body>`:

```html
<script src="app.js"></script>
<script>
  IMPACT.wireTableFilter({
    table: '.assessments',
    inputs: ['input[type=search]', '#cohort-filter', '#status-filter' /* + '#phase-filter' on competency */],
    countEl: '.js-count'
  });
</script>
```

- [ ] **Step 4: Verify**

Type "Bayer" in the Readiness search — only Bayer's row remains, count drops to 01. Select "Eskenazi 2026" in the cohort dropdown — only Eskenazi rows. Combine both — only matching rows. Clear all filters → count returns to 07. Repeat on Competency (with Phase filter), Interns, Cohorts, Self-Assessment Results.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/
git commit -m "Add client-side live filtering to all list pages"
```

---

# Phase 3 — Missing flows

### Task 3.1: Admin home page

**Files:**
- Create: `Prototypes/PROTOTYPE/admin.html`
- Modify: `login.html` (redirect after Sign In goes to `admin.html`)
- Modify: the four dashboards' navbars (add "Home" nav link, no `--active`)

**What:** After signing in, admin sees an overview with KPI tiles (active cohorts, interns, pass rate, 90-day outcomes) and shortcut tiles to each section. Purely decorative data pulled from `IMPACT.*` arrays.

- [ ] **Step 1: Create `admin.html`**

Structure:
- Standard admin navbar (new "Home" link, active on this page)
- `.page-head` with breadcrumb "ADMIN / HOME / 2026", title "GOOD MORNING, KORTNEY."
- 4-card KPI row (new class `.kpi-grid` + `.kpi-card`): Active Cohorts (6), Active Interns (5), Readiness Pass Rate (71%), 90-Day Outcomes (2)
- Quick links row of 4 navy pill buttons: Readiness / Competency / Interns / Cohorts (linking to each section's dashboard)
- "Recent activity" section — reuse `.rubric-panel` styling with 3–4 mock event rows like "Bayer passed Readiness · 4h ago", "Evans — 90-day outcome recorded · yesterday"
- Standard footer

- [ ] **Step 2: Append to `styles.css`:**

```css
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin: 32px 0 48px;
}
.kpi-card {
  background: #fff;
  border: 1px solid var(--rule);
  border-radius: var(--radius-md);
  padding: 24px;
  position: relative;
  border-top: 3px solid var(--navy);
}
.kpi-card--gold { border-top-color: var(--gold); }
.kpi-card--cyan { border-top-color: var(--cyan); }
.kpi-card__label { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
.kpi-card__value { font-family: var(--font-display); font-size: 52px; line-height: 1; color: var(--ink); margin: 16px 0 4px; }
.kpi-card__delta { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; color: var(--cyan); }
@media (max-width: 900px) { .kpi-grid { grid-template-columns: 1fr 1fr; } }
```

- [ ] **Step 3: Wire login**

In `login.html`, change the form `onsubmit` to route to `admin.html` instead of `dashboard.html`.

- [ ] **Step 4: Add "Home" nav link to all admin pages**

Inject `<a href="admin.html" class="nav__link">Home</a>` as the first item inside each admin page's `.nav__links` block. Use a Python script to keep it tidy.

- [ ] **Step 5: Verify**

Sign in from login → land on Admin home → click each KPI card/pill link → lands on correct dashboard. Click "Home" from any admin page → returns to admin.html.

- [ ] **Step 6: Commit**

```bash
git add Prototypes/PROTOTYPE/
git commit -m "Add admin home page with KPI overview; route login there"
```

---

### Task 3.2: Cohort Detail — enrolled interns list

**Files:**
- Modify: `Prototypes/PROTOTYPE/cohort-detail.html`
- Modify: `app.js` (add `internsByCohort(cohortId)` helper)

**What:** Below the Phases list, show a table of interns currently in this cohort.

- [ ] **Step 1: Add to `app.js`:**

```js
  function internsByCohort(cohortId) {
    return INTERNS.filter(function (i) { return i.cohortId === cohortId; });
  }
```

Export on `window.IMPACT`.

- [ ] **Step 2: Modify `cohort-detail.html`**

After the phases block, add:

```html
<header class="detail-header">
  <h2 class="detail-header__title">Enrolled Interns</h2>
  <span class="micro-label js-enrolled-count">0 ACTIVE</span>
</header>

<table class="assessments" id="enrolledTable">
  <thead>
    <tr>
      <th style="width: 30%;">Last Name</th>
      <th style="width: 20%;">Zipcode</th>
      <th style="width: 20%;">Start Date</th>
      <th style="width: 30%;">Current Phase</th>
    </tr>
  </thead>
  <tbody></tbody>
</table>
```

And at the bottom of the page:

```html
<script src="app.js"></script>
<script>
  var cohortId = IMPACT.qs('id') || 'eskenazi-2026';
  var rows = IMPACT.internsByCohort(cohortId).map(function (i) {
    return '<tr data-id="' + i.id + '"><td><div class="col-name"><span class="name-initial">' +
           i.last.slice(0,2).toUpperCase() + '</span>' + i.last + '</div></td>' +
           '<td class="col-date">' + i.zip + '</td>' +
           '<td class="col-date">' + i.start + '</td>' +
           '<td><span class="col-phase">' + i.phase + '</span></td></tr>';
  }).join('');
  document.querySelector('#enrolledTable tbody').innerHTML = rows || '<tr><td colspan="4" class="empty-cell">No interns enrolled yet.</td></tr>';
  document.querySelector('.js-enrolled-count').textContent = rows ? (IMPACT.internsByCohort(cohortId).length + ' ACTIVE') : '0 ACTIVE';
  document.querySelectorAll('#enrolledTable tbody tr[data-id]').forEach(function (row) {
    row.addEventListener('click', function () { location.href = 'intern-edit.html?id=' + row.dataset.id; });
  });
  IMPACT.hydrateCohortDetail();
  IMPACT.wireModals();
</script>
```

- [ ] **Step 3: Append empty-cell style to `styles.css`** (used later in Phase 4 too):

```css
.empty-cell {
  text-align: center;
  padding: 36px 12px;
  color: var(--muted);
  font-style: italic;
}
```

- [ ] **Step 4: Verify**

Open cohort detail for Eskenazi 2026 → enrolled interns section shows Bayer + Patterson. Open Habitat 2026 → empty state message. Click a row → lands on that intern's edit page.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/cohort-detail.html Prototypes/PROTOTYPE/app.js Prototypes/PROTOTYPE/styles.css
git commit -m "Cohort detail shows enrolled interns with click-through to edit"
```

---

### Task 3.3: Role-specific competency questions editor on cohort forms

**Files:**
- Modify: `cohort-new.html`, `cohort-edit.html`
- Modify: `styles.css` (new `.role-questions-editor` / `.role-question-row` classes)

**What:** Admin authors the 4 role-specific competency items right inside the cohort form. Reuses the same Add/Remove row pattern as the phases editor.

- [ ] **Step 1: Append to `styles.css`:**

```css
.role-questions-editor { margin: 20px 0 32px; }
.role-question-row {
  display: grid;
  grid-template-columns: 60px 1fr 2fr auto;
  gap: 16px;
  align-items: end;
  padding: 16px 0;
  border-bottom: 1px solid var(--rule);
}
.role-question-row:last-of-type { border-bottom: none; }
.role-question-row__idx { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); padding-bottom: 14px; }
.role-question-row .field { margin: 0; }
```

- [ ] **Step 2: In both `cohort-new.html` and `cohort-edit.html`**

After the phases editor section, add:

```html
<section class="role-questions-editor">
  <header class="rubric-section-head">
    <div>
      <span class="rubric-section-head__label">Role-Specific Competencies</span>
      <h2 class="rubric-section-head__title">Question Bank</h2>
    </div>
    <span class="rubric-section-head__aside">Applied to every Competency assessment in this cohort</span>
  </header>

  <div class="role-questions-list">
    <article class="role-question-row">
      <span class="role-question-row__idx">01</span>
      <div class="field">
        <label>Skill name</label>
        <input class="input" type="text" placeholder="e.g. Patient Intake & Vitals" />
      </div>
      <div class="field">
        <label>"Ready" criterion</label>
        <input class="input" type="text" placeholder="Performs core vitals and intake tasks independently..." />
      </div>
      <button type="button" class="phase-remove" aria-label="Remove question">×</button>
    </article>
    <!-- 3 more empty rows on new; 4 pre-filled Medical Assistant rows on edit -->
  </div>

  <button type="button" class="btn btn--outline btn--sm role-questions-editor__add">+ Add Question</button>
</section>
```

For `cohort-edit.html`, pre-fill rows with the 4 MA questions already in use: Patient Intake & Vitals / EHR Tooling / Pace & Accuracy / HIPAA & Compliance.

- [ ] **Step 3: Wire Add/Remove JS** (mirror the phases editor — reuse the inline JS pattern already in those forms)

- [ ] **Step 4: Verify**

On New Cohort, add/remove question rows. On Edit Cohort (Eskenazi), confirm the 4 MA rows are pre-filled.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/cohort-new.html Prototypes/PROTOTYPE/cohort-edit.html Prototypes/PROTOTYPE/styles.css
git commit -m "Add role-specific competency question editor to cohort forms"
```

---

# Phase 4 — Polish

### Task 4.1: Empty states

**Files:**
- Modify: 5 list pages + 3 detail pages that show sub-tables

**What:** When filters produce zero rows OR a section has no data, show a friendly empty row instead of a blank table body. The `.empty-cell` style from Task 3.2 is reused.

- [ ] **Step 1: Extend `wireTableFilter` in `app.js`** to toggle an empty-state row:

```js
    var tbody = table.querySelector('tbody');
    var emptyRow = tbody.querySelector('tr.empty-row');
    if (!emptyRow) {
      emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      emptyRow.innerHTML = '<td colspan="99" class="empty-cell">No records match the current filters.</td>';
      tbody.appendChild(emptyRow);
    }
    function apply() {
      // … existing logic …
      emptyRow.style.display = visible === 0 ? '' : 'none';
    }
```

- [ ] **Step 2: Verify**

On Readiness, type "zzzzz" in search → empty-state row appears. Clear → rows return.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/app.js
git commit -m "Show empty-state row when table filters match nothing"
```

---

### Task 4.2: Form validation feedback

**Files:**
- Modify: `app.js` (new `validate()` helper)
- Modify: `readiness-new.html`, `competency-new.html`, `intern-new.html`, `cohort-new.html`, `login.html`
- Modify: `styles.css` (append `.field--error` + error message style)

**What:** When the Submit/Create button is clicked with missing required fields or malformed zip (must be 5 digits), inline error message appears under each bad field.

- [ ] **Step 1: Append to `styles.css`:**

```css
.field--error .input,
.field--error .select { border-color: var(--danger); box-shadow: 0 0 0 3px rgba(168, 58, 42, 0.12); }
.field__error {
  display: block;
  margin-top: 6px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--danger);
}
```

- [ ] **Step 2: Add to `app.js`:**

```js
  function validate(fieldSpecs) {
    var valid = true;
    fieldSpecs.forEach(function (spec) {
      var input = document.querySelector(spec.selector);
      var field = input && input.closest('.field');
      if (!input || !field) return;
      field.classList.remove('field--error');
      var existing = field.querySelector('.field__error');
      if (existing) existing.remove();
      var value = input.value.trim();
      var message = null;
      if (spec.required && !value) message = 'Required';
      else if (spec.pattern && !spec.pattern.test(value)) message = spec.message || 'Invalid format';
      if (message) {
        valid = false;
        field.classList.add('field--error');
        var err = document.createElement('span');
        err.className = 'field__error';
        err.textContent = message;
        field.appendChild(err);
      }
    });
    return valid;
  }
```

Export on `IMPACT`.

- [ ] **Step 3: Wire per form**

E.g. on `readiness-new.html` change the Submit confirm button to call `IMPACT.validate([...])` first:

```html
<button type="button" class="btn btn--primary" onclick="
  if (!IMPACT.validate([
    {selector: '#ln', required: true},
    {selector: '#co', required: true},
    {selector: '#zp', pattern: /^\d{5}$/, message: '5 digits'},
    {selector: '#dt', required: true}
  ])) return;
  document.getElementById('submitModal').hidden = false;
">Submit Assessment</button>
```

Apply analogous validation on the other four forms.

- [ ] **Step 4: Verify**

Click Submit with empty fields → red underlines + "Required" / "5 digits" errors appear. Fill all fields → modal opens.

- [ ] **Step 5: Commit**

```bash
git add Prototypes/PROTOTYPE/
git commit -m "Add inline validation to New forms (required fields, 5-digit zip)"
```

---

### Task 4.3: Mobile responsive audit

**Files:**
- Modify: `styles.css` — expand and refine the existing `@media (max-width: 900px)` block and add `@media (max-width: 600px)` for phone

**What:** Audit each page type at 375px, 600px, 900px. Fix: sticky action bar wrapping, meta-strip collapsing to stacked column, nav becoming a 2-row layout on phone, tables scrolling horizontally with sticky first column.

- [ ] **Step 1: Open each page type** (index, login, admin, dashboard, detail, form, confirm) at 375px and 600px. Note issues.

- [ ] **Step 2: Add/expand breakpoints:**

```css
@media (max-width: 900px) {
  .meta-strip { flex-direction: column; align-items: flex-start; }
  .meta-strip__item { padding: 10px 0; border-right: none; border-bottom: 1px solid var(--rule); width: 100%; }
  .meta-strip__item:last-child { border-bottom: none; }
  .action-bar__inner { grid-template-columns: 1fr; gap: 12px; }
  .id-grid { grid-template-columns: 1fr 1fr; }
  .id-grid--4, .id-grid--5 { grid-template-columns: 1fr 1fr; }
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .detail-actions { flex-direction: column; align-items: stretch; }
  .detail-actions .btn--primary { margin-left: 0; }
}

@media (max-width: 600px) {
  .nav__inner { flex-direction: column; height: auto; padding: 12px 16px; gap: 10px; }
  .nav__links { flex-wrap: wrap; justify-content: center; gap: 14px; }
  .admin-chip { display: none; }
  .hero__headline { font-size: 52px; }
  .page-head__title { font-size: 40px; }
  .id-grid, .id-grid--4, .id-grid--5 { grid-template-columns: 1fr; }
  .kpi-grid { grid-template-columns: 1fr; }
  .container { padding: 0 16px; }
  .nav__inner { padding: 0 16px; }
  .toast-stack { left: 16px; right: 16px; bottom: 16px; }
  .toast { max-width: none; }
}
```

- [ ] **Step 3: Verify**

DevTools → Toggle device toolbar → test at iPhone SE (375), iPad portrait (820), and a desktop 1440. Click through the key flows (login, sign-in, open readiness dashboard, open detail, submit). Everything remains reachable.

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/styles.css
git commit -m "Responsive audit: expand breakpoints for tablet and phone layouts"
```

---

# Phase 5 — Nice-to-haves

### Task 5.1: Print stylesheet

**Files:**
- Modify: `styles.css` (append `@media print` block)

**What:** Hide nav/footer/action bar/filters; make detail pages print cleanly on one page as an audit-worthy artifact.

- [ ] **Step 1: Append to `styles.css`:**

```css
@media print {
  .nav, .footer, .action-bar, .filters, .filter-group, .detail-actions,
  .table-meta, .col-actions, .modal, .toast-stack { display: none !important; }
  body { background: #fff; color: #000; }
  .page-head, .assessment-wrap, .rubric-panel { page-break-inside: avoid; }
  .rubric-panel { box-shadow: none; border: 1px solid #ccc; }
  .notes-view { background: #fff !important; }
  a { color: inherit; text-decoration: none; }
  .container { max-width: none; padding: 0; }
}
```

- [ ] **Step 2: Verify**

From Readiness Detail (any intern), Ctrl+P → preview shows only the page head + meta-strip + domain panels. No navbar/footer/actions.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/styles.css
git commit -m "Add print stylesheet for clean assessment printouts"
```

---

### Task 5.2: 404 page

**Files:**
- Create: `Prototypes/PROTOTYPE/404.html`

**What:** Friendly 404 page matching brand.

- [ ] **Step 1: Create `404.html`**

- Standard navbar (no active state)
- Large gold `404` display
- Message: "This page doesn't exist — or the participant you're looking for was never here."
- CTA buttons: Home + Admin Home
- Standard footer

- [ ] **Step 2: Verify**

Open directly.

- [ ] **Step 3: Commit**

```bash
git add Prototypes/PROTOTYPE/404.html
git commit -m "Add branded 404 page"
```

---

### Task 5.3: Reporting / analytics stub

**Files:**
- Create: `Prototypes/PROTOTYPE/reports.html`
- Modify: admin page + navbars to link to Reports

**What:** A stub page showing the KIND of reports that would exist: Readiness pass rate by cohort, Competency progression, 90-day outcomes trend. CSS-only bar charts (reuse the mini-bar pattern from variation 3 archive if useful, or build plain block bars).

- [ ] **Step 1: Create `reports.html`**

- Standard admin navbar (+ active on "Reports")
- Page head "PROGRAM REPORTS."
- 3 report cards (stacked): "Readiness Pass Rate by Cohort", "Competency Progression Across Phases", "90-Day Outcome Tracking"
- Each card has a small chart (CSS-only divs) + "Export CSV" button
- Clear "DEMO" watermark / note that this is placeholder data

- [ ] **Step 2: Add "Reports" nav link to all admin pages**

- [ ] **Step 3: Verify**

Click Reports from any admin page → lands here, renders the three stub reports.

- [ ] **Step 4: Commit**

```bash
git add Prototypes/PROTOTYPE/reports.html Prototypes/PROTOTYPE/*.html
git commit -m "Add reports stub page with CSS-only chart placeholders"
```

---

## Execution notes

- **Worktrees not required.** This project is a static HTML prototype in a single folder; iterate in place.
- **No automated tests.** Verification is manual — open the page, click, observe.
- **Commit after each task.** Each phase is a natural demo checkpoint — pause and review before starting the next.
- **Parallel agents.** Tasks 1.2, 1.4, 2.2 (applying the same pattern across multiple pages) can each be handed to a subagent with a tight prompt once the pattern is established earlier in the phase.
