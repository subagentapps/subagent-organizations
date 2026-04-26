# `mcpServers:`

**Optional.** MCP servers scoped to this subagent.

## Shape

Two forms — inline definition and by-name reference:

```yaml
mcpServers:
  # Inline: scoped only to this subagent
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  # By name: reuse an already-configured server from .mcp.json or ~/.claude.json
  - github
```

## Why scope MCP servers per-subagent

- Reduce attack surface: a subagent that only does browser testing doesn't need GitHub MCP
- Token cost: each server's tool descriptions add to the subagent's context

## Inheritance

If `mcpServers:` is omitted, the subagent inherits the parent session's MCP setup
(project `.mcp.json` + user `~/.claude.json`).

## Related
- [`../claude-directory/mcp-json.md`](../claude-directory/mcp-json.md) — project-shared MCP servers
