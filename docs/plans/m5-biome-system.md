# M5 Biome System - Fishtank Implementation Plan

## Context

M4 left the player with a working core loop: earn coins, click SHOP, buy more fish, watch "+N" floaters. M5 makes biomes real: as the player's lifetime earnings cross thresholds, new biomes unlock (Open Reef ~15.5K, Abyss ~4.8M), the backdrop gradient transitions to the new biome, and the shop reveals additional tabs filled with the new species.

After M5, the player has visible long-arc progression: the world literally darkens and deepens as they accumulate wealth.

Per the M5 ROADMAP section: biome data structure (already exists), coin-threshold unlock gates, gradient backdrops per biome, biome transition celebration moment, shop filtering by available biomes.

**Closes: TBD (M5.1-M5.5 issues filed in setup step).**

## Repo state (post-M4)

- On main at `7d25f50` or later (M4 merged + deployed)
- `src/data/biomes.ts` already exports `BIOMES` with `id`, `name`, `fishSpeciesIds`, `unlockThreshold`, `gradientFrom`, `gradientTo`
- `src/data/fish.ts` has all 28 species with `biomeId`
- `src/util/fishCost.ts` computes per-species cost (no biome filtering needed there)
- `src/scenes/TankScene.ts` renders fish + HUD + shop button on a hardcoded blue background
- `src/ui/ShopPanel.ts` shows ONLY Tide Pool species in a 2x5 grid - explicitly noted as "M5 adds biome tabs"
- 58 vitest cases passing; jsdom env
- **M5 milestone exists but has zero issues filed**

## Strategy

**Unlock model:** derive from `lifetimeEarned`, never store explicit unlock flags. Standard idle-game pattern - once you've earned enough cumulative coins, the biome is unlocked forever even if you spend below the threshold. No save schema migration needed.

**Active biome (for backdrop):** always show the highest unlocked biome. On unlock-threshold crossing, transition the gradient.

**Setup (orchestrator, before Wave 1):**
1. File 5 GitHub issues for M5.1-M5.5 under "M5: Biome System" milestone. Capture numbers.
2. Branch `integrate/m5-biome-system` off main.
3. **Commit `src/util/biomeUnlock.ts` directly on the integration branch** before spawning Wave 1. This is M5.1's code; the orchestrator commits it so Wave 1 agents inherit it (avoiding the M4 fishCost.ts merge conflict pattern where three branches independently created the same file). Wave 1 then has WS2 and WS3 just import from it; WS1 only needs to add the tests.

**Wave 1 (3 parallel agents):** Pure logic + isolated UI modules.
- WS1: `isBiomeUnlocked` + `getHighestUnlockedBiome` helpers (M5.1)
- WS2: `BiomeTransition` detector + celebration overlay (M5.3)
- WS3: `ShopPanel` rewrite with biome tabs (M5.4)

**Wave 2 (1 sequential agent):** Backdrop + TankScene integration.
- WS4: `GradientBackdrop` module + TankScene wire-up (M5.2 + M5.5)

**Final PR:** `integrate/m5-biome-system` -> `main`, title `M5: Biome System (closes #...)`, squash-merge, deploy.

---

## Setup: File M5 issues

