# M2 Sim and Save - Fishtank Implementation Plan

## Context

M2 is the invisible engine of the fishtank game. It introduces:
- A 5Hz sim tick (per ADR-0003)
- Save schema v1 (localStorage, JSON, with version field for migrations)
- Save/load functions + 10s autosave timer
- Offline catchup math (capped at 24h)
- Page Visibility integration (pause on hidden, resume + catchup on visible)
- First-run initial state (one free starter fish per ADR-0005)

After M2, the dev console will show ticks firing, autosaves committing, and offline catchup adding coins when you return - but the tank still renders the M1 POC scene (single procedural fish). M3 then replaces TankScene with sprite-driven rendering of the save state.

Closes #16, #17, #18, #19, #20, #21.

## Repo state (post-M1)

- On main at `5fc4063` (M1 merged, deployed to mccarrison.me/fish)
- `src/sim/`, `src/save/`, `src/util/` exist but only contain README stubs
- `src/types/{Fish,Biome,Decoration,Save}.ts` available
- `src/data/{constants,fish,biomes,decorations}.ts` available
- `src/main.ts` instantiates Phaser game; `src/scenes/TankScene.ts` draws POC fish (unchanged this milestone)
- tsconfig: `bundler` resolution, `allowImportingTsExtensions`, strict
- No test runner yet

## Strategy

**Setup step (orchestrator, before Wave 1):** Add Vitest to package.json + vite.config.ts so all Wave 1 agents start with a working `npm test`.

**Wave 1 (3 parallel agents):** Independent pure-logic modules.
- WS1 - SimLoop (M2.1)
- WS2 - Serializer + schema re-export (M2.2)
- WS3 - OfflineCatchup math + earnRate util (M2.5)

**Wave 2 (1 sequential agent):** Integration layer. Depends on Wave 1's outputs.
- WS4 - SaveStore + InitialState (M2.3) + Autosave (M2.4) + VisibilityHandler (M2.6) + uuid util + main.ts wire-up

**Integration branch:** `integrate/m2-sim-save`
**Final PR:** `integrate/m2-sim-save` -> `main`, title `M2: Sim and Save (closes #16-#21)`, auto-merge

---

## Setup: Add Vitest (orchestrator does this directly, single commit on integrate/m2-sim-save)

Update `package.json`:
- Add to `devDependencies`: `"vitest": "^2.1.0"`, `"jsdom": "^25.0.0"`
- Add to `scripts`: `"test": "vitest run"`, `"test:watch": "vitest"`

Update `vite.config.ts` to include a `test` block (Vitest extends Vite config). Replace existing config with:
```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/fish/',
  build: { target: 'es2022' },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    passWithNoTests: true,
  },
});
```

`environment: 'jsdom'` is chosen so the WS4 Autosave test can use a real localStorage (jsdom provides one). `passWithNoTests: true` lets the setup commit pass `npm test` even before any tests are added.

Run `npm install` to lock vitest + jsdom into package-lock.json. Commit message:
```
chore: add vitest for M2 tests

Establishes the test runner the M2 sim and save work depends on.
jsdom environment so localStorage tests work out of the box.
No tests yet - those land in the per-feature commits.
```

Verification: `npm test` runs and reports "No test files found" with exit code 0.

---

## Wave 1: Parallel (3 worktrees, 3 Sonnet agents)

### Workstream 1: SimLoop (closes #16)

**Worktree:** `../fishtank-ws1`
**Branch:** `feature/m2-simloop` off `integrate/m2-sim-save`
**Commit message:**
```
M2.1: SimLoop scaffold (5Hz tick, handler registry)

Adds src/sim/SimLoop.ts. setInterval-based per ADR-0003 (no Web Worker).
Handlers receive dt in ms. start/stop are idempotent. Unit test uses
vi.useFakeTimers() for deterministic verification.
```

**Files to create:**

