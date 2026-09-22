// tests/guards/dev-only-gating.test.ts
//
// Tripwire: dev-only features must be gated on a BUILD-time signal, never on
// `process.env.NODE_ENV` read at runtime.
//
// The two disagree on Netlify. Netlify sets NODE_ENV=production while it runs
// the build, so `app/routes.ts` (evaluated at build time) correctly leaves
// /dev/primitives and /dev/reseed unregistered. But the Lambda that serves the
// result has NODE_ENV *unset*, so a runtime `process.env.NODE_ENV !==
// 'production'` check evaluates to true — in production and on staging alike.
//
// That mismatch shipped: on 2026-09-22 the staging Settings -> Program Info
// page rendered a red "Danger Zone / RESEED DEV DATA" button (runtime gate said
// dev) whose POST target returned 404 (build gate said not-dev). Harmless, but
// it was about to be put in front of a group of testers.
//
// `import.meta.env.DEV` is substituted by Vite at build time, so it agrees with
// the routes.ts gate in every environment.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP = join(__dirname, '..', '..', 'app');

/** Files that decide whether a dev-only feature is visible or reachable. */
const GATED_FILES = [
  'routes/admin.settings.program-info.tsx',
  'routes/dev.reseed.ts',
  'routes/dev.primitives.tsx',
];

function read(rel: string): string {
  return readFileSync(join(APP, rel), 'utf8');
}

/** Strip comments so prose about NODE_ENV doesn't trip the check. */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

describe('dev-only feature gating', () => {
  it.each(GATED_FILES)('%s does not gate on runtime process.env.NODE_ENV', (rel) => {
    expect(code(read(rel))).not.toMatch(/process\.env\.NODE_ENV/);
  });

  it('the Program Info Danger Zone is gated on the build-time flag', () => {
    const src = code(read('routes/admin.settings.program-info.tsx'));
    expect(src).toMatch(/dangerZoneEnabled\s*=\s*import\.meta\.env\.DEV/);
  });

  it('the reseed route still refuses when not built for dev', () => {
    const src = code(read('routes/dev.reseed.ts'));
    expect(src).toMatch(/import\.meta\.env\.DEV/);
  });

  it('route registration stays build-time evaluated', () => {
    // routes.ts is read by the Vite config, not bundled, so process.env is the
    // correct signal THERE — this pins that it keeps gating at all.
    const src = code(readFileSync(join(APP, 'routes.ts'), 'utf8'));
    expect(src).toMatch(/dev\/reseed/);
    expect(src).toMatch(/NODE_ENV !== 'production'/);
  });
});
