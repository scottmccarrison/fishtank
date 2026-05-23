# M6 Decorations - Fishtank Implementation Plan

## Context

M5 closed off long-arc progression (biome unlocks + crossfading backdrops). M6 adds the only optional player interaction the MVP supports per ADR-0004: cosmetic decorations the player can buy and drag-drop into the tank.

After M6: the shop has a 4th tab "Decorations" alongside the 3 biome tabs. Buying a decoration spawns its sprite in the tank, which the player can drag with mouse or touch. Positions are persisted in the existing `decorationInstances` save field (no schema migration; the field already exists from M1).

**Closes: TBD (M6.1-M6.5 issues filed in setup step).**

## Repo state (post-M5)

- On main at the M5 merge commit, deployed at mccarrison.me/fish
- `src/types/Decoration.ts` defines `DecorationSpecies` (id, name, assetPath) and `DecorationInstance` (id, speciesId, x, y, placedAt) - both exist from M1
- `src/data/decorations.ts` exports `DECORATIONS` with 10 species but **no cost field**
- `src/types/Save.ts` already includes `decorationInstances: DecorationInstance[]` on SaveStateV1
- `src/sim/PurchaseFish.ts` is the reference pattern for `purchaseDecoration`
- `src/scenes/SpriteLoader.ts` only preloads fish sprites; needs a sibling for decorations
- `src/ui/ShopPanel.ts` has 3 biome tabs from M5; needs a 4th "Decorations" tab
- `src/scenes/TankScene.ts` does not render decorations yet
- 70 vitest cases passing, jsdom env
- All 10 decoration PNGs already in `public/assets/decorations/`
- **M6 milestone exists but has zero issues filed**

## Strategy