1. `src/sim/SimLoop.ts`:
```typescript
import { CONSTANTS } from '../data/constants.js';

/** Function called on each sim tick. Receives elapsed time since last tick in ms. */
export type TickHandler = (dt: number) => void;

/**
 * 5Hz simulation tick loop per ADR-0003.
 * Main-thread setInterval (no Web Worker). Pauses cleanly via stop().
 */
export class SimLoop {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private handlers: TickHandler[] = [];
  private lastTickAt: number | null = null;

  /**
   * Start ticking. No-op if already running.
   *
   * Resets the dt baseline to now, so the gap between stop() and start()
   * is NOT credited via dt. That gap is handled separately by OfflineCatchup,
   * which uses lastSavedAt timestamps (not performance.now).
   */
  start(): void {
    if (this.intervalId !== null) return;
    this.lastTickAt = performance.now();
    this.intervalId = setInterval(() => this.tick(), CONSTANTS.SIM_TICK_MS);
  }

  /** Stop ticking. Handlers are preserved; call start() to resume. */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.lastTickAt = null;
  }

  /** True if the loop is currently ticking. */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Register a handler that runs on every tick.
   * Returns an unsubscribe function.
   */
  addTickHandler(fn: TickHandler): () => void {
    this.handlers.push(fn);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== fn);
    };
  }

  private tick(): void {
    const now = performance.now();
    const dt = this.lastTickAt !== null ? now - this.lastTickAt : CONSTANTS.SIM_TICK_MS;
    this.lastTickAt = now;
    for (const handler of this.handlers) {
      handler(dt);
    }
  }
}
```

2. `src/sim/SimLoop.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimLoop } from './SimLoop.js';
import { CONSTANTS } from '../data/constants.js';

describe('SimLoop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires handlers at SIM_TICK_MS intervals', () => {
    const loop = new SimLoop();
    const handler = vi.fn();
    loop.addTickHandler(handler);
    loop.start();

    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 5);
    expect(handler).toHaveBeenCalledTimes(5);
  });

  it('passes dt to handlers', () => {
    const loop = new SimLoop();
    const handler = vi.fn();
    loop.addTickHandler(handler);
    loop.start();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS);
    expect(handler).toHaveBeenCalledWith(expect.any(Number));
    const dt = handler.mock.calls[0]?.[0] as number;
    expect(dt).toBeGreaterThan(0);
  });

  it('start() is idempotent', () => {
    const loop = new SimLoop();
    const handler = vi.fn();
    loop.addTickHandler(handler);
    loop.start();
    loop.start();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('stop() halts ticks', () => {
    const loop = new SimLoop();
    const handler = vi.fn();
    loop.addTickHandler(handler);
    loop.start();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS);
    loop.stop();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 5);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('addTickHandler returns an unsubscribe function', () => {
    const loop = new SimLoop();
    const handler = vi.fn();
    const unsub = loop.addTickHandler(handler);
    loop.start();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS);
    unsub();
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 5);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('isRunning() reflects state', () => {
    const loop = new SimLoop();
    expect(loop.isRunning()).toBe(false);
    loop.start();
    expect(loop.isRunning()).toBe(true);
    loop.stop();
    expect(loop.isRunning()).toBe(false);
  });
});
```

3. Replace `src/sim/README.md` with:
```
Simulation tick loop and offline catchup.

- `SimLoop` (M2.1): 5Hz tick, handler registry, start/stop. Per ADR-0003.
- `OfflineCatchup` (M2.5): timestamp-based catchup math, capped at 24h.
- `VisibilityHandler` (M2.6): pauses sim on tab hide, resumes + applies catchup on show.
```

**Verification:**
- `npm install` first (each fresh worktree has its own node_modules)
- `npm test -- SimLoop` passes (all 6 cases)
- `npm run typecheck` passes
- `npm run build` succeeds

---

### Workstream 2: Serializer (closes #17)

**Worktree:** `../fishtank-ws2`
**Branch:** `feature/m2-serializer` off `integrate/m2-sim-save`
**Commit message:**
```
M2.2: save serializer with round-trip + malformed handling

Adds src/save/Serializer.ts (serialize/deserialize) and src/save/schema.ts
(re-export of SaveStateV1). deserialize returns null on any failure -
no exceptions cross the API boundary. Unit tests cover round-trip,
malformed JSON, missing version, unknown version.
```

**Files to create:**

1. `src/save/schema.ts`:
```typescript
/**
 * Save schema entry point. Re-exports the SaveStateV1 type from the central
 * types module so the save layer has a single import surface.
 */
export type { SaveStateV1 } from '../types/Save.js';
```

2. `src/save/Serializer.ts`:
```typescript
import type { SaveStateV1 } from '../types/Save.js';

/** Serialize a save state to a JSON string suitable for localStorage. */
export function serialize(state: SaveStateV1): string {
  return JSON.stringify(state);
}

/**
 * Parse a save state from JSON. Returns null on:
 *  - malformed JSON
 *  - non-object result
 *  - missing or unknown `version` field
 *
 * No exceptions escape this function. Callers can treat null as "start fresh".
 */
export function deserialize(json: string): SaveStateV1 | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as { version?: unknown };
  if (candidate.version !== 1) return null;
  // Minimal validation: structure shape is trusted from here. Add stronger
  // validation in M7 if real-world data corruption shows up.
  return parsed as SaveStateV1;
}
```

