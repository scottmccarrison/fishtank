# ADR-0004: Gameplay model and engagement loop

**Status:** Accepted
**Date:** 2026-05-21

## Context

ADR-0002 locked the MVP scope and the "never building this" list, but did not specify what makes the game actually *engaging* to play. The [engagement research](../research/idle-game-engagement-survey.md) surveyed proven hooks across non-predatory idle games (Cookie Clicker, Antimatter Dimensions, AdVenture Capitalist, Cell to Singularity) and the aquarium category specifically (AbyssRium, Insaniquarium).

Scott named **AbyssRium (Tap Tap Fish)** as the explicit north star. His pain point with it was the microtransaction layer (gems, premium fish, paid biome packs).

This ADR captures what the game IS, beyond "fish swim and earn coins."

## North star

**AbyssRium, cleaned of microtransactions, ads, daily-streak nagging, and energy/gacha systems.** Same calm-aquarium feel, same collection-driven progression, same biome unlocks as the macro-progression beat.

Important differences from AbyssRium by design:

- **Visual:** pixel art (cozy, retro), not 3D bioluminescent glow. We need to find our own visual identity inside the same emotional register (calm, satisfying, low-pressure).
- **Scale:** hobby project. Tens of fish total, ~3-4 biomes, not hundreds across many regions. AbyssRium is the long-term shape, not the v1 content target.
- **Currency:** single "coins" currency. AbyssRium splits Vitality (earned by tapping) from Gems (purchased). Without purchases the split serves no purpose and just adds UI.
- **Platform:** web, desktop + mobile-friendly. Not mobile-exclusive.
- **Monetization:** none, ever. Reaffirms ADR-0002.

## Decisions

### Locked

1. **Core loop (MVP):** Fish exist in tank -> auto-earn coins on the sim tick -> spend coins on more fish, cosmetic decorations, and bigger tanks. No feeding action, no maintenance, no clicking required.

2. **Single currency: coins.** No vitality/gem split. Two-currency systems exist primarily to bridge earnable/purchasable, and we have no purchases.

3. **Coins are the only progression axis. No Coralite / level meta-mechanic.** Biome unlocks are pure coin thresholds. AbyssRium uses a "Lonely Coralite" character that levels up by absorbing vitality and acts as the biome gate. We considered cloning this and chose not to - it adds a second progression mechanic and a new central game object. Single-axis (coins) keeps the model simple, reduces what a new player has to learn, and matches the "feed fish, get coins, buy fish" framing.

4. **Engagement hooks (for Phase 2 retention work, per the roadmap):**
   - **Collection log / encyclopedia.** Visible "X of N discovered" counter. Fish unlock by hitting deterministic coin milestones (not RNG, not gacha).
   - **Biome unlocks** at major coin thresholds. Each biome changes the tank background art and unlocks a new fish set. Specific biome list and thresholds TBD - probably 3-4 for v1 (freshwater, reef, deep-sea, maybe kelp forest).
   - **Achievement nudges with modest bonuses** ("Own 5 fish": +5% earn rate; "Earn 10k coins offline": +5%). Multipliers stay small enough that achievements feel like seasoning, not the main meal.

5. **One optional interaction in MVP: rearranging decorations.** Drag-and-drop the castle / plant / rock around the tank. Low-stakes, expressive, no failure state. This is the AbyssRium-equivalent of placing coral, scoped to our pixel-art constraints.

### Out of scope, locked (reaffirming and extending ADR-0002)

- **Maintenance / cleaning loops.** No "tank gets dirty," no filter mechanic, no water quality. AbyssRium famously omits this on purpose, and the [research](../research/idle-game-engagement-survey.md) confirms it contradicts the calm idle premise.
- **Feeding action.** Conflicts with the auto-collect decision in our coin model and reintroduces the chore loop we explicitly avoided.
- **Fish health / mood / illness.** Already excluded by ADR-0002, restated here for clarity.
- **Prestige resets.** Common in idle games but disrespect player time. Biome unlocks give the same "new chapter" feeling without the reset.
- **Daily-login mechanics of any kind.** Streaks, bonuses, missed-day penalties - all excluded.
- **Hidden / Easter-egg fish** of any kind for v1. AbyssRium has 50+ ("tap with 5 fingers," "play between midnight and 1am," "share a photo on Twitter"). The charming ones are tempting but complicate the coins-drive-progression focus, and the worst of them (notification bait, social-share gates) are flat-out predatory. Defer the charming subset to v2.

## Consequences

- The MVP is intentionally thin on content: one biome, a handful of fish species, a handful of decorations. The hooks (collection log, biomes, achievements) are Phase 2 work, not MVP.
- Biome unlocks become the macro-progression engine and a natural pacing mechanism. Their cadence is the single most important number to balance during Phase 2.
- Single-currency design keeps UI and save state simple.
- Pixel art means we cannot lean on AbyssRium's glow appeal. The visual identity will be cozy/retro/calm, and we will need to invest in that look to make it feel "ours" instead of "low-budget AbyssRium."
- Decoration rearranging in MVP raises a small UX question (drag-and-drop on touch + mouse). Manageable, but a real feature beyond static cosmetics.

## Open questions for later (not blocking)

Numeric design - all deferred to a dedicated Phase 2 design pass. The [AbyssRium deep-dive](../research/abyssrium-mechanics-deep-dive.md) gives anchors to start from.

- **Pricing curve numbers.** Research suggests ~1.3-1.5x per fish within a biome, ~10-25x step between biomes. Need to pick specific values.
- **Specific biome list and unlock thresholds.** Three biomes confirmed. Provisional themes from the research: Tide Pool / Open Reef / Abyss. Need to lock biome names, fish counts per biome (research suggested 12/10/8 front-loaded; the synthesis is internally inconsistent about totals - real number TBD), and the coin thresholds that unlock each.
- **Achievement catalog.** Specific list, triggers, and bonuses.
- **Time-to-completion target.** Research anchor is ~15-25 active hours total. Pick a target before balancing the curve.

These get resolved before Phase 2 implementation begins.

## Deferred to future state (v2+, not committed)

Mechanics we explicitly explored, considered, and decided NOT to include in v1. Documented here so future-us doesn't relitigate without context.

- **Tap-to-boost interaction.** AbyssRium still has a 1-vitality-per-tap baseline. We chose pure auto-collect to align with the "calm idle" feel. v2 could add an optional click bonus - a tap that grants a small instant boost or temporary multiplier, never a required interaction.
- **Functional / boost decorations.** AbyssRium's decorations and corals raise vitality and fish cap. ADR-0002 locked cosmetic-only to keep the model simple. v2 could introduce a "premium decoration" tier that grants modest earn-rate boosts, scoped so the cosmetic tier remains viable.
- **Hidden / Easter-egg fish.** Charming when done well (e.g., "have 0 fish for 60 seconds," "open the tank on a rainy day"). Skipped in v1 to keep progression single-axis. v2 could include 3-5 deterministic Easter-eggs.

## Notes

Update this ADR in place when items get reopened or extended. Each locked item carries the date so we can see when each decision was finalized.
