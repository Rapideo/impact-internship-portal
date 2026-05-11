# Sub-Project 4: Assessment Forms — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all 5 assessment form types (Personal Goals, Midpoint Reflection, Participant Feedback, Exit Employer Survey, Competency) onto the sub-project 3 question engine against the real Supabase database, gated behind an anonymous-intern composite-key identity flow for self-assessments and `?internId=` admin pre-fill for admin/competency flows. Delivers full prototype parity — every form, viewer, list, confirmation, and admin chooser hub — reachable via real routes that read/write `assessment_submissions` with RLS bypass via the service-role client where the actor is anonymous.

**Architecture:** All form routes are React Router v7 file routes under `app/routes/_public.intern.*.tsx` (intern self-assessments), `app/routes/admin.assessments.*.tsx` (admin competency + exit survey), `app/routes/admin.self-assessment*.tsx` (admin read-only viewers + list), and `app/routes/_public.assessment-confirmation.tsx` (confirmation). Form bodies are extracted into reusable shared `<AssessmentForm>` components in `app/components/forms/` so sub-project 5 can wrap them with an employer-scoped action target. The intern identity flow uses a server-side composite-key lookup, persists confirmation to a signed-HMAC cookie (`impact_intern_identity`), and revalidates the identity inside every anonymous submission action before inserting via the `db.service` (service-role) client to bypass RLS. One-shot enforcement leans on the partial unique index from sub-project 1; a 409-style structured error surfaces a friendly "already submitted" view.

**Tech Stack:** TypeScript 5.7 (strict), React Router v7 (framework mode, SSR), Drizzle 0.36 + postgres-js 3.4, `@supabase/supabase-js` 2.46, `@supabase/ssr` 0.5, Vitest 2, Playwright 1.49, React 18. CSS uses the token system lifted from `Prototypes/PROTOTYPE/styles.css` in sub-project 1.

**Spec:** `docs/superpowers/specs/2026-05-10-production-rebuild-design.md` (sections 4.4 intern flow, 5.1 anonymous intern path, 6 question-set engine, 9.1 error handling).

**Working directory for all paths below:** repo root (`IMPACT Internship Assessment Portal/`).

**Depends on:** sub-project 1 (schema, RLS, service-role client wrapper, `lookupInternByIdentity` helper, brand tokens), sub-project 2 (admin shell, admin layout/nav, intern-record route, intern-picker modal primitive used by Settings — reused here), sub-project 3 (question engine APIs — see "Assumed contracts" below).

---

## Assumed contracts from sub-project 3 (Question engine)

Sub-project 3's plan is being written in parallel. This plan freezes the following signatures and assumes sub-project 3 will deliver them. If the actual signatures diverge, central review reconciles via thin adapter functions in `app/lib/question-engine-adapter.ts`; no form-level rewrites should be needed.

```ts
// app/lib/question-engine.ts (owned by sub-project 3)

export type QuestionType =
  | 'textarea' | 'short-text' | 'radio' | 'checkbox-group'
  | 'likert' | 'competency-rubric-row';

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  helperText?: string;
  required: boolean;
  sortOrder: number;
  config: Record<string, unknown>;
}

export interface SectionBoundary {
  afterIndex: number;       // -1 means "before first question"
  label: string;
  subLabel?: string;
}

export type SerializedAnswers = Record<string, unknown>;

export interface QuestionSet {
  id: string;
  kind: 'standard' | 'competency-core' | 'competency-cohort' | 'competency-intern';
  name: string;
  minRequired: number | null;
  questions: Question[];
}

export interface StitchedCompetency {
  questions: Question[];
  sectionBoundaries: SectionBoundary[];
}

// Loaders (server-only)
export function getQuestionSet(setId: string): Promise<QuestionSet | null>;
export function stitchedCompetencyQuestions(internId: string): Promise<StitchedCompetency>;

// Pure (isomorphic)
export function validateAnswers(
  questions: Question[],
  answers: SerializedAnswers,
  opts?: { minRequired?: number | null },
): { ok: boolean; errors: Record<string, string> }; // includes '__minRequired' key for set-level error

export function serializeAnswers(
  questions: Question[],
  formData: FormData,
): SerializedAnswers;

// Component (client-rendered, controlled)
export interface QuestionRendererProps {
  questions: Question[];
  answers: SerializedAnswers;
  errors: Record<string, string>;
  onChange: (questionId: string, value: unknown) => void;
  readOnly?: boolean;
  sectionBoundaries?: SectionBoundary[];
}
export function QuestionRenderer(props: QuestionRendererProps): React.ReactElement;
```

If sub-project 3's `validateAnswers` differs (e.g. takes `QuestionSet` instead of `Question[]`), sub-project 4's action handlers wrap with a single-line adapter — no other refactor needed.

---

## File Structure

Sub-project 4 creates the following files. All paths are relative to repo root.

