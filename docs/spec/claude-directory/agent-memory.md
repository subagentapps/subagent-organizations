# `agent-memory/<name>/`

**Location**: `<repo>/.claude/agent-memory/<name>/` or `~/.claude/agent-memory/<name>/`
**Commit?** Yes (project)
**Loads**: Auto-loaded by the named subagent when persistent memory is enabled.

## What it does

Persistent memory directory for a named subagent. Each subagent has its own folder; the
subagent reads/writes here across sessions to remember outcomes, patterns, and prior work.

## Layout (convention)

```
.claude/agent-memory/manifest-curator/
├── decisions.md          # decisions the agent has made
├── known-conflicts.md    # patterns that have caused problems
└── snapshots/
    └── 2026-04-25.md     # timestamped state checkpoint
```

No enforced schema — the subagent owns the contents. The directory just *exists* for the
subagent to find.

## When to use

- Subagents that need to remember their own past actions across sessions
- Coordinator agents that need to track who-did-what

## When NOT to use

- Information all agents need (use root `CLAUDE.md` or `rules/`)
- Per-session scratch (use `~/.claude/projects/<project>/memory/` auto memory instead)

## Related
- [`./agents.md`](./agents.md) — the subagent definition
- Persistent memory docs: https://code.claude.com/docs/en/sub-agents#enable-persistent-memory
