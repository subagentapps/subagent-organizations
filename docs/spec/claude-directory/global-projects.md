# `~/.claude/projects/<project>/memory/` (auto memory)

**Location**: `~/.claude/projects/<project>/memory/`
**Commit?** **No** — global, per-machine
**Loads**: Every session
**Survives compaction**: Yes — re-injected from disk

## What it does

Auto memory: Claude's persistent notes to itself across sessions on the same project.
Distinct from `agent-memory/` (which subagents own) — this is the *main agent's* memory.

## How it gets written

Claude writes here when the auto memory system instructs it to. Triggered by user phrases
("remember that...", "from now on...") or by autonomous decisions.

## File types Claude writes here

- `user.md` — persistent facts about the user
- `feedback.md` — preferences ("don't auto-summarize at the end of every reply")
- `project.md` — project-state notes ("the auth refactor uses X strategy")
- `reference.md` — pointers to external systems ("bugs are tracked in Linear PROJ-X")

## Cleanup

`projects/<project>/<session>.jsonl` (transcripts in the parent dir) ARE swept by
`cleanupPeriodDays`. The `memory/` subdirectory is **not** swept — kept until you
delete it.

## Related to our setup

You already have the auto memory system at
`/Users/alexzh/.claude/projects/-Users-alexzh-claude-projects/memory/` per your global
CLAUDE.md instructions. This spec describes the same mechanism for any future child KB
repo.
