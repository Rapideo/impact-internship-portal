import { describe, it, expect } from 'vitest';
import { pct } from '../app/lib/reports-format';

describe('pct', () => {
  it('returns a rounded percentage', () => {
    expect(pct(1, 4)).toBe(25);
    expect(pct(2, 3)).toBe(67); // 66.6 -> 67
  });

  it('returns 0 when the denominator is 0 (no divide-by-zero)', () => {
    expect(pct(0, 0)).toBe(0);
    expect(pct(5, 0)).toBe(0);
  });

  it('clamps nothing — 100% is possible', () => {
    expect(pct(4, 4)).toBe(100);
  });
});
