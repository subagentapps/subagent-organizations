# engineering-cli connectors — Keep / Drop / Substitute decisions

> Status: load-bearing as of 2026-04-26
> Source: `vendor/anthropic/knowledge-work-plugins/engineering/{CONNECTORS.md, .mcp.json, README.md}`
> Implementation target: `subagentapps/knowledge-work-plugins-cli/engineering-cli/`
> This is the **worked example** for the per-plugin pattern in
> [`../plugin-migration-pattern.md`](../plugin-migration-pattern.md). When this
> doc lands and the corresponding `engineering-cli/` ships, the same template
> drives the other 13 plugin migrations.

---

## 1. Upstream baseline (verbatim from `vendor/.../engineering/`)

### Categories per `CONNECTORS.md`

| Category | Placeholder | Upstream included | Upstream other options |
|---|---|---|---|
| Chat | `~~chat` | Slack | Microsoft Teams |
| Source control | `~~source control` | GitHub | GitLab, Bitbucket |
| Project tracker | `~~project tracker` | Linear, Asana, Atlassian (Jira/Confluence) | Shortcut, ClickUp |
| Knowledge base | `~~knowledge base` | Notion | Confluence, Guru, Coda |
| Monitoring | `~~monitoring` | Datadog | New Relic, Grafana, Splunk |
| Incident management | `~~incident management` | PagerDuty | Opsgenie, Incident.io, FireHydrant |
| CI/CD | `~~CI/CD` | (none preconfigured) | CircleCI, GitHub Actions, Jenkins, BuildKite |

7 categories. The CI/CD category ships **no preconfigured server** even
upstream — Cowork itself recognizes that CI/CD MCPs aren't a settled
landscape yet.

### MCP servers per `.mcp.json`

10 servers configured upstream:
`slack`, `linear`, `asana`, `atlassian`, `notion`, `github`, `pagerduty`,
`datadog`, `google calendar` (empty url), `gmail` (empty url).

**Note:** `google calendar` and `gmail` ship with empty URLs even upstream
— they're placeholder rows for native Claude integrations rather than
remote MCP servers. Treat as "not configured" wherever they appear.

---

## 2. Decision matrix per category

The verdict per category for `engineering-cli`. **MCP availability** is
checked against today's reality (CLI-callable HTTP MCP servers, no
Cowork-only OAuth dance assumed available).

### 2.1 `~~chat`  → **Substitute** (CLI-native: GitHub PR comments + email; defer Slack)

| Decision | Substitute |
|---|---|
| Verdict | **Substitute** |
| Cowork default | Slack (`https://mcp.slack.com/mcp` — OAuth `clientId: 1601185624273.8899143856786`) |
| Why drop Slack default | Slack's MCP requires OAuth via the Cowork desktop app's callback port (3118). In CLI, we can't run that callback. The user has Slack MCP connectors enabled in this Claude Code session, but they're auth-gated; the token isn't shareable across sessions. |
| CLI substitute | **GitHub PR comments + GitHub Issue comments** via `gh pr comment` / `gh issue comment`. Async, threaded, recoverable from disk, and the canonical place engineering decisions get made on this polyrepo anyway. |
| Implementation | Skill bodies that reference `~~chat` for "post a standup" or "share an incident update" route through `gh` instead of the chat MCP. CONNECTORS.md documents the substitution. |
| Stretch | Optional Slack via `mcp__plugin_slack_slack__*` (already exists in this session, gated on user OAuth). When the user has run that auth dance, both the original Slack MCP path and the gh fallback are available. |

### 2.2 `~~source control`  → **Keep** (GitHub MCP works)

