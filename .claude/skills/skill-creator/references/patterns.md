# Advanced skill patterns

Source: [`code.claude.com/docs/en/skills.md`](https://code.claude.com/docs/en/skills.md)
Pinned at content SHA: `382b48aed37e52e7ff8a58cb22a3c877833709c8011666715ac735c051fa8a90`
Fetched: 2026-04-26

## 1. Dynamic context injection — `` !`<command>` ``

The `` !`<command>` `` syntax runs a shell command BEFORE the skill content
is sent to Claude. The output replaces the placeholder. Claude sees the
rendered prompt with actual data, not the bash invocation.

This is preprocessing, not tool use. The model never sees the command.

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
allowed-tools: Bash(gh *)
---

## Pull request context
- PR diff: !`gh pr diff $1`
- PR comments: !`gh pr view $1 --comments`
- Changed files: !`gh pr diff $1 --name-only`

## Your task
Summarize this pull request, focusing on what changed and why.
```

When `/pr-summary 123` runs:

1. Each `` !`<cmd>` `` executes (with `$1` already substituted to `123`)
2. Output replaces the placeholder in the skill body
3. Claude receives the fully-rendered prompt with actual PR data

## 2. Multi-line shell injection — fenced `` ```! ``

For commands that produce multi-line output, use a fenced code block
opened with ` ```! ` instead of inline:

````markdown
## Environment

```!
node --version
npm --version
git rev-parse --short HEAD
gh auth status 2>&1
```

(The block above runs each line and inserts the combined output here.)
````

The opener must be exactly ` ```! ` (3 backticks + `!`), no language tag.
Unlike inline `` !`<cmd>` ``, multi-line blocks let you run several
related commands without four backslashes of escaping per line.

## 3. Forked subagent — `context: fork`

`context: fork` runs the skill in a forked subagent so its tool calls
and intermediate output don't pollute the main session.

```yaml
---
name: explore-codebase
description: Find and summarize all files matching a pattern
context: fork
agent: Explore
allowed-tools: |
  Glob
  Grep
  Read
---
```

When this skill fires:
- Main session sends the skill body + arguments to a forked Explore agent
- The fork runs Glob/Grep/Read freely without each result entering the
  main context
- Main session receives only the fork's final reply
- Cost: an extra agent invocation; benefit: cleaner main context

When NOT to fork:
- Skill is short and produces output the user wants to see verbatim
- Skill modifies repo state (use `general-purpose` or a custom agent
  with explicit Write/Edit grants instead of Explore which is read-only)

## 4. Subagent selection — `agent`

Required if (and only if) `context: fork` is set. Built-in subagent types:

| `agent` value | Description |
|---|---|
| `Explore` | Read-only researcher. Tools: Glob, Grep, Read. Right default for "find / look up / sample" skills. |
| `general-purpose` | Full tool set. Right when the skill writes files or runs tests. |
| `Plan` | Planning-mode agent. Right for "design X" skills that produce a plan, not code. |

Or use a custom agent name from `.claude/agents/`. The skill body's
references to `Bash`/`Read`/`Write`/etc. must overlap with the agent's
own `tools:` allowlist — a skill granting `Bash(gh *)` while running in
an Explore fork has no effect because Explore can't run Bash.

## 5. Skill-bundled scripts — `${CLAUDE_SKILL_DIR}`

Reference scripts and files bundled with the skill regardless of the
current working directory:

```yaml
---
name: my-skill
allowed-tools: Bash(python *)
---

Run the helper:
!`python ${CLAUDE_SKILL_DIR}/scripts/preprocess.py`
```

Skill directory layout:

```
.claude/skills/my-skill/
├── SKILL.md
├── references/
│   ├── frontmatter.md
│   └── patterns.md
└── scripts/
    └── preprocess.py
```

For plugin skills, `${CLAUDE_SKILL_DIR}` is the skill's subdirectory
within the plugin, not the plugin root.

## 6. Path-scoped auto-load — `paths`

Restrict when Claude auto-loads the skill to specific file types:

```yaml
---
name: typescript-conventions
description: TypeScript style guide for this repo
paths:
  - "**/*.ts"
  - "**/*.tsx"
---
```

The skill is auto-loaded only when the user is working with files
matching the glob. They can still invoke it manually with
`/typescript-conventions` regardless.

## 7. Manual-only — `disable-model-invocation: true`

For skills the user should explicitly trigger (deploys, destructive
actions, ones that take external action):

```yaml
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
---
```

The model will not auto-load this skill even if the user says
"deploy the app" — they must type `/deploy`. This is a UX safety,
not a security boundary.

## Combined example

A real `/skill-creator`-emitted skill:

```yaml
---
name: stack-check
description: |
  Verify package versions match the locked manifest. Use when the user asks
  "are deps up to date" or "verify install".
when_to_use: |
  After `bun install` runs OR before opening a PR that touches package.json.
context: fork
agent: Explore
allowed-tools: |
  Bash(bun *)
  Bash(jq *)
  Read
disable-model-invocation: false
paths:
  - "package.json"
  - "bun.lockb"
---

# /stack-check — verify locked dependency versions

Spec: [`docs/spec/cli-skills/engineering-cli-stack-check.md`](../../../docs/spec/cli-skills/engineering-cli-stack-check.md).

## Repo state

Locked manifest:
!`bun pm ls 2>/dev/null || echo "(bun not installed)"`

Top-level deps in package.json:
!`jq '.dependencies // {}' package.json 2>/dev/null`

## Your task

Compare lockfile vs package.json. Report:
1. Deps present in package.json but not in the lockfile
2. Deps in the lockfile at versions that don't satisfy package.json's range
3. Stale lockfile (older than the manifest mtime)
```
