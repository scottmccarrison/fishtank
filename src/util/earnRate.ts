import type { FishInstance } from '../types/Fish.js';
import { FISH_SPECIES } from '../data/fish.js';
import { CONSTANTS } from '../data/constants.js';

/** Lookup table: species id -> species data. Computed once at module load. */
const SPECIES_BY_ID = new Map(FISH_SPECIES.map((s) => [s.id, s]));

/**
 * Coins/second produced by a single owned fish.
 * Per ADR-0005, within-biome earn rate scales by EARN_RATIO_IN_BIOME^costIndex.
 * Returns 0 for unknown speciesId (defensive against save corruption / migrations).
 */
export function instanceEarnRate(instance: FishInstance): number {
  const species = SPECIES_BY_ID.get(instance.speciesId);
  if (!species) return 0;
  return species.earnRateBase * Math.pow(CONSTANTS.EARN_RATIO_IN_BIOME, species.costIndex);
}

/** Sum of all owned fishes' earn rates. */
export function computeTotalEarnRate(instances: FishInstance[]): number {
  let total = 0;
  for (const inst of instances) total += instanceEarnRate(inst);
  return total;
}
