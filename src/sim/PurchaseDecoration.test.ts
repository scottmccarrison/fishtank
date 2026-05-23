import { describe, it, expect, beforeEach } from 'vitest';
import { purchaseDecoration } from './PurchaseDecoration.js';
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

describe('purchaseDecoration', () => {
  beforeEach(() => {
    setState(baseState());
  });

  it('succeeds when balance is sufficient (apple-core costs 25)', () => {
    const result = purchaseDecoration('apple-core');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.cost).toBe(25);
    expect(result.newDecoration.speciesId).toBe('apple-core');
    expect(result.newDecoration.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('deducts cost and appends to decorationInstances', () => {
    const before = getState().coinBalance;
    const result = purchaseDecoration('coral');
    expect(result.success).toBe(true);
    expect(getState().coinBalance).toBeCloseTo(before - 100, 3);
    expect(getState().decorationInstances).toHaveLength(1);
    expect(getState().decorationInstances[0]!.speciesId).toBe('coral');
  });

  it('fails on insufficient funds', () => {
    setState(baseState({ coinBalance: 10 }));
    const result = purchaseDecoration('coral');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('insufficient_funds');
  });

  it('fails on unknown species', () => {
    const result = purchaseDecoration('mystery-deco');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('unknown_species');
  });

  it('spawns near center of tank with small jitter', () => {
    const result = purchaseDecoration('coral');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.newDecoration.x).toBeGreaterThanOrEqual(360);
    expect(result.newDecoration.x).toBeLessThanOrEqual(440);
    expect(result.newDecoration.y).toBeGreaterThanOrEqual(260);
    expect(result.newDecoration.y).toBeLessThanOrEqual(340);
  });

  it('does not mutate balance or fish list on failure', () => {
    setState(baseState({ coinBalance: 10 }));
    const result = purchaseDecoration('coral');
    expect(result.success).toBe(false);
    expect(getState().coinBalance).toBe(10);
    expect(getState().decorationInstances).toHaveLength(0);
  });
});