3. `src/save/Serializer.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { serialize, deserialize } from './Serializer.js';
import type { SaveStateV1 } from '../types/Save.js';

const sample: SaveStateV1 = {
  version: 1,
  lastSavedAt: '2026-05-22T14:00:00.000Z',
  coinBalance: 123.45,
  lifetimeEarned: 567.89,
  fishInstances: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      speciesId: 'goldfish',
      x: 100,
      y: 200,
      direction: 1,
      ownedAt: '2026-05-22T13:00:00.000Z',
    },
  ],
  decorationInstances: [
    {
      id: '00000000-0000-4000-8000-000000000002',
      speciesId: 'coral',
      x: 50,
      y: 550,
      placedAt: '2026-05-22T13:30:00.000Z',
    },
  ],
};

describe('Serializer', () => {
  it('round-trips a complete state', () => {
    const json = serialize(sample);
    const restored = deserialize(json);
    expect(restored).toEqual(sample);
  });

  it('round-trips an empty fish/decoration arrays state', () => {
    const empty: SaveStateV1 = { ...sample, fishInstances: [], decorationInstances: [] };
    expect(deserialize(serialize(empty))).toEqual(empty);
  });

  it('deserialize returns null on malformed JSON', () => {
    expect(deserialize('not json')).toBeNull();
    expect(deserialize('{')).toBeNull();
    expect(deserialize('')).toBeNull();
  });

  it('deserialize returns null on missing version', () => {
    const noVersion = JSON.stringify({ coinBalance: 0, fishInstances: [] });
    expect(deserialize(noVersion)).toBeNull();
  });

  it('deserialize returns null on unknown version', () => {
    const wrongVersion = JSON.stringify({ ...sample, version: 999 });
    expect(deserialize(wrongVersion)).toBeNull();
  });

  it('deserialize returns null on non-object root', () => {
    expect(deserialize('null')).toBeNull();
    expect(deserialize('42')).toBeNull();
    expect(deserialize('"string"')).toBeNull();
    expect(deserialize('[1,2,3]')).toBeNull();
  });
});
```

**Verification:**
- `npm install` first
- `npm test -- Serializer` passes (all 6 cases)
- `npm run typecheck` passes
- `npm run build` succeeds

---

### Workstream 3: OfflineCatchup + earnRate (closes #20)

**Worktree:** `../fishtank-ws3`
**Branch:** `feature/m2-catchup` off `integrate/m2-sim-save`
**Commit message:**
```
M2.5: offline catchup math (capped at 24h) + earn-rate helper

Adds src/sim/OfflineCatchup.ts (pure function: applyCatchup) and
src/util/earnRate.ts (instanceEarnRate, computeTotalEarnRate). Closed-form
math per ADR-0003. 24h cap enforced via min(). Returns a new state - never
mutates. Unit tests cover happy path, cap, no fish, future timestamp.
```

**Files to create:**

1. `src/util/earnRate.ts`:
```typescript
import type { FishInstance } from '../types/Fish.js';
import { FISH_SPECIES } from '../data/fish.js';
import { CONSTANTS } from '../data/constants.js';

/** Lookup table: species id -> species data. Computed once at module load. */
const SPECIES_BY_ID = new Map(FISH_SPECIES.map((s) => [s.id, s]));

/**
 * Coins/second produced by a single owned fish.
 * Per ADR-0005, within-biome earn rate scales by EARN_RATIO_IN_BIOME^costIndex.
 * Returns 0 for unknown speciesId (defensive against save corruption / migrations).
 */
export function instanceEarnRate(instance: FishInstance): number {
  const species = SPECIES_BY_ID.get(instance.speciesId);
  if (!species) return 0;
  return species.earnRateBase * Math.pow(CONSTANTS.EARN_RATIO_IN_BIOME, species.costIndex);
}

/** Sum of all owned fishes' earn rates. */
export function computeTotalEarnRate(instances: FishInstance[]): number {
  let total = 0;
  for (const inst of instances) total += instanceEarnRate(inst);
  return total;
}
```

