import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startCoinEarn } from './CoinEarn.js';
import { SimLoop } from './SimLoop.js';
import { CONSTANTS } from '../data/constants.js';
import type { SaveStateV2 } from '../types/Save.js';

const oneGoldfish = (): SaveStateV2 => ({
  version: 2,
  lastSavedAt: '2026-05-22T12:00:00.000Z',
  coinBalance: 0,
  lifetimeEarned: 0,
  tanks: {
    'tide-pool': { fishCounts: { goldfish: 1 }, decorations: [] },
    'open-reef': { fishCounts: {}, decorations: [] },
    'abyss': { fishCounts: {}, decorations: [] },
  },
});

describe('CoinEarn', () => {
  let activeLoop: SimLoop | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    activeLoop?.stop();
    activeLoop = null;
    vi.useRealTimers();
  });

  it('accumulates coins across ticks', () => {
    const state = oneGoldfish();
    const loop = new SimLoop();
    activeLoop = loop;
    startCoinEarn(() => state, () => {}, loop);
    loop.start();

    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 5);
    const expected = (CONSTANTS.FIRST_FISH_COST / CONSTANTS.PAYBACK_SECONDS);
    expect(state.coinBalance).toBeCloseTo(expected, 4);
    expect(state.lifetimeEarned).toBeCloseTo(expected, 4);
  });

  it('does not earn when no fish are owned', () => {
    const state: SaveStateV2 = {
      ...oneGoldfish(),
      tanks: {
        'tide-pool': { fishCounts: {}, decorations: [] },
        'open-reef': { fishCounts: {}, decorations: [] },
        'abyss': { fishCounts: {}, decorations: [] },
      },
    };
    const loop = new SimLoop();
    activeLoop = loop;
    startCoinEarn(() => state, () => {}, loop);
    loop.start();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 10);
    expect(state.coinBalance).toBe(0);
  });

  it('unsubscribe stops further earning', () => {
    const state = oneGoldfish();
    const loop = new SimLoop();
    activeLoop = loop;
    const unsub = startCoinEarn(() => state, () => {}, loop);
    loop.start();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 5);
    const balanceAfter5 = state.coinBalance;
    unsub();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 50);
    expect(state.coinBalance).toBe(balanceAfter5);
  });
});
