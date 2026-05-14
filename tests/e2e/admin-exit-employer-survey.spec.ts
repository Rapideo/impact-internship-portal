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
  await page.getByRole('button', { name: /Begin Exit Employer Survey/i }).click();
  await expect(page.getByRole('dialog', { name: /Select intern/i })).toBeVisible();
  await page.getByLabel(/Filter interns/i).fill(TEST_INTERN_LN);
  await page
    .getByRole('button', { name: new RegExp(`T\\. ${TEST_INTERN_LN.toUpperCase()}`) })
    .click();
  await expect(page).toHaveURL(new RegExp(SURVEY_URL.replace(/\?/g, '\\?')));

  // --- Fill required fields + a few checkboxes ----------------------------
  // ees-outcome is a required radio; the renderer puts each radio inside a
  // <label> wrapping the option's display text. Use the row data-qid to
  // scope the click to the right question.
  const outcomeRow = page.locator('[data-qid="ees-outcome"]');
  await outcomeRow.getByRole('radio', { name: 'Hired by this employer' }).check();

  // ees-performance is a required 1–5 likert; the radios have aria-label
  // equal to their numeric value (see LikertQuestion.tsx).
  const perfRow = page.locator('[data-qid="ees-performance"]');
  await perfRow.getByRole('radio', { name: '4' }).check();

  // Tick two work-readiness checkboxes.
  const readinessRow = page.locator('[data-qid="ees-readiness"]');
  await readinessRow.getByRole('checkbox', { name: /Reliable and punctual/i }).check();
  await readinessRow.getByRole('checkbox', { name: /Takes initiative/i }).check();

  // Save → confirm modal → confirm.
  await page.getByRole('button', { name: /Save Exit Survey/i }).click();
  await page.getByRole('button', { name: /^Save$/ }).click();

  // The action redirects to /admin/interns/<internId>?ees=saved.
  await expect(page).toHaveURL(new RegExp(`/admin/interns/${TEST_INTERN_ID}\\?ees=saved`));

  // --- Reload the survey URL — answers should restore from the upsert ----
  await page.goto(SURVEY_URL);
  await expect(
    page.locator('[data-qid="ees-outcome"]').getByRole('radio', { name: 'Hired by this employer' }),
  ).toBeChecked();
  await expect(
    page.locator('[data-qid="ees-performance"]').getByRole('radio', { name: '4' }),
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

  await page.getByRole('button', { name: /Save Exit Survey/i }).click();
  await page.getByRole('button', { name: /^Save$/ }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/interns/${TEST_INTERN_ID}\\?ees=saved`));

  await page.goto(SURVEY_URL);
  await expect(
    page.locator('[data-qid="ees-outcome"]').getByRole('radio', { name: 'Completed — not hired' }),
  ).toBeChecked();
  // And the previous value is no longer checked.
  await expect(
    page.locator('[data-qid="ees-outcome"]').getByRole('radio', { name: 'Hired by this employer' }),
  ).not.toBeChecked();
});
