import type { SaveStateV2 } from '../types/Save.js';
import { CONSTANTS } from '../data/constants.js';
import { serialize, deserialize } from './Serializer.js';

/**
 * Load the saved state from localStorage. Returns null on:
 *  - missing key (first run)
 *  - localStorage unavailable (private mode in some browsers)
 *  - malformed/unknown-version payload
 */
export function loadSave(): SaveStateV2 | null {
  try {
    const raw = localStorage.getItem(CONSTANTS.SAVE_KEY);
    if (raw === null) return null;
    return deserialize(raw);
  } catch (e) {
    console.warn('[save] loadSave failed:', e);
    return null;
  }
}

/** Persist state to localStorage. Swallows errors (full quota, private mode). */
export function writeSave(state: SaveStateV2): void {
  try {
    localStorage.setItem(CONSTANTS.SAVE_KEY, serialize(state));
  } catch (e) {
    console.warn('[save] writeSave failed:', e);
  }
}
