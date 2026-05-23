import type { DecorationInstance, DecorationSpecies } from '../types/Decoration.js';
import { DECORATIONS } from '../data/decorations.js';
import { uuid } from '../util/uuid.js';
import { getState } from '../state.js';

const SPECIES_BY_ID = new Map<string, DecorationSpecies>(
  DECORATIONS.map((s) => [s.id, s]),
);

export type PurchaseDecorationResult =
  | { success: true; newDecoration: DecorationInstance; cost: number }
  | { success: false; reason: 'unknown_species' | 'insufficient_funds' };

export function purchaseDecoration(speciesId: string): PurchaseDecorationResult {
  const species = SPECIES_BY_ID.get(speciesId);
  if (!species) return { success: false, reason: 'unknown_species' };

  const state = getState();
  if (state.coinBalance < species.cost) {
    return { success: false, reason: 'insufficient_funds' };
  }

  state.coinBalance -= species.cost;

  const newDecoration: DecorationInstance = {
    id: uuid(),
    speciesId: species.id,
    x: 400 + Math.floor(Math.random() * 80) - 40,
    y: 300 + Math.floor(Math.random() * 80) - 40,
    placedAt: new Date().toISOString(),
  };
  state.decorationInstances.push(newDecoration);

  return { success: true, newDecoration, cost: species.cost };
}
