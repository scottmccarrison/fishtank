import { describe, it, expect } from 'vitest';
import { fishCost } from './fishCost.js';
import { FISH_SPECIES } from '../data/fish.js';

const species = (id: string) => FISH_SPECIES.find((s) => s.id === id)!;

describe('fishCost', () => {
  it('first tide pool fish is FIRST_FISH_COST exactly', () => {
    expect(fishCost(species('goldfish'))).toBeCloseTo(50, 3);
  });

  it('last tide pool fish matches ADR anchor (~1033)', () => {
    const cost = fishCost(species('crab-king'));
    expect(cost).toBeGreaterThan(1000);
    expect(cost).toBeLessThan(1100);
  });

  it('first open reef fish matches ADR anchor (~15500)', () => {
    const cost = fishCost(species('purple-tang'));
    expect(cost).toBeGreaterThan(15_000);
    expect(cost).toBeLessThan(16_000);
  });

  it('last open reef fish matches ADR anchor (~320K)', () => {
    const cost = fishCost(species('stingray'));
    expect(cost).toBeGreaterThan(300_000);
    expect(cost).toBeLessThan(340_000);
  });

  it('first abyss fish matches ADR anchor (~4.8M)', () => {
    const cost = fishCost(species('anglerfish'));
    expect(cost).toBeGreaterThan(4_500_000);
    expect(cost).toBeLessThan(5_100_000);
  });

  it('last abyss fish matches the v1 50M goal', () => {
    const cost = fishCost(species('crab-dungeness'));
    expect(cost).toBeGreaterThan(40_000_000);
    expect(cost).toBeLessThan(60_000_000);
  });

  it('returns Infinity for unknown biome', () => {
    const fake = { ...species('goldfish'), biomeId: 'mystery' };
    expect(fishCost(fake)).toBe(Infinity);
  });

  it('cost monotonically increases with costIndex within a biome', () => {
    const tidePool = FISH_SPECIES.filter((s) => s.biomeId === 'tide-pool');
    for (let i = 1; i < tidePool.length; i++) {
      expect(fishCost(tidePool[i]!)).toBeGreaterThan(fishCost(tidePool[i - 1]!));
    }
  });
});
