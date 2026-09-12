import { describe, it, expect } from 'vitest';
import {
  INTERN_CODE_RE,
  formatInternCode,
  normalizeInternCode,
  yearForInternCode,
} from '~/lib/intern-code';

describe('formatInternCode', () => {
  it('zero-pads year and number', () => {
    expect(formatInternCode(26, 417)).toBe('IMP-26-0417');
    expect(formatInternCode(7, 1)).toBe('IMP-07-0001');
    expect(formatInternCode(26, 9999)).toBe('IMP-26-9999');
  });

  it('rejects out-of-range inputs', () => {
    expect(() => formatInternCode(26, 0)).toThrow(RangeError);
    expect(() => formatInternCode(26, 10000)).toThrow(RangeError);
    expect(() => formatInternCode(100, 1)).toThrow(RangeError);
    expect(() => formatInternCode(26, 1.5)).toThrow(RangeError);
  });

  it('produces canonical form', () => {
    expect(INTERN_CODE_RE.test(formatInternCode(26, 417))).toBe(true);
  });
});

describe('normalizeInternCode', () => {
  it('accepts the canonical form unchanged', () => {
    expect(normalizeInternCode('IMP-26-0417')).toBe('IMP-26-0417');
  });

  it('accepts lower-case, no hyphens, and spaces', () => {
    expect(normalizeInternCode('imp260417')).toBe('IMP-26-0417');
    expect(normalizeInternCode('imp-26-0417')).toBe('IMP-26-0417');
    expect(normalizeInternCode('IMP 26 0417')).toBe('IMP-26-0417');
    expect(normalizeInternCode('  imp - 26 - 0417 ')).toBe('IMP-26-0417');
  });

  it('rejects wrong prefix, wrong length, and letters in the number', () => {
    expect(normalizeInternCode('IMX-26-0417')).toBeNull();
    expect(normalizeInternCode('IMP-26-417')).toBeNull();
    expect(normalizeInternCode('IMP-26-04170')).toBeNull();
    expect(normalizeInternCode('IMP-2A-0417')).toBeNull();
    expect(normalizeInternCode('IMP-26-O417')).toBeNull(); // letter O
    expect(normalizeInternCode('')).toBeNull();
    expect(normalizeInternCode('J. Whitaker')).toBeNull();
  });
});

describe('yearForInternCode', () => {
  it('prefers the start date year when present', () => {
    expect(yearForInternCode('2026-01-12', new Date('2027-06-01T12:00:00Z'))).toBe(26);
    expect(yearForInternCode('2031-09-01', new Date('2026-06-01T12:00:00Z'))).toBe(31);
  });

  it('falls back to now in the program timezone when start date is missing', () => {
    expect(yearForInternCode(null, new Date('2026-06-01T12:00:00Z'))).toBe(26);
    expect(yearForInternCode(undefined, new Date('2026-06-01T12:00:00Z'))).toBe(26);
  });

  it('falls back to now when the start date is malformed', () => {
    expect(yearForInternCode('not-a-date', new Date('2026-06-01T12:00:00Z'))).toBe(26);
  });

  it('uses the Indiana year, not the UTC year, at the New Year boundary', () => {
    // 2027-01-01 04:30 UTC is 2026-12-31 23:30 in America/Indiana/Indianapolis (UTC-5).
    expect(yearForInternCode(null, new Date('2027-01-01T04:30:00Z'))).toBe(26);
    // 2027-01-01 05:30 UTC is 2027-01-01 00:30 in Indiana.
    expect(yearForInternCode(null, new Date('2027-01-01T05:30:00Z'))).toBe(27);
  });
});
