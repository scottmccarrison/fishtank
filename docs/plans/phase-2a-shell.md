# Phase 2.A: New Shell - Implementation Plan

## Context

First epic of Phase 2 per [phase-2-overview.md](phase-2-overview.md). Converts v1's single-tank, per-instance-fish architecture into the Idle Acorns-style **diorama + ledger** shell:

- **Top region (diorama):** a swim sim de-densified to one display sprite per owned species, bounded to the top region of a **portrait** canvas (the canvas flips from landscape 800x600 to portrait 450x800), switchable per biome.
- **Bottom region (ledger):** an always-visible panel with biome tabs and a species collection (icon, owned count, cost, BUY) - replaces the modal shop.
- **State:** fish collapse from `fishInstances[]` (per-instance x/y/direction) to per-biome **counts**. Earn rate becomes `sum(count * speciesRate)`.

Epic A ships with *basic* fish motion (drift + wobble, reusing `FishAI`). Rich behaviors (schooling, hiding, chasing) are Epic B. Pearls, tank-size caps, and pearl-gated biome unlocks are Epic C.

## Hard constraints (from recon)

- Canvas: v1 is landscape `800x600`. **Epic A flips to portrait** (`450x800`, 9:16) so the top/bottom split has vertical room and matches mobile/PWA (AbyssRium and Idle Acorns are both portrait). Keeps `Phaser.Scale.FIT` + `autoCenter: CENTER_BOTH`; `orientationLock.ts` inverts to lock **portrait**. All layout is in-canvas. The `450x800` figure is a default - tunable in review.
- UI factory pattern: `createX(scene: Phaser.Scene, getState, ...deps)` returning an object with `update()` / `destroy()` etc. State only via injected `getState`.
- Depth layers in use: backdrop -100, floor -90, fish/deco 0, floater 50, HUD 100, toast/transition 150, modal 200, welcome 400.
- Sim is decoupled from render: `SimLoop` (5Hz) runs before Phaser boots; tick handlers mutate the in-memory state in place.
- Tests: vitest + jsdom, no globals (explicit imports), pattern `src/**/*.test.ts`.

## Layout contract (both diorama and ledger build against these)

Add to `src/data/constants.ts`:
```typescript
// --- Layout (Phase 2.A) - PORTRAIT ---
/** Full canvas (portrait 9:16). */
CANVAS_WIDTH: 450,
CANVAS_HEIGHT: 800,
/** Diorama occupies the top ~60%; fish motion is bounded here. */
DIORAMA_HEIGHT: 480,
/** Ledger occupies the bottom ~40%. */
LEDGER_Y: 480,
LEDGER_HEIGHT: 320,
/** Fish/decoration sprite scale (promoted from TankScene, which WS4 deletes; WS2/WS3 read it). */
RENDER_SCALE_MULTIPLIER: 3,
```
Diorama region = `y in [0, 480]` (450 wide). Ledger region = `y in [480, 800]` (450 wide, 320 tall).

## Module interfaces (the contract WS2 and WS3 code against)

```typescript
// WS2 - src/scenes/Diorama.ts
export interface Diorama {
  /** Show this biome's scene (backdrop gradient, floor, fish, decorations); hide others. */
  showBiome(biomeId: string): void;
  /** Per-frame: sync display fish to counts (add a sprite for any species with count>0 that lacks one), advance motion. */
  update(dt: number): void;
  /** Render-only display fish for the active biome (fed to CoinFloater). */
  getDisplayFish(): DisplayFish[];
  destroy(): void;
}
export function createDiorama(scene: Phaser.Scene, getState: () => SaveStateV2, initialBiomeId: string): Diorama;

// WS3 - src/ui/Ledger.ts
export interface Ledger {
  /** Re-render tabs + species grid for this biome. */
  showBiome(biomeId: string): void;
  /** Per-frame: refresh counts + affordability colors + tab lock states. */
  update(): void;
  destroy(): void;
}
export function createLedger(
  scene: Phaser.Scene,
  getState: () => SaveStateV2,
  onSelectBiome: (biomeId: string) => void,
  initialBiomeId: string,
): Ledger;
```

