import type Phaser from 'phaser';
import type { SaveStateV1 } from '../types/Save.js';
import type { Biome } from '../types/Biome.js';
import { BIOMES } from '../data/biomes.js';
import { FISH_SPECIES } from '../data/fish.js';
import { fishCost } from '../util/fishCost.js';
import { formatCoins } from '../util/formatCoins.js';
import { purchaseFish } from '../sim/PurchaseFish.js';
import { isBiomeUnlocked, getHighestUnlockedBiome } from '../util/biomeUnlock.js';

export interface ShopPanel {
  toggle(): void;
  update(): void;
  destroy(): void;
}

const PANEL_W = 600;
const PANEL_H = 520;
const PANEL_DEPTH = 200;
const TAB_H = 36;

interface Row {
  buyText: Phaser.GameObjects.Text;
  species: (typeof FISH_SPECIES)[number];
}

interface BiomeUI {
  biome: Biome;
  tab: Phaser.GameObjects.Text;
  grid: Phaser.GameObjects.Container;
  rows: Row[];
  lastAffordable: Map<string, boolean | null>;
}

export function createShopPanel(
  scene: Phaser.Scene,
  getState: () => SaveStateV1,
): ShopPanel {
  const cx = scene.scale.width / 2;
  const cy = scene.scale.height / 2;

  const container = scene.add.container(cx, cy).setDepth(PANEL_DEPTH).setVisible(false);

  const bg = scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x0a1a3a, 0.92);
  bg.setStrokeStyle(2, 0xffffff, 0.4);
  bg.setInteractive();
  container.add(bg);

  const title = scene.add
    .text(0, -PANEL_H / 2 + 14, 'SHOP', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    })
    .setOrigin(0.5, 0);
  container.add(title);

  const close = scene.add
    .text(PANEL_W / 2 - 20, -PANEL_H / 2 + 10, 'X', {
      fontSize: '22px',
      color: '#ffaaaa',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    })
    .setOrigin(0.5, 0)
    .setInteractive({ useHandCursor: true });
  close.on('pointerdown', () => container.setVisible(false));
  container.add(close);

  const tabsY = -PANEL_H / 2 + 50;
  const gridStartY = tabsY + TAB_H + 8;
  const cols = 2;
  const rowH = 70;
  const colW = (PANEL_W - 40) / cols;
  const tabSpacing = PANEL_W / BIOMES.length;
  const tabStart = -PANEL_W / 2 + tabSpacing / 2;

  let activeBiomeId = getHighestUnlockedBiome(getState().lifetimeEarned).id;

  const biomeUIs: BiomeUI[] = BIOMES.map((biome, biomeIdx) => {
    const tab = scene.add
      .text(tabStart + biomeIdx * tabSpacing, tabsY, biome.name, {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#222',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    tab.on('pointerdown', () => {
      if (!isBiomeUnlocked(biome.id, getState().lifetimeEarned)) return;
      setActiveBiome(biome.id);
    });
    container.add(tab);

    const grid = scene.add.container(0, 0);
    container.add(grid);

    const speciesInBiome = FISH_SPECIES.filter((s) => s.biomeId === biome.id);
    const rows: Row[] = speciesInBiome.map((species, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = -PANEL_W / 2 + 20 + col * colW + colW / 2;
      const y = gridStartY + row * rowH + rowH / 2;

      const icon = scene.add.image(x - colW / 2 + 24, y, species.id);
      icon.setScale(species.scale * 1.3);
      grid.add(icon);

      const name = scene.add.text(x - colW / 2 + 50, y - 16, species.name, {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: 'monospace',
      });
      grid.add(name);

      const cost = fishCost(species);
      const costText = scene.add.text(x - colW / 2 + 50, y + 2, `${formatCoins(cost)} c`, {
        fontSize: '11px',
        color: '#ffe066',
        fontFamily: 'monospace',
      });
      grid.add(costText);

      const buyText = scene.add
        .text(x + colW / 2 - 50, y - 8, 'BUY', {
          fontSize: '15px',
          color: '#cccccc',
          fontFamily: 'monospace',
          backgroundColor: '#1a4d1a',
          padding: { x: 8, y: 4 },
        })
        .setInteractive({ useHandCursor: true });
      buyText.on('pointerdown', () => {
        // Guard against click-through on hidden grids: Phaser's container
        // setVisible(false) does NOT disable child input handlers.
        if (biome.id !== activeBiomeId) return;
        const result = purchaseFish(species.id);
        if (!result.success && import.meta.env.DEV) {
          console.log('[shop] purchase failed:', result.reason);
        }
      });
      grid.add(buyText);

      return { buyText, species };
    });

    const lastAffordable = new Map<string, boolean | null>();
    for (const r of rows) lastAffordable.set(r.species.id, null);

    return { biome, tab, grid, rows, lastAffordable };
  });

  function setActiveBiome(biomeId: string): void {
    activeBiomeId = biomeId;
    for (const ui of biomeUIs) {
      ui.grid.setVisible(ui.biome.id === biomeId);
      if (ui.biome.id === biomeId) {
        for (const r of ui.rows) ui.lastAffordable.set(r.species.id, null);
      }
    }
    refreshTabs();
  }

  function refreshTabs(): void {
    const lifetime = getState().lifetimeEarned;
    for (const ui of biomeUIs) {
      const unlocked = isBiomeUnlocked(ui.biome.id, lifetime);
      const active = ui.biome.id === activeBiomeId;
      if (!unlocked) {
        ui.tab.setColor('#666666');
        ui.tab.setBackgroundColor('#1a1a1a');
      } else if (active) {
        ui.tab.setColor('#ffffff');
        ui.tab.setBackgroundColor('#2e7d32');
      } else {
        ui.tab.setColor('#dddddd');
        ui.tab.setBackgroundColor('#333');
      }
    }
  }

  function refreshActiveGridAffordability(): void {
    const active = biomeUIs.find((u) => u.biome.id === activeBiomeId);
    if (!active) return;
    const balance = getState().coinBalance;
    for (const row of active.rows) {
      const cost = fishCost(row.species);
      const canAfford = balance >= cost;
      if (active.lastAffordable.get(row.species.id) === canAfford) continue;
      active.lastAffordable.set(row.species.id, canAfford);
      if (canAfford) {
        row.buyText.setColor('#ffffff');
        row.buyText.setBackgroundColor('#2e7d32');
      } else {
        row.buyText.setColor('#777777');
        row.buyText.setBackgroundColor('#3a3a3a');
      }
    }
  }

  setActiveBiome(activeBiomeId);
  refreshActiveGridAffordability();

  return {
    toggle() {
      container.setVisible(!container.visible);
      if (container.visible) {
        const top = getHighestUnlockedBiome(getState().lifetimeEarned).id;
        if (!isBiomeUnlocked(activeBiomeId, getState().lifetimeEarned)) {
          setActiveBiome(top);
        } else {
          refreshTabs();
        }
        refreshActiveGridAffordability();
      }
    },
    update() {
      if (container.visible) {
        refreshTabs();
        refreshActiveGridAffordability();
      }
    },
    destroy() {
      container.destroy();
    },
  };
}
