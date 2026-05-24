# ADR-0006: Diorama + Ledger redesign (Phase 2)

**Status:** Accepted
**Date:** 2026-05-24

## Context

v1 shipped per ADR-0005: three biomes, ~28 fish, a single tank, per-instance fish with swim AI, single coin currency. A play review (2026-05-23) found it mechanically snappy but visually flat - a "busy random tank." With no capacity ceiling the dominant strategy is buying many of the cheapest fish; all species share one behavior; decorations are pure clutter with no role. Nothing gives a player a reason to stay.

The root cause is architectural, not a missing feature: rendering **one sprite per fish unit** turns the tank into a live swarm of dozens of identical sprites, and making that swarm read as cozy is the expensive kind of production work (custom animation, evolution states, particle systems) we cannot match with an asset pack and procedural AI. v1 demonstrated the failure mode directly.

The fix is a reframe inspired by **Idle Acorns**: decouple *representation* (a curated scene that changes at milestones) from *state* (structured UI that tracks growth). We keep the swim sim but de-densify it to one sprite per species, which is the density at which authored behavior becomes legible instead of noisy.

This ADR revises several locked decisions in ADR-0004 and ADR-0005. Per the repo convention those ADRs stay append-only; this one supersedes the specific items called out inline below, with rationale, so future-us does not relitigate without context.

## Decisions

### Locked

1. **Diorama + Ledger split.** The screen splits into a top **diorama** (the scene) and a bottom **ledger** (structured UI). Representation is decoupled from state: the diorama shows *meta* growth (a new species appears, a new decoration, a bigger tank), the ledger tracks *depth* growth (per-species counts, rates, collection).

2. **One sprite per owned species, not per fish unit.** The diorama renders exactly one display sprite per species with count > 0 (~10 max per biome). This is both the enabling constraint for authored behavior and the direct fix for the "busy random tank." Buying your 2nd-Nth goldfish increments a count in the ledger and raises earn rate; it does not add a sprite.

3. **Fish are per-species counts, not instances.** Save state collapses `fishInstances[]` (with per-fish x/y/direction) into per-biome `fishCounts`. Total earn rate becomes `sum(count * speciesRate)`. The per-fish rate formula from ADR-0005 is preserved exactly; only the aggregation changes.

4. **Portrait orientation.** The canvas flips from landscape 800x600 to portrait (default 450x800, 9:16). A top/bottom split needs vertical room, and portrait is the natural mobile/PWA orientation (AbyssRium and Idle Acorns are both portrait). Revises the landscape assumption baked into v1 and `orientationLock.ts`.

5. **Switchable per-biome tanks.** Each biome is its own diorama scene and ledger view, navigated by tabs. Each biome's tank has its own capacity and its own decorations; you grow each biome independently. One shared coin pool; earn rate sums across all tanks. This resolves ADR-0005's deferred tank-upgrade question in a new direction (per-biome independent capacity, not a single global tank).

6. **Two currencies: Coins + Pearls.** REVISES ADR-0004 decision #2 ("single currency: coins; no vitality/gem split"). Coins stay the primary earn-and-spend currency (fish, decorations, tank upgrades). Pearls are a separate **gate** currency, converted from coins at a steep rate and spent to unlock biomes (the Idle Acorns firewood -> diamond -> ocean pattern). ADR-0004 rejected a second currency because "two-currency systems exist primarily to bridge earnable/purchasable, and we have no purchases." Pearls are not a purchase bridge - they convert a flat coin balance into a deliberate unlock goal, which the implicit cost-step gate did not provide. That is the justification for the reversal.

7. **Biome unlocks gated by Pearls.** REVISES ADR-0004 #3 and ADR-0005 ("biome unlocks are pure coin thresholds / implicit via cost steps / no separate gate mechanic"). Pearls are an explicit, visible gate. Rationale: the implicit cost-step gate gave the player no legible goal or sense of agency at the biome boundary; spending converted pearls makes the unlock a deliberate milestone. Phased: Epic A keeps the `lifetimeEarned` threshold; Epic C introduces pearls and the conversion.

