# Testing Script 01 — Manual QA Walkthrough

A step-by-step, click-by-click manual test of the IMPACT Internship Assessment
Portal. It validates all three user journeys end to end. No technical background
needed — just follow each step in order and tick the box when the result matches.

---

## How to use this guide

- Each step is a checkbox. In most Markdown viewers (GitHub, VS Code preview)
  you can **click the box** to mark it done — your progress is tracked visually.
- Every step says **what to do** (in **bold**) and **what you should see**
  (the *Expected* note). If what you see doesn't match, that's a bug — jot it in
  the **Notes** line under that section.
- Do the sections **in order** (I → II → III). The Intern section creates data
  the Admin section later reviews.
- 🟦 = an action you take · ✅ = a result to confirm · ⚠️ = a heads-up.

## Before you start (environment + logins)

> ⚠️ **Test on the PREVIEW environment, never production.** Preview is backed by
> the seeded **dev** database (sample employers, cohorts, and interns to click
> through), and it's safe to create test data there. Production has no sample
> data, and intern submissions are **permanent**.

- **Preview URL:** `https://deploy-preview-115--impact-portal-app.netlify.app`
  *(Preview URLs are created per pull-request and rotate — if this one is gone,
  ask for the current preview URL or open any PR to generate a fresh one. The
  production URL `impact-portal-app.netlify.app` is **not** for testing.)*

