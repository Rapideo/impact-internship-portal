# Admin User Management — Design Spec

**Date:** 2026-06-08
**Status:** Approved (brainstorm) — pending spec review
**Author:** Matt + Claude

## Overview

Add an admin-only **Settings → Users** area to create and manage **login accounts** (admin + employer roles) in-app. Today, employer users can only be invited from a buried per-employer card, and admin users can only be created from the CLI (`scripts/create-admin.ts`). This feature consolidates account management into one place and — most importantly — adds **in-app admin-user creation** and a unified list with role changes and reversible deactivation.

"Anonymous" interns are **out of scope**: they have no auth account (intern records + a signed identity cookie), so they cannot be "created as a user." They remain in the existing Interns CRUD.

## Goals

- One admin page listing all admin + employer accounts with role, employer, and status.
- Create a new account as **Admin** or **Employer** (employer accounts attributed to a specific employer).
- Credential delivery is the admin's choice per account: **set a password now** (works immediately) **or send an invite email** (user sets their own password).
- Change an existing account's role / employer attribution.
- **Deactivate** (reversible) an account; reactivate it later.
- Match the existing app look & feel exactly (real `nav`, `page-head`, `settings-rail`, `.assessments` table, `.btn`/`.field` primitives).

## Non-goals (v1)

- Intern logins / a third auth role (interns stay anonymous).
- Hard-delete of accounts from this UI (deactivate is the lifecycle action; the existing per-employer "revoke = delete" path is unchanged).
- Bulk operations, audit log, MFA, SSO.
- Removing the existing per-employer Account card (see Reuse & overlap).

## Navigation & placement

A new Settings sub-section at **`/admin/settings/users`**. Add a `'users'` value to `SettingsRail`'s `SettingsTab` and a rail item **directly under "Employers"**:

```
Settings
  Employers
  Users            ← new, active here
  Assessments
  Assessment Phases
  Barriers
  Program Info
```

The admin top-nav "Settings" tab stays active; Users is *not* a top-level tab.

## Routes & components

Mirrors the existing settings sub-page pattern (`PageHead` + `SettingsShell active="users"` + `<main>` with a `.detail-header` and `.assessments` table). Three routes:

1. **`admin.settings.users._index.tsx`** — the list. Loader returns all accounts (see Data model). Main content: `.detail-header` ("Users" + `+ New User` → `/admin/settings/users/new`) and the `.assessments` table with columns **Email · Role · Employer · Status · Actions**. Row actions: **Change role** (→ detail page) and **Deactivate**; pending rows show **Resend invite** / **Cancel**.
2. **`admin.settings.users.new.tsx`** — the create form (its own page, like New Employer). Fields: Email, Role (Admin/Employer), Employer (shown only when role = Employer), and Credentials (radio: *Set a password now* with a generate/copy password field, or *Send invite email* with an SMTP caveat note). Action creates the account.
3. **`admin.settings.users.$userId.tsx`** — per-account detail/edit: change role + reassign employer, deactivate/reactivate, and (for pending) resend/cancel invite. `$userId` validated against `UUID_RE`.

No new visual components are required beyond small additions; status renders as a pill (Active / Invited / Deactivated). The mockups (`/admin/settings/users` list + new form) are approved.

## Data model & status (no schema change)

The existing `profiles` table (`role` ∈ {admin, employer}, `employer_id`, with the check constraint `admin ⇒ employer_id NULL`, `employer ⇒ employer_id NOT NULL`) is the canonical set of app accounts. **No migration is needed.**

- **List source:** iterate `profiles` (joined to `employers` for the name), enriched per row with the matching `auth.users` record (email + status fields) via the service-role admin API. Because interns have no `auth.users`/`profiles` row, they never appear here.
- **Status is derived** from the `auth.users` record, not stored:
  - **Deactivated** — `banned_until` is in the future.
  - **Invited** (pending) — `email_confirmed_at` is null (invited, not yet accepted).
  - **Active** — otherwise.

## Server layer

New `app/lib/users.server.ts` (admin-only; uses the service-role `getSupabaseAdmin()` client + the `db` client for `profiles`), generalizing the employer-specific logic in `invites.server.ts`:

