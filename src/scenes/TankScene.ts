import Phaser from 'phaser';
import { preloadFishSprites, preloadDecorationSprites } from './SpriteLoader.js';
import { createDiorama, type Diorama } from './Diorama.js';
import { createCoinCounter, type CoinCounter } from '../ui/CoinCounter.js';
import { createCoinFloater, type CoinFloater } from '../ui/CoinFloater.js';
import { createBiomeTransition, type BiomeTransition } from '../ui/BiomeTransition.js';
import { createCatchupToast, type CatchupToast } from '../ui/CatchupToast.js';
import { createWelcomeModal, type WelcomeModal } from '../ui/WelcomeModal.js';
import { createSettingsPanel, type SettingsPanel } from '../ui/SettingsPanel.js';
import { createLedger, type Ledger } from '../ui/Ledger.js';
import { CONSTANTS } from '../data/constants.js';
import { getHighestUnlockedBiome } from '../util/biomeUnlock.js';
import { getState } from '../state.js';
import { isFirstRun, clearFirstRun, consumePendingCatchup, getSimLoop } from '../sessionState.js';

export class TankScene extends Phaser.Scene {
  private diorama!: Diorama;
  private ledger!: Ledger;
  private coinCounter!: CoinCounter;
  private coinFloater!: CoinFloater;
  private settingsPanel!: SettingsPanel;
  private biomeTransition!: BiomeTransition;
  private catchupToast!: CatchupToast;
  private welcomeModal!: WelcomeModal;
  private currentBiomeId!: string;

  constructor() {
    super('TankScene');
  }

  preload(): void {
    preloadFishSprites(this);
    preloadDecorationSprites(this);
  }

  create(): void {
    this.currentBiomeId = getHighestUnlockedBiome(getState().lifetimeEarned).id;

    // Wire up diorama (top region) and ledger (bottom region); both render
    // initialBiomeId immediately at construction - no showBiome needed here.
    this.diorama = createDiorama(this, getState, this.currentBiomeId);
    this.ledger = createLedger(this, getState, (id) => this.switchBiome(id), this.currentBiomeId);

    this.coinCounter = createCoinCounter(this, getState);
    this.coinFloater = createCoinFloater(this);
    this.settingsPanel = createSettingsPanel(this, getSimLoop());
    this.catchupToast = createCatchupToast(this);
    this.welcomeModal = createWelcomeModal(this);

    // Biome transition: shows unlock celebration toast; the diorama self-syncs
    // new species on its next update(dt) - no explicit diorama notify needed.
    this.biomeTransition = createBiomeTransition(this, getState);

    // SETTINGS button in the top-right corner of the canvas
    const settingsBtn = this.add.text(CONSTANTS.CANVAS_WIDTH - 10, 14, 'SETTINGS', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
      backgroundColor: '#3a3a5b',
      padding: { x: 10, y: 4 },
    });
    settingsBtn.setOrigin(1, 0).setDepth(100).setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerdown', () => this.settingsPanel.toggle());

    if (isFirstRun()) {
      this.welcomeModal.show();
      clearFirstRun();
    }
  }

  /** Called by the ledger's onSelectBiome callback when the player taps a tab. */
  private switchBiome(id: string): void {
    this.currentBiomeId = id;
    this.diorama.showBiome(id);
    this.ledger.showBiome(id);
  }

  update(_time: number, delta: number): void {
    this.diorama.update(delta);
    this.ledger.update();
    this.coinCounter.update();
    this.coinFloater.update(this.diorama.getDisplayFish(), delta);
    this.biomeTransition.update();

    const pending = consumePendingCatchup();
    if (pending) this.catchupToast.show(pending);
  }
}
