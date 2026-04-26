# `maxTurns:`

**Optional.** Hard limit on conversation turns inside the subagent.

## Shape

```yaml
maxTurns: 20
```

## Default when omitted

No explicit cap; the subagent runs until it produces a final response or the parent session's
budget is exhausted.

## Why use it

- **Cost control** — runaway subagents are the most common cause of surprise bills
- **Loop prevention** — a poorly-prompted subagent can ping-pong tool calls forever
- **Predictable latency** — caller knows the worst case

## Recommendation

Always set this on subagents that run autonomously (e.g., the `manifest-curator` in our
polyrepo). Default of 20 is a reasonable starting point for review/curation work.

## Related
- [`./subagent-effort.md`](./subagent-effort.md) — orthogonal: thinking budget per turn
- [`./subagent-background.md`](./subagent-background.md) — async runs benefit from explicit caps
