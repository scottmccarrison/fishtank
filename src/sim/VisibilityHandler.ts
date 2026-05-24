import type { SimLoop } from './SimLoop.js';
import type { SaveStateV2 } from '../types/Save.js';
import { applyCatchup, type CatchupResult } from './OfflineCatchup.js';
import { flushSave } from '../save/Autosave.js';

export interface VisibilityHandlerOptions {
  getState: () => SaveStateV2;
  setState: (newState: SaveStateV2) => void;
  simLoop: SimLoop;
  /** Optional - M7 wires this to the welcome-back toast. */
  onCatchup?: (result: { elapsedMs: number; coinsEarned: number }) => void;
}

/**
 * Pause sim + flush save when the tab is hidden.
 * Resume sim + apply catchup when the tab is visible again.
 *
 * Returns a cleanup function that removes the listener.
 */
export function registerVisibilityHandler(opts: VisibilityHandlerOptions): () => void {
  const handler = () => {
    if (document.visibilityState === 'hidden') {
      opts.simLoop.stop();
      const updated = flushSave(opts.getState());
      opts.setState(updated);
    } else if (document.visibilityState === 'visible') {
      const result: CatchupResult = applyCatchup(opts.getState(), new Date());
      opts.setState(result.newState);
      if (opts.onCatchup) {
        opts.onCatchup({ elapsedMs: result.elapsedMs, coinsEarned: result.coinsEarned });
      }
      opts.simLoop.start();
    }
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
