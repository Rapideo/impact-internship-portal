import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';
const EMPLOYER_EMAIL = process.env.E2E_EMPLOYER_EMAIL ?? 'employer1@example.com';
const EMPLOYER_PASSWORD = process.env.E2E_EMPLOYER_PASSWORD ?? 'DevPassword123!';

test('landing page renders the portal heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'IMPACT Internship Assessment Portal',
  );
});

test('admin can sign in and lands on /admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Admin Dashboard');
});

test('employer can sign in and lands on /employer', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMPLOYER_EMAIL);
  await page.getByLabel('Password').fill(EMPLOYER_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/employer$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Employer Dashboard');
});

test('employer hitting /admin is redirected to /employer', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMPLOYER_EMAIL);
  await page.getByLabel('Password').fill(EMPLOYER_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/employer$/);

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/employer$/);
});

test('unauthenticated user hitting /admin is redirected to /login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});

test('invalid credentials surface an error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('nobody@example.com');
  await page.getByLabel('Password').fill('NotTheRightPassword!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('signed-in admin can sign out', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);

  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Confirm session is actually gone — hitting /admin again should bounce to /login.
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});

test('reset password request flow renders confirmation screen', async ({ page }) => {
  await page.goto('/auth/forgot');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByRole('button', { name: /send reset link/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your email');
});
