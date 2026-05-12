import { describe, it, expect } from 'vitest';
import {
  parseFormFields,
  requireString,
  optionalString,
  requireEmail,
  requirePositiveInt,
  requireDate,
  requireUuid,
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
