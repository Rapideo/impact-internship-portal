import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loader } from '~/routes/admin.interns._index';
import * as guard from '~/lib/admin-guard.server';
import * as queries from '~/lib/admin-queries.server';

describe('admin.interns._index loader', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns interns + cohort filter options', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    vi.spyOn(queries, 'listInternsForListing').mockResolvedValue([
      {
        id: 'i1',
        firstInitial: 'A',
        lastName: 'Williams',
        startDate: '2026-04-01',
        endDate: '2026-09-30',
        cohortId: 'c1',
        cohortName: 'Eskenazi 2026',
        employerId: 'e1',
        employerName: 'Eskenazi Health',
        roleLabel: 'Medical Assistant',
        employed90: false,
        employed180: false,
      },
    ] as never);

    const req = new Request('https://x.test/admin/interns');
    const res = await loader({ request: req, params: {}, context: {} } as never);
    // Loader returns DataWithResponseInit<{interns, cohortOptions}> via
    // react-router's data() helper — body is on .data directly.
    const body = (
      res as {
        data: {
          interns: Array<{ id: string; cohortName: string }>;
          cohortOptions: string[];
        };
      }
    ).data;
    expect(body.interns).toHaveLength(1);
    expect(body.cohortOptions).toEqual(expect.arrayContaining(['Eskenazi 2026']));
  });
});
