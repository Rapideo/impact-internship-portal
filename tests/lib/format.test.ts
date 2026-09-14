import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateLong,
  formatPhone,
  slugify,
  initials,
  formatCompletionDate,
  greetingFor,
  formatActivityTime,
  phaseDisplayLabel,
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

describe('greetingFor', () => {
  // The app is pinned to the program's timezone (America/Indiana/Indianapolis),
  // NOT the server's. Netlify Functions run on Lambda with TZ unset, so a naive
  // `new Date().getHours()` would read UTC and greet an Indiana admin working at
  // 8pm with "Good morning". Every instant below is expressed in UTC to prove the
  // conversion actually happens.

  it('says Good morning before noon Eastern', () => {
    // 13:29 UTC = 09:29 EDT
    expect(greetingFor(new Date('2026-09-11T13:29:00Z'))).toBe('Good morning');
  });

  it('says Good afternoon from noon Eastern', () => {
    // 16:00 UTC = 12:00 EDT exactly — the morning/afternoon boundary
    expect(greetingFor(new Date('2026-09-11T16:00:00Z'))).toBe('Good afternoon');
  });

  it('says Good evening from 5pm Eastern', () => {
    // 21:00 UTC = 17:00 EDT exactly — the afternoon/evening boundary
    expect(greetingFor(new Date('2026-09-11T21:00:00Z'))).toBe('Good evening');
  });

  it('still says Good evening late at night Eastern', () => {
    // 04:00 UTC Sep 12 = 00:00... no: 23:00 EDT Sep 11. This is the regression
    // case — UTC has already rolled past midnight, so an unconverted server
    // clock would wrongly say "Good morning".
    expect(greetingFor(new Date('2026-09-12T03:00:00Z'))).toBe('Good evening');
  });

  it('rolls over to Good morning at midnight Eastern', () => {
    // 04:00 UTC Sep 12 = 00:00 EDT Sep 12
    expect(greetingFor(new Date('2026-09-12T04:00:00Z'))).toBe('Good morning');
  });

  it('honours standard time in winter', () => {
    // 17:30 UTC = 12:30 EST (UTC-5, no DST) — a fixed -4 offset would wrongly
    // read 13:30 here but still land on afternoon; use 22:30 UTC = 17:30 EST to
    // catch it at the evening boundary instead.
    expect(greetingFor(new Date('2026-01-15T22:30:00Z'))).toBe('Good evening');
    expect(greetingFor(new Date('2026-01-15T21:30:00Z'))).toBe('Good afternoon');
  });
});

describe('formatActivityTime', () => {
  // Recent Activity timestamps render during SSR. On Netlify (Lambda, TZ unset)
  // a bare getHours()/getDate() reads UTC, so these were showing Eastern users
  // times up to 5 hours ahead — and, late in the evening, tomorrow's date.

  it('formats as MM.DD.YYYY · HH:MM in the program timezone', () => {
    // 08:40 UTC = 04:40 EDT
    expect(formatActivityTime(new Date('2026-04-14T08:40:00Z'))).toBe('04.14.2026 · 04:40');
  });

  it('uses the Eastern calendar date, not the UTC one', () => {
    // 03:00 UTC Sep 12 = 23:00 EDT Sep 11 — the date must roll back a day too,
    // not just the clock time.
    expect(formatActivityTime(new Date('2026-09-12T03:00:00Z'))).toBe('09.11.2026 · 23:00');
  });

  it('pads midnight to 00, not 24', () => {
    // 04:00 UTC = 00:00 EDT
    expect(formatActivityTime(new Date('2026-09-12T04:00:00Z'))).toBe('09.12.2026 · 00:00');
  });

  it('accepts an ISO string as well as a Date', () => {
    expect(formatActivityTime('2026-04-14T08:40:00Z')).toBe('04.14.2026 · 04:40');
  });

  it('honours standard time in winter', () => {
    // 17:30 UTC = 12:30 EST (UTC-5)
    expect(formatActivityTime(new Date('2026-01-15T17:30:00Z'))).toBe('01.15.2026 · 12:30');
  });
});

describe('phaseDisplayLabel', () => {
  const phases = [
    { id: 'c40ad080-ccad-4053-bf74-eb1237d7bd1f', label: 'Phase 1' },
    { id: '158ef798-46bd-49aa-8345-df880138414f', label: 'Phase 2' },
  ];
  it('resolves a phase id to its label', () => {
    expect(phaseDisplayLabel('158ef798-46bd-49aa-8345-df880138414f', phases)).toBe('Phase 2');
  });
  it('shows legacy free-text phases as written', () => {
    expect(phaseDisplayLabel('Phase 1', phases)).toBe('Phase 1');
  });
  it('never prints a raw UUID — a phase id that no longer resolves reads "Phase removed"', () => {
    expect(phaseDisplayLabel('9b1d3a4e-0000-4000-8000-000000000000', phases)).toBe('Phase removed');
  });
  it('is a dash when there is no phase', () => {
    expect(phaseDisplayLabel(null, phases)).toBe('—');
    expect(phaseDisplayLabel('', phases)).toBe('—');
  });
});
