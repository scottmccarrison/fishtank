# ADR-0003: Simulation loop, tick rate, and offline progression

**Status:** Accepted
**Date:** 2026-05-20

## Context

[Research](../research/idle-game-tech-survey.md) surfaced three coupled questions for any idle game:

1. **Where does the sim loop run?** Main thread or Web Worker?
2. **At what rate?** 1Hz, 5Hz, 20Hz?
3. **How is offline progression handled?** Closed-form math, tick simulation, or hybrid? With what cap?

These three decisions interact (the worker question is partly about backgrounded ticks; the tick rate affects offline catchup cost; the cap affects what state the sim must preserve), so we address them in one ADR.

## Decisions

### Locked

- **Sim loop runs on the main thread.** No Web Worker for MVP.
  - Reasoning: For a visual scene game (not a number-ticker), Workers don't buy us anything when the tab is hidden - the player sees nothing anyway. `lastSavedAt` + catchup ticks on focus/load handles all visible cases correctly. Workers add real cost (message passing for every state read, no direct access to DOM, localStorage, or Phaser objects).
  - Revisit if: we ever add gameplay where continuity *during brief tab-outs* matters visibly (e.g., a fish growth timer that must keep running while you peek at email).

- **5Hz simulation tick rate** (200ms per tick).
  - Reasoning: Coins earn per second, but a sub-second tick gives smooth visual feedback (coin floaters, counter animation). Matches Kittens Game's published rate.
  - Render rate stays at Phaser's default ~60Hz via `requestAnimationFrame`. Sim and render are decoupled.

- **Offline progression: timestamp-based catchup, capped at 24 hours.**
  - On every save (autosave or explicit), persist `lastSavedAt` as an ISO timestamp.
  - On load and on tab-becomes-visible, compute `elapsed = min(now - lastSavedAt, 24h)` and apply catchup. If the economy stays linear (constant earn rate per fish), this can be closed-form: `coins += sum(fish.earnRate) * elapsed`. If non-linear mechanics get added later, switch to tick simulation for catchup.
  - Cap at 24h: protects the economy from "player returns after 3 months" edge cases, and removes the dark-pattern incentive to nag players to return daily. Honest tradeoff disclosed in UI.

- **Pause sim when tab is hidden, resume on visible.**
  - Listen to the Page Visibility API. Stop the `setInterval` on `visibilitychange -> hidden`, restart on `visible`. On restart, run the same catchup math as a fresh load to bring state forward.
  - Same code path for fresh load and tab refocus reduces bug surface.

- **Sim state must be derivable from `(saved state, elapsed time)`.**
  - No mid-tick partial states get persisted. The tick function is idempotent in the sense that running it on the same state always produces the same next state.
  - This is what makes the catchup math work, and what lets us swap between closed-form and tick-simulated catchup without changing the save schema.

### Out of scope for this ADR

- **Save format and versioning.** Locked separately. This ADR only requires that the save includes `lastSavedAt`.
- **Web Worker for sim.** Deferred. Revisit if Phase 2 introduces continuous-visible mechanics.

## Consequences

- The "Welcome back" moment is a small but important UX element. Worth designing intentionally: clear, honest, brief.
- Save schema must include `lastSavedAt` from day one. Trivial to add now, painful to retrofit.
- The 24h cap is visible to the player. A player who logs in once a week gets the same offline bonus as a player who logs in daily. This is the intended behavior - we are not trying to optimize for daily retention.
- Closed-form catchup math is easy now but gets fragile as multipliers/decay/compounding get added. Plan to revisit this when those features land (probably not in MVP).
- Browser timestamps are user-editable. Single-player cheating is acceptable for a hobby game; we will not sign saves.

## Notes

Revisit this ADR if:
- Mechanics get added that need continuous visible updating during brief tab-outs (then: Web Worker)
- The economy becomes non-linear (then: switch catchup to tick simulation, may need to lower the cap)
- Save corruption shows up in user reports (then: add checksum or signing)
- Performance issues appear at 5Hz with many fish (then: lower tick rate or move expensive work off the tick)
