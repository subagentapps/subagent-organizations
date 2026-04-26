# `/productivity:update` — CLI implementation contract

Status: **draft** (Wave 0)
Source: `vendor/anthropic/knowledge-work-plugins/productivity/skills/update/SKILL.md` (168 lines, vendored audit copy)
Companion to:
- [`./productivity-cli-start.md`](./productivity-cli-start.md) — sibling skill (writes the files this skill reads)
- [`../cli-parity-contracts.md`](../cli-parity-contracts.md) §`update`
Implementation target: `subagentapps/knowledge-work-plugins-cli` repo, path
`productivity-cli/skills/update/SKILL.md`

## Purpose

Sync tasks from external sources, triage stale items, fill memory gaps,
optionally do a comprehensive activity scan. Two modes: default (fast)
and `--comprehensive` (deep scan).

## Why a separate spec for the CLI port

Less divergence than `/start` — the upstream skill ALREADY uses
`gh issue list --assignee=@me` (line `upstream:33`) as a first-class
source. The CLI port mostly removes external connectors that
`docs/research/cowork-plugin-connectors.md` flagged out-of-scope:

| Upstream feature | CLI port decision |
|---|---|
| `upstream:32` MCP project tracker (Asana/Linear/Jira) | **Replace** — only GitHub Projects + Issues per `cli-parity-contracts.md`. Other trackers return `OUT_OF_SCOPE_CONNECTOR` if user asked for them. |
| `upstream:33` `gh issue list --assignee=@me` | **Adopt verbatim** — already CLI-native |
| `upstream:108-114` Comprehensive scan: Chat/Email/Calendar/Documents | **Reduce** — only GitHub Issue comments (chat substitute) + repo Markdown (recent specs in this and linked repos). Email/Calendar/external docs return `OUT_OF_SCOPE_CONNECTOR`. |
| `upstream:128-138` Pull missed-todos from email/meeting/chat | **Reduce** — only GitHub Issue comments + open PR reviews where the user is mentioned |
| `upstream:140-160` Suggest new memories from activity | **Adopt** with reduced sources (PR review comments, recent Issue authors) |

Default-mode steps 1, 3, 4, 5, 6, 7 adopt verbatim (filesystem-substrate,
no external connectors needed).

## Required frontmatter

```yaml
---
name: update
description: Sync tasks and refresh memory from your current activity. Use when pulling new assignments from your project tracker into TASKS.md, triaging stale or overdue tasks, filling memory gaps for unknown people or projects, or running a comprehensive scan to catch todos buried in chat and email.
argument-hint: "[--comprehensive]"
---
```

