# `output-styles/*.md`

**Location**: `<repo>/.claude/output-styles/` or `~/.claude/output-styles/`
**Commit?** Yes
**Loads**: When selected as active style (via `/output-style` or `outputStyle:` in settings).
**Survives compaction**: Yes — system-prompt section, not message history.

## What it does

Custom system-prompt sections that change *how* Claude formats responses. Stored as
plain markdown; activate via `/output-style <name>`.

## Shape

No frontmatter required. Plain markdown. Body is appended to the system prompt.

## Examples (typical use)

```markdown
# Output style: terse-with-paths

When showing files, always include the full absolute path with line numbers.
Avoid emojis. Don't use headers in chat replies — single sentences are fine.
End with a one-line summary of what was done and what's next.
```

## Compaction fate

`CompactionFate.Unchanged` — system prompt + output style are not part of message history.

## Related
- [`./claude-md.md`](./claude-md.md) — the other "loads at session start" mechanism
- [`../claude-code-types.md`](../claude-code-types.md) — `CompactionFate.Unchanged`
