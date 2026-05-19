// SP7 Phase G visual-audit capture — every /employer/* route rebuilt in this
// phase. Pattern-matches scripts/visual-audit-screenshots-f.ts.
//
// The employer shell has NO prototype counterpart by design — it's audited
// against the admin shell + admin equivalent routes. For each rebuilt
// employer route we capture two screenshots:
//   • The admin equivalent prototype page (for visual-pattern reference)
//   • The production employer page (for the actual rebuild)
//
// Detail / edit pages get hydrated against the first seeded intern / cohort
// / role row so the production screenshots have concrete data to render.

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.test', override: false });

import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROTOTYPE_DIR = 'C:/Projects/impact-prototype/Prototypes/PROTOTYPE';
const PROD_BASE = process.env.AUDIT_BASE_URL ?? 'http://localhost:5173';
const OUT_DIR = 'docs/superpowers/visual-fidelity-screenshots/2026-05-18-sp7-g';
const VIEWPORT = { width: 1440, height: 900 } as const;

const EMP_EMAIL = process.env.E2E_EMPLOYER_EMAIL ?? 'employer1@example.com';
const EMP_PASSWORD = process.env.E2E_EMPLOYER_PASSWORD ?? 'DevPassword123!';

type Pair = { slug: string; prototype: string; prodPath: string };

// Employer routes mapped to their admin-shell prototype reference page.
const STATIC_PAIRS: Pair[] = [
  {
    slug: 'employer-dashboard',
    prototype: 'admin.html',
    prodPath: '/employer',
  },
  {
    slug: 'employer-cohorts-list',
    prototype: 'settings-employers.html',
    prodPath: '/employer/cohorts',
  },
  {
    slug: 'employer-interns-list',
    prototype: 'interns-dashboard.html',
    prodPath: '/employer/interns',
  },
  {
    slug: 'employer-profile',
    prototype: 'settings-employer.html',
    prodPath: '/employer/profile',
  },
  {
    slug: 'employer-roles-list',
    prototype: 'settings-employer.html',
    prodPath: '/employer/roles',
  },
  {
    slug: 'employer-roles-new',
    prototype: 'role-new.html',
    prodPath: '/employer/roles/new',
  },
];

async function login(context: BrowserContext): Promise<void> {
  const page = await context.newPage();
  await page.setViewportSize(VIEWPORT);
  await page.goto(`${PROD_BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name=email]', EMP_EMAIL);
  await page.fill('input[name=password]', EMP_PASSWORD);
  await Promise.all([page.waitForURL(/\/employer(\/.*)?$/), page.click('button[type=submit]')]);
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
  empCtx: BrowserContext,
  pair: Pair,
): Promise<void> {
  console.log(`  • ${pair.slug}`);
  const protoUrl = pathToFileURL(path.join(PROTOTYPE_DIR, pair.prototype)).href;
  const pubPage = await publicCtx.newPage();
  await pubPage.setViewportSize(VIEWPORT);
  await capture(pubPage, protoUrl, path.join(OUT_DIR, `${pair.slug}__a-prototype.png`));
  await pubPage.close();

  const empPage = await empCtx.newPage();
  await empPage.setViewportSize(VIEWPORT);
  await capture(
    empPage,
    `${PROD_BASE}${pair.prodPath}`,
    path.join(OUT_DIR, `${pair.slug}__b-production.png`),
  );
  await empPage.close();
}

async function firstId(empCtx: BrowserContext, listPath: string): Promise<string | null> {
  const page = await empCtx.newPage();
  await page.setViewportSize(VIEWPORT);
  await page.goto(`${PROD_BASE}${listPath}`, { waitUntil: 'networkidle' });
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
  const empCtx = await browser.newContext();

  console.log(`Logging in employer (${EMP_EMAIL}) …`);
  await login(empCtx);

  for (const pair of STATIC_PAIRS) {
    await snapPair(publicCtx, empCtx, pair);
  }

  // Resolve detail-route IDs from the first row of each list.
  const cohortId = await firstId(empCtx, '/employer/cohorts');
  if (cohortId) {
    await snapPair(publicCtx, empCtx, {
      slug: 'employer-cohort-detail',
      prototype: 'cohort-detail.html',
      prodPath: `/employer/cohorts/${cohortId}`,
    });
  } else {
    console.warn('No employer cohort found — skipping cohort-detail');
  }

  const internId = await firstId(empCtx, '/employer/interns');
  if (internId) {
    await snapPair(publicCtx, empCtx, {
      slug: 'employer-intern-record',
      prototype: 'intern-record.html',
      prodPath: `/employer/interns/${internId}`,
    });
    await snapPair(publicCtx, empCtx, {
      slug: 'employer-competency-new',
      prototype: 'competency-new.html',
      prodPath: `/employer/competency/new?internId=${internId}`,
    });
    await snapPair(publicCtx, empCtx, {
      slug: 'employer-exit-survey',
      prototype: 'exit-employer-survey.html',
      prodPath: `/employer/exit-survey?internId=${internId}`,
    });
  } else {
    console.warn(
      'No employer intern found — skipping intern-record / competency-new / exit-survey',
    );
  }

  const roleId = await firstId(empCtx, '/employer/roles');
  if (roleId) {
    await snapPair(publicCtx, empCtx, {
      slug: 'employer-role-detail',
      prototype: 'role-detail.html',
      prodPath: `/employer/roles/${roleId}`,
    });
  } else {
    console.warn('No employer role found — skipping role-detail');
  }

  await browser.close();
  console.log(`\nDone. Captured screenshots in ${OUT_DIR}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
