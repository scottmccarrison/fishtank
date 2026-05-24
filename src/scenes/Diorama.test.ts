import { describe, it, expect } from 'vitest';
import { syncDisplayFish } from './Diorama.js';
import type { BiomeTankState } from '../types/Save.js';
import type { DisplayFish } from '../types/Fish.js';

// Tests for the pure syncDisplayFish helper.
// Phaser is NOT instantiated here - this file must run in jsdom without WebGL.

describe('syncDisplayFish', () => {
  it('one species with count 5 -> exactly one DisplayFish entry', () => {
    const tank: BiomeTankState = {
      fishCounts: { goldfish: 5 },
      decorations: [],
    };
    const existing = new Map<string, DisplayFish>();
    const { kept, newSpeciesIds } = syncDisplayFish(tank, existing);
    // No existing entry, so kept is empty and goldfish shows up as new
    expect(kept.size).toBe(0);
    expect(newSpeciesIds).toHaveLength(1);
    expect(newSpeciesIds[0]).toBe('goldfish');
    // Total unique species represented: 1
    expect(kept.size + newSpeciesIds.length).toBe(1);
  });

  it('two species each with count > 0 -> two DisplayFish entries total', () => {
    const tank: BiomeTankState = {
      fishCounts: { goldfish: 2, guppy: 3 },
      decorations: [],
    };
    const existing = new Map<string, DisplayFish>();
    const { kept, newSpeciesIds } = syncDisplayFish(tank, existing);
    expect(kept.size + newSpeciesIds.length).toBe(2);
    expect(newSpeciesIds).toContain('goldfish');
    expect(newSpeciesIds).toContain('guppy');
  });

  it('existing DisplayFish is preserved (kept) rather than re-created', () => {
    const tank: BiomeTankState = {
      fishCounts: { goldfish: 3 },
      decorations: [],
    };
    const existingFish: DisplayFish = { speciesId: 'goldfish', x: 100, y: 200, direction: 1 };
    const existing = new Map<string, DisplayFish>([['goldfish', existingFish]]);
    const { kept, newSpeciesIds } = syncDisplayFish(tank, existing);
    expect(kept.size).toBe(1);
    expect(kept.get('goldfish')).toBe(existingFish);
    expect(newSpeciesIds).toHaveLength(0);
  });

  it('species with count 0 -> none returned', () => {
    const tank: BiomeTankState = {
      fishCounts: { goldfish: 0, guppy: 0 },
      decorations: [],
    };
    const existing = new Map<string, DisplayFish>();
    const { kept, newSpeciesIds } = syncDisplayFish(tank, existing);
    expect(kept.size).toBe(0);
    expect(newSpeciesIds).toHaveLength(0);
  });

  it('mix of count 0 and count > 0 -> only non-zero species represented', () => {
    const tank: BiomeTankState = {
      fishCounts: { goldfish: 1, guppy: 0, 'neon-tetra': 4 },
      decorations: [],
    };
    const existing = new Map<string, DisplayFish>();
    const { kept, newSpeciesIds } = syncDisplayFish(tank, existing);
    const totalRepresented = kept.size + newSpeciesIds.length;
    expect(totalRepresented).toBe(2);
    // guppy should not appear
    const all = [...kept.keys(), ...newSpeciesIds];
    expect(all).not.toContain('guppy');
    expect(all).toContain('goldfish');
    expect(all).toContain('neon-tetra');
  });
});
