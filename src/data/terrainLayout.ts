/**
 * Aquascape terrain - a fixed, shared rock layout that gives the tank vertical
 * depth (shelves + arches at varied heights) so decoration slots can sit on them.
 *
 * Built from the pack's big stones (currently unused by the slot chains). Authored
 * in the layout editor (?edit, terrain mode) and baked into TERRAIN_LAYOUT below.
 * Rendered by Aquascape.ts in two depth bands:
 *   - 'back'  sits behind the decorations + fish and is dimmed (recedes),
 *   - 'front' sits in front of the fish (foreground + natural hide-spots).
 * Same in every biome; rocks are neutral gray and read on any floor.
 */

export type TerrainBand = 'back' | 'front';

export interface TerrainRock {
  /** Texture key (see TERRAIN_ROCKS / preloadTerrainAssets). */
  rockId: string;
  /** Bottom-center anchor position (matches the bake/editor convention). */
  x: number;
  y: number;
  /** Intrinsic scale; rendered at scale * CONTENT_SCALE. */
  scale: number;
  band: TerrainBand;
}

/** Terrain rock texture keys available to place (the big stones). */
export const TERRAIN_ROCKS = ['stone-3', 'stone-4', 'stone-5', 'stone-6', 'stone-7', 'stone-8'] as const;

/** Asset file for a terrain rock key, e.g. 'stone-5' -> 'stone_5.png'. */
export function terrainRockFile(rockId: string): string {
  return rockId.replace('stone-', 'stone_') + '.png';
}

/**
 * Baked aquascape. A designed starting composition (refine in the editor):
 * a left-high -> right-low terrace - big back-left arch massif, an elevated mid
 * shelf and a right ledge (all 'back', dimmed/receding) - framed by two
 * foreground boulders ('front', bottom corners, fish pass behind them).
 * x = center, y = bottom-anchor; rendered at scale * CONTENT_SCALE.
 */
export const TERRAIN_LAYOUT: TerrainRock[] = [
  { rockId: 'stone-7', x: 115, y: 446, scale: 2.0, band: 'back' },  // big arch - back-left massif
  { rockId: 'stone-5', x: 235, y: 408, scale: 2.2, band: 'back' },  // flat-top shelf (elevated, holds coral)
  { rockId: 'stone-6', x: 372, y: 430, scale: 1.7, band: 'back' },  // right ledge
  { rockId: 'stone-3', x: 40,  y: 452, scale: 1.8, band: 'front' }, // foreground frame, bottom-left
  { rockId: 'stone-4', x: 412, y: 454, scale: 2.0, band: 'front' }, // foreground frame, bottom-right
];
