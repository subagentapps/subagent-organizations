# `/skill-creator` skill — implementation contract

Status: **draft** (Wave 1, closes #11)
Source: <https://code.claude.com/docs/en/skills.md> (head of file: `# Extend Claude with skills`)
Companion to:
- [`../../cli-parity-tracker.md`](../../cli-parity-tracker.md) — adds `meta:skill-creator` row when this lands
- `../../research/anthropic-prompting-guidance.md` — what the skill produces is a prompt template
- `<repo>/.claude/skills/skill-creator/SKILL.md` — the implementation mirror

## Why this exists

A repo with `.claude/skills/` accrues skills over time. Each new skill needs:

1. A YAML frontmatter block with the right fields (24 fields documented in
   `code.claude.com/docs/en/skills.md` § Frontmatter reference)
2. Decisions on `context: fork` vs inline, which `agent: <type>`,
   `allowed-tools` scope, `disable-model-invocation`, `paths` glob
3. Optional supporting files for reference content / examples / scripts
4. A name that won't collide with existing slash commands

Hand-rolling that takes 10–15 minutes per skill. `/skill-creator` is a
skill that takes a one-line description as `$ARGUMENTS`, queries the
target repo for existing skill names + slash-command collisions, runs a
short interview through the Explore subagent, and emits a complete
`SKILL.md + references/` scaffold.

## Contract

### Frontmatter

```yaml
---
name: skill-creator
description: |
  Generate a new .claude/skills/<name>/SKILL.md scaffold from a one-line
  description. Use when the user says "create a skill for", "add a skill
  that", or "scaffold a /<verb> command".
when_to_use: |
  Trigger phrases:
    - "create a skill for X"
    - "add a /<verb> command"
    - "scaffold a skill"
argument-hint: "[skill-name] [one-line description]"
arguments: [skill_name, description]
context: fork
agent: Explore
allowed-tools: |
  Bash(gh *)
  Bash(ls *)
  Bash(grep *)
  Read
  Write
  Glob
disable-model-invocation: false
---
```

Why each non-trivial field:

| Field | Choice | Reason |
|---|---|---|
| `context: fork` | yes | Avoids polluting the main session with `gh`+`ls` output that's only useful for one skill emission |
| `agent: Explore` | yes | Explore is the right primitive for "find existing skills, look up frontmatter, sample similar names" |
| `allowed-tools` | `Bash(gh *)`, `Bash(ls *)`, `Bash(grep *)`, `Read`, `Write`, `Glob` | Bare minimum: read the repo, search for collisions, write the new files. No `Edit` because the skill creates fresh files; no `WebFetch` because we cache the canonical skills.md as a reference file (see below) |
| `disable-model-invocation: false` | yes | The model SHOULD pick this up automatically when the user says "create a skill for X" — that's the whole point |
| `arguments: [skill_name, description]` | yes | Two positional args; the description can contain spaces if quoted |

### Dynamic context (the `` !`<cmd>` `` pattern)

The skill body uses `` !`<cmd>` `` to inject live repo state at fire-time:

```markdown
## Repo context

Existing skills:
!`ls .claude/skills/ 2>/dev/null || echo "(none)"`

Reserved slash-commands (top-level):
!`ls .claude/commands/ 2>/dev/null | sed 's/\.md$//'`

Existing agents:
!`ls .claude/agents/ 2>/dev/null | sed 's/\.md$//'`

Most recent 5 PRs (for naming-style sample):
!`gh pr list --state merged --limit 5 --json title,number 2>/dev/null | jq -r '.[] | "  #\(.number) \(.title)"'`
```

When the skill fires, those commands run first, their stdout is spliced
in, and Claude sees the rendered prompt — not the bash invocations. This
gives the model live data without the model having to call tools, which
fits the `Explore` subagent's read-only posture.

### Reference docs (offload from SKILL.md)

To keep `SKILL.md` small (the spec recommends focused, navigable skill
content), three reference files live alongside:

```
.claude/skills/skill-creator/
├── SKILL.md
└── references/
    ├── frontmatter.md      ← canonical 24-field table
    ├── patterns.md         ← !`...` / context: fork / agent: ... examples
    └── snippets.md         ← reusable skill bodies (test-runner, pr-review-helper, etc.)
```

`SKILL.md` references these by relative path so Claude only loads them
when needed. The `frontmatter.md` and `patterns.md` files are extracts
from `code.claude.com/docs/en/skills.md` (§ Frontmatter reference and
§ Dynamic context patterns), pinned at the SHA at fetch time so they
don't drift if the upstream doc changes silently.

### Output the skill produces

When invoked as:

```
/skill-creator pr-summary "summarize PR changes via gh CLI"
```

The skill emits to the user:

1. **Proposed file paths** (relative to repo root):
   - `.claude/skills/pr-summary/SKILL.md`
   - `.claude/skills/pr-summary/references/notes.md` (only if needed)
2. **Full `SKILL.md` content** with frontmatter + body, populated from
   the description + repo context
3. **Test plan** — a one-paragraph description of what to verify after
   the skill is created (typing `/pr-summary` invokes it; the output
   matches the contract; etc.)

The skill does **not** write the files itself by default. The user then
copy-pastes (or asks Claude to apply with `Write`). This keeps the
read-only posture honest and avoids surprising file creation.

## Acceptance criteria (from issue #11)

- [x] Uses `` !`<command>` `` dynamic context injection
- [x] Uses `context: fork` to run in subagent
- [x] Uses `agent: Explore` (built-in subagent type)
- [x] Uses `allowed-tools: Bash(gh *)` (plus the minimum others needed)
- [x] Frontmatter spec from upstream `code.claude.com/docs/en/skills.md` verbatim
- [x] Lands as a project skill at `.claude/skills/skill-creator/SKILL.md`,
      not a personal skill at `~/.claude/skills/`

## Out of scope

- Auto-writing the new skill files (the user sees the proposal first)
- Skill-bundle export (zipping multiple skills into a marketplace package
  per `code.claude.com/docs/en/plugins-reference.md`)
- Live SKILL.md validation (collision check + frontmatter syntax check
  is done at `/skill-creator` invocation; a separate `/skill-lint` is a
  follow-up)
- Updating `cli-parity-tracker.md` automatically when a new skill lands
  (the parity tracker only tracks plugin skills, not meta-skills like this)

## Sources

- `code.claude.com/docs/en/skills.md` (728 lines, fetched 2026-04-26)
- `code.claude.com/docs/en/sub-agents.md` (Explore subagent type)
- `code.claude.com/docs/en/plugins-reference.md` (project vs personal scope)