| Decision | Keep |
|---|---|
| Verdict | **Keep, plus `gh` CLI fallback** |
| Cowork default | GitHub (`https://api.github.com/mcp`) |
| Why keep | The GitHub MCP server is the official Anthropic-published one and works headless. We already use `mcp__plugin_github_github__*` tools throughout this repo. |
| Layered fallback | `gh` CLI is always present in this environment; skill bodies can call either. Prefer `gh` for token-efficiency (CLAUDE.md #8: GraphQL > MCP > REST). |
| Implementation | `.mcp.json` keeps the `github` entry. Skill bodies that ask for a PR diff use `gh pr diff <n>` — which is what they should do anyway since it's cheaper than a tool round-trip. |

### 2.3 `~~project tracker`  → **Substitute** (CLI-native: GitHub Projects v2)

| Decision | Substitute |
|---|---|
| Verdict | **Substitute — GitHub Projects v2 only** |
| Cowork defaults | Linear, Asana, Atlassian (Jira/Confluence) — three commercial trackers |
| Why drop all three | Per `kwpc-cli/README.md`: *"GitHub Projects is the source of truth. No local TASKS.md, no dashboard.html."* The kwpc-cli north-star is GitHub-first; bringing Linear/Asana/Jira back in undoes that decision. |
| CLI substitute | **GitHub Projects v2 via GraphQL**. Already partially wired — Project #2 ("Polyrepo Wave 0 — subagentapps") exists. Project schema captured in `docs/spec/projects-schema.md`. |
| Implementation | Drop `linear`, `asana`, `atlassian` from `engineering-cli/.mcp.json`. Skill bodies referencing `~~project tracker` for ticket lookup translate to `gh project item-list <n>` and `gh issue list`. |
| Per-skill divergence note | `engineering/skills/standup` upstream pulls "ticket updates" from the project tracker — `engineering-cli/skills/standup` pulls them from GitHub Issues assigned to the user, sorted by `last_updated`. |

### 2.4 `~~knowledge base`  → **Substitute** (CLI-native: this repo's `docs/spec/`)

| Decision | Substitute |
|---|---|
| Verdict | **Substitute — repo-local markdown is the KB** |
| Cowork defaults | Notion (`https://mcp.notion.com/mcp`); other options Confluence, Guru, Coda |
| Why drop | Notion MCP requires OAuth and stores org-private content. Our KB is already on disk (`docs/spec/`, `docs/research/`, `installs/prompts/`, `installs/briefs/`) and grep-able. The Tier-0 source per `opus-orchestrator.md`. |
| CLI substitute | **`rg` over `docs/`** plus the planned contextual-retrieval pipeline in `feat/kb-*` branches (chunker → contextualizer → embedder+BM25 → retriever+RRF → reranker → eval, all merged). |
| Implementation | Drop `notion` from `engineering-cli/.mcp.json`. Skill bodies referencing `~~knowledge base` for "find prior ADR" → `rg -l 'ADR' docs/` then read the matching file. |
| Stretch | If the user adds a Notion connector via Claude Code's connector path later, the `~~knowledge base` placeholder picks it up automatically. No skill change needed. |

### 2.5 `~~monitoring`  → **Drop** (no equivalent; defer; surface a clean degradation message)

| Decision | Drop |
|---|---|
| Verdict | **Drop with graceful degradation** |
| Cowork default | Datadog (`https://mcp.datadoghq.com/mcp`) |
| Why drop | Datadog requires a paid account + OAuth. Grafana / New Relic / Splunk same. We have **no live production system in this polyrepo** today (the live-artifact dashboard isn't deployed yet — that's issue #10). Monitoring is the wrong abstraction at the current state. |
| CLI substitute | None today. Skill bodies referencing `~~monitoring` (e.g., `engineering/skills/incident-response`'s "pull recent error rates") return a "monitoring not configured — describe the symptoms manually" message. |
| Future path | When the live-artifact dashboard is deployed (issue #10) and Cloudflare Pages metrics become a thing we'd consult, add `cloudflare` MCP server (already authed via the `wrangler` skill in this repo). Defer for now. |
| Implementation | Drop `datadog` from `.mcp.json`. CONNECTORS.md says "Monitoring: not configured. Skill workflows that depend on monitoring will degrade to manual description." |

### 2.6 `~~incident management`  → **Drop** (no equivalent; same rationale as monitoring)

| Decision | Drop |
|---|---|
| Verdict | **Drop with graceful degradation** |
| Cowork default | PagerDuty (`https://mcp.pagerduty.com/mcp`) |
| Why drop | Same as monitoring — paid account + OAuth, and no production incident surface in this polyrepo yet. |
| CLI substitute | None today. The closest analog: GitHub Issues with `incident` label + the engineering-cli `incident-postmortem` skill (already specced in `docs/spec/cli-skills/engineering-cli-incident-postmortem.md`). |
| Future path | Re-evaluate when we run a real production service. |
| Implementation | Drop `pagerduty` from `.mcp.json`. Same degradation message as monitoring. |

### 2.7 `~~CI/CD`  → **Substitute** (GitHub Actions only; we already use it)

| Decision | Substitute |
|---|---|
| Verdict | **Substitute — GitHub Actions native** |
| Cowork default | (none preconfigured) — upstream lists CircleCI, GitHub Actions, Jenkins, BuildKite as options |
| Why GitHub Actions | The polyrepo runs `release-please` + `commitlint` + (planned) acceptance-tests workflows on GitHub Actions today. No other CI in play. |
| CLI substitute | `gh run list`, `gh run view`, `gh run watch` — all part of the gh CLI. The `Monitor` tool watches workflow status without polling. |
| Implementation | No `.mcp.json` change needed (upstream had no entry). Skill bodies referencing `~~CI/CD` use `gh run *`. The `engineering-cli/skills/deploy-checklist` (upstream) becomes `gh run list --workflow=release.yml` + acceptance-test verification. |

---

## 3. Final `engineering-cli/.mcp.json`

The translated `.mcp.json` for `subagentapps/knowledge-work-plugins-cli/engineering-cli/.mcp.json`:

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.github.com/mcp"
    }
  }
}
```

**One server.** Down from 10 upstream. The other 9 categories are either
substituted with native CLI commands (`gh`, `rg`) or dropped with graceful
degradation.

This is the brand promise from
[`../brand/voice.md`](../brand/voice.md) §6 made concrete:

> *"An Opus 4.7 orchestrator runs this entire polyrepo. The work is done by
> cheaper, faster workers — and reviewed by the orchestrator. The price you'd
> pay for Opus end-to-end isn't the price we run."*

The same applies to MCP. The price you'd pay for 10 commercial MCP
subscriptions isn't the price the CLI runs.

---

## 4. Per-skill impact summary (10 upstream skills)

| Upstream skill | Categories used | engineering-cli impact |
|---|---|---|
| `architecture` | `~~knowledge base` | Substitute → `rg` over `docs/`. Skill works. |
| `code-review` | `~~source control` | Keep → GitHub MCP / `gh`. Skill works. |
| `debug` | `~~monitoring`, `~~chat` | Drop monitoring → degrade to manual. Substitute chat → gh PR comments. Workflow stays. |
| `deploy-checklist` | `~~CI/CD`, `~~source control` | Substitute → `gh run *` + `gh pr *`. Skill works. |
| `documentation` | `~~knowledge base` | Substitute → `rg`. Skill works. |
| `incident-response` | `~~monitoring`, `~~incident management`, `~~chat` | All three drop/substitute. Skill degrades to manual-describe + gh issue thread. |
| `standup` | `~~source control`, `~~project tracker`, `~~chat` | All three substitute → `gh pr/issue/project` + `gh comment`. Strong fit. |
| `system-design` | `~~knowledge base` | Substitute → `rg`. Already specced in `engineering-cli-system-design.md`. |
| `tech-debt` | `~~source control`, `~~project tracker` | Substitute → `gh issue` with `tech-debt` label. Matches existing repo convention. |
| `testing-strategy` | (none) | No connector dependency. Pure copy-paste. Already specced in `engineering-cli-testing-strategy.md`. |

**8 of 10 skills work as-is or with the gh substitution.** 2 skills
(`debug`, `incident-response`) degrade gracefully when monitoring is
unavailable but still produce useful output.

---

## 5. The CONNECTORS.md to ship in `engineering-cli/`

```markdown
# Connectors — engineering-cli

This is the CLI parallel of `anthropics/knowledge-work-plugins/engineering`.
Most categories the upstream plugin uses translate directly to native CLI
commands; a few degrade gracefully.

## How tool references work

Plugin files use `~~category` as a placeholder. When you invoke a skill,
Claude resolves each `~~category` against your configured MCP servers
(in `.mcp.json`) or falls back to the substitution defined here.

## Connector decisions

| Category | Decision | What it means |
|---|---|---|
| `~~chat` | **Substitute** → `gh pr comment` / `gh issue comment` | Threaded discussion lives in GitHub, not Slack. (Optional: enable Slack MCP if available.) |
| `~~source control` | **Keep** → GitHub (MCP + `gh` CLI) | Both available; gh CLI preferred for token-efficiency. |
| `~~project tracker` | **Substitute** → GitHub Projects v2 | `gh project item-list`, `gh issue list`. No Linear/Asana/Jira. |
| `~~knowledge base` | **Substitute** → `rg` over repo `docs/` | The KB is on disk in this polyrepo, not in Notion. |
| `~~monitoring` | **Drop** | Skill workflows that need monitoring degrade to manual description. |
| `~~incident management` | **Drop** | Same as monitoring. Use GitHub Issues with `incident` label as the timeline. |
| `~~CI/CD` | **Substitute** → `gh run` | GitHub Actions only. |

## What this enables vs. doesn't

| Skill | Works headless? | Notes |
|---|---|---|
| `system-design` | ✅ | KB substitution is sufficient. |
| `code-review` | ✅ | gh-native. |
| `architecture` | ✅ | KB substitution is sufficient. |
| `tech-debt` | ✅ | gh issue + tech-debt label. |
| `documentation` | ✅ | KB substitution is sufficient. |
| `deploy-checklist` | ✅ | gh run + gh pr. |
| `standup` | ✅ | Strong fit — gh + project + comment. |
| `testing-strategy` | ✅ | No connector dependency. |
| `debug` | ⚠️ Degraded | Manual describe when monitoring unavailable. |
| `incident-response` | ⚠️ Degraded | Manual incident timeline. |
```

---

## 6. The same template, applied to the other 13 plugins

This file is the worked example. The rows for each remaining plugin's
`engineering-cli-connectors.md` equivalent get authored the same way:

1. Read `vendor/.../<plugin>/CONNECTORS.md` for the categories
2. Read `vendor/.../<plugin>/.mcp.json` for the upstream servers
3. Read `vendor/.../<plugin>/README.md` for skill-level usage
4. **Per category**, emit a Keep / Drop / Substitute verdict with rationale
5. Compose the final translated `.mcp.json`
6. Author the per-skill impact summary (Section 4 here)
7. Author the CONNECTORS.md the plugin ships with (Section 5 here)

**Heuristics from this worked example:**

| Category type | Default verdict |
|---|---|
| Chat (Slack/Teams) | Substitute → `gh pr/issue comment` |
| Source control | Keep (GitHub MCP) |
| Project tracker | Substitute → GitHub Projects v2 |
| Knowledge base | Substitute → `rg` over `docs/` |
| Monitoring / incident mgmt | Drop with graceful degradation |
| CI/CD | Substitute → `gh run` |
| Email / Calendar | Drop (placeholders even upstream had empty URLs) |
| Design (Figma) | Keep if MCP available; otherwise drop |
| Product analytics (Amplitude/Pendo) | Drop (paid OAuth) |
| Data warehouse (Snowflake/BigQuery/Databricks) | Keep BigQuery (MCP available); drop others |

Most of the other 13 plugins overlap heavily with this category set. The
incremental work per plugin is small once these heuristics are in hand.

---

## 7. Open question for the user

Should `engineering-cli` ship a default `Slack` MCP connector, gated on the
user OAuth-ing once via this Claude Code session, OR stay strictly
gh-native (chat = GitHub comments) for the v0.1.0 release?

**Recommended:** strictly gh-native for v0.1.0. Add Slack as opt-in via
`engineering-cli/.claude/settings.local.json` later. Keeps the install
boring — no OAuth dance for first-run.

---

## 8. Provenance

- Upstream: `anthropics/knowledge-work-plugins/engineering/` (vendored at
  `vendor/anthropic/knowledge-work-plugins/engineering/`, MIT licensed)
- This decision matrix authored by Claude (Opus 4.7) on 2026-04-26 under
  the orchestrator posture in `.claude/prompts/opus-orchestrator.md`
- Pattern source: `docs/spec/plugin-migration-pattern.md` §3 (Translate
  `.mcp.json`)
- Brand grounding: `docs/spec/brand/voice.md` §6 (cost-discipline rule)
