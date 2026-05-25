# Brysia pack: decorations + reskin (3 phases)

Upgrade the tank's art using the purchased **Brysia "Fishtank" pixel pack**
(replaces the weak 10-item Pixel Gnome decoration set). Phased into 3 PRs.

## Licensing
The Brysia license forbids redistributing the separate image files. All Brysia
assets live under `public/assets/brysia/` which is **gitignored** (kept local +
served from the deploy, which is normal in-game use). They are NOT committed. A
fresh clone needs the purchased pack to build with full art. See `CREDITS.md`.
The existing Pixel Gnome fish art stays tracked (CC-BY allows redistribution).

## PR1 - Decorations end-to-end (DONE)
Decorations were a half-built feature: data + `purchaseDecoration` + render existed,
but no UI ever called them. This PR finishes them and swaps in better art.
- `src/data/decorations.ts`: 19 curated Brysia decorations (corals, plants, shells,
  stones, structures) with a 25 -> 2500 cost curve, replacing the Pixel Gnome set.
- `src/data/constants.ts` + `Diorama.syncDecorations`: `DECORATION_RENDER_SCALE`
  (2x) so the varied-size sprites (16-80px native) read well on the floor.
- `src/ui/Ledger.ts`: per-biome **Fish/Decor toggle** strip. Decor rows show the
  decoration, cost, and BUY (`purchaseDecoration` into the active biome) -> "Owned"
  once bought. Reuses the existing scroll/mask machinery; `LIST_Y`/`LIST_H` shifted
  down by `TOGGLE_H`.
- Tests: `rowsForDecorations` added; `PurchaseDecoration.test.ts` ids updated to the
  new catalog. typecheck clean, full suite green.

## PR2 - Tank surfaces (planned)
Reskin the tank chrome with Brysia tilesets: 3 background water patterns -> 3 biomes,
`floor_tiles` (6x 48x48) -> per-biome floor, and `fishtank_tiles` (purple frame) ->
the tank frame (supersedes the #65 hand-drawn glass frame; keep waterline/sheen).
Confirm frame color (purple vs recolor) at build time. Re-planned in detail first.

## PR3 - Animated fish (planned)
REPLACE 5 existing tide-pool species' sprites with Brysia's 4-frame swim sheets
(spritesheet + `anims`), NOT add new species (replace = zero economy impact; adding
shifts the cost curve and breaks `fishCost.test.ts`). Note: 5 Brysia-style fish among
23 Pixel Gnome fish is a visible style mix until a full fish migration (separate effort).
