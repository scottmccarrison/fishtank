import Phaser from 'phaser';
import { preloadFishSprites, preloadDecorationSprites } from './SpriteLoader.js';
import { FISH_SPECIES } from '../data/fish.js';
import { FishAI } from '../sim/FishAI.js';
import { createCoinCounter, type CoinCounter } from '../ui/CoinCounter.js';
import { createCoinFloater, type CoinFloater } from '../ui/CoinFloater.js';
import { createShopPanel, type ShopPanel } from '../ui/ShopPanel.js';
import { createGradientBackdrop, type GradientBackdrop } from '../ui/GradientBackdrop.js';
import { createBiomeTransition, type BiomeTransition } from '../ui/BiomeTransition.js';
import { createTankFloor } from '../ui/TankFloor.js';
import { createCatchupToast, type CatchupToast } from '../ui/CatchupToast.js';
import { createWelcomeModal, type WelcomeModal } from '../ui/WelcomeModal.js';
import { createSettingsPanel, type SettingsPanel } from '../ui/SettingsPanel.js';
import { createDecorationManager, type DecorationManager } from './DecorationManager.js';
import { getHighestUnlockedBiome } from '../util/biomeUnlock.js';
import { getState } from '../state.js';
import { isFirstRun, clearFirstRun, consumePendingCatchup, getSimLoop } from '../sessionState.js';

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
  private catchupToast!: CatchupToast;
  private welcomeModal!: WelcomeModal;
  private settingsPanel!: SettingsPanel;

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
    // Sandy floor + pebbles. Discarded reference - Phaser tears down the
    // graphics with the scene; no per-frame interaction needed.
    createTankFloor(this);

    this.coinCounter = createCoinCounter(this, getState);
    this.coinFloater = createCoinFloater(this);
    this.shopPanel = createShopPanel(this, getState);
    this.settingsPanel = createSettingsPanel(this, getSimLoop());
    this.catchupToast = createCatchupToast(this);
    this.welcomeModal = createWelcomeModal(this);

    this.decorationManager = createDecorationManager(
      this,
      getState,
      () => this.shopPanel.isOpen() || this.settingsPanel.isOpen(),
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
    shopBtn.setDepth(100).setInteractive({ useHandCursor: true });
    shopBtn.on('pointerdown', () => this.shopPanel.toggle());

    const settingsBtn = this.add.text(TANK_WIDTH - 110, 52, 'SETTINGS', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#3a3a5b',
      padding: { x: 10, y: 4 },
    });
    settingsBtn.setDepth(100).setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerdown', () => this.settingsPanel.toggle());

    for (const fish of getState().fishInstances) {
      this.spawnSprite(fish);
    }

    if (isFirstRun()) {
      this.welcomeModal.show();
      clearFirstRun();
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

    const pending = consumePendingCatchup();
    if (pending) this.catchupToast.show(pending);

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
