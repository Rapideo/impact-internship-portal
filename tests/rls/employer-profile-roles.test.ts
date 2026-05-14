import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { withClaims, EMPLOYER_CLAIMS } from './test-helpers';

// Distinct from FAKE_EMPLOYER_USER_ID in employer-scope.test.ts ('...0002')
// and from the assessment-submissions suite to avoid auth.users PK collisions.
const FAKE_USER_ID = '00000000-0000-0000-0000-00000000010c';
// Employer 101 in the seed (Riverbend); referred to as "Eskenazi" in the plan.
const ESKENAZI_ID = '11111111-1111-1111-1111-111111111101';
// Employer 102 (Northside); referred to as "TTT" in the plan. Used for
// negative cross-tenant write checks.
const TTT_ID = '11111111-1111-1111-1111-111111111102';

describe('RLS: employer profile + roles', () => {
  // Snapshot original notes so we can restore after mutations.
  let originalEskenaziNotes: string | null = null;
  let originalTttNotes: string | null = null;

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
        ON CONFLICT (user_id) DO UPDATE
          SET role = 'employer', employer_id = EXCLUDED.employer_id
      `;
      const [esk] = await sql`SELECT notes FROM public.employers WHERE id = ${ESKENAZI_ID}`;
      const [ttt] = await sql`SELECT notes FROM public.employers WHERE id = ${TTT_ID}`;
      originalEskenaziNotes = (esk?.notes as string | null) ?? null;
      originalTttNotes = (ttt?.notes as string | null) ?? null;
    } finally {
      await sql.end();
    }
  });

  afterAll(async () => {
    // Restore employer notes so the seed state is preserved for subsequent runs.
    const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
    try {
      await sql`
        UPDATE public.employers SET notes = ${originalEskenaziNotes} WHERE id = ${ESKENAZI_ID}
      `;
      await sql`
        UPDATE public.employers SET notes = ${originalTttNotes} WHERE id = ${TTT_ID}
      `;
    } finally {
      await sql.end();
    }
  });

  it('employer can update their own employer row', async () => {
    const rows = await withClaims(
      EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
      async (sql) => sql`
        UPDATE public.employers
        SET notes = 'RLS update test'
        WHERE id = ${ESKENAZI_ID}
        RETURNING id
      `,
    );
    expect(rows).toHaveLength(1);
  });

  it('employer cannot update another employer row (no-op, no throw)', async () => {
    // RLS USING clause filters out the target row, so the UPDATE matches zero
    // rows and returns successfully with an empty result set — it does not throw.
    const rows = await withClaims(
      EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
      async (sql) => sql`
        UPDATE public.employers
        SET notes = 'should not apply'
        WHERE id = ${TTT_ID}
        RETURNING id
      `,
    );
    expect(rows).toHaveLength(0);

    // And verify the row really was not modified.
    const verify = postgres(process.env.DATABASE_URL!, { max: 1 });
    try {
      const [row] = await verify`SELECT notes FROM public.employers WHERE id = ${TTT_ID}`;
      expect(row?.notes ?? null).toBe(originalTttNotes);
    } finally {
      await verify.end();
    }
  });

  it('employer can insert a role under their own employer', async () => {
    const rows = await withClaims(
      EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
      async (sql) => sql`
        INSERT INTO public.roles (employer_id, label, description)
        VALUES (${ESKENAZI_ID}, 'RLS Test Role', 'temp')
        RETURNING id
      `,
    );
    expect(rows[0]?.id).toBeTruthy();

    // Cleanup
    const cleanupSql = postgres(process.env.DATABASE_URL!, { max: 1 });
    try {
      await cleanupSql`DELETE FROM public.roles WHERE id = ${rows[0]!.id}`;
    } finally {
      await cleanupSql.end();
    }
  });

  it('employer cannot insert a role under another employer', async () => {
    await expect(
      withClaims(
        EMPLOYER_CLAIMS(FAKE_USER_ID, ESKENAZI_ID),
        async (sql) => sql`
          INSERT INTO public.roles (employer_id, label, description)
          VALUES (${TTT_ID}, 'Bad Role', 'should fail')
          RETURNING id
        `,
      ),
    ).rejects.toThrow(); // RLS WITH CHECK denies the cross-tenant INSERT
  });
});