**Identity / cookie helpers (`app/lib/`):**
- `app/lib/intern-identity.server.ts` — sign/verify the `impact_intern_identity` cookie; thin wrapper around sub-project 1's `lookupInternByIdentity`
- `app/lib/db.service.server.ts` — service-role Drizzle client (wraps `app/lib/db.server.ts`'s connection with a service-role auth context for anonymous insert paths)
- `app/lib/assessment-submissions.server.ts` — typed insert/update helpers used by all 5 form actions

**Shared form components (`app/components/forms/`):**
- `app/components/forms/AssessmentForm.tsx` — generic standard-set form component (consumes engine; used by Personal Goals / Midpoint / Participant Feedback / Exit Employer Survey)
- `app/components/forms/CompetencyAssessmentForm.tsx` — competency form (consumes stitched competency + section boundaries)
- `app/components/forms/IdentityConfirmedChip.tsx` — "Submitting as …" chip shared by 3 intern forms
- `app/components/forms/SubmitConfirmModal.tsx` — pre-submit confirmation modal (lifted pattern from prototype)

**Intern (public) routes (`app/routes/`):**
- `app/routes/_public.intern.tsx` — intern shell layout (no auth; reads identity cookie; renders nav)
- `app/routes/_public.intern.assessments.tsx` — chooser hub + identity gate UI (matches `intern-assessments.html`)
- `app/routes/_public.intern.personal-goals.tsx` — Personal Goals form
- `app/routes/_public.intern.midpoint-reflection.tsx` — Midpoint Reflection form
- `app/routes/_public.intern.participant-feedback.tsx` — Participant Feedback form
- `app/routes/_public.intern.confirmation.tsx` — `?type=` confirmation page (matches `assessment-confirmation.html`)
- `app/routes/_public.intern.reset-identity.ts` — POST action to clear the identity cookie

**Admin routes (`app/routes/`):**
- `app/routes/admin.assessments.tsx` — Assessments chooser hub (2 cards + intern-picker modal) — matches `assessments.html`
- `app/routes/admin.assessments.competency.new.tsx` — Competency new form (`?internId=`)
- `app/routes/admin.assessments.competency.edit.$id.tsx` — Competency edit form
- `app/routes/admin.assessments.competency.$id.tsx` — Competency detail (read-only)
- `app/routes/admin.assessments.exit-employer-survey.tsx` — Exit Employer Survey (admin path; `?internId=`)
- `app/routes/admin.self-assessment-results.tsx` — Admin list of all intern self-assessment submissions (not in nav, reachable by URL)
- `app/routes/admin.self-assessment-detail.tsx` — Read-only viewer (`?type=&internId=`)

**Tests (`tests/`):**
- `tests/lib/intern-identity.server.test.ts` — cookie sign/verify + composite-key revalidation
- `tests/lib/assessment-submissions.server.test.ts` — insert/update + one-shot rejection unit tests
- `tests/components/AssessmentForm.test.tsx` — renderer + validation integration
- `tests/components/CompetencyAssessmentForm.test.tsx` — competency stitching renderer test
- `tests/rls/anon-submission.test.ts` — RLS: anon insert via service-role succeeds; via anon-key fails
- `tests/e2e/intern-self-submit.spec.ts` — Playwright: identity → Personal Goals → confirmation
- `tests/e2e/admin-competency.spec.ts` — Playwright: admin chooser → picker → competency submit
- `tests/e2e/admin-exit-employer-survey.spec.ts` — Playwright: admin → Exit Survey submit + edit

**Routes table:**
- Modify: `app/routes.ts` — register all sub-project 4 routes

**Seed data (`db/seed-data/`):**
- Modify: `db/seed-data/question-sets.ts` — copy verbatim question prompts from prototype `app.js` `QUESTION_SETS_DEFAULTS` for the 5 sets

---

## Phase A: Identity gate + cookie infrastructure

The composite-key identity flow is the foundation for sub-project 4 — every anonymous submission revalidates against it.

### Task 1: Write the intern identity cookie helper — TDD

**Files:**
- Create: `app/lib/intern-identity.server.ts`
- Create: `tests/lib/intern-identity.server.test.ts`

- [ ] **Step 1: Write the failing tests**

  `tests/lib/intern-identity.server.test.ts`:

  ```ts
  import { describe, it, expect, beforeAll } from 'vitest';
  import {
    signInternIdentityCookie,
    parseInternIdentityCookie,
    serializeInternIdentityCookie,
    INTERN_IDENTITY_COOKIE_NAME,
  } from '~/lib/intern-identity.server';

  const FAKE_SECRET = 'test-secret-must-be-32-bytes-long-aaaa';
  beforeAll(() => {
    process.env.SESSION_SECRET = FAKE_SECRET;
  });

  describe('intern identity cookie', () => {
    const identity = {
      internId: '44444444-4444-4444-4444-444444444401',
      firstInitial: 'A',
      lastName: 'Williams',
      cohortId: '33333333-3333-3333-3333-333333333301',
      employerId: '11111111-1111-1111-1111-111111111101',
    };

    it('round-trips a signed cookie value', () => {
      const value = signInternIdentityCookie(identity);
      const parsed = parseInternIdentityCookie(value);
      expect(parsed).toEqual(identity);
    });

    it('returns null for an unsigned cookie value', () => {
      expect(parseInternIdentityCookie('{"internId":"x"}')).toBeNull();
    });

    it('returns null for a tampered signature', () => {
      const value = signInternIdentityCookie(identity);
      const tampered = value.slice(0, -2) + 'XX';
      expect(parseInternIdentityCookie(tampered)).toBeNull();
    });

    it('serializes with HttpOnly, SameSite=Lax, secure-when-prod, 30-day Max-Age', () => {
      const setCookie = serializeInternIdentityCookie(signInternIdentityCookie(identity), {
        isProd: true,
      });
      expect(setCookie).toMatch(new RegExp(`^${INTERN_IDENTITY_COOKIE_NAME}=`));
      expect(setCookie).toMatch(/HttpOnly/);
      expect(setCookie).toMatch(/SameSite=Lax/);
      expect(setCookie).toMatch(/Secure/);
      expect(setCookie).toMatch(/Max-Age=2592000/); // 30 days
      expect(setCookie).toMatch(/Path=\//);
    });

    it('serializes without Secure when not prod', () => {
      const setCookie = serializeInternIdentityCookie(signInternIdentityCookie(identity), {
        isProd: false,
      });
      expect(setCookie).not.toMatch(/Secure/);
    });

    it('serializes the clear value with Max-Age=0', () => {
      const setCookie = serializeInternIdentityCookie('', { isProd: false, clear: true });
      expect(setCookie).toMatch(/Max-Age=0/);
    });
  });
  ```

- [ ] **Step 2: Run tests to verify they fail**

  ```bash
  npm test -- intern-identity.server
  ```

  Expected: FAIL — module not found.

- [ ] **Step 3: Implement `app/lib/intern-identity.server.ts`**

  ```ts
  import crypto from 'node:crypto';
  import { lookupInternByIdentity } from './identity.server';
  import { env } from './env.server';

  export const INTERN_IDENTITY_COOKIE_NAME = 'impact_intern_identity';
  const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

  export interface InternIdentityCookie {
    internId: string;
    firstInitial: string;
    lastName: string;
    cohortId: string;
    employerId: string;
  }

  function secret(): string {
    const s = process.env.SESSION_SECRET ?? env.SUPABASE_SERVICE_ROLE_KEY; // fallback used only on the assumption sub-project 1 set SESSION_SECRET
    if (!s || s.length < 16) {
      throw new Error('SESSION_SECRET is required for signing identity cookies');
    }
    return s;
  }

  export function signInternIdentityCookie(identity: InternIdentityCookie): string {
    const payload = Buffer.from(JSON.stringify(identity)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  export function parseInternIdentityCookie(value: string | null | undefined): InternIdentityCookie | null {
    if (!value) return null;
    const idx = value.lastIndexOf('.');
    if (idx <= 0) return null;
    const payload = value.slice(0, idx);
    const sig = value.slice(idx + 1);
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
    try {
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    } catch {
      return null;
    }
    try {
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
      if (
        typeof parsed?.internId === 'string' &&
        typeof parsed?.firstInitial === 'string' &&
        typeof parsed?.lastName === 'string' &&
        typeof parsed?.cohortId === 'string' &&
        typeof parsed?.employerId === 'string'
      ) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  export function serializeInternIdentityCookie(
    value: string,
    opts: { isProd: boolean; clear?: boolean },
  ): string {
    const parts = [
      `${INTERN_IDENTITY_COOKIE_NAME}=${value}`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=${opts.clear ? 0 : MAX_AGE_SECONDS}`,
    ];
    if (opts.isProd) parts.push('Secure');
    return parts.join('; ');
  }

  /**
   * Read + re-validate the identity cookie against the live roster on each request.
   * Returns null if the cookie is missing/invalid OR the intern has been deleted/renamed.
   */
  export async function getCurrentInternIdentity(request: Request): Promise<InternIdentityCookie | null> {
    const cookieHeader = request.headers.get('Cookie') ?? '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${INTERN_IDENTITY_COOKIE_NAME}=([^;]+)`));
    if (!match) return null;
    const decoded = decodeURIComponent(match[1]);
    const parsed = parseInternIdentityCookie(decoded);
    if (!parsed) return null;

    // Defense-in-depth: revalidate against the live roster on every read.
    const intern = await lookupInternByIdentity({
      firstInitial: parsed.firstInitial,
      lastName: parsed.lastName,
      cohortId: parsed.cohortId,
    });
    if (!intern || intern.id !== parsed.internId) return null;
    return parsed;
  }
  ```

- [ ] **Step 4: Add `SESSION_SECRET` to `.env.example` and `app/lib/env.server.ts`**

  Append to `.env.example`:

  ```
  # Used to sign the anonymous intern identity cookie
  SESSION_SECRET=<at least 32 random bytes; generate via: openssl rand -base64 32>
  ```

  Add to `env.server.ts`:

  ```ts
  SESSION_SECRET: required('SESSION_SECRET'),
  ```

- [ ] **Step 5: Run tests to verify they pass**

  ```bash
  npm test -- intern-identity.server
  ```

  Expected: 6 tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add app/lib/intern-identity.server.ts tests/lib/intern-identity.server.test.ts .env.example app/lib/env.server.ts
  git commit -m "Add HMAC-signed intern identity cookie helper + tests"
  ```

### Task 2: Add the service-role Drizzle client wrapper

**Files:**
- Create: `app/lib/db.service.server.ts`

- [ ] **Step 1: Create the file**

  ```ts
  import postgres from 'postgres';
  import { drizzle } from 'drizzle-orm/postgres-js';
  import * as schema from '../../db/schema';
  import { env } from './env.server';

  /**
   * Service-role Drizzle client. Bypasses RLS by connecting via the postgres
   * superuser-equivalent role used internally by Supabase's service_role API key.
   *
   * Use ONLY in server actions where the actor is anonymous (the 3 intern self-
   * assessment forms). Never expose to client code; never use in admin/employer
   * paths where RLS-scoped queries are the correct safety net.
   *
   * The service-role uses the same DATABASE_POOL_URL as the regular client — the
   * Supabase Postgres role attached to that connection has BYPASSRLS. (Drizzle
   * itself does not toggle roles; the connection's underlying role determines
   * whether RLS is enforced.)
   *
   * In sub-project 1 the pool URL is the standard Supabase pooled connection
   * (Supavisor transaction mode) whose role is `postgres` — this DOES bypass
   * RLS by default in a fresh Supabase project. If sub-project 1's setup
   * changes that, sub-project 4's executor must reconcile: either point
   * DATABASE_POOL_URL_SERVICE at the unrestricted role, or wrap each insert
   * here with a `SET LOCAL role` block.
   */
  const client = postgres(env.DATABASE_POOL_URL, {
    max: 1,
    prepare: false,
  });

  export const dbService = drizzle(client, { schema });
  export type DBService = typeof dbService;
  ```

  > **Reconciliation note for the executor:** if sub-project 1's pooled connection ends up using a non-bypass-RLS role (e.g. `authenticated`), update this file to use a separate service-role connection string (`DATABASE_SERVICE_URL`) — add the env var and wire it through `env.server.ts`. Behaviour is verified by `tests/rls/anon-submission.test.ts` (Task 6).

- [ ] **Step 2: Commit**

  ```bash
  git add app/lib/db.service.server.ts
  git commit -m "Add service-role Drizzle client wrapper for anonymous insert paths"
  ```

### Task 3: Write assessment-submissions insert/update helpers — TDD

**Files:**
- Create: `app/lib/assessment-submissions.server.ts`
- Create: `tests/lib/assessment-submissions.server.test.ts`