2. `src/sim/OfflineCatchup.ts`:
```typescript
import type { SaveStateV1 } from '../types/Save.js';
import { CONSTANTS } from '../data/constants.js';
import { computeTotalEarnRate } from '../util/earnRate.js';

/** Result of applyCatchup. Exposed for UI welcome-back toast in M7. */
export interface CatchupResult {
  /** Updated save state with new coin balance and lastSavedAt. */
  newState: SaveStateV1;
  /** Time credited, in ms. Equals min(real elapsed, OFFLINE_CATCHUP_CAP_MS). */
  elapsedMs: number;
  /** Coins added in this catchup. */
  coinsEarned: number;
}

/**
 * Apply offline-progression catchup, per ADR-0003.
 *
 * Closed-form: coinsEarned = totalEarnRate(fishes) * (elapsedMs / 1000).
 * elapsedMs is capped at 24h. If lastSavedAt is in the future (clock skew,
 * timezone gymnastics), elapsed is clamped to 0 - never credit "negative" time.
 *
 * Returns a new immutable state. Does not mutate the input.
 */
export function applyCatchup(state: SaveStateV1, now: Date): CatchupResult {
  const lastSavedMs = new Date(state.lastSavedAt).getTime();
  const rawElapsed = now.getTime() - lastSavedMs;
  const elapsedMs = Math.max(0, Math.min(rawElapsed, CONSTANTS.OFFLINE_CATCHUP_CAP_MS));
  const ratePerSecond = computeTotalEarnRate(state.fishInstances);
  const coinsEarned = ratePerSecond * (elapsedMs / 1000);
  const newState: SaveStateV1 = {
    ...state,
    coinBalance: state.coinBalance + coinsEarned,
    lifetimeEarned: state.lifetimeEarned + coinsEarned,
    lastSavedAt: now.toISOString(),
  };
  return { newState, elapsedMs, coinsEarned };
}
```

3. `src/sim/OfflineCatchup.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { applyCatchup } from './OfflineCatchup.js';
import { CONSTANTS } from '../data/constants.js';
import type { SaveStateV1 } from '../types/Save.js';

const stateWithFish = (lastSavedAt: string, fishCount = 1): SaveStateV1 => ({
  version: 1,
  lastSavedAt,
  coinBalance: 100,
  lifetimeEarned: 100,
  fishInstances: Array.from({ length: fishCount }).map((_, idx) => ({
    id: `id-${idx}`,
    speciesId: 'goldfish',
    x: 0,
    y: 0,
    direction: 1 as const,
    ownedAt: lastSavedAt,
  })),
  decorationInstances: [],
});

const goldfishRate = CONSTANTS.FIRST_FISH_COST / CONSTANTS.PAYBACK_SECONDS; // 50/90 ~= 0.556 c/s

describe('applyCatchup', () => {
  it('credits coins linearly with elapsed time', () => {
    // Goldfish (Tide Pool costIndex 0) earnRateBase = 50/90 ~= 0.556 c/s.
    const state = stateWithFish('2026-05-22T12:00:00.000Z');
    const result = applyCatchup(state, new Date('2026-05-22T12:01:00.000Z')); // 60s
    expect(result.elapsedMs).toBe(60_000);
    // Earn rate ~= 0.556, so 60s ~= 33.3 coins
    expect(result.coinsEarned).toBeCloseTo(goldfishRate * 60, 5);
    expect(result.newState.coinBalance).toBeCloseTo(100 + result.coinsEarned, 5);
    expect(result.newState.lifetimeEarned).toBeCloseTo(100 + result.coinsEarned, 5);
    expect(result.newState.lastSavedAt).toBe('2026-05-22T12:01:00.000Z');
  });

  it('caps elapsed time at OFFLINE_CATCHUP_CAP_MS (24h)', () => {
    const state = stateWithFish('2026-05-20T12:00:00.000Z'); // 48h ago
    const result = applyCatchup(state, new Date('2026-05-22T12:00:00.000Z'));
    expect(result.elapsedMs).toBe(CONSTANTS.OFFLINE_CATCHUP_CAP_MS);
  });

  it('clamps elapsed to 0 on future lastSavedAt (clock skew)', () => {
    const state = stateWithFish('2026-05-22T13:00:00.000Z'); // 1h in future
    const result = applyCatchup(state, new Date('2026-05-22T12:00:00.000Z'));
    expect(result.elapsedMs).toBe(0);
    expect(result.coinsEarned).toBe(0);
    expect(result.newState.coinBalance).toBe(100);
  });

  it('returns 0 coins when no fish are owned', () => {
    const state: SaveStateV1 = { ...stateWithFish('2026-05-22T12:00:00.000Z'), fishInstances: [] };
    const result = applyCatchup(state, new Date('2026-05-22T12:01:00.000Z'));
    expect(result.elapsedMs).toBe(60_000);
    expect(result.coinsEarned).toBe(0);
    expect(result.newState.coinBalance).toBe(100);
  });

  it('scales linearly with fish count', () => {
    const one = applyCatchup(stateWithFish('2026-05-22T12:00:00.000Z', 1), new Date('2026-05-22T12:01:00.000Z'));
    const ten = applyCatchup(stateWithFish('2026-05-22T12:00:00.000Z', 10), new Date('2026-05-22T12:01:00.000Z'));
    expect(ten.coinsEarned).toBeCloseTo(one.coinsEarned * 10, 5);
  });

  it('does not mutate the input state', () => {
    const state = stateWithFish('2026-05-22T12:00:00.000Z');
    const before = JSON.stringify(state);
    applyCatchup(state, new Date('2026-05-22T12:05:00.000Z'));
    expect(JSON.stringify(state)).toBe(before);
  });

  it('ignores unknown speciesIds (defensive)', () => {
    const state: SaveStateV1 = {
      version: 1,
      lastSavedAt: '2026-05-22T12:00:00.000Z',
      coinBalance: 100,
      lifetimeEarned: 100,
      fishInstances: [{
        id: 'x',
        speciesId: 'mystery-fish',
        x: 0, y: 0, direction: 1, ownedAt: '2026-05-22T12:00:00.000Z',
      }],
      decorationInstances: [],
    };
    const result = applyCatchup(state, new Date('2026-05-22T12:01:00.000Z'));
    expect(result.coinsEarned).toBe(0);
  });
});
```

