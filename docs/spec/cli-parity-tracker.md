# CLI parity tracker — cowork ↔ cli per-skill matrix

Status: living document
Owner: `repo-orchestrator` agent
Companion to:
- [`./cli-parity-contracts.md`](./cli-parity-contracts.md) — per-skill contracts
- [`../research/knowledge-work-plugins-cli-survey.md`](../research/knowledge-work-plugins-cli-survey.md) — CLI repo state
- [`../research/cowork-plugin-connectors.md`](../research/cowork-plugin-connectors.md) — connector enums
- [`./cli-skills/`](./cli-skills/) — per-skill implementation specs

## What this tracks

Every skill (and command) in the in-scope cowork plugins, paired with the
status of its CLI parallel:

- **`ported`** — spec exists in `docs/spec/cli-skills/<plugin>-cli-<skill>.md`
  AND a corresponding test (or test plan) is in place. Implementation may
  be partial; the contract is fixed.
- **`tbd`** — neither spec nor test yet. Tracked by a GitHub issue if any.
- **`divergent`** — CLI deliberately differs from upstream. Divergence is
  documented in the per-skill spec (see `Deviations from upstream:` block).

## Source of truth + auto-update

This file is hand-maintained but **guarded by `bun run parity-check`**:

- Script at [`../../src/parity/check.ts`](../../src/parity/check.ts) walks
  `docs/spec/cli-skills/`, the CLI parity contracts, and the open GitHub
  issues, and prints what each row's status SHOULD be.
- Test at [`../../tests/parity/cli-parity-tracker.test.ts`](../../tests/parity/cli-parity-tracker.test.ts)
  parses this matrix and compares against the script's output. PR fails
  if a row claims `ported` while the spec is missing, etc.
