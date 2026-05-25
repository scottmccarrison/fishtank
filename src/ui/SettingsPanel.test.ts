import { describe, it, expect, vi } from 'vitest';
import { isPlausibleSaveState } from './SettingsPanel.js';
import { BIOMES } from '../data/biomes.js';
import type { SaveStateV2 } from '../types/Save.js';

// Mock browser globals and Phaser-dependent modules so the import doesn't throw.
vi.mock('phaser', () => ({ default: {} }));
vi.mock('../save/SaveStore.js', () => ({ writeSave: vi.fn() }));
vi.mock('../save/Autosave.js', () => ({ flushSave: vi.fn() }));
vi.mock('../save/InitialState.js', () => ({ createInitialState: vi.fn() }));
vi.mock('../state.js', () => ({ getState: vi.fn(), setState: vi.fn() }));
vi.mock('../save/Serializer.js', () => ({ serialize: vi.fn(), deserialize: vi.fn() }));

function validState(overrides: Partial<SaveStateV2> = {}): SaveStateV2 {
  const tanks: Record<string, { fishCounts: Record<string, number>; slotTiers: Record<string, number> }> = {};
  for (const b of BIOMES) {
    tanks[b.id] = { fishCounts: {}, slotTiers: {} };
  }
  return {
    version: 2,
    lastSavedAt: '2026-05-24T12:00:00.000Z',
    coinBalance: 100,
    lifetimeEarned: 200,
    tanks,
    ...overrides,
  };
}

describe('isPlausibleSaveState', () => {
  it('accepts a complete valid save', () => {
    expect(isPlausibleSaveState(validState())).toBe(true);
  });

  it('rejects wrong version', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isPlausibleSaveState(validState({ version: 1 as any }))).toBe(false);
  });

  it('rejects non-finite coinBalance', () => {
    expect(isPlausibleSaveState(validState({ coinBalance: NaN }))).toBe(false);
    expect(isPlausibleSaveState(validState({ coinBalance: Infinity }))).toBe(false);
  });

  it('rejects negative coinBalance', () => {
    expect(isPlausibleSaveState(validState({ coinBalance: -1 }))).toBe(false);
  });

  it('rejects a save missing one biome', () => {
    const s = validState();
    // Remove the first biome - save is now incomplete
    delete s.tanks[BIOMES[0]!.id];
    expect(isPlausibleSaveState(s)).toBe(false);
  });

  it('rejects a save missing ALL biomes (empty tanks)', () => {
    expect(isPlausibleSaveState(validState({ tanks: {} }))).toBe(false);
  });

  it('rejects negative fish counts', () => {
    const s = validState();
    s.tanks[BIOMES[0]!.id]!.fishCounts['goldfish'] = -1;
    expect(isPlausibleSaveState(s)).toBe(false);
  });

  it('accepts a save with slotTiers present and valid', () => {
    const s = validState();
    s.tanks[BIOMES[0]!.id]!.slotTiers!['greenery'] = 2;
    expect(isPlausibleSaveState(s)).toBe(true);
  });

  it('rejects a save with non-number slotTier value', () => {
    const s = validState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s.tanks[BIOMES[0]!.id]!.slotTiers as any)['greenery'] = 'bad';
    expect(isPlausibleSaveState(s)).toBe(false);
  });

  it('rejects a save where slotTiers is an array', () => {
    const s = validState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s.tanks[BIOMES[0]!.id] as any).slotTiers = [1, 2, 3];
    expect(isPlausibleSaveState(s)).toBe(false);
  });

  it('accepts a save with slotTiers absent (old save compatibility)', () => {
    const s = validState();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (s.tanks[BIOMES[0]!.id] as any).slotTiers;
    expect(isPlausibleSaveState(s)).toBe(true);
  });
});
