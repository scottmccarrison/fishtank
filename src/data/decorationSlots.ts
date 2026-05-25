/**
 * Decoration slots + upgrade chains. Each slot represents a fixed position in
 * the tank; upgrading a slot replaces the current tier's decoration with the
 * next tier's. Tier 0 = empty slot.
 *
 * Every tier id must exist in DECORATIONS; the DEV check at the bottom enforces it.
 */
import { DECORATION_BY_ID } from './decorations.js';

export interface DecorationSlot {
  /** Stable identifier for the slot. */
  id: string;
  /** Display name shown in the shop. */
  name: string;
  /** Ordered decoration ids, tier 1..N (index 0 = tier 1). */
  tiers: string[];
}

export const DECORATION_SLOTS: DecorationSlot[] = [
  { id: 'greenery',  name: 'Greenery',  tiers: ['grass-tuft', 'green-plant', 'eelgrass', 'tall-grass', 'red-anemone'] },
  { id: 'coral',     name: 'Coral',     tiers: ['pink-coral', 'green-coral', 'orange-coral'] },
  { id: 'shells',    name: 'Shells',    tiers: ['small-shell', 'pebble', 'giant-clam'] },
  { id: 'treasure',  name: 'Treasure',  tiers: ['barrel', 'anchor', 'treasure-chest'] },
  { id: 'landmark',  name: 'Landmark',  tiers: ['driftwood', 'castle-tower', 'toadstool-house'] },
  { id: 'wreck',     name: 'Wreck',     tiers: ['sunken-ship', 'stone-castle'] },
];

/** Provisional slot positions (PR2 will bake authored ones). x in [0,450], y = floor-ish. */
export const DECORATION_LAYOUT: Record<string, { x: number; y: number }> = {
  greenery:  { x: 70,  y: 420 },
  coral:     { x: 150, y: 420 },
  shells:    { x: 235, y: 432 },
  treasure:  { x: 320, y: 420 },
  landmark:  { x: 405, y: 420 },
  wreck:     { x: 225, y: 445 },
};

export const SLOT_BY_ID = new Map(DECORATION_SLOTS.map((s) => [s.id, s]));

// Fail fast in dev/test if a slot chain references a decoration id that doesn't
// exist (a typo would otherwise crash with an opaque error at render/purchase).
if (import.meta.env?.DEV) {
  for (const slot of DECORATION_SLOTS) {
    for (const id of slot.tiers) {
      if (!DECORATION_BY_ID.has(id)) {
        throw new Error(`[decorationSlots] slot '${slot.id}' references unknown decoration '${id}'`);
      }
    }
  }
}
