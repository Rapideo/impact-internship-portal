# Production Rebuild — Design Spec

**Document status:** Draft v1
**Date:** 2026-05-10
**Author:** Matt + collaborator
**Supersedes:** prototype-era specs (these stay as historical record)
**Related documents:**
- `PRD.md` — original product requirements
- `IMPACT Internship Assessment Portal - App Outline.md` — field-level screen reference
- `CLAUDE.md` — prototype architecture summary
- `docs/BACKLOG.md` — quality items folded into v1
- `Deferred.md` — items previously deferred (one is being pulled in: employer logins)

---

## 1. Overview

The IMPACT Internship Assessment Portal exists today as a 34-page static HTML/CSS/JS prototype with a shared mock dataset (`Prototypes/PROTOTYPE/`). It demonstrates the full intended UX and is feature-frozen for design.

This spec defines the **production rebuild**: re-platforming the prototype as a real web application with persistent storage, real authentication, and a meaningful expansion of scope to include **employer logins** (which the original v0 PRD listed as a non-goal).

**What this spec is:** the architectural design — stack choices, data model, routing, permissions, the question-set engine, error handling, testing, scope.

**What this spec is not:** the implementation plan. After approval, each of the 6 sub-projects (§8.4) gets its own spec → plan → implementation cycle, mirroring how the prototype's iterations were built.

### 1.1 Three-tier user model

A meaningful expansion of v0:

| Role | Auth | Access |
|---|---|---|
| **Anonymous Intern** | None — composite-key identity (First Initial + Last Name + Employer + Cohort) | Public landing + their own self-assessment forms |
| **Employer** | Supabase Auth (email + password) | Read everything under their `employer_id`. Write competency assessments + Exit Employer Surveys for their own interns. Manage their own employer record + role list. |
| **Admin (IMPACT)** | Supabase Auth (email + password) | Full read/write across everything. |

This is the most material delta from the v0 PRD, which had only Admin + Anonymous Intern. Employer logins were explicitly out of scope (PRD §3, §4); we are intentionally pulling them forward into v1.

---

## 2. Stack & Topology

### 2.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **React Router v7** (framework mode) | Form-heavy CRUD shape; loaders/actions map 1:1 to prototype URL contracts. No `"use client"` overhead. |
| Language | TypeScript (strict) | Compile-time safety on the question-engine discriminated unions and RLS-scoped queries. |
| Database | **Supabase Postgres** | Industry-standard relational DB; integrated with Supabase Auth. |
| ORM | **Drizzle** (postgres-js dialect) | Schema-as-TS, type-safe queries, lightweight, no runtime overhead. |
| Auth | **Supabase Auth** | Email + password + native password reset. Tight integration with RLS via `auth.jwt()`. |
| Permissions | **Postgres Row-Level Security (RLS)** | Database-level enforcement of role + employer scoping. Defense-in-depth against app-code permission bugs. |
| Email | **Resend** | Free tier covers password resets + future notifications. |
| Hosting | **Netlify** | Existing project (`impact-internship-portal.netlify.app`); RR v7 has a first-class adapter. |
| Error tracking | **Sentry** (free tier) | Real-user error visibility. |
| CI | **GitHub Actions** | Lint, typecheck, Vitest, Playwright. |
| Styling | Plain CSS with the prototype's token system | Design is locked; no Tailwind. |

### 2.2 Topology

```
Browser
  ├─ Public routes (intern-facing, no auth)
  └─ Authenticated routes (Supabase JWT)
        ├─ /admin/*    — admin shell
        └─ /employer/* — employer shell
                                │
                                ▼
                React Router v7 server runtime
                (Netlify Edge / Functions)
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        Supabase           Resend             Sentry
       (Auth + DB)         (email)         (error tracking)
```

### 2.3 Repo layout

Single TypeScript project, **consolidated into the existing repo** (no separate prod-app repo). The current prototype repo will be renamed from `IMPACT Intretnship Assessment Portal` (typo) to `IMPACT Internship Assessment Portal` as part of sub-project 1's foundation work.

The new production code (`app/`, `db/`, `tests/`) lives as sibling directories alongside the existing prototype, docs, and reference materials. This keeps the prototype available as a locked design source-of-truth, all docs co-located, and a single git history for the whole engagement.

