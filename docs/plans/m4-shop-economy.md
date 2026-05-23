# M4 Shop and Economy - Fishtank Implementation Plan

## Context

M3 left the game with a goldfish swimming and a coin counter ticking up. M4 closes the core loop: a shop where the player spends coins to buy more fish, plus visual feedback (floating "+N" per-fish coin animations) so earning feels alive.

After M4, the user can:
- Click a "Shop" button to open a panel
- See all Tide Pool species with their costs
- Click "Buy" on affordable species to spawn a new fish in the tank
- Watch "+1" floaters drift up from each fish as it earns coins

M5 will gate non-Tide-Pool biomes behind unlock thresholds; M4 just shows Tide Pool (other biomes hidden until M5).

**Closes: TBD (M4.1-M4.5 issues filed in setup step).**

## Repo state (post-M3)

- On main at `7c587dd` (M3 merged + deployed at mccarrison.me/fish)
- `src/scenes/TankScene.ts` renders fish from save state, drives FishAI, hosts CoinCounter HUD
- `src/state.ts` singleton provides `getState`/`setState`
- `src/util/earnRate.ts` has `instanceEarnRate(fish)` (single fish coins/sec) and `computeTotalEarnRate(fishes)` (sum)
- `src/util/formatCoins.ts` for K/M/B/T display
- `src/util/uuid.ts` for new FishInstance ids
- `src/data/biomes.ts` exports `BIOMES` with `fishSpeciesIds` per biome
- `src/data/fish.ts` exports `FISH_SPECIES` with `costIndex` per species
- `src/data/constants.ts` has `FIRST_FISH_COST`, `COST_RATIO_IN_BIOME`, `BIOME_COST_STEP`
- 40 vitest cases passing; jsdom env configured
- **M4 milestone exists but has zero issues filed**

## Strategy

**Setup (orchestrator, before Wave 1):**
1. File 5 GitHub issues for M4.1-M4.5 under "M4: Shop and Economy" milestone. Capture numbers.
2. Branch `integrate/m4-shop-economy` off main.

**Wave 1 (3 parallel agents):** Pure logic with unit tests.
- WS1: `fishCost` helper (M4.1)
- WS2: `purchaseFish` action (M4.2)
- WS3: `CoinFloater` UI module (M4.4)

**Wave 2 (1 sequential agent):** UI integration.
- WS4: `ShopPanel` + `ShopButton` + TankScene wire-up (M4.3 + M4.5)

**Final PR:** `integrate/m4-shop-economy` -> `main`, title `M4: Shop and Economy (closes #<...>)`, squash-merge, deploy.

---

## Setup: File M4 issues

Run with the orchestrator's `gh` auth. Use exact form for each issue and capture numbers:

```bash
gh issue create --repo scottmccarrison/fishtank \
  --milestone "M4: Shop and Economy" \
  --label "<labels>" \
  --title "<title>" \
  --body "<body>"
```

**Issue M4.1: fishCost helper** (labels: `area:sim`, `type:infra`)
```
## Context
Computing the cost of a fish given its species. Used by shop UI to display prices and by purchase flow to validate balance. ADR-0005 locks the formula: in-biome 1.4x ratio, 15x biome step.

## Acceptance criteria
- [ ] src/util/fishCost.ts exports fishCost(species: FishSpecies): number
- [ ] Formula: FIRST_FISH_COST * BIOME_COST_STEP^biomeIndex * COST_RATIO_IN_BIOME^(priorBiomesRatios + species.costIndex)
  where priorBiomesRatios = sum of (BIOMES[i].fishSpeciesIds.length - 1) for i < biomeIndex
- [ ] Returns Infinity for unknown biome (defensive)
- [ ] Unit tests cover Tide Pool first/last, Reef first/last, Abyss first/last anchor values from ADR-0005.

## Dependencies
- M1.5 (BIOMES, FISH_SPECIES)
- M1.4 (CONSTANTS)
```

