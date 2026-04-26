# `description:`

**Required.** Tells Claude **when to delegate** to this subagent.

## Shape

```yaml
description: Expert code reviewer. Use proactively after code changes.
```

## Why this is the most important field

Claude reads only the `description` (not the full body) at session start. The router
matches user intent against descriptions to decide whether to auto-delegate. A vague
description means the subagent is never used; an over-broad one means it's used for the
wrong tasks.

## Tips that work

- Lead with the role: "Expert code reviewer."
- Add an explicit use signal: "Use proactively after code changes."
- Avoid the word "agent" (redundant) and adjectives like "advanced" (no signal)
- Keep under 200 chars; the router is matching, not reading prose

## Token cost

Loaded into the system prompt every session. 16 subagents × 200 chars each ≈ 800 tokens
of always-on context. Worth keeping tight.

## Related
- [`./subagent-name.md`](./subagent-name.md)
- [`./subagent-prompt.md`](./subagent-prompt.md) — the body that runs after delegation
