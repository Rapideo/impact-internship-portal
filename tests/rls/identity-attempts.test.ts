import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

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
});
