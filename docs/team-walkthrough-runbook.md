# IMPACT Internship Portal — Team Walkthrough Run-Book

**Purpose:** Guided self-serve walkthrough of the production-rebuild surface so the team can validate design fidelity, flow correctness, and end-user feel before launch.

**Created for:** Internal team walkthrough, 2026-05-20.

**Status of the app:** SP7 frontend rebuild complete; SP6 polish (Resend wiring, Sentry, a11y/perf audits, prod seed) still ahead. What you're testing is the **functional surface against impact-dev seed data** — not production data, not the final polished launch build.

---

## 1. The URL

🔗 **https://6a0d196d36fd6796c43eab84--impact-portal-app.netlify.app**

This is a Netlify **draft deploy** — separate from `impact-portal-app.netlify.app` (which won't be live until SP6 Phase J wires the GitHub auto-deploy). The URL is shareable, no auth gate; bookmark it for the duration of the walkthrough.

**Database:** This deploy points at **impact-dev** (the development Supabase project). Everything you see is seeded fixture data. Feel free to create / edit / delete records — nothing in this deploy touches real program data. The seed can be reset by a developer if it gets too cluttered.

---

## 2. Sign-in credentials

Three personas to walk through. The first two are real Supabase Auth accounts; the third is anonymous (no login).

| Role         | Email                   | Password          | Notes                                                                |
| ------------ | ----------------------- | ----------------- | -------------------------------------------------------------------- |
| **Admin**    | `admin@example.com`     | `DevPassword123!` | Full access to every surface                                         |
| **Employer** | `employer1@example.com` | `DevPassword123!` | Scoped to the seeded `Northside Hospital Network` employer           |
| **Intern**   | _(no login)_            | _(no password)_   | Identifies by first initial + last name + cohort at the chooser page |

**Intern identity used by the chooser:** First initial `T` · Last name `Test1` · Employer `Northside Hospital Network` · Cohort `Northside — Winter 2026 CNA Track`. This is one of the seeded intern records you can submit self-assessments as.

---

## 3. Before you start — what to look for

For **every** screen you visit:

✅ **Visual fidelity** — Does it match the prototype look? Navy/cyan/gold palette, IMPACT wordmark in Archivo Black, body in IBM Plex Sans, mono labels in IBM Plex Mono. No off-brand colors, no stock Bootstrap-y feel.

✅ **Layout & spacing** — Container width feels right (~1240px), navbar and footer span the full viewport (no max-width inset), forms breathe, tables don't crowd.

✅ **Copy & tone** — Headlines feel intentional (e.g., `START AN ASSESSMENT.`, `ORG DETAILS.`, `YOUR INTERNS.`). Buttons say what they do. Helper text is human.

✅ **Flow correctness** — When you click a thing, the next thing happens. Forms save what you expect. Redirects land where they should.

✅ **Empty states** — When a list has no data, does it say so gracefully? (Some seeded routes may have empty sections — that's the data, not the surface.)

❌ **What's still known to be incomplete / not a bug:**

- **"Pass" pill on competency detail always shows "Pass"** — the real pass/fail rule is pending program-staff input.
- **"Current Phase" column on intern lists shows `—`** — needs phase-window schema work, deferred.
- **No emails actually send** — Resend is wrapped in a no-op fallback (`console.warn`) until SP6 Phase D wires the API key. So invite/reset flows won't send a real email; the form just succeeds.
- **No error monitoring** — Sentry isn't wired (SP6 Phase E). If something crashes, the page will show a generic RR error boundary.
- **Reports page is a stub** — CSS-bar-chart placeholder (SP6 Phase C will fill it in).

---

## 4. Admin walkthrough (~15 minutes)

Sign in as `admin@example.com` / `DevPassword123!`. You'll land on `/admin`.

### 4.1 Home dashboard

- [x] KPI tiles at the top (Active interns, Active cohorts, Recent submissions, etc.) — numbers look reasonable
- [x] Quick Links rail on the right
- [x] Recent Activity feed at the bottom shows assessment submissions
- [x] Admin chip in the nav (top-right) shows the gold avatar `A` + `admin@example.com` + Logout button

### 4.2 Interns

Click **Interns** in the top nav.

- [x] List of interns with search, cohort filter, outcome filter
- [x] Each row shows NameInitial chip + cohort + start date + role + outcome pill
- [x] Click a row → opens that intern's record (URL: `/admin/interns/<uuid>`)
- [x] Intern record has 6 numbered RubricPanel sections (Personal Info, Internship Details, Entry Assessment, Self-Assessments, Evaluations, Employment Outcomes)
- [ ] Click **+ New intern** → form. Fill it out (use any first initial, last name; pick a cohort; pick a role). Save. The new intern appears in the list.
  
  *ERROR: First Name does NOT Accept Full Name*

### 4.3 Assessments hub

Click **Assessments** in the top nav.

- [x] Two cards: **Competency Assessment** and **Exit Employer Survey**
- [x] Click **Begin Competency** → intern-picker modal opens
- [x] Search/filter the picker. Pick the seeded `T. Test1` row.
- [x] Lands on `/admin/assessments/competency/new?internId=<uuid>` — the competency form
- [x] MetaStrip at top shows intern name, cohort, employer, role, dates
- [x] Phase dropdown filters to phases for this intern's cohort
- [x] Rating pills (Ready / Developing / Emerging) per rubric row
- [x] Notes textarea per row
- [x] Submit → modal confirm → save → lands on `/admin/assessments/competency/<uuid>?saved=1` (detail view)
- [x] Detail page shows the saved assessment read-only, with **Edit Assessment** link
- [x] Edit → flip a rating → Save → back to detail
- [x] Repeat for **Exit Employer Survey** (same picker pattern, different form)

### 4.4 Settings

Click **Settings** in the top nav. Walk each rail item:

- [x] **Employers** — list, click into one, see contact info + cohort list + role list + admin invite controls
- [x] **Cohorts** (via an employer detail page) — list, click into one, see role assignment + phase set + enrolled interns
- [x] **Roles** (via an employer detail page) — list, click into one, see "Cohorts using this role" sub-table
- [x] **Phases** — inline-editable list (add a row, edit a label, delete a row, save)
- [x] **Barriers** — inline-editable list (same pattern)
- [x] **Program Info** — singleton form with a Danger Zone "Reseed dev data" button
- [x] **Questions** — list of 4 standard question sets + Competency Rubric aggregate row
  - Click a standard set (e.g., **Personal Goals**) → per-question accordion editor with type-specific config sub-forms
  - Click **Competency Rubric** → 3-tier (Core + per-cohort + per-intern) view

### 4.5 Reports

Click **Reports** in the top nav.

- [ ] Stub page renders with CSS-bar-chart placeholders. **Not a real report yet** (SP6 Phase C). Just confirm the page loads without errors.

*ERROR: There is NOT a "Report" option in the top Nav*

### 4.6 Log out

- [x] Click **Logout** in the admin chip → returns to `/login`.

---

## 5. Employer walkthrough (~10 minutes)

Sign in as `employer1@example.com` / `DevPassword123!`. You'll land on `/employer`.

**Look for:** Same brand palette as admin, but a **cyan accent** on the nav chip divider + the Active Interns KPI tile distinguishes the employer surface.

### 5.1 Employer dashboard

- [x] Uppercase greeting (e.g., `GOOD MORNING.` or `GOOD AFTERNOON.`)
- [x] 3 KPI tiles: Active cohorts · **Active interns (cyan accent)** · Assessments needed
- [x] Quick Links rail · Recent Activity feed scoped to this employer's interns

### 5.2 Assessments

Click **Assessments** in the nav.

- [x] Same two-card chooser hub as admin (Competency + Exit Survey), but the picker is **scoped** to this employer's interns only
- [x] Pick an intern → form opens with `?internId=<uuid>`
- [ ] Submit a competency or exit survey → redirects to the **intern's record** with a toast (not back to the assessments hub — this is the employer's intern-first design)

*ERRROR: Role "Employer" Does Not Exist upon Save*

### 5.3 Cohorts

Click **Cohorts** in the nav.

- [x] List of cohorts under this employer
- [x] Click a row → cohort detail with MetaStrip + phase chips + enrolled interns table

### 5.4 Interns

Click **Interns** in the nav.

- [x] List of interns across all this employer's cohorts (same TableFilter + outcome pill pattern as admin)
- [x] Click a row → intern record with **3 numbered RubricPanel sections** (employer sees the assessment-launch panels at numbers `03 / 04 / 05`; `01 / 02` — Personal Info + Internship Details — are surfaced via a MetaStrip at the top instead)

### 5.5 Org Details (profile)

Click **Org Details** in the nav. (Renamed from "My Employer" post-G8 walk per Matt's note.)

- [x] Title: `ORG DETAILS.`
- [x] MetaStrip with Contact / Email / Phone
- [x] Editable fields below
- [x] Save → toast confirmation (no inline alert)

### 5.6 Roles

There's no explicit Roles nav item — reach roles via either Org Details or directly at `/employer/roles`.

- [x] List of this employer's roles + "Cohorts using" count
- [x] Click into a role → MetaStrip with usage counts
- [x] If a role has cohorts/interns assigned, **Delete button is disabled** with explanatory text (avoids 23503 FK errors)
- [x] If a role is unused, Delete works → toast on the roles list

### 5.7 Log out

- [x] Sign out from the employer chip → returns to `/login`.

---

## 6. Intern self-submit walkthrough (~5 minutes)

Public flow — no login required. Visit `/intern/assessments` directly.

### Available test intern identities

The seed has **three Test interns in the same cohort** specifically for this walkthrough. Pick any one:

| First initial | Last name | Employer | Cohort |
|---|---|---|---|
| `T` | `Test1` | `Northside Hospital Network` | `Northside — Winter 2026 CNA Track` |
| `T` | `Test2` | `Northside Hospital Network` | `Northside — Winter 2026 CNA Track` |
| `T` | `Test3` | `Northside Hospital Network` | `Northside — Winter 2026 CNA Track` |

### One-shot rule

Each of the three intern self-assessments (Personal Goals · Midpoint Reflection · Participant Feedback) is **one submission per intern per assessment type**. Once submitted, that combination is locked. The chooser shows a `submitted on …` pill for any already-completed slot.

That gives the team **9 fresh submission slots total** (3 interns × 3 assessments). If you hit a "submitted on …" pill, just **click "Not you? Switch →"** on the chooser to clear the identity cookie and try a different Test intern.

### Walkthrough

- [ ] Lands on the **identity chooser** — three cards (Personal Goals, Midpoint Reflection, Participant Feedback). Each shows a "submit" CTA OR a "submitted on …" pill if that intern has already submitted.
- [ ] Click **Begin Personal Goals**. Identity form opens: First Initial · Last Name · Employer (dropdown) · Cohort (filtered by employer)
- [ ] Enter `T` / `Test1` (or `Test2`/`Test3`) / `Northside Hospital Network` / `Northside — Winter 2026 CNA Track` → **Confirm Your Identity**
- [ ] Should now show the chip "submitting as T. Test1" (or whichever) at the top + the Personal Goals form
- [ ] Fill in the 7 textareas → Submit → modal confirms → submits → lands on confirmation page
- [ ] Try to re-open `/intern/personal-goals` — should bounce to the confirmation page (one-shot enforced)
- [ ] Click **Not you? Switch →** on the chooser to clear the cookie and confirm-identity as a different Test intern
- [ ] Optional: walk Midpoint Reflection (8 textareas) and Participant Feedback (7 mixed-format questions) the same way

---

## 7. Reporting what you find

Two channels, depending on what you find:

### 🐛 Visual/copy issues (most common)

For things like "this color looks off", "this label says X but should say Y", "this button should be bigger", etc.

➡ **Reply to the walkthrough thread** with: the page URL, a screenshot, and a one-line description of what's wrong.

### 🔥 Broken flow / error / crash

For things like "I clicked save and got an error page", "this form doesn't accept my input", "I can't sign in".

➡ Capture: the page URL, a screenshot of the error (including the URL bar), and the steps that led to it. **Note the time** so we can correlate with server logs.

### 💡 "What if we…" suggestions

Save these for the next planning conversation — they go in the backlog, not this round of fixes.

---

## 8. Caveats — please read before you start

- **This is impact-dev seed data**, not your actual employer / cohort / intern lists. Names like "Northside Hospital Network" and "T. Test1" are placeholder fixtures.
- **You can break things.** Create, edit, delete freely. If the seed gets cluttered we can reset it. Nothing you do affects production or real program data.
- **Some routes use placeholders pending program-staff input** — see §3 above for the known list.
- **The prototype site (`impact-internship-portal.netlify.app`) is a separate static demo** of the design — visiting that one shows the original 34-page clickable mockup, not this rebuild. Use the URL in §1 only.
- **No emails will arrive.** If you try the "invite employer" or "reset password" flows, you'll see a success message in the UI, but no real email goes out yet.

---

## Appendix: Architecture cheat-sheet (for the curious)

For team members who want to understand what they're looking at under the hood:

- **Stack:** React Router v7 (SSR framework mode) · TypeScript · Vite · Supabase Postgres (auth + RLS) · Drizzle ORM · Netlify (this deploy) · `@netlify/vite-plugin-react-router` (wraps the server bundle into a Netlify Function)
- **Three roles:**
  - **Admin** — Supabase Auth, JWT carries `role='admin'`, full access
  - **Employer** — Supabase Auth, JWT carries `role='employer' + employer_id`, RLS scopes every query
  - **Anonymous intern** — no login, composite-key identity (initial + last + cohort), HMAC-signed cookie revalidated on every request
- **Test pyramid (as of 2026-05-19):** 203 unit tests · 19 RLS integration tests · 22 Playwright e2e specs
- **Source-of-truth docs:** `docs/superpowers/specs/2026-05-10-production-rebuild-design.md` is the architectural spec; `docs/superpowers/plans/` holds the 7 sub-project plans plus the SP7 frontend-rebuild plan
- **What's still ahead** (post-walkthrough): SP6 phases C–J — Reports content, Resend wiring, Sentry, Playwright CI un-gate, a11y audit, perf audit, prod seed, launch cutover (~5–10% of total project effort)

Thank you for walking through. The feedback you surface in the next hour helps lock down the SP7 fidelity gate before we begin the launch-polish pass.
