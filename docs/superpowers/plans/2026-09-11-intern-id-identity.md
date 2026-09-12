# Intern ID Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the intern's First Initial + Last Name identity with a portal-assigned, immutable Intern ID (`IMP-YY-NNNN`), so the portal stores no name of any kind.

**Architecture:** Three sequential PRs, each a coherent deployable state. **PR A** adds `intern_code` (backfilled, `NOT NULL`, plain unique index), the pure format/normalize/year module, the insert-with-retry generator, and the admin "ID issued" callout — names stay. **PR B** switches the anonymous identity to `(internCode, cohortId)`: lookup, cookie contract, chooser (Employer → Cohort → Intern ID), and a per-IP failure throttle backed by a new `identity_attempts` table. **PR C** removes the name columns, every name rendering, and the name-based seeds/tests.

**Tech Stack:** React Router v7 (config routing), Drizzle 0.36 + postgres-js, Supabase Postgres, Vitest 3, Playwright, hand-written SQL migrations with drizzle-kit snapshots.

**Spec:** `docs/superpowers/specs/2026-09-11-intern-id-identity-design.md` — the plan argues from it; read both.

## Global Constraints

- ID format `IMP-YY-NNNN`; canonical regex `^IMP-\d{2}-\d{4}$`; `NNNN` ∈ `0001`–`9999`; prefix `IMP` is a code constant (spec D1, D2, D4).
- Year = intern Start Date's year if present, else "now" in `America/Indiana/Indianapolis` (D3). The IANA zone already lives in `app/lib/format.ts` as `PROGRAM_TIME_ZONE`.
- Unique index on `intern_code` is **plain** — not partial on `deleted_at IS NULL` (D5).
- No route, action, form, or script writes `intern_code` after insert (D6).
- Throttle: ≥ 10 **failed** lookups per IP in 15 minutes → refused; fails open (D8).
- `dbService` (service-role client) is allowed in exactly two anonymous paths: the submission insert and the identity throttle. Nowhere else.
- All migrations are hand-written or hand-verified; every one is proven by re-running `npx drizzle-kit generate` and getting "No schema changes, nothing to migrate".
- Conventional Commits, subject ≤ 72 chars, body lines ≤ 100 chars. Husky runs lint-staged (prettier) on commit — re-`git add` if prettier reformats.
- Every PR: impact-dev backup → migrate impact-dev → force-push branch to `staging` → Matt verifies → explicit approval → squash-merge → prod migration in the per-PR order (§9 of the spec). Merging is a production deploy; never assume approval carried over.
- Never run `npm run test:rls` without `supabase start` (the setup guard refuses non-local hosts — do not disable it). CI runs it for you.
- Windows dev box, git bash. No Docker locally: RLS tests are verified in CI, not locally.
- Copy is user-facing and fixed by the spec — use the exact strings given in each task.

---

# PR A — Issue IDs (`feat/intern-code-issue`)

State after A: every intern has an `intern_code`; new interns get one on create and the admin sees an "ID issued" callout; the ID shows on the intern list and detail alongside the name. Names are still stored, entered and displayed. Migrate prod **before** merging.

### Task A1: Pre-flight

**Files:** none (verification only)

- [ ] **Step 1: Confirm the branch and the spec commit**

```bash
git checkout feat/intern-code-issue
git log --oneline -1
```
Expected: `ca02052 docs(spec): intern ID identity design` (or a later commit on this branch). If the branch does not exist: `git checkout -b feat/intern-code-issue main`.

- [ ] **Step 2: Confirm a fresh impact-dev backup exists**

Supabase dashboard → project `impact-dev` (`zdrxxcbhiovoaubkcqfj`) → Database → Backups. There must be a backup dated **today**. If not, click **Create backup** (Pro plan) and wait for it to complete. Record the timestamp in the PR description later.

- [ ] **Step 3: Baseline the suites**

```bash
npm run lint && npm run typecheck && npm test -- --run
```
Expected: lint clean, typecheck clean, all unit tests pass. If anything is red before you start, stop and report — do not proceed on a red baseline.

- [ ] **Step 4: Commit the plan**

```bash
git add docs/superpowers/plans/2026-09-11-intern-id-identity.md
git commit -m "docs(plan): intern ID identity implementation plan"
```

---

### Task A2: Pure Intern ID module

**Files:**
- Modify: `app/lib/format.ts:99` (export the timezone constant)
- Create: `app/lib/intern-code.ts`
- Test: `tests/lib/intern-code.test.ts`

**Interfaces:**
- Produces: `INTERN_CODE_RE: RegExp`, `INTERN_CODE_MIN = 1`, `INTERN_CODE_MAX = 9999`, `formatInternCode(yy: number, n: number): string`, `normalizeInternCode(input: string): string | null`, `yearForInternCode(startDate: string | null | undefined, now?: Date): number`, and `PROGRAM_TIME_ZONE` exported from `format.ts`.

- [ ] **Step 1: Export the timezone constant**

In `app/lib/format.ts` change line 99 from
```ts
const PROGRAM_TIME_ZONE = 'America/Indiana/Indianapolis';
```
to
```ts
export const PROGRAM_TIME_ZONE = 'America/Indiana/Indianapolis';
```

- [ ] **Step 2: Write the failing tests**

Create `tests/lib/intern-code.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  INTERN_CODE_RE,
  formatInternCode,
  normalizeInternCode,
  yearForInternCode,
} from '~/lib/intern-code';

describe('formatInternCode', () => {
  it('zero-pads year and number', () => {
    expect(formatInternCode(26, 417)).toBe('IMP-26-0417');
    expect(formatInternCode(7, 1)).toBe('IMP-07-0001');
    expect(formatInternCode(26, 9999)).toBe('IMP-26-9999');
  });

  it('rejects out-of-range inputs', () => {
    expect(() => formatInternCode(26, 0)).toThrow(RangeError);
    expect(() => formatInternCode(26, 10000)).toThrow(RangeError);
    expect(() => formatInternCode(100, 1)).toThrow(RangeError);
    expect(() => formatInternCode(26, 1.5)).toThrow(RangeError);
  });

  it('produces canonical form', () => {
    expect(INTERN_CODE_RE.test(formatInternCode(26, 417))).toBe(true);
  });
});

describe('normalizeInternCode', () => {
  it('accepts the canonical form unchanged', () => {
    expect(normalizeInternCode('IMP-26-0417')).toBe('IMP-26-0417');
  });

  it('accepts lower-case, no hyphens, and spaces', () => {
    expect(normalizeInternCode('imp260417')).toBe('IMP-26-0417');
    expect(normalizeInternCode('imp-26-0417')).toBe('IMP-26-0417');
    expect(normalizeInternCode('IMP 26 0417')).toBe('IMP-26-0417');
    expect(normalizeInternCode('  imp - 26 - 0417 ')).toBe('IMP-26-0417');
  });

  it('rejects wrong prefix, wrong length, and letters in the number', () => {
    expect(normalizeInternCode('IMX-26-0417')).toBeNull();
    expect(normalizeInternCode('IMP-26-417')).toBeNull();
    expect(normalizeInternCode('IMP-26-04170')).toBeNull();
    expect(normalizeInternCode('IMP-2A-0417')).toBeNull();
    expect(normalizeInternCode('IMP-26-O417')).toBeNull(); // letter O
    expect(normalizeInternCode('')).toBeNull();
    expect(normalizeInternCode('J. Whitaker')).toBeNull();
  });
});

describe('yearForInternCode', () => {
  it('prefers the start date year when present', () => {
    expect(yearForInternCode('2026-01-12', new Date('2027-06-01T12:00:00Z'))).toBe(26);
    expect(yearForInternCode('2031-09-01', new Date('2026-06-01T12:00:00Z'))).toBe(31);
  });

  it('falls back to now in the program timezone when start date is missing', () => {
    expect(yearForInternCode(null, new Date('2026-06-01T12:00:00Z'))).toBe(26);
    expect(yearForInternCode(undefined, new Date('2026-06-01T12:00:00Z'))).toBe(26);
  });

  it('falls back to now when the start date is malformed', () => {
    expect(yearForInternCode('not-a-date', new Date('2026-06-01T12:00:00Z'))).toBe(26);
  });

  it('uses the Indiana year, not the UTC year, at the New Year boundary', () => {
    // 2027-01-01 04:30 UTC is 2026-12-31 23:30 in America/Indiana/Indianapolis (UTC-5).
    expect(yearForInternCode(null, new Date('2027-01-01T04:30:00Z'))).toBe(26);
    // 2027-01-01 05:30 UTC is 2027-01-01 00:30 in Indiana.
    expect(yearForInternCode(null, new Date('2027-01-01T05:30:00Z'))).toBe(27);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/lib/intern-code.test.ts`
Expected: FAIL — `Cannot find module '~/lib/intern-code'`.

- [ ] **Step 4: Implement the module**

Create `app/lib/intern-code.ts`:

```ts
// Intern ID — the portal-assigned identifier that replaced First Initial +
// Last Name (spec: docs/superpowers/specs/2026-09-11-intern-id-identity-design.md).
//
// Format: IMP-YY-NNNN, e.g. IMP-26-0417.
//   IMP   the IMPACT program; a constant, not a setting (D2)
//   YY    year the intern entered the program (D3)
//   NNNN  0001–9999, drawn at random, unique across all interns (D4, D5)
//
// This module is PURE and importable from client code. Database work lives in
// intern-code.server.ts.

import { PROGRAM_TIME_ZONE } from './format';

export const INTERN_CODE_PREFIX = 'IMP';
export const INTERN_CODE_RE = /^IMP-\d{2}-\d{4}$/;
export const INTERN_CODE_MIN = 1;
export const INTERN_CODE_MAX = 9999;

/** Canonical form from its parts. Throws RangeError on out-of-range input. */
export function formatInternCode(yy: number, n: number): string {
  if (!Number.isInteger(yy) || yy < 0 || yy > 99) {
    throw new RangeError(`Intern code year out of range: ${yy}`);
  }
  if (!Number.isInteger(n) || n < INTERN_CODE_MIN || n > INTERN_CODE_MAX) {
    throw new RangeError(`Intern code number out of range: ${n}`);
  }
  return `${INTERN_CODE_PREFIX}-${String(yy).padStart(2, '0')}-${String(n).padStart(4, '0')}`;
}

/**
 * Lenient input → canonical form, or null.
 * Accepts `imp260417`, `IMP 26 0417`, `imp-26-0417`; case-insensitive; ignores
 * whitespace and hyphens. Anything that is not exactly IMP + 6 digits is null.
 */
export function normalizeInternCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]+/g, '');
  const m = /^IMP(\d{2})(\d{4})$/.exec(compact);
  if (!m) return null;
  return `${INTERN_CODE_PREFIX}-${m[1]}-${m[2]}`;
}

/**
 * Two-digit year for a new intern's code (D3): the Start Date's year when the
 * admin entered one (schema stores it as YYYY-MM-DD text), else "today" in the
 * program timezone. Lambda runs on UTC; a record created at 11 pm on Dec 31
 * Indiana time must not carry next year's ID.
 */
export function yearForInternCode(
  startDate: string | null | undefined,
  now: Date = new Date(),
): number {
  if (startDate) {
    const m = /^(\d{4})-\d{2}-\d{2}$/.exec(startDate);
    if (m) return Number(m[1]) % 100;
  }
  const year = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: PROGRAM_TIME_ZONE, year: 'numeric' }).format(now),
  );
  return year % 100;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run tests/lib/intern-code.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add app/lib/format.ts app/lib/intern-code.ts tests/lib/intern-code.test.ts
git commit -m "feat(intern-id): pure format, normalize and year helpers"
```

---

### Task A3: Schema + migration 0005 (backfill on impact-dev)

**Files:**
- Modify: `db/schema.ts:210-234` (interns table)
- Create: `db/migrations/0005_intern_code.sql` (generated, then overwritten by hand)
- Generated: `db/migrations/meta/0005_snapshot.json`, `_journal.json` entry