- [ ] **Step 1: Write the failing tests**

  `tests/lib/assessment-submissions.server.test.ts`:

  ```ts
  import { describe, it, expect, beforeEach } from 'vitest';
  import {
    insertAnonymousSubmission,
    insertOrUpdateSubmissionAsAdmin,
    getSubmission,
    AssessmentAlreadySubmittedError,
  } from '~/lib/assessment-submissions.server';
  import postgres from 'postgres';
  import 'dotenv/config';

  // These tests require the dev DB; gated like identity.server.test.ts.
  const SKIP = !process.env.DATABASE_POOL_URL || process.env.DATABASE_POOL_URL.includes('fake');

  const ESKENAZI_INTERN = '44444444-4444-4444-4444-444444444401';

  describe.skipIf(SKIP)('assessment-submissions helpers', () => {
    beforeEach(async () => {
      const sql = postgres(process.env.DATABASE_POOL_URL!, { max: 1, prepare: false });
      try {
        await sql`DELETE FROM public.assessment_submissions WHERE intern_id = ${ESKENAZI_INTERN}`;
      } finally {
        await sql.end();
      }
    });

    it('inserts a one-shot submission anonymously', async () => {
      const id = await insertAnonymousSubmission({
        internId: ESKENAZI_INTERN,
        type: 'personal-goals',
        answers: { 'pg-skills': 'Communication' },
      });
      expect(id).toBeTruthy();
    });

    it('rejects a duplicate one-shot submission with AssessmentAlreadySubmittedError', async () => {
      await insertAnonymousSubmission({
        internId: ESKENAZI_INTERN,
        type: 'personal-goals',
        answers: { 'pg-skills': 'A' },
      });
      await expect(
        insertAnonymousSubmission({
          internId: ESKENAZI_INTERN,
          type: 'personal-goals',
          answers: { 'pg-skills': 'B' },
        }),
      ).rejects.toBeInstanceOf(AssessmentAlreadySubmittedError);
    });

    it('admin insert-or-update upserts the exit-employer-survey (editable)', async () => {
      const id1 = await insertOrUpdateSubmissionAsAdmin({
        internId: ESKENAZI_INTERN,
        type: 'exit-employer-survey',
        answers: { 'ees-outcome': 'hired' },
        submittedBy: null,
      });
      const id2 = await insertOrUpdateSubmissionAsAdmin({
        internId: ESKENAZI_INTERN,
        type: 'exit-employer-survey',
        answers: { 'ees-outcome': 'completed' },
        submittedBy: null,
      });
      expect(id2).toBe(id1); // same row updated, not a second row
      const row = await getSubmission(id2);
      expect((row?.answers as Record<string, unknown>)['ees-outcome']).toBe('completed');
    });

    it('admin can insert multiple competency submissions per intern per phase', async () => {
      const id1 = await insertOrUpdateSubmissionAsAdmin({
        internId: ESKENAZI_INTERN,
        type: 'competency',
        phase: 'Phase 1',
        answers: { 'comp-attendance': { rating: 'Ready', notes: '' } },
        submittedBy: null,
      });
      const id2 = await insertOrUpdateSubmissionAsAdmin({
        internId: ESKENAZI_INTERN,
        type: 'competency',
        phase: 'Phase 1',
        answers: { 'comp-attendance': { rating: 'Developing', notes: '' } },
        submittedBy: null,
      });
      expect(id2).not.toBe(id1); // PRD §7.4: multiple competency per phase allowed
    });
  });
  ```

- [ ] **Step 2: Run to verify failure**

  ```bash
  npm test -- assessment-submissions
  ```

  Expected: FAIL — module not found.

- [ ] **Step 3: Implement `app/lib/assessment-submissions.server.ts`**

  ```ts
  import { eq, and, isNull } from 'drizzle-orm';
  import { db } from './db.server';
  import { dbService } from './db.service.server';
  import { assessmentSubmissions } from '../../db/schema';
  import type { SerializedAnswers } from './question-engine';

  export type SubmissionType =
    | 'personal-goals'
    | 'midpoint-reflection'
    | 'participant-feedback'
    | 'competency'
    | 'exit-employer-survey';

  export const ONE_SHOT_TYPES: SubmissionType[] = [
    'personal-goals',
    'midpoint-reflection',
    'participant-feedback',
  ];

  export class AssessmentAlreadySubmittedError extends Error {
    constructor(public type: SubmissionType, public internId: string) {
      super(`Assessment ${type} already submitted for intern ${internId}`);
      this.name = 'AssessmentAlreadySubmittedError';
    }
  }

  /**
   * Insert via the service-role client (bypasses RLS). Used by anonymous intern
   * self-assessment submissions where the actor has no JWT.
   *
   * Identity revalidation is the caller's responsibility (action handler).
   *
   * Throws AssessmentAlreadySubmittedError if a one-shot row already exists.
   */
  export async function insertAnonymousSubmission(input: {
    internId: string;
    type: SubmissionType;
    answers: SerializedAnswers;
  }): Promise<string> {
    if (ONE_SHOT_TYPES.includes(input.type)) {
      const existing = await dbService
        .select({ id: assessmentSubmissions.id })
        .from(assessmentSubmissions)
        .where(
          and(
            eq(assessmentSubmissions.internId, input.internId),
            eq(assessmentSubmissions.type, input.type),
            isNull(assessmentSubmissions.deletedAt),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        throw new AssessmentAlreadySubmittedError(input.type, input.internId);
      }
    }
    try {
      const [row] = await dbService
        .insert(assessmentSubmissions)
        .values({
          internId: input.internId,
          type: input.type,
          answers: input.answers as Record<string, unknown>,
          submittedBy: null,
        })
        .returning({ id: assessmentSubmissions.id });
      return row.id;
    } catch (err: unknown) {
      // The partial unique index in sub-project 1 enforces one-shot uniqueness
      // even if the check above races. Translate the PG error to our typed error.
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
        throw new AssessmentAlreadySubmittedError(input.type, input.internId);
      }
      throw err;
    }
  }

  /**
   * Admin-side insert-or-update via the regular (RLS-scoped) client.
   * - For type='competency': always inserts a new row (multiple per phase allowed per PRD §7.4).
   * - For type='exit-employer-survey': upsert by (intern_id, type) — admin can re-save.
   */
  export async function insertOrUpdateSubmissionAsAdmin(input: {
    internId: string;
    type: 'competency' | 'exit-employer-survey';
    phase?: string;
    answers: SerializedAnswers;
    submittedBy: string | null;
  }): Promise<string> {
    if (input.type === 'exit-employer-survey') {
      const existing = await db
        .select({ id: assessmentSubmissions.id })
        .from(assessmentSubmissions)
        .where(
          and(
            eq(assessmentSubmissions.internId, input.internId),
            eq(assessmentSubmissions.type, input.type),
            isNull(assessmentSubmissions.deletedAt),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(assessmentSubmissions)
          .set({ answers: input.answers as Record<string, unknown>, submittedBy: input.submittedBy })
          .where(eq(assessmentSubmissions.id, existing[0].id));
        return existing[0].id;
      }
    }
    const [row] = await db
      .insert(assessmentSubmissions)
      .values({
        internId: input.internId,
        type: input.type,
        phase: input.type === 'competency' ? input.phase ?? null : null,
        answers: input.answers as Record<string, unknown>,
        submittedBy: input.submittedBy,
      })
      .returning({ id: assessmentSubmissions.id });
    return row.id;
  }

  export async function getSubmission(id: string) {
    const rows = await db
      .select()
      .from(assessmentSubmissions)
      .where(and(eq(assessmentSubmissions.id, id), isNull(assessmentSubmissions.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  export async function getOneShotSubmission(internId: string, type: SubmissionType) {
    const rows = await db
      .select()
      .from(assessmentSubmissions)
      .where(
        and(
          eq(assessmentSubmissions.internId, internId),
          eq(assessmentSubmissions.type, type),
          isNull(assessmentSubmissions.deletedAt),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  }
  ```

- [ ] **Step 4: Run tests**

  ```bash
  npm test -- assessment-submissions
  ```

  Expected: 4 tests pass (dev DB required).

- [ ] **Step 5: Commit**

  ```bash
  git add app/lib/assessment-submissions.server.ts tests/lib/assessment-submissions.server.test.ts
  git commit -m "Add assessment-submissions insert/update helpers with one-shot enforcement"
  ```

### Task 4: Expand the question-set seed data to verbatim prototype content

**Files:**
- Modify: `db/seed-data/question-sets.ts`

Sub-project 1 seeded placeholder rows. Sub-project 4's forms need the verbatim prompts so the rendered forms match the prototype byte-for-byte.

