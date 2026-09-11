# Internship Participation Factors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Entry Assessment "Barriers" list with eight PII-safe "Internship Participation Factors", renaming the concept down to the database.

**Architecture:** Two pull requests. PR 1 renames `barriers` → `participation_factors` everywhere (database, RLS policies, code, route URL, tests) while keeping the twelve existing values, so a green CI run proves the rename is complete. PR 2 adds `description` and `code` columns, seeds the eight new values, teaches the Reports query to count honestly, and re-points demo data on impact-dev.

**Tech Stack:** React Router v7 (framework mode, config routing) · Drizzle ORM 0.36 + drizzle-kit · Supabase Postgres with RLS · Vitest 3 (unit + jsdom + RLS projects) · Playwright · TypeScript 5.7

**Spec:** `docs/superpowers/specs/2026-09-11-internship-participation-factors-design.md`

## Global Constraints

- **Conventional Commits**, enforced by commitlint + Husky. Subject ≤ 72 chars, body lines ≤ 100 chars.
- **Branch protection on `main`.** No direct pushes; squash-merge PRs only.
- **TDD is mandatory.** Every code change gets a test that was watched failing first.
- **Never run `npm run db:seed` against impact-dev during this work.** It wipes the database, destroying the KP July 2026 testing records and the duplicate Whitaker rows that are evidence for an open bug.
- **Migrations, policies and seeds are never run by the Netlify build.** Apply them manually per environment.
- **`db/policies/*.sql` must stay idempotent** — every `CREATE POLICY` preceded by `DROP POLICY IF EXISTS`.
- **Do not use `.card`, `.card__head`, `.card__title`, or `.data-table`** — these CSS classes do not exist. The real classes are `.identity-card`, `.assessments`, `.settings-list`.
- Exact label and description strings are in the spec §3 and must be copied **verbatim**, including capitalisation and the parenthetical in item 5.

---

## File Structure

**PR 1 — rename (no behaviour change)**

| File | Responsibility after change |
|---|---|
| `db/schema.ts` | `participationFactors` / `internParticipationFactors` table defs |
| `db/migrations/0003_rename_participation_factors.sql` | Generated `ALTER … RENAME` + hand-appended `DROP POLICY` |
| `db/migrations/meta/_journal.json` | Registers migration 0003 (drizzle writes this) |
| `db/policies/0001_enable_rls.sql` | `ENABLE ROW LEVEL SECURITY` on new table names |
| `db/policies/0002_admin_all.sql` | `admin_all_participation_factors`, `admin_all_intern_participation_factors` |
| `db/policies/0003_employer_scope.sql` | `any_authenticated_reads_participation_factors`, `employer_read_participation_factors` |
| `db/seed-data/participation-factors.ts` | Renamed from `barriers.ts`; values unchanged in PR 1 |
| `db/seed.ts`, `db/seed-prod.ts`, `db/seed-demo.ts` | Consume the renamed seed export |
| `app/lib/admin-queries.server.ts` | `listParticipationFactors()` |
| `app/lib/reports-queries.server.ts` | `getParticipationFactorDistribution()` |
| `app/lib/reports-types.ts` | `participationFactors` field on the payload |
| `app/components/ParticipationFactorCheckList.tsx` | Renamed from `BarrierCheckList.tsx` |
| `app/routes/admin.settings.participation-factors.tsx` | Renamed settings route |
| `app/routes.ts` | `/admin/settings/participation-factors` |
| `app/components/SettingsRail.tsx` | Tab id + label |
| `app/components/reports/ReportsDashboard.tsx` | Card title |
| `app/styles/admin.css` | `.participation-factor-check-list` |

**PR 2 — values and behaviour**

| File | Responsibility |
|---|---|
| `db/migrations/0004_participation_factor_description.sql` | `ADD COLUMN description`, `ADD COLUMN code` |
| `app/lib/validation.ts` | `parseInlineRows` parses an optional `description` |
| `app/components/InlineEditableList.tsx` | Optional description input per row |
| `db/seed-data/participation-factors.ts` | The eight new values |
| `app/lib/reports-queries.server.ts` | The `code = 'none'` counting rule |
| `scripts/repoint-dev-participation-factors.ts` | One-off impact-dev re-point |

---

## PR 1 — Pure rename

### Task 1: Rename the tables in schema and database

**Files:**
- Modify: `db/schema.ts:174-179` (`barriers`), `db/schema.ts:235-248` (`internEntryBarriers`)
- Create: `db/migrations/0003_rename_participation_factors.sql` (via drizzle-kit)
- Modify: `db/migrations/meta/_journal.json` (drizzle-kit writes this)

**Interfaces:**
- Consumes: nothing
- Produces: `participationFactors` (columns `id`, `label`, `sortOrder`, `createdAt`) and `internParticipationFactors` (columns `internId`, `participationFactorId`) exported from `db/schema.ts`

- [ ] **Step 1: Rename the table definitions in `db/schema.ts`**

```ts
export const participationFactors = pgTable('participation_factors', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull(),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const internParticipationFactors = pgTable(
  'intern_participation_factors',
  {
    internId: uuid('intern_id')
      .notNull()
      .references(() => interns.id, { onDelete: 'cascade' }),
    participationFactorId: uuid('participation_factor_id')
      .notNull()
      .references(() => participationFactors.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.internId, t.participationFactorId] }),
  }),
);
```

- [ ] **Step 2: Generate the migration INTERACTIVELY**

> **This step must be run by a human in a real terminal — it is a prompt, not a flag.**
> In Claude Code, prefix with `!` so the output lands in the session.

Run: `npx drizzle-kit generate`

Drizzle will ask whether each table is *created* or *renamed*. Answer **renamed**:

