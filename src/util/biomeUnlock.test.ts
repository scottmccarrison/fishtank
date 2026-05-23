import { describe, it, expect } from 'vitest';
import { isBiomeUnlocked, getHighestUnlockedBiome } from './biomeUnlock.js';
import { BIOMES } from '../data/biomes.js';

const reefThreshold = BIOMES.find((b) => b.id === 'open-reef')!.unlockThreshold;
const abyssThreshold = BIOMES.find((b) => b.id === 'abyss')!.unlockThreshold;

describe('isBiomeUnlocked', () => {
  it('Tide Pool is always unlocked, even at 0 lifetime earned', () => {
    expect(isBiomeUnlocked('tide-pool', 0)).toBe(true);
  });

  it('Open Reef is locked below threshold and unlocked at threshold', () => {
    expect(isBiomeUnlocked('open-reef', reefThreshold - 1)).toBe(false);
    expect(isBiomeUnlocked('open-reef', reefThreshold)).toBe(true);
    expect(isBiomeUnlocked('open-reef', reefThreshold + 1000)).toBe(true);
  });

  it('Abyss is locked when Reef is unlocked but threshold not met', () => {
    expect(isBiomeUnlocked('abyss', reefThreshold)).toBe(false);
    expect(isBiomeUnlocked('abyss', abyssThreshold)).toBe(true);
  });

  it('returns false for unknown biomeId', () => {
    expect(isBiomeUnlocked('mystery', 1_000_000_000)).toBe(false);
  });
});

describe('getHighestUnlockedBiome', () => {
  it('returns Tide Pool at 0 earnings', () => {
    expect(getHighestUnlockedBiome(0).id).toBe('tide-pool');
  });

  it('returns Tide Pool just below Reef threshold', () => {
    expect(getHighestUnlockedBiome(reefThreshold - 1).id).toBe('tide-pool');
  });

  it('returns Open Reef at Reef threshold', () => {
    expect(getHighestUnlockedBiome(reefThreshold).id).toBe('open-reef');
  });

  it('returns Open Reef just below Abyss threshold', () => {
    expect(getHighestUnlockedBiome(abyssThreshold - 1).id).toBe('open-reef');
  });

  it('returns Abyss at Abyss threshold', () => {
    expect(getHighestUnlockedBiome(abyssThreshold).id).toBe('abyss');
  });
});
