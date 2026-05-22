import { describe, it, expect } from 'vitest';
import { formatCoins } from './formatCoins.js';

describe('formatCoins', () => {
  it('formats 0 exactly', () => {
    expect(formatCoins(0)).toBe('0');
  });

  it('formats sub-1 with one decimal', () => {
    expect(formatCoins(0.5)).toBe('0.5');
    expect(formatCoins(0.556)).toBe('0.6');
    expect(formatCoins(0.999)).toBe('1');
  });

  it('formats 1-999 as integer', () => {
    expect(formatCoins(1)).toBe('1');
    expect(formatCoins(999)).toBe('999');
    expect(formatCoins(123.7)).toBe('123');
  });

  it('formats thousands with K', () => {
    expect(formatCoins(1_000)).toBe('1 K');
    expect(formatCoins(1_500)).toBe('1.5 K');
    expect(formatCoins(12_345)).toBe('12.3 K');
    expect(formatCoins(999_900)).toBe('999.9 K');
  });

  it('formats millions with M', () => {
    expect(formatCoins(1_000_000)).toBe('1 M');
    expect(formatCoins(1_500_000)).toBe('1.5 M');
    expect(formatCoins(50_000_000)).toBe('50 M');
  });

  it('formats billions with B', () => {
    expect(formatCoins(1_000_000_000)).toBe('1 B');
    expect(formatCoins(2_500_000_000)).toBe('2.5 B');
  });

  it('formats trillions with T', () => {
    expect(formatCoins(1_000_000_000_000)).toBe('1 T');
    expect(formatCoins(9_999_000_000_000_000)).toBe('9999 T');
  });

  it('handles negatives', () => {
    expect(formatCoins(-5)).toBe('-5');
    expect(formatCoins(-1_500)).toBe('-1.5 K');
    expect(formatCoins(-1_000_000)).toBe('-1 M');
  });

  it('handles edge values', () => {
    expect(formatCoins(NaN)).toBe('0');
    expect(formatCoins(Infinity)).toBe('0');
  });
});
