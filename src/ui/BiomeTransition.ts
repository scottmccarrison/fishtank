import type Phaser from 'phaser';
import type { Biome } from '../types/Biome.js';
import type { SaveStateV2 } from '../types/Save.js';
import { getHighestUnlockedBiome } from '../util/biomeUnlock.js';

export interface BiomeTransition {
  update(): void;
}

const CELEBRATION_DEPTH = 300;
const FADE_IN_MS = 500;
const HOLD_MS = 1000;
const FADE_OUT_MS = 1500;

/**
 * Detects when lifetimeEarned crosses a biome unlock threshold mid-session and
 * spawns a brief celebration overlay. Initializes lastBiomeId to the currently-highest
 * unlocked biome at construction time, so reloading the page never re-fires for
 * already-unlocked biomes.
 */
export function createBiomeTransition(
  scene: Phaser.Scene,
  getState: () => SaveStateV2,
  onUnlock?: (biome: Biome) => void,
): BiomeTransition {
  let lastBiomeId = getHighestUnlockedBiome(getState().lifetimeEarned).id;

  function showCelebration(biome: Biome): void {
    const text = scene.add
      .text(
        scene.scale.width / 2,
        scene.scale.height / 2,
        `${biome.name.toUpperCase()} UNLOCKED!`,
        {
          fontSize: '40px',
          color: '#ffffff',
          fontFamily: 'monospace',
          stroke: '#000000',
          strokeThickness: 6,
        },
      )
      .setOrigin(0.5)
      .setDepth(CELEBRATION_DEPTH)
      .setAlpha(0);

    scene.tweens.add({
      targets: text,
      alpha: 1,
      duration: FADE_IN_MS,
      ease: 'Cubic.easeOut',
    });
    scene.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 30,
      delay: FADE_IN_MS + HOLD_MS,
      duration: FADE_OUT_MS,
      ease: 'Cubic.easeIn',
      onComplete: () => text.destroy(),
    });
  }

  return {
    update() {
      const current = getHighestUnlockedBiome(getState().lifetimeEarned);
      if (current.id !== lastBiomeId) {
        lastBiomeId = current.id;
        showCelebration(current);
        if (onUnlock) onUnlock(current);
      }
    },
  };
}
