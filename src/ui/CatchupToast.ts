import type Phaser from 'phaser';
import { formatCoins } from '../util/formatCoins.js';

export interface CatchupToast {
  show(result: { elapsedMs: number; coinsEarned: number }): void;
}

const TOAST_DEPTH = 150;
const FADE_IN_MS = 400;
const HOLD_MS = 4000;
const FADE_OUT_MS = 800;

function formatDuration(elapsedMs: number): string {
  const minutes = Math.round(elapsedMs / 1000 / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${(minutes / 60).toFixed(1)} hr`;
}

/**
 * Brief "welcome back" overlay shown when offline catchup produces earnings.
 * Idempotent - safe to call repeatedly. Toasts stack; that's intentional since
 * a player who hides + shows + hides + shows would otherwise miss the second event.
 */
export function createCatchupToast(scene: Phaser.Scene): CatchupToast {
  return {
    show({ elapsedMs, coinsEarned }) {
      if (coinsEarned <= 0) return;

      const text = scene.add
        .text(
          scene.scale.width / 2,
          80,
          `Welcome back!\n+${formatCoins(coinsEarned)} coins earned (${formatDuration(elapsedMs)})`,
          {
            fontSize: '18px',
            color: '#fff8b0',
            fontFamily: 'monospace',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 3,
            backgroundColor: '#1a3a6b',
            padding: { x: 16, y: 10 },
          },
        )
        .setOrigin(0.5, 0)
        .setDepth(TOAST_DEPTH)
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
        delay: FADE_IN_MS + HOLD_MS,
        duration: FADE_OUT_MS,
        ease: 'Cubic.easeIn',
        onComplete: () => text.destroy(),
      });
    },
  };
}
