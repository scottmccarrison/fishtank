import type { SaveStateV1 } from '../types/Save.js';
import type { FishInstance } from '../types/Fish.js';
import { BIOMES } from '../data/biomes.js';
import { uuid } from '../util/uuid.js';

/**
 * First-run initial state per ADR-0004 / ADR-0005:
 *  - One free starter fish (first species in the Tide Pool list - goldfish).
 *  - 0 coins, 0 lifetime earned, no decorations.
 *  - Tank coordinates assume the 800x600 stage; rendered position is random
 *    within a margin so the starter doesn't spawn on the edge.
 */
export function createInitialState(): SaveStateV1 {
  const tidePool = BIOMES.find((b) => b.id === 'tide-pool');
  if (!tidePool) {
    throw new Error('Tide Pool biome missing - check src/data/biomes.ts');
  }
  const starterSpeciesId = tidePool.fishSpeciesIds[0];
  if (!starterSpeciesId) {
    throw new Error('Tide Pool has no species - check src/data/biomes.ts');
  }
  const now = new Date().toISOString();

  const starter: FishInstance = {
    id: uuid(),
    speciesId: starterSpeciesId,
    x: 100 + Math.floor(Math.random() * 600),
    y: 100 + Math.floor(Math.random() * 400),
    direction: Math.random() > 0.5 ? 1 : -1,
    ownedAt: now,
  };

  return {
    version: 1,
    lastSavedAt: now,
    coinBalance: 0,
    lifetimeEarned: 0,
    fishInstances: [starter],
    decorationInstances: [],
  };
}
