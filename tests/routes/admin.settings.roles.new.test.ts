import { describe, it, expect, vi, beforeEach } from 'vitest';
import { action } from '~/routes/admin.settings.employers.$employerId.roles.new';
import * as guard from '~/lib/admin-guard.server';
import * as queries from '~/lib/admin-queries.server';

describe('role new action', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejects empty name', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    vi.spyOn(queries, 'getEmployerOrNull').mockResolvedValue({
      id: 'e1',
      name: 'Eskenazi Health',
    } as never);
    const fd = new FormData();
    fd.set('label', '');
    const req = new Request('https://x.test/admin/settings/employers/e1/roles/new', {
      method: 'POST',
      body: fd,
    });
    const res = await action({
      request: req,
      params: { employerId: 'e1' },
      context: {},
    } as never);
    const body = (res as { data: { errors: Array<{ field: string; message: string }> } }).data;
    const fields = body.errors.map((e) => e.field);
    expect(fields).toContain('label');
  });
});
