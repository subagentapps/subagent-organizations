# `subagentapps/*` org inventory

Status: living document — orchestrator-managed
Source: `search_repositories` API + per-routine MCP calls
Companion to: `docs/research/github-well-architected-deep-dive.md`, `docs/spec/orchestration-strategy.md`

## Purpose

Running log of per-repository surveys against the `subagentapps` GitHub organization.
Each section is appended by an automated routine; do not edit entries retroactively.

---

<!-- Routines append below this line -->

## anthropic-docs-scraper — survey 2026-04-26 05:08Z

### Repository Metadata

| Field | Value |
|---|---|
| name | anthropic-docs-scraper |
| description | *(not set)* |
| default_branch | main |
| language | Python |
| license | *unverified — see access note* |
| has_issues | true |
| has_projects | true |
| open_issues_count | 1 |
| pushed_at | 2026-04-25T12:44:50Z |
| size_kb | 43 |

### Top-Level Tree

*Unable to retrieve.* The MCP GitHub server for this session is scoped exclusively to
`subagentapps/subagent-organizations`; `contents/` API calls targeting
`subagentapps/anthropic-docs-scraper` were denied. No `gh` CLI or valid GitHub PAT
was available in the environment.

### README (first paragraph)

*Unable to retrieve — same access restriction as above.*

### WAF Presence Checklist

> **Note:** WAF items could not be verified directly due to the access restriction described above.
> All four items are marked **unverified**. Issues have been opened for the three highest-priority items.

| WAF Item | Status |
|---|---|
| `.github/CODEOWNERS` | ⚠️ unverified |
| `.github/dependabot.yml` | ⚠️ unverified |
| `.github/workflows/` | ⚠️ unverified |
| `LICENSE` | ⚠️ unverified |

### Survey Notes

- **Access restriction (logged gap):** The session MCP token is scoped to
  `subagentapps/subagent-organizations` only. Requests for `contents/`, `git/trees/`, and
  commit history on `anthropic-docs-scraper` were all denied. Repository metadata was
  obtained via `search_repositories` (cross-repo search API), which remains accessible.
- `gh` CLI is not installed; no valid GitHub PAT with cross-repo read scope was available.
- A full WAF audit requires either a session token scoped to
  `subagentapps/anthropic-docs-scraper` or `gh auth` with appropriate credentials.
- Routine ID: `routine/survey-anthropic-docs-scraper-2026-04-26`
