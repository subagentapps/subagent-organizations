# Wave-2 connector spec contracts (summary)

> Status: load-bearing as of 2026-04-27
> Strategy: [`./kwpc-cli-migration-strategy.md`](./kwpc-cli-migration-strategy.md)
> Pattern: [`../plugin-migration-pattern.md`](../plugin-migration-pattern.md)

---

## What's in this doc

Wave-2 (6 plugins, all "ships partial") merged to kwpc-cli in iter 5.
Per-plugin spec contracts could each be their own file (mirroring the
Wave-1 model), but Wave-2's pattern is consistent enough that one summary
suffices: every plugin ships skills verbatim with documented degradation
in CONNECTORS.md when commercial connectors aren't available.

If a Wave-2 plugin grows enough complexity to warrant its own file, split
it out at that point.

---

## Per-plugin summary

| Plugin | Skills | Ship clean | Divergent | `.mcp.json` | kwpc-cli PR |
|---|---|---|---|---|---|
| customer-support-cli | 5 | 3 | 2 (customer-research, kb-article) | 1 (github) | #13 |
| enterprise-search-cli | 5 | 3 | 1 reframed (search), 1 divergent (source-management) | 1 (github) | #14 |
| finance-cli | 8 | 0 | 8 (all ERP/analytics-blocked) | 0 | #15 |
| human-resources-cli | 9 | 6 | 3 (comp-analysis, people-report, recruiting-pipeline) | 0 | #16 |
| legal-cli | 9 | 8 | 1 (signature-request) | 1 (github) | #17 |
| operations-cli | 9 | 8 | 1 (vendor-review) | 1 (github) | #18 |

**Totals: 45 Wave-2 skills shipped. 28 ship clean, 16 divergent, 1 reframed.**

---

## Divergence drivers (heuristic table)

The divergence rate maps cleanly to category type:

| Category | Drives divergence in | Why |
|---|---|---|
| `~~CRM` | customer-research | HubSpot / Salesforce paid-OAuth, no community MCP |
| `~~support platform` | kb-article | Intercom / Zendesk paid-OAuth |
| `~~ATS` | recruiting-pipeline | Greenhouse / Lever / Ashby paid-OAuth |
| `~~HRIS` | people-report | Workday / BambooHR / Rippling paid-OAuth |
| `~~compensation data` | comp-analysis | Pave / Radford paid-OAuth |
| `~~ERP` | finance × 8 | NetSuite / SAP / QuickBooks no community MCPs |
| `~~analytics` (BI) | finance × 8 (overlap) | Tableau / Looker / Power BI no community MCPs |
| `~~CLM` | (legal-cli has none from this) | Already documented as divergent in matrix |
| `~~e-signature` | signature-request | DocuSign / Adobe Sign paid-OAuth |
| `~~ITSM` | (operations-cli has none from this) | ServiceNow / Zendesk Service paid-OAuth |
| `~~procurement` | vendor-review | Coupa / SAP Ariba / Zip paid-OAuth |

**Finance-cli is the matrix's worst case** — every skill ERP-coupled. All 8 marked divergent. Future ERP MCP availability would unlock this whole plugin.

---

## What `divergent` means in the kwpc-cli context

A skill marked `divergent` ships its SKILL.md verbatim. The user can
still invoke it, and it will:

1. Try to use the connector (if `~~category` resolves to a server in `.mcp.json`)
2. Fall back to manual paste-input flow when the connector isn't connected
3. Annotate the output with `[OUT_OF_SCOPE_CONNECTOR: <category>]` when it had to skip a connector-dependent step

The user gets useful output in either case. The "divergence" is in the
data fidelity, not in skill availability.

---

## Wave-2 ships count

| Total Wave-2 skills | Ship clean | Divergent | Reframed |
|---|---|---|---|
| 45 | 28 (62%) | 16 (36%) | 1 (2%) |

**62% clean-ship rate** for Wave-2. Combined with Wave-1's 100% rate:

| Wave | Plugins | Skills | Clean-ship % |
|---|---|---|---|
| Wave 1 | 6 | 40 | 92.5% (37/40 — engineering's debug + incident-response degrade gracefully but ship) |
| Wave 2 | 6 | 45 | 62% (28/45) |
| **Combined** | **12** | **85** | **76%** (65/85) |

---

## What ships next (iter 6)

Wave 3 (scaffold-only defer): marketing-cli, sales-cli, bio-research-cli.
These ship as scaffolds with deferral notes (per strategy §3 Wave 3 row).
Skill bodies copied verbatim but CONNECTORS.md flags every skill as
divergent until users with the relevant commercial OAuth tokens drive
demand.

Wave 4 (partner-built): slack-cli candidate; defer apollo, brand-voice,
common-room, zoom-plugin.

---

## Provenance

- 6 kwpc-cli implementation PRs: #13, #14, #15, #16, #17, #18 (all merged 2026-04-27)
- Pattern: [`../plugin-migration-pattern.md`](../plugin-migration-pattern.md)
- Strategy: [`./kwpc-cli-migration-strategy.md`](./kwpc-cli-migration-strategy.md)
- Authored by Claude (Opus 4.7) under `.claude/prompts/opus-orchestrator.md`
