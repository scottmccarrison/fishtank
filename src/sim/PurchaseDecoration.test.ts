import { describe, it, expect, beforeEach } from 'vitest';
import { purchaseDecoration } from './PurchaseDecoration.js';
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

describe('purchaseDecoration', () => {
  beforeEach(() => {
    setState(baseState());
  });

  it('succeeds when balance is sufficient (grass-tuft costs 25)', () => {
    const result = purchaseDecoration('grass-tuft', 'tide-pool');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.cost).toBe(25);
    expect(result.speciesId).toBe('grass-tuft');
  });

  it('deducts cost and adds id to the biome decorations array', () => {
    const before = getState().coinBalance;
    const result = purchaseDecoration('eelgrass', 'tide-pool');
    expect(result.success).toBe(true);
    expect(getState().coinBalance).toBeCloseTo(before - 100, 3);
    expect(getState().tanks['tide-pool']!.decorations).toContain('eelgrass');
    expect(getState().tanks['tide-pool']!.decorations).toHaveLength(1);
  });

  it('returns already_owned when the decoration is already in the biome', () => {
    purchaseDecoration('eelgrass', 'tide-pool');
    const result = purchaseDecoration('eelgrass', 'tide-pool');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('already_owned');
    // Should still be exactly one entry - no duplicate
    expect(getState().tanks['tide-pool']!.decorations).toHaveLength(1);
  });

  it('fails on insufficient funds', () => {
    setState(baseState({ coinBalance: 10 }));
    const result = purchaseDecoration('eelgrass', 'tide-pool');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('insufficient_funds');
  });

  it('fails on unknown decoration', () => {
    const result = purchaseDecoration('mystery-deco', 'tide-pool');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('unknown_decoration');
  });

  it('does not mutate balance or decorations on failure', () => {
    setState(baseState({ coinBalance: 10 }));
    const result = purchaseDecoration('eelgrass', 'tide-pool');
    expect(result.success).toBe(false);
    expect(getState().coinBalance).toBe(10);
    expect(getState().tanks['tide-pool']!.decorations).toHaveLength(0);
  });

  it('adds decoration to the correct biome (not all biomes)', () => {
    purchaseDecoration('eelgrass', 'open-reef');
    expect(getState().tanks['open-reef']!.decorations).toContain('eelgrass');
    expect(getState().tanks['tide-pool']!.decorations).not.toContain('eelgrass');
    expect(getState().tanks['abyss']!.decorations).not.toContain('eelgrass');
  });
});
