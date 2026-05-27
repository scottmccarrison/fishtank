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

/**
 * Slot positions (bottom-anchor x/y). High-left -> low-right diagonal following
 * the substrate slope. The renderer snaps y to substrateHeightAt(x) at runtime,
 * so the y values here are approximations for self-consistency only.
 */
export const DECORATION_LAYOUT: Record<string, { x: number; y: number }> = {
  landmark: { x: 75,  y: 360 }, // high-left plateau - the anchor, well clear of the castle
  greenery: { x: 140, y: 362 }, // left mass, beside/below the landmark
  coral:    { x: 215, y: 383 }, // mid slope (small accent)
  shells:   { x: 255, y: 395 }, // mid-right (clam), nestled before the castle
  wreck:    { x: 360, y: 422 }, // right secondary mass (castle), spaced from the landmark
  treasure: { x: 420, y: 432 }, // far-right low corner accent
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
