import { describe, it, expect } from 'vitest';
import { speciesEarnRate, computeTotalEarnRate } from './earnRate.js';
import { CONSTANTS } from '../data/constants.js';

describe('speciesEarnRate', () => {
  it('goldfish (costIndex 0) earns FIRST_FISH_COST / PAYBACK_SECONDS', () => {
    const expected = CONSTANTS.FIRST_FISH_COST / CONSTANTS.PAYBACK_SECONDS;
    expect(speciesEarnRate('goldfish')).toBeCloseTo(expected, 8);
  });

  it('guppy (costIndex 1) earns goldfish rate * EARN_RATIO_IN_BIOME^1', () => {
    const base = CONSTANTS.FIRST_FISH_COST / CONSTANTS.PAYBACK_SECONDS;
    const expected = base * Math.pow(CONSTANTS.EARN_RATIO_IN_BIOME, 1);
    expect(speciesEarnRate('guppy')).toBeCloseTo(expected, 8);
  });

  it('returns 0 for unknown speciesId', () => {
    expect(speciesEarnRate('mystery-fish')).toBe(0);
  });

  it('open-reef fish earn more than tide-pool fish', () => {
    // purple-tang is open-reef costIndex 0; earnRateBase = FIRST_RATE * BIOME_EARN_STEP
    expect(speciesEarnRate('purple-tang')).toBeGreaterThan(speciesEarnRate('goldfish'));
  });
});

describe('computeTotalEarnRate', () => {
  it('returns 0 for empty tanks', () => {
    const tanks = {
      'tide-pool': { fishCounts: {}, slotTiers: {} },
      'open-reef': { fishCounts: {}, slotTiers: {} },
      'abyss': { fishCounts: {}, slotTiers: {} },
    };
    expect(computeTotalEarnRate(tanks)).toBe(0);
  });

  it('single goldfish returns speciesEarnRate("goldfish")', () => {
    const tanks = {
      'tide-pool': { fishCounts: { goldfish: 1 }, slotTiers: {} },
    };
    expect(computeTotalEarnRate(tanks)).toBeCloseTo(speciesEarnRate('goldfish'), 8);
  });

  it('count multiplies the species rate', () => {
    const tanks = {
      'tide-pool': { fishCounts: { goldfish: 5 }, slotTiers: {} },
    };
    expect(computeTotalEarnRate(tanks)).toBeCloseTo(speciesEarnRate('goldfish') * 5, 8);
  });

  it('sums across multiple species in one biome', () => {
    const tanks = {
      'tide-pool': { fishCounts: { goldfish: 2, guppy: 3 }, slotTiers: {} },
    };
    const expected = speciesEarnRate('goldfish') * 2 + speciesEarnRate('guppy') * 3;
    expect(computeTotalEarnRate(tanks)).toBeCloseTo(expected, 8);
  });

  it('sums across multiple biomes', () => {
    const tanks = {
      'tide-pool': { fishCounts: { goldfish: 1 }, slotTiers: {} },
      'open-reef': { fishCounts: { 'purple-tang': 2 }, slotTiers: {} },
      'abyss': { fishCounts: { anglerfish: 1 }, slotTiers: {} },
    };
    const expected =
      speciesEarnRate('goldfish') * 1 +
      speciesEarnRate('purple-tang') * 2 +
      speciesEarnRate('anglerfish') * 1;
    expect(computeTotalEarnRate(tanks)).toBeCloseTo(expected, 8);
  });

  it('ignores unknown speciesIds (returns 0 for them)', () => {
    const tanks = {
      'tide-pool': { fishCounts: { 'mystery-fish': 10 }, slotTiers: {} },
    };
    expect(computeTotalEarnRate(tanks)).toBe(0);
  });
});