**Interfaces:**
- Produces: `interns.internCode` (Drizzle column, `text NOT NULL`), unique index `interns_intern_code_unique`.

- [ ] **Step 1: Add the column and index to the schema**

In `db/schema.ts`, inside `interns`, add after `lastName`:

```ts
    internCode: text('intern_code').notNull(),
```

and inside the table's index callback, after `cohortIdx`:

```ts
    // Plain (not partial) — a soft-deleted intern's code stays reserved forever
    // so a card in someone's wallet can never point at a different person (D5).
    internCodeUnique: uniqueIndex('interns_intern_code_unique').on(t.internCode),
```

- [ ] **Step 2: Generate the migration scaffold (for the snapshot and journal)**

```bash
npx drizzle-kit generate --name intern_code
```

Expected: `db/migrations/0005_intern_code.sql` containing two statements — `ALTER TABLE "interns" ADD COLUMN "intern_code" text NOT NULL;` and `CREATE UNIQUE INDEX "interns_intern_code_unique" ON "interns" USING btree ("intern_code");` — plus `meta/0005_snapshot.json` and a new `_journal.json` entry. **The generated SQL would fail on impact-dev** (140 existing rows, `NOT NULL`, no default). We keep the snapshot and journal and replace the SQL.

- [ ] **Step 3: Overwrite the SQL with the hand-written migration**

Replace the entire contents of `db/migrations/0005_intern_code.sql` with:

```sql
-- Intern ID (spec 2026-09-11-intern-id-identity-design.md §5, PR A).
-- Hand-written: drizzle-kit's generated version adds the column NOT NULL in one
-- step, which fails on any database that already has interns. Add nullable,
-- backfill, then tighten. The snapshot records the destination (NOT NULL +
-- unique index), so `drizzle-kit generate` reports no changes afterwards.
ALTER TABLE "interns" ADD COLUMN "intern_code" text;--> statement-breakpoint
DO $$
DECLARE
  r RECORD;
  yy text;
  candidate text;
BEGIN
  FOR r IN SELECT id, start_date, created_at FROM interns WHERE intern_code IS NULL LOOP
    -- D3: year from start_date when it is a YYYY-MM-DD string, else the
    -- creation instant in the program timezone.
    yy := CASE
      WHEN r.start_date ~ '^\d{4}-\d{2}-\d{2}$' THEN substr(r.start_date, 3, 2)
      ELSE to_char(r.created_at AT TIME ZONE 'America/Indiana/Indianapolis', 'YY')
    END;
    LOOP
      -- D4: random 0001–9999; loop until unused.
      candidate := 'IMP-' || yy || '-' || lpad((1 + floor(random() * 9999))::int::text, 4, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM interns WHERE intern_code = candidate);
    END LOOP;
    UPDATE interns SET intern_code = candidate WHERE id = r.id;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "interns" ALTER COLUMN "intern_code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "interns_intern_code_unique" ON "interns" USING btree ("intern_code");
```

- [ ] **Step 4: Prove the snapshot matches the schema**

```bash
npx drizzle-kit generate
```
Expected output contains: `No schema changes, nothing to migrate 😴`. If it generates a `0006_*` file, the schema and snapshot disagree — delete the new file and its journal entry, fix the schema to match Step 1 exactly, and repeat.

- [ ] **Step 5: Apply to impact-dev**

`.env.local` already points at impact-dev.

```bash
npm run db:migrate
```
Expected: `[✓] migrations applied successfully!` (drizzle-kit wording).

- [ ] **Step 6: Verify the backfill**

```bash
npx tsx -e "
import { config } from 'dotenv'; config({ path: '.env.local' });
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const [a] = await sql\`select count(*)::int as total, count(intern_code)::int as coded, count(distinct intern_code)::int as distinct_codes from interns\`;
const bad = await sql\`select intern_code from interns where intern_code !~ '^IMP-\\\\d{2}-\\\\d{4}$' limit 5\`;
const sample = await sql\`select intern_code, start_date from interns order by random() limit 5\`;
console.log(a, 'malformed:', bad, 'sample:', sample);
await sql.end();
"
```
Expected: `total === coded === distinct_codes` (~140), `malformed: []`, and each sample's `intern_code` year matches its `start_date` year (e.g. `2026-01-19` → `IMP-26-…`).

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck
```
Expected: errors in `db/seed.ts`, `db/seed-demo.ts`, `tests/rls/reports-queries.test.ts` (inserts missing `internCode`) — these are fixed in Task A7. If you see errors elsewhere, stop and investigate.

```bash
git add db/schema.ts db/migrations/0005_intern_code.sql db/migrations/meta/0005_snapshot.json db/migrations/meta/_journal.json
git commit -m "feat(intern-id): add interns.intern_code with backfill migration"
```

---

### Task A4: Insert-with-retry generator

**Files:**
- Create: `app/lib/intern-code.server.ts`
- Test: `tests/lib/intern-code.server.test.ts`

**Interfaces:**
- Consumes: `formatInternCode`, `yearForInternCode`, `INTERN_CODE_MIN/MAX` from A2; `interns`, `internEntryAssessment`, `internParticipationFactors` from `db/schema.ts`; `db` + `type DB` from `app/lib/db.server.ts`.
- Produces:
  ```ts
  interface NewInternValues {
    cohortId: string; roleId: string | null;
    firstInitial: string; lastName: string;      // removed in PR C
    startDate: string | null; endDate: string | null;
    entryNotes: string | null; participationFactorIds: string[];
  }
  createInternWithCode(values: NewInternValues, opts?: { db?: DB; now?: Date; draw?: () => number })
    : Promise<{ id: string; internCode: string }>
  class InternCodeExhaustedError extends Error
  INTERN_CODE_MAX_ATTEMPTS = 10
  ```

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/intern-code.server.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  createInternWithCode,
  InternCodeExhaustedError,
  INTERN_CODE_MAX_ATTEMPTS,
  type NewInternValues,
} from '~/lib/intern-code.server';

const VALUES: NewInternValues = {
  cohortId: '33333333-3333-3333-3333-333333333301',
  roleId: null,
  firstInitial: 'A',
  lastName: 'Fixture',
  startDate: '2026-01-12',
  endDate: null,
  entryNotes: null,
  participationFactorIds: [],
};

/**
 * Fake Drizzle client: `transaction(fn)` runs fn against a tx whose
 * `insert().values().returning()` echoes the intern_code it was given, and
 * whose first N intern inserts throw the given error. Only the surface the
 * generator touches is modelled.
 */
function fakeDb(opts: { failFirst?: number; error?: unknown } = {}) {
  let internInserts = 0;
  const insertedCodes: string[] = [];
  const tx = {
    insert: (_table: unknown) => ({
      values: (vals: Record<string, unknown> | Record<string, unknown>[]) => {
        const chain = {
          returning: async () => {
            internInserts += 1;
            if (opts.failFirst && internInserts <= opts.failFirst) throw opts.error;
            const code = String((vals as Record<string, unknown>).internCode);
            insertedCodes.push(code);
            return [{ id: 'new-id', internCode: code }];
          },
          // non-returning inserts (entry assessment, factors) resolve immediately
          then: (resolve: (v: unknown) => void) => resolve(undefined),
        };
        return chain;
      },
    }),
  };
  const db = {
    transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
  };
  return { db: db as never, insertedCodes, attempts: () => internInserts };
}

const CODE_COLLISION = { code: '23505', constraint_name: 'interns_intern_code_unique' };
const NAME_COLLISION = { code: '23505', constraint_name: 'interns_identity_unique' };

describe('createInternWithCode', () => {
  it('inserts with a code built from the start-date year and the drawn number', async () => {
    const f = fakeDb();
    const result = await createInternWithCode(VALUES, { db: f.db, draw: () => 417 });
    expect(result).toEqual({ id: 'new-id', internCode: 'IMP-26-0417' });
    expect(f.insertedCodes).toEqual(['IMP-26-0417']);
  });

  it('redraws on an intern_code unique violation', async () => {
    const f = fakeDb({ failFirst: 2, error: CODE_COLLISION });
    const draws = [417, 417, 913];
    const result = await createInternWithCode(VALUES, { db: f.db, draw: () => draws.shift()! });
    expect(result.internCode).toBe('IMP-26-0913');
    expect(f.attempts()).toBe(3);
  });

  it('throws InternCodeExhaustedError after the attempt cap', async () => {
    const f = fakeDb({ failFirst: INTERN_CODE_MAX_ATTEMPTS + 1, error: CODE_COLLISION });
    await expect(createInternWithCode(VALUES, { db: f.db, draw: () => 1 })).rejects.toBeInstanceOf(
      InternCodeExhaustedError,
    );
    expect(f.attempts()).toBe(INTERN_CODE_MAX_ATTEMPTS);
  });

  it('does not retry a unique violation on a different constraint', async () => {
    const f = fakeDb({ failFirst: 1, error: NAME_COLLISION });
    await expect(createInternWithCode(VALUES, { db: f.db, draw: () => 1 })).rejects.toMatchObject(
      NAME_COLLISION,
    );
    expect(f.attempts()).toBe(1);
  });

  it('propagates non-unique errors untouched', async () => {
    const boom = new Error('connection reset');
    const f = fakeDb({ failFirst: 1, error: boom });
    await expect(createInternWithCode(VALUES, { db: f.db, draw: () => 1 })).rejects.toBe(boom);
  });

  it('uses the program-timezone year when there is no start date', async () => {
    const f = fakeDb();
    const result = await createInternWithCode(
      { ...VALUES, startDate: null },
      { db: f.db, draw: () => 5, now: new Date('2027-01-01T04:30:00Z') }, // Dec 31 in Indiana
    );
    expect(result.internCode).toBe('IMP-26-0005');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/lib/intern-code.server.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `app/lib/intern-code.server.ts`:

```ts
import crypto from 'node:crypto';
import { interns, internEntryAssessment, internParticipationFactors } from '../../db/schema';
import { db as defaultDb, type DB } from './db.server';
import {
  INTERN_CODE_MAX,
  INTERN_CODE_MIN,
  formatInternCode,
  yearForInternCode,
} from './intern-code';

/** Collisions are rare (≈11% chance of even one redraw across a 50-intern year);
 *  the cap exists so a broken draw fails loudly instead of looping. */
export const INTERN_CODE_MAX_ATTEMPTS = 10;

export class InternCodeExhaustedError extends Error {
  constructor(yy: number) {
    super(
      `Could not find an unused Intern ID for year ${String(yy).padStart(2, '0')} after ${INTERN_CODE_MAX_ATTEMPTS} attempts`,
    );
    this.name = 'InternCodeExhaustedError';
  }
}

export interface NewInternValues {
  cohortId: string;
  roleId: string | null;
  firstInitial: string;
  lastName: string;
  startDate: string | null;
  endDate: string | null;
  entryNotes: string | null;
  participationFactorIds: string[];
}

export interface CreateInternOptions {
  db?: DB;
  now?: Date;
  /** Override the random draw (tests). Must return an int in [INTERN_CODE_MIN, INTERN_CODE_MAX]. */
  draw?: () => number;
}

function drawInternNumber(): number {
  return crypto.randomInt(INTERN_CODE_MIN, INTERN_CODE_MAX + 1);
}

/** PG 23505 on the intern_code index specifically — anything else propagates. */
function isInternCodeCollision(err: unknown): boolean {
  const e = err as { code?: string; constraint_name?: string; constraint?: string } | null;
  if (!e || e.code !== '23505') return false;
  const constraint = e.constraint_name ?? e.constraint ?? '';
  return constraint.includes('intern_code');
}

/**
 * Create an intern record with a freshly drawn Intern ID, plus the entry
 * assessment row and participation-factor rows the admin create form supplies,
 * in one transaction. On an intern_code collision the whole transaction rolls
 * back and a new number is drawn (spec §3).
 */
