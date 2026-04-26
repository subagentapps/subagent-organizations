# `isolation:`

**Optional.** Run the subagent in an isolated workspace.

## Shape

```yaml
isolation: worktree
```

## What it does

Spawns the subagent in a temporary git worktree so its file edits don't conflict with the
parent's working tree. Worktree is cleaned up on subagent completion (or, if changes were
made, the path + branch are returned in the result for review).

## Default when omitted

No isolation — subagent edits the same working tree as the parent.

## When to use

- Multi-subagent flows where two subagents would otherwise edit the same file
- Risky refactors you want to easily abandon
- Anything paired with `background: true` (worktree avoids races)

## When NOT to use

- Subagents that need to see the parent's uncommitted changes (worktree gets a fresh checkout)
- Quick read-only reviewers

## Related
- [`./subagent-background.md`](./subagent-background.md)
- [`../claude-directory/worktreeinclude.md`](../claude-directory/worktreeinclude.md) — gitignored files copied into the worktree
