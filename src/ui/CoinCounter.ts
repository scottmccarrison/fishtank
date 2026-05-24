import type Phaser from 'phaser';
import type { SaveStateV2 } from '../types/Save.js';
import { formatCoins } from '../util/formatCoins.js';
import { computeTotalEarnRate } from '../util/earnRate.js';

export interface CoinCounter {
  update(): void;
}

/**
 * Top-left HUD: balance line + rate line. Updates every render frame.
 * Phaser text with thin black stroke for legibility on light tank backgrounds.
 */
export function createCoinCounter(
  scene: Phaser.Scene,
  getState: () => SaveStateV2,
): CoinCounter {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: '22px',
    color: '#ffffff',
    fontFamily: 'monospace',
    stroke: '#000000',
    strokeThickness: 3,
  };

  const balanceText = scene.add.text(16, 12, '', style).setDepth(100);
  const rateText = scene.add
    .text(16, 40, '', { ...style, fontSize: '14px' })
    .setDepth(100);

  return {
    update() {
      const state = getState();
      balanceText.setText(`${formatCoins(state.coinBalance)} coins`);
      const rate = computeTotalEarnRate(state.tanks);
      rateText.setText(`${formatCoins(rate)}/s`);
    },
  };
}
