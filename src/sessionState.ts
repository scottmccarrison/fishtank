import type { SimLoop } from './sim/SimLoop.js';

/**
 * Session-scoped (in-memory, non-persisted) handles used to bridge main.ts setup
 * and TankScene rendering. Not part of the SaveStateV1 schema - resets each
 * page load.
 *
 *  - isFirstRun: true when loadSave() returned null (player has no prior save).
 *    Set by main.ts; consumed by TankScene to show the WelcomeModal.
 *  - pendingCatchup: a single CatchupResult queued for display. Set by main.ts
 *    (on initial load) and VisibilityHandler.onCatchup (on tab return).
 *    Consumed by TankScene each frame and passed to CatchupToast.
 *  - simLoop: the SimLoop instance, set by main.ts. Read by TankScene to wire
 *    SettingsPanel (which needs to stop the sim before reset/import writeSave
 *    to prevent autosave from racing in and clobbering the new state).
 */

let _isFirstRun = false;
let _pendingCatchup: { elapsedMs: number; coinsEarned: number } | null = null;
let _simLoop: SimLoop | null = null;

export function setFirstRun(): void {
  _isFirstRun = true;
}

export function isFirstRun(): boolean {
  return _isFirstRun;
}

export function clearFirstRun(): void {
  _isFirstRun = false;
}

export function setPendingCatchup(result: { elapsedMs: number; coinsEarned: number }): void {
  _pendingCatchup = result;
}

export function consumePendingCatchup(): { elapsedMs: number; coinsEarned: number } | null {
  const r = _pendingCatchup;
  _pendingCatchup = null;
  return r;
}

export function setSimLoop(loop: SimLoop): void {
  _simLoop = loop;
}

export function getSimLoop(): SimLoop {
  if (!_simLoop) throw new Error('SimLoop not initialized - call setSimLoop in main.ts');
  return _simLoop;
}