export async function createInternWithCode(
  values: NewInternValues,
  opts: CreateInternOptions = {},
): Promise<{ id: string; internCode: string }> {
  const dbc = opts.db ?? defaultDb;
  const draw = opts.draw ?? drawInternNumber;
  const yy = yearForInternCode(values.startDate, opts.now);

  for (let attempt = 1; attempt <= INTERN_CODE_MAX_ATTEMPTS; attempt++) {
    const internCode = formatInternCode(yy, draw());
    try {
      return await dbc.transaction(async (tx) => {
        const [intern] = await tx
          .insert(interns)
          .values({
            cohortId: values.cohortId,
            roleId: values.roleId,
            firstInitial: values.firstInitial,
            lastName: values.lastName,
            internCode,
            startDate: values.startDate,
            endDate: values.endDate,
          })
          .returning({ id: interns.id, internCode: interns.internCode });

        await tx.insert(internEntryAssessment).values({
          internId: intern!.id,
          notes: values.entryNotes,
          completedAt: new Date(),
        });

        if (values.participationFactorIds.length > 0) {
          await tx.insert(internParticipationFactors).values(
            values.participationFactorIds.map((fid) => ({
              internId: intern!.id,
              participationFactorId: fid,
            })),
          );
        }
        return intern!;
      });
    } catch (err) {
      if (isInternCodeCollision(err)) continue;
      throw err;
    }
  }
  throw new InternCodeExhaustedError(yy);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/lib/intern-code.server.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add app/lib/intern-code.server.ts tests/lib/intern-code.server.test.ts
git commit -m "feat(intern-id): createInternWithCode with collision redraw"
```

---

### Task A5: Admin create action issues the ID

**Files:**
- Modify: `app/routes/admin.interns.new.tsx:12-21, 60-152`
- Test: `tests/routes/admin.interns.new.test.ts`

**Interfaces:**
- Consumes: `createInternWithCode`, `InternCodeExhaustedError` (A4).
- Produces: successful create redirects to `/admin/interns/:id?issued=1` (A6 renders the callout off that flag).

- [ ] **Step 1: Add a failing route test**

Append to `tests/routes/admin.interns.new.test.ts` inside the `describe`:

```ts
  it('action creates the intern through createInternWithCode and redirects with ?issued=1', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    const create = vi
      .spyOn(internCode, 'createInternWithCode')
      .mockResolvedValue({ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', internCode: 'IMP-26-0417' });

    const fd = new FormData();
    fd.set('firstName', 'Marcus');
    fd.set('lastName', 'Patterson');
    fd.set('employerId', '11111111-1111-1111-1111-111111111101');
    fd.set('cohortId', '33333333-3333-3333-3333-333333333301');
    fd.set('startDate', '2026-01-12');
    fd.set('endDate', '2026-06-12');
    fd.append('participationFactorIds', '55555555-5555-5555-5555-555555555501');
    const req = new Request('https://x.test/admin/interns/new', { method: 'POST', body: fd });

    let thrown: unknown;
    try {
      await action({ request: req, params: {}, context: {} } as never);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get('Location')).toBe(
      '/admin/interns/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa?issued=1',
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        firstInitial: 'M',
        lastName: 'Patterson',
        cohortId: '33333333-3333-3333-3333-333333333301',
        startDate: '2026-01-12',
        participationFactorIds: ['55555555-5555-5555-5555-555555555501'],
      }),
    );
  });
```

and add the import at the top of the file:

```ts
import * as internCode from '~/lib/intern-code.server';
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/routes/admin.interns.new.test.ts`
Expected: the new test FAILS (Location is `?created=1`, `createInternWithCode` never called).

- [ ] **Step 3: Rewrite the action to use the generator**

In `app/routes/admin.interns.new.tsx`:

Replace the schema import block (lines 15-21) with:
```ts
import { cohorts as cohortsTbl, roles as rolesTbl } from '../../db/schema';
```
and add:
```ts
import { createInternWithCode, InternCodeExhaustedError } from '~/lib/intern-code.server';
```

Replace everything from `const firstInitial = values.firstName.trim()[0]!.toUpperCase();` through the end of the `action` function with:

```ts
  const firstInitial = values.firstName.trim()[0]!.toUpperCase();

  try {
    const created = await createInternWithCode({
      cohortId: values.cohortId,
      roleId: values.roleId,
      firstInitial,
      lastName: values.lastName,
      startDate: values.startDate,
      endDate: values.endDate,
      entryNotes: values.entryNotes,
      participationFactorIds,
    });
    // `issued=1` makes the detail page show the one-time "Intern ID issued"
    // callout (spec §6). Query-string driven so it disappears on navigation.
    throw redirect(`/admin/interns/${created.id}?issued=1`, { headers });
  } catch (err) {
    // Let react-router redirects propagate.
    if (err instanceof Response) throw err;
    if (err instanceof InternCodeExhaustedError) {
      return data(
        {
          errors: [
            {
              field: 'cohortId',
              message: 'Could not issue an Intern ID. Try again; if it repeats, contact support.',
            },
          ],
          values: { ...values, participationFactorIds },
        },
        { headers, status: 503 },
      );
    }
    // Postgres unique violation — partial unique index on
    // (lower(first_initial), lower(last_name), cohort_id) where deleted_at is null.
    // (Removed with the name columns in PR C.)
    const pgCode = (err as { code?: string } | null)?.code;
    if (pgCode === '23505') {
      return data(
        {
          errors: [
            {
              field: 'lastName',
              message: 'An intern with the same name already exists in this cohort.',
            },
          ],
          values: { ...values, participationFactorIds },
        },
        { headers, status: 409 },
      );
    }
    throw err;
  }
}
```

- [ ] **Step 4: Run route tests + typecheck**

Run: `npx vitest run tests/routes/admin.interns.new.test.ts && npm run typecheck`
Expected: all three tests PASS; typecheck reports only the seed/RLS-fixture errors from A3 Step 7 (fixed in A7).

- [ ] **Step 5: Commit**

```bash
git add app/routes/admin.interns.new.tsx tests/routes/admin.interns.new.test.ts
git commit -m "feat(intern-id): admin create issues an Intern ID and redirects with ?issued=1"
```

---

### Task A6: `<InternCode>`, the issued callout, list column and detail strip

**Files:**
- Create: `app/components/InternCode.tsx`, `app/components/InternIdIssuedCallout.tsx`
- Modify: `app/styles/admin.css` (append), `app/lib/admin-queries.server.ts:123-137, 179-221`, `app/routes/admin.interns._index.tsx`, `app/routes/admin.interns.$internId.tsx:229-248, 259-282`
- Test: `tests/components/InternCode.test.tsx`, `tests/routes/admin.interns._index.test.ts` (fixture update)

**Interfaces:**
- Produces: `<InternCode code: string; size?: 'md' | 'lg' />`, `<InternIdIssuedCallout code: string />`; `listInternsForListing`, `listInternsByCohort`, `getInternOrNull` rows now carry `internCode: string`.

- [ ] **Step 1: Write the failing component test**

Create `tests/components/InternCode.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InternCode } from '~/components/InternCode';

describe('<InternCode>', () => {
  it('renders the code in a mono span', () => {
    render(<InternCode code="IMP-26-0417" />);
    const el = screen.getByText('IMP-26-0417');
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toBe('intern-code');
  });

  it('adds the size modifier', () => {
    render(<InternCode code="IMP-26-0417" size="lg" />);
    expect(screen.getByText('IMP-26-0417').className).toBe('intern-code intern-code--lg');
  });
});
```

Check the existing component tests for their environment directive — open `tests/components/Modal.test.tsx` and copy whatever `// @vitest-environment jsdom` or setup import it has to the top of this file so it runs in the DOM environment.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/components/InternCode.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the components and CSS**

`app/components/InternCode.tsx`:
```tsx
// The Intern ID, rendered the same way everywhere (spec §6): IBM Plex Mono,
// tabular digits. Registered in admin.css as `.intern-code` (+ `--lg`).
export interface InternCodeProps {
  code: string;
  size?: 'md' | 'lg';
}

export function InternCode({ code, size = 'md' }: InternCodeProps) {
  return <span className={`intern-code${size === 'lg' ? ' intern-code--lg' : ''}`}>{code}</span>;
}
```

`app/components/InternIdIssuedCallout.tsx`:
```tsx
import { useState } from 'react';
import { InternCode } from './InternCode';

// One-time callout shown on the intern detail page right after creation
// (`?issued=1`). Copy is fixed by the spec (§6) — do not reword.
export function InternIdIssuedCallout({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context / permissions) — the code is on screen.
    }
  }

  return (
    <section>
      <div className="container">
        <div className="issued-callout" role="status" data-testid="intern-id-issued">
          <div className="issued-callout__label">Intern ID issued</div>
          <div className="issued-callout__row">
            <InternCode code={code} size="lg" />
            <button type="button" className="btn btn--outline btn--sm" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="issued-callout__body">
            Record this ID against the intern&apos;s name in the program roster now, and give it to
            the intern. The portal does not know who this person is and cannot look it up for you.
          </p>
        </div>
      </div>
    </section>
  );
}
```

Append to `app/styles/admin.css`:
```css
/* ---- Intern ID (spec 2026-09-11-intern-id-identity-design.md §6) ---- */
.intern-code {
  font-family: 'IBM Plex Mono', monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.intern-code--lg {
  font-size: 28px;
  font-weight: 600;
  color: var(--navy);
}

/* One-time "Intern ID issued" callout on the intern detail page (?issued=1). */
.issued-callout {
  border: 1px solid var(--line);
  border-left: 4px solid var(--gold);
  border-radius: var(--radius-md);
  background: var(--canvas-alt);
  padding: 18px 22px;
  margin: 18px 0 0;
}
.issued-callout__label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}
.issued-callout__row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.issued-callout__body {
  margin: 12px 0 0;
  max-width: 66ch;
  color: var(--ink);
}
```
If `--navy`, `--gold`, `--line`, `--canvas-alt`, `--muted`, `--ink`, or `--radius-md` is not defined in `admin.css`'s `:root`, use the closest existing token (search `:root {` at the top of the file) rather than a hex literal.

- [ ] **Step 4: Run component test**

Run: `npx vitest run tests/components/InternCode.test.tsx`
Expected: PASS.

- [ ] **Step 5: Select `internCode` in the admin queries**

In `app/lib/admin-queries.server.ts`:

`listInternsByCohort` — add `internCode: interns.internCode,` after `id`, and change `.orderBy(asc(interns.lastName))` to `.orderBy(asc(interns.internCode))`.

`listInternsForListing` — add `internCode: interns.internCode,` after `id`, and change `.orderBy(desc(interns.startDate))` to `.orderBy(asc(interns.internCode))`.

`getInternOrNull` — add `internCode: interns.internCode,` after `roleId`.

- [ ] **Step 6: Intern list — ID column first, default sort, in the haystack**

In `app/routes/admin.interns._index.tsx`:

Add the import:
```tsx
import { InternCode } from '~/components/InternCode';
```

Change the haystack line to:
```tsx
      const haystack = `${i.internCode} ${i.firstInitial}. ${i.lastName} ${i.cohortName}`.toLowerCase();
```

Change `rightAside="Sort: Start Date ↓"` to `rightAside="Sort: Intern ID ↑"` and the search placeholder to `"Search by Intern ID, last name or cohort..."`.

Replace the `<thead>` row with:
```tsx
                <tr>
                  <th style={{ width: '16%' }}>Intern ID</th>
                  <th style={{ width: '20%' }}>Intern</th>
                  <th style={{ width: '18%' }}>Cohort</th>
                  <th style={{ width: '12%' }}>Start Date</th>
                  <th style={{ width: '12%' }}>Role</th>
                  <th style={{ width: '12%' }}>90-Day Outcome</th>
                  <th style={{ width: '10%' }}>Actions</th>
                </tr>
```
Change `<EmptyRow colSpan={6} …>` to `colSpan={7}`, and insert as the first `<td>` of each row:
```tsx
                      <td>
                        <InternCode code={i.internCode} />
                      </td>
```

- [ ] **Step 7: Detail page — callout + MetaStrip item**

In `app/routes/admin.interns.$internId.tsx`:

