// SP7 Phase E1 visual-audit capture — admin home + admin settings landing.
//
// Captures side-by-side pairs (prototype HTML + production page) for the
// two routes rebuilt in Phase E1: /admin and /admin/settings/employers.
// Mirrors the structure of visual-audit-screenshots.ts but scoped down.

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.test', override: false });

import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROTOTYPE_DIR = 'C:/Projects/impact-prototype/Prototypes/PROTOTYPE';
const PROD_BASE = process.env.AUDIT_BASE_URL ?? 'http://localhost:5173';
const OUT_DIR = 'docs/superpowers/visual-fidelity-screenshots/2026-05-18-sp7-e1';
const VIEWPORT = { width: 1440, height: 900 } as const;

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';

type Pair = { slug: string; prototype: string; prodPath: string };

const PAIRS: Pair[] = [
  { slug: 'admin-home', prototype: 'admin.html', prodPath: '/admin' },
  {
    slug: 'admin-settings-employers',
    prototype: 'settings-employers.html',
    prodPath: '/admin/settings/employers',
  },
];

async function login(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  await page.setViewportSize(VIEWPORT);
  await page.goto(`${PROD_BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name=email]', ADMIN_EMAIL);
  await page.fill('input[name=password]', ADMIN_PASSWORD);
  await Promise.all([page.waitForURL(/\/admin(\/.*)?$/), page.click('button[type=submit]')]);
  await page.close();
}

async function capture(context: BrowserContext, url: string, outPath: string): Promise<void> {
  const page = await context.newPage();
  await page.setViewportSize(VIEWPORT);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: outPath, fullPage: true });
  await page.close();
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const browser: Browser = await chromium.launch();
  const publicCtx = await browser.newContext();
  const adminCtx = await browser.newContext();

  console.log(`Logging in admin (${ADMIN_EMAIL}) …`);
  await login(adminCtx);

  for (const pair of PAIRS) {
    console.log(`  • ${pair.slug}`);
    const proto = pathToFileURL(path.join(PROTOTYPE_DIR, pair.prototype)).href;
    await capture(publicCtx, proto, path.join(OUT_DIR, `${pair.slug}__a-prototype.png`));
    await capture(
      adminCtx,
      `${PROD_BASE}${pair.prodPath}`,
      path.join(OUT_DIR, `${pair.slug}__b-production.png`),
    );
  }

  await browser.close();
  console.log(`\nDone. Captured ${PAIRS.length * 2} screenshots in ${OUT_DIR}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
