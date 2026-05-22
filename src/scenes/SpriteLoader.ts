import type Phaser from 'phaser';
import { FISH_SPECIES } from '../data/fish.js';

/**
 * Queue load.image calls for every FishSpecies sprite onto the scene's loader.
 *
 * Texture key = species.id (e.g., "goldfish"). Spawn code references the same id.
 * Asset URL = encodeURI(BASE_URL + assetPath). encodeURI is needed because the
 * Pixel Gnome pack uses filenames with spaces and hyphens (e.g. "Crab - Blue.png")
 * which some browsers refuse to fetch as raw URLs.
 *
 * Call this from Phaser.Scene.preload() so loading completes before create().
 */
export function preloadFishSprites(scene: Phaser.Scene): void {
  const base = import.meta.env.BASE_URL;
  for (const species of FISH_SPECIES) {
    scene.load.image(species.id, encodeURI(base + species.assetPath));
  }
}
