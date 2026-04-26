---
name: skill-creator
description: |
  Generate a new .claude/skills/<name>/SKILL.md scaffold from a one-line
  description. Use when the user says "create a skill for", "add a skill
  that", or "scaffold a /<verb> command". Reads the current repo to avoid
  name collisions and emits a complete frontmatter + body proposal.
when_to_use: |
  Trigger phrases:
    - "create a skill for X"
    - "add a /<verb> command"
    - "scaffold a skill"
    - "make me a skill that"
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

# `/skill-creator` — scaffold a new Claude Code skill

You are the skill-creator. The user has invoked you to design a new
project-scope skill at `.claude/skills/$skill_name/`. Your job:

1. Inspect the live repo state (frontmatter and slash-command collisions).
2. Decide the right frontmatter shape for the requested skill.
3. Emit a complete, copy-pasteable proposal — do not write files yourself
   unless the user explicitly says "apply" or "write it".

Spec: [`docs/spec/skills/skill-creator/README.md`](../../../docs/spec/skills/skill-creator/README.md).

## Repo context (live)

Existing project skills:
!`ls .claude/skills/ 2>/dev/null || echo "(none yet)"`

Existing project commands (legacy `.claude/commands/`):
!`ls .claude/commands/ 2>/dev/null | sed 's/\.md$//' || echo "(none)"`

Existing project agents:
!`ls .claude/agents/ 2>/dev/null | sed 's/\.md$//' || echo "(none)"`

Repo CLAUDE.md head (style guide for skill descriptions):
!`head -8 .claude/CLAUDE.md 2>/dev/null`

Most recent 5 merged PRs (so naming-style matches repo conventions):
!`gh pr list --state merged --limit 5 --json title,number 2>/dev/null | jq -r '.[] | "  #\(.number) \(.title)"' || echo "(gh unavailable)"`

## Inputs

- `$skill_name` — the slash-command name (lowercase, hyphens; max 64 chars)
- `$description` — one-line description of what the skill should do

## Your task

Working in the Explore subagent (read-only by default), produce the
following four sections in your reply. Use `bash` fences for files the
user might copy.

### 1. Collision check

State whether `$skill_name` collides with any existing skill, command,
or agent in the repo context above. If it does, suggest 2 alternative
names. If it doesn't, say so explicitly.

### 2. Decide the frontmatter shape

Based on `$description`, pick:

- `context`: inline (default) or `fork` if the skill produces noisy
  intermediate output that shouldn't pollute the main session
- `agent`: only set if `context: fork`. Default to `Explore` for
  read-only research skills; `general-purpose` for skills that need to
  write files; named subagents from `.claude/agents/` if any are a fit
- `allowed-tools`: bare minimum. `Bash(<binary> *)` for shell tools;
  `Read`/`Glob`/`Grep`/`Write`/`Edit` as needed. Skip what the skill
  doesn't actually use — every grant is a permission relaxation
- `disable-model-invocation`: `true` only if the skill should be invoked
  manually with `/$skill_name` (deploys, destructive actions, etc.)
- `paths`: glob if the skill should auto-load only when files matching
  certain patterns are open (e.g. `paths: ["**/*.test.ts"]` for a
  test-runner skill)
- `arguments`: a YAML list if the skill takes positional arguments

For the full field reference, see [references/frontmatter.md](references/frontmatter.md).
For dynamic-context patterns (`` !`<cmd>` ``, multi-line `` ```! ``,
`${CLAUDE_SKILL_DIR}` substitutions), see [references/patterns.md](references/patterns.md).

### 3. Emit the proposal

Output two fenced code blocks the user can copy directly:

````markdown
File: `.claude/skills/$skill_name/SKILL.md`

```markdown
---
name: $skill_name
description: <expanded from $description, ≤200 chars>
when_to_use: <trigger phrases — one per line>
argument-hint: <if arguments are taken>
arguments: [<list>]
context: <inline | fork>
agent: <only if fork>
allowed-tools: |
  <tool 1>
  <tool 2>
disable-model-invocation: <true | false>
---

# /<skill_name> — <one-line title>

<short purpose statement>

## Repo context (if needed)

<!`<cmd>` blocks if the skill needs live state>

## Your task

<numbered steps the model follows when this skill fires>

## Output shape

<what the user sees>
```
````

If the skill needs supporting files (long reference content, examples,
or scripts), also emit:

```
File: `.claude/skills/$skill_name/references/<name>.md`

(content)
```

### 4. Test plan

Three bullet points the user should verify after creating the skill:

- Type `/$skill_name` — autocomplete shows the skill
- Invoke with sample arguments — output matches the proposal's contract
- Confirm `disable-model-invocation` semantics: if `false`, ask Claude
  "do X" where X matches the description and check the skill is loaded

## Refusal cases

If `$description` describes a skill that:

- **Bypasses CLAUDE.md gates** (force-push, vendor edits, release-please
  config, .gitmodules chmod, account creation) — refuse and explain.
- **Requires connectors marked out-of-scope** (`~~office suite`,
  `~~email`, `~~calendar`, `~~design`, etc. per
  `docs/spec/cli-parity-contracts.md`) — refuse with a pointer to the
  parity contracts doc.
- **Duplicates an existing skill** — propose a rename or refactor of the
  existing one instead of creating a near-duplicate.

In all refusal cases, end the reply with `### Refused` and a one-line
reason. The user reads this, the orchestrator's task system parses it.
