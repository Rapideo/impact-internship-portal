import { describe, it, expect, vi, beforeEach } from 'vitest';

// We mock Drizzle's `db` so we don't need a live DB. `vi.hoisted` ensures the
// shared mock ref exists before `vi.mock` factories run (they are auto-hoisted
// above plain `const` declarations). Precedent: tests/lib/invites.server.test.ts.
const { mockDb } = vi.hoisted(() => ({
  mockDb: { select: vi.fn() },
}));

vi.mock('~/lib/db.server', () => ({ db: mockDb }));

// Import AFTER mocks
import {
  kpisForEmployer,
  cohortsForEmployer,
  internsForEmployer,
  internInEmployerScope,
} from '~/lib/employer-scope.server';

describe('kpisForEmployer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns counts grouped by KPI', async () => {
    // Two cohorts, three interns, two assessments needed.
    const cohortSelect = {
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]),
      })),
    };
    const internSelect = {
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ id: 'i1' }, { id: 'i2' }, { id: 'i3' }]),
      })),
    };
    const needSelect = {
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      })),
    };
    mockDb.select
      .mockReturnValueOnce(cohortSelect)
      .mockReturnValueOnce(internSelect)
      .mockReturnValueOnce(needSelect);

    const result = await kpisForEmployer('emp-1');
    expect(result.activeCohorts).toBe(2);
    expect(result.activeInterns).toBe(3);
    expect(result.assessmentsNeeded).toBe(2);
  });

  it('returns zero counts when employer has no cohorts/interns', async () => {
    const empty = (rows: unknown[]) => ({
      from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })),
    });
    mockDb.select
      .mockReturnValueOnce(empty([]))
      .mockReturnValueOnce(empty([]))
      .mockReturnValueOnce(empty([{ count: 0 }]));

    const result = await kpisForEmployer('emp-empty');
    expect(result).toEqual({ activeCohorts: 0, activeInterns: 0, assessmentsNeeded: 0 });
  });

  it('treats a missing assessments-needed row as zero', async () => {
    const empty = (rows: unknown[]) => ({
      from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })),
    });
    mockDb.select
      .mockReturnValueOnce(empty([{ id: 'c1' }]))
      .mockReturnValueOnce(empty([{ id: 'i1' }]))
      .mockReturnValueOnce(empty([]));

    const result = await kpisForEmployer('emp-1');
    expect(result.assessmentsNeeded).toBe(0);
  });
});

describe('cohortsForEmployer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the cohort rows scoped to the employer', async () => {
    const cohortRows = [
      {
        id: 'c1',
        employerId: 'emp-1',
        name: 'Cohort A',
        startDate: '2026-01-01',
        endDate: '2026-06-01',
      },
    ];
    const select = {
      from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(cohortRows) })),
    };
    mockDb.select.mockReturnValue(select);

    const result = await cohortsForEmployer('emp-1');
    expect(result).toEqual(cohortRows);
  });
});

describe('internsForEmployer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns intern rows shaped for the dashboard', async () => {
    const rows = [
      {
        id: 'i1',
        firstInitial: 'A',
        lastName: 'Smith',
        cohortId: 'c1',
        roleId: 'r1',
        startDate: '2026-01-01',
        endDate: '2026-06-01',
      },
    ];
    const select = {
      from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(rows) })),
    };
    mockDb.select.mockReturnValue(select);

    const result = await internsForEmployer('emp-1');
    expect(result).toEqual(rows);
  });
});

describe('internInEmployerScope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when the intern resolves to the employer', async () => {
    // Adapted: one join query, mock chain is from → innerJoin → where → limit.
    const select = {
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ employerId: 'emp-1' }]),
          })),
        })),
      })),
    };
    mockDb.select.mockReturnValue(select);

    expect(await internInEmployerScope('intern-1', 'emp-1')).toBe(true);
  });

  it('returns false when the intern resolves to a different employer', async () => {
    const select = {
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ employerId: 'emp-2' }]),
          })),
        })),
      })),
    };
    mockDb.select.mockReturnValue(select);

    expect(await internInEmployerScope('intern-1', 'emp-1')).toBe(false);
  });

  it('returns false when the intern does not exist', async () => {
    const select = {
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    };
    mockDb.select.mockReturnValue(select);

    expect(await internInEmployerScope('missing', 'emp-1')).toBe(false);
  });
});