- `listAccounts()` → `{ userId, email, role, employerId, employerName, status }[]`.
- `createAccountWithPassword({ email, role, employerId, password })` → `auth.admin.createUser({ email, password, email_confirm: true })` then insert `profiles` row. Immediately **Active**.
- `inviteAccount({ email, role, employerId })` → `auth.admin.inviteUserByEmail(...)` + `profiles` insert (the existing invite mechanic, generalized to admin or employer). **Invited** until accepted.
- `changeAccountRole({ userId, role, employerId })` → update `profiles`, enforcing the check constraint in app code first (admin ⇒ clear employer; employer ⇒ require employer).
- `deactivateAccount({ userId })` / `reactivateAccount({ userId })` → `auth.admin.updateUserById(userId, { ban_duration })` (a long ban to disable; `'none'` to restore). A banned user's `signInWithPassword` is rejected, so login is blocked without deleting data.
- `resendInvite` / `cancelInvite` → reuse the existing delete-and-reinvite / delete patterns.

The check constraint is enforced in app code before writing so violations surface as friendly validation errors, never a 500.

## Credential delivery & the SMTP caveat

Both paths are offered per account (admin's choice):

- **Set password now** — works on production *today*; no email required. Recommended default while custom SMTP is unconfigured.
- **Send invite** — reuses the branded invite→`/auth/accept` flow. The UI shows a caveat that **invite/reset emails won't deliver on prod until custom SMTP is configured** (the open `docs/launch-todo.md` item, and the root cause of the recent reset failure). This keeps the polished invite path ready for when SMTP lands.

## Security & safety rules

- Every route/action is admin-gated (`requireAdmin` via the `admin.tsx` trust boundary). Account mutations use the service-role admin client server-side only — never exposed to the client.
- **Self-protection:** an admin cannot deactivate, demote, or cancel **their own** account (prevents self-lockout).
- **Last-admin protection:** the system refuses to deactivate or demote the **last remaining active admin** (prevents locking everyone out).
- `$userId` is `UUID_RE`-validated; loaders/actions thread Supabase auth `headers` on every response (including 4xx), per the codebase convention.
- Role changes take effect on the user's next token issuance (login / refresh), since the JWT hook reads `profiles` at token time. Acceptable for v1; noted in UI copy if needed.

## Error handling & validation

- Required fields validated server-side; duplicate email (Supabase returns an error) maps to a friendly "An account with that email already exists."
- Employer required when role = Employer; cleared when role = Admin (enforced before the DB write).
- Admin-API failures return a `{ error }` to the form (no 500), matching the employer Account route pattern.

## Testing

- **Unit** (`tests/lib/users.server.test.ts`) — mock `getSupabaseAdmin()` (as `tests/lib/invites.server.test.ts` does) to cover create-with-password, invite, change-role (incl. constraint enforcement), deactivate/reactivate, and the self/last-admin guards.
- **DB-backed** (`tests/rls/…`) — status derivation + list shape against a seeded account, run in CI's `supabase start` job (no local Docker → verify in CI).
- **E2E** (`tests/e2e/users.spec.ts`) — admin creates an account via the password path, sees it listed, changes its role, deactivates it. Runs in CI.

## Reuse & overlap

The existing per-employer **Account card** (`admin.settings.employers.$employerId.account.tsx` + `invites.server.ts`) stays as-is in v1 — it's a convenient per-employer shortcut. The new central Users area is additive and generalizes the same primitives. Converging the per-employer card onto `users.server.ts` later is a possible follow-up, intentionally deferred to limit blast radius on the working employer flow.

**Known interaction:** the central area can create **multiple** employer accounts for one employer, but the legacy card's helpers (`employerAccountStatus`, `resendEmployerInvite`) assume a single account per employer and operate on the first match. Acceptable for v1; the central Users page is the source of truth for multi-account employers, and convergence resolves it later.

## Out of scope / deferred

- Hard-delete from the Users UI.
- Converging the per-employer Account card.
- Audit logging of account changes.
- Forcing active sessions to re-auth immediately on role change.
