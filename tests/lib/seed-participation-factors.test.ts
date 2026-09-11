import { describe, expect, it } from 'vitest';
import { SEED_PARTICIPATION_FACTORS } from '../../db/seed-data/participation-factors';

describe('SEED_PARTICIPATION_FACTORS', () => {
  it('contains the eight client-approved values in order', () => {
    expect(SEED_PARTICIPATION_FACTORS.map((f) => f.label)).toEqual([
      'Transportation/access',
      'Schedule/availability',
      'Attendance continuity',
      'Communication',
      'Workplace accommodation/access',
      'Administrative requirements',
      'Other participation-related factor',
      'No participation factors identified',
    ]);
  });

  it('numbers sortOrder 1..8 contiguously', () => {
    expect(SEED_PARTICIPATION_FACTORS.map((f) => f.sortOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('keeps the accommodation wording free of any underlying reason', () => {
    const f = SEED_PARTICIPATION_FACTORS[4]!;
    expect(f.description).toBe(
      'an identified workplace adjustment or access need affected participation (without identifying underlying reason)',
    );
  });

  it('leaves the last two without descriptions', () => {
    expect(SEED_PARTICIPATION_FACTORS[6]!.description).toBeNull();
    expect(SEED_PARTICIPATION_FACTORS[7]!.description).toBeNull();
  });

  it('marks exactly one row with code "none"', () => {
    const coded = SEED_PARTICIPATION_FACTORS.filter((f) => f.code === 'none');
    expect(coded).toHaveLength(1);
    expect(coded[0]!.label).toBe('No participation factors identified');
  });

  it('retains none of the old values', () => {
    const labels = SEED_PARTICIPATION_FACTORS.map((f) => f.label);
    for (const old of ['Transportation', 'Childcare', 'Housing instability', 'Mental health']) {
      expect(labels).not.toContain(old);
    }
  });
});