**Initial biome (review fix #4):** both factories take `initialBiomeId` and render it immediately at construction - they do NOT wait for the first `showBiome` call, so there is never an "unset active biome" gap. TankScene (WS4) owns `currentBiomeId = getHighestUnlockedBiome(getState().lifetimeEarned).id`, passes it to both factories, and wires `onSelectBiome` to update `currentBiomeId` then call `diorama.showBiome(id)` + `ledger.showBiome(id)` for *subsequent* switches. Buying happens inside the ledger (calls `purchaseFish`); the diorama self-syncs new species on its next `update(dt)` - no explicit notify.

## Strategy

Three waves. Integration branch `integrate/phase-2a-shell` off `main`; each WS branches off integrate and merges back; final PR `integrate/phase-2a-shell` -> `main`.

- **Wave 1:** WS1 (state/schema/earn). Blocks everything; merge to integrate before Wave 2 starts.
- **Wave 2:** WS2 (diorama) + WS3 (ledger) in parallel, both branched off integrate after WS1 merges.
- **Wave 3:** WS4 (integration + cleanup), after WS2 + WS3 merge.

---

## Wave 1

### WS1: State model, save schema v2, earn-rate refactor, portrait foundation

**Worktree:** `../fishtank-ws1`  **Branch:** `feature/2a-state-counts`
**Commit:** `Phase 2.A WS1: per-biome counts, save schema v2, portrait canvas`

This is the data-model migration plus the portrait layout foundation. Cohesive but large - it owns every type/signature change AND the canvas flip so Wave 2 builds against a stable, portrait surface.

**Portrait bootstrap (do this first so the layout constants are real):**
- Add the layout constants from the "Layout contract" section above to `src/data/constants.ts` (including `RENDER_SCALE_MULTIPLIER: 3`).
- Bump `CONSTANTS.SAVE_KEY` from `'fishtank.save.v1'` -> `'fishtank.save.v2'` (review fix #3: clean key/version separation; old v1 saves are simply never read, no key/value version skew).
- `src/main.ts`:
  - In the Phaser config, swap `width: 800, height: 600` -> `width: CONSTANTS.CANVAS_WIDTH (450), height: CONSTANTS.CANVAS_HEIGHT (800)`. Keep `scale.mode: FIT`, `autoCenter: CENTER_BOTH`, `pixelArt: true`.
  - Change `backgroundColor: '#2c7bd0'` (light blue, would show through below the diorama) -> a neutral dark (e.g. `'#0b1c2c'`) so the letterbox/ledger gutter reads cleanly. (Review fix #9.)
  - **Fix the two `.fishInstances` reads** at `main.ts:24` (`saved.fishInstances[0]?.speciesId`) and `:27` (`saved.fishInstances.length`) - these break under V2. Replace with V2-aware logging, e.g. total fish = `Object.values(saved.tanks).reduce((n, t) => n + Object.values(t.fishCounts).reduce((a, b) => a + b, 0), 0)`. (Review fix #2: WS1 owns this because WS1 already edits `main.ts` and breaks these lines.)
- `src/orientationLock.ts`: the supported orientation is now **portrait**. Gate the overlay on **touch devices only** so desktop `npm run dev` in a normal landscape window still shows the canvas (review fix #10): show the rotate overlay only when `matchMedia('(pointer: coarse)').matches && matchMedia('(orientation: landscape)').matches`; message "Please rotate your device to portrait." Desktop (fine pointer) never sees it.
- `index.html`: no structural change needed (`#app` flex-centers the canvas; FIT letterboxes). Confirm the letterbox reads well around a tall canvas now that `backgroundColor` is dark.

**Types - `src/types/Fish.ts`:**
- Remove `FishInstance`.
- Add:
  ```typescript
  /** Render-only fish in the diorama. NOT persisted. One per owned species with count > 0. */
  export interface DisplayFish {
    speciesId: string;
    x: number;
    y: number;
    direction: 1 | -1;
  }
  ```
- Keep `FishSpecies` unchanged.

**Types - `src/types/Save.ts`:**
- Remove `SaveStateV1` and its `FishInstance`/`decorationInstances` usage.
- Add:
  ```typescript
  export interface BiomeTankState {
    /** Owned fish counts in this biome, keyed by speciesId. */
    fishCounts: Record<string, number>;
    /** Owned decoration species ids in this biome (one of each; cosmetic in A, functional in B). */
    decorations: string[];
  }
  export interface SaveStateV2 {
    version: 2;
    lastSavedAt: string;
    coinBalance: number;
    lifetimeEarned: number;
    /** Per-biome tank state, keyed by biome id. */
    tanks: Record<string, BiomeTankState>;
  }
  ```
  `DecorationInstance` in `src/types/Decoration.ts` is no longer used by the save; leave the type file but it becomes dead (WS4 deletes if nothing imports it).

**`src/save/schema.ts`:** re-export `SaveStateV2` (drop `SaveStateV1`).

**`src/save/Serializer.ts`:**
- `serialize(state: SaveStateV2)`.
- `deserialize(json): SaveStateV2 | null` - explicit ordered guards (review fix #3, so a Sonnet agent cannot deref `version` on a non-object):
  1. `JSON.parse` in try/catch; return null on throw.
  2. `if (typeof parsed !== 'object' || parsed === null) return null;`
  3. `if (parsed.version === 2) return parsed as SaveStateV2;`
  4. `if (typeof parsed.version === 'number') { console.info('[save] dropping v' + parsed.version + ' save (no migration; pre-release)'); return null; }`
  5. `return null;` (no/garbage version).

**`src/save/InitialState.ts`:** build V2 default:
```typescript
export function createInitialState(): SaveStateV2 {
  return {
    version: 2,
    lastSavedAt: new Date().toISOString(),
    coinBalance: 0,
    lifetimeEarned: 0,
    tanks: {
      'tide-pool': { fishCounts: { goldfish: 1 }, decorations: [] },
      'open-reef': { fishCounts: {}, decorations: [] },
      'abyss':     { fishCounts: {}, decorations: [] },
    },
  };
}
```
(Free starter goldfish is now `count: 1` in tide-pool. No random position - the diorama assigns it.)

**`src/util/earnRate.ts`:** rewrite:
```typescript
import { FISH_SPECIES } from '../data/fish.js';
import { CONSTANTS } from '../data/constants.js';
import type { SaveStateV2 } from '../types/Save.js';

const SPECIES_BY_ID = new Map(FISH_SPECIES.map((s) => [s.id, s]));

/** Per-fish earn rate for a species (unchanged formula). */
export function speciesEarnRate(speciesId: string): number {
  const s = SPECIES_BY_ID.get(speciesId);
  if (!s) return 0;
  return s.earnRateBase * Math.pow(CONSTANTS.EARN_RATIO_IN_BIOME, s.costIndex);
}

/** Total earn rate across all tanks: sum(count * speciesRate). */
export function computeTotalEarnRate(tanks: Record<string, { fishCounts: Record<string, number> }>): number {
  let total = 0;
  for (const tank of Object.values(tanks)) {
    for (const [speciesId, count] of Object.entries(tank.fishCounts)) {
      total += speciesEarnRate(speciesId) * count;
    }
  }
  return total;
}
```

**`src/sim/CoinEarn.ts`:** change `computeTotalEarnRate(state.fishInstances)` -> `computeTotalEarnRate(state.tanks)`.

**`src/sim/OfflineCatchup.ts`:** `CatchupResult.newState: SaveStateV2`; `computeTotalEarnRate(state.tanks)`.

**`src/sim/PurchaseFish.ts`:** rewrite to increment counts:
```typescript
export type PurchaseResult =
  | { success: true; speciesId: string; newCount: number; cost: number }
  | { success: false; reason: 'unknown_species' | 'insufficient_funds' };

export function purchaseFish(speciesId: string): PurchaseResult {
  const species = SPECIES_BY_ID.get(speciesId);
  if (!species) return { success: false, reason: 'unknown_species' };
  const cost = fishCost(species);
  const state = getState();
  if (state.coinBalance < cost) return { success: false, reason: 'insufficient_funds' };
  state.coinBalance -= cost;
  const tank = state.tanks[species.biomeId];
  tank.fishCounts[speciesId] = (tank.fishCounts[speciesId] ?? 0) + 1;
  return { success: true, speciesId, newCount: tank.fishCounts[speciesId], cost };
}
```
(No capacity check - that is Epic C.)

**`src/sim/PurchaseDecoration.ts`:** **Decoration PURCHASING is deferred to Epic B** (review fix #5 - the new ledger has no decorations tab, so there is no buy path in Epic A; building one now is scope creep, and per CLAUDE.md "ruthless scope discipline"). WS1 only ports this file enough to **compile** against V2 (it currently mutates `state.decorationInstances`, which no longer exists):
```typescript
export type DecorationResult =
  | { success: true; speciesId: string; cost: number }
  | { success: false; reason: 'unknown_decoration' | 'insufficient_funds' | 'already_owned' };

/** Adds a decoration to a biome's owned set. No UI calls this in Epic A; Epic B wires the buy affordance. */
export function purchaseDecoration(speciesId: string, biomeId: string): DecorationResult { ... }
```
On success: push `speciesId` into `state.tanks[biomeId].decorations` if absent (else `already_owned`). The diorama (WS2) renders whatever is in `decorations` - empty on fresh saves, so nothing shows until Epic B adds the buy UI. This keeps the capability ready without an orphan feature.

**`src/sim/FishAI.ts`:** `DisplayFish` has no `id`, but `FishAI` keys its state Map by `fish.id`. Four edits (review fix #6 - all must change or typecheck fails):
1. `import type` line: `FishInstance` -> `DisplayFish`.
2. `update(instances: FishInstance[], dt)` -> `update(fish: DisplayFish[], dt)`.
3. `ensureState(fish: FishInstance)` -> `ensureState(fish: DisplayFish)`, and key the state Map by `fish.speciesId` instead of `fish.id` (one DisplayFish per species, so speciesId is unique within the array).
4. `bounce(fish: FishInstance)` -> `bounce(fish: DisplayFish)`.
Motion logic (drift/wobble/dart/bounce) is otherwise unchanged.

**`src/ui/CoinCounter.ts`:** change `computeTotalEarnRate(state.fishInstances)` -> `computeTotalEarnRate(state.tanks)`.

**`src/state.ts`:** `getState(): SaveStateV2`, `setState(s: SaveStateV2)`.
**`src/save/SaveStore.ts`, `src/save/Autosave.ts`:** swap `SaveStateV1` -> `SaveStateV2` in signatures.

**`src/ui/SettingsPanel.ts` (review fix #1 - BLOCKING, was missing from the plan):** this file has `isPlausibleSaveState(s)` (~line 56) that hard-validates `Array.isArray(s.fishInstances)` and `Array.isArray(s.decorationInstances)` and iterates `f.x/f.y` - under V2 it returns `false` for *every* valid save, so the import-save flow rejects all good exports. It also imports `SaveStateV1` (breaks typecheck). WS1 must:
- Swap the type import to `SaveStateV2`.
- Rewrite `isPlausibleSaveState` to validate the V2 shape: `s.version === 2`, `typeof s.coinBalance === 'number'` (finite), `s.tanks` is a non-null object, and every tank has a `fishCounts` object (values finite numbers) and a `decorations` string array.
- The export/reset flows otherwise unchanged.

**Tests to update (keep them green):**
- `Serializer.test.ts` - rebuild fixture as V2; the "unknown version" test now uses `version: 1` to assert rejection; add "drops v1 save" case.
- `Autosave.test.ts` - `baseState` -> V2 shape (`tanks` instead of arrays).
- `CoinEarn.test.ts` - `oneGoldfish()` builds `tanks: { 'tide-pool': { fishCounts: { goldfish: 1 }, decorations: [] }, ... }`. Same expected rate.
- `OfflineCatchup.test.ts` - V2 fixture.
- `PurchaseFish.test.ts` - assert count increments instead of array push; update `PurchaseResult` assertions.
- `PurchaseDecoration.test.ts` - assert decoration id added to the biome's `decorations` set; `already_owned` path.
- `FishAI.test.ts` - build `DisplayFish[]` fixtures (drop `id`/`ownedAt`); assert motion still bounded.
- Add `earnRate.test.ts` - `speciesEarnRate('goldfish')` and `computeTotalEarnRate` over a multi-species, multi-biome `tanks` object.

**Acceptance:** `npm run typecheck` + `npm run test` + `npm run build` all green. No reference to `fishInstances` or `decorationInstances` remains in `src/` except dead type files slated for WS4 deletion.

---

## Wave 2 (parallel, after WS1 merges to integrate)

### WS2: Diorama (top region)

**Worktree:** `../fishtank-ws2`  **Branch:** `feature/2a-diorama`
**Commit:** `Phase 2.A WS2: diorama renders one sprite per species, bounded + switchable`

**New file `src/scenes/Diorama.ts`** implementing the `Diorama` interface. `createDiorama(scene, getState, initialBiomeId)` renders `initialBiomeId` immediately at construction (review fix #4) - do not wait for a `showBiome` call.
- Per biome, a `Phaser.GameObjects.Container` holding that biome's fish + decoration sprites. Containers in a `Map<biomeId, Container>`; only the active one is visible.
- One `GradientBackdrop` (reuse `createGradientBackdrop`, seeded with `initialBiomeId`'s biome); `showBiome(id)` calls `backdrop.transitionTo(biome)`.
- One `TankFloor` confined to the diorama region: call `createTankFloor(this, CONSTANTS.DIORAMA_HEIGHT)` (see signature change below).
- Render-only `displayFish: Map<biomeId, Map<speciesId, DisplayFish>>`. `update(dt)`:
  1. For the active biome, for each `speciesId` with `count > 0` in `getState().tanks[biome].fishCounts` that lacks a `DisplayFish`, create one at a random position within the diorama region (`x in [40, CANVAS_WIDTH-40]` i.e. [40,410], `y in [40, DIORAMA_HEIGHT-40]`, random direction) and an `Image` sprite (texture key = speciesId, scale `species.scale * RENDER_SCALE_MULTIPLIER`).
  2. Run one `FishAI` instance per biome (constructed with `tankWidth: CANVAS_WIDTH, tankHeight: DIORAMA_HEIGHT`) over that biome's `DisplayFish[]`.
  3. Sync each sprite's `x/y/flipX` from its `DisplayFish`.
- Decorations: for each id in `getState().tanks[biome].decorations` lacking a sprite, create an `Image` at a deterministic auto-spread position along the floor (so it does not jump between frames), depth `-5`. No drag. Floor-Y formula (review fix #11): `y = DIORAMA_HEIGHT - TANK_FLOOR_HEIGHT - (sprite.displayHeight / 2)`; x spread evenly: `x = (CANVAS_WIDTH / (n + 1)) * (index + 1)`. (On fresh saves `decorations` is empty, so this path is dormant until Epic B - but spec it now so the renderer is complete.)
- `showBiome(id)`: hide all containers, show `id`'s, switch backdrop. Build the container lazily on first show.
- `getDisplayFish()`: return the active biome's `DisplayFish[]`.

**`src/ui/TankFloor.ts`:** change signature to `createTankFloor(scene, floorBottomY = CONSTANTS.DIORAMA_HEIGHT)` and compute `floorTopY = floorBottomY - TANK_FLOOR_HEIGHT` (instead of `scene.scale.height - TANK_FLOOR_HEIGHT`). Pebble x still uses `scene.scale.width` (now 450). The diorama passes `CONSTANTS.DIORAMA_HEIGHT`.

**`src/ui/GradientBackdrop.ts`:** confine the gradient fill to `y in [0, DIORAMA_HEIGHT]` (so the ledger region is not painted by the backdrop). Read `CONSTANTS.DIORAMA_HEIGHT`.

**Tests - `src/scenes/Diorama.test.ts`:** (use a Phaser mock or test the count-sync logic in isolation - extract `syncDisplayFish(tank, existing): DisplayFish[]` as a pure exported helper and unit-test it):
- One species with count 5 -> exactly one `DisplayFish`.
- Two species each count > 0 -> two `DisplayFish`.
- Species with count 0 -> none.

> Note: `FishAI.ts` type/signature is already changed by WS1; WS2 only *uses* it.

### WS3: Ledger (bottom region)

**Worktree:** `../fishtank-ws3`  **Branch:** `feature/2a-ledger`
**Commit:** `Phase 2.A WS3: always-visible ledger with biome tabs + species collection`

**New file `src/ui/Ledger.ts`** implementing the `Ledger` interface. `createLedger(scene, getState, onSelectBiome, initialBiomeId)` renders `initialBiomeId` immediately at construction (review fix #4). Panel at `y in [480, 800]`, full width 450, height 320.
- **Opaque background** (review fix #9): first draw a filled `Rectangle` covering the entire ledger region (450x320) in a solid dark panel color, so the canvas clear color never shows through. All tabs/rows render above it.
- **Tab row** (top ~44px of ledger): one tab per biome (`BIOMES`, 3 tabs across 450px ~ 150px each), labeled by name. Locked biomes (`lifetimeEarned < unlockThreshold`, via `isBiomeUnlocked`) render greyed + a lock glyph and do not fire `onSelectBiome`. Active tab highlighted (`#2e7d32`). Tapping an unlocked tab calls `onSelectBiome(biomeId)`.
- **Species list** (remaining ~276px): a single-column **vertical list** of rows for the active biome's species (`BIOMES.find(...).fishSpeciesIds`) - the natural portrait pattern. Each row (full width ~430px, height ~64px): species icon left, name + owned count `xN` (from `tanks[biome].fishCounts[id] ?? 0`) center-left, cost (`fishCost(species)`, via `formatCoins`) + BUY button right. BUY calls `purchaseFish(species.id)`.
- **Scroll:** 10 species at 64px = 640px > 276px visible, so the list needs vertical scroll. Implement with a `Phaser.GameObjects.Container` clipped by a geometry mask over the list region, dragged vertically and clamped to `[minY, 0]`. Extract the clamp math as a pure helper `clampScroll(offsetY, contentHeight, viewHeight)` for testing. This drag-scroll is the one non-trivial piece of WS3.
- `showBiome(id)`: rebuild the row list for that biome, highlight its tab, reset scroll to top.
- `update()`: refresh each row's count text + BUY affordability color (green if `coinBalance >= cost`, grey otherwise) + tab lock states. Use a per-row memo (like ShopPanel's `lastAffordable`) to avoid churn.
- Reuse the styling constants from recon (monospace, white + black stroke, palette).

**Tests - `src/ui/Ledger.test.ts`:** extract pure helpers where possible (e.g. `rowsForBiome(biomeId): {speciesId, cost}[]`, `isTabSelectable(biomeId, lifetimeEarned)`, `clampScroll(...)`), unit-test:
- List contains exactly the active biome's species.
- A locked biome's tab is not selectable below threshold, selectable at/above.
- BUY triggers `purchaseFish` (spy) with the right speciesId.

> WS3 does NOT touch `ShopPanel.ts` (WS4 deletes it).

---

## Wave 3

### WS4: Integration + cleanup

**Worktree:** `../fishtank-ws4`  **Branch:** `feature/2a-integration`
**Commit:** `Phase 2.A WS4: wire diorama + ledger into TankScene, remove modal shop`

**`src/scenes/TankScene.ts`:** rewrite:
- Fields: `diorama: Diorama`, `ledger: Ledger`, `coinCounter`, `coinFloater`, `settingsPanel`, `welcomeModal`, `catchupToast`, `biomeTransition`, `currentBiomeId: string`.
- `create()`:
  - `this.currentBiomeId = getHighestUnlockedBiome(getState().lifetimeEarned).id`.
  - `this.diorama = createDiorama(this, getState, this.currentBiomeId)`.
  - `this.ledger = createLedger(this, getState, (id) => this.switchBiome(id), this.currentBiomeId)`.
  - `coinCounter`, `coinFloater`, `settingsPanel`, `welcomeModal`, `catchupToast`, `biomeTransition` (keep the unlock-celebration toast).
  - (No explicit `showBiome` needed at construction - both factories render `initialBiomeId` immediately.)
  - Keep the SETTINGS button. **Remove** the SHOP button (ledger is always visible).
  - First-run welcome modal as before.
- `switchBiome(id)`: `this.currentBiomeId = id; this.diorama.showBiome(id); this.ledger.showBiome(id);`
- `update(_t, dt)`: `diorama.update(dt)`, `ledger.update()`, `coinCounter.update()`, `coinFloater.update(this.diorama.getDisplayFish(), dt)`, `biomeTransition.update()`, catchup toast via `consumePendingCatchup()`.
- Delete `spawnSprite`, the `fishInstances` loop, `decorationManager`, `shopPanel`.

**`src/ui/CoinFloater.ts`:** change `update(instances, delta)` -> `update(fish: DisplayFish[], delta)`. It currently calls `instanceEarnRate(fish)` per fish; switch to `speciesEarnRate(f.speciesId)` per sprite (review fix #13). Note this is **cosmetic** - one floater stream per species sprite at the per-one-fish rate, not count-scaled; real coins come from `CoinEarn`. State this in a code comment so a future reader does not "fix" it to count-scale.

**`src/ui/WelcomeModal.ts`:** update copy to:
```
Welcome to your fish tank!

You start with one Goldfish in the Tide Pool.
Buy more fish in the ledger below to earn coins faster.
Each biome has its own tank - switch with the tabs.
New biomes unlock as your lifetime earnings grow.

Click anywhere to dismiss.
```
Keep this as a **single** `add.text` call (the existing `WelcomeModal.test.ts` asserts `texts.toHaveLength(1)`). Update `WelcomeModal.test.ts:53` (review fix #8): it currently asserts the copy contains `'SHOP'`, which the new copy removes - change that assertion to `toContain('ledger')` (and keep the `'Welcome to your fish tank!'` assertion).

**`src/main.ts`:** the `.fishInstances` reads and the canvas/bg/`SAVE_KEY` changes are already done in WS1. WS4 only confirms the bootstrap still compiles and runs end-to-end against V2 after the diorama/ledger wiring.

**Deletions:**
- `src/ui/ShopPanel.ts` (replaced by Ledger; no test file exists).
- `src/scenes/DecorationManager.ts` + `src/scenes/DecorationManager.test.ts` (drag placement removed; diorama renders decorations).
- `src/types/Decoration.ts` `DecorationInstance` (if unused after refactor; keep `DecorationSpecies`).

**Acceptance (integration PR):**
- `npm run typecheck` + `npm run test` + `npm run build` green.
- `npm run dev` manual smoke:
  - Fresh save: welcome modal shows new copy; one goldfish drifts in the tide-pool diorama (top); ledger (bottom) lists tide-pool species with Goldfish `x1`; reef/abyss tabs greyed + locked.
  - Buying a 2nd goldfish: ledger shows `x2`, coin rate rises, **no second sprite** appears.
  - Buying a different tide-pool species: a new sprite appears in the diorama.
  - Earning past the reef threshold: reef tab unlocks (celebration toast fires once); tapping it switches both diorama scene and ledger list.
  - Fish stay within the top region; none swim into the ledger.
  - Ledger species list scrolls vertically; tabs and rows do not bleed into the diorama.
  - Reload: counts and coins persist; old v1 saves (`fishtank.save.v1` key) are ignored and a fresh v2 save is written under `fishtank.save.v2`.
  - Desktop `npm run dev` in a normal window shows the portrait canvas (no rotate overlay); a touch device in landscape shows the rotate-to-portrait overlay.
  - **Import/export round-trip** (review fix #1): export a save from Settings, reset, re-import - it loads (validates the V2 shape, not the old arrays).

---

## Risks

- **WS1 blast radius.** It touches ~17 source files (types, save layer, sim, earn util, FishAI, CoinCounter, SettingsPanel, state, main, constants, orientationLock) + ~8 tests. Mitigation: it is one cohesive migration; typecheck + the existing test suite are the guardrail. Merge WS1 to integrate and confirm green before Wave 2 branches. If it feels too large for one agent, it can be split into WS1a (types + save + SettingsPanel validator) and WS1b (sim + earn + FishAI), but they must land together before Wave 2.
- **Orientation flip touches bootstrap.** `main.ts` config, `orientationLock.ts`, and the letterbox look depend on each other. Mitigation: WS1 does the flip first and verifies `npm run dev` renders a centered portrait canvas in the browser before Wave 2 builds on it.
- **Diorama proportions with `scale * 3`.** A 450-wide region with 3x sprites may crowd larger abyss fish. Mitigation: tune `DIORAMA_HEIGHT` / `RENDER_SCALE_MULTIPLIER` in the manual pass; values are constants.
- **Ledger drag-scroll** is the trickiest piece (mask + clamped drag in Phaser). Mitigation: pure `clampScroll` helper is unit-tested; the mask wiring is covered by manual smoke.
- **Phaser-dependent modules are hard to unit test.** Mitigation: extract pure helpers (`syncDisplayFish`, `cardsForBiome`, `isTabSelectable`) and test those; rely on manual smoke for the Phaser wiring.

## Deferred to later epics (do not build here)

- Pearls, coin->pearl conversion, pearl-gated biome unlock (Epic C; biome unlock stays `lifetimeEarned`-threshold in A).
- Tank-size capacity + caps + upgrades (Epic C; v2->v3 schema bump there).
- Authored behaviors: schooling, chasing, hiding-in-decoration (Epic B).
- Functional decorations AND decoration *purchasing* UI (Epic B - the ledger has no decorations tab in A; `purchaseDecoration` is ported to compile but no UI calls it).
- Collection-completion rewards (Epic B/C).

## Changes from adversarial review

Applied directly (clear misses, verified against source):
1. **(blocking)** Added `src/ui/SettingsPanel.ts` to WS1 - its `isPlausibleSaveState` validator + `SaveStateV1` import would have rejected every V2 save and failed typecheck.
2. **(blocking)** Moved `main.ts` `.fishInstances` log-line fixes into WS1 (it already edits `main.ts` for the canvas flip).
3. **(blocking)** Bumped `SAVE_KEY` to `fishtank.save.v2` and gave `deserialize` an explicit ordered guard spec.
4. **(blocking)** Added `initialBiomeId` to both `createDiorama` and `createLedger` so they render an active biome at construction (no unset-biome gap).
5. **(should-fix)** Decorations: deferred *purchasing* to Epic B (no ledger tab); `purchaseDecoration` ported only enough to compile; removed the "buy a decoration" acceptance step.
6. **(should-fix)** Enumerated all four `FishAI` edits (import, `update`, `ensureState`, `bounce`) and the `id`->`speciesId` keying.
7. **(should-fix)** Promoted `RENDER_SCALE_MULTIPLIER` into `CONSTANTS` (WS4 deletes the TankScene that held it).
8. **(should-fix)** Made the `WelcomeModal.test.ts` copy-assertion fix definitive (assert `'ledger'`, keep single text object).
9. **(should-fix)** Dark `backgroundColor` + opaque ledger panel so the canvas clear color never shows through.
10. **(should-fix)** Orientation lock gated to touch devices so desktop `npm run dev` is not blocked by the rotate overlay.
11. **(nice-to-have)** Specified `createTankFloor` signature + decoration floor-Y/x formulas.
13. **(nice-to-have)** Specified CoinFloater emits at `speciesEarnRate` per sprite (cosmetic, not count-scaled).

Confirmed solid by review: earn-rate math is preserved exactly (count*rate reproduces the old per-instance sum); WS2/WS3 have no file overlap (clean parallel merge).
