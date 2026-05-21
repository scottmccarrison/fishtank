# ADR-0001: Tech stack

**Status:** Proposed (some items locked, some leaning)
**Date:** 2026-05-20

## Context

We need to pick a stack before writing any code. The project is a single-player browser game with 2D pixel art and idle-game mechanics. Save state lives client-side initially; a backend may be needed later for a "visit my tank" feature.

## Decisions

### Locked

- **Platform: Web browser.** No mobile-native, no Electron. Browser is the lowest-friction way to share and play.
- **Art style: 2D pixel art.** Cheap to produce, visually distinctive, hides "amateur" look better than 3D or vector. Mix of hand-drawn (starter fish, simple decor) and asset packs (exotic species, complex decor).
- **MVP save state: localStorage.** No backend, no accounts, no cloud sync until the visit feature forces it.

### Leaning (revisit before implementation)

- **Game engine: Phaser 3.** Reason: Scott already uses it on the worms project, so the learning curve is amortized. Plain Canvas API or Pixi.js would also work; the game is simple enough that the engine choice is not load-bearing.
- **Language: TypeScript.** Reason: catches bugs at the boundary between systems (fish behavior, save state, UI). Worth the small extra setup cost. Open to plain JS if the boilerplate gets annoying.
- **Build tool: Vite.** Reason: fast dev server, simple config, well-supported with Phaser + TS templates. No strong opinion, just the default.
- **Art tool: Aseprite.** Reason: Scott already owns it for the worms project. Industry standard for pixel art.

### Deferred

- **Backend (if/when "visit my tank" ships):** undecided. Options: simple Node + SQLite, or piggyback on the existing brain EC2.
- **Hosting:** undecided. Likely GitHub Pages or Cloudflare Pages for static MVP.

## Consequences

- Browser + Phaser + TypeScript is a well-trodden path. Lots of tutorials, easy to ask for help.
- Pixel art is cheap but slow per asset; budget time for animation iteration.
- Picking localStorage means losing data if the user clears it. Acceptable for MVP, must be disclosed in the UI.

## Notes

Update this ADR (don't delete) when any "Leaning" item gets locked or replaced.