- [ ] **Step 1: Replace `db/seed-data/question-sets.ts` SEED_QUESTION_SETS export with full content**

  Copy the 5 question sets verbatim from `Prototypes/PROTOTYPE/app.js` lines 112–471 (`QUESTION_SETS_DEFAULTS`):

  - `personal-goals` — 5 questions: `pg-skills`, `pg-gain`, `pg-success`, `pg-challenge` (4 textareas), `pg-confident` (short-text); minRequired 4
  - `midpoint-reflection` — 6 textareas: `mr-learned`, `mr-gone-well`, `mr-challenges`, `mr-improving`, `mr-support`, `mr-success`; minRequired 4
  - `participant-feedback` — 9 mixed: `pf-leaving` (radio + other), `pf-overall` (likert 1–5), `pf-prepared` (radio yes/no), `pf-supported` (radio 3-way), `pf-supported-detail` (textarea), `pf-barriers` (radio yes/no), `pf-barriers-detail` (textarea), `pf-recommend` (radio 3-way), `pf-improve` (textarea); minRequired 4
  - `exit-employer-survey` — 9 mixed: `ees-outcome` (radio, required), `ees-offered` (radio), `ees-offered-detail` (textarea), `ees-performance` (likert, required), `ees-strengths` (textarea), `ees-improvements` (textarea), `ees-readiness` (checkbox-group), `ees-barriers` (checkbox-group + other), `ees-comments` (textarea); minRequired 4
  - `competency-core` — 7 rubric rows: `comp-attendance`, `comp-conduct`, `comp-communication`, `comp-direction`, `comp-problem-solving`, `comp-teamwork`, `comp-quality`; minRequired 0

  The `id`, `label`, `helperText`, `required`, and `config` fields are all preserved exactly. The seed's `SeedQuestion` interface already accommodates the prototype's config shapes (e.g. `{ options, otherWithText, rows, placeholder, min, max, leftLabel, rightLabel }`); no schema change needed.

  > **Critical:** do not paraphrase. Copy-paste from `app.js`. Sub-project 3's `validateAnswers` and `QuestionRenderer` consume these `config` keys directly.

  Also add (or keep) the Eskenazi cohort overlay (`competency-cohort-<eskenazi-cohort-uuid>`) with the 4 prototype Eskenazi role-specific rubric rows (`cc-eskenazi-intake`, `cc-eskenazi-ehr`, `cc-eskenazi-pace`, `cc-eskenazi-hipaa`).

- [ ] **Step 2: Reseed dev DB**

  ```bash
  npm run db:seed
  ```

- [ ] **Step 3: Verify in Supabase Studio**

  ```sql
  SELECT qs.id, qs.name, COUNT(q.id) AS question_count
    FROM public.question_sets qs
    LEFT JOIN public.questions q ON q.question_set_id = qs.id
   GROUP BY qs.id, qs.name
   ORDER BY qs.id;
  ```

  Expected counts: personal-goals=5, midpoint-reflection=6, participant-feedback=9, exit-employer-survey=9, competency-core=7, competency-cohort-<uuid>=4.

- [ ] **Step 4: Commit**

  ```bash
  git add db/seed-data/question-sets.ts
  git commit -m "Seed verbatim question content for all 5 assessment forms"
  ```

### Task 5: Add 3 more interns to seed for Playwright fixtures

**Files:**
- Modify: `db/seed-data/interns.ts`

The 3 sub-project 1 seed interns are enough for sub-project 1's smoke tests. Sub-project 4 needs additional interns covering more cohorts (so the chooser/picker has visible variety) and an intern dedicated to e2e test isolation.

- [ ] **Step 1: Add 3 e2e-dedicated interns to `SEED_INTERNS`**

  IDs `4444…4404`, `4444…4405`, `4444…4406`, all in Eskenazi cohort with distinct last names (`Test1`, `Test2`, `Test3`). E2E specs target these so reseed doesn't disrupt manual UI walk-throughs.

- [ ] **Step 2: Reseed + commit**

  ```bash
  npm run db:seed
  git add db/seed-data/interns.ts
  git commit -m "Add 3 e2e-dedicated seed interns for sub-project 4 fixtures"
  ```

### Task 6: Write RLS test proving anon-key insert fails but service-role insert succeeds

**Files:**
- Create: `tests/rls/anon-submission.test.ts`

- [ ] **Step 1: Write the test**

  ```ts
  import { describe, it, expect, beforeEach } from 'vitest';
  import postgres from 'postgres';
  import { createClient } from '@supabase/supabase-js';
  import 'dotenv/config';

  const ESKENAZI_INTERN = '44444444-4444-4444-4444-444444444401';

  describe('RLS: anonymous submission requires service-role bypass', () => {
    beforeEach(async () => {
      const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
      try {
        await sql`DELETE FROM public.assessment_submissions WHERE intern_id = ${ESKENAZI_INTERN}`;
      } finally {
        await sql.end();
      }
    });

    it('anon-key client (no JWT) cannot insert into assessment_submissions', async () => {
      const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
      const { error } = await anon
        .from('assessment_submissions')
        .insert({ intern_id: ESKENAZI_INTERN, type: 'personal-goals', answers: {} });
      // RLS denies; Supabase returns an error with code matching the PostgREST RLS denial.
      expect(error).toBeTruthy();
    });

    it('service-role key bypasses RLS and inserts successfully', async () => {
      const svc = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data, error } = await svc
        .from('assessment_submissions')
        .insert({ intern_id: ESKENAZI_INTERN, type: 'personal-goals', answers: { 'pg-skills': 'X' } })
        .select('id')
        .single();
      expect(error).toBeNull();
      expect(data?.id).toBeTruthy();
    });
  });
  ```

- [ ] **Step 2: Run + commit**

  ```bash
  npm run test:rls
  git add tests/rls/anon-submission.test.ts
  git commit -m "Add RLS test: anon-key denied, service-role bypasses for anonymous submissions"
  ```

---

## Phase B: Shared form components

### Task 7: Build the `<IdentityConfirmedChip>` component

**Files:**
- Create: `app/components/forms/IdentityConfirmedChip.tsx`

- [ ] **Step 1: Create the component**

  Stateless presentational component. Props:

  ```ts
  interface Props {
    firstInitial: string;
    lastName: string;
    employerName: string;
    cohortName: string;
    onSwitch?: () => void;  // optional — only the chooser shows the Switch button
  }
  ```

  Renders the prototype's `.identity-confirmed` chip markup with checkmark, label/value pairs, and dividers. Lifted directly from `Prototypes/PROTOTYPE/personal-goals.html` lines 52–70.

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/forms/IdentityConfirmedChip.tsx
  git commit -m "Add IdentityConfirmedChip shared component"
  ```

### Task 8: Build the `<SubmitConfirmModal>` component

**Files:**
- Create: `app/components/forms/SubmitConfirmModal.tsx`

- [ ] **Step 1: Create the component**

  Props:

  ```ts
  interface Props {
    open: boolean;
    title: string;
    body: string;
    confirmLabel: string;
    cancelLabel?: string;       // default: 'Keep Editing'
    onClose: () => void;
    onConfirm: () => void;
    danger?: boolean;
  }
  ```

  Wraps the prototype's `.modal` markup (overlay + card + actions). Listens for Escape on the overlay. Uses `<button type="button">` inside its own `<form>` parent — the parent route's `<Form>` triggers submission via `useSubmit()` after confirm.

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/forms/SubmitConfirmModal.tsx
  git commit -m "Add SubmitConfirmModal shared component"
  ```

### Task 9: Build the `<AssessmentForm>` standard component — TDD

**Files:**
- Create: `app/components/forms/AssessmentForm.tsx`
- Create: `tests/components/AssessmentForm.test.tsx`

This is the form body used by Personal Goals, Midpoint Reflection, Participant Feedback, and (via wrapper) Exit Employer Survey.

