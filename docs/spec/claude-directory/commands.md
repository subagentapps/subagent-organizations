# `commands/*.md`

**Location**: `<repo>/.claude/commands/` or `~/.claude/commands/`
**Commit?** Yes
**Loads**: On `/command-name` invocation.

## What it does

Single-file slash commands. Same mechanism as skills, just simpler — no folder, no
support files, no auto-invocation.

## Shape

```yaml
---
description: Create a conventional commit, format the message, push.
---
```

```markdown
Run `git status` and `git diff --staged`. Compose a conventional-commit message
(feat/fix/docs/chore...). Use a HEREDOC to avoid shell quoting issues. After the commit,
run `git push origin HEAD`.
```

User invokes via `/<filename-without-md>`. So `commands/cm.md` becomes `/cm`.

## When to use commands vs skills

- **Commands** — explicit invocation only; one-shot prompts; no support files
- **Skills** — auto-invokable based on description matching; support files; survives
  compaction (with truncation)

## Related
- [`./skills.md`](./skills.md) — fuller alternative
