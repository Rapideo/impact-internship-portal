// Verification: confirms the JWT hook + RLS policies route an employer
// save through PostgREST without the "role 'employer' does not exist"
// regression that came from overwriting the JWT's top-level role claim.
//
// Flow:
//   1. Sign in employer1 via supabase-js (issues a JWT through the hook).
//   2. Inspect the JWT claims — top-level role must stay 'authenticated';
//      app role must surface under 'user_role'.
//   3. Run UPDATE employers SET notes = ... WHERE id = own-employer-id via
//      PostgREST. This is the exact path that broke before the fix.
//   4. Read the row back to confirm the write took.
//
// Run: `npx tsx scripts/verify-jwt-hook.ts` against impact-dev. Exits 0 on
// success, non-zero on failure. Safe to delete after launch — keeping it in
// scripts/ as a future regression check.
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const EMAIL = 'employer1@example.com';
const PASSWORD = 'DevPassword123!';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in env.');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function main() {
  // 1. Sign in
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signInErr || !signInData.session) {
    throw new Error(`Sign-in failed: ${signInErr?.message ?? 'no session'}`);
  }

  // 2. Inspect JWT claims
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims();
  if (claimsErr || !claimsData) throw new Error(`getClaims failed: ${claimsErr?.message}`);
  const claims = claimsData.claims as Record<string, unknown>;
  console.log('Top-level role:  ', claims.role);
  console.log('user_role:       ', claims.user_role);
  console.log('employer_id:     ', claims.employer_id);

  if (claims.role !== 'authenticated') {
    throw new Error(
      `Top-level role is "${claims.role}" — must stay "authenticated" so PostgREST SET LOCAL ROLE succeeds.`,
    );
  }
  if (claims.user_role !== 'employer') {
    throw new Error(`user_role is "${claims.user_role}" — expected "employer".`);
  }
  const employerId = claims.employer_id as string;

  // 3. UPDATE through PostgREST (this is the path that broke)
  const newNote = `verify-jwt-hook ${new Date().toISOString()}`;
  const { error: updateErr } = await supabase
    .from('employers')
    .update({ notes: newNote })
    .eq('id', employerId);
  if (updateErr) {
    throw new Error(`UPDATE through PostgREST failed: ${updateErr.message}`);
  }

  // 4. Read back
  const { data: readBack, error: readErr } = await supabase
    .from('employers')
    .select('id, notes')
    .eq('id', employerId)
    .single();
  if (readErr) throw new Error(`SELECT failed: ${readErr.message}`);
  if (readBack.notes !== newNote) {
    throw new Error(`Read-back mismatch: expected "${newNote}", got "${readBack.notes}"`);
  }

  console.log('PASS — employer save through PostgREST succeeded.');
  await supabase.auth.signOut();
}

main().catch((err) => {
  console.error('FAIL —', err.message);
  process.exit(1);
});
