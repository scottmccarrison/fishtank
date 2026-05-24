import { FISH_SPECIES } from '../data/fish.js';
import { CONSTANTS } from '../data/constants.js';
import type { SaveStateV2 } from '../types/Save.js';

/** Lookup table: species id -> species data. Computed once at module load. */
const SPECIES_BY_ID = new Map(FISH_SPECIES.map((s) => [s.id, s]));

/**
 * Coins/second produced by a single owned fish of the given species.
 * Per ADR-0005, within-biome earn rate scales by EARN_RATIO_IN_BIOME^costIndex.
 * Returns 0 for unknown speciesId (defensive against save corruption / migrations).
 */
export function speciesEarnRate(speciesId: string): number {
  const s = SPECIES_BY_ID.get(speciesId);
  if (!s) return 0;
  return s.earnRateBase * Math.pow(CONSTANTS.EARN_RATIO_IN_BIOME, s.costIndex);
}

/** Total earn rate across all tanks: sum(count * speciesRate). */
export function computeTotalEarnRate(tanks: Record<string, { fishCounts: Record<string, number> }>): number {
  let total = 0;
  for (const tank of Object.values(tanks)) {
    for (const [speciesId, count] of Object.entries(tank.fishCounts)) {
      total += speciesEarnRate(speciesId) * count;
    }
  }
  return total;
}

// Re-export for type-level consumers that need the full SaveStateV2 signature.
export type { SaveStateV2 };
