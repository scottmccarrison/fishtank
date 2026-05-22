Simulation tick loop and offline catchup.

- `SimLoop` (M2.1): 5Hz tick, handler registry, start/stop. Per ADR-0003.
- `OfflineCatchup` (M2.5): timestamp-based catchup math, capped at 24h.
- `VisibilityHandler` (M2.6): pauses sim on tab hide, resumes + applies catchup on show.
