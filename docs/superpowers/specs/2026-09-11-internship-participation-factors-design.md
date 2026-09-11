# Internship Participation Factors — Design

**Date:** 2026-09-11
**Status:** Approved for planning
**Supersedes:** the `barriers` reference list introduced in SP1 / SP2

## 1. Context

The program's client raised PII concerns about the Entry Assessment "Barriers"
list. The current twelve values name sensitive personal circumstances directly
(`Housing instability`, `Mental health`, `Substance use recovery`,
`Justice-system involvement`), and admins select them per intern at intake.

The client asked for three things:

1. Rename the concept to **Internship Participation Factors**.
2. Replace all twelve values with eight new ones that describe *effects on
   participation* rather than personal circumstances. None of the old values
   are retained.
3. Refresh the demo data on the testing database, which currently references
   old values that no longer exist.

The reframing is the point of the change. "Housing instability" records
something about a person; "Attendance continuity — interruptions or absences
affected consistent participation" records something about the internship. The
new wording is deliberately observational, and item 5 explicitly instructs the
admin to capture the accommodation without the underlying reason.

## 2. Decisions

Settled with Matt on 2026-09-11:

| Question | Decision |
|---|---|
| Name + explanatory clause: one field or two? | **Two.** Add a nullable `description` column. |
| Should "Other participation-related factor" accept free text? | **No.** Plain checkbox. No new free-text PII surface. |
| Enforce that "No participation factors identified" excludes the others? | **No.** Plain checkboxes; the app does not police data entry. |
| How deep does the rename go? | **Full.** UI, route URL, code identifiers, and the database. |
| How much of impact-dev gets reset? | **Targeted.** Re-point factor selections only; preserve all other demo data. |
| Contradictory selections in Reports? | **Fix report-side.** See §7. |

Two facts shaped these:

- **Production has no intern data.** impact-prod was bootstrapped in May 2026
  and never accumulated real records, so a table rename is free now and
  expensive the moment real data exists. This is the window.
- **Staging and dev are one database.** The `staging` branch-deploy runs on
  impact-dev credentials. There is one dataset to update, not two.

## 3. The eight values

Replacing all twelve existing values, in this order. Items 7 and 8 carry no
description, which is why the column is nullable.

| Sort | Label | Description |
|---|---|---|
| 1 | Transportation/access | ability to reliably get to/from internship |
| 2 | Schedule/availability | availability did not consistently align with internship schedule |
| 3 | Attendance continuity | interruptions or absences affected consistent participation |
| 4 | Communication | difficulty maintaining necessary communication related to scheduling or participation |
| 5 | Workplace accommodation/access | an identified workplace adjustment or access need affected participation (without identifying underlying reason) |
| 6 | Administrative requirements | documentation, onboarding, background check, credential, or similar requirements affected participation |
| 7 | Other participation-related factor | *(none)* |
| 8 | No participation factors identified | *(none)* |

## 4. Data model

```
participation_factors
  id            uuid    pk
  label         text    not null
  description   text    nullable   -- NEW
  code          text    nullable   -- NEW, stable identity for report logic
  sort_order    integer not null
  created_at    timestamptz not null default now()

intern_participation_factors
  intern_id               uuid  fk -> interns(id)                 on delete cascade
  participation_factor_id uuid  fk -> participation_factors(id)   on delete cascade
  pk (intern_id, participation_factor_id)
```

### Why `code`

The Reports rule in §7 must recognise the "No participation factors
identified" row. It cannot match on the label: Settings lets an admin rename
any row, and the rule would silently stop working the first time someone did.

`code` is seeded as `none` on that one row and `null` everywhere else. It is
never shown or editable in the UI, and rows an admin creates never receive one.
Renaming or reordering the row keeps the rule working; deleting it leaves the
rule with nothing to apply, which is correct.

## 5. Migration

Drizzle-kit cannot distinguish a rename from a drop-and-recreate on its own.
Run **non-interactively** it assumes drop-and-recreate and emits `DROP TABLE`,
which would cascade-delete every demo intern's selections on impact-dev.

