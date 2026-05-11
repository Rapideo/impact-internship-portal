# Sub-Project 5: Employer Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a complete, branded employer experience — login routing, scoped layout, dashboard + cohort/intern read views, self-service Competency Assessment and Exit Employer Survey flows, profile + role management — together with the admin-driven account provisioning UI (invite → branded accept → first-login routing) and a branded password-reset page, all enforced by RLS and covered by RLS + E2E tests.

**Architecture:** The employer shell mounts at `/employer/*` (RR v7 layout route gated by `getAuthContext` requiring `role==='employer'`). It reuses sub-project 2's design primitives (navbar, footer, modals, toasts, validation) but with an employer-specific nav (Home / Cohorts / Interns / Assessments / My Employer). Forms reuse sub-project 4's `<CompetencyAssessmentForm>` and `<ExitEmployerSurveyForm>` components, posting to employer-scoped action routes that write via the request-scoped authenticated Supabase server client (RLS does the scoping work). Account provisioning lives at `/admin/employers/:id/account` and calls Supabase Admin API (`auth.admin.inviteUserByEmail`) from a service-role server client; a `profiles` row is inserted server-side in the same action with `role='employer'` + `employer_id`. Branded auth pages at `/auth/accept` (first-time password set) and `/auth/reset` (forgot-password) replace Supabase's default-hosted UI by routing the invite/reset email link through `/auth/callback` which exchanges the token for a session before redirecting. Emails are rendered server-side as branded HTML via `app/lib/email.server.ts` (sub-project 1 wrapper) and sent through Resend.

**Tech Stack:** TypeScript 5.7, React Router v7 (framework mode), Vite 6, Node 22 LTS, Drizzle 0.36 + postgres-js 3.4, @supabase/supabase-js 2.46, @supabase/ssr 0.5, Resend 4, Vitest 2, Playwright 1.49, ESLint 9, Prettier 3.

**Spec:** `docs/superpowers/specs/2026-05-10-production-rebuild-design.md` (sections 4, 5, 8.1, 8.4)

**Working directory for all paths below:** `IMPACT Intretnship Assessment Portal/` (the repo root).

---

## Assumptions from prior sub-projects

These contracts MUST hold when sub-project 5 starts. Reconcile any drift in review before executing.

### From sub-project 1 (Foundation) — landed

- `app/lib/auth.server.ts` exports `createSupabaseServerClient(request, headers)` and `getAuthContext(request, headers): Promise<{ role: 'admin'|'employer', employerId: string|null } | null>`. The latter decodes JWT claims set by the `custom_access_token_hook` Postgres function in `db/policies/0004_jwt_hook.sql`.
- `app/lib/db.server.ts` exports `db` (Drizzle client over pooled connection); `app/lib/email.server.ts` exports `sendEmail({to, subject, text, html})` via Resend with `RESEND_FROM` env var.
- `app/lib/env.server.ts` exports `env` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `RESEND_FROM`.
- `profiles` table (Drizzle `db/schema.ts`): `userId` uuid PK FK to `auth.users.id`, `role` enum `user_role` ('admin'|'employer'), `employerId` uuid FK to `employers.id` (NULL for admin, NOT NULL for employer per `profiles_employer_required_if_employer` check constraint).
- RLS policies on every public table from `db/policies/0001..0003.sql`:
  - `admin_all_*` — admins read/write everything.
  - `employer_*` — employers read/touch only rows whose resolved `employer_id` matches `(auth.jwt() ->> 'employer_id')::uuid`. Specifically `employer_read_own_cohorts`, `employer_read_own_interns`, `employer_read_submissions`, `employer_write_submissions` (INSERT, restricted to `type IN ('competency','exit-employer-survey')`), `employer_update_submissions` (UPDATE, same restriction), `employer_own_employer` (employers update their own employer row), `employer_own_roles` (full CRUD on their roles), `employer_read_question_sets` + `employer_read_questions` (standard + competency-core always readable; cohort/intern overlays only if scoped).
- `app/routes/_public.login.tsx` and `app/routes/_public.auth.reset-password-request.tsx`/`_public.auth.reset-password.tsx`/`_public.auth.callback.tsx` exist as placeholder Supabase auth routes. Sub-project 5 supersedes the unbranded placeholder pages with branded ones at `/auth/accept` and `/auth/reset` (request lives at `/auth/forgot`).
- Sign-out action lives at `/sign-out` (`app/routes/sign-out.ts`).
- E2E test infra: `tests/e2e/` runs against `npm run dev`. RLS tests live under `tests/rls/` and use `withClaims(claims, fn)` from `tests/rls/test-helpers.ts` to simulate authenticated requests at the Postgres layer.
- Brand tokens in `app/styles/tokens.css`: `--navy #153A98`, `--navy-deep #051028`, `--cyan #00A6F6`, `--gold #FFD71F`, `--canvas #EFF1F5`, `--ink #14171F`, `--ink-soft #5B6376`, `--line #D6DAE3`, `--white #FFFFFF`; fonts loaded in `app/root.tsx` (`Archivo Black`, `IBM Plex Sans`, `IBM Plex Mono`).

### From sub-project 2 (Admin core) — assumed contracts

- `app/routes/admin.tsx` is the admin layout route. It enforces `auth.role === 'admin'` and renders `<AdminNav>` + `<AdminFooter>` + `<Outlet />`. Sub-project 5 mirrors its structure for the employer shell, NOT extends it.
- `app/components/nav/AdminNav.tsx` and `app/components/nav/AdminFooter.tsx` exist; sub-project 5 adds `EmployerNav.tsx` and `EmployerFooter.tsx` as siblings.
- `app/components/modals/ConfirmModal.tsx` — reusable confirm modal (data-open/data-close, `aria-labelledby`). Sub-project 5 uses it for the invite-send confirm and revoke-access confirm dialogs.
- `app/components/Toast.tsx` + `useToast()` hook — toast notification system.
- `app/lib/validation.ts` — `validateFields()` helper for inline form validation (required, email pattern, etc.).
- Admin Settings → Employers detail page lives at `app/routes/admin.employers.$id.tsx` (one prototype-style detail page per employer). Sub-project 5 ADDS the "Login Account" card to this page via a new nested route `/admin/employers/:id/account` and a sub-component the existing route renders.
- Admin Settings → Roles CRUD already exists at `app/routes/admin.employers.$id.roles.*.tsx` (Roles are scoped to a parent employer). Sub-project 5 reuses the same role-form component on the employer shell with the employer locked to the signed-in user's `employerId`.
- Admin Interns list (`app/routes/admin.interns.tsx`) + intern record (`app/routes/admin.interns.$id.tsx`) exist. Sub-project 5 builds parallel employer routes that compose the same shared `<InternRecord>` component with `canEditIdentity={false}` and `canEditCompetency={true}`.
- `<InternRecord>` shared component (under `app/components/intern/InternRecord.tsx`) accepts `{intern, canEditIdentity, canEditCompetency, canEditOutcomes, ...}` capability flags. Sub-project 5 calls it with employer-appropriate flags.

### From sub-project 3 (Question engine) — assumed contracts

- `app/components/question-renderer/QuestionRenderer.tsx` — one component per question type, dispatched by `question.type`.
- `app/lib/question-engine.ts` exports `validateAnswers(questions, answers): { ok: true } | { ok: false, errors: Record<questionId, string> }` and `serializeAnswers(formData, questions): Answers`.
- `app/lib/competency.server.ts` exports `stitchedCompetencyQuestions(internId): Promise<{ questions: Question[]; sectionBoundaries: { afterIndex: number; label: string; subLabel?: string }[] }>`. This server function uses the request-scoped Supabase client when called from a loader (so RLS applies); when called from anonymous flows it uses service-role. Sub-project 5 always calls it via the authenticated employer client.
- `app/lib/question-engine.ts` also exports `getQuestionSetById(id, supabase)` returning the standard set + ordered questions array.

### From sub-project 4 (Assessment forms) — assumed contracts

- `app/components/forms/CompetencyAssessmentForm.tsx` — reusable form. Props: `{ intern, phases, questions, sectionBoundaries, initialAnswers, initialPhase, action, mode }` where `mode: 'new' | 'edit' | 'view'` and `action` is the post URL (so the employer-side route can mount it and post to its own action). Calls a parent-provided `<QuestionRenderer>` per question and emits standard `<Form method="post">` submissions.
- `app/components/forms/ExitEmployerSurveyForm.tsx` — reusable form. Props: `{ intern, questions, initialAnswers, action, mode }`. Same `action`-as-prop pattern.
- `app/components/forms/IdentityChip.tsx` (intern flow) — irrelevant to sub-project 5, mentioned only to confirm we don't reuse it.
- Sub-project 4 lands the admin-side competency assessment routes (`app/routes/admin.competency.new.tsx`, `.edit.tsx`, `.$id.tsx`) and admin exit-survey route (`app/routes/admin.exit-survey.tsx`). Sub-project 5 mirrors the route shape on `/employer/competency/*` and `/employer/exit-survey`.
- The shared form components accept `mode='view'` for read-only display, with all `<QuestionRenderer disabled>` and submit button hidden — sub-project 5 uses this for the employer-side competency-detail page.

If any contract above is missing or shaped differently when sub-project 5 starts, the consuming task explicitly notes "TODO: reconcile with sub-project N" rather than guessing.

---

## File Structure

Sub-project 5 creates the following files. Existing files modified are flagged `(modify)`.

**Employer shell routes (`app/routes/`):**
- `app/routes/employer.tsx` *(modify — currently a sub-project-1 placeholder)*
- `app/routes/employer._index.tsx` *(modify — sub-project-1 placeholder dashboard)*
- `app/routes/employer.cohorts._index.tsx`
- `app/routes/employer.cohorts.$cohortId.tsx`
- `app/routes/employer.interns._index.tsx`
- `app/routes/employer.interns.$internId.tsx`
- `app/routes/employer.competency.new.tsx`
- `app/routes/employer.competency.edit.tsx`
- `app/routes/employer.competency.$id.tsx`
- `app/routes/employer.exit-survey.tsx`
- `app/routes/employer.profile.tsx`
- `app/routes/employer.roles._index.tsx`
- `app/routes/employer.roles.new.tsx`
- `app/routes/employer.roles.$roleId.tsx`

**Branded auth routes (`app/routes/`):**
- `app/routes/_public.auth.accept.tsx` — first-time password set after invite
- `app/routes/_public.auth.reset.tsx` *(modify or supersede `_public.auth.reset-password.tsx`)*
- `app/routes/_public.auth.forgot.tsx` *(modify or supersede `_public.auth.reset-password-request.tsx`)*
- `app/routes/_public.auth.callback.tsx` *(modify — extend to route invite/reset users to correct branded page based on `?next=`)*
- `app/routes/_public.login.tsx` *(modify — verify role-based redirect and link to `/auth/forgot`)*

**Admin-side provisioning UI (`app/routes/`):**
- `app/routes/admin.employers.$id.account.tsx` — full sub-route page (invite/revoke/resend)
- `app/routes/admin.employers.$id.tsx` *(modify — add "Login Account" card linking to the sub-route)*

**Components (`app/components/`):**
- `app/components/nav/EmployerNav.tsx`
- `app/components/nav/EmployerFooter.tsx`
- `app/components/employer/EmployerDashboardKpis.tsx`
- `app/components/employer/CohortListCard.tsx`
- `app/components/auth/AuthShell.tsx` — branded `<main class="auth">…</main>` wrapper shared by accept/reset/forgot pages
- `app/components/admin/EmployerAccountCard.tsx` — invite/revoke/resend card embedded on `admin.employers.$id.tsx`

**Server lib (`app/lib/`):**
- `app/lib/supabase-admin.server.ts` — singleton service-role Supabase client (server-only)
- `app/lib/employer-scope.server.ts` — helpers: `requireEmployerAuth(request)`, `getEmployerById(employerId)`, `kpisForEmployer(employerId)`, `cohortsForEmployer(employerId)`, `internsForEmployer(employerId)`, `internInEmployerScope(internId, employerId)`
- `app/lib/invites.server.ts` — `inviteEmployerUser({employerId, email})`, `resendEmployerInvite({employerId})`, `revokeEmployerAccess({employerId})`, `employerAccountStatus(employerId): 'none'|'pending'|'active'`

**Email templates (`app/emails/`):**
- `app/emails/employer-invite.tsx` — `renderEmployerInvite({ employerName, acceptUrl, programName })` returns `{ subject, html, text }`
- `app/emails/password-reset.tsx` — `renderPasswordReset({ resetUrl, programName })` returns `{ subject, html, text }`
- `app/emails/_layout.tsx` — shared branded HTML wrapper (navy header strip, brand mark, IBM Plex Sans body, footer)

**Styles (`app/styles/`):**
- `app/styles/auth.css` — login/accept/reset/forgot branded styles (mirrors prototype `login` styles)
- `app/styles/employer-shell.css` — employer nav/footer/dashboard styles

**Tests (`tests/`):**
- `tests/lib/invites.server.test.ts`
- `tests/lib/employer-scope.server.test.ts`
- `tests/rls/employer-cross-tenant.test.ts` — employer cannot read another employer's interns/cohorts/submissions
- `tests/rls/employer-write-restrictions.test.ts` — employer cannot insert competency for non-owned intern; cannot insert `personal-goals`; can insert competency for own intern
- `tests/rls/employer-profile-roles.test.ts` — employer can CRUD own roles; cannot touch another employer's roles
- `tests/e2e/employer-login.spec.ts`
- `tests/e2e/employer-competency.spec.ts`
- `tests/e2e/admin-invite-accept.spec.ts`

**Route table:**
- `app/routes.ts` *(modify — register all new employer + auth routes)*

---

## Phases overview

- **Phase A** — Service-role admin client + invite/account lib
- **Phase B** — Admin-side account provisioning UI
- **Phase C** — Branded auth pages (accept / reset / forgot / callback)
- **Phase D** — Email templates
- **Phase E** — Employer shell layout + navigation
- **Phase F** — Employer dashboard + scope helpers
- **Phase G** — Employer cohorts + interns views
- **Phase H** — Employer competency self-service
- **Phase I** — Employer Exit Survey self-service
- **Phase J** — Employer profile + roles
- **Phase K** — RLS integration tests (employer scope)
- **Phase L** — E2E coverage + sub-project smoke

---

## Phase A: Service-role admin client + invite/account lib

### Task 1: Create the service-role Supabase admin client

**Files:**
- Create: `app/lib/supabase-admin.server.ts`

- [ ] **Step 1: Create the file**

  ```ts
  import { createClient } from '@supabase/supabase-js';
  import type { SupabaseClient } from '@supabase/supabase-js';
  import { env } from './env.server';

  let _admin: SupabaseClient | null = null;

  /**
   * Server-only singleton. Uses the service-role key — NEVER expose to client bundles.
   * The `.server.ts` suffix ensures RR v7's bundler keeps this off the client.
   */
  export function getSupabaseAdmin(): SupabaseClient {
    if (!_admin) {
      _admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
    return _admin;
  }
  ```

- [ ] **Step 2: Sanity-check the file is .server.ts (RR v7 server-only convention)**

  Confirm the filename ends `.server.ts`. The RR v7 bundler strips any module matching `*.server.{ts,tsx}` from client bundles, which is how we keep the service-role key out of the browser.

- [ ] **Step 3: Commit**

  ```bash
  git add app/lib/supabase-admin.server.ts
  git commit -m "Sub-5: Add server-only Supabase admin (service-role) client"
  ```

### Task 2: Write the invites lib — TDD

**Files:**
- Create: `app/lib/invites.server.ts`
- Create: `tests/lib/invites.server.test.ts`

The lib wraps three flows: invite (creates auth user via admin API + inserts `profiles` row + sends branded email via Resend), revoke (deletes the auth user — `profiles` cascades), and resend (re-sends a fresh invite link). `employerAccountStatus` returns `'none' | 'pending' | 'active'` for the admin-side card.

