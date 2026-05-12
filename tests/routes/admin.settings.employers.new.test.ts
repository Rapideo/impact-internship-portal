import { describe, it, expect, vi, beforeEach } from 'vitest';
import { action } from '~/routes/admin.settings.employers.new';
import * as guard from '~/lib/admin-guard.server';

describe('admin.settings.employers.new action', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns errors for missing name', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    const fd = new FormData();
    fd.set('name', '');
    fd.set('contactEmail', 'a@b.co');
    const req = new Request('https://x.test/admin/settings/employers/new', {
      method: 'POST',
      body: fd,
    });
    const res = await action({ request: req, params: {}, context: {} } as never);
    const body = (res as { data: { errors: Array<{ field: string; message: string }> } }).data;
    const fields = body.errors.map((e) => e.field);
    expect(fields).toContain('name');
  });

  it('returns email validation error for malformed contactEmail', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    const fd = new FormData();
    fd.set('name', 'Acme');
    fd.set('contactEmail', 'not-an-email');
    const req = new Request('https://x.test/admin/settings/employers/new', {
      method: 'POST',
      body: fd,
    });
    const res = await action({ request: req, params: {}, context: {} } as never);
    const body = (res as { data: { errors: Array<{ field: string; message: string }> } }).data;
    const fields = body.errors.map((e) => e.field);
    expect(fields).toContain('contactEmail');
  });
});
