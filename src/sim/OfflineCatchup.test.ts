import { describe, it, expect } from 'vitest';
import { applyCatchup } from './OfflineCatchup.js';
import { CONSTANTS } from '../data/constants.js';
import type { SaveStateV1 } from '../types/Save.js';

const stateWithFish = (lastSavedAt: string, fishCount = 1): SaveStateV1 => ({
  version: 1,
  lastSavedAt,
  coinBalance: 100,
  lifetimeEarned: 100,
  fishInstances: Array.from({ length: fishCount }).map((_, idx) => ({
    id: `id-${idx}`,
    speciesId: 'goldfish',
    x: 0,
    y: 0,
    direction: 1 as const,
    ownedAt: lastSavedAt,
  })),
  decorationInstances: [],
});

const goldfishRate = CONSTANTS.FIRST_FISH_COST / CONSTANTS.PAYBACK_SECONDS; // 50/90 ~= 0.556 c/s

describe('applyCatchup', () => {
  it('credits coins linearly with elapsed time', () => {
    const state = stateWithFish('2026-05-22T12:00:00.000Z');
    const result = applyCatchup(state, new Date('2026-05-22T12:01:00.000Z')); // 60s
    expect(result.elapsedMs).toBe(60_000);
    expect(result.coinsEarned).toBeCloseTo(goldfishRate * 60, 5);
    expect(result.newState.coinBalance).toBeCloseTo(100 + result.coinsEarned, 5);
    expect(result.newState.lifetimeEarned).toBeCloseTo(100 + result.coinsEarned, 5);
    expect(result.newState.lastSavedAt).toBe('2026-05-22T12:01:00.000Z');
  });

  it('caps elapsed time at OFFLINE_CATCHUP_CAP_MS (24h)', () => {
    const state = stateWithFish('2026-05-20T12:00:00.000Z'); // 48h ago
    const result = applyCatchup(state, new Date('2026-05-22T12:00:00.000Z'));
    expect(result.elapsedMs).toBe(CONSTANTS.OFFLINE_CATCHUP_CAP_MS);
  });

  it('clamps elapsed to 0 on future lastSavedAt (clock skew)', () => {
    const state = stateWithFish('2026-05-22T13:00:00.000Z'); // 1h in future
    const result = applyCatchup(state, new Date('2026-05-22T12:00:00.000Z'));
    expect(result.elapsedMs).toBe(0);
    expect(result.coinsEarned).toBe(0);
    expect(result.newState.coinBalance).toBe(100);
  });

  it('returns 0 coins when no fish are owned', () => {
    const state: SaveStateV1 = { ...stateWithFish('2026-05-22T12:00:00.000Z'), fishInstances: [] };
    const result = applyCatchup(state, new Date('2026-05-22T12:01:00.000Z'));
    expect(result.elapsedMs).toBe(60_000);
    expect(result.coinsEarned).toBe(0);
    expect(result.newState.coinBalance).toBe(100);
  });

  it('scales linearly with fish count', () => {
    const one = applyCatchup(stateWithFish('2026-05-22T12:00:00.000Z', 1), new Date('2026-05-22T12:01:00.000Z'));
    const ten = applyCatchup(stateWithFish('2026-05-22T12:00:00.000Z', 10), new Date('2026-05-22T12:01:00.000Z'));
    expect(ten.coinsEarned).toBeCloseTo(one.coinsEarned * 10, 5);
  });

  it('does not mutate the input state', () => {
    const state = stateWithFish('2026-05-22T12:00:00.000Z');
    const before = JSON.stringify(state);
    applyCatchup(state, new Date('2026-05-22T12:05:00.000Z'));
    expect(JSON.stringify(state)).toBe(before);
  });

  it('ignores unknown speciesIds (defensive)', () => {
    const state: SaveStateV1 = {
      version: 1,
      lastSavedAt: '2026-05-22T12:00:00.000Z',
      coinBalance: 100,
      lifetimeEarned: 100,
      fishInstances: [{
        id: 'x',
        speciesId: 'mystery-fish',
        x: 0, y: 0, direction: 1, ownedAt: '2026-05-22T12:00:00.000Z',
      }],
      decorationInstances: [],
    };
    const result = applyCatchup(state, new Date('2026-05-22T12:01:00.000Z'));
    expect(result.coinsEarned).toBe(0);
  });
});
