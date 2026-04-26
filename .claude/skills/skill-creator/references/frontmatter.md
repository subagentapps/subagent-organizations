# Frontmatter reference

Source: [`code.claude.com/docs/en/skills.md`](https://code.claude.com/docs/en/skills.md)
Pinned at content SHA: `382b48aed37e52e7ff8a58cb22a3c877833709c8011666715ac735c051fa8a90`
Fetched: 2026-04-26

The 24 fields supported by `SKILL.md` YAML frontmatter. All are optional;
only `description` is recommended.

| Field                      | Required    | Description                                                                                                                                                                                                                                       |
| :------------------------- | :---------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`                     | No          | Display name. Defaults to directory name. Lowercase letters, numbers, hyphens only. Max 64 chars.                                                                                                                                                |
| `description`              | Recommended | What the skill does and when to use it. Front-load the key use case — the combined `description` + `when_to_use` is truncated at 1,536 characters in the listing.                                                                                |
| `when_to_use`              | No          | Trigger phrases / example requests. Appended to `description` in the listing; counts toward the 1,536-char cap.                                                                                                                                  |
| `argument-hint`            | No          | Autocomplete hint, e.g. `[issue-number]` or `[filename] [format]`.                                                                                                                                                                                |
| `arguments`                | No          | Named positional arguments for `$name` substitution. Space-separated string or YAML list. Names map to positions in order.                                                                                                                       |
| `disable-model-invocation` | No          | Set `true` to prevent Claude auto-loading. Use for manually-triggered workflows. Also prevents preload into subagents. Default: `false`.                                                                                                          |
| `user-invocable`           | No          | Set `false` to hide from the `/` menu. Use for background-knowledge skills users shouldn't invoke directly. Default: `true`.                                                                                                                      |
| `allowed-tools`            | No          | Tools Claude may use without asking. Space-separated string or YAML list. Pre-approves; doesn't restrict.                                                                                                                                         |
| `model`                    | No          | Model override for the rest of the current turn. Same values as `/model`, or `inherit`. Not saved to settings.                                                                                                                                    |
| `effort`                   | No          | Effort level override. `low | medium | high | xhigh | max`, model-dependent.                                                                                                                                                                       |
| `context`                  | No          | Set `fork` to run in a forked subagent. Default: inline (no subagent).                                                                                                                                                                            |
| `agent`                    | No          | Subagent type to use when `context: fork`. Built-ins: `Explore`, `general-purpose`, `Plan`. Or any name from `.claude/agents/`.                                                                                                                  |
| `hooks`                    | No          | Hooks scoped to this skill's lifecycle. See `code.claude.com/docs/en/hooks.md` § Hooks in skills and agents.                                                                                                                                       |
| `paths`                    | No          | Glob patterns limiting auto-load. Comma-separated string or YAML list. Same format as path-specific rules in `memory.md`.                                                                                                                         |
| `shell`                    | No          | Shell for `` !`command` `` and ` ```! ` blocks. `bash` (default) or `powershell`. PowerShell requires `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`.                                                                                                        |

## Example: minimal

```yaml
---
name: api-conventions
description: API design patterns for this codebase
---

When writing API endpoints:
- Use RESTful naming conventions
- Return consistent error formats
```

## Example: forked subagent + arguments + restricted tools

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
when_to_use: User asks "summarize PR <num>" or "what changed in #<num>"
argument-hint: [pr-number]
arguments: [pr]
context: fork
agent: Explore
allowed-tools: |
  Bash(gh *)
disable-model-invocation: false
---
```

## Example: manual-only deploy skill

```yaml
---
name: deploy
description: Deploy the application to production
context: fork
agent: general-purpose
disable-model-invocation: true
allowed-tools: |
  Bash(npm *)
  Bash(git *)
  Bash(ssh *)
  Read
  Edit
---
```

## String substitutions available in skill content

| Variable               | Description                                                                            |
| :--------------------- | :------------------------------------------------------------------------------------- |
| `$ARGUMENTS`           | All arguments as typed. Auto-appended as `ARGUMENTS: <value>` if not present.        |
| `$ARGUMENTS[N]`        | 0-based positional access.                                                            |
| `$N`                   | Shorthand for `$ARGUMENTS[N]`.                                                        |
| `$name`                | Named argument from `arguments: [name1, name2]` frontmatter.                          |
| `${CLAUDE_SESSION_ID}` | Current session ID — for logging, session-correlated files.                           |
| `${CLAUDE_SKILL_DIR}`  | Directory containing this `SKILL.md`. Use for referencing bundled scripts/files.      |

Multi-word indexed args use shell-style quoting: `/skill "hello world" two`
makes `$0 = "hello world"` and `$1 = "two"`.

## Pre-approval semantics for `allowed-tools`

- **Pre-approves** the listed tools so Claude doesn't prompt for permission while the skill is active
- **Does NOT restrict** — every other tool remains callable; the user's
  permission settings still gate them
- Format: space-separated string or YAML list. Tool patterns use the
  same format as `~/.claude/settings.json` `permissions.allow`
- For Bash, scope to specific binaries: `Bash(gh *)`, not bare `Bash`