```
IMPACT Internship Assessment Portal/    Existing git repo (renamed from typo'd name)
├── Prototypes/                         Unchanged — locked design reference
│   └── PROTOTYPE/                      34-page static HTML/CSS/JS prototype
│
├── app/                                NEW — production React Router v7 app
│   ├── routes/                         File-based routing
│   │   ├── _public.tsx                 Layout: intern-facing pages
│   │   ├── _public._index.tsx          Landing
│   │   ├── _public.intern.*.tsx        Self-assessment chooser + 3 forms + confirmation
│   │   ├── _public.login.tsx           Single sign-in (admin + employer)
│   │   ├── _public.auth.reset-password.tsx
│   │   │
│   │   ├── admin.tsx                   Layout: admin shell (Supabase + role='admin')
│   │   ├── admin._index.tsx            Home dashboard
│   │   ├── admin.interns.*.tsx         Interns list + record
│   │   ├── admin.assessments.*.tsx     Competency, Exit Survey
│   │   ├── admin.settings.*.tsx        Employers, Cohorts, Roles, Phases,
│   │   │                               Barriers, Program Info, Questions
│   │   ├── admin.reports.tsx
│   │   │
│   │   ├── employer.tsx                Layout: employer shell (role='employer')
│   │   ├── employer._index.tsx         Their dashboard
│   │   ├── employer.cohorts.*.tsx      Their cohorts (read-only)
│   │   ├── employer.interns.*.tsx      Their interns
│   │   ├── employer.assessments.*.tsx  Competency, Exit Survey (their interns only)
│   │   ├── employer.profile.tsx        Their employer record
│   │   └── employer.roles.*.tsx        Their roles CRUD
│   │
│   ├── components/                     Shared UI primitives
│   │   ├── modals/                     ConfirmModal, etc.
│   │   ├── question-renderer/          One component per question type
│   │   ├── nav/                        AdminNav, EmployerNav
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── db.server.ts                Drizzle client
│   │   ├── auth.server.ts              Supabase server client + JWT helpers
│   │   ├── email.server.ts             Resend client
│   │   ├── question-engine.ts          Validation + stitching (pure functions)
│   │   ├── identity.server.ts          Intern composite-key lookup
│   │   └── rls.test-helpers.ts         pgTAP-style RLS assertion helpers
│   │
│   ├── styles/                         Brand tokens, lifted from prototype's styles.css
│   └── root.tsx
│
├── db/                                 NEW — Drizzle schema, migrations, seeds
│   ├── schema.ts                       Drizzle schema (single source of truth)
│   ├── migrations/                     Generated by drizzle-kit
│   ├── seed.ts                         Dev seed (mirrors prototype's mock dataset)
│   ├── seed-prod.ts                    Prod bootstrap (library content only)
│   └── seed-data/
│       ├── question-sets.ts            Versioned question content (TS fixtures)
│       ├── phases.ts
│       └── barriers.ts
│
├── tests/                              NEW — Playwright E2E + RLS tests
│   ├── e2e/                            Playwright smoke tests
│   └── rls/                            Postgres-level policy tests
│
├── docs/                               Existing — specs, plans, deployment notes
│   ├── superpowers/
│   │   ├── specs/                      Includes this design doc
│   │   └── plans/                      Implementation plans, one per sub-project
│   ├── BACKLOG.md
│   └── deployment.md
│
├── public/                             Static assets (logo.png)
├── PRD.md                              Existing product requirements
├── CLAUDE.md                           Existing agent guidance (amended in sub-project 1)
├── Self-Assessment Questions (Placeholder).md
├── Deferred.md                         Moved INTO repo from parent dir
├── Intern Portal Punch List.md         Moved INTO repo from parent dir
│
├── netlify.toml                        Build config at repo root (existing Netlify site)
├── drizzle.config.ts
├── package.json                        Single TS project rooted at repo root
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
└── README.md
```

The Netlify site (`impact-internship-portal.netlify.app`) is **repointed** from publishing the prototype directory to building the new app, in a late sub-project 1 task. The prototype remains live until that switch.

---

## 3. Data Model

### 3.1 Tables overview (15)

