# M3 Core Scenes - Fishtank Implementation Plan

## Context

M3 makes the tank actually playable. After M1 (foundation), M2 (sim + save), the engine ticks invisibly while a single procedural orange fish swims. M3 replaces that with the real game:

- Real sprites loaded from Pixel Gnome pack (the 28 species imported in M1)
- Fish rendered from `gameState.fishInstances` (one starter goldfish at first run)
- Swim AI (idle drift + occasional darting per ADR-0002)
- Per-tick coin earning hooked into the sim loop
- Coin counter HUD with K/M/B/T formatting per ADR-0005

After M3, the user starts with one goldfish that swims around earning coins. The coin counter ticks up in real time. M4 will add the shop to spend those coins on more fish.

Per the M3 ROADMAP section, this milestone covers: tank scene refactor, fish spawning from save state, swim AI, coin counter UI with K/M/B formatter, sprite import pipeline + per-tier scaling.

**Closes: TBD (M3.1-M3.5 issues created in setup step).**

## Repo state (post-M2)

- On main at `d2cb3b4` (M2 merged + deployed at mccarrison.me/fish)
- `src/sim/` has SimLoop, OfflineCatchup, VisibilityHandler; `src/save/` has Serializer, SaveStore, InitialState, Autosave; `src/util/` has earnRate, uuid
- `src/scenes/TankScene.ts` is still the M1 POC (procedural orange fish)
- `src/main.ts` wires sim+save but doesn't earn coins yet (no earn-tick handler) and doesn't drive fish AI
- `src/ui/` is empty (just stub README)
- 28 fish PNGs in `public/assets/fish/{freshwater,saltwater}/`, paths in `FISH_SPECIES` registry
- Vitest configured with jsdom env; 22 tests passing on main
- **M3 milestone exists but has zero issues filed**

## Strategy

**Setup step (orchestrator, before Wave 1):**
1. File 5 GitHub issues for M3.1-M3.5 in scottmccarrison/fishtank, attach to "M3: Core Scenes" milestone. Capture issue numbers for the PR body.
2. Create integration branch `integrate/m3-core-scenes` from main.

**Wave 1 (3 parallel agents):** Pure-logic modules with unit tests.
- WS1 - SpriteLoader helper (M3.1)
- WS2 - FishAI module (M3.3)
- WS3 - formatCoins util + CoinEarn handler (M3.4)

**Wave 2 (1 sequential agent):** Integration into TankScene + HUD + main.ts.
- WS4 - TankScene refactor + CoinCounter HUD + main.ts wiring (M3.2 + M3.5)

**Final PR:** `integrate/m3-core-scenes` -> `main`, title `M3: Core Scenes (closes <issue list>)`, auto-merge, deploy.

---

## Setup: File M3 issues (orchestrator does this directly)

