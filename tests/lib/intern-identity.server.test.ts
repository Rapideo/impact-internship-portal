import { describe, it, expect, beforeAll } from 'vitest';
import {
  signInternIdentityCookie,
  parseInternIdentityCookie,
  serializeInternIdentityCookie,
  INTERN_IDENTITY_COOKIE_NAME,
} from '~/lib/intern-identity.server';

const FAKE_SECRET = 'test-secret-must-be-32-bytes-long-aaaa';
beforeAll(() => {
  process.env.SESSION_SECRET = FAKE_SECRET;
});

describe('intern identity cookie', () => {
  const identity = {
    internId: '44444444-4444-4444-4444-444444444401',
    firstInitial: 'A',
    lastName: 'Williams',
    cohortId: '33333333-3333-3333-3333-333333333301',
    employerId: '11111111-1111-1111-1111-111111111101',
  };

  it('round-trips a signed cookie value', () => {
    const value = signInternIdentityCookie(identity);
    const parsed = parseInternIdentityCookie(value);
    expect(parsed).toEqual(identity);
  });

  it('returns null for an unsigned cookie value', () => {
    expect(parseInternIdentityCookie('{"internId":"x"}')).toBeNull();
  });

  it('returns null for a tampered signature', () => {
    const value = signInternIdentityCookie(identity);
    const tampered = value.slice(0, -2) + 'XX';
    expect(parseInternIdentityCookie(tampered)).toBeNull();
  });

  it('serializes with HttpOnly, SameSite=Lax, secure-when-prod, 30-day Max-Age', () => {
    const setCookie = serializeInternIdentityCookie(signInternIdentityCookie(identity), {
      isProd: true,
    });
    expect(setCookie).toMatch(new RegExp(`^${INTERN_IDENTITY_COOKIE_NAME}=`));
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    expect(setCookie).toMatch(/Secure/);
    expect(setCookie).toMatch(/Max-Age=2592000/); // 30 days
    expect(setCookie).toMatch(/Path=\//);
  });

  it('serializes without Secure when not prod', () => {
    const setCookie = serializeInternIdentityCookie(signInternIdentityCookie(identity), {
      isProd: false,
    });
    expect(setCookie).not.toMatch(/Secure/);
  });

  it('serializes the clear value with Max-Age=0', () => {
    const setCookie = serializeInternIdentityCookie('', { isProd: false, clear: true });
    expect(setCookie).toMatch(/Max-Age=0/);
  });
});
