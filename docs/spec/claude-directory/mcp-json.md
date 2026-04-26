# `.mcp.json`

**Location**: `<repo>/.mcp.json` (repo root, NOT under `.claude/`)
**Commit?** Yes
**Loads**: Every session
**Scope**: Project only — no global `.mcp.json`

## What it does

Team-shared MCP server config. Same `mcpServers` block shape as in
`~/.claude.json`'s personal MCP section, but committed and shared.

## Shape

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}" }
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "kubernetes": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/kubernetes-mcp/index.js"]
    }
  }
}
```

## Variable substitution

The `command` and `env` values support:
- `${ENV_VAR}` — process env at session start
- `${CLAUDE_PLUGIN_ROOT}` — when the entry is shipped by a plugin
- `${user_config.*}` — references to plugin-declared `userConfig` keys (v2.1.83+)
- `${CLAUDE_PLUGIN_DATA}` — per-plugin data dir

## Scopes

| Scope | File | Sharing |
|---|---|---|
| Project (this file) | `<repo>/.mcp.json` | Everyone in the repo |
| User | `~/.claude.json` `mcpServers:` | Only you |
| Plugin | `<plugin-root>/.mcp.json` | Anyone who installs the plugin |

## When to use which

- **Project `.mcp.json`** — when the team should share access to the same server (gh, prod DB, etc.)
- **User `~/.claude.json`** — when only you need the server (your personal Notion, Linear, etc.)
- **Plugin** — when shipping the server to others as part of a plugin

## Related
- Claude Code MCP docs: https://code.claude.com/docs/en/mcp
- [`./claude-json.md`](./claude-json.md) — the user-scope alternative
