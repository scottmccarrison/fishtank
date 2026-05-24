# Decisions

Architecture Decision Records (ADRs). Numbered, append-only.

## Format

Each ADR has:
- **Status:** Proposed / Accepted / Deprecated / Superseded by ADR-NNNN
- **Date:** when written
- **Context, Decision, Consequences:** the usual ADR sections

## Rules

- Don't delete an ADR. If a decision changes, mark the old one Deprecated/Superseded and write a new one.
- Lock in only what is actually decided. "Leaning" is fine - flag it explicitly.
- Update the Status field when an item moves from Proposed to Accepted (or anywhere else).

## Index

- [0001 - Tech stack](0001-tech-stack.md)
- [0002 - MVP scope and what we are not building](0002-mvp-scope.md)
- [0003 - Simulation loop, tick rate, and offline progression](0003-sim-loop.md)
- [0004 - Gameplay model and engagement loop](0004-engagement-loop.md) (partially superseded by 0006)
- [0005 - Numeric model for v1](0005-numeric-model.md) (partially superseded by 0006)
- [0006 - Diorama + Ledger redesign (Phase 2)](0006-diorama-ledger-redesign.md)
