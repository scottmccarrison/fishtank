# fishtank release notes

## v1.0.0

Initial public release. The complete fishtank idle game, shipped per the M1-M7 milestone plan.

### Features

- **Tank scene** - 800x600 Phaser pixel-art tank with biome-themed gradient backdrop
- **Fish** - 28 species across 3 biomes (Tide Pool, Open Reef, Abyss). Goldfish starter on first load.
- **Swim AI** - drift + occasional darting (ADR-0002)
- **Coin economy** - 5Hz sim tick, locked numeric model per ADR-0005 (~50 coin starter, ~50M Abyss goal)
- **Offline catchup** - earnings credited on return (24h cap per ADR-0003)
- **Save layer** - localStorage JSON, schema v1, autosave every 10s, manual export/import
- **Shop** - 4 tabs (3 biomes + decorations) with affordability coloring
- **Biome unlocks** - coin-threshold gates, gradient backdrop crossfade, celebration text
- **Decorations** - 10 cosmetic items, drag-and-drop placement, positions persisted
- **HUD** - coin counter, per-fish "+1" earn floaters
- **First-run** - welcome modal walks new players through the loop
- **Settings** - reset save / export save JSON / import save JSON
- **Tech** - Phaser 3.90 + TypeScript 5.6 + Vite 6 + Vitest 2 + Cloudflare Worker deploy

### Live

https://mccarrison.me/fish/

### Notes

- No audio in v1 (Phase 2)
- No accounts or backend (local-first per ADR-0004)
- 87 vitest unit tests; UI integration tested manually
