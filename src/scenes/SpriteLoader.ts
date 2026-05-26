import type Phaser from 'phaser';
import { FISH_SPECIES } from '../data/fish.js';
import { DECORATIONS } from '../data/decorations.js';
import { TERRAIN_ROCKS, terrainRockFile } from '../data/terrainLayout.js';

/**
 * Queue load.image calls for every FishSpecies sprite onto the scene's loader.
 *
 * Texture key = species.id (e.g., "goldfish"). Spawn code references the same id.
 * Asset URL = encodeURI(BASE_URL + assetPath). encodeURI handles filenames with
 * spaces and hyphens (e.g. "Crab - Blue.png").
 */
export function preloadFishSprites(scene: Phaser.Scene): void {
  const base = import.meta.env.BASE_URL;
  for (const species of FISH_SPECIES) {
    scene.load.image(species.id, encodeURI(base + species.assetPath));
  }
}

/**
 * Same pattern for decorations. Texture key = decoration.id (e.g., "coral").
 */
export function preloadDecorationSprites(scene: Phaser.Scene): void {
  const base = import.meta.env.BASE_URL;
  for (const deco of DECORATIONS) {
    scene.load.image(deco.id, encodeURI(base + deco.assetPath));
  }
}

/**
 * Preload per-biome floor tiles and the shared water-texture overlay.
 * Keys: 'floor-sand', 'floor-cobble', 'floor-dark', 'water-texture'.
 */
export function preloadSurfaceAssets(scene: Phaser.Scene): void {
  const base = import.meta.env.BASE_URL;
  scene.load.image('floor-sand', encodeURI(base + 'assets/brysia/floor/floor_sand.png'));
  scene.load.image('floor-cobble', encodeURI(base + 'assets/brysia/floor/floor_cobble.png'));
  scene.load.image('floor-dark', encodeURI(base + 'assets/brysia/floor/floor_dark.png'));
  scene.load.image('water-texture', encodeURI(base + 'assets/brysia/backgrounds/background_3.png'));
}

/**
 * Preload the aquascape terrain rocks (big stones). Keys: 'stone-3'..'stone-8'.
 */
export function preloadTerrainAssets(scene: Phaser.Scene): void {
  const base = import.meta.env.BASE_URL;
  for (const rockId of TERRAIN_ROCKS) {
    scene.load.image(rockId, encodeURI(base + 'assets/brysia/terrain/' + terrainRockFile(rockId)));
  }
}