- [ ] **Step 1: Write the failing test**

  ```tsx
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, fireEvent } from '@testing-library/react';
  import '@testing-library/jest-dom/vitest';
  import { AssessmentForm } from '~/components/forms/AssessmentForm';
  import type { Question } from '~/lib/question-engine';

  const Q: Question[] = [
    { id: 'q1', type: 'textarea', label: 'Q1', required: true, sortOrder: 1, config: {} },
    { id: 'q2', type: 'short-text', label: 'Q2', required: false, sortOrder: 2, config: {} },
  ];

  describe('<AssessmentForm>', () => {
    it('renders the question prompts via QuestionRenderer', () => {
      render(
        <AssessmentForm
          questions={Q}
          initialAnswers={{}}
          errors={{}}
          actionPath="/intern/personal-goals"
          submitLabel="Submit"
          modalTitle="Submit?"
          modalBody="Once submitted, you can't edit."
          readOnly={false}
        />,
      );
      expect(screen.getByText('Q1')).toBeInTheDocument();
      expect(screen.getByText('Q2')).toBeInTheDocument();
    });

    it('respects readOnly by disabling the submit button', () => {
      render(
        <AssessmentForm
          questions={Q}
          initialAnswers={{ q1: 'hi' }}
          errors={{}}
          actionPath="/intern/personal-goals"
          submitLabel="Submit"
          modalTitle="Submit?"
          modalBody=""
          readOnly={true}
        />,
      );
      // In read-only mode the submit button is not rendered.
      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
    });

    it('renders inline errors from props.errors', () => {
      render(
        <AssessmentForm
          questions={Q}
          initialAnswers={{}}
          errors={{ q1: 'Required' }}
          actionPath="/intern/personal-goals"
          submitLabel="Submit"
          modalTitle=""
          modalBody=""
          readOnly={false}
        />,
      );
      expect(screen.getByText(/Required/)).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Implement `AssessmentForm.tsx`**

  ```tsx
  import { useState } from 'react';
  import { Form } from 'react-router';
  import { QuestionRenderer, type Question, type SerializedAnswers } from '~/lib/question-engine';
  import { SubmitConfirmModal } from './SubmitConfirmModal';

  export interface AssessmentFormProps {
    questions: Question[];
    initialAnswers: SerializedAnswers;
    errors: Record<string, string>;
    actionPath: string;
    submitLabel: string;
    modalTitle: string;
    modalBody: string;
    readOnly: boolean;
    setLevelError?: string | null; // '__minRequired' surfaces here
    sectionBoundaries?: { afterIndex: number; label: string; subLabel?: string }[];
  }

  export function AssessmentForm(props: AssessmentFormProps) {
    const [answers, setAnswers] = useState<SerializedAnswers>(props.initialAnswers);
    const [modalOpen, setModalOpen] = useState(false);

    const handleChange = (questionId: string, value: unknown) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    if (props.readOnly) {
      return (
        <div className="rubric assessment-questions">
          <QuestionRenderer
            questions={props.questions}
            answers={answers}
            errors={{}}
            onChange={() => {}}
            readOnly
            sectionBoundaries={props.sectionBoundaries}
          />
        </div>
      );
    }

    return (
      <Form method="post" action={props.actionPath}>
        <div className="rubric assessment-questions">
          {props.setLevelError && (
            <div role="alert" className="form-banner form-banner--danger">
              {props.setLevelError}
            </div>
          )}
          <QuestionRenderer
            questions={props.questions}
            answers={answers}
            errors={props.errors}
            onChange={handleChange}
            sectionBoundaries={props.sectionBoundaries}
          />
        </div>

        {/* Hidden input mirroring serialized answers — the action reads this. */}
        <input type="hidden" name="answers" value={JSON.stringify(answers)} />

        <div className="action-bar">
          <div className="action-bar__inner">
            <div className="action-bar__buttons">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setModalOpen(true)}
              >
                {props.submitLabel}
              </button>
            </div>
          </div>
        </div>

        <SubmitConfirmModal
          open={modalOpen}
          title={props.modalTitle}
          body={props.modalBody}
          confirmLabel="Submit"
          onClose={() => setModalOpen(false)}
          onConfirm={() => {
            // Confirm closes modal; the user explicitly clicks the now-visible
            // native submit. To avoid a two-step UX, we instead submit
            // programmatically here.
            const form = document.querySelector(`form[action="${props.actionPath}"]`) as HTMLFormElement | null;
            form?.requestSubmit();
          }}
        />
      </Form>
    );
  }
  ```

- [ ] **Step 3: Run tests + commit**

  ```bash
  npm test -- AssessmentForm
  git add app/components/forms/AssessmentForm.tsx tests/components/AssessmentForm.test.tsx
  git commit -m "Add AssessmentForm shared component + tests"
  ```

### Task 10: Build the `<CompetencyAssessmentForm>` component — TDD

**Files:**
- Create: `app/components/forms/CompetencyAssessmentForm.tsx`
- Create: `tests/components/CompetencyAssessmentForm.test.tsx`

Wraps `<AssessmentForm>` but accepts a phase dropdown, an identity header with intern/cohort/phase metadata strip, and stitched section boundaries (3-tier).

- [ ] **Step 1: Write the test**

  Test renders 3 sections with their headers given 3 tiers of questions and 2 boundaries; confirms the phase select is required and that section header `label` + `subLabel` HTML-escape (sub-project 1 prototype defence — `appendCompetencySectionHeader` escapes both args).

- [ ] **Step 2: Implement the component**

  Props:

  ```ts
  interface Props {
    internId: string;
    phases: { id: string; label: string }[];
    questions: Question[];
    sectionBoundaries: SectionBoundary[];
    initialAnswers: SerializedAnswers;
    initialPhase: string | null;
    errors: Record<string, string>;
    setLevelError?: string | null;
    actionPath: string;
    submitLabel: string;
    readOnly: boolean;
  }
  ```

  Renders: meta strip (intern name, cohort, employer, role, start, end), phase dropdown (disabled with helper if `phases.length === 0` — mirrors prototype lines 264–273 of `competency-new.html`), then a `<QuestionRenderer>` with `sectionBoundaries`. Submit button opens a confirm modal; on confirm, programmatically submits to `actionPath` with `phase` and `answers` as hidden inputs.

- [ ] **Step 3: Commit**

  ```bash
  git add app/components/forms/CompetencyAssessmentForm.tsx tests/components/CompetencyAssessmentForm.test.tsx
  git commit -m "Add CompetencyAssessmentForm component with stitched section headers + tests"
  ```

---

## Phase C: Intern (public) routes

### Task 11: Register all sub-project 4 routes in `app/routes.ts`

**Files:**
- Modify: `app/routes.ts`

- [ ] **Step 1: Replace `app/routes.ts` with the expanded table**

  ```ts
  import { type RouteConfig, layout, index, route } from '@react-router/dev/routes';

  export default [
    layout('routes/_public.tsx', [
      index('routes/_public._index.tsx'),
      route('login', 'routes/_public.login.tsx'),
      route('auth/reset-password-request', 'routes/_public.auth.reset-password-request.tsx'),
      route('auth/reset-password', 'routes/_public.auth.reset-password.tsx'),
      route('auth/callback', 'routes/_public.auth.callback.tsx'),
      route('sign-out', 'routes/sign-out.ts'),

      // Intern self-assessment flow (sub-project 4)
      layout('routes/_public.intern.tsx', [
        route('intern/assessments', 'routes/_public.intern.assessments.tsx'),
        route('intern/personal-goals', 'routes/_public.intern.personal-goals.tsx'),
        route('intern/midpoint-reflection', 'routes/_public.intern.midpoint-reflection.tsx'),
        route('intern/participant-feedback', 'routes/_public.intern.participant-feedback.tsx'),
        route('intern/confirmation', 'routes/_public.intern.confirmation.tsx'),
        route('intern/reset-identity', 'routes/_public.intern.reset-identity.ts'),
      ]),
    ]),

    layout('routes/admin.tsx', [
      route('admin', 'routes/admin._index.tsx'),

      // Admin assessments hub (sub-project 4)
      route('admin/assessments', 'routes/admin.assessments.tsx'),
      route('admin/assessments/competency/new', 'routes/admin.assessments.competency.new.tsx'),
      route('admin/assessments/competency/edit/:id', 'routes/admin.assessments.competency.edit.$id.tsx'),
      route('admin/assessments/competency/:id', 'routes/admin.assessments.competency.$id.tsx'),
      route('admin/assessments/exit-employer-survey', 'routes/admin.assessments.exit-employer-survey.tsx'),
      route('admin/self-assessment-results', 'routes/admin.self-assessment-results.tsx'),
      route('admin/self-assessment-detail', 'routes/admin.self-assessment-detail.tsx'),
    ]),

    layout('routes/employer.tsx', [
      route('employer', 'routes/employer._index.tsx'),
    ]),
  ] satisfies RouteConfig;
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes.ts
  git commit -m "Register sub-project 4 routes (intern flow + admin assessments hub)"
  ```

### Task 12: Build the intern shell layout

**Files:**
- Create: `app/routes/_public.intern.tsx`

- [ ] **Step 1: Create the file**

  ```tsx
  import { Outlet, useLoaderData } from 'react-router';
  import type { Route } from './+types/_public.intern';
  import { getCurrentInternIdentity } from '~/lib/intern-identity.server';

  export async function loader({ request }: Route.LoaderArgs) {
    const identity = await getCurrentInternIdentity(request);
    return { identity };
  }

  export default function InternLayout() {
    return (
      <div className="public-shell">
        {/* Branded top nav (matches Prototypes/PROTOTYPE/intern-assessments.html lines 17-26) */}
        <header className="nav">
          <div className="nav__inner">
            <a href="/" className="wordmark" aria-label="IMPACT — Expand Your Opportunities">
              <strong>IMPACT</strong>
            </a>
            <nav className="nav__links">
              <a href="/intern/assessments" className="back-link">My Assessments</a>
            </nav>
          </div>
        </header>
        <Outlet />
      </div>
    );
  }
  ```

  > **Style note:** the prototype navbar uses `<img src="logo.png">`. The new app uses a typographic wordmark per the CLAUDE.md "Don't place the logo PNG on the light canvas" rule for non-dark-surface placements. The dark-surface nav reuses the same image asset as on the rest of the prototype-derived screens.

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/_public.intern.tsx
  git commit -m "Add intern shell layout (public, identity-aware)"
  ```

### Task 13: Build the intern reset-identity action

**Files:**
- Create: `app/routes/_public.intern.reset-identity.ts`

- [ ] **Step 1: Create the action**

  ```ts
  import { redirect } from 'react-router';
  import type { Route } from './+types/_public.intern.reset-identity';
  import { serializeInternIdentityCookie } from '~/lib/intern-identity.server';
  import { env } from '~/lib/env.server';

  export async function action(_: Route.ActionArgs) {
    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      serializeInternIdentityCookie('', { isProd: env.APP_URL.startsWith('https://'), clear: true }),
    );
    throw redirect('/intern/assessments', { headers });
  }

  export async function loader() {
    throw redirect('/intern/assessments');
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/_public.intern.reset-identity.ts
  git commit -m "Add intern reset-identity action (clears cookie)"
  ```