**Verification:**
- `npm install` first
- `npm test -- OfflineCatchup` passes (all 7 cases)
- `npm run typecheck` passes
- `npm run build` succeeds

---

## Wave 2: Sequential (1 worktree, 1 Sonnet agent, after Wave 1 merges)

### Workstream 4: SaveStore + Autosave + Visibility + main.ts wire-up (closes #18, #19, #21)

**Worktree:** `../fishtank-ws4` (created off `integrate/m2-sim-save` AFTER all 3 Wave 1 branches merge in)
**Branch:** `feature/m2-integration` off `integrate/m2-sim-save`
**Commit message:**
```
M2.3+M2.4+M2.6: SaveStore, InitialState, Autosave, Visibility + wire-up

- src/save/SaveStore.ts: loadSave/writeSave over localStorage
- src/save/InitialState.ts: createInitialState() with one starter fish
- src/save/Autosave.ts: startAutosave (10s tick), flushSave (immediate)
- src/sim/VisibilityHandler.ts: pause/flush on hidden, catchup/resume on visible
- src/util/uuid.ts: thin wrapper over crypto.randomUUID
- src/main.ts: load -> catchup -> sim.start, with autosave + visibility wired

No UI changes - TankScene still renders the POC fish. M3 replaces that.
Console logs show ticks, autosaves, and catchup math for dev visibility.
```

**Files to create:**

1. `src/util/uuid.ts`:
```typescript
/** UUID v4. Uses crypto.randomUUID (available in modern browsers and Node 19+). */
export function uuid(): string {
  return crypto.randomUUID();
}
```

2. `src/save/SaveStore.ts`:
```typescript
import type { SaveStateV1 } from '../types/Save.js';
import { CONSTANTS } from '../data/constants.js';
import { serialize, deserialize } from './Serializer.js';

/**
 * Load the saved state from localStorage. Returns null on:
 *  - missing key (first run)
 *  - localStorage unavailable (private mode in some browsers)
 *  - malformed/unknown-version payload
 */
export function loadSave(): SaveStateV1 | null {
  try {
    const raw = localStorage.getItem(CONSTANTS.SAVE_KEY);
    if (raw === null) return null;
    return deserialize(raw);
  } catch (e) {
    console.warn('[save] loadSave failed:', e);
    return null;
  }
}

/** Persist state to localStorage. Swallows errors (full quota, private mode). */
export function writeSave(state: SaveStateV1): void {
  try {
    localStorage.setItem(CONSTANTS.SAVE_KEY, serialize(state));
  } catch (e) {
    console.warn('[save] writeSave failed:', e);
  }
}
```

3. `src/save/InitialState.ts`:
```typescript
import type { SaveStateV1 } from '../types/Save.js';
import type { FishInstance } from '../types/Fish.js';
import { BIOMES } from '../data/biomes.js';
import { uuid } from '../util/uuid.js';

/**
 * First-run initial state per ADR-0004 / ADR-0005:
 *  - One free starter fish (first species in the Tide Pool list - goldfish).
 *  - 0 coins, 0 lifetime earned, no decorations.
 *  - Tank coordinates assume the 800x600 stage; rendered position is random
 *    within a margin so the starter doesn't spawn on the edge.
 */
export function createInitialState(): SaveStateV1 {
  const tidePool = BIOMES.find((b) => b.id === 'tide-pool');
  if (!tidePool) {
    throw new Error('Tide Pool biome missing - check src/data/biomes.ts');
  }
  const starterSpeciesId = tidePool.fishSpeciesIds[0];
  if (!starterSpeciesId) {
    throw new Error('Tide Pool has no species - check src/data/biomes.ts');
  }
  const now = new Date().toISOString();

  const starter: FishInstance = {
    id: uuid(),
    speciesId: starterSpeciesId,
    x: 100 + Math.floor(Math.random() * 600),
    y: 100 + Math.floor(Math.random() * 400),
    direction: Math.random() > 0.5 ? 1 : -1,
    ownedAt: now,
  };

  return {
    version: 1,
    lastSavedAt: now,
    coinBalance: 0,
    lifetimeEarned: 0,
    fishInstances: [starter],
    decorationInstances: [],
  };
}
```

