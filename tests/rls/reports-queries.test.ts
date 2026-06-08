// tests/rls/reports-queries.test.ts
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../../db/schema';
import { getKpis } from '../../app/lib/reports-queries.server';

const RIVERBEND = '11111111-1111-1111-1111-111111111101';
const NORTHSIDE = '11111111-1111-1111-1111-111111111102';

let sql: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  db = drizzle(sql, { schema });
});
afterAll(async () => {
  await sql.end();
});

describe('reports-queries: getKpis', () => {
  it('global KPIs reflect the full seed', async () => {
    const k = await getKpis(db, { level: 'global' });
    expect(k.employers).toBe(6);
    expect(k.activeInterns).toBe(6);
    expect(k.employed90Pct).toBe(0); // seed has no employment outcomes set true
    expect(k.assessedPct).toBe(0); // seed has no submissions
  });

  it('employer scope counts only that employer and hides the employers KPI', async () => {
    const k = await getKpis(db, { level: 'employer', employerId: NORTHSIDE });
    expect(k.employers).toBeNull();
    expect(k.activeInterns).toBe(4);
  });

  it('a single-intern employer counts 1', async () => {
    const k = await getKpis(db, { level: 'employer', employerId: RIVERBEND });
    expect(k.activeInterns).toBe(1);
  });
});
