# ADR-0001: Tech stack

**Status:** Accepted (deferred items noted separately)
**Date:** 2026-05-20

## Context

We need to pick a stack before writing any code. The project is a single-player browser game with 2D pixel art and idle-game mechanics. Save state lives client-side initially; a backend may be needed later for a "visit my tank" feature.

## Decisions

### Locked

- **Platform: Web browser.** No mobile-native, no Electron. Browser is the lowest-friction way to share and play.
- **Art style: 2D pixel art.** Cheap to produce, visually distinctive, hides "amateur" look better than 3D or vector. Mix of hand-drawn (starter fish, simple decor) and asset packs (exotic species, complex decor).
- **MVP save state: localStorage.** No backend, no accounts, no cloud sync until the visit feature forces it.
- **Game engine: Phaser 3.** Locked 2026-05-20. Reasons: (1) Scott already uses it on the worms project, so the learning curve is amortized; (2) batteries-included (scenes, input, audio, tweens, asset loader, animations, particles) saves weeks over assembling Pixi + tween + asset loader; (3) performance is not load-bearing - benchmarks show Phaser handles 10,000 sprites at 43 FPS and we will have ~50. Bundle size (~1.2MB) is the only real cost and acceptable for a hobby project. See [research/idle-game-tech-survey.md](../research/idle-game-tech-survey.md) for the data behind this.
- **Language: TypeScript.** Locked 2026-05-20. Reasons: (1) save data schemas benefit enormously from types - schema migrations are the kind of code that silently breaks without compile-time checks; (2) Phaser 3 ships official TS types and the canonical starter template is TS-first; (3) Vite has zero-config TS support, so the setup cost is near-zero. Plain JS would be defensible for a smaller project but is a worse fit once we have multiple subsystems (sim, save, UI, render) talking to each other.
- **Build tool: Vite.** Locked 2026-05-20. Reasons: (1) fast dev server with hot reload, near-instant startup; (2) zero-config TypeScript; (3) Phaser + TS + Vite starter templates exist and are well-maintained; (4) no real competitor at this scale (Webpack is dying, Parcel is less popular, esbuild is too low-level).
- **Art tool: Aseprite.** Locked 2026-05-20. Reasons: (1) Scott already owns it from the worms project; (2) industry standard for pixel art - tutorials and references map directly; (3) exports spritesheets + JSON metadata in a format Phaser can consume natively.

### Deferred

- **Backend (if/when "visit my tank" ships):** undecided. Options: simple Node + SQLite, or piggyback on the existing brain EC2.
- **Hosting:** undecided. Likely GitHub Pages or Cloudflare Pages for static MVP.

## Consequences

- Browser + Phaser + TypeScript is a well-trodden path. Lots of tutorials, easy to ask for help.
- Pixel art is cheap but slow per asset; budget time for animation iteration.
- Picking localStorage means losing data if the user clears it. Acceptable for MVP, must be disclosed in the UI.

## Notes

Update this ADR in place (don't delete) when items get replaced, reopened, or new ones added. Each locked item carries a date so we can see when each decision was finalized.
