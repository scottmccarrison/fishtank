import type { DecorationSpecies } from '../types/Decoration.js';

/**
 * Aquarium decorations from the Brysia "Fishtank" pack (gitignored; see CREDITS.md).
 * Cosmetic only - no gameplay effect. Costs span a curve from cheap floor dressing
 * (25) up to centerpiece structures (2500), reachable across Tide Pool and beyond.
 * Asset files live under public/assets/brysia/decorations/ and are NOT committed.
 */
export const DECORATIONS: DecorationSpecies[] = [
  { id: 'grass-tuft',      name: 'Grass Tuft',      cost: 25,   assetPath: 'assets/brysia/decorations/small_grass_1.png' },
  { id: 'small-shell',     name: 'Small Shell',     cost: 30,   assetPath: 'assets/brysia/decorations/shell_1.png' },
  { id: 'pebble',          name: 'Pebble',          cost: 35,   assetPath: 'assets/brysia/decorations/stone_1.png' },
  { id: 'green-plant',     name: 'Green Plant',     cost: 55,   assetPath: 'assets/brysia/decorations/green_plant_1.png' },
  { id: 'pink-coral',      name: 'Pink Coral',      cost: 80,   assetPath: 'assets/brysia/decorations/pink_coral_1.png' },
  { id: 'eelgrass',        name: 'Eelgrass',        cost: 100,  assetPath: 'assets/brysia/decorations/wavy_grass_1.png' },
  { id: 'tall-grass',      name: 'Tall Grass',      cost: 120,  assetPath: 'assets/brysia/decorations/big_grass_1.png' },
  { id: 'green-coral',     name: 'Green Coral',     cost: 150,  assetPath: 'assets/brysia/decorations/green_coral_1.png' },
  { id: 'orange-coral',    name: 'Orange Coral',    cost: 180,  assetPath: 'assets/brysia/decorations/orange_coral_1.png' },
  { id: 'giant-clam',      name: 'Giant Clam',      cost: 220,  assetPath: 'assets/brysia/decorations/big_shell.png' },
  { id: 'red-anemone',     name: 'Red Anemone',     cost: 280,  assetPath: 'assets/brysia/decorations/red_plant_1.png' },
  { id: 'barrel',          name: 'Barrel',          cost: 350,  assetPath: 'assets/brysia/decorations/barrel_1.png' },
  { id: 'driftwood',       name: 'Driftwood',       cost: 450,  assetPath: 'assets/brysia/decorations/dead_tree.png' },
  { id: 'castle-tower',    name: 'Castle Tower',    cost: 600,  assetPath: 'assets/brysia/decorations/stone_castle_tower.png' },
  { id: 'anchor',          name: 'Anchor',          cost: 750,  assetPath: 'assets/brysia/decorations/anchor.png' },
  { id: 'treasure-chest',  name: 'Treasure Chest',  cost: 950,  assetPath: 'assets/brysia/decorations/treasure_chest.png' },
  { id: 'toadstool-house', name: 'Toadstool House', cost: 1300, assetPath: 'assets/brysia/decorations/mushroom_house.png' },
  { id: 'sunken-ship',     name: 'Sunken Ship',     cost: 1800, assetPath: 'assets/brysia/decorations/ship.png' },
  { id: 'stone-castle',    name: 'Stone Castle',    cost: 2500, assetPath: 'assets/brysia/decorations/stone_castle.png' },
];
