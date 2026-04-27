# productivity-cli connectors — Keep / Drop / Substitute decisions

> Status: load-bearing as of 2026-04-27
> Source: `vendor/anthropic/knowledge-work-plugins/productivity/{CONNECTORS.md, .mcp.json, README.md}`
> Implementation: [`subagentapps/knowledge-work-plugins-cli/productivity-cli/`](https://github.com/subagentapps/knowledge-work-plugins-cli/tree/main/productivity-cli) (PR #7)
> Pattern: [`../plugin-migration-pattern.md`](../plugin-migration-pattern.md)
> Strategy: [`./kwpc-cli-migration-strategy.md`](./kwpc-cli-migration-strategy.md)
> Companion: [`./engineering-cli-connectors.md`](./engineering-cli-connectors.md), [`./product-management-cli-connectors.md`](./product-management-cli-connectors.md)

---

## 1. Why productivity-cli first

Per the migration strategy §8 sequencing rationale: productivity-cli ships
**first** because it dogfoods. Once installed, its `task-management` skill
manages GitHub Projects v2 — including the project tracking the remaining
14 plugin migrations. We use the plugin we ship to ship the rest of the
plugins.

---

## 2. Decision matrix per category

6 categories × verdict, applying heuristics from `engineering-cli-connectors.md` §6.

### 2.1 `~~chat` → **Substitute** (`gh pr/issue comment`)

| | |
|---|---|
| Verdict | **Substitute** |
| Cowork default | Slack (`https://mcp.slack.com/mcp`, OAuth callbackPort=3118) |
| Why drop default | Slack's MCP requires OAuth via the Cowork desktop callback port. CLI can't run that callback by default. |
| CLI substitute | **`gh pr comment` + `gh issue comment`** — async, threaded, recoverable from disk, version-controlled |
| Optional opt-in | Slack MCP if user has OAuthed via this Claude Code session (gated by `mcp__plugin_slack_slack__*` tools) |

### 2.2 `~~email` → **Drop**

Email isn't a CLI workflow surface. Stakeholder updates write to GitHub
Issues with topical labels (`progress-update`, `weekly`, etc.).

### 2.3 `~~calendar` → **Drop**

Empty URL upstream confirms calendar isn't a real workflow lever yet.
User supplies dates inline when relevant.

### 2.4 `~~knowledge base` → **Substitute** (`rg` over `docs/`)

The KB is on disk in this polyrepo. Notion adds a paid OAuth dependency
we don't need. Optional opt-in: Notion MCP if user wants cross-team
aggregation.

### 2.5 `~~project tracker` → **Substitute → GitHub Projects v2** (THE defining choice)

| | |
|---|---|
| Verdict | **Substitute — GitHub Projects v2 only** |
| Cowork defaults | Linear, Asana, Atlassian (Jira/Confluence), Monday, ClickUp |
| Why drop all five | The user's standing strategic call: GitHub Projects + Issues + PRs are version-controlled and sufficient. |
| CLI substitute | `gh project item-list/edit/create`, `gh issue list/create/edit/comment`, `gh pr list/create/comment`, plus the GraphQL Projects v2 API |

### 2.6 `~~office suite` → **Drop**

Markdown in repo replaces office formats per kwpc-cli philosophy.

---

## 3. Final `productivity-cli/.mcp.json`

```json
{
  "$schema": "https://json.schemastore.org/mcp.json",
  "mcpServers": {}
}
```

**0 servers.** Down from 10 upstream. The cleanest possible verdict —
every workflow lever maps to either gh CLI or repo-on-disk.

---

## 4. Per-skill impact summary (4 upstream skills)

| Upstream skill | Categories used | productivity-cli behavior |
|---|---|---|
| `start` | `~~chat`, `~~project tracker`, `~~knowledge base` | Init session: `gh issue list --assignee @me --state open` from the kwpc Project; `rg` over `docs/` for context |
| `update` | `~~chat`, `~~project tracker` | Progress digest as a new GitHub Issue or comment (label `progress-update`) |
| `task-management` | `~~project tracker` | All task ops via `gh project item-*` and `gh issue *` |
| `memory-management` | (none) | Two-tier memory (CLAUDE.md + `memory/`); no connector dependency |

**4 of 4 skills work end-to-end** without external services. No divergence rows.

---

## 5. What's removed from upstream

- `skills/dashboard.html` — Cowork HTML kanban. CLI delegates to GitHub Projects (rendered at [`subagentorganizations.com`](https://subagentorganizations.com)). Per kwpc-cli philosophy: "Terminal-first output: plain text, piped-friendly JSON, ASCII charts. No HTML."

---

## 6. Acceptance criteria status

Per `kwpc-cli-migration-strategy.md` §6:

| # | Criterion | Status |
|---|---|---|
| 1 | `productivity-cli/` directory in kwpc-cli repo | ✅ on PR #7 |
| 2 | `.claude-plugin/plugin.json` corrected | ✅ |
| 3 | `skills/` copied verbatim | ✅ |
| 4 | `.mcp.json` translated | ✅ |
| 5 | `CONNECTORS.md` documenting decisions | ✅ |
| 6 | `README.md` rewritten | ✅ |
| 7 | Spec contract in meta-repo (this file) | ✅ |
| 8 | GitHub Issue tracking | TBD — file after PR merges |
| 9 | PR opened in kwpc-cli repo | ✅ #7 |
| 10 | Plugin install verification | Deferred to publish step |

---

## 7. Provenance

- Upstream: `vendor/anthropic/knowledge-work-plugins/productivity/` (vendored 2026-04-26, MIT)
- Implementation PR: [`subagentapps/knowledge-work-plugins-cli#7`](https://github.com/subagentapps/knowledge-work-plugins-cli/pull/7)
- Pattern: `../plugin-migration-pattern.md`
- Strategy parent: `kwpc-cli-migration-strategy.md`
- Authored by Claude (Opus 4.7) under `.claude/prompts/opus-orchestrator.md`
