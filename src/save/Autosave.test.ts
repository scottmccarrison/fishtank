import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startAutosave, flushSave } from './Autosave.js';
import { SimLoop } from '../sim/SimLoop.js';
import { CONSTANTS } from '../data/constants.js';
import type { SaveStateV2 } from '../types/Save.js';

const baseState: SaveStateV2 = {
  version: 2,
  lastSavedAt: '2026-05-22T12:00:00.000Z',
  coinBalance: 0,
  lifetimeEarned: 0,
  tanks: {
    'tide-pool': { fishCounts: {}, slotTiers: {} },
    'open-reef': { fishCounts: {}, slotTiers: {} },
    'abyss': { fishCounts: {}, slotTiers: {} },
  },
};

describe('Autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('writes to localStorage at AUTOSAVE_INTERVAL_MS cadence', () => {
    let state = { ...baseState };
    const loop = new SimLoop();
    startAutosave(
      () => state,
      (s) => {
        state = s;
      },
      loop,
    );
    loop.start();

    vi.advanceTimersByTime(CONSTANTS.AUTOSAVE_INTERVAL_MS - CONSTANTS.SIM_TICK_MS);
    expect(localStorage.getItem(CONSTANTS.SAVE_KEY)).toBeNull();

    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 2);
    const raw = localStorage.getItem(CONSTANTS.SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(2);
  });

  it('flushSave persists immediately and advances lastSavedAt', () => {
    const before = '2026-05-22T12:00:00.000Z';
    const state: SaveStateV2 = { ...baseState, lastSavedAt: before };
    const updated = flushSave(state);
    expect(updated.lastSavedAt).not.toBe(before);
    expect(localStorage.getItem(CONSTANTS.SAVE_KEY)).not.toBeNull();
  });

  it('startAutosave returns an unsubscribe function', () => {
    let state = { ...baseState };
    const loop = new SimLoop();
    const unsub = startAutosave(
      () => state,
      (s) => {
        state = s;
      },
      loop,
    );
    loop.start();
    unsub();
    vi.advanceTimersByTime(CONSTANTS.AUTOSAVE_INTERVAL_MS * 3);
    expect(localStorage.getItem(CONSTANTS.SAVE_KEY)).toBeNull();
  });
});
