import type Phaser from 'phaser';
import { CONSTANTS } from '../data/constants.js';
import { TANK_FLOOR_HEIGHT } from './TankFloor.js';

/**
 * Static "aquarium glass" overlay that makes the diorama read as a contained
 * fish tank rather than open water. Draws, from back to front:
 *   - an air gap above the waterline (the backdrop water now starts at
 *     WATER_SURFACE_Y, leaving this strip for the glass top),
 *   - a bright waterline + a soft surface shimmer where the water stops,
 *   - 1-2 faint diagonal glass-sheen streaks down the water column,
 *   - a dark frame hugging all four edges with corner joints and a thin
 *     inner glass highlight.
 *
 * Biome-independent (glass and air look the same in every biome), so it is
 * created once - like the sand floor - rather than per-biome.
 *
 * Two depth layers:
 *   - air band at -96 sits above the backdrop (-100) and behind fish (0),
 *   - the frame/waterline/sheen at +40 sit in front of fish so the tank
 *     edges and the glass surface read as being between the viewer and the
 *     fish. Both stay below the HUD/SETTINGS overlays (depth 100).
 */

const AIR_DEPTH = -96;
const GLASS_DEPTH = 40;

/** Frame trim thickness in px. */
const FRAME = 6;

// Palette
const AIR_TOP = 0x0a1722; // shadowed glass top
const AIR_BOT = 0x13303f; // lighter just above the waterline
const FRAME_COLOR = 0x0a141d; // near-black tank trim
const JOINT_COLOR = 0x050c12; // darker corner joints
const HIGHLIGHT_COLOR = 0x7fb4cf; // glassy inner edge catch-light
const WATERLINE_COLOR = 0xe6f6fb; // bright surface line
const SHIMMER_COLOR = 0xbfe8f5; // soft glow below the surface
const SHEEN_COLOR = 0xffffff; // glass reflection streaks

export interface TankGlass {
  destroy(): void;
}

export function createTankGlass(scene: Phaser.Scene): TankGlass {
  const w = scene.scale.width;
  const h = CONSTANTS.DIORAMA_HEIGHT;
  const surfaceY = CONSTANTS.WATER_SURFACE_Y;

  // --- Back layer: the air gap above the waterline (behind fish) ---
  const back = scene.add.graphics().setDepth(AIR_DEPTH);
  back.fillGradientStyle(AIR_TOP, AIR_TOP, AIR_BOT, AIR_BOT, 1);
  back.fillRect(0, 0, w, surfaceY);

  // --- Front layer: sheen, waterline, then frame on top (in front of fish) ---
  const front = scene.add.graphics().setDepth(GLASS_DEPTH);

  // Glass sheen: faint left-leaning streaks running down the water column,
  // stopping at the sand so they read as light on the water, not the floor.
  const sheenTop = surfaceY + 8;
  const sheenBottom = h - TANK_FLOOR_HEIGHT;
  front.fillStyle(SHEEN_COLOR, 0.06);
  front.fillPoints(
    [
      { x: 92, y: sheenTop },
      { x: 138, y: sheenTop },
      { x: 96, y: sheenBottom },
      { x: 50, y: sheenBottom },
    ],
    true,
  );
  front.fillPoints(
    [
      { x: 172, y: sheenTop },
      { x: 190, y: sheenTop },
      { x: 152, y: sheenBottom },
      { x: 134, y: sheenBottom },
    ],
    true,
  );

  // Waterline: soft shimmer glow just below the surface, then a bright line.
  front.fillStyle(SHIMMER_COLOR, 0.22);
  front.fillRect(FRAME, surfaceY, w - 2 * FRAME, 6);
  front.fillStyle(WATERLINE_COLOR, 0.7);
  front.fillRect(FRAME, surfaceY, w - 2 * FRAME, 2);

  // Frame trim: four solid rects so the corners stay opaque.
  front.fillStyle(FRAME_COLOR, 1);
  front.fillRect(0, 0, w, FRAME); // top rim
  front.fillRect(0, h - FRAME, w, FRAME); // bottom rim
  front.fillRect(0, 0, FRAME, h); // left post
  front.fillRect(w - FRAME, 0, FRAME, h); // right post

  // Corner joints: small darker squares for a built frame look.
  const joint = 8;
  front.fillStyle(JOINT_COLOR, 1);
  front.fillRect(0, 0, joint, joint);
  front.fillRect(w - joint, 0, joint, joint);
  front.fillRect(0, h - joint, joint, joint);
  front.fillRect(w - joint, h - joint, joint, joint);

  // Inner glass highlight: a thin catch-light just inside the trim.
  front.lineStyle(2, HIGHLIGHT_COLOR, 0.3);
  front.strokeRect(FRAME, FRAME, w - 2 * FRAME, h - 2 * FRAME);

  return {
    destroy() {
      back.destroy();
      front.destroy();
    },
  };
}
