// SP7 Phase D2 visual-audit capture — intern flow only.
//
// The 3 form pages need a confirmed intern-identity cookie or they redirect
// to /intern/assessments. We satisfy the gate via a POST submit against the
// real action handler (seeded intern A. Whitaker, cohort 333…01, employer
// derived). After the redirect we have a signed cookie in the BrowserContext
// and can capture each form + the confirmation page.

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.test', override: false });

import { chromium, type Browser, type BrowserContext } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PROTOTYPE_DIR = 'C:/Projects/impact-prototype/Prototypes/PROTOTYPE';
const PROD_BASE = process.env.AUDIT_BASE_URL ?? 'http://localhost:5176';
const OUT_DIR = 'docs/superpowers/visual-fidelity-screenshots/2026-05-18-sp7-d2';
const VIEWPORT = { width: 1440, height: 900 } as const;

// Seeded intern: A. Whitaker → cohort 33333333-3333-3333-3333-333333333301
// (employer 11111111-1111-1111-1111-111111111101 per seed-data).
const IDENTITY = {
  firstInitial: 'A',
  lastName: 'Whitaker',
  employerId: '11111111-1111-1111-1111-111111111101',
  cohortId: '33333333-3333-3333-3333-333333333301',
};

type Pair = { slug: string; prototype?: string; prodPath: string; needsIdentity: boolean };

const PAIRS: Pair[] = [
  {
    slug: 'intern-assessments-gate',
    prototype: 'intern-assessments.html',
    prodPath: '/intern/assessments',
    needsIdentity: false,
  },
  {
    slug: 'intern-assessments-confirmed',
    prototype: 'intern-assessments.html',
    prodPath: '/intern/assessments',
    needsIdentity: true,
  },
  {
    slug: 'intern-personal-goals',
    prototype: 'personal-goals.html',
    prodPath: '/intern/personal-goals',
    needsIdentity: true,
  },
  {
    slug: 'intern-midpoint-reflection',
    prototype: 'midpoint-reflection.html',
    prodPath: '/intern/midpoint-reflection',
    needsIdentity: true,
  },
  {
    slug: 'intern-participant-feedback',
    prototype: 'participant-feedback.html',
    prodPath: '/intern/participant-feedback',
    needsIdentity: true,
  },
  {
    slug: 'intern-confirmation',
    prototype: 'assessment-confirmation.html',
    prodPath: '/intern/confirmation?type=personal-goals',
    needsIdentity: false,
  },
];

async function confirmIdentity(context: BrowserContext): Promise<void> {
  // Bypass the client-side cascade by POSTing the form directly to the
  // server action. The action signs + Set-Cookie's the identity; the
  // BrowserContext request helper funnels Set-Cookie into the context's
  // cookie jar automatically.
  const form = new URLSearchParams({
    intent: 'confirm',
    firstInitial: IDENTITY.firstInitial,
    lastName: IDENTITY.lastName,
    employerId: IDENTITY.employerId,
    cohortId: IDENTITY.cohortId,
  });
  const resp = await context.request.post(`${PROD_BASE}/intern/assessments`, {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    data: form.toString(),
    maxRedirects: 0,
  });
  console.log(`identity confirm: HTTP ${resp.status()}`);
  // Verify the cookie landed by hitting /intern/assessments and checking
  // for the post-confirm "Submitted" / chooser-card markup.
  const page = await context.newPage();
  await page.setViewportSize(VIEWPORT);
  await page.goto(`${PROD_BASE}/intern/assessments`, { waitUntil: 'networkidle' });
  const isConfirmed = await page.evaluate(
    () => !!document.querySelector('[data-testid="identity-confirmed-chip"]'),
  );
  console.log(`post-confirm chip present: ${isConfirmed}`);
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

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser: Browser = await chromium.launch();
  const anonCtx = await browser.newContext();
  const identCtx = await browser.newContext();
  console.log('Confirming identity for intern A. Whitaker …');
  await confirmIdentity(identCtx);

  for (const pair of PAIRS) {
    console.log(`  • ${pair.slug}`);
    if (pair.prototype) {
      const proto = pathToFileURL(path.join(PROTOTYPE_DIR, pair.prototype)).href;
      await capture(anonCtx, proto, path.join(OUT_DIR, `${pair.slug}__a-prototype.png`));
    }
    const ctx = pair.needsIdentity ? identCtx : anonCtx;
    await capture(
      ctx,
      `${PROD_BASE}${pair.prodPath}`,
      path.join(OUT_DIR, `${pair.slug}__b-production.png`),
    );
  }

  await browser.close();
  console.log(`\nDone. Screenshots in ${OUT_DIR}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
