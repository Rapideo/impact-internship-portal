import { describe, it, expect, vi, beforeEach } from 'vitest';
import { action } from '~/routes/admin.settings.program-info';
import * as guard from '~/lib/admin-guard.server';

describe('program-info action validation', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('errors on missing program name', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    const fd = new FormData();
    fd.set('programName', '');
    fd.set('contactEmail', 'a@b.co');
    fd.set('defaultCohortLengthWeeks', '26');
    fd.set('fiscalYearStartMonth', '7');
    const req = new Request('https://x.test/admin/settings/program-info', {
      method: 'POST',
      body: fd,
    });
    const res = await action({ request: req, params: {}, context: {} } as never);
    const body = (res as { data: { errors: Array<{ field: string; message: string }> } }).data;
    expect(body.errors.map((e) => e.field)).toContain('programName');
  });

  it('errors on non-positive cohort length', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    const fd = new FormData();
    fd.set('programName', 'X');
    fd.set('contactEmail', 'a@b.co');
    fd.set('defaultCohortLengthWeeks', '0');
    fd.set('fiscalYearStartMonth', '7');
    const req = new Request('https://x.test/admin/settings/program-info', {
      method: 'POST',
      body: fd,
    });
    const res = await action({ request: req, params: {}, context: {} } as never);
    const body = (res as { data: { errors: Array<{ field: string; message: string }> } }).data;
    expect(body.errors.map((e) => e.field)).toContain('defaultCohortLengthWeeks');
  });

  it('errors on out-of-range fiscal year start month', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    const fd = new FormData();
    fd.set('programName', 'X');
    fd.set('contactEmail', 'a@b.co');
    fd.set('defaultCohortLengthWeeks', '26');
    fd.set('fiscalYearStartMonth', '13');
    const req = new Request('https://x.test/admin/settings/program-info', {
      method: 'POST',
      body: fd,
    });
    const res = await action({ request: req, params: {}, context: {} } as never);
    const body = (res as { data: { errors: Array<{ field: string; message: string }> } }).data;
    expect(body.errors.map((e) => e.field)).toContain('fiscalYearStartMonth');
  });
});
