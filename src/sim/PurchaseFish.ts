import type { FishSpecies } from '../types/Fish.js';
import { FISH_SPECIES } from '../data/fish.js';
import { fishCost } from '../util/fishCost.js';
import { getState } from '../state.js';

const SPECIES_BY_ID = new Map<string, FishSpecies>(FISH_SPECIES.map((s) => [s.id, s]));

export type PurchaseResult =
  | { success: true; speciesId: string; newCount: number; cost: number }
  | { success: false; reason: 'unknown_species' | 'insufficient_funds' };

/**
 * Purchase a fish: validate balance, deduct cost, increment count in the species' biome tank.
 * Mutates the state object in place (consistent with CoinEarn and FishAI).
 * No capacity check - that is Epic C.
 */
export function purchaseFish(speciesId: string): PurchaseResult {
  const species = SPECIES_BY_ID.get(speciesId);
  if (!species) return { success: false, reason: 'unknown_species' };

  const cost = fishCost(species);
  const state = getState();
  if (state.coinBalance < cost) {
    return { success: false, reason: 'insufficient_funds' };
  }

  state.coinBalance -= cost;
  const tank = state.tanks[species.biomeId];
  tank.fishCounts[speciesId] = (tank.fishCounts[speciesId] ?? 0) + 1;

  return { success: true, speciesId, newCount: tank.fishCounts[speciesId], cost };
}
