# `background:`

**Optional.** Run the subagent asynchronously.

## Shape

```yaml
background: true
```

## What it does

The subagent runs in the background — control returns to the parent immediately. The
parent receives a notification when the subagent completes; results retrievable via
`SendMessage` / the agent's task ID.

## Default when omitted

`false` — synchronous; parent waits for completion.

## When to use

- Multi-hour deep-research runs
- Parallel subagents working on independent files (foreground would serialize them)
- "Fire and forget" tasks that should not block the user

## Pairings

Common pattern:
```yaml
background: true
initialPrompt: "Review the security posture of all .github/workflows/ files."
maxTurns: 50
```

## Related
- [`./subagent-isolation.md`](./subagent-isolation.md) — pair with `worktree` to avoid file-conflict races
- [`./subagent-max-turns.md`](./subagent-max-turns.md) — bound runaway background runs
