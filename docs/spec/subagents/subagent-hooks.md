# `hooks:`

**Optional.** Lifecycle hooks scoped to this subagent.

## Shape

Same shape as `hooks:` in `settings.json`. Per `HookEvent` enum:

```yaml
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: ./scripts/validate-readonly-query.sh
  Stop:
    - hooks:
        - type: command
          command: echo "subagent done" | tee -a ~/.claude/subagent-events.log
```

## Why scope hooks per-subagent

- Subagent-specific safety (block SQL writes for a "data-scientist" subagent only)
- Subagent-specific telemetry (log when a "deployment-orchestrator" finishes)

## Inheritance

`settings.json` hooks ALSO fire — subagent hooks add to, not replace, the parent set.

## Shipped events for subagents

`Stop` and `SubagentStop` fire when the subagent itself finishes; `PreToolUse` /
`PostToolUse` fire on every tool call inside the subagent.

## Related
- [`../claude-directory/settings-json.md`](../claude-directory/settings-json.md) — repo-wide hooks
- [`../claude-code-types.md`](../claude-code-types.md) — `HookEvent` enum
