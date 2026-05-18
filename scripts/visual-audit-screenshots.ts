import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.test', override: false });

import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROTOTYPE_DIR = 'C:/Projects/impact-prototype/Prototypes/PROTOTYPE';
const PROD_BASE = process.env.AUDIT_BASE_URL ?? 'http://localhost:5174';
const OUT_DIR = 'docs/superpowers/visual-fidelity-screenshots/2026-05-18';
const VIEWPORT = { width: 1440, height: 900 } as const;

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'DevPassword123!';
const EMPLOYER_EMAIL = process.env.E2E_EMPLOYER_EMAIL ?? 'employer1@example.com';
const EMPLOYER_PASSWORD = process.env.E2E_EMPLOYER_PASSWORD ?? 'DevPassword123!';

type AuthCtx = 'none' | 'admin' | 'employer';
type Pair = {
  slug: string;
  prototype?: string;
  prodPath?: string;
  auth: AuthCtx;
};

const PROD_PAIRS: Pair[] = [
  { slug: 'landing', prototype: 'index.html', prodPath: '/', auth: 'none' },
  { slug: 'login', prototype: 'login.html', prodPath: '/login', auth: 'none' },
  { slug: 'auth-forgot', prodPath: '/auth/forgot', auth: 'none' },
  {
    slug: 'intern-assessments',
    prototype: 'intern-assessments.html',
    prodPath: '/intern/assessments',
    auth: 'none',
  },
  {
    slug: 'intern-personal-goals',
    prototype: 'personal-goals.html',
    prodPath: '/intern/personal-goals',
    auth: 'none',
  },
  {
    slug: 'intern-midpoint-reflection',
    prototype: 'midpoint-reflection.html',
    prodPath: '/intern/midpoint-reflection',
    auth: 'none',
  },
  {
    slug: 'intern-participant-feedback',
    prototype: 'participant-feedback.html',
    prodPath: '/intern/participant-feedback',
    auth: 'none',
  },
  {
    slug: 'intern-confirmation',
    prototype: 'assessment-confirmation.html',
    prodPath: '/intern/confirmation?type=personal-goals',
    auth: 'none',
  },
  {
    slug: 'not-found',
    prototype: '404.html',
    prodPath: '/this-route-does-not-exist',
    auth: 'none',
  },

  { slug: 'admin-home', prototype: 'admin.html', prodPath: '/admin', auth: 'admin' },
  {
    slug: 'admin-interns',
    prototype: 'interns-dashboard.html',
    prodPath: '/admin/interns',
    auth: 'admin',
  },
  {
    slug: 'admin-interns-new',
    prototype: 'intern-record.html',
    prodPath: '/admin/interns/new',
    auth: 'admin',
  },
  {
    slug: 'admin-assessments-hub',
    prototype: 'assessments.html',
    prodPath: '/admin/assessments',
    auth: 'admin',
  },
  {
    slug: 'admin-exit-employer-survey',
    prototype: 'exit-employer-survey.html',
    prodPath: '/admin/assessments/exit-employer-survey',
    auth: 'admin',
  },
  {
    slug: 'admin-self-results',
    prototype: 'self-assessment-results.html',
    prodPath: '/admin/self-assessment-results',
    auth: 'admin',
  },
  {
    slug: 'admin-settings-employers',
    prototype: 'settings-employers.html',
    prodPath: '/admin/settings/employers',
    auth: 'admin',
  },
  {
    slug: 'admin-settings-phases',
    prototype: 'settings-phases.html',
    prodPath: '/admin/settings/phases',
    auth: 'admin',
  },
  {
    slug: 'admin-settings-barriers',
    prototype: 'settings-barriers.html',
    prodPath: '/admin/settings/barriers',
    auth: 'admin',
  },
  {
    slug: 'admin-settings-program-info',
    prototype: 'settings-program-info.html',
    prodPath: '/admin/settings/program-info',
    auth: 'admin',
  },
  {
    slug: 'admin-settings-questions',
    prototype: 'settings-questions.html',
    prodPath: '/admin/settings/questions',
    auth: 'admin',
  },
  {
    slug: 'admin-settings-competency',
    prototype: 'settings-competency.html',
    prodPath: '/admin/settings/questions/competency',
    auth: 'admin',
  },

  { slug: 'employer-home', prodPath: '/employer', auth: 'employer' },
  { slug: 'employer-cohorts', prodPath: '/employer/cohorts', auth: 'employer' },
  { slug: 'employer-interns', prodPath: '/employer/interns', auth: 'employer' },
  { slug: 'employer-profile', prodPath: '/employer/profile', auth: 'employer' },
  { slug: 'employer-roles', prodPath: '/employer/roles', auth: 'employer' },
  { slug: 'employer-roles-new', prodPath: '/employer/roles/new', auth: 'employer' },
];

