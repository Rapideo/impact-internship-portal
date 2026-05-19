import { test, expect } from '@playwright/test';

// Match the env-var names already used by tests/e2e/auth.spec.ts and the
// .env.test file that playwright.config.ts loads (E2E_ADMIN_EMAIL /
// E2E_ADMIN_PASSWORD). Defaults point at the impact-dev admin seed user from
// sub-project 1 Phase H so the smoke runs locally without extra setup.
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';

test('admin can create employer -> cohort -> intern, then edit the intern', async ({ page }) => {
  // --- Sign in -------------------------------------------------------------
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // Home renders. PageHead uses an <h1> with the title prop, which is
  // "GOOD MORNING." on /admin. Match partial / case-insensitive so a future
  // copy tweak doesn't break the smoke.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/good morning/i);

  // --- Create employer ----------------------------------------------------
  // Top nav has a single "Settings" link; the settings index redirects to
  // /admin/settings/employers.
  await page
    .getByRole('link', { name: /^Settings$/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin\/settings\/employers$/);
  await page.getByRole('link', { name: /new employer/i }).click();

  const stamp = Date.now();
  const employerName = `E2E Employer ${stamp}`;
  await page.getByLabel(/^Name$/).fill(employerName);
  await page.getByLabel(/Contact Email/i).fill(`e2e-${stamp}@example.com`);
  await page.getByRole('button', { name: /save employer/i }).click();

  // Employer detail page heading is `${employer.name}.`.
  await expect(page).toHaveURL(/\/admin\/settings\/employers\/[^/]+/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(employerName);

  // --- Create cohort under it ---------------------------------------------
  await page.getByRole('link', { name: /new cohort/i }).click();
  const cohortName = `E2E Cohort ${stamp}`;
  await page.getByLabel(/^Name$/).fill(cohortName);
  await page.getByLabel(/Start Date/i).fill('2026-04-01');
  await page.getByLabel(/End Date/i).fill('2026-09-30');
  // PhaseMultiSelect renders one checkbox per phase under name="phaseIds".
  // Pick the first available so the form passes the "at least one phase" rule.
  await page.locator('input[name="phaseIds"]').first().check();
  await page.getByRole('button', { name: /create cohort/i }).click();
  // Action redirects to /admin/settings/cohorts/<id>?created=1.
  await expect(page).toHaveURL(/\/admin\/settings\/cohorts\//);

  // --- Create intern in the new cohort ------------------------------------
  await page
    .getByRole('link', { name: /^Interns$/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin\/interns$/);
  await page.getByRole('link', { name: /new intern/i }).click();

  const lastName = `E2E${stamp}`;
  // The first-name field uses requireSingleCharUpper — even though the inline
  // hint reads "Only the first initial is saved to the record", the validator
  // rejects multi-character input. (Suggests a UX cleanup, but the validator
  // is the source of truth, so feed it a single letter.)
  await page.getByLabel(/First Name/i).fill('E');
  await page.getByLabel(/Last Name/i).fill(lastName);
  // Cohort + role selects are disabled until employer is picked; pick by
  // visible label rather than id so we don't hard-code UUIDs.
  await page.getByLabel(/^Employer$/).selectOption({ label: employerName });
  await page.getByLabel(/^Cohort$/).selectOption({ label: cohortName });
  await page.getByLabel(/Start Date/i).fill('2026-04-01');
  await page.getByLabel(/End Date/i).fill('2026-09-30');
  // SP7 Phase F — the New Intern form now wraps the action bar's "Save
  // Changes" button in a ConfirmModal ("Save this intern record?"). Click
  // the button to open the modal, then click the modal's "Save" confirm.
  await page.getByRole('button', { name: /save changes/i }).click();
  await page.getByRole('button', { name: /^Save$/ }).click();

  // Action redirects to /admin/interns/<uuid>?created=1 (the edit page). Use
  // a UUID-shaped path segment so we don't accidentally match /admin/interns/new
  // on a validation re-render.
  await expect(page).toHaveURL(
    /\/admin\/interns\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
  );
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/edit intern/i);

  // --- Edit: toggle 90-day employment + save ------------------------------
  // On the edit form (not the new form) o1-check is enabled and bound to
  // name="employed90".
  await page.locator('#o1-check').check();
  await page.locator('#o1-notes').fill('Hired full-time at Acme.');
  // The edit form's Save Changes button submits directly (no confirm modal
  // on edit — only the New form added it in Phase F).
  await page.getByRole('button', { name: /save changes/i }).click();

  // --- Return to interns list and confirm the new intern shows there ------
  await page
    .getByRole('link', { name: /^Interns$/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin\/interns$/);
  await page.getByPlaceholder(/Search by last name/i).fill(lastName);
  await expect(page.locator(`text=${lastName}`).first()).toBeVisible();
});
