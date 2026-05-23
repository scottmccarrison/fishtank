import type { Biome } from '../types/Biome.js';
import { BIOMES } from '../data/biomes.js';

/**
 * Is a given biome unlocked at the player's current lifetime earnings?
 * Returns false for an unknown biomeId.
 */
export function isBiomeUnlocked(biomeId: string, lifetimeEarned: number): boolean {
  const biome = BIOMES.find((b) => b.id === biomeId);
  if (!biome) return false;
  return lifetimeEarned >= biome.unlockThreshold;
}

/**
 * The deepest biome the player has unlocked. Falls back to BIOMES[0] (Tide Pool,
 * threshold 0) which is always unlocked.
 */
export function getHighestUnlockedBiome(lifetimeEarned: number): Biome {
  for (let i = BIOMES.length - 1; i >= 0; i--) {
    const b = BIOMES[i]!;
    if (lifetimeEarned >= b.unlockThreshold) return b;
  }
  return BIOMES[0]!;
}
