# Skill body snippets

Reusable openings for common skill archetypes. The `/skill-creator` body
picks the closest archetype based on `$description` and uses it as a
starting point.

## Archetype: read-only research skill

Trigger phrases: "find / search / look up / show me X". Always
`context: fork` + `agent: Explore`.

```markdown
---
name: <verb-noun>
description: <what to find> <when>
when_to_use: <trigger phrases>
context: fork
agent: Explore
allowed-tools: |
  Glob
  Grep
  Read
---

# /<name> — find <thing>

## Repo context

<!`<cmd>` blocks for relevant filesystem state>

## Your task

Search for <X>. Use Glob to enumerate, Grep to filter, Read to verify.
Report the top N matches with file:line references.
```

## Archetype: data-fetching skill (uses `gh` / `curl`)

Pulls live data from a service before Claude reasons about it.

```markdown
---
name: <verb-noun>
description: <what data, why useful>
when_to_use: <trigger phrases>
context: fork
agent: Explore
allowed-tools: |
  Bash(gh *)
  Bash(curl *)
---

# /<name> — fetch <data>

## Live data

Records:
!`gh api <endpoint> 2>/dev/null | jq '...'`

OR for non-gh:
!`curl -sL '<url>' | jq '...'`

## Your task

Use the data above to answer: <question template>.
```

## Archetype: code-emitting skill

Generates files / code based on inputs. Needs Write; usually NOT forked
because the user wants to see the diff inline.

```markdown
---
name: <verb-noun>
description: <generates X from Y>
argument-hint: [target] [options]
arguments: [target, options]
allowed-tools: |
  Read
  Write
---

# /<name> — generate <X>

## Inputs

- `$target` — <description>
- `$options` — <description>

## Your task

1. Read the relevant context (point to specific files)
2. Generate the new file(s) at `<path-template>`
3. Show the user the proposed diff
4. Wait for "apply" before calling Write
```

## Archetype: PR / issue helper

Operates on a single GitHub artifact identified by number.

```markdown
---
name: <verb-noun>
description: <what it does to the PR/issue>
argument-hint: [number]
arguments: [num]
context: fork
agent: Explore
allowed-tools: |
  Bash(gh *)
---

# /<name> — <operation> on PR/issue #N

## PR/issue context

Metadata:
!`gh pr view $num --json title,state,author,labels,body 2>/dev/null || gh issue view $num --json title,state,author,labels,body`

Recent comments:
!`gh pr view $num --comments 2>/dev/null | tail -50 || gh issue view $num --comments | tail -50`

## Your task

<one-line of what to do with the data above>
```

## Archetype: workflow-orchestrator skill

Multi-step skill that calls subagents, runs tests, or coordinates work.

```markdown
---
name: <verb-noun>
description: <orchestration goal>
context: fork
agent: general-purpose
allowed-tools: |
  Bash(bun *)
  Bash(gh *)
  Read
  Write
  Edit
disable-model-invocation: true
---

# /<name> — <workflow name>

This is a manual-only workflow. The model does not auto-load it.

## Steps

1. <pre-flight check>
2. <action 1>
3. <action 2>
4. <verification>
5. <cleanup>

## Failure handling

If any step fails, write a one-line diagnosis and stop. Do not retry.
```

## Archetype: reference / convention skill

Background knowledge, no commands. Often `disable-model-invocation: false`
so Claude auto-loads when the path matches.

```markdown
---
name: <topic>-conventions
description: <topic> patterns and conventions for this repo
paths:
  - "**/*.<ext>"
---

# <Topic> conventions

## Naming

<rules>

## Structure

<rules>

## Anti-patterns

<rules>
```

## When to combine archetypes

A skill that fetches data AND emits code — e.g. "scaffold a parity row for
PR #N" — uses the data-fetcher archetype's frontmatter (`Bash(gh *)`,
`context: fork`) but the code-emitter's body (Read/Write/show diff first).
