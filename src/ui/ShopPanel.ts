import type Phaser from 'phaser';
import type { SaveStateV1 } from '../types/Save.js';
import { FISH_SPECIES } from '../data/fish.js';
import { fishCost } from '../util/fishCost.js';
import { formatCoins } from '../util/formatCoins.js';
import { purchaseFish } from '../sim/PurchaseFish.js';

export interface ShopPanel {
  toggle(): void;
  update(): void;
  destroy(): void;
}

const PANEL_W = 560;
const PANEL_H = 480;
const PANEL_DEPTH = 200;

interface Row {
  buyText: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  species: (typeof FISH_SPECIES)[number];
}

/**
 * Shop overlay. Lists Tide Pool species in a 2-column grid (M4 scope; M5 adds
 * other biomes behind unlock thresholds).
 */
export function createShopPanel(
  scene: Phaser.Scene,
  getState: () => SaveStateV1,
): ShopPanel {
  const cx = scene.scale.width / 2;
  const cy = scene.scale.height / 2;

  const container = scene.add.container(cx, cy).setDepth(PANEL_DEPTH).setVisible(false);

  // Background (interactive to swallow clicks)
  const bg = scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x0a1a3a, 0.92);
  bg.setStrokeStyle(2, 0xffffff, 0.4);
  bg.setInteractive();
  container.add(bg);

  // Title
  const title = scene.add.text(0, -PANEL_H / 2 + 16, 'SHOP', {
    fontSize: '24px',
    color: '#ffffff',
    fontFamily: 'monospace',
    stroke: '#000000',
    strokeThickness: 3,
  });
  title.setOrigin(0.5, 0);
  container.add(title);

  // Close X
  const close = scene.add.text(PANEL_W / 2 - 20, -PANEL_H / 2 + 10, 'X', {
    fontSize: '22px',
    color: '#ffaaaa',
    fontFamily: 'monospace',
    stroke: '#000000',
    strokeThickness: 2,
  });
  close.setOrigin(0.5, 0);
  close.setInteractive({ useHandCursor: true });
  close.on('pointerdown', () => container.setVisible(false));
  container.add(close);

  // Grid of Tide Pool species
  const tidePool = FISH_SPECIES.filter((s) => s.biomeId === 'tide-pool');
  const rows: Row[] = [];
  const cols = 2;
  const rowH = 70;
  const colW = PANEL_W / 2 - 20;
  const gridStartY = -PANEL_H / 2 + 60;

  tidePool.forEach((species, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = -PANEL_W / 2 + 20 + col * colW + colW / 2;
    const y = gridStartY + row * rowH + rowH / 2;

    const icon = scene.add.image(x - colW / 2 + 24, y, species.id);
    icon.setScale(species.scale * 1.5);
    container.add(icon);

    const name = scene.add.text(x - colW / 2 + 50, y - 16, species.name, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    container.add(name);

    const cost = fishCost(species);
    const costText = scene.add.text(x - colW / 2 + 50, y + 2, `${formatCoins(cost)} c`, {
      fontSize: '12px',
      color: '#ffe066',
      fontFamily: 'monospace',
    });
    container.add(costText);

    const buyText = scene.add.text(x + colW / 2 - 50, y - 8, 'BUY', {
      fontSize: '16px',
      color: '#cccccc',
      fontFamily: 'monospace',
      backgroundColor: '#1a4d1a',
      padding: { x: 8, y: 4 },
    });
    buyText.setInteractive({ useHandCursor: true });
    buyText.on('pointerdown', () => {
      const result = purchaseFish(species.id);
      if (!result.success && import.meta.env.DEV) {
        console.log('[shop] purchase failed:', result.reason);
      }
    });
    container.add(buyText);

    rows.push({ buyText, costText, species });
  });

  // Cache per-row affordability so we don't call setBackgroundColor (which re-bakes
  // the text texture in Phaser 3.x) every frame - only when affordability flips.
  const lastAffordable = new Map<string, boolean | null>();
  for (const row of rows) lastAffordable.set(row.species.id, null);

  function refreshAffordability(): void {
    const balance = getState().coinBalance;
    for (const row of rows) {
      const cost = fishCost(row.species);
      const canAfford = balance >= cost;
      if (lastAffordable.get(row.species.id) === canAfford) continue;
      lastAffordable.set(row.species.id, canAfford);
      if (canAfford) {
        row.buyText.setColor('#ffffff');
        row.buyText.setBackgroundColor('#2e7d32');
      } else {
        row.buyText.setColor('#777777');
        row.buyText.setBackgroundColor('#3a3a3a');
      }
    }
  }
  refreshAffordability();

  return {
    toggle() {
      container.setVisible(!container.visible);
      if (container.visible) refreshAffordability();
    },
    update() {
      if (container.visible) refreshAffordability();
    },
    destroy() {
      container.destroy();
    },
  };
}
