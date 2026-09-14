// tests/guards/unit-project-no-raw-sql.test.ts
//
// Tripwire: nothing in the UNIT project may open a raw postgres-js client or
// carry a destructive SQL literal. `tests/setup.ts` loads `.env.local` for
// this project, which on a developer machine is the shared impact-dev cloud
// database — so a unit test that writes is a unit test that writes to
// impact-dev on every `npm test`.
//
// That is exactly what happened: tests/lib/assessment-submissions.server.test.ts
// (SP4, 2026-05-13) ran `DELETE FROM assessment_submissions WHERE intern_id = …`
// in a beforeEach, and from May to 2026-09-14 every `npm test` erased one
// intern's real submissions on impact-dev — including the July-2026 tester
// data behind the "Whitaker data-loss" report. Live-DB tests belong in the
// `rls` project (tests/rls/**), whose setup file refuses any non-local host.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
// Mirrors vitest.config.ts: the unit project is tests/** minus these.
const EXCLUDED_DIRS = new Set(['e2e', 'rls', 'components']);

function unitProjectTestFiles(dir = ROOT, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (dir === ROOT && EXCLUDED_DIRS.has(name)) continue;
      unitProjectTestFiles(full, out);
    } else if (/\.(test|spec)\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const FORBIDDEN: ReadonlyArray<[string, RegExp]> = [
  ['a raw postgres-js client (`postgres(`)', /\bpostgres\(/],
  ['a DELETE statement', /\bDELETE\s+FROM\b/i],
  ['a TRUNCATE statement', /\bTRUNCATE\b/i],
  ['an INSERT statement', /\bINSERT\s+INTO\b/i],
];

describe('unit project must not touch a live database', () => {
  it('no unit-project test opens a raw SQL client or carries a destructive SQL literal', () => {
    const offenders: string[] = [];
    for (const file of unitProjectTestFiles()) {
      if (file === __filename) continue;
      // Scan code, not commentary — a comment may legitimately mention TRUNCATE.
      const src = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      for (const [what, re] of FORBIDDEN) {
        if (re.test(src)) offenders.push(`${relative(ROOT, file)} — ${what}`);
      }
    }
    expect(offenders, 'move live-DB tests under tests/rls/ (guarded project)').toEqual([]);
  });
});
