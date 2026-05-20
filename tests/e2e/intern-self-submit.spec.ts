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

// Run these tests serially — every test in this file mutates the same
// (TEST_INTERN_ID, 'personal-goals') row via `cleanupSubmissions` +
// per-test INSERTs. Parallel workers racing on the same DB row caused
// intermittent /intern/personal-goals → /intern/assessments redirects
// because the one-shot guard's row got cleaned mid-flight.
test.describe.configure({ mode: 'serial' });

test.beforeEach(cleanupSubmissions);
test.afterAll(cleanupSubmissions);

async function confirmIdentity(page: import('@playwright/test').Page) {
  await page.goto('/intern/assessments');
  // The identity gate's IdentityCard title is "Confirm Your Identity"
  // (rebuilt in SP7 Phase D2). The PageHead sub paragraph also contains
  // "Confirm your identity to see…" — a bare text match collides with
  // strict mode. Scope to the heading role so the assertion is unambiguous.
  await expect(page.getByRole('heading', { name: /Confirm Your Identity/i })).toBeVisible();

  // Wait for client hydration so the Cohort <select> can be enabled by the
  // employer-onChange handler (it's `disabled={!employerId}` until React
  // owns the value).
  const cohortSelect = page.getByLabel(/^Cohort$/i);
  await page.getByLabel(/First initial/i).fill(TEST_INTERN_FI);
  await page.getByLabel(/Last name/i).fill(TEST_INTERN_LN);
  await page.getByLabel(/^Employer$/i).selectOption({ label: TEST_EMPLOYER_NAME });
  await expect(cohortSelect).toBeEnabled();
  await cohortSelect.selectOption({ label: TEST_COHORT_NAME });
  // SP7 Phase D2 — the gate's submit button copy is now "Confirm →"
  // (prototype's exact wording); not "Continue".
  await page.getByRole('button', { name: /^Confirm/i }).click();
  // After the action POST completes, the route redirects back to the
  // chooser with Set-Cookie and the IdentityConfirmedChip mounts. The
  // URL doesn't change (the gate posts to itself, so `toHaveURL` passes
  // immediately without waiting for the action to finish). Wait for the
  // chip to render — that's the post-redirect signal that the cookie
  // has been issued and the loader re-resolved the confirmed identity.
  await expect(page.getByTestId('identity-confirmed-chip')).toBeVisible({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/intern\/assessments$/);
}

test('intern confirms identity → submits Personal Goals → confirmation', async ({ page }) => {
  await confirmIdentity(page);

  // After confirmation the chooser renders the IdentityConfirmedChip and the
  // three one-shot cards. SP7 Phase D2 — the Personal Goals CTA reads
  // "Begin Personal Goals" (prototype's exact wording).
  await page.getByRole('link', { name: /Begin Personal Goals/i }).click();
  await expect(page).toHaveURL(/\/intern\/personal-goals$/);
  // SP7 Phase D2 — the IdentityConfirmedChip is rendered inline at the top
  // of the assessment form via the `identityChip` prop on <AssessmentForm>.
  // It's labeled "Confirmed as" (not "SUBMITTING AS" — that wrapper was
  // removed when the chip absorbed the role).
  await expect(page.getByText(/Confirmed as/i)).toBeVisible();

  // SP7 Phase C — the question renderer's <QuestionShell> stamps
  // `data-qid="<questionId>"` on every row and uses a <p> for the question
  // text (no <label htmlFor> association). `getByLabel(...)` no longer
  // matches; scope by data-qid and target the textarea inside instead.
  await page.locator('[data-qid="pg-skills"] textarea').fill('Communication and follow-through.');
  await page.locator('[data-qid="pg-gain"] textarea').fill('Confidence.');
  await page.locator('[data-qid="pg-success"] textarea').fill('Working independently by week 8.');
  await page.locator('[data-qid="pg-challenge"] textarea').fill('Public speaking.');

  await page.getByRole('button', { name: /Submit Personal Goals/i }).click();
  // SubmitConfirmModal renders a "Submit" confirm button — wait for the
  // modal title (verbatim copy from the personal-goals route) before
  // clicking so React has time to mount the modal.
  await expect(page.getByText('Submit your Personal Goals?')).toBeVisible();
  await page.getByRole('button', { name: /^Submit$/ }).click();

  await expect(page).toHaveURL(/\/intern\/confirmation\?type=personal-goals/);
  // SP7 Phase D2 — the receipt heading is now "Personal Goals submitted."
  // (verbatim from the prototype's assessment-confirmation.html copy map).
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Personal Goals submitted/i);
});

test('rejects unknown identity with friendly error', async ({ page }) => {
  await page.goto('/intern/assessments');
  // Same hydration wait as confirmIdentity: the Cohort <select> is disabled
  // until the employer-onChange handler runs client-side.
  await expect(page.getByRole('heading', { name: /Confirm Your Identity/i })).toBeVisible();

  const cohortSelect = page.getByLabel(/^Cohort$/i);
  // First initial + last name are wrong; employer + cohort can be any valid
  // pair since the identity-lookup runs before the cookie is signed.
  await page.getByLabel(/First initial/i).fill('Z');
  await page.getByLabel(/Last name/i).fill('Nobody');
  await page.getByLabel(/^Employer$/i).selectOption({ label: TEST_EMPLOYER_NAME });
  await expect(cohortSelect).toBeEnabled();
  await cohortSelect.selectOption({ label: TEST_COHORT_NAME });
  await page.getByRole('button', { name: /^Confirm/i }).click();

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
  // Loader-side redirect — the loader runs `getCurrentInternIdentity`
  // (which re-resolves the identity cookie against the live `interns`
  // table) AND `getOneShotSubmission` before returning. On a cold dev
  // server with a freshly-issued cookie that adds up to a ~3–5s round
  // trip, so bump the URL-wait timeout above the default 5s.
  await expect(page).toHaveURL(/\/intern\/confirmation\?type=personal-goals/, {
    timeout: 15_000,
  });
  // The receipt block shows the seeded row's submittedAt date — assert the
  // receipt header rather than the date string (which varies per run).
  await expect(page.getByText(/RECEIPT/i)).toBeVisible();
});

test('Switch identity clears cookie and returns to gate', async ({ page }) => {
  await confirmIdentity(page);
  // After confirmation the Switch button posts to /intern/reset-identity.
  // SP7 Phase D2 — the button copy is now "Not you? Switch →" (prototype's
  // exact wording). The `→` arrow is text content, so the accessible name
  // includes it — use a substring regex to stay tolerant.
  await page.getByRole('button', { name: /Switch/ }).click();
  await expect(page).toHaveURL(/\/intern\/assessments$/);
  // The identity gate should be shown again — assert against the IdentityCard
  // heading directly so the assertion doesn't collide with the PageHead sub
  // paragraph that begins with the same prefix.
  await expect(page.getByRole('heading', { name: /Confirm Your Identity/i })).toBeVisible();
});
