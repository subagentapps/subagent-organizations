# `skills/<name>/SKILL.md`

**Location**: `<repo>/.claude/skills/<name>/SKILL.md` or `~/.claude/skills/<name>/SKILL.md`
**Commit?** Yes
**Loads**: Description at session start; body on invocation.

## What it does

Reusable prompts, invokable as `/skill-name`. Auto-invoked when the description matches
the user's intent. Each skill lives in its own folder so it can ship support files
(scripts, references, examples).

## Shape

```yaml
---
name: review-pr
description: Run a focused PR review. Use after a feature branch is ready to merge.
---
```

```markdown
# Review PR

Steps:
1. Run `gh pr diff` to see changes
2. ...
```

## Compaction & token cap (the load-bearing detail)

Per `context-window.md`:

> *"Skill bodies are re-injected after compaction, but large skills are truncated to fit
> the per-skill cap (5,000 tokens), and the oldest invoked skills are dropped once the
> total budget is exceeded (25,000 tokens). Truncation keeps the start of the file, so
> put the most important instructions near the top of `SKILL.md`."*

| Constraint | Limit |
|---|---|
| Per-skill body cap (after compaction) | 5,000 tokens |
| Total skill budget across all invoked skills | 25,000 tokens |
| Eviction policy | Oldest-invoked dropped first |
| Truncation | Keeps the head; tail is dropped |

## Folder layout (when you need support files)

```
.claude/skills/review-pr/
├── SKILL.md              # the prompt (this file)
├── references/
│   └── style-guide.md    # loaded on demand if SKILL.md references it
├── examples/
│   └── good-review.md
└── scripts/
    └── pr-checks.sh      # invoked from SKILL.md via Bash
```

## Validation

`SkillFrontmatter` Zod schema. Token-count lint runs separately — currently no
ready-made tool, but `npx tiktoken` against the body is one option.

## Related
- [`./commands.md`](./commands.md) — single-file alternative to skills
- [`../claude-code-types.md`](../claude-code-types.md) — `SkillFrontmatter`, `CompactionFate.ReinjectedTruncated`
