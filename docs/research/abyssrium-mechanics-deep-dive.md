# AbyssRium mechanics deep-dive

**Date:** 2026-05-21
**Goal:** Concrete numbers and mechanics from AbyssRium so we have anchors for our own numeric design. Builds on [the engagement survey](idle-game-engagement-survey.md) and informs ADR-0004.

**Note:** The synthesis recommends "front-load 12/10/8 per biome" while also saying "~75 total." Those numbers don't reconcile (12+10+8=30). Treat the per-biome breakdown as the directional shape and the total as TBD - fish count will get a dedicated numeric design pass.

## 1. Biome inventory (release order)

AbyssRium ships as a family of separate apps and as tanks-within-the-app. In the original **Tap Tap Fish: AbyssRium** (2016):

- **Saltwater Tank / Abyss Tank** - the base biome you start in. The Classic version totals ~152 normal fish across all tanks; the Saltwater root probably holds ~80-100 of those.
- **Freshwater Tank** - in-app unlock added later. ~87 normal fish (Nov 2024 snapshot).
- **Event tanks** (Halloween, Christmas, 5th Anniversary, Space Diving, May Wonderland, Spring) - rotating cosmetic biomes with 10-25 fish each, treated like paid/timed packs.

Sister apps released as separate biomes: **AbyssRium Pole** (Dec 2019, polar, server shut down May 2023), **AbyssRium World / Hello Whale** (multi-biome management spinoff with Coral Tree Island and more), and **AbyssRium Classic** (a 2024 re-release).

Takeaway: the *core* shipping experience is **2 biomes** (Saltwater + Freshwater). Everything else is event content or sister apps.

## 2. Biome unlock conditions

- **Freshwater** unlocks when the **Lonely Coralite reaches Level 1500** in the Saltwater tank. You then get a Freshwater coralite and a "Switch Worlds" button.
- **Map icon / Stone tab** unlocks at Coralite Level 300 in Saltwater + "Free Him" in the Stone tab.
- Pole/World are separate apps, no in-game gate.
- No coin-only gates; the entire gate is **coralite level**, which is a vitality sink.

## 3. Fish-per-biome and unlock pattern

Saltwater ~80-100 normal fish + 213 "episode fish" + 52 "package fish" (Classic totals). Freshwater ~87. Unlock pattern is **milestone-based, not evenly spaced**: each new **Coral species** raises the fish cap by +5 and gates a small batch of new fish, and Coralite-level milestones (multiples of 25, with big jumps at 100/300/500/1000/1500) unlock new corals. Front-loaded: lots of cheap fish in your first hour, then a long tail of slow late-game unlocks where one fish per app-open is normal at endgame.

## 4. Pricing curve

**Exponential in-biome, ~step-x10 between biomes.**

- Fish prices "rise exponentially with each purchase." Community guides estimate roughly **1.3-1.5x per next fish** within a tier.
- Coralite upgrades scale: **upgrade L(X) -> L(X+25) costs ~70x L(X)'s vitality**, which is ~1.18x per level. The 25-level multiplier doubles output, so you target the round number.
- Numbers display in K/M/B/T/aa/ab... so the player feels exponential motion even though the underlying ratio per level is mild.

Rough Coral biome shape: starter fish ~20-50 vitality, mid-Coral fish ~10K-100K, last Coral fish in the millions; ratio cheapest:most-expensive within Saltwater is ~10^5 to 10^6.

## 5. Vitality vs Gems

- **Vitality earned by**: tapping (multi-finger supported, scales with Coralite level), passive coral output, achievement multipliers (x2 at every 25 Coralite levels), and a 30-minute "free ad" magic-shop boost. No true offline accumulation in the original; the Mystery Chest gives a Vitality lump on app open.
- **Gems** are the premium currency at ~100 gems / $1. Spent on: magic-shop vitality boosts, instant fish, skipping the social-share gates, removing ads. Earned free via achievements, watching ads, and Mystery Chests (3 rewards: 30 gems, 60s auto-tap, or vitality).
- **Non-paying path**: every Gem gate has an ad-watching or achievement equivalent. The game is fully completable F2P, slowly.

## 6. Hidden fish (specific examples)

- **Mahi Mahi**: play between midnight and 1am, ten times.
- **Leatherback Turtle**: open 50 Mystery Chests.
- **Juvenile Spotted Boxfish**: open the app via a notification after 2+ hours idle (10% roll).
- **Spotted Mandarin Dragonet**: open via notification.
- **Mauve Stinger**: photograph a jellyfish 10 times.
- **Clown Tang**: photograph a tang 5 times.
- **Manta Ray**: share a stingray photo on Twitter 3 times.
- **Snowflake Clownfish**: tap the Twitter button in settings 10 times.
- **Camel Cowfish**: share a blowfish photo 3 times.
- **Striped Marlin**: photograph the marlin during its rare half-hour spawn.

Pattern: ~half are time/notification-bait, ~half are social-share-bait, a few are pure photo-Easter-eggs.

## 7. Decoration / Coral

- Corals are **functional**: each new coral species adds +5 fish cap and unlocks a fish batch, plus contributes vitality (multiplier-style on Quest/Magic rewards). Late corals start "too expensive" then become the best vitality/sec investment.
- Decorations buyable with Blue Scales raise vitality-per-tick and storage cap; "decoration points" feed an aggregate buff.
- Placement is automatic - you do not free-place objects; the aquarium auto-arranges.

## 8. Daily return drivers

(Listed so we can decide what to clone vs skip)

