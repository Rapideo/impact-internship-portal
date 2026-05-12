import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loader } from '~/routes/admin.settings.employers._index';
import * as guard from '~/lib/admin-guard.server';
import * as queries from '~/lib/admin-queries.server';

describe('admin.settings.employers._index loader', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns employer rows with cohort counts', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    vi.spyOn(queries, 'listEmployersWithCohortCount').mockResolvedValue([
      {
        id: 'e1',
        name: 'Eskenazi Health',
        contactName: 'Maya',
        contactEmail: 'm@x.org',
        phone: '',
        notes: '',
        cohortCount: 2,
      },
    ] as never);

    const req = new Request('https://x.test/admin/settings/employers');
    const res = await loader({ request: req, params: {}, context: {} } as never);
    const body = (
      res as {
        data: {
          rows: Array<{ id: string; name: string; cohortCount: number }>;
        };
      }
    ).data;
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]!.cohortCount).toBe(2);
    expect(body.rows[0]!.name).toBe('Eskenazi Health');
  });
});
