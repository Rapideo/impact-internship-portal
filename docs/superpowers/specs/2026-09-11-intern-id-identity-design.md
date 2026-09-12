# Intern ID Identity — Design

**Date:** 2026-09-11
**Status:** Approved for planning
**Supersedes:** the First Initial + Last Name + Cohort composite identity from
SP1 (schema), SP2 (admin create) and SP4 (anonymous intern flow). Also
supersedes the "Unique intern identifier" and "Minimum-PII policy" product
rules in `PRD.md` and the App Outline for production scope.

## 1. Context

The client's earlier concern about the Entry Assessment "Barriers" list
(resolved in `2026-09-11-internship-participation-factors-design.md`) has a
sequel: they consider **First Initial + Last Name** — the intern's identity in
the portal since the prototype — to still be too much PII. It was not worth
contesting, and both sides agreed on the replacement:

- The portal stores **no name of any kind**. An intern is known only by an
  assigned **Intern ID**.
- Program staff keep the master roster (ID ↔ person) **offline**. Employers keep
  a roster for their own interns, also offline. The portal never holds the
  mapping.
- Program staff hand the ID to the intern at intake. The intern keeps it.
- Interns sign in by **selecting employer, selecting cohort, entering their ID**
  — the same three-step chooser as today with the ID in place of the name.

