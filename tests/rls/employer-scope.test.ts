import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { describe, it, expect, beforeAll } from 'vitest';
import postgres from 'postgres';
import { withClaims, EMPLOYER_CLAIMS } from './test-helpers';

const FAKE_EMPLOYER_USER_ID = '00000000-0000-0000-0000-000000000002';
// Employer 101 in the seed (currently "Riverbend Manufacturing"). The earlier
// plan referred to this as "Eskenazi"; we use UUIDs so the test is stable across
// fixture renames.
const EMPLOYER_101_ID = '11111111-1111-1111-1111-111111111101';
// A different employer (102, currently "Northside") used for negative-scope checks.
const OTHER_EMPLOYER_ID = '11111111-1111-1111-1111-111111111102';

describe('RLS: employer_scope', () => {
  beforeAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
    try {
      await sql`
        INSERT INTO auth.users (id, email, role)
        VALUES (${FAKE_EMPLOYER_USER_ID}, 'rls-test-employer@example.com', 'authenticated')
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        INSERT INTO public.profiles (user_id, role, employer_id)
        VALUES (${FAKE_EMPLOYER_USER_ID}, 'employer', ${EMPLOYER_101_ID})
        ON CONFLICT (user_id) DO UPDATE SET role = 'employer', employer_id = EXCLUDED.employer_id
      `;
    } finally {
      await sql.end();
    }
  });

  it('employer sees only their own employer row', async () => {
    const rows = await withClaims(
      EMPLOYER_CLAIMS(FAKE_EMPLOYER_USER_ID, EMPLOYER_101_ID),
      async (sql) => sql`SELECT id, name FROM public.employers`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe(EMPLOYER_101_ID);
  });

  it('employer sees only their own cohorts', async () => {
    const rows = await withClaims(
      EMPLOYER_CLAIMS(FAKE_EMPLOYER_USER_ID, EMPLOYER_101_ID),
      async (sql) => sql`SELECT id, employer_id FROM public.cohorts`,
    );
    // Employer 101 has 1 cohort in the seed.
    expect(rows).toHaveLength(1);
    expect(rows[0]!.employer_id).toBe(EMPLOYER_101_ID);
  });

  it('employer sees only their own interns', async () => {
    const rows = await withClaims(
      EMPLOYER_CLAIMS(FAKE_EMPLOYER_USER_ID, EMPLOYER_101_ID),
      async (sql) => sql`SELECT id, cohort_id FROM public.interns WHERE deleted_at IS NULL`,
    );
    // Cohort 01 has 1 intern in the seed (Phase E distributed 1 per cohort
    // across employers 101/102/103, instead of the plan's earlier assumption
    // of 2 in cohort 01).
    expect(rows.length).toBe(1);
  });

  it("employer cannot see another employer's interns", async () => {
    const rows = await withClaims(
      EMPLOYER_CLAIMS(FAKE_EMPLOYER_USER_ID, EMPLOYER_101_ID),
      async (sql) => sql`
        SELECT id FROM public.interns
        WHERE cohort_id IN (SELECT id FROM public.cohorts WHERE employer_id = ${OTHER_EMPLOYER_ID})
      `,
    );
    expect(rows).toHaveLength(0);
  });

  it('employer cannot insert a non-allowed submission type', async () => {
    const employerInternId = '44444444-4444-4444-4444-444444444401';
    await expect(
      withClaims(
        EMPLOYER_CLAIMS(FAKE_EMPLOYER_USER_ID, EMPLOYER_101_ID),
        async (sql) => sql`
          INSERT INTO public.assessment_submissions (type, intern_id, answers)
          VALUES ('personal-goals', ${employerInternId}, '{}'::jsonb)
          RETURNING id
        `,
      ),
    ).rejects.toThrow(); // RLS denies the INSERT
  });

  it('employer can insert a competency submission for their own intern', async () => {
    const employerInternId = '44444444-4444-4444-4444-444444444401';
    const result = await withClaims(
      EMPLOYER_CLAIMS(FAKE_EMPLOYER_USER_ID, EMPLOYER_101_ID),
      async (sql) => sql`
        INSERT INTO public.assessment_submissions (type, intern_id, phase, answers)
        VALUES ('competency', ${employerInternId}, 'Phase 1', '{}'::jsonb)
        RETURNING id
      `,
    );
    expect(result[0]?.id).toBeTruthy();

    // Cleanup
    const cleanupSql = postgres(process.env.DATABASE_URL!, { max: 1 });
    try {
      await cleanupSql`DELETE FROM public.assessment_submissions WHERE id = ${result[0]!.id}`;
    } finally {
      await cleanupSql.end();
    }
  });
});
