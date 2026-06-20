/**
 * Screenshot capture for the IMPACT Quick Start & Testing Guide.
 *
 * Logs into the STAGING app (impact-dev, populated with demo data) as the admin
 * and captures the screens referenced by the guide. Read-only: it navigates and
 * screenshots; it never submits a form or mutates data. Re-runnable.
 *
 *   npx tsx docs/quick-start-guide/capture.ts
 *
 * Override the target with BASE_URL / ADMIN_EMAIL / ADMIN_PASSWORD env vars.
 */
import { chromium, type Page, type BrowserContext } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL =
  process.env.BASE_URL ?? 'https://deploy-preview-128--impact-portal-app.netlify.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'DevPassword123!';
const OUT_DIR = join(process.cwd(), 'docs', 'quick-start-guide', 'screenshots');

const results: { name: string; ok: boolean; note?: string }[] = [];

async function shot(page: Page, name: string, fullPage = true) {
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(600); // let fonts/charts settle
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage });
  results.push({ name, ok: true });
  console.log(`  captured ${name}`);
}

async function go(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
}

async function capture(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    results.push({ name, ok: false, note: (err as Error).message.split('\n')[0] });
    console.log(`  SKIPPED ${name}: ${(err as Error).message.split('\n')[0]}`);
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1366, height: 850 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log(`Capturing from ${BASE_URL}`);

  // --- Public login page (before auth) ---
  await capture('login', async () => {
    await go(page, '/login');
    await page.getByLabel(/email/i).waitFor({ timeout: 20_000 });
    await shot(page, 'login', false);
  });

  // --- Sign in ---
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/admin$/, { timeout: 30_000 });
  console.log('  signed in as admin');

  await capture('admin-home', async () => {
    await go(page, '/admin');
    await shot(page, 'admin-home');
  });

  await capture('interns-list', async () => {
    await go(page, '/admin/interns');
    await shot(page, 'interns-list');
  });

  let internId = '';
  await capture('intern-detail', async () => {
    await go(page, '/admin/interns');
    const link = page.locator('a[href^="/admin/interns/"]:not([href$="/new"])').first();
    await link.waitFor({ timeout: 15_000 });
    const href = await link.getAttribute('href');
    internId = (href ?? '').split('/').pop() ?? '';
    await link.click();
    await page.waitForURL(/\/admin\/interns\/[0-9a-f-]+$/, { timeout: 15_000 });
    await shot(page, 'intern-detail');
  });

  await capture('intern-new', async () => {
    await go(page, '/admin/interns/new');
    await shot(page, 'intern-new');
  });

  await capture('employers-list', async () => {
    await go(page, '/admin/settings/employers');
    await shot(page, 'employers-list');
  });

  await capture('employer-detail', async () => {
    await go(page, '/admin/settings/employers');
    // Rows are <tr onClick={navigate(...)}>, not anchors.
    const row = page.locator('table.assessments tbody tr').first();
    await row.waitFor({ timeout: 15_000 });
    await row.click();
    await page.waitForURL(/\/admin\/settings\/employers\/[0-9a-f-]+$/, { timeout: 15_000 });
    await shot(page, 'employer-detail');
  });

  await capture('assessments-list', async () => {
    await go(page, '/admin/assessments');
    await shot(page, 'assessments-list');
  });

  // The competency assessment form (question engine). Competency is started via
  // a modal intern-picker, so navigate straight to the form for an intern.
  await capture('competency-new', async () => {
    if (!internId) throw new Error('no internId captured from intern-detail');
    await go(page, `/admin/assessments/competency/new?internId=${internId}`);
    await shot(page, 'competency-new');
  });

  await capture('self-assessment-results', async () => {
    await go(page, '/admin/self-assessment-results');
    await shot(page, 'self-assessment-results');
  });

  await capture('reports', async () => {
    await go(page, '/admin/reports');
    await page.waitForTimeout(1200); // charts
    await shot(page, 'reports');
  });

  await capture('settings-index', async () => {
    await go(page, '/admin/settings');
    await shot(page, 'settings-index');
  });

  await capture('users-list', async () => {
    await go(page, '/admin/settings/users');
    await shot(page, 'users-list');
  });

  await capture('users-new', async () => {
    await go(page, '/admin/settings/users/new');
    await shot(page, 'users-new');
  });

  await capture('phases', async () => {
    await go(page, '/admin/settings/phases');
    await shot(page, 'phases');
  });

  await capture('barriers', async () => {
    await go(page, '/admin/settings/barriers');
    await shot(page, 'barriers');
  });

  await capture('questions', async () => {
    await go(page, '/admin/settings/questions');
    await shot(page, 'questions');
  });

  // --- Public intern self-assessment chooser, from a clean (logged-out) context ---
  await capture('intern-chooser', async () => {
    const anon = await browser.newContext({
      viewport: { width: 1366, height: 850 },
      deviceScaleFactor: 2,
    });
    const anonPage = await anon.newPage();
    await anonPage.goto(`${BASE_URL}/intern/assessments`, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    await anonPage.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await anonPage.waitForTimeout(800);
    // Strip Netlify's deploy-preview drawer (a fixed bar pinned to the bottom)
    // so it doesn't appear in the published guide.
    await anonPage.evaluate(() => {
      for (const el of Array.from(document.body.children)) {
        const id = `${el.id} ${el.getAttribute('class') ?? ''}`;
        if (/netlify/i.test(id)) el.remove();
      }
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        const s = getComputedStyle(el);
        if (s.position === 'fixed' && parseFloat(s.bottom || '999') <= 1 && el.offsetHeight < 90) {
          el.style.display = 'none';
        }
      }
    });
    await anonPage.waitForTimeout(150);
    await anonPage.screenshot({ path: join(OUT_DIR, 'intern-chooser.png'), fullPage: true });
    results.push({ name: 'intern-chooser', ok: true });
    console.log('  captured intern-chooser');
    await anon.close();
  });

  await browser.close();

  console.log('\n=== capture summary ===');
  for (const r of results) {
    console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${r.name}${r.note ? ` — ${r.note}` : ''}`);
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} captured.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
