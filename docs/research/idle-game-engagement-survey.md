# Idle game engagement survey

**Date:** 2026-05-21
**Goal:** Understand what makes idle games engaging *without* crossing into manipulative dark patterns. Informs the gameplay model in ADR-0004.

## TL;DR

- Successful idle games rely on **layered systems revealed over time**, milestone unlocks that change the visual, achievements integrated into the math, and prestige that's a *real* decision (not a forced grind).
- **AbyssRium** is the closest reference for what we want to build. Its appeal: collection completionism on a gentle slope, biome unlocks as the macro-progression beat, no maintenance loop.
- The dark-pattern line is well-known and easy to avoid: skip energy systems, FOMO timers, gacha, premium currency, push-notification nagging, daily-login streak punishment, and social pressure.
- **Skip the maintenance loop.** Tank-gets-dirty mechanics punish idleness in an idle game - it contradicts the calm premise. AbyssRium's omission is intentional.
- **Skip feeding too.** Auto-collect coins already locks "calm." Adding feeding reintroduces the chore we avoided.

## Engagement loops in successful idle games

Beyond "number goes up," the proven hooks are:

- **Cookie Clicker:** Prestige (Heavenly Chips) gives meaningful timing decisions; absurd lore in upgrade tooltips creates a discovery layer; achievements that grant production multipliers tie completionism into the core loop.
- **AdVenture Capitalist:** Invented offline-earning expectations; "managers" that automate businesses transform play from clicking to optimizing; progress comes in big stair-steps (new business unlocks) not smooth curves.
- **Antimatter Dimensions:** Super-exponential production (game gets *faster* as you progress, not slower); achievements give 1.03x each plus 1.25x per row of 8, so completion is part of the math, not optional bling; layered prestige (Infinity, Eternity, Reality) keeps revealing new mechanics.
- **AdVenture Communist:** Tiered unit promotions (10 of unit A becomes 1 of unit B) make collection visibly satisfying.
- **Cell to Singularity:** Narrative progression through evolution stages provides a "what's next?" hook beyond numbers; each unlock changes the visuals.

Common thread: **layered systems revealed over time**, milestone unlocks that change the *look* of the game, achievements integrated into the math, and prestige that's a real decision (not a forced grind).

## Aquarium-specific games

- **AbyssRium (Tap Tap Fish):** Originally tap-to-earn vitality, then spend vitality on fish/coral/rocks. Now drifted away from tapping toward "new fish every 15-120 minutes." Strong hooks: **hidden fish unlocked by quirky conditions** (tap with 5 fingers, tilt device, etc.), photography mode, gorgeous bioluminescent visuals, expansion to new biomes (Pole, Freshwater). Pure cosmetic progression. No maintenance.
- **Insaniquarium:** NOT idle. Active feeding loop where guppies die without food, plus alien-defense layer. Coins drop and disappear if uncollected. Engaging but stressful, the opposite of our "calm" target.
- **Idle Fish Tank Tycoon:** Standard tycoon - franchise expansion, manager idle layer. Generic.
- **Behind Glass / Aquarium Designer:** Simulation-heavy (pH, salinity). Niche audience.

AbyssRium is the right benchmark. Its core appeal: **collection completionism on a gentle slope**, with **biome unlocks** as the macro-progression beat.

## The dark-pattern line

**Manipulative:**
- Energy systems (artificial play caps to sell bypasses)
- FOMO timers / limited-time event collections
- Gacha / premium currency
- Push notifications nagging you back
- Daily-login *streak* bonuses that punish missing a day
- Social pressure (leaderboards, friend pings)
- Material-collection on a short real-time cadence that forces check-ins (AbyssRium's seaweed is a small offender here)

**Ethical:**
- Achievements with intrinsic or modest bonus rewards
- Gradual unlocks tied to in-game milestones
- Visual feedback (particles, sound, animations) when something happens
- Completion goals (fish encyclopedia, decoration sets)
- Optional prestige

**Daily login bonus verdict:** The bonus itself is fine. The *streak* mechanic (lose progress if you miss a day) is the dark pattern. ADR-0002 already excluded streaks.

## Maintenance loops

Maintenance works when it's **rare, optional, and visually rewarding** (Stardew Valley pet petting). It fails when it's **frequent, mandatory, and punishing** (Tamagotchi death, AbyssRium's seaweed check-ins).

AbyssRium famously *avoids* feeding/cleaning, leaning on "comfort" framing. Insaniquarium *requires* it and is tense, not calm. The "tank gets dirty" mechanic punishes idleness in an *idle* game - a contradiction. Skip it.

## Synthesis for the fish tank

**Add these (2-3 mechanics):**

1. **Fish encyclopedia / collection log** with a visible "X of N discovered" counter. Unlocking new fish by reaching coin milestones (not RNG) gives a stair-step progression rhythm. This is the AbyssRium-style hook.
2. **Biome / tank-theme unlocks** at major coin thresholds (freshwater, reef, deep-sea, kelp forest). Each changes the background art and unlocks a new fish set. This is the "what's next?" engine and shows off pixel art.
3. **Achievement nudges with tiny bonuses** ("Own 5 fish," "Earn 10k coins offline") - 1.05x earn rate or similar. Cheap to implement, gives the satisfying "ding."

**Avoid these:**

1. **Maintenance/cleaning loops.** Contradicts the calm idle premise. AbyssRium's omission is a feature, not an oversight.
2. **Prestige resets.** Often expected, but for a hobby project with no microtransaction pressure, a soft-cap with biome unlocks gives the same "new chapter" feeling without the player-time-disrespecting reset.

**On feeding specifically:** skip it. Auto-collect coins already locks in "calm." Adding feeding reintroduces the chore loop. If we want one optional interaction, the suggested one is **rearranging decorations** - low-stakes, expressive, no failure state.

## Sources

- [Incremental game - Wikipedia](https://en.wikipedia.org/wiki/Incremental_game)
- [Antimatter Dimensions Achievements - Fandom](https://antimatter-dimensions.fandom.com/wiki/Achievements)
- [AbyssRium Gameplay Guide - Zelda Zone](https://zelda.zone/articles/tap-tap-fish-abyssrium-walkthrough-hidden-fish-guide/)
- [AbyssRium Tips and Tricks - WriterParty](https://writerparty.com/party/abyssrium-tips-and-tricks-guide-hints-cheats-and-strategies/)
- [Dark Patterns in Game Design - indieuxr](https://indieuxr.itch.io/dark-patterns-in-game-design)
- [The Ethics of Dark Patterns in Game Design](https://www.gamedesignknowledge.com/blog-post/the-ethics-of-dark-patterns-in-game-design)
- [Level Up or Game Over: Mobile Game Dark Patterns (arxiv)](https://arxiv.org/pdf/2412.05039)
- [Insaniquarium Gameplay - StrategyWiki](https://strategywiki.org/wiki/Insaniquarium!_Deluxe/Gameplay)
- [Insaniquarium - Wikipedia](https://en.wikipedia.org/wiki/Insaniquarium)
- [Revolution Idle Achievements Guide](https://game-vault.net/wiki/Revolution_Idle_Achievements_Guide)
