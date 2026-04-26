# Connector availability matrix — every plugin × every category

> Status: load-bearing as of 2026-04-26
> Sources: `vendor/anthropic/knowledge-work-plugins/<plugin>/CONNECTORS.md` for all 14 migratable plugins
> Pattern: [`./engineering-cli-connectors.md`](./engineering-cli-connectors.md), [`./product-management-cli-connectors.md`](./product-management-cli-connectors.md)
> User directive (2026-04-26): *"the migration requires an assessment of each department knowledge-work-plugin like 'legal' or 'data' and for each category, which do we have available, which are you blocked on, and which can we find an alternative."*

---

## 1. The standing strategic calls

These propagate to **every** plugin's connector decisions:

| Standing call | Source |
|---|---|
| **No Notion. We build and maintain our own KB on disk.** | User 2026-04-26 |
| **No Jira / Linear / Asana / Atlassian / monday / ClickUp. GitHub Projects v2 + Issues + PRs are version-controlled and sufficient.** | User 2026-04-26 |
| **No paid OAuth-gated services.** Stay inside Max plan. | `docs/spec/brand/voice.md` §6 |
| **No Slack as default.** Optional opt-in via existing `mcp__plugin_slack_slack__*` tools. Default chat = `gh pr/issue comment`. | `engineering-cli-connectors.md` §2.1 |
| **`@modelcontextprotocol/*` self-hosted servers** are optional accelerators, not load-bearing substitutes. | `product-management-cli-connectors.md` §2 |

---

## 2. Standard verdict legend

| Verdict | What it means | When applied |
|---|---|---|
| **A — Available** | We have a working solution today. Either an MCP server in this Claude Code session, an installed CLI (`gh`, `curl`), or a substitution that's already shipping. |
| **B — Blocked, alternative documented** | The Cowork default is paid / OAuth-gated, but a deliberate substitute (gh-native, on-disk, manual paste) covers the workflow with documented degradation. |
| **C — Blocked, no good alternative** | Neither the Cowork MCP nor a substitute is reachable today. Skill workflows degrade to "user describes manually" or are deferred entirely. |
| **D — Drop entirely** | The category isn't applicable to a CLI/headless context. (Calendar, Email, Office Suite mostly fall here.) |
| **E — Optional self-host** | A `@modelcontextprotocol/*` server can be self-hosted to provide partial coverage; not required for v0.1.0. |

---

## 3. Master matrix — 14 plugins × the categories they use

### 3.0 The category universe (across all 14 plugins)

29 distinct `~~category` placeholders across the 14 migratable plugins:

`~~chat` · `~~email` · `~~calendar` · `~~knowledge base` · `~~project tracker` ·
`~~office suite` · `~~source control` · `~~cloud storage` · `~~CRM` ·
`~~design` (a.k.a. `~~design tool`) · `~~user feedback` · `~~product analytics` ·
`~~monitoring` · `~~incident management` · `~~CI/CD` · `~~competitive intelligence` ·
`~~meeting transcription` (a.k.a. `~~conversation intelligence`) ·
`~~marketing automation` · `~~SEO` · `~~email marketing` · `~~marketing analytics` ·
`~~ATS` · `~~HRIS` · `~~compensation data` · `~~CLM` · `~~e-signature` ·
`~~ITSM` · `~~procurement` · `~~support platform` ·
plus bio-research's 9 specialty categories
(`~~literature`, `~~scientific illustration`, `~~clinical trials`,
`~~chemical database`, `~~drug targets`, `~~data repository`,
`~~journal access`, `~~AI research`, `~~lab platform`) ·
plus data's `~~data warehouse` and `~~notebook` ·
plus sales's `~~data enrichment` and `~~sales engagement`.

### 3.1 The category × verdict cheat sheet (apply this to every plugin)

This table is the **operational answer** to the user's question. For each category,
across all plugins that use it, what's available / blocked / alternative:

