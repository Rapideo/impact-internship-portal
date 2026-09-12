// Intern-ID chooser throttle (spec §7): ten failed confirmations from one IP
// inside fifteen minutes refuse the eleventh. Runs under an isolated
// x-forwarded-for so it cannot lock out intern-self-submit, which shares the
// dev server's real client IP. In production Netlify's
// x-nf-client-connection-ip wins, so this header cannot dodge the throttle.
import { test, expect, type Page } from '@playwright/test';

const EMPLOYER = 'Northside Hospital Network'; // matches intern-self-submit.spec.ts
const COHORT = 'Northside — Winter 2026 CNA Track';

test.use({ extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.7' } });

// The identity gate's <Form method="post"> submits to itself via React
// Router's client-side fetch — there's no full-page navigation for
// `.click()` to auto-wait on. Every failed attempt renders the SAME error
// text ("couldn't find that Intern ID…"), so asserting on that text alone
// is not a safe way to detect that THIS attempt's round trip finished: if
// the assertion happens to already be satisfied by the PREVIOUS attempt's
// still-on-screen text, Playwright resolves it immediately and the test
// races ahead of the server. With a single-connection service-role pool
// (`db.service.server.ts`'s `max: 1`) handling `identity_attempts` writes,
// racing ahead means the eleventh request's throttle check can run before
// all ten prior failures have actually committed, undercounting them.
// Pairing the click with its own POST response closes that gap.
async function confirmAttempt(page: Page, internCode: string): Promise<void> {
  await page.getByLabel(/^Employer$/i).selectOption({ label: EMPLOYER });
  await page.getByLabel(/^Cohort$/i).selectOption({ label: COHORT });
  await page.getByLabel(/Intern ID/i).fill(internCode);
  await Promise.all([
    page.waitForResponse(
      (res) => res.request().method() === 'POST' && res.url().includes('/intern/assessments'),
    ),
    page.getByRole('button', { name: /^Confirm/i }).click(),
  ]);
}

test('eleventh failed confirmation is refused', async ({ page }) => {
  await page.goto('/intern/assessments');
  for (let i = 1; i <= 10; i++) {
    await confirmAttempt(page, `IMP-26-${String(i).padStart(4, '0')}`);
    await expect(page.getByRole('alert')).toContainText(/couldn't find that Intern ID/i);
  }
  await confirmAttempt(page, 'IMP-26-4001'); // a REAL code — still refused
  await expect(page.getByRole('alert')).toContainText(/Too many attempts/i);
});
