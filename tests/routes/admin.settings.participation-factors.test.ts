import { describe, it, expect, vi, beforeEach } from 'vitest';
import { action } from '~/routes/admin.settings.participation-factors';
import * as guard from '~/lib/admin-guard.server';
import * as dbMod from '~/lib/db.server';

const EXISTING_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('participation factors action validation', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejects empty label rows', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    const fd = new FormData();
    fd.set('participationFactors[0].id', '');
    fd.set('participationFactors[0].label', '');
    const req = new Request('https://x.test/admin/settings/participation-factors', {
      method: 'POST',
      body: fd,
    });
    const res = await action({ request: req, params: {}, context: {} } as never);
    const body = (res as { data: { errors: Array<{ field: string; message: string }> } }).data;
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it('persists the description on update', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    const updateSpy = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const tx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockResolvedValue([{ id: EXISTING_ID }]),
      }),
      delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      update: vi.fn().mockReturnValue({ set: updateSpy }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    };
    const dbStub = {
      transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(tx)),
    } as never;
    vi.spyOn(dbMod, 'db', 'get').mockReturnValue(dbStub);

    const fd = new FormData();
    fd.set('participationFactors[0].id', EXISTING_ID);
    fd.set('participationFactors[0].label', 'Transportation/access');
    fd.set('participationFactors[0].description', 'ability to reliably get to/from internship');
    const req = new Request('https://x.test/admin/settings/participation-factors', {
      method: 'POST',
      body: fd,
    });
    await expect(action({ request: req, params: {}, context: {} } as never)).rejects.toMatchObject({
      status: 302,
    });
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Transportation/access',
        description: 'ability to reliably get to/from internship',
        sortOrder: 1,
      }),
    );
  });
});
