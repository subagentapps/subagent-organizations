# Plugin migration pattern — knowledge-work-plugins → kwpc-cli

> Status: load-bearing as of 2026-04-26
> Owner: `repo-orchestrator` agent
> Replaces: the heavy "port every skill" framing in the kwpc audit brief.

## Core insight (from 2026-04-26 user correction)

**The upstream SKILL.md files are already CLI-callable.** They use the same
markdown + frontmatter format that Claude Code skills use today. There's no
"port" needed for the skill content itself — the file you read in
`vendor/anthropic/knowledge-work-plugins/<plugin>/skills/<skill>/SKILL.md`
is the file Claude Code will execute as a skill, unchanged.

What *does* differ between Cowork and CLI is the **connector layer**: which
MCP servers a skill can reach. That's where migration work lives.

## The minimum-viable migration per plugin (4 steps)

For each migratable upstream plugin (14 total — all of
`anthropics/knowledge-work-plugins/*` except `partner-built/*`):

### 1. Copy the plugin tree

```
subagentapps/knowledge-work-plugins-cli/<plugin>-cli/
├── .claude-plugin/
│   └── plugin.json        ← name = "<plugin>-cli", version reset to 0.1.0,
│                            author = subagentapps/agentknowledgeworkers
├── skills/                ← copy verbatim from upstream
│   └── <skill>/
│       ├── SKILL.md
│       ├── references/    ← if present upstream
│       └── examples/      ← if present upstream
├── commands/              ← copy if upstream has it (e.g., product-management/commands/brainstorm.md)
├── .mcp.json              ← see step 3
├── CONNECTORS.md          ← see step 4
└── README.md              ← author fresh; reference upstream provenance
```

### 2. Update `plugin.json`

Three edits, that's it:

```diff
 {
-  "name": "productivity",
+  "name": "productivity-cli",
   "version": "0.1.0",
-  "description": "Manage tasks, calendars, daily workflows, and personal context.",
+  "description": "CLI port of @anthropic-ai/productivity. Same skills, CLI-native connector subset.",
-  "author": { "name": "Anthropic" }
+  "author": { "name": "agentknowledgeworkers" }
 }
```

Skill-level frontmatter stays untouched.

### 3. Translate `.mcp.json`

Per category, decide one of:

| Decision | Action in `.mcp.json` |
|---|---|
| **Keep** — MCP server works in CLI today (Slack, Notion, Linear, GitHub, Atlassian — see `claude.com/connectors`) | Keep entry as-is. |
| **Drop** — server requires Cowork-only OAuth dance or is commercial-license-gated (Salesforce, Pendo, Amplitude, Fireflies, etc.) | Remove from `.mcp.json`. The `~~category` placeholder still resolves at runtime; it just degrades. |
| **Substitute** — CLI-native equivalent exists (Jira → `gh issue` for repos under our control) | Replace URL or add a new key with the substitute. |

Skill files **do not need to be edited** for `~~category` references —
the placeholder is resolved at runtime by whichever MCP servers are
actually connected. A dropped server simply means that branch of the
skill workflow is unavailable; the rest of the skill still runs.

### 4. Author per-plugin `CONNECTORS.md`

Half a page. Lists each `~~category` and which decision applied (Keep /
Drop / Substitute). This is the **only new prose** the migration
requires.

## Plugins that need *more* than the 4 steps

Some plugins do require deeper work beyond the template. Tracked
explicitly so they don't get batched with the easy ones:

| Plugin | Why it needs more | Notes |
|---|---|---|
| `productivity` | Task source-of-truth pivots from local `TASKS.md` to GitHub Projects | The kwpc README pins this divergence: "GitHub Projects is the dashboard. No local TASKS.md." Skill bodies need the upstream TASKS.md references rewritten to `gh issue` / `gh project` calls. |
| `product-management` | Upstream `roadmap-update`, `sprint-planning`, `stakeholder-update` assume Linear/Asana/Jira; CLI parallel uses GitHub Projects | Same divergence as productivity. Document in CONNECTORS.md and per-skill spec. |
| `engineering` | 10 skills exist upstream; we're porting only 5 (system-design, testing-strategy, stack-check, architecture-review, incident-postmortem) per `cli-parity-tracker.md`. The other 5 (architecture, code-review, debug, deploy-checklist, documentation, standup, tech-debt) need scoping. | Decide per-skill. Several may simply not need a CLI port (code-review, debug exist in many other tools). |
| `data` | 10 upstream skills mostly need real warehouse access; in CLI we likely run against DuckDB / SQLite locally and only call out to remote warehouses on MCP-connected sessions | Heavier `.mcp.json` work — bigquery has an MCP, snowflake/databricks don't yet (per the URLs in upstream `data/.mcp.json`, they're empty). |
| `pdf-viewer` | Already works as-is; it's a single skill referencing a local MCP server | **No port needed. Just symlink or reference upstream.** Was previously marked deferred in the audit; revisit. |
| `cowork-plugin-management` | Two skills (`create-cowork-plugin`, `cowork-plugin-customizer`); one explicitly requires the Cowork desktop app environment | `create-cowork-plugin` requires Cowork's outputs directory; not portable to CLI as-is. `cowork-plugin-customizer` is portable. We've already mapped this to `platform-engineering` in kwpc. |

## Plugins that are pure copy-paste (the speed-running set)

These should each take **under an hour** end-to-end. Ten plugins fall in
this bucket:

`bio-research`, `customer-support`, `design`, `enterprise-search`,
`finance`, `human-resources`, `legal`, `marketing`, `operations`,
`sales`.

Their skills are domain prose with `~~category` placeholders. The
connector list mostly drops to a smaller "available-in-CLI" subset; the
skill bodies are reusable verbatim.

## What the orchestrator does (per-plugin)

1. Open a tracking GitHub Issue: `Plugin migration: <plugin> → <plugin>-cli`,
   labels `enhancement` + `plugin-migration`, add to Project #2.
2. Sub-issue per skill IF the skill has a `~~category` decision that
   doesn't fit the default Keep/Drop pattern.
3. Open a PR in `subagentapps/knowledge-work-plugins-cli` (NOT this repo)
   that copies the tree per the 4 steps above.
4. Close the tracking issue when the PR merges.

## Sequencing

Do the easy 10 first. Then the 4 with divergence. Then re-evaluate
`pdf-viewer` and `cowork-plugin-management` based on what we learn.

```
Wave 1 (easy):     bio-research, customer-support, design, enterprise-search,
                   finance, human-resources, legal, marketing, operations, sales
Wave 2 (divergent): productivity-cli, product-management-cli, engineering-cli, data-cli
Wave 3 (revisit):  pdf-viewer (likely just-reference), cowork-plugin-management
                   (already lives as platform-engineering)
```

## Why this is much simpler than the audit suggested

The audit (`installs/briefs/2026-04-26-kwpc-audit.md`) projected
~60-160 connector matrix rows and per-skill spec work. Most of that
work is **already done by the upstream SKILL.md frontmatter + the
runtime placeholder resolution.** We just need a single `CONNECTORS.md`
per plugin documenting which categories were dropped.

**Estimated effort**: 1-2 hours per Wave-1 plugin × 10 = 10-20 hours.
Wave-2 plugins are 1-2 days each due to divergence work × 4 = 4-8 days.
That's an order of magnitude smaller than the "ladder M5-M14" path.
