# `memory:`

**Optional.** Enables persistent memory under `agent-memory/<name>/`.

## Shape

```yaml
memory: enabled
```

## What it does

When set, the subagent has read+write access to `<scope>/.claude/agent-memory/<name>/`,
and Claude auto-loads files from there at delegation time.

## Default when omitted

No persistent memory; the subagent's state is reset on every delegation.

## When to use

- Long-running curators (e.g., `manifest-curator` remembers past KB additions)
- Deep-research agents (remember what they've already researched)

## When NOT to use

- Stateless reviewers / linters
- One-shot analyzers

## Related
- [`../claude-directory/agent-memory.md`](../claude-directory/agent-memory.md) — the file layout this lives in
