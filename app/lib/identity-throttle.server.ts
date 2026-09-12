import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { identityAttempts } from '../../db/schema';
import { dbService as defaultDbService, type DBService } from './db.service.server';

/**
 * Per-IP throttle on failed Intern-ID confirmations at the public chooser
 * (spec §7). Only FAILURES are recorded; ≥ THROTTLE_MAX_FAILURES within
 * THROTTLE_WINDOW_MINUTES refuses further attempts. Fails OPEN: an
 * infrastructure error logs and lets the request through — chooser
 * availability beats closing a rare abuse path.
 *
 * This is the second (and last) sanctioned anonymous use of `dbService`; the
 * first is the assessment-submission insert. Do not add a third.
 */
export const THROTTLE_WINDOW_MINUTES = 15;
export const THROTTLE_MAX_FAILURES = 10;
const RETENTION_HOURS = 24;

interface Opts {
  db?: DBService;
  now?: Date;
}

/** Netlify's trusted header first; a spoofed x-forwarded-for cannot override it in prod. */
export function clientIp(request: Request): string {
  const nf = request.headers.get('x-nf-client-connection-ip')?.trim();
  if (nf) return nf;
  const first = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return first || 'unknown';
}

export async function isThrottled(ip: string, opts: Opts = {}): Promise<boolean> {
  const dbc = opts.db ?? defaultDbService;
  const now = opts.now ?? new Date();
  const since = new Date(now.getTime() - THROTTLE_WINDOW_MINUTES * 60_000);
  try {
    const [row] = await dbc
      .select({ n: sql<number>`count(*)::int` })
      .from(identityAttempts)
      .where(and(eq(identityAttempts.ip, ip), gt(identityAttempts.attemptedAt, since)));
    return (row?.n ?? 0) >= THROTTLE_MAX_FAILURES;
  } catch (err) {
    console.warn('[identity-throttle] check failed; failing open', err);
    return false;
  }
}

export async function recordFailure(ip: string, opts: Opts = {}): Promise<void> {
  const dbc = opts.db ?? defaultDbService;
  const now = opts.now ?? new Date();
  try {
    await dbc.insert(identityAttempts).values({ ip, attemptedAt: now });
    const cutoff = new Date(now.getTime() - RETENTION_HOURS * 3_600_000);
    await dbc.delete(identityAttempts).where(lt(identityAttempts.attemptedAt, cutoff));
  } catch (err) {
    console.warn('[identity-throttle] record failed; ignoring', err);
  }
}