// Prototype-only HTMLs that have no current production counterpart in pass 1 (most are
// detail routes; we'll crawl matching prod routes in pass 2). Capturing all of them now
// gives the audit a complete prototype reference library.
const PROTOTYPE_ONLY_EXTRA: { slug: string; prototype: string }[] = [
  { slug: 'cohort-detail', prototype: 'cohort-detail.html' },
  { slug: 'cohort-edit', prototype: 'cohort-edit.html' },
  { slug: 'cohort-new', prototype: 'cohort-new.html' },
  { slug: 'role-detail', prototype: 'role-detail.html' },
  { slug: 'role-new', prototype: 'role-new.html' },
  { slug: 'role-edit', prototype: 'role-edit.html' },
  { slug: 'settings-employer', prototype: 'settings-employer.html' },
  { slug: 'settings-employer-form', prototype: 'settings-employer-form.html' },
  { slug: 'settings-question-set', prototype: 'settings-question-set.html' },
  { slug: 'competency-new', prototype: 'competency-new.html' },
  { slug: 'competency-edit', prototype: 'competency-edit.html' },
  { slug: 'competency-detail', prototype: 'competency-detail.html' },
  { slug: 'competency-cohort-set', prototype: 'competency-cohort-set.html' },
  { slug: 'competency-intern-set', prototype: 'competency-intern-set.html' },
  { slug: 'self-assessment-detail', prototype: 'self-assessment-detail.html' },
  { slug: 'reports', prototype: 'reports.html' },
];

async function login(context: BrowserContext, email: string, password: string, role: AuthCtx) {
  const page = await context.newPage();
  await page.setViewportSize(VIEWPORT);
  await page.goto(`${PROD_BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', password);
  await Promise.all([
    page.waitForURL(new RegExp(`/${role}(/.*)?$`)),
    page.click('button[type=submit]'),
  ]);
  await page.close();
}

async function capture(context: BrowserContext, url: string, outPath: string): Promise<string> {
  const page = await context.newPage();
  await page.setViewportSize(VIEWPORT);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  } catch {
    // networkidle can stall on long-poll-style routes; fall back to domcontentloaded
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  }
  // Small settle so any client-mounted layout finishes painting.
  await page.waitForTimeout(500);
  await page.screenshot({ path: outPath, fullPage: true });
  await page.close();
  return outPath;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser: Browser = await chromium.launch();
  const publicCtx = await browser.newContext();
  const adminCtx = await browser.newContext();
  const employerCtx = await browser.newContext();

  console.log('Logging in admin + employer …');
  await Promise.all([
    login(adminCtx, ADMIN_EMAIL, ADMIN_PASSWORD, 'admin'),
    login(employerCtx, EMPLOYER_EMAIL, EMPLOYER_PASSWORD, 'employer'),
  ]);

  const ctxFor = (auth: AuthCtx): BrowserContext =>
    auth === 'admin' ? adminCtx : auth === 'employer' ? employerCtx : publicCtx;

  for (const pair of PROD_PAIRS) {
    console.log(`  • ${pair.slug}`);
    if (pair.prototype) {
      const proto = pathToFileURL(path.join(PROTOTYPE_DIR, pair.prototype)).href;
      await capture(publicCtx, proto, path.join(OUT_DIR, `${pair.slug}__a-prototype.png`));
    }
    if (pair.prodPath) {
      await capture(
        ctxFor(pair.auth),
        `${PROD_BASE}${pair.prodPath}`,
        path.join(OUT_DIR, `${pair.slug}__b-production.png`),
      );
    }
  }

  for (const extra of PROTOTYPE_ONLY_EXTRA) {
    console.log(`  • ${extra.slug} (prototype-only)`);
    const proto = pathToFileURL(path.join(PROTOTYPE_DIR, extra.prototype)).href;
    await capture(publicCtx, proto, path.join(OUT_DIR, `${extra.slug}__a-prototype.png`));
  }

  await browser.close();

  const files = await readdir(OUT_DIR);
  console.log(`\nDone. Captured ${files.length} screenshots in ${OUT_DIR}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
