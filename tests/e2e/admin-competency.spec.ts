// Admin competency submit + edit e2e (SP4 Phase E, Task 27).
//
// Flow:
//   1. Sign in as admin, open /admin/assessments.
//   2. Click "Begin Competency Assessment" → intern-picker modal.
//   3. Filter to "Test1" → pick the seeded Northside CNA fixture intern.
//   4. Lands on /admin/assessments/competency/new?internId=…
//   5. Pick a phase + rate the 7 core rubric rows AND the 4 Northside
//      cohort-tier rows (the seed binds a cohort-tier competency set to
//      this cohort; see db/seed-data/question-sets.ts:competency-cohort).
//   6. Save → confirm modal → submit.
//   7. Assert URL matches /admin/assessments/competency/<uuid> and the
//      read-only view renders the chosen ratings.
//   8. Click "Edit", change one rating, save, assert change persists on
//      the detail page.
//
// Cleanup: belt-and-suspenders DELETE in both beforeEach and afterAll,
// scoped to (intern_id, type='competency'). This mirrors the pattern in
// tests/rls/assessment-submissions.test.ts so a mid-run crash doesn't
// leave dirty state for the next run.

import { test, expect } from '@playwright/test';
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';
const TEST_INTERN_LN = 'Test1';
const TEST_INTERN_ID = '44444444-4444-4444-4444-444444444404';

// All 11 rubric rows for the Test1 fixture (Northside CNA cohort): 7 core
// + 4 cohort-tier overlay. Order matters only insofar as we have to rate
// every row before saving; the form does not require a specific order.
const RUBRIC_ROW_IDS = [
  'comp-attendance',
  'comp-conduct',
  'comp-communication',
  'comp-direction',
  'comp-problem-solving',
  'comp-teamwork',
  'comp-quality',
  'cc-northside-intake',
  'cc-northside-ehr',
  'cc-northside-pace',
  'cc-northside-hipaa',
];

async function cleanupSubmissions(): Promise<void> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  try {
    await sql`
      DELETE FROM public.assessment_submissions
      WHERE intern_id = ${TEST_INTERN_ID} AND type = 'competency'
    `;
  } finally {
    await sql.end();
  }
}

// Single test in this file today, but enforce serial mode so it doesn't
// race with admin-exit-employer-survey.spec.ts or admin-question-editor.spec.ts
// when those spec runs land on the same admin session at the same time.
test.describe.configure({ mode: 'serial' });

// SP7 Phase H known flake: the SubmitConfirmModal that gates the Save action
// renders inside the <Form> wrapper and sometimes auto-closes before
// Playwright's strict-mode click finishes on the "Save" confirm button —
// resulting in `getByRole('button', { name: /^Save$/ })` timing out on a
// modal that briefly mounted, was asserted visible, then unmounted before
// click. Reproducible on Windows / Chromium / dev server only. The
// underlying form submission path is exercised by:
//   * tests/rls/assessment-submissions.test.ts (RLS scope on admin writes)
//   * the SP7 Phase F manual walk (Gate G6 sign-off PR #98)
// so this Playwright spec is best-effort coverage. Track in BACKLOG.md
// under "Post-SP7 polish — flaky e2e specs" for a follow-up that swaps the
// React modal pattern for a direct `formRef.current?.requestSubmit()` call
// (no modal indirection).

test.beforeEach(cleanupSubmissions);
test.afterAll(cleanupSubmissions);

async function signInAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/**
 * Click the "Ready" pill for a given rubric row id. The renderer wraps each
 * row in a div with `data-qid="<questionId>"`. Each rating is a `<label>`
 * containing an `<input type="radio" aria-label="...">` (display:none — the
 * label visually replaces the native radio per `.assessment-rubric-pill
 * input[type='radio'] { display: none; }` in admin.css). Playwright's
 * `check()` on the hidden input fails, so click the wrapping `<label>` —
 * native HTML semantics route the click to the input.
 */
async function setRubricRating(
  page: import('@playwright/test').Page,
  rowId: string,
  ratingLabel: 'Emerging' | 'Developing' | 'Ready',
) {
  const row = page.locator(`[data-qid="${rowId}"]`);
  await row.locator('label.assessment-rubric-pill').filter({ hasText: ratingLabel }).click();
}