For each of these issues, file with the exact form below. Capture the returned issue numbers (likely #24-#28); they go into the final PR body and commit messages.

```bash
gh issue create --repo scottmccarrison/fishtank \
  --milestone "M3: Core Scenes" \
  --label "area:scene" --label "type:infra" \
  --title "M3.1: Sprite preload pipeline + per-tier scaling" \
  --body "<body from below>"
```
Repeat per issue with appropriate labels/title/body.

**Issue M3.1: Sprite preload pipeline + per-tier scaling**
- Title: `M3.1: Sprite preload pipeline + per-tier scaling`
- Labels: `area:scene`, `type:infra`
- Body:
```
## Context
TankScene needs to load all 28 FISH_SPECIES textures into Phaser so the renderer can spawn any owned fish. M3 lays this pipeline; M4+ leans on it for new purchases.

## Acceptance criteria
- [ ] src/scenes/SpriteLoader.ts exports preloadFishSprites(scene: Phaser.Scene) that calls scene.load.image() for every entry in FISH_SPECIES
- [ ] Texture key = species.id (e.g., "goldfish", "clownfish")
- [ ] Asset URL = import.meta.env.BASE_URL + species.assetPath (so "/fish/assets/..." in prod, "/fish/assets/..." in dev)
- [ ] scale per species applied at spawn time (M3.2 consumes), not at preload
- [ ] tsc --noEmit passes
- [ ] npm test passes

## Dependencies
- M1.5 (FISH_SPECIES registry must exist)
```

**Issue M3.2: TankScene refactor with sprite-based fish spawning**
- Title: `M3.2: TankScene refactor with sprite-based fish spawning`
- Labels: `area:scene`
- Body:
```
## Context
Replace the M1 POC scene (one procedural orange fish) with a data-driven renderer that spawns one Phaser sprite per FishInstance in the save state.

## Acceptance criteria
- [ ] TankScene constructor accepts an init payload with getState/setState/simLoop so it can read state and subscribe to ticks
- [ ] preload() calls preloadFishSprites(this) from M3.1
- [ ] create() iterates getState().fishInstances and spawns one Phaser.GameObjects.Image per fish
  - position: instance.x, instance.y
  - texture: instance.speciesId (matches preload key)
  - scale: species.scale (look up via FISH_SPECIES by speciesId)
  - flipX: instance.direction === -1
- [ ] Sprites stored in a Map<instanceId, Image> on the scene for AI updates to find
- [ ] No procedural fish remains - the POC graphics code is removed
- [ ] Page renders one goldfish at first-run; the saved state with N fish renders N fish on reload

## Dependencies
- M3.1 (sprite preload)
- M3.3 (FishAI ticks update sprites)
```

**Issue M3.3: Fish swim AI (idle drift + occasional darting)**
- Title: `M3.3: Fish swim AI (idle drift + occasional darting)`
- Labels: `area:sim`
- Body:
```
## Context
Per ADR-0002, fish swim around the tank with simple AI (idle drift, occasional darting). Per ADR-0003, the sim runs at 5Hz; AI updates fish positions on each tick.

## Acceptance criteria
- [ ] src/sim/FishAI.ts exports a class or factory FishAI with:
  - constructor(opts: { tankWidth, tankHeight }) so dimensions aren't hardcoded
  - update(instances: FishInstance[], dt: number): void that mutates positions in place
- [ ] Drift: ~20 px/sec horizontal speed plus a sine-wave vertical wobble (~5 px amplitude, 4s period). Bounce off horizontal edges (with margin); flip direction.
- [ ] Dart: small per-tick probability (~0.5%) of starting a dart for 800ms at ~80 px/sec, random direction biased upward. Per-fish dart state is in-memory only (a Map<instanceId, AIState>) so it does NOT touch the save schema.
- [ ] Edge handling: position clamped to [margin, tankWidth - margin] x [margin, tankHeight - margin]; on collision, set instance.direction = sign change.
- [ ] Unit tests cover: drift moves position over multiple ticks; edge bounce flips direction; missing AIState gets initialized; dart eventually expires and returns to drift.

## Dependencies
- M1.3 (FishInstance type)
```

**Issue M3.4: formatCoins K/M/B/T util + per-tick coin earn handler**
- Title: `M3.4: formatCoins K/M/B/T util + per-tick coin earn handler`
- Labels: `area:ui`, `area:sim`
- Body:
```
## Context
Per ADR-0005, large coin totals display with K/M/B/T units. Also, M3 introduces the first real coin earning - each tick adds totalEarnRate * (dt/1000) to coinBalance.

## Acceptance criteria
- [ ] src/util/formatCoins.ts exports formatCoins(n: number): string
  - 0-999: integer string
  - 1,000+: "X.Y K" (one decimal)
  - 1,000,000+: "X.Y M"
  - 1,000,000,000+: "X.Y B"
  - 1,000,000,000,000+: "X.Y T"
  - Negative numbers: prefix "-" before unit
  - Strip trailing ".0" (e.g., "1 K" not "1.0 K")
- [ ] src/sim/CoinEarn.ts exports startCoinEarn(getState, setState, simLoop): unsubscribe
  - Tick handler computes earned = computeTotalEarnRate(fishInstances) * (dt / 1000)
  - Mutates coinBalance += earned and lifetimeEarned += earned
  - Uses the same accumulated-dt pattern as Autosave (CONSTANTS.SIM_TICK_MS per tick is fine; M2 set the precedent)
- [ ] Unit tests cover formatCoins boundary values; CoinEarn unit test asserts balance grows across ticks.

## Dependencies
- M2.5 (computeTotalEarnRate from earnRate.ts)
```

**Issue M3.5: Coin counter HUD overlay**
- Title: `M3.5: Coin counter HUD overlay`
- Labels: `area:ui`
- Body:
```
## Context
On-screen UI showing the current balance plus the current earn rate, updating live as the sim ticks.

## Acceptance criteria
- [ ] src/ui/CoinCounter.ts exports createCoinCounter(scene: Phaser.Scene, getState: () => SaveStateV1): { update(): void }
- [ ] Two Phaser.GameObjects.Text objects: balance ("123 coins"), rate ("12.4/s")
- [ ] Anchored top-left with ~16px margin, 20-24px font, white text with thin black outline for legibility on light tank backgrounds
- [ ] balance uses formatCoins(state.coinBalance)
- [ ] rate uses formatCoins(computeTotalEarnRate(state.fishInstances)) + "/s"
- [ ] update() refreshes both texts; TankScene calls it on every Phaser update() (60Hz). No flicker.
- [ ] Z-ordering: HUD on top of fish sprites.

## Dependencies
- M3.2 (TankScene exists to host the HUD)
- M3.4 (formatCoins util)
```

After all 5 issues file, store the numbers (e.g., #24, #25, #26, #27, #28) and use them in the PR body / commit messages below.

---

## Wave 1: Parallel (3 worktrees, 3 Sonnet agents)

### Workstream 1: SpriteLoader helper (M3.1)

**Worktree:** `../fishtank-ws1`
**Branch:** `feature/m3-spriteloader` off `integrate/m3-core-scenes`
**Commit message (substitute actual M3.1 issue number):**
```
M3.1: sprite preload pipeline

Adds src/scenes/SpriteLoader.ts. Iterates FISH_SPECIES and registers
load.image(speciesId, BASE_URL + assetPath) calls on the given scene.
Keys are species ids so spawn code can use the speciesId directly.
```

**Files to create:**

1. `src/scenes/SpriteLoader.ts`:
```typescript
import type Phaser from 'phaser';
import { FISH_SPECIES } from '../data/fish.js';

/**
 * Queue load.image calls for every FishSpecies sprite onto the scene's loader.
 *
 * Texture key = species.id (e.g., "goldfish"). Spawn code references the same id.
 * Asset URL = encodeURI(BASE_URL + assetPath). encodeURI is needed because the
 * Pixel Gnome pack uses filenames with spaces and hyphens (e.g. "Crab - Blue.png")
 * which some browsers refuse to fetch as raw URLs.
 *
 * Call this from Phaser.Scene.preload() so loading completes before create().
 */
export function preloadFishSprites(scene: Phaser.Scene): void {
  const base = import.meta.env.BASE_URL;
  for (const species of FISH_SPECIES) {
    scene.load.image(species.id, encodeURI(base + species.assetPath));
  }
}
```

**Verification:**
- `npm install`
- `npm run typecheck` passes (the import-only API has no logic to test in isolation, but type-check confirms the FISH_SPECIES contract resolves)
- `npm run build` succeeds
- `npm test` passes (existing 22 tests; this commit adds none)

---

### Workstream 2: FishAI (M3.3)

**Worktree:** `../fishtank-ws2`
**Branch:** `feature/m3-fishai` off `integrate/m3-core-scenes`
**Commit message:**
```
M3.3: FishAI swim behavior (drift + darting)

Adds src/sim/FishAI.ts. Per-tick mutation of FishInstance.x/y/direction.
Idle drift at ~20 px/sec with sine-wave vertical wobble; ~0.5% per-tick
chance of an 800ms upward-biased dart. Edge bounce reverses direction.
Per-fish dart state lives in an in-memory Map keyed by instance id -
it does NOT touch the save schema (still v1).
```

**Files to create:**

1. `src/sim/FishAI.ts`:
```typescript
import type { FishInstance } from '../types/Fish.js';

export interface FishAIOptions {
  tankWidth: number;
  tankHeight: number;
  /** Px from each edge that fish cannot enter. Default 32. */
  margin?: number;
  /** Inject a deterministic RNG for tests. Defaults to Math.random. */
  rng?: () => number;
}

interface AIState {
  driftSpeed: number; // px/sec
  /** Phase offset for the vertical wobble, radians. */
  wobblePhase: number;
  /** Remaining dart time in ms. 0 when not darting. */
  dartMs: number;
  /** Dart velocity, px/sec. */
  dartVx: number;
  dartVy: number;
}

const DRIFT_SPEED = 20; // px/sec
const WOBBLE_VEL_AMPLITUDE = 8; // px/sec peak vertical velocity
const WOBBLE_PERIOD_MS = 4000;
/** Per-second dart start probability. Scaled by dtSec inside update(). */
const DART_PROB_PER_SEC = 0.025; // ~once per 40s per fish
const DART_DURATION_MS = 800;
const DART_SPEED = 80; // px/sec
const DEFAULT_MARGIN = 32;

/**
 * Fish swim AI. Mutates FishInstance.x/y/direction each tick.
 * AI state (dart phase, wobble offset) lives in an in-memory Map keyed by
 * instance id; it does NOT touch the save schema. Reloading resets dart state.
 *
 * All probabilities and velocities are dt-rate-independent: this class is safe
 * to call at any update frequency (5Hz sim or 60Hz render).
 */
export class FishAI {
  private readonly width: number;
  private readonly height: number;
  private readonly margin: number;
  private readonly rng: () => number;
  private readonly states = new Map<string, AIState>();
  private elapsedMs = 0;

  constructor(opts: FishAIOptions) {
    this.width = opts.tankWidth;
    this.height = opts.tankHeight;
    this.margin = opts.margin ?? DEFAULT_MARGIN;
    this.rng = opts.rng ?? Math.random;
  }

  update(instances: FishInstance[], dt: number): void {
    this.elapsedMs += dt;
    const dtSec = dt / 1000;

    for (const fish of instances) {
      const state = this.ensureState(fish);

      if (state.dartMs > 0) {
        fish.x += state.dartVx * dtSec;
        fish.y += state.dartVy * dtSec;
        state.dartMs -= dt;
        if (state.dartMs <= 0) {
          state.dartMs = 0;
          state.dartVx = 0;
          state.dartVy = 0;
        }
      } else {
        // Horizontal drift.
        fish.x += state.driftSpeed * fish.direction * dtSec;

        // Vertical wobble - sine of a cosine-like velocity, integrated.
        const yVel =
          WOBBLE_VEL_AMPLITUDE *
          Math.sin(
            (2 * Math.PI * this.elapsedMs) / WOBBLE_PERIOD_MS + state.wobblePhase,
          );
        fish.y += yVel * dtSec;

        // Occasionally start a dart. Probability scaled by dt so the rate is
        // independent of update frequency.
        if (this.rng() < DART_PROB_PER_SEC * dtSec) {
          this.startDart(state, fish.direction);
        }
      }

      this.bounce(fish);
    }
  }

  private ensureState(fish: FishInstance): AIState {
    let s = this.states.get(fish.id);
    if (!s) {
      s = {
        driftSpeed: DRIFT_SPEED,
        wobblePhase: this.rng() * Math.PI * 2,
        dartMs: 0,
        dartVx: 0,
        dartVy: 0,
      };
      this.states.set(fish.id, s);
    }
    return s;
  }

  private startDart(state: AIState, direction: 1 | -1): void {
    // Random angle biased toward the upper hemisphere so fish appear to dart
    // up-and-forward more than straight horizontally.
    const angle = -Math.PI / 4 + (this.rng() - 0.5) * Math.PI;
    state.dartMs = DART_DURATION_MS;
    state.dartVx = Math.cos(angle) * DART_SPEED * direction;
    state.dartVy = Math.sin(angle) * DART_SPEED;
  }

  private bounce(fish: FishInstance): void {
    if (fish.x < this.margin) {
      fish.x = this.margin;
      fish.direction = 1;
    } else if (fish.x > this.width - this.margin) {
      fish.x = this.width - this.margin;
      fish.direction = -1;
    }
    if (fish.y < this.margin) fish.y = this.margin;
    if (fish.y > this.height - this.margin) fish.y = this.height - this.margin;
  }
}
```

2. `src/sim/FishAI.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { FishAI } from './FishAI.js';
import type { FishInstance } from '../types/Fish.js';

const makeFish = (overrides: Partial<FishInstance> = {}): FishInstance => ({
  id: 'fish-1',
  speciesId: 'goldfish',
  x: 400,
  y: 300,
  direction: 1,
  ownedAt: '2026-05-22T12:00:00.000Z',
  ...overrides,
});

/** rng that never triggers a dart and returns 0.5 for wobble phase. */
const stableRng = () => 0.5;

describe('FishAI', () => {
  it('drift moves position horizontally over time', () => {
    const ai = new FishAI({ tankWidth: 800, tankHeight: 600, rng: stableRng });
    const fish = makeFish();
    const startX = fish.x;
    ai.update([fish], 1000); // 1 second
    expect(fish.x).toBeGreaterThan(startX + 15);
    expect(fish.x).toBeLessThan(startX + 25);
  });

  it('bounces off right edge and flips direction', () => {
    const ai = new FishAI({ tankWidth: 800, tankHeight: 600, rng: stableRng });
    const fish = makeFish({ x: 790, direction: 1 });
    ai.update([fish], 1000);
    expect(fish.direction).toBe(-1);
    expect(fish.x).toBeLessThanOrEqual(800 - 32);
  });

  it('bounces off left edge and flips direction', () => {
    const ai = new FishAI({ tankWidth: 800, tankHeight: 600, rng: stableRng });
    const fish = makeFish({ x: 10, direction: -1 });
    ai.update([fish], 1000);
    expect(fish.direction).toBe(1);
    expect(fish.x).toBeGreaterThanOrEqual(32);
  });

  it('initializes AI state lazily for new fish', () => {
    const ai = new FishAI({ tankWidth: 800, tankHeight: 600, rng: stableRng });
    const fish1 = makeFish({ id: 'a' });
    const fish2 = makeFish({ id: 'b' });
    ai.update([fish1], 200);
    ai.update([fish1, fish2], 200);
    expect(fish1.x).not.toBe(400);
    expect(fish2.x).not.toBe(400);
  });

  it('respects custom margin', () => {
    const ai = new FishAI({ tankWidth: 800, tankHeight: 600, margin: 100, rng: stableRng });
    const fish = makeFish({ x: 90, direction: -1 });
    ai.update([fish], 200);
    expect(fish.x).toBeGreaterThanOrEqual(100);
    expect(fish.direction).toBe(1);
  });

  it('dart triggers when rng falls below the per-second probability', () => {
    // Sequence: first rng call (wobblePhase init) = 0.0, second (dart prob check) = 0.0
    // Dart prob check needs < (0.025 * dtSec) = 0.025 for 1s dt. rng=0 is below.
    let calls = 0;
    const rng = () => (calls++ < 2 ? 0 : 0.5); // 0 for first two, then 0.5
    const ai = new FishAI({ tankWidth: 800, tankHeight: 600, rng });
    const fish = makeFish();
    const startX = fish.x;
    ai.update([fish], 1000);
    // Dart velocity is 80 px/sec, drift would only give ~20 px - so fish moved more.
    // (Dart is biased upward but still has horizontal component for direction=1.)
    expect(Math.abs(fish.x - startX)).toBeGreaterThan(20);
  });
});
```

**Verification:**
- `npm install`
- `npm test -- FishAI` passes (all 6 cases - drift, right bounce, left bounce, lazy init, custom margin, dart trigger)
- `npm run typecheck` passes
- `npm run build` succeeds

---

### Workstream 3: formatCoins + CoinEarn (M3.4)

**Worktree:** `../fishtank-ws3`
**Branch:** `feature/m3-coins` off `integrate/m3-core-scenes`
**Commit message:**
```
M3.4: formatCoins K/M/B/T util + CoinEarn tick handler

Adds src/util/formatCoins.ts (per ADR-0005 display contract) and
src/sim/CoinEarn.ts (registers a tick handler that mutates coinBalance
and lifetimeEarned by totalEarnRate * dt). Unit tests cover boundary
values and multi-tick accumulation.
```

**Files to create:**

1. `src/util/formatCoins.ts`:
```typescript
/**
 * Display a coin total with K/M/B/T units per ADR-0005.
 *  - 0 exactly: "0"
 *  - 0 < n < 1: one decimal ("0.6") - needed so a fresh tank's earn rate is visible
 *  - 1 <= n < 1000: integer ("5", "999")
 *  - 1K+, 1M+, 1B+, 1T+: one decimal, trailing .0 stripped ("1 K", "1.5 K")
 *
 * Negative numbers prepend "-" before the formatted absolute value.
 */
export function formatCoins(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n < 0) return '-' + formatCoins(-n);
  if (n === 0) return '0';

  if (n < 1) {
    const s = n.toFixed(1);
    return s === '1.0' ? '1' : s; // 0.99 -> "1.0" -> "1" to avoid weird display
  }
  if (n < 1_000) return Math.floor(n).toString();
  if (n < 1_000_000) return strip(n / 1_000) + ' K';
  if (n < 1_000_000_000) return strip(n / 1_000_000) + ' M';
  if (n < 1_000_000_000_000) return strip(n / 1_000_000_000) + ' B';
  return strip(n / 1_000_000_000_000) + ' T';
}

function strip(value: number): string {
  const s = value.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}
```

2. `src/util/formatCoins.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { formatCoins } from './formatCoins.js';

describe('formatCoins', () => {
  it('formats 0 exactly', () => {
    expect(formatCoins(0)).toBe('0');
  });

  it('formats sub-1 with one decimal', () => {
    expect(formatCoins(0.5)).toBe('0.5');
    expect(formatCoins(0.556)).toBe('0.6');
    expect(formatCoins(0.999)).toBe('1'); // rounds up via toFixed, normalized
  });

  it('formats 1-999 as integer', () => {
    expect(formatCoins(1)).toBe('1');
    expect(formatCoins(999)).toBe('999');
    expect(formatCoins(123.7)).toBe('123');
  });

  it('formats thousands with K', () => {
    expect(formatCoins(1_000)).toBe('1 K');
    expect(formatCoins(1_500)).toBe('1.5 K');
    expect(formatCoins(12_345)).toBe('12.3 K');
    expect(formatCoins(999_900)).toBe('999.9 K');
  });

  it('formats millions with M', () => {
    expect(formatCoins(1_000_000)).toBe('1 M');
    expect(formatCoins(1_500_000)).toBe('1.5 M');
    expect(formatCoins(50_000_000)).toBe('50 M');
  });

  it('formats billions with B', () => {
    expect(formatCoins(1_000_000_000)).toBe('1 B');
    expect(formatCoins(2_500_000_000)).toBe('2.5 B');
  });

  it('formats trillions with T', () => {
    expect(formatCoins(1_000_000_000_000)).toBe('1 T');
    expect(formatCoins(9_999_000_000_000)).toBe('9999 T');
  });

  it('handles negatives', () => {
    expect(formatCoins(-5)).toBe('-5');
    expect(formatCoins(-1_500)).toBe('-1.5 K');
    expect(formatCoins(-1_000_000)).toBe('-1 M');
  });

  it('handles edge values', () => {
    expect(formatCoins(NaN)).toBe('0');
    expect(formatCoins(Infinity)).toBe('0');
  });
});
```

3. `src/sim/CoinEarn.ts`:
```typescript
import type { SaveStateV1 } from '../types/Save.js';
import type { SimLoop } from './SimLoop.js';
import { CONSTANTS } from '../data/constants.js';
import { computeTotalEarnRate } from '../util/earnRate.js';

/**
 * Register a per-tick coin earn handler. Each tick:
 *   earned = computeTotalEarnRate(fishInstances) * (SIM_TICK_MS / 1000)
 *   state.coinBalance += earned
 *   state.lifetimeEarned += earned
 *
 * Mutates the state object in place (consistent with the FishAI pattern).
 * Returns an unsubscribe function.
 *
 * Note: uses SIM_TICK_MS instead of raw dt for the same reason Autosave does -
 * vitest fake timers in jsdom don't advance performance.now reliably, and the
 * production sim is paused while the tab is hidden (so dt ~= SIM_TICK_MS anyway).
 */
export function startCoinEarn(
  getState: () => SaveStateV1,
  _setState: (s: SaveStateV1) => void,
  simLoop: SimLoop,
): () => void {
  const dtSec = CONSTANTS.SIM_TICK_MS / 1000;
  return simLoop.addTickHandler(() => {
    const state = getState();
    const rate = computeTotalEarnRate(state.fishInstances);
    const earned = rate * dtSec;
    state.coinBalance += earned;
    state.lifetimeEarned += earned;
  });
}
```

4. `src/sim/CoinEarn.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startCoinEarn } from './CoinEarn.js';
import { SimLoop } from './SimLoop.js';
import { CONSTANTS } from '../data/constants.js';
import type { SaveStateV1 } from '../types/Save.js';

const oneGoldfish = (): SaveStateV1 => ({
  version: 1,
  lastSavedAt: '2026-05-22T12:00:00.000Z',
  coinBalance: 0,
  lifetimeEarned: 0,
  fishInstances: [
    {
      id: 'g',
      speciesId: 'goldfish',
      x: 100,
      y: 100,
      direction: 1,
      ownedAt: '2026-05-22T12:00:00.000Z',
    },
  ],
  decorationInstances: [],
});

describe('CoinEarn', () => {
  let activeLoop: SimLoop | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    activeLoop?.stop();
    activeLoop = null;
    vi.useRealTimers();
  });

  it('accumulates coins across ticks', () => {
    const state = oneGoldfish();
    const loop = new SimLoop();
    activeLoop = loop;
    startCoinEarn(() => state, () => {}, loop);
    loop.start();

    // 5 ticks = 1 second of sim
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 5);
    // 1 goldfish at FIRST_FISH_COST/PAYBACK_SECONDS c/s = 0.556 c/s
    // 1 second of earning ~= 0.556 coins
    const expected = (CONSTANTS.FIRST_FISH_COST / CONSTANTS.PAYBACK_SECONDS);
    expect(state.coinBalance).toBeCloseTo(expected, 4);
    expect(state.lifetimeEarned).toBeCloseTo(expected, 4);
  });

  it('does not earn when no fish are owned', () => {
    const state: SaveStateV1 = { ...oneGoldfish(), fishInstances: [] };
    const loop = new SimLoop();
    activeLoop = loop;
    startCoinEarn(() => state, () => {}, loop);
    loop.start();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 10);
    expect(state.coinBalance).toBe(0);
  });

  it('unsubscribe stops further earning', () => {
    const state = oneGoldfish();
    const loop = new SimLoop();
    activeLoop = loop;
    const unsub = startCoinEarn(() => state, () => {}, loop);
    loop.start();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 5);
    const balanceAfter5 = state.coinBalance;
    unsub();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 50);
    expect(state.coinBalance).toBe(balanceAfter5);
  });
});
```

**Verification:**
- `npm install`
- `npm test -- formatCoins` passes (all 8 cases)
- `npm test -- CoinEarn` passes (all 3 cases)
- `npm run typecheck` passes
- `npm run build` succeeds

---

## Wave 2: Sequential (1 worktree, 1 Sonnet agent, after Wave 1 merges)

### Workstream 4: TankScene refactor + CoinCounter HUD + main.ts wiring (M3.2 + M3.5)

**Worktree:** `../fishtank-ws4` (off `integrate/m3-core-scenes` AFTER Wave 1 merges)
**Branch:** `feature/m3-integration` off `integrate/m3-core-scenes`
**Commit message:**
```
M3.2 + M3.5: TankScene refactor + CoinCounter HUD + main.ts wiring

- TankScene reads gameState.fishInstances and spawns one sprite per fish
  using SpriteLoader and FISH_SPECIES scale
- FishAI ticks via the scene's update() hook (every render frame)
- CoinCounter HUD: top-left text overlay, refreshes balance + rate each frame
- main.ts registers the CoinEarn tick handler and passes refs to TankScene
- Removes the M1 POC procedural fish
```

**Files to create / modify:**

1. **CREATE** `src/state.ts` (shared state singleton - resolves the scene auto-start race):
```typescript
import type { SaveStateV1 } from './types/Save.js';

/**
 * Process-wide singleton for the current game state. Eliminates the need to
 * thread getState/setState callbacks through every consumer (and importantly,
 * removes the Phaser scene init data race - scenes can read state at any point
 * in their lifecycle once main.ts has called setState).
 *
 * setState replaces the reference (used by Autosave, VisibilityHandler when
 * they produce new immutable state). FishAI / CoinEarn mutate in place.
 */
let current: SaveStateV1 | null = null;

export function setState(s: SaveStateV1): void {
  current = s;
}

export function getState(): SaveStateV1 {
  if (!current) {
    throw new Error('State not initialized - call setState() before reading');
  }
  return current;
}
```

2. **CREATE** `src/ui/CoinCounter.ts`:
```typescript
import type Phaser from 'phaser';
import type { SaveStateV1 } from '../types/Save.js';
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
  getState: () => SaveStateV1,
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
      const rate = computeTotalEarnRate(state.fishInstances);
      rateText.setText(`${formatCoins(rate)}/s`);
    },
  };
}
```

3. **REWRITE** `src/scenes/TankScene.ts` (full replacement):
```typescript
import Phaser from 'phaser';
import { preloadFishSprites } from './SpriteLoader.js';
import { FISH_SPECIES } from '../data/fish.js';
import { FishAI } from '../sim/FishAI.js';
import { createCoinCounter, type CoinCounter } from '../ui/CoinCounter.js';
import { getState } from '../state.js';

const SPECIES_BY_ID = new Map(FISH_SPECIES.map((s) => [s.id, s]));

const TANK_WIDTH = 800;
const TANK_HEIGHT = 600;
/** Pixel-art sprites are 16-32 px native; upscale 3x for visibility. */
const RENDER_SCALE_MULTIPLIER = 3;

/**
 * Renders fish from save state. State is read via the module singleton (src/state.ts)
 * so no init data is needed - the scene works correctly even when Phaser auto-starts it.
 *
 * FishAI runs in update() at render frequency (~60Hz) for smooth motion. Sim earning
 * and autosave run via SimLoop (5Hz, registered in main.ts).
 */
export class TankScene extends Phaser.Scene {
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  private fishAI = new FishAI({ tankWidth: TANK_WIDTH, tankHeight: TANK_HEIGHT });
  private coinCounter!: CoinCounter;

  constructor() {
    super('TankScene');
  }

  preload(): void {
    preloadFishSprites(this);
  }

  create(): void {
    this.coinCounter = createCoinCounter(this, getState);
    for (const fish of getState().fishInstances) {
      this.spawnSprite(fish);
    }
  }

  /** Phaser update is called every render frame. delta is ms since last frame. */
  update(_time: number, delta: number): void {
    const fishes = getState().fishInstances;

    // Spawn sprites for any new fish (M4 purchases land here)
    for (const fish of fishes) {
      if (!this.sprites.has(fish.id)) this.spawnSprite(fish);
    }

    // Update AI positions (mutates fish.x/y/direction in place)
    this.fishAI.update(fishes, delta);

    // Sync sprites to fish state
    for (const fish of fishes) {
      const sprite = this.sprites.get(fish.id);
      if (sprite) {
        sprite.setPosition(fish.x, fish.y);
        sprite.setFlipX(fish.direction === -1);
      }
    }

    this.coinCounter.update();
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

4. **REWRITE** `src/main.ts`:
```typescript
import Phaser from 'phaser';
import { TankScene } from './scenes/TankScene.js';
import { SimLoop } from './sim/SimLoop.js';
import { loadSave, writeSave } from './save/SaveStore.js';
import { createInitialState } from './save/InitialState.js';
import { startAutosave } from './save/Autosave.js';
import { applyCatchup } from './sim/OfflineCatchup.js';
import { registerVisibilityHandler } from './sim/VisibilityHandler.js';
import { startCoinEarn } from './sim/CoinEarn.js';
import { getState, setState } from './state.js';

// --- Load or initialize save state ---
let saved = loadSave();
if (saved === null) {
  saved = createInitialState();
  writeSave(saved);
  if (import.meta.env.DEV) {
    console.log('[init] no save - created fresh state, starter:', saved.fishInstances[0]?.speciesId);
  }
} else if (import.meta.env.DEV) {
  console.log('[init] loaded save with', saved.fishInstances.length, 'fish, balance', saved.coinBalance.toFixed(1));
}

// --- Apply offline catchup once on load ---
const catchup = applyCatchup(saved, new Date());
setState(catchup.newState);
writeSave(getState());
if (catchup.coinsEarned > 0 && import.meta.env.DEV) {
  console.log(
    `[catchup] +${catchup.coinsEarned.toFixed(1)} coins over ${(catchup.elapsedMs / 1000 / 60).toFixed(1)} min`,
  );
}

// --- Sim loop + handlers (state singleton already initialized; safe for scene to read) ---
const simLoop = new SimLoop();

startCoinEarn(getState, setState, simLoop);
startAutosave(getState, setState, simLoop);

registerVisibilityHandler({
  getState,
  setState,
  simLoop,
  onCatchup: ({ elapsedMs, coinsEarned }) => {
    if (coinsEarned > 0 && import.meta.env.DEV) {
      console.log(
        `[visible] +${coinsEarned.toFixed(1)} coins over ${(elapsedMs / 1000 / 60).toFixed(1)} min`,
      );
    }
  },
});

simLoop.start();

// --- Phaser game (scene auto-starts; reads state via the singleton) ---
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 800,
  height: 600,
  backgroundColor: '#2c7bd0',
  pixelArt: true,
  scene: [TankScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
```

5. **UPDATE** `src/sim/README.md` to add the new modules:
```
Simulation tick loop, AI, and offline catchup.

- `SimLoop` (M2.1): 5Hz tick, handler registry, start/stop. Per ADR-0003.
- `OfflineCatchup` (M2.5): timestamp-based catchup math, capped at 24h.
- `VisibilityHandler` (M2.6): pauses sim on tab hide, resumes + applies catchup on show.
- `FishAI` (M3.3): per-fish swim AI (idle drift + occasional darting).
- `CoinEarn` (M3.4): tick handler that adds totalEarnRate * dt to coinBalance.
```

6. **UPDATE** `src/util/README.md`:
```
Shared utilities.

- `uuid.ts` (M2.3): crypto.randomUUID wrapper.
- `earnRate.ts` (M2.5): instanceEarnRate, computeTotalEarnRate (closed-form).
- `formatCoins.ts` (M3.4): K/M/B/T display formatter per ADR-0005.

Pending:
- `lerp`, `clamp`, etc. - math helpers, added as needed.
```

7. **UPDATE** `src/ui/README.md`:
```
UI components.

- `CoinCounter.ts` (M3.5): top-left HUD showing balance and earn rate.

Pending (M4+):
- Shop panel
- Purchase confirmation
- Settings panel
- Welcome-back toast
```

**Verification:**
- `npm install`
- `npm run typecheck` passes
- `npm run build` succeeds
- `npm test` (full suite) passes - SimLoop, Serializer, OfflineCatchup, Autosave, FishAI, formatCoins, CoinEarn (32+ tests across 7 files)
- Manual smoke check via `npm run dev`:
  - On first load: one goldfish sprite appears, swims around, HUD shows "0 coins" / "0.6/s"
  - Wait 10 seconds: HUD updates to ~"5 coins" / "0.6/s", autosave logs `[autosave]`
  - Reload page: goldfish appears at saved position, balance reflects savings
  - Hide tab for 30s, return: HUD jumps by ~17 coins (0.556 c/s * 30s), `[visible]` log fires
  - Fish occasionally darts (low probability)
- `node scripts/verify-assets.mjs` reports OK (no regression)

---

## Integration

**Wave 1 -> Wave 2 gate (do not skip):**
```bash
git -C /home/scott/fishtank log integrate/m3-core-scenes --oneline -6
# Expect: M3.1, M3.3, M3.4 commits + earlier vitest setup (none here - M2 setup was on a different branch)
git -C /home/scott/fishtank ls-tree integrate/m3-core-scenes src/scenes/SpriteLoader.ts src/sim/FishAI.ts src/util/formatCoins.ts src/sim/CoinEarn.ts
# All four files must exist.
```

**After WS4 merges:**
1. From a fresh worktree pointing at `integrate/m3-core-scenes`:
   - `npm install`
   - `npm run typecheck`
   - `npm run build`
   - `npm test` (full suite green)
   - `node scripts/verify-assets.mjs`
   - `npm run dev` -> browser smoke (see WS4 verification list)
2. Copy plan to `docs/plans/m3-core-scenes.md` and commit ("docs: M3 core scenes plan")
3. `git push -u origin integrate/m3-core-scenes`
4. `gh pr create --base main --head integrate/m3-core-scenes --title "M3: Core Scenes (closes #<m3.1>-#<m3.5>)"` with body listing each Closes line for the 5 issues filed in setup.
5. `gh pr merge --auto --squash`
6. Clean up worktrees + branches (local + remote)
7. Deploy via `bash -c 'export NVM_DIR=$HOME/.nvm && \. "$NVM_DIR/nvm.sh" && nvm use 22 && npm run deploy'`

## Verification (post-merge, on main)

```bash
cd /home/scott/fishtank
git checkout main && git pull --ff-only
npm install
npm run typecheck   # passes
npm run build       # passes
npm test            # all tests green
npm run dev         # one goldfish swims, HUD ticks up
gh issue list --milestone "M3: Core Scenes" --state open   # empty
```

Live verification: visit https://mccarrison.me/fish/ and confirm the goldfish swims and the coin counter ticks up.

## Changes from adversarial review

- **Scene auto-start race fixed.** Removed the init-data pattern entirely. Added `src/state.ts` singleton with `setState`/`getState`; TankScene reads state via that import. main.ts calls `setState()` before `new Phaser.Game(config)`, so the scene's lifecycle hooks (init/preload/create/update) can read state safely whenever Phaser fires them.
- **FishAI dart probability is now per-second, scaled by dtSec.** `DART_PROB_PER_SEC = 0.025` * dt, so the dart rate is independent of update frequency (works at both 5Hz and 60Hz).
- **FishAI accepts an injectable rng** for deterministic tests. Defaults to Math.random.
- **FishAI wobble fixed.** Old formula (`(wobble * dt) / WOBBLE_PERIOD_MS`) was nonsensical; replaced with a sinusoidal vertical velocity (`WOBBLE_VEL_AMPLITUDE * sin(omega*t + phase)` integrated over dt) that produces actual visible wobble.
- **formatCoins handles sub-1 values with one decimal** so the earn rate displays as "0.6/s" on first load (one goldfish at 0.556 c/s). Whole numbers from 1-999 still render as integers.
- **SpriteLoader uses `encodeURI`** so asset paths with spaces and hyphens (e.g., "Crab - Blue.png") work in all browsers.
- **Sprite scale multiplier extracted** to `RENDER_SCALE_MULTIPLIER = 3` constant in TankScene.ts.
- **CoinEarn test cleans up SimLoop timers** via afterEach to avoid leaked intervals.
- **FishAI test rewritten** with rng injection - removed the brittle Math.random spy ordering. Six clean test cases.
- **Issue creation step has explicit `gh issue create` invocation** so the orchestrator has a copy-pastable command.
- **Save-derivability wording in Risks** clarified: only coin earning (CoinEarn in SimLoop) needs to be deterministic for offline catchup. AI animation is intentionally non-deterministic.

## Risks / Notes

- **AI runs in TankScene.update() at ~60Hz**, not in the SimLoop. This trades strict ADR-0003 fidelity for smoother visuals. Only coin earning (via CoinEarn in SimLoop) needs to be deterministic for offline catchup - AI position drift is animation polish.
- **Math.random in FishAI** for dart timing / wobble phase. Reload resets dart state but persistent fish.x/y means fish reappear roughly where they were. Acceptable for v1.
- **In-place mutation of FishInstance.x/y** by AI and CoinEarn handlers. Autosave's shallow spread (`{...state, lastSavedAt}`) reuses the fishInstances array reference, so mutations persist - intentional.
- **CoinEarn uses SIM_TICK_MS not raw dt** for the same reason Autosave did in M2.
- **`RENDER_SCALE_MULTIPLIER = 3`** because the Pixel Gnome sprites are 16-32 px native; 3x upscale is visible without blur.
- **No e2e DOM test for TankScene/CoinCounter.** Manual via `npm run dev` - Phaser doesn't play nicely with jsdom.
- **HUD uses Phaser text, not HTML/CSS.** Simpler integration; reuses Phaser's coordinate system; aligns with the pixel-art aesthetic.
