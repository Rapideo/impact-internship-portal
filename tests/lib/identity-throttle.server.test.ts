import { describe, it, expect, vi } from 'vitest';
import {
  clientIp,
  isThrottled,
  recordFailure,
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
      values: async (v: unknown) => {
        if (count instanceof Error) throw count;
        inserted.push(v);
      },
    }),
    delete: () => ({
      where: async (w: unknown) => {
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
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await isThrottled('1.2.3.4', { db: fakeDb(new Error('db down')).db })).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('recordFailure', () => {
  it('inserts a row and prunes old ones', async () => {
    const f = fakeDb(0);
    await recordFailure('1.2.3.4', { db: f.db, now: new Date('2026-09-11T22:00:00Z') });
    expect(f.inserted).toHaveLength(1);
    expect(f.inserted[0]).toMatchObject({ ip: '1.2.3.4' });
    expect(f.deleted).toHaveLength(1);
  });
  it('swallows errors', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      recordFailure('1.2.3.4', { db: fakeDb(new Error('db down')).db }),
    ).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
