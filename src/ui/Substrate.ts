import type Phaser from 'phaser';
import { CONSTANTS } from '../data/constants.js';
import { substrateTopPoints, SUBSTRATE_COLORS } from '../data/substrate.js';

/**
 * Sloped substrate renderer - replaces TankFloor's flat tiled render.
 *
 * Draws a filled sand shape whose top edge follows the substrate height curve
 * (substrateTopPoints) down to DIORAMA_HEIGHT. Biome colors from SUBSTRATE_COLORS.
 * Depth -90 - same as TankFloor - sits above the backdrop (-100) and below
 * decorations (-5) and fish (0).
 *
 * Grain speckles use a fixed pseudo-random by index so the pattern is stable
 * across reloads (no Math.random at draw time).
 */

const FLOOR_DEPTH = -90;
const GRAIN_COUNT = 20;
const SURFACE_STRIP_OFFSET = 8; // px below top edge for the lighter surface band
const STEP = 10; // sample step for substrateTopPoints

/** A dead-simple deterministic value from an integer seed (0..1). */
function pseudoRandom(seed: number): number {
  // Linear congruential generator one-shot (good enough for speckle scatter)
  const v = ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  return v;
}

export interface Substrate {
  showBiome(biomeId: string): void;
  destroy(): void;
}

export function createSubstrate(scene: Phaser.Scene, initialBiomeId: string): Substrate {
  const width = CONSTANTS.CANVAS_WIDTH;
  const bottomY = CONSTANTS.DIORAMA_HEIGHT;
  const gfx = (scene.add as unknown as { graphics: () => Phaser.GameObjects.Graphics }).graphics();
  gfx.setDepth(FLOOR_DEPTH);

  function draw(biomeId: string): void {
    gfx.clear();
    const colors = SUBSTRATE_COLORS[biomeId] ?? SUBSTRATE_COLORS['tide-pool']!;
    const topPoints = substrateTopPoints(width, STEP);

    // --- Body fill: from the top curve down to DIORAMA_HEIGHT ---
    const bodyPoly = [
      ...topPoints,
      { x: width, y: bottomY },
      { x: 0, y: bottomY },
    ];
    gfx.fillStyle(colors.bottom, 1);
    gfx.fillPoints(bodyPoly, true);

    // --- Surface band: lighter strip hugging the top edge ---
    // Build a thin polygon by taking the top points and offsetting them down by
    // SURFACE_STRIP_OFFSET to form a second row, then close the shape.
    const lower = topPoints.map((p) => ({ x: p.x, y: p.y + SURFACE_STRIP_OFFSET }));
    const stripPoly = [...topPoints, ...lower.slice().reverse()];
    gfx.fillStyle(colors.top, 1);
    gfx.fillPoints(stripPoly, true);

    // --- Grain speckles: ~20 deterministic dots scattered below the surface ---
    gfx.fillStyle(colors.grain, 0.7);
    for (let i = 0; i < GRAIN_COUNT; i++) {
      // x across the full width, y within 10..50 px below the surface
      const x = pseudoRandom(i * 3 + 1) * width;
      const surfaceY = topPoints.find((p) => p.x >= x)?.y ?? topPoints[topPoints.length - 1]!.y;
      const yOffset = 10 + pseudoRandom(i * 3 + 2) * 40;
      const y = surfaceY + yOffset;
      if (y < bottomY - 4) {
        const r = 1.5 + pseudoRandom(i * 3 + 3) * 2;
        gfx.fillCircle(x, y, r);
      }
    }
  }

  draw(initialBiomeId);

  return {
    showBiome(biomeId: string): void {
      draw(biomeId);
    },
    destroy(): void {
      gfx.destroy();
    },
  };
}
