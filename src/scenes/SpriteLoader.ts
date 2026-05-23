import type Phaser from 'phaser';
import { FISH_SPECIES } from '../data/fish.js';
import { DECORATIONS } from '../data/decorations.js';

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
