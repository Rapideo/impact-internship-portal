import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loader, action } from '~/routes/admin.interns.$internId';
import * as guard from '~/lib/admin-guard.server';
import * as queries from '~/lib/admin-queries.server';
import * as dbMod from '~/lib/db.server';

const INTERN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function mockAdmin() {
  vi.spyOn(guard, 'requireAdmin').mockResolvedValue({
    auth: { role: 'admin', employerId: null },
    headers: new Headers(),
  });
}

/** The action must reject bad input BEFORE opening a transaction. */
function mockDbUntouchable() {
  const dbStub = {
    transaction: vi.fn(async () => {
      throw new Error('db.transaction must not run for invalid input');
    }),
  } as unknown as typeof dbMod.db;
  vi.spyOn(dbMod, 'db', 'get').mockReturnValue(dbStub);
  return dbStub;
}

function saveRequest(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return new Request(`https://x.test/admin/interns/${INTERN_ID}`, { method: 'POST', body: fd });
}

async function runAction(fields: Record<string, string>) {
  const res = (await action({
    request: saveRequest(fields),
    params: { internId: INTERN_ID },
    context: {},
  } as never)) as {
    data: { errors: Array<{ field: string; message: string }> };
    init?: { status?: number };
  };
  return res;
}

describe('admin.interns.$internId loader', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns 404 when intern not found', async () => {
    mockAdmin();
    vi.spyOn(queries, 'getInternOrNull').mockResolvedValue(null);
    const req = new Request(`https://x.test/admin/interns/${INTERN_ID}`);
    await expect(
      loader({ request: req, params: { internId: INTERN_ID }, context: {} } as never),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('admin.interns.$internId action — internship dates', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('requires both Start Date and End Date on save', async () => {
    mockAdmin();
    const dbStub = mockDbUntouchable();
    const res = await runAction({ entryNotes: 'x' });
    expect(res.init?.status).toBe(400);
    const fields = res.data.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['startDate', 'endDate']));
    expect(dbStub.transaction).not.toHaveBeenCalled();
  });

  it('rejects an End Date before the Start Date', async () => {
    mockAdmin();
    const dbStub = mockDbUntouchable();
    const res = await runAction({ startDate: '2026-06-30', endDate: '2026-04-01' });
    expect(res.init?.status).toBe(400);
    expect(res.data.errors).toContainEqual({
      field: 'endDate',
      message: 'End Date must be on or after Start Date.',
    });
    expect(dbStub.transaction).not.toHaveBeenCalled();
  });
});
