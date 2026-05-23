import type Phaser from 'phaser';

/**
 * Visible sandy floor at the bottom of the tank with scattered pebbles for texture.
 * Indicates the implicit boundary where decoration drag clamps - without this, the
 * invisible drag stop looks like a glitch ("I can't drop the coral here, why?").
 *
 * Depth -90 sits above the GradientBackdrop (-100) and below decorations (-5)
 * and fish (0), so swimming fish and placed decorations appear in front of the
 * sand. Static; does not change with biome (sandy floor reads as universal).
 */

const FLOOR_DEPTH = -90;
/** Height of the sandy band at the bottom of the tank, in pixels. */
export const TANK_FLOOR_HEIGHT = 60;

const SAND_TOP = 0xc8a87a; // light sand
const SAND_BOT = 0x8b6f4e; // darker damp sand
const PEBBLE_COLOR = 0x6b4f3a;

export interface TankFloor {
  destroy(): void;
}

export function createTankFloor(scene: Phaser.Scene): TankFloor {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const floorTopY = h - TANK_FLOOR_HEIGHT;

  const g = scene.add.graphics().setDepth(FLOOR_DEPTH);

  // Sand band (4-corner gradient: lighter at top, darker at bottom)
  g.fillGradientStyle(SAND_TOP, SAND_TOP, SAND_BOT, SAND_BOT, 1);
  g.fillRect(0, floorTopY, w, TANK_FLOOR_HEIGHT);

  // Scattered pebbles - position is deterministic from index so the floor
  // looks identical across reloads / biome transitions.
  g.fillStyle(PEBBLE_COLOR);
  for (let i = 0; i < 18; i++) {
    const x = (i * 47 + 23) % w;
    const y = floorTopY + 12 + ((i * 19) % (TANK_FLOOR_HEIGHT - 24));
    const r = 3 + (i % 4);
    g.fillCircle(x, y, r);
  }

  return {
    destroy() {
      g.destroy();
    },
  };
}