Add imports:
```tsx
import { InternIdIssuedCallout } from '~/components/InternIdIssuedCallout';
```

In the `useEffect`, delete the `created` branch (the callout replaces the toast):
```tsx
    if (searchParams.get('created') === '1') {
      toast.show({ kind: 'success', label: 'SAVED', message: 'Intern record created.' });
      searchParams.delete('created');
      setSearchParams(searchParams, { replace: true });
    }
```
Remove `searchParams, setSearchParams` from that effect's dependency array if they are now unused inside it, and keep `const [searchParams] = useSearchParams();` (drop `setSearchParams` if no longer used — typecheck will tell you).

Add as the first `MetaStrip` item:
```tsx
            { label: 'Intern ID', value: intern.internCode, mono: true },
```

Immediately after the closing `</PageHead>` tag, add:
```tsx
      {searchParams.get('issued') === '1' ? <InternIdIssuedCallout code={intern.internCode} /> : null}
```

- [ ] **Step 8: Update the list route test fixture**

In `tests/routes/admin.interns._index.test.ts`, every mocked `listInternsForListing` row needs `internCode: 'IMP-26-0001'` (increment per row). Run `npx vitest run tests/routes/admin.interns._index.test.ts` — it fails on typecheck of the fixture until you add the field.

- [ ] **Step 9: Verify**

```bash
npm run typecheck && npx vitest run tests/routes tests/components && npm run lint
```
Expected: typecheck shows only the seed/RLS fixture errors (A7); route + component tests PASS; lint clean.

Start the dev server (`npm run dev`), sign in as `admin@example.com`, create an intern with any name in any cohort. Expected: redirect to the detail page with the gold-edged **Intern ID issued** callout showing an `IMP-26-NNNN`; Copy puts it on the clipboard; navigating away and back shows no callout; the intern list has the ID as first column, sorted ascending, and typing the four digits alone into search finds the row.

- [ ] **Step 10: Commit**

```bash
git add app/components/InternCode.tsx app/components/InternIdIssuedCallout.tsx app/styles/admin.css \
        app/lib/admin-queries.server.ts app/routes/admin.interns._index.tsx app/routes/admin.interns.\$internId.tsx \
        tests/components/InternCode.test.tsx tests/routes/admin.interns._index.test.ts
git commit -m "feat(intern-id): show Intern ID on list/detail with issued callout"
```

---

### Task A7: Seeds and fixtures supply codes

**Files:**
- Modify: `db/seed-data/interns.ts`, `db/seed.ts:176-186`, `db/seed-demo.ts:985-1060`, `tests/rls/reports-queries.test.ts:173-186`

**Interfaces:**
- Produces: `SeedIntern.internCode: string`; the six base fixtures carry these **fixed** codes (e2e depends on them):

  | id suffix | lastName | internCode |
  |---|---|---|
  | …4401 | Whitaker | `IMP-26-1042` |
  | …4402 | Okafor | `IMP-26-2077` |
  | …4403 | Delgado | `IMP-26-3158` |
  | …4404 | Test1 | `IMP-26-4001` |
  | …4405 | Test2 | `IMP-26-4002` |
  | …4406 | Test3 | `IMP-26-4003` |

- [ ] **Step 1: Base seed data**

In `db/seed-data/interns.ts` add `internCode: string;` to `SeedIntern` after `lastName`, and add the `internCode` value from the table above to each of the six entries (after `lastName`).

- [ ] **Step 2: seed.ts inserts the code**

In `db/seed.ts` around line 181, in the `SEED_INTERNS.map((i) => ({ … }))` for `schema.interns`, add `internCode: i.internCode,` after `lastName: i.lastName,`.

- [ ] **Step 3: Demo seed assigns deterministic codes**

In `db/seed-demo.ts`, after `function internName(idx)` add:

```ts
/**
 * Deterministic Intern ID per demo intern so re-runs are idempotent (the demo
 * seed is additive; its idempotency key is the fixed intern id, and the code
 * must be stable alongside it). 7919 is prime and coprime with 9999, so
 * idx → (idx * 7919) % 9999 + 1 is a permutation of 1..9999: no two demo
 * interns share a number. Year comes from the cohort start date (D3).
 */
function internCode(idx: number, cohortStartDate: string | null): string {
  const yy = cohortStartDate ? Number(cohortStartDate.slice(0, 4)) % 100 : 26;
  const n = ((idx * 7919) % 9999) + 1;
  return `IMP-${String(yy).padStart(2, '0')}-${String(n).padStart(4, '0')}`;
}
```

Add `internCode: string;` to the `internRows` element type (after `lastName: string;`), and in the loop add `internCode: internCode(iIdx, c.startDate),` to the pushed object after `lastName,`.

Change the intern insert's conflict clause so a code collision with a hand-created intern skips that demo row instead of aborting the seed:
```ts
      .onConflictDoNothing()
```
(remove the `{ target: schema.interns.id }` argument). The dependent-row filtering by `insertedInternIdSet` already handles a skipped intern.

- [ ] **Step 4: RLS fixture**

In `tests/rls/reports-queries.test.ts` lines 173-186, add `internCode: 'IMP-26-9901'` to the first fixture and `internCode: 'IMP-26-9902'` to the second.

- [ ] **Step 5: Typecheck, then reseed impact-dev and run the DB-backed unit tests**

```bash
npm run typecheck
```
Expected: clean — no remaining errors anywhere.

```bash
npm run db:seed && npm run db:seed:demo
```
Expected: base seed completes (6 interns), demo seed completes (`Inserted 140 new interns.` or fewer if any code collided — a small number of skips is acceptable; zero is expected on a freshly truncated database).

```bash
npm test -- --run
```
Expected: all unit tests PASS (including the DB-backed `identity.server.test.ts`, which still looks interns up by name in PR A).

- [ ] **Step 6: Commit**

```bash
git add db/seed-data/interns.ts db/seed.ts db/seed-demo.ts tests/rls/reports-queries.test.ts
git commit -m "feat(intern-id): seeds and RLS fixtures supply intern codes"
```

---

### Task A8: E2E, docs, staging, merge, prod migration

**Files:**
- Modify: `tests/e2e/admin-crud.spec.ts:60-114`, `CLAUDE.md`

- [ ] **Step 1: E2E — the created intern shows an issued ID and is searchable by it**

In `tests/e2e/admin-crud.spec.ts`, after the `toContainText(/edit intern/i)` assertion (line ~94), add:

```ts
  // PR A (intern ID): the detail page shows the one-time "Intern ID issued"
  // callout carrying a well-formed code. Capture it for the list search below.
  const callout = page.getByTestId('intern-id-issued');
  await expect(callout).toBeVisible();
  const issuedCode = (await callout.locator('.intern-code').textContent())?.trim() ?? '';
  expect(issuedCode).toMatch(/^IMP-\d{2}-\d{4}$/);
```

Replace the final two lines of the test (search by last name) with:
```ts
  await page.getByPlaceholder(/Search by Intern ID/i).fill(issuedCode.slice(-4));
  await expect(page.locator(`text=${issuedCode}`).first()).toBeVisible();
  await expect(page.locator(`text=${lastName}`).first()).toBeVisible();
```

Run locally against the dev server: `npm run test:e2e -- tests/e2e/admin-crud.spec.ts`
Expected: PASS.

- [ ] **Step 2: CLAUDE.md — new contracts section**

Add a new top-level section to `CLAUDE.md` immediately before `## Local development cheat-sheet (for SP6+)`:

```markdown
## Intern ID (2026-09-11) — contracts to preserve

Interns are identified by a portal-assigned **Intern ID**, `IMP-YY-NNNN` (e.g. `IMP-26-0417`).
Spec: `docs/superpowers/specs/2026-09-11-intern-id-identity-design.md`. Delivered in three PRs:
A (issue IDs, names kept), B (anonymous identity switches to the ID + throttle), C (names removed).

- **Format/normalize/year live in `app/lib/intern-code.ts`** (pure, client-safe). `IMP` is a code
  constant, not a setting — interns hold printed cards. `YY` = Start Date's year if given, else
  "now" in `PROGRAM_TIME_ZONE` (exported from `format.ts`; Lambda is UTC). `NNNN` is random
  0001–9999 via `crypto.randomInt`, never sequential.
- **`createInternWithCode` (`intern-code.server.ts`) is the only writer of `intern_code`.** It
  redraws on PG `23505` *on the `intern_code` index only* (checks `constraint_name`), up to 10
  times, then throws `InternCodeExhaustedError`. No route, action or script updates the code
  after insert — immutability is the contract.
- **`interns_intern_code_unique` is a plain unique index, not partial on `deleted_at`.** A
  soft-deleted intern's code stays reserved forever. Do not "fix" this to allow reuse.
- **Migration 0005 is hand-written** (add nullable → PL/pgSQL backfill → SET NOT NULL → index)
  with a drizzle snapshot recording the destination. `drizzle-kit generate --name x` was used only
  for the snapshot/journal; its SQL was replaced.
- **Admin create redirects to `/admin/interns/:id?issued=1`**; the detail page renders
  `<InternIdIssuedCallout>` off that flag (query-string driven, no state). The callout copy is
  fixed by the spec.
- **`<InternCode>` (`.intern-code`, `.intern-code--lg`) is the one way to render an ID.**
```

Also, in the CSS class registry list under SP5, add:
```markdown
- `.intern-code` (+ `--lg`), `.issued-callout` (+ `__label`, `__row`, `__body`) — added 2026-09-11 (Intern ID).
```

- [ ] **Step 3: Lint, typecheck, unit, commit, push, open PR**

```bash
npm run lint && npm run typecheck && npm test -- --run
git add tests/e2e/admin-crud.spec.ts CLAUDE.md
git commit -m "feat(intern-id): e2e asserts issued ID; document Intern ID contracts"
git push -u origin feat/intern-code-issue
gh pr create --base main --title "feat: issue Intern IDs (PR A of 3)" --body-file - <<'EOF'
## Summary
PR A of the Intern ID rebuild (spec: docs/superpowers/specs/2026-09-11-intern-id-identity-design.md).
Adds `interns.intern_code` (backfilled on impact-dev, NOT NULL, plain unique index), the pure
format/normalize/year module, `createInternWithCode` with collision redraw, and the admin
"Intern ID issued" callout. Names are still stored and shown — PR C removes them.

## Verification
- impact-dev backup taken <timestamp> before migrating.
- Migration 0005 applied to impact-dev; 140/140 rows backfilled, 0 malformed, codes distinct.
- `drizzle-kit generate` → "No schema changes".
- Unit: intern-code (10), intern-code.server (6), route + component tests green.
- e2e admin-crud asserts the issued code and searches by its digits.
- Staging: (replace with the staging URL and what Matt verified, before requesting merge).

## Rollout
**Migrate prod BEFORE merging** (spec §9): `set -a; source .env.prod.local; set +a; npm run db:migrate`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

- [ ] **Step 4: Wait for CI**

`gh pr checks <n> --watch --interval 20` — all five jobs must pass. The RLS job runs on `supabase start` and exercises the new fixtures.

- [ ] **Step 5: Park on staging and hand to Matt**

```bash
git push --force origin feat/intern-code-issue:staging
```
Tell Matt: on `https://staging--impact-portal-app.netlify.app` create an intern; confirm the callout and the list column. **STOP and wait for explicit merge approval.**

- [ ] **Step 6: Migrate prod, then merge (in that order)**

```bash
set -a; source .env.prod.local; set +a; npm run db:migrate
```
Expected: 0005 applied; verify with the supabase-prod MCP: `select count(*) from interns where intern_code is null` → 0, and `\d interns` equivalent (`select column_name, is_nullable from information_schema.columns where table_name='interns' and column_name='intern_code'`) → `NO`.

Then, in a fresh shell (so the prod env is gone):
```bash
gh pr merge <n> --squash --delete-branch
git checkout main && git pull --ff-only
git push --force origin main:staging
```

---

# PR B — Switch the anonymous identity (`feat/intern-code-identity`)

