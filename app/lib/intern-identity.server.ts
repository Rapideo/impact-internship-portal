import crypto from 'node:crypto';
import { lookupInternByIdentity } from './identity.server';

export const INTERN_IDENTITY_COOKIE_NAME = 'impact_intern_identity';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface InternIdentityCookie {
  internId: string;
  firstInitial: string;
  lastName: string;
  cohortId: string;
  employerId: string;
}

/**
 * Read SESSION_SECRET lazily so test setup can override `process.env.SESSION_SECRET`
 * in a `beforeAll` without racing against module evaluation.
 */
function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET is required for signing identity cookies');
  }
  return s;
}

export function signInternIdentityCookie(identity: InternIdentityCookie): string {
  const payload = Buffer.from(JSON.stringify(identity)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function parseInternIdentityCookie(
  value: string | null | undefined,
): InternIdentityCookie | null {
  if (!value) return null;
  const idx = value.lastIndexOf('.');
  if (idx <= 0) return null;
  const payload = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  try {
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).internId === 'string' &&
      typeof (parsed as Record<string, unknown>).firstInitial === 'string' &&
      typeof (parsed as Record<string, unknown>).lastName === 'string' &&
      typeof (parsed as Record<string, unknown>).cohortId === 'string' &&
      typeof (parsed as Record<string, unknown>).employerId === 'string'
    ) {
      return parsed as InternIdentityCookie;
    }
    return null;
  } catch {
    return null;
  }
}

export function serializeInternIdentityCookie(
  value: string,
  opts: { isProd: boolean; clear?: boolean },
): string {
  const parts = [
    `${INTERN_IDENTITY_COOKIE_NAME}=${value}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${opts.clear ? 0 : MAX_AGE_SECONDS}`,
  ];
  if (opts.isProd) parts.push('Secure');
  return parts.join('; ');
}

/**
 * Read + re-validate the identity cookie against the live roster on each request.
 * Returns null if the cookie is missing/invalid OR the intern has been deleted/renamed.
 *
 * Defense-in-depth: even with a valid HMAC signature, we re-resolve the (firstInitial,
 * lastName, cohortId) composite against the live `interns` table and confirm the
 * resolved id matches the cookie's `internId`. This catches:
 *  - interns soft-deleted since cookie issuance
 *  - cohort reassignment
 *  - last-name corrections
 */
export async function getCurrentInternIdentity(
  request: Request,
): Promise<InternIdentityCookie | null> {
  const cookieHeader = request.headers.get('Cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${INTERN_IDENTITY_COOKIE_NAME}=([^;]+)`));
  if (!match || !match[1]) return null;
  const decoded = decodeURIComponent(match[1]);
  const parsed = parseInternIdentityCookie(decoded);
  if (!parsed) return null;

  const intern = await lookupInternByIdentity({
    firstInitial: parsed.firstInitial,
    lastName: parsed.lastName,
    cohortId: parsed.cohortId,
  });
  if (!intern || intern.id !== parsed.internId) return null;
  return parsed;
}
