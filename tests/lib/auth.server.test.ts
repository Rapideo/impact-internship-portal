import { describe, it, expect, vi, beforeEach } from 'vitest';
import { decodeRoleFromJwtPayload } from '~/lib/auth.server';

describe('decodeRoleFromJwtPayload', () => {
  it('returns null if claims are absent', () => {
    expect(decodeRoleFromJwtPayload(null)).toBeNull();
    expect(decodeRoleFromJwtPayload({})).toBeNull();
  });

  it('returns role and employerId from a well-formed payload', () => {
    const payload = {
      user_role: 'employer',
      employer_id: '11111111-1111-1111-1111-111111111101',
    };
    expect(decodeRoleFromJwtPayload(payload)).toEqual({
      role: 'employer',
      employerId: '11111111-1111-1111-1111-111111111101',
    });
  });

  it('returns admin without employerId', () => {
    const payload = { user_role: 'admin' };
    expect(decodeRoleFromJwtPayload(payload)).toEqual({ role: 'admin', employerId: null });
  });

  it('returns null for an unknown role', () => {
    expect(decodeRoleFromJwtPayload({ user_role: 'superuser' })).toBeNull();
  });

  it('ignores top-level role claim (PostgREST role, not app role)', () => {
    // The hook leaves the JWT top-level `role` at 'authenticated' for
    // PostgREST. `decodeRoleFromJwtPayload` must not be fooled by it.
    expect(decodeRoleFromJwtPayload({ role: 'admin' })).toBeNull();
  });
});

describe('getAuthContext', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unmock('~/lib/auth.server');
  });

  it('returns null when getClaims errors', async () => {
    vi.doMock('@supabase/ssr', () => ({
      createServerClient: () => ({
        auth: {
          getClaims: async () => ({ data: null, error: new Error('no session') }),
        },
      }),
      parseCookieHeader: () => [],
      serializeCookieHeader: () => '',
    }));
    const { getAuthContext: freshGetAuthContext } = await import('~/lib/auth.server');
    const result = await freshGetAuthContext(new Request('http://localhost/'), new Headers());
    expect(result).toBeNull();
  });

  it('returns claims when getClaims succeeds with admin payload', async () => {
    vi.doMock('@supabase/ssr', () => ({
      createServerClient: () => ({
        auth: {
          getClaims: async () => ({
            data: { claims: { role: 'authenticated', user_role: 'admin' } },
            error: null,
          }),
        },
      }),
      parseCookieHeader: () => [],
      serializeCookieHeader: () => '',
    }));
    const { getAuthContext: freshGetAuthContext } = await import('~/lib/auth.server');
    const result = await freshGetAuthContext(new Request('http://localhost/'), new Headers());
    expect(result).toEqual({ role: 'admin', employerId: null });
  });
});
