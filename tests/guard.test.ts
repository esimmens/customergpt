import { describe, it, expect } from 'vitest';
import { resolveCap } from '../api/_shared/guard';

// Regression: MONTHLY_USD_CAP set to a BLANK value in the Vercel dashboard made
// Number('') === 0, so `memSpend < CAP` was false on a fresh deploy and every
// live call returned SPEND_CAP_REACHED before a cent had been spent.
describe('resolveCap — a malformed spend cap must not brick live mode', () => {
  it('uses the default for values that are absent, blank, or not a number', () => {
    for (const raw of [undefined, '', '   ', 'abc', 'NaN']) {
      expect(resolveCap(raw)).toBe(5);
    }
  });

  it('uses the default for zero and negative caps (a $0 cap blocks everything)', () => {
    expect(resolveCap('0')).toBe(5);
    expect(resolveCap('-1')).toBe(5);
  });

  it('honors a real configured cap', () => {
    expect(resolveCap('10')).toBe(10);
    expect(resolveCap('0.5')).toBe(0.5);
  });

  it('respects an explicit fallback', () => {
    expect(resolveCap('', 25)).toBe(25);
  });
});