**Test logins (preview/dev only):**

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@example.com` | `DevPassword123!` | Sees everything |
| Employer | `employer1@example.com` | `DevPassword123!` | Scoped to **Northside Hospital Network** only |
| Intern | *(no login)* | *(no password)* | Identifies by initial + last name + employer + cohort |

**Seeded intern identities you can use (Intern section):**

| First initial | Last name | Employer | Cohort |
|---|---|---|---|
| `A` | `Whitaker` | Riverbend Manufacturing | Riverbend — Spring 2026 Production |
| `B` | `Okafor` | Northside Hospital Network | Northside — Winter 2026 CNA Track |
| `C` | `Delgado` | Capitol City Logistics | CapCity — Q1 2026 Warehouse |

> ⚠️ **Each intern self-assessment can be submitted only ONCE per intern** (it's
> permanent after submit). Use a different intern from the table above each time
> you want to re-run a submission. If you exhaust them, an Admin can reset the
> sample data via **Settings → Reseed** (see §III).

---

# I. Intern Flow (Anonymous)

The intern never logs in. They identify themselves with a four-part key, then
complete up to three one-time reflections. **Use intern `A` / `Whitaker` /
Riverbend Manufacturing / Riverbend — Spring 2026 Production for this run.**

## I.1 — Reach the intern assessments page

- [ ] 🟦 Open the **Preview URL** in your browser. ✅ The public landing page loads (IMPACT hero + three "stage" pillars: Intake, Competency, Outcomes).
- [ ] 🟦 In the top navigation, click **Intern Assessments**. ✅ You land on a page headed **"CHOOSE YOUR ASSESSMENT."** with a **"Confirm Your Identity"** card.
- [ ] ✅ Confirm the card's sub-label reads **"UNIQUE KEY · FIRST INITIAL + LAST NAME + EMPLOYER + COHORT"**.

**Notes:** _____________________________________________

## I.2 — Identity gate: validation (negative tests first)

- [ ] 🟦 Click **Confirm →** with all fields empty. ✅ The browser blocks submission (required fields highlighted).
- [ ] 🟦 In **First Initial**, try typing more than one letter. ✅ The field accepts only a **single** character and shows it **uppercase**.
- [ ] 🟦 Enter First Initial `Z`, Last Name `Nobody`, pick Employer **Riverbend Manufacturing**, then pick the Cohort, and click **Confirm →**. ✅ A red error banner: *"No matching intern record. Check your details or contact your program administrator."*
- [ ] 🟦 Confirm the **Cohort** dropdown is **disabled** until an Employer is chosen (it reads *"Select employer first"*). ✅ After choosing an employer it enables and reads *"Select cohort"*.
- [ ] ✅ Confirm the Cohort dropdown only lists cohorts for the **chosen employer** (e.g., choosing *Riverbend Manufacturing* shows *Riverbend — Spring 2026 Production*, not Northside's cohort).

**Notes:** _____________________________________________

## I.3 — Identity gate: successful confirm

- [ ] 🟦 **First Initial:** type `A`.
- [ ] 🟦 **Last Name:** type `Whitaker`.
- [ ] 🟦 **Employer:** select `Riverbend Manufacturing`.
- [ ] 🟦 **Cohort:** select `Riverbend — Spring 2026 Production`.
- [ ] 🟦 Click **Confirm →**. ✅ The page reloads to the **assessment chooser**: an identity chip showing **A. Whitaker · Riverbend Manufacturing · Riverbend — Spring 2026 Production**, a **"Not you? Switch →"** button, and **three assessment cards**.
- [ ] ✅ Confirm the three cards are: **AT START → Personal Goals**, **AT MIDPOINT → Midpoint Reflection**, **AT EXIT → Participant Feedback**, each with a **"Begin …"** button.
- [ ] ✅ Confirm the footnote: *"Each assessment can only be submitted once. Completion is recorded for your cohort administrator."*

**Notes:** _____________________________________________

## I.4 — Complete "Personal Goals"

- [ ] 🟦 On the **Personal Goals** card, click **Begin Personal Goals →**. ✅ The Personal Goals form opens.
- [ ] 🟦 Try clicking the **submit** button with required questions blank. ✅ Validation messages appear; the form does not submit.
- [ ] 🟦 Fill in **every** field (type text answers, choose any options/ratings on each question). ✅ No validation errors remain.
- [ ] 🟦 Click the **submit** button. ✅ You're taken to a **confirmation** page acknowledging the submission.
- [ ] 🟦 Navigate back to the assessments chooser (**Intern Assessments** in the nav, or the Preview URL + `/intern/assessments`). ✅ The **Personal Goals** card now shows **"Submitted on <today's date>"** instead of a Begin button.
- [ ] 🟦 ⚠️ Try to open Personal Goals again by going to `…/intern/personal-goals` directly. ✅ You are **redirected to the confirmation page** (it cannot be submitted twice).

**Notes:** _____________________________________________

## I.5 — Complete the other two reflections

- [ ] 🟦 Click **Begin Midpoint Reflection →**, fill all fields, and submit. ✅ Confirmation page, then the card shows **"Submitted on …"**.
- [ ] 🟦 Click **Begin Participant Feedback →**, fill all fields, and submit. ✅ Confirmation page, then the card shows **"Submitted on …"**.
- [ ] ✅ All three cards now display **"Submitted on …"** and no Begin buttons remain.

**Notes:** _____________________________________________

## I.6 — "Switch" identity

- [ ] 🟦 Click **Not you? Switch →**. ✅ You return to the blank **Confirm Your Identity** gate (the previous identity is cleared).
- [ ] 🟦 (Optional) Confirm a *different* intern (e.g., `C` / `Delgado` / Capitol City Logistics / CapCity — Q1 2026 Warehouse). ✅ That intern's cards show **no** submissions yet (fresh slate), proving submissions are per-intern.

**Notes:** _____________________________________________

---

# II. Employer Flow

Sign in as the employer. This account is **scoped to Northside Hospital Network**
only — a key thing to verify is that it can **never** see other employers' data.

## II.1 — Sign in

- [ ] 🟦 Go to the Preview URL and click **Sign in** (top nav), or open `…/login`. ✅ The branded sign-in page loads (navy split layout, "Welcome back.").
- [ ] 🟦 Enter a wrong password for `employer1@example.com` and click **Sign in**. ✅ Red error: *"Invalid email or password."*
- [ ] 🟦 Enter `employer1@example.com` / `DevPassword123!` and click **Sign in**. ✅ You land on the **Employer Home** dashboard at `…/employer`.
- [ ] ✅ Confirm the top-right chip shows **Northside Hospital Network** + the email + a **Sign out** button, with a **cyan** accent (employer surface).
- [ ] ✅ Confirm the nav links read: **Home · Cohorts · Interns · Assessments · Org Details**.

**Notes:** _____________________________________________

## II.2 — Home dashboard (KPIs)

- [ ] ✅ Confirm the home page shows **KPI cards** (e.g., active cohorts, active interns, assessments needed).
- [ ] 🟦 Read the KPI numbers. ✅ They reflect **only Northside** data (e.g., 1 active cohort).

**Notes:** _____________________________________________

## II.3 — Cohorts

- [ ] 🟦 Click **Cohorts**. ✅ A table listing **only** *Northside — Winter 2026 CNA Track* (no other employers' cohorts).
- [ ] 🟦 Click the cohort row / its link. ✅ The cohort detail page opens with cohort info and its interns.

**Notes:** _____________________________________________

## II.4 — Interns

- [ ] 🟦 Click **Interns**. ✅ A list of **only Northside** interns (e.g., **B. Okafor** plus the test fixtures **T. Test1 / T. Test2 / T. Test3**).
- [ ] 🟦 Click an intern (e.g., **B. Okafor**). ✅ The intern's detail page opens, scoped to your employer.

**Notes:** _____________________________________________

## II.5 — Competency assessment (create → view → edit)

- [ ] 🟦 Click **Assessments**. ✅ The employer assessments hub lists your interns and what's needed.
- [ ] 🟦 Start a **new Competency** assessment for **T. Test1** (use a test fixture so you don't clutter a real record). ✅ The competency form opens with the intern's name/cohort/employer in a meta strip.
- [ ] 🟦 Open the **Phase** dropdown. ✅ It lists only the **phases for this cohort** (Northside CNA Track → Phase 1 / Phase 2 / Phase 3).
- [ ] 🟦 Pick a Phase, then set a rating/level on **each competency row** in the rubric. ✅ The rubric shows the 3-tier stitched questions (program-wide Core competencies + any cohort/intern-specific rows).
- [ ] 🟦 Try to submit with a required level unset. ✅ A validation error points at the missing row.
- [ ] 🟦 Complete all rows and **Submit**. ✅ Success — you're returned to a view of the saved assessment.
- [ ] 🟦 Open the saved competency assessment's **detail** view. ✅ It shows your submitted levels.
- [ ] 🟦 Click **Edit**, change one level, and save. ✅ The change persists on the detail view.

**Notes:** _____________________________________________

## II.6 — Exit Employer Survey

- [ ] 🟦 From the Assessments hub, start the **Exit Employer Survey** for an intern. ✅ The survey form opens.
- [ ] 🟦 Fill every question and **Submit**. ✅ Success confirmation; re-opening shows the saved answers (this one can be updated).

**Notes:** _____________________________________________

## II.7 — Org Details (profile)

- [ ] 🟦 Click **Org Details**. ✅ Your organization's editable details (name, contact, phone) load.
- [ ] 🟦 Change the **phone** number and **Save**. ✅ A success toast; the new value persists after a refresh.
- [ ] 🟦 (If a Roles area is present) add a **Role**, confirm it appears, then delete it. ✅ Create + delete both succeed.

**Notes:** _____________________________________________

## II.8 — Scope & sign out

- [ ] 🟦 In the address bar, try to visit another employer's data by guessing an ID (e.g., a cohort from §I that isn't Northside's). ✅ You are **blocked / redirected** — you can only ever see Northside data.
- [ ] 🟦 Click **Sign out** in the chip. ✅ You return to the sign-in page; visiting `…/employer` again redirects to login.

**Notes:** _____________________________________________

---

# III. Admin Flow

Sign in as the admin — full access to every surface. You'll also review the
intern submissions you created in §I.

## III.1 — Sign in

- [ ] 🟦 Open `…/login`, enter `admin@example.com` / `DevPassword123!`, click **Sign in**. ✅ You land on **Admin Home** at `…/admin`.
- [ ] ✅ Confirm the nav reads: **Home · Interns · Assessments · Reports · Settings** + an admin chip (gold avatar + email + **Logout**).

**Notes:** _____________________________________________

## III.2 — Home dashboard

- [ ] ✅ Confirm Admin Home shows **KPI cards** and a **recent activity** area.
- [ ] ✅ Confirm the KPIs reflect the **whole program** (all employers/cohorts/interns), not just one employer.

**Notes:** _____________________________________________

## III.3 — Interns (list, create, view, edit)

- [ ] 🟦 Click **Interns**. ✅ A table of all interns across employers, with a filter/search box.
- [ ] 🟦 Use the **filter** to narrow by cohort. ✅ The list filters live.
- [ ] 🟦 Click **New / Add Intern**. ✅ The intern-create form opens.
- [ ] 🟦 Fill **First Name** (e.g., `Jordan` — only the first initial is stored, per the minimum-PII policy), **Last Name** (e.g., `Rivera`), and select a **Cohort**. ✅ Fields accept input.
- [ ] 🟦 In the **Entry Assessment** area, add an **entry note** and tick one or more **barriers**. ✅ Selections register.
- [ ] 🟦 **Save**. ✅ The new intern appears in the list, displayed as initial + last name (e.g., **J. Rivera**) — confirming the full first name was **not** stored.
- [ ] 🟦 Open the new intern's **detail** page. ✅ Entry assessment + **90-day** and **180-day** employment outcome checkboxes/notes are present.
- [ ] 🟦 Tick **90-day employed**, add a note, and **Save**. ✅ The outcome persists.
- [ ] 🟦 **Edit** the intern (change the last name) and save. ✅ Change persists.

**Notes:** _____________________________________________

## III.4 — Assessments + reviewing intern self-submissions

- [ ] 🟦 Click **Assessments**. ✅ The admin assessments hub loads (competency + survey entry points + intern self-assessment results).
- [ ] 🟦 Open the **self-assessment results** view. ✅ You can see the submissions made in §I — find **A. Whitaker**'s Personal Goals / Midpoint / Participant Feedback.
- [ ] 🟦 Open one submission's **detail**. ✅ The intern's answers display read-only.
- [ ] 🟦 Start an **admin Competency** assessment for any intern, fill the rubric, and submit. ✅ Saves and is viewable (same engine as the employer side).
- [ ] 🟦 Start an **Exit Employer Survey** (admin-completed on behalf of an employer) for an intern, fill, submit. ✅ Saves successfully.

**Notes:** _____________________________________________

## III.5 — Reports

- [ ] 🟦 Click **Reports**. ✅ The Reports page loads. *(Known state: this is currently a "coming soon" placeholder — confirm it renders without error; real charts are pending.)*

**Notes:** _____________________________________________

## III.6 — Settings (CRUD across the board)

- [ ] 🟦 Click **Settings**. ✅ A settings landing with a rail: Employers, Cohorts, Roles, Phases, Barriers, Program Info, Questions.
- [ ] 🟦 **Employers:** open the list → **Add Employer** (name + contact) → Save → confirm it appears → open it → **Edit** → Save. ✅ Create + edit succeed.
- [ ] 🟦 **Cohorts:** under an employer, **add a cohort** (name, dates, pick phases) → Save. ✅ Appears under that employer.
- [ ] 🟦 **Roles:** add a role under an employer → Save → delete it. ✅ Create + delete succeed.
- [ ] 🟦 **Phases:** add a phase to the global list, reorder/rename inline, and save. ✅ Diff-based save succeeds.
- [ ] 🟦 **Barriers:** add a barrier to the global list and save. ✅ Appears in the list (and would show on the intern entry form).
- [ ] 🟦 **Program Info:** edit a field (e.g., contact email) and save. ✅ Persists.
- [ ] 🟦 **Questions → Competency:** open the competency question editor and confirm the **3 tiers** (program Core, per-cohort, per-intern) are editable. ✅ Editor loads; a small edit saves.

**Notes:** _____________________________________________

## III.7 — Reset sample data (optional) + logout

- [ ] 🟦 ⚠️ If you've exhausted the one-shot intern submissions and want a clean slate, use **Settings → Reseed** (Danger Zone). ✅ Confirms, then the sample employers/cohorts/interns are restored and self-assessments are clickable again. *(Preview/dev only — this wipes and re-seeds the dev database.)*
- [ ] 🟦 Click **Logout** in the admin chip. ✅ You return to the sign-in page; visiting `…/admin` again redirects to login.

**Notes:** _____________________________________________

---

## Sign-off

- [ ] **Section I (Intern)** complete — all steps passed or bugs noted.
- [ ] **Section II (Employer)** complete — all steps passed or bugs noted.
- [ ] **Section III (Admin)** complete — all steps passed or bugs noted.

**Tester:** ________________   **Date:** ________________
**Build / preview URL tested:** ________________________________
**Overall result:** ☐ Pass  ☐ Pass with issues  ☐ Fail
**Summary of issues found:**

_____________________________________________________________
_____________________________________________________________
