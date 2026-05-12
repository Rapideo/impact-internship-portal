import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loader } from '~/routes/admin.interns.$internId';
import * as guard from '~/lib/admin-guard.server';
import * as queries from '~/lib/admin-queries.server';

describe('admin.interns.$internId loader', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns 404 when intern not found', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    vi.spyOn(queries, 'getInternOrNull').mockResolvedValue(null);
    const req = new Request('https://x.test/admin/interns/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    await expect(
      loader({
        request: req,
        params: { internId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
        context: {},
      } as never),
    ).rejects.toMatchObject({ status: 404 });
  });
});