```
auth.users                         Supabase-managed
  └─ profiles                      1:1 with auth.users
       │ user_id PK
       │ role: 'admin' | 'employer'
       │ employer_id (FK, nullable; required when role='employer')

program_info                       Singleton (CHECK constraint enforces 1 row)

employers
  ├─ roles                         FK employer_id
  └─ cohorts                       FK employer_id, FK role_id
       │ name, start_date, end_date, description
       └─ cohort_phases            Junction → phases

phases                             Program-wide list, ordered
barriers                           Program-wide list, ordered

interns                            FK cohort_id, FK role_id (nullable)
  │ first_initial, last_name, start_date, end_date
  │ deleted_at (soft-delete)
  ├─ intern_entry_assessment       1:1 (notes)
  │   └─ intern_entry_barriers     Junction → barriers
  └─ intern_employment_outcomes    1:1 (90/180-day flags + notes)

question_sets
  │ id (text PK)
  │ kind: 'standard' | 'competency-core' | 'competency-cohort' | 'competency-intern'
  │ cohort_id (FK, nullable)
  │ intern_id (FK, nullable)
  │ min_required, allow_multiple, last_edited_at
  └─ questions                     Ordered, per-set
       │ id (text PK), question_set_id FK
       │ type, label, helper_text, required, sort_order
       │ config JSONB

assessment_submissions
  │ id, type, intern_id, submitted_by (user_id, nullable for anon)
  │ phase (text, nullable; only for competency)
  │ answers JSONB
  │ submitted_at
  │ deleted_at (soft-delete)
```

### 3.2 Key design calls

- **Question IDs are stable text keys** assigned at creation; never change. Live in JSONB answer payloads forever. If a question is deleted, old answers reference an orphan ID — the read-only viewer renders "Question removed" rather than erroring.
- **Junction tables for many-to-many** (`cohort_phases`, `intern_entry_barriers`) rather than JSONB arrays — cleaner RLS, cleaner queries.
- **JSONB for answers** (not normalized into per-answer rows) — answer shape is type-specific and we never query individual answers.
- **Soft-delete only on `interns` and `assessment_submissions`** via `deleted_at` column; everything else hard-deletes. PRD §7.5 + audit weight justify the safety net on these two.
- **No unique constraint on `(intern_id, phase)` for competency submissions** — multiple competency assessments per phase per intern are explicitly allowed (PRD §7.4). Fixes the prototype defect noted in BACKLOG sub-project E.
- **`intern_entry_assessment` and `intern_employment_outcomes`** split into 1:1 child tables rather than columns on `interns` — independent RLS targeting, cleaner audit triggers if added later.
- **No `employer_id` denormalization on `interns` or submissions** initially — RLS resolves through `cohort.employer_id`. If query perf degrades at >100 interns, denormalize and keep in sync via trigger.

### 3.3 Drizzle schema sketch

Illustrative (not the final schema — full version lives in `db/schema.ts`):

```ts
import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, primaryKey } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  userId: uuid('user_id').primaryKey().references(() => authUsers.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['admin', 'employer'] }).notNull(),
  employerId: uuid('employer_id').references(() => employers.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const employers = pgTable('employers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  phone: text('phone'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const cohorts = pgTable('cohorts', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').notNull().references(() => employers.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  startDate: text('start_date'),    // ISO 8601 date string; pgsql DATE is also fine
  endDate: text('end_date'),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ... (full schema in db/schema.ts)
```

### 3.4 RLS strategy

Three policy patterns repeat across employer-scoped tables:

```sql
-- Pattern 1: admins always allowed
CREATE POLICY admin_all ON <table> FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

-- Pattern 2: employers see/touch only their employer's rows
CREATE POLICY employer_scope ON <table> FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'role') = 'employer'
    AND <employer_id resolution> = (auth.jwt() ->> 'employer_id')::uuid
  )
  WITH CHECK (
    (auth.jwt() ->> 'role') = 'employer'
    AND <employer_id resolution> = (auth.jwt() ->> 'employer_id')::uuid
  );

-- Pattern 3: anonymous intern submissions go through SECURITY DEFINER
--   server-side route action uses service-role key after composite-key validation
```

