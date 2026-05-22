import type { SaveStateV1 } from './types/Save.js';

/**
 * Process-wide singleton for the current game state. Eliminates the need to
 * thread getState/setState callbacks through every consumer (and importantly,
 * removes the Phaser scene init data race - scenes can read state at any point
 * in their lifecycle once main.ts has called setState).
 *
 * setState replaces the reference (used by Autosave, VisibilityHandler when
 * they produce new immutable state). FishAI / CoinEarn mutate in place.
 */
let current: SaveStateV1 | null = null;

export function setState(s: SaveStateV1): void {
  current = s;
}

export function getState(): SaveStateV1 {
  if (!current) {
    throw new Error('State not initialized - call setState() before reading');
  }
  return current;
}
