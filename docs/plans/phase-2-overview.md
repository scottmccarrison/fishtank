# Phase 2 Overview: Diorama + Ledger (Idle Acorns reframe)

## Why

v1 ships a functional buy-loop with three biomes, 28 fish, 10 decorations, save persistence, offline catchup, and biome transitions. Initial review (2026-05-23) found it mechanically snappy but visually flat: all 28 species share one `FishAI`, there is no capacity ceiling, and the dominant strategy is "buy 100 of the cheapest fish," which reads as a busy random tank. Decorations are pure clutter.

The root cause is architectural: v1 renders one sprite per *fish unit*, so a live simulation of dozens of identical sprites was always going to look chaotic, and making that swarm look cozy is the expensive kind of production work (custom animation, evolution states, particle systems) we cannot match with an asset pack and procedural AI.

Phase 2 reframes the game after Idle Acorns: **decouple representation from state.** The scene shows *meta* growth (a new species, a new decoration, a bigger tank); the structured UI tracks *depth* growth (counts, rates, collection). We keep the swim sim but run it at low density - one sprite per species - which is exactly the density at which authored behavior becomes legible and charming instead of noisy.

## The model

### Top half - Diorama (living vignette)
A swim sim, de-densified. Renders **one sprite per owned species** in the current biome (~10 sprites max per biome), not one per fish unit. Low density is the enabling constraint: it lets each sprite carry *authored* behavior - archetypes (school / bottom / surface / drift / predator), fish-to-fish interactions (chasing), fish-to-decoration interactions (hiding, perching). Light idle animation is always on so the scene reads alive, never static. Tank-size tier changes the diorama art. Decorations are functional anchors, not clutter. Switchable per biome.

### Bottom half - Ledger (structured growth)
The structured-UI half. A species collection list with per-species counts ("Goldfish x12"), each count contributing earn rate. The shop (buy fish, decorations, tank upgrades), pearl conversion, and biome tabs all live here. This is where depth growth is tracked and where most purchases register without changing the scene.

### State
Fish become **per-species counts**, not individual instances. This collapses v1's `fishInstances[]` (with x/y/direction per fish) and retires the swarm `FishAI`. The diorama instantiates exactly one display sprite per species whose count > 0.

### Currencies
- **Coins** - primary. Earned passively (sum of `speciesCount x rate` across all biomes). Spent on fish, decorations, and tank-size upgrades.
- **Pearls** - gate currency. Converted from coins at a steep rate (a deliberate large sink). Spent to unlock biomes. Idle Acorns' firewood -> diamond -> ocean pattern.

### Tank size
Per-biome. Caps total fish (summed counts) in that biome - the sink that forces you to either upgrade the tank or convert coins to pearls and advance. Bought with coins. Each tier changes the diorama art.

### Identity hook
Individual-fish tap-to-bond is **dropped** (it does not fit a counts model). Replaced by **collection completion** - collecting all N species in a biome is the retention/identity goal.

## Decisions locked

| Decision | Value |
|----------|-------|
| Representation vs. state | Decoupled: diorama shows meta growth, ledger shows depth growth |
| Sprite density | One sprite per owned species (not per unit) |
| Fish state model | Per-species counts; no per-instance fish |
| Behavior | Authored data (declared pairings), not emergent physics |
| Currencies | Coins (primary) + Pearls (gate, converted from coins) |
| Biome gating | Pearls, converted from coins at a steep rate |
| Tank size | Per-biome cap on total fish; coins buy it; tier changes art |
| Identity hook | Collection completion (tap-bond dropped) |
| Save migration | Bump `fishtank.save.v1` -> `.v2`, wipe old saves (no live players) |

## Epics

### A - New shell (foundation)
The structural restructure. Save schema v2 (counts model), top/bottom split layout, diorama rendering one sprite per species with light idle motion and per-biome switching, ledger with the species collection + counts + relocated shop + biome tabs. Ships with *basic* motion so it stands alone; rich behavior is Epic B.

### B - Behaviors and interactions
The charm layer, built on A. Authored archetypes, fish-to-fish interactions (chasing), fish-to-decoration interactions (hiding/perching), and functional decorations. Declared as data in the species/decoration registries so we control exactly which pairings appear.

### C - Economy and gating
Pearl conversion UI and math, per-biome tank-size caps + upgrade flow, biome unlock gated by pearls, and a balance pass across the whole coin -> pearl -> biome loop.

## Sequencing

1. **A** lands first - it is the new shell everything else attaches to.
2. **B** and **C** can proceed in parallel once A merges; neither blocks the other (B touches the diorama + behavior data, C touches the ledger + economy).

Each epic gets its own `docs/plans/phase-2-<name>.md` written just before implementation.

## What this phase explicitly does NOT do

- New fish species (28 is enough)
- New biomes (3 is locked by ADR-0001)
- New decorations (10 is enough)
- Individual-fish bond / naming (dropped in favor of collection completion)
- Sound, lighting polish - deferred to Phase 3
- Achievements beyond collection completion - deferred to Phase 3

## Superseded

This replaces the earlier capacity-only plan (sprite-swarm capacity model). The original Phase 2 in `docs/ROADMAP.md` ("Post-v1 polish and retention") moves to Phase 3 unchanged. ROADMAP edit lands as a small standalone PR.