For each, run `gh issue create --repo scottmccarrison/fishtank --milestone "M5: Biome System" --label <labels> --title <title> --body <body>` and capture issue numbers (likely #36-#40).

**M5.1: isBiomeUnlocked + getHighestUnlockedBiome helpers** (labels: `area:sim`, `type:infra`)
```
## Context
Pure-function helpers that derive biome unlock status from lifetimeEarned. No save schema change - threshold crossings always go monotonically up (lifetimeEarned never decreases).

## Acceptance criteria
- [ ] src/util/biomeUnlock.ts exports isBiomeUnlocked(biomeId: string, lifetimeEarned: number): boolean
- [ ] Same module exports getHighestUnlockedBiome(lifetimeEarned: number): Biome (iterates BIOMES descending, returns first whose threshold is met; falls back to BIOMES[0] which has threshold 0)
- [ ] Returns false / fallback for unknown biomeId
- [ ] Unit tests cover Tide Pool always unlocked, Reef at threshold, Abyss at threshold, between-thresholds, unknown id, monotonic ordering

## Dependencies
- M1.5 (BIOMES)
```

**M5.2: GradientBackdrop + TankScene wire** (labels: `area:ui`)
```
## Context
Background gradient that crossfades on biome transition. M5 replaces the hardcoded blue with this.

## Acceptance criteria
- [ ] src/ui/GradientBackdrop.ts exports createGradientBackdrop(scene, initialBiome) returning { transitionTo(biome): void, destroy(): void }
- [ ] Implementation uses Phaser.GameObjects.Graphics with fillGradientStyle (4-corner colors). Top corners = gradientFrom, bottom corners = gradientTo, parsed from hex strings on Biome.
- [ ] Depth = -100 (below everything else)
- [ ] transitionTo(newBiome): builds a new Graphics overlay with alpha 0, tweens to alpha 1 over 1500ms, then destroys the previous Graphics
- [ ] TankScene.create() instantiates with initial biome = getHighestUnlockedBiome(state.lifetimeEarned)

## Dependencies
- M5.1 (getHighestUnlockedBiome)
```

**M5.3: BiomeTransition detector + celebration overlay** (labels: `area:ui`)
```
## Context
Detect when lifetimeEarned crosses a biome's threshold mid-session and fire a callback. Show a fading text overlay "OPEN REEF UNLOCKED!".

## Acceptance criteria
- [ ] src/ui/BiomeTransition.ts exports createBiomeTransition(scene, getState, onUnlock?: (biome: Biome) => void) returning { update(): void }
- [ ] Internal state: lastBiomeId initialized to getHighestUnlockedBiome(state.lifetimeEarned).id at construction time. On subsequent update() calls, recompute and compare.
- [ ] On change: invoke onUnlock(newBiome) AND spawn a centered Phaser Text "NAME UNLOCKED!" that fades in 500ms, holds 1000ms, fades out 1500ms, then destroys. Depth = 300 (above HUD and shop)
- [ ] No fire on initial load (lastBiomeId starts at current highest)
- [ ] Unit tests: structural mock scene; cover initial-load-no-fire, threshold-cross-fires-once, unknown biome graceful, idempotent (subsequent updates without earnings don't re-fire)

## Dependencies
- M5.1
```

**M5.4: ShopPanel biome tabs + filtering** (labels: `area:ui`)
```
## Context
M4 shop shows only Tide Pool. M5 adds three tabs (one per biome). Locked tabs are greyed and non-interactive. The active tab's grid is visible; others hidden.

## Acceptance criteria
- [ ] src/ui/ShopPanel.ts createShopPanel still returns { toggle, update, destroy }
- [ ] Three tab buttons at the top of the panel: "Tide Pool", "Open Reef", "Abyss"
- [ ] Each tab: white text + green bg when unlocked + active; grey text + dark bg when locked; lighter when unlocked but not active
- [ ] Three grids rendered (one per biome), only the active one visible
- [ ] On tab click (unlocked only): set active to that biome, swap grid visibility
- [ ] Default active = getHighestUnlockedBiome's id
- [ ] refreshAffordability still works per row in the active grid
- [ ] On open: re-evaluate tab unlock states (catches threshold crossings without a panel reopen)

## Dependencies
- M4.3, M5.1
```

**M5.5: TankScene integration: backdrop, transition, shop reopen** (labels: `area:ui`)
```
## Context
Wire the three M5 modules into TankScene: instantiate backdrop, instantiate biome transition, and pass the backdrop to transition's onUnlock so the gradient swaps.

## Acceptance criteria
- [ ] TankScene.create() instantiates GradientBackdrop with initial biome from getHighestUnlockedBiome
- [ ] TankScene.create() instantiates BiomeTransition with an onUnlock callback that calls backdrop.transitionTo(newBiome)
- [ ] update() ticks biomeTransition.update() each frame
- [ ] When the panel is open during a transition, it still works correctly (ShopPanel.update should handle tab unlock state changes)
- [ ] No regression: existing fish/coin/shop behavior preserved

## Dependencies
- M5.2, M5.3, M5.4
```

---

## Wave 1: Parallel (3 worktrees)

### Workstream 1: biomeUnlock tests (M5.1)

**Note:** `src/util/biomeUnlock.ts` itself is committed by the orchestrator during setup (see above). WS1 only adds the test file; it inherits the helper via the integration branch base.

**Worktree:** `../fishtank-ws1`
**Branch:** `feature/m5-unlock` off `integrate/m5-biome-system`
**Commit:** `M5.1: biomeUnlock helper tests (closes #<m5.1>)`

**Files (reference - the .ts source is already on the branch via setup commit):**

1. **Already exists from setup commit** - `src/util/biomeUnlock.ts`:
```typescript
import type { Biome } from '../types/Biome.js';
import { BIOMES } from '../data/biomes.js';

/**
 * Is a given biome unlocked at the player's current lifetime earnings?
 * Returns false for an unknown biomeId.
 */
export function isBiomeUnlocked(biomeId: string, lifetimeEarned: number): boolean {
  const biome = BIOMES.find((b) => b.id === biomeId);
  if (!biome) return false;
  return lifetimeEarned >= biome.unlockThreshold;
}

/**
 * The deepest biome the player has unlocked. Falls back to BIOMES[0] (Tide Pool,
 * threshold 0) which is always unlocked.
 */
export function getHighestUnlockedBiome(lifetimeEarned: number): Biome {
  for (let i = BIOMES.length - 1; i >= 0; i--) {
    const b = BIOMES[i]!;
    if (lifetimeEarned >= b.unlockThreshold) return b;
  }
  return BIOMES[0]!;
}
```

2. `src/util/biomeUnlock.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { isBiomeUnlocked, getHighestUnlockedBiome } from './biomeUnlock.js';
import { BIOMES } from '../data/biomes.js';

const reefThreshold = BIOMES.find((b) => b.id === 'open-reef')!.unlockThreshold;
const abyssThreshold = BIOMES.find((b) => b.id === 'abyss')!.unlockThreshold;

describe('isBiomeUnlocked', () => {
  it('Tide Pool is always unlocked, even at 0 lifetime earned', () => {
    expect(isBiomeUnlocked('tide-pool', 0)).toBe(true);
  });

  it('Open Reef is locked below threshold and unlocked at threshold', () => {
    expect(isBiomeUnlocked('open-reef', reefThreshold - 1)).toBe(false);
    expect(isBiomeUnlocked('open-reef', reefThreshold)).toBe(true);
    expect(isBiomeUnlocked('open-reef', reefThreshold + 1000)).toBe(true);
  });

  it('Abyss is locked when Reef is unlocked but threshold not met', () => {
    expect(isBiomeUnlocked('abyss', reefThreshold)).toBe(false);
    expect(isBiomeUnlocked('abyss', abyssThreshold)).toBe(true);
  });

  it('returns false for unknown biomeId', () => {
    expect(isBiomeUnlocked('mystery', 1_000_000_000)).toBe(false);
  });
});

describe('getHighestUnlockedBiome', () => {
  it('returns Tide Pool at 0 earnings', () => {
    expect(getHighestUnlockedBiome(0).id).toBe('tide-pool');
  });

  it('returns Tide Pool just below Reef threshold', () => {
    expect(getHighestUnlockedBiome(reefThreshold - 1).id).toBe('tide-pool');
  });

  it('returns Open Reef at Reef threshold', () => {
    expect(getHighestUnlockedBiome(reefThreshold).id).toBe('open-reef');
  });

  it('returns Open Reef just below Abyss threshold', () => {
    expect(getHighestUnlockedBiome(abyssThreshold - 1).id).toBe('open-reef');
  });

  it('returns Abyss at Abyss threshold', () => {
    expect(getHighestUnlockedBiome(abyssThreshold).id).toBe('abyss');
  });
});
```

**Verify:** `npm install`, `npm test -- biomeUnlock` passes (9 cases), `npm run typecheck`, `npm run build`.

---

### Workstream 2: BiomeTransition (M5.3)

**Worktree:** `../fishtank-ws2`
**Branch:** `feature/m5-transition` off `integrate/m5-biome-system`
**Commit:** `M5.3: BiomeTransition detector + celebration overlay (closes #<m5.3>)`

**Note:** `src/util/biomeUnlock.ts` is already on the integration branch (committed during setup); WS2 just imports from it.

**Files:**

1. `src/ui/BiomeTransition.ts`:
```typescript
import type Phaser from 'phaser';
import type { Biome } from '../types/Biome.js';
import type { SaveStateV1 } from '../types/Save.js';
import { getHighestUnlockedBiome } from '../util/biomeUnlock.js';

export interface BiomeTransition {
  update(): void;
}

const CELEBRATION_DEPTH = 300;
const FADE_IN_MS = 500;
const HOLD_MS = 1000;
const FADE_OUT_MS = 1500;

/**
 * Detects when lifetimeEarned crosses a biome unlock threshold mid-session and
 * spawns a brief celebration overlay. Initializes lastBiomeId to the currently-highest
 * unlocked biome at construction time, so reloading the page never re-fires for
 * already-unlocked biomes.
 */
export function createBiomeTransition(
  scene: Phaser.Scene,
  getState: () => SaveStateV1,
  onUnlock?: (biome: Biome) => void,
): BiomeTransition {
  let lastBiomeId = getHighestUnlockedBiome(getState().lifetimeEarned).id;

  function showCelebration(biome: Biome): void {
    const text = scene.add
      .text(
        scene.scale.width / 2,
        scene.scale.height / 2,
        `${biome.name.toUpperCase()} UNLOCKED!`,
        {
          fontSize: '40px',
          color: '#ffffff',
          fontFamily: 'monospace',
          stroke: '#000000',
          strokeThickness: 6,
        },
      )
      .setOrigin(0.5)
      .setDepth(CELEBRATION_DEPTH)
      .setAlpha(0);

    // Fade in
    scene.tweens.add({
      targets: text,
      alpha: 1,
      duration: FADE_IN_MS,
      ease: 'Cubic.easeOut',
    });
    // Fade out + drift up
    scene.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 30,
      delay: FADE_IN_MS + HOLD_MS,
      duration: FADE_OUT_MS,
      ease: 'Cubic.easeIn',
      onComplete: () => text.destroy(),
    });
  }

  return {
    update() {
      const current = getHighestUnlockedBiome(getState().lifetimeEarned);
      if (current.id !== lastBiomeId) {
        lastBiomeId = current.id;
        showCelebration(current);
        if (onUnlock) onUnlock(current);
      }
    },
  };
}
```

2. `src/ui/BiomeTransition.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type Phaser from 'phaser';
import { createBiomeTransition } from './BiomeTransition.js';
import { BIOMES } from '../data/biomes.js';
import type { SaveStateV1 } from '../types/Save.js';

const reefThreshold = BIOMES.find((b) => b.id === 'open-reef')!.unlockThreshold;

const baseState = (lifetimeEarned: number): SaveStateV1 => ({
  version: 1,
  lastSavedAt: '2026-05-22T12:00:00.000Z',
  coinBalance: 0,
  lifetimeEarned,
  fishInstances: [],
  decorationInstances: [],
});

function makeMockScene() {
  const texts: Array<{ x: number; y: number; text: string }> = [];
  const tweens: Array<{ targets: unknown; duration?: number }> = [];
  const sceneShim = {
    scale: { width: 800, height: 600 },
    add: {
      text: (x: number, y: number, t: string) => {
        texts.push({ x, y, text: t });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {
          x,
          y,
          alpha: 1,
          setOrigin: () => obj,
          setDepth: () => obj,
          setAlpha: () => obj,
          destroy: () => {},
        };
        return obj;
      },
    },
    tweens: {
      add: (cfg: { targets: unknown; duration?: number }) => {
        tweens.push({ targets: cfg.targets, duration: cfg.duration });
        return {};
      },
    },
  };
  return { scene: sceneShim, texts, tweens };
}

describe('BiomeTransition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fire on initial load (lastBiomeId is current highest)', () => {
    const { scene, texts } = makeMockScene();
    let state = baseState(reefThreshold + 100);
    const t = createBiomeTransition(scene as unknown as Phaser.Scene, () => state);
    t.update();
    t.update();
    expect(texts).toHaveLength(0);
  });

  it('fires once when lifetime crosses a threshold', () => {
    const { scene, texts } = makeMockScene();
    let state = baseState(reefThreshold - 100);
    const onUnlock = vi.fn();
    const t = createBiomeTransition(scene as unknown as Phaser.Scene, () => state, onUnlock);
    t.update();
    expect(texts).toHaveLength(0);
    state = baseState(reefThreshold + 1);
    t.update();
    expect(texts).toHaveLength(1);
    expect(texts[0]!.text).toContain('OPEN REEF UNLOCKED');
    expect(onUnlock).toHaveBeenCalledOnce();
    expect(onUnlock.mock.calls[0]![0]!.id).toBe('open-reef');
  });

  it('subsequent updates after a fire do not re-fire', () => {
    const { scene, texts } = makeMockScene();
    let state = baseState(reefThreshold - 100);
    const t = createBiomeTransition(scene as unknown as Phaser.Scene, () => state);
    t.update();
    state = baseState(reefThreshold + 1);
    t.update();
    t.update();
    t.update();
    expect(texts).toHaveLength(1);
  });
});
```

**Verify:** `npm install`, `npm test -- BiomeTransition` (3 cases), typecheck, build.

---

### Workstream 3: ShopPanel rewrite with biome tabs (M5.4)

**Worktree:** `../fishtank-ws3`
**Branch:** `feature/m5-shop-tabs` off `integrate/m5-biome-system`
**Commit:** `M5.4: ShopPanel biome tabs + filtering (closes #<m5.4>)`

**Note:** `src/util/biomeUnlock.ts` is already on the integration branch (committed during setup); WS3 just imports from it.

**Files to modify:**

1. **REWRITE** `src/ui/ShopPanel.ts` (full replacement):
```typescript
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

  // Background
  const bg = scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x0a1a3a, 0.92);
  bg.setStrokeStyle(2, 0xffffff, 0.4);
  bg.setInteractive();
  container.add(bg);

  // Title
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

  // Close X
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

  // Tabs + grids
  const tabsY = -PANEL_H / 2 + 50;
  const gridStartY = tabsY + TAB_H + 8;
  const cols = 2;
  const rowH = 70;
  const colW = (PANEL_W - 40) / cols;
  const tabSpacing = PANEL_W / BIOMES.length;
  const tabStart = -PANEL_W / 2 + tabSpacing / 2;

  let activeBiomeId = getHighestUnlockedBiome(getState().lifetimeEarned).id;

  const biomeUIs: BiomeUI[] = BIOMES.map((biome, biomeIdx) => {
    // Tab
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

    // Grid container
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
      // Reset affordability cache for the newly-active grid so colors apply this frame
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

  // Initial visibility / colors
  setActiveBiome(activeBiomeId);
  refreshActiveGridAffordability();

  return {
    toggle() {
      container.setVisible(!container.visible);
      if (container.visible) {
        // Re-evaluate in case thresholds crossed while closed
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
```

**Verify:** `npm install`, `npm run typecheck`, `npm run build`, `npm test` (no new tests; visual integration tested in WS4).

---

## Wave 2: Sequential (1 worktree)

### Workstream 4: GradientBackdrop + TankScene integration (M5.2 + M5.5)

**Worktree:** `../fishtank-ws4` (off `integrate/m5-biome-system` AFTER Wave 1 merges)
**Branch:** `feature/m5-integration` off `integrate/m5-biome-system`
**Commit:** `M5.2 + M5.5: GradientBackdrop + TankScene wire-up (closes #<m5.2>, closes #<m5.5>)`

**Files:**

1. **CREATE** `src/ui/GradientBackdrop.ts`:
```typescript
import type Phaser from 'phaser';
import type { Biome } from '../types/Biome.js';

export interface GradientBackdrop {
  transitionTo(biome: Biome): void;
  destroy(): void;
}

const BACKDROP_DEPTH = -100;
const TRANSITION_MS = 1500;

/**
 * Vertical gradient background. Uses Phaser.GameObjects.Graphics with a
 * 4-corner fillGradientStyle (top corners = gradientFrom, bottom corners = gradientTo).
 * transitionTo crossfades a new graphics over the old, then destroys the old.
 */
export function createGradientBackdrop(
  scene: Phaser.Scene,
  initialBiome: Biome,
): GradientBackdrop {
  let current = makeBackdrop(scene, initialBiome);

  function makeBackdrop(s: Phaser.Scene, biome: Biome): Phaser.GameObjects.Graphics {
    const top = parseInt(biome.gradientFrom.replace('#', ''), 16);
    const bot = parseInt(biome.gradientTo.replace('#', ''), 16);
    const g = s.add.graphics().setDepth(BACKDROP_DEPTH);
    g.fillGradientStyle(top, top, bot, bot, 1);
    g.fillRect(0, 0, s.scale.width, s.scale.height);
    return g;
  }

  return {
    transitionTo(biome) {
      const next = makeBackdrop(scene, biome);
      next.alpha = 0;
      const previous = current;
      scene.tweens.add({
        targets: next,
        alpha: 1,
        duration: TRANSITION_MS,
        ease: 'Linear',
        onComplete: () => {
          previous.destroy();
          current = next;
        },
      });
    },
    destroy() {
      current.destroy();
    },
  };
}
```

2. **REWRITE** `src/scenes/TankScene.ts`:
```typescript
import Phaser from 'phaser';
import { preloadFishSprites } from './SpriteLoader.js';
import { FISH_SPECIES } from '../data/fish.js';
import { FishAI } from '../sim/FishAI.js';
import { createCoinCounter, type CoinCounter } from '../ui/CoinCounter.js';
import { createCoinFloater, type CoinFloater } from '../ui/CoinFloater.js';
import { createShopPanel, type ShopPanel } from '../ui/ShopPanel.js';
import { createGradientBackdrop, type GradientBackdrop } from '../ui/GradientBackdrop.js';
import { createBiomeTransition, type BiomeTransition } from '../ui/BiomeTransition.js';
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

  constructor() {
    super('TankScene');
  }

  preload(): void {
    preloadFishSprites(this);
  }

  create(): void {
    const initialBiome = getHighestUnlockedBiome(getState().lifetimeEarned);
    this.backdrop = createGradientBackdrop(this, initialBiome);

    this.coinCounter = createCoinCounter(this, getState);
    this.coinFloater = createCoinFloater(this);
    this.shopPanel = createShopPanel(this, getState);

    this.biomeTransition = createBiomeTransition(this, getState, (biome) => {
      this.backdrop.transitionTo(biome);
    });

    // Shop button top-right
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

3. **UPDATE** `src/ui/README.md`:
```
UI components.

- `CoinCounter.ts` (M3.5): top-left HUD showing balance and earn rate.
- `CoinFloater.ts` (M4.4): per-fish floating "+1" animations on coin earn.
- `ShopPanel.ts` (M4.3, M5.4): modal shop with biome tabs.
- `GradientBackdrop.ts` (M5.2): per-biome gradient background with crossfade.
- `BiomeTransition.ts` (M5.3): detects threshold crossings and shows celebration text.

Pending (M6+):
- Decoration shop + drag/drop placement
- Settings panel
- Welcome-back toast
```

4. **UPDATE** `src/util/README.md`:
```
Shared utilities.

- `uuid.ts` (M2.3): crypto.randomUUID wrapper.
- `earnRate.ts` (M2.5): instanceEarnRate, computeTotalEarnRate (closed-form).
- `formatCoins.ts` (M3.4): K/M/B/T display formatter per ADR-0005.
- `fishCost.ts` (M4.1): cost per FishSpecies per ADR-0005.
- `biomeUnlock.ts` (M5.1): isBiomeUnlocked + getHighestUnlockedBiome.

Pending:
- `lerp`, `clamp`, etc. - math helpers, added as needed.
```

**Verify:** `npm install`, `npm run typecheck`, `npm run build`, `npm test` (full suite green; 70+ tests). `node scripts/verify-assets.mjs` OK.

Manual smoke (orchestrator):
- Page loads with Tide Pool gradient (light blue -> deeper blue)
- SHOP opens with 3 tabs: Tide Pool active/unlocked, Reef and Abyss greyed
- Clicking locked tabs does nothing
- To verify the unlock celebration and gradient crossfade INSIDE a session (not via reload):
  - Open the dev console
  - `localStorage.setItem('fishtank.save.v1', JSON.stringify({...JSON.parse(localStorage.getItem('fishtank.save.v1')), coinBalance: 100, lifetimeEarned: 15400}))` then reload
  - In console: hot-set `JSON.parse(localStorage.getItem('fishtank.save.v1'))` via running game's state mutation isn't trivial without exposing globals. Easiest path: edit src/data/biomes.ts temporarily to lower thresholds to e.g. 100 for Reef, run dev server, watch crossfade + celebration when sim ticks past 100 lifetime.
- Reload-style verification (no transition animation, just final state):
  - Hack `lifetimeEarned` in localStorage above each threshold (~16000 Reef, ~4.8M Abyss), reload, see new backdrop + unlocked shop tab. Celebration does NOT fire on reload (intentional).

---

## Integration

**Wave 1 -> Wave 2 gate:**
```bash
git -C /home/scott/fishtank log integrate/m5-biome-system --oneline -6
git -C /home/scott/fishtank ls-tree integrate/m5-biome-system src/util/biomeUnlock.ts src/ui/BiomeTransition.ts src/ui/ShopPanel.ts
# All must exist.
```

**After WS4 merges:**
1. Fresh worktree: `npm install`, `npm run typecheck`, `npm run build`, `npm test`, `node scripts/verify-assets.mjs`, `npm run dev` -> browser smoke.
2. Copy plan to `docs/plans/m5-biome-system.md` and commit.
3. Push integration branch, `gh pr create`, `gh pr merge --squash --delete-branch`.
4. Clean up worktrees + local + remote branches.
5. Deploy.

## Changes from adversarial review

- **Hidden-grid click-through fix (BLOCKING).** Phaser's `container.setVisible(false)` does NOT disable input on descendants - clicks where a hidden grid's BUY button "would be" would still purchase that biome's fish if affordable. Added a `if (biome.id !== activeBiomeId) return;` guard at the top of every BUY pointerdown handler.
- **biomeUnlock.ts merge protocol (SHOULD-FIX).** The M4 pattern of three branches independently creating the same file caused a merge conflict (auto-resolve failed). Instead: the orchestrator commits `src/util/biomeUnlock.ts` directly on the integration branch as part of setup, BEFORE spawning Wave 1. WS1 only adds the test file; WS2 and WS3 import from the pre-committed file. No duplicate file creation; clean parallel merge.
- **Manual smoke instructions (SHOULD-FIX).** Updated to clarify that reloading with a hacked `lifetimeEarned` shows the new biome's final state but never fires the celebration animation (BiomeTransition initializes `lastBiomeId` to current highest on construction). To see the crossfade and celebration, the threshold must be crossed mid-session - the test recipe documents how.

## Risks / Notes

- **Three WS1/WS2/WS3 branches all include `src/util/biomeUnlock.ts`** with identical content. The merge will either auto-resolve (same content = no conflict) or require manual resolution to the WS1 version (consistent with the M4 fishCost.ts pattern).
- **Backdrop alpha crossfade leaves both layers visible during transition** - for ~1.5s the new and old gradients are both drawn. Performance: 2 fullscreen Graphics is negligible on the 800x600 canvas.
- **BiomeTransition uses scene.tweens for the celebration** - delay-then-fadeout chain, totalling ~3s on screen.
- **ShopPanel biome tabs always render all three** (even locked). Locked are greyed and non-interactive. M7 polish could hide them entirely.
- **No save schema change.** All biome state derived from lifetimeEarned.
- **No e2e DOM tests for GradientBackdrop or TankScene.** Manual via dev server.
- **The celebration text size (40px) is intentionally large**; consider toning down in M7 polish if it feels noisy.
