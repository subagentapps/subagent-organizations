# `~/.claude.json`

**Location**: `~/.claude.json` (global only — no project form)
**Commit?** **No**
**Loads**: Every session
**Holds**: App state, OAuth credentials, UI toggles, personal MCP servers

## What it does

The global config Claude Code itself owns. Holds:
- OAuth tokens (`CLAUDE_CODE_OAUTH_TOKEN` materialized via `/login`)
- Personal MCP servers (`mcpServers:` block, separate from `<repo>/.mcp.json`)
- UI preferences carried across sessions
- Recent project list

## Shape

JSON. Schema is implementation-defined; **don't hand-edit unless you know what you're
doing.** Use `/login`, `/logout`, settings UI, or env vars instead.

## Important

- **Don't delete this file** — you'll lose auth and have to re-login.
- The `cleanupPeriodDays` sweep does NOT touch this file.
- Backed up to `~/.claude/backups/` automatically before config migrations.

## Related to our setup

The `subagent-organizations` repo's `.claude/settings.json` is the *project* override; this
file is the *global* baseline that those settings inherit from / override.
