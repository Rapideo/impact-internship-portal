import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loader } from '~/routes/admin._index';
import * as guard from '~/lib/admin-guard.server';
import * as queries from '~/lib/admin-queries.server';

describe('admin._index loader', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns KPIs and recent activity', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    vi.spyOn(queries, 'getAdminHomeKpis').mockResolvedValue({
      activeCohorts: 6,
      activeInterns: 5,
      outcomes90Day: 2,
      submissions: 11,
    });
    vi.spyOn(queries, 'listRecentActivity').mockResolvedValue([
      {
        id: 's1',
        type: 'competency',
        phase: 'Week 4',
        submittedAt: new Date('2026-04-14T08:40:00Z'),
        internLastName: 'Clark',
        internFirstInitial: 'D',
        cohortName: 'TTT 2026',
      },
    ] as never);

    const req = new Request('https://x.test/admin');
    const res = await loader({ request: req, params: {}, context: {} } as never);
    // Loader returns DataWithResponseInit<{kpis, activity}> via react-router's
    // data() helper — body is on .data directly (no JSON parse needed).
    const body = (
      res as { data: { kpis: { activeCohorts: number }; activity: Array<{ cohortName: string }> } }
    ).data;
    expect(body.kpis.activeCohorts).toBe(6);
    expect(body.activity).toHaveLength(1);
    expect(body.activity[0]!.cohortName).toBe('TTT 2026');
  });
});