`<employer_id resolution>` per table:
- `employers`: `id`
- `roles`, `cohorts`: `employer_id`
- `interns`: `(SELECT employer_id FROM cohorts WHERE id = interns.cohort_id)`
- `intern_entry_assessment`, `intern_employment_outcomes`, `assessment_submissions`: through `interns` → `cohorts` → `employer_id`
- `question_sets` kind=`competency-cohort`: `(SELECT employer_id FROM cohorts WHERE id = question_sets.cohort_id)`
- `question_sets` kind=`competency-intern`: through `intern.cohort.employer_id`
- `phases`, `barriers`, `program_info`: admin-only writes; readable by all authenticated users

JWT custom claims (`role`, `employer_id`) are populated via Supabase's "Custom Access Token Hook" — a Postgres function that pulls from `profiles` on each token issue.

### 3.5 Indexes

Every FK column gets an index. Additional indexes:
- `interns(cohort_id, deleted_at)` — primary list query
- `assessment_submissions(intern_id, type, deleted_at)` — primary detail query
- `assessment_submissions(intern_id, type, phase) WHERE type = 'competency'` — competency phase lookup
- `profiles(employer_id) WHERE role = 'employer'` — employer scoping

---

## 4. Routing & Page Structure

### 4.1 Top-level URL split

```
/                         Landing (public)
/intern/*                 Intern self-assessment (public, identity-gated client-side)
/login                    Single sign-in page (admin + employer)
/auth/reset-password      Branded password reset (per Section 5)
/admin/*                  Admin shell (Supabase + role='admin')
/employer/*               Employer shell (Supabase + role='employer')
```

Post-login redirect: read `role` claim → `/admin` or `/employer`.
A user hitting the wrong shell gets bounced to their own.

### 4.2 Admin shell (1:1 with prototype)

Every prototype admin page maps to an `/admin/*` route. Same nav (Home · Interns · Assessments · Reports · Settings · admin-chip). Same URL contracts (`?id=`, `?internId=`, `?type=` become route params or search params).

### 4.3 Employer shell (new)

Nav: **Home · Cohorts · Interns · Assessments · My Employer**. No Reports, no Settings rail.

| Route | Capability |
|---|---|
| `/employer` | Their dashboard (KPIs scoped to their employer) |
| `/employer/cohorts` | Their cohorts (read-only) |
| `/employer/cohorts/:id` | Cohort detail (read-only) |
| `/employer/interns` | Interns in their cohorts |
| `/employer/interns/:id` | Intern record — read-only on identity/intake; read on self-assessments; **read-write on competency results + Exit Employer Survey only** |
| `/employer/assessments` | Chooser hub (Competency + Exit Survey); intern picker scoped to their interns |
| `/employer/assessments/competency/new` | Same form as admin |
| `/employer/assessments/exit-employer-survey` | Same form as admin |
| `/employer/profile` | Edit their employer record |
| `/employer/roles` | CRUD on their roles |

Question-set authoring stays admin-only — employers consume rubrics; admins author them.

### 4.4 Intern flow (carries from prototype)

```
/                             Landing
/intern/assessments           Chooser + identity gate
/intern/personal-goals
/intern/midpoint-reflection
/intern/participant-feedback
/intern/confirmation?type=    Type-parameterized thank-you
```

Identity captured on `/intern/assessments`, persisted to `localStorage` (key `impact.intern.identity`). Form pages bounce to the chooser if missing.

### 4.5 Component sharing

Most view components are shared between admin and employer shells. Capability flags govern editability:

```tsx
<InternRecord
  intern={intern}
  canEditIdentity={isAdmin}
  canEditCompetency={true}    // both roles
/>
```

RLS guarantees the upstream data is already scoped. Component-level flags govern UI affordances.

---

## 5. Auth & Permissions

### 5.1 Path 1: Anonymous intern (no auth)

1. Lands on `/intern/assessments`
2. Identity gate form: First Initial + Last Name + Employer (dropdown) + Cohort (filtered dropdown)
3. Server-side action looks up match in `interns` via composite key (case-insensitive on initials/last name)
4. Match: identity stored in `localStorage`; UI flips to "Confirmed as …" chip with **Switch** affordance
5. No match: friendly error directing them to contact their program admin
6. Form pages read `localStorage`, bounce to chooser if missing

**Submission path:**
- Form `action` runs server-side
- Re-validates identity against the DB on every submission (defense in depth — `localStorage` is client-controlled)
- Inserts into `assessment_submissions` using the **service-role key** (bypasses RLS)
- Partial unique index `assessment_submissions(intern_id, type) WHERE type IN ('personal-goals','midpoint-reflection','participant-feedback') AND deleted_at IS NULL` enforces one-submission-per-type-per-intern
- Duplicate submission returns a friendly "already submitted" page

