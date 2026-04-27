# kwpc-cli migration strategy — port all upstream plugins to CLI

> Status: load-bearing as of 2026-04-27
> Companion to:
>   [`./connector-availability-matrix.md`](./connector-availability-matrix.md) — per-category Keep/Drop/Substitute verdicts
>   [`./engineering-cli-connectors.md`](./engineering-cli-connectors.md) — worked example (Wave 1)
>   [`./product-management-cli-connectors.md`](./product-management-cli-connectors.md) — worked example (Wave 1)
>   [`../plugin-migration-pattern.md`](../plugin-migration-pattern.md) — the simple 4-step template
> Upstream: `vendor/anthropic/knowledge-work-plugins/` (read-only, MIT)
> Target repo: [`subagentapps/knowledge-work-plugins-cli`](https://github.com/subagentapps/knowledge-work-plugins-cli)

---

## 1. The directive

> *"You need to migrate and build out customer-support-cli, data-cli,
> design-cli, engineering-cli, enterprise-search-cli, finance-cli,
> human-resources-cli, legal-cli, marketing-cli, operations-cli,
> partner-built-cli, pdf-viewer-cli, product-management-cli,
> productivity-cli, sales-cli based on
> https://github.com/anthropics/knowledge-work-plugins. Decompose these
> with the expectation each skill works and you design a strategy to
> replace the connectors with alternatives to dogfood the approach
> we've been taking."*

Reconciling the directive with the upstream reality:

- User's list: 15 plugins
- Upstream inventory: 17 directories — the 11 enumerated in the README plus
  `bio-research`, `cowork-plugin-management`, `design`, `engineering`,
  `human-resources`, `operations`, `pdf-viewer`, `partner-built/*` (5 nested)
- User omitted `bio-research` (likely accidental); included `partner-built-cli`
  (NOT a single plugin — 5 nested partner plugins: apollo, brand-voice,
  common-room, slack, zoom-plugin)

**Resolution**: scope the migration to **15 plugins** matching the user's
explicit list, using the `partner-built` directory as one umbrella migration
target (each of the 5 nested plugins becomes a sub-target). `bio-research`
is added in case the user meant "all" (deferred per matrix verdict but
scaffolded so the user can opt-in).

---

## 2. The dogfood principle

The brand promise from `docs/spec/brand/voice.md` §6:

> *"Premium quality, honest cost. The price you'd pay for Opus end-to-end
> isn't the price we run."*

Applied to plugin connectors: the price you'd pay for 14 commercial MCP
subscriptions (Notion, Slack, Linear, Jira, Asana, Hubspot, Intercom,
Salesforce, Datadog, Amplitude, Pendo, etc.) isn't what kwpc-cli charges.
We dogfood the substitutes by running them on this very repo:

| Connector category | kwpc-cli substitute | Already proven on this repo? |
|---|---|---|
| `~~project tracker` | GitHub Projects v2 | ✅ Project #2 "Polyrepo Wave 0 — subagentapps" wires this dashboard |
| `~~knowledge base` | `rg` over `docs/spec/`, `docs/research/`, `installs/` | ✅ Every spec PR demonstrates it |
| `~~chat` | `gh pr/issue comment` | ✅ Every PR review thread |
| `~~source control` | GitHub MCP + `gh` CLI | ✅ Every commit |
| `~~CI/CD` | `gh run list/view/watch` + `Monitor` tool | ✅ release-please.yml + deploy-live-artifact.yml |
| `~~user feedback` | GitHub Issues with `user-feedback` label | ✅ Pattern documented in product-management-cli-connectors.md |
| `~~incident management` | GitHub Issues with `incident` label | ✅ engineering-cli-incident-postmortem.md spec |

Five categories are dropped with graceful degradation (paid OAuth gates):
`~~monitoring`, `~~CRM`, `~~ATS`, `~~HRIS`, `~~marketing automation`,
`~~SEO`, `~~product analytics`. These mark the affected skills as
`divergent` per the matrix.

---

## 3. The 15-plugin assignment to Waves

Per `connector-availability-matrix.md` §4. Each plugin's wave is determined
by what fraction of its categories are Available (A) vs Drop-with-no-good-
alternative (C) vs Drop-applicable (D).

### Wave 1 — ships clean (≥80% of categories A or B)

5 plugins. Most skills work end-to-end; ≤2 skills per plugin marked divergent.

| Plugin | Skills | Categories | Verdict |
|---|---|---|---|
| `productivity-cli` | 4 (start, update, task-management, memory-management) | 6: chat, email, calendar, KB, project tracker, office suite | All 4 skills via gh + on-disk KB |
| `product-management-cli` | 8 | 10 | 6 skills end-to-end; 2 (competitive-brief, metrics-review) divergent |
| `engineering-cli` | 10 | 7 | 8 skills end-to-end; 2 (debug, incident-response) graceful-degrade |
| `data-cli` | 10 | 4 | All 10 skills via DuckDB local + BigQuery opt-in |
| `design-cli` | 7 | 6 | All 7 skills via Figma opt-in + GitHub substitutes |

### Wave 2 — ships partial (50-80% A/B; documented degradation per skill)

6 plugins. Some skills work fully headless; others require user paste-input
because the upstream connector's domain isn't reachable in CLI.

| Plugin | Why "partial" |
|---|---|
| `customer-support-cli` | CRM + support platform (Intercom/Zendesk/Salesforce/HubSpot) blocked → customer-research, kb-article skills degrade to manual paste |
| `enterprise-search-cli` | Email + office suite blocked → reframe as "search across this polyrepo + connected MCPs" |
| `finance-cli` | ERP (NetSuite/SAP/QuickBooks) + analytics/BI (Tableau/Looker/PowerBI) → audit-support, sox-testing, journal-entry degrade to CSV-input |
| `human-resources-cli` | ATS (Greenhouse/Lever/Ashby) + HRIS (Workday/BambooHR) + comp-data (Pave/Radford) all paid-OAuth → recruiting-pipeline, comp-analysis degrade |
| `legal-cli` | CLM (Ironclad/Agiloft) + e-signature (DocuSign/Adobe) blocked → signature-request, legal-response workflow skills degrade |
| `operations-cli` | ITSM (ServiceNow/Zendesk Service) + procurement (Coupa/SAP Ariba) blocked → vendor-review, change-request degrade |

### Wave 3 — defer with rationale (>50% C-blocked)

3 plugins. Connector density too high relative to value-add of the headless
versions. Scaffolds shipped (plugin.json + empty skills/ + CONNECTORS.md
saying "deferred"); skill bodies not implemented for v0.1.0.

| Plugin | Why deferred |
|---|---|
| `bio-research-cli` | 9 specialty categories (literature/clinical-trials/chem/etc); most blocked or paid-only; no user surface |
| `marketing-cli` | 5 of 8 categories paid-OAuth (marketing automation, SEO, product analytics, marketing analytics, email marketing) |
| `sales-cli` | CRM + data enrichment + conversation intel + sales engagement all paid → primary value-prop unreachable |

### Wave 4 — partner-built sub-plugins (each its own scope decision)

5 nested plugins under `partner-built/`. The user's list says
`partner-built-cli` (singular). Each sub-plugin is a separate decision:

| Plugin | Owner | Scope decision |
|---|---|---|
| `apollo` | Apollo (sales engagement) | **Defer** — same blockers as sales-cli |
| `brand-voice` | Tribe AI | **Defer (already used as ref)** — we already adopted brand-voice's framework into `docs/spec/brand/voice.md`; a CLI port is redundant |
| `common-room` | Common Room | **Defer** — sales engagement gating |
| `slack` | Slack | **Wave 1 candidate** — Slack MCP works headless once user OAuths; could port if user wants |
| `zoom-plugin` | Zoom | **Defer** — heavy SDK / OAuth surface; out of scope |

Net Wave 4: 1 candidate (`slack-cli`), 4 deferred.

### Special case — `pdf-viewer-cli`

The upstream `pdf-viewer` is a **single skill** (`view-pdf`) referencing a
local MCP server's tools (`list_pdfs`, `display_pdf`, `interact`). Per the
plugin-migration-pattern §"Plugins that need *more*":

> *"Already works as-is; it's a single skill referencing a local MCP server.
> No port needed. Just symlink or reference upstream."*

**Decision**: ship `pdf-viewer-cli` as a thin wrapper plugin whose
`.mcp.json` references the upstream's local-PDF MCP server unchanged. No
skill rewrites. **Wave 1 by virtue of being trivial.**

### Special case — `cowork-plugin-management`

User's list omits this. It already has a CLI parallel: `platform-engineering`
(per the kwpc-cli README mapping). No new work needed; it's already in the
kwpc-cli scaffold from the early survey.

---

## 4. Final wave roster (15 user-listed plugins)

| # | Wave | Plugin | Status |
|---|---|---|---|
| 1 | 1 | `productivity-cli` | Wave-1: 4/4 skills ship clean |
| 2 | 1 | `product-management-cli` | Wave-1: 6/8 ship; 2 divergent (already specced) |
| 3 | 1 | `engineering-cli` | Wave-1: 8/10 ship; 2 graceful-degrade (already specced) |
| 4 | 1 | `data-cli` | Wave-1: 10/10 with DuckDB local + BigQuery opt-in |
| 5 | 1 | `design-cli` | Wave-1: 7/7 with Figma opt-in |
| 6 | 1 (trivial) | `pdf-viewer-cli` | Wave-1: thin wrapper, single skill |
| 7 | 2 | `customer-support-cli` | Wave-2: ships partial |
| 8 | 2 | `enterprise-search-cli` | Wave-2: ships partial |
| 9 | 2 | `finance-cli` | Wave-2: ships partial |
| 10 | 2 | `human-resources-cli` | Wave-2: ships partial |
| 11 | 2 | `legal-cli` | Wave-2: ships partial |
| 12 | 2 | `operations-cli` | Wave-2: ships partial |
| 13 | 3 | `marketing-cli` | Wave-3: scaffold-only; defer skill bodies |
| 14 | 3 | `sales-cli` | Wave-3: scaffold-only; defer skill bodies |
| 15 | 4 | `partner-built-cli` (umbrella) | Wave-4: 1 candidate (slack), 4 deferred |

**11 of 15 plugins ship functional code.** 4 ship as scaffolds with deferral
notes (marketing, sales, bio-research-if-included, 4-of-5 partner-built).

---

## 5. The canonical migration template (per plugin)

Per `../plugin-migration-pattern.md` §2. Locked to 4 mechanical steps:

### Step 1 — copy the plugin tree

```
subagentapps/knowledge-work-plugins-cli/<plugin>-cli/
├── .claude-plugin/
│   └── plugin.json
├── skills/                    ← copy verbatim from vendor/.../<plugin>/skills/
├── commands/                  ← copy if upstream has it
├── .mcp.json                  ← see step 3
├── CONNECTORS.md              ← see step 4
└── README.md                  ← author fresh
```

### Step 2 — update `plugin.json`

```diff
 {
-  "name": "<plugin>",
+  "name": "<plugin>-cli",
   "version": "0.1.0",
-  "description": "<upstream description>",
+  "description": "CLI port of @anthropic-ai/<plugin>. Same skills, CLI-native connector subset.",
-  "author": { "name": "Anthropic" }
+  "author": { "name": "agentknowledgeworkers" }
 }
```

Skill-level frontmatter stays untouched.

### Step 3 — translate `.mcp.json`

Apply the heuristic table from `engineering-cli-connectors.md` §6:

| Category type | Default verdict | What goes in .mcp.json |
|---|---|---|
| Chat (Slack/Teams) | Substitute → `gh pr/issue comment` | empty |
| Source control | Keep | `github` only |
| Project tracker | Substitute → GitHub Projects v2 | empty (gh CLI handles it) |
| Knowledge base | Substitute → `rg` over `docs/` | empty |
| Monitoring / incident mgmt | Drop with graceful degradation | empty |
| CI/CD | Substitute → `gh run` | empty |
| Email / Calendar | Drop | empty |
| Office suite | Drop | empty |
| Design (Figma) | Keep if MCP available | `figma` (opt-in) |
| Product analytics | Drop (paid OAuth) | empty (or self-host server-cohort-heatmap) |
| Data warehouse | Keep BigQuery; drop Snowflake/Databricks | `bigquery` |
| User feedback | Substitute → GitHub Issues | empty |
| Cloud storage | Substitute → repo files / git lfs | empty |
| CRM / ATS / HRIS / ITSM / e-signature / CLM | Drop (no good alternative) | empty |
| Marketing stack (HubSpot/Marketo/Klaviyo/Ahrefs) | Drop | empty |
| Sales stack (Outreach/Salesloft/Apollo) | Drop | empty |

Wave-1 plugins typically end with **0-2 servers** in `.mcp.json`. Wave-2
plugins typically end with **0-1**. Wave-3 ships empty.

### Step 4 — author per-plugin `CONNECTORS.md`

Half-page document. Lists each `~~category` and the verdict (Keep / Drop /
Substitute) with rationale. Worked examples already exist for engineering
and product-management — the rest follow the same shape.

---

## 6. Acceptance criteria (per plugin)

Each migrated plugin lands with all of:

1. **`<plugin>-cli/` directory** in `subagentapps/knowledge-work-plugins-cli` repo
2. **`.claude-plugin/plugin.json`** with corrected name, version 0.1.0, author=agentknowledgeworkers
3. **`skills/`** copied from upstream (sub-dirs + SKILL.md + references/ verbatim)
4. **`.mcp.json`** translated per the heuristic table
5. **`CONNECTORS.md`** documenting per-category Keep/Drop/Substitute decisions
6. **`README.md`** with the install command, what's working, what degrades
7. **`docs/spec/cli-skills/<plugin>-cli-connectors.md`** in this repo (the spec contract)
8. **GitHub Issue** in `subagentapps/knowledge-work-plugins-cli` titled `Plugin migration: <plugin> → <plugin>-cli` linking the PR
9. **PR** in `subagentapps/knowledge-work-plugins-cli` opened, reviewed, merged
10. **Build verification**: `claude plugin install <plugin>-cli` succeeds on a fresh sandbox (deferred to plugin-publish step; not blocking the PR merge)

---

## 7. Cross-org write gate

This migration touches **`subagentapps/knowledge-work-plugins-cli`** —
a different repo from the meta-repo this strategy lives in. Per CLAUDE.md
HITL gate #12: cross-org/cross-repo write requires explicit user approval.

**Status**: pre-approved per the user's `/loop` directive launching this
work. Each PR will still be opened on a topic branch in the kwpc-cli repo
and reviewed before merge — pre-approval covers PR creation, not unreviewed
merges.

---

## 8. Sequencing — what order

The dogfood principle says: **port `productivity-cli` first**, because it's
the plugin that lets us track this very migration in GitHub Projects. Once
it ships, we use it to track the remaining 14.

Order:

1. **`productivity-cli`** (Wave 1, 4 skills) — dogfood instrument
2. **`pdf-viewer-cli`** (Wave 1, trivial wrapper) — proves the template on a 1-skill plugin
3. **`engineering-cli`** (Wave 1, 10 skills) — proves the template on a complex plugin (already partly specced)
4. **`design-cli`** (Wave 1, 7 skills) — proves the Figma opt-in pattern
5. **`data-cli`** (Wave 1, 10 skills) — proves the data-warehouse opt-in pattern
6. **`product-management-cli`** (Wave 1, 8 skills) — already partly specced
7. **Wave 2 batch** (6 plugins, in matrix order): customer-support, enterprise-search, finance, human-resources, legal, operations — apply template mechanically
8. **Wave 3 scaffolds**: marketing-cli, sales-cli (no skill bodies yet)
9. **Wave 4**: slack-cli (the one partner-built that fits Wave 1); document defers for the other 4 partner-built

---

## 9. Effort estimates

Per `plugin-migration-pattern.md` §"Plugins that are pure copy-paste" et al:

| Wave | Plugins | Per-plugin time | Total |
|---|---|---|---|
| 1 | 6 | 1-2h | 6-12h |
| 2 | 6 | 1-2 days | 6-12d |
| 3 | 2 (scaffold-only) | 30 min | 1h |
| 4 | 5 (mostly defer) | 30 min for 4 defers; 1-2h for slack-cli | 4h |

**Total realistic effort: ~10-15 days** for one author working at a
sustained pace. Realistic across multiple `/loop` firings: each iteration
ships 1-2 plugins; the strategy is the unblocker.

---

## 10. What ships THIS firing (iter 1)

This document. Plus an iter-2 plan to start with **productivity-cli** since
it dogfoods.

The user can review this strategy, approve / amend the wave assignments,
and the next firing executes iter 2. If the user wants to skip the
strategy review and proceed directly, they can say so and the next loop
firing will start porting productivity-cli.

---

## 11. Provenance

- 17 upstream plugin dirs at `vendor/anthropic/knowledge-work-plugins/` (vendored, MIT)
- 28-category Keep/Drop/Substitute matrix at `connector-availability-matrix.md`
- 4-step template at `../plugin-migration-pattern.md`
- Worked examples at `engineering-cli-connectors.md`, `product-management-cli-connectors.md`
- User directive 2026-04-27: 15 plugins listed; this strategy reconciles to 11 ship + 4 scaffold/defer
- Authored by Claude (Opus 4.7) under `.claude/prompts/opus-orchestrator.md`