```
Is participation_factors table created or renamed from another table?
  › + participation_factors        create table
    ~ barriers › participation_factors   rename table      ← CHOOSE THIS

Is intern_participation_factors table created or renamed from another table?
    ~ intern_entry_barriers › intern_participation_factors  ← CHOOSE THIS

Is participation_factor_id column created or renamed?
    ~ barrier_id › participation_factor_id                  ← CHOOSE THIS
```

Expected: a new `db/migrations/0003_*.sql` containing only `ALTER … RENAME` statements, plus a new `_journal.json` entry and `meta/0003_snapshot.json`.

**If the generated file contains `DROP TABLE`, STOP.** A wrong answer was given. Delete the generated file, revert the journal, and re-run.

- [ ] **Step 3: Verify the generated SQL, then append the policy drops**

Confirm the file reads (names may be ordered differently):

```sql
ALTER TABLE "barriers" RENAME TO "participation_factors";--> statement-breakpoint
ALTER TABLE "intern_entry_barriers" RENAME TO "intern_participation_factors";--> statement-breakpoint
ALTER TABLE "intern_participation_factors" RENAME COLUMN "barrier_id" TO "participation_factor_id";
```

Append by hand — drizzle has no knowledge of policies, and Postgres policies travel with a renamed table, so the old names are still attached:

```sql
--> statement-breakpoint
-- Policies follow a renamed table, so participation_factors still carries
-- policies literally named *_barriers. Drop them here so the rewritten policy
-- files in db/policies can recreate them under the new names. These cannot be
-- dropped from the policy files themselves: `DROP POLICY IF EXISTS x ON
-- public.barriers` would error, because IF EXISTS guards the policy, not the
-- table, and public.barriers no longer exists.
DROP POLICY IF EXISTS admin_all_barriers ON public.participation_factors;--> statement-breakpoint
DROP POLICY IF EXISTS any_authenticated_reads_barriers ON public.participation_factors;--> statement-breakpoint
DROP POLICY IF EXISTS admin_all_intern_entry_barriers ON public.intern_participation_factors;--> statement-breakpoint
DROP POLICY IF EXISTS employer_read_entry_barriers ON public.intern_participation_factors;
```

- [ ] **Step 4: Apply to impact-dev and verify data survived**

Run: `npm run db:migrate`

Then confirm no rows were lost (the whole point of `ALTER … RENAME`):

```bash
psql "$DATABASE_URL" -c "select count(*) from participation_factors;"
psql "$DATABASE_URL" -c "select count(*) from intern_participation_factors;"
```

Expected: 12 factors, and a non-zero join count matching what existed before.

- [ ] **Step 5: Commit**

```bash
git add db/schema.ts db/migrations
git commit -m "refactor: rename barriers tables to participation_factors"
```

---

### Task 2: Rewrite the RLS policies

**Files:**
- Modify: `db/policies/0001_enable_rls.sql:9,12`
- Modify: `db/policies/0002_admin_all.sql:38-39,53-54`
- Modify: `db/policies/0003_employer_scope.sql:17,22-23,92-94`

**Interfaces:**
- Consumes: renamed tables from Task 1
- Produces: policies `admin_all_participation_factors`, `admin_all_intern_participation_factors`, `any_authenticated_reads_participation_factors`, `employer_read_participation_factors`

`db/policies/0000_grants.sql` needs **no change** — it grants via `GRANT ALL ON ALL TABLES IN SCHEMA public`, which names no table.

- [ ] **Step 1: Update `0001_enable_rls.sql`**

```sql
ALTER TABLE public.participation_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_participation_factors ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Update `0002_admin_all.sql`**

```sql
DROP POLICY IF EXISTS admin_all_participation_factors ON public.participation_factors;
CREATE POLICY admin_all_participation_factors ON public.participation_factors FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS admin_all_intern_participation_factors ON public.intern_participation_factors;
CREATE POLICY admin_all_intern_participation_factors ON public.intern_participation_factors FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
```

> Keep the existing `USING` / `WITH CHECK` expressions exactly as they are in the current file — only the policy and table names change. Read lines 38-39 and 53-54 before editing.

- [ ] **Step 3: Update `0003_employer_scope.sql`**

Rename the comment on line 17 to "phases + participation factors", then:

```sql
DROP POLICY IF EXISTS any_authenticated_reads_participation_factors ON public.participation_factors;
CREATE POLICY any_authenticated_reads_participation_factors ON public.participation_factors FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS employer_read_participation_factors ON public.intern_participation_factors;
CREATE POLICY employer_read_participation_factors ON public.intern_participation_factors FOR SELECT TO authenticated
  USING (<keep the existing employer-scope expression from line 94>);
```

- [ ] **Step 4: Apply and confirm the stale policies are gone**

Run: `npm run db:apply-policies`

```bash
psql "$DATABASE_URL" -c "select policyname, tablename from pg_policies where tablename like '%participation%' order by tablename, policyname;"
```

Expected: exactly the four new names. **No policy name containing `barrier` may remain** — if one does, Task 1 Step 3's drops were missed.

- [ ] **Step 5: Commit**

```bash
git add db/policies
git commit -m "refactor: rename barrier RLS policies to participation factors"
```

---

### Task 3: Rename the server query layer

**Files:**
- Modify: `app/lib/admin-queries.server.ts:254-256`
- Modify: `app/lib/reports-queries.server.ts:19-20,172-185,209-218`
- Modify: `app/lib/reports-types.ts:27`
- Test: `tests/rls/reports-queries.test.ts`

**Interfaces:**
- Consumes: `participationFactors`, `internParticipationFactors` from Task 1
- Produces: `listParticipationFactors(db)` → `{ id, label, sortOrder, createdAt }[]`; `getParticipationFactorDistribution(db, scope)` → `{ id, label, count }[]`; `ReportsData.participationFactors`

- [ ] **Step 1: Update the failing test first**

In `tests/rls/reports-queries.test.ts`, rename the import and call. Run it and watch it fail with `getParticipationFactorDistribution is not a function` before touching the implementation.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:rls -- tests/rls/reports-queries.test.ts`
Expected: FAIL — `getParticipationFactorDistribution is not a function`

