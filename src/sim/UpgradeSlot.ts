import { SLOT_BY_ID } from '../data/decorationSlots.js';
import { DECORATION_BY_ID } from '../data/decorations.js';
import { getState } from '../state.js';

export type UpgradeResult =
  | { success: true; slotId: string; tier: number; cost: number }
  | { success: false; reason: 'unknown_slot' | 'tank_missing' | 'maxed' | 'insufficient_funds' };

/**
 * Upgrades a decoration slot to the next tier in a given biome.
 * On success: deducts the tier's cost from coinBalance and increments slotTiers[slotId].
 * Guard order mirrors PurchaseDecoration: check slot, tank, max tier, then funds.
 */
export function upgradeSlot(slotId: string, biomeId: string): UpgradeResult {
  const slot = SLOT_BY_ID.get(slotId);
  if (!slot) return { success: false, reason: 'unknown_slot' };

  const state = getState();

  const tank = state.tanks[biomeId];
  if (!tank) return { success: false, reason: 'tank_missing' };

  // Defensively initialize slotTiers for old saves that may not have it.
  if (!tank.slotTiers) {
    tank.slotTiers = {};
  }

  const current = tank.slotTiers[slotId] ?? 0;
  if (current >= slot.tiers.length) {
    return { success: false, reason: 'maxed' };
  }

  const nextDecoId = slot.tiers[current]!;
  const cost = DECORATION_BY_ID.get(nextDecoId)!.cost;

  if (state.coinBalance < cost) {
    return { success: false, reason: 'insufficient_funds' };
  }

  state.coinBalance -= cost;
  tank.slotTiers[slotId] = current + 1;

  return { success: true, slotId, tier: current + 1, cost };
}
