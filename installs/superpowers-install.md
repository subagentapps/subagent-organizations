---
name: superpowers-install
intent: Deterministic install plan for the obra/superpowers skill bundle (SDLC-focused, MIT)
version: 0.1.1
last-tested: never (drafted 2026-04-25; resurfaced from PR #4 to main)
model-card-target: claude-sonnet-4-6 (medium)
description: Source-of-truth for installing Jesse Vincent's superpowers skill bundle. Run only when the user invokes /plugin install superpowers; this plan is the deterministic recipe.
output-shape: filesystem state (skills installed) + a brief verification report
---

# Superpowers install plan

Source: [`obra/superpowers`](https://github.com/obra/superpowers) — Jesse
Vincent's SDLC-focused skill bundle, MIT-licensed. We surveyed the README in
PR #3's tier-2 research; this is the deterministic recipe.

## Why now

The orchestrator depends on Superpowers for SDLC-shaped skills (debugging
patterns, code-review heuristics, plan-mode exploration). Today these
substitute via `pr-review-toolkit:*` agents we already have, but
Superpowers is the more battle-tested option.

## What to run

```text
/plugin install superpowers@superpowers-marketplace
```

That's a Claude Code **slash command**, run in the CLI prompt, not in a
shell. The orchestrator cannot run it autonomously — it requires
interactive user input.

## After install — verify

```bash
claude plugins list 2>&1 | grep -i superpowers
```

Expected: at least one line with `superpowers` in it. If empty: the
install failed silently or the marketplace is unreachable.

## What lands

The bundle ships as a plugin under `~/.claude/plugins/` (or wherever
Claude Code's plugin home is). Skills become invocable via their
`/<skill-name>` aliases.

Key skills the orchestrator wants (per the bundle README):

- **`/plan`** — structured planning before code changes
- **`/debug`** — systematic debugging walkthrough
- **`/review`** — pre-commit review ritual
- **`/refactor-safely`** — refactor with verification gates
- **`/test-this`** — test-strategy assistance (overlaps our
  `engineering-cli-testing-strategy.md` spec)

## Out of scope for this plan

- Building Superpowers from source — we install via marketplace
- Customizing skill behaviors — out of orchestrator scope; user does
  that interactively
- Replacing Superpowers with a fork — defer

## Acceptance log

Add a row here after install:

| Date | Account | Outcome | Notes |
|---|---|---|---|
| TBD | admin@jadecli.com | pending | (capture `claude plugins list` output) |

## Sources

- <https://github.com/obra/superpowers>
- This repo's tier-2 research (PR #3) for the original survey
- `installs/tier-2-installs.md` for the broader install context
