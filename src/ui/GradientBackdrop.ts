import type Phaser from 'phaser';
import type { Biome } from '../types/Biome.js';
import { CONSTANTS } from '../data/constants.js';

export interface GradientBackdrop {
  transitionTo(biome: Biome): void;
  destroy(): void;
}

const BACKDROP_DEPTH = -100;
const TRANSITION_MS = 1500;
// Phaser.BlendModes.ADD = 1 (numeric literal avoids a runtime Phaser import
// that would trigger canvas detection in jsdom during tests).
const BLEND_ADD = 1;

/**
 * Vertical gradient background. Uses Phaser.GameObjects.Graphics with a
 * 4-corner fillGradientStyle (top corners = gradientFrom, bottom corners = gradientTo).
 * transitionTo crossfades a new graphics over the old, then destroys the old.
 *
 * Also renders a single static additive water-texture TileSprite at depth -99
 * (above the gradient, below the floor at -90) for a subtle wavy-water feel.
 * The overlay is biome-independent and is not changed during transitionTo.
 */
export function createGradientBackdrop(
  scene: Phaser.Scene,
  initialBiome: Biome,
): GradientBackdrop {
  let current = makeBackdrop(scene, initialBiome);

  // Static wavy-water overlay: created once, sits above the gradient (-100) and
  // below the floor (-90). ADD blend mode tints highlights without changing hue.
  const overlay = scene.add
    .tileSprite(
      0,
      CONSTANTS.WATER_SURFACE_Y,
      scene.scale.width,
      CONSTANTS.DIORAMA_HEIGHT - CONSTANTS.WATER_SURFACE_Y,
      'water-texture',
    )
    .setOrigin(0, 0)
    .setDepth(-99);
  overlay.setBlendMode(BLEND_ADD);
  overlay.setAlpha(CONSTANTS.WATER_TEXTURE_ALPHA);

  function makeBackdrop(s: Phaser.Scene, biome: Biome): Phaser.GameObjects.Graphics {
    const top = parseInt(biome.gradientFrom.replace('#', ''), 16);
    const bot = parseInt(biome.gradientTo.replace('#', ''), 16);
    const g = s.add.graphics().setDepth(BACKDROP_DEPTH);
    g.fillGradientStyle(top, top, bot, bot, 1);
    // Water starts at the waterline, not the canvas top: the strip above
    // WATER_SURFACE_Y is the air gap painted by TankGlass. The ledger region
    // below the diorama is painted separately.
    g.fillRect(
      0,
      CONSTANTS.WATER_SURFACE_Y,
      s.scale.width,
      CONSTANTS.DIORAMA_HEIGHT - CONSTANTS.WATER_SURFACE_Y,
    );
    return g;
  }

  return {
    transitionTo(biome) {
      const next = makeBackdrop(scene, biome);
      next.alpha = 0;
      const previous = current;
      scene.tweens.add({
        targets: next,
        alpha: 1,
        duration: TRANSITION_MS,
        ease: 'Linear',
        onComplete: () => {
          previous.destroy();
          current = next;
        },
      });
    },
    destroy() {
      current.destroy();
      overlay.destroy();
    },
  };
}
