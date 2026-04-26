# `initialPrompt:`

**Optional.** Auto-submit a first turn when the subagent activates.

## Shipped

v2.1.85 — see `updates/claude-code/2026-w13/07-other-wins.md` (item #5).

## Shape

```yaml
initialPrompt: "List all open PRs with the 'security' label and summarize each one."
```

## Why it's useful

The subagent runs *without waiting for user input on its first turn* — it picks up the
default task from this string. Combined with `--agent <name>` on the CLI, you can spawn
a subagent that immediately starts working:

```bash
claude --agent pr-summarizer
# → no prompt typed, subagent runs initialPrompt → produces summary → exits
```

## Default when omitted

Subagent waits for user input on first turn (standard behavior).

## Related
- [`./subagent-name.md`](./subagent-name.md) — used with `--agent` CLI flag
- [`./subagent-background.md`](./subagent-background.md) — pair with `background: true` for fire-and-forget runs
