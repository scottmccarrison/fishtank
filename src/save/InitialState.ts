import type { SaveStateV2 } from '../types/Save.js';

/**
 * First-run initial state per ADR-0004 / ADR-0005:
 *  - One free starter goldfish in the Tide Pool (count 1).
 *  - 0 coins, 0 lifetime earned, no decorations.
 *  - The diorama assigns display position - no x/y stored here.
 */
export function createInitialState(): SaveStateV2 {
  return {
    version: 2,
    lastSavedAt: new Date().toISOString(),
    coinBalance: 0,
    lifetimeEarned: 0,
    tanks: {
      'tide-pool': { fishCounts: { goldfish: 1, 'crab-blue': 1, starfish: 1, seahorse: 1 }, slotTiers: {} },
      'open-reef':  { fishCounts: {}, slotTiers: {} },
      'abyss':      { fishCounts: {}, slotTiers: {} },
    },
  };
}
