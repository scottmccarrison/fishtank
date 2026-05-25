import { describe, it, expect, beforeEach } from 'vitest';
import { upgradeSlot } from './UpgradeSlot.js';
import { setState, getState } from '../state.js';
import type { SaveStateV2 } from '../types/Save.js';
import { DECORATION_BY_ID } from '../data/decorations.js';
import { DECORATION_SLOTS } from '../data/decorationSlots.js';

// Cost helpers so tests are data-driven and don't hardcode magic numbers.
const greenerySlot = DECORATION_SLOTS.find((s) => s.id === 'greenery')!;
const tier1DecoId = greenerySlot.tiers[0]!;  // grass-tuft
const tier2DecoId = greenerySlot.tiers[1]!;  // green-plant
const tier1Cost = DECORATION_BY_ID.get(tier1DecoId)!.cost;
const tier2Cost = DECORATION_BY_ID.get(tier2DecoId)!.cost;

const baseState = (overrides: Partial<SaveStateV2> = {}): SaveStateV2 => ({
  version: 2,
  lastSavedAt: '2026-05-25T12:00:00.000Z',
  coinBalance: 10000,
  lifetimeEarned: 10000,
  tanks: {
    'tide-pool': { fishCounts: {}, slotTiers: {} },
    'open-reef':  { fishCounts: {}, slotTiers: {} },
    'abyss':      { fishCounts: {}, slotTiers: {} },
  },
  ...overrides,
});

describe('upgradeSlot', () => {
  beforeEach(() => {
    setState(baseState());
  });

  it('upgrades empty slot to tier 1 (deducts tiers[0] cost, sets tier 1)', () => {
    const before = getState().coinBalance;
    const result = upgradeSlot('greenery', 'tide-pool');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.tier).toBe(1);
    expect(result.cost).toBe(tier1Cost);
    expect(getState().coinBalance).toBeCloseTo(before - tier1Cost, 3);
    expect(getState().tanks['tide-pool']!.slotTiers!['greenery']).toBe(1);
  });

  it('upgrades tier 1 to tier 2 (deducts tiers[1] cost, sets tier 2)', () => {
    upgradeSlot('greenery', 'tide-pool');
    const before = getState().coinBalance;
    const result = upgradeSlot('greenery', 'tide-pool');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.tier).toBe(2);
    expect(result.cost).toBe(tier2Cost);
    expect(getState().coinBalance).toBeCloseTo(before - tier2Cost, 3);
    expect(getState().tanks['tide-pool']!.slotTiers!['greenery']).toBe(2);
  });

  it('returns maxed when current tier equals slot length', () => {
    // Manually set tier to the max (length)
    setState(baseState({
      tanks: {
        'tide-pool': { fishCounts: {}, slotTiers: { greenery: greenerySlot.tiers.length } },
        'open-reef':  { fishCounts: {}, slotTiers: {} },
        'abyss':      { fishCounts: {}, slotTiers: {} },
      },
    }));
    const balanceBefore = getState().coinBalance;
    const result = upgradeSlot('greenery', 'tide-pool');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('maxed');
    // No deduction
    expect(getState().coinBalance).toBe(balanceBefore);
    // Tier unchanged
    expect(getState().tanks['tide-pool']!.slotTiers!['greenery']).toBe(greenerySlot.tiers.length);
  });

  it('returns insufficient_funds when balance is too low', () => {
    setState(baseState({ coinBalance: tier1Cost - 1 }));
    const result = upgradeSlot('greenery', 'tide-pool');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('insufficient_funds');
    expect(getState().coinBalance).toBe(tier1Cost - 1);
    expect(getState().tanks['tide-pool']!.slotTiers!['greenery']).toBeUndefined();
  });

  it('returns unknown_slot for a nonexistent slot id', () => {
    const result = upgradeSlot('atlantis-slot', 'tide-pool');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('unknown_slot');
  });

  it('returns tank_missing for a nonexistent biome id', () => {
    const result = upgradeSlot('greenery', 'nonexistent-biome');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('tank_missing');
  });

  it('biome isolation: upgrading open-reef does not change tide-pool', () => {
    upgradeSlot('greenery', 'open-reef');
    expect(getState().tanks['open-reef']!.slotTiers!['greenery']).toBe(1);
    expect(getState().tanks['tide-pool']!.slotTiers!['greenery']).toBeUndefined();
    expect(getState().tanks['abyss']!.slotTiers!['greenery']).toBeUndefined();
  });

  it('does not mutate balance or tiers on failure (insufficient_funds)', () => {
    setState(baseState({ coinBalance: 5 }));
    upgradeSlot('greenery', 'tide-pool');
    expect(getState().coinBalance).toBe(5);
    expect(getState().tanks['tide-pool']!.slotTiers!['greenery']).toBeUndefined();
  });

  it('does not mutate balance or tiers on failure (unknown_slot)', () => {
    const balanceBefore = getState().coinBalance;
    upgradeSlot('bogus', 'tide-pool');
    expect(getState().coinBalance).toBe(balanceBefore);
  });
});
