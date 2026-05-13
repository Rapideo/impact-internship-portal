import { test, expect } from '@playwright/test';

// Mirror the env-var pattern used by tests/e2e/admin-crud.spec.ts and
// tests/e2e/auth.spec.ts — these tests inline the login flow rather than
// pulling in a `support/auth` helper, since one does not exist in this repo.
// Defaults point at the seeded admin from sub-project 1 Phase H so the spec
// runs locally without extra setup.
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';

// Riverbend — Spring 2026 Production. Seeded in db/seed-data/cohorts.ts and
// chosen because it has no cohort-tier competency set bound to it (Phase G
// only seeded one for Northside CNA). The cohort UUID is the URL param for
// the cohort competency editor.
const RIVERBEND_COHORT_ID = '33333333-3333-3333-3333-333333333301';

async function signInAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test.describe('Admin question editor', () => {
  test('edit Personal Goals: change a label, add a likert, save, reload, verify persistence', async ({
    page,
  }) => {
    await signInAsAdmin(page);

    // Land on the Assessments index. Heading is "ASSESSMENTS." rendered as
    // an <h1> via PageHead. Match partial / case-insensitive so a copy tweak
    // doesn't break the smoke.
    await page.goto('/admin/settings/questions');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/assessments/i);

    // Navigate into the Personal Goals editor. The row is rendered as a
    // <Link> wrapping the visible name; use a role-based locator first and
    // fall back to text-only to be tolerant of layout tweaks.
    await page
      .getByRole('link', { name: /Personal Goals/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/admin\/settings\/questions\/personal-goals$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Personal Goals/);

    // Expand the first seeded question (pg-skills) by clicking its row head,
    // then edit the label input — the editor uses #q-<questionId>-label.
    const skillsRow = page.locator('[data-question-id="pg-skills"]');
    await skillsRow.locator('.qs-question-row__head').click();
    const editedLabel = 'What skills do you want to build during this internship? (edited)';
    await page.locator('#q-pg-skills-label').fill(editedLabel);

    // Add a new Likert question via the "+ Add Question" picker.
    await page.getByRole('button', { name: /\+ Add Question/ }).click();
    await page.getByRole('button', { name: /^Likert$/ }).click();

    // The newly added row auto-expands; it's appended as the last row. Set
    // its prompt label via the per-row "-label" input. We rely on the row's
    // generated id rather than the question's UUID since the UUID is only
    // determined client-side.
    const newRowLabel = 'How prepared do you feel for the next phase?';
    const newRow = page.locator('[data-question-id]').last();
    await newRow.locator('input[id$="-label"]').fill(newRowLabel);

    // Save. The action redirects to /admin/settings/questions?updated=1.
    await page.getByRole('button', { name: /^Save Changes$/ }).click();
    await expect(page).toHaveURL(/\/admin\/settings\/questions(\?|$)/);

    // Reload + re-enter the editor; verify both edits persisted.
    await page.reload();
    await page
      .getByRole('link', { name: /Personal Goals/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/admin\/settings\/questions\/personal-goals$/);

    // Original row should still exist with the updated label visible (it's
    // rendered in the row head before expanding). Then expand and confirm
    // the input value.
    const skillsRowAfter = page.locator('[data-question-id="pg-skills"]');
    await expect(skillsRowAfter).toBeVisible();
    await skillsRowAfter.locator('.qs-question-row__head').click();
    await expect(page.locator('#q-pg-skills-label')).toHaveValue(editedLabel);

    // The new likert question should now be present. Its question id is
    // generated client-side, so search by the visible label text in the row
    // head; the label text is the most stable thing about a row.
    await expect(page.getByText(newRowLabel)).toBeVisible();
  });

  test('competency landing renders the 3-tier layout', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto('/admin/settings/questions/competency');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/competency questions/i);

    // The three tier cards each have a card title. Match the literal text
    // (no regex) since these are static headings that program staff signed
    // off on.
    await expect(page.getByText('Core Competencies', { exact: true })).toBeVisible();
    await expect(page.getByText('Cohort Questions', { exact: true })).toBeVisible();
    await expect(page.getByText('Intern Questions', { exact: true })).toBeVisible();

    // The Core summary card shows a disabled <input> with the seeded core
    // question count. SP3 Phase G seeded 7 core rubric rows. React controls
    // the value via the `value` prop, so [value="7"] CSS-attribute matching
    // is unreliable — assert against the DOM property via toHaveValue.
    const coreCard = page.locator('article.qs-editor-card').first();
    await expect(coreCard.locator('input[type="text"]').first()).toHaveValue('7');
  });

  test('cohort competency tier: add 1 rubric row to Riverbend and save', async ({ page }) => {
    await signInAsAdmin(page);

    // Riverbend is unbound (no cohort-tier set seeded for it). Navigate
    // directly to its editor URL rather than the `/new` chooser route — the
    // chooser exists, but loading the cohort directly is the more
    // representative admin flow once the URL is known.
    await page.goto(`/admin/settings/questions/competency/cohort/${RIVERBEND_COHORT_ID}`);

    // The bound cohort name should appear in the heading; the loader passes
    // it through as boundCohortName.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Riverbend/);

    // The cohort <select> is locked in edit mode (disabled) and pre-selected
    // to the cohort param. Just confirm it rendered.
    await expect(page.locator('#qs-cohort')).toBeVisible();

    // Add one rubric row.
    await page.getByRole('button', { name: /\+ Add Question/ }).click();
    await page.getByRole('button', { name: /Rubric Row/ }).click();
    const newRow = page.locator('[data-question-id]').last();
    await newRow.locator('input[id$="-label"]').fill('Site safety');

    // Save. The action redirects to /admin/settings/questions/competency?updated=1.
    await page.getByRole('button', { name: /^Save Changes$/ }).click();
    await expect(page).toHaveURL(/\/admin\/settings\/questions\/competency(\?|$)/);

    // Back on the competency index, the Riverbend row should now show up in
    // the Cohort Questions table. Match by the cohort name rather than the
    // rubric label, since the rubric label only appears inside the editor.
    await expect(page.getByText(/Riverbend/).first()).toBeVisible();
  });
});
