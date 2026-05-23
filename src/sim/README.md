Simulation tick loop, AI, and offline catchup.

- `SimLoop` (M2.1): 5Hz tick, handler registry, start/stop. Per ADR-0003.
- `OfflineCatchup` (M2.5): timestamp-based catchup math, capped at 24h.
- `VisibilityHandler` (M2.6): pauses sim on tab hide, resumes + applies catchup on show.
- `FishAI` (M3.3): per-fish swim AI (idle drift + occasional darting).
- `CoinEarn` (M3.4): tick handler that adds totalEarnRate * dt to coinBalance.
- `PurchaseFish` (M4.2): validates balance, deducts cost, appends FishInstance.