**Setup (orchestrator, before Wave 1):**
1. File 5 GitHub issues for M6.1-M6.5 under "M6: Decorations" milestone. Capture numbers.
2. Branch `integrate/m6-decorations` off main.
3. **Update `DecorationSpecies` to add `cost: number` and populate `DECORATIONS` with prices.** Commit directly on the integration branch so Wave 1 inherits the type and data. (Same pattern as M5's biomeUnlock setup.)

**Wave 1 (3 parallel agents):**
- WS1: `purchaseDecoration` action + tests (M6.2)
- WS2: ShopPanel adds a "Decorations" tab (M6.5)
- WS3: `preloadDecorationSprites` + `DecorationManager` module (sprite + drag-drop) (M6.3 + M6.4)

**Wave 2 (1 sequential agent):**
- WS4: TankScene wires DecorationManager (preload, spawn from save state, mount drag-drop callback)

**Final PR:** `integrate/m6-decorations` -> `main`, title `M6: Decorations (closes #...)`, squash-merge, deploy.

---

## Setup: orchestrator commits (before Wave 1)

### File M6 issues

**M6.1: Add cost field to DecorationSpecies + populate DECORATIONS** (labels: `area:sim`, `type:infra`)
```
## Context
Decorations need per-species costs for the shop to display and the purchase flow to validate. Unlike fish (where cost is derived from biome+costIndex), decoration costs are stored directly on the species - cosmetics don't need a formula.

## Acceptance criteria
- [ ] DecorationSpecies type adds `cost: number` (coin price)
- [ ] DECORATIONS registry populated with hand-picked prices (cheap junk: 25-75; mid: 100-250; pricey: 500-1000)
- [ ] tsc --noEmit passes
- [ ] No test required (data only)

## Dependencies
- M1.3 (DecorationSpecies type)
```

**M6.2: purchaseDecoration action** (labels: `area:sim`)
```
## Context
Mirror of purchaseFish: validate balance vs species.cost, deduct, append to decorationInstances.

## Acceptance criteria
- [ ] src/sim/PurchaseDecoration.ts exports purchaseDecoration(speciesId: string): PurchaseDecorationResult
- [ ] Result type: { success: true, newDecoration: DecorationInstance, cost: number } | { success: false, reason: 'unknown_species' | 'insufficient_funds' }
- [ ] Default placement: center of tank (400, 300) - user can drag elsewhere immediately
- [ ] Mutates state in place
- [ ] Unit tests cover happy path, insufficient funds, unknown species, state mutation, no-mutation-on-failure

## Dependencies
- M6.1 (cost field)
- M2.3 (state singleton)
```

**M6.3: Decoration sprite preload + render** (labels: `area:ui`)
```
## Context
Phaser needs textures preloaded before sprites can be created. Currently only fish are preloaded.

## Acceptance criteria
- [ ] src/scenes/SpriteLoader.ts adds preloadDecorationSprites(scene: Phaser.Scene) - loads all 10 DECORATIONS textures using encodeURI for filenames with spaces
- [ ] Texture key = species.id (e.g., "coral", "apple-core")
- [ ] TankScene.preload() calls both preloadFishSprites AND preloadDecorationSprites

## Dependencies
- M6.1 (DECORATIONS is data, but this consumes the registry)
```

**M6.4: DecorationManager (drag-drop)** (labels: `area:ui`)
```
## Context
Each decoration sprite is draggable. Position updates persist to the DecorationInstance, autosave handles persistence.

## Acceptance criteria
- [ ] src/scenes/DecorationManager.ts exports createDecorationManager(scene, getState) returning { update(): void, spawn(instance): void }
- [ ] On instantiation, manager subscribes to nothing - just exposes helpers
- [ ] spawn(instance): create Phaser.Image at instance.x/y with texture=instance.speciesId, depth -5 (below fish), interactive + draggable, on 'drag' event update sprite.x/y AND instance.x/y (clamped to tank bounds 0..800 x 0..600)
- [ ] update(instances): spawn sprites for newly-added instances (matches TankScene's fish pattern)
- [ ] Unit test for clamping logic and ensureSprite-on-new-instance pattern

## Dependencies
- M6.3 (sprite preload)
```

**M6.5: ShopPanel decoration tab** (labels: `area:ui`)
```
## Context
Add a 4th tab "Decorations" alongside the 3 biome tabs. Always unlocked, costs from species.cost, BUY calls purchaseDecoration.

## Acceptance criteria
- [ ] ShopPanel renders 4 tabs: Tide Pool / Open Reef / Abyss / Decorations
- [ ] Decorations tab always unlocked (no threshold check)
- [ ] Decoration grid: 2 cols x 5 rows, icon + name + cost + BUY button (same layout as biome grids)
- [ ] BUY calls purchaseDecoration; same affordability coloring as fish
- [ ] Click-through guard on hidden grid still applies (already in pattern)

## Dependencies
- M6.1, M6.2
```

### Setup commit on integration branch

Update `src/types/Decoration.ts`:
```typescript
/** Static decoration definition (e.g., coral, seashell). */
export interface DecorationSpecies {
  /** Stable identifier, kebab-case. */
  id: string;
  /** Display name. */
  name: string;
  /** Cost in coins. */
  cost: number;
  /** Path relative to public/, e.g. "assets/decorations/Coral.png". */
  assetPath: string;
}

/** Player-placed decoration instance. */
export interface DecorationInstance {
  /** Unique instance ID (UUID v4). */
  id: string;
  /** References DecorationSpecies.id. */
  speciesId: string;
  /** Placement x in tank coords. */
  x: number;
  /** Placement y in tank coords. */
  y: number;
  /** ISO timestamp of placement. */
  placedAt: string;
}
```

Update `src/data/decorations.ts`:
```typescript
import type { DecorationSpecies } from '../types/Decoration.js';

/**
 * Ten misc items from the Pixel Gnome pack. Placed cosmetically; no gameplay
 * effect. Costs hand-picked for variety: junk-class (25-75), mid-class
 * (100-250), pricey (500-1000). All reachable in early-to-mid Tide Pool.
 */
export const DECORATIONS: DecorationSpecies[] = [
  { id: 'apple-core',   name: 'Apple Core',   cost: 25,   assetPath: 'assets/decorations/Apple Core.png' },
  { id: 'rusty-can',    name: 'Rusty Can',    cost: 50,   assetPath: 'assets/decorations/Rusty Can.png' },
  { id: 'worm',         name: 'Worm',         cost: 50,   assetPath: 'assets/decorations/Worm.png' },
  { id: 'bottle',       name: 'Bottle',       cost: 75,   assetPath: 'assets/decorations/Bottle.png' },
  { id: 'coral',        name: 'Coral',        cost: 100,  assetPath: 'assets/decorations/Coral.png' },
  { id: 'seaweed',      name: 'Seaweed',      cost: 100,  assetPath: 'assets/decorations/Seaweed.png' },
  { id: 'seashell',     name: 'Seashell',     cost: 150,  assetPath: 'assets/decorations/Seashell.png' },
  { id: 'sand-dollar',  name: 'Sand Dollar',  cost: 200,  assetPath: 'assets/decorations/Sand Dollar.png' },
  { id: 'pearl',        name: 'Pearl',        cost: 500,  assetPath: 'assets/decorations/Pearl.png' },
  { id: 'lure',         name: 'Lure',         cost: 750,  assetPath: 'assets/decorations/Lure.png' },
];
```

Verify: `npm run typecheck` clean. Commit message:
```
M6 setup: add cost field to DecorationSpecies + populate prices

Per-species costs picked for variety: junk 25-75, mid 100-250, pricey 500-1000.
Total to collect all = ~2000 coins (reachable early-mid Tide Pool).
Cost is stored directly on the species (no formula needed; decorations
are cosmetic without earn-rate scaling).
```

---

## Wave 1: Parallel (3 worktrees)

### Workstream 1: purchaseDecoration (M6.2)

**Worktree:** `../fishtank-ws1`
**Branch:** `feature/m6-purchase-deco` off `integrate/m6-decorations`
**Commit:** `M6.2: purchaseDecoration action (closes #<m6.2>)`

**Files:**

1. `src/sim/PurchaseDecoration.ts`:
```typescript
import type { DecorationInstance, DecorationSpecies } from '../types/Decoration.js';
import { DECORATIONS } from '../data/decorations.js';
import { uuid } from '../util/uuid.js';
import { getState } from '../state.js';

const SPECIES_BY_ID = new Map<string, DecorationSpecies>(
  DECORATIONS.map((s) => [s.id, s]),
);

export type PurchaseDecorationResult =
  | { success: true; newDecoration: DecorationInstance; cost: number }
  | { success: false; reason: 'unknown_species' | 'insufficient_funds' };

/**
 * Purchase a decoration: validate balance, deduct cost, append to
 * decorationInstances. Mutates state in place (consistent with purchaseFish).
 *
 * Default placement is the center of the tank. The player drags it elsewhere
 * via the M6.4 DecorationManager.
 */
export function purchaseDecoration(speciesId: string): PurchaseDecorationResult {
  const species = SPECIES_BY_ID.get(speciesId);
  if (!species) return { success: false, reason: 'unknown_species' };

  const state = getState();
  if (state.coinBalance < species.cost) {
    return { success: false, reason: 'insufficient_funds' };
  }

  state.coinBalance -= species.cost;

  const newDecoration: DecorationInstance = {
    id: uuid(),
    speciesId: species.id,
    // Center-ish with small random jitter so multiple consecutive purchases
    // don't perfectly stack on top of each other (~80px x 80px scatter).
    x: 400 + Math.floor(Math.random() * 80) - 40,
    y: 300 + Math.floor(Math.random() * 80) - 40,
    placedAt: new Date().toISOString(),
  };
  state.decorationInstances.push(newDecoration);

  return { success: true, newDecoration, cost: species.cost };
}
```

2. `src/sim/PurchaseDecoration.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { purchaseDecoration } from './PurchaseDecoration.js';
import { setState, getState } from '../state.js';
import type { SaveStateV1 } from '../types/Save.js';

const baseState = (overrides: Partial<SaveStateV1> = {}): SaveStateV1 => ({
  version: 1,
  lastSavedAt: '2026-05-22T12:00:00.000Z',
  coinBalance: 1000,
  lifetimeEarned: 1000,
  fishInstances: [],
  decorationInstances: [],
  ...overrides,
});

describe('purchaseDecoration', () => {
  beforeEach(() => {
    setState(baseState());
  });

  it('succeeds when balance is sufficient (apple-core costs 25)', () => {
    const result = purchaseDecoration('apple-core');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.cost).toBe(25);
    expect(result.newDecoration.speciesId).toBe('apple-core');
    expect(result.newDecoration.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('deducts cost and appends to decorationInstances', () => {
    const before = getState().coinBalance;
    const result = purchaseDecoration('coral');
    expect(result.success).toBe(true);
    expect(getState().coinBalance).toBeCloseTo(before - 100, 3);
    expect(getState().decorationInstances).toHaveLength(1);
    expect(getState().decorationInstances[0]!.speciesId).toBe('coral');
  });

  it('fails on insufficient funds', () => {
    setState(baseState({ coinBalance: 10 }));
    const result = purchaseDecoration('coral');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('insufficient_funds');
  });

  it('fails on unknown species', () => {
    const result = purchaseDecoration('mystery-deco');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('unknown_species');
  });

  it('spawns near center of tank with small jitter', () => {
    const result = purchaseDecoration('coral');
    expect(result.success).toBe(true);
    if (!result.success) return;
    // 360..440 horizontal jitter, 260..340 vertical jitter
    expect(result.newDecoration.x).toBeGreaterThanOrEqual(360);
    expect(result.newDecoration.x).toBeLessThanOrEqual(440);
    expect(result.newDecoration.y).toBeGreaterThanOrEqual(260);
    expect(result.newDecoration.y).toBeLessThanOrEqual(340);
  });

  it('does not mutate balance or fish list on failure', () => {
    setState(baseState({ coinBalance: 10 }));
    const result = purchaseDecoration('coral');
    expect(result.success).toBe(false);
    expect(getState().coinBalance).toBe(10);
    expect(getState().decorationInstances).toHaveLength(0);
  });
});
```

**Verify:** `npm install`, `npm test -- PurchaseDecoration` (6 cases), typecheck, build.

---

### Workstream 2: ShopPanel decoration tab (M6.5)

**Worktree:** `../fishtank-ws2`
**Branch:** `feature/m6-shop-deco` off `integrate/m6-decorations`
**Commit:** `M6.5: ShopPanel adds Decorations tab (closes #<m6.5>)`

**REWRITE** `src/ui/ShopPanel.ts` (replace M5 version - keeps biome tabs, adds 4th decoration tab):
```typescript
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
  /** Asset texture key (matches species.id). */
  textureKey: string;
  /** Render scale on the icon. */
  iconScale: number;
}

interface Row {
  buyText: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  spec: RowSpec;
}

interface TabUI {
  tabId: string; // biome.id or DECORATIONS_TAB_ID
  label: string;
  tab: Phaser.GameObjects.Text;
  grid: Phaser.GameObjects.Container;
  rows: Row[];
  lastAffordable: Map<string, boolean | null>;
  /** True if this tab is the decorations tab (always unlocked). */
  alwaysUnlocked: boolean;
  /** Source biome, for unlock check. Null for decorations tab. */
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

  // Tabs: 3 biomes + 1 decorations
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
      iconScale: 1.6, // decorations look fine at modest upscale
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
        // Guard against hidden-grid click-through (setVisible(false) doesn't disable input)
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
        // Fall back to highest unlocked biome OR Decorations if active is now locked
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
```

**Verify:** typecheck, build, npm test (existing 70+ tests pass; no new tests since UI integration is visual).

---

### Workstream 3: SpriteLoader + DecorationManager (M6.3 + M6.4)

**Worktree:** `../fishtank-ws3`
**Branch:** `feature/m6-deco-render` off `integrate/m6-decorations`
**Commit:** `M6.3 + M6.4: decoration sprite preload + DecorationManager drag-drop (closes #<m6.3>, closes #<m6.4>)`

**Files:**

1. **MODIFY** `src/scenes/SpriteLoader.ts` (add `preloadDecorationSprites` alongside existing fish loader; do NOT touch the fish function):
```typescript
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
```

2. **CREATE** `src/scenes/DecorationManager.ts`:
```typescript
import type Phaser from 'phaser';
import type { DecorationInstance } from '../types/Decoration.js';
import type { SaveStateV1 } from '../types/Save.js';

export interface DecorationManager {
  /** Called every frame; spawns sprites for newly-added instances. */
  update(): void;
  /** Tear down sprites - used during scene shutdown. */
  destroy(): void;
}

const DECORATION_DEPTH = -5; // above backdrop (-100), below fish (0)
const TANK_WIDTH = 800;
const TANK_HEIGHT = 600;
const MARGIN = 20;

/**
 * Clamp a position to within tank bounds (with margin so sprites don't clip edges).
 * Exposed for testing.
 */
export function clampToTank(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(MARGIN, Math.min(TANK_WIDTH - MARGIN, x)),
    y: Math.max(MARGIN, Math.min(TANK_HEIGHT - MARGIN, y)),
  };
}

/**
 * Manages decoration sprite lifecycles + drag-drop wiring. Reads from save state;
 * spawns a Phaser Image per DecorationInstance; updates instance.x/y on drag.
 *
 * `isInputBlocked` is called per drag event - when true (e.g. the shop panel
 * is open above the tank), drag is ignored. Without this guard, dragging
 * inside the shop area still moves the decoration underneath because Phaser
 * input is hit-tested per object, not z-ordered.
 *
 * TODO(post-M6): expose despawn() for a future delete-decoration flow.
 */
export function createDecorationManager(
  scene: Phaser.Scene,
  getState: () => SaveStateV1,
  isInputBlocked: () => boolean = () => false,
): DecorationManager {
  const sprites = new Map<string, Phaser.GameObjects.Image>();

  function spawn(instance: DecorationInstance): void {
    const sprite = scene.add.image(instance.x, instance.y, instance.speciesId);
    sprite.setScale(3); // match fish render scale multiplier (M3)
    sprite.setDepth(DECORATION_DEPTH);
    sprite.setInteractive({ useHandCursor: true });
    // Explicit setDraggable for Phaser-version-safety; `draggable: true` in
    // setInteractive config also works in 3.60+ but is parsed at runtime.
    scene.input.setDraggable(sprite);

    sprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (isInputBlocked()) return;
      const clamped = clampToTank(dragX, dragY);
      sprite.setPosition(clamped.x, clamped.y);
      instance.x = clamped.x;
      instance.y = clamped.y;
    });

    sprites.set(instance.id, sprite);
  }

  // Initial spawn for any existing instances
  for (const instance of getState().decorationInstances) {
    spawn(instance);
  }

  return {
    update() {
      const live = getState().decorationInstances;
      for (const inst of live) {
        if (!sprites.has(inst.id)) spawn(inst);
      }
    },
    destroy() {
      for (const s of sprites.values()) s.destroy();
      sprites.clear();
    },
  };
}
```

3. `src/scenes/DecorationManager.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { clampToTank } from './DecorationManager.js';

describe('clampToTank', () => {
  it('passes through positions within bounds', () => {
    expect(clampToTank(400, 300)).toEqual({ x: 400, y: 300 });
  });

  it('clamps x below left margin', () => {
    expect(clampToTank(-50, 300)).toEqual({ x: 20, y: 300 });
  });

  it('clamps x above right margin', () => {
    expect(clampToTank(900, 300)).toEqual({ x: 780, y: 300 });
  });

  it('clamps y below top margin', () => {
    expect(clampToTank(400, -10)).toEqual({ x: 400, y: 20 });
  });

  it('clamps y above bottom margin', () => {
    expect(clampToTank(400, 700)).toEqual({ x: 400, y: 580 });
  });

  it('clamps both axes simultaneously', () => {
    expect(clampToTank(-100, -100)).toEqual({ x: 20, y: 20 });
    expect(clampToTank(1000, 1000)).toEqual({ x: 780, y: 580 });
  });
});
```

**Verify:** `npm install`, `npm test -- DecorationManager` (6 cases), typecheck, build.

---

## Wave 2: Sequential (1 worktree)

### Workstream 4: TankScene integration

**Worktree:** `../fishtank-ws4` (off `integrate/m6-decorations` AFTER Wave 1 merges)
**Branch:** `feature/m6-integration` off `integrate/m6-decorations`
**Commit:** `M6: TankScene decoration integration (closes #<m6.3 redux>, etc as needed)`

**Files to modify:**

1. **REWRITE** `src/scenes/TankScene.ts` (full replacement):
```typescript
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

    // DecorationManager: created AFTER shopPanel so its `isInputBlocked` closure
    // can reference shopPanel.isOpen(). Gating drag prevents click-through when
    // the shop is open above a decoration (Phaser hit-tests per-object, not by
    // depth). The isOpen() approach catches both the SHOP button toggle AND
    // the panel's internal X-close.
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
```

2. **UPDATE** `src/ui/README.md`:
```
UI components.

- `CoinCounter.ts` (M3.5): top-left HUD showing balance and earn rate.
- `CoinFloater.ts` (M4.4): per-fish floating "+1" animations on coin earn.
- `ShopPanel.ts` (M4.3, M5.4, M6.5): modal shop with biome + decoration tabs.
- `GradientBackdrop.ts` (M5.2): per-biome gradient background with crossfade.
- `BiomeTransition.ts` (M5.3): detects threshold crossings and shows celebration text.

Pending (M7):
- Settings panel
- Welcome-back toast
- Polish + accessibility pass
```

3. **UPDATE** `src/sim/README.md`:
```
Simulation tick loop, AI, and offline catchup.

- `SimLoop` (M2.1): 5Hz tick, handler registry, start/stop. Per ADR-0003.
- `OfflineCatchup` (M2.5): timestamp-based catchup math, capped at 24h.
- `VisibilityHandler` (M2.6): pauses sim on tab hide, resumes + applies catchup on show.
- `FishAI` (M3.3): per-fish swim AI (idle drift + occasional darting).
- `CoinEarn` (M3.4): tick handler that adds totalEarnRate * dt to coinBalance.
- `PurchaseFish` (M4.2): validates balance, deducts cost, appends FishInstance.
- `PurchaseDecoration` (M6.2): validates balance, deducts cost, appends DecorationInstance.
```

**Verify:** typecheck, build, full test suite (76+ tests), `node scripts/verify-assets.mjs`, browser smoke:
- Page loads, fish + previously-placed decorations both render
- Open SHOP, click Decorations tab, BUY apple-core
- Decoration appears in center of tank
- Drag the decoration; releases stay at new position
- Reload page; decoration is still at the dropped position

---

## Integration

**Wave 1 -> Wave 2 gate:**
```bash
git -C /home/scott/fishtank log integrate/m6-decorations --oneline -6
git -C /home/scott/fishtank ls-tree integrate/m6-decorations src/sim/PurchaseDecoration.ts src/scenes/DecorationManager.ts src/ui/ShopPanel.ts
# All must exist.
```

**After WS4:** merge, copy plan to `docs/plans/m6-decorations.md`, push, PR, squash-merge, cleanup worktrees + branches, deploy.

## Changes from adversarial review

- **Drag-through under open shop panel (BLOCKING).** Phaser's input hit-tests per-object, not by depth or z-order. Without a guard, dragging inside the shop panel's area would still drag any decoration sitting underneath. Fixed by:
  - Adding `isOpen(): boolean` to the ShopPanel interface
  - DecorationManager accepts an `isInputBlocked: () => boolean` callback; the drag handler early-returns when blocked
  - TankScene wires `() => this.shopPanel.isOpen()` so both the SHOP-button toggle AND the panel's internal X-close are caught
- **Explicit `scene.input.setDraggable(sprite)` (SHOULD-FIX).** `setInteractive({ draggable: true })` works in Phaser 3.60+ but is parsed at runtime; the explicit call is idiomatic and version-safe.
- **Decoration spawn jitter (SHOULD-FIX).** Multiple consecutive purchases at exactly (400, 300) would stack invisibly. Added ~80x80 random jitter around center so spawns scatter. Test updated to assert position within the jitter range.

## Risks / Notes

- **Decoration costs are flat per species, not formulaic.** ROADMAP didn't specify costs; the picks here are an interpretation. Easy to retune in `src/data/decorations.ts`.
- **Default placement at (400, 300) center.** Multiple purchases stack. Acceptable for MVP - the player drags them apart.
- **Decoration sprite scale = 3** to match fish RENDER_SCALE_MULTIPLIER. May look big or small depending on the sprite. M7 polish can per-species tune via a `scale` field on DecorationSpecies if needed.
- **Drag-drop mutates `instance.x/y` in place** during drag (not just on dragend). Autosave will persist whatever the current position is on its next tick.
- **No e2e test for drag in jsdom** - it's hard to faithfully simulate Phaser drag events. clampToTank logic is unit-tested; the rest is manual smoke.
- **Touch support comes for free.** Phaser pointer events handle both mouse and touch.
- **No depth boost during drag.** Decorations stay at depth -5 throughout drag. If fish overlap and obscure the dragging sprite, M7 polish can bump depth temporarily.