Verbatim from upstream `upstream:1-5` — no wording changes (the
description's "buried in chat and email" phrasing remains accurate
because the CLI surfaces the limitation explicitly when those connectors
aren't available).

## Required body — 7 default steps + 3 comprehensive extra steps

### Step 1 — Load current state

Verbatim from upstream `upstream:25-27`:

> Read `TASKS.md` and `memory/` directory. If they don't exist, suggest
> `/productivity:start` first.

### Step 2 — Sync tasks from external sources

**Reduced** from upstream `upstream:29-46`. Sources in CLI mode (in
preference order):

1. **GitHub Issues**: `gh issue list --assignee=@me --state=open --json number,title,repository,url,createdAt`
2. **GitHub Project board**: `gh api graphql` against the polyrepo's
   Wave-0 project (#2 today; configurable via `~/.config/productivity-cli/config.toml`)
3. **External MCP project tracker** (Asana/Linear/Jira/etc.) — return
   `OUT_OF_SCOPE_CONNECTOR: <name>` if user has one configured

The diff table from upstream `upstream:39-45` adopts verbatim. Add one
column for **issueRef** so the dual-write contract from
`task-management/SKILL.md` is preserved:

| External task | TASKS.md match? | issueRef set? | Action |
|---|---|---|---|
| In `gh issue list`, not in TASKS.md | No | New | Offer to add |
| In `gh issue list` AND TASKS.md, with issueRef | Match by issueRef (exact) | Stable | Skip |
| In `gh issue list` AND TASKS.md, no issueRef | Match by title (fuzzy) | Stale | Backfill issueRef |
| In TASKS.md, NOT in `gh issue list` | No | (any) | Flag as potentially stale |
| Closed in GH, In Active section of TASKS.md | (any) | Closed | Offer to mark done |

The **fuzzy title match** is the divergence point most likely to need
implementation tuning — issue title vs. TASKS.md row text won't be
identical (TASKS.md adds context like "by Friday").

### Step 3 — Triage stale items

Verbatim from upstream `upstream:48-55`. Same triage prompts; no
divergence.

### Step 4 — Decode tasks for memory gaps

Verbatim from upstream `upstream:57-70`. The decode example is generic
(PSR / Todd / Phoenix); keep as-is.

### Step 5 — Fill gaps

Verbatim from upstream `upstream:72-85`.

### Step 6 — Capture enrichment

Verbatim from upstream `upstream:87-94`.

### Step 7 — Report

**Slight rewrite** from upstream `upstream:95-102`. Replace the example
"Asana" with "GitHub Issues" since that's the CLI's actual source:

```
Update complete:
- Tasks: +3 from GitHub Issues, 1 completed, 2 triaged
- Memory: 2 gaps filled, 1 project enriched
- All tasks decoded ✓
- Out of scope: <list any user-configured-but-unsupported sources>
```

## Comprehensive mode (`--comprehensive`)

### Extra Step C-1 — Scan activity sources (CLI-reduced)

**Reduced** from upstream `upstream:108-114`. Sources in CLI mode:

| Upstream source | CLI port |
|---|---|
| Chat (Slack/Teams) | **Replace** with GitHub Issue comments where the user is mentioned (`gh api search/issues?q=mentions:@me+updated:>=<7d>`) |
| Email | `OUT_OF_SCOPE_CONNECTOR: ~~email` |
| Documents | **Reduce** to recent commits to repo Markdown files (`git log --since=7d.ago --name-only`) on the active repo |
| Calendar | `OUT_OF_SCOPE_CONNECTOR: ~~calendar` |

### Extra Step C-2 — Flag missed todos

**Reduced** from upstream `upstream:116-138`. CLI sources:

```
## Possible missing tasks

From your activity, these look like todos you haven't captured:

1. From PR review comments (last 7d):
   <user> on subagentapps/<repo>#<n>: "I'll send the updated mockups by Friday"
   → Add to TASKS.md with issueRef <repo>#<n>?

2. From issue comments where you are mentioned:
   <user> on subagentapps/<repo>#<n>: "@admin-jadecli can you take a look?"
   → Add to TASKS.md with issueRef <repo>#<n>?
```

NO email/meeting/calendar examples (those are out of scope; if the user
asks for them, surface `OUT_OF_SCOPE_CONNECTOR`).

### Extra Step C-3 — Suggest new memories

**Reduced** from upstream `upstream:140-160`. CLI sources for the
"frequency" column:

| Upstream basis | CLI basis |
|---|---|
| Mentions in chat/email/docs | Mentions in PR review comments + issue comments + commit-author lines (`git log --pretty='%aN'`) on linked repos |

The output format and confidence-grouping (`upstream:160`) adopt verbatim.

## Required dependencies

| Dep | Why | Notes |
|---|---|---|
| `gh` | issue list, GraphQL Projects v2 read, search | Already in env per `docs/spec/operational/gh-token-strategy.md` (classic gho_ token, scopes: gist, project, read:org, repo, workflow) |
| `git` | recent-commit-author + recent-changed-files scan | always present |
| `jq` | JSON shaping from `gh api` outputs | always present per CLAUDE.md (Bash + jq, no Python in CI) |

**No new package deps.**

## Tests (mirror to `tests/cli/productivity-cli.test.ts`)

The test file already on main (PR #21 cherry-pick). 5 todo cases under
`describe('productivity-cli :: /update ...')` map to this spec:

| Test | Asserts | Spec section |
|---|---|---|
| `default mode: pulls assignments from GitHub Projects` | Step 2 source preference | Step 2 |
| `default mode: triages stale tasks (>14 days no update)` | Step 3 staleness threshold | Step 3 |
| `--comprehensive: scans email/calendar/chat — CLI returns OUT_OF_SCOPE` | C-1 reduction | C-1 |
| `output shape: { mode, tasksSynced, staleTriaged, memoryProposals } matches UpdateResult type` | TaskShape interface | Step 7 + C-3 |
| `edge case: empty TASKS.md returns valid-but-zero result` | Step 1 + Step 7 zero-result | Step 1 + Step 7 |

## Idempotency + safety

Adopted verbatim from upstream `upstream:162-168`:

- Never auto-add tasks or memories without user confirmation
- External source links are preserved when available
- Fuzzy matching on task titles handles minor wording differences
- Safe to run frequently — only updates when there's new info
- `--comprehensive` always runs interactively

The CLI also adds:

- **Read-only by default**: the skill never `gh issue close` or
  `gh issue create` without explicit user yes. Issues are flagged for
  user-driven closes via the dashboard or manual `gh` calls
- **`--dry-run` flag** (CLI-only): print the diff that would be applied
  without writing TASKS.md or memory files

## Naming + paths

```
productivity-cli/
└── skills/
    └── update/
        └── SKILL.md          ← this contract's body
```

Plugin manifest entry (`productivity-cli/.claude-plugin/plugin.json`)
declares:

```json
{
  "skills": [
    { "name": "update", "command": "/productivity:update", "argument-hint": "[--comprehensive]" }
  ]
}
```

## What this spec does NOT cover

- `/productivity:start` — see [`./productivity-cli-start.md`](./productivity-cli-start.md)
- `/productivity:add` — separate spec (next iteration)
- `task-management` skill body — separate; this skill consumes its
  TASKS.md schema
- `memory-management` skill body — separate; this skill consumes its
  CLAUDE.md + memory/ schema

## Sources

- `vendor/anthropic/knowledge-work-plugins/productivity/skills/update/SKILL.md`
- `docs/spec/cli-parity-contracts.md` §`update`
- `docs/research/cowork-plugin-connectors.md` (connector reduction rationale)
- `docs/spec/cli-skills/productivity-cli-start.md` (pairs with this skill)
