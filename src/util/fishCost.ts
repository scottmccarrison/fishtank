import type { FishSpecies } from '../types/Fish.js';
import { BIOMES } from '../data/biomes.js';
import { CONSTANTS } from '../data/constants.js';

/**
 * Cost of a fish species in coins, per ADR-0005.
 *
 * Formula: FIRST_FISH_COST * BIOME_COST_STEP^biomeIndex * COST_RATIO_IN_BIOME^(priorRatios + costIndex)
 *
 * where priorRatios = sum of (biome[i].count - 1) for i < biomeIndex.
 *
 * Returns Infinity for an unknown biomeId.
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
