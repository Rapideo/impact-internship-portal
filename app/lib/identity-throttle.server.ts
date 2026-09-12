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
 * Failures are recorded via reserve/release (`reserveAttempt` / `releaseAttempt`),
 * not a single post-hoc insert: reserving the row before the lookup and
 * counting with it included means concurrent requests from one IP each see
 * their own row plus every committed peer, so at most THROTTLE_MAX_FAILURES
 * pass per window regardless of burst size.
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
    console.error('[identity-throttle] check failed; failing open', err);
    return false;
  }
}

export interface ReservedAttempt {
  /** Row id, so the caller can release it if the attempt turns out not to be a failure. */
  id: string;
  /** Failures from this IP inside the window, INCLUDING this reservation. */
  n: number;
}

/**
 * Record this attempt as a failure up front and return how many failures the IP
 * now has in the window (including this one). Reserve-then-count is what makes
 * the throttle hold under concurrency: N parallel requests each see their own
 * row plus every committed peer, so at most THROTTLE_MAX_FAILURES pass no matter
 * how large the burst. The caller releases the row if the attempt succeeds.
 * Prunes rows older than a day opportunistically. Fails OPEN (returns null).
 */
export async function reserveAttempt(ip: string, opts: Opts = {}): Promise<ReservedAttempt | null> {
  const dbc = opts.db ?? defaultDbService;
  const now = opts.now ?? new Date();
  const since = new Date(now.getTime() - THROTTLE_WINDOW_MINUTES * 60_000);
  try {
    const [inserted] = await dbc
      .insert(identityAttempts)
      .values({ ip, attemptedAt: now })
      .returning({ id: identityAttempts.id });
    const [row] = await dbc
      .select({ n: sql<number>`count(*)::int` })
      .from(identityAttempts)
      .where(and(eq(identityAttempts.ip, ip), gt(identityAttempts.attemptedAt, since)));
    const cutoff = new Date(now.getTime() - RETENTION_HOURS * 3_600_000);
    await dbc.delete(identityAttempts).where(lt(identityAttempts.attemptedAt, cutoff));
    return { id: inserted!.id, n: row?.n ?? 1 };
  } catch (err) {
    console.error('[identity-throttle] reserve failed; failing open', err);
    return null;
  }
}

/** Undo a reservation — the attempt succeeded (or was refused over-limit), so it is not a failure. */
export async function releaseAttempt(id: string, opts: Opts = {}): Promise<void> {
  const dbc = opts.db ?? defaultDbService;
  try {
    await dbc.delete(identityAttempts).where(eq(identityAttempts.id, id));
  } catch (err) {
    console.error('[identity-throttle] release failed; ignoring', err);
  }
}
