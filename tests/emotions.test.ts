import { describe, it, expect } from 'vitest';
import { coerceEmotion, EMOTIONS } from '../src/lib/emotions';

describe('coerceEmotion', () => {
  it('passes through valid emotions (any case)', () => {
    expect(coerceEmotion('SKEPTICISM')).toBe('SKEPTICISM');
    expect(coerceEmotion('skepticism')).toBe('SKEPTICISM');
    expect(coerceEmotion(' Interest ')).toBe('INTEREST');
  });

  it('defaults unknown / malformed values to NEUTRAL — the old delimiter bug class', () => {
    expect(coerceEmotion('@SKEPTICISM@')).toBe('NEUTRAL');
    expect(coerceEmotion('happy')).toBe('NEUTRAL');
    expect(coerceEmotion('')).toBe('NEUTRAL');
    expect(coerceEmotion(undefined)).toBe('NEUTRAL');
    expect(coerceEmotion(42)).toBe('NEUTRAL');
  });

  it('covers exactly the 8 expected emotions', () => {
    expect(EMOTIONS).toHaveLength(8);
  });
});
