# `CLAUDE.md`

**Location**: project root (`<repo>/CLAUDE.md`) or global (`~/.claude/CLAUDE.md`)
**Commit?** Yes (project), No (global)
**Loads**: Every session, before any user prompt
**Survives compaction**: Yes — re-injected from disk

## What it does

Persistent project context Claude reads on every session start. Same mechanism as
human developers reading the README to understand a repo's conventions.

## Shape

Plain markdown. No frontmatter required. Sections by convention but not enforced:

```markdown
# Project name

## Stack
- TypeScript / Node 20+
- bun for scripts, tsup for builds
- ...

## Commands
- bun run build
- bun test
- ...

## Conventions
- Conventional Commits (commitlint enforces)
- Spec-first: docs/spec/ before src/
- ...
```

## Nested CLAUDE.md

Subdirectory `CLAUDE.md` files load when Claude reads a file in or below that directory.
**Lost on compaction** — re-loaded the next time a file in the subdir is touched. Per
`context-window.md`: don't put load-bearing instructions there if they need to survive
compaction; put them in the root file or in unscoped rules.

## Token budget

No hard cap, but compaction re-injects this file every cycle, so keep it tight. Aim for
under 8 KB / ~2,000 tokens. Long-form context belongs in `rules/*.md` with path scoping.

## Validation

No schema. Lint at the workflow level via:
- **markdownlint** for syntax
- **marksman** LSP for cross-references and headings

## Worked example

The meta-repo's `.claude/CLAUDE.md` already exists at
[`/.claude/CLAUDE.md`](../../../.claude/CLAUDE.md) and demonstrates the convention this spec
documents.

## Related
- [`./rules.md`](./rules.md) — when to use rules vs inline CLAUDE.md
- [`../claude-code-types.md`](../claude-code-types.md) — `CompactionFate.ReinjectedFromDisk`
