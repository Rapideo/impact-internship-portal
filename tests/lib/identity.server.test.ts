import { describe, it, expect } from 'vitest';
import { lookupInternByIdentity } from '~/lib/identity.server';

describe('lookupInternByIdentity', () => {
  it('returns the intern when first initial + last name + cohort match (case-insensitive)', async () => {
    const intern = await lookupInternByIdentity({
      firstInitial: 'a',
      lastName: 'Whitaker',
      cohortId: '33333333-3333-3333-3333-333333333301',
    });
    expect(intern?.id).toBe('44444444-4444-4444-4444-444444444401');
  });

  it('returns null when no match', async () => {
    const intern = await lookupInternByIdentity({
      firstInitial: 'Z',
      lastName: 'Nobody',
      cohortId: '33333333-3333-3333-3333-333333333301',
    });
    expect(intern).toBeNull();
  });

  it('returns null when cohort does not match the intern', async () => {
    // Asserts the cohort filter; a stronger soft-delete test lives in tests/rls/ in sub-project 4.
    const intern = await lookupInternByIdentity({
      firstInitial: 'A',
      lastName: 'Whitaker',
      cohortId: '00000000-0000-0000-0000-000000000099',
    });
    expect(intern).toBeNull();
  });
});
