import type { DecorationSpecies } from '../types/Decoration.js';

/**
 * Aquarium decorations from the Brysia "Fishtank" pack (gitignored; see CREDITS.md).
 * Cosmetic only - no gameplay effect. Costs span a curve from cheap floor dressing
 * (25) up to centerpiece structures (2500), reachable across Tide Pool and beyond.
 * Asset files live under public/assets/brysia/decorations/ and are NOT committed.
 *
 * renderScale: per-decoration display scale (starting composition - refine in ?edit).
 *   Rendered at renderScale * CONTENT_SCALE. Native art sizes vary (16-80px), so these
 *   give a deliberate spread (tiny shells -> big centerpieces).
 * cost: the price to upgrade INTO this tier.
 */
export const DECORATIONS: DecorationSpecies[] = [
  { id: 'grass-tuft',      name: 'Grass Tuft',      cost: 25,   renderScale: 2.2, assetPath: 'assets/brysia/decorations/small_grass_1.png' },
  { id: 'small-shell',     name: 'Small Shell',     cost: 30,   renderScale: 1.8, assetPath: 'assets/brysia/decorations/shell_1.png' },
  { id: 'pebble',          name: 'Pebble',          cost: 35,   renderScale: 1.6, assetPath: 'assets/brysia/decorations/stone_1.png' },
  { id: 'green-plant',     name: 'Green Plant',     cost: 55,   renderScale: 2.2, assetPath: 'assets/brysia/decorations/green_plant_1.png' },
  { id: 'pink-coral',      name: 'Pink Coral',      cost: 80,   renderScale: 2.2, assetPath: 'assets/brysia/decorations/pink_coral_1.png' },
  { id: 'eelgrass',        name: 'Eelgrass',        cost: 100,  renderScale: 2.6, assetPath: 'assets/brysia/decorations/wavy_grass_1.png' },
  { id: 'tall-grass',      name: 'Tall Grass',      cost: 120,  renderScale: 3.0, assetPath: 'assets/brysia/decorations/big_grass_1.png' },
  { id: 'green-coral',     name: 'Green Coral',     cost: 150,  renderScale: 2.6, assetPath: 'assets/brysia/decorations/green_coral_1.png' },
  { id: 'orange-coral',    name: 'Orange Coral',    cost: 180,  renderScale: 2.6, assetPath: 'assets/brysia/decorations/orange_coral_1.png' },
  { id: 'giant-clam',      name: 'Giant Clam',      cost: 220,  renderScale: 2.4, assetPath: 'assets/brysia/decorations/big_shell.png' },
  { id: 'red-anemone',     name: 'Red Anemone',     cost: 280,  renderScale: 2.6, assetPath: 'assets/brysia/decorations/red_plant_1.png' },
  { id: 'barrel',          name: 'Barrel',          cost: 350,  renderScale: 2.4, assetPath: 'assets/brysia/decorations/barrel_1.png' },
  { id: 'driftwood',       name: 'Driftwood',       cost: 450,  renderScale: 2.8, assetPath: 'assets/brysia/decorations/dead_tree.png' },
  { id: 'castle-tower',    name: 'Castle Tower',    cost: 600,  renderScale: 2.8, assetPath: 'assets/brysia/decorations/stone_castle_tower.png' },
  { id: 'anchor',          name: 'Anchor',          cost: 750,  renderScale: 2.6, assetPath: 'assets/brysia/decorations/anchor.png' },
  { id: 'treasure-chest',  name: 'Treasure Chest',  cost: 950,  renderScale: 2.2, assetPath: 'assets/brysia/decorations/treasure_chest.png' },
  { id: 'toadstool-house', name: 'Toadstool House', cost: 1300, renderScale: 2.6, assetPath: 'assets/brysia/decorations/mushroom_house.png' },
  { id: 'sunken-ship',     name: 'Sunken Ship',     cost: 1800, renderScale: 2.7, assetPath: 'assets/brysia/decorations/ship.png' },
  { id: 'stone-castle',    name: 'Stone Castle',    cost: 2500, renderScale: 2.5, assetPath: 'assets/brysia/decorations/stone_castle.png' },
];

export const DECORATION_BY_ID = new Map(DECORATIONS.map((d) => [d.id, d]));
