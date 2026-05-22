import type { FishSpecies } from '../types/Fish.js';
import { CONSTANTS } from './constants.js';

/**
 * Earn rate baseline: first fish pays back in CONSTANTS.PAYBACK_SECONDS.
 * earnRate(costIndex 0) = FIRST_FISH_COST / PAYBACK_SECONDS ~= 0.556 c/s.
 * Subsequent rates derived at runtime via EARN_RATIO_IN_BIOME and BIOME_EARN_STEP.
 *
 * earnRateBase here is the species' rate at costIndex 0 of its biome.
 * Multipliers stack at runtime; we store only the base for clarity.
 */
const FIRST_RATE = CONSTANTS.FIRST_FISH_COST / CONSTANTS.PAYBACK_SECONDS;
const REEF_BASE = FIRST_RATE * CONSTANTS.BIOME_EARN_STEP;
const ABYSS_BASE = REEF_BASE * CONSTANTS.BIOME_EARN_STEP;

export const FISH_SPECIES: FishSpecies[] = [
  // --- Tide Pool (10) ---
  { id: 'goldfish',     name: 'Goldfish',     biomeId: 'tide-pool', costIndex: 0, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/freshwater/Goldfish.png' },
  { id: 'guppy',        name: 'Guppy',        biomeId: 'tide-pool', costIndex: 1, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/freshwater/Guppy.png' },
  { id: 'neon-tetra',   name: 'Neon Tetra',   biomeId: 'tide-pool', costIndex: 2, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/freshwater/Neon Tetra.png' },
  { id: 'clownfish',    name: 'Clownfish',    biomeId: 'tide-pool', costIndex: 3, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/saltwater/Clownfish.png' },
  { id: 'seahorse',     name: 'Seahorse',     biomeId: 'tide-pool', costIndex: 4, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/saltwater/Seahorse.png' },
  { id: 'starfish',     name: 'Starfish',     biomeId: 'tide-pool', costIndex: 5, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/saltwater/Starfish.png' },
  { id: 'shrimp',       name: 'Shrimp',       biomeId: 'tide-pool', costIndex: 6, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/saltwater/Shrimp.png' },
  { id: 'pufferfish',   name: 'Pufferfish',   biomeId: 'tide-pool', costIndex: 7, earnRateBase: FIRST_RATE, scale: 1.2, assetPath: 'assets/fish/saltwater/Pufferfish.png' },
  { id: 'crab-blue',    name: 'Blue Crab',    biomeId: 'tide-pool', costIndex: 8, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/saltwater/Crab - Blue.png' },
  { id: 'crab-king',    name: 'King Crab',    biomeId: 'tide-pool', costIndex: 9, earnRateBase: FIRST_RATE, scale: 1.3, assetPath: 'assets/fish/saltwater/Crab - King.png' },

  // --- Open Reef (10) ---
  { id: 'purple-tang',     name: 'Purple Tang',     biomeId: 'open-reef', costIndex: 0, earnRateBase: REEF_BASE, scale: 1.0, assetPath: 'assets/fish/saltwater/Purple Tang.png' },
  { id: 'yellow-tang',     name: 'Yellow Tang',     biomeId: 'open-reef', costIndex: 1, earnRateBase: REEF_BASE, scale: 1.0, assetPath: 'assets/fish/saltwater/Yellow Tang.png' },
  { id: 'surgeonfish',     name: 'Surgeonfish',     biomeId: 'open-reef', costIndex: 2, earnRateBase: REEF_BASE, scale: 1.0, assetPath: 'assets/fish/saltwater/Surgeonfish.png' },
  { id: 'napoleon-wrasse', name: 'Napoleon Wrasse', biomeId: 'open-reef', costIndex: 3, earnRateBase: REEF_BASE, scale: 1.3, assetPath: 'assets/fish/saltwater/Napoleon Wrasse.png' },
  { id: 'blue-groper',     name: 'Blue Groper',     biomeId: 'open-reef', costIndex: 4, earnRateBase: REEF_BASE, scale: 1.3, assetPath: 'assets/fish/saltwater/Blue Groper.png' },
  { id: 'moray-eel',       name: 'Moray Eel',       biomeId: 'open-reef', costIndex: 5, earnRateBase: REEF_BASE, scale: 1.4, assetPath: 'assets/fish/saltwater/Moray Eel.png' },
  { id: 'ribbon-eel',      name: 'Ribbon Eel',      biomeId: 'open-reef', costIndex: 6, earnRateBase: REEF_BASE, scale: 1.4, assetPath: 'assets/fish/saltwater/Ribbon Eel.png' },
  { id: 'jellyfish',       name: 'Jellyfish',       biomeId: 'open-reef', costIndex: 7, earnRateBase: REEF_BASE, scale: 1.2, assetPath: 'assets/fish/saltwater/Jellyfish.png' },
  { id: 'flounder',        name: 'Flounder',        biomeId: 'open-reef', costIndex: 8, earnRateBase: REEF_BASE, scale: 1.3, assetPath: 'assets/fish/saltwater/Flounder.png' },
  { id: 'stingray',        name: 'Stingray',        biomeId: 'open-reef', costIndex: 9, earnRateBase: REEF_BASE, scale: 1.5, assetPath: 'assets/fish/saltwater/Stingray.png' },

  // --- Abyss (8) - 4 native + 4 reused saltwater as placeholders per assets.md ---
  { id: 'anglerfish',          name: 'Anglerfish',          biomeId: 'abyss', costIndex: 0, earnRateBase: ABYSS_BASE, scale: 1.3, assetPath: 'assets/fish/saltwater/Anglerfish.png' },
  { id: 'great-white-shark',   name: 'Great White Shark',   biomeId: 'abyss', costIndex: 1, earnRateBase: ABYSS_BASE, scale: 1.8, assetPath: 'assets/fish/saltwater/Great White Shark.png' },
  { id: 'tuna',                name: 'Tuna',                biomeId: 'abyss', costIndex: 2, earnRateBase: ABYSS_BASE, scale: 1.5, assetPath: 'assets/fish/saltwater/Tuna.png' },
  { id: 'upside-down-jelly',   name: 'Upside Down Jellyfish', biomeId: 'abyss', costIndex: 3, earnRateBase: ABYSS_BASE, scale: 1.2, assetPath: 'assets/fish/saltwater/Upside Down Jellyfish.png' },
  { id: 'blue-angelfish',      name: 'Blue Angelfish',      biomeId: 'abyss', costIndex: 4, earnRateBase: ABYSS_BASE, scale: 1.4, assetPath: 'assets/fish/saltwater/Blue Angelfish.png' },
  { id: 'anchovy',             name: 'Anchovy',             biomeId: 'abyss', costIndex: 5, earnRateBase: ABYSS_BASE, scale: 1.0, assetPath: 'assets/fish/saltwater/Anchovy.png' },
  { id: 'goby',                name: 'Goby',                biomeId: 'abyss', costIndex: 6, earnRateBase: ABYSS_BASE, scale: 1.0, assetPath: 'assets/fish/saltwater/Goby.png' },
  { id: 'crab-dungeness',      name: 'Dungeness Crab',      biomeId: 'abyss', costIndex: 7, earnRateBase: ABYSS_BASE, scale: 1.2, assetPath: 'assets/fish/saltwater/Crab - Dungeness.png' },
];
