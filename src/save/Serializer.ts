import type { SaveStateV1 } from '../types/Save.js';

/** Serialize a save state to a JSON string suitable for localStorage. */
export function serialize(state: SaveStateV1): string {
  return JSON.stringify(state);
}

/**
 * Parse a save state from JSON. Returns null on:
 *  - malformed JSON
 *  - non-object result
 *  - missing or unknown `version` field
 *
 * No exceptions escape this function. Callers can treat null as "start fresh".
 */
export function deserialize(json: string): SaveStateV1 | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as { version?: unknown };
  if (candidate.version !== 1) return null;
  return parsed as SaveStateV1;
}
