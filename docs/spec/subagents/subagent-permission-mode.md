# `permissionMode:`

**Optional.** How the subagent treats tool-call approvals.

## Shape

```yaml
permissionMode: acceptEdits   # default | acceptEdits | auto | plan | bypassPermissions | dangerouslySkipPermissions
```

## Values

See `PermissionMode` enum in [`../claude-code-types.md`](../claude-code-types.md):

| Value | Behavior |
|---|---|
| `default` | Prompt for every tool call |
| `acceptEdits` | Auto-approve `Read/Write/Edit` (file ops); prompt for everything else |
| `auto` | Run safe ops; block destructive; surface risky for approval (v2.1.83+) |
| `plan` | Plan-only mode; refuse to take destructive actions until approved |
| `bypassPermissions` | Skip approval prompts |
| `dangerouslySkipPermissions` | Skip and don't even log; use only in CI containers |

## Default when omitted

Inherits from the main conversation's permission mode (or `default` if main is also `default`).

## Recommendation for our polyrepo

For KB-curator subagents like `manifest-curator`, **`acceptEdits` is right** — they edit
manifests under CODEOWNERS-protected paths.

## Related
- [`./subagent-tools.md`](./subagent-tools.md) — the other half of the security picture
