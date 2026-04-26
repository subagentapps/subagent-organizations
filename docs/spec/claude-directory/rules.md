# `rules/*.md`

**Location**: `<repo>/.claude/rules/` or `~/.claude/rules/`
**Commit?** Yes (project), No (global)
**Loads**: Unscoped — every session. Path-scoped — when matching file is read.
**Survives compaction**: Unscoped → re-injected. Path-scoped → **lost until trigger file is read again**.

## What it does

Topic-scoped instructions, optionally gated to a file path glob. Lighter than `CLAUDE.md`,
heavier than skills. Use when you have a body of guidance that applies to a *kind of work*
(API design, testing, security review) rather than the whole project.

## Frontmatter shape (validated by `RuleFrontmatter`)

```yaml
---
paths: ["src/**/*.ts", "src/**/*.tsx"]   # optional: only load when one of these matches
description: "TypeScript style + lint rules for this repo"
---
```

```markdown
# TypeScript rules

- Prefer discriminated unions over inheritance
- Use `as const` for literal-typed arrays
- ...
```

## Scoping behavior (the critical bit)

| Frontmatter | When does it load? | Compaction behavior |
|---|---|---|
| No `paths:` | Every session, like `CLAUDE.md` | Re-injected from disk |
| With `paths:` | Only when Claude reads a matching file | **Lost on compaction** until a matching file is read again |

If a rule must persist across compaction, **drop the `paths:` frontmatter** or move the
content to root `CLAUDE.md`.

## When to use rules vs `CLAUDE.md` vs skills

- **`CLAUDE.md`** — repo-wide, always-on, small
- **rules/ unscoped** — repo-wide, always-on, larger sections (one per topic)
- **rules/ path-scoped** — domain-specific, only loads when relevant
- **skills/** — invokable by name (`/skill-name`); body is *not* in context until called

## Worked example

```
.claude/rules/
├── api-design.md      # paths: ["src/api/**"]
├── testing.md         # no paths — always loads
└── security-review.md # paths: ["**/*.ts", "**/*.py"]
```

## Related
- [`./claude-md.md`](./claude-md.md) — when to use root file instead
- [`./skills.md`](./skills.md) — when to make it invokable
- [`../claude-code-types.md`](../claude-code-types.md) — `RuleFrontmatter`, `CompactionFate`
