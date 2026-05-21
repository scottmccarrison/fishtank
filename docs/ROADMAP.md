# Roadmap

High-level phases. Specifics live in `docs/plans/<epic>.md` once each phase is being worked on.

## Phase 0: Foundations (current)

- Lock in tech stack ([ADR-0001](decisions/0001-tech-stack.md))
- Lock in MVP scope ([ADR-0002](decisions/0002-mvp-scope.md))
- Asset research: shortlist 2-3 fish/aquarium packs on itch.io
- Tiny tech POC: blank Phaser 3 + TS + Vite page with one sprite moving on screen

## Phase 1: MVP single-player

The smallest version of the game that proves the loop is fun.

- Tank rendered, one fish sprite swimming with simple AI
- Shop UI: buy more fish (3-5 species, varied price/earn rates)
- Coin counter, earning timer per fish
- localStorage save/load
- Decorations (cosmetic): 5-10 items
- Tank upgrades: 2-3 sizes
- Bare-minimum visual polish: water tint, bubbles, soft background

## Phase 2: Polish and retention

Only after Phase 1 proves the loop is fun. Engagement hooks come from [ADR-0004](decisions/0004-engagement-loop.md): AbyssRium-style collection-driven progression, cleaned of microtransactions.

- Sound design (ambient water, soft chimes on earn/buy)
- Visual polish (lighting, animations, transitions)
- Retention hooks per ADR-0004:
  - Collection log / encyclopedia with "X of N discovered" counter
  - Biome unlocks at coin milestones (3-4 biomes for v1: freshwater, reef, deep-sea, maybe kelp forest)
  - Achievement nudges with modest bonuses
- Decoration drag-and-drop (rearranging castle/plants/rocks)
- Settings: mute, reset save, export/import save JSON
- Accessibility pass

## Phase 3: Sharing (the "visit my tank" feature)

Only if Phases 1-2 land well and someone actually wants to share their tank.

- Backend service to store tank snapshots
- Shareable read-only URLs
- Privacy considerations (no PII, opt-in publish)
- Maybe: visitor "likes" or guest book (resist scope creep)

## Notes

- Phases are not deadlined. This is a hobby project; ship when ready.
- If Phase 1 is boring, stop. Don't pile on features to rescue a dull core loop.
