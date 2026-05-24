import type { SaveStateV2 } from '../types/Save.js';

/** Serialize a save state to a JSON string suitable for localStorage. */
export function serialize(state: SaveStateV2): string {
  return JSON.stringify(state);
}

/**
 * Parse a save state from JSON. Returns null on:
 *  - malformed JSON
 *  - non-object result
 *  - version !== 2 (v1 saves are logged and dropped; no migration)
 *
 * No exceptions escape this function. Callers can treat null as "start fresh".
 *
 * Guards are applied in strict order to avoid deref errors on malformed input:
 *  1. Parse in try/catch.
 *  2. Object + null check.
 *  3. version === 2 -> accept.
 *  4. typeof version === 'number' -> log drop.
 *  5. Catch-all null.
 */
export function deserialize(json: string): SaveStateV2 | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as { version?: unknown };
  if (candidate.version === 2) return parsed as SaveStateV2;
  if (typeof candidate.version === 'number') {
    console.info('[save] dropping v' + candidate.version + ' save (no migration; pre-release)');
    return null;
  }
  return null;
}
