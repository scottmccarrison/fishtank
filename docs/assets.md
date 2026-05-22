# Assets

What we're using for v1. Updated when sources change.

## Fish + decorations: Pixel Gnome Fishing Pack

- **Source:** https://pixelgnome.itch.io/fish
- **Pack:** Pixel Gnome Fishing Pack
- **Cost:** $2.50 minimum (name-your-own-price)
- **License:** CC-BY 4.0 - commercial use OK, modifications OK, attribution optional. Resale, AI training, logo use, and NFT/crypto projects prohibited.
- **Native resolution:** 16x16 per sprite
- **Format:** Individual PNGs + spritesheet
- **Variants:** Each sprite ships with and without a white outline

Contents:
- **25 saltwater species** - clownfish, blue angelfish, anglerfish, anchovy, blue groper, crabs (blue/dungeness/king), flounder, goby, great white shark, jellyfish, moray eel, napoleon wrasse, pufferfish, purple tang, ribbon eel, seahorse, shrimp, starfish, stingray, surgeonfish, tuna, upside-down jellyfish, yellow tang
- **15 freshwater species** - angelfish, arowana, bass, bluegill, carp, catfish, goldfish, guppy, mussel, neon tetra, rainbow trout, salmon, silverjaw minnow, tadpole, yellow perch
- **10 misc / decoration sprites** - apple core, bottle, coral, lure, pearl, rusty can, sand dollar, seashell, seaweed, worm

The Misc folder covers our decoration sprite needs (per the cosmetic-decoration drag-and-drop locked in [ADR-0004](decisions/0004-engagement-loop.md)), so this single pack provides both fish AND decorations.

### Provisional biome assignments

Final mapping happens in the Phase 2 numeric design pass; this is a starting shape:

- **Tide Pool** - clownfish, goldfish, blue tang, seahorse, starfish, guppy, neon tetra, pufferfish, crab variants, shrimp
- **Open Reef** - purple tang, yellow tang, surgeonfish, napoleon wrasse, blue groper, moray eel, ribbon eel, jellyfish, flounder, stingray
- **Abyss** - anglerfish, great white shark, tuna, upside-down jellyfish (thin; may need 3-4 supplemental species via recoloring or commission)

### Trade-offs accepted

- **No animation frames.** Each fish is a single static sprite. We fake swimming via translation tweens, slight rotation, and sine-wave drift. At 16x16 there's no room for tail-wag detail anyway.
- **No directional variants.** All fish face one direction; we flip horizontally with `setFlipX(true)`. Asymmetric species (anglerfish lure swaps sides) will look slightly off when flipped - acceptable for v1.
- **Uniform 16x16 bounding box.** Real size variation lost. We imply size in-game by scaling (sharks 2x, clownfish 1x). Side effect: this becomes a natural shop-tier mechanism (bigger = pricier).
- **Abyss biome is content-thin** (~4 species). Solvable via recolor variants or supplemental sources during Phase 2.

## Backgrounds: simple gradients (v1)

Per the conversation that landed on this approach: skip the busy "background pack" route for v1. AbyssRium's actual backdrops are gradient + animated particles; the visual interest comes from the fish and decorations in the foreground.

- **Tide Pool** - light-blue gradient, surface caustics if affordable
- **Open Reef** - mid-blue gradient, scattered sun rays
- **Abyss** - deep indigo gradient, subtle bioluminescent particles

Revisit after the gradient version is on screen if it doesn't carry the mood.

### Shelved: InKing 14 Undersea Backgrounds

- **Source:** https://inking.itch.io/14-undersea-world-backgrounds-assets-pixelart-pixel-art-asset-pack
- **Status:** Purchased ($4.90), shelved for v1. Backgrounds skewed heavily toward Atlantean temple/Lost-City themes that compete visually with the fish. Reserved for a possible future "Sunken Temple" event biome.
- **Native:** 192x108 (16:9 chunky pixel)

## Sound

TBD. Phase 2 polish work. Probably loop a soft ambient water track plus a few short SFX (coin chime, fish-buy whoosh, achievement ding).

## Notes

- Attribution is optional under both packs' licenses. We will likely add a `CREDITS.md` thanking both artists by Phase 1 wrap, since it costs nothing and honors the artists.
- License files for both packs live in the user's downloads; copy them into the repo under `vendor/licenses/` when the assets get imported into `public/`.