### Task 14: Build the intern chooser/identity-gate route

**Files:**
- Create: `app/routes/_public.intern.assessments.tsx`

- [ ] **Step 1: Implement the loader**

  Loads:
  - `employers` (id + name) for the employer dropdown
  - `cohorts` (id + name + employerId) for the cascading dropdown
  - The current identity cookie (if any) via `getCurrentInternIdentity()`
  - For a confirmed identity, the completion status for each of the 3 one-shot types via `getOneShotSubmission(internId, type)` for `personal-goals`, `midpoint-reflection`, `participant-feedback`

- [ ] **Step 2: Implement the action**

  Reads `formData.intent`:

  - `intent=confirm`: validates required fields (`firstInitial` matches `^[A-Za-z]$`, last present, employerId, cohortId), calls `lookupInternByIdentity({ firstInitial, lastName, cohortId })`. If no match, returns `{ error: 'No matching intern record. Check your details or contact your program administrator.' }`. If matched, signs the cookie and redirects to `/intern/assessments` with `Set-Cookie` header.
  - `intent=switch`: clears the cookie and redirects to `/intern/assessments`.

  The action returns errors via `useActionData()`; toast/banner UI surfaces them at the top of the form.

- [ ] **Step 3: Implement the component**

  Two render branches keyed off the loader's `identity`:

  - **No identity:** render the identity-gate form (4 fields per prototype lines 47–85). The cohort `<select>` is `disabled` until an employer is picked — implement as a controlled component on the client: a small `useState` for employerId, filter the cohort list by `employerId` client-side. The form posts with `intent=confirm`.
  - **Identity confirmed:** render `<IdentityConfirmedChip>` + a `Switch` button (posts to `/intern/reset-identity`), then a 3-card grid (`assessment-card` per prototype lines 116–174) showing the 3 self-assessments. For each, if a submission exists, replace the CTA with a "Submitted on {date} · View →" pill linking to `/admin/self-assessment-detail?type=...&internId=...` — but for the intern-facing chooser the pill is a non-clickable display (matches prototype).

- [ ] **Step 4: Commit**

  ```bash
  git add app/routes/_public.intern.assessments.tsx
  git commit -m "Add intern chooser + identity gate route"
  ```

### Task 15: Build the Personal Goals form route

**Files:**
- Create: `app/routes/_public.intern.personal-goals.tsx`

- [ ] **Step 1: Loader**

  - `getCurrentInternIdentity(request)` — if null, `throw redirect('/intern/assessments')`
  - `getQuestionSet('personal-goals')` — if null, `throw new Response('Missing question set', { status: 500 })`
  - `getOneShotSubmission(identity.internId, 'personal-goals')` — if exists, `throw redirect('/intern/confirmation?type=personal-goals')` (already submitted)
  - Return `{ identity, set, intern }` (intern fetched via existing `lookupInternByIdentity` for display name)

- [ ] **Step 2: Action**

  ```ts
  export async function action({ request }: Route.ActionArgs) {
    const identity = await getCurrentInternIdentity(request);
    if (!identity) return { error: 'Please confirm your identity first.', redirect: '/intern/assessments' };

    const formData = await request.formData();
    const answersRaw = String(formData.get('answers') ?? '{}');
    let answers: SerializedAnswers;
    try { answers = JSON.parse(answersRaw); } catch { return { error: 'Invalid submission' }; }

    const set = await getQuestionSet('personal-goals');
    if (!set) return { error: 'Question set unavailable' };

    const v = validateAnswers(set.questions, answers, { minRequired: set.minRequired });
    if (!v.ok) return { errors: v.errors, answers };

    try {
      await insertAnonymousSubmission({
        internId: identity.internId,
        type: 'personal-goals',
        answers,
      });
    } catch (err) {
      if (err instanceof AssessmentAlreadySubmittedError) {
        throw redirect('/intern/confirmation?type=personal-goals&already=1');
      }
      throw err;
    }
    throw redirect('/intern/confirmation?type=personal-goals');
  }
  ```

- [ ] **Step 3: Component**

  Renders the page-head, `<IdentityConfirmedChip>` ("SUBMITTING AS"), and `<AssessmentForm>` with:
  - `actionPath="/intern/personal-goals"`
  - `submitLabel="Submit Personal Goals"`
  - `modalTitle="Submit your Personal Goals?"`
  - `modalBody="Your responses will be locked once submitted. You won't be able to edit them afterward."`

  Inline errors from `actionData?.errors` and the `__minRequired` set-level banner via `setLevelError={errors?.__minRequired ?? null}`.

- [ ] **Step 4: Commit**

  ```bash
  git add app/routes/_public.intern.personal-goals.tsx
  git commit -m "Add Personal Goals form route with anonymous service-role insert"
  ```

### Task 16: Build the Midpoint Reflection form route

**Files:**
- Create: `app/routes/_public.intern.midpoint-reflection.tsx`

- [ ] **Step 1: Implement**

  Same skeleton as Task 15 but `setId = 'midpoint-reflection'`, `type = 'midpoint-reflection'`, submit label "Submit Midpoint Reflection", modal title "Submit your Midpoint Reflection?". Identity gate, loader, action, and one-shot enforcement identical.

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/_public.intern.midpoint-reflection.tsx
  git commit -m "Add Midpoint Reflection form route"
  ```

### Task 17: Build the Participant Feedback form route

**Files:**
- Create: `app/routes/_public.intern.participant-feedback.tsx`

- [ ] **Step 1: Implement**

  Same skeleton as Task 15 but `setId = 'participant-feedback'`, `type = 'participant-feedback'`. Submit label "Submit Participant Feedback", modal title "Submit your Participant Feedback?". This is the mixed-format form (radio + likert + textarea + radio). `<AssessmentForm>` handles all 6 question types via the engine's `<QuestionRenderer>`.

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/_public.intern.participant-feedback.tsx
  git commit -m "Add Participant Feedback form route"
  ```

### Task 18: Build the intern confirmation route

**Files:**
- Create: `app/routes/_public.intern.confirmation.tsx`

- [ ] **Step 1: Loader**

  - Read `?type=` param. Allowed types: `personal-goals`, `midpoint-reflection`, `participant-feedback`, `exit-employer-survey`. Reject others with 404.
  - Read `?already=1` param (signals the user hit submit on an already-submitted one-shot)
  - `getCurrentInternIdentity(request)` (may be null — e.g. exit-employer-survey path)
  - If identity exists, fetch the matching submission via `getOneShotSubmission(identity.internId, type)` for the submitted-at timestamp.

- [ ] **Step 2: Component**

  Reproduces `assessment-confirmation.html` per type-keyed `copy` map (micro/title/body — copied verbatim from prototype script). Renders receipt: first initial, last name, employer name, cohort name, submitted date. The "already submitted" path replaces the title with "You've already submitted this assessment." with a softer body.

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/_public.intern.confirmation.tsx
  git commit -m "Add intern confirmation route (type-parameterized)"
  ```

---

## Phase D: Admin assessment routes

### Task 19: Build the admin Assessments chooser hub + intern picker

**Files:**
- Create: `app/routes/admin.assessments.tsx`

- [ ] **Step 1: Loader**

  Loads `interns` (id, firstInitial, lastName, cohortId, startDate) joined with cohorts (cohort name) for the picker rows. RLS Pattern 1 (admin_all) means the regular `db` client returns all rows; loader runs under the admin's JWT.

- [ ] **Step 2: Component**

  Mirrors `assessments.html` lines 57–104: two cards (Competency Assessment, Exit Employer Survey) each with a "Begin …" button that opens the intern picker modal. The picker modal is a controlled component using `useState`:

  - `pickerOpen: { target: 'competency' | 'exit-employer-survey' } | null`
  - `searchTerm: string` for live filter on last name + cohort name

  Clicking a picker row navigates via `useNavigate()` to:
  - `competency`: `/admin/assessments/competency/new?internId=<id>`
  - `exit-employer-survey`: `/admin/assessments/exit-employer-survey?internId=<id>`

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/admin.assessments.tsx
  git commit -m "Add admin Assessments hub with intern picker modal"
  ```

### Task 20: Build the admin Exit Employer Survey route (admin path)

**Files:**
- Create: `app/routes/admin.assessments.exit-employer-survey.tsx`

This is the admin-completed path. Sub-project 5 will add an employer-self-service wrapper — design the form body to live in `<AssessmentForm>` so sub-project 5 only writes a new route with a different action target.

- [ ] **Step 1: Loader**

  - Read `?internId=` (required). If missing or unknown, `throw new Response('Intern required', { status: 400 })`.
  - Load intern (with cohort, employer, role) for the meta strip.
  - `getQuestionSet('exit-employer-survey')`.
  - `getOneShotSubmission(internId, 'exit-employer-survey')` for restore-on-edit.

