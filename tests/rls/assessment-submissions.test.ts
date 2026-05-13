import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { describe, it, expect, beforeEach } from 'vitest';
import postgres from 'postgres';
import { createClient } from '@supabase/supabase-js';

// Same seed UUID used by `tests/lib/assessment-submissions.server.test.ts`.
// In the actual seed this is A. Whitaker in the Riverbend cohort; only the
// intern_id matters for the RLS contract this test exercises.
const TEST_INTERN = '44444444-4444-4444-4444-444444444401';

describe('RLS: anonymous submission requires service-role bypass', () => {
  beforeEach(async () => {
    // Clean prior test rows via the direct/service-role-equivalent connection.
    // Uses DATABASE_URL (Supavisor session mode) — the connection's underlying
    // postgres role bypasses RLS, so the DELETE is unconditional.
    const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
    try {
      await sql`DELETE FROM public.assessment_submissions WHERE intern_id = ${TEST_INTERN}`;
    } finally {
      await sql.end();
    }
  });

  it('anon-key client (no JWT) cannot insert into assessment_submissions', async () => {
    const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const { error } = await anon
      .from('assessment_submissions')
      .insert({ intern_id: TEST_INTERN, type: 'personal-goals', answers: {} });
    // RLS denies; Supabase returns an error with code matching the PostgREST
    // RLS denial. We assert truthiness rather than a specific code so the test
    // tolerates minor PostgREST surface drift.
    expect(error).toBeTruthy();
  });

  it('service-role key bypasses RLS and inserts successfully', async () => {
    const svc = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data, error } = await svc
      .from('assessment_submissions')
      .insert({ intern_id: TEST_INTERN, type: 'personal-goals', answers: { 'pg-skills': 'X' } })
      .select('id')
      .single();
    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
  });
});