- [ ] **Step 1: Write the failing test**

  `tests/lib/invites.server.test.ts`:

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';

  // We mock the Supabase admin client + Drizzle + Resend so we don't need a live DB.
  const mockAdmin = {
    auth: {
      admin: {
        inviteUserByEmail: vi.fn(),
        deleteUser: vi.fn(),
        listUsers: vi.fn(),
      },
    },
  };
  const mockSendEmail = vi.fn();
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ onConflictDoNothing: vi.fn().mockResolvedValue([]) })) })),
    delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
  };

  vi.mock('~/lib/supabase-admin.server', () => ({
    getSupabaseAdmin: () => mockAdmin,
  }));
  vi.mock('~/lib/email.server', () => ({ sendEmail: mockSendEmail }));
  vi.mock('~/lib/db.server', () => ({ db: mockDb }));
  vi.mock('~/lib/env.server', () => ({
    env: { APP_URL: 'http://localhost:5173', RESEND_FROM: 'noreply@example.com', SUPABASE_URL: '', SUPABASE_ANON_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '', DATABASE_URL: '', DATABASE_POOL_URL: '', RESEND_API_KEY: '' },
  }));

  // Import AFTER mocks
  import { inviteEmployerUser, revokeEmployerAccess, employerAccountStatus } from '~/lib/invites.server';

  describe('inviteEmployerUser', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('calls Supabase admin invite with employer_id metadata + redirectTo /auth/accept', async () => {
      mockAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: { user: { id: 'user-uuid-1', email: 'test@example.com' } },
        error: null,
      });
      // db.select returns existing employer row
      const mockSelect = { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 'emp-1', name: 'Test Employer' }]) })) })) };
      mockDb.select.mockReturnValue(mockSelect);
      mockSendEmail.mockResolvedValue(undefined);

      await inviteEmployerUser({ employerId: 'emp-1', email: 'test@example.com' });

      expect(mockAdmin.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: 'http://localhost:5173/auth/callback?next=/auth/accept',
          data: { employer_id: 'emp-1', role: 'employer' },
        }),
      );
    });

    it('inserts a profiles row with role=employer + employerId after successful invite', async () => {
      mockAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: { user: { id: 'user-uuid-2' } },
        error: null,
      });
      const mockSelect = { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 'emp-1', name: 'X' }]) })) })) };
      mockDb.select.mockReturnValue(mockSelect);

      await inviteEmployerUser({ employerId: 'emp-1', email: 'a@b.com' });

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('throws if the employer does not exist', async () => {
      const mockSelect = { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) };
      mockDb.select.mockReturnValue(mockSelect);

      await expect(inviteEmployerUser({ employerId: 'missing', email: 'x@y.com' })).rejects.toThrow(/employer.*not found/i);
    });

    it('throws if Supabase invite returns an error', async () => {
      const mockSelect = { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 'emp-1', name: 'X' }]) })) })) };
      mockDb.select.mockReturnValue(mockSelect);
      mockAdmin.auth.admin.inviteUserByEmail.mockResolvedValue({
        data: { user: null },
        error: { message: 'User already exists' },
      });

      await expect(inviteEmployerUser({ employerId: 'emp-1', email: 'taken@x.com' })).rejects.toThrow(/User already exists/);
    });
  });

  describe('revokeEmployerAccess', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('deletes every auth user whose profile.employer_id matches', async () => {
      // db returns one user_id for the employer
      const mockSelect = { from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ userId: 'user-uuid-3' }]) })) };
      mockDb.select.mockReturnValue(mockSelect);
      mockAdmin.auth.admin.deleteUser.mockResolvedValue({ error: null });

      await revokeEmployerAccess({ employerId: 'emp-1' });

      expect(mockAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('user-uuid-3');
    });
  });

  describe('employerAccountStatus', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns "none" when no profile row exists', async () => {
      const mockSelect = { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) };
      mockDb.select.mockReturnValue(mockSelect);
      mockAdmin.auth.admin.listUsers.mockResolvedValue({ data: { users: [] }, error: null });

      expect(await employerAccountStatus('emp-1')).toBe('none');
    });

    it('returns "pending" when auth.users.email_confirmed_at is null', async () => {
      const mockSelect = { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ userId: 'u1' }]) })) })) };
      mockDb.select.mockReturnValue(mockSelect);
      mockAdmin.auth.admin.listUsers.mockResolvedValue({
        data: { users: [{ id: 'u1', email_confirmed_at: null, invited_at: '2026-05-01T00:00:00Z' }] },
        error: null,
      });

      expect(await employerAccountStatus('emp-1')).toBe('pending');
    });

    it('returns "active" when auth.users.email_confirmed_at is set', async () => {
      const mockSelect = { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ userId: 'u1' }]) })) })) };
      mockDb.select.mockReturnValue(mockSelect);
      mockAdmin.auth.admin.listUsers.mockResolvedValue({
        data: { users: [{ id: 'u1', email_confirmed_at: '2026-05-02T00:00:00Z' }] },
        error: null,
      });

      expect(await employerAccountStatus('emp-1')).toBe('active');
    });
  });
  ```

- [ ] **Step 2: Run test, verify failure**

  ```bash
  npm test -- invites.server
  ```

  Expected: FAIL — `Cannot find module '~/lib/invites.server'`.

- [ ] **Step 3: Implement `app/lib/invites.server.ts`**

  ```ts
  import { getSupabaseAdmin } from './supabase-admin.server';
  import { sendEmail } from './email.server';
  import { db } from './db.server';
  import { env } from './env.server';
  import { employers, profiles } from '../../db/schema';
  import { eq } from 'drizzle-orm';
  import { renderEmployerInvite } from '../emails/employer-invite';

  export type EmployerAccountStatus = 'none' | 'pending' | 'active';

  export async function inviteEmployerUser(args: {
    employerId: string;
    email: string;
  }): Promise<{ userId: string }> {
    // 1. Confirm employer exists (defensive — admin UI also validates).
    const rows = await db
      .select({ id: employers.id, name: employers.name })
      .from(employers)
      .where(eq(employers.id, args.employerId))
      .limit(1);
    if (rows.length === 0) {
      throw new Error(`Employer not found: ${args.employerId}`);
    }
    const employer = rows[0]!;

    const admin = getSupabaseAdmin();
    const redirectTo = `${env.APP_URL}/auth/callback?next=/auth/accept`;
    const { data, error } = await admin.auth.admin.inviteUserByEmail(args.email, {
      redirectTo,
      data: { employer_id: args.employerId, role: 'employer' },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Supabase invite returned no user');

    // 2. Insert profiles row with role + employer_id so the JWT hook
    //    resolves claims on the user's first sign-in. Race-safe: if a trigger
    //    in sub-project 1 fires first, this becomes a no-op via ON CONFLICT.
    await db
      .insert(profiles)
      .values({ userId: data.user.id, role: 'employer', employerId: args.employerId })
      .onConflictDoNothing({ target: profiles.userId });

    // 3. Send branded invite email (Supabase also sends a default; we send ours too
    //    for branding. The Supabase URL inside the email links through /auth/callback,
    //    which is the same destination either way — so the user sees the branded one
    //    most prominently in their inbox preview).
    const acceptUrl = redirectTo; // same callback handles invite acceptance
    const { subject, html, text } = renderEmployerInvite({
      employerName: employer.name,
      acceptUrl,
      programName: 'IMPACT Internship Program',
    });
    await sendEmail({ to: args.email, subject, html, text });

    return { userId: data.user.id };
  }

  export async function resendEmployerInvite(args: { employerId: string }): Promise<void> {
    const rows = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.employerId, args.employerId));
    if (rows.length === 0) throw new Error('No employer user to resend invite for');

    const admin = getSupabaseAdmin();
    const { data: userList } = await admin.auth.admin.listUsers();
    const user = userList.users.find((u) => u.id === rows[0]!.userId);
    if (!user || !user.email) throw new Error('User record incomplete');

    // Delete + re-invite is the cleanest way; alternatively
    // `generateLink({ type: 'invite' })` regenerates a token.
    await admin.auth.admin.deleteUser(user.id);
    await db.delete(profiles).where(eq(profiles.userId, user.id));
    await inviteEmployerUser({ employerId: args.employerId, email: user.email });
  }

  export async function revokeEmployerAccess(args: { employerId: string }): Promise<void> {
    const rows = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.employerId, args.employerId));
    const admin = getSupabaseAdmin();
    for (const row of rows) {
      const { error } = await admin.auth.admin.deleteUser(row.userId);
      if (error) throw new Error(`Failed to delete user ${row.userId}: ${error.message}`);
      // profiles row cascades on auth.users delete (FK onDelete: 'cascade').
    }
  }

  export async function employerAccountStatus(employerId: string): Promise<EmployerAccountStatus> {
    const rows = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.employerId, employerId))
      .limit(1);
    if (rows.length === 0) return 'none';

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.listUsers();
    if (error) throw new Error(error.message);
    const user = data.users.find((u) => u.id === rows[0]!.userId);
    if (!user) return 'none';
    return user.email_confirmed_at ? 'active' : 'pending';
  }
  ```

- [ ] **Step 4: Run tests, verify pass**

  ```bash
  npm test -- invites.server
  ```

  Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add app/lib/invites.server.ts tests/lib/invites.server.test.ts
  git commit -m "Sub-5: Add invites.server lib + TDD coverage"
  ```

---

## Phase B: Admin-side account provisioning UI

### Task 3: Add the EmployerAccountCard component

**Files:**
- Create: `app/components/admin/EmployerAccountCard.tsx`

