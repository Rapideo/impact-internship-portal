import { describe, it, expect } from 'vitest';
import {
  createInternWithCode,
  InternCodeExhaustedError,
  INTERN_CODE_MAX_ATTEMPTS,
  type NewInternValues,
} from '~/lib/intern-code.server';

const VALUES: NewInternValues = {
  cohortId: '33333333-3333-3333-3333-333333333301',
  roleId: null,
  startDate: '2026-01-12',
  endDate: null,
  entryNotes: null,
  participationFactorIds: [],
};

/**
 * Fake Drizzle client: `transaction(fn)` runs fn against a tx whose
 * `insert().values().returning()` echoes the intern_code it was given, and
 * whose first N intern inserts throw the given error. Only the surface the
 * generator touches is modelled.
 */
function fakeDb(opts: { failFirst?: number; error?: unknown } = {}) {
  let internInserts = 0;
  const insertedCodes: string[] = [];
  const tx = {
    insert: (_table: unknown) => ({
      values: (vals: Record<string, unknown> | Record<string, unknown>[]) => {
        const chain = {
          returning: async () => {
            internInserts += 1;
            if (opts.failFirst && internInserts <= opts.failFirst) throw opts.error;
            const code = String((vals as Record<string, unknown>).internCode);
            insertedCodes.push(code);
            return [{ id: 'new-id', internCode: code }];
          },
          // non-returning inserts (entry assessment, factors) resolve immediately
          then: (resolve: (v: unknown) => void) => resolve(undefined),
        };
        return chain;
      },
    }),
  };
  const db = {
    transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx),
  };
  return { db: db as never, insertedCodes, attempts: () => internInserts };
}

const CODE_COLLISION = { code: '23505', constraint_name: 'interns_intern_code_unique' };
const NAME_COLLISION = { code: '23505', constraint_name: 'interns_identity_unique' };

describe('createInternWithCode', () => {
  it('inserts with a code built from the start-date year and the drawn number', async () => {
    const f = fakeDb();
    const result = await createInternWithCode(VALUES, { db: f.db, draw: () => 417 });
    expect(result).toEqual({ id: 'new-id', internCode: 'IMP-26-0417' });
    expect(f.insertedCodes).toEqual(['IMP-26-0417']);
  });

  it('redraws on an intern_code unique violation', async () => {
    const f = fakeDb({ failFirst: 2, error: CODE_COLLISION });
    const draws = [417, 417, 913];
    const result = await createInternWithCode(VALUES, { db: f.db, draw: () => draws.shift()! });
    expect(result.internCode).toBe('IMP-26-0913');
    expect(f.attempts()).toBe(3);
  });

  it('throws InternCodeExhaustedError after the attempt cap', async () => {
    const f = fakeDb({ failFirst: INTERN_CODE_MAX_ATTEMPTS + 1, error: CODE_COLLISION });
    await expect(createInternWithCode(VALUES, { db: f.db, draw: () => 1 })).rejects.toBeInstanceOf(
      InternCodeExhaustedError,
    );
    expect(f.attempts()).toBe(INTERN_CODE_MAX_ATTEMPTS);
  });

  it('does not retry a unique violation on a different constraint', async () => {
    const f = fakeDb({ failFirst: 1, error: NAME_COLLISION });
    await expect(createInternWithCode(VALUES, { db: f.db, draw: () => 1 })).rejects.toMatchObject(
      NAME_COLLISION,
    );
    expect(f.attempts()).toBe(1);
  });

  it('propagates non-unique errors untouched', async () => {
    const boom = new Error('connection reset');
    const f = fakeDb({ failFirst: 1, error: boom });
    await expect(createInternWithCode(VALUES, { db: f.db, draw: () => 1 })).rejects.toBe(boom);
  });

  it('uses the program-timezone year when there is no start date', async () => {
    const f = fakeDb();
    const result = await createInternWithCode(
      { ...VALUES, startDate: null },
      { db: f.db, draw: () => 5, now: new Date('2027-01-01T04:30:00Z') }, // Dec 31 in Indiana
    );
    expect(result.internCode).toBe('IMP-26-0005');
  });
});
