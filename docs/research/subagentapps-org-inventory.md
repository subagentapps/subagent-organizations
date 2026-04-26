# subagentapps Org Inventory

This file tracks periodic surveys of repositories in the `subagentapps` GitHub organisation.
Each survey section is appended by automated routines.

---

## subagent-xml — survey 2026-04-26 05:00Z

### Access Status

> **BLOCKER — survey incomplete.** The GitHub MCP session for this run is scoped
> exclusively to `subagentapps/subagent-organizations`. Calls to
> `subagentapps/subagent-xml` were denied at the server level ("repository not
> configured for this session"). Unauthenticated `api.github.com` requests also
> returned HTTP 403 (repository is private or rate-limited).
>
> The steps attempted (and blocked):
> - `GET /repos/subagentapps/subagent-xml` — metadata fetch
> - `GET /repos/subagentapps/subagent-xml/contents` — top-level tree
> - `GET /repos/subagentapps/subagent-xml/contents/README.md` — README preview
> - WAF file existence checks (CODEOWNERS, dependabot.yml, workflows/, LICENSE)

### Metadata Table

| Field | Value |
|---|---|
| name | subagent-xml |
| description | *not retrieved* |
| default_branch | *not retrieved* |
| primary language | *not retrieved* |
| license | *not retrieved* |
| has_issues | *not retrieved* |
| has_projects | *not retrieved* |
| open_issues_count | *not retrieved* |
| pushed_at | *not retrieved* |
| size_kb | *not retrieved* |

### Top-Level Tree

*Not retrieved — access denied.*

### README (first paragraph)

*Not retrieved — access denied.*

### WAF Presence Checklist

| Item | Present? |
|---|---|
| `.github/CODEOWNERS` | unknown |
| `.github/dependabot.yml` | unknown |
| `.github/workflows/` | unknown |
| `LICENSE` | unknown |

### Required Follow-up

To complete this survey, the routine must be re-run with an MCP session that
includes `subagentapps/subagent-xml` in its allowed-repository list. WAF gap
issues **cannot be opened** until actual file presence is verified — speculative
issues were intentionally suppressed per the capping rule (≤3 issues).

Reference: `docs/research/github-well-architected-deep-dive.md`
