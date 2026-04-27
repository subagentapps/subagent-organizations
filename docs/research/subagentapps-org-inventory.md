# `subagentapps/*` org inventory

Status: living document — orchestrator-managed
Source: `gh api graphql` against `repository(owner:"subagentapps", name:...)` — token-efficient root metadata only
Companion to: `docs/research/anthropic-github-conventions.md`, `docs/spec/orchestration-strategy.md`

## Purpose

This file is the **one-glance inventory** of every repo the user owns under
`subagentapps/`. Each section is **root-level metadata only** — never source
reads on first pass.

Sections come from two sources:
- **This file (orchestrator-written)**: 5 newly-discovered repos that aren't
  covered by the scheduled survey routines.
- **Routine-appended sections**: 5 routines (`subagentapps-survey-1..5`) fire
  at 22:00–22:08 PDT 2026-04-25 daily, each appending a dated section for
  one of: `subagent-xml`, `subagent-crawls`, `subagents-platform-execution`,
  `warehouse`, `anthropic-docs-scraper`.

## Org snapshot — 13 repos (12 owned + 1 fork)

Per https://github.com/orgs/subagentapps/repositories (screenshot 2026-04-25):

| Repo | Status | Coverage |
|---|---|---|
| `subagent-organizations` | this repo | (self) |
| `knowledge-work-plugins-cli` | dogfood target | not surveyed here (separate `docs/research/knowledge-work-plugins-cli-survey.md`) |
| `cmux` | **fork** (Ghostty-based macOS terminal) | NOT owned — skip |
| `anthropic-docs-scraper` | owned | routine `subagentapps-survey-5-anthropic-docs-scraper` (22:08 PDT) |
| `warehouse` | owned | routine `subagentapps-survey-4-warehouse` (22:06 PDT) |
| `subagents-platform-execution` | owned | routine `subagentapps-survey-3-subagents-platform-execution` (22:04 PDT) |
| `subagent-crawls` | owned | routine `subagentapps-survey-2-subagent-crawls` (22:02 PDT) |
| `subagent-xml` | owned | routine `subagentapps-survey-1-subagent-xml` (22:00 PDT) |
| `managed-subagents` | owned | **§ inline below** |
| `subagent-platform` | owned | **§ inline below** |
| `subagent-system-designs` | owned | **§ inline below** — ⚠ scope overlap with this repo |
| `managedsubagents` | owned | **§ inline below** |
| `subagent-mcp-app` | owned | **§ inline below** |

## ⚠ Source-of-truth conflict — `subagent-system-designs`

The repo description (verbatim, captured 2026-04-25 21:50 PDT):

> *"Meta-repo: manifests, ADRs, addendums, GraphQL schema, reusable
> workflows. Source-of-truth for the polyrepo per GitHub Well-Architected
> (Architecture pillar / Implementing polyrepo on GitHub)."*

This **directly overlaps** with `subagent-organizations`'s framing. The
new `.claude/CLAUDE.md` for this repo (revised 2026-04-25 ~21:30 PDT) says:

> *"This is a TypeScript reference catalog modeled after the Claude Agent
> SDK's primitive system."*

Both repos can't be the polyrepo source of truth. Resolution is the user's
call:

- **Option A**: `subagent-system-designs` is the polyrepo meta-repo;
  `subagent-organizations` narrows to "TypeScript reference catalog only"
  (matches the new CLAUDE.md framing).
- **Option B**: keep `subagent-organizations` as the polyrepo meta-repo;
  archive `subagent-system-designs` or rescope it.
- **Option C**: they have non-overlapping scopes that just happen to be
  described identically.

Until resolved, treat `subagent-system-designs` as **read-only from this
repo's perspective** — don't write to it, don't reference it as
authoritative.

## `managed-subagents`

| Field | Value |
|---|---|
| Full name | `subagentapps/managed-subagents` |
| Description | (none) |
| Default branch | `main` |
| Primary language | (none / scaffold) |
| License | (none) |
| Has issues / projects | yes / yes |
| Open issues | 0 |
| Visibility | private |
| Disk usage (KB) | 0 |
| Last pushed | 2026-04-25T22:50:43Z |

**WAF presence (root-level only — not deep-checked):** unknown; repo is empty (0 KB).

