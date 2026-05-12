import { describe, it, expect, vi, beforeEach } from 'vitest';
import { action } from '~/routes/admin.settings.phases';
import * as guard from '~/lib/admin-guard.server';

describe('phases action validation', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejects zero rows', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    const fd = new FormData();
    const req = new Request('https://x.test/admin/settings/phases', {
      method: 'POST',
      body: fd,
    });
    const res = await action({ request: req, params: {}, context: {} } as never);
    const body = (res as { data: { errors: Array<{ field: string; message: string }> } }).data;
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it('rejects duplicate labels', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    const fd = new FormData();
    fd.set('phases[0].id', '');
    fd.set('phases[0].label', 'X');
    fd.set('phases[1].id', '');
    fd.set('phases[1].label', 'x');
    const req = new Request('https://x.test/admin/settings/phases', {
      method: 'POST',
      body: fd,
    });
    const res = await action({ request: req, params: {}, context: {} } as never);
    const body = (res as { data: { errors: Array<{ field: string; message: string }> } }).data;
    expect(body.errors.some((e) => /Duplicate/i.test(e.message))).toBe(true);
  });
});
