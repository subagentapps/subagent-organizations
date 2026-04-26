# `skills:`

**Optional.** Skills available to this subagent.

## Shape

```yaml
skills:
  - review-pr
  - generate-changelog
```

## Default when omitted

Subagent inherits all skills available to the main conversation.

## Why scope skills

- **Token cost** — each skill description is loaded at the subagent's session start
- **Focus** — a code-reviewer subagent shouldn't have "deploy-to-prod" in its toolkit

## Related
- [`../claude-directory/skills.md`](../claude-directory/skills.md) — what skills are
- [`./subagent-tools.md`](./subagent-tools.md) — adjacent capability gate
