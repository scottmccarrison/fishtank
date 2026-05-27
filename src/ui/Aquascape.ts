import type Phaser from 'phaser';
import { CONSTANTS } from '../data/constants.js';
import { TERRAIN_LAYOUT } from '../data/terrainLayout.js';
import { substrateHeightAt } from '../data/substrate.js';

/**
 * Renders the fixed aquascape terrain (rock shelves + arches) from TERRAIN_LAYOUT,
 * in two depth bands for parallax:
 *   - 'back'  at BACK_DEPTH, behind decorations (-5) and fish (0) but above the floor
 *     (-90), and tinted darker/cooler so it recedes;
 *   - 'front' at FRONT_DEPTH, in front of fish (so they can pass behind it) but below
 *     the glass frame (+40).
 * Static + biome-independent, so it's created once (like the floor/glass). Bottom-
 * anchored at each rock's authored y; scaled by the global CONTENT_SCALE zoom.
 * TERRAIN_LAYOUT is empty until the editor bake, so this renders nothing until then.
 */

const BACK_DEPTH = -8;
const FRONT_DEPTH = 1;
/** Multiplicative tint applied to back-band rocks so they read as further away. */
const BACK_TINT = 0x8b9bad;

export interface Aquascape {
  destroy(): void;
}

export function createAquascape(scene: Phaser.Scene): Aquascape {
  const sprites: Phaser.GameObjects.Image[] = [];

  for (const rock of TERRAIN_LAYOUT) {
    // Snap y to the substrate surface at this rock's x position
    const rockY = substrateHeightAt(rock.x);
    const sprite = scene.add
      .image(rock.x, rockY, rock.rockId)
      .setOrigin(0.5, 1)
      .setScale(rock.scale * CONSTANTS.CONTENT_SCALE)
      .setDepth(rock.band === 'back' ? BACK_DEPTH : FRONT_DEPTH);
    if (rock.band === 'back') sprite.setTint(BACK_TINT);
    sprites.push(sprite);
  }

  return {
    destroy() {
      for (const s of sprites) s.destroy();
    },
  };
}