- [ ] **Step 2: Action**

  - Auth: `getAuthContext(request)`; must be `role === 'admin'` else 403.
  - Parse `answers` JSON from form data.
  - `validateAnswers(set.questions, answers, { minRequired: set.minRequired })`. `ees-outcome` and `ees-performance` are `required: true` from the seed.
  - `insertOrUpdateSubmissionAsAdmin({ internId, type: 'exit-employer-survey', answers, submittedBy: auth.userId })`.
  - Toast via flash (`session.flash('toast', ...)` if sub-project 1 wired flash, else action returns `{ saved: true }` and component renders an inline toast on mount). Redirect to `/admin/interns/<internId>` (sub-project 2 builds this) or back to itself with success flag.

- [ ] **Step 3: Component**

  Page head + meta strip (employer, participant, position, start, end) + `<AssessmentForm>` with `actionPath="/admin/assessments/exit-employer-survey?internId=<id>"` + restore from `existingAnswers`.

- [ ] **Step 4: Commit**

  ```bash
  git add app/routes/admin.assessments.exit-employer-survey.tsx
  git commit -m "Add admin Exit Employer Survey route (admin-completed, editable)"
  ```

### Task 21: Build the admin Competency new route

**Files:**
- Create: `app/routes/admin.assessments.competency.new.tsx`

- [ ] **Step 1: Loader**

  - `?internId=` required (400 if missing).
  - Auth: must be admin.
  - Load intern + cohort + employer + role.
  - `stitchedCompetencyQuestions(internId)` → `{ questions, sectionBoundaries }`.
  - Load cohort's phases via `cohort_phases` join with `phases` (sorted by `phases.sort_order`). Return them as `[{ id, label }]`. If empty, the form disables the submit button per prototype (lines 264–273).
  - Return `{ intern, cohort, employer, role, phases, questions, sectionBoundaries }`.

- [ ] **Step 2: Action**

  - Auth: admin.
  - Parse `phase` (required), `answers` (JSON).
  - Validate: `phase` must be one of the cohort's phases (defence against tampered submit). Validate answers via engine.
  - `insertOrUpdateSubmissionAsAdmin({ internId, type: 'competency', phase, answers, submittedBy })` — competency always inserts a new row.
  - Redirect to `/admin/assessments/competency/<newId>`.

- [ ] **Step 3: Component**

  Page head + `<CompetencyAssessmentForm>` with `initialPhase=null`, `initialAnswers={}`.

- [ ] **Step 4: Commit**

  ```bash
  git add app/routes/admin.assessments.competency.new.tsx
  git commit -m "Add admin Competency new assessment route"
  ```

### Task 22: Build the admin Competency edit route

**Files:**
- Create: `app/routes/admin.assessments.competency.edit.$id.tsx`

- [ ] **Step 1: Loader**

  - Route param `:id` is the `assessment_submissions.id`.
  - Auth: admin.
  - Fetch submission; if not found or `type !== 'competency'`, 404.
  - Fetch intern via `submission.internId`; load cohort/employer/role/phases like Task 21.
  - `stitchedCompetencyQuestions(submission.internId)` for questions + boundaries.
  - Return `{ submission, intern, cohort, employer, role, phases, questions, sectionBoundaries }`.

- [ ] **Step 2: Action**

  - Auth: admin.
  - Parse phase + answers.
  - Validate phase against cohort phases + answers via engine.
  - UPDATE the existing row: `db.update(assessmentSubmissions).set({ phase, answers, submittedBy }).where(eq(id, submission.id))`.
  - Redirect to `/admin/assessments/competency/<id>`.

- [ ] **Step 3: Component**

  Same as Task 21 but `initialPhase={submission.phase}`, `initialAnswers={submission.answers}`.

- [ ] **Step 4: Commit**

  ```bash
  git add app/routes/admin.assessments.competency.edit.$id.tsx
  git commit -m "Add admin Competency edit route"
  ```

### Task 23: Build the admin Competency detail (read-only) route

**Files:**
- Create: `app/routes/admin.assessments.competency.$id.tsx`

- [ ] **Step 1: Loader**

  Same as Task 22 but no action.

- [ ] **Step 2: Component**

  Page head + meta strip (intern, cohort, phase, date) + `<CompetencyAssessmentForm readOnly={true}>`. Actions: an "Edit" link to `/admin/assessments/competency/edit/<id>` and a soft "Delete" with confirm modal (uses `dbService` or admin client with `update(deletedAt=now())`).

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/admin.assessments.competency.$id.tsx
  git commit -m "Add admin Competency detail (read-only) route"
  ```

### Task 24: Build the admin self-assessment-results list route

**Files:**
- Create: `app/routes/admin.self-assessment-results.tsx`

- [ ] **Step 1: Loader**

  Auth: admin. Query all `assessment_submissions` rows where `type IN ('personal-goals','midpoint-reflection','participant-feedback')` AND `deleted_at IS NULL`, joined to interns + cohorts + employers. Return ordered by `submitted_at DESC`.

- [ ] **Step 2: Component**

  List table per prototype `self-assessment-results.html` shape: columns Last Name, Employer, Cohort, Type, Submitted. Rows are `<Link>` to `/admin/self-assessment-detail?type={type}&internId={internId}`. Live filter input on top via a small client-side `useState` (no server roundtrip — small list).

  Note: this page is intentionally NOT in the admin top nav (matches prototype). It's reachable by URL only.

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/admin.self-assessment-results.tsx
  git commit -m "Add admin self-assessment-results list (URL-only, not in nav)"
  ```

### Task 25: Build the admin self-assessment-detail (read-only viewer) route

**Files:**
- Create: `app/routes/admin.self-assessment-detail.tsx`

- [ ] **Step 1: Loader**

  - Read `?type=` (one of `personal-goals|midpoint-reflection|participant-feedback`, 400 otherwise) and `?internId=` (required).
  - Auth: admin.
  - `getOneShotSubmission(internId, type)` — if null, return `{ found: false, intern, set }` and the component renders the empty-state card (matches prototype lines 94–102).
  - `getQuestionSet(type)`, intern + cohort + employer for the meta strip.
  - Return `{ found: true, submission, intern, cohort, employer, set }`.

