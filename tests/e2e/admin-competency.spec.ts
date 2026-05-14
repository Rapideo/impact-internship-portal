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
 * row in a div with `data-qid="<questionId>"`, and each radio's `aria-label`
 * is the rating's display label ("Emerging" / "Developing" / "Ready"). We
 * scope by data-qid first so the click hits the right row even when 11 rows
 * are stacked vertically.
 */
async function setRubricRating(
  page: import('@playwright/test').Page,
  rowId: string,
  ratingLabel: 'Emerging' | 'Developing' | 'Ready',
) {
  const row = page.locator(`[data-qid="${rowId}"]`);
  await row.getByRole('radio', { name: ratingLabel }).check();
}

test('admin can run the picker, submit a competency, then edit a rating', async ({ page }) => {
  await signInAsAdmin(page);

  // --- Open the competency picker --------------------------------------
  await page.goto('/admin/assessments');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/assessments/i);
  await page.getByRole('button', { name: /Begin Competency Assessment/i }).click();
  // The modal heading is "Select an intern — Competency".
  await expect(page.getByRole('dialog', { name: /Select intern/i })).toBeVisible();

  // Filter to Test1 and pick the row. The filter input's aria-label is
  // "Filter interns"; the row button label includes "T. TEST1" (last name
  // is uppercased in the picker).
  await page.getByLabel(/Filter interns/i).fill(TEST_INTERN_LN);
  await page
    .getByRole('button', { name: new RegExp(`T\\. ${TEST_INTERN_LN.toUpperCase()}`) })
    .click();

  await expect(page).toHaveURL(
    new RegExp(`/admin/assessments/competency/new\\?internId=${TEST_INTERN_ID}`),
  );

  // --- Pick a phase + rate every rubric row ----------------------------
  // The Northside cohort has 3 seeded phases; pick the first one by label.
  // Phase ids are server-generated UUIDs, so use selectOption with a label.
  await page.locator('#competency-phase-select').selectOption({ index: 1 });

  for (const id of RUBRIC_ROW_IDS) {
    await setRubricRating(page, id, 'Ready');
  }

  // Save → confirm modal → confirm.
  await page.getByRole('button', { name: /Save Competency Assessment/i }).click();
  await page.getByRole('button', { name: /^Save$/ }).click();

  // The new-action redirects to /admin/assessments/competency/<uuid>?saved=1
  // and renders the read-only detail view.
  await expect(page).toHaveURL(
    /\/admin\/assessments\/competency\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\?|$)/,
  );
  // Detail-page heading reads "COMPETENCY — TEST1.". The submission view
  // shows the read-only form, so the rubric rows render their ratings —
  // we just assert the heading and at least one Ready radio is checked.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/COMPETENCY/i);
  const firstRow = page.locator('[data-qid="comp-attendance"]');
  await expect(firstRow.getByRole('radio', { name: 'Ready' })).toBeChecked();

  // --- Edit: flip one row to Developing, save, verify persistence -----
  await page.getByRole('link', { name: /^Edit$/ }).click();
  await expect(page).toHaveURL(/\/admin\/assessments\/competency\/edit\//);

  await setRubricRating(page, 'comp-attendance', 'Developing');
  await page.getByRole('button', { name: /Save Changes/i }).click();
  await page.getByRole('button', { name: /^Save$/ }).click();

  // After save, the edit action redirects to the detail page with ?saved=1.
  await expect(page).toHaveURL(
    /\/admin\/assessments\/competency\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\?|$)/,
  );
  await expect(
    page.locator('[data-qid="comp-attendance"]').getByRole('radio', { name: 'Developing' }),
  ).toBeChecked();
});
