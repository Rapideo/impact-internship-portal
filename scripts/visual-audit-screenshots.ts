import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.test', override: false });

import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROTOTYPE_DIR =
  process.env.AUDIT_PROTOTYPE_DIR ?? 'C:/Projects/impact-prototype/Prototypes/PROTOTYPE';
const PROD_BASE = process.env.AUDIT_BASE_URL ?? 'http://localhost:5173';
// SP7 Phase H extension — default to the close-out reference set. Older
// per-phase folders (2026-05-18, 2026-05-18-sp7-d1/d2/e1/g) remain on disk
// as the historical phase-by-phase references that backed Gates G3–G7.
const OUT_DIR =
  process.env.AUDIT_OUT_DIR ?? 'docs/superpowers/visual-fidelity-screenshots/2026-05-19-final';
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

// SP7 Phase H extension — resolve the first matching id from a list-page
// row. Mirrors the helper in `scripts/visual-audit-screenshots-g.ts` but
// generalized so admin + employer list crawls can share it. Returns null
// if the list is empty (e.g. the cohort/role table has no seeded rows
// for the chosen context); callers skip the corresponding detail capture.
async function firstIdFromList(
  ctx: BrowserContext,
  listPath: string,
  idPathPrefix: string,
): Promise<string | null> {
  const page = await ctx.newPage();
  await page.setViewportSize(VIEWPORT);
  try {
    await page.goto(`${PROD_BASE}${listPath}`, { waitUntil: 'networkidle', timeout: 30_000 });
  } catch {
    await page.goto(`${PROD_BASE}${listPath}`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  }
  await page.waitForTimeout(300);
  const id = await page
    .locator(`a[href*="${idPathPrefix}/"]`)
    .first()
    .evaluate((el: HTMLAnchorElement) => {
      const href = el.getAttribute('href') ?? '';
      const match = href.match(/[0-9a-f-]{36}/);
      return match ? match[0] : null;
    })
    .catch(() => null);
  await page.close();
  return id;
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

  // ----- SP7 Phase H — detail-route crawl ----------------------------------
  // Each pair below: navigate to the list, resolve the first row's UUID,
  // capture both the prototype HTML (static, no id needed) AND the
  // production detail page hydrated with the resolved UUID. Pairs whose
  // list is empty fall through with a warning (the prototype side still
  // captures, so the audit retains the visual reference even when no row
  // is available locally).
  console.log('\nDetail-route crawl …');

  type DetailPair = {
    slug: string;
    prototype: string;
    listPath: string;
    idPathPrefix: string;
    detailPath: (id: string) => string;
    auth: AuthCtx;
  };
  const detailPairs: DetailPair[] = [
    // Admin Settings — cohort detail (first cohort under the seeded admin scope).
    {
      slug: 'admin-cohort-detail',
      prototype: 'cohort-detail.html',
      listPath: '/admin/settings/employers',
      idPathPrefix: '/admin/settings/cohorts',
      detailPath: (id) => `/admin/settings/cohorts/${id}`,
      auth: 'admin',
    },
    // Admin Settings — role detail (first role under any seeded employer).
    {
      slug: 'admin-role-detail',
      prototype: 'role-detail.html',
      listPath: '/admin/settings/employers',
      idPathPrefix: '/admin/settings/roles',
      detailPath: (id) => `/admin/settings/roles/${id}`,
      auth: 'admin',
    },
    // Admin Interns — record (edit mode) hydrated with the first seeded intern.
    {
      slug: 'admin-intern-record',
      prototype: 'intern-record.html',
      listPath: '/admin/interns',
      idPathPrefix: '/admin/interns',
      detailPath: (id) => `/admin/interns/${id}`,
      auth: 'admin',
    },
    // Admin Settings — question set editor (Personal Goals — fixed slug, no
    // crawl needed, but reuse the detail capture flow for symmetry).
    {
      slug: 'admin-question-set-personal-goals',
      prototype: 'settings-question-set.html',
      listPath: '/admin/settings/questions',
      idPathPrefix: '/admin/settings/questions',
      detailPath: () => `/admin/settings/questions/personal-goals`,
      auth: 'admin',
    },
    // Employer — intern record (first scoped intern for employer1).
    {
      slug: 'employer-intern-record',
      prototype: 'intern-record.html',
      listPath: '/employer/interns',
      idPathPrefix: '/employer/interns',
      detailPath: (id) => `/employer/interns/${id}`,
      auth: 'employer',
    },
    // Employer — cohort detail.
    {
      slug: 'employer-cohort-detail',
      prototype: 'cohort-detail.html',
      listPath: '/employer/cohorts',
      idPathPrefix: '/employer/cohorts',
      detailPath: (id) => `/employer/cohorts/${id}`,
      auth: 'employer',
    },
    // Employer — role detail.
    {
      slug: 'employer-role-detail',
      prototype: 'role-detail.html',
      listPath: '/employer/roles',
      idPathPrefix: '/employer/roles',
      detailPath: (id) => `/employer/roles/${id}`,
      auth: 'employer',
    },
  ];

  for (const d of detailPairs) {
    console.log(`  • ${d.slug}`);
    const ctx = ctxFor(d.auth);
    // Capture the prototype reference regardless of whether a live row exists.
    const proto = pathToFileURL(path.join(PROTOTYPE_DIR, d.prototype)).href;
    await capture(publicCtx, proto, path.join(OUT_DIR, `${d.slug}__a-prototype.png`));

    // For the question-set editor we skip the list crawl — the editor is
    // reached by a fixed slug. Others crawl the list for a UUID first.
    let prodUrl: string;
    if (d.slug === 'admin-question-set-personal-goals') {
      prodUrl = `${PROD_BASE}${d.detailPath('personal-goals')}`;
    } else {
      const id = await firstIdFromList(ctx, d.listPath, d.idPathPrefix);
      if (!id) {
        console.warn(`    ! No row found in ${d.listPath} — skipping production capture`);
        continue;
      }
      prodUrl = `${PROD_BASE}${d.detailPath(id)}`;
    }
    await capture(ctx, prodUrl, path.join(OUT_DIR, `${d.slug}__b-production.png`));
  }

  // Capture the competency detail (a different shape — requires a
  // (intern, type='competency') submission already in the DB). The
  // admin-competency e2e spec creates one transiently; for the static
  // audit we look up the first competency submission from the API path.
  console.log('  • admin-competency-detail');
  const compProto = pathToFileURL(path.join(PROTOTYPE_DIR, 'competency-detail.html')).href;
  await capture(
    publicCtx,
    compProto,
    path.join(OUT_DIR, `admin-competency-detail__a-prototype.png`),
  );
  // No deterministic seeded competency submission today — production capture
  // would require running the e2e spec first. The prototype-side reference
  // is the source of truth for layout review; production capture deferred
  // to manual walk during Gate G8 when the admin walks through a live
  // submission anyway.

  // Self-assessment detail (admin viewer) — same shape as competency-detail:
  // requires an existing personal-goals/midpoint/feedback submission. The
  // prototype reference is captured; production walk happens during G8.
  console.log('  • admin-self-assessment-detail');
  const selfProto = pathToFileURL(path.join(PROTOTYPE_DIR, 'self-assessment-detail.html')).href;
  await capture(
    publicCtx,
    selfProto,
    path.join(OUT_DIR, `admin-self-assessment-detail__a-prototype.png`),
  );

  await browser.close();

  const files = await readdir(OUT_DIR);
  console.log(`\nDone. Captured ${files.length} screenshots in ${OUT_DIR}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
