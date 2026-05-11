import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { describe, it, expect, beforeAll } from 'vitest';
import postgres from 'postgres';
import { withClaims, ADMIN_CLAIMS } from './test-helpers';

// We use a known UUID; the Custom Access Token Hook isn't invoked here because
// we set the claims directly via request.jwt.claims, bypassing JWT issuance.
const FAKE_ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';

describe('RLS: admin_all', () => {
  beforeAll(async () => {
    // Ensure there's a profile row for the fake admin so the policies that
    // join through profiles still resolve. This is a *test harness* row,
    // not a real auth user. Inserted via service-role connection.
    const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
    try {
      // Bypass auth.users FK by inserting directly into auth.users (service role can).
      await sql`
        INSERT INTO auth.users (id, email, role)
        VALUES (${FAKE_ADMIN_USER_ID}, 'rls-test-admin@example.com', 'authenticated')
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        INSERT INTO public.profiles (user_id, role, employer_id)
        VALUES (${FAKE_ADMIN_USER_ID}, 'admin', NULL)
        ON CONFLICT (user_id) DO NOTHING
      `;
    } finally {
      await sql.end();
    }
  });

  it('admin sees all employers', async () => {
    const rows = await withClaims(ADMIN_CLAIMS(FAKE_ADMIN_USER_ID), async (sql) => {
      return sql`SELECT id FROM public.employers`;
    });
    expect(rows.length).toBeGreaterThanOrEqual(6);
  });

  it('admin sees all interns including from multiple employers', async () => {
    const rows = await withClaims(ADMIN_CLAIMS(FAKE_ADMIN_USER_ID), async (sql) => {
      return sql`SELECT id FROM public.interns WHERE deleted_at IS NULL`;
    });
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it('admin can insert into question_sets', async () => {
    const result = await withClaims(ADMIN_CLAIMS(FAKE_ADMIN_USER_ID), async (sql) => {
      return sql`
        INSERT INTO public.question_sets (id, kind, name, allow_multiple)
        VALUES ('test-admin-insert', 'standard', 'Test', false)
        RETURNING id
      `;
    });
    expect(result[0]?.id).toBe('test-admin-insert');

    // Cleanup
    const cleanupSql = postgres(process.env.DATABASE_URL!, { max: 1 });
    try {
      await cleanupSql`DELETE FROM public.question_sets WHERE id = 'test-admin-insert'`;
    } finally {
      await cleanupSql.end();
    }
  });
});
