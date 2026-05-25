# Phase 2.B.2: Behavior Depth - Implementation Plan

## Context

Playtest feedback on Epic B: the 5 archetype buckets are too coarse. The worst offender is the floor - all 7 "bottom-dwellers" do the identical slow horizontal hover, which reads as boring, and they clump (no separation). Scott's call: give species more distinct behavior *before* adding decorations.

The model stays **habitat skeleton + per-species motion style** (not 28 bespoke sims). This pass refines the floor habitat into distinct styles, adds floor separation, loosens schooling spacing, and starts the tank with varied life. Sprite-visual quirks (pufferfish puff, anglerfish glow, hide-in-sand) and decoration-based hiding (kelp/rocks) stay deferred - the first needs a sprite-effects layer, the second is Epic D.

## Key facts (from recon - build against these)

- Move-function signature: `(fish: DisplayFish, state: AIState, dt, elapsedMs, bounds: Bounds, rng) => void`. Shared helpers in `behaviors.ts`: `bounceX(fish, bounds)` (x-clamp + direction flip), `clampY(fish, bounds)` (soft full-height y-clamp), `startDart(state, direction, rng)`.
- `moveBottomDweller` today: `fish.x += BOTTOM_DRIFT_SPEED(8) * direction * dtSec`; hard-snaps y into `[DIORAMA_HEIGHT - BOTTOM_BAND (360), bounds.height - margin]`; zeroes dart state. That single function is what we split.
- `AIState = { driftSpeed, wobblePhase, dartMs, dartVx, dartVy }`. `separation(fish, neighbors)` exists and is reusable (it pushes a fish away from nearby neighbors, capped).
- `FishAI.update` dispatches pass 1 on `behaviorType` (switch with `cruiser` default), then pass 2 does schooler cohesion + separation and non-predator flee.
- 7 floor species: `starfish`(1.0), `shrimp`(1.0), `crab-blue`(1.0), `crab-king`(1.3) [tide]; `flounder`(1.3), `stingray`(1.5) [reef]; `crab-dungeness`(1.2) [abyss].
- `behaviorType:` literals appear in 4 test files: `behaviors.test.ts` (~40), `FishAI.test.ts` (1, uses `'cruiser'`), `Diorama.test.ts` (1), `CoinFloater.test.ts` (1, `'cruiser'`).
- `InitialState.createInitialState()` starts with `{ goldfish: 1 }` in tide-pool only.

## The change

### 1. Split `bottom-dweller` into 4 floor styles (`src/types/Fish.ts`)
Replace `'bottom-dweller'` in the `BehaviorType` union with `'rester' | 'walker' | 'glider' | 'ambusher'`. Final union:
```typescript
export type BehaviorType =
  | 'schooler' | 'cruiser' | 'drifter' | 'predator'
  | 'rester' | 'walker' | 'glider' | 'ambusher';
```
`bottom-dweller` is fully removed - all 7 species remap. **Note:** the dispatch switch currently has `case 'cruiser': default:`, so a missed remap would silently fall through to `moveCruiser` (compiles clean - NOT caught). To make the union genuinely exhaustive, change the default to an `assertNever(f.behaviorType)` helper (`function assertNever(x: never): never { throw new Error('unhandled ' + x); }`) with explicit `cruiser` and all four floor cases - then a missing case is a compile error. The only thing that breaks the build without this is the stale `'bottom-dweller'` string literals in data + tests.

### 2. Remap the 7 floor species (`src/data/fish.ts`)
| species | scale | new behaviorType | feel |
|---|---|---|---|
| starfish | 1.0 | `rester` | sits on the sand, essentially still |
| flounder | 1.3 | `ambusher` | rests flat, then darts and re-settles |
| crab-blue | 1.0 | `walker` | scuttles along the sand |
| crab-king | 1.3 | `walker` | scuttles along the sand |
| crab-dungeness | 1.2 | `walker` | scuttles along the sand |
| shrimp | 1.0 | `walker` | skitters along the sand (with the crabs) |
| stingray | 1.5 | `glider` | glides smoothly just above the sand |

(Shrimp folds into `walker` for now; if it wants its own hop later, that is a cheap follow-up - noted, not in scope.)

### 3. New move functions + a shared floor helper (`src/sim/behaviors.ts`)

