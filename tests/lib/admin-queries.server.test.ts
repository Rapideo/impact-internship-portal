import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getAdminHomeKpis,
  listEmployersWithCohortCount,
  listCohortsForEmployer,
  listRolesForEmployerWithCohortCount,
  getEmployerOrNull,
  listInternsForListing,
} from '~/lib/admin-queries.server';
import { db } from '~/lib/db.server';

const SKIP_DB_TESTS =
  !process.env.DATABASE_POOL_URL || process.env.DATABASE_POOL_URL.includes('fake');

// Use the dev-seeded data from sub-project 1. Run `npm run db:seed` first.
// Seed reference (post Phase-E content drift; UUIDs preserved):
//   - Employer 1101 = Riverbend Manufacturing
//   - Cohort   3301 = Riverbend — Spring 2026 Production
//   - Intern   4401 = A. Whitaker (cohort 3301)
//   - 6 employers, 6 cohorts, 3 interns total (one per cohort 01-03)

describe.skipIf(SKIP_DB_TESTS)('admin-queries (live DB)', () => {
  beforeAll(async () => {
    // Sanity: at least one employer exists.
    const employers = await listEmployersWithCohortCount(db);
    if (employers.length === 0) {
      throw new Error(
        'Tests require dev seed; run `npm run db:seed` before running admin-queries tests.',
      );
    }
  });
  afterAll(async () => {
    /* postgres-js client closes on process exit */
  });

  describe('listEmployersWithCohortCount', () => {
    it('returns all 6 seeded employers with cohort counts', async () => {
      const out = await listEmployersWithCohortCount(db);
      expect(out.length).toBeGreaterThanOrEqual(6);
      const riverbend = out.find((e) => e.name === 'Riverbend Manufacturing');
      expect(riverbend).toBeDefined();
      expect(riverbend!.cohortCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getAdminHomeKpis', () => {
    it('returns counts as numbers', async () => {
      const kpis = await getAdminHomeKpis(db);
      expect(typeof kpis.activeCohorts).toBe('number');
      expect(typeof kpis.activeInterns).toBe('number');
      expect(typeof kpis.outcomes90Day).toBe('number');
      expect(typeof kpis.submissions).toBe('number');
    });
  });

  describe('getEmployerOrNull', () => {
    it('returns null for unknown id', async () => {
      const e = await getEmployerOrNull(db, '00000000-0000-0000-0000-000000000000');
      expect(e).toBeNull();
    });
    it('returns the employer for a known id', async () => {
      const e = await getEmployerOrNull(db, '11111111-1111-1111-1111-111111111101');
      expect(e?.name).toBe('Riverbend Manufacturing');
    });
  });

  describe('listCohortsForEmployer', () => {
    it('returns cohort(s) under Riverbend Manufacturing', async () => {
      const cohorts = await listCohortsForEmployer(db, '11111111-1111-1111-1111-111111111101');
      expect(cohorts.length).toBeGreaterThanOrEqual(1);
      expect(cohorts[0]!.employerId).toBe('11111111-1111-1111-1111-111111111101');
    });
  });

  describe('listRolesForEmployerWithCohortCount', () => {
    it('returns role rows with cohort counts', async () => {
      const out = await listRolesForEmployerWithCohortCount(
        db,
        '11111111-1111-1111-1111-111111111101',
      );
      expect(out.length).toBeGreaterThanOrEqual(1);
      expect(out[0]).toMatchObject({
        id: expect.any(String),
        label: expect.any(String),
        cohortCount: expect.any(Number),
      });
    });
  });

  describe('listInternsForListing', () => {
    it('returns interns with cohort + employer joined', async () => {
      const rows = await listInternsForListing(db);
      expect(rows.length).toBeGreaterThanOrEqual(3);
      const sample = rows[0];
      expect(sample).toMatchObject({
        id: expect.any(String),
        firstInitial: expect.any(String),
        lastName: expect.any(String),
        cohortName: expect.any(String),
        employerName: expect.any(String),
      });
    });
  });
});
