# ADR-0005: Numeric model for v1

**Status:** Accepted
**Date:** 2026-05-21

## Context

ADR-0004 set the engagement model and listed pricing curve, biome thresholds, and time-to-completion as "open questions for later." This ADR resolves them for v1.

The shape was validated by simulation against an 8-hour target. Specific values are starting points; expect ~20% tuning during implementation playtesting.

## v1 scope

v1 ships **all three biomes** (Tide Pool, Open Reef, Abyss) with the full ~28-fish collection. This is what "v1" means going forward, not the narrower "Phase 1 MVP" framing from earlier roadmap drafts. The roadmap's Phase 2 is now reserved for post-launch polish (collection log UI, achievements, sound design), not biome work.

## Locked numbers

### Fish counts per biome
- **Tide Pool:** 10 species (1 free starter + 9 to buy)
- **Open Reef:** 10 species
- **Abyss:** 8 species (~4 from the Pixel Gnome pack + supplemental via recolor or commission)
- **Total:** ~28 fish

### Pricing curve

- **First fish cost:** 50 coins
- **Cost ratio within biome:** 1.4x per fish (each fish costs 40% more than the previous)
- **Biome step (cost):** 15x (first fish of new biome costs 15x the last fish of prior biome)
- **Last Tide Pool fish:** ~715 coins
- **Last Open Reef fish:** ~150K coins
- **Last Abyss fish (the goal):** ~50M coins

### Earn-rate model

- **Payback at purchase:** new fish pays itself back in **90 seconds** (so first fish at 50 coins earns ~0.56 c/s)
- **Earn ratio within biome:** 1.16x per fish (earn rate grows slower than cost, so later fish are slightly worse value per coin spent)
- **Biome step (earn):** 15x (matches cost step so biome transition is not punishing)
- **Sim tick rate** is already locked at 5Hz per ADR-0003; earn rate is divided across ticks

### Biome unlock gates

Implicit via cost steps. The 15x biome step is itself the gate - you can't afford the first Reef fish until you've accumulated significantly past Tide Pool's end-state. No separate level / coralite mechanic per ADR-0004.

### Number formatting

Display K / M / B / T units past 1,000 (e.g., 12.4K, 1.5M, 32M). Important for the visual feel of exponential growth on a small canvas.

### Starting state

Per ADR-0004: one free starter fish (Tide Pool species, earning ~0.56 c/s), 0 coin balance, no decorations placed.

## Time-to-completion projection

Simulation (fish-only optimal path) gives:
- **Tide Pool:** ~13 minutes
- **Open Reef:** ~85 minutes
- **Abyss:** ~6.1 hours
- **Total: ~7.7 hours**

Real-world expectations:
- **Fish-only speedrun:** ~7.7 hours
- **Casual play** (not babysitting coin balance every minute): ~10-15 hours
- **With cosmetic decoration spend** (optional): +10-30% time

7.7 hours is the *intended* speedrun ceiling for someone min-maxing fish purchases only. v2+ may add intentional gates and side paths (care mechanics, tank upgrades with real costs) to deepen progression. Out of scope for v1.

## Tank upgrades

Mentioned in ADR-0002 ("buy bigger tanks - raises fish capacity, possibly multiplies earnings") but not yet specified. Two paths for v1:
- **Single tank with capacity 30+** (no upgrades needed, simplest)
- **3-tier capacity** (10 / 20 / 30) with one upgrade per biome unlock

Defer the decision to implementation - whichever feels right when the shop UI is on screen. Capacity model does not change the numeric model above.

## Consequences

- 8-hour speedrun feels brisk versus AbyssRium's 15-25 hour reference. With casual play and optional decoration spend, the effective experience is in the 10-15 hour range, which lines up better.
- The last Abyss fish costs ~50M coins. Number formatting (K/M/B) is mandatory or the UI will be unreadable.
- The 1.16x earn ratio (vs 1.4x cost) means late-biome fish are knowingly bad value per coin. This is the standard idle-game tension: you buy them anyway because you need them for the next step.
- Exact ratios are tunable. If playtesting shows the Abyss grind feels too long, lower the cost ratio to 1.35 or the step to 12 and re-simulate.

## Notes

The full simulation script is reproducible from the variants explored in chat. If we need to re-tune, the simplest path is: drop into Python, plug in new ratios, see where total-time lands, iterate.
