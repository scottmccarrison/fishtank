# fishtank

Idle fish tank simulator. Web-based, single-player, pixel art.

Buy fish, fish generate money on a timer, use the money to buy more fish, accessories, and bigger tanks. That's the loop.

## Why another one of these

The genre is dominated by sites that are either spammy, full of microtransactions, or just made cheaply. This is a hobby project to do it cleanly: no ads, no IAP, no dark patterns. Just a calm tank that earns you coins.

Closest reference: **AbyssRium (Tap Tap Fish)**, with the microtransaction layer removed. Same collection-driven progression and biome unlocks, pixel art instead of 3D glow, single coin currency. See [ADR-0004](docs/decisions/0004-engagement-loop.md) for the full model.

## Status

Pre-alpha. Setting up the project, locking in early decisions. No code yet.

## Stack (planned)

- Phaser 3 (2D web game engine)
- Aseprite for pixel art
- Browser-only, localStorage for save state (MVP)

See [docs/decisions/](docs/decisions/) for the reasoning.

## Docs

- [Roadmap](docs/ROADMAP.md) - phases and rough scope
- [Decisions](docs/decisions/) - ADRs for what's locked in
- [Plans](docs/plans/) - per-epic implementation plans (added as work begins)