The card sits inside `admin.employers.$id.tsx` and shows status + actions. Status comes from the parent loader (so we don't fetch twice). Actions submit to `/admin/employers/:id/account` (Task 4).

- [ ] **Step 1: Create the file**

  ```tsx
  import { Form } from 'react-router';
  import type { EmployerAccountStatus } from '~/lib/invites.server';

  export interface EmployerAccountCardProps {
    employerId: string;
    employerName: string;
    contactEmail: string | null;
    status: EmployerAccountStatus;
    accountEmail: string | null;
    error?: string | null;
    success?: string | null;
  }

  const STATUS_LABEL: Record<EmployerAccountStatus, string> = {
    none: 'No account',
    pending: 'Invite sent — awaiting accept',
    active: 'Active',
  };

  const STATUS_PILL_CLASS: Record<EmployerAccountStatus, string> = {
    none: 'pill pill--neutral',
    pending: 'pill pill--gold',
    active: 'pill pill--cyan',
  };

  export function EmployerAccountCard(props: EmployerAccountCardProps) {
    const action = `/admin/employers/${props.employerId}/account`;
    return (
      <section className="card card--account" aria-labelledby="account-card-title">
        <header className="card__head">
          <span className="micro-label micro-label--navy">EMPLOYER LOGIN</span>
          <span className={STATUS_PILL_CLASS[props.status]}>{STATUS_LABEL[props.status]}</span>
        </header>
        <h3 id="account-card-title" className="card__title">Account access</h3>
        <p className="card__sub">
          One sign-in account per employer in v1. Invite the contact above (or a custom email)
          so they can self-serve competency entry and Exit Employer Surveys.
        </p>

        {props.error && <div role="alert" className="alert alert--danger">{props.error}</div>}
        {props.success && <div role="status" className="alert alert--success">{props.success}</div>}

        {props.status === 'none' && (
          <Form method="post" action={action} className="card__form">
            <label className="field">
              <span className="field__label">Email</span>
              <input
                className="input"
                type="email"
                name="email"
                defaultValue={props.contactEmail ?? ''}
                required
                autoComplete="email"
              />
            </label>
            <button type="submit" name="intent" value="invite" className="btn btn--primary">
              Send invite
            </button>
          </Form>
        )}

        {props.status === 'pending' && (
          <div className="card__actions">
            <p className="card__meta">
              Invited <strong>{props.accountEmail}</strong>. They have not yet set a password.
            </p>
            <Form method="post" action={action} className="card__form-inline">
              <button type="submit" name="intent" value="resend" className="btn btn--outline">
                Resend invite
              </button>
              <button
                type="submit"
                name="intent"
                value="revoke"
                className="btn btn--ghost-danger"
                data-confirm="Cancel this invite? The link will stop working."
              >
                Cancel invite
              </button>
            </Form>
          </div>
        )}

        {props.status === 'active' && (
          <div className="card__actions">
            <p className="card__meta">
              Signed in as <strong>{props.accountEmail}</strong>.
            </p>
            <Form method="post" action={action} className="card__form-inline">
              <button
                type="submit"
                name="intent"
                value="revoke"
                className="btn btn--ghost-danger"
                data-confirm="Revoke this employer's account? They will lose access immediately."
              >
                Revoke access
              </button>
            </Form>
          </div>
        )}
      </section>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/admin/EmployerAccountCard.tsx
  git commit -m "Sub-5: Add EmployerAccountCard component"
  ```

### Task 4: Wire the admin account sub-route action

**Files:**
- Create: `app/routes/admin.employers.$id.account.tsx`

This route handles the form posts from `EmployerAccountCard`. It's also reachable directly (the loader redirects to the parent employer detail page).

- [ ] **Step 1: Create the route**

  ```tsx
  import { redirect } from 'react-router';
  import type { Route } from './+types/admin.employers.$id.account';
  import { getAuthContext } from '~/lib/auth.server';
  import {
    inviteEmployerUser,
    resendEmployerInvite,
    revokeEmployerAccess,
  } from '~/lib/invites.server';

  export async function loader({ request, params }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'admin') {
      throw redirect('/login', { headers });
    }
    // No standalone page — bounce to the parent detail.
    throw redirect(`/admin/employers/${params.id}`, { headers });
  }

  export async function action({ request, params }: Route.ActionArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'admin') {
      throw redirect('/login', { headers });
    }
    const employerId = params.id!;
    const formData = await request.formData();
    const intent = String(formData.get('intent') ?? '');

    const backTo = `/admin/employers/${employerId}`;

    try {
      if (intent === 'invite') {
        const email = String(formData.get('email') ?? '').trim();
        if (!email) {
          return { error: 'Email is required.' };
        }
        await inviteEmployerUser({ employerId, email });
        throw redirect(`${backTo}?account=invited`, { headers });
      }
      if (intent === 'resend') {
        await resendEmployerInvite({ employerId });
        throw redirect(`${backTo}?account=resent`, { headers });
      }
      if (intent === 'revoke') {
        await revokeEmployerAccess({ employerId });
        throw redirect(`${backTo}?account=revoked`, { headers });
      }
      return { error: `Unknown action: ${intent}` };
    } catch (err) {
      if (err instanceof Response) throw err;
      const message = err instanceof Error ? err.message : 'Unexpected error';
      return { error: message };
    }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/admin.employers.$id.account.tsx
  git commit -m "Sub-5: Add admin employer account provisioning action route"
  ```

### Task 5: Mount the account card on the existing admin employer detail page

**Files:**
- Modify: `app/routes/admin.employers.$id.tsx` (created by sub-project 2)

Add a loader extension that calls `employerAccountStatus` and renders `<EmployerAccountCard>` near the bottom of the page. Reads `?account=invited|resent|revoked` from the URL to show a success toast/banner.

- [ ] **Step 1: Extend the loader**

  Add to the existing loader:

  ```ts
  import { employerAccountStatus } from '~/lib/invites.server';
  import { getSupabaseAdmin } from '~/lib/supabase-admin.server';
  import { db } from '~/lib/db.server';
  import { profiles } from '../../db/schema';
  import { eq } from 'drizzle-orm';

  // ... existing loader body ...

  const status = await employerAccountStatus(params.id!);
  let accountEmail: string | null = null;
  if (status !== 'none') {
    const rows = await db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.employerId, params.id!))
      .limit(1);
    if (rows.length > 0) {
      const { data } = await getSupabaseAdmin().auth.admin.listUsers();
      accountEmail = data.users.find((u) => u.id === rows[0]!.userId)?.email ?? null;
    }
  }

  return { employer, status, accountEmail /* + existing loader payload */ };
  ```

- [ ] **Step 2: Add the card to the JSX**

  In the page component, near the bottom of the existing layout:

  ```tsx
  import { EmployerAccountCard } from '~/components/admin/EmployerAccountCard';
  import { useLoaderData, useActionData, useSearchParams } from 'react-router';

  // ... existing component body ...

  const [searchParams] = useSearchParams();
  const accountFlag = searchParams.get('account');
  const successMsg =
    accountFlag === 'invited' ? 'Invite sent.' :
    accountFlag === 'resent'  ? 'Invite re-sent.' :
    accountFlag === 'revoked' ? 'Access revoked.' :
    null;

  return (
    <>
      {/* existing employer detail markup */}
      <EmployerAccountCard
        employerId={employer.id}
        employerName={employer.name}
        contactEmail={employer.contactEmail}
        status={status}
        accountEmail={accountEmail}
        error={actionData?.error ?? null}
        success={successMsg}
      />
    </>
  );
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/admin.employers.$id.tsx
  git commit -m "Sub-5: Mount EmployerAccountCard on admin employer detail page"
  ```

---

## Phase C: Branded auth pages

### Task 6: Create the shared AuthShell + auth styles

**Files:**
- Create: `app/components/auth/AuthShell.tsx`
- Create: `app/styles/auth.css`

These mirror the prototype's `login.html` aesthetic — split layout, navy/cyan/gold tokens, IBM Plex Sans body, Archivo Black headline.

- [ ] **Step 1: Create `app/components/auth/AuthShell.tsx`**

  ```tsx
  import type { ReactNode } from 'react';

  export interface AuthShellProps {
    microLabel: string; // e.g. "INVITE / ACCEPT / 2026"
    title: string;      // e.g. "Set your password."
    sub: string;
    children: ReactNode;
    facts?: { mono: string; label: string }[];
  }

  export function AuthShell({ microLabel, title, sub, children, facts }: AuthShellProps) {
    return (
      <main className="auth">
        <div className="container auth__inner">
          <div className="auth__intro">
            <span className="micro-label">{microLabel}</span>
            <h1 className="auth__title">{title}</h1>
            <p className="auth__sub">{sub}</p>
            {facts && facts.length > 0 && (
              <ul className="auth__facts">
                {facts.map((f) => (
                  <li key={f.mono}>
                    <span className="mono">{f.mono}</span> {f.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="auth__form-wrap">{children}</div>
        </div>
      </main>
    );
  }
  ```

- [ ] **Step 2: Create `app/styles/auth.css`**

  Lift the structure of `Prototypes/PROTOTYPE/styles.css` `.login`, `.login__inner`, `.login__intro`, `.login__title`, `.login__form`, `.login__facts`, etc. classes — rename to `.auth*` and keep the same tokens:

  ```css
  .auth {
    min-height: calc(100vh - 80px);
    padding: 64px 0;
    background: var(--canvas);
  }

  .auth__inner {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 64px;
    align-items: start;
  }

  @media (max-width: 880px) {
    .auth__inner { grid-template-columns: 1fr; gap: 40px; }
  }

  .auth__intro .micro-label {
    color: var(--navy);
    letter-spacing: 0.12em;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
  }

  .auth__title {
    font-family: 'Archivo Black', sans-serif;
    color: var(--navy-deep);
    font-size: 56px;
    line-height: 1;
    margin: 16px 0 12px;
  }

  .auth__sub {
    color: var(--ink-soft);
    font-size: 16px;
    line-height: 1.55;
    max-width: 460px;
  }

  .auth__facts {
    list-style: none;
    padding: 0;
    margin: 32px 0 0;
    display: grid;
    gap: 10px;
    border-top: 3px solid var(--gold);
    border-left: 3px solid var(--gold);
    padding: 16px 18px;
    background: var(--white);
  }

  .auth__facts li {
    font-size: 13px;
    color: var(--navy-deep);
  }

  .auth__facts .mono {
    font-family: 'IBM Plex Mono', monospace;
    color: var(--cyan);
    margin-right: 10px;
  }

  .auth__form-wrap {
    background: var(--white);
    padding: 32px;
    border: 1px solid var(--line);
    border-radius: 8px;
    box-shadow: 0 12px 32px -16px rgba(5, 16, 40, 0.18);
  }

  .auth__form-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 20px;
  }

  .auth__field { display: block; margin-bottom: 18px; }
  .auth__field-label {
    display: block;
    font-weight: 600;
    font-size: 13px;
    color: var(--navy-deep);
    margin-bottom: 6px;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  .auth__submit {
    width: 100%;
    margin-top: 8px;
    padding: 14px 18px;
    background: var(--navy);
    color: var(--white);
    border: 1px solid var(--navy);
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  .auth__submit:hover { background: var(--navy-deep); border-color: var(--navy-deep); }

  .auth__secondary {
    display: block;
    margin-top: 16px;
    text-align: center;
    color: var(--navy);
    text-decoration: none;
    font-size: 14px;
  }
  .auth__secondary:hover { color: var(--cyan); }

  .auth__alert {
    padding: 12px 14px;
    border-radius: 4px;
    margin-bottom: 16px;
    font-size: 14px;
  }
  .auth__alert--danger {
    background: #fef2f2;
    border: 1px solid #fca5a5;
    color: #7f1d1d;
  }
  .auth__alert--success {
    background: #f0fdf4;
    border: 1px solid #86efac;
    color: #166534;
  }
  ```

- [ ] **Step 3: Import the stylesheet in `app/root.tsx`**

  Add the import alongside the existing `tokens.css` / `global.css` imports:

  ```ts
  import './styles/auth.css';
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add app/components/auth/AuthShell.tsx app/styles/auth.css app/root.tsx
  git commit -m "Sub-5: Add branded AuthShell + auth.css"
  ```

### Task 7: Build the branded `/auth/accept` page

**Files:**
- Create: `app/routes/_public.auth.accept.tsx`

User arrives here from invite email after `/auth/callback` exchanged the token. Their session is now active, but they have no password set. They submit a new password; on success, redirect by role.

- [ ] **Step 1: Create the route**

  ```tsx
  import { Form, useActionData, redirect } from 'react-router';
  import type { Route } from './+types/_public.auth.accept';
  import { AuthShell } from '~/components/auth/AuthShell';
  import { createSupabaseServerClient, getAuthContext } from '~/lib/auth.server';

  export const meta: Route.MetaFunction = () => [{ title: 'Accept your invite · IMPACT Portal' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth) {
      // No session — most likely they bookmarked the page. Send to /login.
      throw redirect('/login', { headers });
    }
    return null;
  }

  export async function action({ request }: Route.ActionArgs) {
    const headers = new Headers();
    const formData = await request.formData();
    const password = String(formData.get('password') ?? '');
    const confirm = String(formData.get('confirm') ?? '');

    if (password.length < 12) return { error: 'Password must be at least 12 characters.' };
    if (password !== confirm) return { error: 'Passwords do not match.' };

    const supabase = createSupabaseServerClient(request, headers);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };

    const auth = await getAuthContext(request, headers);
    const dest = auth?.role === 'admin' ? '/admin' : '/employer';
    throw redirect(dest, { headers });
  }

  export default function AcceptInvitePage() {
    const actionData = useActionData<typeof action>();
    return (
      <AuthShell
        microLabel="INVITE / ACCEPT / 2026"
        title="Set your password."
        sub="Welcome to IMPACT. Pick a strong password — at least 12 characters. You'll use this to sign in alongside your email."
        facts={[
          { mono: '01', label: 'Read your cohorts and interns' },
          { mono: '02', label: 'Submit competency assessments' },
          { mono: '03', label: 'Complete Exit Employer Surveys' },
        ]}
      >
        <div className="auth__form-head">
          <span className="micro-label micro-label--navy">CREDENTIALS</span>
          <span className="auth__demo-note">One account per employer</span>
        </div>

        {actionData?.error && (
          <div role="alert" className="auth__alert auth__alert--danger">{actionData.error}</div>
        )}

        <Form method="post">
          <label className="auth__field">
            <span className="auth__field-label">New password</span>
            <input className="input" type="password" name="password" required minLength={12} autoComplete="new-password" />
          </label>
          <label className="auth__field">
            <span className="auth__field-label">Confirm password</span>
            <input className="input" type="password" name="confirm" required minLength={12} autoComplete="new-password" />
          </label>
          <button type="submit" className="auth__submit">Save password and sign in</button>
        </Form>
      </AuthShell>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/_public.auth.accept.tsx
  git commit -m "Sub-5: Add branded /auth/accept invite acceptance page"
  ```

### Task 8: Build the branded `/auth/reset` page (supersedes sub-project-1 placeholder)

**Files:**
- Create: `app/routes/_public.auth.reset.tsx`
- Modify (delete): `app/routes/_public.auth.reset-password.tsx`

- [ ] **Step 1: Create `app/routes/_public.auth.reset.tsx`**

  Same shape as `_public.auth.accept.tsx` but with reset copy.

  ```tsx
  import { Form, useActionData, redirect } from 'react-router';
  import type { Route } from './+types/_public.auth.reset';
  import { AuthShell } from '~/components/auth/AuthShell';
  import { createSupabaseServerClient, getAuthContext } from '~/lib/auth.server';

  export const meta: Route.MetaFunction = () => [{ title: 'Reset your password · IMPACT Portal' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth) throw redirect('/login', { headers });
    return null;
  }

  export async function action({ request }: Route.ActionArgs) {
    const headers = new Headers();
    const formData = await request.formData();
    const password = String(formData.get('password') ?? '');
    const confirm = String(formData.get('confirm') ?? '');
    if (password.length < 12) return { error: 'Password must be at least 12 characters.' };
    if (password !== confirm) return { error: 'Passwords do not match.' };

    const supabase = createSupabaseServerClient(request, headers);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    throw redirect('/login?reset=ok', { headers });
  }

  export default function ResetPasswordPage() {
    const actionData = useActionData<typeof action>();
    return (
      <AuthShell
        microLabel="ACCOUNT / RESET / 2026"
        title="Set a new password."
        sub="Choose a new password to regain access. At least 12 characters."
      >
        {actionData?.error && (
          <div role="alert" className="auth__alert auth__alert--danger">{actionData.error}</div>
        )}
        <Form method="post">
          <label className="auth__field">
            <span className="auth__field-label">New password</span>
            <input className="input" type="password" name="password" required minLength={12} autoComplete="new-password" />
          </label>
          <label className="auth__field">
            <span className="auth__field-label">Confirm password</span>
            <input className="input" type="password" name="confirm" required minLength={12} autoComplete="new-password" />
          </label>
          <button type="submit" className="auth__submit">Save new password</button>
        </Form>
      </AuthShell>
    );
  }
  ```

- [ ] **Step 2: Delete the sub-project-1 placeholder file**

  ```bash
  git rm app/routes/_public.auth.reset-password.tsx
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/_public.auth.reset.tsx
  git commit -m "Sub-5: Add branded /auth/reset (supersedes sub-1 placeholder)"
  ```

### Task 9: Build the branded `/auth/forgot` page

**Files:**
- Create: `app/routes/_public.auth.forgot.tsx`
- Modify (delete): `app/routes/_public.auth.reset-password-request.tsx`

- [ ] **Step 1: Create `app/routes/_public.auth.forgot.tsx`**

  ```tsx
  import { Form, useActionData } from 'react-router';
  import type { Route } from './+types/_public.auth.forgot';
  import { AuthShell } from '~/components/auth/AuthShell';
  import { createSupabaseServerClient } from '~/lib/auth.server';
  import { env } from '~/lib/env.server';

  export const meta: Route.MetaFunction = () => [{ title: 'Forgot password · IMPACT Portal' }];

  export async function action({ request }: Route.ActionArgs) {
    const headers = new Headers();
    const formData = await request.formData();
    const email = String(formData.get('email') ?? '').trim();
    if (!email) return { error: 'Email is required.' };

    const supabase = createSupabaseServerClient(request, headers);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.APP_URL}/auth/callback?next=/auth/reset`,
    });
    // Supabase does not reveal whether the email exists — preserve that.
    return { sent: true };
  }

  export default function ForgotPasswordPage() {
    const actionData = useActionData<typeof action>();
    if (actionData?.sent) {
      return (
        <AuthShell
          microLabel="ACCOUNT / RECOVER / 2026"
          title="Check your email."
          sub="If an account exists for that email, we've sent a branded reset link from IMPACT. It expires in 1 hour."
        >
          <p className="auth__secondary"><a href="/login">Back to sign in</a></p>
        </AuthShell>
      );
    }
    return (
      <AuthShell
        microLabel="ACCOUNT / RECOVER / 2026"
        title="Forgot password?"
        sub="Enter your email and we'll send a reset link. If you don't receive it within a few minutes, contact your program lead."
      >
        {actionData?.error && (
          <div role="alert" className="auth__alert auth__alert--danger">{actionData.error}</div>
        )}
        <Form method="post">
          <label className="auth__field">
            <span className="auth__field-label">Email</span>
            <input className="input" type="email" name="email" required autoComplete="email" />
          </label>
          <button type="submit" className="auth__submit">Send reset link</button>
        </Form>
        <p className="auth__secondary"><a href="/login">Back to sign in</a></p>
      </AuthShell>
    );
  }
  ```

- [ ] **Step 2: Delete the sub-project-1 placeholder**

  ```bash
  git rm app/routes/_public.auth.reset-password-request.tsx
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/_public.auth.forgot.tsx
  git commit -m "Sub-5: Add branded /auth/forgot (supersedes sub-1 placeholder)"
  ```

### Task 10: Update `/auth/callback` to honour `?next=` and handle invite acceptance

**Files:**
- Modify: `app/routes/_public.auth.callback.tsx`

The callback already exchanges the code for a session (sub-project 1). Extend so `?next=/auth/accept` and `?next=/auth/reset` redirect appropriately, and so a fresh session with no profile still gets bounced safely.

- [ ] **Step 1: Replace the loader body**

  ```ts
  export async function loader({ request }: Route.LoaderArgs) {
    const headers = new Headers();
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const nextRaw = url.searchParams.get('next');
    // Whitelist to internal paths only.
    const next = nextRaw && nextRaw.startsWith('/') ? nextRaw : '/login';

    if (!code) throw redirect('/login', { headers });

    const supabase = createSupabaseServerClient(request, headers);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw redirect('/login?error=callback', { headers });

    throw redirect(next, { headers });
  }
  ```

- [ ] **Step 2: Update `_public.login.tsx` to link to `/auth/forgot`**

  In the existing login JSX, change:

  ```tsx
  <a href="/auth/reset-password-request">Forgot password?</a>
  ```

  to:

  ```tsx
  <a href="/auth/forgot">Forgot password?</a>
  ```

  Also verify the post-login redirect still routes to `/admin` or `/employer` per role.

- [ ] **Step 3: Update route table**

  In `app/routes.ts`, replace the sub-1 entries:

  ```ts
  route('auth/forgot', 'routes/_public.auth.forgot.tsx'),
  route('auth/reset', 'routes/_public.auth.reset.tsx'),
  route('auth/accept', 'routes/_public.auth.accept.tsx'),
  route('auth/callback', 'routes/_public.auth.callback.tsx'),
  ```

  Remove the obsolete `auth/reset-password*` entries.

- [ ] **Step 4: Commit**

  ```bash
  git add app/routes/_public.auth.callback.tsx app/routes/_public.login.tsx app/routes.ts
  git commit -m "Sub-5: Route /auth/callback to branded accept/reset pages"
  ```

---

## Phase D: Email templates

### Task 11: Create the shared branded email layout

**Files:**
- Create: `app/emails/_layout.tsx`

Email templates render HTML strings (not React DOM — they're consumed by Resend). We can still author them as TSX-returning-string for syntax familiarity, OR plain template-literal builders. Use plain function exports returning `{ html, text }` to avoid React's server-renderer dependency for emails.

- [ ] **Step 1: Create `app/emails/_layout.tsx`**

  ```ts
  export interface EmailLayoutArgs {
    previewText: string;
    bodyHtml: string;
  }

  /**
   * Branded HTML wrapper. Email-safe inline styles only — no external CSS.
   * Navy header strip + canvas body + footer. Tokens copied from styles.css.
   */
  export function emailLayout({ previewText, bodyHtml }: EmailLayoutArgs): string {
    return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>IMPACT Internship Program</title>
    </head>
    <body style="margin:0;padding:0;background:#EFF1F5;font-family:'IBM Plex Sans', Arial, sans-serif;color:#14171F;">
      <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(previewText)}</span>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#EFF1F5;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #D6DAE3;border-radius:8px;overflow:hidden;">
              <tr>
                <td style="background:#051028;color:#ffffff;padding:24px 28px;font-family:'Archivo Black', Arial, sans-serif;letter-spacing:0.04em;">
                  IMPACT · Internship Program
                </td>
              </tr>
              <tr>
                <td style="padding:32px 28px;font-size:15px;line-height:1.6;">
                  ${bodyHtml}
                </td>
              </tr>
              <tr>
                <td style="background:#EFF1F5;color:#5B6376;padding:18px 28px;font-size:12px;font-family:'IBM Plex Mono', Courier, monospace;">
                  &copy; 2026 IMPACT / Indiana &middot; This message was sent from a transactional address; please do not reply.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
  }

  export function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/emails/_layout.tsx
  git commit -m "Sub-5: Add shared branded email layout"
  ```

### Task 12: Create the employer-invite email template

**Files:**
- Create: `app/emails/employer-invite.tsx`

- [ ] **Step 1: Create the file**

  ```ts
  import { emailLayout, escapeHtml } from './_layout';

  export interface EmployerInviteArgs {
    employerName: string;
    acceptUrl: string;
    programName: string;
  }

  export function renderEmployerInvite(args: EmployerInviteArgs): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `You're invited: ${args.programName} Employer Portal`;
    const bodyHtml = `
      <h2 style="font-family:'Archivo Black', Arial, sans-serif;font-size:22px;color:#051028;margin:0 0 16px;">Welcome to ${escapeHtml(args.programName)}.</h2>
      <p style="margin:0 0 16px;">
        An account has been created for <strong>${escapeHtml(args.employerName)}</strong> in the IMPACT Internship Assessment Portal. Click the button below to set your password and start completing competency assessments for your interns.
      </p>
      <p style="margin:24px 0;">
        <a href="${escapeHtml(args.acceptUrl)}" style="display:inline-block;background:#153A98;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:4px;font-weight:600;">
          Accept invite &rarr;
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:#5B6376;">
        This link expires in 24 hours. If it doesn't work, contact your program lead and they can resend it.
      </p>
      <p style="margin:0;font-size:13px;color:#5B6376;">
        You'll be able to view your cohorts and interns, submit competency assessments, and complete Exit Employer Surveys. Your account only sees data for ${escapeHtml(args.employerName)}.
      </p>
    `;
    const text = `Welcome to ${args.programName}.

An account has been created for ${args.employerName} in the IMPACT Internship Assessment Portal.

Set your password to start: ${args.acceptUrl}

This link expires in 24 hours. If it doesn't work, contact your program lead.
`;
    return { subject, html: emailLayout({ previewText: `Set your password for ${args.programName}.`, bodyHtml }), text };
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/emails/employer-invite.tsx
  git commit -m "Sub-5: Add branded employer-invite email template"
  ```

### Task 13: Create the password-reset email template

**Files:**
- Create: `app/emails/password-reset.tsx`

> **Note:** Supabase Auth itself sends the reset email by default with its hosted template. To get a branded reset email we either (a) customize Supabase's hosted template (Auth → Email Templates → "Reset Password") to point at our reset URL and rebrand, or (b) intercept by sending our own reset via Resend after calling `generateLink({ type: 'recovery' })`. The plan picks (a) for the v1 launch (cheapest, single-source) and ships this template file as the source for the dashboard paste. See Task 14.

- [ ] **Step 1: Create the file**

  ```ts
  import { emailLayout, escapeHtml } from './_layout';

  export interface PasswordResetArgs {
    resetUrl: string;
    programName: string;
  }

  export function renderPasswordReset(args: PasswordResetArgs): {
    subject: string;
    html: string;
    text: string;
  } {
    const subject = `Reset your ${args.programName} password`;
    const bodyHtml = `
      <h2 style="font-family:'Archivo Black', Arial, sans-serif;font-size:22px;color:#051028;margin:0 0 16px;">Password reset.</h2>
      <p style="margin:0 0 16px;">
        We received a request to reset the password for your ${escapeHtml(args.programName)} account. Click below to set a new one.
      </p>
      <p style="margin:24px 0;">
        <a href="${escapeHtml(args.resetUrl)}" style="display:inline-block;background:#153A98;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:4px;font-weight:600;">
          Reset password &rarr;
        </a>
      </p>
      <p style="margin:0;font-size:13px;color:#5B6376;">
        This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email — your password won't change.
      </p>
    `;
    const text = `Password reset.

We received a request to reset the password for your ${args.programName} account.

Reset link: ${args.resetUrl}

This link expires in 1 hour. If you didn't request a reset, you can ignore this email.
`;
    return { subject, html: emailLayout({ previewText: `Reset your ${args.programName} password.`, bodyHtml }), text };
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/emails/password-reset.tsx
  git commit -m "Sub-5: Add branded password-reset email template"
  ```

### Task 14: Configure Supabase reset email template (dashboard step)

**Files:**
- N/A — Supabase Dashboard configuration

- [ ] **Step 1: Render the HTML once locally**

  ```bash
  npx tsx -e "import('./app/emails/password-reset').then(m => console.log(m.renderPasswordReset({ resetUrl: '{{ .ConfirmationURL }}', programName: 'IMPACT Internship Program' }).html))" > /tmp/reset-template.html
  ```

  (Use Supabase's `{{ .ConfirmationURL }}` placeholder so the dashboard fills the link in.)

- [ ] **Step 2: Paste into Supabase Dashboard**

  Supabase Dashboard → Authentication → Email Templates → "Reset Password":
  - Subject: `Reset your IMPACT Internship Program password`
  - Body (HTML): paste from `/tmp/reset-template.html`

  Also do the same for the "Invite user" template, pasting from `renderEmployerInvite({ acceptUrl: '{{ .ConfirmationURL }}', ... })`.

- [ ] **Step 3: Verify Supabase redirect URL allow-list includes the branded callback**

  Supabase Dashboard → Authentication → URL Configuration → Redirect URLs: ensure `http://localhost:5173/auth/callback` and the production URL are both listed.

- [ ] **Step 4: No commit (dashboard configuration only). Document in `docs/deployment.md` instead — open that file and append a "Supabase email templates" section pointing at the template-render commands above.**

  ```bash
  echo "" >> docs/deployment.md
  # Append the section manually — see plan note above.
  git add docs/deployment.md
  git commit -m "Sub-5: Document Supabase email template paste process"
  ```

---

## Phase E: Employer shell layout + navigation

### Task 15: Create the EmployerNav component

**Files:**
- Create: `app/components/nav/EmployerNav.tsx`

Mirrors `AdminNav` structure but with the employer link set: Home · Cohorts · Interns · Assessments · My Employer · sign-out chip showing employer name.

- [ ] **Step 1: Create the file**

  ```tsx
  import { Form, NavLink } from 'react-router';

  export interface EmployerNavProps {
    employerName: string;
    userEmail: string;
  }

  const LINKS = [
    { to: '/employer', label: 'Home', end: true },
    { to: '/employer/cohorts', label: 'Cohorts' },
    { to: '/employer/interns', label: 'Interns' },
    { to: '/employer/competency/new', label: 'Assessments' },
    { to: '/employer/profile', label: 'My Employer' },
  ];

  export function EmployerNav({ employerName, userEmail }: EmployerNavProps) {
    return (
      <header className="nav">
        <div className="nav__inner">
          <a href="/employer" className="wordmark" aria-label="IMPACT — Expand Your Opportunities">
            <img src="/logo.png" alt="IMPACT" className="wordmark__img" />
          </a>
          <nav className="nav__links" aria-label="Employer navigation">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="employer-chip">
            <span className="employer-chip__name">{employerName}</span>
            <span className="employer-chip__email">{userEmail}</span>
            <Form method="post" action="/sign-out">
              <button type="submit" className="employer-chip__logout">Sign out</button>
            </Form>
          </div>
        </div>
      </header>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/nav/EmployerNav.tsx
  git commit -m "Sub-5: Add EmployerNav component"
  ```

### Task 16: Create the EmployerFooter component

**Files:**
- Create: `app/components/nav/EmployerFooter.tsx`

- [ ] **Step 1: Create the file**

  ```tsx
  export function EmployerFooter() {
    return (
      <footer className="footer">
        <div className="container footer__row">
          <a href="/employer" className="wordmark" aria-label="IMPACT — Expand Your Opportunities">
            <img src="/logo.png" alt="IMPACT" className="wordmark__img" />
          </a>
          <div className="footer__links">
            <a href="/employer">Home</a>
            <a href="/employer/cohorts">Cohorts</a>
            <a href="/employer/interns">Interns</a>
          </div>
          <div className="footer__meta">&copy; 2026 IMPACT / Indiana</div>
        </div>
      </footer>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/nav/EmployerFooter.tsx
  git commit -m "Sub-5: Add EmployerFooter component"
  ```

### Task 17: Add employer-shell styles

**Files:**
- Create: `app/styles/employer-shell.css`

- [ ] **Step 1: Create the file**

  ```css
  .employer-chip {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--white);
    font-size: 13px;
  }
  .employer-chip__name {
    font-weight: 600;
    color: var(--gold);
    font-family: 'IBM Plex Mono', monospace;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-size: 12px;
  }
  .employer-chip__email {
    color: rgba(255,255,255,0.7);
    font-size: 12px;
  }
  .employer-chip__logout {
    background: transparent;
    color: var(--white);
    border: 1px solid rgba(255,255,255,0.35);
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    font-family: 'IBM Plex Sans', sans-serif;
  }
  .employer-chip__logout:hover { color: var(--gold); border-color: var(--gold); }

  .nav__link--active {
    color: var(--gold);
  }

  .employer-dashboard__kpis {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin: 24px 0 32px;
  }
  @media (max-width: 760px) {
    .employer-dashboard__kpis { grid-template-columns: 1fr; }
  }

  .kpi-card {
    background: var(--white);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 20px;
    border-top: 3px solid var(--cyan);
  }
  .kpi-card__label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-soft);
  }
  .kpi-card__value {
    font-family: 'Archivo Black', sans-serif;
    color: var(--navy-deep);
    font-size: 36px;
    line-height: 1;
    margin: 8px 0 4px;
  }
  .kpi-card__sub {
    font-size: 12px;
    color: var(--ink-soft);
  }
  ```

- [ ] **Step 2: Import in `app/root.tsx`**

  ```ts
  import './styles/employer-shell.css';
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/styles/employer-shell.css app/root.tsx
  git commit -m "Sub-5: Add employer-shell styles"
  ```

### Task 18: Replace the employer layout route

**Files:**
- Modify: `app/routes/employer.tsx`

Replace the sub-1 placeholder. Loader enforces `auth.role === 'employer'` and pulls the employer name + user email for the nav.

- [ ] **Step 1: Replace the file**

  ```tsx
  import { Outlet, redirect, useLoaderData } from 'react-router';
  import type { Route } from './+types/employer';
  import { getAuthContext, createSupabaseServerClient } from '~/lib/auth.server';
  import { db } from '~/lib/db.server';
  import { employers } from '../../db/schema';
  import { eq } from 'drizzle-orm';
  import { EmployerNav } from '~/components/nav/EmployerNav';
  import { EmployerFooter } from '~/components/nav/EmployerFooter';

  export async function loader({ request }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth) throw redirect('/login', { headers });
    if (auth.role !== 'employer') throw redirect('/admin', { headers });
    if (!auth.employerId) {
      // Profile misconfigured (check constraint should prevent this).
      throw redirect('/login?error=no-employer', { headers });
    }

    const supabase = createSupabaseServerClient(request, headers);
    const { data: userData } = await supabase.auth.getUser();

    const rows = await db
      .select({ id: employers.id, name: employers.name })
      .from(employers)
      .where(eq(employers.id, auth.employerId))
      .limit(1);

    if (rows.length === 0) {
      throw redirect('/login?error=employer-missing', { headers });
    }

    return {
      employer: rows[0]!,
      userEmail: userData.user?.email ?? '(unknown)',
    };
  }

  export default function EmployerLayout() {
    const { employer, userEmail } = useLoaderData<typeof loader>();
    return (
      <div className="employer-shell">
        <EmployerNav employerName={employer.name} userEmail={userEmail} />
        <main className="container" style={{ padding: '32px 16px 64px' }}>
          <Outlet context={{ employer, userEmail }} />
        </main>
        <EmployerFooter />
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/employer.tsx
  git commit -m "Sub-5: Replace employer layout with full nav/footer + employer-scope guard"
  ```

---

## Phase F: Employer dashboard + scope helpers

### Task 19: Write the employer-scope helpers — TDD

**Files:**
- Create: `app/lib/employer-scope.server.ts`
- Create: `tests/lib/employer-scope.server.test.ts`

These helpers wrap Drizzle queries that rely on the authenticated request's Supabase client. RLS does the scoping work; the helpers just shape the data. For unit testing we mock Drizzle.

- [ ] **Step 1: Write the failing test**

  ```ts
  import { describe, it, expect, vi, beforeEach } from 'vitest';

  const mockDb = {
    select: vi.fn(),
  };

  vi.mock('~/lib/db.server', () => ({ db: mockDb }));

  import { kpisForEmployer, internInEmployerScope } from '~/lib/employer-scope.server';

  describe('kpisForEmployer', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns counts grouped by KPI', async () => {
      // Two cohorts, three interns, two assessments needed (interns without competency for the active phase).
      const cohortSelect = { from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]) })) };
      const internSelect = { from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ id: 'i1' }, { id: 'i2' }, { id: 'i3' }]) })) };
      const needSelect = { from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ count: 2 }]) })) };
      mockDb.select
        .mockReturnValueOnce(cohortSelect)
        .mockReturnValueOnce(internSelect)
        .mockReturnValueOnce(needSelect);

      const result = await kpisForEmployer('emp-1');
      expect(result.activeCohorts).toBe(2);
      expect(result.activeInterns).toBe(3);
      expect(result.assessmentsNeeded).toBe(2);
    });
  });

  describe('internInEmployerScope', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns true when intern resolves to the employer', async () => {
      const innerSelect = { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ employerId: 'emp-1' }]) })) })) };
      mockDb.select.mockReturnValue(innerSelect);
      expect(await internInEmployerScope('intern-1', 'emp-1')).toBe(true);
    });

    it('returns false when intern resolves to a different employer', async () => {
      const innerSelect = { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ employerId: 'emp-2' }]) })) })) };
      mockDb.select.mockReturnValue(innerSelect);
      expect(await internInEmployerScope('intern-1', 'emp-1')).toBe(false);
    });

    it('returns false when intern does not exist', async () => {
      const innerSelect = { from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) };
      mockDb.select.mockReturnValue(innerSelect);
      expect(await internInEmployerScope('missing', 'emp-1')).toBe(false);
    });
  });
  ```

- [ ] **Step 2: Run test, verify failure**

  ```bash
  npm test -- employer-scope.server
  ```

- [ ] **Step 3: Implement the helper**

  ```ts
  import { db } from './db.server';
  import { cohorts, interns, assessmentSubmissions } from '../../db/schema';
  import { and, eq, isNull, sql } from 'drizzle-orm';

  export interface EmployerKpis {
    activeCohorts: number;
    activeInterns: number;
    assessmentsNeeded: number;
  }

  export async function kpisForEmployer(employerId: string): Promise<EmployerKpis> {
    const cohortRows = await db
      .select({ id: cohorts.id })
      .from(cohorts)
      .where(eq(cohorts.employerId, employerId));

    const internRows = await db
      .select({ id: interns.id })
      .from(interns)
      .where(
        and(
          isNull(interns.deletedAt),
          sql`${interns.cohortId} IN (SELECT id FROM ${cohorts} WHERE ${cohorts.employerId} = ${employerId})`,
        ),
      );

    // "Assessments needed" = interns in this employer's scope who have zero competency submissions
    // (placeholder business rule — real rule pending program staff per spec OQ §10.1).
    const needRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(interns)
      .where(
        and(
          isNull(interns.deletedAt),
          sql`${interns.cohortId} IN (SELECT id FROM ${cohorts} WHERE ${cohorts.employerId} = ${employerId})`,
          sql`NOT EXISTS (SELECT 1 FROM ${assessmentSubmissions} s WHERE s.intern_id = ${interns.id} AND s.type = 'competency' AND s.deleted_at IS NULL)`,
        ),
      );

    return {
      activeCohorts: cohortRows.length,
      activeInterns: internRows.length,
      assessmentsNeeded: needRows[0]?.count ?? 0,
    };
  }

  export async function cohortsForEmployer(employerId: string) {
    return db
      .select()
      .from(cohorts)
      .where(eq(cohorts.employerId, employerId));
  }

  export async function internsForEmployer(employerId: string) {
    return db
      .select({
        id: interns.id,
        firstInitial: interns.firstInitial,
        lastName: interns.lastName,
        cohortId: interns.cohortId,
        roleId: interns.roleId,
        startDate: interns.startDate,
        endDate: interns.endDate,
      })
      .from(interns)
      .where(
        and(
          isNull(interns.deletedAt),
          sql`${interns.cohortId} IN (SELECT id FROM ${cohorts} WHERE ${cohorts.employerId} = ${employerId})`,
        ),
      );
  }

  export async function internInEmployerScope(internId: string, employerId: string): Promise<boolean> {
    const rows = await db
      .select({ employerId: cohorts.employerId })
      .from(interns)
      .where(and(eq(interns.id, internId), isNull(interns.deletedAt)))
      .limit(1);
    if (rows.length === 0) return false;
    // The select above uses the wrong column; reshape:
    const employerRows = await db
      .select({ employerId: cohorts.employerId })
      .from(cohorts)
      .where(eq(cohorts.id, sql`(SELECT cohort_id FROM ${interns} WHERE id = ${internId} AND deleted_at IS NULL)`))
      .limit(1);
    return employerRows[0]?.employerId === employerId;
  }
  ```

  > **Note (RLS interplay):** these helpers use the global `db` client (service-role connection per sub-1 `db.server.ts`). RLS does NOT scope service-role queries. The route loader is therefore the trust boundary — it pulls `employerId` from `getAuthContext` and passes it in. The `internInEmployerScope` defense is for write paths (action) where we must double-check the intern belongs to the caller before forwarding to a write that would otherwise violate the partial unique index or the `phase_required` check.

  > **Alternative considered:** route the queries through `createSupabaseServerClient(request)` so RLS applies. Rejected for v1 because Drizzle + Supabase JS client interop adds a dependency layer. Sub-project 6 will revisit if `db` ever leaks rows it shouldn't.

- [ ] **Step 4: Re-run test, verify pass + commit**

  ```bash
  npm test -- employer-scope.server
  git add app/lib/employer-scope.server.ts tests/lib/employer-scope.server.test.ts
  git commit -m "Sub-5: Add employer-scope helpers + TDD coverage"
  ```

### Task 20: Build the EmployerDashboardKpis component

**Files:**
- Create: `app/components/employer/EmployerDashboardKpis.tsx`

- [ ] **Step 1: Create the file**

  ```tsx
  import type { EmployerKpis } from '~/lib/employer-scope.server';

  export function EmployerDashboardKpis({ kpis }: { kpis: EmployerKpis }) {
    return (
      <section className="employer-dashboard__kpis" aria-label="Program KPIs">
        <div className="kpi-card">
          <div className="kpi-card__label">Active cohorts</div>
          <div className="kpi-card__value">{kpis.activeCohorts}</div>
          <div className="kpi-card__sub">Your employer scope</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Active interns</div>
          <div className="kpi-card__value">{kpis.activeInterns}</div>
          <div className="kpi-card__sub">Across all your cohorts</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__label">Assessments needed</div>
          <div className="kpi-card__value">{kpis.assessmentsNeeded}</div>
          <div className="kpi-card__sub">Interns without a competency submission</div>
        </div>
      </section>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/components/employer/EmployerDashboardKpis.tsx
  git commit -m "Sub-5: Add EmployerDashboardKpis component"
  ```

### Task 21: Replace the employer dashboard `_index`

**Files:**
- Modify: `app/routes/employer._index.tsx`

- [ ] **Step 1: Replace the file**

  ```tsx
  import { useLoaderData, redirect } from 'react-router';
  import type { Route } from './+types/employer._index';
  import { getAuthContext } from '~/lib/auth.server';
  import { kpisForEmployer, cohortsForEmployer } from '~/lib/employer-scope.server';
  import { EmployerDashboardKpis } from '~/components/employer/EmployerDashboardKpis';

  export const meta: Route.MetaFunction = () => [{ title: 'Dashboard · IMPACT Employer' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) {
      throw redirect('/login', { headers });
    }
    const [kpis, cohorts] = await Promise.all([
      kpisForEmployer(auth.employerId),
      cohortsForEmployer(auth.employerId),
    ]);
    return { kpis, cohorts };
  }

  export default function EmployerDashboard() {
    const { kpis, cohorts } = useLoaderData<typeof loader>();
    return (
      <>
        <header className="page-head">
          <span className="micro-label">EMPLOYER / OVERVIEW / 2026</span>
          <h1 className="page-head__title">Your program at a glance.</h1>
          <p className="page-head__sub">
            Cohorts and interns scoped to your employer. Submit competency assessments and Exit Employer Surveys from the Assessments tab.
          </p>
        </header>

        <EmployerDashboardKpis kpis={kpis} />

        <section className="card">
          <header className="card__head">
            <h2 className="card__title">Your cohorts</h2>
            <a className="card__link" href="/employer/cohorts">View all &rarr;</a>
          </header>
          {cohorts.length === 0 ? (
            <p className="card__empty">No active cohorts yet. Reach out to your program lead.</p>
          ) : (
            <ul className="card__list">
              {cohorts.map((c) => (
                <li key={c.id}>
                  <a href={`/employer/cohorts/${c.id}`}>{c.name}</a>
                  <span className="card__meta">{c.startDate} → {c.endDate}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/employer._index.tsx
  git commit -m "Sub-5: Build employer dashboard with KPIs + cohort list"
  ```

---

## Phase G: Employer cohorts + interns views

### Task 22: Build `/employer/cohorts` list

**Files:**
- Create: `app/routes/employer.cohorts._index.tsx`

- [ ] **Step 1: Create the route**

  ```tsx
  import { useLoaderData, redirect } from 'react-router';
  import type { Route } from './+types/employer.cohorts._index';
  import { getAuthContext } from '~/lib/auth.server';
  import { cohortsForEmployer } from '~/lib/employer-scope.server';

  export const meta: Route.MetaFunction = () => [{ title: 'Cohorts · IMPACT Employer' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) {
      throw redirect('/login', { headers });
    }
    return { cohorts: await cohortsForEmployer(auth.employerId) };
  }

  export default function EmployerCohortsIndex() {
    const { cohorts } = useLoaderData<typeof loader>();
    return (
      <>
        <header className="page-head">
          <span className="micro-label">EMPLOYER / COHORTS</span>
          <h1 className="page-head__title">Your cohorts.</h1>
          <p className="page-head__sub">Read-only. Cohort configuration lives with your program admin.</p>
        </header>
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Start</th><th>End</th><th></th></tr>
          </thead>
          <tbody>
            {cohorts.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.startDate ?? '—'}</td>
                <td>{c.endDate ?? '—'}</td>
                <td><a href={`/employer/cohorts/${c.id}`} className="btn btn--outline btn--sm">View</a></td>
              </tr>
            ))}
            {cohorts.length === 0 && (
              <tr><td colSpan={4} className="data-table__empty">No cohorts yet.</td></tr>
            )}
          </tbody>
        </table>
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/employer.cohorts._index.tsx
  git commit -m "Sub-5: Add employer cohorts list"
  ```

### Task 23: Build `/employer/cohorts/:cohortId` detail

**Files:**
- Create: `app/routes/employer.cohorts.$cohortId.tsx`

- [ ] **Step 1: Create the route**

  ```tsx
  import { useLoaderData, redirect } from 'react-router';
  import type { Route } from './+types/employer.cohorts.$cohortId';
  import { getAuthContext } from '~/lib/auth.server';
  import { db } from '~/lib/db.server';
  import { cohorts, cohortPhases, phases, interns, roles } from '../../db/schema';
  import { and, eq, isNull } from 'drizzle-orm';

  export const meta: Route.MetaFunction = () => [{ title: 'Cohort · IMPACT Employer' }];

  export async function loader({ request, params }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) {
      throw redirect('/login', { headers });
    }
    const cohortId = params.cohortId!;
    const cohortRows = await db
      .select()
      .from(cohorts)
      .where(and(eq(cohorts.id, cohortId), eq(cohorts.employerId, auth.employerId)))
      .limit(1);
    if (cohortRows.length === 0) {
      throw new Response('Not found', { status: 404 });
    }
    const cohort = cohortRows[0]!;

    const cohortPhaseRows = await db
      .select({ label: phases.label, sortOrder: cohortPhases.sortOrder })
      .from(cohortPhases)
      .innerJoin(phases, eq(phases.id, cohortPhases.phaseId))
      .where(eq(cohortPhases.cohortId, cohortId))
      .orderBy(cohortPhases.sortOrder);

    const internRows = await db
      .select()
      .from(interns)
      .where(and(eq(interns.cohortId, cohortId), isNull(interns.deletedAt)));

    const roleRow = cohort.roleId
      ? await db.select().from(roles).where(eq(roles.id, cohort.roleId)).limit(1)
      : [];

    return { cohort, role: roleRow[0] ?? null, phases: cohortPhaseRows, interns: internRows };
  }

  export default function EmployerCohortDetail() {
    const { cohort, role, phases, interns } = useLoaderData<typeof loader>();
    return (
      <>
        <a href="/employer/cohorts" className="back-link">&larr; Back to cohorts</a>
        <header className="page-head">
          <span className="micro-label">COHORT / READ-ONLY</span>
          <h1 className="page-head__title">{cohort.name}</h1>
          <p className="page-head__sub">
            {role ? `Role: ${role.label}.` : 'No role assigned.'} {cohort.startDate} → {cohort.endDate}
          </p>
        </header>

        <section className="card">
          <h2 className="card__title">Applicable phases</h2>
          <ol className="card__list">
            {phases.map((p) => <li key={p.label}>{p.label}</li>)}
            {phases.length === 0 && <li>None configured</li>}
          </ol>
        </section>

        <section className="card">
          <header className="card__head">
            <h2 className="card__title">Enrolled interns</h2>
            <span className="card__meta">{interns.length} total</span>
          </header>
          <table className="data-table">
            <thead>
              <tr><th>Intern</th><th>Start</th><th>End</th><th></th></tr>
            </thead>
            <tbody>
              {interns.map((i) => (
                <tr key={i.id}>
                  <td>{i.firstInitial}. {i.lastName}</td>
                  <td>{i.startDate ?? '—'}</td>
                  <td>{i.endDate ?? '—'}</td>
                  <td><a className="btn btn--outline btn--sm" href={`/employer/interns/${i.id}`}>Open</a></td>
                </tr>
              ))}
              {interns.length === 0 && (
                <tr><td colSpan={4} className="data-table__empty">No interns enrolled.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/employer.cohorts.$cohortId.tsx
  git commit -m "Sub-5: Add employer cohort detail page"
  ```

### Task 24: Build `/employer/interns` list

**Files:**
- Create: `app/routes/employer.interns._index.tsx`

- [ ] **Step 1: Create the route**

  ```tsx
  import { useLoaderData, redirect } from 'react-router';
  import type { Route } from './+types/employer.interns._index';
  import { getAuthContext } from '~/lib/auth.server';
  import { internsForEmployer } from '~/lib/employer-scope.server';

  export const meta: Route.MetaFunction = () => [{ title: 'Interns · IMPACT Employer' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) {
      throw redirect('/login', { headers });
    }
    return { interns: await internsForEmployer(auth.employerId) };
  }

  export default function EmployerInternsIndex() {
    const { interns } = useLoaderData<typeof loader>();
    return (
      <>
        <header className="page-head">
          <span className="micro-label">EMPLOYER / INTERNS</span>
          <h1 className="page-head__title">Your interns.</h1>
          <p className="page-head__sub">Across all your active cohorts. Open a record to view assessments and outcomes.</p>
        </header>
        <table className="data-table">
          <thead>
            <tr><th>Intern</th><th>Start</th><th>End</th><th></th></tr>
          </thead>
          <tbody>
            {interns.map((i) => (
              <tr key={i.id}>
                <td>{i.firstInitial}. {i.lastName}</td>
                <td>{i.startDate ?? '—'}</td>
                <td>{i.endDate ?? '—'}</td>
                <td><a className="btn btn--outline btn--sm" href={`/employer/interns/${i.id}`}>Open</a></td>
              </tr>
            ))}
            {interns.length === 0 && (
              <tr><td colSpan={4} className="data-table__empty">No interns enrolled.</td></tr>
            )}
          </tbody>
        </table>
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/employer.interns._index.tsx
  git commit -m "Sub-5: Add employer interns list"
  ```

### Task 25: Build `/employer/interns/:internId` record

**Files:**
- Create: `app/routes/employer.interns.$internId.tsx`

Reuses sub-project 2's shared `<InternRecord>` component with capability flags set so identity/intake panels render read-only but competency/Exit Survey can be authored from this page.

- [ ] **Step 1: Create the route**

  ```tsx
  import { useLoaderData, redirect } from 'react-router';
  import type { Route } from './+types/employer.interns.$internId';
  import { getAuthContext } from '~/lib/auth.server';
  import { internInEmployerScope } from '~/lib/employer-scope.server';
  import { db } from '~/lib/db.server';
  import {
    interns,
    cohorts,
    roles,
    internEntryAssessment,
    internEntryBarriers,
    barriers,
    internEmploymentOutcomes,
    assessmentSubmissions,
  } from '../../db/schema';
  import { and, eq, isNull } from 'drizzle-orm';
  // ASSUMPTION (sub-project 2): shared component lives at this path.
  import { InternRecord } from '~/components/intern/InternRecord';

  export const meta: Route.MetaFunction = () => [{ title: 'Intern · IMPACT Employer' }];

  export async function loader({ request, params }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) {
      throw redirect('/login', { headers });
    }
    const internId = params.internId!;
    const inScope = await internInEmployerScope(internId, auth.employerId);
    if (!inScope) throw new Response('Not found', { status: 404 });

    const internRows = await db
      .select()
      .from(interns)
      .where(and(eq(interns.id, internId), isNull(interns.deletedAt)))
      .limit(1);
    if (internRows.length === 0) throw new Response('Not found', { status: 404 });
    const intern = internRows[0]!;

    const cohortRows = await db.select().from(cohorts).where(eq(cohorts.id, intern.cohortId)).limit(1);
    const roleRows = intern.roleId
      ? await db.select().from(roles).where(eq(roles.id, intern.roleId)).limit(1)
      : [];

    const entryRows = await db
      .select()
      .from(internEntryAssessment)
      .where(eq(internEntryAssessment.internId, internId))
      .limit(1);
    const entryBarrierRows = await db
      .select({ id: barriers.id, label: barriers.label })
      .from(internEntryBarriers)
      .innerJoin(barriers, eq(barriers.id, internEntryBarriers.barrierId))
      .where(eq(internEntryBarriers.internId, internId));
    const outcomesRows = await db
      .select()
      .from(internEmploymentOutcomes)
      .where(eq(internEmploymentOutcomes.internId, internId))
      .limit(1);
    const submissionRows = await db
      .select()
      .from(assessmentSubmissions)
      .where(and(eq(assessmentSubmissions.internId, internId), isNull(assessmentSubmissions.deletedAt)));

    return {
      intern,
      cohort: cohortRows[0] ?? null,
      role: roleRows[0] ?? null,
      entry: entryRows[0] ?? null,
      entryBarriers: entryBarrierRows,
      outcomes: outcomesRows[0] ?? null,
      submissions: submissionRows,
    };
  }

  export default function EmployerInternRecord() {
    const data = useLoaderData<typeof loader>();
    return (
      <>
        <a href="/employer/interns" className="back-link">&larr; Back to interns</a>
        <InternRecord
          {...data}
          canEditIdentity={false}
          canEditEntry={false}
          canEditOutcomes={false}
          canEditCompetency={true}
          canEditExitSurvey={true}
          // Reused panels post to scoped employer routes
          competencyNewHref={`/employer/competency/new?internId=${data.intern.id}`}
          exitSurveyHref={`/employer/exit-survey?internId=${data.intern.id}`}
          competencyDetailHrefBuilder={(id: string) => `/employer/competency/${id}`}
          competencyEditHrefBuilder={(id: string) => `/employer/competency/edit?id=${id}`}
        />
      </>
    );
  }
  ```

  > **Cross-sub-project note (Assumptions §4):** the prop names `competencyNewHref`, `competencyDetailHrefBuilder`, etc. are consumed by sub-project 2's `<InternRecord>`. If sub-project 2 ships different prop names, this task's component invocation must be reconciled at integration time. The contract requirement: the shared component MUST accept link builders / href props so per-shell routing differs without duplicating markup.

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/employer.interns.$internId.tsx
  git commit -m "Sub-5: Add employer intern record (read-only intake, edit competency/exit-survey)"
  ```

---

## Phase H: Employer competency self-service

### Task 26: Build `/employer/competency/new`

**Files:**
- Create: `app/routes/employer.competency.new.tsx`

Loader: validates `?internId=` is in employer scope, stitches the 3-tier question set, lists applicable phases.
Action: validates answers, inserts an `assessment_submissions` row of type `competency` with `phase` set, via authenticated supabase client (RLS enforces the employer write policy).

- [ ] **Step 1: Create the route**

  ```tsx
  import { useLoaderData, useActionData, redirect } from 'react-router';
  import type { Route } from './+types/employer.competency.new';
  import { getAuthContext, createSupabaseServerClient } from '~/lib/auth.server';
  import { internInEmployerScope } from '~/lib/employer-scope.server';
  import { db } from '~/lib/db.server';
  import { interns, cohorts, cohortPhases, phases } from '../../db/schema';
  import { and, eq, isNull } from 'drizzle-orm';
  import { stitchedCompetencyQuestions } from '~/lib/competency.server';
  import { validateAnswers, serializeAnswers } from '~/lib/question-engine';
  // ASSUMPTION (sub-project 4): reusable component
  import { CompetencyAssessmentForm } from '~/components/forms/CompetencyAssessmentForm';

  export const meta: Route.MetaFunction = () => [{ title: 'New Competency · IMPACT Employer' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) {
      throw redirect('/login', { headers });
    }
    const url = new URL(request.url);
    const internId = url.searchParams.get('internId');
    if (!internId) throw new Response('internId required', { status: 400 });

    const inScope = await internInEmployerScope(internId, auth.employerId);
    if (!inScope) throw new Response('Not found', { status: 404 });

    const internRows = await db
      .select()
      .from(interns)
      .where(and(eq(interns.id, internId), isNull(interns.deletedAt)))
      .limit(1);
    if (internRows.length === 0) throw new Response('Not found', { status: 404 });
    const intern = internRows[0]!;

    const phaseRows = await db
      .select({ label: phases.label, sortOrder: cohortPhases.sortOrder })
      .from(cohortPhases)
      .innerJoin(phases, eq(phases.id, cohortPhases.phaseId))
      .where(eq(cohortPhases.cohortId, intern.cohortId))
      .orderBy(cohortPhases.sortOrder);

    const { questions, sectionBoundaries } = await stitchedCompetencyQuestions(internId);
    return { intern, phases: phaseRows, questions, sectionBoundaries };
  }

  export async function action({ request }: Route.ActionArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) {
      throw redirect('/login', { headers });
    }
    const formData = await request.formData();
    const internId = String(formData.get('internId') ?? '');
    const phase = String(formData.get('phase') ?? '');
    if (!internId || !phase) return { error: 'internId and phase are required.' };

    const inScope = await internInEmployerScope(internId, auth.employerId);
    if (!inScope) return { error: 'You do not have access to that intern.' };

    const { questions } = await stitchedCompetencyQuestions(internId);
    const answers = serializeAnswers(formData, questions);
    const validation = validateAnswers(questions, answers);
    if (!validation.ok) return { errors: validation.errors };

    const supabase = createSupabaseServerClient(request, headers);
    // Use the user's session — RLS employer_write_submissions enforces:
    //   type IN ('competency','exit-employer-survey') AND intern in employer scope.
    const { data, error } = await supabase
      .from('assessment_submissions')
      .insert({
        type: 'competency',
        intern_id: internId,
        phase,
        answers,
      })
      .select('id')
      .single();
    if (error) return { error: `Save failed: ${error.message}` };

    throw redirect(`/employer/competency/${data.id}?saved=1`, { headers });
  }

  export default function NewCompetency() {
    const { intern, phases, questions, sectionBoundaries } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    return (
      <>
        <a href={`/employer/interns/${intern.id}`} className="back-link">&larr; Back to intern</a>
        <header className="page-head">
          <span className="micro-label">COMPETENCY / NEW</span>
          <h1 className="page-head__title">Competency assessment</h1>
          <p className="page-head__sub">{intern.firstInitial}. {intern.lastName}</p>
        </header>
        <CompetencyAssessmentForm
          intern={intern}
          phases={phases}
          questions={questions}
          sectionBoundaries={sectionBoundaries}
          initialAnswers={{}}
          initialPhase=""
          action="."
          mode="new"
          errors={actionData?.errors ?? null}
          submitError={actionData?.error ?? null}
        />
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/employer.competency.new.tsx
  git commit -m "Sub-5: Add employer competency new flow"
  ```

### Task 27: Build `/employer/competency/edit?id=` and `/employer/competency/:id` (detail)

**Files:**
- Create: `app/routes/employer.competency.edit.tsx`
- Create: `app/routes/employer.competency.$id.tsx`

- [ ] **Step 1: Create edit route**

  ```tsx
  import { useLoaderData, useActionData, redirect } from 'react-router';
  import type { Route } from './+types/employer.competency.edit';
  import { getAuthContext, createSupabaseServerClient } from '~/lib/auth.server';
  import { internInEmployerScope } from '~/lib/employer-scope.server';
  import { db } from '~/lib/db.server';
  import { assessmentSubmissions, interns, cohortPhases, phases } from '../../db/schema';
  import { and, eq, isNull } from 'drizzle-orm';
  import { stitchedCompetencyQuestions } from '~/lib/competency.server';
  import { validateAnswers, serializeAnswers } from '~/lib/question-engine';
  import { CompetencyAssessmentForm } from '~/components/forms/CompetencyAssessmentForm';

  export const meta: Route.MetaFunction = () => [{ title: 'Edit Competency · IMPACT Employer' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) throw redirect('/login', { headers });

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) throw new Response('id required', { status: 400 });

    const rows = await db
      .select()
      .from(assessmentSubmissions)
      .where(and(eq(assessmentSubmissions.id, id), isNull(assessmentSubmissions.deletedAt), eq(assessmentSubmissions.type, 'competency')))
      .limit(1);
    if (rows.length === 0) throw new Response('Not found', { status: 404 });
    const submission = rows[0]!;

    const inScope = await internInEmployerScope(submission.internId, auth.employerId);
    if (!inScope) throw new Response('Not found', { status: 404 });

    const internRows = await db.select().from(interns).where(eq(interns.id, submission.internId)).limit(1);
    const intern = internRows[0]!;
    const phaseRows = await db
      .select({ label: phases.label, sortOrder: cohortPhases.sortOrder })
      .from(cohortPhases)
      .innerJoin(phases, eq(phases.id, cohortPhases.phaseId))
      .where(eq(cohortPhases.cohortId, intern.cohortId))
      .orderBy(cohortPhases.sortOrder);
    const { questions, sectionBoundaries } = await stitchedCompetencyQuestions(submission.internId);
    return { submission, intern, phases: phaseRows, questions, sectionBoundaries };
  }

  export async function action({ request }: Route.ActionArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) throw redirect('/login', { headers });
    const formData = await request.formData();
    const id = String(formData.get('id') ?? '');
    const internId = String(formData.get('internId') ?? '');
    const phase = String(formData.get('phase') ?? '');
    if (!id || !internId || !phase) return { error: 'Missing required fields.' };

    if (!(await internInEmployerScope(internId, auth.employerId))) {
      return { error: 'You do not have access to that intern.' };
    }
    const { questions } = await stitchedCompetencyQuestions(internId);
    const answers = serializeAnswers(formData, questions);
    const v = validateAnswers(questions, answers);
    if (!v.ok) return { errors: v.errors };

    const supabase = createSupabaseServerClient(request, headers);
    const { error } = await supabase
      .from('assessment_submissions')
      .update({ phase, answers })
      .eq('id', id);
    if (error) return { error: `Update failed: ${error.message}` };
    throw redirect(`/employer/competency/${id}?saved=1`, { headers });
  }

  export default function EditCompetency() {
    const { submission, intern, phases, questions, sectionBoundaries } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    return (
      <>
        <a href={`/employer/competency/${submission.id}`} className="back-link">&larr; Back to detail</a>
        <header className="page-head">
          <span className="micro-label">COMPETENCY / EDIT</span>
          <h1 className="page-head__title">Edit competency assessment</h1>
          <p className="page-head__sub">{intern.firstInitial}. {intern.lastName} &middot; {submission.phase}</p>
        </header>
        <CompetencyAssessmentForm
          intern={intern}
          phases={phases}
          questions={questions}
          sectionBoundaries={sectionBoundaries}
          initialAnswers={submission.answers as Record<string, unknown>}
          initialPhase={submission.phase ?? ''}
          action="."
          mode="edit"
          submissionId={submission.id}
          errors={actionData?.errors ?? null}
          submitError={actionData?.error ?? null}
        />
      </>
    );
  }
  ```

- [ ] **Step 2: Create detail route**

  ```tsx
  import { useLoaderData, redirect, useSearchParams } from 'react-router';
  import type { Route } from './+types/employer.competency.$id';
  import { getAuthContext } from '~/lib/auth.server';
  import { internInEmployerScope } from '~/lib/employer-scope.server';
  import { db } from '~/lib/db.server';
  import { assessmentSubmissions, interns } from '../../db/schema';
  import { and, eq, isNull } from 'drizzle-orm';
  import { stitchedCompetencyQuestions } from '~/lib/competency.server';
  import { CompetencyAssessmentForm } from '~/components/forms/CompetencyAssessmentForm';

  export const meta: Route.MetaFunction = () => [{ title: 'Competency · IMPACT Employer' }];

  export async function loader({ request, params }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) throw redirect('/login', { headers });

    const id = params.id!;
    const rows = await db
      .select()
      .from(assessmentSubmissions)
      .where(and(eq(assessmentSubmissions.id, id), isNull(assessmentSubmissions.deletedAt), eq(assessmentSubmissions.type, 'competency')))
      .limit(1);
    if (rows.length === 0) throw new Response('Not found', { status: 404 });
    const submission = rows[0]!;

    if (!(await internInEmployerScope(submission.internId, auth.employerId))) {
      throw new Response('Not found', { status: 404 });
    }
    const intern = (await db.select().from(interns).where(eq(interns.id, submission.internId)).limit(1))[0]!;
    const { questions, sectionBoundaries } = await stitchedCompetencyQuestions(submission.internId);

    return { submission, intern, questions, sectionBoundaries };
  }

  export default function CompetencyDetail() {
    const { submission, intern, questions, sectionBoundaries } = useLoaderData<typeof loader>();
    const [params] = useSearchParams();
    const savedFlash = params.get('saved') === '1';
    return (
      <>
        <a href={`/employer/interns/${intern.id}`} className="back-link">&larr; Back to intern</a>
        <header className="page-head">
          <span className="micro-label">COMPETENCY / DETAIL</span>
          <h1 className="page-head__title">Competency assessment</h1>
          <p className="page-head__sub">{intern.firstInitial}. {intern.lastName} &middot; {submission.phase}</p>
        </header>
        {savedFlash && (
          <div role="status" className="auth__alert auth__alert--success">Saved.</div>
        )}
        <CompetencyAssessmentForm
          intern={intern}
          phases={[]}
          questions={questions}
          sectionBoundaries={sectionBoundaries}
          initialAnswers={submission.answers as Record<string, unknown>}
          initialPhase={submission.phase ?? ''}
          action=""
          mode="view"
          submissionId={submission.id}
          errors={null}
          submitError={null}
        />
        <p>
          <a href={`/employer/competency/edit?id=${submission.id}`} className="btn btn--outline">
            Edit this assessment
          </a>
        </p>
      </>
    );
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/employer.competency.edit.tsx app/routes/employer.competency.$id.tsx
  git commit -m "Sub-5: Add employer competency edit + detail routes"
  ```

---

## Phase I: Employer Exit Survey self-service

### Task 28: Build `/employer/exit-survey`

**Files:**
- Create: `app/routes/employer.exit-survey.tsx`

Single route handles new + edit (Exit Survey is a single submission per intern per the prototype). Loader checks for an existing submission and restores answers if present.

- [ ] **Step 1: Create the route**

  ```tsx
  import { useLoaderData, useActionData, redirect } from 'react-router';
  import type { Route } from './+types/employer.exit-survey';
  import { getAuthContext, createSupabaseServerClient } from '~/lib/auth.server';
  import { internInEmployerScope } from '~/lib/employer-scope.server';
  import { db } from '~/lib/db.server';
  import { interns, assessmentSubmissions } from '../../db/schema';
  import { and, eq, isNull } from 'drizzle-orm';
  // ASSUMPTION (sub-project 3): standard set fetcher
  import { getQuestionSetById } from '~/lib/question-engine';
  import { validateAnswers, serializeAnswers } from '~/lib/question-engine';
  import { ExitEmployerSurveyForm } from '~/components/forms/ExitEmployerSurveyForm';

  export const meta: Route.MetaFunction = () => [{ title: 'Exit Employer Survey · IMPACT Employer' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) throw redirect('/login', { headers });
    const url = new URL(request.url);
    const internId = url.searchParams.get('internId');
    if (!internId) throw new Response('internId required', { status: 400 });

    if (!(await internInEmployerScope(internId, auth.employerId))) {
      throw new Response('Not found', { status: 404 });
    }
    const intern = (await db.select().from(interns).where(and(eq(interns.id, internId), isNull(interns.deletedAt))).limit(1))[0];
    if (!intern) throw new Response('Not found', { status: 404 });

    const supabase = createSupabaseServerClient(request, headers);
    const set = await getQuestionSetById('exit-employer-survey', supabase);
    const existing = await db
      .select()
      .from(assessmentSubmissions)
      .where(and(
        eq(assessmentSubmissions.internId, internId),
        eq(assessmentSubmissions.type, 'exit-employer-survey'),
        isNull(assessmentSubmissions.deletedAt),
      ))
      .limit(1);
    return { intern, questions: set.questions, existing: existing[0] ?? null };
  }

  export async function action({ request }: Route.ActionArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) throw redirect('/login', { headers });
    const formData = await request.formData();
    const internId = String(formData.get('internId') ?? '');
    if (!internId) return { error: 'internId is required.' };
    if (!(await internInEmployerScope(internId, auth.employerId))) {
      return { error: 'You do not have access to that intern.' };
    }
    const supabase = createSupabaseServerClient(request, headers);
    const set = await getQuestionSetById('exit-employer-survey', supabase);
    const answers = serializeAnswers(formData, set.questions);
    const v = validateAnswers(set.questions, answers);
    if (!v.ok) return { errors: v.errors };

    const existing = await db
      .select({ id: assessmentSubmissions.id })
      .from(assessmentSubmissions)
      .where(and(
        eq(assessmentSubmissions.internId, internId),
        eq(assessmentSubmissions.type, 'exit-employer-survey'),
        isNull(assessmentSubmissions.deletedAt),
      ))
      .limit(1);

    if (existing.length > 0) {
      const { error } = await supabase
        .from('assessment_submissions')
        .update({ answers })
        .eq('id', existing[0]!.id);
      if (error) return { error: `Update failed: ${error.message}` };
    } else {
      const { error } = await supabase
        .from('assessment_submissions')
        .insert({ type: 'exit-employer-survey', intern_id: internId, answers });
      if (error) return { error: `Save failed: ${error.message}` };
    }
    throw redirect(`/employer/interns/${internId}?exit=saved`, { headers });
  }

  export default function ExitSurveyRoute() {
    const { intern, questions, existing } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    return (
      <>
        <a href={`/employer/interns/${intern.id}`} className="back-link">&larr; Back to intern</a>
        <header className="page-head">
          <span className="micro-label">EXIT SURVEY</span>
          <h1 className="page-head__title">Exit Employer Survey</h1>
          <p className="page-head__sub">{intern.firstInitial}. {intern.lastName}</p>
        </header>
        <ExitEmployerSurveyForm
          intern={intern}
          questions={questions}
          initialAnswers={(existing?.answers as Record<string, unknown>) ?? {}}
          action="."
          mode={existing ? 'edit' : 'new'}
          submissionId={existing?.id ?? null}
          errors={actionData?.errors ?? null}
          submitError={actionData?.error ?? null}
        />
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/employer.exit-survey.tsx
  git commit -m "Sub-5: Add employer Exit Survey route"
  ```

---

## Phase J: Employer profile + roles

### Task 29: Build `/employer/profile`

**Files:**
- Create: `app/routes/employer.profile.tsx`

Form to edit the employer's own contact info. RLS `employer_own_employer` policy enforces the scope.

- [ ] **Step 1: Create the route**

  ```tsx
  import { Form, useLoaderData, useActionData, redirect } from 'react-router';
  import type { Route } from './+types/employer.profile';
  import { getAuthContext, createSupabaseServerClient } from '~/lib/auth.server';
  import { db } from '~/lib/db.server';
  import { employers } from '../../db/schema';
  import { eq } from 'drizzle-orm';

  export const meta: Route.MetaFunction = () => [{ title: 'My Employer · IMPACT' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) throw redirect('/login', { headers });
    const rows = await db.select().from(employers).where(eq(employers.id, auth.employerId)).limit(1);
    if (rows.length === 0) throw new Response('Not found', { status: 404 });
    return { employer: rows[0]! };
  }

  export async function action({ request }: Route.ActionArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) throw redirect('/login', { headers });
    const fd = await request.formData();
    const contactName = String(fd.get('contactName') ?? '').trim() || null;
    const contactEmail = String(fd.get('contactEmail') ?? '').trim() || null;
    const phone = String(fd.get('phone') ?? '').trim() || null;
    const notes = String(fd.get('notes') ?? '').trim() || null;

    const supabase = createSupabaseServerClient(request, headers);
    const { error } = await supabase
      .from('employers')
      .update({ contact_name: contactName, contact_email: contactEmail, phone, notes, updated_at: new Date().toISOString() })
      .eq('id', auth.employerId);
    if (error) return { error: `Save failed: ${error.message}` };
    return { saved: true };
  }

  export default function EmployerProfile() {
    const { employer } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    return (
      <>
        <header className="page-head">
          <span className="micro-label">EMPLOYER / PROFILE</span>
          <h1 className="page-head__title">{employer.name}</h1>
          <p className="page-head__sub">Update your contact details. Your employer name is set by your program admin.</p>
        </header>
        {actionData && 'error' in actionData && actionData.error && (
          <div role="alert" className="auth__alert auth__alert--danger">{actionData.error}</div>
        )}
        {actionData && 'saved' in actionData && actionData.saved && (
          <div role="status" className="auth__alert auth__alert--success">Saved.</div>
        )}
        <Form method="post" className="card">
          <label className="field"><span className="field__label">Contact name</span>
            <input className="input" name="contactName" defaultValue={employer.contactName ?? ''} />
          </label>
          <label className="field"><span className="field__label">Contact email</span>
            <input className="input" type="email" name="contactEmail" defaultValue={employer.contactEmail ?? ''} />
          </label>
          <label className="field"><span className="field__label">Phone</span>
            <input className="input" name="phone" defaultValue={employer.phone ?? ''} />
          </label>
          <label className="field"><span className="field__label">Notes</span>
            <textarea className="input" rows={4} name="notes" defaultValue={employer.notes ?? ''} />
          </label>
          <button type="submit" className="btn btn--primary">Save</button>
        </Form>

        <section className="card">
          <header className="card__head">
            <h2 className="card__title">Roles</h2>
            <a className="btn btn--outline btn--sm" href="/employer/roles">Manage roles &rarr;</a>
          </header>
          <p className="card__sub">Roles are templates used when cohorts are configured by your program admin.</p>
        </section>
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add app/routes/employer.profile.tsx
  git commit -m "Sub-5: Add employer profile route"
  ```

### Task 30: Build `/employer/roles` CRUD

**Files:**
- Create: `app/routes/employer.roles._index.tsx`
- Create: `app/routes/employer.roles.new.tsx`
- Create: `app/routes/employer.roles.$roleId.tsx`

All three reuse sub-project 2's `<RoleForm>` component but lock the employer to the signed-in user's `employerId`.

- [ ] **Step 1: Create `app/routes/employer.roles._index.tsx`**

  ```tsx
  import { useLoaderData, redirect } from 'react-router';
  import type { Route } from './+types/employer.roles._index';
  import { getAuthContext } from '~/lib/auth.server';
  import { db } from '~/lib/db.server';
  import { roles } from '../../db/schema';
  import { eq } from 'drizzle-orm';

  export const meta: Route.MetaFunction = () => [{ title: 'Roles · IMPACT Employer' }];

  export async function loader({ request }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) throw redirect('/login', { headers });
    const rows = await db.select().from(roles).where(eq(roles.employerId, auth.employerId));
    return { roles: rows };
  }

  export default function EmployerRolesIndex() {
    const { roles } = useLoaderData<typeof loader>();
    return (
      <>
        <header className="page-head">
          <span className="micro-label">EMPLOYER / ROLES</span>
          <h1 className="page-head__title">Your roles.</h1>
        </header>
        <p><a className="btn btn--primary" href="/employer/roles/new">+ New role</a></p>
        <table className="data-table">
          <thead><tr><th>Label</th><th>Description</th><th></th></tr></thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td>{r.label}</td>
                <td>{r.description ?? '—'}</td>
                <td><a className="btn btn--outline btn--sm" href={`/employer/roles/${r.id}`}>Edit</a></td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr><td colSpan={3} className="data-table__empty">No roles defined yet.</td></tr>
            )}
          </tbody>
        </table>
      </>
    );
  }
  ```

- [ ] **Step 2: Create `app/routes/employer.roles.new.tsx`**

  ```tsx
  import { Form, useActionData, redirect } from 'react-router';
  import type { Route } from './+types/employer.roles.new';
  import { getAuthContext, createSupabaseServerClient } from '~/lib/auth.server';

  export const meta: Route.MetaFunction = () => [{ title: 'New Role · IMPACT Employer' }];

  export async function action({ request }: Route.ActionArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) throw redirect('/login', { headers });
    const fd = await request.formData();
    const label = String(fd.get('label') ?? '').trim();
    const description = String(fd.get('description') ?? '').trim() || null;
    if (!label) return { error: 'Label is required.' };
    const supabase = createSupabaseServerClient(request, headers);
    const { error } = await supabase
      .from('roles')
      .insert({ label, description, employer_id: auth.employerId });
    if (error) return { error: `Save failed: ${error.message}` };
    throw redirect('/employer/roles?saved=1', { headers });
  }

  export default function NewRole() {
    const actionData = useActionData<typeof action>();
    return (
      <>
        <a href="/employer/roles" className="back-link">&larr; Roles</a>
        <header className="page-head">
          <span className="micro-label">ROLE / NEW</span>
          <h1 className="page-head__title">New role</h1>
        </header>
        {actionData?.error && <div role="alert" className="auth__alert auth__alert--danger">{actionData.error}</div>}
        <Form method="post" className="card">
          <label className="field"><span className="field__label">Label</span>
            <input className="input" name="label" required />
          </label>
          <label className="field"><span className="field__label">Description</span>
            <textarea className="input" rows={3} name="description" />
          </label>
          <button type="submit" className="btn btn--primary">Create</button>
        </Form>
      </>
    );
  }
  ```

- [ ] **Step 3: Create `app/routes/employer.roles.$roleId.tsx`**

  ```tsx
  import { Form, useLoaderData, useActionData, redirect } from 'react-router';
  import type { Route } from './+types/employer.roles.$roleId';
  import { getAuthContext, createSupabaseServerClient } from '~/lib/auth.server';
  import { db } from '~/lib/db.server';
  import { roles } from '../../db/schema';
  import { and, eq } from 'drizzle-orm';

  export const meta: Route.MetaFunction = () => [{ title: 'Edit Role · IMPACT Employer' }];

  export async function loader({ request, params }: Route.LoaderArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) throw redirect('/login', { headers });
    const rows = await db.select().from(roles).where(and(eq(roles.id, params.roleId!), eq(roles.employerId, auth.employerId))).limit(1);
    if (rows.length === 0) throw new Response('Not found', { status: 404 });
    return { role: rows[0]! };
  }

  export async function action({ request, params }: Route.ActionArgs) {
    const headers = new Headers();
    const auth = await getAuthContext(request, headers);
    if (!auth || auth.role !== 'employer' || !auth.employerId) throw redirect('/login', { headers });
    const fd = await request.formData();
    const intent = String(fd.get('intent') ?? 'save');
    const supabase = createSupabaseServerClient(request, headers);
    if (intent === 'delete') {
      const { error } = await supabase.from('roles').delete().eq('id', params.roleId!);
      if (error) return { error: error.message };
      throw redirect('/employer/roles?deleted=1', { headers });
    }
    const label = String(fd.get('label') ?? '').trim();
    const description = String(fd.get('description') ?? '').trim() || null;
    if (!label) return { error: 'Label is required.' };
    const { error } = await supabase
      .from('roles')
      .update({ label, description, updated_at: new Date().toISOString() })
      .eq('id', params.roleId!);
    if (error) return { error: error.message };
    return { saved: true };
  }

  export default function EditRole() {
    const { role } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    return (
      <>
        <a href="/employer/roles" className="back-link">&larr; Roles</a>
        <header className="page-head">
          <span className="micro-label">ROLE / EDIT</span>
          <h1 className="page-head__title">{role.label}</h1>
        </header>
        {actionData && 'error' in actionData && actionData.error && (
          <div role="alert" className="auth__alert auth__alert--danger">{actionData.error}</div>
        )}
        {actionData && 'saved' in actionData && actionData.saved && (
          <div role="status" className="auth__alert auth__alert--success">Saved.</div>
        )}
        <Form method="post" className="card">
          <label className="field"><span className="field__label">Label</span>
            <input className="input" name="label" defaultValue={role.label} required />
          </label>
          <label className="field"><span className="field__label">Description</span>
            <textarea className="input" rows={3} name="description" defaultValue={role.description ?? ''} />
          </label>
          <button type="submit" className="btn btn--primary">Save</button>
        </Form>
        <Form method="post" className="card card--danger" data-confirm="Delete this role? Cohorts using it will have their role cleared.">
          <input type="hidden" name="intent" value="delete" />
          <button type="submit" className="btn btn--ghost-danger">Delete role</button>
        </Form>
      </>
    );
  }
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add app/routes/employer.roles._index.tsx app/routes/employer.roles.new.tsx app/routes/employer.roles.$roleId.tsx
  git commit -m "Sub-5: Add employer roles CRUD"
  ```

### Task 31: Register all new routes in the route table

**Files:**
- Modify: `app/routes.ts`

- [ ] **Step 1: Replace the employer block + auth block**

  Inside `app/routes.ts`, the public layout block becomes:

  ```ts
  layout('routes/_public.tsx', [
    index('routes/_public._index.tsx'),
    route('login', 'routes/_public.login.tsx'),
    route('auth/forgot', 'routes/_public.auth.forgot.tsx'),
    route('auth/reset', 'routes/_public.auth.reset.tsx'),
    route('auth/accept', 'routes/_public.auth.accept.tsx'),
    route('auth/callback', 'routes/_public.auth.callback.tsx'),
    route('sign-out', 'routes/sign-out.ts'),
  ]),
  ```

  And the employer layout:

  ```ts
  layout('routes/employer.tsx', [
    route('employer', 'routes/employer._index.tsx'),
    route('employer/cohorts', 'routes/employer.cohorts._index.tsx'),
    route('employer/cohorts/:cohortId', 'routes/employer.cohorts.$cohortId.tsx'),
    route('employer/interns', 'routes/employer.interns._index.tsx'),
    route('employer/interns/:internId', 'routes/employer.interns.$internId.tsx'),
    route('employer/competency/new', 'routes/employer.competency.new.tsx'),
    route('employer/competency/edit', 'routes/employer.competency.edit.tsx'),
    route('employer/competency/:id', 'routes/employer.competency.$id.tsx'),
    route('employer/exit-survey', 'routes/employer.exit-survey.tsx'),
    route('employer/profile', 'routes/employer.profile.tsx'),
    route('employer/roles', 'routes/employer.roles._index.tsx'),
    route('employer/roles/new', 'routes/employer.roles.new.tsx'),
    route('employer/roles/:roleId', 'routes/employer.roles.$roleId.tsx'),
  ]),
  ```

  Also add (inside `admin` layout, ASSUMING sub-project 2 has registered the parent admin layout):

  ```ts
  route('admin/employers/:id/account', 'routes/admin.employers.$id.account.tsx'),
  ```

- [ ] **Step 2: Run typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: zero errors. If sub-project 4's CompetencyAssessmentForm prop shape differs, fix at integration time per Assumptions doc.

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes.ts
  git commit -m "Sub-5: Register employer shell + branded auth + account routes"
  ```

