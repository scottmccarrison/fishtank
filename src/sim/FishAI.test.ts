import { describe, it, expect } from 'vitest';
import { FishAI } from './FishAI.js';
import type { DisplayFish } from '../types/Fish.js';

const makeFish = (overrides: Partial<DisplayFish> = {}): DisplayFish => ({
  speciesId: 'goldfish',
  x: 400,
  y: 300,
  direction: 1,
  behaviorType: 'cruiser',
  ...overrides,
});

const stableRng = () => 0.5;

describe('FishAI', () => {
  it('drift moves position horizontally over time', () => {
    const ai = new FishAI({ tankWidth: 800, tankHeight: 600, rng: stableRng });
    const fish = makeFish();
    const startX = fish.x;
    ai.update([fish], 1000);
    expect(fish.x).toBeGreaterThan(startX + 15);
    expect(fish.x).toBeLessThan(startX + 25);
  });

  it('bounces off right edge and flips direction', () => {
    const ai = new FishAI({ tankWidth: 800, tankHeight: 600, rng: stableRng });
    const fish = makeFish({ x: 790, direction: 1 });
    ai.update([fish], 1000);
    expect(fish.direction).toBe(-1);
    expect(fish.x).toBeLessThanOrEqual(800 - 32);
  });

  it('bounces off left edge and flips direction', () => {
    const ai = new FishAI({ tankWidth: 800, tankHeight: 600, rng: stableRng });
    const fish = makeFish({ x: 10, direction: -1 });
    ai.update([fish], 1000);
    expect(fish.direction).toBe(1);
    expect(fish.x).toBeGreaterThanOrEqual(32);
  });

  it('initializes AI state lazily for new fish (keyed by speciesId)', () => {
    const ai = new FishAI({ tankWidth: 800, tankHeight: 600, rng: stableRng });
    const fish1 = makeFish({ speciesId: 'goldfish' });
    const fish2 = makeFish({ speciesId: 'guppy' });
    ai.update([fish1], 200);
    ai.update([fish1, fish2], 200);
    expect(fish1.x).not.toBe(400);
    expect(fish2.x).not.toBe(400);
  });

  it('respects custom margin', () => {
    const ai = new FishAI({ tankWidth: 800, tankHeight: 600, margin: 100, rng: stableRng });
    const fish = makeFish({ x: 90, direction: -1 });
    ai.update([fish], 200);
    expect(fish.x).toBeGreaterThanOrEqual(100);
    expect(fish.direction).toBe(1);
  });

  it('dart triggers when rng falls below the per-second probability', () => {
    let calls = 0;
    const rng = () => (calls++ < 2 ? 0 : 0.5);
    const ai = new FishAI({ tankWidth: 800, tankHeight: 600, rng });
    const fish = makeFish();
    const startX = fish.x;
    // First tick: drift applies + dart state is armed (dartMs set).
    // Second tick: dart velocity applies on top of drift.
    ai.update([fish], 1000);
    ai.update([fish], 500);
    expect(Math.abs(fish.x - startX)).toBeGreaterThan(20);
  });

  it('stays within tank bounds after many ticks', () => {
    const ai = new FishAI({ tankWidth: 450, tankHeight: 480, rng: stableRng });
    const fish = makeFish({ x: 225, y: 240 });
    for (let i = 0; i < 100; i++) {
      ai.update([fish], 200);
    }
    expect(fish.x).toBeGreaterThanOrEqual(32);
    expect(fish.x).toBeLessThanOrEqual(450 - 32);
    expect(fish.y).toBeGreaterThanOrEqual(32);
    expect(fish.y).toBeLessThanOrEqual(480 - 32);
  });
});
