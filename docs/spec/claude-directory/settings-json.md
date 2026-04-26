# `settings.json`

**Location**: `<repo>/.claude/settings.json` (project) or `~/.claude/settings.json` (global)
**Commit?** Yes
**Loads**: Every session
**Survives compaction**: Yes (not part of message history; runtime config)

## What it does

Permissions, hooks, environment variables, model defaults, status line, theme selection.
The single most-edited config file.

## Shape (validated by `SettingsSchema` in `../claude-code-types.md`)

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": ["Read", "Glob", "Grep", "Bash(git:*)"],
    "deny":  ["Bash(rm -rf*)"],
    "defaultMode": "acceptEdits"
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read|Edit|MultiEdit|Write",
        "hooks": [
          { "type": "command", "command": "claudekit-hooks run file-guard" }
        ]
      }
    ]
  },
  "env": {
    "ANTHROPIC_BETAS": "context-1m-2025-08-07"
  },
  "enabledPlugins": { "typescript-lsp@claude-plugins-official": true },
  "preferredNotifChannel": "terminal_bell",
  "cleanupPeriodDays": 30
}
```

## Precedence (low → high)

Per `SettingsPrecedence` enum:

1. Environment variables (varies — see `env-vars.md`)
2. `~/.claude/settings.json` (global)
3. `<repo>/.claude/settings.json` (project)
4. `<repo>/.claude/settings.local.json` (project-local, gitignored) — see [`./settings-local-json.md`](./settings-local-json.md)
5. CLI flags (`--permission-mode`, `--settings`)
6. **Managed settings** (org policy at `managed-settings.d/`) — overrides everything

## Permission rule grammar

`Tool(arg-pattern)`:
- `Read` — all reads
- `Bash(git log:*)` — only `git log` and subcommands
- `Bash(git commit *)` — exact prefix match
- `Bash(rm -rf*)` — denied; deny rules override allow

## Hooks

Per `HookEvent` enum: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`,
`SubagentStop`, `SessionStart`, `SessionEnd`, `CwdChanged`, `FileChanged`,
`PostToolUseFailure`.

Hook entry types:
- `command` — shell exec (with optional `if:` matcher gate, shipped v2.1.85)
- `prompt` — Claude evaluates a prompt (e.g., "is this command safe?")
- `mcp_tool` — call an MCP tool directly (shipped v2.1.118)

## Validation

In our polyrepo, `_reusable-kb-validate.yml` runs:
```ts
import { SettingsSchema } from '@subagentapps/subagent-organizations/claude-code/schemas';
SettingsSchema.parse(JSON.parse(fs.readFileSync('.claude/settings.json')));
```

Fails CI on any malformed entry.

## File mode

**Set to `0600`** if it contains tokens or other secrets. Our own
`/Users/alexzh/.claude/settings.json` is `-rw-------` per Tier-2 acceptance.

## Worked example

The meta-repo's [`.claude/settings.json`](../../../.claude/settings.json) ships a minimal
allow list + claudekit's `file-guard` hook.

## Related
- [`./settings-local-json.md`](./settings-local-json.md) — gitignored personal overrides
- [`../claude-code-types.md`](../claude-code-types.md) — `SettingsSchema`, `HookEvent`, `PermissionMode`
