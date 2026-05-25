import { describe, it, expect } from 'vitest';
import { serialize, deserialize } from './Serializer.js';
import type { SaveStateV2 } from '../types/Save.js';

const sample: SaveStateV2 = {
  version: 2,
  lastSavedAt: '2026-05-22T14:00:00.000Z',
  coinBalance: 123.45,
  lifetimeEarned: 567.89,
  tanks: {
    'tide-pool': {
      fishCounts: { goldfish: 2, guppy: 1 },
      slotTiers: { greenery: 1 },
    },
    'open-reef': {
      fishCounts: {},
      slotTiers: {},
    },
    'abyss': {
      fishCounts: {},
      slotTiers: {},
    },
  },
};

describe('Serializer', () => {
  it('round-trips a complete state', () => {
    const json = serialize(sample);
    const restored = deserialize(json);
    expect(restored).toEqual(sample);
  });

  it('round-trips a state with empty tanks', () => {
    const empty: SaveStateV2 = {
      ...sample,
      tanks: {
        'tide-pool': { fishCounts: {}, slotTiers: {} },
        'open-reef': { fishCounts: {}, slotTiers: {} },
        'abyss': { fishCounts: {}, slotTiers: {} },
      },
    };
    expect(deserialize(serialize(empty))).toEqual(empty);
  });

  it('deserialize returns null on malformed JSON', () => {
    expect(deserialize('not json')).toBeNull();
    expect(deserialize('{')).toBeNull();
    expect(deserialize('')).toBeNull();
  });

  it('deserialize returns null on missing version', () => {
    const noVersion = JSON.stringify({ coinBalance: 0, tanks: {} });
    expect(deserialize(noVersion)).toBeNull();
  });

  it('deserialize returns null on unknown version', () => {
    const wrongVersion = JSON.stringify({ ...sample, version: 999 });
    expect(deserialize(wrongVersion)).toBeNull();
  });

  it('deserialize returns null on non-object root', () => {
    expect(deserialize('null')).toBeNull();
    expect(deserialize('42')).toBeNull();
    expect(deserialize('"string"')).toBeNull();
    expect(deserialize('[1,2,3]')).toBeNull();
  });

  it('drops v1 save and returns null', () => {
    const v1Save = JSON.stringify({
      version: 1,
      lastSavedAt: '2026-05-22T12:00:00.000Z',
      coinBalance: 0,
      lifetimeEarned: 0,
      fishInstances: [],
      decorationInstances: [],
    });
    expect(deserialize(v1Save)).toBeNull();
  });
});