4. `src/save/Autosave.ts`:
```typescript
import type { SaveStateV1 } from '../types/Save.js';
import type { SimLoop } from '../sim/SimLoop.js';
import { CONSTANTS } from '../data/constants.js';
import { writeSave } from './SaveStore.js';

/**
 * Register an autosave tick handler. Accumulates dt and flushes when
 * AUTOSAVE_INTERVAL_MS is reached. On flush:
 *   1. Build a new state with lastSavedAt = now
 *   2. setState(new) so in-memory ref advances too
 *   3. writeSave(new) persists
 *
 * Returns an unsubscribe function.
 */
export function startAutosave(
  getState: () => SaveStateV1,
  setState: (newState: SaveStateV1) => void,
  simLoop: SimLoop,
): () => void {
  let accumulatedMs = 0;
  return simLoop.addTickHandler((dt: number) => {
    accumulatedMs += dt;
    if (accumulatedMs >= CONSTANTS.AUTOSAVE_INTERVAL_MS) {
      accumulatedMs = 0;
      const updated: SaveStateV1 = {
        ...getState(),
        lastSavedAt: new Date().toISOString(),
      };
      setState(updated);
      writeSave(updated);
      if (import.meta.env.DEV) {
        console.log('[autosave]', updated.lastSavedAt, 'coins:', updated.coinBalance.toFixed(1));
      }
    }
  });
}

/**
 * Immediate save with refreshed lastSavedAt. Used by VisibilityHandler on
 * tab hide. Returns the updated state so the caller can sync its in-memory ref.
 *
 * The lastSavedAt advances to now even though no time-elapsed catchup happened -
 * this stamps "we paused here," so the next applyCatchup measures from hide-time.
 */
export function flushSave(state: SaveStateV1): SaveStateV1 {
  const updated: SaveStateV1 = { ...state, lastSavedAt: new Date().toISOString() };
  writeSave(updated);
  return updated;
}
```

5. `src/save/Autosave.test.ts` (minimal cadence test using jsdom localStorage + fake timers):
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startAutosave, flushSave } from './Autosave.js';
import { SimLoop } from '../sim/SimLoop.js';
import { CONSTANTS } from '../data/constants.js';
import type { SaveStateV1 } from '../types/Save.js';

const baseState: SaveStateV1 = {
  version: 1,
  lastSavedAt: '2026-05-22T12:00:00.000Z',
  coinBalance: 0,
  lifetimeEarned: 0,
  fishInstances: [],
  decorationInstances: [],
};

describe('Autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('writes to localStorage at AUTOSAVE_INTERVAL_MS cadence', () => {
    let state = { ...baseState };
    const loop = new SimLoop();
    startAutosave(
      () => state,
      (s) => {
        state = s;
      },
      loop,
    );
    loop.start();

    // Advance just under threshold - no save expected yet
    vi.advanceTimersByTime(CONSTANTS.AUTOSAVE_INTERVAL_MS - CONSTANTS.SIM_TICK_MS);
    expect(localStorage.getItem(CONSTANTS.SAVE_KEY)).toBeNull();

    // Cross the threshold - one save fires
    vi.advanceTimersByTime(CONSTANTS.SIM_TICK_MS * 2);
    const raw = localStorage.getItem(CONSTANTS.SAVE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(1);
  });

  it('flushSave persists immediately and advances lastSavedAt', () => {
    const before = '2026-05-22T12:00:00.000Z';
    const state: SaveStateV1 = { ...baseState, lastSavedAt: before };
    const updated = flushSave(state);
    expect(updated.lastSavedAt).not.toBe(before);
    expect(localStorage.getItem(CONSTANTS.SAVE_KEY)).not.toBeNull();
  });

  it('startAutosave returns an unsubscribe function', () => {
    let state = { ...baseState };
    const loop = new SimLoop();
    const unsub = startAutosave(
      () => state,
      (s) => {
        state = s;
      },
      loop,
    );
    loop.start();
    unsub();
    vi.advanceTimersByTime(CONSTANTS.AUTOSAVE_INTERVAL_MS * 3);
    expect(localStorage.getItem(CONSTANTS.SAVE_KEY)).toBeNull();
  });
});
```

6. `src/sim/VisibilityHandler.ts`:
```typescript
import type { SimLoop } from './SimLoop.js';
import type { SaveStateV1 } from '../types/Save.js';
import { applyCatchup, type CatchupResult } from './OfflineCatchup.js';
import { flushSave } from '../save/Autosave.js';