State after B: interns sign in with Employer → Cohort → Intern ID; the cookie carries `internCode`; repeated failures from one IP are refused. Names still stored and shown to admins/employers. Migrate prod **before** merging.

### Task B1: `identity_attempts` table + migration 0006

**Files:**
- Modify: `db/schema.ts` (new table after `assessmentSubmissions`), `db/policies/0001_enable_rls.sql`
- Create: `db/migrations/0006_identity_attempts.sql` (generated; hand-verified; one line appended)

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only
git checkout -b feat/intern-code-identity
```
Confirm a fresh impact-dev backup exists (dashboard → Backups) before migrating.

- [ ] **Step 2: Schema**

Append to `db/schema.ts` (after `assessmentSubmissions`):

```ts
/**
 * Failed Intern-ID confirmations from the public chooser, keyed by client IP,
 * for the identity throttle (spec §7). Disposable rows; the throttle module
 * deletes anything older than a day. Touched ONLY via the service-role client;
 * RLS is enabled with NO policies so anon/authenticated are denied outright.
 */
export const identityAttempts = pgTable(
  'identity_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ip: text('ip').notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ipTimeIdx: index('identity_attempts_ip_time_idx').on(t.ip, t.attemptedAt),
  }),
);
```

- [ ] **Step 3: Generate and verify**

```bash
npx drizzle-kit generate --name identity_attempts
```
Expected file `db/migrations/0006_identity_attempts.sql`:
```sql
CREATE TABLE IF NOT EXISTS "identity_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" text NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "identity_attempts_ip_time_idx" ON "identity_attempts" USING btree ("ip","attempted_at");
```
Append one statement so RLS is on from the moment the table exists (the blanket grants in `db/policies/0000_grants.sql` would otherwise let `anon` read it):
```sql
--> statement-breakpoint
ALTER TABLE "identity_attempts" ENABLE ROW LEVEL SECURITY;
```
Also add to `db/policies/0001_enable_rls.sql` (idempotent, keeps the policy files the source of truth):
```sql
ALTER TABLE public.identity_attempts ENABLE ROW LEVEL SECURITY;
```

```bash
npx drizzle-kit generate
```
Expected: "No schema changes".

- [ ] **Step 4: Apply to impact-dev and commit**

```bash
npm run db:migrate && npm run db:apply-policies
git add db/schema.ts db/migrations/0006_identity_attempts.sql db/migrations/meta/0006_snapshot.json db/migrations/meta/_journal.json db/policies/0001_enable_rls.sql
git commit -m "feat(intern-id): identity_attempts table for the chooser throttle"
```

---

### Task B2: Throttle module

**Files:**
- Create: `app/lib/identity-throttle.server.ts`
- Test: `tests/lib/identity-throttle.server.test.ts`

**Interfaces:**
- Consumes: `dbService`, `type DBService` from `app/lib/db.service.server.ts`; `identityAttempts` (B1).
- Produces: `clientIp(request: Request): string`, `isThrottled(ip, opts?: { db?: DBService; now?: Date }): Promise<boolean>`, `recordFailure(ip, opts?): Promise<void>`, `THROTTLE_WINDOW_MINUTES = 15`, `THROTTLE_MAX_FAILURES = 10`.

- [ ] **Step 1: Failing tests**

Create `tests/lib/identity-throttle.server.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import {
  clientIp,
  isThrottled,
  recordFailure,
  THROTTLE_MAX_FAILURES,
} from '~/lib/identity-throttle.server';

function req(headers: Record<string, string>) {
  return new Request('https://x.test/intern/assessments', { headers });
}

describe('clientIp', () => {
  it('prefers the Netlify header', () => {
    expect(
      clientIp(req({ 'x-nf-client-connection-ip': '198.51.100.7', 'x-forwarded-for': '10.0.0.1' })),
    ).toBe('198.51.100.7');
  });
  it('falls back to the first x-forwarded-for hop', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.9, 10.0.0.2' }))).toBe('203.0.113.9');
  });
  it('returns "unknown" when neither header is present', () => {
    expect(clientIp(req({}))).toBe('unknown');
  });
});

/** Fake service client exposing only the chains the module uses. */
function fakeDb(count: number | Error) {
  const inserted: unknown[] = [];
  const deleted: unknown[] = [];
  const db = {
    select: () => ({
      from: () => ({
        where: async () => {
          if (count instanceof Error) throw count;
          return [{ n: count }];
        },
      }),
    }),
    insert: () => ({
      values: async (v: unknown) => {
        if (count instanceof Error) throw count;
        inserted.push(v);
      },
    }),
    delete: () => ({
      where: async (w: unknown) => {
        deleted.push(w);
      },
    }),
  };
  return { db: db as never, inserted, deleted };
}

