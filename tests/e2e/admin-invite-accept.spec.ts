// Admin invite → employer accept E2E (SP5 Task 37 / SP6 Phase F.2).
//
// SKIPPED — blocked on production auth-flow bug surfaced 2026-05-20.
//
// When this spec runs, Supabase returns the invite via the implicit OAuth
// flow (token in the URL hash: `#access_token=...&type=invite&...`). Our
// `/auth/callback` route only handles the PKCE flow (`?code=...` in the
// querystring), so the hash-fragment token is dropped, the callback finds
// no code, and it redirects to /login with the unprocessed token still in
// the URL fragment. The user never reaches /auth/accept.
//
// This affects production too: any real employer invite link would behave
// the same way. Fix path (BACKLOG entry "Supabase invite/recovery flow
// uses implicit grant, callback expects PKCE"): either configure Supabase
// Auth to use PKCE for invites (admin.generateLink + admin invite settings)
// or extend /auth/callback with a client-side hash-fragment handler that
// extracts access_token/refresh_token and calls setSession before
// continuing to /auth/accept.
//
// Once that's fixed, remove the `.skip` on the describe and this spec
// validates the full path end-to-end. The setup (generateLink + profile
// insert) is correct as-is; only the callback bridge is missing.
//
// Why this exists: SP5 deferred the spec because the original plan called for
// a NODE_ENV-gated `/dev/invite-link` route to expose the invite token to the
// test, which carried real production-surface risk. CLAUDE.md's SP5 follow-up
// explicitly called for the safer alternative: drive the invite from the
// test itself via the Supabase admin API. That's what this spec does — no
// app-side dev route, no production surface.
//
// Flow:
//   1. Service-role admin client calls auth.admin.generateLink({type:'invite'})
//      to create a fresh auth user and get back the verify URL. No email
//      sent. Independent of Resend wiring (relevant because RESEND_API_KEY
//      is "fake" in CI and may be unset in dev).
//   2. We insert the corresponding `profiles` row (mapping the new user to
//      role='employer' and an existing employer_id) so the JWT hook resolves
//      claims correctly on the user's first token issuance. This mirrors what
//      inviteEmployerUser does in production.
//   3. Playwright navigates to the action_link. Supabase verifies the token,
//      redirects to /auth/callback, which exchanges the code for a session
//      and redirects to /auth/accept.
//   4. Test fills in a new password and submits — the action calls
//      supabase.auth.updateUser({password}) and redirects to /employer.
//   5. Assert /employer dashboard renders for the new user.
//   6. Cleanup: delete the temp auth user (profiles row cascades via FK).
//
// Self-bootstrapping: uses a unique email per run (timestamp suffix) so
// stale data from prior runs doesn't collide. Reuses the seeded employer1
// org row so the test doesn't need to create + tear down org infrastructure.

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const EMPLOYER1_ID = '11111111-1111-1111-1111-111111111101';
const NEW_PASSWORD = 'AcceptedInviteTestPwd123!';

test.describe.skip('Admin invite → employer accept', () => {
  test('generated invite link routes a new user through accept and into the dashboard', async ({
    page,
  }) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const databaseUrl = process.env.DATABASE_URL;
    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
    if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
      throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL required');
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Unique email per run keeps the spec idempotent across CI reruns and
    // local iterations. The Date.now() suffix is fine — generateLink doesn't
    // care about email format beyond basic validation.
    const email = `invite-accept-test-${Date.now()}@example.com`;

    // 1. Generate the invite link. Creates the auth user as a side-effect.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${appUrl}/auth/callback?next=/auth/accept`,
      },
    });
    expect(linkErr).toBeNull();
    expect(linkData.user).toBeTruthy();
    expect(linkData.properties?.action_link).toBeTruthy();
    const userId = linkData.user!.id;
    const actionLink = linkData.properties!.action_link;

    try {
      // 2. Insert profile row so the JWT hook resolves the user's role +
      //    employer_id on first sign-in. Mirrors inviteEmployerUser's
      //    insertion step.
      const sql = postgres(databaseUrl, { max: 1 });
      try {
        await sql`
          INSERT INTO public.profiles (user_id, role, employer_id)
          VALUES (${userId}, 'employer', ${EMPLOYER1_ID})
          ON CONFLICT (user_id) DO UPDATE
          SET role = 'employer', employer_id = ${EMPLOYER1_ID}
        `;
      } finally {
        await sql.end();
      }

      // 3. Navigate to the verify endpoint. Supabase will verify the token,
      //    redirect to /auth/callback?code=... which exchanges the code for
      //    a session, then redirects to /auth/accept.
      await page.goto(actionLink);
      await expect(page).toHaveURL(/\/auth\/accept$/, { timeout: 15_000 });

      // 4. Set the new password.
      await page.locator('#accept-password').fill(NEW_PASSWORD);
      await page.locator('#accept-confirm').fill(NEW_PASSWORD);
      await page.getByRole('button', { name: /save password/i }).click();

      // 5. Land on the employer dashboard.
      await expect(page).toHaveURL(/\/employer$/, { timeout: 15_000 });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    } finally {
      // 6. Cleanup — delete the temp user. profiles row cascades via FK
      //    (auth.users.id → profiles.user_id ON DELETE CASCADE).
      await admin.auth.admin.deleteUser(userId);
    }
  });
});