**Note on naming**: `managed-subagents` (hyphenated) is **distinct** from
`managedsubagents` (no hyphen). Two separate repos.

**Status**: Wave 0 scaffold; nothing to survey yet. Re-survey once content lands.

## `subagent-platform`

| Field | Value |
|---|---|
| Full name | `subagentapps/subagent-platform` |
| Description | (none) |
| Default branch | `main` |
| Primary language | (none / scaffold) |
| License | (none) |
| Has issues / projects | yes / yes |
| Open issues | 0 |
| Visibility | private |
| Disk usage (KB) | 0 |
| Last pushed | 2026-04-25T22:10:17Z |

**Note on naming**: `subagent-platform` (singular) is **distinct** from
`subagents-platform-execution` (plural with `-execution` suffix). Two
separate repos.

**Status**: Wave 0 scaffold; empty. Re-survey once content lands.

## `subagent-system-designs` — see ⚠ conflict above

| Field | Value |
|---|---|
| Full name | `subagentapps/subagent-system-designs` |
| Description | "Meta-repo: manifests, ADRs, addendums, GraphQL schema, reusable workflows. Source-of-truth for the polyrepo per GitHub Well-Architected (Architecture pillar / Implementing polyrepo on GitHub)." |
| Default branch | `main` |
| Primary language | (none / scaffold) |
| License | **MIT** |
| Has issues / projects | yes / yes |
| Open issues | 0 |
| Visibility | private |
| Disk usage (KB) | 1 |
| Last pushed | 2026-04-25T03:44:41Z |

**Status**: Has a description and a license but only 1 KB on disk — likely
just LICENSE + README scaffold. The description's claim to be the polyrepo
source-of-truth conflicts with this repo (see warning above).

## `managedsubagents`

| Field | Value |
|---|---|
| Full name | `subagentapps/managedsubagents` |
| Description | "Internal monorepo for managedsubagents.com — skills, warehouse, jobs API docs" |
| Default branch | `main` |
| Primary language | **HTML** |
| License | (none) |
| Has issues / projects | yes / yes |
| Open issues | 0 |
| Visibility | private |
| Disk usage (KB) | **193** |
| Last pushed | 2026-04-25T01:19:46Z |

**Note on naming**: `managedsubagents` (no hyphen) is the `*.com`-named
repo and is the only one of the 5 surveyed here that has content.

**Status**: 193 KB; HTML primary suggests static site or marketing page.
Scope: "skills, warehouse, jobs API docs" — overlaps conceptually with the
KB / contextual-retrieval work tracked under issues #12 (cookbook) and #13
(KB sources expansion). Worth a follow-up read once Wave 0 closes.

## `subagent-mcp-app`

| Field | Value |
|---|---|
| Full name | `subagentapps/subagent-mcp-app` |
| Description | (none) |
| Default branch | `main` |
| Primary language | (none / scaffold) |
| License | (none) |
| Has issues / projects | yes / yes |
| Open issues | 0 |
| Visibility | private |
| Disk usage (KB) | 0 |
| Last pushed | 2026-04-24T21:38:16Z |

**Status**: Wave 0 scaffold; empty. Likely an MCP server or app per the
naming. Re-survey once content lands.

## Methodology

GraphQL query used (single round-trip, all 5 repos):

```graphql
{
  managedSubagents: repository(owner:"subagentapps", name:"managed-subagents") { ... }
  subagentPlatform: repository(owner:"subagentapps", name:"subagent-platform") { ... }
  subagentSystemDesigns: repository(owner:"subagentapps", name:"subagent-system-designs") { ... }
  managedsubagentsDot: repository(owner:"subagentapps", name:"managedsubagents") { ... }
  subagentMcpApp: repository(owner:"subagentapps", name:"subagent-mcp-app") { ... }
}
```

Returned fields: `nameWithOwner`, `description`, `defaultBranchRef.name`,
`primaryLanguage.name`, `licenseInfo.spdxId`, `hasIssuesEnabled`,
`hasProjectsEnabled`, `issues(states:OPEN).totalCount`, `pushedAt`,
`diskUsage`, `isPrivate`.

**No source code reads.** **No README fetches** in this iteration — 4 of 5
repos are 0–1 KB scaffolds where README would add nothing.

## Routine-appended sections (filled by `subagentapps-survey-1..5` at 22:00–22:08 PDT)

