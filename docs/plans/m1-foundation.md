# M1 Foundation - Fishtank Implementation Plan

## Context

Phase 1 of the fishtank idle game (mccarrison.me/fish) begins with M1: Foundation. This milestone scaffolds the project structure, imports the Pixel Gnome Fishing Pack assets, and defines the core TypeScript types, constants, and data registries that every subsequent milestone (M2-M7) depends on.

No gameplay changes here. The existing POC (single procedurally-drawn orange fish) keeps working unchanged. After this PR, the repo has all the building blocks for M2 (Sim and Save) to start immediately.

Closes #11, #12, #13, #14, #15.

## Repo state

- Branch: `main`, working tree clean, 10 commits ahead of initial scaffold
- Current `src/`: just `main.ts` and `scenes/TankScene.ts` (procedural fish demo)
- No `public/` directory yet
- Pixel Gnome assets live at `/tmp/fishpack/Pixel Gnome Fishing Pack/` (Fresh Water/, Salt Water/, Misc/, plus root spritesheets)
- ADR-0005 numeric model is locked: 50 coin start, 1.4x within-biome, 15x biome step, 90s payback, 1.16x earn ratio
- `docs/assets.md` documents the biome mapping (Tide Pool, Open Reef, Abyss)

## Strategy

Three workstreams in parallel (Wave 1), then one sequential workstream (Wave 2) that depends on them, then a single integration PR. This is significantly faster than serial execution and matches the /execute pattern.

**Integration branch:** `integrate/m1-foundation` (created up front from main; each workstream branches off this).

**Final PR:** `integrate/m1-foundation` -> `main`, title `M1: Foundation (closes #11-#15)`, auto-merge.

---

## Wave 1: Parallel (3 worktrees, 3 Sonnet agents)

### Workstream 1: Structure + Assets (closes #11, #12)

**Worktree:** `../fishtank-ws1`
**Branch (off `integrate/m1-foundation`):** `feature/m1-structure-assets`
**Commit message:**
```
M1.1+M1.2: scaffold src/ modules and import Pixel Gnome assets

- Create src/sim/, src/save/, src/ui/, src/util/ with README stubs
- Create src/types/ and src/data/ directories (other workstreams populate)
- Import 50 fish + 10 decoration PNGs (with outline variants) under public/assets/
- Add CREDITS.md attributing Pixel Gnome (CC-BY 4.0)
```

**Files to create:**

1. `src/sim/README.md` - one line: `Simulation tick loop and game state engine. Populated in M2.`
2. `src/save/README.md` - one line: `Save/load, schema migrations, autosave timer. Populated in M2.`
3. `src/ui/README.md` - one line: `UI components (shop, coin counter, settings, toasts). Populated in M3+.`
4. `src/util/README.md`:
    ```
    Shared utilities.

    Pending implementations:
    - `formatCoins(n: number): string` - K/M/B/T formatter per ADR-0005. Lands in M3 alongside coin counter UI.
    - `uuid(): string` - UUID v4 for FishInstance.id / DecorationInstance.id. Lands in M2 alongside save schema work.
    - `lerp`, `clamp`, etc. - math helpers, added as needed.
    ```
5. `src/types/.gitkeep` - empty file (WS2 fills this directory)
6. `src/data/.gitkeep` - empty file (WS3, WS4 fill this directory)
7. `public/assets/fish/freshwater/*.png` - copy all 30 PNGs from `/tmp/fishpack/Pixel Gnome Fishing Pack/Fresh Water/`
8. `public/assets/fish/saltwater/*.png` - copy all 50 PNGs from `/tmp/fishpack/Pixel Gnome Fishing Pack/Salt Water/`
9. `public/assets/decorations/*.png` - copy all 20 PNGs from `/tmp/fishpack/Pixel Gnome Fishing Pack/Misc/`
10. `public/assets/fish/All Fish.png`, `All Fish Outlined.png`, `All Fish x1000.png`, `All Fish x1000 Outlined.png` - copy 4 spritesheets from `/tmp/fishpack/Pixel Gnome Fishing Pack/`
11. `CREDITS.md` at repo root:
    ```markdown
    # Credits

    ## Art
    - **Pixel Gnome Fishing Pack** by Pixel Gnome - https://pixelgnome.itch.io/fish
      - License: CC-BY 4.0
      - Used for all fish and decoration sprites
    ```