- [ ] **Step 2: Component**

  Page head with type-aware title (`{LastName} — PERSONAL GOALS` etc.), meta strip (first initial, last name, employer, cohort, submitted, locked badge), and `<AssessmentForm readOnly={true} initialAnswers={submission.answers} questions={set.questions}>`. Close button returns to `/admin/interns/<internId>` if internId is present (it always is) else to `/admin/self-assessment-results`.

  Optional: a "Delete Submission" danger-modal action — soft-delete sets `deleted_at` and frees the intern to re-submit. (Matches prototype lines 130–144.)

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/admin.self-assessment-detail.tsx
  git commit -m "Add admin self-assessment read-only viewer"
  ```

---

## Phase E: E2E coverage

### Task 26: Write the intern self-submit Playwright e2e

**Files:**
- Create: `tests/e2e/intern-self-submit.spec.ts`

- [ ] **Step 1: Test cases**

  ```ts
  import { test, expect } from '@playwright/test';
  import postgres from 'postgres';
  import 'dotenv/config';

  const TEST_INTERN_FI = 'T';
  const TEST_INTERN_LN = 'Test1';
  const TEST_COHORT_NAME = 'MA — 2026';
  const TEST_EMPLOYER_NAME = 'Eskenazi Health';
  const TEST_INTERN_ID = '44444444-4444-4444-4444-444444444404';

  test.beforeEach(async () => {
    const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
    try {
      await sql`DELETE FROM public.assessment_submissions WHERE intern_id = ${TEST_INTERN_ID}`;
    } finally {
      await sql.end();
    }
  });

  test('intern confirms identity → submits Personal Goals → confirmation', async ({ page }) => {
    await page.goto('/intern/assessments');
    await expect(page.getByRole('heading', { name: /CHOOSE YOUR ASSESSMENT/ })).toBeVisible();

    // Identity gate
    await page.getByLabel('First Initial').fill(TEST_INTERN_FI);
    await page.getByLabel('Last Name').fill(TEST_INTERN_LN);
    await page.getByLabel('Employer').selectOption({ label: TEST_EMPLOYER_NAME });
    await page.getByLabel('Cohort').selectOption({ label: TEST_COHORT_NAME });
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByText(/CONFIRMED AS/)).toBeVisible();

    // Open Personal Goals
    await page.getByRole('link', { name: /Begin Personal Goals/ }).click();
    await expect(page).toHaveURL('/intern/personal-goals');
    await expect(page.getByText(/SUBMITTING AS/)).toBeVisible();

    // Fill the 4 required-to-pass-minRequired questions
    await page.getByLabel('What skills do you want to build', { exact: false }).fill('Communication and follow-through.');
    await page.getByLabel('What are you hoping to gain', { exact: false }).fill('Confidence.');
    await page.getByLabel('What would success look like', { exact: false }).fill('Working independently by week 8.');
    await page.getByLabel('What is one area you want to challenge', { exact: false }).fill('Public speaking.');

    await page.getByRole('button', { name: /Submit Personal Goals/ }).click();
    await page.getByRole('button', { name: 'Submit' }).click(); // confirm modal

    await expect(page).toHaveURL(/\/intern\/confirmation\?type=personal-goals/);
    await expect(page.getByText(/Personal Goals submitted/i)).toBeVisible();
  });

  test('rejects unknown identity with friendly error', async ({ page }) => {
    await page.goto('/intern/assessments');
    await page.getByLabel('First Initial').fill('Z');
    await page.getByLabel('Last Name').fill('Nobody');
    await page.getByLabel('Employer').selectOption({ index: 1 });
    await page.getByLabel('Cohort').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText(/No matching intern record/)).toBeVisible();
  });

  test('one-shot resubmit redirects to "already submitted" page', async ({ page }) => {
    // ... seed an existing submission via SQL, then attempt to submit again
  });

  test('Switch identity clears cookie and returns to gate', async ({ page }) => {
    // Confirm identity, then click Switch, confirm gate is shown again
  });
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add tests/e2e/intern-self-submit.spec.ts
  git commit -m "Add intern self-submit Playwright e2e"
  ```

### Task 27: Write the admin competency submit Playwright e2e

**Files:**
- Create: `tests/e2e/admin-competency.spec.ts`

- [ ] **Step 1: Test cases**

  - Sign in as admin (reuse `ADMIN_TEST_EMAIL`/`ADMIN_TEST_PASSWORD` from sub-project 1's `.env.test`).
  - Navigate to `/admin/assessments`, click "Begin Competency", pick the Eskenazi intern from the picker.
  - Lands on `/admin/assessments/competency/new?internId=...`.
  - Select a phase, rate all 7 core domains + 4 Eskenazi role-specific (since the seed has the Eskenazi cohort overlay) as "Ready" with empty notes.
  - Submit → confirm modal → confirm.
  - Asserts URL is `/admin/assessments/competency/<id>` and the readonly view shows all ratings.
  - Click "Edit", change one rating to "Developing", save, confirm the change persists.

- [ ] **Step 2: Commit**

  ```bash
  git add tests/e2e/admin-competency.spec.ts
  git commit -m "Add admin competency submit + edit Playwright e2e"
  ```

### Task 28: Write the admin Exit Employer Survey Playwright e2e

**Files:**
- Create: `tests/e2e/admin-exit-employer-survey.spec.ts`

- [ ] **Step 1: Test cases**

  - Sign in as admin.
  - Navigate to `/admin/assessments`, click "Begin Exit Survey", pick an intern.
  - Lands on `/admin/assessments/exit-employer-survey?internId=...`.
  - Fill required radio (`ees-outcome=hired`) + required likert (`ees-performance=4`) + check a few work-readiness boxes.
  - Save → confirm modal → confirm.
  - Assert success toast/banner, then reload the page — the answers should be restored (the row was upserted).
  - Change a radio, save again, reload — the new value is restored (proves update, not duplicate insert).

- [ ] **Step 2: Commit**

  ```bash
  git add tests/e2e/admin-exit-employer-survey.spec.ts
  git commit -m "Add admin Exit Employer Survey Playwright e2e"
  ```

### Task 29: Run the full test suite

**Files:**
- N/A — verification only

- [ ] **Step 1: Run everything**

  ```bash
  npm run lint
  npm run typecheck
  npm test            # unit + component
  npm run test:rls    # includes anon-submission.test.ts
  npm run test:e2e    # includes the 3 new specs
  ```

  All five commands should pass.

---

## Phase F: Verification + handoff

### Task 30: Manual smoke-test runbook

**Files:**
- N/A — verification only

- [ ] **Step 1: Intern flow walk-through**

  1. Open `/intern/assessments` in an incognito window. Identity gate is shown.
  2. Fill the 4 fields with a known seed intern (e.g. `A`, `Williams`, Eskenazi Health, MA — 2026). Click Confirm.
  3. Card grid appears with 3 cards, all in "Begin …" state.
  4. Click Begin Personal Goals → form opens with "SUBMITTING AS" chip.
  5. Refresh the page — the identity persists (cookie). Identity chip still shows.
  6. Submit answers → confirmation page shows.
  7. Return to `/intern/assessments`. The Personal Goals card now shows "Submitted on …" pill.
  8. Click Switch → cookie cleared, gate shown again.
  9. Try to submit a one-shot for the same intern twice — second attempt redirects to "already submitted" page.

- [ ] **Step 2: Admin flow walk-through**

  1. Sign in as admin at `/login`. Navigate to `/admin/assessments`.
  2. Click "Begin Competency" → picker opens → search for "Williams" → click row.
  3. Lands on `/admin/assessments/competency/new?internId=...`.
  4. Phase dropdown shows the cohort's phases. Pick "Phase 1".
  5. Rate all 7 core + 4 Eskenazi rubric rows. Submit. See detail page.
  6. Click "Edit", change a rating, save. See the change reflected on detail.
  7. Return to `/admin/assessments`. Click "Begin Exit Survey", pick same intern.
  8. Fill required fields. Save. Reload — answers restored.

- [ ] **Step 3: Self-assessment viewer walk-through**

  1. Navigate to `/admin/self-assessment-results` (no nav link — type URL).
  2. List shows the Personal Goals submission made in step 6 above.
  3. Click row → opens `/admin/self-assessment-detail?type=personal-goals&internId=...`.
  4. Read-only form with all answers populated. All inputs disabled.

### Task 31: Update CLAUDE.md with sub-project 4 conventions

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Append a section to the "Production app" portion of `CLAUDE.md`**

  Document:
  - Identity cookie: `impact_intern_identity`, HMAC-signed via `SESSION_SECRET`, parsed via `getCurrentInternIdentity()` which revalidates against the live roster on every read.
  - Anonymous submission path: actions revalidate identity → `dbService` (service-role client) → `insertAnonymousSubmission()`. Never call `dbService` outside this narrow path.
  - One-shot enforcement: try/catch on `AssessmentAlreadySubmittedError` in action handlers; redirect to `/intern/confirmation?type=...&already=1`.
  - Form component reuse contract for sub-project 5: `<AssessmentForm>` and `<CompetencyAssessmentForm>` accept `actionPath` so employer-self-service routes wrap them with a different action.

- [ ] **Step 2: Commit**

  ```bash
  git add CLAUDE.md
  git commit -m "Document sub-project 4 conventions in CLAUDE.md"
  ```

---

## Self-review checklist (for the executor)

After Task 31 verify:

- [ ] Spec section 6 covered: every form goes through the question engine, including competency stitching via `<CompetencyAssessmentForm>` + section boundaries.
- [ ] Spec section 5.3 covered: anonymous submissions revalidate identity in the action, then `dbService` (service-role) bypasses RLS for the insert. One-shot uniqueness enforced by the partial index + try/catch translation.
- [ ] Spec section 4.4 covered: intern routes live under `/intern/*`, identity gate at `/intern/assessments`, confirmation parameterized by `?type=`.
- [ ] URL contracts match prototype: `?internId=` on admin forms, `?type=&internId=` on self-assessment detail, `?type=` on confirmation, `:id` route param on competency edit/detail.
- [ ] All 5 form types have their own dedicated tasks (Tasks 15, 16, 17, 20, 21–23) — no batching.
- [ ] Anonymous insert path detailed in Tasks 1–6 with service-role flow + RLS bypass + identity revalidation.
- [ ] Three e2e tests: Tasks 26, 27, 28 cover intern self-submit, admin competency, admin exit-employer-survey.
- [ ] No placeholders. Every task spells out files, code shape, and commit message.
- [ ] Sub-project 3 assumed contracts stated at the top; reconciliation strategy noted.
- [ ] Sub-project 1 dependencies verified: identity helper, db.server, schema partial unique index, brand tokens, RLS Pattern 1 admin policies.

## Risks flagged

1. **Service-role bypass via `DATABASE_POOL_URL`.** This plan assumes sub-project 1's pooled connection uses a role that bypasses RLS (Supabase's default `postgres` role does). If sub-project 1 changes to a non-bypass role for security hardening, the executor must add a separate `DATABASE_SERVICE_URL` env var and route `db.service.server.ts` through it. The Task 6 RLS test catches this regression.
2. **Engine API drift from sub-project 3.** The contracts at the top of this plan are best-effort; a thin adapter file should absorb any signature mismatch without form-route rewrites.
3. **Cookie + middleware interaction with React Router v7 SSR.** RR v7 framework mode does not have built-in cookie sessions — we sign manually. The `getCurrentInternIdentity()` revalidation hits the DB on every loader call; for a high-traffic public route this is the right correctness trade-off but may need caching in sub-project 6 if it shows up in perf metrics.
4. **`<AssessmentForm>` programmatic submit pattern.** Using `form.requestSubmit()` from within a modal's `onConfirm` requires React to have flushed the modal close — verify with the e2e specs. If flaky, switch to a controlled "submitting" state that mounts a `<button type="submit">` only after confirm.
5. **One-shot race with the partial unique index.** The pre-insert check + try/catch on PG `23505` covers concurrent submissions; the index is the source of truth. Tested in Task 3 step 1.