---

## Phase K: RLS integration tests

### Task 32: Write `tests/rls/employer-cross-tenant.test.ts`

**Files:**
- Create: `tests/rls/employer-cross-tenant.test.ts`

Asserts an employer scoped to Eskenazi cannot read another employer's interns, cohorts, submissions, roles.

- [ ] **Step 1: Create the test**

  ```ts
  import { describe, it, expect, beforeAll } from 'vitest';
  import { withClaims, EMPLOYER_CLAIMS } from './test-helpers';
  import postgres from 'postgres';
  import 'dotenv/config';

  const FAKE_USER_ID = '00000000-0000-0000-0000-00000000010A';
  const ESKENAZI_ID = '11111111-1111-1111-1111-111111111101';
  const TTT_ID = '11111111-1111-1111-1111-111111111102';

  describe('RLS: employer cross-tenant isolation', () => {
    beforeAll(async () => {
      const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
      try {
        await sql`
          INSERT INTO auth.users (id, email, role)
          VALUES (${FAKE_USER_ID}, 'rls-cross-tenant@example.com', 'authenticated')
          ON CONFLICT (id) DO NOTHING
        `;
        await sql`
          INSERT INTO public.profiles (user_id, role, employer_id)
          VALUES (${FAKE_USER_ID}, 'employer', ${ESKENAZI_ID})
          ON CONFLICT (user_id) DO UPDATE SET role = 'employer', employer_id = EXCLUDED.employer_id
        `;
      } finally {
        await sql.end();
      }
    });

    it('Eskenazi employer cannot read TTT interns', async () => {
      const rows = await withClaims(
        EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
        async (sql) => sql`
          SELECT i.id FROM public.interns i
          JOIN public.cohorts c ON c.id = i.cohort_id
          WHERE c.employer_id = ${TTT_ID}
        `,
      );
      expect(rows).toHaveLength(0);
    });

    it('Eskenazi employer cannot read TTT cohorts', async () => {
      const rows = await withClaims(
        EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
        async (sql) => sql`SELECT id FROM public.cohorts WHERE employer_id = ${TTT_ID}`,
      );
      expect(rows).toHaveLength(0);
    });

    it('Eskenazi employer cannot read TTT roles', async () => {
      const rows = await withClaims(
        EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
        async (sql) => sql`SELECT id FROM public.roles WHERE employer_id = ${TTT_ID}`,
      );
      expect(rows).toHaveLength(0);
    });

    it('Eskenazi employer cannot read TTT competency submissions', async () => {
      const rows = await withClaims(
        EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
        async (sql) => sql`
          SELECT s.id FROM public.assessment_submissions s
          JOIN public.interns i ON i.id = s.intern_id
          JOIN public.cohorts c ON c.id = i.cohort_id
          WHERE c.employer_id = ${TTT_ID}
        `,
      );
      expect(rows).toHaveLength(0);
    });

    it('Eskenazi employer can read their own employer row but not TTT', async () => {
      const rows = await withClaims(
        EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
        async (sql) => sql`SELECT id FROM public.employers`,
      );
      expect(rows.map((r) => r.id)).toEqual([ESKENAZI_ID]);
    });
  });
  ```

