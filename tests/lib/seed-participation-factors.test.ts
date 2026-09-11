import { describe, expect, it } from 'vitest';
import { SEED_PARTICIPATION_FACTORS } from '../../db/seed-data/participation-factors';
import { SEED_INTERNS } from '../../db/seed-data/interns';

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

// Drift guard: SEED_INTERNS.entryParticipationFactorLabels are plain strings, not a foreign key,
// so nothing but this test catches a label that no longer exists in SEED_PARTICIPATION_FACTORS.
// db/seed.ts throws "Unknown participation factor label" at seed time when that happens — this
// test surfaces the same drift at `npm test` time instead, without touching a database.
describe('SEED_INTERNS entryParticipationFactorLabels', () => {
  const validLabels = new Set(SEED_PARTICIPATION_FACTORS.map((f) => f.label));
  const referencedLabels = new Set(SEED_INTERNS.flatMap((i) => i.entryParticipationFactorLabels));

  it('references only labels that exist in SEED_PARTICIPATION_FACTORS', () => {
    const stale = [...referencedLabels].filter((label) => !validLabels.has(label));
    expect(stale).toEqual([]);
  });

  it('never assigns the catch-all or none-identified factors to a demo intern', () => {
    expect(referencedLabels.has('Other participation-related factor')).toBe(false);
    expect(referencedLabels.has('No participation factors identified')).toBe(false);
  });
});
