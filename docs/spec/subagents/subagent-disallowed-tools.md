# `disallowedTools:`

**Optional.** Inverse of `tools:` — inherit everything **except** these.

## Shape

```yaml
disallowedTools: Write, Edit
```

## When to use

- "Like the main agent, but can't write" → `disallowedTools: Write, Edit, MultiEdit`
- "Like the main agent, but can't shell out" → `disallowedTools: Bash, PowerShell`

## When NOT to use

If the subagent needs a *narrow* tool set, use `tools:` (allow-list) instead — clearer intent.

## Combining with `tools:`

Don't. Pick one. If both are set, behavior is implementation-defined.

## Related
- [`./subagent-tools.md`](./subagent-tools.md)
