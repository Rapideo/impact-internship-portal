import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { action } from '~/routes/_public.intern.assessments';
import * as throttle from '~/lib/identity-throttle.server';
import * as identity from '~/lib/identity.server';
import * as dbMod from '~/lib/db.server';

const EMPLOYER = '11111111-1111-1111-1111-111111111102';
const COHORT = '33333333-3333-3333-3333-333333333302';

beforeAll(() => {
  process.env.SESSION_SECRET ??= 'test-secret-must-be-32-bytes-long-aaaa';
  process.env.APP_URL ??= 'http://localhost:5173';
});

function post(fields: Record<string, string>) {
  const fd = new FormData();
  fd.set('intent', 'confirm');
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return new Request('https://x.test/intern/assessments', { method: 'POST', body: fd });
}

/** db.select().from().where().limit() → rows */
function stubCohortQuery(rows: Array<{ employerId: string }>) {
  const stub = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => rows }) }) }),
  } as never;
  vi.spyOn(dbMod, 'db', 'get').mockReturnValue(stub);
}

type ActionResult = { error?: string; fields?: Record<string, string> };

describe('_public.intern.assessments action — ordering invariants', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('throttled IP: refused before any parsing, reservation or lookup', async () => {
    vi.spyOn(throttle, 'isThrottled').mockResolvedValue(true);
    const reserve = vi.spyOn(throttle, 'reserveAttempt');
    const lookup = vi.spyOn(identity, 'lookupInternByCode');
    const res = (await action({
      request: post({ internCode: 'garbage' }),
      params: {},
      context: {},
    } as never)) as ActionResult;
    expect(res.error).toMatch(/Too many attempts/);
    expect(reserve).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it('unparseable ID: shape error, nothing reserved, no lookup', async () => {
    vi.spyOn(throttle, 'isThrottled').mockResolvedValue(false);
    const reserve = vi.spyOn(throttle, 'reserveAttempt');
    const lookup = vi.spyOn(identity, 'lookupInternByCode');
    const res = (await action({
      request: post({ internCode: 'hello', employerId: EMPLOYER, cohortId: COHORT }),
      params: {},
      context: {},
    } as never)) as ActionResult;
    expect(res.error).toMatch(/form IMP-26-0417/);
    expect(reserve).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it('malformed cohort id: select-your-cohort error, nothing reserved', async () => {
    vi.spyOn(throttle, 'isThrottled').mockResolvedValue(false);
    const reserve = vi.spyOn(throttle, 'reserveAttempt');
    const res = (await action({
      request: post({ internCode: 'IMP-26-4001', employerId: EMPLOYER, cohortId: 'not-a-uuid' }),
      params: {},
      context: {},
    } as never)) as ActionResult;
    expect(res.error).toMatch(/select your cohort/i);
    expect(reserve).not.toHaveBeenCalled();
  });

  it('over the limit at reservation: refused, own row released, no lookup', async () => {
    vi.spyOn(throttle, 'isThrottled').mockResolvedValue(false);
    vi.spyOn(throttle, 'reserveAttempt').mockResolvedValue({
      id: 'att-1',
      n: throttle.THROTTLE_MAX_FAILURES + 1,
    });
    const release = vi.spyOn(throttle, 'releaseAttempt').mockResolvedValue();
    const lookup = vi.spyOn(identity, 'lookupInternByCode');
    const res = (await action({
      request: post({ internCode: 'IMP-26-4001', employerId: EMPLOYER, cohortId: COHORT }),
      params: {},
      context: {},
    } as never)) as ActionResult;
    expect(res.error).toMatch(/Too many attempts/);
    expect(release).toHaveBeenCalledWith('att-1');
    expect(lookup).not.toHaveBeenCalled();
  });

  it('miss: one message, reservation kept (not released)', async () => {
    vi.spyOn(throttle, 'isThrottled').mockResolvedValue(false);
    vi.spyOn(throttle, 'reserveAttempt').mockResolvedValue({ id: 'att-1', n: 1 });
    const release = vi.spyOn(throttle, 'releaseAttempt').mockResolvedValue();
    stubCohortQuery([{ employerId: EMPLOYER }]);
    vi.spyOn(identity, 'lookupInternByCode').mockResolvedValue(null);
    const res = (await action({
      request: post({ internCode: 'imp 26 0000', employerId: EMPLOYER, cohortId: COHORT }),
      params: {},
      context: {},
    } as never)) as ActionResult;
    expect(res.error).toMatch(/couldn't find that Intern ID/);
    expect(release).not.toHaveBeenCalled();
  });

  it('wrong cohort for the employer: same miss message, lookup skipped, reservation kept', async () => {
    vi.spyOn(throttle, 'isThrottled').mockResolvedValue(false);
    vi.spyOn(throttle, 'reserveAttempt').mockResolvedValue({ id: 'att-1', n: 1 });
    const release = vi.spyOn(throttle, 'releaseAttempt').mockResolvedValue();
    stubCohortQuery([]);
    const lookup = vi.spyOn(identity, 'lookupInternByCode');
    const res = (await action({
      request: post({ internCode: 'IMP-26-4001', employerId: EMPLOYER, cohortId: COHORT }),
      params: {},
      context: {},
    } as never)) as ActionResult;
    expect(res.error).toMatch(/couldn't find that Intern ID/);
    expect(lookup).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });

  it('success: reservation released, cookie set from the verified cohort row, redirect', async () => {
    vi.spyOn(throttle, 'isThrottled').mockResolvedValue(false);
    vi.spyOn(throttle, 'reserveAttempt').mockResolvedValue({ id: 'att-1', n: 1 });
    const release = vi.spyOn(throttle, 'releaseAttempt').mockResolvedValue();
    stubCohortQuery([{ employerId: EMPLOYER }]);
    vi.spyOn(identity, 'lookupInternByCode').mockResolvedValue({
      id: 'intern-1',
      internCode: 'IMP-26-4001',
      cohortId: COHORT,
    });
    let thrown: unknown;
    try {
      await action({
        request: post({ internCode: 'imp-26-4001', employerId: EMPLOYER, cohortId: COHORT }),
        params: {},
        context: {},
      } as never);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get('Location')).toBe('/intern/assessments');
    expect((thrown as Response).headers.get('Set-Cookie')).toMatch(/^impact_intern_identity=/);
    expect(release).toHaveBeenCalledWith('att-1');
  });
});
