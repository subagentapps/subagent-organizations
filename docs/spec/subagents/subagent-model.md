# `model:`

**Optional.** Which model the subagent uses.

## Shape

```yaml
model: sonnet                # haiku | sonnet | opus | inherit | <full-id>
```

## Values

| Value | Use when |
|---|---|
| `haiku` | Fast, cheap subroutines (pattern-matching, simple lookups) |
| `sonnet` | Default for most subagents (balance) |
| `opus` | Heavy reasoning, complex code review, planning |
| `inherit` | Match the main conversation's model |
| Full model ID (e.g. `claude-sonnet-4-6`) | Pin to a specific version |

## Cost ↔ latency tradeoff

A coordinator on Opus + 5 worker subagents on Haiku is often the right shape: high-quality
delegation decisions, cheap parallel execution.

## Related
- [`./subagent-effort.md`](./subagent-effort.md) — orthogonal: thinking depth on the chosen model
