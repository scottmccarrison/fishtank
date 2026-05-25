import { describe, it, expect, vi } from 'vitest';
import type Phaser from 'phaser';
import { createBiomeTransition } from './BiomeTransition.js';
import { BIOMES } from '../data/biomes.js';
import type { SaveStateV2 } from '../types/Save.js';

const reefThreshold = BIOMES.find((b) => b.id === 'open-reef')!.unlockThreshold;

const baseState = (lifetimeEarned: number): SaveStateV2 => ({
  version: 2,
  lastSavedAt: '2026-05-22T12:00:00.000Z',
  coinBalance: 0,
  lifetimeEarned,
  tanks: {
    'tide-pool': { fishCounts: {}, slotTiers: {} },
    'open-reef': { fishCounts: {}, slotTiers: {} },
    'abyss': { fishCounts: {}, slotTiers: {} },
  },
});

function makeMockScene() {
  const texts: Array<{ x: number; y: number; text: string }> = [];
  const sceneShim = {
    scale: { width: 450, height: 800 },
    add: {
      text: (x: number, y: number, t: string) => {
        texts.push({ x, y, text: t });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {
          x,
          y,
          alpha: 1,
          setOrigin: () => obj,
          setDepth: () => obj,
          setAlpha: () => obj,
          destroy: () => {},
        };
        return obj;
      },
    },
    tweens: {
      add: (_cfg: { targets: unknown; duration?: number; onComplete?: () => void }) => ({}),
    },
  };
  return { scene: sceneShim, texts };
}

describe('BiomeTransition', () => {
  it('does not fire on initial load (lastBiomeId is current highest)', () => {
    const { scene, texts } = makeMockScene();
    const state = baseState(reefThreshold + 100);
    const t = createBiomeTransition(scene as unknown as Phaser.Scene, () => state);
    t.update();
    t.update();
    expect(texts).toHaveLength(0);
  });

  it('fires once when lifetime crosses a threshold', () => {
    const { scene, texts } = makeMockScene();
    let state = baseState(reefThreshold - 100);
    const onUnlock = vi.fn();
    const t = createBiomeTransition(scene as unknown as Phaser.Scene, () => state, onUnlock);
    t.update();
    expect(texts).toHaveLength(0);
    state = baseState(reefThreshold + 1);
    t.update();
    expect(texts).toHaveLength(1);
    expect(texts[0]!.text).toContain('OPEN REEF UNLOCKED');
    expect(onUnlock).toHaveBeenCalledOnce();
    expect(onUnlock.mock.calls[0]![0]!.id).toBe('open-reef');
  });

  it('subsequent updates after a fire do not re-fire', () => {
    const { scene, texts } = makeMockScene();
    let state = baseState(reefThreshold - 100);
    const t = createBiomeTransition(scene as unknown as Phaser.Scene, () => state);
    t.update();
    state = baseState(reefThreshold + 1);
    t.update();
    t.update();
    t.update();
    expect(texts).toHaveLength(1);
  });
});