- **Carve-out**: a row marked `divergent` with no spec yet is allowed —
  divergence is a forward-looking human commitment ("we plan to differ
  from upstream in this specific way"). Once the spec lands, the script's
  `Deviations from upstream:` block detection promotes the row to the
  proper `divergent` verdict; before then, the status sits as a
  declaration of intent, and the test does not flag it.

When a per-skill spec PR lands (e.g. PR #45 for `productivity-cli-start`):

1. The spec file appears under `docs/spec/cli-skills/`
2. `bun run parity-check` flips that row to `ported` next time it runs
3. A bot can open a follow-up PR updating this matrix; for now the test
   just fails until the row is updated by hand

## Plugins covered

| Plugin (cowork) | Plugin (cli) | Source path | Notes |
|---|---|---|---|
| `productivity` | `productivity-cli` | `subagentapps/knowledge-work-plugins-cli/productivity-cli/` | 4 skills |
| `product-management` | `product-management-cli` | `subagentapps/knowledge-work-plugins-cli/product-management-cli/` | 8 skills |
| `engineering` | `engineering-cli` | (CLI repo doesn't have it yet — tracked at #51) | 2 skills drafted, scope TBD |
| `data` | `data-cli` | `subagentapps/knowledge-work-plugins-cli/data-cli/` | not in scope this wave (tracked separately) |
| `cowork-plugin-management` | `platform-engineering` | (CLI) | not in scope |
| (new) | `it-admin` | (CLI) | new — Anthropic Admin API; not a port |

## Matrix (last-checked: 2026-04-26)

### productivity → productivity-cli (4 skills)

| Skill | CLI command | Status | Spec | Divergence summary | Issue |
|---|---|---|---|---|---|
| `start` | `/productivity:start` | **ported** | [`cli-skills/productivity-cli-start.md`](./cli-skills/productivity-cli-start.md) | terminal-first session bootstrap; project-tracker → GitHub Projects | — |
| `update` | `/productivity:update` | **ported** | [`cli-skills/productivity-cli-update.md`](./cli-skills/productivity-cli-update.md) | progress digest writes to GitHub Issues, not Slack/Doc | — |
| `task-management` | `/productivity:task-management` | **tbd** | (none) | n/a | knowledge-work-plugins-cli#3 (P0/L wave-0 dual-write) |
| `memory-management` | `/productivity:memory-management` | **tbd** | (none) | n/a | — |

### product-management → product-management-cli (8 skills)

| Skill | CLI command | Status | Spec | Divergence summary | Issue |
|---|---|---|---|---|---|
| `write-spec` | `/product-management:write-spec` | **tbd** | (none) | n/a | knowledge-work-plugins-cli#4 |
| `roadmap-update` | `/product-management:roadmap-update` | **tbd** | (none) | n/a | — |
| `stakeholder-update` | `/product-management:stakeholder-update` | **tbd** | (none) | n/a | — |
| `synthesize-research` | `/product-management:synthesize-research` | **tbd** | (none) | n/a | — |
| `competitive-brief` | `/product-management:competitive-brief` | **divergent** | (planned) | upstream depends on `~~competitive intelligence` connector (Similarweb etc.); CLI returns `OUT_OF_SCOPE_CONNECTOR` and degrades to manual URL list | — |
| `metrics-review` | `/product-management:metrics-review` | **divergent** | (planned) | upstream depends on `~~product analytics`; CLI degrades to repo-local SQLite or external API token | — |
| `product-brainstorming` | `/product-management:product-brainstorming` | **tbd** | (none) | n/a | — |
| `sprint-planning` | `/product-management:sprint-planning` | **tbd** | (none) | n/a | knowledge-work-plugins-cli#5 |

### engineering → engineering-cli (skills, scope TBD)

| Skill | CLI command | Status | Spec | Divergence summary | Issue |
|---|---|---|---|---|---|
| `system-design` | `/engineering:system-design` | **ported** | [`cli-skills/engineering-cli-system-design.md`](./cli-skills/engineering-cli-system-design.md) | upstream is design-collaboration; CLI is markdown-output-only | #51 (umbrella) |
| `testing-strategy` | `/engineering:testing-strategy` | **ported** | [`cli-skills/engineering-cli-testing-strategy.md`](./cli-skills/engineering-cli-testing-strategy.md) | adds Sentry MCP integration for gap-identification | #51 (umbrella) |
| `stack-check` | `/engineering:stack-check` | **ported** | [`cli-skills/engineering-cli-stack-check.md`](./cli-skills/engineering-cli-stack-check.md) | draft awaiting upstream survey; manifest-vs-lockfile drift hypothesis | #88 |
| `architecture-review` | `/engineering:architecture-review` | **tbd** | (none) | n/a | #51 (umbrella) |
| `incident-postmortem` | `/engineering:incident-postmortem` | **tbd** | (none) | n/a | #51 (umbrella) |

> **Note:** the engineering plugin's full skill list isn't pinned yet —
> upstream `subagentapps/knowledge-work-plugins/engineering/skills/` is the
> source of truth and will get a `routine/survey-engineering` pass.
> The 5 rows above are the skills currently drafted or known to be needed
> for frontend-track work.

## Reading the script output

```bash
$ bun run parity-check
productivity:start                     ported     (spec OK, contract OK)
productivity:update                    ported     (spec OK, contract OK)
productivity:task-management           tbd        (no spec, no test)
productivity:memory-management         tbd        (no spec, no test)
product-management:write-spec          tbd        (no spec, no test)
... (truncated)
engineering:system-design              ported     (spec OK)
engineering:testing-strategy           ported     (spec OK)
engineering:stack-check                tbd        (no spec, no test)
... (truncated)

Summary: 4 ported, 11 tbd, 2 divergent (out of 17 tracked)
```

The script does NOT mutate this matrix. CI surfaces a diff when a row's
declared status doesn't match the derived status; the orchestrator (or
the PR author) fixes the matrix to match.

## Why not auto-derive everything?

We track `divergence-summary` and `blocking-issue` by hand because they
require human judgment that can't be inferred from filesystem state.
The status column is auto-derivable; the rest is curated.

## How rows graduate

```
tbd → ported     when the per-skill spec lands AND a test (or test plan)
                 references the skill name
tbd → divergent  when the contract pins a deliberate deviation (the spec
                 includes a `Deviations from upstream:` block)
ported → divergent  rare; only when an upstream change forces the CLI
                    to deliberately differ. Open an issue first.
```

A row never moves from `ported` back to `tbd` — once shipped, the spec
is committed. Removing a skill means removing the row entirely.

## Open work

- Survey upstream `engineering/` plugin skills list (one routine pass)
- Survey upstream `data/` plugin (deferred — out of scope this wave)
- Add a follow-up issue for each `tbd` row that doesn't yet have one
