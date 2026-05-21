# CLAUDE.md - fishtank

Project context for Claude Code. Read this before working in this repo.

## What this is

An idle fish tank simulator. Web-based, single-player, pixel art. Hobby project.

## Core principles

1. **No microtransactions, no ads, no spam.** This is the entire reason the project exists. Any feature suggestion that nudges toward F2P patterns gets rejected on sight.
2. **Ruthless scope discipline.** The genre attracts feature creep (breeding, genetics, mini-games, social, events). Resist. Ship the boring version first, see if it's fun, then add.
3. **Local-first.** Save state lives in the browser. No accounts, no backend, until "visit my tank" makes one necessary.
4. **Honest progression curves.** Idle game math should respect the player's time. No artificial walls designed to force return visits.

## Stack (current)

See [docs/decisions/0001-tech-stack.md](docs/decisions/0001-tech-stack.md) for current state.

## Workflow

- Feature branches + PRs. Never push directly to main.
- Plans live in `docs/plans/<epic>.md` and get committed with the PR that implements them.
- Decisions get an ADR in `docs/decisions/` before implementation. Update the ADR (don't delete) when something changes.
- Out-of-scope findings -> file a GitHub issue, don't drop them in code comments.

## Where to find things

- [README.md](README.md) - public pitch
- [docs/ROADMAP.md](docs/ROADMAP.md) - phases
- [docs/decisions/](docs/decisions/) - ADRs (numbered, append-only)
- [docs/plans/](docs/plans/) - per-epic plans
