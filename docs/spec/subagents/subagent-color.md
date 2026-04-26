# `color:`

**Optional.** UI color tag for the subagent.

## Shape

```yaml
color: blue              # red | orange | yellow | green | blue | purple | pink | gray
```

## What it does

Cosmetic. Tags the subagent's UI presence (sidebar entry in cmux, status line, in-app
indicator) with the chosen color so multiple parallel subagents are visually distinguishable.

## Default when omitted

UI auto-assigns from a hash of `name:`.

## Why it matters more than it looks

In a cmux-style multi-pane workflow with 5+ subagents running simultaneously (the polyrepo
KB-curator + research-expert + code-review + ...), color-coding is the cheapest possible
intervention against "which agent is asking for input?" confusion.

## Convention for our polyrepo

| Subagent role | Color |
|---|---|
| Curator / orchestrator | blue |
| Reviewer | green |
| Builder / writer | orange |
| Researcher | purple |
| Validator / linter | gray |
| Destructive (uses Write+Bash freely) | red — visual hazard signal |

Define this in our `kb-template`'s `agents/*.md` so every child KB is consistent.

## Related
- [`./subagent-name.md`](./subagent-name.md)
