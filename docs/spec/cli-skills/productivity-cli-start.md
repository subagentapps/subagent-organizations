# `/productivity:start` — CLI implementation contract

Status: **draft** (Wave 0)
Source: `vendor/anthropic/knowledge-work-plugins/productivity/skills/start/SKILL.md` (158 lines, vendored audit copy)
Companion to: [`../cli-parity-contracts.md`](../cli-parity-contracts.md) §`start`
Implementation target: `subagentapps/knowledge-work-plugins-cli` repo, path `productivity-cli/skills/start/SKILL.md`

## Purpose

Initialize the CLI productivity system: ensure `TASKS.md`, `CLAUDE.md`,
and `memory/` exist in the user's working directory, optionally bootstrap
memory from existing tasks. **Does NOT create or open `dashboard.html`** —
that's a deliberate divergence from upstream Cowork (terminal-first, no
HTML dashboard).

## Why a separate spec for the CLI port

The upstream Cowork SKILL.md (line numbers cited as `upstream:N`) ships
features that don't transfer to a terminal-first context:

| Upstream feature | CLI port decision |
|---|---|
| `upstream:25-26` Copy `dashboard.html` from plugin root | **Skip** — no HTML dashboard in CLI |
| `upstream:30-32` "Tell user to open dashboard.html in browser" | **Replace** — list ready files and `/productivity:update` invitation in stdout |
| `upstream:84-105` MCP-source comprehensive scan (Chat/Email/Calendar/Docs) | **Reduce** — only chat substitute (GitHub Issue comments) and document scan (repo Markdown) per `../cli-parity-contracts.md` connector reduction; email/calendar return `OUT_OF_SCOPE_CONNECTOR` |
| `upstream:106-141` Write `CLAUDE.md` + `memory/{glossary,people,projects,context}.md` | **Adopt verbatim** — these files are repo-local and substrate-agnostic |

Everything else maps 1:1.

## Required frontmatter (verbatim shape)

```yaml
---
name: start
description: Initialize the productivity-cli system. Use when setting up the plugin for the first time, bootstrapping working memory from your existing task list, or decoding the shorthand (nicknames, acronyms, project codenames) you use in your todos.
---
```

The `description` differs from upstream only in: replacing "and open the
dashboard" with no equivalent (we don't open anything), and replacing
"productivity system" → "productivity-cli system".

## Required body — 8 steps mirroring upstream

Step numbers match `upstream:` for traceability:

### Step 1 — Check what exists

```
Check the current working directory for:
- TASKS.md         (task list)
- CLAUDE.md        (working memory)
- memory/          (deep memory directory)
```

**Diverges from upstream:** drops the `dashboard.html` line.

### Step 2 — Create what's missing

Same as upstream `upstream:22-28` MINUS the `dashboard.html` step:

> If `TASKS.md` doesn't exist: create from the task-management skill's standard template.
>
> If `CLAUDE.md` and `memory/` don't exist: fresh setup — proceed to Step 5 (memory bootstrap) after Step 4.

### Step 3 — Tell the user what's ready

**Replaces upstream's "open dashboard" instruction.** Output to stdout:

```
✓ productivity-cli initialized
  TASKS.md       (X items)
  CLAUDE.md      (Y memory entries)
  memory/        (people: Z, projects: W, terms: V)

Next:
  /productivity:update                 # sync tasks, check memory
  /productivity:update --comprehensive # deep scan
  /productivity:add "task description" # add a task
```

If counts are zero (fresh init), show "(empty — bootstrap memory next)" instead.

### Step 4 — Orient the user

Verbatim from upstream `upstream:34-43` BUT replacing "Dashboard open" with
"productivity-cli ready". Same `/productivity:update` invitation.

### Step 5 — Bootstrap memory (first-run only)

Same as upstream `upstream:45-81`. Adopt verbatim.

