# Subagent frontmatter — deeplink index

Source: [`code.claude.com/docs/en/sub-agents.md`](https://code.claude.com/docs/en/sub-agents.md)
pulled 2026-04-25.

Every YAML key in a subagent's frontmatter has its own spec file in this directory. Each
spec file documents:

- What the key does
- Type / shape / constraints
- Default behavior when omitted
- Worked example
- Compaction / runtime behavior
- Related Claude Code features

These files are **deeplinks** — `agents/*.md` references in the polyrepo template can link
to them by filename, and the same files are linked back from `../claude-directory/agents.md`.

## The 16 frontmatter keys

| Key | Required | Spec | One-liner |
|---|---|---|---|
| `name` | ✓ | [`./subagent-name.md`](./subagent-name.md) | Stable identifier — `agents/<name>.md` filename + invocation |
| `description` | ✓ | [`./subagent-description.md`](./subagent-description.md) | When Claude should delegate (auto-routing signal) |
| `prompt` | optional | [`./subagent-prompt.md`](./subagent-prompt.md) | System prompt; alternative to using the markdown body |
| `tools` | optional | [`./subagent-tools.md`](./subagent-tools.md) | Allow-list of tools (built-ins + Agent + MCP) |
| `disallowedTools` | optional | [`./subagent-disallowed-tools.md`](./subagent-disallowed-tools.md) | Inverse of `tools:` — inherit all except these |
| `model` | optional | [`./subagent-model.md`](./subagent-model.md) | `haiku` / `sonnet` / `opus` / `inherit` |
| `permissionMode` | optional | [`./subagent-permission-mode.md`](./subagent-permission-mode.md) | One of the `PermissionMode` enum values |
| `mcpServers` | optional | [`./subagent-mcp-servers.md`](./subagent-mcp-servers.md) | Inline server defs or by-name references |
| `hooks` | optional | [`./subagent-hooks.md`](./subagent-hooks.md) | Per-subagent lifecycle hooks |
| `maxTurns` | optional | [`./subagent-max-turns.md`](./subagent-max-turns.md) | Bound on conversation turns inside the subagent |
| `skills` | optional | [`./subagent-skills.md`](./subagent-skills.md) | Skills this subagent has access to |
| `initialPrompt` | optional | [`./subagent-initial-prompt.md`](./subagent-initial-prompt.md) | Auto-submit a first turn (v2.1.85+) |
| `memory` | optional | [`./subagent-memory.md`](./subagent-memory.md) | Enable persistent memory under `agent-memory/<name>/` |
| `effort` | optional | [`./subagent-effort.md`](./subagent-effort.md) | Model thinking effort: `low` / `medium` / `high` |
| `background` | optional | [`./subagent-background.md`](./subagent-background.md) | Run in background; notify on completion |
| `isolation` | optional | [`./subagent-isolation.md`](./subagent-isolation.md) | `worktree` to spawn in a git worktree |
| `color` | optional | [`./subagent-color.md`](./subagent-color.md) | UI color tag for the subagent |

## Why deeplink files instead of one big spec

1. **Linkable from anywhere** — a hook or skill referencing "the `tools:` constraint" can
   `<https://github.com/.../subagent-tools.md>` and the reader lands on a focused page.
2. **Diff-friendly** — when one key's behavior changes (e.g. `effort` default flipped to
   `high` for Pro/Max in v2.1.117), the change is one file, not a section in a 1000-line doc.
3. **Compositional** — `_reusable-kb-validate.yml` can lint specific keys against specific
   rules without scanning a monolith.
4. **Mirrors the official docs structure** — Claude Code's docs use anchored sub-sections;
   we use file boundaries for the same effect.

## Validation

`SubagentFrontmatter` Zod schema in [`../claude-code-types.md`](../claude-code-types.md) is
the runtime check; these markdown files are the **human contract** that the schema
enforces.

## Cross-cutting: the LSP integration

Once `marksman` is wired (already done — see [`../../research/lsp-and-ingestion.md`](../../research/lsp-and-ingestion.md)),
clicking any `[name](./subagent-name.md)` link inside `docs/spec/` jumps to the spec file.
The deeplink pattern works end-to-end with no extra tooling.
