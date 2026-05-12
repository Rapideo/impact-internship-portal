import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loader, action } from '~/routes/admin.interns.new';
import * as guard from '~/lib/admin-guard.server';
import * as queries from '~/lib/admin-queries.server';
import * as dbMod from '~/lib/db.server';

describe('admin.interns.new', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('loader returns employers, cohorts, roles, barriers', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    vi.spyOn(queries, 'listAllEmployers').mockResolvedValue([
      { id: 'e1', name: 'Eskenazi Health' },
    ] as never);
    vi.spyOn(queries, 'listBarriers').mockResolvedValue([
      {
        id: 'b1',
        label: 'No reliable transportation to placement site',
        sortOrder: 1,
        createdAt: new Date(),
      },
    ] as never);
    const dbStub = {
      select: () => ({ from: () => ({ orderBy: () => Promise.resolve([]) }) }),
    } as never;
    vi.spyOn(dbMod, 'db', 'get').mockReturnValue(dbStub);

    const req = new Request('https://x.test/admin/interns/new');
    const res = await loader({ request: req, params: {}, context: {} } as never);
    // Loader returns DataWithResponseInit via react-router data().
    const body = (
      res as {
        data: {
          employers: Array<{ id: string; name: string }>;
          barriers: Array<{ id: string; label: string }>;
        };
      }
    ).data;
    expect(body.employers[0]!.name).toBe('Eskenazi Health');
    expect(body.barriers[0]!.label).toMatch(/transportation/);
  });

  it('action returns errors when required fields are missing', async () => {
    vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
      auth: { role: 'admin', employerId: null },
      headers: new Headers(),
    });
    const fd = new FormData();
    fd.set('firstName', '');
    fd.set('lastName', '');
    fd.set('cohortId', '');
    fd.set('startDate', '');
    fd.set('endDate', '');
    const req = new Request('https://x.test/admin/interns/new', { method: 'POST', body: fd });
    const res = await action({ request: req, params: {}, context: {} } as never);
    const body = (res as { data: { errors: Array<{ field: string; message: string }> } }).data;
    expect(body.errors.length).toBeGreaterThan(0);
    const fieldsWithErrors = body.errors.map((e) => e.field);
    expect(fieldsWithErrors).toEqual(expect.arrayContaining(['firstName', 'lastName', 'cohortId']));
  });
});
