// Intern ID — the portal-assigned identifier that replaced First Initial +
// Last Name (spec: docs/superpowers/specs/2026-09-11-intern-id-identity-design.md).
//
// Format: IMP-YY-NNNN, e.g. IMP-26-0417.
//   IMP   the IMPACT program; a constant, not a setting (D2)
//   YY    year the intern entered the program (D3)
//   NNNN  0001–9999, drawn at random, unique across all interns (D4, D5)
//
// This module is PURE and importable from client code. Database work lives in
// intern-code.server.ts.

import { PROGRAM_TIME_ZONE } from './format';

export const INTERN_CODE_PREFIX = 'IMP';
export const INTERN_CODE_RE = /^IMP-\d{2}-\d{4}$/;
export const INTERN_CODE_MIN = 1;
export const INTERN_CODE_MAX = 9999;

/** Canonical form from its parts. Throws RangeError on out-of-range input. */
export function formatInternCode(yy: number, n: number): string {
  if (!Number.isInteger(yy) || yy < 0 || yy > 99) {
    throw new RangeError(`Intern code year out of range: ${yy}`);
  }
  if (!Number.isInteger(n) || n < INTERN_CODE_MIN || n > INTERN_CODE_MAX) {
    throw new RangeError(`Intern code number out of range: ${n}`);
  }
  return `${INTERN_CODE_PREFIX}-${String(yy).padStart(2, '0')}-${String(n).padStart(4, '0')}`;
}

/**
 * Lenient input → canonical form, or null.
 * Accepts `imp260417`, `IMP 26 0417`, `imp-26-0417`; case-insensitive; ignores
 * whitespace and hyphens. Anything that is not exactly IMP + 6 digits is null.
 */
export function normalizeInternCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]+/g, '');
  const m = /^IMP(\d{2})(\d{4})$/.exec(compact);
  if (!m) return null;
  return `${INTERN_CODE_PREFIX}-${m[1]}-${m[2]}`;
}

/**
 * Two-digit year for a new intern's code (D3): the Start Date's year when the
 * admin entered one (schema stores it as YYYY-MM-DD text), else "today" in the
 * program timezone. Lambda runs on UTC; a record created at 11 pm on Dec 31
 * Indiana time must not carry next year's ID.
 */
export function yearForInternCode(
  startDate: string | null | undefined,
  now: Date = new Date(),
): number {
  if (startDate) {
    const m = /^(\d{4})-\d{2}-\d{2}$/.exec(startDate);
    if (m) return Number(m[1]) % 100;
  }
  const year = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: PROGRAM_TIME_ZONE, year: 'numeric' }).format(now),
  );
  return year % 100;
}
