import type Phaser from 'phaser';
import type { SaveStateV1 } from '../types/Save.js';
import type { Biome } from '../types/Biome.js';
import { BIOMES } from '../data/biomes.js';
import { FISH_SPECIES } from '../data/fish.js';
import { DECORATIONS } from '../data/decorations.js';
import { fishCost } from '../util/fishCost.js';
import { formatCoins } from '../util/formatCoins.js';
import { purchaseFish } from '../sim/PurchaseFish.js';
import { purchaseDecoration } from '../sim/PurchaseDecoration.js';
import { isBiomeUnlocked, getHighestUnlockedBiome } from '../util/biomeUnlock.js';

export interface ShopPanel {
  toggle(): void;
  update(): void;
  destroy(): void;
  /** True if the panel is currently visible. Used by TankScene to gate decoration drag. */
  isOpen(): boolean;
}

const PANEL_W = 600;
const PANEL_H = 520;
const PANEL_DEPTH = 200;
const TAB_H = 36;
const DECORATIONS_TAB_ID = '__decorations__';

interface RowSpec {
  id: string;
  name: string;
  cost: number;
  textureKey: string;
  iconScale: number;
}

interface Row {
  buyText: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  spec: RowSpec;
}

interface TabUI {
  tabId: string;
  label: string;
  tab: Phaser.GameObjects.Text;
  grid: Phaser.GameObjects.Container;
  rows: Row[];
  lastAffordable: Map<string, boolean | null>;
  alwaysUnlocked: boolean;
  biome: Biome | null;
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

  const totalTabs = BIOMES.length + 1;
  const tabSpacing = PANEL_W / totalTabs;
  const tabStart = -PANEL_W / 2 + tabSpacing / 2;

  let activeTabId = getHighestUnlockedBiome(getState().lifetimeEarned).id;

  function specsForBiome(biome: Biome): RowSpec[] {
    return FISH_SPECIES.filter((s) => s.biomeId === biome.id).map((s) => ({
      id: s.id,
      name: s.name,
      cost: fishCost(s),
      textureKey: s.id,
      iconScale: s.scale * 1.3,
    }));
  }

  function specsForDecorations(): RowSpec[] {
    return DECORATIONS.map((d) => ({
      id: d.id,
      name: d.name,
      cost: d.cost,
      textureKey: d.id,
      iconScale: 1.6,
    }));
  }

  function buildTab(
    tabId: string,
    label: string,
    tabIdx: number,
    specs: RowSpec[],
    onBuy: (id: string) => void,
    alwaysUnlocked: boolean,
    biome: Biome | null,
  ): TabUI {
    const tab = scene.add
      .text(tabStart + tabIdx * tabSpacing, tabsY, label, {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: 'monospace',
        backgroundColor: '#222',
        padding: { x: 8, y: 6 },
      })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true });
    tab.on('pointerdown', () => {
      if (!alwaysUnlocked && biome && !isBiomeUnlocked(biome.id, getState().lifetimeEarned)) return;
      setActiveTab(tabId);
    });
    container.add(tab);

    const grid = scene.add.container(0, 0);
    container.add(grid);

    const rows: Row[] = specs.map((spec, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = -PANEL_W / 2 + 20 + col * colW + colW / 2;
      const y = gridStartY + row * rowH + rowH / 2;

      const icon = scene.add.image(x - colW / 2 + 24, y, spec.textureKey);
      icon.setScale(spec.iconScale);
      grid.add(icon);

      const name = scene.add.text(x - colW / 2 + 50, y - 16, spec.name, {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: 'monospace',
      });
      grid.add(name);

      const costText = scene.add.text(x - colW / 2 + 50, y + 2, `${formatCoins(spec.cost)} c`, {
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
        if (tabId !== activeTabId) return;
        onBuy(spec.id);
      });
      grid.add(buyText);

      return { buyText, costText, spec };
    });

    const lastAffordable = new Map<string, boolean | null>();
    for (const r of rows) lastAffordable.set(r.spec.id, null);

    return { tabId, label, tab, grid, rows, lastAffordable, alwaysUnlocked, biome };
  }

  const tabs: TabUI[] = [];
  BIOMES.forEach((biome, idx) => {
    tabs.push(
      buildTab(
        biome.id,
        biome.name,
        idx,
        specsForBiome(biome),
        (id) => {
          const r = purchaseFish(id);
          if (!r.success && import.meta.env.DEV) console.log('[shop] fish buy failed:', r.reason);
        },
        false,
        biome,
      ),
    );
  });
  tabs.push(
    buildTab(
      DECORATIONS_TAB_ID,
      'Decorations',
      BIOMES.length,
      specsForDecorations(),
      (id) => {
        const r = purchaseDecoration(id);
        if (!r.success && import.meta.env.DEV) console.log('[shop] deco buy failed:', r.reason);
      },
      true,
      null,
    ),
  );

  function setActiveTab(tabId: string): void {
    activeTabId = tabId;
    for (const ui of tabs) {
      ui.grid.setVisible(ui.tabId === tabId);
      if (ui.tabId === tabId) {
        for (const r of ui.rows) ui.lastAffordable.set(r.spec.id, null);
      }
    }
    refreshTabs();
  }

  function refreshTabs(): void {
    const lifetime = getState().lifetimeEarned;
    for (const ui of tabs) {
      const unlocked = ui.alwaysUnlocked || (ui.biome ? isBiomeUnlocked(ui.biome.id, lifetime) : false);
      const active = ui.tabId === activeTabId;
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

  function refreshActiveAffordability(): void {
    const active = tabs.find((u) => u.tabId === activeTabId);
    if (!active) return;
    const balance = getState().coinBalance;
    for (const row of active.rows) {
      const canAfford = balance >= row.spec.cost;
      if (active.lastAffordable.get(row.spec.id) === canAfford) continue;
      active.lastAffordable.set(row.spec.id, canAfford);
      if (canAfford) {
        row.buyText.setColor('#ffffff');
        row.buyText.setBackgroundColor('#2e7d32');
      } else {
        row.buyText.setColor('#777777');
        row.buyText.setBackgroundColor('#3a3a3a');
      }
    }
  }

  setActiveTab(activeTabId);
  refreshActiveAffordability();

  return {
    toggle() {
      container.setVisible(!container.visible);
      if (container.visible) {
        const activeUI = tabs.find((u) => u.tabId === activeTabId);
        if (
          activeUI &&
          !activeUI.alwaysUnlocked &&
          activeUI.biome &&
          !isBiomeUnlocked(activeUI.biome.id, getState().lifetimeEarned)
        ) {
          setActiveTab(getHighestUnlockedBiome(getState().lifetimeEarned).id);
        } else {
          refreshTabs();
        }
        refreshActiveAffordability();
      }
    },
    update() {
      if (container.visible) {
        refreshTabs();
        refreshActiveAffordability();
      }
    },
    destroy() {
      container.destroy();
    },
    isOpen() {
      return container.visible;
    },
  };
}
