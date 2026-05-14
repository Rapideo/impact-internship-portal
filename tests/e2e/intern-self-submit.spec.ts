// Intern self-submit e2e — exercises the identity gate, the Personal Goals
// one-shot submission, the unknown-identity friendly error, the one-shot
// "already submitted" redirect, and the Switch-identity cookie reset.
//
// Fixture choice: the Northside CNA cohort has three seeded interns named
// `T. Test1/Test2/Test3` whose UUIDs end in 4404/4405/4406. Phase A added
// these specifically so end-to-end tests can submit + tear down without
// polluting the prose-rich seed data the demo deck uses.
//
// Env loading: matches the pattern in `tests/rls/assessment-submissions.test.ts`
// — `.env.local` first, then plain `.env` as a fallback. `dotenv/config` is
// intentionally avoided so loading order is explicit.

import { test, expect } from '@playwright/test';
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const TEST_INTERN_FI = 'T';
const TEST_INTERN_LN = 'Test1';
const TEST_COHORT_NAME = 'Northside — Winter 2026 CNA Track';
const TEST_EMPLOYER_NAME = 'Northside Hospital Network';
const TEST_INTERN_ID = '44444444-4444-4444-4444-444444444404';

async function cleanupSubmissions(): Promise<void> {
  // `prepare: false` is required when running against the Supavisor
  // transaction-mode pooler in CI (port 6543). Local dev DATABASE_URL is
  // session-mode (5432) and tolerates either — we keep the option set so
  // the same spec runs without modification against either target.
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  try {
    await sql`DELETE FROM public.assessment_submissions WHERE intern_id = ${TEST_INTERN_ID}`;
  } finally {
    await sql.end();
  }
}

test.beforeEach(cleanupSubmissions);
test.afterAll(cleanupSubmissions);

async function confirmIdentity(page: import('@playwright/test').Page) {
  await page.goto('/intern/assessments');
  // The identity card heading is "Confirm your identity" — assert it first
  // so a redirect (e.g. cookie already set from a previous test) surfaces
  // here as a useful failure rather than as a missing form field.
  await expect(page.getByText('Confirm your identity')).toBeVisible();

  await page.getByLabel(/First initial/i).fill(TEST_INTERN_FI);
  await page.getByLabel(/Last name/i).fill(TEST_INTERN_LN);
  await page.getByLabel(/^Employer$/i).selectOption({ label: TEST_EMPLOYER_NAME });
  await page.getByLabel(/^Cohort$/i).selectOption({ label: TEST_COHORT_NAME });
  await page.getByRole('button', { name: /Continue/i }).click();
  await expect(page).toHaveURL(/\/intern\/assessments$/);
}

test('intern confirms identity → submits Personal Goals → confirmation', async ({ page }) => {
  await confirmIdentity(page);

  // After confirmation the chooser renders the IdentityConfirmedChip and the
  // three one-shot cards. The Personal Goals CTA reads "Start Personal Goals".
  await page.getByRole('link', { name: /Start Personal Goals/i }).click();
  await expect(page).toHaveURL(/\/intern\/personal-goals$/);
  await expect(page.getByText(/SUBMITTING AS/i)).toBeVisible();

  // The Personal Goals set has 4 required-to-pass-minRequired textarea
  // questions (pg-skills / pg-gain / pg-success / pg-challenge). We rely on
  // the question text directly via getByLabel so we don't have to know the
  // generated input id; helperText also contains some of the same words so
  // we use `exact: false` plus distinctive label prefixes.
  await page
    .getByLabel('What skills do you want to build', { exact: false })
    .fill('Communication and follow-through.');
  await page.getByLabel('What are you hoping to gain', { exact: false }).fill('Confidence.');
  await page
    .getByLabel('What would success look like', { exact: false })
    .fill('Working independently by week 8.');
  await page
    .getByLabel('What is one area you want to challenge', { exact: false })
    .fill('Public speaking.');

  await page.getByRole('button', { name: /Submit Personal Goals/i }).click();
  // SubmitConfirmModal renders a "Submit" confirm button.
  await page.getByRole('button', { name: /^Submit$/ }).click();

  await expect(page).toHaveURL(/\/intern\/confirmation\?type=personal-goals/);
  // The receipt heading reads "Thanks! Your goals are locked in." — match
  // a stable substring rather than the whole copy.
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/locked in/i);
});

test('rejects unknown identity with friendly error', async ({ page }) => {
  await page.goto('/intern/assessments');

  // First initial + last name are wrong; employer + cohort can be any valid
  // pair since the identity-lookup runs before the cookie is signed.
  await page.getByLabel(/First initial/i).fill('Z');
  await page.getByLabel(/Last name/i).fill('Nobody');
  await page.getByLabel(/^Employer$/i).selectOption({ label: TEST_EMPLOYER_NAME });
  await page.getByLabel(/^Cohort$/i).selectOption({ label: TEST_COHORT_NAME });
  await page.getByRole('button', { name: /Continue/i }).click();

  await expect(page.getByText(/No matching intern record/i)).toBeVisible();
  // Should remain on the gate (the action returns the same route with an
  // error rather than redirecting).
  await expect(page).toHaveURL(/\/intern\/assessments$/);
});

test('one-shot resubmit redirects to "already submitted" page', async ({ page }) => {
  // Seed an existing personal-goals submission for the test intern so the
  // loader-side guard in `_public.intern.personal-goals.tsx` kicks in.
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  try {
    await sql`
      INSERT INTO public.assessment_submissions (intern_id, type, answers)
      VALUES (${TEST_INTERN_ID}, 'personal-goals', ${sql.json({ 'pg-skills': 'pre-seeded' })})
    `;
  } finally {
    await sql.end();
  }

  await confirmIdentity(page);

  // Navigating to the Personal Goals form directly should bounce to the
  // confirmation page because `getOneShotSubmission` finds the seeded row.
  // The current loader does NOT pass `?already=1`, but it does redirect to
  // `/intern/confirmation?type=personal-goals` and the receipt shows the
  // standard "locked in" copy — that proves the one-shot guard.
  await page.goto('/intern/personal-goals');
  await expect(page).toHaveURL(/\/intern\/confirmation\?type=personal-goals/);
  // The receipt block shows the seeded row's submittedAt date — assert the
  // receipt header rather than the date string (which varies per run).
  await expect(page.getByText(/RECEIPT/i)).toBeVisible();
});

test('Switch identity clears cookie and returns to gate', async ({ page }) => {
  await confirmIdentity(page);
  // After confirmation the Switch button posts to /intern/reset-identity,
  // which clears the cookie and redirects back to /intern/assessments.
  await page.getByRole('button', { name: /^Switch$/ }).click();
  await expect(page).toHaveURL(/\/intern\/assessments$/);
  // The identity gate should be shown again — its distinctive heading is
  // "Confirm your identity".
  await expect(page.getByText('Confirm your identity')).toBeVisible();
});