**Verification:**
- `find public/assets -name "*.png" | wc -l` returns 104
- `npm run build` succeeds
- `npm run dev` launches and shows the existing POC scene unchanged
- `npm run typecheck` passes
- `ls src/sim src/save src/ui src/util src/types src/data` lists all six new directories with at least one file each

---

### Workstream 2: TypeScript Types (closes #13)

**Worktree:** `../fishtank-ws2`
**Branch (off `integrate/m1-foundation`):** `feature/m1-types`
**Commit message:**
```
M1.3: define core types (Fish, Biome, Decoration, Save)

Add typed shapes for fish species/instances, biomes, decorations,
and the v1 save schema. JSDoc on every field. Matches ADR-0005.
```

**Files to create:**

1. `src/types/Fish.ts`:
   ```typescript
   /** Static definition of a fish species - one entry per unique creature. */
   export interface FishSpecies {
     /** Stable identifier, kebab-case, used in save state. */
     id: string;
     /** Display name shown in shop and collection log. */
     name: string;
     /** Which biome this fish belongs to (matches Biome.id). */
     biomeId: string;
     /** Position in the biome's purchase order (0-indexed). Determines cost via CONSTANTS. */
     costIndex: number;
     /** Earn-rate baseline at purchase time, coins/second. Per-instance rate scales with biome and costIndex. */
     earnRateBase: number;
     /** Render scale multiplier (1.0 = native pixel size). Larger fish in later tiers visually communicate progression. */
     scale: number;
     /**
      * Path relative to public/, e.g. "assets/fish/saltwater/Clownfish.png".
      * Vite serves public/ at the base URL (`/fish/` in production). Loaders must
      * prefix `import.meta.env.BASE_URL` before passing to Phaser. The leading
      * slash is intentionally omitted so the prefix is unambiguous.
      */
     assetPath: string;
   }

   /** Owned fish instance in the player's tank. Many can exist per species. */
   export interface FishInstance {
     /** Unique instance ID (UUID v4). */
     id: string;
     /** References FishSpecies.id. */
     speciesId: string;
     /** Current x in tank coords. */
     x: number;
     /** Current y in tank coords. */
     y: number;
     /** 1 = swimming right, -1 = swimming left. */
     direction: 1 | -1;
     /** ISO timestamp of purchase. */
     ownedAt: string;
   }
   ```

2. `src/types/Biome.ts`:
   ```typescript
   /** A biome groups fish species and gates progression. */
   export interface Biome {
     /** Stable identifier, e.g. "tide-pool". */
     id: string;
     /** Display name. */
     name: string;
     /** Species in this biome, in purchase order. */
     fishSpeciesIds: string[];
     /** Cost (in coins) of the first fish in this biome. Implicit unlock gate per ADR-0005. */
     unlockThreshold: number;
     /** Background gradient top color, hex string. */
     gradientFrom: string;
     /** Background gradient bottom color, hex string. */
     gradientTo: string;
   }
   ```

3. `src/types/Decoration.ts`:
   ```typescript
   /** Static decoration definition (e.g., coral, seashell). */
   export interface DecorationSpecies {
     /** Stable identifier, kebab-case. */
     id: string;
     /** Display name. */
     name: string;
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

4. `src/types/Save.ts`:
   ```typescript
   import type { FishInstance } from './Fish.js';
   import type { DecorationInstance } from './Decoration.js';

   /** v1 save schema. version field exists so migrations can dispatch. */
   export interface SaveStateV1 {
     /** Schema version. v1 = first published shape. */
     version: 1;
     /** ISO timestamp of last save (used for offline-catchup math). */
     lastSavedAt: string;
     /** Current coin balance. */
     coinBalance: number;
     /** Lifetime coins earned (for stats/achievements). */
     lifetimeEarned: number;
     /** All owned fish instances. */
     fishInstances: FishInstance[];
     /** All placed decoration instances. */
     decorationInstances: DecorationInstance[];
   }
   ```

**Verification:**
- `npx tsc --noEmit` passes
- `npm run typecheck` passes
- Each file imports successfully when referenced from a temp file

---

### Workstream 3: Constants Module (closes #14)

**Worktree:** `../fishtank-ws3`
**Branch (off `integrate/m1-foundation`):** `feature/m1-constants`
**Commit message:**
```
M1.4: add CONSTANTS module from ADR-0005

