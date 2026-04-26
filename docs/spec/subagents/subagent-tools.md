# `tools:`

**Optional.** Allow-list of tools the subagent can call.

## Shape

```yaml
tools: Read, Grep, Glob, Bash         # CSV string
# OR
tools:
  - Read
  - Grep
  - Bash
```

Or with sub-agent reference:
```yaml
tools: Agent(worker, researcher), Read, Bash
```

## Default when omitted

Subagent **inherits all tools** available to the main conversation.

## Special tools

- **`Agent`** — required if this subagent will spawn its own subagents (e.g., a coordinator)
- **`Agent(name1, name2)`** — restricts which subagents this one can spawn
- **MCP tools** — referenced as `mcp__<server>__<tool>`

## Enum (built-ins)

See `BuiltinTool` enum in [`../claude-code-types.md`](../claude-code-types.md):
`Read`, `Write`, `Edit`, `MultiEdit`, `Bash`, `Glob`, `Grep`, `WebSearch`, `WebFetch`,
`Monitor`, `LSP`, `PowerShell`, `AskUserQuestion`.

## Common patterns

- **Read-only reviewer**: `Read, Grep, Glob, Bash`
- **Editor**: `Read, Write, Edit, Glob, Grep, Bash`
- **Researcher**: `Read, Grep, Glob, WebFetch, WebSearch, Bash`
- **Coordinator**: `Agent(worker), Read, Bash`

## Related
- [`./subagent-disallowed-tools.md`](./subagent-disallowed-tools.md) — inverse approach
- [`./subagent-permission-mode.md`](./subagent-permission-mode.md) — adds another gate
