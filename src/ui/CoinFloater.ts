import type Phaser from 'phaser';
import type { FishInstance } from '../types/Fish.js';
import { instanceEarnRate } from '../util/earnRate.js';

export interface CoinFloater {
  update(instances: FishInstance[], delta: number): void;
}

const FLOATER_LIFETIME_MS = 1200;
const FLOATER_RISE_PX = 30;
const FLOATER_DEPTH = 50;

/**
 * Per-fish floating "+N" coin animations. Each fish has its own accumulator
 * that increments by its earn rate every frame. When the accumulator crosses
 * 1, a "+N" text spawns at the fish's position and tweens upward / fades.
 *
 * Accumulator is in-memory only; reset on reload (no save impact).
 */
export function createCoinFloater(scene: Phaser.Scene): CoinFloater {
  const accumulators = new Map<string, number>();

  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: '14px',
    color: '#fff8b0',
    fontFamily: 'monospace',
    stroke: '#000000',
    strokeThickness: 2,
  };

  function spawn(x: number, y: number, n: number): void {
    const text = scene.add
      .text(x, y - 16, `+${n}`, style)
      .setOrigin(0.5, 1)
      .setDepth(FLOATER_DEPTH);
    scene.tweens.add({
      targets: text,
      y: text.y - FLOATER_RISE_PX,
      alpha: 0,
      duration: FLOATER_LIFETIME_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  return {
    update(instances, delta) {
      const dtSec = delta / 1000;
      const liveIds = new Set(instances.map((f) => f.id));
      for (const id of accumulators.keys()) {
        if (!liveIds.has(id)) accumulators.delete(id);
      }

      for (const fish of instances) {
        const rate = instanceEarnRate(fish);
        if (rate <= 0) continue;
        const acc = (accumulators.get(fish.id) ?? 0) + rate * dtSec;
        if (acc >= 1) {
          const whole = Math.floor(acc);
          spawn(fish.x, fish.y, whole);
          accumulators.set(fish.id, acc - whole);
        } else {
          accumulators.set(fish.id, acc);
        }
      }
    },
  };
}
