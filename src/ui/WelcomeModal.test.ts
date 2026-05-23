import { describe, it, expect } from 'vitest';
import type Phaser from 'phaser';
import { createWelcomeModal } from './WelcomeModal.js';

function makeMockScene() {
  const texts: Array<{ text: string }> = [];
  const rects: Array<{ w: number; h: number }> = [];
  const handlers: Record<string, (() => void) | undefined> = {};
  const sceneShim = {
    scale: { width: 800, height: 600 },
    add: {
      rectangle: (_x: number, _y: number, w: number, h: number) => {
        rects.push({ w, h });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {
          alpha: 1,
          setDepth: () => obj,
          setInteractive: () => obj,
          on: (event: string, fn: () => void) => {
            handlers[event] = fn;
            return obj;
          },
          destroy: () => {},
        };
        return obj;
      },
      text: (_x: number, _y: number, t: string) => {
        texts.push({ text: t });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {
          alpha: 1,
          setOrigin: () => obj,
          setDepth: () => obj,
          destroy: () => {},
        };
        return obj;
      },
    },
    tweens: { add: () => ({}) },
  };
  return { scene: sceneShim, texts, rects, handlers };
}

describe('WelcomeModal', () => {
  it('renders overlay rect at full screen size and welcome text', () => {
    const { scene, texts, rects } = makeMockScene();
    const modal = createWelcomeModal(scene as unknown as Phaser.Scene);
    modal.show();
    expect(rects).toHaveLength(1);
    expect(rects[0]).toEqual({ w: 800, h: 600 });
    expect(texts).toHaveLength(1);
    expect(texts[0]!.text).toContain('Welcome to your fish tank!');
    expect(texts[0]!.text).toContain('SHOP');
  });

  it('registers a pointerdown handler on the overlay', () => {
    const { scene, handlers } = makeMockScene();
    const modal = createWelcomeModal(scene as unknown as Phaser.Scene);
    modal.show();
    expect(typeof handlers['pointerdown']).toBe('function');
  });
});
