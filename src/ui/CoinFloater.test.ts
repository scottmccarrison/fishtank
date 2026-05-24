import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type Phaser from 'phaser';
import { createCoinFloater } from './CoinFloater.js';
import type { DisplayFish } from '../types/Fish.js';

const makeFish = (speciesId = 'goldfish'): DisplayFish => ({
  speciesId,
  x: 100,
  y: 100,
  direction: 1,
  behaviorType: 'cruiser',
});

function makeMockScene() {
  const spawned: Array<{ x: number; y: number; text: string }> = [];
  const tweenCalls: Array<{ targets: unknown; y?: number; alpha?: number; duration?: number }> = [];
  const sceneShim = {
    add: {
      text: (x: number, y: number, t: string) => {
        spawned.push({ x, y, text: t });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {
          x,
          y,
          alpha: 1,
          setOrigin: () => obj,
          setDepth: () => obj,
          destroy: () => {},
        };
        return obj;
      },
    },
    tweens: {
      add: (cfg: { targets: unknown; y?: number; alpha?: number; duration?: number; onComplete?: () => void }) => {
        tweenCalls.push({ targets: cfg.targets, y: cfg.y, alpha: cfg.alpha, duration: cfg.duration });
        return {};
      },
    },
  };
  return { scene: sceneShim, spawned, tweenCalls };
}

describe('CoinFloater', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('spawns a floater when a fish accumulates one whole coin', () => {
    const { scene, spawned } = makeMockScene();
    const floater = createCoinFloater(scene as unknown as Phaser.Scene);
    const fish = makeFish();
    floater.update([fish], 2000);
    expect(spawned).toHaveLength(1);
    expect(spawned[0]!.text).toBe('+1');
  });

  it('does not spawn until accumulator reaches 1', () => {
    const { scene, spawned } = makeMockScene();
    const floater = createCoinFloater(scene as unknown as Phaser.Scene);
    const fish = makeFish();
    floater.update([fish], 500);
    expect(spawned).toHaveLength(0);
  });

  it('clears accumulator state when fish disappears from instances', () => {
    const { scene, spawned } = makeMockScene();
    const floater = createCoinFloater(scene as unknown as Phaser.Scene);
    const fish = makeFish();
    floater.update([fish], 500);
    floater.update([], 500);
    floater.update([fish], 2000);
    expect(spawned).toHaveLength(1);
    expect(spawned[0]!.text).toBe('+1');
  });

  it('handles unknown speciesId gracefully (no spawn)', () => {
    const { scene, spawned } = makeMockScene();
    const floater = createCoinFloater(scene as unknown as Phaser.Scene);
    const fish = makeFish('mystery-fish');
    floater.update([fish], 5000);
    expect(spawned).toHaveLength(0);
  });
});
