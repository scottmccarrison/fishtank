import Phaser from 'phaser';
import { preloadFishSprites, preloadDecorationSprites } from './SpriteLoader.js';
import { FISH_SPECIES } from '../data/fish.js';
import { FishAI } from '../sim/FishAI.js';
import { createCoinCounter, type CoinCounter } from '../ui/CoinCounter.js';
import { createCoinFloater, type CoinFloater } from '../ui/CoinFloater.js';
import { createShopPanel, type ShopPanel } from '../ui/ShopPanel.js';
import { createGradientBackdrop, type GradientBackdrop } from '../ui/GradientBackdrop.js';
import { createBiomeTransition, type BiomeTransition } from '../ui/BiomeTransition.js';
import { createDecorationManager, type DecorationManager } from './DecorationManager.js';
import { getHighestUnlockedBiome } from '../util/biomeUnlock.js';
import { getState } from '../state.js';

const SPECIES_BY_ID = new Map(FISH_SPECIES.map((s) => [s.id, s]));

const TANK_WIDTH = 800;
const TANK_HEIGHT = 600;
const RENDER_SCALE_MULTIPLIER = 3;

export class TankScene extends Phaser.Scene {
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private fishAI = new FishAI({ tankWidth: TANK_WIDTH, tankHeight: TANK_HEIGHT });
  private coinCounter!: CoinCounter;
  private coinFloater!: CoinFloater;
  private shopPanel!: ShopPanel;
  private backdrop!: GradientBackdrop;
  private biomeTransition!: BiomeTransition;
  private decorationManager!: DecorationManager;

  constructor() {
    super('TankScene');
  }

  preload(): void {
    preloadFishSprites(this);
    preloadDecorationSprites(this);
  }

  create(): void {
    const initialBiome = getHighestUnlockedBiome(getState().lifetimeEarned);
    this.backdrop = createGradientBackdrop(this, initialBiome);

    this.coinCounter = createCoinCounter(this, getState);
    this.coinFloater = createCoinFloater(this);
    this.shopPanel = createShopPanel(this, getState);

    // DecorationManager: created AFTER shopPanel so its isInputBlocked closure
    // can reference shopPanel.isOpen(). Gating drag prevents click-through
    // when the shop is open above a decoration (Phaser hit-tests per-object,
    // not by depth). The isOpen() approach catches both the SHOP-button toggle
    // AND the panel's internal X-close.
    this.decorationManager = createDecorationManager(
      this,
      getState,
      () => this.shopPanel.isOpen(),
    );

    this.biomeTransition = createBiomeTransition(this, getState, (biome) => {
      this.backdrop.transitionTo(biome);
    });

    const shopBtn = this.add.text(TANK_WIDTH - 80, 14, 'SHOP', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#1a3a6b',
      padding: { x: 10, y: 4 },
    });
    shopBtn.setDepth(100);
    shopBtn.setInteractive({ useHandCursor: true });
    shopBtn.on('pointerdown', () => this.shopPanel.toggle());

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

    this.decorationManager.update();
    this.biomeTransition.update();
    this.coinFloater.update(fishes, delta);
    this.coinCounter.update();
    this.shopPanel.update();
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
