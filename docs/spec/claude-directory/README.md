# `.claude/` directory specs

One markdown spec per file in the canonical Claude Code directory structure. Source:
[`code.claude.com/docs/en/claude-directory.md`](https://code.claude.com/docs/en/claude-directory.md)
+ [`context-window.md`](https://code.claude.com/docs/en/context-window.md), pulled 2026-04-25.

These specs are **what each file does**, **when it loads**, **what shape it must have**, and
**how it behaves across compaction**. Each pairs 1:1 with the typed schemas in
[`../claude-code-types.md`](../claude-code-types.md).

## Files in this directory

### Project-scoped files (under `<repo>/.claude/` unless noted)

| Spec | File | Commit? | Loads when |
|---|---|---|---|
| [`claude-md.md`](./claude-md.md) | `CLAUDE.md` (repo root) | ✓ | Every session |
| [`rules.md`](./rules.md) | `rules/*.md` | ✓ | Every session OR on matching path read |
| [`settings-json.md`](./settings-json.md) | `settings.json` | ✓ | Every session |
| [`settings-local-json.md`](./settings-local-json.md) | `settings.local.json` (gitignored) | ✗ | Every session |
| [`mcp-json.md`](./mcp-json.md) | `.mcp.json` (repo root) | ✓ | Every session |
| [`worktreeinclude.md`](./worktreeinclude.md) | `.worktreeinclude` (repo root) | ✓ | On `git worktree add` |
| [`skills.md`](./skills.md) | `skills/<name>/SKILL.md` | ✓ | Description loads at session start; body on invocation |
| [`commands.md`](./commands.md) | `commands/*.md` | ✓ | On `/name` invocation |
| [`output-styles.md`](./output-styles.md) | `output-styles/*.md` | ✓ | When selected as active style |
| [`agents.md`](./agents.md) | `agents/*.md` | ✓ | When delegated to (description loads at startup) |
| [`agent-memory.md`](./agent-memory.md) | `agent-memory/<name>/` | ✓ | Auto-loaded by named subagent |

### Global-scoped files (under `~/.claude/`)

| Spec | File | Loads when |
|---|---|---|
| [`claude-json.md`](./claude-json.md) | `~/.claude.json` | Every session (app state) |
| [`global-projects.md`](./global-projects.md) | `~/.claude/projects/<project>/memory/` (auto memory) | Every session |
| [`keybindings.md`](./keybindings.md) | `~/.claude/keybindings.json` | Every session |
| [`themes.md`](./themes.md) | `~/.claude/themes/*.json` | When selected |

### Application-data paths (mentioned for completeness — Claude Code writes these, you don't)

`projects/<project>/<session>.jsonl` (transcripts), `file-history/<session>/` (pre-edit
snapshots), `plans/`, `debug/`, `paste-cache/`, `image-cache/`, `session-env/`, `tasks/`,
`shell-snapshots/`, `backups/`, `history.jsonl`, `stats-cache.json`. See
`claude-directory.md` §"Application data" for retention rules.

## Why these specs

The polyrepo plan ([`../polyrepo-architecture.md`](../polyrepo-architecture.md)) gives every
KB child its own `.claude/` directory. Without a per-file contract, child repos drift —
each maintainer edits their own `settings.json` with slightly different conventions. These
specs are what `_reusable-kb-validate.yml` enforces.

## Compaction fate (cross-cutting concern)

From `context-window.md` §"What survives compaction":

| File type | After compaction |
|---|---|
| `CLAUDE.md` (root), unscoped `rules/*.md`, auto memory | Re-injected from disk |
| Path-scoped `rules/*.md` (with `paths:` frontmatter) | Lost until matching file is read again |
| Nested `CLAUDE.md` in subdirectories | Lost until file in that subdirectory is read again |
| Skill bodies (after invocation) | Re-injected, capped at 5,000 tokens/skill, 25,000 tokens total |
| `settings.json` permissions/hooks | Unchanged (not part of message history) |
| Output styles | Unchanged |
| Hooks | Run as code; not context |

This means: **put load-bearing instructions in root `CLAUDE.md` or unscoped rules**; not in
nested CLAUDE.md or in skills if they need to survive compaction.