**Floor geometry.** The real bounds at runtime: `bounds.height = DIORAMA_HEIGHT = 480`, `bounds.margin = DEFAULT_MARGIN = 32` (Diorama passes no margin). So `floorY = 480 - 32 = 448` (the sand line) and `bandTop = DIORAMA_HEIGHT - BOTTOM_BAND = 360`. **The glider band `[360, 448]` is 88px tall, not 120** - keep that in mind for amplitudes. `floorY` is per-call (depends on `bounds`), NOT a module constant; `bandTop` CAN be a module const (both `DIORAMA_HEIGHT` and `BOTTOM_BAND` are already exported). Helpers:
```typescript
const BAND_TOP = DIORAMA_HEIGHT - BOTTOM_BAND; // 360, module const

export function snapToFloor(fish: DisplayFish, bounds: Bounds): void {
  fish.y = bounds.height - bounds.margin; // 448
}
export function clampToBand(fish: DisplayFish, bounds: Bounds): void {
  const floorY = bounds.height - bounds.margin;
  if (fish.y < BAND_TOP) fish.y = BAND_TOP;
  if (fish.y > floorY) fish.y = floorY;
}
```
Four functions (all dt-rate-independent, all end with `bounceX(fish, bounds)`):
- **`moveRester`** (starfish): `snapToFloor`; no horizontal; zero dart state. Pure sit. (Optional imperceptible creep deferred.)
- **`moveWalker`** (crabs, shrimp): `fish.x += WALKER_SPEED * fish.direction * dtSec`; `snapToFloor`; zero dart state. (`bounceX` flips at edges.)
- **`moveGlider`** (stingray): `fish.x += GLIDER_SPEED * fish.direction * dtSec`; vertical undulation `fish.y += GLIDER_BOB_AMP * Math.sin(2*PI*elapsedMs/GLIDER_BOB_PERIOD + state.wobblePhase) * dtSec`; then `clampToBand`; zero dart state. (`wobblePhase` is seeded for every fish in `ensureState`, so this is valid.)
- **`moveAmbusher`** (flounder): if `state.dartMs > 0`, apply the dart velocity + drain `dartMs` (same as cruiser's dart branch). Else: `snapToFloor` (rest flat on the sand) and roll `if (rng() < AMBUSHER_DART_PROB * dtSec) startDart(state, fish.direction, rng)`. **The settle is `snapToFloor` every non-darting tick** - there is no automatic settle in the dart code, so once a dart ends the next tick's `snapToFloor` returns it to the sand. Reuses `startDart` (`DART_DURATION_MS 800` / `DART_SPEED 80`) as-is; the up-to-~64px rise during a dart stays within the band and snaps back after. Ends with `bounceX`.

New constants (starting values, tune in dev):
```
WALKER_SPEED = 12
GLIDER_SPEED = 10 ; GLIDER_BOB_AMP = 14 ; GLIDER_BOB_PERIOD = 5000   // amp 14 (not 4) so the undulation is actually visible in an 88px band
AMBUSHER_DART_PROB = 0.03   // per second
```

**Deletions vs keeps (be precise):** DELETE `moveBottomDweller` (function + its header comment) and `BOTTOM_DRIFT_SPEED` (now unused). KEEP `BOTTOM_BAND` and `DIORAMA_HEIGHT` (still used by `BAND_TOP`/`clampToBand` and imported by `behaviors.test.ts`). Remove the `moveBottomDweller` import from `FishAI.ts`.

### 4. Floor separation + wider schooling (`src/sim/FishAI.ts` + constants)
- Dispatch switch: remove the `bottom-dweller` case; add `rester` / `walker` / `glider` / `ambusher` cases calling the new functions.
- Pass 2: gather `floorDwellers = fish.filter(behaviorType in {rester,walker,glider,ambusher})` and apply `separation(f, floorDwellers)` to each, **gated on `state.dartMs <= 0`** (mirror the schooler block, so separation does not fight an in-progress flee/ambush dart). NO cohesion - floor species do not flock. The floor set is disjoint from schoolers, so no fish gets separation applied twice.
- Bump `SEPARATION_RADIUS` 60 -> **90** (Scott: schoolers still too glued). The radius is shared, so floor species also get ~90px spacing - sane on a 450-wide floor.
- **Leave `flee` as-is** (it already applies to all non-predators, including floor species). A scuttling crab bolting from a predator is a little odd, but it is existing behavior and out of scope for this pass - flag it for a later tuning look, do not change it here.

### 5. Richer starter tank (`src/save/InitialState.ts`)
Start tide-pool with a varied set instead of one goldfish, so frame one shows 4 distinct behaviors:
```typescript
'tide-pool': { fishCounts: { goldfish: 1, 'crab-blue': 1, starfish: 1, seahorse: 1 }, decorations: [] }
```
(schooler + walker + rester + drifter). Exact set tunable. Negligible economy impact (early fish earn ~0.5 c/s).

### 6. Tests
Precise scope (do NOT over-edit - most of `behaviors.test.ts` is the regression gate):
- `behaviors.test.ts`: only **5** literals are `'bottom-dweller'` (the `moveBottomDweller` describe block). Rewrite the `moveBottomDweller` import (line ~4) and that `describe` block into `moveRester` / `moveWalker` / `moveGlider` / `moveAmbusher` tests: rester stays at `floorY=448` over many ticks (no horizontal); walker moves horizontally and stays at `floorY`; glider stays within `[360, 448]` and its y oscillates; ambusher rests at `floorY`, then with `rng` forced below `AMBUSHER_DART_PROB*dtSec` darts off the floor and re-settles to `floorY` on the next non-darting tick. The other ~35 literals (`cruiser`/`schooler`/`drifter`/`predator`/cohesion/flee/separation) stay **byte-identical** - cruiser regression gate.
- `FishAI.test.ts`, `CoinFloater.test.ts`, `Diorama.test.ts`: their `behaviorType` literals are all `'cruiser'` - **unaffected, no edits needed**.
- Add a FishAI test (or extend behaviors) for floor separation: two walkers close together push apart.

## Workstream

Single cohesive workstream (`feature/2b2-behavior-depth` off `integrate/phase-2b2-behavior-depth`); it is all one behavior change, not parallelizable. Commit, verify, browser-smoke, bugcheck the diff, then `integrate -> main` PR + deploy for the next playtest.

## Acceptance

- typecheck clean; all tests green; cruiser regression assertions unchanged.
- `npm run dev`: a **fresh save** opens with 4 visibly different behaviors - a still starfish (rester), a scuttling crab (walker), a drifting goldfish-school feel (schooler), a bobbing seahorse (drifter), all spaced. After buying reef fish, the glider (stingray) and ambusher (flounder rest-then-dart) appear. Floor species no longer clump; schoolers sit looser.
- No console errors.

## Changes from adversarial review (all incorporated)

- **(blocking)** Rewrote section 3 with real function bodies - `floorY` is per-call (not a module const; `bounds` is a parameter), `BAND_TOP` is the module const.
- **(blocking)** `moveAmbusher` settle is now concrete: `snapToFloor` on every non-darting tick (the dart code has no auto-settle).
- **(blocking)** Corrected the band height to **88px** (margin is 32, not 10; `floorY=448`, `bandTop=360`); bumped `GLIDER_BOB_AMP` 4 -> 14 so the undulation is visible.
- **(blocking)** Dropped the false "TS exhaustiveness catches misses" claim; added an `assertNever` default so a missed remap is a compile error.
- **(should-fix)** Test scope clarified: only 5 `bottom-dweller` literals + the `moveBottomDweller` block change; the other ~35 stay byte-identical (regression gate); the 3 other test files use `'cruiser'` and need no edits.
- **(should-fix)** Enumerated deletions (`moveBottomDweller`, `BOTTOM_DRIFT_SPEED`, the FishAI import) vs keeps (`BOTTOM_BAND`, `DIORAMA_HEIGHT`).
- **(should-fix)** Floor separation gated on `dartMs <= 0`; flagged floor-species-flee as existing/out-of-scope; confirmed no double-separation (floor set disjoint from schoolers).
- Confirmed solid: remap table exact (7 species), `wobblePhase` seeded for all fish, starter species exist and break no test (no InitialState test exists).

## Risks

- **Resters look dead / too static.** A pure-sit starfish may read as a frozen sprite. Mitigation: tune - allow a very occasional tiny reposition if it feels lifeless. (Starfish genuinely barely move, so some stillness is correct.)
- **Ambusher dart off the floor could exit the band** - clamp after the dart; the dart is short and `bounceX`/floor-settle contain it.
- **Shared `SEPARATION_RADIUS` at 90** widens both schools and floor spacing; if floors end up too sparse, split into a separate floor radius constant (cheap follow-up).
- Behavior *feel* is the deliverable; expect a dev tuning pass on the new constants.

## Out of scope (deferred)

- Sprite-visual quirks: pufferfish puff, anglerfish lure glow, bury-and-hide (need a Diorama sprite-effects layer) - later polish pass.
- Decoration-based hiding (kelp, rocks) - Epic D.
- Predator / schooler / cruiser / drifter motion - unchanged this pass.
