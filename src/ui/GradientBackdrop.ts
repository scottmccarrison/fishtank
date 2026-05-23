import type Phaser from 'phaser';
import type { Biome } from '../types/Biome.js';

export interface GradientBackdrop {
  transitionTo(biome: Biome): void;
  destroy(): void;
}

const BACKDROP_DEPTH = -100;
const TRANSITION_MS = 1500;

/**
 * Vertical gradient background. Uses Phaser.GameObjects.Graphics with a
 * 4-corner fillGradientStyle (top corners = gradientFrom, bottom corners = gradientTo).
 * transitionTo crossfades a new graphics over the old, then destroys the old.
 */
export function createGradientBackdrop(
  scene: Phaser.Scene,
  initialBiome: Biome,
): GradientBackdrop {
  let current = makeBackdrop(scene, initialBiome);

  function makeBackdrop(s: Phaser.Scene, biome: Biome): Phaser.GameObjects.Graphics {
    const top = parseInt(biome.gradientFrom.replace('#', ''), 16);
    const bot = parseInt(biome.gradientTo.replace('#', ''), 16);
    const g = s.add.graphics().setDepth(BACKDROP_DEPTH);
    g.fillGradientStyle(top, top, bot, bot, 1);
    g.fillRect(0, 0, s.scale.width, s.scale.height);
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
    },
  };
}
