# Phase 2.B: Behaviors - Implementation Plan

## Context

Epic B per [ADR-0006](../decisions/0006-diorama-ledger-redesign.md), scoped (decision 2026-05-24) to **behaviors only** - decoration buying + fish-to-decoration interactions are deferred to a later epic. Predators are **visual-only**: prey flees, nothing is ever eaten (keeps the cozy/collection model intact).

Goal: fish stop drifting identically. Epic A renders ~1 sprite per owned species (up to ~10 per biome) - the density where authored, per-archetype motion plus light inter-species interaction reads as a *living scene* rather than noise. This is the payoff for the whole redesign and the answer to the founding complaint ("all fish do the same thing").

## Key architectural facts (from recon - build against these, do not re-discover)

- `FishAI.update(fish: DisplayFish[], dt)` already receives the **whole biome array in one call** (`Diorama.ts:210`). Neighbors are available for interaction logic with **no call-signature change**.
- One `FishAI` instance per biome (`Diorama.ts:95`), persistent across frames. Per-fish state in `states: Map<speciesId, AIState>` where `AIState = { driftSpeed, wobblePhase, dartMs, dartVx, dartVy }` (`FishAI.ts:12-18`).
- `DisplayFish = { speciesId, x, y, direction }` (`Fish.ts:25-30`). FishAI reads/writes only x/y/direction. We add `behaviorType` to DisplayFish, set at spawn.
- **One sprite per species** - so "schooling" = cohesion *between different schooler species*, and predator/prey is *between species*. There is never more than one of a given species on screen. All interaction logic is inter-species.
- Motion is **dt-rate-independent** (everything scaled by `dtSec = dt/1000`); preserve that. Current motion (drift + wobble + random dart, then bounce to `[margin, dim-margin]`) is the cruiser/schooler baseline.
- Bounds per biome: `tankWidth = CANVAS_WIDTH (450)`, `tankHeight = DIORAMA_HEIGHT (480)`, `DEFAULT_MARGIN 32`. Motion constants in `FishAI.ts:20-26`.
- FishAI.test.ts builds `DisplayFish` literals (drift/bounce/dart/bounds tests) - these will need a `behaviorType` added once the field exists.

## Archetypes (authored data - tunable, that is the point)

Five archetypes. Assignment escalates predators by biome: **Tide Pool calm (no predators), Open Reef introduces them, Abyss is predator-heavy** - a natural progression.

| Species | Biome | scale | Archetype |
|---|---|---|---|
| goldfish | tide-pool | 1.0 | schooler |
| guppy | tide-pool | 1.0 | schooler |
| neon-tetra | tide-pool | 1.0 | schooler |
| clownfish | tide-pool | 1.0 | cruiser |
| seahorse | tide-pool | 1.0 | drifter |
| starfish | tide-pool | 1.0 | bottom-dweller |
| shrimp | tide-pool | 1.0 | bottom-dweller |
| pufferfish | tide-pool | 1.2 | cruiser |
| crab-blue | tide-pool | 1.0 | bottom-dweller |
| crab-king | tide-pool | 1.3 | bottom-dweller |
| purple-tang | open-reef | 1.0 | schooler |
| yellow-tang | open-reef | 1.0 | schooler |
| surgeonfish | open-reef | 1.0 | schooler |
| napoleon-wrasse | open-reef | 1.3 | cruiser |
| blue-groper | open-reef | 1.3 | cruiser |
| moray-eel | open-reef | 1.4 | predator |
| ribbon-eel | open-reef | 1.4 | predator |
| jellyfish | open-reef | 1.2 | drifter |
| flounder | open-reef | 1.3 | bottom-dweller |
| stingray | open-reef | 1.5 | bottom-dweller |
| anglerfish | abyss | 1.3 | predator |
| great-white-shark | abyss | 1.8 | predator |
| tuna | abyss | 1.5 | predator |
| upside-down-jelly | abyss | 1.2 | drifter |
| blue-angelfish | abyss | 1.4 | cruiser |
| anchovy | abyss | 1.0 | schooler |
| goby | abyss | 1.0 | schooler |
| crab-dungeness | abyss | 1.2 | bottom-dweller |

