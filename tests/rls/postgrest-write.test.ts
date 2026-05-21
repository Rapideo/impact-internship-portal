// PostgREST employer-write smoke test.
//
// Why this exists: PR #107 fixed a launch-blocker bug where the custom
// access token hook overwrote the JWT's top-level `role` claim with the
// application role ('employer'), causing PostgREST's `SET LOCAL ROLE` to
// fail with `role "employer" does not exist`. CI was green throughout
// because no spec exercised the actual `supabase.from(...).update/insert(...)`
// path:
//   - employer-competency.spec.ts deliberately only mounts the form
//   - employer-scope.test.ts uses `withClaims` which sets
//     `SET LOCAL ROLE authenticated` directly via `set_config`, bypassing
//     PostgREST's role-decision entirely
//
// This spec closes that gap. It signs in as a real employer via
// `signInWithPassword` (so the JWT comes from gotrue with hook output
// applied) and runs an UPDATE through the supabase-js client (so it goes
// through PostgREST). If the hook ever regresses to writing the app role
// into the top-level `role` claim, this test fails with the same
// `role "X" does not exist` error that production users would see.
//
// The spec is self-bootstrapping: beforeAll creates the employer1 auth
// user (idempotent — no-op if already there) and upserts the profile +
// employer rows. Works against both impact-dev and `supabase start` (CI).

import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const EMPLOYER1_ID = '11111111-1111-1111-1111-111111111101';
const EMAIL = 'postgrest-write-test@example.com';
const PASSWORD = 'DevPassword123!';

describe('PostgREST: employer write path (JWT hook regression guard)', () => {
  beforeAll(async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const databaseUrl = process.env.DATABASE_URL;
    if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
      throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL required');
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Ensure the test user exists. createUser errors on duplicate; we
    // swallow that specific case so the spec is idempotent across reruns.
    const { data: existing } = await admin.auth.admin.listUsers();
    let userId = existing.users.find((u) => u.email === EMAIL)?.id;
    if (!userId) {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: EMAIL,
        password: PASSWORD,
        email_confirm: true,
      });
      if (error) throw new Error(`createUser failed: ${error.message}`);
      userId = created.user.id;
    }

    // Ensure the employer row exists (seed creates this; defensive in case
    // the spec runs against a stack that hasn't been seeded).
    const sql = postgres(databaseUrl, { max: 1 });
    try {
      await sql`
        INSERT INTO public.employers (id, name)
        VALUES (${EMPLOYER1_ID}, 'Test Employer (postgrest-write)')
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        INSERT INTO public.profiles (user_id, role, employer_id)
        VALUES (${userId}, 'employer', ${EMPLOYER1_ID})
        ON CONFLICT (user_id) DO UPDATE
        SET role = EXCLUDED.role, employer_id = EXCLUDED.employer_id
      `;
    } finally {
      await sql.end();
    }
  });

  it('issues a JWT with top-level role=authenticated and user_role=employer', async () => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
    expect(error).toBeNull();
    expect(data.session).toBeTruthy();

    const { data: claimsData } = await supabase.auth.getClaims();
    const claims = claimsData!.claims as Record<string, unknown>;

    // PostgREST reads top-level `role` and does `SET LOCAL ROLE <value>`.
    // It must be `authenticated` (a real Postgres role), NOT 'employer'.
    expect(claims.role).toBe('authenticated');
    // App role lives under `user_role` (read by RLS policies + decodeRoleFromJwtPayload).
    expect(claims.user_role).toBe('employer');
    expect(claims.employer_id).toBe(EMPLOYER1_ID);

    await supabase.auth.signOut();
  });

  it('employer UPDATE on own employer row succeeds through PostgREST', async () => {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
    expect(signInErr).toBeNull();

    const newNote = `postgrest-write smoke ${Date.now()}`;
    const { error: updateErr } = await supabase
      .from('employers')
      .update({ notes: newNote })
      .eq('id', EMPLOYER1_ID);
    // If the JWT hook regresses to overwriting top-level role,
    // updateErr.message will be: `role "employer" does not exist`.
    expect(updateErr).toBeNull();

    const { data: readBack, error: readErr } = await supabase
      .from('employers')
      .select('notes')
      .eq('id', EMPLOYER1_ID)
      .single();
    expect(readErr).toBeNull();
    expect(readBack!.notes).toBe(newNote);

    await supabase.auth.signOut();
  });
});
