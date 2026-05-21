// Accessibility smoke pass — SP6 Phase F first-pass baseline.
//
// BASELINE MODE: this spec does NOT fail on violations. It runs axe-core
// across the key routes and writes a findings file at
// `docs/a11y-findings-<timestamp>.json`. Use that file (plus the inline
// console output) to plan the actual fix pass. A second-pass spec — added
// after the baseline violations are resolved — would assert zero
// critical/serious violations to catch regressions.
//
// Why we log instead of asserting: a first axe pass on an existing UI
// always finds a handful of "serious" issues (most commonly color
// contrast, label associations, focus management). Failing CI on the
// baseline gates everything else on a multi-hour fix sweep we'd rather
// schedule deliberately.
//
// Routes scanned: login, admin home, admin interns list, employer home,
// intern self-id chooser. Detail routes with UUIDs in URLs are skipped
// because their violations duplicate the list-page findings.

import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';
const EMPLOYER_EMAIL = process.env.E2E_EMPLOYER_EMAIL ?? 'employer1@example.com';
const EMPLOYER_PASSWORD = process.env.E2E_EMPLOYER_PASSWORD ?? 'DevPassword123!';

type Counts = { critical: number; serious: number; moderate: number; minor: number };

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

async function captureRoute(page: import('@playwright/test').Page, route: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const counts: Counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of results.violations) {
    const impact = (v.impact ?? 'minor') as keyof Counts;
    counts[impact] = (counts[impact] ?? 0) + 1;
  }
  const rules = results.violations.map((v) => v.id);
  console.log(`[a11y] ${route}`, counts, rules);
}

test.describe('a11y smoke (WCAG 2.1 AA, first-pass baseline)', () => {
  test('login', async ({ page }) => {
    await page.goto('/login');
    await captureRoute(page, '/login');
  });

  test('admin home', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForURL(/\/admin$/, { timeout: 15_000 });
    await captureRoute(page, '/admin');
  });

  test('admin interns list', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto('/admin/interns');
    await captureRoute(page, '/admin/interns');
  });

  test('employer home', async ({ page }) => {
    await signIn(page, EMPLOYER_EMAIL, EMPLOYER_PASSWORD);
    await page.waitForURL(/\/employer$/, { timeout: 15_000 });
    await captureRoute(page, '/employer');
  });

  test('intern self-id chooser', async ({ page }) => {
    await page.goto('/intern/assessments');
    await captureRoute(page, '/intern/assessments');
  });
});