The routines write to this same file with sections like
`## subagent-xml — survey 2026-04-26 05:00Z` (UTC timestamp). They include
a richer survey: README first 100 lines + WAF presence checklist
(CODEOWNERS, dependabot.yml, workflows dir, LICENSE) + open WAF-gap follow-up
issues against this repo.

When the routines fire, they should APPEND below this line — not edit
sections written here.

---

<!-- Routines append below this line -->

## subagent-xml — survey 2026-04-26 05:00Z (routine v1, blocked)

| Field | Value |
|---|---|
| Source | v1 routine `subagentapps-survey-1-subagent-xml` (`run_once_at: 2026-04-26T05:00:00Z`) |
| Outcome | **partial — MCP scope blocker** |
| Metadata captured | none — search_repositories did not match |
| Contents read | denied (session scope = subagent-organizations only) |
| Resolution | v2 routine `subagentapps-survey-1-subagent-xml-v2` re-fires 2026-04-27T05:00:00Z with target repo in `sources[]` |

## subagent-crawls — survey 2026-04-26 05:02Z (routine v1, blocked)

| Field | Value |
|---|---|
| Source | v1 routine (run_once_at 2026-04-26T05:02:00Z) |
| Outcome | partial — MCP scope blocker |
| Metadata (via search_repositories) | private; primary_language `Python`; default_branch `main`; pushed_at `2026-04-25T12:26:13Z`; size_kb `2742`; has_issues true; open_issues_count 0 |
| Contents read | denied — README, tree, CLAUDE.md unverified |
| Resolution | v2 retry 2026-04-27T05:02:00Z |

## subagents-platform-execution — survey 2026-04-26 05:04Z (routine v1, blocked)

| Field | Value |
|---|---|
| Source | v1 routine (run_once_at 2026-04-26T05:04:00Z) |
| Outcome | partial — MCP scope blocker |
| Metadata (via search_repositories) | private; primary_language `Python`; default_branch `main`; pushed_at `2026-04-25T12:30:16Z`; size_kb `40`; has_issues true; open_issues_count 1 |
| Contents read | denied |
| Resolution | v2 retry 2026-04-27T05:04:00Z |

## warehouse — survey 2026-04-26 05:06Z (routine v1, blocked)

| Field | Value |
|---|---|
| Source | v1 routine (run_once_at 2026-04-26T05:06:00Z) |
| Outcome | partial — MCP scope blocker |
| Metadata (via search_repositories) | private; primary_language `Python`; default_branch `main`; pushed_at `2026-04-25T12:31:46Z`; size_kb `1387`; has_issues true; open_issues_count 1 |
| Contents read | denied |
| Resolution | v2 retry 2026-04-27T05:06:00Z |

## anthropic-docs-scraper — survey 2026-04-26 05:08Z (routine v1, blocked)

| Field | Value |
|---|---|
| Source | v1 routine (run_once_at 2026-04-26T05:08:00Z) |
| Outcome | partial — MCP scope blocker |
| Metadata (via search_repositories) | private; primary_language `Python`; default_branch `main`; pushed_at `2026-04-25T12:44:50Z`; size_kb `43`; has_issues true; open_issues_count 1 |
| Contents read | denied |
| Resolution | v2 retry 2026-04-27T05:08:00Z |

## v1 → v2 migration retrospective (2026-04-26)

**Root cause of v1 blocker.** Routines in `manaflow_ai/cmux`-style cloud
sessions get a GitHub MCP server scoped to `session_context.sources[]`.
v1 routines listed only `subagent-organizations` in sources, so cross-repo
content reads were denied at the MCP server level. Cross-repo *metadata* via
`search_repositories` still worked because that endpoint operates on the
public/visible search index, not on per-repo content APIs.

**v2 fix.** Each v2 routine adds the survey target to `sources[]`:

```jsonc
"sources": [
  { "git_repository": { "url": "https://github.com/subagentapps/subagent-organizations" } },
  { "git_repository": { "url": "https://github.com/subagentapps/<target>" } }
]
```

This makes the target repo a clone in the cloud workspace, and the GitHub
MCP server's allow-list expands to include it. Filesystem reads (`ls`,
`cat README.md`, `head .github/workflows/*.yml`) work without API calls.