- Mystery Chest (random per session) - keep, simplified.
- 30-min "free vitality" ad cycle - skip the ad, keep the timer-gated tick.
- Notification-unlock fish - skip.
- Time-of-day fish (midnight) - skip.
- Quest list with photo prompts - keep, lightly.
- Achievement multipliers at level 25/50/75 milestones - keep.
- Daily login streak / event banners - skip.
- Social-share fish - skip entirely.

## 9. Photo mode

3D paused-scene camera: pan, rotate, zoom, save. Many fish are share-locked (the game checks that the share dialog opened, not that you actually posted - players exploit this). For a single-player web clone: keep the camera + local PNG save; drop the social gate entirely; offer optional "copy link" if we want low-pressure sharing.

## 10. Time-to-completion

- Reef Builders' 2-week review hit **Coralite Level 1000** without paying - that's roughly the point where the Saltwater catalog is mostly filled but Freshwater (gated at 1500) is not yet open.
- Community consensus: Saltwater "complete enough to enjoy" in **2-4 weeks** f2p; full collection plus hidden fish takes **months**. Freshwater another ~2-4 weeks. Active tapping shaves maybe 30%.
- Hours-of-play: probably ~10-20 active hours per biome to feel "done," but distributed over weeks because of soft pacing.

## Synthesis - recommendations for our v1

**Biome count: 3.** Two feels thin given Scott's reference is a 2-biome game with years of event content; four risks late biomes feeling empty. Three biomes lets us hit "starter / mid / reward" without padding.

**Fish per biome: ~20-30, total ~75.** Far below AbyssRium's hundreds, but AbyssRium leans on quantity to mask repetition. With a tighter, hand-curated set we can keep every unlock memorable. Front-load (12 in biome 1, 10 in biome 2, 8 in biome 3) so the first hour delivers most of the dopamine. *(Note: 12+10+8=30, not 75; treat the breakdown as directional, real number set in Phase 2.)*

**Pricing curve: exponential 1.35x per fish within a biome; 25x step between biomes.** First fish: 10 vitality. Last fish in biome 1: ~10 * 1.35^19 = ~2,400 vitality. First fish in biome 2: ~60,000. Final fish of biome 3: ~10^9. Display in K/M/B units so the player feels the climb.

**Vitality earning:** ~1/tap baseline, +1 per fish owned, +offline accrual at fish-rate (cap = 8 hours), achievement multipliers every 10 fish or every 25 coralite levels. No ads, no gems, no premium tier.

**Clone these mechanics:** coralite-level-as-gate, fish-cap-via-corals, milestone multipliers at round numbers, photo mode (camera + local download only), Mystery Chest as a once-per-session reward (no ad), 3-5 charming Easter-egg fish using non-creepy conditions (e.g., "open the app on a rainy day," "have 0 fish for 60 seconds," "tap the empty corner 20 times").

**Skip:** social-share gates, notification bait, time-of-day fish, daily login streaks, premium currency, "free vitality" ad timers, event FOMO banners, paid biome packs.

**One-sentence biome themes:**
- **Biome 1 - Tide Pool:** sun-warmed shallow corals, parrotfish and clownfish; the "first hour" delight zone.
- **Biome 2 - Open Reef:** mid-depth blue, rays and turtles, kelp forest light; the "you live here now" zone.
- **Biome 3 - Abyss:** dark indigo, bioluminescence, anglerfish and giant squid; the "you earned this" reward biome.

**Time-to-completion anchor: ~15-25 active hours total, spread across 2-4 weeks of casual check-ins.** Roughly 5-8 hours per biome. Long enough that the collection feels earned, short enough that we don't accidentally need months of content.

## Sources

- [Tap Tap Fish: AbyssRium Freshwater World Guide - The Zelda Zone](https://zelda.zone/guides/abyssrium/abyssrium-freshwater-guide/)
- [Tap Tap Fish AbyssRium Hidden Fish Guide - The Zelda Zone](https://zelda.zone/articles/tap-tap-fish-abyssrium-walkthrough-hidden-fish-guide/)
- [Hello Whale Idle Aquarium (AbyssRium World) Guide - The Zelda Zone](https://zelda.zone/guides/abyssrium-world-guide/)
- [Abyssrium Wikia | Fandom](https://abyssrium.fandom.com/wiki/Abyssrium_Wiki)
- [Normal Fish (Classic) | Abyssrium Wikia](https://abyssrium.fandom.com/wiki/Normal_Fish_(Classic))
- [Normal Fish (Freshwater) | Abyssrium Wikia](https://abyssrium.fandom.com/wiki/Normal_Fish_(Freshwater))
- [Mystery Chest | Abyssrium Wikia](https://abyssrium.fandom.com/wiki/Mystery_Chest)
- [Tap Tap Fish Abyssrium: How to Unlock Every Hidden Fish - GameSkinny](https://www.gameskinny.com/tips/tap-tap-fish-abyssrium-how-to-unlock-every-hidden-fish/)
- [Tap Tap Fish: Abyssrium Tips and Tricks Guide - WriterParty](https://writerparty.com/party/abyssrium-tips-and-tricks-guide-hints-cheats-and-strategies/)
- [We Played Abyssrium For Two Weeks - Reef Builders](https://reefbuilders.com/2016/12/12/we-played-abyssarium-for-two-weeks-heres-what-happened/)
- [Tap Tap Fish - AbyssRium (App Store)](https://apps.apple.com/us/app/tap-tap-fish-abyssrium/id1068366937)
- [Tap Tap Fish: AbyssRium (2016) - MobyGames](https://www.mobygames.com/game/113695/tap-tap-fish-abyssrium/)
