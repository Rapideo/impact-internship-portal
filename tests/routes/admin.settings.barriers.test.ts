import { describe, it, expect, vi, beforeEach } from 'vitest';
import { action } from '~/routes/admin.settings.barriers';
import * as guard from '~/lib/admin-guard.server';

describe('barriers action validation', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejects empty label rows', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    const fd = new FormData();
    fd.set('barriers[0].id', '');
    fd.set('barriers[0].label', '');
    const req = new Request('https://x.test/admin/settings/barriers', {
      method: 'POST',
      body: fd,
    });
    const res = await action({ request: req, params: {}, context: {} } as never);
    const body = (res as { data: { errors: Array<{ field: string; message: string }> } }).data;
    expect(body.errors.length).toBeGreaterThan(0);
  });
});
