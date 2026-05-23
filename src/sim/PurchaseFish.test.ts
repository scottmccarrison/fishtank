import { describe, it, expect, beforeEach } from 'vitest';
import { purchaseFish } from './PurchaseFish.js';
import { setState, getState } from '../state.js';
import type { SaveStateV1 } from '../types/Save.js';

const baseState = (overrides: Partial<SaveStateV1> = {}): SaveStateV1 => ({
  version: 1,
  lastSavedAt: '2026-05-22T12:00:00.000Z',
  coinBalance: 1000,
  lifetimeEarned: 1000,
  fishInstances: [],
  decorationInstances: [],
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
    expect(result.newFish.speciesId).toBe('goldfish');
    expect(result.newFish.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('deducts cost from balance and appends to fishInstances', () => {
    const before = getState().coinBalance;
    const result = purchaseFish('goldfish');
    expect(result.success).toBe(true);
    expect(getState().coinBalance).toBeCloseTo(before - 50, 3);
    expect(getState().fishInstances).toHaveLength(1);
    expect(getState().fishInstances[0]!.speciesId).toBe('goldfish');
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

  it('spawn position is within tank bounds', () => {
    const result = purchaseFish('goldfish');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.newFish.x).toBeGreaterThanOrEqual(100);
    expect(result.newFish.x).toBeLessThanOrEqual(700);
    expect(result.newFish.y).toBeGreaterThanOrEqual(100);
    expect(result.newFish.y).toBeLessThanOrEqual(500);
  });

  it('does not mutate balance or fish list on failure', () => {
    setState(baseState({ coinBalance: 10 }));
    const result = purchaseFish('goldfish');
    expect(result.success).toBe(false);
    expect(getState().coinBalance).toBe(10);
    expect(getState().fishInstances).toHaveLength(0);
  });
});
