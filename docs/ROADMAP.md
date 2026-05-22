# Roadmap

High-level phases and milestones. Specifics live in GitHub issues per milestone, and per-epic plans land in `docs/plans/<epic>.md` if any feature warrants a written plan.

## Phase 0: Foundations - COMPLETE (2026-05-21)

- 5 ADRs locked (tech stack, MVP scope, sim loop, engagement loop, numeric model)
- 3 research docs saved (idle game tech, engagement, AbyssRium mechanics)
- Asset choices locked (Pixel Gnome Fishing Pack + gradient backgrounds for v1)
- POC deployed at `mccarrison.me/fish`

## Phase 1: v1 Implementation (current)

Building the playable 3-biome fish tank game per [ADR-0005](decisions/0005-numeric-model.md). Broken into 7 milestones tracked via GitHub milestones. Total estimate: ~25-35 atomic issues.

### M1: Foundation

Scaffolding for everything that follows. No gameplay yet.

- Project structure refactor (`src/scenes/`, `src/sim/`, `src/save/`, `src/ui/`, `src/data/`)
- Asset import (Pixel Gnome Fishing Pack into `public/assets/`)
- TypeScript types and interfaces for fish, biomes, decorations, save state
- Game constants module (pricing curve, biome thresholds, all the numbers from ADR-0005)

### M2: Sim and Save

The invisible engine. Must work correctly before any gameplay can be trusted.

- 5Hz sim tick loop per [ADR-0003](decisions/0003-sim-loop.md)
- Save schema v1 (JSON in localStorage under `fishtank.save.v1`, version field for migrations)
- Save/load functions + autosave timer
- Offline catchup math (capped at 24h)
- Page Visibility API integration (pause sim on hidden, resume + catchup on visible)

### M3: Core Scenes

Visible game, sim hooked up, fish on screen.

- Tank scene refactor (replace POC's single-fish demo)
- Fish spawning from save state
- Fish swim AI (idle drift + occasional darting per ADR-0002)
- Coin counter UI with K/M/B formatter
- Sprite import pipeline + sprite scaling per fish tier

### M4: Shop and Economy

The core game loop wired up.

- Shop panel UI (browse + purchase)
- Fish purchase flow (cost validation, save update, sprite spawn)
- Earn-rate calculation per fish per ADR-0005
- Coin display animation on earn (floating "+N" or similar)

### M5: Biome System

The macro-progression hook.

- Biome data structure and registry
- Coin-threshold unlock gates
- Gradient backdrops per biome (Tide Pool / Open Reef / Abyss)
- Biome transition moment (the unlock celebration)
- Shop filtering by available biomes

### M6: Decorations

The optional interaction layer per [ADR-0004](decisions/0004-engagement-loop.md).

- Decoration shop catalog (10 items from Pixel Gnome Misc folder)
- Decoration purchase flow
- Drag-and-drop placement on the tank
- Decoration save/load (positions persisted)

### M7: Polish and v1 Ship

Last-mile work to be presentable.

- Welcome-back toast showing offline earnings
- First-run experience (free starter fish, helpful copy)
- Settings panel: mute, reset save, export/import save JSON
- v1 deploy verification end-to-end

## Phase 2: Post-v1 polish and retention

Only after v1 ships and we see what feels right. Engagement hooks from [ADR-0004](decisions/0004-engagement-loop.md) land here.

- Sound design (ambient water loop, soft chimes on earn/buy)
- Visual polish (lighting, animations, biome transition flourish)
- Collection log / encyclopedia UI ("X of N discovered")
- Achievement system with modest earn-rate multipliers
- Accessibility pass

## Phase 3: Sharing (optional)

Only if v1 lands well and there's appetite. Requires the first backend in the project.

- Backend service to store tank snapshots
- Shareable read-only URLs
- Privacy considerations (no PII, opt-in publish)

## Notes

- Phases are not deadlined. This is a hobby project; ship when ready.
- If Phase 1 reveals the loop is boring, stop. Don't pile features on a dull core loop.
- ADR-0005 explicitly defers tank-upgrade specifics to implementation time. Expect that question to resurface in M3 or M4.
