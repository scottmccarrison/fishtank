import { describe, it, expect } from 'vitest';
import { FishAI } from './FishAI.js';
import type { FishInstance } from '../types/Fish.js';

const makeFish = (overrides: Partial<FishInstance> = {}): FishInstance => ({
  id: 'fish-1',
  speciesId: 'goldfish',
  x: 400,
  y: 300,
  direction: 1,
  ownedAt: '2026-05-22T12:00:00.000Z',
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

  it('initializes AI state lazily for new fish', () => {
    const ai = new FishAI({ tankWidth: 800, tankHeight: 600, rng: stableRng });
    const fish1 = makeFish({ id: 'a' });
    const fish2 = makeFish({ id: 'b' });
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
});
