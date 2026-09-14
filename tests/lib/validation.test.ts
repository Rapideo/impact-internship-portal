import { describe, it, expect } from 'vitest';
import {
  parseFormFields,
  parseInlineRows,
  requireString,
  optionalString,
  requireEmail,
  requirePositiveInt,
  requireDate,
  requireUuid,
  dateRangeError,
  type FieldError,
} from '~/lib/validation';

describe('parseFormFields', () => {
  it('runs validators and collects errors', () => {
    const fd = new FormData();
    fd.set('name', '');
    fd.set('email', 'not-an-email');
    const { values, errors } = parseFormFields(fd, {
      name: requireString('Name'),
      email: requireEmail('Email'),
    });
    expect(values).toEqual({ name: null, email: null });
    const errMap: Record<string, FieldError> = Object.fromEntries(errors.map((e) => [e.field, e]));
    expect(errMap.name!.message).toMatch(/required/i);
    expect(errMap.email!.message).toMatch(/email/i);
  });

  it('returns no errors for valid input', () => {
    const fd = new FormData();
    fd.set('name', 'Acme');
    fd.set('email', 'a@b.co');
    const { errors } = parseFormFields(fd, {
      name: requireString('Name'),
      email: requireEmail('Email'),
    });
    expect(errors).toEqual([]);
  });
});

describe('requirePositiveInt', () => {
  it('accepts positive integer', () => {
    const fd = new FormData();
    fd.set('n', '26');
    const { errors } = parseFormFields(fd, { n: requirePositiveInt('N') });
    expect(errors).toEqual([]);
  });
  it('rejects zero', () => {
    const fd = new FormData();
    fd.set('n', '0');
    const { errors } = parseFormFields(fd, { n: requirePositiveInt('N') });
    expect(errors).toHaveLength(1);
  });
  it('rejects non-numeric', () => {
    const fd = new FormData();
    fd.set('n', 'abc');
    const { errors } = parseFormFields(fd, { n: requirePositiveInt('N') });
    expect(errors).toHaveLength(1);
  });
});

describe('requireDate', () => {
  it('accepts YYYY-MM-DD', () => {
    const fd = new FormData();
    fd.set('d', '2026-04-14');
    const { errors } = parseFormFields(fd, { d: requireDate('Date') });
    expect(errors).toEqual([]);
  });
  it('rejects empty', () => {
    const fd = new FormData();
    fd.set('d', '');
    const { errors } = parseFormFields(fd, { d: requireDate('Date') });
    expect(errors).toHaveLength(1);
  });
  it('rejects bad shape', () => {
    const fd = new FormData();
    fd.set('d', '04/14/2026');
    const { errors } = parseFormFields(fd, { d: requireDate('Date') });
    expect(errors).toHaveLength(1);
  });
});

describe('requireUuid', () => {
  it('accepts well-formed uuid', () => {
    const fd = new FormData();
    fd.set('id', '11111111-1111-1111-1111-111111111101');
    const { errors } = parseFormFields(fd, { id: requireUuid('Id') });
    expect(errors).toEqual([]);
  });
  it('rejects empty', () => {
    const fd = new FormData();
    fd.set('id', '');
    const { errors } = parseFormFields(fd, { id: requireUuid('Id') });
    expect(errors).toHaveLength(1);
  });
});

describe('optionalString', () => {
  it('coalesces empty to null', () => {
    const fd = new FormData();
    fd.set('n', '   ');
    const { values, errors } = parseFormFields(fd, { n: optionalString('N') });
    expect(values.n).toBeNull();
    expect(errors).toEqual([]);
  });
  it('trims whitespace', () => {
    const fd = new FormData();
    fd.set('n', '  hi  ');
    const { values } = parseFormFields(fd, { n: optionalString('N') });
    expect(values.n).toBe('hi');
  });
});

describe('parseInlineRows', () => {
  it('parses ordered rows from form data', () => {
    const fd = new FormData();
    fd.set('phases[0].id', 'p1');
    fd.set('phases[0].label', 'Phase 1');
    fd.set('phases[1].id', '');
    fd.set('phases[1].label', 'Phase 2');
    const { rows, errors } = parseInlineRows(fd, 'phases');
    expect(rows).toEqual([
      { id: 'p1', label: 'Phase 1', description: null },
      { id: null, label: 'Phase 2', description: null },
    ]);
    expect(errors).toEqual([]);
  });

  it('errors on empty label + duplicates', () => {
    const fd = new FormData();
    fd.set('phases[0].id', '');
    fd.set('phases[0].label', '');
    fd.set('phases[1].id', '');
    fd.set('phases[1].label', 'Phase 1');
    fd.set('phases[2].id', '');
    fd.set('phases[2].label', 'phase 1');
    const { errors, errorIndices } = parseInlineRows(fd, 'phases');
    expect(errors.length).toBeGreaterThanOrEqual(2);
    expect(errorIndices).toEqual(expect.arrayContaining([0, 1, 2]));
  });

  it('errors when zero rows', () => {
    const fd = new FormData();
    const { errors } = parseInlineRows(fd, 'phases');
    expect(errors).toEqual([{ field: 'phases', message: 'At least one row is required.' }]);
  });

  it('parses an optional description alongside the label', () => {
    const fd = new FormData();
    fd.set('factors[0].id', 'abc');
    fd.set('factors[0].label', 'Transportation/access');
    fd.set('factors[0].description', 'ability to reliably get to/from internship');
    const { rows, errors } = parseInlineRows(fd, 'factors');
    expect(errors).toHaveLength(0);
    expect(rows[0]).toEqual({
      id: 'abc',
      label: 'Transportation/access',
      description: 'ability to reliably get to/from internship',
    });
  });

  it('returns a null description when the field is absent', () => {
    const fd = new FormData();
    fd.set('phases[0].id', 'p1');
    fd.set('phases[0].label', 'Week 4');
    const { rows } = parseInlineRows(fd, 'phases');
    expect(rows[0]!.description).toBeNull();
  });
});

describe('dateRangeError', () => {
  it('returns null when end is on or after start', () => {
    expect(dateRangeError('2026-04-01', '2026-06-30')).toBeNull();
    expect(dateRangeError('2026-04-01', '2026-04-01')).toBeNull();
  });

  it('returns an endDate field error when end precedes start', () => {
    expect(dateRangeError('2026-06-30', '2026-04-01')).toEqual({
      field: 'endDate',
      message: 'End Date must be on or after Start Date.',
    });
  });

  it('is silent when either side is missing (the per-field validators own that)', () => {
    expect(dateRangeError('', '2026-04-01')).toBeNull();
    expect(dateRangeError('2026-04-01', null)).toBeNull();
  });
});
