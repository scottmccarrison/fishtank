import Phaser from 'phaser';
import { preloadFishSprites } from './SpriteLoader.js';
import { FISH_SPECIES } from '../data/fish.js';
import { FishAI } from '../sim/FishAI.js';
import { createCoinCounter, type CoinCounter } from '../ui/CoinCounter.js';
import { getState } from '../state.js';

const SPECIES_BY_ID = new Map(FISH_SPECIES.map((s) => [s.id, s]));

const TANK_WIDTH = 800;
const TANK_HEIGHT = 600;
/** Pixel-art sprites are 16-32 px native; upscale 3x for visibility. */
const RENDER_SCALE_MULTIPLIER = 3;

/**
 * Renders fish from save state. State is read via the module singleton (src/state.ts)
 * so no init data is needed - the scene works correctly even when Phaser auto-starts it.
 *
 * FishAI runs in update() at render frequency (~60Hz) for smooth motion. Sim earning
 * and autosave run via SimLoop (5Hz, registered in main.ts).
 */
export class TankScene extends Phaser.Scene {
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private fishAI = new FishAI({ tankWidth: TANK_WIDTH, tankHeight: TANK_HEIGHT });
  private coinCounter!: CoinCounter;

  constructor() {
    super('TankScene');
  }

  preload(): void {
    preloadFishSprites(this);
  }

  create(): void {
    this.coinCounter = createCoinCounter(this, getState);
    for (const fish of getState().fishInstances) {
      this.spawnSprite(fish);
    }
  }

  update(_time: number, delta: number): void {
    const fishes = getState().fishInstances;

    for (const fish of fishes) {
      if (!this.sprites.has(fish.id)) this.spawnSprite(fish);
    }

    this.fishAI.update(fishes, delta);

    for (const fish of fishes) {
      const sprite = this.sprites.get(fish.id);
      if (sprite) {
        sprite.setPosition(fish.x, fish.y);
        sprite.setFlipX(fish.direction === -1);
      }
    }

    this.coinCounter.update();
  }

  private spawnSprite(fish: { id: string; speciesId: string; x: number; y: number; direction: 1 | -1 }): void {
    const species = SPECIES_BY_ID.get(fish.speciesId);
    if (!species) {
      console.warn('[TankScene] unknown species', fish.speciesId);
      return;
    }
    const sprite = this.add.image(fish.x, fish.y, fish.speciesId);
    sprite.setScale(species.scale * RENDER_SCALE_MULTIPLIER);
    sprite.setFlipX(fish.direction === -1);
    this.sprites.set(fish.id, sprite);
  }
}
