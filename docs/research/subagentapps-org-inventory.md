# subagentapps Org Inventory

Automated repository surveys for the `subagentapps` GitHub organization.

---

## subagent-crawls — survey 2026-04-26 05:02Z

### Metadata

| Field | Value |
|---|---|
| name | subagent-crawls |
| description | *(not set)* |
| default_branch | main |
| primary_language | Python |
| license | *(not returned by search API — check manually)* |
| has_issues | true |
| has_projects | true |
| open_issues_count | 0 |
| pushed_at | 2026-04-25T12:26:13Z |
| size_kb | 2742 |
| visibility | private |

Source: `mcp__github__search_repositories` response (2026-04-26).

### Top-level Tree

> **Access limitation:** The MCP GitHub server is scoped to `subagentapps/subagent-organizations` only. Direct content reads against `subagentapps/subagent-crawls` were denied (`Access denied: repository not configured for this session`). GitHub code search returned 0 indexed results (private repo not yet indexed). Top-level tree could not be retrieved without expanding MCP scope.

### README — First Paragraph

> **Access limitation:** Same as above — README content could not be fetched. Expand MCP repo scope or run `gh api repos/subagentapps/subagent-crawls/contents/README.md --jq '.content' | base64 -d | head -100` to complete this section.

### WAF Presence Checklist

| Item | Status |
|---|---|
| `.github/CODEOWNERS` | ⚠ unverifiable (access denied) |
| `.github/dependabot.yml` | ⚠ unverifiable (access denied) |
| `.github/workflows/` directory | ⚠ unverifiable (access denied) |
| `LICENSE` | ⚠ unverifiable (access denied) |

**WAF gap issues:** Not opened. Per task spec, issues should only be filed for *confirmed* missing items. Since content reads are blocked, filing issues for unverified gaps would produce false positives. To complete WAF remediation:
1. Expand MCP server config to include `subagentapps/subagent-crawls`, re-run this routine.
2. Or manually verify the four items above and open issues with label `wave-1` + `enhancement`, body: `WAF gap in subagent-crawls: missing <item>. Reference: docs/research/github-well-architected-deep-dive.md`.

### Survey Notes

- Routine ID: `routine/survey-subagent-crawls-2026-04-26`
- Surveyed: 2026-04-26 05:02Z
- Surveyor: Claude Code (claude-sonnet-4-6)
- Blocker logged: MCP repo scope restricts cross-repo content reads. Metadata retrieved via `search_repositories`; tree/README/WAF items require scope expansion.
