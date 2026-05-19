import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';
const EMPLOYER_EMAIL = process.env.E2E_EMPLOYER_EMAIL ?? 'employer1@example.com';
const EMPLOYER_PASSWORD = process.env.E2E_EMPLOYER_PASSWORD ?? 'DevPassword123!';

test('landing page renders the portal heading', async ({ page }) => {
  await page.goto('/');
  // SP7 Phase D1 rebuild — the landing H1 now mirrors the prototype's hero
  // headline ("EXPAND YOUR OPPORTUNITIES."). Match against that.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/expand your/i);
});

test('admin can sign in and lands on /admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
  // SP7 Phase E1 — admin home H1 is now the prototype's "GOOD MORNING, <name>."
  // greeting. Match the stable prefix.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/good morning/i);
});

test('employer can sign in and lands on /employer', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMPLOYER_EMAIL);
  await page.getByLabel('Password').fill(EMPLOYER_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/employer$/);
  // SP7 Phase G — employer home H1 is "YOUR PROGRAM<br/>AT A GLANCE." The
  // <br> means text-content extraction concatenates with no space between
  // "PROGRAM" and "AT" — match a partial prefix instead.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/your program/i);
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

  // SP7 Phase E1 — the AdminNav admin-chip uses "Logout" as the button text
  // (the prototype's exact wording). Employer nav uses "Sign out" instead;
  // see employer-login.spec.ts for the employer-side equivalent.
  await page.getByRole('button', { name: /logout/i }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Confirm session is actually gone — hitting /admin again should bounce to /login.
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});

test('reset password request flow renders confirmation screen', async ({ page }) => {
  await page.goto('/auth/forgot');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  // SP7 Phase D1 — the auth.forgot recovery card's submit button is now
  // labeled "Send Link" (matches the prototype's RECOVER PASSWORD modal).
  await page.getByRole('button', { name: /send link/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Check your email');
});