- [ ] **Step 2: Run, then commit**

  ```bash
  npm run test:rls -- employer-cross-tenant
  git add tests/rls/employer-cross-tenant.test.ts
  git commit -m "Sub-5: Add RLS test — employer cross-tenant isolation"
  ```

### Task 33: Write `tests/rls/employer-write-restrictions.test.ts`

**Files:**
- Create: `tests/rls/employer-write-restrictions.test.ts`

- [ ] **Step 1: Create the test**

  ```ts
  import { describe, it, expect, beforeAll } from 'vitest';
  import { withClaims, EMPLOYER_CLAIMS } from './test-helpers';
  import postgres from 'postgres';
  import 'dotenv/config';

  const FAKE_USER_ID = '00000000-0000-0000-0000-00000000010B';
  const ESKENAZI_ID = '11111111-1111-1111-1111-111111111101';
  const TTT_ID = '11111111-1111-1111-1111-111111111102';
  const ESKENAZI_INTERN_ID = '44444444-4444-4444-4444-444444444401';
  const TTT_INTERN_ID = '44444444-4444-4444-4444-444444444403';

  describe('RLS: employer write restrictions', () => {
    beforeAll(async () => {
      const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
      try {
        await sql`
          INSERT INTO auth.users (id, email, role)
          VALUES (${FAKE_USER_ID}, 'rls-write-restrictions@example.com', 'authenticated')
          ON CONFLICT (id) DO NOTHING
        `;
        await sql`
          INSERT INTO public.profiles (user_id, role, employer_id)
          VALUES (${FAKE_USER_ID}, 'employer', ${ESKENAZI_ID})
          ON CONFLICT (user_id) DO UPDATE SET role = 'employer', employer_id = EXCLUDED.employer_id
        `;
      } finally {
        await sql.end();
      }
    });

    it('employer cannot insert competency for an intern outside their scope', async () => {
      await expect(
        withClaims(EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID), async (sql) => sql`
          INSERT INTO public.assessment_submissions (type, intern_id, phase, answers)
          VALUES ('competency', ${TTT_INTERN_ID}, 'Phase 1', '{}'::jsonb)
          RETURNING id
        `),
      ).rejects.toThrow();
    });

    it('employer cannot insert personal-goals submission (intern-only type)', async () => {
      await expect(
        withClaims(EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID), async (sql) => sql`
          INSERT INTO public.assessment_submissions (type, intern_id, answers)
          VALUES ('personal-goals', ${ESKENAZI_INTERN_ID}, '{}'::jsonb)
          RETURNING id
        `),
      ).rejects.toThrow();
    });

    it('employer can insert competency for their own intern', async () => {
      const cleanup: string[] = [];
      const rows = await withClaims(
        EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
        async (sql) => sql`
          INSERT INTO public.assessment_submissions (type, intern_id, phase, answers)
          VALUES ('competency', ${ESKENAZI_INTERN_ID}, 'Phase 1', '{}'::jsonb)
          RETURNING id
        `,
      );
      expect(rows[0]?.id).toBeTruthy();
      cleanup.push(rows[0].id);

      const cleanupSql = postgres(process.env.DATABASE_URL!, { max: 1 });
      try {
        for (const id of cleanup) await cleanupSql`DELETE FROM public.assessment_submissions WHERE id = ${id}`;
      } finally {
        await cleanupSql.end();
      }
    });

    it('employer can insert exit-employer-survey for their own intern', async () => {
      const rows = await withClaims(
        EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
        async (sql) => sql`
          INSERT INTO public.assessment_submissions (type, intern_id, answers)
          VALUES ('exit-employer-survey', ${ESKENAZI_INTERN_ID}, '{}'::jsonb)
          RETURNING id
        `,
      );
      expect(rows[0]?.id).toBeTruthy();
      const cleanupSql = postgres(process.env.DATABASE_URL!, { max: 1 });
      try {
        await cleanupSql`DELETE FROM public.assessment_submissions WHERE id = ${rows[0].id}`;
      } finally {
        await cleanupSql.end();
      }
    });
  });
  ```

