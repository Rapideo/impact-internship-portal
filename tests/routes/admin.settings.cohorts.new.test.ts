import { describe, it, expect, vi, beforeEach } from 'vitest';
import { action } from '~/routes/admin.settings.employers.$employerId.cohorts.new';
import * as guard from '~/lib/admin-guard.server';
import * as queries from '~/lib/admin-queries.server';

describe('cohort new action', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejects when no phases are picked', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    vi.spyOn(queries, 'getEmployerOrNull').mockResolvedValue({
      id: 'e1',
      name: 'Eskenazi Health',
    } as never);
    const fd = new FormData();
    fd.set('name', 'C1');
    fd.set('roleId', '22222222-2222-2222-2222-222222222201');
    fd.set('startDate', '2026-04-01');
    fd.set('endDate', '2026-09-30');
    const req = new Request('https://x.test/admin/settings/employers/e1/cohorts/new', {
      method: 'POST',
      body: fd,
    });
    const res = await action({ request: req, params: { employerId: 'e1' }, context: {} } as never);
    const body = (res as { data: { errors: Array<{ field: string; message: string }> } }).data;
    const fields = body.errors.map((e) => e.field);
    expect(fields).toContain('phaseIds');
  });
});
