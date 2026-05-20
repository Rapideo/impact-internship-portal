// Admin Exit Employer Survey e2e (SP4 Phase E, Task 28).
//
// Flow:
//   1. Sign in as admin, open /admin/assessments.
//   2. Click "Begin Exit Employer Survey" → intern-picker modal → pick Test1.
//   3. Lands on /admin/assessments/exit-employer-survey?internId=…
//   4. Fill the required radio (ees-outcome) and required likert
//      (ees-performance=4) and tick a few work-readiness checkboxes.
//   5. Save → confirm modal → confirm.
//   6. After save the route redirects to /admin/interns/<id>?ees=saved.
//   7. Navigate back to the survey URL — answers should be restored from
//      the upserted row.
//   8. Change a radio, save, reload — new value persists (proves UPSERT
//      not duplicate insert; the one-shot unique index would prevent the
//      second save otherwise).
//
// Cleanup: scoped to (intern_id, type='exit-employer-survey'). Belt-and-
// suspenders pattern (beforeEach + afterAll) per the SP1 RLS test convention.

import { test, expect } from '@playwright/test';
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';
const TEST_INTERN_LN = 'Test1';
const TEST_INTERN_ID = '44444444-4444-4444-4444-444444444404';
const SURVEY_URL = `/admin/assessments/exit-employer-survey?internId=${TEST_INTERN_ID}`;

async function cleanupSubmissions(): Promise<void> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  try {
    await sql`
      DELETE FROM public.assessment_submissions
      WHERE intern_id = ${TEST_INTERN_ID} AND type = 'exit-employer-survey'
    `;
  } finally {
    await sql.end();
  }
}

// Single admin test in this file but mark serial so the cleanup-then-insert
// pattern doesn't race with admin-competency.spec.ts on the same Test1 row.
test.describe.configure({ mode: 'serial' });

// SP7 Phase H spec fixes (post-Gate-G8 audit):
// The previously "flaky" status was four spec/code mismatches stacked, not a
// runtime race. Each one alone would deterministically fail the test:
//  1. The SubmitConfirmModal's confirm button on <AssessmentForm> is labeled
//     "Submit" (AssessmentForm uses `confirmLabel="Submit"`), not "Save".
//     The earlier spec asserted `/^Save$/` and would time out waiting for a
//     button that doesn't exist on this form. CompetencyAssessmentForm uses
//     `confirmLabel="Save"` — that's why the sister `admin-competency.spec`
//     passes against the same modal primitive. The "modal auto-unmounts"
//     symptom was just Playwright's auto-wait expiring on a no-match locator.
//  2. SP7 Phase F (PR #98) changed the action redirect target from
//     `/admin/interns/<id>?ees=saved` to `/admin/assessments?submitted=
//     exit-survey` (UX fix — bounce back to the picker hub instead of the
//     intern detail page). The spec was never updated.
//  3. The exit-employer-survey question set has `minRequired: 4` (see
//     db/seed-data/question-sets.ts:307). The earlier spec only answered 3
//     distinct questions (outcome + performance + readiness), so the action
//     returned a 400 with `__minRequired` validation error and the form
//     re-rendered in place — URL never changed, looking like the submit
//     "didn't fire." Added `ees-offered` answer below to reach 4.
//  4. The Likert renderer hides its native radio inputs via `display: none`
//     (see admin.css `.assessment-likert__input`). Playwright's `getByRole`
//     accessibility filter skips inputs with `display: none`, so the
//     post-save restore assertion on `ees-performance` Likert "4" failed
//     to find the element. The CLICK side already worked around this by
//     targeting the wrapping <label> — for the ASSERT side we query the
//     input by value attribute directly, which `toBeChecked` reads from
//     the DOM property (independent of visibility).
// All four are spec-text bugs; the underlying submission flow is the same
// upsert covered by tests/rls/assessment-submissions.test.ts and the SP7
// Phase F manual walk (Gate G6 sign-off PR #98).

test.beforeEach(cleanupSubmissions);
test.afterAll(cleanupSubmissions);