**Solo motion per archetype:**
- **schooler** - brisk drift + wobble + frequent small darts (twitchy little fish).
- **cruiser** (default) - the current drift + wobble + occasional dart, unchanged.
- **bottom-dweller** - confined to the lower band (`y` in `[DIORAMA_HEIGHT - BOTTOM_BAND, DIORAMA_HEIGHT - margin]`); slow horizontal crawl; no wobble; rare/no dart.
- **drifter** - very slow; gentle vertical bob (sine on y); near-zero horizontal; no dart.
- **predator** - slow, wide, steady cruise; minimal wobble; no random dart (deliberate menace).

**Interactions (WS2):**
- **cohesion** - each schooler steers gently toward the centroid of *other schoolers* in the biome. Weak, capped force so they loosely group rather than collapse into a blob.
- **flee** - each non-predator within `FLEE_RADIUS` of a predator gets a dart impulse directly away from it. Predators are unaffected by others. Nothing is eaten.

## Constants & mechanics (starting values - tune in dev, but ship compiling)

New constants in `behaviors.ts` (rough starts; the dev tuning pass refines them):
```
BOTTOM_BAND = 120          // bottom-dwellers live in y [DIORAMA_HEIGHT-120, DIORAMA_HEIGHT-margin] = [360, 448]
DRIFTER_BOB_AMP = 10       // px/s vertical bob velocity amplitude
DRIFTER_BOB_PERIOD = 6000  // ms
DRIFTER_DRIFT = 4          // px/s slow horizontal so drifters still traverse + flip (see below)
PREDATOR_SPEED = 12        // px/s cruise (vs DRIFT_SPEED 20 for cruisers - predators are slower)
SCHOOLER_DART_PROB = 0.08  // per second (vs cruiser DART_PROB_PER_SEC 0.025 - schoolers twitchier)
COHESION_GAIN = 0.5        // steer strength toward centroid
COHESION_MAX_V = 6         // px/s cap on cohesion velocity contribution
FLEE_RADIUS = 120          // px; prey within this of a predator flees
FLEE_SPEED = 100           // px/s flee dart speed
```

