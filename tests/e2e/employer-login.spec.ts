// Employer login + scoped-list smoke (SP5 Phase L, Task 35).
//
// Flow:
//   1. Sign in as employer1@example.com → land on /employer → dashboard
//      heading "Your program at a glance." is visible, and the employer
//      chip in the nav shows "Riverbend Manufacturing".
//   2. /employer/cohorts shows exactly 1 row (Riverbend's single seeded
//      cohort: "Riverbend — Spring 2026 Production").
//   3. /employer/interns shows exactly 1 row (Riverbend has 1 seeded
//      intern in cohort 301).
//
// Seed assumption: this spec depends on the SP1 seed PLUS the dev profile
// restoration script. After `npm run db:seed`, run:
//   npx tsx scripts/restore-dev-profiles.ts
// to (re)create employer1@example.com bound to the Riverbend employer.
// Without that step the login redirect to /employer fails because the auth
// row exists with no profile mapping.
//
// Selector notes (per actual implementation, NOT the plan):
//   * Sign-in button label is "Sign in" (matches admin-competency.spec.ts).
//   * Employer chip uses `.employer-chip__name` (app/components/nav/EmployerNav.tsx:50).
//   * Tables in employer routes use class `.assessments` (NOT `.data-table`)
//     — see app/routes/employer.cohorts._index.tsx and
//     app/routes/employer.interns._index.tsx.
//
// CI note: Playwright is currently SKIPPED in CI (per Phase F-K logs);
// this spec is validated locally only.

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

test.describe('Employer login + dashboard', () => {
  test('employer signs in, sees own dashboard and employer chip', async ({ page }) => {
    await signInAsEmployer(page);

    await expect(page.getByRole('heading', { name: /your program at a glance/i })).toBeVisible();
    await expect(page.locator('.employer-chip__name')).toContainText('Riverbend');
  });

  test('employer cohorts list shows only their cohorts', async ({ page }) => {
    await signInAsEmployer(page);
    await page.goto('/employer/cohorts');

    const rows = page.locator('table.assessments tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Riverbend');
  });

  test('employer interns list shows only their interns', async ({ page }) => {
    await signInAsEmployer(page);
    await page.goto('/employer/interns');

    // Riverbend (employer 101) has 1 seeded intern in cohort 301.
    const rows = page.locator('table.assessments tbody tr');
    await expect(rows).toHaveCount(1);
  });
});
