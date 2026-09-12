/**
 * Format an ISO date string (YYYY-MM-DD) as MM.DD.YYYY (matches the
 * prototype's compact date style).
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const y = m[1]!;
  const mo = m[2]!;
  const d = m[3]!;
  return `${mo}.${d}.${y}`;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Format an ISO date string as "Month Day, Year".
 */
export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const y = m[1]!;
  const mo = m[2]!;
  const d = m[3]!;
  return `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

/**
 * Format a US phone number. If 10 digits, render (NNN) NNN-NNNN.
 * Otherwise return the input unchanged.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '—';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

/**
 * Convert a label to a stable URL/id slug.
 */
export function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

/**
 * Take the first 2 letters of a string, uppercase. Used for table avatar circles.
 */
export function initials(s: string): string {
  return (s || '').slice(0, 2).toUpperCase();
}

/**
 * Format a JS Date as "Month Day, Year" — used on assessment confirmation
 * pages + intern self-assessment status pills. Mirrors the prototype's
 * `IMPACT.formatCompletionDate` helper from app.js.
 */
export function formatCompletionDate(date: Date | null | undefined): string {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
}

/**
 * The program's timezone. IMPACT is Indiana-based and its staff are in-state,
 * so time-of-day copy is pinned here rather than read off the server clock:
 * Netlify Functions run on Lambda with TZ unset, which makes a bare
 * `new Date().getHours()` return UTC. Using the IANA zone (not a fixed offset)
 * keeps this correct across DST, which Indiana observes.
 */
export const PROGRAM_TIME_ZONE = 'America/Indiana/Indianapolis';

/**
 * Time-of-day greeting for the dashboard headers, evaluated in the program's
 * timezone: "Good morning" before noon, "Good afternoon" before 5pm,
 * "Good evening" thereafter.
 */
export function greetingFor(date: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: PROGRAM_TIME_ZONE,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(date),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Format an activity timestamp as "MM.DD.YYYY · HH:MM" in the program's
 * timezone. Shared by the admin and employer Recent Activity feeds. Pinned to
 * PROGRAM_TIME_ZONE for the same reason as greetingFor: these render during
 * SSR, where the server clock is UTC.
 */
export function formatActivityTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PROGRAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('month')}.${part('day')}.${part('year')} · ${part('hour')}:${part('minute')}`;
}
