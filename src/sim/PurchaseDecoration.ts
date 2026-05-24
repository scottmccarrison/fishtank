import type { DecorationSpecies } from '../types/Decoration.js';
import { DECORATIONS } from '../data/decorations.js';
import { getState } from '../state.js';

const SPECIES_BY_ID = new Map<string, DecorationSpecies>(
  DECORATIONS.map((s) => [s.id, s]),
);

export type DecorationResult =
  | { success: true; speciesId: string; cost: number }
  | { success: false; reason: 'unknown_decoration' | 'tank_missing' | 'insufficient_funds' | 'already_owned' };

/**
 * Adds a decoration to a biome's owned set. No UI calls this in Epic A; Epic B wires the buy affordance.
 * On success: adds speciesId to state.tanks[biomeId].decorations if absent (else already_owned).
 * The diorama (WS2) renders whatever is in decorations - empty on fresh saves.
 */
export function purchaseDecoration(speciesId: string, biomeId: string): DecorationResult {
  const species = SPECIES_BY_ID.get(speciesId);
  if (!species) return { success: false, reason: 'unknown_decoration' };

  const state = getState();

  // Guard tank existence before any mutation - avoids coin loss on missing biome.
  const tank = state.tanks[biomeId];
  if (!tank) return { success: false, reason: 'tank_missing' };

  if (state.coinBalance < species.cost) {
    return { success: false, reason: 'insufficient_funds' };
  }

  if (tank.decorations.includes(speciesId)) {
    return { success: false, reason: 'already_owned' };
  }

  state.coinBalance -= species.cost;
  tank.decorations.push(speciesId);

  return { success: true, speciesId, cost: species.cost };
}
