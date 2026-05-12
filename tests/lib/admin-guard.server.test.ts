import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAdmin } from '~/lib/admin-guard.server';
import * as authMod from '~/lib/auth.server';

describe('requireAdmin', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns auth context when user is admin', async () => {
    vi.spyOn(authMod, 'getAuthContext').mockResolvedValue({ role: 'admin', employerId: null });
    const req = new Request('https://x.test/admin');
    const { auth, headers } = await requireAdmin(req);
    expect(auth).toEqual({ role: 'admin', employerId: null });
    expect(headers).toBeInstanceOf(Headers);
  });

  it('throws a redirect to /login when no session', async () => {
    vi.spyOn(authMod, 'getAuthContext').mockResolvedValue(null);
    const req = new Request('https://x.test/admin');
    await expect(requireAdmin(req)).rejects.toMatchObject({
      status: 302,
      headers: expect.any(Headers),
    });
    try {
      await requireAdmin(req);
    } catch (e) {
      const r = e as Response;
      expect(r.headers.get('Location')).toBe('/login');
    }
  });

  it('throws a redirect to /employer when role is employer', async () => {
    vi.spyOn(authMod, 'getAuthContext').mockResolvedValue({ role: 'employer', employerId: 'e1' });
    const req = new Request('https://x.test/admin');
    try {
      await requireAdmin(req);
      throw new Error('expected redirect');
    } catch (e) {
      const r = e as Response;
      expect(r.status).toBe(302);
      expect(r.headers.get('Location')).toBe('/employer');
    }
  });
});
