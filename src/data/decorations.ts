import type { DecorationSpecies } from '../types/Decoration.js';

/**
 * Ten misc items from the Pixel Gnome pack. Placed cosmetically; no gameplay
 * effect. Costs hand-picked for variety: junk-class (25-75), mid-class
 * (100-250), pricey (500-1000). All reachable in early-to-mid Tide Pool.
 */
export const DECORATIONS: DecorationSpecies[] = [
  { id: 'apple-core',   name: 'Apple Core',   cost: 25,   assetPath: 'assets/decorations/Apple Core.png' },
  { id: 'rusty-can',    name: 'Rusty Can',    cost: 50,   assetPath: 'assets/decorations/Rusty Can.png' },
  { id: 'worm',         name: 'Worm',         cost: 50,   assetPath: 'assets/decorations/Worm.png' },
  { id: 'bottle',       name: 'Bottle',       cost: 75,   assetPath: 'assets/decorations/Bottle.png' },
  { id: 'coral',        name: 'Coral',        cost: 100,  assetPath: 'assets/decorations/Coral.png' },
  { id: 'seaweed',      name: 'Seaweed',      cost: 100,  assetPath: 'assets/decorations/Seaweed.png' },
  { id: 'seashell',     name: 'Seashell',     cost: 150,  assetPath: 'assets/decorations/Seashell.png' },
  { id: 'sand-dollar',  name: 'Sand Dollar',  cost: 200,  assetPath: 'assets/decorations/Sand Dollar.png' },
  { id: 'pearl',        name: 'Pearl',        cost: 500,  assetPath: 'assets/decorations/Pearl.png' },
  { id: 'lure',         name: 'Lure',         cost: 750,  assetPath: 'assets/decorations/Lure.png' },
];