### 5.2 Path 2: Admin

- Email + password via Supabase Auth
- `profiles.role = 'admin'`, `profiles.employer_id = NULL`
- JWT custom claims: `role = 'admin'`
- All RLS policies grant unrestricted access via Pattern 1 (§3.4)

### 5.3 Path 3: Employer

- Same Supabase Auth flow as admin
- `profiles.role = 'employer'`, `profiles.employer_id = <uuid>`
- JWT custom claims: `role = 'employer'`, `employer_id = <uuid>`
- RLS Pattern 2 enforces row-level scoping

### 5.4 Account provisioning — admin-driven invite

1. Admin opens `/admin/settings/employers/:id`
2. **Invite Login** card shows account state (none / pending / active)
3. Admin clicks **Invite Employer** → confirms email (defaults to `employer.contact_email`)
4. Server action: `supabase.auth.admin.inviteUserByEmail(email, { data: { employer_id, role: 'employer' } })`
5. Supabase sends invite email
6. Employer clicks → `/auth/set-password` → creates password
7. Trigger inserts `profiles` row with `role='employer'` + `employer_id` from invite metadata

**Single account per employer in v1.** Multi-user is post-v1 (would need `employer_users` join table).

Same screen has **Revoke Access** and **Resend Invite** affordances.

### 5.5 Admin provisioning

Seeded via one-off CLI script: `npm run admin:create -- --email=<email>`. No self-signup. No admin-invite UI in v1 (too much surface for 1-2 users).

### 5.6 Password reset

Branded page at `/auth/reset-password`:
1. User clicks "Forgot password" on `/login`
2. Submits email → Supabase emails reset link via Resend
3. Link → `/auth/reset-password` → user sets new password → redirect `/login`
4. Email enumeration prevented (default Supabase behavior — reveals nothing about existence)

### 5.7 Out of scope for v1

- 2FA / MFA
- SSO (Google / Microsoft)
- Session-revocation UI
- Audit log of admin actions
- Multi-user-per-employer

---

## 6. Question-Set Engine

### 6.1 The 6 question types

Carried from prototype unchanged:

```
textarea                  Freeform paragraph
short-text                Single-line text
radio                     One-of-many; "Other with text" reveal
checkbox-group            Many-of-many; "Other with text" reveal
likert                    N-segment scale with low/high labels
competency-rubric-row     Emerging/Developing/Ready + notes
```

No new types in v1. "Custom question-type builder" stays deferred (Deferred.md).

### 6.2 TypeScript shape

```ts
type QuestionType =
  | 'textarea'
  | 'short-text'
  | 'radio'
  | 'checkbox-group'
  | 'likert'
  | 'competency-rubric-row';

interface Question {
  id: string;
  type: QuestionType;
  label: string;
  helperText?: string;
  required: boolean;
  sortOrder: number;
  config: QuestionConfig;
}

type QuestionConfig =
  | TextareaConfig
  | ShortTextConfig
  | RadioConfig
  | CheckboxGroupConfig
  | LikertConfig
  | CompetencyRubricRowConfig;

interface RadioConfig         { options: string[]; otherWithText?: boolean }
interface CheckboxGroupConfig { options: string[]; otherWithText?: boolean }
interface LikertConfig        { scale: number; lowLabel: string; highLabel: string }
// (textarea, short-text, competency-rubric-row have empty config)
```

Discriminated union on `question.type` narrows config type at the renderer level.

### 6.3 Renderer

```tsx
<QuestionRenderer
  question={q}
  value={answers[q.id]}
  onChange={setAnswer}
  disabled={readOnly}
  error={errors[q.id]}
/>
```

One component per type, dispatched by switch. All components are pure / controlled.

### 6.4 Form lifecycle

```
loader (server)
  ├─ Load question set (or stitched 3-tier set for competency)
  ├─ Load existing submission if editing → restore answers
  └─ Return { questions, sectionBoundaries?, initialAnswers }

component
  ├─ useState<Answers>(initialAnswers)
  ├─ Render <QuestionRenderer> per question (with section headers between tiers if competency)
  └─ <Form action="."> on submit

action (server)
  ├─ Parse formData
  ├─ validateAnswers(questions, answers)
  │     • required-field check per question
  │     • minRequired across set
  │     • type-specific sanity (Likert in range, radio option exists, etc.)
  ├─ Success: insert/update assessment_submissions row
  └─ Failure: return { errors } → form re-renders with inline messages
```