**Lesson for future routines.** Any cross-repo work needs every touched repo
in `sources[]`. Adding it to `mcp_connections[]` won't help — that field is
for HTTP MCP servers, not for git-clone scope.

**Why we didn't just delete the v1 PRs.** They captured the blocker context
in detail and proved the MCP scope hypothesis. We close them as superseded
(not deleted) so the audit trail of "first try → diagnosis → second try"
stays intact for future orchestrator runs hitting similar boundaries.

## subagent-xml — survey 2026-04-27 05:00Z (routine v2)

### Metadata

| Field | Value |
|---|---|
| Full name | `subagentapps/subagent-xml` |
| Description | "Scraper ingestion pipeline orchestrated by a Claude Agent SDK managed agent." |
| Default branch | `main` |
| Primary language | Python |
| License | MIT (declared in `pyproject.toml`; no standalone `LICENSE` file at root) |
| Has issues | yes |
| Open issues | 0 |
| Last pushed | 2026-04-25T07:02:28Z |
| Size (KB) | ~21 (root files measured; pipeline/docker/sources/tests dirs not individually measured) |

### Top-level tree

| Name | Type |
|---|---|
| `.env.example` | file |
| `.github/` | dir |
| `.gitignore` | file |
| `CHANGELOG.md` | file |
| `README.md` | file |
| `docker/` | dir |
| `docs/` | dir |
| `pipeline/` | dir |
| `pyproject.toml` | file |
| `sources/` | dir |
| `sources.xml` | file |
| `tests/` | dir |

### README — first paragraph

"Scraper ingestion pipeline orchestrated by a Claude Agent SDK managed agent. The agent drives a Scrapy crawler, ingests results through Redis streams into Postgres 18, exposes them via FastAPI + pg_graphql, and runs dbt transforms on top."

### WAF presence checklist

| Item | Present |
|---|---|
| `.github/CODEOWNERS` | ❌ missing |
| `.github/dependabot.yml` | ❌ missing |
| `.github/workflows/` | ✅ present (`pr.yml`) |
| `LICENSE` | ❌ missing (MIT declared in `pyproject.toml` only) |

**Summary:** A Scrapy + Redis + Postgres 18 + FastAPI + dbt scraper ingestion pipeline orchestrated by a Claude Agent SDK managed agent; also doubles as a curated index of the Anthropic/Claude/MCP ecosystem via `sources/` XML files.

## subagents-platform-execution — survey 2026-04-27 05:04Z (routine v2)

| Field | Value |
|---|---|
| Full name | `subagentapps/subagents-platform-execution` |
| Description | "Warehouse-driven enterprise platform execution layer. The Subagents API runtime is the substrate; the warehouse data picks what gets created on it." |
| Default branch | `main` |
| Primary language | Python |
| License | ❌ none — issue #131 |
| Visibility | private |
| Disk usage (KB) | 40 |
| Last pushed | 2026-04-25T12:30:16Z |
| Open issues | 1 (pre-survey) |
| Supersedes | PR #33 (v1 blocked 2026-04-26) |

### Top-level tree

```
subagents-platform-execution/
├── .github/
│   └── workflows/
│       └── ci.yml          ✅ CI present
├── .gitignore
├── README.md
├── requirements.txt
├── fixtures/               generated + committed (7 fixture files, 44 calls)
├── runner/                 evidence.py · generate.py · replay.py
├── src/                    FastAPI app (config, main, schemas, db/, api/)
└── tests/                  test_platform_execution.py (15 tests)
```

### README summary (first paragraph)

> Warehouse-driven enterprise platform execution layer. The Subagents API runtime is the substrate; the warehouse data picks what gets created on it. **The platform is the trace.** Every API call is justified by a specific warehouse query result. Every entity, every dispatch, every scheduled task traces to evidence.

### Stack

| Package | Pinned constraint |
|---|---|
| `fastapi` | ≥0.115.0 |
| `uvicorn[standard]` | ≥0.32.0 |
| `sqlalchemy[asyncio]` | ≥2.0.35 |
| `aiosqlite` | ≥0.20.0 |
| `pydantic` | ≥2.9.0 |
| `pydantic-settings` | ≥2.5.0 |
| `httpx` | ≥0.27.0 |
| `pytest` | ≥8.0.0 |
| `pytest-asyncio` | ≥0.23.0 |
| `duckdb` | ≥1.0.0 |