> Requires `supabase start`. If Docker is unavailable locally, push the branch and read the RLS job on CI instead — that is the established no-Docker workflow for this repo.

- [ ] **Step 3: Rename in `admin-queries.server.ts`**

```ts
export async function listParticipationFactors(db: Database) {
  return db
    .select()
    .from(participationFactors)
    .orderBy(asc(participationFactors.sortOrder));
}
```

- [ ] **Step 4: Rename in `reports-queries.server.ts`**

```ts
export async function getParticipationFactorDistribution(db: DB, scope: ReportsScope) {
  const wherePred = internScopePredicate(scope);
  const cnt = sql<number>`count(distinct ${interns.id})::int`;
  const rows = await db
    .select({ id: participationFactors.id, label: participationFactors.label, count: cnt })
    .from(internParticipationFactors)
    .innerJoin(interns, eq(interns.id, internParticipationFactors.internId))
    .innerJoin(
      participationFactors,
      eq(participationFactors.id, internParticipationFactors.participationFactorId),
    )
    .where(wherePred)
    .groupBy(participationFactors.id, participationFactors.label)
    .orderBy(desc(cnt), asc(participationFactors.label));
  return rows.map((r) => ({ id: r.id, label: r.label, count: Number(r.count) }));
}
```

Update the `getReportsData` aggregate (around line 209) to call it and return the field as `participationFactors`.

- [ ] **Step 5: Update `reports-types.ts`**

```ts
participationFactors: { id: string; label: string; count: number }[]; // desc by count
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test:rls -- tests/rls/reports-queries.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/lib tests/rls
git commit -m "refactor: rename barrier queries to participation factors"
```

---

### Task 4: Rename components, routes and styles

**Files:**
- Rename: `app/components/BarrierCheckList.tsx` → `app/components/ParticipationFactorCheckList.tsx`
- Rename: `app/routes/admin.settings.barriers.tsx` → `app/routes/admin.settings.participation-factors.tsx`
- Rename: `tests/components/BarrierCheckList.test.tsx` → `tests/components/ParticipationFactorCheckList.test.tsx`
- Rename: `tests/routes/admin.settings.barriers.test.ts` → `tests/routes/admin.settings.participation-factors.test.ts`
- Modify: `app/routes.ts:73`, `app/components/SettingsRail.tsx:8,16`, `app/components/reports/ReportsDashboard.tsx:14,102`, `app/styles/admin.css`
- Modify: `app/routes/admin.interns.new.tsx`, `app/routes/admin.interns.$internId.tsx`, `app/routes/employer.interns.$internId.tsx`, `app/routes/admin.assessments._index.tsx`, `app/routes/admin.self-assessment-detail.tsx`, `app/routes/employer.assessments._index.tsx`, `app/routes/dev.primitives.tsx`, `app/routes/admin.settings._index.tsx`

**Interfaces:**
- Consumes: `listParticipationFactors` from Task 3
- Produces: `<ParticipationFactorCheckList factors={…} checkedIds={…} name="participationFactorIds" />`; route `/admin/settings/participation-factors`

- [ ] **Step 1: Use `git mv` so history follows the files**

```bash
git mv app/components/BarrierCheckList.tsx app/components/ParticipationFactorCheckList.tsx
git mv app/routes/admin.settings.barriers.tsx app/routes/admin.settings.participation-factors.tsx
git mv tests/components/BarrierCheckList.test.tsx tests/components/ParticipationFactorCheckList.test.tsx
git mv tests/routes/admin.settings.barriers.test.ts tests/routes/admin.settings.participation-factors.test.ts
```

- [ ] **Step 2: Rewrite the checklist component**

```tsx
export interface ParticipationFactorItem {
  id: string;
  label: string;
}

export function ParticipationFactorCheckList({
  factors,
  checkedIds,
  name = 'participationFactorIds',
  disabled,
}: {
  factors: ParticipationFactorItem[];
  checkedIds: string[];
  name?: string;
  disabled?: boolean;
}) {
  const set = new Set(checkedIds);
  return (
    <div className="participation-factor-check-list" data-participation-factor-list>
      {factors.map((f) => {
        const id = `participation-factor-${f.id}`;
        return (
          <div className="outcome-check" key={f.id}>
            <input
              type="checkbox"
              id={id}
              name={name}
              value={f.id}
              defaultChecked={set.has(f.id)}
              disabled={disabled}
            />
            <label htmlFor={id}>{f.label}</label>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Update the route table and settings rail**

`app/routes.ts:73`:

```ts
route(
  'admin/settings/participation-factors',
  'routes/admin.settings.participation-factors.tsx',
),
```

`app/components/SettingsRail.tsx` — the union member on line 8 becomes `'participation-factors'`, and line 16:

```ts
{
  tab: 'participation-factors',
  to: '/admin/settings/participation-factors',
  label: 'Participation Factors',
},
```

- [ ] **Step 4: Update the Reports card title**

`app/components/reports/ReportsDashboard.tsx:102`:

```tsx
<h3 className="report-card__title">Internship Participation Factors</h3>
```

Destructure `participationFactors` instead of `barriers` on line 14 and update its usages below.

- [ ] **Step 5: Rename the CSS class**

In `app/styles/admin.css`, rename `.barrier-check-list` → `.participation-factor-check-list`. Change **only** the selector name; leave every declaration untouched — this is a rename, not a restyle.

- [ ] **Step 6: Sweep the remaining routes**

```bash
grep -rn -i "barrier" app/ | grep -v node_modules
```

Expected after edits: **no matches.** Update every hit — page titles, `meta` functions, panel headings, variable names, loader keys.

User-facing copy uses **"Internship Participation Factors"** for headings and **"Participation Factors"** for the settings-rail tab.

- [ ] **Step 7: Verify the whole suite**

```bash
npm run typecheck && npm run lint && npm test -- --run && npm run build
```

Expected: all green. Fix any test that still imports an old name.

- [ ] **Step 8: Commit**

```bash
git add -A app tests
git commit -m "refactor: rename barrier UI to participation factors"
```

---

### Task 5: Rename the seed data module and open PR 1

**Files:**
- Rename: `db/seed-data/barriers.ts` → `db/seed-data/participation-factors.ts`
- Modify: `db/seed.ts:12,82`, `db/seed-prod.ts:10,71,74`, `db/seed-demo.ts:789`

**Interfaces:**
- Consumes: `participationFactors` table from Task 1
- Produces: `SEED_PARTICIPATION_FACTORS: SeedParticipationFactor[]` — **still the twelve original values in PR 1.** Values change in Task 8.

- [ ] **Step 1: Rename the module and its export**

```bash
git mv db/seed-data/barriers.ts db/seed-data/participation-factors.ts
```

```ts
export interface SeedParticipationFactor {
  label: string;
  sortOrder: number;
}