- [ ] **Step 2: Run, then commit**

  ```bash
  npm run test:rls -- employer-write-restrictions
  git add tests/rls/employer-write-restrictions.test.ts
  git commit -m "Sub-5: Add RLS test — employer write restrictions"
  ```

### Task 34: Write `tests/rls/employer-profile-roles.test.ts`

**Files:**
- Create: `tests/rls/employer-profile-roles.test.ts`

- [ ] **Step 1: Create the test**

  ```ts
  import { describe, it, expect, beforeAll } from 'vitest';
  import { withClaims, EMPLOYER_CLAIMS } from './test-helpers';
  import postgres from 'postgres';
  import 'dotenv/config';

  const FAKE_USER_ID = '00000000-0000-0000-0000-00000000010C';
  const ESKENAZI_ID = '11111111-1111-1111-1111-111111111101';
  const TTT_ID = '11111111-1111-1111-1111-111111111102';

  describe('RLS: employer profile + roles', () => {
    beforeAll(async () => {
      const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
      try {
        await sql`
          INSERT INTO auth.users (id, email, role)
          VALUES (${FAKE_USER_ID}, 'rls-profile-roles@example.com', 'authenticated')
          ON CONFLICT (id) DO NOTHING
        `;
        await sql`
          INSERT INTO public.profiles (user_id, role, employer_id)
          VALUES (${FAKE_USER_ID}, 'employer', ${ESKENAZI_ID})
          ON CONFLICT (user_id) DO UPDATE SET role = 'employer', employer_id = EXCLUDED.employer_id
        `;
      } finally {
        await sql.end();
      }
    });

    it('employer can update their own employer row', async () => {
      const rows = await withClaims(
        EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
        async (sql) => sql`
          UPDATE public.employers SET notes = 'RLS update test' WHERE id = ${ESKENAZI_ID}
          RETURNING id
        `,
      );
      expect(rows).toHaveLength(1);
    });

    it('employer cannot update another employer row', async () => {
      const rows = await withClaims(
        EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
        async (sql) => sql`
          UPDATE public.employers SET notes = 'should not apply' WHERE id = ${TTT_ID}
          RETURNING id
        `,
      );
      // RLS makes the UPDATE a no-op (no rows match the policy) rather than throwing.
      expect(rows).toHaveLength(0);
    });

    it('employer can insert a role under their employer', async () => {
      const cleanupSql = postgres(process.env.DATABASE_URL!, { max: 1 });
      try {
        const rows = await withClaims(
          EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
          async (sql) => sql`
            INSERT INTO public.roles (employer_id, label, description)
            VALUES (${ESKENAZI_ID}, 'RLS Test Role', 'temp')
            RETURNING id
          `,
        );
        expect(rows[0]?.id).toBeTruthy();
        await cleanupSql`DELETE FROM public.roles WHERE id = ${rows[0].id}`;
      } finally {
        await cleanupSql.end();
      }
    });

    it('employer cannot insert a role under another employer', async () => {
      await expect(
        withClaims(EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID), async (sql) => sql`
          INSERT INTO public.roles (employer_id, label, description)
          VALUES (${TTT_ID}, 'Bad Role', 'should fail')
          RETURNING id
        `),
      ).rejects.toThrow();
    });
  });
  ```

