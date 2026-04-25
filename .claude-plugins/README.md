# `.claude-plugins/`

Local plugin registry for this repo. Mirrors the structure of `~/.claude/plugins/cache/` but
project-scoped — these plugins are loaded only when Claude Code is run from this working tree.

## Layout

```
.claude-plugins/
├── README.md                # this file
└── manifest.json            # local plugin manifest (planned)
```

## Conventions

- Plugins listed here are *required* for this project's workflows. Anything optional belongs in user-level `~/.claude/plugins/`.
- Every plugin entry must specify `version` and `source` (git ref or marketplace name).
- Loaded by Claude Code on session start when this repo is the working directory.

## Planned entries

- `claudekit` — the `code-review-expert`, `typescript-expert`, `refactoring-expert` subagents.
- `obra/superpowers` — TDD + plan + review skills.
- `vaporif/parry` — prompt-injection scanner hook.
