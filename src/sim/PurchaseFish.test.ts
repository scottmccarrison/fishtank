import { describe, it, expect, beforeEach } from 'vitest';
import { purchaseFish } from './PurchaseFish.js';
import { setState, getState } from '../state.js';
import type { SaveStateV2 } from '../types/Save.js';

const baseState = (overrides: Partial<SaveStateV2> = {}): SaveStateV2 => ({
  version: 2,
  lastSavedAt: '2026-05-22T12:00:00.000Z',
  coinBalance: 1000,
  lifetimeEarned: 1000,
  tanks: {
    'tide-pool': { fishCounts: {}, decorations: [] },
    'open-reef': { fishCounts: {}, decorations: [] },
    'abyss': { fishCounts: {}, decorations: [] },
  },
  ...overrides,
});

describe('purchaseFish', () => {
  beforeEach(() => {
    setState(baseState());
  });

  it('succeeds when balance is sufficient (goldfish costs 50)', () => {
    const result = purchaseFish('goldfish');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.cost).toBe(50);
    expect(result.speciesId).toBe('goldfish');
    expect(result.newCount).toBe(1);
  });

  it('deducts cost from balance and increments fishCounts', () => {
    const before = getState().coinBalance;
    const result = purchaseFish('goldfish');
    expect(result.success).toBe(true);
    expect(getState().coinBalance).toBeCloseTo(before - 50, 3);
    expect(getState().tanks['tide-pool']!.fishCounts['goldfish']).toBe(1);
  });

  it('increments count on repeated purchases of the same species', () => {
    purchaseFish('goldfish');
    purchaseFish('goldfish');
    expect(getState().tanks['tide-pool']!.fishCounts['goldfish']).toBe(2);
    const result = purchaseFish('goldfish');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.newCount).toBe(3);
  });

  it('fails on insufficient funds', () => {
    setState(baseState({ coinBalance: 10 }));
    const result = purchaseFish('goldfish');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('insufficient_funds');
  });

  it('fails on unknown species', () => {
    const result = purchaseFish('mystery-fish');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('unknown_species');
  });

  it('does not mutate balance or fish counts on failure', () => {
    setState(baseState({ coinBalance: 10 }));
    const result = purchaseFish('goldfish');
    expect(result.success).toBe(false);
    expect(getState().coinBalance).toBe(10);
    expect(getState().tanks['tide-pool']!.fishCounts['goldfish'] ?? 0).toBe(0);
  });
});