**Issue M4.2: purchaseFish action** (labels: `area:sim`)
```
## Context
Wire the buy button: validate balance, deduct cost, append a new FishInstance to the save state, return result for UI feedback.

## Acceptance criteria
- [ ] src/sim/PurchaseFish.ts exports purchaseFish(speciesId: string): PurchaseResult
- [ ] PurchaseResult = { success: true, newFish: FishInstance } | { success: false, reason: 'insufficient_funds' | 'unknown_species' }
- [ ] On success: state.coinBalance -= cost; state.fishInstances.push(newFish) (mutates in place, consistent with CoinEarn/FishAI)
- [ ] New fish spawn position: random within tank margins (matches InitialState pattern)
- [ ] Unit tests cover happy path, insufficient funds, unknown species, that state mutates correctly.

## Dependencies
- M4.1 (fishCost)
- M2.3 (state singleton)
```

**Issue M4.3: ShopPanel UI** (labels: `area:ui`)
```
## Context
Modal-ish overlay listing buyable fish. M4 shows only Tide Pool; M5 will add biome tabs.

## Acceptance criteria
- [ ] src/ui/ShopPanel.ts exports createShopPanel(scene, getState) returning { toggle(), update(), destroy() }
- [ ] Phaser Container with: dark semi-transparent background overlay, "Shop" title, close button (X), grid of fish rows
- [ ] Grid: 2 columns x 5 rows for the 10 Tide Pool species
- [ ] Each row: sprite icon (using existing preloaded texture), species name, cost (formatCoins), Buy button
- [ ] Affordable: Buy is white text on green background, interactive
- [ ] Unaffordable: Buy text is grey, not interactive (visually disabled)
- [ ] Buy click: calls purchaseFish(speciesId); on success refresh the panel (cost stays same, balance updates HUD; no immediate visual change needed in panel beyond enabling/disabling other rows)
- [ ] Initial visibility: hidden. toggle() flips visible.
- [ ] update() called every frame (or every shop-render-tick) to keep affordability state current

## Dependencies
- M4.1 (fishCost), M4.2 (purchaseFish), M3.1 (sprite textures preloaded)
```

**Issue M4.4: Per-fish CoinFloater animation** (labels: `area:ui`)
```
## Context
ROADMAP says "Coin display animation on earn (floating '+N' or similar)". Implement as per-fish "+1" texts that float up and fade when each fish accumulates a whole coin.

## Acceptance criteria
- [ ] src/ui/CoinFloater.ts exports createCoinFloater(scene): { update(instances: FishInstance[], delta: number) }
- [ ] Per-fish accumulator tracks earned coins since last floater spawn (Map<instanceId, number>)
- [ ] Accumulator += instanceEarnRate(fish) * (delta / 1000) each frame
- [ ] When accumulator >= 1: spawn floater at fish position, set accumulator = accumulator % 1
- [ ] Floater: small Phaser Text "+1" (or "+N" for accumulated multi), white with black stroke, tweens y -= 30 and alpha -> 0 over 1200ms, then destroys
- [ ] Floater depth = lower than HUD (e.g., 50) so HUD overlays them

## Dependencies
- M2.5 (instanceEarnRate)
```

**Issue M4.5: ShopButton + TankScene integration** (labels: `area:ui`)
```
## Context
Wire the shop into the scene: a "SHOP" text button top-right, a CoinFloater that ticks every frame, instantiation of the shop panel.

## Acceptance criteria
- [ ] TankScene.create() instantiates the ShopPanel and CoinFloater
- [ ] A "SHOP" text button at top-right (~tankWidth-80, 12), interactive, toggles the panel on pointerdown
- [ ] TankScene.update() calls coinFloater.update(fishes, delta) and shopPanel.update()
- [ ] When the panel is open, fish still earn coins (sim never pauses based on shop visibility)
- [ ] Pressing the close (X) button in the panel hides it (panel itself owns that wiring)
- [ ] No regression: existing CoinCounter HUD still updates, fish still swim, save/load/catchup still work

## Dependencies
- M4.3, M4.4
```