// Values are unchanged in PR 1 — this PR is a pure rename. The eight new
// values land in PR 2.
export const SEED_PARTICIPATION_FACTORS: SeedParticipationFactor[] = [
  { label: 'Transportation', sortOrder: 1 },
  { label: 'Childcare', sortOrder: 2 },
  { label: 'Housing instability', sortOrder: 3 },
  { label: 'Food insecurity', sortOrder: 4 },
  { label: 'Mental health', sortOrder: 5 },
  { label: 'Physical health', sortOrder: 6 },
  { label: 'Substance use recovery', sortOrder: 7 },
  { label: 'Justice-system involvement', sortOrder: 8 },
  { label: 'Limited work history', sortOrder: 9 },
  { label: 'Education / credential gap', sortOrder: 10 },
  { label: 'Digital access', sortOrder: 11 },
  { label: 'Other', sortOrder: 12 },
];
```

- [ ] **Step 2: Update the three consumers**

`db/seed.ts` and `db/seed-prod.ts` import `SEED_PARTICIPATION_FACTORS` and insert into `participationFactors`. In `db/seed-demo.ts:789`, update the pool and its comment to read "match exactly what SEED_PARTICIPATION_FACTORS defines".

- [ ] **Step 3: Verify seeds compile without running them**

```bash
npm run typecheck
```

Expected: clean. **Do not run `npm run db:seed`** — it would wipe impact-dev.

- [ ] **Step 4: Full verification**

```bash
npm run lint && npm test -- --run && npm run build
grep -rn -i "barrier" app/ db/ tests/ | grep -v node_modules
```

Expected: green, and the grep returns nothing but historical comments in `db/migrations/0000_initial_schema.sql` (which must never be edited).

- [ ] **Step 5: Commit, push and open PR 1**

```bash
git add -A db
git commit -m "refactor: rename barrier seed module to participation factors"
git push -u origin refactor/participation-factors-rename
gh pr create --title "refactor: rename barriers to participation factors" --body "Pure rename, no behaviour change. Values are unchanged; the eight new ones land in the follow-up PR. See docs/superpowers/specs/2026-09-11-internship-participation-factors-design.md"
```

- [ ] **Step 6: Confirm CI is green before starting PR 2**

Run: `gh pr checks`
Expected: all green — **especially `Vitest (integration + RLS)`, which is the real gate on the rename.**

---

## PR 2 — New values and behaviour

### Task 6: Add the `description` and `code` columns

**Files:**
- Modify: `db/schema.ts` (`participationFactors`)
- Create: `db/migrations/0004_participation_factor_description.sql` (via drizzle-kit)

**Interfaces:**
- Consumes: Task 1's tables
- Produces: `participationFactors.description: string | null`, `participationFactors.code: string | null`

- [ ] **Step 1: Add the columns to `db/schema.ts`**

```ts
export const participationFactors = pgTable('participation_factors', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label').notNull(),
  // Explanatory clause shown as helper text beneath the label. Nullable:
  // "Other participation-related factor" and "No participation factors
  // identified" carry no description.
  description: text('description'),
  // Stable identity for report logic. Seeded as 'none' on the "No
  // participation factors identified" row, null everywhere else. Never shown
  // or editable in the UI; admin-created rows never receive one. The Reports
  // rule cannot key off the label, because admins can rename any row.
  code: text('code'),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Generate the migration**

Run: `npx drizzle-kit generate`

Both columns are new and nullable, so drizzle adds them without prompting. Expected file:

```sql
ALTER TABLE "participation_factors" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "participation_factors" ADD COLUMN "code" text;
```

- [ ] **Step 3: Apply and verify**

```bash
npm run db:migrate
psql "$DATABASE_URL" -c "\d participation_factors"
```

Expected: both columns present and nullable.

- [ ] **Step 4: Commit**

```bash
git add db/schema.ts db/migrations
git commit -m "feat: add description and code to participation factors"
```

---

### Task 7: Teach the inline editor about descriptions

**Files:**
- Modify: `app/lib/validation.ts:158-190` (`parseInlineRows`)
- Modify: `app/components/InlineEditableList.tsx`
- Modify: `app/styles/admin.css` (`.settings-list__row`)
- Test: `tests/lib/validation.test.ts`, `tests/components/InlineEditableList.test.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `ParsedInlineRow` gains `description: string | null`; `<InlineEditableList withDescription />` renders a second input submitting `${name}[i].description`

`InlineEditableList` is shared with `admin.settings.phases.tsx` and `dev.primitives.tsx`. The description field is **opt-in** so those stay single-column and untouched.

- [ ] **Step 1: Write the failing parser test**

```ts
it('parses an optional description alongside the label', () => {
  const fd = new FormData();
  fd.set('factors[0].id', 'abc');
  fd.set('factors[0].label', 'Transportation/access');
  fd.set('factors[0].description', 'ability to reliably get to/from internship');
  const { rows, errors } = parseInlineRows(fd, 'factors');
  expect(errors).toHaveLength(0);
  expect(rows[0]).toEqual({
    id: 'abc',
    label: 'Transportation/access',
    description: 'ability to reliably get to/from internship',
  });
});

it('returns a null description when the field is absent', () => {
  const fd = new FormData();
  fd.set('phases[0].id', 'p1');
  fd.set('phases[0].label', 'Week 4');
  const { rows } = parseInlineRows(fd, 'phases');
  expect(rows[0]!.description).toBeNull();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/validation.test.ts --project unit`
Expected: FAIL — received object has no `description` key.

- [ ] **Step 3: Extend the parser**

The key regex on line 164 must accept the new suffix:

```ts
const keyRe = new RegExp(
  `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\[(\\d+)\\]\\.(id|label|description)$`,
);
```

and the row mapping:

```ts
const rows: ParsedInlineRow[] = ordered.map((i) => ({
  id: String(formData.get(`${name}[${i}].id`) ?? '').trim() || null,
  label: String(formData.get(`${name}[${i}].label`) ?? '').trim(),
  description: String(formData.get(`${name}[${i}].description`) ?? '').trim() || null,
}));
```

Add `description: string | null` to the `ParsedInlineRow` type. Leave the existing label-required and duplicate-label validation exactly as it is — **a blank description is valid**, since two of the eight values have none.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/lib/validation.test.ts --project unit`
Expected: PASS, and every pre-existing `parseInlineRows` test still green.

- [ ] **Step 5: Write the failing component test**

```tsx
it('renders a description input only when withDescription is set', () => {
  const rows = [{ id: '1', label: 'Transportation/access', description: 'get to/from' }];
  const { rerender } = render(
    <InlineEditableList initial={rows} addLabel="+ Add" name="factors" />,
  );
  expect(screen.queryByPlaceholderText('Description (optional)')).toBeNull();

  rerender(
    <InlineEditableList initial={rows} addLabel="+ Add" name="factors" withDescription />,
  );
  const input = screen.getByPlaceholderText('Description (optional)');
  expect(input).toHaveValue('get to/from');
  expect(input).toHaveAttribute('name', 'factors[0].description');
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest run tests/components/InlineEditableList.test.tsx --project dom`
Expected: FAIL — no element with that placeholder.

- [ ] **Step 7: Implement the optional field**

Extend `InlineRow` with `description?: string | null`, add a `withDescription?: boolean` prop, seed state with `description: r.description ?? ''`, add an `updateDescription(i, value)` setter mirroring `update`, and render inside the existing `settings-list__cell--label` cell so the three-column grid is unchanged:

```tsx
<div className="settings-list__cell settings-list__cell--label">
  <input
    type="text"
    className={`settings-list__label-input${errSet.has(i) ? ' input--error' : ''}`}
    name={`${name}[${i}].label`}
    value={row.label}
    placeholder="Label"
    onChange={(e) => update(i, e.target.value)}
  />
  {withDescription ? (
    <input
      type="text"
      className="settings-list__description-input"
      name={`${name}[${i}].description`}
      value={row.description ?? ''}
      placeholder="Description (optional)"
      onChange={(e) => updateDescription(i, e.target.value)}
    />
  ) : null}
</div>
```

Also set `description: ''` in `add()` so new rows submit the field.

- [ ] **Step 8: Add the stacking style**

In `app/styles/admin.css`, beneath the existing `.settings-list__label-input` rule:

```css
.settings-list__description-input {
  display: block;
  width: 100%;
  margin-top: 6px;
  font-size: 13px;
  color: var(--muted);
}
```

- [ ] **Step 9: Run both suites to verify they pass**

Run: `npm test -- --run`
Expected: PASS, including the untouched phases settings tests.

- [ ] **Step 10: Commit**

```bash
git add app/lib/validation.ts app/components/InlineEditableList.tsx app/styles/admin.css tests
git commit -m "feat: optional description field in the inline settings editor"
```

---

### Task 8: Persist descriptions through the settings route

**Files:**
- Modify: `app/routes/admin.settings.participation-factors.tsx` (loader, action, JSX)
- Test: `tests/routes/admin.settings.participation-factors.test.ts`

**Interfaces:**
- Consumes: `parseInlineRows` (Task 7), `participationFactors.description` (Task 6)
- Produces: loader rows shaped `{ id, label, description }`; the action writes `description` on insert and update

- [ ] **Step 1: Write the failing round-trip test**

```ts
it('persists the description on update', async () => {
  // …existing requireAdmin / db mocks from this file…
  const fd = new FormData();
  fd.set('participationFactors[0].id', EXISTING_ID);
  fd.set('participationFactors[0].label', 'Transportation/access');
  fd.set('participationFactors[0].description', 'ability to reliably get to/from internship');
  const req = new Request('https://x.test/admin/settings/participation-factors', {
    method: 'POST',
    body: fd,
  });
  await action({ request: req, params: {}, context: {} } as never);
  expect(updateSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      label: 'Transportation/access',
      description: 'ability to reliably get to/from internship',
      sortOrder: 1,
    }),
  );
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/routes/admin.settings.participation-factors.test.ts --project unit`
Expected: FAIL — `description` absent from the update payload.

- [ ] **Step 3: Thread description through loader, action and JSX**

Loader:

```ts
return data(
  { rows: rows.map((r) => ({ id: r.id, label: r.label, description: r.description })) },
  { headers },
);
```

In the action's upsert loop, add `description: r.description` to both the `.set({…})` of the update branch and the `.values({…})` of the insert branch. **Leave the delete-then-upsert transaction structure exactly as it is** — updating by id is what preserves `intern_participation_factors` FK references when labels change.

In the JSX, pass `withDescription` to the list:

```tsx
<InlineEditableList
  initial={rows}
  addLabel="+ Add participation factor"
  name="participationFactors"
  errorIndices={errorIndices}
  withDescription
/>
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/routes/admin.settings.participation-factors.test.ts --project unit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/routes/admin.settings.participation-factors.tsx tests/routes
git commit -m "feat: persist participation factor descriptions from settings"
```

---

### Task 9: Show descriptions on the entry assessment checklist

**Files:**
- Modify: `app/components/ParticipationFactorCheckList.tsx`
- Modify: `app/styles/admin.css`
- Modify: callers that build the `factors` prop — `app/routes/admin.interns.new.tsx`, `app/routes/admin.interns.$internId.tsx`, `app/routes/employer.interns.$internId.tsx`
- Test: `tests/components/ParticipationFactorCheckList.test.tsx`

**Interfaces:**
- Consumes: `participationFactors.description`
- Produces: `ParticipationFactorItem` gains `description?: string | null`

- [ ] **Step 1: Write the failing test**

```tsx
it('renders the description as helper text beneath the label', () => {
  render(
    <ParticipationFactorCheckList
      factors={[
        { id: '1', label: 'Transportation/access', description: 'ability to reliably get to/from internship' },
        { id: '2', label: 'Other participation-related factor', description: null },
      ]}
      checkedIds={[]}
    />,
  );
  expect(screen.getByText('ability to reliably get to/from internship')).toBeInTheDocument();
  // A factor with no description renders no helper element at all.
  expect(document.querySelectorAll('.participation-factor-check-list__desc')).toHaveLength(1);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/ParticipationFactorCheckList.test.tsx --project dom`
Expected: FAIL — text not found.

- [ ] **Step 3: Render the description**

Add `description?: string | null` to `ParticipationFactorItem`, and inside the `<label>`:

```tsx
<label htmlFor={id}>
  {f.label}
  {f.description ? (
    <span className="participation-factor-check-list__desc">{f.description}</span>
  ) : null}
</label>
```

Putting the span inside the `<label>` keeps the description part of the checkbox's accessible name and click target.

- [ ] **Step 4: Add the style**

```css
.participation-factor-check-list__desc {
  display: block;
  margin-top: 2px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--muted);
}
```

- [ ] **Step 5: Select the column in the three callers**

Each route builds the `factors` prop from a query — include `description` in the selected columns so it reaches the component.

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- --run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/components app/routes app/styles tests/components
git commit -m "feat: show participation factor descriptions on the checklist"
```

---

### Task 10: Replace the twelve values with the eight

**Files:**
- Modify: `db/seed-data/participation-factors.ts`
- Modify: `db/seed-demo.ts:789`
- Test: `tests/lib/seed-participation-factors.test.ts` (create)

**Interfaces:**
- Consumes: `SeedParticipationFactor`
- Produces: `SEED_PARTICIPATION_FACTORS` — eight entries with `description` and `code`

- [ ] **Step 1: Write the failing exactness test**

The strings come from the client and must not drift, so assert them literally.

```ts
import { SEED_PARTICIPATION_FACTORS } from '../../db/seed-data/participation-factors';

describe('SEED_PARTICIPATION_FACTORS', () => {
  it('contains the eight client-approved values in order', () => {
    expect(SEED_PARTICIPATION_FACTORS.map((f) => f.label)).toEqual([
      'Transportation/access',
      'Schedule/availability',
      'Attendance continuity',
      'Communication',
      'Workplace accommodation/access',
      'Administrative requirements',
      'Other participation-related factor',
      'No participation factors identified',
    ]);
  });

  it('numbers sortOrder 1..8 contiguously', () => {
    expect(SEED_PARTICIPATION_FACTORS.map((f) => f.sortOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('keeps the accommodation wording free of any underlying reason', () => {
    const f = SEED_PARTICIPATION_FACTORS[4]!;
    expect(f.description).toBe(
      'an identified workplace adjustment or access need affected participation (without identifying underlying reason)',
    );
  });

  it('leaves the last two without descriptions', () => {
    expect(SEED_PARTICIPATION_FACTORS[6]!.description).toBeNull();
    expect(SEED_PARTICIPATION_FACTORS[7]!.description).toBeNull();
  });

  it('marks exactly one row with code "none"', () => {
    const coded = SEED_PARTICIPATION_FACTORS.filter((f) => f.code === 'none');
    expect(coded).toHaveLength(1);
    expect(coded[0]!.label).toBe('No participation factors identified');
  });

  it('retains none of the old values', () => {
    const labels = SEED_PARTICIPATION_FACTORS.map((f) => f.label);
    for (const old of ['Transportation', 'Childcare', 'Housing instability', 'Mental health']) {
      expect(labels).not.toContain(old);
    }
  });
});
```

> Note the sixth test: `'Transportation'` must **not** appear, while `'Transportation/access'` must. `not.toContain` on an array is exact-match, so this passes correctly — do not weaken it to a substring check.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/seed-participation-factors.test.ts --project unit`
Expected: FAIL — still the twelve old labels.

- [ ] **Step 3: Replace the values**

```ts
export interface SeedParticipationFactor {
  label: string;
  description: string | null;
  code: string | null;
  sortOrder: number;
}

export const SEED_PARTICIPATION_FACTORS: SeedParticipationFactor[] = [
  {
    label: 'Transportation/access',
    description: 'ability to reliably get to/from internship',
    code: null,
    sortOrder: 1,
  },
  {
    label: 'Schedule/availability',
    description: 'availability did not consistently align with internship schedule',
    code: null,
    sortOrder: 2,
  },
  {
    label: 'Attendance continuity',
    description: 'interruptions or absences affected consistent participation',
    code: null,
    sortOrder: 3,
  },
  {
    label: 'Communication',
    description:
      'difficulty maintaining necessary communication related to scheduling or participation',
    code: null,
    sortOrder: 4,
  },
  {
    label: 'Workplace accommodation/access',
    description:
      'an identified workplace adjustment or access need affected participation (without identifying underlying reason)',
    code: null,
    sortOrder: 5,
  },
  {
    label: 'Administrative requirements',
    description:
      'documentation, onboarding, background check, credential, or similar requirements affected participation',
    code: null,
    sortOrder: 6,
  },
  { label: 'Other participation-related factor', description: null, code: null, sortOrder: 7 },
  { label: 'No participation factors identified', description: null, code: 'none', sortOrder: 8 },
];
```

- [ ] **Step 4: Update the seed writers to persist the new columns**

In `db/seed.ts` and `db/seed-prod.ts`, the insert must carry all four fields:

```ts
.values(
  SEED_PARTICIPATION_FACTORS.map((f) => ({
    label: f.label,
    description: f.description,
    code: f.code,
    sortOrder: f.sortOrder,
  })),
)
```

- [ ] **Step 5: Fix the demo pool**

`db/seed-demo.ts:789` holds a hardcoded label pool that must match. Replace the twelve old strings with the six *real* factors (exclude "Other participation-related factor" and "No participation factors identified" from random assignment, so demo data exercises the meaningful values).

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- --run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add db tests/lib/seed-participation-factors.test.ts
git commit -m "feat: replace barrier values with eight participation factors"
```

---

### Task 11: Make the Reports count honest

**Files:**
- Modify: `app/lib/reports-queries.server.ts` (`getParticipationFactorDistribution`)
- Test: `tests/rls/reports-queries.test.ts`

**Interfaces:**
- Consumes: `participationFactors.code`
- Produces: unchanged signature — `{ id, label, count }[]`

Spec §7: an intern counts toward the `code = 'none'` factor **only if they have no other factor rows.** Data entry stays unconstrained; only the query changes.

- [ ] **Step 1: Write the failing test**

```ts
it('excludes an intern from the none bucket when they also have a real factor', async () => {
  // Intern A: only "No participation factors identified"
  // Intern B: "No participation factors identified" AND "Transportation/access"
  // …insert both via the existing fixture helpers in this file…

  const rows = await getParticipationFactorDistribution(db, GLOBAL_SCOPE);
  const none = rows.find((r) => r.label === 'No participation factors identified');
  const transport = rows.find((r) => r.label === 'Transportation/access');

  // B is contradictory, so it counts only toward the real factor.
  expect(none!.count).toBe(1);
  expect(transport!.count).toBe(1);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:rls -- tests/rls/reports-queries.test.ts`
Expected: FAIL — `none.count` is 2, because B is double-counted.

- [ ] **Step 3: Add the predicate**

```ts
// Spec §7. Contradictory selections are permitted at entry, so an intern may
// carry both "No participation factors identified" and a real factor. Counting
// raw join rows would put them in both bars, over-summing the chart and making
// the none-count mean something untrue. Keyed on `code`, not the label, because
// admins can rename any row in Settings.
const noneOnlyWhenAlone = sql`(
  ${participationFactors.code} is distinct from 'none'
  or not exists (
    select 1
      from ${internParticipationFactors} ipf2
      join ${participationFactors} pf2
        on pf2.id = ipf2.participation_factor_id
     where ipf2.intern_id = ${interns.id}
       and pf2.code is distinct from 'none'
  )
)`;
```

and combine it with the existing scope predicate:

```ts
.where(wherePred ? and(wherePred, noneOnlyWhenAlone) : noneOnlyWhenAlone)
```

Import `and` from `drizzle-orm` if it is not already imported in this file.

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:rls -- tests/rls/reports-queries.test.ts`
Expected: PASS, with every pre-existing distribution test still green.

- [ ] **Step 5: Commit**

```bash
git add app/lib/reports-queries.server.ts tests/rls
git commit -m "fix: count the none participation factor only when it stands alone"
```

---

### Task 12: Re-point the demo data on impact-dev

**Files:**
- Create: `scripts/repoint-dev-participation-factors.ts`

**Interfaces:**
- Consumes: `SEED_PARTICIPATION_FACTORS`, `participationFactors`, `internParticipationFactors`
- Produces: nothing importable — a one-off operational script

Targeted, **not** a reseed. `npm run db:seed` would destroy the KP July testing records and the duplicate Whitaker rows still needed for an open bug.

- [ ] **Step 1: Write the script**

```ts
// One-off: replace the old barrier reference rows on impact-dev with the eight
// participation factors and redistribute demo interns across them.
//
// Deliberately NOT a reseed: `npm run db:seed` truncates, which would destroy
// the KP July 2026 testing records and the duplicate Whitaker submissions that
// are still evidence for an open data-loss question.
//
// Refuses to run against impact-prod.
import 'dotenv/config';
import { db } from '../app/lib/db.server';
import { participationFactors, internParticipationFactors, interns } from '../db/schema';
import { SEED_PARTICIPATION_FACTORS } from '../db/seed-data/participation-factors';

const PROD_REF = 'ptnhzdkspzquwcxdoqbt';

async function main() {
  if ((process.env.DATABASE_URL ?? '').includes(PROD_REF)) {
    throw new Error('Refusing to run against impact-prod.');
  }

  await db.transaction(async (tx) => {
    // Drops every intern↔factor link; interns, cohorts and submissions survive.
    await tx.delete(internParticipationFactors);
    await tx.delete(participationFactors);

    const inserted = await tx
      .insert(participationFactors)
      .values(
        SEED_PARTICIPATION_FACTORS.map((f) => ({
          label: f.label,
          description: f.description,
          code: f.code,
          sortOrder: f.sortOrder,
        })),
      )
      .returning({ id: participationFactors.id, sortOrder: participationFactors.sortOrder });

    // Only the six real factors are assigned; "Other" and "No factors" are
    // never handed out randomly.
    const assignable = inserted.filter((f) => f.sortOrder <= 6).sort((a, b) => a.sortOrder - b.sortOrder);
    const allInterns = await tx.select({ id: interns.id }).from(interns);

    // Deterministic round-robin so the dataset is reproducible, not random.
    const links = allInterns.flatMap((intern, i) => {
      const first = assignable[i % assignable.length]!;
      const second = assignable[(i + 3) % assignable.length]!;
      return i % 3 === 0
        ? [{ internId: intern.id, participationFactorId: first.id }]
        : [
            { internId: intern.id, participationFactorId: first.id },
            { internId: intern.id, participationFactorId: second.id },
          ];
    });
    if (links.length > 0) await tx.insert(internParticipationFactors).values(links);

    console.log(`Re-pointed ${allInterns.length} interns across ${assignable.length} factors.`);
  });
}

main().then(() => process.exit(0));
```

- [ ] **Step 2: Record the pre-run counts so the claim can be checked**

```bash
psql "$DATABASE_URL" -c "select count(*) from interns;"
psql "$DATABASE_URL" -c "select count(*) from assessment_submissions;"
```

Write both numbers down.

- [ ] **Step 3: Run it against impact-dev**

Run: `npx tsx scripts/repoint-dev-participation-factors.ts`

- [ ] **Step 4: Verify the new values landed and nothing else was lost**

```bash
psql "$DATABASE_URL" -c "select sort_order, label, code from participation_factors order by sort_order;"
psql "$DATABASE_URL" -c "select count(*) from interns;"
psql "$DATABASE_URL" -c "select count(*) from assessment_submissions;"
```

Expected: the eight new values in order with `code='none'` on row 8, and both counts **identical to Step 2**. If either dropped, the wrong thing was deleted — stop and restore.

- [ ] **Step 5: Commit**

```bash
git add scripts/repoint-dev-participation-factors.ts
git commit -m "chore: script to re-point dev demo data onto participation factors"
```

---

### Task 13: Refresh production reference data and open PR 2

**Files:** none — operational

impact-prod still holds the twelve May 2026 values. There is no intern data there, so nothing cascades.

- [ ] **Step 1: Full local verification**

```bash
npm run typecheck && npm run lint && npm test -- --run && npm run build
```

Expected: all green.

- [ ] **Step 2: Push and open PR 2**

```bash
git push -u origin feat/participation-factor-values
gh pr create --title "feat: eight internship participation factors" --body "Implements docs/superpowers/specs/2026-09-11-internship-participation-factors-design.md. Adds description + code columns, replaces all twelve values, and fixes the Reports none-bucket count."
```

- [ ] **Step 3: Verify on staging before merging**

```bash
git push --force origin feat/participation-factor-values:staging
```

Check `https://staging--impact-portal-app.netlify.app/admin/settings/participation-factors`: eight rows in order, descriptions visible and editable, reorder and remove still work, and the intern entry assessment shows descriptions as helper text.

- [ ] **Step 4: Merge, then reset staging to follow main**

```bash
gh pr merge --squash --delete-branch
git push --force origin main:staging
```

The force-push is required: a squash-merge creates a new commit, so `staging` diverges and `sync-staging.yml` fails by design rather than clobbering it.

- [ ] **Step 5: Apply migrations and reference data to impact-prod**

With the **production** environment loaded (dotenv does not override already-set vars):

```bash
npm run db:migrate
npm run db:apply-policies
npm run db:seed-prod
```

- [ ] **Step 6: Verify production**

```bash
psql "$PROD_DATABASE_URL" -c "select sort_order, label, code from participation_factors order by sort_order;"
```

Expected: the eight new values. **No old value may remain** — "Housing instability" or "Substance use recovery" appearing here means `db:seed-prod` did not clear the table first; fix it before the program team sees it.

---

## Self-Review

**Spec coverage**

| Spec section | Task |
|---|---|
| §3 eight values | 10 |
| §4 `description` column | 6, 7, 8, 9 |
| §4 `code` column | 6, 10, 11 |
| §5 migration + policy-name trap | 1, 2 |
| §6 app surface | 3, 4, 5 |
| §6 `InlineEditableList` stays shared | 7 |
| §6 `seed-demo.ts:789` pool | 10 |
| §6 prod reference data | 13 |
| §6 route URL, no redirect | 4 |
| §7 honest counting | 11 |
| §8 testing | every task |
| §9 two PRs | 5, 13 |
| §10 targeted dev re-point | 12 |

No gaps.

**Type consistency:** `SeedParticipationFactor` gains `description` and `code` in Task 10, matching the columns added in Task 6. `ParticipationFactorItem` is defined in Task 4 and extended in Task 9. `ParsedInlineRow.description` is introduced in Task 7 and consumed in Task 8. `getParticipationFactorDistribution` keeps its signature across Tasks 3 and 11.

**Known ordering constraint:** Task 5 renames `SEED_BARRIERS` while keeping the twelve old values, so PR 1 stays a pure rename. Task 10 replaces the values. Doing Task 10 before Task 5 would put a behaviour change into PR 1 and break its "green CI proves the rename" guarantee.
