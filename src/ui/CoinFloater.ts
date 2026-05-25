import type Phaser from 'phaser';
import type { DisplayFish } from '../types/Fish.js';
import { speciesEarnRate } from '../util/earnRate.js';

export interface CoinFloater {
  update(fish: DisplayFish[], delta: number): void;
}

const FLOATER_LIFETIME_MS = 1200;
const FLOATER_RISE_PX = 30;
const FLOATER_DEPTH = 50;
/**
 * Minimum gap between floaters for a single species. Fast earners would otherwise
 * cross one whole coin every frame and emit a constant "+1" stream; instead they
 * accumulate and emit a batched "+N" at most ~once per this interval. Slow earners
 * (already < 1 coin/sec) are unaffected. Tunable.
 */
const MIN_FLOATER_INTERVAL_MS = 900;

/**
 * Per-species floating "+N" coin animations. Each display-fish sprite has its own
 * accumulator that increments by speciesEarnRate every frame. When the accumulator
 * crosses 1, a "+N" text spawns at the sprite's position and tweens upward / fades.
 *
 * cosmetic: one floater stream per species sprite at per-one-fish rate, not count-scaled;
 * real coins come from CoinEarn.
 *
 * Accumulator is in-memory only; reset on reload (no save impact).
 */
export function createCoinFloater(scene: Phaser.Scene): CoinFloater {
  const accumulators = new Map<string, number>();
  // Per-species timestamp (in elapsedMs) of the last floater spawned, for throttling.
  const lastSpawn = new Map<string, number>();
  let elapsedMs = 0;

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
    update(fish, delta) {
      const dtSec = delta / 1000;
      elapsedMs += delta;
      const liveIds = new Set(fish.map((f) => f.speciesId));
      for (const id of accumulators.keys()) {
        if (!liveIds.has(id)) accumulators.delete(id);
      }
      for (const id of lastSpawn.keys()) {
        if (!liveIds.has(id)) lastSpawn.delete(id);
      }

      for (const f of fish) {
        const rate = speciesEarnRate(f.speciesId);
        if (rate <= 0) continue;
        const acc = (accumulators.get(f.speciesId) ?? 0) + rate * dtSec;
        const sinceLast = elapsedMs - (lastSpawn.get(f.speciesId) ?? -Infinity);
        // Spawn only when a whole coin has accrued AND the throttle interval has
        // elapsed. Otherwise keep accumulating so the next floater shows the batched
        // total (a fast fish shows "+40" once, not "+1" every frame).
        if (acc >= 1 && sinceLast >= MIN_FLOATER_INTERVAL_MS) {
          const whole = Math.floor(acc);
          spawn(f.x, f.y, whole);
          accumulators.set(f.speciesId, acc - whole);
          lastSpawn.set(f.speciesId, elapsedMs);
        } else {
          accumulators.set(f.speciesId, acc);
        }
      }
    },
  };
}
