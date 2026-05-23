import type { FishSpecies } from '../types/Fish.js';
import { BIOMES } from '../data/biomes.js';
import { CONSTANTS } from '../data/constants.js';

/**
 * Cost of a fish species in coins, per ADR-0005.
 *
 * Formula: FIRST_FISH_COST * BIOME_COST_STEP^biomeIndex * COST_RATIO_IN_BIOME^(priorRatios + costIndex)
 *
 * where priorRatios = sum of (biome[i].count - 1) for i < biomeIndex. This accounts
 * for the fact that the biome step REPLACES the last in-biome ratio with 15x.
 *
 * Verified against ADR-0005 anchor values:
 *  - goldfish: 50 (tide pool, costIndex 0)
 *  - king-crab: ~1033 (tide pool, costIndex 9)
 *  - purple-tang: ~15495 (open-reef, costIndex 0)
 *  - stingray: ~320K (open-reef, costIndex 9)
 *  - anglerfish: ~4.8M (abyss, costIndex 0)
 *  - crab-dungeness: ~50M (abyss, costIndex 7)
 *
 * Returns Infinity for an unknown biomeId (defensive against save corruption / migrations).
 */
export function fishCost(species: FishSpecies): number {
  const biomeIndex = BIOMES.findIndex((b) => b.id === species.biomeId);
  if (biomeIndex < 0) return Infinity;

  let priorRatios = 0;
  for (let i = 0; i < biomeIndex; i++) {
    priorRatios += BIOMES[i]!.fishSpeciesIds.length - 1;
  }

  return (
    CONSTANTS.FIRST_FISH_COST *
    Math.pow(CONSTANTS.BIOME_COST_STEP, biomeIndex) *
    Math.pow(CONSTANTS.COST_RATIO_IN_BIOME, priorRatios + species.costIndex)
  );
}
