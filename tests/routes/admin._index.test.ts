import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
        internCode: 'IMP-26-0001',
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

describe('admin._index greeting', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.useRealTimers());

  async function loadAt(iso: string): Promise<string> {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(iso));
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    vi.spyOn(queries, 'getAdminHomeKpis').mockResolvedValue({
      activeCohorts: 0,
      activeInterns: 0,
      outcomes90Day: 0,
      submissions: 0,
    });
    vi.spyOn(queries, 'listRecentActivity').mockResolvedValue([] as never);

    const req = new Request('https://x.test/admin');
    const res = await loader({ request: req, params: {}, context: {} } as never);
    return (res as { data: { greeting: string } }).data.greeting;
  }

  it('greets by the program timezone, not the UTC server clock', async () => {
    // 03:00 UTC = 23:00 EDT the previous evening. A server reading its own
    // (UTC) clock would say "Good morning" to an admin working at 11pm.
    expect(await loadAt('2026-09-12T03:00:00Z')).toBe('Good evening');
  });

  it('greets Good morning during an Indiana morning', async () => {
    // 13:29 UTC = 09:29 EDT
    expect(await loadAt('2026-09-11T13:29:00Z')).toBe('Good morning');
  });
});
