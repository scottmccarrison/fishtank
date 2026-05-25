import type Phaser from 'phaser';
import { CONSTANTS } from '../data/constants.js';

/**
 * Per-biome tiled floor at the bottom of the tank.
 * Uses a TileSprite so the 48x48 tile fills the 60px band vertically (scale 1.25)
 * and tiles horizontally across the full canvas width.
 *
 * Depth -90 sits above the GradientBackdrop (-100) and below decorations (-5)
 * and fish (0), so swimming fish and placed decorations appear in front of it.
 */

const FLOOR_DEPTH = -90;
/** Height of the floor band at the bottom of the tank, in pixels. */
export const TANK_FLOOR_HEIGHT = 60;

const FLOOR_TEXTURE: Record<string, string> = {
  'tide-pool': 'floor-sand',
  'open-reef': 'floor-cobble',
  'abyss': 'floor-dark',
};

export interface TankFloor {
  showBiome(biomeId: string): void;
  destroy(): void;
}

export function createTankFloor(
  scene: Phaser.Scene,
  initialBiomeId: string,
  floorBottomY = CONSTANTS.DIORAMA_HEIGHT,
): TankFloor {
  const floorTopY = floorBottomY - TANK_FLOOR_HEIGHT; // 420
  const key = FLOOR_TEXTURE[initialBiomeId] ?? 'floor-sand';

  const tile = scene.add
    .tileSprite(0, floorTopY, scene.scale.width, TANK_FLOOR_HEIGHT, key)
    .setOrigin(0, 0)
    .setDepth(FLOOR_DEPTH);
  // Scale so the 48px native tile fills the 60px band vertically (no seam);
  // tileSprite tiles horizontally automatically.
  tile.setTileScale(TANK_FLOOR_HEIGHT / 48);

  return {
    showBiome(biomeId: string): void {
      tile.setTexture(FLOOR_TEXTURE[biomeId] ?? 'floor-sand');
    },
    destroy(): void {
      tile.destroy();
    },
  };
}
