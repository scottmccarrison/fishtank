import type { FishInstance, FishSpecies } from '../types/Fish.js';
import { FISH_SPECIES } from '../data/fish.js';
import { fishCost } from '../util/fishCost.js';
import { uuid } from '../util/uuid.js';
import { getState } from '../state.js';

const SPECIES_BY_ID = new Map<string, FishSpecies>(FISH_SPECIES.map((s) => [s.id, s]));

export type PurchaseResult =
  | { success: true; newFish: FishInstance; cost: number }
  | { success: false; reason: 'unknown_species' | 'insufficient_funds' };

/**
 * Purchase a fish: validate balance, deduct cost, append to fishInstances.
 * Mutates the state object in place (consistent with CoinEarn and FishAI).
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

  const newFish: FishInstance = {
    id: uuid(),
    speciesId: species.id,
    x: 100 + Math.floor(Math.random() * 600),
    y: 100 + Math.floor(Math.random() * 400),
    direction: Math.random() > 0.5 ? 1 : -1,
    ownedAt: new Date().toISOString(),
  };
  state.fishInstances.push(newFish);

  return { success: true, newFish, cost };
}
