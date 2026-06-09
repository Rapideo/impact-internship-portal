// tests/e2e/users.spec.ts
// Admin user-management happy path. Mirrors the login flow in
// tests/e2e/admin-crud.spec.ts. Runs in CI (supabase start); not runnable
// locally without Docker. Uses a unique email per run so reruns don't collide.
import { test, expect } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';

async function signInAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test('admin creates an employer user via the password path and sees it listed', async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto('/admin/settings/users');
  await expect(page.getByRole('heading', { name: /users/i }).first()).toBeVisible();

  await page.getByRole('link', { name: /\+ New User/i }).click();
  await expect(page).toHaveURL(/\/admin\/settings\/users\/new/);

  const email = `e2e+${Date.now()}@example.com`;
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/role/i).selectOption('employer');
  await page.getByLabel(/employer/i).selectOption({ index: 1 });
  await page.getByLabel(/set a password now/i).check();
  await page.getByPlaceholder(/at least 8 characters/i).fill('Tk7mQ2x9pLa');
  await page.getByRole('button', { name: /create user/i }).click();

  await expect(page).toHaveURL(/\/admin\/settings\/users/);
  await expect(page.getByText(email)).toBeVisible();
});
