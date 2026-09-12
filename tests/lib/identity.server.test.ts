import { describe, it, expect } from 'vitest';
import { lookupInternByCode } from '~/lib/identity.server';

const SKIP_DB_TESTS =
  !process.env.DATABASE_POOL_URL || process.env.DATABASE_POOL_URL.includes('fake');

// Fixtures from db/seed-data/interns.ts (PR A): Whitaker = IMP-26-1042 in Riverbend.
describe.skipIf(SKIP_DB_TESTS)('lookupInternByCode', () => {
  it('returns the intern when code + cohort match', async () => {
    const intern = await lookupInternByCode({
      internCode: 'IMP-26-1042',
      cohortId: '33333333-3333-3333-3333-333333333301',
    });
    expect(intern?.id).toBe('44444444-4444-4444-4444-444444444401');
    expect(intern?.internCode).toBe('IMP-26-1042');
  });

  it('is exact on the code — no case folding or normalisation here', async () => {
    // Normalisation is the caller's job (normalizeInternCode); storage is canonical.
    const intern = await lookupInternByCode({
      internCode: 'imp-26-1042',
      cohortId: '33333333-3333-3333-3333-333333333301',
    });
    expect(intern).toBeNull();
  });

  it('returns null when the cohort does not match', async () => {
    const intern = await lookupInternByCode({
      internCode: 'IMP-26-1042',
      cohortId: '00000000-0000-0000-0000-000000000099',
    });
    expect(intern).toBeNull();
  });

  it('returns null for an unknown code', async () => {
    const intern = await lookupInternByCode({
      internCode: 'IMP-26-0000',
      cohortId: '33333333-3333-3333-3333-333333333301',
    });
    expect(intern).toBeNull();
  });
});
