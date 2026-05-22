import type { Biome } from '../types/Biome.js';
import { CONSTANTS } from './constants.js';

/**
 * Last cost in a biome = FIRST_FISH_COST * COST_RATIO_IN_BIOME^(speciesCount - 1).
 * Next biome's first cost = previous biome's last cost * BIOME_COST_STEP.
 * Tide Pool is always unlocked (threshold = 0).
 *
 * These are derived from CONSTANTS rather than hardcoded so a tuning change
 * in constants.ts automatically propagates here.
 */
const TIDE_POOL_COUNT = 10;
const OPEN_REEF_COUNT = 10;
const tidePoolLastCost =
  CONSTANTS.FIRST_FISH_COST *
  Math.pow(CONSTANTS.COST_RATIO_IN_BIOME, TIDE_POOL_COUNT - 1);
const reefFirstCost = tidePoolLastCost * CONSTANTS.BIOME_COST_STEP;
const reefLastCost =
  reefFirstCost *
  Math.pow(CONSTANTS.COST_RATIO_IN_BIOME, OPEN_REEF_COUNT - 1);
const abyssFirstCost = reefLastCost * CONSTANTS.BIOME_COST_STEP;

export const BIOMES: Biome[] = [
  {
    id: 'tide-pool',
    name: 'Tide Pool',
    fishSpeciesIds: [
      'goldfish', 'guppy', 'neon-tetra', 'clownfish', 'seahorse',
      'starfish', 'shrimp', 'pufferfish', 'crab-blue', 'crab-king',
    ],
    unlockThreshold: 0,
    gradientFrom: '#7ec8e3',
    gradientTo: '#2c7bd0',
  },
  {
    id: 'open-reef',
    name: 'Open Reef',
    fishSpeciesIds: [
      'purple-tang', 'yellow-tang', 'surgeonfish', 'napoleon-wrasse', 'blue-groper',
      'moray-eel', 'ribbon-eel', 'jellyfish', 'flounder', 'stingray',
    ],
    unlockThreshold: Math.round(reefFirstCost),
    gradientFrom: '#1a5e9e',
    gradientTo: '#0d3a6b',
  },
  {
    id: 'abyss',
    name: 'Abyss',
    fishSpeciesIds: [
      'anglerfish', 'great-white-shark', 'tuna', 'upside-down-jelly',
      'blue-angelfish', 'anchovy', 'goby', 'crab-dungeness',
    ],
    unlockThreshold: Math.round(abyssFirstCost),
    gradientFrom: '#0a1a3a',
    gradientTo: '#000010',
  },
];