| Category | Verdict | What we have | What we're blocked on | Alternative |
|---|---|---|---|---|
| `~~chat` | **B** | `gh pr comment` / `gh issue comment` (always available) | Slack OAuth (Cowork-only callback port 3118) | gh-native by default; Slack opt-in via existing `mcp__plugin_slack_slack__*` after user OAuth |
| `~~email` | **D** | — | Gmail / MS365 (no headless OAuth path) | Drop; PM/legal artifacts go to GitHub Issues with topical labels |
| `~~calendar` | **D** | — | Google Calendar / MS365 (empty URLs even upstream) | Drop; user supplies dates manually |
| `~~knowledge base` | **A** | `rg` over `docs/`; the contextual-retrieval pipeline (chunker→embedder→retriever in `feat/kb-*`, all merged) | — | **We don't need Notion. The KB is on disk and version-controlled.** |
| `~~project tracker` | **A** | `gh project item-list/edit`, GraphQL Projects v2 API (Project #2 already wired), `gh issue list/create` | — | **We don't need Jira/Linear/Asana/Atlassian/monday/ClickUp. GitHub Projects v2 + Issues + PRs.** Templates like the kanban board already shipped. |
| `~~source control` | **A** | GitHub MCP (`https://api.github.com/mcp`) + `gh` CLI | — | Both available; gh CLI preferred for token-efficiency |
| `~~CI/CD` | **A** | `gh run list/view/watch` + `Monitor` tool | — | GitHub Actions native; no other CI in play |
| `~~office suite` | **D** | — | MS365 (no headless path) | Drop; markdown in repo replaces docs/sheets/slides |
| `~~cloud storage` | **B** | `gh release upload`, repo files, `git lfs` for binaries | Box, Egnyte, Dropbox, SharePoint (paid OAuth) | gh-native; legal artifacts live in `legal-cli/cases/<case>/` directories |
| `~~design` | **A** | Figma MCP (`https://mcp.figma.com/mcp`) — opt-in via user OAuth | — | Keep as opt-in; fallback to URL paste + WebFetch preview |
| `~~CRM` | **C** | — | HubSpot, Salesforce, Close, Pipedrive (all paid OAuth) | **Defer.** No good headless alternative. Skill bodies in `customer-support` and `sales` degrade to "paste customer record" |
| `~~user feedback` | **A** | GitHub Issues with `user-feedback` label (queryable via `gh issue list --label user-feedback`) | Intercom, Productboard, Canny, UserVoice (paid OAuth) | Substitute → GitHub Issues. Version-controlled feedback queue |
| `~~product analytics` | **B/E** | (none directly); optional self-host `@modelcontextprotocol/server-cohort-heatmap` | Amplitude, Pendo, Mixpanel, Heap (paid OAuth) | Drop default; manual KPI paste; self-host server-cohort-heatmap for retention viz |
| `~~monitoring` | **C** | — | Datadog, New Relic, Grafana, Splunk (paid OAuth) | **Defer.** No live production system in this polyrepo yet (issue #10 deploys the first one). Manual symptom description |
| `~~incident management` | **B** | GitHub Issues with `incident` label (the timeline) | PagerDuty, Opsgenie, Incident.io, FireHydrant (paid OAuth) | Substitute → GitHub Issue thread. `engineering-cli-incident-postmortem.md` already specced |
| `~~competitive intelligence` | **C** | `WebFetch` + manual URL list | Similarweb, Crayon, Klue (paid OAuth) | **Mark divergent.** Already in cli-parity-tracker.md as `OUT_OF_SCOPE_CONNECTOR` |
| `~~meeting transcription` / `~~conversation intelligence` | **B/E** | Manual transcript paste; optional self-host `@modelcontextprotocol/server-transcript` | Fireflies, Gong, Chorus, Otter.ai, Granola (paid OAuth) | Drop default; paste manually; self-host server-transcript for users wanting headless option |
| `~~marketing automation` | **C** | — | HubSpot, Marketo, Pardot, Mailchimp (paid OAuth) | **Defer.** No marketing surface in this polyrepo |
| `~~SEO` | **C** | — | Ahrefs, Similarweb, Semrush, Moz (paid OAuth) | **Defer.** Same reason |
| `~~email marketing` | **C** | — | Klaviyo, Mailchimp, Brevo, Customer.io (paid OAuth) | **Defer.** Same reason |
| `~~marketing analytics` | **C** | — | Supermetrics, Google Analytics (Google Analytics requires paid + OAuth) | **Defer.** Same reason |
| `~~ATS` | **C** | — | Greenhouse, Lever, Ashby, Workable (paid OAuth) | **Defer.** No HR surface |
| `~~HRIS` | **C** | — | Workday, BambooHR, Rippling, Gusto (paid OAuth) | **Defer.** Same |
| `~~compensation data` | **C** | — | Pave, Radford, Levels.fyi (paid OAuth or manual) | **Defer.** Same |
| `~~CLM` | **C** | — | Ironclad, Agiloft (paid OAuth) | **Defer.** No legal contract repository |
| `~~e-signature` | **C** | — | DocuSign, Adobe Sign (paid OAuth) | **Defer.** Same |
| `~~ITSM` | **C** | — | ServiceNow, Zendesk, Freshservice (paid OAuth) | **Defer.** No ops surface |
| `~~procurement` | **C** | — | Coupa, SAP Ariba, Zip (paid OAuth) | **Defer.** Same |
| `~~support platform` | **C** | — | Intercom, Zendesk, Freshdesk, HubSpot Service Hub (paid OAuth) | **Defer.** Same |
| `~~data warehouse` | **B** | BigQuery MCP (`https://bigquery.googleapis.com/mcp` — Google Cloud auth) + DuckDB / SQLite locally | Snowflake, Databricks (empty URLs upstream — paid + custom MCP not yet shipped) | Keep BigQuery as opt-in; default to local DuckDB / SQLite for data-cli skills |
| `~~notebook` | **B** | Jupyter local (always available); `Hex` MCP if user OAuths | Hex requires OAuth | Local Jupyter / `bun` scripts as default; Hex as opt-in |
| `~~data enrichment` | **C** | — | Clay, ZoomInfo, Apollo, Clearbit, Lusha (paid OAuth) | **Defer.** No sales surface |
| `~~sales engagement` | **C** | — | Outreach, Salesloft, Apollo (paid OAuth) | **Defer.** Same |
| **bio-research specialty categories** (`~~literature`, `~~clinical trials`, `~~chemical database`, `~~drug targets`, `~~data repository`, `~~journal access`, `~~AI research`, `~~lab platform`, `~~scientific illustration`) | **C** | None today | Most have public-API options but none have shipped MCP servers; some are paid (Wiley, Elsevier, Owkin, Benchling) | **Defer plugin entirely** for v0.1.0. Bio-research is a vertical we don't run; revisit if a user surfaces. |

### 3.2 Per-plugin verdict roll-up

For each plugin, what's available / blocked / alternative — answers the user's
question directly.

| Plugin | Skills | Categories | Coverage | Verdict |
|---|---|---|---|---|
| **productivity-cli** | 4 (start, update, task-management, memory-management) | 6: chat, email, calendar, KB, project tracker, office suite | 2 substitutes (chat, KB, project tracker), 3 drops (email, calendar, office suite) | ✅ **Ships.** All 4 skills work via gh + on-disk KB. |
| **product-management-cli** | 8 | 10: see `product-management-cli-connectors.md` | 4 substitutes, 4 drops, 2 divergent (competitive-brief, metrics-review) | ✅ **Ships.** 6 skills end-to-end; 2 marked divergent (already tracked). |
| **engineering-cli** | 10 | 7: see `engineering-cli-connectors.md` | 1 keep + 4 substitutes + 2 drops | ✅ **Ships.** 8 skills end-to-end; 2 (debug, incident-response) graceful degradation. |
| **data-cli** | 10 | 4: data warehouse, notebook, product analytics, project tracker | BigQuery (opt-in) + DuckDB local + GitHub Projects | ✅ **Ships v0.1.0** with DuckDB/local default; warehouse skills opt-in via user OAuth. |
| **design-cli** | 7 | 6: chat, design tool, KB, project tracker, user feedback, product analytics | Figma keep (opt-in) + GitHub substitutes for chat/KB/tracker/feedback; product analytics drop | ✅ **Ships.** Strong fit; design-tool MCP works headless once user OAuths Figma. |
| **customer-support-cli** | 5 | 7: chat, email, cloud storage, support platform, CRM, KB, project tracker | Substitutes work for chat, KB, tracker, cloud storage; **CRM and support platform are blocked** (C — paid OAuth, no good alternative) | ⚠️ **Ships partial.** Skills heavily depending on CRM (e.g., `customer-research`) degrade to manual paste. |
| **enterprise-search-cli** | 5 | 7: chat, email, cloud storage, KB, project tracker, CRM, office suite | KB and project tracker substitute well; cloud storage substitutes via repo files; **CRM and office suite blocked** | ⚠️ **Ships limited.** The plugin's value-prop ("search across email, chat, docs, wikis") is partially undercut without email and office suite — but `rg` over `docs/` covers internal-repo search well. Reframe as "search across this polyrepo and connected MCPs." |
| **bio-research-cli** | 6 | 9 specialty categories | Most blocked (paid journals, custom lab platforms) | ❌ **Defer.** Out of scope for v0.1.0 — no user surface in this polyrepo. |
| **finance-cli** | 8 | 6: data warehouse, email, office suite, chat, ERP, analytics/BI | Email, office suite drop. Data warehouse opt-in BigQuery. **ERP and analytics/BI explicitly noted "no supported MCP servers yet" even upstream** | ⚠️ **Ships limited.** Finance-specific skills (audit-support, sox-testing, journal-entry) need ERP integration → degrade to manual entry. Could ship as opt-in CSV-input tooling. |
| **human-resources-cli** | 9 | 7: ATS, calendar, chat, email, HRIS, KB, compensation data | All HR-specific connectors blocked (ATS, HRIS, comp data — paid OAuth) | ⚠️ **Ships limited.** Generic skills (interview-prep, draft-offer, onboarding) work end-to-end via paste-input. Pipeline-tracking skills degrade. |
| **legal-cli** | 9 | 9: calendar, chat, cloud storage, CLM, CRM, email, e-signature, office suite, project tracker | CLM, CRM, e-signature blocked. Cloud storage substitutes via repo files | ⚠️ **Ships limited.** Document-review skills (review-contract, triage-nda, brief) work via paste-input. Workflow skills (signature-request) degrade. |
| **marketing-cli** | 8 | 8: chat, design, marketing automation, product analytics, KB, SEO, email marketing, marketing analytics | All marketing-specific connectors blocked (5 of 8) | ❌ **Defer or ships severely limited.** Design + KB + chat work; the marketing-specific 5 categories are all paid-OAuth gates. Most marketing skills lose their primary data source. |
| **operations-cli** | 9 | 8: calendar, chat, email, ITSM, KB, project tracker, procurement, office suite | ITSM and procurement blocked. KB + project tracker substitute | ⚠️ **Ships limited.** Process / workflow skills (process-doc, runbook, change-request) work via on-disk markdown. Vendor/procurement skills degrade. |
| **sales-cli** | 9 | 10: calendar, chat, competitive intel, CRM, data enrichment, email, KB, conversation intelligence, project tracker, sales engagement | Most sales-specific connectors blocked (CRM, data enrichment, conversation intel, sales engagement) | ❌ **Defer or ships severely limited.** Sales is connector-heavy; the data sources are mostly paid-OAuth. |

---

## 4. The actual sequencing recommendation (revised)

Given the matrix, the **clean Wave 1** (ships v0.1.0) is **5 plugins**, not 10:

1. **productivity-cli** (4 skills, all ship)
2. **product-management-cli** (6/8 skills ship, 2 divergent)
3. **engineering-cli** (8/10 skills ship, 2 graceful-degrade)
4. **data-cli** (10 skills ship with DuckDB local + BigQuery opt-in)
5. **design-cli** (7 skills ship; Figma MCP works headless once user OAuths)

**Wave 2 (limited scope, ships partial)**: customer-support-cli, enterprise-search-cli,
finance-cli, human-resources-cli, legal-cli, operations-cli — each ships with
some skills degraded to manual-paste input. Document the limitation upfront.

**Wave 3 (defer)**: bio-research-cli, marketing-cli, sales-cli — connector
density too high relative to value-add of the headless versions. Revisit when
a user actually wants them.

**Out of scope for migration entirely**: pdf-viewer (already works as-is via
the upstream MCP server; just point to it), partner-built/* (5 partner
plugins).

This is a **cleaner answer to the original "all except partner-led" goal**:
- 5 ships clean (Wave 1) — full functionality
- 6 ships partial (Wave 2) — documented degradation
- 3 defer (Wave 3) — connector-bound
- 1 reuse (pdf-viewer) — point at upstream

= **11 of 14 plugins delivered in some form**, 3 deferred with reason. That's
the realistic shape.

---

## 5. The user's question, answered category-by-category

> *"For each category, which do we have available, which are you blocked on,
> which can we find an alternative."*

Section 3.1 IS the answer. Summarizing the verdict-class distribution:

- **A — Available today**: 6 categories (chat-via-gh, KB, project tracker, source control, CI/CD, design-via-Figma-opt-in)
- **B — Blocked, alternative documented**: 6 categories (cloud storage, incident mgmt, product analytics, meeting transcription, data warehouse, notebook)
- **C — Blocked, no good alternative**: 13 categories (mostly the role-specific paid-OAuth tools — CRM, ATS, HRIS, ITSM, monitoring, e-signature, etc.)
- **D — Drop entirely**: 3 categories (email, calendar, office suite)
- **E — Optional self-host MCP**: subset of B (server-cohort-heatmap, server-transcript)

**6 of 28 categories work cleanly today.** Another **6** have documented
substitutes. **3** are dropped as not-applicable. **13** are blocked behind
paid OAuth and don't have good alternatives — those are the categories that
gate Wave 2/3 plugins.

---

## 6. Implication for the brand

The brand voice doc (`docs/spec/brand/voice.md` §6 cost-discipline rule) made
the **brand promise**: *"premium quality, honest cost."*

This matrix is the **operational proof**. We don't say "we support every
category"; we say "for the 12 categories that have honest CLI paths, we
deliver clean. For the 13 that don't, we'd rather mark divergent than fake
a connection."

That's the brand positioning — **honest about the cost, honest about the
coverage**. Cowork users can have all 28; the kwpc-cli user gets the 12 we
can deliver without paying for OAuth subscriptions, and a clear list of
what's deferred.

---

## 7. Provenance

- 14 upstream `CONNECTORS.md` files in `vendor/anthropic/knowledge-work-plugins/<plugin>/` (vendored, MIT)
- npm registry `https://registry.npmjs.com/-/v1/search?text=maintainer:pcarleton` — 39 `@modelcontextprotocol/*` packages enumerated 2026-04-26
- User strategic calls (2026-04-26): no Notion, no Jira/Linear/etc., GitHub Projects + Issues + PRs as the substrate
- Authored by Claude (Opus 4.7) under `.claude/prompts/opus-orchestrator.md`
- Pattern source: `engineering-cli-connectors.md`, `product-management-cli-connectors.md`
