# data-cli connectors — Keep / Drop / Substitute decisions

> Status: load-bearing as of 2026-04-27
> Source: `vendor/anthropic/knowledge-work-plugins/data/{CONNECTORS.md, .mcp.json, README.md}`
> Implementation: [`subagentapps/knowledge-work-plugins-cli/data-cli/`](https://github.com/subagentapps/knowledge-work-plugins-cli/tree/main/data-cli) (PR #11)
> Pattern: [`../plugin-migration-pattern.md`](../plugin-migration-pattern.md)
> Strategy: [`./kwpc-cli-migration-strategy.md`](./kwpc-cli-migration-strategy.md)

---

## 1. The defining choice

**Local file-based DBs are the canonical CLI substitute** for `~~data warehouse`. DuckDB + SQLite work without auth, without network, without paid subscriptions. Skills run out of the box.

This is the data-cli equivalent of productivity-cli's "GitHub Projects v2 is the defining choice" — the one decision that makes the plugin honest in a CLI environment.

---

## 2. Decision matrix per category

| Category | Decision | What it means |
|---|---|---|
| `~~data warehouse` | **Substitute → DuckDB / SQLite local default + BigQuery opt-in MCP** | Snowflake / Databricks / Redshift dropped; users with creds add via `.mcp.json` |
| `~~notebook` | **Drop** | Hex / Jupyter — terminal output replaces interactive notebooks |
| `~~product analytics` | **Drop** | Amplitude / Mixpanel / Heap — manual KPI paste |
| `~~project tracker` | **Substitute → GitHub Projects v2** | `gh project item-*`, `gh issue *` |

**Final `.mcp.json`: 1 server (bigquery, opt-in).** Down from 7 upstream.

---

## 3. Per-skill impact (10 skills)

| Skill | Categories | Behavior |
|---|---|---|
| `analyze` | `~~data warehouse`, `~~notebook` | DuckDB/SQLite default; BigQuery opt-in |
| `build-dashboard` | `~~data warehouse` | Same |
| `create-viz` | (none) | No connector dependency |
| `data-context-extractor` | `~~data warehouse` | Same |
| `data-visualization` | (none) | No connector dependency |
| `explore-data` | `~~data warehouse` | Same |
| `sql-queries` | `~~data warehouse` | Same |
| `statistical-analysis` | (none) | No connector dependency |
| `validate-data` | `~~data warehouse` | Same |
| `write-query` | `~~data warehouse` | Same |

**10 of 10 work end-to-end** — DuckDB local default is the canonical CLI substitute.

---

## 4. Optional opt-in

| Server | Why |
|---|---|
| Snowflake / Databricks community MCPs (when published) | Production warehouses |
| `@modelcontextprotocol/server-cohort-heatmap` (npx stdio) | Retention viz for analyze / build-dashboard |

---

## 5. Provenance

- Upstream: `vendor/anthropic/knowledge-work-plugins/data/` (vendored 2026-04-26, Apache-2.0)
- Implementation PR: [`subagentapps/knowledge-work-plugins-cli#11`](https://github.com/subagentapps/knowledge-work-plugins-cli/pull/11)
- Authored by Claude (Opus 4.7) under `.claude/prompts/opus-orchestrator.md`
