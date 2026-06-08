// app/lib/reports-format.ts
// Shared, framework-agnostic helpers for the reports dashboard. Pure
// functions only — safe to import from both server query code and client
// chart components (kept out of *.server.ts on purpose).

/** Whole-number percentage of n/d, or 0 when d <= 0 (no divide-by-zero). */
export function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}
