# `name:`

**Required.** Stable identifier for the subagent.

## Shape

```yaml
name: code-reviewer
```

- Lowercase, hyphenated; matches `^[a-z0-9-]+$` by convention
- Must equal the filename stem (`agents/code-reviewer.md` → `name: code-reviewer`)
- Globally unique within scope; **higher-precedence scope wins** when duplicated:
  managed > project > user > built-in

## Use it for

- Explicit invocation: *"use the code-reviewer agent to review this PR"*
- Filtering audit logs / OpenTelemetry events
- Referencing in `mcpServers:` or `hooks:` of other definitions

## Related
- [`./subagent-description.md`](./subagent-description.md) — what triggers auto-delegation
- [`../claude-directory/agents.md`](../claude-directory/agents.md) — the file this lives in