async function signInAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test('admin can submit and re-edit an exit employer survey', async ({ page }) => {
  await signInAsAdmin(page);

  // --- Pick via the assessments hub ---------------------------------------
  await page.goto('/admin/assessments');
  // SP7 Phase F — button label is now "Begin Exit Survey" (prototype copy);
  // it dropped the redundant "Employer" qualifier from the AssessmentCard CTA.
  await page.getByRole('button', { name: /Begin Exit Survey/i }).click();
  await expect(page.getByRole('dialog', { name: /Select intern/i })).toBeVisible();
  await page.getByLabel(/Filter interns/i).fill(TEST_INTERN_LN);
  // SP7 Phase F — picker rebuilt as a `<PickerList>` table; rows are <tr>s
  // (see admin-competency.spec.ts for the same selector update).
  const pickerRow = page
    .locator('table.picker-list tbody tr')
    .filter({ hasText: TEST_INTERN_LN })
    .first();
  await pickerRow.waitFor({ state: 'visible' });
  await pickerRow.click();
  // Same modal-unmount-vs-RR-navigate race as in admin-competency.spec.ts —
  // bump the URL-wait timeout above the default 5s.
  await expect(page).toHaveURL(new RegExp(SURVEY_URL.replace(/\?/g, '\\?')), {
    timeout: 15_000,
  });

  // --- Fill required fields + a few checkboxes ----------------------------
  // Wait for the form to mount before clicking radios. The data-qid
  // attribute is stamped by <QuestionShell> once questions render.
  await expect(page.locator('[data-qid="ees-outcome"]')).toBeVisible({ timeout: 15_000 });

  // ees-outcome is a required radio; the renderer puts each radio inside a
  // <label> wrapping the option's display text. Use the row data-qid to
  // scope the click to the right question.
  const outcomeRow = page.locator('[data-qid="ees-outcome"]');
  await outcomeRow.getByRole('radio', { name: 'Hired by this employer' }).check();

  // ees-performance is a required 1–5 likert. The Likert renderer wraps
  // each radio in a `<label class="assessment-likert__seg">` and hides the
  // native `<input type="radio">` via `display: none` in admin.css, so
  // Playwright's `.check()` on the input fails. Click the wrapping label
  // (HTML semantics route the click to the input).
  const perfRow = page.locator('[data-qid="ees-performance"]');
  await perfRow.locator('label.assessment-likert__seg').filter({ hasText: '4' }).click();

  // Tick two work-readiness checkboxes.
  const readinessRow = page.locator('[data-qid="ees-readiness"]');
  await readinessRow.getByRole('checkbox', { name: /Reliable and punctual/i }).check();
  await readinessRow.getByRole('checkbox', { name: /Takes initiative/i }).check();

  // The set has `minRequired: 4` (see db/seed-data/question-sets.ts).
  // Outcome + performance + readiness counts as 3 distinct questions
  // answered; tick the optional `ees-offered` Yes/No radio to satisfy
  // the set-level minimum and avoid a "Please answer at least 4 of 9"
  // validation rejection on submit.
  const offeredRow = page.locator('[data-qid="ees-offered"]');
  await offeredRow.getByRole('radio', { name: 'Yes' }).check();

  // Save → confirm modal → confirm.
  // SP7 Phase F — submit button copy is now just "Save Survey" (the
  // prototype's exact wording; "Exit" was dropped to avoid redundancy
  // with the page title). Clicking opens the SubmitConfirmModal whose
  // confirm button on <AssessmentForm> is labeled "Submit" (see
  // AssessmentForm.tsx — `confirmLabel="Submit"`); the modal title is
  // "Save this Exit Employer Survey?" (the page-supplied modalTitle
  // prop). Wait for the title to confirm the modal is mounted before
  // clicking the confirm button.
  await page.getByRole('button', { name: /Save Survey/i }).click();
  await expect(page.getByText('Save this Exit Employer Survey?')).toBeVisible();
  await page.getByRole('button', { name: /^Submit$/ }).click();

  // SP7 Phase F — the action redirects to the admin assessments hub. The
  // hub's mount-time useEffect strips `?submitted=exit-survey` after toasting
  // (see admin.assessments._index.tsx), so by the time Playwright polls the
  // URL settles at `/admin/assessments` (no query). Match either state.
  await expect(page).toHaveURL(/\/admin\/assessments(?:\?|$)/, {
    timeout: 15_000,
  });

  // --- Reload the survey URL — answers should restore from the upsert ----
  await page.goto(SURVEY_URL);
  await expect(
    page.locator('[data-qid="ees-outcome"]').getByRole('radio', { name: 'Hired by this employer' }),
  ).toBeChecked();
  // The Likert renderer hides its native radio inputs via `display: none`
  // (see admin.css `.assessment-likert__input`). Playwright's `getByRole`
  // skips role=radio elements that aren't accessible — so query the input
  // directly by value to bypass the accessibility filter for the restore
  // assertion. (The CLICK earlier uses the wrapping <label> for the same
  // reason; assertions need this path.)
  await expect(
    page.locator('[data-qid="ees-performance"] input[type="radio"][value="4"]'),
  ).toBeChecked();
  await expect(
    page
      .locator('[data-qid="ees-readiness"]')
      .getByRole('checkbox', { name: /Reliable and punctual/i }),
  ).toBeChecked();

  // --- Change a radio, save, reload — UPSERT (not duplicate) -------------
  await page
    .locator('[data-qid="ees-outcome"]')
    .getByRole('radio', { name: 'Completed — not hired' })
    .check();

  // Same Save Survey → modal → Submit pattern for the re-save round-trip.
  // Confirm button is "Submit" (see comment above); redirect lands on the
  // assessments hub, which strips `?submitted=exit-survey` after toasting.
  await page.getByRole('button', { name: /Save Survey/i }).click();
  await expect(page.getByText('Save this Exit Employer Survey?')).toBeVisible();
  await page.getByRole('button', { name: /^Submit$/ }).click();
  await expect(page).toHaveURL(/\/admin\/assessments(?:\?|$)/, {
    timeout: 15_000,
  });

  await page.goto(SURVEY_URL);
  await expect(
    page.locator('[data-qid="ees-outcome"]').getByRole('radio', { name: 'Completed — not hired' }),
  ).toBeChecked();
  // And the previous value is no longer checked.
  await expect(
    page.locator('[data-qid="ees-outcome"]').getByRole('radio', { name: 'Hired by this employer' }),
  ).not.toBeChecked();
});