The interactive shorthand-decoding (`upstream:71-79`) works as-is in
terminal — it's just stdin/stdout question-and-answer.

### Step 6 — Optional comprehensive scan

**Reduced** from upstream `upstream:84-105`:

```
Do you want me to do a comprehensive scan? Available sources in CLI mode:
  ✓ GitHub Issue comments (chat substitute)
  ✓ Repo markdown (recent specs, READMEs in this and linked repos)
  ✗ Email — out of scope (CLI doesn't connect to ~~email)
  ✗ Calendar — out of scope (CLI doesn't connect to ~~calendar)
  ✗ Documents — out of scope unless under repo path
```

Available sources are scanned; OUT_OF_SCOPE sources surface a one-line
`OUT_OF_SCOPE_CONNECTOR: <name>` in the report rather than silently
skipping.

### Step 7 — Write memory files

Adopt **verbatim** from upstream `upstream:106-141`. The CLAUDE.md +
memory/ schema is identical; only the substrate (filesystem) is the
same.

### Step 8 — Report results

Same as upstream `upstream:142-151` BUT drop "Dashboard: open in browser":

```
✓ productivity-cli ready
- Tasks:   TASKS.md (X items)
- Memory:  X people, Y terms, Z projects
- Sources scanned: <list>
- Out of scope:    <list>

Next: /productivity:update [--comprehensive]
```

## Required dependencies (when CLI repo implements)

| Dep | Why | Version pin |
|---|---|---|
| Bash + `gh` | GitHub Issue access for chat-substitute scan | already in environment |
| `mkdir`, `cp`, `tee` | filesystem ops | always present |

**No new package deps.** This skill is pure Bash + filesystem + `gh api`.

## Tests (mirror to `tests/cli/productivity-cli.test.ts`)

The test file already exists on main (PR #21 cherry-picked it). The 6 todo
tests under `describe('productivity-cli :: /start ...')` map 1:1 to this
spec:

| Test | Asserts |
|---|---|
| `creates TASKS.md when missing` | upstream contract; Step 2 |
| `creates CLAUDE.md + memory/ when fresh install` | upstream contract; Step 2 |
| `CLI does NOT open dashboard.html` | divergence; Step 3 + Step 8 |
| `prompts for memory bootstrap interview on fresh install` | Step 5 |
| `idempotent: re-running /start with all files present is a no-op` | Step 1 |
| `edge case: refuses to overwrite an existing non-template TASKS.md` | Step 2 (safety) |

Implementation lands when the cli-repo `/start` skill ships these as
passing assertions.

## Naming + paths

In the cli repo:

```
productivity-cli/
└── skills/
    └── start/
        └── SKILL.md          ← this contract's body
```

Plugin manifest entry (`productivity-cli/.claude-plugin/plugin.json`)
declares:

```json
{
  "skills": [
    { "name": "start", "command": "/productivity:start" }
  ]
}
```

## What this spec does NOT cover

- `/productivity:update` — separate spec (`docs/spec/cli-skills/productivity-cli-update.md`)
- `/productivity:add` — same; separate
- `task-management` skill body (the `TASKS.md` template) — separate; references this skill's Step 2
- `memory-management` skill body — separate; references this skill's Steps 5-7

## Implementation order (when CLI work picks up)

1. Land this spec (this PR)
2. Land specs for `update`, `add`, `task-management`, `memory-management` (4 follow-up PRs)
3. **Then** the cli repo work has the full contract — implement `/start` skill body in one PR there
4. Mark todo tests passing in `tests/cli/productivity-cli.test.ts`
5. Close issue #1

## Sources

- `vendor/anthropic/knowledge-work-plugins/productivity/skills/start/SKILL.md`
- `docs/spec/cli-parity-contracts.md` §`start`
- `docs/research/cowork-plugin-connectors.md` (connector reduction rationale)
- Cli-parity test file: `tests/cli/productivity-cli.test.ts`