Mechanics the build MUST get right (these are the review's blocking items):

1. **Pure-function signature includes `elapsedMs`.** Wobble (`FishAI.ts:71-76`) is `WOBBLE_VEL_AMPLITUDE * sin(2π·elapsedMs/PERIOD + wobblePhase)` and depends on `this.elapsedMs`. The behaviors.ts functions take `(fish, state, dt, elapsedMs, bounds, rng)` so cruiser/schooler can reproduce the exact sine. Do NOT drop the time term.

2. **Cruiser is byte-identical to today.** The `cruiser` branch must produce the same output as the current `update` loop (drift + wobble + dart at the existing constants). `FishAI.test.ts`'s drift/bounce/dart assertions stay unchanged (only fixtures gain `behaviorType`); they are the regression gate.

3. **Bottom-dweller clamp REPLACES the generic y-clamp (do not chain both).** Keep the x-edge flip from `bounce()`, but clamp/snap y into `[DIORAMA_HEIGHT - BOTTOM_BAND, DIORAMA_HEIGHT - margin]`. Because `spawnFishSprite` (`Diorama.ts:126-127`) places fish at a random y regardless of archetype, the band clamp must be a **hard snap** (so a crab spawned at y=40 jumps into the band on its first tick) - and bottom-dwellers have low/zero vertical velocity, so without the snap they would never reach the floor.

4. **Drifters get a tiny horizontal drift (`DRIFTER_DRIFT`)** so they slowly traverse and still trigger the `bounce` x-flip - otherwise `direction`/`flipX` freezes at the random spawn value and the sprite looks stuck.

5. **Flee sets an ABSOLUTE world-vector and updates `direction`.** `startDart` (`FishAI.ts:102-107`) multiplies by current `direction`; flee must NOT - it points straight away from the predator (`dx = fish.x - predator.x`, normalize, * FLEE_SPEED), or prey will flee *toward* the predator half the time. After setting the flee velocity, set `f.direction = dartVx >= 0 ? 1 : -1` so the sprite faces its travel direction (Diorama re-applies flipX from `direction` each frame at `:217`).

6. **Two passes for interactions, with precedence.** Pass 1: solo-move every fish. Pass 2: compute the schooler centroid from post-move positions, apply cohesion. A fish that is fleeing/darting (`dartMs > 0`) skips cohesion that tick. This makes results order-independent and tests deterministic.

## Workstreams (sequential - WS2 depends on WS1)

**Wave 0 (one-time):** create the integration branch off main: `git branch integrate/phase-2b-behaviors main`. Both feature branches base off it.

### WS1: Archetype foundation + solo motion

**Branch:** `feature/2b-archetypes` (off `integrate/phase-2b-behaviors`)

- `src/types/Fish.ts`: add
  ```typescript
  export type BehaviorType = 'schooler' | 'cruiser' | 'bottom-dweller' | 'drifter' | 'predator';
  ```
  add `behaviorType: BehaviorType` to `FishSpecies` and to `DisplayFish`.
- `src/data/fish.ts`: add `behaviorType` to all 28 species per the table above.
- `src/scenes/Diorama.ts`: in `spawnFishSprite` (the only DisplayFish creation site, ~line 130), set `behaviorType: species.behaviorType` on the new DisplayFish.
- `src/sim/behaviors.ts` (NEW): pure per-archetype steering + the constants block above. Each archetype is a pure function `(fish, state, dt, elapsedMs, bounds, rng)` that mutates x/y/direction the same dt-rate-independent way the current code does (note `elapsedMs` is required for the wobble sine). Keep the math out of FishAI so it is unit-testable.
- `src/sim/FishAI.ts`: dispatch on `fish.behaviorType` to the matching steering. **Cruiser must be byte-identical to the current loop** (regression gate). Bottom-dwellers use the band snap-clamp that REPLACES the generic y-clamp (keep the x-edge flip). Preserve dt-rate-independence and the `states` Map keyed by speciesId. `AIState` may gain a field if needed, but reuse `wobblePhase` for drifter bob.
- Tests: `src/sim/behaviors.test.ts` (NEW) - per-archetype pure tests (bottom-dweller snaps into and stays in the band over many ticks; drifter bob bounded + drifts slowly horizontally; predator net horizontal displacement over a full wobble period is less than a cruiser's - measure over many ticks, not one, so the wobble phase does not flip the comparison; schooler still drifts). **Add `behaviorType` to the `DisplayFish` literals in all THREE test files that have them: `src/sim/FishAI.test.ts:5` (`makeFish`), `src/ui/CoinFloater.test.ts:6` (`makeFish`), `src/scenes/Diorama.test.ts:42`** - all fail to typecheck once the field is required. FishAI.test.ts assertion VALUES stay unchanged (use `'cruiser'`); they are the regression gate.

**Acceptance:** typecheck + tests green; in `npm run dev`, each biome shows visibly different motion - crabs/flounder hug the floor, jellies/seahorse bob slowly, predators cruise, small fish dart. Shippable on its own.

### WS2: Inter-species interactions

**Branch:** `feature/2b-interactions` (off `integrate/phase-2b-behaviors`, after WS1 merges)

- `src/sim/behaviors.ts`: add pure `cohesion(fish, schoolerCentroid)` (steer toward centroid, gain `COHESION_GAIN`, capped at `COHESION_MAX_V`) and `flee(fish, predators)` (find nearest predator within `FLEE_RADIUS`; set an ABSOLUTE flee velocity away from it at `FLEE_SPEED` - NOT multiplied by current direction the way `startDart` is - and set `fish.direction` from the flee vx sign per mechanic #5).
- `src/sim/FishAI.ts`: rework `update()` into **two passes** (mechanic #6): pass 1 solo-moves every fish; pass 2 computes the schooler centroid from post-move positions, applies cohesion to schoolers and flee to non-predators. A fish with `dartMs > 0` (already darting/fleeing) skips cohesion that tick. Flee reuses the dart fields but with the absolute vector above.
- Tests: `behaviors.test.ts` - cohesion nudges a schooler toward a given centroid; flee pushes a prey fish to the side AWAY from the predator (assert the resulting velocity x-sign points away, and `direction` matches); a predator near prey is unaffected; a fish with no neighbors/predators is unchanged.

**Acceptance:** typecheck + tests green; in dev, small fish loosely group and visibly scatter when a predator (e.g. the shark in Abyss) drifts near; nothing disappears.

## Sequencing & build

WS1 then WS2 (WS2 depends on WS1's `behaviorType` + dispatch - not parallelizable). Integration branch `integrate/phase-2b-behaviors`. Recommend: build WS1, **playtest the solo archetypes**, then build WS2 (interactions are the riskier visual layer - worth seeing the foundation first). Bugcheck the merged result before the `integrate -> main` PR, same as Epic A.

## Risks

- **Still looks sparse/wrong at low density** - the constants are the real deliverable; expect a tuning pass in dev. Build the knobs to be easy to adjust.
- **Cohesion clumps schoolers into a blob** - keep the force weak and capped; cohesion radius optional (all-schoolers is fine at this count).
- **Bottom-band vs. the generic bounce fighting each other** - bottom-dwellers need their own clamp, not the standard one; spec it explicitly so the agent doesn't double-clamp.
- **Flee via dart re-entrancy** - a fish already darting shouldn't stack flee impulses; gate flee on `dartMs <= 0` or overwrite cleanly.
- Performance: neighbor scan is O(n^2) but n <= ~10 per biome - negligible.

## Notes

- `behaviorType` is a **required** field on both `FishSpecies` and `DisplayFish`. All 28 species literals in `fish.ts` must gain it in the same commit or the file will not compile. `DisplayFish` is render-only and **never serialized** (the save is `SaveStateV2`/`BiomeTankState`, fish counts only), so there is **no save migration** - safe to add as required.

## Out of scope (deferred / locked)

- Decorations: buying UI + fish-to-decoration hiding/perching - separate later epic.
- Predators eating prey - visual-only is locked.
- Boids-grade flocking - simple steering only.

## Changes from adversarial review (all incorporated)

- **(blocking)** Listed all three test files with `DisplayFish` literals (FishAI.test, CoinFloater.test, Diorama.test) - all break when `behaviorType` becomes required.
- **(blocking)** Behaviors signature now includes `elapsedMs` (the wobble sine needs it); cruiser path required byte-identical with the existing FishAI tests as the regression gate.
- **(blocking)** Bottom-dweller spec: `BOTTOM_BAND=120`, band clamp REPLACES the generic y-clamp, hard snap so arbitrarily-spawned bottom-dwellers reach the floor.
- **(should-fix)** Drifters get a small `DRIFTER_DRIFT` so `direction`/`flipX` does not freeze; flee uses an absolute world-vector (not `*direction`) and updates `direction` so prey faces away; cohesion runs in a two-pass loop with flee/dart precedence.
- **(should-fix)** Concrete starting values provided for every new constant.
- **(nice-to-have)** Added the create-`integrate/phase-2b-behaviors` step; predator-vs-cruiser speed test measured over a full wobble period, not one tick.

Review confirmed solid: the whole-array neighbor access, speciesId-keyed state, dt-rate-independence, and the 28-row archetype table (exact id/biome/scale match, predator escalation 0/2/3 by biome).
