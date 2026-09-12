import { describe, it, expect, vi } from 'vitest';
import {
  clientIp,
  isThrottled,
  reserveAttempt,
  releaseAttempt,
  THROTTLE_MAX_FAILURES,
} from '~/lib/identity-throttle.server';

function req(headers: Record<string, string>) {
  return new Request('https://x.test/intern/assessments', { headers });
}

describe('clientIp', () => {
  it('prefers the Netlify header', () => {
    expect(
      clientIp(req({ 'x-nf-client-connection-ip': '198.51.100.7', 'x-forwarded-for': '10.0.0.1' })),
    ).toBe('198.51.100.7');
  });
  it('falls back to the first x-forwarded-for hop', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.9, 10.0.0.2' }))).toBe('203.0.113.9');
  });
  it('returns "unknown" when neither header is present', () => {
    expect(clientIp(req({}))).toBe('unknown');
  });
});

/** Fake service client exposing only the chains the module uses. */
function fakeDb(count: number | Error) {
  const inserted: unknown[] = [];
  const deleted: unknown[] = [];
  const db = {
    select: () => ({
      from: () => ({
        where: async () => {
          if (count instanceof Error) throw count;
          return [{ n: count }];
        },
      }),
    }),
    insert: () => ({
      values: (v: unknown) => ({
        returning: async () => {
          if (count instanceof Error) throw count;
          inserted.push(v);
          return [{ id: 'att-1' }];
        },
      }),
    }),
    delete: () => ({
      where: async (w: unknown) => {
        if (count instanceof Error) throw count;
        deleted.push(w);
      },
    }),
  };
  return { db: db as never, inserted, deleted };
}

describe('isThrottled', () => {
  it('allows below the threshold', async () => {
    expect(await isThrottled('1.2.3.4', { db: fakeDb(THROTTLE_MAX_FAILURES - 1).db })).toBe(false);
  });
  it('blocks at the threshold', async () => {
    expect(await isThrottled('1.2.3.4', { db: fakeDb(THROTTLE_MAX_FAILURES).db })).toBe(true);
  });
  it('fails open when the query throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await isThrottled('1.2.3.4', { db: fakeDb(new Error('db down')).db })).toBe(false);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('reserveAttempt', () => {
  it('inserts a row and returns the count including itself', async () => {
    const f = fakeDb(4); // the count the DB reports (already includes the new row)
    const r = await reserveAttempt('1.2.3.4', { db: f.db, now: new Date('2026-09-11T22:00:00Z') });
    expect(r).toEqual({ id: 'att-1', n: 4 });
    expect(f.inserted[0]).toMatchObject({ ip: '1.2.3.4' });
    expect(f.deleted).toHaveLength(1); // the retention prune
  });
  it('fails open (null) and logs when the DB throws', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await reserveAttempt('1.2.3.4', { db: fakeDb(new Error('db down')).db })).toBeNull();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('releaseAttempt', () => {
  it('deletes the reserved row', async () => {
    const f = fakeDb(0);
    await releaseAttempt('att-1', { db: f.db });
    expect(f.deleted).toHaveLength(1);
  });
  it('swallows errors', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(
      releaseAttempt('att-1', { db: fakeDb(new Error('db down')).db }),
    ).resolves.toBeUndefined();
    error.mockRestore();
  });
});
