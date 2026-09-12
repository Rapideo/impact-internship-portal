// Reserve-then-count guard: a parallel burst from ONE IP must not get more than
// THROTTLE_MAX_FAILURES attempts through. Uses Playwright's request fixture (no
// browser) with a pinned x-forwarded-for distinct from intern-throttle.spec.ts.
// Locally the dev server's single service-role connection serialises the burst,
// so this mostly guards the accounting (every response is either a miss or a
// refusal, and misses ≤ 10); in production the same invariant holds under real
// concurrency because the count includes each request's own reserved row.
import { test, expect } from '@playwright/test';
import postgres from 'postgres';

const IP = '203.0.113.8';
const EMPLOYER_ID = '11111111-1111-1111-1111-111111111102'; // Northside Hospital Network
const COHORT_ID = '33333333-3333-3333-3333-333333333302'; // Northside — Winter 2026 CNA Track
const N = 20;

test.use({ extraHTTPHeaders: { 'x-forwarded-for': IP } });

async function clearAttempts() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  try {
    await sql`DELETE FROM public.identity_attempts WHERE ip = ${IP}`;
  } finally {
    await sql.end();
  }
}
test.beforeAll(clearAttempts);
test.afterAll(clearAttempts);

test('a parallel burst cannot exceed the failure threshold', async ({ request }) => {
  const responses = await Promise.all(
    Array.from({ length: N }, (_, i) =>
      request.post('/intern/assessments', {
        form: {
          intent: 'confirm',
          employerId: EMPLOYER_ID,
          cohortId: COHORT_ID,
          internCode: `IMP-26-${String(9000 + i)}`, // never issued by the seeds
        },
        maxRedirects: 0,
      }),
    ),
  );
  const bodies = await Promise.all(responses.map((r) => r.text()));
  const misses = bodies.filter((b) => /couldn(&#x27;|')t find that Intern ID/.test(b)).length;
  const refused = bodies.filter((b) => /Too many attempts/.test(b)).length;
  expect(misses + refused).toBe(N);
  expect(misses).toBeLessThanOrEqual(10);
  expect(refused).toBeGreaterThanOrEqual(N - 10);
});