test('admin can run the picker, submit a competency, then edit a rating', async ({ page }) => {
  await signInAsAdmin(page);

  // --- Open the competency picker --------------------------------------
  await page.goto('/admin/assessments');
  // SP7 Phase F — H1 is now "START AN ASSESSMENT." Match the trailing word.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/assessment/i);
  // SP7 Phase F — button label dropped "Assessment" suffix (now just
  // "Begin Competency"). The arrow glyph is suppressed from the accessible
  // name by `aria-hidden`/text-only matching via regex.
  await page.getByRole('button', { name: /Begin Competency/i }).click();
  // The modal heading is "Select an intern — Competency".
  await expect(page.getByRole('dialog', { name: /Select intern/i })).toBeVisible();

  // Filter to Test1 and pick the row. SP7 Phase F — the picker modal now
  // mounts a `<PickerList>` (the prototype's `.picker-list` table) instead
  // of the SP4-era `<ul>` of button-shaped record-links. Rows are `<tr>`s
  // with onClick, not `<button>`s. Wait for the row to appear after the
  // client-side filter, then click it. Use `getByText(<lastName>)` scoped
  // to the picker table so the click hits the visible name cell inside the
  // tr (Playwright bubbles clicks up to the parent's onClick handler).
  await page.getByLabel(/Filter interns/i).fill(TEST_INTERN_LN);
  const pickerRow = page
    .locator('table.picker-list tbody tr')
    .filter({ hasText: TEST_INTERN_LN })
    .first();
  await pickerRow.waitFor({ state: 'visible' });
  await pickerRow.click();

  // SP7 Phase F — the row's onClick fires `close()` (unmounts modal) then
  // `navigate(path)`. The modal-unmount re-render races with the RR client
  // navigation; on a cold dev server the URL change can land a beat after
  // the click resolves. Bump the toHaveURL timeout above the default 5s.
  await expect(page).toHaveURL(
    new RegExp(`/admin/assessments/competency/new\\?internId=${TEST_INTERN_ID}`),
    { timeout: 15_000 },
  );

  // --- Pick a phase + rate every rubric row ----------------------------
  // The Northside cohort has 3 seeded phases; pick the first one by label.
  // Phase ids are server-generated UUIDs, so use selectOption with a label.
  await page.locator('#competency-phase-select').selectOption({ index: 1 });

  // Wait for the rubric to mount — first row's data-qid must be present
  // before we try to click radios. Without this, on a cold dev server
  // the first setRubricRating call races the render and times out.
  await expect(page.locator('[data-qid="comp-attendance"]')).toBeVisible({ timeout: 15_000 });

  for (const id of RUBRIC_ROW_IDS) {
    await setRubricRating(page, id, 'Ready');
  }

  // Save → confirm modal → confirm. SP7 Phase F — new-mode submit button
  // copy aligned to prototype's "Submit Assessment"; edit-mode uses
  // "Submit Changes". The ConfirmModal's confirm button is "Save". Wait
  // for the modal title before clicking the confirm button so the click
  // doesn't fire before React mounts the modal.
  await page.getByRole('button', { name: /Submit Assessment/i }).click();
  await expect(page.getByText('Save competency assessment?')).toBeVisible();
  await page.getByRole('button', { name: /^Save$/ }).click();

  // The new-action redirects to /admin/assessments/competency/<uuid>?saved=1
  // and renders the read-only detail view. Bump timeout to 15s — the action
  // does a stitched rubric validation pass + admin auth lookup + DB insert
  // before issuing the redirect; on a cold dev server that adds up.
  await expect(page).toHaveURL(
    /\/admin\/assessments\/competency\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\?|$)/,
    { timeout: 15_000 },
  );
  // Detail-page heading reads "COMPETENCY — TEST1.". The submission view
  // shows the read-only form, so the rubric rows render their ratings —
  // we just assert the heading and at least one Ready radio is checked.
  // The rubric renderer (CompetencyRubricRowQuestion.tsx) wraps each radio
  // in a `<label class="assessment-rubric-pill">`; the native input is
  // hidden via CSS, so Playwright's `getByRole('radio')` accessibility
  // filter skips it on the assertion path. Match the input directly by
  // its `value` attribute (the renderer uses lowercase: ready/developing/
  // emerging) — `toBeChecked` reads the DOM property regardless of
  // visibility. Same pattern as admin-exit-employer-survey for Likert.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/COMPETENCY/i);
  const firstRow = page.locator('[data-qid="comp-attendance"]');
  await expect(firstRow.locator('input[type="radio"][value="ready"]')).toBeChecked();

  // --- Edit: flip one row to Developing, save, verify persistence -----
  // SP7 Phase F renamed the edit affordance to "Edit Assessment".
  await page.getByRole('link', { name: /Edit Assessment/i }).click();
  // Bump timeout above the 5s default to match the other URL transitions
  // in this spec — under concurrent dev-server load (2 workers), the
  // client-side RR navigation can take longer than 5s to land.
  await expect(page).toHaveURL(/\/admin\/assessments\/competency\/edit\//, { timeout: 15_000 });

  await setRubricRating(page, 'comp-attendance', 'Developing');
  // SP7 Phase F — edit-mode submit button label is "Submit Changes".
  // Same ConfirmModal pattern — wait for modal mount before confirming.
  await page.getByRole('button', { name: /Submit Changes/i }).click();
  await expect(page.getByText('Save competency assessment?')).toBeVisible();
  await page.getByRole('button', { name: /^Save$/ }).click();

  // After save, the edit action redirects to the detail page with ?saved=1.
  await expect(page).toHaveURL(
    /\/admin\/assessments\/competency\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\?|$)/,
    { timeout: 15_000 },
  );
  // Same display:none-on-native-radio reason as the Ready assertion above.
  await expect(
    page.locator('[data-qid="comp-attendance"] input[type="radio"][value="developing"]'),
  ).toBeChecked();
});
