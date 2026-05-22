import { describe, it, expect } from 'vitest';
import { serialize, deserialize } from './Serializer.js';
import type { SaveStateV1 } from '../types/Save.js';

const sample: SaveStateV1 = {
  version: 1,
  lastSavedAt: '2026-05-22T14:00:00.000Z',
  coinBalance: 123.45,
  lifetimeEarned: 567.89,
  fishInstances: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      speciesId: 'goldfish',
      x: 100,
      y: 200,
      direction: 1,
      ownedAt: '2026-05-22T13:00:00.000Z',
    },
  ],
  decorationInstances: [
    {
      id: '00000000-0000-4000-8000-000000000002',
      speciesId: 'coral',
      x: 50,
      y: 550,
      placedAt: '2026-05-22T13:30:00.000Z',
    },
  ],
};

describe('Serializer', () => {
  it('round-trips a complete state', () => {
    const json = serialize(sample);
    const restored = deserialize(json);
    expect(restored).toEqual(sample);
  });

  it('round-trips an empty fish/decoration arrays state', () => {
    const empty: SaveStateV1 = { ...sample, fishInstances: [], decorationInstances: [] };
    expect(deserialize(serialize(empty))).toEqual(empty);
  });

  it('deserialize returns null on malformed JSON', () => {
    expect(deserialize('not json')).toBeNull();
    expect(deserialize('{')).toBeNull();
    expect(deserialize('')).toBeNull();
  });

  it('deserialize returns null on missing version', () => {
    const noVersion = JSON.stringify({ coinBalance: 0, fishInstances: [] });
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
});
