// tests/e2e/reports.spec.ts
// Reports dashboard happy-path. Mirrors the login flow in
// tests/e2e/admin-crud.spec.ts and tests/e2e/employer-login.spec.ts.
//
// Seed assumption: `npm run db:seed` then `npx tsx scripts/restore-dev-profiles.ts`
// (so employer1@example.com is bound to Riverbend). Playwright loads .env.test.

import { test, expect } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';
const EMPLOYER_EMAIL = process.env.E2E_EMPLOYER_EMAIL ?? 'employer1@example.com';
const EMPLOYER_PASSWORD = process.env.E2E_EMPLOYER_PASSWORD ?? 'DevPassword123!';

async function signInAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

async function signInAsEmployer(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(EMPLOYER_EMAIL);
  await page.getByLabel(/password/i).fill(EMPLOYER_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/employer$/);
}

test.describe('Reports dashboard', () => {
  test('admin sees the global reports dashboard and can scope by employer', async ({ page }) => {
    await signInAsAdmin(page);

    await page.goto('/admin/reports');
    await expect(page.getByRole('heading', { name: /program reports/i })).toBeVisible();
    // Global scope shows the Employers KPI tile. exact:true so we match the
    // KPI label and not the scope bar's "All Employers" option.
    await expect(page.getByText('Employers', { exact: true })).toBeVisible();
    await expect(page.locator('.reports-scopebar__chip')).toContainText(/program-wide/i);

    // Scope to one employer via the filter; the chart heading flips to cohort.
    await page.getByLabel(/filter by employer/i).selectOption({ label: 'Riverbend Manufacturing' });
    await expect(page.locator('.reports-scopebar__chip')).toContainText('Riverbend');
    await expect(page.getByText('Interns by Cohort')).toBeVisible();
  });

  test('employer sees only their own scoped reports', async ({ page }) => {
    await signInAsEmployer(page);

    // Nav and Quick Links both render a "Reports" link; .first() picks the nav entry.
    await page
      .getByRole('link', { name: /^Reports$/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/employer\/reports/);
    await expect(page.getByRole('heading', { name: /your reports/i })).toBeVisible();
    // Employer scope omits the global-only Employers KPI tile and pins scope.
    await expect(page.getByText('Employers', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Interns by Cohort')).toBeVisible();
  });
});
