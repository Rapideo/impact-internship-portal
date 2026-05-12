import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loader } from '~/routes/admin.settings.employers.$employerId._index';
import * as guard from '~/lib/admin-guard.server';
import * as queries from '~/lib/admin-queries.server';

describe('admin.settings.employers.$employerId._index', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throws 404 when employer not found', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    vi.spyOn(queries, 'getEmployerOrNull').mockResolvedValue(null);
    const req = new Request(
      'https://x.test/admin/settings/employers/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    );
    await expect(
      loader({
        request: req,
        params: { employerId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
        context: {},
      } as never),
    ).rejects.toMatchObject({ status: 404 });
  });
});