Centralize sim rate, save key, autosave interval, and the locked
numeric model (cost/earn ratios, biome step, payback seconds).
```

**Files to create:**

1. `src/data/constants.ts`:
   ```typescript
   /**
    * Locked numeric model from ADR-0005 and sim parameters from ADR-0003.
    * Tuning happens here; every consumer reads from this object.
    */
   export const CONSTANTS = {
     // --- Sim loop (ADR-0003) ---
     /** Sim tick rate in Hz. */
     SIM_TICK_HZ: 5,
     /** Sim tick interval in ms. */
     SIM_TICK_MS: 200,
     /** Maximum offline time we will credit (24h). */
     OFFLINE_CATCHUP_CAP_MS: 24 * 60 * 60 * 1000,

     // --- Save (M2) ---
     /** localStorage key for v1 save. */
     SAVE_KEY: 'fishtank.save.v1',
     /** Autosave cadence in ms. */
     AUTOSAVE_INTERVAL_MS: 10000,

     // --- Economy (ADR-0005) ---
     /** Cost of the very first fish, in coins. */
     FIRST_FISH_COST: 50,
     /** Multiplicative cost step between sequential fish within a biome. */
     COST_RATIO_IN_BIOME: 1.4,
     /** Multiplicative cost step at biome transitions. */
     BIOME_COST_STEP: 15,
     /** Multiplicative earn-rate step between sequential fish within a biome. */
     EARN_RATIO_IN_BIOME: 1.16,
     /** Multiplicative earn-rate step at biome transitions. */
     BIOME_EARN_STEP: 15,
     /** Target payback time at purchase, in seconds. */
     PAYBACK_SECONDS: 90,
   } as const;

   /** Type alias for the constants object - allows precise typing of consumers. */
   export type Constants = typeof CONSTANTS;
   ```

**Verification:**
- `npx tsc --noEmit` passes
- Importing `CONSTANTS` from another file gives precise literal types (e.g., `CONSTANTS.SIM_TICK_HZ` has type `5`, not `number`)

---

## Wave 2: Sequential (1 worktree, 1 Sonnet agent, after Wave 1 merges)

### Workstream 4: Data Registries (closes #15)

**Worktree:** `../fishtank-ws4` (created from `integrate/m1-foundation` AFTER WS1, WS2, WS3 are merged in)
**Branch (off `integrate/m1-foundation`):** `feature/m1-registries`
**Commit message (one commit covers the registry + the ADR amendment + the gitkeep cleanup):**
```
M1.5: define fish/biome/decoration registries + ADR-0005 amendment

- Add FISH_SPECIES, BIOMES, DECORATIONS registries
- Derive biome unlock thresholds from CONSTANTS (no hardcoded numbers)
- Amend ADR-0005: last Tide Pool cost is ~1033, not ~715, under the
  10-purchasable starter model locked 2026-05-22.
- Remove src/types/.gitkeep and src/data/.gitkeep now that the
  directories have real content.