### 6.5 Three-tier competency stitching

```ts
async function stitchedCompetencyQuestions(internId: string): Promise<{
  questions: Question[];
  sectionBoundaries: { afterIndex: number; label: string; subLabel?: string }[];
}> {
  const intern = await getIntern(internId);
  const core   = await getQuestionSet('competency-core');
  const cohort = await getQuestionSet(`competency-cohort-${intern.cohortId}`);
  const own    = await getQuestionSet(`competency-intern-${internId}`);

  const questions = [
    ...core.questions,
    ...(cohort?.questions ?? []),
    ...(own?.questions ?? []),
  ];

  const boundaries = [
    { afterIndex: -1, label: 'Professional Competencies' },
    cohort && {
      afterIndex: core.questions.length - 1,
      label: 'Role-Specific',
      subLabel: cohort.cohortName,
    },
    own && {
      afterIndex: core.questions.length + (cohort?.questions.length ?? 0) - 1,
      label: 'Intern-Specific',
    },
  ].filter(Boolean);

  return { questions, sectionBoundaries: boundaries };
}
```

The renderer reads `sectionBoundaries` and injects `<SectionHeader>` between rows. **All forms** (including competency) go through the same engine — resolves the deferred "Competency Rubric data-driven refactor" item.

### 6.6 Editor (Settings → Questions)

Accordion + 6-type picker + type-specific config sub-form. Persistence via Drizzle-backed actions.

**Prototype defects fixed for free during the rebuild:**
- Editor accordion no longer collapses on every action (React reconciliation, not `innerHTML` rebuilds)
- `.input--error` properly cleared on resubmit
- Multi-error scenarios show all errors

### 6.7 Answer storage shape (in `assessment_submissions.answers` JSONB)

```jsonc
// Standard form (textarea/short-text/radio/likert)
{
  "pg-q1": "I want to grow into a registered nurse role within 3 years...",
  "pg-q2": "...",
  "pf-q3": 4,                          // Likert numeric
  "pf-q1": "Internship ended naturally" // Radio selected option
}

// Competency
{
  "comp-core-prof-1": { "rating": "Ready",      "notes": "Consistently strong" },
  "comp-core-prof-2": { "rating": "Developing", "notes": "..." }
}

// Checkbox-group with "Other with text"
{
  "pf-q5": { "selected": ["Transportation", "Childcare"], "otherText": "" }
}
```

Stable shape per question type. Documented in the spec; never changes.

---

## 7. Migration & Data Seeding

### 7.1 Dev environment seeding

`db/seed.ts` mirrors the prototype's mock dataset:
- 6 employers (Eskenazi, TTT, Habitat, Elevate, Geminus, Health Link)
- Cohorts, roles, sample interns
- Phase + barrier libraries
- 4 standard question sets + Competency Core + sample cohort/intern competency overlays

`npm run db:seed` resets and reseeds local dev. CI uses the same script for preview deploys.

### 7.2 Production bootstrap

For real launch, **seed only library content** that admins shouldn't have to type from scratch:

| Seeded in prod | Why |
|---|---|
| Phase library | Standard across cohorts |
| Barrier library | Standard intake taxonomy |
| Question sets (Personal Goals, Midpoint Reflection, Participant Feedback, Exit Survey, Competency Core) | Final content from program staff |
| Program Info singleton | Pre-filled with IMPACT defaults |

**Not** seeded in prod: Employers, Cohorts, Interns, Per-cohort/per-intern competency overlays.

### 7.3 Question content as source-controlled artifact

Question content versioned in repo as TypeScript fixtures (`db/seed-data/question-sets.ts`). Two reasons:
1. Program staff may iterate before launch — git diff is the right review tool
2. Seeded once at bootstrap; admins can subsequently edit via UI without those edits being overwritten

Seed is **idempotent**: only inserts a question set if its `id` doesn't already exist.

### 7.4 Migrations

- `drizzle-kit` generates SQL migrations from schema changes
- CI runs `drizzle-kit migrate` against Supabase before each deploy
- All migrations committed; no auto-applied schema drift

