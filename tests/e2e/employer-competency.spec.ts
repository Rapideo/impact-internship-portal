// Employer competency form-mount smoke (SP5 Phase L, Task 36).
//
// Minimal scope (intentional): asserts navigation + form mount only. The
// admin-competency.spec.ts already proves end-to-end submit works for the
// SAME <CompetencyAssessmentForm> component; the employer-side authorization
// guard is exercised by tests/rls/employer-scope.test.ts. Re-driving an
// 11-rubric-row submit through Playwright here is brittle (cohort/phase IDs
// are server-generated UUIDs that vary per seed run) and adds no coverage
// not already provided by the admin + RLS layers.
//
// Flow:
//   1. Sign in as employer1@example.com.
//   2. Navigate to /employer/interns → click first row's "Open" link.
//   3. Click "Submit Competency" → assert URL matches
//      /employer/competency/new?internId=<uuid>.
//   4. Assert phase dropdown (#competency-phase-select / select[name=phase])
//      is visible.
//   5. Assert at least one rubric question shell renders (data-qid attribute,
//      which the shared <QuestionShell> stamps onto every rendered row).
//   6. Stop. No submit, no DB cleanup needed.
//
// Seed assumption: same as employer-login.spec.ts — run
// `scripts/restore-dev-profiles.ts` after `npm run db:seed`.
//
// TODO (SP6 polish): expand to full submit-and-assert-saved once a stable
// seed-id strategy for phases is in place (or once the form supports
// "select first phase by label" without UUIDs).

import { test, expect } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const EMPLOYER_EMAIL = process.env.E2E_EMPLOYER_EMAIL ?? 'employer1@example.com';
const EMPLOYER_PASSWORD = process.env.E2E_EMPLOYER_PASSWORD ?? 'DevPassword123!';

async function signInAsEmployer(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(EMPLOYER_EMAIL);
  await page.getByLabel(/password/i).fill(EMPLOYER_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/employer$/);
}

test.describe('Employer competency form mount', () => {
  test('employer can open their intern record and reach the competency form', async ({ page }) => {
    await signInAsEmployer(page);

    // Open the (single) seeded intern from the list.
    await page.goto('/employer/interns');
    await page
      .locator('table.assessments tbody tr')
      .first()
      .getByRole('link', { name: /open/i })
      .click();

    // Intern record renders with a "Submit Competency" affordance.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('link', { name: /submit competency/i }).click();

    // Lands on the employer competency-new route with the internId in the query.
    await expect(page).toHaveURL(
      /\/employer\/competency\/new\?internId=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );

    // Phase dropdown is mounted (and named "phase" so it submits as such).
    await expect(page.locator('select[name="phase"]')).toBeVisible();

    // At least one rubric question row is rendered. The shared <QuestionShell>
    // stamps `data-qid="<questionId>"` on every row; the Riverbend cohort uses
    // the 7 competency-core rows.
    const rubricRows = page.locator('[data-qid]');
    await expect(rubricRows.first()).toBeVisible();
  });
});
