# `agents/*.md`

**Location**: `<repo>/.claude/agents/` or `~/.claude/agents/`
**Commit?** Yes (project) or No (global personal)
**Loads**: Description at session start; full body when delegated to.

## What it does

Subagent definitions: a specialized prompt + tools + model + permissions, run in its own
**separate context window** so its file reads don't pollute the main session.

## Frontmatter (16 keys verified from `sub-agents.md`)

For per-key deeplinks, see [`../subagents/`](../subagents/README.md).

```yaml
---
name: code-reviewer              # required: stable identifier
description: ...                 # required: when Claude should delegate
prompt: ...                      # the system prompt (or use the markdown body)
tools: Read, Grep, Glob, Bash    # comma-separated allow-list
disallowedTools: Write, Edit
model: sonnet                    # haiku | sonnet | opus | inherit
permissionMode: acceptEdits
mcpServers: [...]                # inline or by-name reference
hooks: { ... }
maxTurns: 20
skills: [...]
initialPrompt: "..."             # auto-submit a first turn (v2.1.85)
memory: enabled
effort: high                     # default 'high' for Pro/Max on Opus 4.6+ (v2.1.117)
background: true                 # run in background
isolation: worktree              # spawn in a git worktree
color: blue
---

# system prompt body
You are a code reviewer. ...
```

## Validated by

`SubagentFrontmatter` Zod schema in [`../claude-code-types.md`](../claude-code-types.md).

## Compaction

Subagent description (the YAML) loads at session start and survives compaction. Subagent
**body** (the prompt) only enters context when Claude delegates — and lives in the
*subagent's* separate context window, so it doesn't count against the parent session.

## Built-in subagents (no file required)

Claude Code ships these automatically — see `sub-agents.md` §"Built-in subagents":
- General-purpose
- Plan
- Explore

## Worked example

The meta-repo already ships
[`.claude/agents/manifest-curator.md`](../../../.claude/agents/manifest-curator.md) per the
polyrepo spec. Demonstrates the minimum-viable subagent.

## Related
- [`../subagents/README.md`](../subagents/README.md) — deeplink index for every frontmatter key
- [`./agent-memory.md`](./agent-memory.md) — persistent memory for named subagents
- [`../claude-code-types.md`](../claude-code-types.md) — `SubagentFrontmatter`
