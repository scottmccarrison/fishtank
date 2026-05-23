import { describe, it, expect } from 'vitest';
import type Phaser from 'phaser';
import { createCatchupToast } from './CatchupToast.js';

function makeMockScene() {
  const texts: Array<{ text: string }> = [];
  const sceneShim = {
    scale: { width: 800, height: 600 },
    add: {
      text: (_x: number, _y: number, t: string) => {
        texts.push({ text: t });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {
          x: 0, y: 0, alpha: 0,
          setOrigin: () => obj,
          setDepth: () => obj,
          setAlpha: () => obj,
          destroy: () => {},
        };
        return obj;
      },
    },
    tweens: {
      add: () => ({}),
    },
  };
  return { scene: sceneShim, texts };
}

describe('CatchupToast', () => {
  it('shows toast with formatted coins and duration', () => {
    const { scene, texts } = makeMockScene();
    const toast = createCatchupToast(scene as unknown as Phaser.Scene);
    toast.show({ elapsedMs: 30 * 60 * 1000, coinsEarned: 123 });
    expect(texts).toHaveLength(1);
    expect(texts[0]!.text).toContain('Welcome back!');
    expect(texts[0]!.text).toContain('+123 coins');
    expect(texts[0]!.text).toContain('30 min');
  });

  it('shows hours for durations >= 60 min', () => {
    const { scene, texts } = makeMockScene();
    const toast = createCatchupToast(scene as unknown as Phaser.Scene);
    toast.show({ elapsedMs: 2.5 * 60 * 60 * 1000, coinsEarned: 1234 });
    expect(texts[0]!.text).toContain('2.5 hr');
  });

  it('no-ops when coinsEarned is 0', () => {
    const { scene, texts } = makeMockScene();
    const toast = createCatchupToast(scene as unknown as Phaser.Scene);
    toast.show({ elapsedMs: 5000, coinsEarned: 0 });
    expect(texts).toHaveLength(0);
  });
});