- Add scripts/verify-assets.mjs sanity check.
```

**Files to create:**

1. `src/data/biomes.ts`:
   ```typescript
   import type { Biome } from '../types/Biome.js';
   import { CONSTANTS } from './constants.js';

   /**
    * Last cost in a biome = FIRST_FISH_COST * COST_RATIO_IN_BIOME^(speciesCount - 1).
    * Next biome's first cost = previous biome's last cost * BIOME_COST_STEP.
    * Tide Pool is always unlocked (threshold = 0).
    *
    * These are derived from CONSTANTS rather than hardcoded so a tuning change
    * in constants.ts automatically propagates here.
    */
   const TIDE_POOL_COUNT = 10;
   const OPEN_REEF_COUNT = 10;
   const tidePoolLastCost =
     CONSTANTS.FIRST_FISH_COST *
     Math.pow(CONSTANTS.COST_RATIO_IN_BIOME, TIDE_POOL_COUNT - 1);
   const reefFirstCost = tidePoolLastCost * CONSTANTS.BIOME_COST_STEP;
   const reefLastCost =
     reefFirstCost *
     Math.pow(CONSTANTS.COST_RATIO_IN_BIOME, OPEN_REEF_COUNT - 1);
   const abyssFirstCost = reefLastCost * CONSTANTS.BIOME_COST_STEP;

   export const BIOMES: Biome[] = [
     {
       id: 'tide-pool',
       name: 'Tide Pool',
       fishSpeciesIds: [
         'goldfish', 'guppy', 'neon-tetra', 'clownfish', 'seahorse',
         'starfish', 'shrimp', 'pufferfish', 'crab-blue', 'crab-king',
       ],
       unlockThreshold: 0,
       gradientFrom: '#7ec8e3',
       gradientTo: '#2c7bd0',
     },
     {
       id: 'open-reef',
       name: 'Open Reef',
       fishSpeciesIds: [
         'purple-tang', 'yellow-tang', 'surgeonfish', 'napoleon-wrasse', 'blue-groper',
         'moray-eel', 'ribbon-eel', 'jellyfish', 'flounder', 'stingray',
       ],
       unlockThreshold: Math.round(reefFirstCost),
       gradientFrom: '#1a5e9e',
       gradientTo: '#0d3a6b',
     },
     {
       id: 'abyss',
       name: 'Abyss',
       fishSpeciesIds: [
         'anglerfish', 'great-white-shark', 'tuna', 'upside-down-jelly',
         'blue-angelfish', 'anchovy', 'goby', 'crab-dungeness',
       ],
       unlockThreshold: Math.round(abyssFirstCost),
       gradientFrom: '#0a1a3a',
       gradientTo: '#000010',
     },
   ];
   ```

2. `src/data/fish.ts`:
   ```typescript
   import type { FishSpecies } from '../types/Fish.js';
   import { CONSTANTS } from './constants.js';

   /**
    * Earn rate baseline: first fish pays back in CONSTANTS.PAYBACK_SECONDS.
    * earnRate(costIndex 0) = FIRST_FISH_COST / PAYBACK_SECONDS ~= 0.556 c/s.
    * Subsequent rates derived at runtime via EARN_RATIO_IN_BIOME and BIOME_EARN_STEP.
    *
    * earnRateBase here is the species' rate at costIndex 0 of its biome.
    * Multipliers stack at runtime; we store only the base for clarity.
    */
   const FIRST_RATE = CONSTANTS.FIRST_FISH_COST / CONSTANTS.PAYBACK_SECONDS;
   const REEF_BASE = FIRST_RATE * CONSTANTS.BIOME_EARN_STEP;
   const ABYSS_BASE = REEF_BASE * CONSTANTS.BIOME_EARN_STEP;

   export const FISH_SPECIES: FishSpecies[] = [
     // --- Tide Pool (10) ---
     { id: 'goldfish',     name: 'Goldfish',     biomeId: 'tide-pool', costIndex: 0, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/freshwater/Goldfish.png' },
     { id: 'guppy',        name: 'Guppy',        biomeId: 'tide-pool', costIndex: 1, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/freshwater/Guppy.png' },
     { id: 'neon-tetra',   name: 'Neon Tetra',   biomeId: 'tide-pool', costIndex: 2, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/freshwater/Neon Tetra.png' },
     { id: 'clownfish',    name: 'Clownfish',    biomeId: 'tide-pool', costIndex: 3, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/saltwater/Clownfish.png' },
     { id: 'seahorse',     name: 'Seahorse',     biomeId: 'tide-pool', costIndex: 4, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/saltwater/Seahorse.png' },
     { id: 'starfish',     name: 'Starfish',     biomeId: 'tide-pool', costIndex: 5, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/saltwater/Starfish.png' },
     { id: 'shrimp',       name: 'Shrimp',       biomeId: 'tide-pool', costIndex: 6, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/saltwater/Shrimp.png' },
     { id: 'pufferfish',   name: 'Pufferfish',   biomeId: 'tide-pool', costIndex: 7, earnRateBase: FIRST_RATE, scale: 1.2, assetPath: 'assets/fish/saltwater/Pufferfish.png' },
     { id: 'crab-blue',    name: 'Blue Crab',    biomeId: 'tide-pool', costIndex: 8, earnRateBase: FIRST_RATE, scale: 1.0, assetPath: 'assets/fish/saltwater/Crab - Blue.png' },
     { id: 'crab-king',    name: 'King Crab',    biomeId: 'tide-pool', costIndex: 9, earnRateBase: FIRST_RATE, scale: 1.3, assetPath: 'assets/fish/saltwater/Crab - King.png' },

     // --- Open Reef (10) ---
     { id: 'purple-tang',     name: 'Purple Tang',     biomeId: 'open-reef', costIndex: 0, earnRateBase: REEF_BASE, scale: 1.0, assetPath: 'assets/fish/saltwater/Purple Tang.png' },
     { id: 'yellow-tang',     name: 'Yellow Tang',     biomeId: 'open-reef', costIndex: 1, earnRateBase: REEF_BASE, scale: 1.0, assetPath: 'assets/fish/saltwater/Yellow Tang.png' },
     { id: 'surgeonfish',     name: 'Surgeonfish',     biomeId: 'open-reef', costIndex: 2, earnRateBase: REEF_BASE, scale: 1.0, assetPath: 'assets/fish/saltwater/Surgeonfish.png' },
     { id: 'napoleon-wrasse', name: 'Napoleon Wrasse', biomeId: 'open-reef', costIndex: 3, earnRateBase: REEF_BASE, scale: 1.3, assetPath: 'assets/fish/saltwater/Napoleon Wrasse.png' },
     { id: 'blue-groper',     name: 'Blue Groper',     biomeId: 'open-reef', costIndex: 4, earnRateBase: REEF_BASE, scale: 1.3, assetPath: 'assets/fish/saltwater/Blue Groper.png' },
     { id: 'moray-eel',       name: 'Moray Eel',       biomeId: 'open-reef', costIndex: 5, earnRateBase: REEF_BASE, scale: 1.4, assetPath: 'assets/fish/saltwater/Moray Eel.png' },
     { id: 'ribbon-eel',      name: 'Ribbon Eel',      biomeId: 'open-reef', costIndex: 6, earnRateBase: REEF_BASE, scale: 1.4, assetPath: 'assets/fish/saltwater/Ribbon Eel.png' },
     { id: 'jellyfish',       name: 'Jellyfish',       biomeId: 'open-reef', costIndex: 7, earnRateBase: REEF_BASE, scale: 1.2, assetPath: 'assets/fish/saltwater/Jellyfish.png' },
     { id: 'flounder',        name: 'Flounder',        biomeId: 'open-reef', costIndex: 8, earnRateBase: REEF_BASE, scale: 1.3, assetPath: 'assets/fish/saltwater/Flounder.png' },
     { id: 'stingray',        name: 'Stingray',        biomeId: 'open-reef', costIndex: 9, earnRateBase: REEF_BASE, scale: 1.5, assetPath: 'assets/fish/saltwater/Stingray.png' },

     // --- Abyss (8) - 4 native + 4 reused saltwater as placeholders per assets.md ---
     { id: 'anglerfish',          name: 'Anglerfish',          biomeId: 'abyss', costIndex: 0, earnRateBase: ABYSS_BASE, scale: 1.3, assetPath: 'assets/fish/saltwater/Anglerfish.png' },
     { id: 'great-white-shark',   name: 'Great White Shark',   biomeId: 'abyss', costIndex: 1, earnRateBase: ABYSS_BASE, scale: 1.8, assetPath: 'assets/fish/saltwater/Great White Shark.png' },
     { id: 'tuna',                name: 'Tuna',                biomeId: 'abyss', costIndex: 2, earnRateBase: ABYSS_BASE, scale: 1.5, assetPath: 'assets/fish/saltwater/Tuna.png' },
     { id: 'upside-down-jelly',   name: 'Upside Down Jellyfish', biomeId: 'abyss', costIndex: 3, earnRateBase: ABYSS_BASE, scale: 1.2, assetPath: 'assets/fish/saltwater/Upside Down Jellyfish.png' },
     { id: 'blue-angelfish',      name: 'Blue Angelfish',      biomeId: 'abyss', costIndex: 4, earnRateBase: ABYSS_BASE, scale: 1.4, assetPath: 'assets/fish/saltwater/Blue Angelfish.png' },
     { id: 'anchovy',             name: 'Anchovy',             biomeId: 'abyss', costIndex: 5, earnRateBase: ABYSS_BASE, scale: 1.0, assetPath: 'assets/fish/saltwater/Anchovy.png' },
     { id: 'goby',                name: 'Goby',                biomeId: 'abyss', costIndex: 6, earnRateBase: ABYSS_BASE, scale: 1.0, assetPath: 'assets/fish/saltwater/Goby.png' },
     { id: 'crab-dungeness',      name: 'Dungeness Crab',      biomeId: 'abyss', costIndex: 7, earnRateBase: ABYSS_BASE, scale: 1.2, assetPath: 'assets/fish/saltwater/Crab - Dungeness.png' },
   ];
   ```

3. `src/data/decorations.ts`:
   ```typescript
   import type { DecorationSpecies } from '../types/Decoration.js';

   /** Ten misc items from the Pixel Gnome pack. Placed cosmetically; no gameplay effect in v1. */
   export const DECORATIONS: DecorationSpecies[] = [
     { id: 'coral',        name: 'Coral',        assetPath: 'assets/decorations/Coral.png' },
     { id: 'seaweed',      name: 'Seaweed',      assetPath: 'assets/decorations/Seaweed.png' },
     { id: 'seashell',     name: 'Seashell',     assetPath: 'assets/decorations/Seashell.png' },
     { id: 'sand-dollar',  name: 'Sand Dollar',  assetPath: 'assets/decorations/Sand Dollar.png' },
     { id: 'pearl',        name: 'Pearl',        assetPath: 'assets/decorations/Pearl.png' },
     { id: 'bottle',       name: 'Bottle',       assetPath: 'assets/decorations/Bottle.png' },
     { id: 'rusty-can',    name: 'Rusty Can',    assetPath: 'assets/decorations/Rusty Can.png' },
     { id: 'apple-core',   name: 'Apple Core',   assetPath: 'assets/decorations/Apple Core.png' },
     { id: 'worm',         name: 'Worm',         assetPath: 'assets/decorations/Worm.png' },
     { id: 'lure',         name: 'Lure',         assetPath: 'assets/decorations/Lure.png' },
   ];
   ```

4. `scripts/verify-assets.mjs` (verification script - included so WS4 has no judgment calls):
   ```javascript
   import { statSync } from 'node:fs';
   import { resolve } from 'node:path';
   import { FISH_SPECIES } from '../src/data/fish.js';
   import { DECORATIONS } from '../src/data/decorations.js';
   import { BIOMES } from '../src/data/biomes.js';

   const root = resolve(import.meta.dirname, '..');
   let failed = 0;
   const check = (rel) => {
     const abs = resolve(root, 'public', rel);
     try {
       statSync(abs);
     } catch {
       console.error(`MISSING: ${rel}`);
       failed++;
     }
   };
   FISH_SPECIES.forEach((s) => check(s.assetPath));
   DECORATIONS.forEach((d) => check(d.assetPath));

   const biomeFishIds = BIOMES.flatMap((b) => b.fishSpeciesIds);
   const speciesIds = FISH_SPECIES.map((s) => s.id);
   if (biomeFishIds.length !== speciesIds.length) {
     console.error(
       `COUNT MISMATCH: biomes list ${biomeFishIds.length} ids, FISH_SPECIES has ${speciesIds.length}`,
     );
     failed++;
   }
   for (const id of biomeFishIds) {
     if (!speciesIds.includes(id)) {
       console.error(`ORPHAN: biome references unknown species "${id}"`);
       failed++;
     }
   }
   if (failed > 0) {
     console.error(`\n${failed} error(s).`);
     process.exit(1);
   } else {
     console.log(`OK: ${FISH_SPECIES.length} fish + ${DECORATIONS.length} decorations verified.`);
   }
   ```
   Run via: `node --experimental-strip-types scripts/verify-assets.mjs` (or compile first if strip-types is unstable). Acceptable alternative: rewrite as TypeScript and run via `tsx`.

5. **Delete the placeholders from WS1.** WS4 runs `git rm src/types/.gitkeep src/data/.gitkeep` so the integration branch ships clean.

**Verification:**
- `npx tsc --noEmit` passes
- `node scripts/verify-assets.mjs` (or tsx equivalent) reports OK
- `BIOMES.flatMap(b => b.fishSpeciesIds).length === FISH_SPECIES.length` (28) and the two lists agree on IDs (covered by the script)
- `npm run build` succeeds
- `src/types/.gitkeep` and `src/data/.gitkeep` no longer exist

---

## Integration

**Wave 1 -> 2 handoff (explicit gate, do not skip):**

Before spawning WS4, the orchestrator MUST confirm `integrate/m1-foundation` contains all three Wave 1 merges:
```bash
git -C /home/scott/fishtank fetch origin
git -C /home/scott/fishtank log integrate/m1-foundation --oneline -5
# Expect to see 3 commits with subjects "M1.1+M1.2", "M1.3", "M1.4"
git -C /home/scott/fishtank ls-tree integrate/m1-foundation src/types/Fish.ts src/data/constants.ts public/assets/fish/saltwater/Clownfish.png
# All three paths must exist
```
If any merge is missing, fix before spawning WS4. WS4 will fail catastrophically if it branches off a partial integration.

**After WS4 merges:**

1. `integrate/m1-foundation` contains all 4 merged commits + an integration tidy commit (gitkeep removal)
2. Run final acceptance suite from a fresh worktree pointing at `integrate/m1-foundation`:
   - `npm install`
   - `npm run typecheck`
   - `npm run build`
   - `npm run dev` -> verify POC scene still loads
   - `node scripts/verify-assets.mjs`
3. Copy this plan to `docs/plans/m1-foundation.md` and commit ("docs: M1 foundation plan")
4. Push integration branch: `git push -u origin integrate/m1-foundation`
5. `gh pr create --base main --head integrate/m1-foundation` with body listing `Closes #11`, `Closes #12`, `Closes #13`, `Closes #14`, `Closes #15`
6. Auto-merge the PR (`gh pr merge --auto --squash`)
7. Clean up the four worktrees + branches

## Verification (post-merge, on main)

```bash
cd /home/scott/fishtank
git checkout main && git pull
npm install
npm run typecheck   # passes
npm run build       # passes
npm run dev         # opens, POC fish swims as before
ls src/types src/data src/sim src/save src/ui src/util   # all populated
find public/assets -name "*.png" | wc -l                  # 104
gh issue list --milestone "M1: Foundation" --state open    # empty
```

## Changes from adversarial review

- **Crab asset filenames fixed.** Pack uses `Crab - Blue.png`, `Crab - King.png`, `Crab - Dungeness.png` (with hyphen-space), not `Blue Crab.png` etc. WS4's `src/data/fish.ts` paths updated.
- **assetPath JSDoc** now documents the Vite base URL prefix contract (no leading slash; consumer prefixes `import.meta.env.BASE_URL`).
- **`unlockThreshold` is now derived** from CONSTANTS at module-load time, not hardcoded. Eliminates drift if anyone tunes the cost curve.
- **`.gitkeep` cleanup is now WS4's responsibility** (explicit step in WS4).
- **`scripts/verify-assets.mjs` is now provided** so WS4 can copy-paste it. Removes a judgment call from the agent.
- **`src/util/README.md`** now lists the deferred formatCoins, uuid, and math helpers so M2/M3 work has a clear landing zone.
- **Wave 1 -> Wave 2 gate** is now explicit (must confirm all 3 merges before WS4 starts).

## Risks / Notes

- **Asset filename casing.** Pixel Gnome files use TitleCase, spaces, and a hyphen for crab variants ("Crab - Blue.png"). WS1 must NOT rename files. WS4's assetPath strings preserve exact casing.
- **Abyss roster.** Per `docs/assets.md`, Abyss has only 4 native species; 4 saltwater fish (Blue Angelfish, Anchovy, Goby, Dungeness Crab) fill remaining slots. Phase 2 can swap recolors or commissioned art.
- **Vite base path.** vite.config.ts sets base `/fish/`. Asset paths stored relative to `public/` (no leading slash). M3 sprite loader prefixes `import.meta.env.BASE_URL`. Documented in `FishSpecies.assetPath` JSDoc.
- **Asset volume.** 104 PNGs is small (<5 MB total). No LFS needed.
- **No runtime tests in M1.** Verification is purely build + typecheck + visual confirmation that the POC still runs. M2 introduces the first testable behavior (sim tick, save/load).

## Locked decisions

- **Starter mechanic: 10 purchasable, save grants one (decided 2026-05-22).** All 10 Tide Pool species use the uniform cost progression (costIndex 0-9, costs 50 -> ~1033). M3 save-init will pre-grant the first species (goldfish), bypassing its shop cost. No `starter` field needed on FishSpecies.
- **ADR-0005 amendment owed.** The ADR's "Last Tide Pool fish: ~715 coins" line is incorrect under the locked starter model - the correct value is ~1033 with 10 purchasable. WS4 includes a small ADR amendment commit alongside the registry work: open `docs/decisions/0005-numeric-model.md`, update "Last Tide Pool fish: ~715 coins" to "Last Tide Pool fish: ~1033 coins" and "Open Reef first cost: ~15500 (= ~1033 * 15)". No new ADR number; just edit in place per the project's append-only rule (which permits updating, not deleting, prior decisions).
- **In-repo plan landing.** This plan file (`witty-prancing-anchor.md`) gets copied to `docs/plans/m1-foundation.md` during integration, per `feedback_inrepo_orchestration`.