Run **interactively** it asks ("is `participation_factors` created, or renamed
from `barriers`?") and, given the right answer, emits correct `ALTER … RENAME`
SQL *and* updates `meta/_journal.json` and the schema snapshot. That is the
path to take: update `db/schema.ts` first, then have a human run
`npx drizzle-kit generate` in a real terminal and answer the rename prompts.

Hand-writing the `.sql` file instead is a trap. `drizzle-kit migrate` only runs
migrations listed in `meta/_journal.json`, so a hand-added file silently never
executes; and the `meta/000N_snapshot.json` files drive future diffs, so a
snapshot that still describes `barriers` makes the *next* `db:generate` try to
re-create the old table.

The one thing drizzle cannot know about is policies, so the `DROP POLICY`
statements below are appended to the generated file by hand.

The work splits across the two pull requests in §9, so it is **two migrations**,
not one.

**PR 1 — rename only:**

```sql
ALTER TABLE barriers RENAME TO participation_factors;
ALTER TABLE intern_entry_barriers RENAME TO intern_participation_factors;
ALTER TABLE intern_participation_factors
  RENAME COLUMN barrier_id TO participation_factor_id;
```

**PR 2 — new columns:**

```sql
ALTER TABLE participation_factors ADD COLUMN description text;
ALTER TABLE participation_factors ADD COLUMN code text;
```

`ALTER … RENAME` preserves rows, foreign keys and indexes, so demo interns,
cohorts and assessment submissions survive untouched. Both columns are
nullable, so neither migration needs a backfill or a default.

### Policy names follow the table

Postgres policies travel with a renamed table. After the rename,
`participation_factors` still carries policies literally named
`admin_all_barriers` and `any_authenticated_reads_barriers`, and
`intern_participation_factors` carries `admin_all_intern_entry_barriers` and
`employer_read_entry_barriers`.

The policy files are idempotent through `DROP POLICY IF EXISTS … ON
public.barriers`, but that statement will now **error**: `IF EXISTS` guards the
policy, not the table, and `public.barriers` no longer exists. The migration
must therefore drop the four stale policy names off the renamed tables before
`db:apply-policies` runs.

Affected policy files: `0001_enable_rls.sql`, `0002_admin_all.sql`,
`0003_employer_scope.sql`.

`0000_grants.sql` is **not** affected — it grants via `GRANT ALL ON ALL TABLES
IN SCHEMA public`, which names no table and so survives the rename untouched.

## 6. Application surface

Roughly 25 files. The ones that are not a simple find-and-replace:

- **`app/components/InlineEditableList.tsx`** is shared with
  `admin.settings.phases.tsx` and `dev.primitives.tsx`. The description input
  is added as an **optional** second field so phases stays single-column and
  untouched.
- **`db/seed-demo.ts:789`** holds a barrier label pool commented "match exactly
  what SEED_BARRIERS defines". It breaks silently if the labels move without it.
- **`db/seed-prod.ts`** seeds the reference list. impact-prod still holds the
  twelve May values, so it is re-run there as part of this change — there is no
  intern data to disturb, and leaving it stale would show real users
  "Substance use recovery" on day one.
- **`app/routes.ts`** — `/admin/settings/barriers` becomes
  `/admin/settings/participation-factors`. No redirect: the program team does
  not have the old URL bookmarked (confirmed with Matt).
- **`app/components/BarrierCheckList.tsx`** becomes
  `ParticipationFactorCheckList.tsx` and renders the description as helper text
  beneath each label.
- **Reports** — `getBarrierDistribution()` is renamed, the card titled "Entry
  Barriers" becomes "Internship Participation Factors", and the chart plots the
  short label, not the description.

Settings retains full add / edit / remove / reorder. The only change to the
editing model is the additional description field per row.

## 7. Reports: honest counting

Because contradictory selections are permitted (§2), an intern may carry both
"No participation factors identified" and a real factor. The distribution query
counts join rows grouped by factor, so that intern would appear in both bars:
the bars over-sum, and the "no factors" count stops meaning what it says. A
reader seeing "25 interns had no participation factors" cannot tell that ten of
them are also logged with a transportation problem.

Data entry stays unconstrained. The query changes instead:

> An intern counts toward the factor whose `code = 'none'` **only if they have
> no other factor rows.**

Contradictory entries fall through to the real factors they were given, the
"no factors" bar means literally what it says, and the bars stop over-summing.
No UI change, no validation, nothing for the program team to work around.

## 8. Testing

TDD throughout; every change gets a failing test first.

The **RLS suite is the real gate on the rename.** Its 19 specs run against a
live Postgres and fail loudly if a policy did not follow its table. A green RLS
run is the evidence that the rename is complete.

- Rename existing specs alongside their subjects:
  `tests/components/BarrierCheckList.test.tsx`,
  `tests/routes/admin.settings.barriers.test.ts`,
  `tests/routes/admin.interns.new.test.ts`,
  `tests/components/ReportsDashboard.test.tsx`,
  `tests/rls/reports-queries.test.ts`.
- New coverage: description rendering in the checklist; description round-trip
  through the Settings editor; seeded label/order/description exactness; and
  the §7 counting rule, including the contradictory-selection case.
- No e2e spec references barriers today, so none needs rewriting. A Playwright
  spec covering the renamed Settings route is worth adding.

## 9. Sequencing

Two pull requests.

**PR 1 — pure rename.** Database, RLS policies, code identifiers, route URL,
tests. The twelve existing values stay exactly as they are and no behaviour
changes, so a green CI run is strong evidence the rename is complete and
correct.

**PR 2 — new values.** The `description` and `code` columns, the eight new
factors, the three seed rewrites, the §7 reporting rule, and the impact-dev
re-point.

A single PR would work, but if CI goes red in a combined diff there is no way
to tell whether the rename or the value change caused it. Splitting keeps it
bisectable.

## 10. Dev data re-point

Targeted, not a full reseed. `npm run db:seed` would wipe impact-dev and
rebuild it, destroying everything entered by hand since the last seed —
including the KP July testing records and the duplicate Whitaker rows that are
still evidence for an open data-loss question.

Instead: clear `intern_participation_factors` and re-assign the demo interns
across the new eight, reusing the deterministic distribution `seed-demo.ts`
already applies to the barrier pool so the result is reproducible rather than
random. Demo interns, cohorts, employers and every assessment submission
survive.

This runs as a one-off script against impact-dev, not as part of the Netlify
build — migrations, policies and seeds are always applied manually per
environment in this project.

## 11. Accepted tradeoffs

- **No validation on contradictory selections.** Deliberate: admins know their
  interns better than a validation rule does. §7 makes the reporting honest
  without constraining entry.
- **No free text anywhere on this feature.** "Other participation-related
  factor" is a bare checkbox. This is the one place the client asked to reduce
  PII, so no `other_text` column is added.
- **No redirect from the old settings URL.** It will 404.

## 12. Out of scope

Observed while working on impact-dev, filed here so they are not lost:

- Duplicate competency-submission rows (two identical Whitaker entries at one
  timestamp) — a separate bug, and possibly related to the unresolved
  data-loss question from the KP July 2026 round.
- `activityLabel()` rendering a raw phase UUID when a row holds a phase id
  rather than a phase name — a separate bug.
- Any change to intern-facing self-assessments; this feature is admin-only.
