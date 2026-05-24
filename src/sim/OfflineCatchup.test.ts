import { describe, it, expect } from 'vitest';
import { applyCatchup } from './OfflineCatchup.js';
import { CONSTANTS } from '../data/constants.js';
import type { SaveStateV2 } from '../types/Save.js';

const stateWithGoldfish = (lastSavedAt: string, count = 1): SaveStateV2 => ({
  version: 2,
  lastSavedAt,
  coinBalance: 100,
  lifetimeEarned: 100,
  tanks: {
    'tide-pool': { fishCounts: { goldfish: count }, decorations: [] },
    'open-reef': { fishCounts: {}, decorations: [] },
    'abyss': { fishCounts: {}, decorations: [] },
  },
});

// For a single goldfish: rate = FIRST_FISH_COST / PAYBACK_SECONDS = 50/90 ~= 0.556 c/s
const goldfishRate = CONSTANTS.FIRST_FISH_COST / CONSTANTS.PAYBACK_SECONDS;

describe('applyCatchup', () => {
  it('credits coins linearly with elapsed time', () => {
    const state = stateWithGoldfish('2026-05-22T12:00:00.000Z');
    const result = applyCatchup(state, new Date('2026-05-22T12:01:00.000Z')); // 60s
    expect(result.elapsedMs).toBe(60_000);
    expect(result.coinsEarned).toBeCloseTo(goldfishRate * 60, 5);
    expect(result.newState.coinBalance).toBeCloseTo(100 + result.coinsEarned, 5);
    expect(result.newState.lifetimeEarned).toBeCloseTo(100 + result.coinsEarned, 5);
    expect(result.newState.lastSavedAt).toBe('2026-05-22T12:01:00.000Z');
  });

  it('caps elapsed time at OFFLINE_CATCHUP_CAP_MS (24h)', () => {
    const state = stateWithGoldfish('2026-05-20T12:00:00.000Z'); // 48h ago
    const result = applyCatchup(state, new Date('2026-05-22T12:00:00.000Z'));
    expect(result.elapsedMs).toBe(CONSTANTS.OFFLINE_CATCHUP_CAP_MS);
  });

  it('clamps elapsed to 0 on future lastSavedAt (clock skew)', () => {
    const state = stateWithGoldfish('2026-05-22T13:00:00.000Z'); // 1h in future
    const result = applyCatchup(state, new Date('2026-05-22T12:00:00.000Z'));
    expect(result.elapsedMs).toBe(0);
    expect(result.coinsEarned).toBe(0);
    expect(result.newState.coinBalance).toBe(100);
  });

  it('returns 0 coins when no fish are owned', () => {
    const state: SaveStateV2 = {
      version: 2,
      lastSavedAt: '2026-05-22T12:00:00.000Z',
      coinBalance: 100,
      lifetimeEarned: 100,
      tanks: {
        'tide-pool': { fishCounts: {}, decorations: [] },
        'open-reef': { fishCounts: {}, decorations: [] },
        'abyss': { fishCounts: {}, decorations: [] },
      },
    };
    const result = applyCatchup(state, new Date('2026-05-22T12:01:00.000Z'));
    expect(result.elapsedMs).toBe(60_000);
    expect(result.coinsEarned).toBe(0);
    expect(result.newState.coinBalance).toBe(100);
  });

  it('scales linearly with fish count', () => {
    const one = applyCatchup(stateWithGoldfish('2026-05-22T12:00:00.000Z', 1), new Date('2026-05-22T12:01:00.000Z'));
    const ten = applyCatchup(stateWithGoldfish('2026-05-22T12:00:00.000Z', 10), new Date('2026-05-22T12:01:00.000Z'));
    expect(ten.coinsEarned).toBeCloseTo(one.coinsEarned * 10, 5);
  });

  it('does not mutate the input state', () => {
    const state = stateWithGoldfish('2026-05-22T12:00:00.000Z');
    const before = JSON.stringify(state);
    applyCatchup(state, new Date('2026-05-22T12:05:00.000Z'));
    expect(JSON.stringify(state)).toBe(before);
  });

  it('ignores unknown speciesIds (defensive)', () => {
    const state: SaveStateV2 = {
      version: 2,
      lastSavedAt: '2026-05-22T12:00:00.000Z',
      coinBalance: 100,
      lifetimeEarned: 100,
      tanks: {
        'tide-pool': { fishCounts: { 'mystery-fish': 1 }, decorations: [] },
        'open-reef': { fishCounts: {}, decorations: [] },
        'abyss': { fishCounts: {}, decorations: [] },
      },
    };
    const result = applyCatchup(state, new Date('2026-05-22T12:01:00.000Z'));
    expect(result.coinsEarned).toBe(0);
  });
});
