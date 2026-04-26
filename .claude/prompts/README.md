# `.claude/prompts/`

Append-system-prompt files for Claude Code sessions on this repo. Wired in via:

```bash
claude --append-system-prompt-file ./.claude/prompts/<name>.md
```

Each file locks Claude into a specific authoring posture. Distinct from
[`../agents/`](../agents/) (which defines spawnable subagents) and from
[`../CLAUDE.md`](../CLAUDE.md) (always-on project context).

## Files

| File | When to load it |
|---|---|
| [`./sdk-author.md`](./sdk-author.md) | When authoring TypeScript code for `src/subagentmcp-sdk/` — locks identity to "Managed Subagents SDK author," forbids token leaks, enforces type-first / one-file-per-concern conventions |

## When to use a prompts file vs an agents file vs CLAUDE.md

- **CLAUDE.md** — *always loaded*; project-wide context for every session
- **`agents/<name>.md`** — *invoked on demand*; subagent definitions Claude routes to or you call explicitly with `--agent <name>`
- **`prompts/<name>.md`** — *opted into per-session*; main-agent identity override via `--append-system-prompt-file`

The three layers compose: a session can have CLAUDE.md (project context) +
`prompts/sdk-author.md` (identity override) + access to `agents/repo-orchestrator.md`
(spawnable specialist) all at once.
