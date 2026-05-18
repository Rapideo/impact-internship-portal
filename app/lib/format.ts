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
