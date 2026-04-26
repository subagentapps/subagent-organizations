# `prompt:`

**Optional.** The subagent's system prompt. Alternative to using the markdown body.

## Shape

```yaml
prompt: |
  You are a code reviewer. When given a PR diff:
  1. Run `gh pr diff` to load the changes
  2. Check for security regressions
  3. Suggest improvements grouped by severity
```

OR — leave the field off and use the markdown body:

```yaml
---
name: code-reviewer
description: ...
---

You are a code reviewer. When given a PR diff:
1. Run `gh pr diff` ...
```

## When to use which

- **Body** — preferred for human-readable subagents (most cases)
- **`prompt:` frontmatter** — required for the `--agents` CLI flag (JSON form, no body)

## Compaction

Subagent prompt enters the *subagent's own* context window when delegated to. Doesn't
count against the parent session.

## Related
- [`./subagent-description.md`](./subagent-description.md) — when this prompt activates