describe('isThrottled', () => {
  it('allows below the threshold', async () => {
    expect(await isThrottled('1.2.3.4', { db: fakeDb(THROTTLE_MAX_FAILURES - 1).db })).toBe(false);
  });
  it('blocks at the threshold', async () => {
    expect(await isThrottled('1.2.3.4', { db: fakeDb(THROTTLE_MAX_FAILURES).db })).toBe(true);
  });
  it('fails open when the query throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await isThrottled('1.2.3.4', { db: fakeDb(new Error('db down')).db })).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('recordFailure', () => {
  it('inserts a row and prunes old ones', async () => {
    const f = fakeDb(0);
    await recordFailure('1.2.3.4', { db: f.db, now: new Date('2026-09-11T22:00:00Z') });
    expect(f.inserted).toHaveLength(1);
    expect(f.inserted[0]).toMatchObject({ ip: '1.2.3.4' });
    expect(f.deleted).toHaveLength(1);
  });
  it('swallows errors', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(recordFailure('1.2.3.4', { db: fakeDb(new Error('db down')).db })).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/lib/identity-throttle.server.test.ts` — FAIL, module not found.

- [ ] **Step 3: Implement**

Create `app/lib/identity-throttle.server.ts`:

```ts
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { identityAttempts } from '../../db/schema';
import { dbService as defaultDbService, type DBService } from './db.service.server';

/**
 * Per-IP throttle on failed Intern-ID confirmations at the public chooser
 * (spec §7). Only FAILURES are recorded; ≥ THROTTLE_MAX_FAILURES within
 * THROTTLE_WINDOW_MINUTES refuses further attempts. Fails OPEN: an
 * infrastructure error logs and lets the request through — chooser
 * availability beats closing a rare abuse path.
 *
 * This is the second (and last) sanctioned anonymous use of `dbService`; the
 * first is the assessment-submission insert. Do not add a third.
 */
export const THROTTLE_WINDOW_MINUTES = 15;
export const THROTTLE_MAX_FAILURES = 10;
const RETENTION_HOURS = 24;

interface Opts {
  db?: DBService;
  now?: Date;
}

/** Netlify's trusted header first; a spoofed x-forwarded-for cannot override it in prod. */
export function clientIp(request: Request): string {
  const nf = request.headers.get('x-nf-client-connection-ip')?.trim();
  if (nf) return nf;
  const first = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return first || 'unknown';
}

export async function isThrottled(ip: string, opts: Opts = {}): Promise<boolean> {
  const dbc = opts.db ?? defaultDbService;
  const now = opts.now ?? new Date();
  const since = new Date(now.getTime() - THROTTLE_WINDOW_MINUTES * 60_000);
  try {
    const [row] = await dbc
      .select({ n: sql<number>`count(*)::int` })
      .from(identityAttempts)
      .where(and(eq(identityAttempts.ip, ip), gt(identityAttempts.attemptedAt, since)));
    return (row?.n ?? 0) >= THROTTLE_MAX_FAILURES;
  } catch (err) {
    console.warn('[identity-throttle] check failed; failing open', err);
    return false;
  }
}

export async function recordFailure(ip: string, opts: Opts = {}): Promise<void> {
  const dbc = opts.db ?? defaultDbService;
  const now = opts.now ?? new Date();
  try {
    await dbc.insert(identityAttempts).values({ ip, attemptedAt: now });
    const cutoff = new Date(now.getTime() - RETENTION_HOURS * 3_600_000);
    await dbc.delete(identityAttempts).where(lt(identityAttempts.attemptedAt, cutoff));
  } catch (err) {
    console.warn('[identity-throttle] record failed; ignoring', err);
  }
}
```

Update the header comment of `app/lib/db.service.server.ts` — change "Use ONLY in server actions where the actor is anonymous (the 3 intern self-assessment forms + getOneShotSubmission read path)" to "Use ONLY in the two anonymous paths: the intern self-assessment submission insert (+ `getOneShotSubmission` read) and the identity throttle in `identity-throttle.server.ts`."

- [ ] **Step 4: Run to verify pass, commit**

Run: `npx vitest run tests/lib/identity-throttle.server.test.ts` — PASS, 8 tests.

```bash
git add app/lib/identity-throttle.server.ts app/lib/db.service.server.ts tests/lib/identity-throttle.server.test.ts
git commit -m "feat(intern-id): per-IP failure throttle for the chooser"
```

---

### Task B3: Code-based lookup

**Files:**
- Modify: `app/lib/identity.server.ts` (replace contents)
- Test: `tests/lib/identity.server.test.ts` (replace contents)

**Interfaces:**
- Produces:
  ```ts
  interface InternCodeIdentity { internCode: string; cohortId: string }
  interface InternRecord { id: string; internCode: string; cohortId: string }
  lookupInternByCode(identity: InternCodeIdentity): Promise<InternRecord | null>
  ```
  `lookupInternByIdentity` is **deleted** — B4 and B5 remove its two callers in the same PR.

- [ ] **Step 1: Replace the test**

Overwrite `tests/lib/identity.server.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { lookupInternByCode } from '~/lib/identity.server';

const SKIP_DB_TESTS =
  !process.env.DATABASE_POOL_URL || process.env.DATABASE_POOL_URL.includes('fake');

// Fixtures from db/seed-data/interns.ts (PR A): Whitaker = IMP-26-1042 in Riverbend.
describe.skipIf(SKIP_DB_TESTS)('lookupInternByCode', () => {
  it('returns the intern when code + cohort match', async () => {
    const intern = await lookupInternByCode({
      internCode: 'IMP-26-1042',
      cohortId: '33333333-3333-3333-3333-333333333301',
    });
    expect(intern?.id).toBe('44444444-4444-4444-4444-444444444401');
    expect(intern?.internCode).toBe('IMP-26-1042');
  });

  it('is exact on the code — no case folding or normalisation here', async () => {
    // Normalisation is the caller's job (normalizeInternCode); storage is canonical.
    const intern = await lookupInternByCode({
      internCode: 'imp-26-1042',
      cohortId: '33333333-3333-3333-3333-333333333301',
    });
    expect(intern).toBeNull();
  });

  it('returns null when the cohort does not match', async () => {
    const intern = await lookupInternByCode({
      internCode: 'IMP-26-1042',
      cohortId: '00000000-0000-0000-0000-000000000099',
    });
    expect(intern).toBeNull();
  });

  it('returns null for an unknown code', async () => {
    const intern = await lookupInternByCode({
      internCode: 'IMP-26-0000',
      cohortId: '33333333-3333-3333-3333-333333333301',
    });
    expect(intern).toBeNull();
  });
});
```

- [ ] **Step 2: Replace the module**

Overwrite `app/lib/identity.server.ts`:

```ts
import { and, eq, isNull } from 'drizzle-orm';
import { interns } from '../../db/schema';
import { db } from './db.server';

export interface InternCodeIdentity {
  internCode: string;
  cohortId: string;
}

export interface InternRecord {
  id: string;
  internCode: string;
  cohortId: string;
}

/**
 * Resolve an intern from the pair the public chooser collects: the canonical
 * Intern ID (already normalised by the caller) and the selected cohort.
 * Soft-deleted interns never resolve. Exact match on the code — the DB holds
 * canonical form only (spec D7).
 */
export async function lookupInternByCode(identity: InternCodeIdentity): Promise<InternRecord | null> {
  const rows = await db
    .select({ id: interns.id, internCode: interns.internCode, cohortId: interns.cohortId })
    .from(interns)
    .where(
      and(
        eq(interns.internCode, identity.internCode),
        eq(interns.cohortId, identity.cohortId),
        isNull(interns.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
```

- [ ] **Step 3: Run and commit**

Run: `npx vitest run tests/lib/identity.server.test.ts` — PASS (4) against impact-dev, or all skipped if `DATABASE_POOL_URL` is fake. `npm run typecheck` now FAILS in `intern-identity.server.ts` and `_public.intern.assessments.tsx` (import of the deleted function) — expected; B4 and B5 fix them.

```bash
git add app/lib/identity.server.ts tests/lib/identity.server.test.ts
git commit -m "feat(intern-id): lookupInternByCode replaces the name lookup"
```

---

### Task B4: Cookie contract

**Files:**
- Modify: `app/lib/intern-identity.server.ts`
- Test: `tests/lib/intern-identity.server.test.ts`

**Interfaces:**
- Produces: `InternIdentityCookie = { internId; internCode; cohortId; employerId }`. `getCurrentInternIdentity` re-resolves `(internCode, cohortId)` via `lookupInternByCode`.

- [ ] **Step 1: Update the tests**

In `tests/lib/intern-identity.server.test.ts` change the `identity` fixture to:
```ts
  const identity = {
    internId: '44444444-4444-4444-4444-444444444401',
    internCode: 'IMP-26-1042',
    cohortId: '33333333-3333-3333-3333-333333333301',
    employerId: '11111111-1111-1111-1111-111111111101',
  };
```
and add inside the describe:
```ts
  it('rejects a validly signed cookie in the pre-Intern-ID shape', () => {
    // Old payloads carried firstInitial/lastName and no internCode. They must
    // parse as null so the chooser is shown again (spec §6, cookie).
    const legacy = {
      internId: identity.internId,
      firstInitial: 'A',
      lastName: 'Whitaker',
      cohortId: identity.cohortId,
      employerId: identity.employerId,
    };
    const value = signInternIdentityCookie(legacy as never);
    expect(parseInternIdentityCookie(value)).toBeNull();
  });
```

- [ ] **Step 2: Run to verify failure** — `npx vitest run tests/lib/intern-identity.server.test.ts`: the new test FAILS (legacy shape currently parses).

- [ ] **Step 3: Update the module**

In `app/lib/intern-identity.server.ts`:

```ts
import { lookupInternByCode } from './identity.server';
```
replaces the old import. The interface becomes:
```ts
export interface InternIdentityCookie {
  internId: string;
  internCode: string;
  cohortId: string;
  employerId: string;
}
```
The type guard in `parseInternIdentityCookie` becomes:
```ts
      typeof (parsed as Record<string, unknown>).internId === 'string' &&
      typeof (parsed as Record<string, unknown>).internCode === 'string' &&
      typeof (parsed as Record<string, unknown>).cohortId === 'string' &&
      typeof (parsed as Record<string, unknown>).employerId === 'string'
```
The doc comment above `getCurrentInternIdentity` becomes:
```ts
/**
 * Read + re-validate the identity cookie against the live roster on each request.
 * Returns null if the cookie is missing/invalid OR the intern no longer resolves.
 *
 * Defense-in-depth: even with a valid HMAC signature, we re-resolve the
 * (internCode, cohortId) pair against the live `interns` table and confirm the
 * resolved id matches the cookie's `internId`. This catches interns soft-deleted
 * since cookie issuance and cohort reassignment.
 */
```
and its body's lookup becomes:
```ts
  const intern = await lookupInternByCode({
    internCode: parsed.internCode,
    cohortId: parsed.cohortId,
  });
  if (!intern || intern.id !== parsed.internId) return null;
  return parsed;
```

- [ ] **Step 4: Run and commit**

Run: `npx vitest run tests/lib/intern-identity.server.test.ts` — PASS.

```bash
git add app/lib/intern-identity.server.ts tests/lib/intern-identity.server.test.ts
git commit -m "feat(intern-id): identity cookie carries internCode; legacy shape rejected"
```

---

### Task B5: Chooser — Employer → Cohort → Intern ID, with throttle

**Files:**
- Modify: `app/routes/_public.intern.assessments.tsx` (header comment, imports, `IdentityDisplay`, loader display, `ActionError`, `action`, chip props, `IdentityGate` form)

**Interfaces:**
- Consumes: `normalizeInternCode` (A2), `lookupInternByCode` (B3), `clientIp`/`isThrottled`/`recordFailure` (B2), `signInternIdentityCookie` with the B4 shape.
- Produces: form fields `employerId`, `cohortId`, `internCode` (in that order); `IdentityConfirmedChip` receives `internCode` (B6 changes the component; do B5 and B6 together before typechecking).

- [ ] **Step 1: Imports and types**

Replace
```ts
import { lookupInternByIdentity } from '~/lib/identity.server';
```
with
```ts
import { lookupInternByCode } from '~/lib/identity.server';
import { normalizeInternCode } from '~/lib/intern-code';
import { clientIp, isThrottled, recordFailure } from '~/lib/identity-throttle.server';
```
Change `IdentityDisplay` to:
```ts
interface IdentityDisplay {
  internId: string;
  internCode: string;
  cohortId: string;
  employerId: string;
  cohortName: string;
  employerName: string;
}
```
In the loader's `display` object replace `firstInitial: identity.firstInitial, lastName: identity.lastName,` with `internCode: identity.internCode,`.

Change `ActionError` to:
```ts
interface ActionError {
  error?: string;
  fields?: { internCode?: string; employerId?: string; cohortId?: string };
}
```

- [ ] **Step 2: Rewrite the action**

Replace the body of `action` after the `intent !== 'confirm'` guard with:

```ts
  const rawCode = String(formData.get('internCode') ?? '').trim();
  const employerId = String(formData.get('employerId') ?? '').trim();
  const cohortId = String(formData.get('cohortId') ?? '').trim();
  const fields: ActionError['fields'] = { internCode: rawCode, employerId, cohortId };

  // 1. Throttle (spec §7). Checked first so a blocked IP learns nothing else.
  const ip = clientIp(request);
  if (await isThrottled(ip)) {
    return {
      error: 'Too many attempts. Wait 15 minutes and try again.',
      fields,
    } satisfies ActionError;
  }

  // 2. Shape. Not a failed attempt — it never reached the database.
  const internCode = normalizeInternCode(rawCode);
  if (!internCode) {
    return {
      error: 'Enter your Intern ID in the form IMP-26-0417.',
      fields,
    } satisfies ActionError;
  }
  if (!employerId) {
    return { error: 'Please select your employer.', fields } satisfies ActionError;
  }
  if (!cohortId) {
    return { error: 'Please select your cohort.', fields } satisfies ActionError;
  }

  // 3. The cohort must exist AND belong to the selected employer. Blocks a
  // tampered form from baking a fraudulent employerId into the signed cookie.
  const cohortMatch = await db
    .select({ employerId: cohortsTable.employerId })
    .from(cohortsTable)
    .where(and(eq(cohortsTable.id, cohortId), eq(cohortsTable.employerId, employerId)))
    .limit(1);

  // 4. Lookup. ONE message for "unknown ID" and "right ID, wrong cohort" —
  // distinguishing them would tell a guesser when they have found a live ID.
  const intern =
    cohortMatch.length > 0 ? await lookupInternByCode({ internCode, cohortId }) : null;
  if (!intern || !cohortMatch[0]) {
    await recordFailure(ip);
    return {
      error:
        "We couldn't find that Intern ID in the selected cohort. Check both, or ask your supervisor.",
      fields,
    } satisfies ActionError;
  }

  // 5. Sign. employerId comes from the verified cohort row, never the form.
  const signed = signInternIdentityCookie({
    internId: intern.id,
    internCode: intern.internCode,
    cohortId: intern.cohortId,
    employerId: cohortMatch[0].employerId,
  });
  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    serializeInternIdentityCookie(signed, { isProd: env.APP_URL.startsWith('https://') }),
  );
  throw redirect('/intern/assessments', { headers });
}
```

- [ ] **Step 3: Chip call and the gate form**

In the confirmed branch, the chip call becomes:
```tsx
            <IdentityConfirmedChip
              internCode={identity.internCode}
              employerName={identity.employerName}
              cohortName={identity.cohortName}
            />
```

In `IdentityGate`, change the `IdentityCard` `subnote` to `"UNIQUE KEY · EMPLOYER + COHORT + INTERN ID"`, change the grid class to `"id-grid id-grid--3"`, and replace the four fields with these three, in this order:

```tsx
                <div className="field">
                  <label htmlFor="employerId">Employer</label>
                  <select
                    id="employerId"
                    name="employerId"
                    className="select"
                    required
                    value={employerId}
                    onChange={(e) => setEmployerId(e.target.value)}
                  >
                    <option value="">Select employer</option>
                    {employers.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="cohortId">Cohort</label>
                  <select
                    id="cohortId"
                    name="cohortId"
                    className="select"
                    required
                    disabled={!employerId}
                    defaultValue={actionData?.fields?.cohortId ?? ''}
                  >
                    <option value="">
                      {employerId ? 'Select cohort' : 'Select employer first'}
                    </option>
                    {filteredCohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="internCode">Intern ID</label>
                  <input
                    id="internCode"
                    name="internCode"
                    className="input intern-code"
                    type="text"
                    required
                    placeholder="IMP-26-0417"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    defaultValue={actionData?.fields?.internCode ?? ''}
                  />
                </div>
```

Add to `app/styles/admin.css` next to `.id-grid--4`:
```css
.id-grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
```
(mirror whatever responsive rule `.id-grid--4` has for narrow widths).

Update the file's header comment: "4-field identity gate (First Initial / Last Name / Employer / Cohort)" → "3-field identity gate (Employer / Cohort / Intern ID)"; "runs lookupInternByIdentity" → "checks the per-IP throttle, normalises the ID, verifies the cohort belongs to the chosen employer, runs lookupInternByCode".

- [ ] **Step 4: Do not typecheck yet** — proceed to B6, which changes the chip's props.

---

### Task B6: Chip, forms, confirmation render the code

**Files:**
- Modify: `app/components/forms/IdentityConfirmedChip.tsx`, `app/components/forms/AssessmentForm.tsx:50-56, 118-124`, `app/routes/_public.intern.personal-goals.tsx`, `app/routes/_public.intern.midpoint-reflection.tsx`, `app/routes/_public.intern.participant-feedback.tsx`, `app/routes/_public.intern.confirmation.tsx:108-118, 150-158`
- Test: whichever of `tests/components/*.test.tsx` renders `IdentityConfirmedChip` or `AssessmentForm` with `firstInitial`/`lastName` props — `grep -rl "firstInitial" tests/components`.

- [ ] **Step 1: The chip**

In `IdentityConfirmedChip.tsx` replace `firstInitial: string; lastName: string;` in the props with `internCode: string;`, remove `const displayName = …`, and render:
```tsx
      <span className="identity-confirmed__label">Confirmed as</span>
      <span className="identity-confirmed__value">
        <InternCode code={internCode} />
      </span>
```
with `import { InternCode } from '../InternCode';` and the destructuring updated. Update the header comment ("4 label/value pairs" → "Intern ID, employer and cohort").

- [ ] **Step 2: AssessmentForm's `identityChip` prop type**

In `AssessmentForm.tsx` lines ~50-56 change `firstInitial: string; lastName: string;` to `internCode: string;`, and at ~118-124 pass `internCode={props.identityChip.internCode}` instead of the two name props.

- [ ] **Step 3: The three form routes and the confirmation page**

In each of `_public.intern.personal-goals.tsx`, `_public.intern.midpoint-reflection.tsx`, `_public.intern.participant-feedback.tsx`: in the loader's returned `identity` replace `firstInitial: identity.firstInitial, lastName: identity.lastName,` with `internCode: identity.internCode,`; in the JSX `identityChip={{ … }}` replace the two name lines with `internCode: identity.internCode,`.

In `_public.intern.confirmation.tsx` the loader's identity becomes `{ internCode: identity.internCode, employerName…, cohortName… }` and the receipt items' first two entries become one:
```tsx
    { label: 'Intern ID', value: identity?.internCode ?? '—', mono: true },
```

- [ ] **Step 4: Component tests**

For each test found by `grep -rl "firstInitial" tests/components`, replace `firstInitial: 'X', lastName: 'Y'` (or the equivalent props) with `internCode: 'IMP-26-1042'`, and any assertion on `X. Y` text with `IMP-26-1042`.

- [ ] **Step 5: Typecheck, lint, unit — then commit B5 + B6 together**

```bash
npm run typecheck && npm run lint && npm test -- --run
```
Expected: clean. If `typecheck` still lists a `firstInitial`/`lastName` on an identity object, it is a caller you missed — `grep -rn "identity.firstInitial\|identity.lastName" app`.

Manual: `npm run dev` → `/intern/assessments` → pick Northside's cohort, enter `imp 26 4001` → Confirm. Expected: chip reads **Confirmed as IMP-26-4001**. Switch → enter `IMP-26-0000` → the "couldn't find" message. Enter `hello` → the "form IMP-26-0417" message.

```bash
git add app/routes/_public.intern.assessments.tsx app/components/forms/IdentityConfirmedChip.tsx \
        app/components/forms/AssessmentForm.tsx app/routes/_public.intern.personal-goals.tsx \
        app/routes/_public.intern.midpoint-reflection.tsx app/routes/_public.intern.participant-feedback.tsx \
        app/routes/_public.intern.confirmation.tsx app/styles/admin.css tests/components
git commit -m "feat(intern-id): chooser takes Employer, Cohort, Intern ID with throttle"
```

---

### Task B7: E2E and RLS coverage

**Files:**
- Modify: `tests/e2e/intern-self-submit.spec.ts:18-70`
- Create: `tests/e2e/intern-throttle.spec.ts`, `tests/rls/identity-attempts.test.ts`

- [ ] **Step 1: `intern-self-submit` signs in with the seeded code**

Replace the `TEST_INTERN_FI` / `TEST_INTERN_LN` constants with:
```ts
const TEST_INTERN_CODE = 'IMP-26-4001'; // T. Test1 — db/seed-data/interns.ts
```
Replace the two `fill` lines for first initial and last name, and reorder so the selects come first:
```ts
  await page.getByLabel(/^Employer$/i).selectOption({ label: TEST_EMPLOYER_NAME });
  const cohortSelect = page.getByLabel(/^Cohort$/i);
  await cohortSelect.selectOption({ label: TEST_COHORT_NAME });
  await page.getByLabel(/Intern ID/i).fill(TEST_INTERN_CODE);
```
Wherever the spec asserts the chip text contains the name, assert `TEST_INTERN_CODE` instead. Wherever it tests the unknown-identity error, fill `IMP-26-0000` and assert the text `/couldn't find that Intern ID/i`.

- [ ] **Step 2: New throttle spec**

Create `tests/e2e/intern-throttle.spec.ts`:

```ts
// Intern-ID chooser throttle (spec §7): ten failed confirmations from one IP
// inside fifteen minutes refuse the eleventh. Runs under an isolated
// x-forwarded-for so it cannot lock out intern-self-submit, which shares the
// dev server's real client IP. In production Netlify's
// x-nf-client-connection-ip wins, so this header cannot dodge the throttle.
import { test, expect } from '@playwright/test';

const EMPLOYER = 'Northside Health Partners'; // matches intern-self-submit.spec.ts
const COHORT = 'Northside CNA Spring 2026';

test.use({ extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.7' } });

test('eleventh failed confirmation is refused', async ({ page }) => {
  await page.goto('/intern/assessments');
  for (let i = 1; i <= 10; i++) {
    await page.getByLabel(/^Employer$/i).selectOption({ label: EMPLOYER });
    await page.getByLabel(/^Cohort$/i).selectOption({ label: COHORT });
    await page.getByLabel(/Intern ID/i).fill(`IMP-26-${String(i).padStart(4, '0')}`);
    await page.getByRole('button', { name: /^Confirm/i }).click();
    await expect(page.getByRole('alert')).toContainText(/couldn't find that Intern ID/i);
  }
  await page.getByLabel(/^Employer$/i).selectOption({ label: EMPLOYER });
  await page.getByLabel(/^Cohort$/i).selectOption({ label: COHORT });
  await page.getByLabel(/Intern ID/i).fill('IMP-26-4001'); // a REAL code — still refused
  await page.getByRole('button', { name: /^Confirm/i }).click();
  await expect(page.getByRole('alert')).toContainText(/Too many attempts/i);
});
```
Copy the exact employer/cohort names from `intern-self-submit.spec.ts` constants — do not guess them.

- [ ] **Step 3: RLS test — anon and authenticated cannot read `identity_attempts`**

Create `tests/rls/identity-attempts.test.ts`, modelled on `tests/rls/assessment-submissions.test.ts` (same dotenv preamble and setup import):

```ts
import { config } from 'dotenv';
config({ path: '.env.local' });
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('RLS: identity_attempts is invisible to the JWT roles', () => {
  it('anon-key client cannot select', async () => {
    const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const { data, error } = await anon.from('identity_attempts').select('id').limit(1);
    // RLS enabled with no policies → zero rows (PostgREST returns [] not an error).
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('anon-key client cannot insert', async () => {
    const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const { error } = await anon.from('identity_attempts').insert({ ip: '203.0.113.1' });
    expect(error).toBeTruthy();
  });
});
```
This runs only in CI (`supabase start`); the local guard refuses cloud hosts.

- [ ] **Step 4: Run e2e locally, commit**

```bash
npm run test:e2e -- tests/e2e/intern-self-submit.spec.ts tests/e2e/intern-throttle.spec.ts
```
Expected: both PASS. Running the throttle spec twice within 15 minutes still passes (its IP is isolated and already throttled — the loop's ten failures also see the "Too many" message only after the tenth, so if a rerun fails at iteration 1 with "Too many attempts", wait 15 minutes or clear the table on impact-dev: `delete from identity_attempts where ip = '203.0.113.7'` via the supabase-dev MCP).

```bash
git add tests/e2e/intern-self-submit.spec.ts tests/e2e/intern-throttle.spec.ts tests/rls/identity-attempts.test.ts
git commit -m "test(intern-id): e2e sign-in by code, throttle spec, identity_attempts RLS"
```

---

### Task B8: Docs, PR, staging, prod migration, merge

- [ ] **Step 1: CLAUDE.md**

In the **SP4 — Intern identity (anonymous flow)** section: replace the cookie's described payload and revalidation — "`(firstInitial, lastName, cohortId)` triple" → "`(internCode, cohortId)` pair"; the identity gate description "the intern exists" → "the normalised Intern ID resolves in the chosen cohort". In **Anonymous submission path (do NOT generalize)** change the sentence "Never call `dbService` outside this path" to "`dbService` has exactly two sanctioned anonymous callers: this submission path and the identity throttle (`identity-throttle.server.ts`). Never add a third."

Add to the **Intern ID** section from A8:
```markdown
- **Chooser order is Employer → Cohort → Intern ID**; the action runs throttle → normalise →
  cohort∈employer → lookup → sign, and returns ONE message for unknown-ID and wrong-cohort.
- **Throttle**: ≥10 failures/IP/15 min (`identity_attempts`, service-role only, RLS on with no
  policies). Fails open. `x-nf-client-connection-ip` beats `x-forwarded-for`. The e2e throttle
  spec pins `x-forwarded-for: 203.0.113.7` so it never locks out `intern-self-submit`.
- **Legacy cookies** (name-shaped payload) fail the type guard and fall back to the chooser.
```

- [ ] **Step 2: Push, PR, CI**

```bash
npm run lint && npm run typecheck && npm test -- --run
git add CLAUDE.md && git commit -m "docs: intern ID chooser + throttle contracts"
git push -u origin feat/intern-code-identity
gh pr create --base main --title "feat: interns sign in with their Intern ID (PR B of 3)" --body "PR B of the Intern ID rebuild (spec §6–§7). Chooser = Employer → Cohort → Intern ID; cookie carries internCode; per-IP failure throttle on identity_attempts (RLS on, no policies). Migrate prod BEFORE merging (spec §9). Staging: (replace with what Matt verified on staging before requesting merge).

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks <n> --watch --interval 20
```

- [ ] **Step 3: Staging → Matt → approval**

```bash
git push --force origin feat/intern-code-identity:staging
```
Ask Matt to sign in on staging as `IMP-26-4001` in the Northside CNA cohort, try a wrong code, and (optionally) fire eleven bad codes to see the throttle. **STOP for explicit approval.**

- [ ] **Step 4: Migrate prod, then merge**

```bash
set -a; source .env.prod.local; set +a; npm run db:migrate && npm run db:apply-policies
```
Verify via supabase-prod MCP: `select relrowsecurity from pg_class where relname = 'identity_attempts'` → `true`. Fresh shell, then:
```bash
gh pr merge <n> --squash --delete-branch
git checkout main && git pull --ff-only && git push --force origin main:staging
```

---

# PR C — Remove names (`feat/intern-code-drop-names`)

State after C: no name anywhere — schema, forms, displays, seeds, tests. **Merge first, then migrate prod** (the old app still selects the columns).

### Task C1: Create form drops the name fields

**Files:**
- Modify: `app/routes/admin.interns.new.tsx` (validation, action, the "Personal Information" panel), `app/lib/intern-code.server.ts` (`NewInternValues`), `tests/routes/admin.interns.new.test.ts`, `tests/lib/intern-code.server.test.ts`

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull --ff-only && git checkout -b feat/intern-code-drop-names
```

- [ ] **Step 2: Update the tests first**

In `tests/routes/admin.interns.new.test.ts`: remove `fd.set('firstName', …)` / `fd.set('lastName', …)` lines from both action tests; in the missing-fields test change the expected fields to `['employerId', 'cohortId', 'startDate']`; in the create test drop `firstInitial`/`lastName` from `expect.objectContaining`. In `tests/lib/intern-code.server.test.ts` remove `firstInitial`/`lastName` from `VALUES`.

Run: `npx vitest run tests/routes/admin.interns.new.test.ts tests/lib/intern-code.server.test.ts` — the create-path assertions now FAIL on the still-present name validation.

- [ ] **Step 3: Remove names from the generator and the route**

`app/lib/intern-code.server.ts`: delete `firstInitial: string; lastName: string;` from `NewInternValues` and the two matching lines in the `.values({ … })` call.

`app/routes/admin.interns.new.tsx`:
- Delete `firstName: requireString('First Name'),` and `lastName: requireString('Last Name'),` from `parseFormFields`; delete the paragraph comment about the first-name hint; delete `const firstInitial = …`; delete `firstInitial,` and `lastName: values.lastName,` from the `createInternWithCode` call.
- Delete the entire `pgCode === '23505'` branch in the catch (the composite name index is dropped in C4; any other 23505 is a genuine bug and should surface).
- Replace the "Personal Information" `RubricPanel` (num `01`) with:

```tsx
              <RubricPanel
                num="01"
                title="Identity"
                meta="The portal assigns an Intern ID when you save. No name is stored — record the ID against the intern in the program roster."
              >
                <div style={{ padding: '22px 28px', color: 'var(--muted)', fontSize: 14 }}>
                  The Intern ID (<span className="intern-code">IMP-YY-NNNN</span>) is issued on save
                  and shown on the next screen with a Copy button.
                </div>
              </RubricPanel>
```
- Remove `requireString` from the validation import if nothing else in the file uses it.

- [ ] **Step 4: Run, typecheck, commit**

```bash
npx vitest run tests/routes/admin.interns.new.test.ts tests/lib/intern-code.server.test.ts && npm run typecheck
git add app/routes/admin.interns.new.tsx app/lib/intern-code.server.ts tests/routes/admin.interns.new.test.ts tests/lib/intern-code.server.test.ts
git commit -m "feat(intern-id): create form no longer collects a name"
```

---

### Task C2: Every display renders the ID

**Files:** (each listed file has `firstInitial`/`lastName` today — `grep -rln "firstInitial\|lastName" app`)
- `app/lib/admin-queries.server.ts` — remove the two name columns from `listInternsByCohort`, `listInternsForListing`, `getInternOrNull`; in `listRecentActivity` replace `internLastName`/`internFirstInitial` with `internCode: interns.internCode`.
- `app/routes/admin._index.tsx:72` and `app/routes/employer._index.tsx:64,88` — the activity `actor` becomes `a.internCode` (employer's inline select changes `internLastName: interns.lastName` → `internCode: interns.internCode`).
- `app/routes/admin.interns._index.tsx` — delete the "Intern" name column (`<th>` and `<td>`; `colSpan` back to `6`; widths: ID 20%, Cohort 22%, Start 14%, Role 14%, Outcome 16%, Actions 14%); haystack `${i.internCode} ${i.cohortName}`; placeholder `"Search by Intern ID or cohort..."`; `pendingDelete.name` → `i.internCode`; drop the `initials` import if unused.
- `app/routes/admin.interns.$internId.tsx` — delete the `First Initial` and `Last Name` MetaStrip items; the status string at ~442 becomes `` `INTERN RECORD · ${intern.internCode}${cohort ? ' / ' + cohort.name.toUpperCase() : ''}` ``.
- `app/components/forms/CompetencyAssessmentForm.tsx:40,140` — rename `meta.internName` → `meta.internCode`; render `{ label: 'Intern', value: props.meta.internCode }` (MetaStrip `mono: true`).
- The seven `internName:` call sites (`admin.assessments.competency.{new,edit.$id,$id}.tsx`, `employer.competency.{new,edit,$id}.tsx`, `admin.settings.questions.competency._index.tsx:94,268`) — pass `internCode: intern.internCode`; the settings index's fallback becomes `i ? i.internCode : (s.internId ?? '—')` and renders `<InternCode code={r.internCode} />`.
- `app/routes/admin.settings.questions.competency.intern.$internId.tsx`, `admin.self-assessment-results.tsx`, `admin.self-assessment-detail.tsx`, `admin.assessments._index.tsx`, `employer.interns._index.tsx`, `employer.interns.$internId.tsx`, `employer.cohorts.$cohortId.tsx`, `employer.assessments._index.tsx` — every `{x.firstInitial}. {x.lastName}` → `<InternCode code={x.internCode} />`; every select of the two name columns → `internCode: interns.internCode`; any `orderBy(asc(interns.lastName))` → `asc(interns.internCode)`; any `.name-initial` avatar using `initials(lastName)` is removed with its wrapper (`grep -n "name-initial"`).
- `app/routes/dev.primitives.tsx` — showcase strings `'M. Bayer'` → `'IMP-26-0417'`; `internName` → `internCode`.
- `app/lib/employer-scope.server.ts` — if it selects the name columns for `internsForEmployer`, switch to `internCode`.

- [ ] **Step 1: Make the edits file by file, typechecking after each**

Work down the list; after each file run `npm run typecheck` and fix what it reports for that file only. When the list is done:

```bash
grep -rn "firstInitial\|lastName\|internName\|name-initial" app --include=*.ts --include=*.tsx
```
Expected: **no output**.

- [ ] **Step 2: Update route/lib unit tests**

`grep -rln "firstInitial\|lastName\|internName" tests/routes tests/lib tests/components` — in each, replace fixture fields with `internCode: 'IMP-26-1042'` (or the seeded code that fixture represents) and any rendered-name assertion with the code. Run `npm test -- --run` until green.

- [ ] **Step 3: Manual check and commit**

`npm run dev`: admin intern list (ID only), intern detail (strip shows Intern ID, no name), a competency assessment view (meta shows the ID), employer intern list, admin home Recent Activity actor shows an ID.

```bash
git add -A app tests/routes tests/lib tests/components
git commit -m "feat(intern-id): render the Intern ID everywhere a name was shown"
```

---

### Task C3: Seeds and fixtures drop names

**Files:**
- Modify: `db/seed-data/interns.ts`, `db/seed.ts`, `db/seed-demo.ts`, `tests/rls/reports-queries.test.ts`, `tests/rls/test-helpers.ts` (if it inserts interns)

- [ ] **Step 1: Remove the fields**

`db/seed-data/interns.ts`: delete `firstInitial` / `lastName` from `SeedIntern` and all six entries; rewrite the comment block above the e2e fixtures to say "Distinct fixed Intern IDs (IMP-26-4001/2/3) so each spec targets its own record." In `db/seed.ts` remove the two mapped fields and change the unknown-label error to `for intern ${i.internCode}`. In `db/seed-demo.ts` delete `FIRST_INITIALS`, `LAST_NAMES`, `internName()`, the two fields on the `internRows` type and the pushed object. In `tests/rls/reports-queries.test.ts` remove `firstInitial`/`lastName` from both fixtures.

- [ ] **Step 2: Typecheck and unit-test, commit — do NOT reseed yet**

The name columns are still `NOT NULL` on impact-dev until C4 migrates it, so a seed run here
would fail. C4 Step 4 runs both seeds.

```bash
npm run typecheck && npm test -- --run
git add db tests/rls
git commit -m "feat(intern-id): seeds and fixtures carry no names"
```

---

### Task C4: Migration 0007 — drop the name columns

**Files:**
- Modify: `db/schema.ts` (interns)
- Create: `db/migrations/0007_drop_intern_names.sql` (generated, hand-verified)

- [ ] **Step 1: Schema**

In `db/schema.ts` `interns`: delete `firstInitial` and `lastName` columns, the `firstInitialLen` check, and the `identityIdx` unique index. If `check` is now unused in the file's drizzle import, remove it.

- [ ] **Step 2: Generate and verify**

```bash
npx drizzle-kit generate --name drop_intern_names
```
Expected `0007_drop_intern_names.sql` contains exactly (order may vary):
```sql
DROP INDEX IF EXISTS "interns_identity_unique";--> statement-breakpoint
ALTER TABLE "interns" DROP CONSTRAINT "interns_first_initial_len";--> statement-breakpoint
ALTER TABLE "interns" DROP COLUMN IF EXISTS "first_initial";--> statement-breakpoint
ALTER TABLE "interns" DROP COLUMN IF EXISTS "last_name";
```
If drizzle emitted the constraint drop *after* the column drop, reorder so the constraint goes first (dropping the column would drop the constraint implicitly and the later statement would error). If it emitted anything else — a `CREATE TABLE`, a rename prompt — STOP: the schema edit went wrong.

```bash
npx drizzle-kit generate
```
Expected: "No schema changes".

- [ ] **Step 3: Apply to impact-dev (fresh backup first)**

Confirm today's impact-dev backup in the dashboard, then:
```bash
npm run db:migrate
```

- [ ] **Step 4: Reseed dev, run everything**

```bash
npm run db:seed && npm run db:seed:demo
npm run lint && npm run typecheck && npm test -- --run
grep -rn "first_initial\|firstInitial\|last_name\|lastName" app db tests scripts --include=*.ts --include=*.tsx --include=*.sql | grep -v "db/migrations/"
```
Expected: seeds succeed; suites green; the grep prints **nothing** (only migration files may still mention the old columns).

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts db/migrations/0007_drop_intern_names.sql db/migrations/meta/0007_snapshot.json db/migrations/meta/_journal.json
git commit -m "feat(intern-id): drop first_initial and last_name from interns"
```

---

### Task C5: Docs and status

**Files:**
- Modify: `CLAUDE.md`, `docs/launch-todo.md`, `docs/dev-portal/data/status.json`, `docs/superpowers/plans/2026-05-10-sub-project-4-assessment-forms.md` (obsolescence note only)

- [ ] **Step 1: CLAUDE.md**

- **Product rules to know**: replace the "Unique intern identifier" bullet with: "**Intern identity** is a portal-assigned **Intern ID** (`IMP-YY-NNNN`). The portal stores **no name of any kind** (client decision 2026-09-11). Program staff keep the ID↔person roster offline. Cohort implies employer; the chooser asks for both plus the ID."
- Replace the **Minimum-PII policy** bullet with: "**Minimum-PII policy**: the intern record carries the Intern ID, cohort, role, dates and assessment data. No first name, initial, last name, DOB, or zipcode."
- Delete the **SP2 (Admin core) — key carry-over** first bullet about the first-name hint / `requireSingleCharUpper` (obsolete — the fields no longer exist).
- In the Intern ID section add: "**PR C removed the name columns (migration 0007).** `first_initial`/`last_name` exist only in migration history. Do not reintroduce a name field under any label."
- Update the **What this project is** paragraph's test counts after CI reports them.

- [ ] **Step 2: launch-todo + status.json**

In `docs/launch-todo.md` add under a new `## Follow-ups from the Intern ID rebuild (2026-09-11)`:
```markdown
- [ ] **Regenerate the Quick Start & Testing Guide** — its screenshots show the old chooser
      (initial + last name) and create form. `docs/quick-start-guide/capture.ts` + `render.ts`
      against staging once PR C is there.
- [ ] **Recover pre-2026-09-11 impact-dev `assessment_submissions`** from the Supabase backup
      taken ~07:00Z that day (KP July data + the Whitaker record). Download or restore to a
      throwaway project; never "Restore" over live dev.
- [ ] **Intern ID re-issue path** (spec D6 follow-up) if the program ever asks.
```
In `docs/dev-portal/data/status.json` add a milestone entry for the Intern ID rebuild (three PR numbers, date) following the existing entries' shape.

In `docs/superpowers/plans/2026-05-10-sub-project-4-assessment-forms.md` add one line under its title: "> **2026-09-11:** the First Initial + Last Name identity this plan built was replaced by the Intern ID — see `docs/superpowers/specs/2026-09-11-intern-id-identity-design.md`."

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/launch-todo.md docs/dev-portal/data/status.json docs/superpowers/plans/2026-05-10-sub-project-4-assessment-forms.md
git commit -m "docs: intern ID replaces name identity; follow-ups and status"
```

---

### Task C6: PR, staging, merge, THEN migrate prod

- [ ] **Step 1: E2E sweep, push, PR, CI**

```bash
npm run test:e2e
git push -u origin feat/intern-code-drop-names
gh pr create --base main --title "feat: remove intern names — Intern ID only (PR C of 3)" --body "PR C of the Intern ID rebuild (spec §4, §6, §9). Drops first_initial/last_name (migration 0007), removes every name rendering and the name-based seeds/tests. **Merge FIRST, then migrate prod** — the old app still selects the columns. Staging: (replace with what Matt verified on staging before requesting merge).

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks <n> --watch --interval 20
```

- [ ] **Step 2: Staging → Matt → approval**

```bash
git push --force origin feat/intern-code-drop-names:staging
```
Matt walks: create intern (no name fields; callout), intern list, detail, an assessment view, intern sign-in. **STOP for explicit approval.**

- [ ] **Step 3: Confirm a fresh impact-PROD backup exists**, then merge, wait for the production deploy to be `ready`, then migrate:

```bash
gh pr merge <n> --squash --delete-branch
git checkout main && git pull --ff-only && git push --force origin main:staging
netlify api listSiteDeploys --data '{"site_id":"6e071577-7adb-4cae-82d6-b2b2b66a47aa","per_page":1}' | grep -E '"(state|context|created_at)"'
```
When `state` is `ready` for the `production` context:
```bash
set -a; source .env.prod.local; set +a; npm run db:migrate
```
Verify via supabase-prod MCP: `select column_name from information_schema.columns where table_name='interns'` → no `first_initial`, no `last_name`. Then load `impact-portal-app.netlify.app/admin/interns` and `/intern/assessments` — both 200.

- [ ] **Step 4: Memory + close-out**

Record in the project memory: all three PR numbers, the prod migration timestamps, and that the Quick Start regeneration and backup recovery remain open.
