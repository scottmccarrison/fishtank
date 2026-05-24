import type { SaveStateV2 } from '../types/Save.js';
import { CONSTANTS } from '../data/constants.js';
import { computeTotalEarnRate } from '../util/earnRate.js';

/** Result of applyCatchup. Exposed for UI welcome-back toast. */
export interface CatchupResult {
  /** Updated save state with new coin balance and lastSavedAt. */
  newState: SaveStateV2;
  /** Time credited, in ms. Equals min(real elapsed, OFFLINE_CATCHUP_CAP_MS). */
  elapsedMs: number;
  /** Coins added in this catchup. */
  coinsEarned: number;
}

/**
 * Apply offline-progression catchup, per ADR-0003.
 *
 * Closed-form: coinsEarned = totalEarnRate(tanks) * (elapsedMs / 1000).
 * elapsedMs is capped at 24h. If lastSavedAt is in the future (clock skew,
 * timezone gymnastics), elapsed is clamped to 0 - never credit "negative" time.
 *
 * Returns a new immutable state. Does not mutate the input.
 */
export function applyCatchup(state: SaveStateV2, now: Date): CatchupResult {
  const lastSavedMs = new Date(state.lastSavedAt).getTime();
  const rawElapsed = now.getTime() - lastSavedMs;
  const elapsedMs = Math.max(0, Math.min(rawElapsed, CONSTANTS.OFFLINE_CATCHUP_CAP_MS));
  const ratePerSecond = computeTotalEarnRate(state.tanks);
  const coinsEarned = ratePerSecond * (elapsedMs / 1000);
  const newState: SaveStateV2 = {
    ...state,
    coinBalance: state.coinBalance + coinsEarned,
    lifetimeEarned: state.lifetimeEarned + coinsEarned,
    lastSavedAt: now.toISOString(),
  };
  return { newState, elapsedMs, coinsEarned };
}
