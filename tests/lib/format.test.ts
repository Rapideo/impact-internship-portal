import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateLong,
  formatPhone,
  slugify,
  initials,
  formatCompletionDate,
} from '~/lib/format';

describe('formatDate', () => {
  it('formats ISO date as MM.DD.YYYY', () => {
    expect(formatDate('2026-04-14')).toBe('04.14.2026');
  });
  it('returns em-dash for null/empty', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
  });
});

describe('formatDateLong', () => {
  it('formats as Month Day, Year', () => {
    expect(formatDateLong('2026-04-14')).toBe('April 14, 2026');
  });
});

describe('formatPhone', () => {
  it('returns input unchanged when already formatted', () => {
    expect(formatPhone('(317) 555-0148')).toBe('(317) 555-0148');
  });
  it('formats 10-digit US number', () => {
    expect(formatPhone('3175550148')).toBe('(317) 555-0148');
  });
  it('returns em-dash for empty', () => {
    expect(formatPhone('')).toBe('—');
  });
});

describe('slugify', () => {
  it('lowercases and dasherizes', () => {
    expect(slugify('Phase 1')).toBe('phase-1');
  });
  it('trims leading/trailing dashes', () => {
    expect(slugify('  --hello--world--  ')).toBe('hello-world');
  });
});

describe('initials', () => {
  it('takes first two letters of name', () => {
    expect(initials('Eskenazi Health')).toBe('ES');
  });
  it('returns empty for empty', () => {
    expect(initials('')).toBe('');
  });
});

describe('formatCompletionDate', () => {
  it('formats Date as Month Day, Year', () => {
    expect(formatCompletionDate(new Date('2026-04-14T12:00:00Z'))).toBe('April 14, 2026');
  });
  it('returns empty for null/undefined', () => {
    expect(formatCompletionDate(null)).toBe('');
    expect(formatCompletionDate(undefined)).toBe('');
  });
});
