# ADR-0002: MVP scope and what we are not building

**Status:** Accepted (with room to revise after first playable build)
**Date:** 2026-05-20

## Context

Idle games attract feature creep. The genre's worst examples are bloated with breeding, genetics, social mechanics, time-limited events, and microtransactions. We need an explicit "no" list so it's harder to wander.

## In scope (MVP)

- Buy fish from a shop. Each fish has a price and a coins/sec rate.
- Fish swim around the tank with simple AI (idle drift, occasional darting).
- Fish generate coins on a fixed timer. Click or auto-collect (TBD during prototyping).
- Buy decorations (plants, gravel, castle, etc.) - cosmetic only in MVP.
- Buy bigger tanks (raises fish capacity, possibly multiplies earnings).
- Save state in localStorage. Reload restores the tank.
- One single tank view. No tabs, no menus beyond Shop and Settings.

## Out of scope for MVP (may revisit later)

- Multiple tanks
- Breeding / genetics / fish stats beyond price + earn rate
- Fish moods, health, food, illness
- Achievements
- Time-limited events
- Daily login bonuses
- Sound (add in polish phase, not MVP)
- "Visit my tank" sharing - this is Phase 2

## Out of scope, period

- **Microtransactions.** Whole reason the project exists.
- **Ads of any kind.** Same.
- **Dark patterns:** push notifications nagging users back, FOMO timers, gambling-style fish purchases, energy systems, "premium currency".
- **Accounts as a hard requirement.** A future visit feature may need optional accounts; the core game must remain playable without one.
- **Analytics that track individuals.** Aggregate, anonymous stats are fine if/when we add any.

## Success criteria for "MVP done"

1. A new player can buy their first fish within 60 seconds of page load.
2. The core loop (earn -> spend -> earn more) feels rewarding for at least one 15-minute session.
3. Closing and reopening the tab restores state correctly.
4. No bugs that lose player progress.

## Consequences

- Players who expect deep idle progression (prestige, ascension, breeding trees) will bounce. That's fine - we are not trying to retain them.
- The MVP is narrow enough that we can honestly tell if it's fun before sinking more time in. If the core loop is boring, no amount of breeding/genetics will save it.

## Notes

Update this ADR (don't delete) when scope changes. Feature additions should justify themselves against the "Out of scope, period" list.