### 7.5 Existing prototype data

Not migrated. Prototype data is mock — no real interns or assessments to preserve. Production starts from a clean library + zero records.

---

## 8. Phasing & Scope for v1

### 8.1 In v1

**Carries from prototype, rebuilt:**
- Full admin shell (every prototype admin page)
- Full intern self-assessment flow
- All Settings (Employers, Cohorts, Roles, Phases, Barriers, Program Info, Questions)
- 3-tier competency model + stitched assessment
- Exit Employer Survey (admin path preserved + employer self-serve added)
- Reports stub (CSS bar charts only — no real analytics)

**New in v1:**
- Employer logins + employer shell
- Employer self-service competency entry
- Employer self-service Exit Employer Survey
- Employer profile + role management
- Account provisioning flow (admin invite)
- Branded password reset page

**Quality items folded in for free during rebuild:**
- Editor accordion-collapse fix
- `.input--error` cleared on resubmit
- Competency rubric on the data-driven engine
- Real persistence everywhere (replaces sessionStorage)
- XSS-safe rendering (React handles for free)

### 8.2 Deferred

Per PRD §14 + BACKLOG.md + Deferred.md:
- Midpoint Performance Review form
- Multi-user per employer
- Custom question-type builder
- Creating new question sets via UI (the 5 stay fixed)
- Versioning of question sets (no draft/publish)
- Aggregate dashboards / real reports beyond stub
- CSV / PDF export
- Notifications (email, in-app)
- Audit log of admin actions
- 2FA, SSO
- Mobile-native app
- Cross-tab session sync (less of a problem post-rebuild — no sessionStorage layer)

### 8.3 Launch shape

**Big-bang launch.** All 6 sub-projects ship together. No external phased rollout. Sub-project gates exist internally for review.

### 8.4 Sub-project breakdown

Dependency-ordered:

| # | Name | Goal |
|---|---|---|
| 1 | **Foundation** | Repo scaffold, Supabase project, Drizzle schema, RLS policies, seed script, CI/CD. Empty app deploys to Netlify with login working. |
| 2 | **Admin core** | Admin shell, Settings (Employers/Cohorts/Roles/Phases/Barriers/Program Info), Interns CRUD, intern record. Admin can configure the program and create interns. |
| 3 | **Question engine** | Question-set editor + 6 type renderers + validation pipeline. Admin can author content; engine ready for forms. |
| 4 | **Assessment forms** | All 5 assessment forms wired up on the new engine; intern identity gate. Full prototype behavior reachable via real DB. |
| 5 | **Employer shell** | Employer login, employer routes, scoped views, account provisioning UI, branded password reset. Employers can self-serve. |
| 6 | **Polish & launch** | Branded emails, observability, smoke tests, prod data seed, performance pass, accessibility pass, launch. |

Each sub-project gets its own spec → plan → implementation cycle. We brainstorm sub-project 1 next, after this overall spec is approved.

### 8.5 Timeline

No hard deadline. Estimate: 8-14 weeks of focused part-time effort across the 6 sub-projects.

---

## 9. Cross-Cutting Concerns

### 9.1 Error handling & user feedback

- **Form-level errors** (validation, business rule, RLS denial): RR v7 actions return `{ errors }`; form re-renders with inline messages + top-of-form banner
- **Multi-error scenarios** show all errors at once
- **Toast notifications** (success/danger) carry from prototype
- **Confirmation modals** carry from prototype as `<ConfirmModal>` component
- **Route-level errors:** `errorBoundary` per route; branded 404; friendly 401/403 with sign-out + sign-in-as-different-user; friendly 500 with Sentry event ID
- **Network errors:** "Saving…" → "Couldn't save, try again" with retry. No offline-first.

### 9.2 Observability

| Layer | Tool |
|---|---|
| Frontend errors | Sentry (free tier, 5k events/mo) |
| Function logs | Netlify native |
| DB logs | Supabase native (slow query log, RLS denial counts) |
| Health checks | Netlify uptime + manual smoke-test runbook |

**RLS denials logged explicitly:** server actions wrap Supabase calls and emit a structured log line on PGRST403. If an employer's query unexpectedly returns 0 rows, we want to know.

### 9.3 Testing