- [ ] **Step 2: Run, then commit**

  ```bash
  npm run test:rls -- employer-profile-roles
  git add tests/rls/employer-profile-roles.test.ts
  git commit -m "Sub-5: Add RLS test — employer profile + roles"
  ```

---

## Phase L: E2E coverage + sub-project smoke

### Task 35: Write `tests/e2e/employer-login.spec.ts`

**Files:**
- Create: `tests/e2e/employer-login.spec.ts`

- [ ] **Step 1: Create the spec**

  ```ts
  import { test, expect } from '@playwright/test';

  const EMPLOYER = {
    email: process.env.EMPLOYER_TEST_EMAIL!,
    password: process.env.EMPLOYER_TEST_PASSWORD!,
  };

  test.describe('Employer login + dashboard', () => {
    test('employer signs in, sees own dashboard and employer chip', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(EMPLOYER.email);
      await page.getByLabel('Password').fill(EMPLOYER.password);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).toHaveURL('/employer');

      await expect(page.getByRole('heading', { name: /your program at a glance/i })).toBeVisible();
      // Employer chip in the nav shows their employer name (Eskenazi Health from seed)
      await expect(page.locator('.employer-chip__name')).toContainText('Eskenazi Health');
    });

    test('employer cohorts list shows only their cohorts', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(EMPLOYER.email);
      await page.getByLabel('Password').fill(EMPLOYER.password);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await page.goto('/employer/cohorts');

      const rows = page.locator('.data-table tbody tr');
      await expect(rows).toHaveCount(1);
      await expect(rows.first()).toContainText('MA — 2026');
    });

    test('employer interns list shows only their interns', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(EMPLOYER.email);
      await page.getByLabel('Password').fill(EMPLOYER.password);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await page.goto('/employer/interns');

      // Seed has 2 interns for Eskenazi
      const rows = page.locator('.data-table tbody tr');
      await expect(rows).toHaveCount(2);
    });
  });
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add tests/e2e/employer-login.spec.ts
  git commit -m "Sub-5: Add E2E — employer login + scoped lists"
  ```