The client approved the ID format, the year semantics ("year the intern entered
the program") and the issuer (program staff) on 2026-09-11. Matt approved the
technical approach the same evening.

Production has **zero intern records** as of 2026-09-11; impact-dev holds ~140
demo interns and the program team's testing data. There is therefore nothing
to convert in production and a mechanical backfill on dev.

## 2. Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | ID format `IMP-YY-NNNN`, e.g. `IMP-26-0417`. Regex `^IMP-\d{2}-\d{4}$`. | Client-approved. 11 chars; letters only in the fixed prefix so everything an intern must get right is digits. Reads aloud. |
| D2 | `IMP` is a constant in code, not a setting. | Interns hold cards with the prefix printed on them; a settings knob would let someone change the format under them. |
| D3 | `YY` = year of the intern's **Start Date** if entered on the create form, else the creation date — both evaluated in `America/Indiana/Indianapolis`. | "Year they entered" in the client's words. The TZ pin is the same one #138 introduced; Lambda is UTC and a record created at 11 pm on Dec 31 Indiana time must not carry next year's ID. |
| D4 | `NNNN` is drawn at random from `0001`–`9999` (`crypto.randomInt`), not sequential. | One intern's ID gives no clue to a classmate's, and a typo very rarely lands on another live ID. See §7. |
| D5 | Uniqueness is enforced by a **plain** unique index across **all** interns, including soft-deleted ones. | A retired ID must never be re-issued: a card in someone's wallet could otherwise start pointing at a different person. |
| D6 | The ID is **immutable**. No edit path anywhere. | Retiring an ID = soft-delete the record and create a new one. Explicitly a follow-up if the program ever asks; not v1. |
| D7 | Lenient input, strict storage. The chooser accepts `imp260417`, `IMP 26 0417`, `imp-26-0417`; the DB only ever holds canonical form. | Interns type these from a card or memory. Normalisation is a pure function with tests. |
| D8 | A light **IP throttle** on the chooser's confirm action: ≥ 10 failed lookups from one IP in 15 minutes → refused. Fails open on infrastructure error. | The one place IDs are weaker than names — see §7. Approved over "document and defer" and over "go back with 5 digits". |
| D9 | Delivered as **three PRs** (A: issue IDs; B: switch identity; C: remove names), each a coherent deployable state with its own proof. | Mirrors #139/#140. Prod has no interns, so intermediate states cost nothing. Each merge is a prod deploy and gets staging verification first. |
| D10 | PR A is **purely additive** — the create form keeps its name fields until C. | Removing names in A would force the columns nullable and a transitional "show code if name is null" rule. One motion in C instead. |

## 3. The Intern ID

```
IMP-26-0417
 │   │   └── NNNN  unique number within the year, assigned by the portal, random
 │   └────── YY    year the intern entered the program (D3)
 └────────── IMP   the IMPACT program; fixed
```

Not encoded, deliberately: name, employer, cohort, date of birth. Employer and
cohort remain fields on the record (reports need them) but are not part of the
identifier, so the ID alone reveals nothing about the person. The cohort
selection at sign-in therefore does real verification work rather than
restating the ID.

Capacity: 9,999 IDs per year. The program places tens of interns a year.

### Modules

Pure logic is separated from the database so it is unit-testable in isolation.

`app/lib/intern-code.ts` (pure, importable client-side):

- `INTERN_CODE_RE` — the canonical regex.
- `formatInternCode(yy: number, n: number): string` — zero-pads; throws on out-of-range.
- `normalizeInternCode(input: string): string | null` — uppercase, strip
  whitespace and hyphens, accept `^IMP\d{6}$`, return canonical or `null`.
- `yearForInternCode(startDate: string | null, now: Date): number` — two-digit
  year per D3. `startDate` is the `YYYY-MM-DD` text the schema already uses.

`app/lib/intern-code.server.ts`:

- `createInternWithCode(values, deps?)` — draws a number, inserts the intern
  row (plus the existing entry-assessment / participation-factor rows the create
  action writes today), catches PG `23505` on the code's unique index, redraws.
  Up to 10 attempts, then throws `InternCodeExhaustedError`. The cap exists to
  fail loudly, not because collisions are expected: at 50 interns/year the
  probability of even one retry across the whole year is under 12 %.

## 4. Data model

### `interns`

Add `intern_code text NOT NULL`, unique index `interns_intern_code_unique`
(plain, D5). In PR C, drop `first_initial`, `last_name`, the
`interns_first_initial_len` check and the partial composite index
`interns_identity_unique`.

RLS policies on `interns` gate on cohort/employer and never reference the name
columns; none change.

### `identity_attempts` (PR B)

| column | type | notes |
|---|---|---|
| `id` | `uuid` PK default `gen_random_uuid()` | |
| `ip` | `text NOT NULL` | client IP or `"unknown"` |
| `attempted_at` | `timestamptz NOT NULL DEFAULT now()` | |

Index `identity_attempts_ip_time_idx (ip, attempted_at)`. No FKs. **RLS
enabled with no policies**, which denies `anon` and `authenticated` outright
(`db/policies/0000_grants.sql` grants table privileges to every public table,
so "no grants" is not available as a mechanism — RLS is). The table is touched
only through the service-role client, and "anon cannot read it" is the design.
Rows are disposable; the module deletes anything older than a day
opportunistically.

## 5. Migrations

All three are **hand-written**, each paired with a drizzle snapshot that
records the destination schema. Proof for each: rerun `npm run db:generate` and
get "No schema changes, nothing to migrate". (drizzle-kit guesses
drop-and-recreate non-interactively and cannot be trusted to generate these.)

| PR | file | contents |
|---|---|---|
| A | `0005_intern_code.sql` | `ADD COLUMN intern_code text` (nullable) → `DO $$` backfill: for each row with `intern_code IS NULL`, derive `YY` from `start_date` else `created_at` (Indiana TZ), draw random `NNNN`, retry on conflict → `ALTER COLUMN intern_code SET NOT NULL` → `CREATE UNIQUE INDEX interns_intern_code_unique`. |
| B | `0006_identity_attempts.sql` | create table + index. |
| C | `0007_drop_intern_names.sql` | `DROP INDEX interns_identity_unique` → `ALTER TABLE interns DROP CONSTRAINT interns_first_initial_len` → `DROP COLUMN first_initial, DROP COLUMN last_name`. |

Backfill touches ~140 rows on impact-dev and 0 on prod.

## 6. Application surface

### Admin

- **Create** (`admin.interns.new.tsx`): action calls `createInternWithCode`;
  success redirects to `/admin/interns/:id?issued=1`. In PR A the First Name /
  Last Name fields remain (D10); PR C removes them and their validators.
- **Detail** (`admin.interns.$internId.tsx`): when `?issued=1` is present, a
  one-time callout above the record — the ID large in mono, a Copy button, and
  the text: *"Record this ID against the intern's name in the program roster
  now, and give it to the intern. The portal does not know who this person is
  and cannot look it up for you."* Query-string driven; gone on next navigation.
  The ID is the record's permanent title (alongside the name until C).
- **List** (`admin.interns._index.tsx`): ID as first column, default sort, part
  of the search haystack (digits alone must match — staff will type `0417` from
  a roster). The name leaves the haystack in C.
- No route, action or form writes `intern_code` after insert (D6).

### Anonymous intern

- **Chooser** (`_public.intern.assessments.tsx`): fields reorder to
  **Employer → Cohort → Intern ID**. One text input: `autocapitalize="characters"`,
  `autocomplete="off"`, placeholder `IMP-26-0417`, mono. Confirm action, in
  order:
  1. Throttle check (§7). Blocked → *"Too many attempts. Wait 15 minutes and try again."*
  2. `normalizeInternCode`. `null` → *"Enter your Intern ID in the form IMP-26-0417."* Not recorded as a failure (never reached the DB).
  3. Cohort ∈ employer — unchanged.
  4. `lookupInternByCode({ internCode, cohortId })`. Miss → record failure, and **one message** for both unknown-ID and wrong-cohort: *"We couldn't find that Intern ID in the selected cohort. Check both, or ask your supervisor."* Distinguishing them would tell a guesser when they have found a live ID.
  5. Sign the cookie.
- **Cookie** (`intern-identity.server.ts`): payload becomes
  `{ internId, internCode, cohortId, employerId }`. The type guard rejects the
  old shape → treated as absent → chooser. No live-cookie migration needed;
  nobody holds one on prod. `getCurrentInternIdentity` keeps its
  defense-in-depth: re-resolve `(internCode, cohortId)` on every read and
  require the result's id to equal `internId`. The cookie's `employerId` is
  still derived from the verified cohort row, never from the form.
- **Lookup** (`identity.server.ts`): `lookupInternByCode` replaces
  `lookupInternByIdentity`, which is deleted in PR B (dead after the switch).
- `IdentityConfirmedChip`, `_public.intern.confirmation.tsx` and the three
  form routes render the code where they rendered the name.

### Display everywhere

`app/components/InternCode.tsx` → `<span class="intern-code">` (IBM Plex Mono,
`tabular-nums`), class registered in `admin.css`. Used in: admin intern
list/detail, employer cohort/intern lists and detail, admin and employer
competency new/edit/view, self-assessment results/detail, the per-intern rubric
page under Settings → Questions → Competency, and `dev.primitives`.
`CompetencyAssessmentForm`'s `meta.internName` prop is renamed
`meta.internCode` at its call sites. Fixed-width codes sort lexicographically.

## 7. Guessing, and the throttle

A cohort of ~30 interns has ~30 live IDs in a 10,000-number space. Against the
public chooser, a script trying random numbers hits a live ID in ~300 attempts
on average and can then submit a self-assessment as that intern — and because
submissions are one-shot, the real intern is locked out. Names did not have
this property: you had to know a person. Random numbering (D4) already beats
sequential, where one known ID reveals its neighbours; the throttle closes the
rest of the gap cheaply.

`app/lib/identity-throttle.server.ts`:

- `clientIp(request)`: `x-nf-client-connection-ip` (Netlify's trusted header)
  → first hop of `x-forwarded-for` → `"unknown"`. Netlify's header wins, so a
  spoofed forwarded header cannot evade the throttle in production.
- `isThrottled(ip)`: `count(*) WHERE ip = $1 AND attempted_at > now() - 15 min` ≥ 10.
- `recordFailure(ip)`: insert; plus `DELETE WHERE attempted_at < now() - 1 day`.
- Only **failures** count. Ten genuine typos in fifteen minutes is the
  threshold, not ten attempts.
- **Fails open**: if the throttle query throws, log and continue. Chooser
  availability beats closing a rare abuse path.
- Uses `dbService`. This widens the SP4 contract — "never call `dbService`
  outside the anonymous submission path" — to exactly **two** anonymous paths:
  the submission insert and the identity throttle. CLAUDE.md is updated to say
  so.

A consequence worth stating: the throttle does not stop a patient attacker at
9 attempts per 15 minutes (~9 hours to expected first hit). That is accepted
for v1; the audience is small and known, and a hit yields a nuisance (one
locked-out self-assessment), not PII.

## 8. Testing

**Unit** (`npm test`):

- `tests/lib/intern-code.test.ts` — `formatInternCode` padding and range;
  `normalizeInternCode` accepts the three lenient forms and rejects wrong
  prefix, wrong length, letters in the number; `yearForInternCode` prefers
  start date, falls back to now, and the Dec 31 23:30 Indiana / Jan 1 04:30 UTC
  case yields the Indiana year.
- `tests/lib/intern-code.server.test.ts` — retry on `23505`, exhaustion error,
  non-`23505` errors propagate.
- `tests/lib/identity-throttle.server.test.ts` — header precedence, threshold
  boundary (9 allowed / 10 blocked), fail-open.
- `tests/lib/identity.server.test.ts`, `intern-identity.server.test.ts` —
  rewritten for the code-based lookup and the new cookie shape (old shape
  rejected).
- Route tests (`admin.interns.new`, `admin.interns._index`, employer scope) —
  updated fixtures; `new` asserts the redirect carries `?issued=1`.

**RLS** (`npm run test:rls`): fixture helpers create interns with codes. No
policy assertions change. `identity_attempts` gets one test: `anon` and
`authenticated` cannot select from it.

**E2E** (`npm run test:e2e`):

- `intern-self-submit` — signs in with a seeded code.
- `admin-crud` — creates an intern, reads the issued code off the callout,
  finds it in the list via search.
- **new `intern-throttle`** — ten bad IDs, eleventh refused. Sets
  `x-forwarded-for: 203.0.113.7` so its failures land under an isolated key;
  otherwise a second local run inside fifteen minutes would lock out
  `intern-self-submit`.

**Seeds**: `SEED_INTERNS` (6) get fixed codes so e2e can reference them.
`seed-demo` (140) assigns codes deterministically per intern index (a prime-
multiplier permutation of 1..9999), so its additive, idempotent behaviour is
preserved and re-runs produce the same codes.

## 9. Sequencing

Three PRs, each: impact-dev backup → migrate impact-dev → force-push branch to
`staging` → Matt verifies → explicit approval → merge → prod migration in the
order below, via `set -a; source .env.prod.local; set +a; npm run db:migrate`.

| PR | branch | migrate/deploy order on prod | proof |
|---|---|---|---|
| **A — Issue IDs** | `feat/intern-code-issue` | **migrate → merge.** `intern_code` is `NOT NULL`; deploying first would break every create-intern until the column exists. Migrate-first leaves a minutes-long window where the *old* app's insert fails — acceptable at night with zero prod users. | CI green; on staging a created intern shows a well-formed ID in the callout and list. |
| **B — Switch identity** | `feat/intern-code-identity` | **migrate → merge.** Table only read by new code; harmless early, 500s the chooser if late. | `intern-self-submit` e2e passes on the new flow; `intern-throttle` e2e passes; manual 11-failure run on staging trips the throttle. |
| **C — Remove names** | `feat/intern-code-drop-names` | **merge → migrate.** The old app still selects the name columns; dropping them first 500s every intern page. | `grep -rn "first_initial\|firstInitial\|last_name\|lastName" app db tests` returns only migration files; CI green. A fresh Pro backup exists before the drop. |

PR A also carries this spec and the implementation plan.

## 10. Documentation

- CLAUDE.md: "Unique intern identifier" product rule → the Intern ID;
  "Minimum-PII policy" → no name of any kind; SP4 contracts (cookie payload,
  the two `dbService` paths); CSS registry (`.intern-code`); a new "Intern ID"
  contracts section carrying D2–D8.
- `docs/dev-portal/data/status.json` at PR C.
- **Follow-up, not in scope:** the Quick Start & Testing Guide has screenshots
  of the old chooser and create form; regenerate via its `capture.ts`/`render.ts`
  once C is on staging.
- `PRD.md` and the App Outline are prototype-era and are not edited; this spec
  supersedes them for production scope.

## 11. Accepted tradeoffs

- **A forgotten ID is an offline lookup.** By design the portal cannot help.
- **The roster becomes the sensitive record.** PII risk moves out of the
  portal into the offline roster, which needs the care the portal had.
- **Brief prod windows** around A and C migrations (§9). Zero prod users.
- **Throttle is per-IP and fails open.** Shared NAT (a school lab) could hit
  the limit together with ten collective typos; the message tells them to wait
  fifteen minutes.
- **Anyone who knows an ID and cohort can submit for that intern** — the same
  property names had, with a smaller keyspace mitigated by D4 + D8.

## 12. Out of scope

- Re-issuing / rotating an intern's ID (D6 follow-up).
- Printable ID cards or an intake email. Copy button only.
- Admin-side search of the roster — the portal has no roster.
- Regenerating the Quick Start guide (§10 follow-up).
- Recovering the pre-2026-09-11 impact-dev `assessment_submissions` from the
  Supabase backup — a separate, valuable task now that Pro backups exist.