### Architecture summary

Warehouse mart data (Louvain community detection on a 191-node, 287-edge architecture knowledge graph) drives 5 service domains. Each domain instantiation = 1 ManagedSubagent + 1 Chat + 1 charter Turn + 3 Dispatches + 1 ScheduledTask. Setup (3 calls) + 5×7 domain calls + verify (6 calls) = **44 calls total**. The runner layer can replay fixtures in-process (SQLite via ASGITransport) or against a live network target.

### WAF presence checklist

| Item | Status |
|---|---|
| `.github/CODEOWNERS` | ❌ missing — issue #129 |
| `.github/dependabot.yml` | ❌ missing — issue #130 |
| `.github/workflows/` | ✅ present (`ci.yml`, 1002 bytes) |
| `LICENSE` | ❌ missing — issue #131 |

### WAF gap issues opened

- #129 — `.github/CODEOWNERS` missing
- #130 — `.github/dependabot.yml` missing
- #131 — `LICENSE` missing

## warehouse — survey 2026-04-27 05:06Z (routine v2)

| Field | Value |
|---|---|
| Full name | `subagentapps/warehouse` |
| Default branch | `main` |
| Primary language | Python |
| Stack | DuckDB ≥1.0.0 · psycopg[binary] ≥3.2.0 · pytest ≥8.0.0 |
| License | ❌ none |
| Branches | `main`, `chore/docs-claude-md` |
| Open issues | 1 (pre-survey) |
| Visibility | private |
| Last pushed | 2026-04-25T12:31:46Z (v1 metadata) |
| Survey method | v2 — direct MCP content reads (warehouse in session scope) |

### Architecture summary

Four-discipline enterprise data warehouse over two fixed inputs: 452 Anthropic Greenhouse job postings + a 191-node / 287-edge architecture knowledge graph from the `synthesis` package. Layers: `raw.*` (append-only, content-addressed) → `stg.*` (cleaned, typed) → `marts.*` (star schema: 9 dims, 5 facts, 3 bridges) → `semantic.*` (metric views). DB facade (`_platform/db.py`) abstracts DuckDB (local) vs Postgres (production) via `WAREHOUSE_DB_URL`. Forward-only migration runner records each DDL file by SHA-256. 32 tests, 0 failures.

### Top-level tree

```
.github/workflows/ci.yml   CI — push/PR to main · Python 3.12 · build + pytest
_platform/                 DB facade, migrations, freshness checks
analytics/queries/         8 SQL analytics queries + runner
data/                      Input JSON fixtures (jobs, graph) + built warehouse.duckdb
docs/                      ARCHITECTURE.md
ingestion/                 greenhouse_jobs.py, architecture_graph.py → raw.*
scripts/build.py           End-to-end pipeline (~60s)
seeds/                     dim_department.csv, dim_office.csv, dim_tool.csv
sql/ddl/                   01_raw.sql → 02_staging.sql → 03_marts.sql → 04_semantic.sql
tests/test_warehouse.py    32 tests (6 DE · 5 platform · 10 AE · 11 DA)
transforms/                parser.py, raw_to_staging.py, staging_to_marts.py
```

### WAF presence checklist

| Item | Status |
|---|---|
| `.github/CODEOWNERS` | ❌ missing — issue #133 |
| `.github/dependabot.yml` | ❌ missing — issue #134 |
| `.github/workflows/` | ✅ present (`ci.yml`, 1 068 bytes) |
| `LICENSE` | ❌ missing — issue #135 |

### Honest limitations (from README)

1. **Task → Tool mapping is heuristic** — ~93% of responsibilities land in `task_kind = 'other'` with no tool match; LLM extraction via Sonnet 4.6 would cost ~$2 total.
2. **SCD2 partially implemented** — diff-detect-and-expire logic only activates on multiple ingestion snapshots; single-snapshot runs are effectively SCD1.
3. **No connectors yet** — architecture supports adding new sources as `ingestion/X.py` + `raw.X_raw` + `transforms/X_to_staging.py`.

### Supersedes

PR #36 (`routine/survey-warehouse-2026-04-26`) — closed 2026-04-26 as blocked (MCP scope: `warehouse` not in v1 session sources).
