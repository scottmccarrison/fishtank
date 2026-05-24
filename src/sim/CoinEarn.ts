import type { SaveStateV2 } from '../types/Save.js';
import type { SimLoop } from './SimLoop.js';
import { CONSTANTS } from '../data/constants.js';
import { computeTotalEarnRate } from '../util/earnRate.js';

/**
 * Register a per-tick coin earn handler. Each tick:
 *   earned = computeTotalEarnRate(tanks) * (SIM_TICK_MS / 1000)
 *   state.coinBalance += earned
 *   state.lifetimeEarned += earned
 *
 * Mutates the state object in place (consistent with the FishAI pattern).
 * Returns an unsubscribe function.
 *
 * Note: uses SIM_TICK_MS instead of raw dt for the same reason Autosave does -
 * vitest fake timers in jsdom don't advance performance.now reliably, and the
 * production sim is paused while the tab is hidden (so dt ~= SIM_TICK_MS anyway).
 */
export function startCoinEarn(
  getState: () => SaveStateV2,
  _setState: (s: SaveStateV2) => void,
  simLoop: SimLoop,
): () => void {
  const dtSec = CONSTANTS.SIM_TICK_MS / 1000;
  return simLoop.addTickHandler(() => {
    const state = getState();
    const rate = computeTotalEarnRate(state.tanks);
    const earned = rate * dtSec;
    state.coinBalance += earned;
    state.lifetimeEarned += earned;
  });
}