```
Few          Playwright E2E smoke tests
                ├── admin login → create intern → submit competency → see in record
                ├── employer login → load own cohorts → submit competency
                └── intern identity → submit Personal Goals → confirmation

More         Vitest + Testing Library
                ├── question renderer — one test per question type
                ├── form actions — happy path + each validation error
                └── question-set editor — accordion + type picker

Most         Vitest unit
                ├── validation logic per question type
                ├── three-tier competency stitching
                ├── intern identity composite-key lookup
                └── RLS policy assertions (pgTAP-style)
```

**Coverage rule:** every form `action` has at least one happy-path and one failure-path test. RLS policies have explicit tests asserting "admin sees X, employer sees Y, employer doesn't see Z." No numeric coverage threshold.

**CI:** GitHub Actions runs lint + typecheck + Vitest on every PR. Playwright runs against a Netlify deploy preview. ~5-minute total CI target.

### 9.4 Accessibility baseline

Folded into v1 (rather than deferred to a sub-project D):
- Keyboard navigation on all cursor-pointer rows (Enter / Space) with focus rings
- Modals: `aria-labelledby` references the modal title
- Editor accordions toggle on Enter / Space; type-picker dismisses on Escape
- Form fields have proper `<label for>` and `aria-describedby` for helper text
- Print stylesheet `print-color-adjust` fixes from BACKLOG roll into the rebuild

Full WCAG AA audit deferred. Baseline above is enough to not embarrass us.

### 9.5 Performance guardrails

- Every list page has `LIMIT` and pagination (UI deferred — at v1 sizes lists fit on one page)
- Indexes on every FK + every RLS scoping column
- React Query / TanStack Query NOT used — RR v7 loaders + revalidation handle it
- Client bundle target: <200KB gzipped JS

### 9.6 Security baseline

- **anon key** client-side only; **service-role key** server-side only (env var, never in client bundle)
- RLS on **every** table from day one
- Content-Security-Policy header in `netlify.toml` (no inline scripts)
- All user content rendered through React (XSS-safe by default)
- Email enumeration: Supabase default behavior preserved (does not reveal email existence)

---

## 10. Open Questions / Risks

1. **Final question content from program staff.** Personal Goals + Midpoint Reflection placeholder content needs sign-off before prod seed. Tracked separately; doesn't block sub-project 1.
2. **Pass/Fail rule.** PRD §13 question 1 — still placeholder ("all Ready"). Real rule pending program staff. Doesn't block engine; affects only the derived display in competency-detail / reports.
3. **Outcome dates.** PRD §13 question 4 — 90-day and 180-day follow-ups stay manual in v1; whether to schedule them is post-v1.
4. **Future Midpoint Performance Review.** PRD §13 question 5 — explicit deferral; structure remains expandable (new `kind` value on `question_sets`, no schema breakage to add).
5. **Email deliverability.** Resend free tier rate limits + Supabase template branding. Test thoroughly before launch.
6. **Supabase free-tier project pause** after 7 days inactivity. Not a problem for live use but means dev/staging projects need a periodic ping. Trivial uptime job; not a blocker.

---

## 11. Decisions Log (this session)

| Decision | Choice |
|---|---|
| Tenancy | Single-tenant, forever |
| Framework | React Router v7 (framework mode) |
| DB | Supabase Postgres (originally Turso → switched after employer-login expansion) |
| Auth | Supabase Auth (originally Clerk → switched for RLS integration) |
| Three-tier model | Anon intern + Employer + Admin |
| Employer capabilities | Read own scope; write competency + Exit Survey; CRUD own profile + roles |
| Soft delete | `interns` + `assessment_submissions` only |
| Anon submission RLS bypass | RR v7 server action with service-role key |
| Question IDs | Stable text keys, never changed |
| Question-set visibility for employers | Stitched-only (no separate "view our questions" screen) |
| Login UX | Single `/login` page, role-based redirect |
| Multi-user per employer | Single account per employer in v1 |
| Branded reset page | Yes |
| Launch shape | Big-bang |
| Timeline | No hard deadline; ship when ready |
| Repo strategy | Existing repo (renamed to fix typo); new code as sibling directories alongside `Prototypes/` and `docs/` |

---

**End of design spec.** Implementation plans live under `docs/superpowers/plans/`, one per sub-project.