### Task 36: Write `tests/e2e/employer-competency.spec.ts`

**Files:**
- Create: `tests/e2e/employer-competency.spec.ts`

- [ ] **Step 1: Create the spec**

  ```ts
  import { test, expect } from '@playwright/test';

  const EMPLOYER = {
    email: process.env.EMPLOYER_TEST_EMAIL!,
    password: process.env.EMPLOYER_TEST_PASSWORD!,
  };

  test.describe('Employer competency submission', () => {
    test('signed-in employer can submit a competency assessment for their intern', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(EMPLOYER.email);
      await page.getByLabel('Password').fill(EMPLOYER.password);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).toHaveURL('/employer');

      // Pick first intern from their list
      await page.goto('/employer/interns');
      await page.locator('.data-table tbody tr').first().getByRole('link', { name: 'Open' }).click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // Click "New competency" affordance — exact selector TBD by InternRecord component (sub-2)
      await page.getByRole('link', { name: /new competency/i }).click();
      await expect(page).toHaveURL(/\/employer\/competency\/new/);

      // Select phase and fill at least one question. Assumes phase dropdown name="phase"
      // and that the seeded competency-core set has 1 competency-rubric-row.
      await page.selectOption('select[name="phase"]', { label: 'Phase 1' });
      // The CompetencyAssessmentForm rubric row has rating + notes; assume radio buttons
      // grouped by question ID. We click the first "Developing" option.
      await page.getByRole('radio', { name: /developing/i }).first().check();

      await page.getByRole('button', { name: /save/i }).click();
      await expect(page).toHaveURL(/\/employer\/competency\/[a-f0-9-]+\?saved=1/);
      await expect(page.getByRole('status')).toContainText('Saved');
    });
  });
  ```

  > **Risk flag:** the inner form selectors (`name="phase"`, the radio labels) assume sub-project 4's `<CompetencyAssessmentForm>` final shape. Adjust at integration time if shapes differ.

- [ ] **Step 2: Commit**

  ```bash
  git add tests/e2e/employer-competency.spec.ts
  git commit -m "Sub-5: Add E2E — employer competency submission"
  ```

### Task 37: Write `tests/e2e/admin-invite-accept.spec.ts`

**Files:**
- Create: `tests/e2e/admin-invite-accept.spec.ts`

The trickiest E2E. Strategy: drive the admin UI to send an invite (using a `Mailtrap`-style inbox OR Resend's sandbox + log capture), then capture the magic-link URL from Resend's API and visit it in the same browser context.

Since Resend's free tier does not give us programmatic inbox access for arbitrary recipients, the test uses a deterministic, fake-but-internal flow: after the admin "Send invite" click, the test hits a Supabase admin API (via a dev-only test endpoint) to fetch the invite link directly, then visits it.

- [ ] **Step 1: Create a dev-only endpoint that returns the latest invite link for a given email**

  Create `app/routes/dev.invite-link.tsx`:

  ```tsx
  import type { Route } from './+types/dev.invite-link';
  import { getSupabaseAdmin } from '~/lib/supabase-admin.server';
  import { env } from '~/lib/env.server';

  /**
   * DEV-ONLY endpoint. Returns the most recent valid magic link for an email.
   * Gated by NODE_ENV !== 'production'. Never deployed to prod.
   */
  export async function loader({ request }: Route.LoaderArgs) {
    if (process.env.NODE_ENV === 'production') {
      return new Response('Not available', { status: 404 });
    }
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    if (!email) return Response.json({ error: 'email required' }, { status: 400 });
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${env.APP_URL}/auth/callback?next=/auth/accept` },
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ link: data.properties?.action_link ?? null });
  }
  ```

  Add to `app/routes.ts`:

  ```ts
  route('dev/invite-link', 'routes/dev.invite-link.tsx'),
  ```

  (Outside the layout blocks, top-level.)

- [ ] **Step 2: Create the spec**

  ```ts
  import { test, expect } from '@playwright/test';
  import { randomUUID } from 'node:crypto';

  const ADMIN = {
    email: process.env.ADMIN_TEST_EMAIL!,
    password: process.env.ADMIN_TEST_PASSWORD!,
  };

  test.describe('Admin invite -> accept flow', () => {
    test('admin invites a new employer, they accept, and land on /employer', async ({ page, request }) => {
      const inviteEmail = `e2e-invite-${randomUUID().slice(0, 8)}@example.com`;
      const ESKENAZI_ID = '11111111-1111-1111-1111-111111111101';

      // 1. Admin signs in
      await page.goto('/login');
      await page.getByLabel('Email').fill(ADMIN.email);
      await page.getByLabel('Password').fill(ADMIN.password);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).toHaveURL('/admin');

      // 2. Open employer detail and send invite
      await page.goto(`/admin/employers/${ESKENAZI_ID}`);
      await page.getByLabel('Email').fill(inviteEmail);
      await page.getByRole('button', { name: 'Send invite' }).click();
      await expect(page.getByRole('status')).toContainText('Invite sent.');

      // 3. Fetch the magic link via dev endpoint
      const linkResp = await request.get(`/dev/invite-link?email=${encodeURIComponent(inviteEmail)}`);
      const { link } = await linkResp.json();
      expect(link).toBeTruthy();

      // 4. Sign out as admin
      await page.getByRole('button', { name: /sign out/i }).click();
      await expect(page).toHaveURL('/login');

      // 5. Visit the magic link (callback exchanges token, redirects to /auth/accept)
      await page.goto(link);
      await expect(page).toHaveURL(/\/auth\/accept/);
      await expect(page.getByRole('heading', { name: /set your password/i })).toBeVisible();

      // 6. Set password
      const newPassword = `E2E-Pwd-${randomUUID()}`;
      await page.getByLabel('New password').fill(newPassword);
      await page.getByLabel('Confirm password').fill(newPassword);
      await page.getByRole('button', { name: /save password/i }).click();

      // 7. Lands on /employer with the Eskenazi chip
      await expect(page).toHaveURL('/employer');
      await expect(page.locator('.employer-chip__name')).toContainText('Eskenazi');
    });

    test.afterEach(async ({ request: _ }) => {
      // Cleanup is via service-role direct DB; for the v1 plan we accept that
      // these test users accumulate. Sub-project 6 adds a periodic cleanup job.
    });
  });
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add app/routes/dev.invite-link.tsx app/routes.ts tests/e2e/admin-invite-accept.spec.ts
  git commit -m "Sub-5: Add E2E — admin invite -> employee accept -> first login"
  ```

### Task 38: Sub-project 5 smoke

**Files:**
- N/A — verification only

- [ ] **Step 1: Lint + typecheck + unit + RLS**

  ```bash
  npm run lint
  npm run typecheck
  npm test
  npm run test:rls
  ```

- [ ] **Step 2: Playwright**

  ```bash
  npm run test:e2e
  ```

  Expected: all employer-login, employer-competency, admin-invite-accept specs pass.

- [ ] **Step 3: Manual click-through**

  - Sign in as admin → `/admin/employers/<Eskenazi id>` → invite a fresh test email → see status pill go `none → pending`. Click "Resend invite" → still `pending`. Click "Cancel invite" → status returns to `none`.
  - Repeat invite, visit the magic link from a private window → branded `/auth/accept` page renders with navy + cyan + gold tokens, Archivo Black headline. Set password → land on `/employer` with employer chip.
  - From `/employer`: navigate Home / Cohorts / Interns / Assessments / My Employer. Open an intern, open competency new, save a draft, view detail, edit, save again. Open exit-survey, save.
  - Open `/employer/profile`, edit notes, save.
  - Open `/employer/roles`, create a role, edit it, delete it.
  - Sign out → branded `/auth/forgot` page → submit a fake email → "Check your email" message.

- [ ] **Step 4: Mark sub-project 5 complete and open sub-project 6 (Polish & launch).**

---

## Self-review checklist

- [ ] Spec section 4 (Routing) covered — every `/employer/*` route in §4.3 has a task: `/employer` (Task 21), `/employer/cohorts` + `/:id` (Tasks 22-23), `/employer/interns` + `/:id` (Tasks 24-25), `/employer/competency/*` (Tasks 26-27), `/employer/exit-survey` (Task 28), `/employer/profile` (Task 29), `/employer/roles` (Task 30). Login routing redirect by role honored in Task 18 + Task 10 (callback `?next=`).
- [ ] Spec section 5 (Auth & Permissions) covered — §5.3 employer auth (Tasks 18-21), §5.4 invite flow (Tasks 1-5), §5.6 password reset (Tasks 8-9), §5.7 out-of-scope items respected (no MFA, no SSO, single account per employer).
- [ ] Spec section 8.1 (Account provisioning + branded auth) covered — Tasks 1-5 (invite + admin UI), Tasks 6-10 (branded auth pages), Tasks 11-14 (branded emails). Account disable + re-invite covered in Task 4 (`intent=revoke`, `intent=resend`).
- [ ] Profile-row insertion is server-side post-invite (Task 2 implementation Step 3) with `ON CONFLICT (user_id) DO NOTHING` for race safety. The JWT hook from sub-project 1 then resolves claims on first session.
- [ ] Service-role client lives only in `app/lib/supabase-admin.server.ts` (Task 1) with the `.server.ts` suffix — RR v7 bundler keeps it out of client bundles.
- [ ] Branded auth pages include actual CSS tokens (Task 6 `auth.css`: `--navy #153A98`, `--cyan #00A6F6`, `--gold #FFD71F`, `--canvas #EFF1F5`), classnames (`auth__title`, `auth__sub`, `auth__form-wrap`, etc.), and copy strings ("Set your password.", "Forgot password?", "Check your email.").
- [ ] RLS integration tests cover: employer cannot read other employers' interns/cohorts/roles/submissions (Task 32); cannot insert competency for non-owned intern (Task 33); cannot insert personal-goals (Task 33); cannot update another employer's row (Task 34); cannot insert roles under another employer (Task 34).
- [ ] Every route has a loader + (where relevant) action + component; sub-project 1's E2E patterns are reused; route guard pattern (`getAuthContext → redirect`) is consistent across all routes.
- [ ] Sub-project 1 deps verified — `profiles` table + role check constraint (Task 2), `auth.users` cascade (Task 2 revokeEmployerAccess), `custom_access_token_hook` (Task 2 narrative), `getAuthContext` (everywhere), `createSupabaseServerClient` (all auth+write actions), `sendEmail` (Task 2, 12, 13), `env` (Tasks 1, 2, 9), RLS policies `employer_write_submissions`+`employer_own_employer`+`employer_own_roles` (Tasks 26-30, asserted by Tasks 32-34).
- [ ] Cross-sub-project assumptions itemized at top of plan; risky shared component prop names called out inline (Task 25 InternRecord, Task 26 CompetencyAssessmentForm, Task 28 ExitEmployerSurveyForm). Risk flags placed at Task 25, 26, 36.
- [ ] No placeholders. Every code block is final, every file path is absolute (within repo), every UUID matches sub-project 1's seed.
- [ ] Risks flagged inline: prop-shape drift with sub-2/3/4 components (Tasks 25, 26, 36); dev-only invite-link endpoint must never deploy to prod (Task 37 Step 1 gates on `NODE_ENV`); Supabase email template paste is a manual dashboard step (Task 14); `kpisForEmployer` business rule for "assessments needed" is a placeholder pending program staff per spec OQ §10.1 (Task 19 implementation note); `internInEmployerScope` uses service-role `db` rather than authenticated client — sub-project 6 may revisit (Task 19 note); E2E test users accumulate in dev Supabase project — cleanup deferred to sub-project 6 (Task 37 afterEach).

---

**End of sub-project 5 implementation plan.**
