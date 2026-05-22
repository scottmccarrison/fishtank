import type { SaveStateV1 } from '../types/Save.js';
import type { SimLoop } from '../sim/SimLoop.js';
import { CONSTANTS } from '../data/constants.js';
import { writeSave } from './SaveStore.js';

/**
 * Register an autosave tick handler. Accumulates dt and flushes when
 * AUTOSAVE_INTERVAL_MS is reached. On flush:
 *   1. Build a new state with lastSavedAt = now
 *   2. setState(new) so in-memory ref advances too
 *   3. writeSave(new) persists
 *
 * Returns an unsubscribe function.
 */
export function startAutosave(
  getState: () => SaveStateV1,
  setState: (newState: SaveStateV1) => void,
  simLoop: SimLoop,
): () => void {
  let accumulatedMs = 0;
  return simLoop.addTickHandler((_dt: number) => {
    accumulatedMs += CONSTANTS.SIM_TICK_MS;
    if (accumulatedMs >= CONSTANTS.AUTOSAVE_INTERVAL_MS) {
      accumulatedMs = 0;
      const updated: SaveStateV1 = {
        ...getState(),
        lastSavedAt: new Date().toISOString(),
      };
      setState(updated);
      writeSave(updated);
      if (import.meta.env.DEV) {
        console.log('[autosave]', updated.lastSavedAt, 'coins:', updated.coinBalance.toFixed(1));
      }
    }
  });
}

/**
 * Immediate save with refreshed lastSavedAt. Used by VisibilityHandler on
 * tab hide. Returns the updated state so the caller can sync its in-memory ref.
 *
 * The lastSavedAt advances to now even though no time-elapsed catchup happened -
 * this stamps "we paused here," so the next applyCatchup measures from hide-time.
 */
export function flushSave(state: SaveStateV1): SaveStateV1 {
  const updated: SaveStateV1 = { ...state, lastSavedAt: new Date().toISOString() };
  writeSave(updated);
  return updated;
}
