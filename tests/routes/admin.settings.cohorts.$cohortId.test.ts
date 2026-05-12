import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loader } from '~/routes/admin.settings.cohorts.$cohortId._index';
import * as guard from '~/lib/admin-guard.server';
import * as queries from '~/lib/admin-queries.server';

describe('cohort detail loader', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throws 404 when cohort not found', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    vi.spyOn(queries, 'getCohortOrNull').mockResolvedValue(null);
    const req = new Request(
      'https://x.test/admin/settings/cohorts/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    );
    await expect(
      loader({
        request: req,
        params: { cohortId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
        context: {},
      } as never),
    ).rejects.toMatchObject({ status: 404 });
  });
});
