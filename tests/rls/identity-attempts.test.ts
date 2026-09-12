import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { withClaims, EMPLOYER_CLAIMS } from './test-helpers';

describe('RLS: identity_attempts is invisible to the JWT roles', () => {
  it('anon-key client cannot select', async () => {
    const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const { data, error } = await anon.from('identity_attempts').select('id').limit(1);
    // RLS enabled with no policies → zero rows (PostgREST returns [] not an error).
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('anon-key client cannot insert', async () => {
    const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
    const { error } = await anon.from('identity_attempts').insert({ ip: '203.0.113.1' });
    expect(error).toBeTruthy();
  });

  it('authenticated role cannot select (RLS on, no policies)', async () => {
    const rows = await withClaims(
      EMPLOYER_CLAIMS(
        '00000000-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111102',
      ),
      (sql) => sql`SELECT id FROM public.identity_attempts LIMIT 1`,
    );
    expect(rows).toHaveLength(0);
  });
});
