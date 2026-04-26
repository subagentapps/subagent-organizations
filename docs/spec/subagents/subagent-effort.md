# `effort:`

**Optional.** Model thinking effort.

## Shape

```yaml
effort: xhigh             # low | medium | high | xhigh | max
```

## Values (verified against Anthropic's Opus 4.7 prompting guidance)

| Value | Behavior |
|---|---|
| `low` | *"Reserve for short, scoped tasks and latency-sensitive workloads that are not intelligence-sensitive."* |
| `medium` | *"Good for cost-sensitive use cases that need to reduce token usage while trading off intelligence."* |
| `high` | *"Balances token usage and intelligence. For most intelligence-sensitive use cases, we recommend a minimum of `high` effort."* |
| **`xhigh`** | **NEW for Opus 4.7. *"Extra high effort is the best setting for most coding and agentic use cases."*** |
| `max` | *"Can deliver performance gains in some use cases, but may show diminishing returns from increased token usage. Sometimes prone to overthinking."* |

Source: `platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices.md`
SHA: `a71861e842bc3522` (16-char prefix; pulled 2026-04-25)

## Default

Per Claude Code v2.1.117 release notes (`updates/claude-code/2026-w13/`): default is
`high` for Pro/Max subscribers on Opus 4.6+, `medium` otherwise.

For Opus 4.7 specifically, Anthropic recommends **`xhigh`** for coding/agentic use cases.
Subagents that orchestrate or write code should set `effort: xhigh` explicitly.

## Recommendation per subagent role

| Role | Effort |
|---|---|
| Lead orchestrator (`repo-orchestrator`) | `xhigh` (Anthropic's explicit recommendation for coding/agentic) |
| Curator / writer (`manifest-curator`) | `high` |
| Indexer (`kb-keeper`) | `medium` (cost-sensitive index work) |
| Lookup / triage (`doc-scout`, `prompt-adapter`) | `low` (scoped, fast) |
| Code reviewer (claudekit-shipped) | `xhigh` (coding/agentic) |

## Trade-off notes

- `low` and `medium` on Opus 4.7 strictly scope work to what was asked — no above-and-beyond
- If you see shallow reasoning, **raise effort** rather than prompting around it
- If you see over-thinking, lower effort or add `"respond directly when in doubt"` guidance
- At `xhigh` or `max`, **set a large max output token budget** — Anthropic recommends starting at 64k

## Caveat

This enum reflects Anthropic's published guidance as of 2026-04-25. The `kb-keeper`
subagent should re-verify on its refresh cadence. Future model releases may add or rename values.

## Related
- [`./subagent-model.md`](./subagent-model.md) — orthogonal: which model
- [`./subagent-max-turns.md`](./subagent-max-turns.md) — orthogonal: how many turns
- [`../../research/anthropic-prompting-guidance.md`](../../research/anthropic-prompting-guidance.md) — full audit of Anthropic guidance vs our specs
