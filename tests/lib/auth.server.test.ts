import { describe, it, expect } from 'vitest';
import { decodeRoleFromJwtPayload } from '~/lib/auth.server';

describe('decodeRoleFromJwtPayload', () => {
  it('returns null if claims are absent', () => {
    expect(decodeRoleFromJwtPayload(null)).toBeNull();
    expect(decodeRoleFromJwtPayload({})).toBeNull();
  });

  it('returns role and employerId from a well-formed payload', () => {
    const payload = { role: 'employer', employer_id: '11111111-1111-1111-1111-111111111101' };
    expect(decodeRoleFromJwtPayload(payload)).toEqual({
      role: 'employer',
      employerId: '11111111-1111-1111-1111-111111111101',
    });
  });

  it('returns admin without employerId', () => {
    const payload = { role: 'admin' };
    expect(decodeRoleFromJwtPayload(payload)).toEqual({ role: 'admin', employerId: null });
  });

  it('returns null for an unknown role', () => {
    expect(decodeRoleFromJwtPayload({ role: 'superuser' })).toBeNull();
  });
});
