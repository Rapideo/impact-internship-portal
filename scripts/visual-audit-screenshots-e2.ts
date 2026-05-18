// SP7 Phase E2 visual-audit capture — every /admin/settings/* route
// rebuilt in this phase. Pattern-matches visual-audit-screenshots-e1.ts.
//
// Captures side-by-side pairs (prototype HTML + production page) for the
// settings detail routes. Detail / edit pages get hydrated against the
// first seeded employer / cohort / role / intern row so the prototype's
// detail-page screenshots have something concrete to compare against.

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.test', override: false });

import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROTOTYPE_DIR = 'C:/Projects/impact-prototype/Prototypes/PROTOTYPE';
const PROD_BASE = process.env.AUDIT_BASE_URL ?? 'http://localhost:5173';
const OUT_DIR = 'docs/superpowers/visual-fidelity-screenshots/2026-05-18-sp7-e2';
const VIEWPORT = { width: 1440, height: 900 } as const;

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';

type Pair = { slug: string; prototype: string; prodPath: string };

// Index routes: stable URLs. Detail/edit routes need real IDs discovered
// at capture time by walking from the index pages, so they're enumerated
// separately and resolved live.
const STATIC_PAIRS: Pair[] = [
  {
    slug: 'employers-new',
    prototype: 'settings-employer-form.html',
    prodPath: '/admin/settings/employers/new',
  },
  { slug: 'phases', prototype: 'settings-phases.html', prodPath: '/admin/settings/phases' },
  { slug: 'barriers', prototype: 'settings-barriers.html', prodPath: '/admin/settings/barriers' },
  {
    slug: 'program-info',
    prototype: 'settings-program-info.html',
    prodPath: '/admin/settings/program-info',
  },
  {
    slug: 'questions-index',
    prototype: 'settings-questions.html',
    prodPath: '/admin/settings/questions',
  },
  {
    slug: 'questions-competency',
    prototype: 'settings-competency.html',
    prodPath: '/admin/settings/questions/competency',
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

async function capture(page: Page, url: string, outPath: string): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: outPath, fullPage: true });
}

async function snapPair(
  publicCtx: BrowserContext,
  adminCtx: BrowserContext,
  pair: Pair,
): Promise<void> {
  console.log(`  • ${pair.slug}`);
  const protoUrl = pathToFileURL(path.join(PROTOTYPE_DIR, pair.prototype)).href;
  const pubPage = await publicCtx.newPage();
  await pubPage.setViewportSize(VIEWPORT);
  await capture(pubPage, protoUrl, path.join(OUT_DIR, `${pair.slug}__a-prototype.png`));
  await pubPage.close();

  const adminPage = await adminCtx.newPage();
  await adminPage.setViewportSize(VIEWPORT);
  await capture(
    adminPage,
    `${PROD_BASE}${pair.prodPath}`,
    path.join(OUT_DIR, `${pair.slug}__b-production.png`),
  );
  await adminPage.close();
}

async function firstId(adminCtx: BrowserContext, listPath: string): Promise<string | null> {
  const page = await adminCtx.newPage();
  await page.setViewportSize(VIEWPORT);
  await page.goto(`${PROD_BASE}${listPath}`, { waitUntil: 'networkidle' });
  // Pick the first row's first <a> href that includes a UUID-ish segment.
  const id = await page
    .locator('table tr[tabindex]')
    .first()
    .evaluate((el: HTMLElement) => {
      const href = el.querySelector('a')?.getAttribute('href') ?? '';
      const match = href.match(/[0-9a-f-]{36}/);
      return match ? match[0] : null;
    })
    .catch(() => null);
  await page.close();
  return id;
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  const browser: Browser = await chromium.launch();
  const publicCtx = await browser.newContext();
  const adminCtx = await browser.newContext();

  console.log(`Logging in admin (${ADMIN_EMAIL}) …`);
  await login(adminCtx);

  for (const pair of STATIC_PAIRS) {
    await snapPair(publicCtx, adminCtx, pair);
  }

  // Resolve a real employer id, then snap employer detail + edit.
  const employerId = await firstId(adminCtx, '/admin/settings/employers');
  if (employerId) {
    await snapPair(publicCtx, adminCtx, {
      slug: 'employer-detail',
      prototype: 'settings-employer.html',
      prodPath: `/admin/settings/employers/${employerId}`,
    });
    await snapPair(publicCtx, adminCtx, {
      slug: 'employer-edit',
      prototype: 'settings-employer-form.html',
      prodPath: `/admin/settings/employers/${employerId}/edit`,
    });
    await snapPair(publicCtx, adminCtx, {
      slug: 'employer-cohort-new',
      prototype: 'cohort-new.html',
      prodPath: `/admin/settings/employers/${employerId}/cohorts/new`,
    });
    await snapPair(publicCtx, adminCtx, {
      slug: 'employer-role-new',
      prototype: 'role-new.html',
      prodPath: `/admin/settings/employers/${employerId}/roles/new`,
    });
  } else {
    console.warn('No seeded employer found — skipping employer detail/edit/nested pairs');
  }

  await browser.close();
  console.log(`\nDone. Captured screenshots in ${OUT_DIR}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