export interface VisibilityHandlerOptions {
  getState: () => SaveStateV1;
  setState: (newState: SaveStateV1) => void;
  simLoop: SimLoop;
  /** Optional - M7 wires this to the welcome-back toast. */
  onCatchup?: (result: { elapsedMs: number; coinsEarned: number }) => void;
}

/**
 * Pause sim + flush save when the tab is hidden.
 * Resume sim + apply catchup when the tab is visible again.
 *
 * Returns a cleanup function that removes the listener.
 */
export function registerVisibilityHandler(opts: VisibilityHandlerOptions): () => void {
  const handler = () => {
    if (document.visibilityState === 'hidden') {
      opts.simLoop.stop();
      const updated = flushSave(opts.getState());
      opts.setState(updated);
    } else if (document.visibilityState === 'visible') {
      const result: CatchupResult = applyCatchup(opts.getState(), new Date());
      opts.setState(result.newState);
      if (opts.onCatchup) {
        opts.onCatchup({ elapsedMs: result.elapsedMs, coinsEarned: result.coinsEarned });
      }
      opts.simLoop.start();
    }
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
```

7. Replace `src/save/README.md` with:
```
Save layer: schema, serializer, store, initial state, autosave.

- `schema.ts` (M2.2): re-export of SaveStateV1.
- `Serializer.ts` (M2.2): serialize / deserialize (returns null on failure).
- `SaveStore.ts` (M2.3): localStorage wrappers using CONSTANTS.SAVE_KEY.
- `InitialState.ts` (M2.3): createInitialState() for first run.
- `Autosave.ts` (M2.4): startAutosave (registers tick handler) + flushSave (immediate).
```

8. Replace `src/util/README.md` with:
```
Shared utilities.

- `uuid.ts` (M2.3): crypto.randomUUID wrapper.
- `earnRate.ts` (M2.5): instanceEarnRate, computeTotalEarnRate (closed-form).

Pending:
- `formatCoins(n: number): string` - K/M/B/T formatter per ADR-0005. Lands in M3.
- `lerp`, `clamp`, etc. - math helpers, added as needed.
```

9. Replace `src/main.ts` with:
```typescript
import Phaser from 'phaser';
import { TankScene } from './scenes/TankScene.js';
import { SimLoop } from './sim/SimLoop.js';
import { loadSave, writeSave } from './save/SaveStore.js';
import { createInitialState } from './save/InitialState.js';
import { startAutosave } from './save/Autosave.js';
import { applyCatchup } from './sim/OfflineCatchup.js';
import { registerVisibilityHandler } from './sim/VisibilityHandler.js';
import type { SaveStateV1 } from './types/Save.js';

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
// Note: visibilitychange does NOT fire on initial load - this is the only place
// load-time catchup runs. The visibility handler covers subsequent hide/show transitions.
const catchup = applyCatchup(saved, new Date());
let gameState: SaveStateV1 = catchup.newState;
writeSave(gameState);
if (catchup.coinsEarned > 0 && import.meta.env.DEV) {
  console.log(
    `[catchup] +${catchup.coinsEarned.toFixed(1)} coins over ${(catchup.elapsedMs / 1000 / 60).toFixed(1)} min`,
  );
}

// --- Start sim loop + register handlers ---
const simLoop = new SimLoop();

const setGameState = (s: SaveStateV1) => {
  gameState = s;
};

startAutosave(() => gameState, setGameState, simLoop);

registerVisibilityHandler({
  getState: () => gameState,
  setState: setGameState,
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

// --- Phaser game (POC scene; M3 replaces this with save-driven rendering) ---
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

**Verification:**
- `npm install` first
- `npm run typecheck` passes
- `npm run build` succeeds
- `npm test` (full suite) passes - SimLoop, Serializer, OfflineCatchup, Autosave test files all green
- Manual smoke check via `npm run dev`:
  - First load: console shows `[init] no save found ... goldfish`, `[catchup] 0` (or no catchup line since elapsed is ~0)
  - localStorage has `fishtank.save.v1` populated
  - Wait 10s: `[autosave]` line appears
  - Hide tab (Cmd-Tab): `[autosave]` fires from flushSave (or just silent if dt < 10s)
  - Show tab after ~30s away: `[visible] +N coins over X min`
  - POC orange fish still swims (TankScene unchanged)
- `node scripts/verify-assets.mjs` still reports OK (no regression)

---

## Integration

**Wave 1 -> Wave 2 gate (do not skip):**
```bash
git -C /home/scott/fishtank log integrate/m2-sim-save --oneline -6
# Expect: chore(vitest), M2.1, M2.2, M2.5 (any order), all on integration branch.
git -C /home/scott/fishtank ls-tree integrate/m2-sim-save src/sim/SimLoop.ts src/save/Serializer.ts src/sim/OfflineCatchup.ts src/util/earnRate.ts
# All four files must exist.
```

**After WS4 merges:**
1. From a fresh worktree pointing at `integrate/m2-sim-save`:
   - `npm install`
   - `npm run typecheck`
   - `npm run build`
   - `npm test` (full suite green)
   - `node scripts/verify-assets.mjs` (no regression)
   - `npm run dev` -> open browser, watch console for `[init]`, `[autosave]`, `[visible]` lines. Confirm POC fish renders.
2. Copy plan to `docs/plans/m2-sim-save.md` and commit ("docs: M2 sim and save plan")
3. `git push -u origin integrate/m2-sim-save`
4. `gh pr create --base main --head integrate/m2-sim-save --title "M2: Sim and Save (closes #16-#21)"`. Body lists Closes for #16, #17, #18, #19, #20, #21.
5. `gh pr merge --auto --squash`
6. Clean up worktrees + branches (local + remote).

## Verification (post-merge, on main)

```bash
cd /home/scott/fishtank
git checkout main && git pull --ff-only
npm install
npm run typecheck   # passes
npm run build       # passes
npm test            # all tests green
npm run dev         # console shows [init]/[autosave]/[catchup]; POC fish renders
gh issue list --milestone "M2: Sim and Save" --state open   # empty
```

Deploy with: `bash -c 'export NVM_DIR=$HOME/.nvm && \. "$NVM_DIR/nvm.sh" && nvm use 22 && npm run deploy'`

## Changes from adversarial review

- **Vitest environment switched to `jsdom`** so Autosave tests can use a real localStorage.
- **`jsdom` added to devDeps** alongside vitest.
- **`passWithNoTests: true`** in vitest config so the setup commit can pass `npm test` before tests exist.
- **WS3 test** computes expected coins from CONSTANTS rather than hardcoded `50/90` so future tuning doesn't fail tests for the wrong reason.
- **WS3 test** uses `.map((_, idx) => ...)` instead of `Array.from((_, i) => ...)` to satisfy `noUnusedParameters`.
- **Autosave API** changed: `setLastSavedAt(iso)` -> `setState(newState)`. Symmetric with VisibilityHandler; eliminates the two-step state mutation pattern.
- **Added `Autosave.test.ts`** to WS4 with three minimal cases: cadence, flushSave behavior, unsubscribe.
- **`npm install` step** explicit in every workstream's verification (each fresh worktree gets its own node_modules).
- **`console.log` calls** in main.ts + Autosave gated behind `import.meta.env.DEV` so prod bundles stay quiet.
- **SimLoop.start() comment** explains why resetting `lastTickAt` is intentional (OfflineCatchup handles the gap via timestamps).
- **main.ts comment** notes that load-time catchup is the only place the catchup runs on startup (visibilitychange does not fire on initial load).

## Risks / Notes

- **localStorage availability.** Private/incognito browsers may disable it. `loadSave`/`writeSave` swallow errors and log a warning; the game falls back to in-memory state.
- **Clock skew.** If `lastSavedAt` ends up in the future (user changed system clock), `applyCatchup` clamps to 0 instead of crediting negative time.
- **performance.now() vs Date.now().** SimLoop uses `performance.now()` for dt precision; OfflineCatchup uses `Date.now()` (via `new Date()`) because it persists across reloads. This is intentional.
- **No e2e test for SimLoop in browser.** vi.useFakeTimers covers logic; real-timing variance is observed manually via dev server.
- **Autosave throttle.** Accumulated-dt approach handles slow ticks gracefully (tab throttling produces longer dt; we still save at the right wall-clock cadence).
- **Earn-rate scaling formula.** Within-biome only. Biome-step scaling happens at the species level (REEF_BASE etc. were precomputed in M1). Once M3+ adds the biome-step multiplier at runtime, revisit `instanceEarnRate`.