8. **Tank capacity per biome, bought with coins.** REVISES ADR-0005's deferred tank-upgrade question (single tank vs 3-tier). Each biome's tank caps total fish in that biome; upgrades cost coins and advance the diorama art tier. Capacity is a real coin sink and is independent of biome unlocks.

9. **Decorations become functional anchors; drag-placement removed.** REVISES ADR-0004 #5 (drag-and-drop decoration rearranging) and pulls forward the "functional / boost decorations" item ADR-0004 had deferred to v2+. Decorations are auto-placed in the diorama and gain behavioral roles (some fish hide in them) in Epic B. Free drag-rearranging is dropped - it served no purpose and was part of the original complaint.

10. **Identity hook is collection completion, not tap-bond.** We considered AbyssRium-style per-fish tap-to-bond (name a fish, raise affinity, evolve) and rejected it: it does not fit a counts model, and ADR-0004 already kept tapping out of scope. Collecting all species in a biome is the identity and retention goal instead.

### Reaffirmed (unchanged from prior ADRs)

- No microtransactions, ads, or daily-login mechanics (ADR-0002, ADR-0004). Pearls are earned by conversion, never purchased.
- The coin earn formula and all numbers from ADR-0005 (the math is preserved byte-for-byte).
- Pixel art, calm register, local-first, single-player (ADR-0001, ADR-0002, ADR-0004).
- No maintenance / feeding / fish health / prestige loops (ADR-0002, ADR-0004).

## Phasing

- **Epic A (shell):** per-species counts, save schema v2, portrait flip, diorama + ledger. Biome unlock stays a coin threshold; no pearls or capacity yet. Plan: [phase-2a-shell.md](../plans/phase-2a-shell.md).
- **Epic B (behaviors):** authored per-species archetypes + fish-to-fish interactions. **Scoped 2026-05-24 to behaviors only:** decorations (buying UI + fish-to-decoration hiding/perching) split out to a later epic, and predator/prey is **visual-only** (prey flees, nothing is eaten - keeps the cozy/collection model). Plan: [phase-2b-behaviors.md](../plans/phase-2b-behaviors.md).
- **Epic C (economy / gating):** pearls + conversion, per-biome capacity + upgrades, pearl-gated unlocks (save schema v2 -> v3).
- **Epic D (decorations):** decoration buying UI + functional fish-to-decoration interactions (split from Epic B on 2026-05-24).

Overview: [phase-2-overview.md](../plans/phase-2-overview.md).

## Consequences

- v1's swarm sim (FishAI over per-instance fish) is retired; FishAI runs at low density over display fish. Working code is removed, but it is the code that produced the problem.
- The save schema breaks (v1 -> v2, later v3). Pre-release wipe is acceptable; no migration is written.
- A two-currency UI is more to build and balance than ADR-0004 wanted - accepted in exchange for the engagement gain pearls provide at the biome boundary.
- Portrait narrows the desktop-browser experience to a tall strip; accepted as the mobile-first PWA tradeoff.
- The diorama must keep light idle animation or it tips from "aquarium" to "spreadsheet." The de-densified swim sim is the charm, not optional polish.
- New tunables appear in Epic C (pearl conversion rate, capacity cost curve) on top of ADR-0005's existing ones.

## Open questions (not blocking Epic A)

- Pearl conversion rate and how many pearls each biome costs (Epic C).
- Tank capacity start / max and the upgrade cost curve (Epic C; an earlier draft used start 8, max 20, cost `biome_first_fish_cost * 1.4^n`).
- Whether collection completion grants a bonus (modest earn multiplier) or is purely cosmetic (Epic B/C).
- Exact portrait dimensions and split ratio (default 450x800, 60/40 diorama/ledger - tunable).

## Notes

Supersedes specific items in ADR-0004 (#2 single currency, #3 coins-only axis, #5 decoration drag) and ADR-0005 (implicit biome gate, deferred tank upgrades) as noted inline. Update this ADR in place as Epics B and C resolve the open questions.