After all five filed, store the numbers (likely #30-#34) for PR body.

---

## Wave 1: Parallel (3 worktrees)

### Workstream 1: fishCost (M4.1)

**Worktree:** `../fishtank-ws1`
**Branch:** `feature/m4-fishcost` off `integrate/m4-shop-economy`
**Commit:** `M4.1: fishCost helper (closes #<m4.1>)`

**Files:**

1. `src/util/fishCost.ts`:
```typescript
import type { FishSpecies } from '../types/Fish.js';
import { BIOMES } from '../data/biomes.js';
import { CONSTANTS } from '../data/constants.js';

/**
 * Cost of a fish species in coins, per ADR-0005.
 *
 * Formula: FIRST_FISH_COST * BIOME_COST_STEP^biomeIndex * COST_RATIO_IN_BIOME^(priorRatios + costIndex)
 *
 * where priorRatios = sum of (biome[i].count - 1) for i < biomeIndex. This accounts
 * for the fact that the biome step REPLACES the last in-biome ratio with 15x.
 *
 * Verified against ADR-0005 anchor values:
 *  - goldfish: 50 (tide pool, costIndex 0)
 *  - king-crab: ~1033 (tide pool, costIndex 9)
 *  - purple-tang: ~15495 (open-reef, costIndex 0)
 *  - stingray: ~320K (open-reef, costIndex 9)
 *  - anglerfish: ~4.8M (abyss, costIndex 0)
 *  - crab-dungeness: ~50M (abyss, costIndex 7)
 *
 * Returns Infinity for an unknown biomeId (defensive against save corruption / migrations).
 */
export function fishCost(species: FishSpecies): number {
  const biomeIndex = BIOMES.findIndex((b) => b.id === species.biomeId);
  if (biomeIndex < 0) return Infinity;

  let priorRatios = 0;
  for (let i = 0; i < biomeIndex; i++) {
    priorRatios += BIOMES[i]!.fishSpeciesIds.length - 1;
  }

  return (
    CONSTANTS.FIRST_FISH_COST *
    Math.pow(CONSTANTS.BIOME_COST_STEP, biomeIndex) *
    Math.pow(CONSTANTS.COST_RATIO_IN_BIOME, priorRatios + species.costIndex)
  );
}
```

2. `src/util/fishCost.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { fishCost } from './fishCost.js';
import { FISH_SPECIES } from '../data/fish.js';

const species = (id: string) => FISH_SPECIES.find((s) => s.id === id)!;

describe('fishCost', () => {
  it('first tide pool fish is FIRST_FISH_COST exactly', () => {
    expect(fishCost(species('goldfish'))).toBeCloseTo(50, 3);
  });

  it('last tide pool fish matches ADR anchor (~1033)', () => {
    const cost = fishCost(species('crab-king'));
    expect(cost).toBeGreaterThan(1000);
    expect(cost).toBeLessThan(1100);
  });

  it('first open reef fish matches ADR anchor (~15500)', () => {
    const cost = fishCost(species('purple-tang'));
    expect(cost).toBeGreaterThan(15_000);
    expect(cost).toBeLessThan(16_000);
  });

  it('last open reef fish matches ADR anchor (~320K)', () => {
    const cost = fishCost(species('stingray'));
    expect(cost).toBeGreaterThan(300_000);
    expect(cost).toBeLessThan(340_000);
  });

  it('first abyss fish matches ADR anchor (~4.8M)', () => {
    const cost = fishCost(species('anglerfish'));
    expect(cost).toBeGreaterThan(4_500_000);
    expect(cost).toBeLessThan(5_100_000);
  });

  it('last abyss fish matches the v1 50M goal', () => {
    const cost = fishCost(species('crab-dungeness'));
    expect(cost).toBeGreaterThan(40_000_000);
    expect(cost).toBeLessThan(60_000_000);
  });

  it('returns Infinity for unknown biome', () => {
    const fake = { ...species('goldfish'), biomeId: 'mystery' };
    expect(fishCost(fake)).toBe(Infinity);
  });

  it('cost monotonically increases with costIndex within a biome', () => {
    const tidePool = FISH_SPECIES.filter((s) => s.biomeId === 'tide-pool');
    for (let i = 1; i < tidePool.length; i++) {
      expect(fishCost(tidePool[i]!)).toBeGreaterThan(fishCost(tidePool[i - 1]!));
    }
  });
});
```

**Verify:**
- `npm install`
- `npm test -- fishCost` passes (8 cases)
- `npm run typecheck` passes
- `npm run build` succeeds

---

### Workstream 2: purchaseFish (M4.2)

**Worktree:** `../fishtank-ws2`
**Branch:** `feature/m4-purchase` off `integrate/m4-shop-economy`
**Commit:** `M4.2: purchaseFish action (closes #<m4.2>)`

**Files:**

1. `src/sim/PurchaseFish.ts`:
```typescript
import type { FishInstance, FishSpecies } from '../types/Fish.js';
import { FISH_SPECIES } from '../data/fish.js';
import { fishCost } from '../util/fishCost.js';
import { uuid } from '../util/uuid.js';
import { getState } from '../state.js';

const SPECIES_BY_ID = new Map<string, FishSpecies>(FISH_SPECIES.map((s) => [s.id, s]));

export type PurchaseResult =
  | { success: true; newFish: FishInstance; cost: number }
  | { success: false; reason: 'unknown_species' | 'insufficient_funds' };

/**
 * Purchase a fish: validate balance, deduct cost, append to fishInstances.
 * Mutates the state object in place (consistent with CoinEarn and FishAI).
 *
 * New fish spawn at a random position within the standard tank area, matching
 * the InitialState convention (margin 100, range 600x400).
 */
export function purchaseFish(speciesId: string): PurchaseResult {
  const species = SPECIES_BY_ID.get(speciesId);
  if (!species) return { success: false, reason: 'unknown_species' };

  const cost = fishCost(species);
  const state = getState();
  if (state.coinBalance < cost) {
    return { success: false, reason: 'insufficient_funds' };
  }

  state.coinBalance -= cost;

  const newFish: FishInstance = {
    id: uuid(),
    speciesId: species.id,
    x: 100 + Math.floor(Math.random() * 600),
    y: 100 + Math.floor(Math.random() * 400),
    direction: Math.random() > 0.5 ? 1 : -1,
    ownedAt: new Date().toISOString(),
  };
  state.fishInstances.push(newFish);

  return { success: true, newFish, cost };
}
```

2. `src/sim/PurchaseFish.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { purchaseFish } from './PurchaseFish.js';
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

describe('purchaseFish', () => {
  beforeEach(() => {
    setState(baseState());
  });

  it('succeeds when balance is sufficient (goldfish costs 50)', () => {
    const result = purchaseFish('goldfish');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.cost).toBe(50);
    expect(result.newFish.speciesId).toBe('goldfish');
    expect(result.newFish.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('deducts cost from balance and appends to fishInstances', () => {
    const before = getState().coinBalance;
    const result = purchaseFish('goldfish');
    expect(result.success).toBe(true);
    expect(getState().coinBalance).toBeCloseTo(before - 50, 3);
    expect(getState().fishInstances).toHaveLength(1);
    expect(getState().fishInstances[0]!.speciesId).toBe('goldfish');
  });

  it('fails on insufficient funds', () => {
    setState(baseState({ coinBalance: 10 }));
    const result = purchaseFish('goldfish');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('insufficient_funds');
  });

  it('fails on unknown species', () => {
    const result = purchaseFish('mystery-fish');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('unknown_species');
  });

  it('spawn position is within tank bounds', () => {
    const result = purchaseFish('goldfish');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.newFish.x).toBeGreaterThanOrEqual(100);
    expect(result.newFish.x).toBeLessThanOrEqual(700);
    expect(result.newFish.y).toBeGreaterThanOrEqual(100);
    expect(result.newFish.y).toBeLessThanOrEqual(500);
  });

  it('does not mutate balance or fish list on failure', () => {
    setState(baseState({ coinBalance: 10 }));
    const result = purchaseFish('goldfish');
    expect(result.success).toBe(false);
    expect(getState().coinBalance).toBe(10);
    expect(getState().fishInstances).toHaveLength(0);
  });
});
```

**Verify:**
- `npm install`
- `npm test -- PurchaseFish` passes (6 cases)
- `npm run typecheck` passes
- `npm run build` succeeds

---

### Workstream 3: CoinFloater (M4.4)

**Worktree:** `../fishtank-ws3`
**Branch:** `feature/m4-floater` off `integrate/m4-shop-economy`
**Commit:** `M4.4: CoinFloater animation (closes #<m4.4>)`

**Files:**

1. `src/ui/CoinFloater.ts`:
```typescript
import type Phaser from 'phaser';
import type { FishInstance } from '../types/Fish.js';
import { instanceEarnRate } from '../util/earnRate.js';

export interface CoinFloater {
  update(instances: FishInstance[], delta: number): void;
}

const FLOATER_LIFETIME_MS = 1200;
const FLOATER_RISE_PX = 30;
const FLOATER_DEPTH = 50; // below the HUD (depth 100), above fish sprites

/**
 * Per-fish floating "+N" coin animations. Each fish has its own accumulator
 * that increments by its earn rate every frame. When the accumulator crosses
 * 1, a "+N" text spawns at the fish's position and tweens upward / fades.
 *
 * Accumulator is in-memory only; reset on reload (no save impact).
 */
export function createCoinFloater(scene: Phaser.Scene): CoinFloater {
  const accumulators = new Map<string, number>();

  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: '14px',
    color: '#fff8b0',
    fontFamily: 'monospace',
    stroke: '#000000',
    strokeThickness: 2,
  };

  function spawn(x: number, y: number, n: number): void {
    const text = scene.add
      .text(x, y - 16, `+${n}`, style)
      .setOrigin(0.5, 1) // center horizontally, anchor at bottom so "+1" sits above the fish
      .setDepth(FLOATER_DEPTH);
    scene.tweens.add({
      targets: text,
      y: text.y - FLOATER_RISE_PX,
      alpha: 0,
      duration: FLOATER_LIFETIME_MS,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  return {
    update(instances, delta) {
      const dtSec = delta / 1000;
      // Sweep dead accumulators (fish no longer in instances) so the Map doesn't grow forever.
      const liveIds = new Set(instances.map((f) => f.id));
      for (const id of accumulators.keys()) {
        if (!liveIds.has(id)) accumulators.delete(id);
      }

      for (const fish of instances) {
        const rate = instanceEarnRate(fish);
        if (rate <= 0) continue;
        const acc = (accumulators.get(fish.id) ?? 0) + rate * dtSec;
        if (acc >= 1) {
          const whole = Math.floor(acc);
          spawn(fish.x, fish.y, whole);
          accumulators.set(fish.id, acc - whole);
        } else {
          accumulators.set(fish.id, acc);
        }
      }
    },
  };
}
```

2. `src/ui/CoinFloater.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type Phaser from 'phaser';
import { createCoinFloater } from './CoinFloater.js';
import type { FishInstance } from '../types/Fish.js';

const makeFish = (id: string, speciesId = 'goldfish'): FishInstance => ({
  id,
  speciesId,
  x: 100,
  y: 100,
  direction: 1,
  ownedAt: '2026-05-22T12:00:00.000Z',
});

/**
 * Minimal mock scene exposing what CoinFloater touches: add.text and tweens.add.
 * We track spawned texts and tween calls.
 */
function makeMockScene() {
  const spawned: Array<{ x: number; y: number; text: string }> = [];
  const tweenCalls: Array<{ targets: unknown; y?: number; alpha?: number; duration?: number }> = [];
  const sceneShim = {
    add: {
      text: (x: number, y: number, t: string) => {
        spawned.push({ x, y, text: t });
        // Stub supporting the chain methods CoinFloater uses
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {
          x,
          y,
          alpha: 1,
          setOrigin: () => obj,
          setDepth: () => obj,
          destroy: () => {},
        };
        return obj;
      },
    },
    tweens: {
      add: (cfg: { targets: unknown; y?: number; alpha?: number; duration?: number; onComplete?: () => void }) => {
        tweenCalls.push({ targets: cfg.targets, y: cfg.y, alpha: cfg.alpha, duration: cfg.duration });
        // Don't auto-run onComplete - lifetime is timer-driven in production
        return {};
      },
    },
  };
  return { scene: sceneShim, spawned, tweenCalls };
}

describe('CoinFloater', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('spawns a floater when a fish accumulates one whole coin', () => {
    const { scene, spawned } = makeMockScene();
    // Cast: our shim is structurally compatible with the subset CoinFloater uses
    const floater = createCoinFloater(scene as unknown as Phaser.Scene);
    const fish = makeFish('a');
    // Goldfish rate ~= 0.556 c/s; advance 2s -> 1.11 accumulated -> one floater of "+1"
    floater.update([fish], 2000);
    expect(spawned).toHaveLength(1);
    expect(spawned[0]!.text).toBe('+1');
  });

  it('does not spawn until accumulator reaches 1', () => {
    const { scene, spawned } = makeMockScene();
    const floater = createCoinFloater(scene as unknown as Phaser.Scene);
    const fish = makeFish('a');
    floater.update([fish], 500); // ~0.28 accumulated
    expect(spawned).toHaveLength(0);
  });

  it('clears accumulator state when fish disappears from instances', () => {
    const { scene, spawned } = makeMockScene();
    const floater = createCoinFloater(scene as unknown as Phaser.Scene);
    const fish = makeFish('a');
    floater.update([fish], 500); // accumulator at ~0.28
    floater.update([], 500); // fish removed, accumulator cleared
    floater.update([fish], 2000); // returning, accumulator restarts at 0 -> 1.11 -> "+1"
    expect(spawned).toHaveLength(1);
    expect(spawned[0]!.text).toBe('+1');
  });

  it('handles unknown speciesId gracefully (no spawn)', () => {
    const { scene, spawned } = makeMockScene();
    const floater = createCoinFloater(scene as unknown as Phaser.Scene);
    const fish = makeFish('a', 'mystery-fish');
    floater.update([fish], 5000);
    expect(spawned).toHaveLength(0);
  });
});
```

**Verify:**
- `npm install`
- `npm test -- CoinFloater` passes (4 cases)
- `npm run typecheck` passes
- `npm run build` succeeds

---

## Wave 2: Sequential (1 worktree)

### Workstream 4: ShopPanel + Shop button + integration (M4.3 + M4.5)

**Worktree:** `../fishtank-ws4` (off `integrate/m4-shop-economy` AFTER Wave 1 merges)
**Branch:** `feature/m4-integration` off `integrate/m4-shop-economy`
**Commit:** `M4.3 + M4.5: ShopPanel + Shop button + TankScene wire-up (closes #<m4.3>, closes #<m4.5>)`

**Files to create / modify:**

1. **CREATE** `src/ui/ShopPanel.ts`:
```typescript
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
const PANEL_DEPTH = 200; // above HUD (100) and floaters (50)

interface Row {
  buyText: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  species: (typeof FISH_SPECIES)[number];
}

/**
 * Shop overlay. Lists Tide Pool species in a 2-column grid (M4 scope; M5 adds
 * other biomes behind unlock thresholds).
 *
 * - toggle(): flips visibility
 * - update(): called every frame; recolors Buy buttons by current affordability
 */
export function createShopPanel(
  scene: Phaser.Scene,
  getState: () => SaveStateV1,
): ShopPanel {
  const cx = scene.scale.width / 2;
  const cy = scene.scale.height / 2;

  const container = scene.add.container(cx, cy).setDepth(PANEL_DEPTH).setVisible(false);

  // Background (interactive to swallow clicks so they don't pass through to the tank)
  const bg = scene.add.rectangle(0, 0, PANEL_W, PANEL_H, 0x0a1a3a, 0.92);
  bg.setStrokeStyle(2, 0xffffff, 0.4);
  bg.setInteractive(); // absorb clicks; no handler needed
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

    // Sprite icon (uses preloaded texture)
    const icon = scene.add.image(x - colW / 2 + 24, y, species.id);
    icon.setScale(species.scale * 1.5);
    container.add(icon);

    // Name
    const name = scene.add.text(x - colW / 2 + 50, y - 16, species.name, {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });
    container.add(name);

    // Cost
    const cost = fishCost(species);
    const costText = scene.add.text(x - colW / 2 + 50, y + 2, `${formatCoins(cost)} c`, {
      fontSize: '12px',
      color: '#ffe066',
      fontFamily: 'monospace',
    });
    container.add(costText);

    // Buy button
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

  // Cache per-row affordability so we don't call setBackgroundColor (which re-bakes the
  // text texture in Phaser 3.x) every frame - only when affordability actually flips.
  const lastAffordable = new Map<string, boolean | null>();
  for (const row of rows) lastAffordable.set(row.species.id, null);

  function refreshAffordability(): void {
    const balance = getState().coinBalance;
    for (const row of rows) {
      const cost = fishCost(row.species);
      const canAfford = balance >= cost;
      if (lastAffordable.get(row.species.id) === canAfford) continue; // no change
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
  refreshAffordability(); // initial state

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
```

2. **REWRITE** `src/scenes/TankScene.ts` (extend existing - replace full file):
```typescript
import Phaser from 'phaser';
import { preloadFishSprites } from './SpriteLoader.js';
import { FISH_SPECIES } from '../data/fish.js';
import { FishAI } from '../sim/FishAI.js';
import { createCoinCounter, type CoinCounter } from '../ui/CoinCounter.js';
import { createCoinFloater, type CoinFloater } from '../ui/CoinFloater.js';
import { createShopPanel, type ShopPanel } from '../ui/ShopPanel.js';
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

  constructor() {
    super('TankScene');
  }

  preload(): void {
    preloadFishSprites(this);
  }

  create(): void {
    this.coinCounter = createCoinCounter(this, getState);
    this.coinFloater = createCoinFloater(this);
    this.shopPanel = createShopPanel(this, getState);

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

3. **UPDATE** `src/ui/README.md` to add new components:
```
UI components.

- `CoinCounter.ts` (M3.5): top-left HUD showing balance and earn rate.
- `CoinFloater.ts` (M4.4): per-fish floating "+1" animations on coin earn.
- `ShopPanel.ts` (M4.3): modal shop overlay listing buyable fish.

Pending (M5+):
- Biome tabs in shop
- Purchase confirmation
- Settings panel
- Welcome-back toast
```

4. **UPDATE** `src/sim/README.md` to add purchaseFish:
```
Simulation tick loop, AI, and offline catchup.

- `SimLoop` (M2.1): 5Hz tick, handler registry, start/stop. Per ADR-0003.
- `OfflineCatchup` (M2.5): timestamp-based catchup math, capped at 24h.
- `VisibilityHandler` (M2.6): pauses sim on tab hide, resumes + applies catchup on show.
- `FishAI` (M3.3): per-fish swim AI (idle drift + occasional darting).
- `CoinEarn` (M3.4): tick handler that adds totalEarnRate * dt to coinBalance.
- `PurchaseFish` (M4.2): validates balance, deducts cost, appends FishInstance.
```

5. **UPDATE** `src/util/README.md` to add fishCost:
```
Shared utilities.

- `uuid.ts` (M2.3): crypto.randomUUID wrapper.
- `earnRate.ts` (M2.5): instanceEarnRate, computeTotalEarnRate (closed-form).
- `formatCoins.ts` (M3.4): K/M/B/T display formatter per ADR-0005.
- `fishCost.ts` (M4.1): cost per FishSpecies per ADR-0005.

Pending:
- `lerp`, `clamp`, etc. - math helpers, added as needed.
```

**Verify:**
- `npm install`
- `npm run typecheck` passes
- `npm run build` succeeds
- `npm test` passes (full suite: SimLoop, Serializer, OfflineCatchup, Autosave, FishAI, formatCoins, CoinEarn, fishCost, PurchaseFish, CoinFloater - 58+ tests)
- Manual browser smoke (orchestrator runs this):
  - Page loads, goldfish swims, HUD shows balance
  - "SHOP" button top-right is clickable
  - Click SHOP -> panel opens with 10 Tide Pool species, sprite icons visible
  - Goldfish row shows "BUY" enabled (green), other rows initially disabled
  - Click "BUY" on goldfish -> balance drops by 50, new goldfish appears in tank
  - Click X to close panel
  - "+1" floaters drift from each fish every ~2s
- `node scripts/verify-assets.mjs` reports OK

---

## Integration

**Wave 1 -> Wave 2 gate:**
```bash
git -C /home/scott/fishtank log integrate/m4-shop-economy --oneline -5
# Expect: M4.1, M4.2, M4.4 commits + base from main
git -C /home/scott/fishtank ls-tree integrate/m4-shop-economy src/util/fishCost.ts src/sim/PurchaseFish.ts src/ui/CoinFloater.ts
# All three files must exist.
```

**After WS4 merges:**
1. Fresh worktree off `integrate/m4-shop-economy`:
   - `npm install`, `npm run typecheck`, `npm run build`, `npm test`, `node scripts/verify-assets.mjs`
   - `npm run dev` -> browser smoke (steps above)
2. Copy plan to `docs/plans/m4-shop-economy.md` and commit
3. Push integration branch
4. `gh pr create` with body listing each Closes line
5. `gh pr merge --squash --delete-branch`
6. Clean up worktrees + branches
7. Deploy via nvm-use-22 + `npm run deploy`

## Verification (post-merge)

```bash
cd /home/scott/fishtank
git checkout main && git pull --ff-only
npm install && npm test && npm run build
gh issue list --milestone "M4: Shop and Economy" --state open   # empty
```

Live: https://mccarrison.me/fish/ - confirm shop opens, purchase works, floaters appear.

## Changes from adversarial review

- **CoinFloater.test.ts** now imports `Phaser` type at the top (needed by the `as unknown as Phaser.Scene` cast).
- **CoinFloater spawn** now calls `setOrigin(0.5, 1)` so "+1" text sits centered above the fish instead of below-right.
- **CoinFloater mock scene** stub now supports `setOrigin` in the chain.
- **CoinFloater "fish disappears" test** tightened to assert exactly 1 floater (not 1-2) since the cleared accumulator means no carry-over.
- **purchaseFish "deducts cost" test** rewritten to import `getState` and actually assert `getState().coinBalance === before - 50` and the fish list grew. Previous version just asserted `1000 - 50 === 950` (constant identity, no real check).
- **purchaseFish "does not mutate on failure" test** rewritten to read `getState().coinBalance === 10` and `fishInstances.length === 0` directly, instead of calling purchase a second time.
- **ShopPanel background** now `.setInteractive()` so clicks on the dim overlay don't pass through to the tank or HUD beneath.
- **ShopPanel refreshAffordability** now caches per-row state and only calls `setColor`/`setBackgroundColor` when affordability flips. Phaser 3's Text re-bakes its canvas texture on each `setBackgroundColor` call - calling it 60Hz x 10 rows was a real performance hit.

## Risks / Notes

- **Shop only shows Tide Pool.** M5 adds biome tabs and unlock gates. For M4, the unaffordable rows (when balance is low) are visually disabled but always present.
- **Cost formula assumes constant biome counts** in the BIOMES array. fishCost computes the prefix sum at call time, so adding species to existing biomes (or new biomes) doesn't break.
- **No quantity controls.** Each Buy click purchases exactly one fish. M7 polish can add x10 or hold-to-repeat.
- **Floaters can stack visually.** With 20 fish, you'll see ~10 floaters/sec - busy but matches the AbyssRium aesthetic. M7 polish may cap concurrent floaters.
- **CoinFloater test uses a mock scene** because Phaser doesn't run cleanly under jsdom. The mock covers add.text and tweens.add - the surface area CoinFloater touches.
- **PurchaseFish mutates state in place** (consistent with CoinEarn/FishAI). The state singleton's reference identity is preserved so autosave sees the updated balance and fish list.
- **No purchase animation on the panel.** The fish appears in the tank; balance drops via HUD. M7 polish can add a "-50" floater near the Buy button.
