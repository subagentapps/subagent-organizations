# Brief — knowledge-work-plugins-cli audit + sufficiency check (2026-04-26)

> Author: Claude Code (Opus 4.7), running under `opus-orchestrator.md` posture.
> Question asked: *Are productivity-cli + product-management-cli sufficient
> coverage to migrate **all** of `anthropics/knowledge-work-plugins` except
> partner-led, and how is `subagentapps/knowledge-work-plugins-cli` actually
> being used today (if at all)?*
> Verdict: **No — current coverage is ~24% of the migratable surface. The
> kwpc repo is anchored in our specs but has zero skill content shipped.
> The strategy needs to expand from 2 plugins to 9 to claim "all except
> partner-led."**

---

## 1. The three repos in play

| Repo | Owner | Created | Visibility | Role |
|---|---|---|---|---|
| `anthropics/knowledge-work-plugins` | Anthropic | (public) | public · 11.5k★ · pushed 2026-04-26 | **upstream** — Cowork plugin marketplace, 17 plugin dirs |
| `subagentapps/knowledge-work-plugins-cli` | subagentapps | 2026-04-26 | private | **canonical kwpc repo** — 5 plugin scaffolds (no skill bodies yet) |
| `agentknowledgeworkers/knowledge-work-plugins-cli` | agentknowledgeworkers | 2026-04-23 | private | **earlier sibling** — same shape, predates the canonical by 3 days. Likely the original starting point; `subagentapps/...` appears to be the production location |

> User correction received this firing: the canonical repo is
> `subagentapps/knowledge-work-plugins-cli`, **not**
> `agentknowledgeworkers/knowledge-work-plugins-cli`. Our local survey
> doc already correctly targets the subagentapps version, but a few
> 2026-04-25 references still point at agentknowledgeworkers as
> "Template source." That note remains accurate but should not drive
> ongoing work. Going forward, **subagentapps is the source of truth**.

---

## 2. Upstream `anthropics/knowledge-work-plugins` — full plugin inventory

Read verbatim from the upstream README + `partner-built/` directory listing
(2026-04-26).

### 2a. The 11 Anthropic-built plugins (the README's "open-sourcing 11" list)

| # | Plugin | Connectors enumerated in upstream README |
|---|---|---|
| 1 | **productivity** | Slack, Notion, Asana, Linear, Jira, Monday, ClickUp, Microsoft 365 |
| 2 | **sales** | Slack, HubSpot, Close, Clay, ZoomInfo, Notion, Jira, Fireflies, Microsoft 365 |
| 3 | **customer-support** | Slack, Intercom, HubSpot, Guru, Jira, Notion, Microsoft 365 |
| 4 | **product-management** | Slack, Linear, Asana, Monday, ClickUp, Jira, Notion, Figma, Amplitude, Pendo, Intercom, Fireflies |
| 5 | **marketing** | Slack, Canva, Figma, HubSpot, Amplitude, Notion, Ahrefs, SimilarWeb, Klaviyo |
| 6 | **legal** | Slack, Box, Egnyte, Jira, Microsoft 365 |
| 7 | **finance** | Snowflake, Databricks, BigQuery, Slack, Microsoft 365 |
| 8 | **data** | Snowflake, Databricks, BigQuery, Definite, Hex, Amplitude, Jira |
| 9 | **enterprise-search** | Slack, Notion, Guru, Jira, Asana, Microsoft 365 |
| 10 | **bio-research** | PubMed, BioRender, bioRxiv, ClinicalTrials.gov, ChEMBL, Synapse, Wiley, Owkin, Open Targets, Benchling |
| 11 | **cowork-plugin-management** | (none — meta-plugin for authoring) |

### 2b. Plus 6 plugins not enumerated as "the 11" but present as dirs

`design`, `engineering`, `human-resources`, `operations`, `pdf-viewer`, plus
`partner-built/` itself. (The README enumerates 11 but the repo ships 17
plugin dirs total.) `engineering` is the one we already started speccing
on our side.

### 2c. The 5 partner-led plugins (in `partner-built/`)

`apollo`, `brand-voice`, `common-room`, `slack`, `zoom-plugin` — these are
explicitly partner-built and **per user directive: out of scope**.

### 2d. Net migratable surface

**16 upstream plugins are migratable** (17 dirs minus the `partner-built/`
container). The user wants all of them ported except the 5 inside
`partner-built/` — so the migration target is **exactly 16 plugins**.

> Caveat: `cowork-plugin-management` and `pdf-viewer` are special cases.
> The kwpc repo already maps `cowork-plugin-management` → `platform-engineering`
> (correct). `pdf-viewer` is a UI extension — its CLI parallel is unclear
> and probably doesn't make sense in a terminal-first world. Treat it as
> deferred-with-rationale rather than scoped.

---

## 3. Our current kwpc coverage (the actual audit)

`subagentapps/knowledge-work-plugins-cli` ships 5 plugin scaffolds:

| kwpc plugin | Upstream equivalent | Skill content shipped? | Spec coverage in subagent-organizations |
|---|---|---|---|
| `productivity-cli` | `productivity` | **No** — manifest only | 2/4 skills specced (`start`, `update`); 2 tbd |
| `product-management-cli` | `product-management` | **No** — manifest only | 0/8 skills specced; 2 marked divergent |
| `data-cli` | `data` | **No** — manifest only | Tracked as "out of scope this wave" in cli-parity-tracker.md |
| `platform-engineering` | `cowork-plugin-management` | **No** — manifest only | Marked "not in scope" in cli-parity-tracker.md |
| `it-admin` | (new) | **No** — manifest only | Marked "new — Anthropic Admin API; not a port" in cli-parity-tracker.md |

**Skill bodies shipped: zero.** Every plugin is a manifest scaffold.

### 3a. How we're using the kwpc repo today

- **Specs reference it heavily.** 38 files in this repo (`subagent-organizations`)
  mention kwpc/cowork/knowledge-work-plugins. The strategy is anchored.
- **The strategy doc M1→M4 ladder treats kwpc-cli as the substrate** for
  M1 (productivity-cli), M2 (product-management-cli), M3 (engineering-cli).
- **No code in this repo (subagent-organizations) imports from kwpc.** The
  relationship is "specs in subagent-organizations describe the contracts
  that will be implemented in kwpc."
- **Cross-repo task issues are filed on kwpc** (e.g., `knowledge-work-plugins-cli#3`
  for productivity:task-management dual-write).

### 3b. The directional gap

The orchestration-strategy doc names a strict ladder: M1 = productivity-cli,
M2 = product-management-cli, M3 = engineering-cli, then M4 = second account.
**That ladder covers exactly 3 of the 16 migratable upstream plugins**
(plus platform-engineering and it-admin which are already scaffolded but
unspecced).

To claim "all except partner-led" we need to migrate **13 more upstream
plugins** beyond what M1-M3 covers:

```
sales, customer-support, marketing, legal, finance, enterprise-search,
bio-research, design, human-resources, operations, pdf-viewer*,
cowork-plugin-management** (already=platform-engineering), data
```

\*pdf-viewer probably defers (CLI-incompatible).
\*\*already scaffolded as `platform-engineering`, just unspecced.

---

## 4. Sufficiency verdict

**Insufficient as currently scoped.** The math:

- Migration target: 16 upstream plugins (excluding `partner-built/`)
- Currently scaffolded in kwpc: 5 (productivity, product-management,
  data, cowork-plugin-management→platform-engineering, plus the new it-admin)
  → 4 of those 5 map to upstream (it-admin is new)
- **Coverage by the M1→M3 ladder: 3 plugins (productivity, product-management,
  engineering) = 19% of the migratable surface.**
- **Coverage by all currently-scaffolded kwpc plugins: 4 plugins = 25%.**

**Either:**
1. **Scope down the goal.** "Migrate all except partner-led" → "Migrate
   the 5 already-scaffolded plus engineering = 6 plugins" (the realistic
   1-engineer path).
2. **Scope up the strategy.** Add M5-M11 to the milestone ladder, one
   per remaining upstream plugin, and accept that the strict-ladder
   discipline becomes a multi-quarter project.
3. **Hybrid (recommended).** Keep M1→M3 strict. Treat the remaining 10
   plugins as a **second wave** governed by a **batch-port routine**
   rather than per-plugin milestones. Most of them share the same
   structural template (manifest + skills/ + commands/ + connectors via
   .mcp.json). The work is mechanical once the first 2-3 are real.

---

## 5. The connector-migration problem

The user's framing — *"migrated some of the mcp alternatives where
connectors were needed"* — points at the central translation problem.
Cowork plugins use `~~category` placeholders backed by **specific commercial
MCP connectors** (Asana, Linear, Jira, Slack, etc.). The CLI parallel needs
either:

(a) the same MCP server (when it exists in `modelcontextprotocol/servers`
    or `claude.com/connectors`), or
(b) a **CLI-native alternative** (gh CLI for Jira→GitHub Issues mapping,
    direct API token for Linear, etc.), or
(c) an explicit `OUT_OF_SCOPE_CONNECTOR` declaration that degrades
    gracefully (the existing pattern in `competitive-brief` and
    `metrics-review` per `cli-parity-tracker.md`).

**Our local research already enumerates the connector surface**
(`docs/research/cowork-plugin-connectors.md`):

- productivity: 6 categories × ~3 products = **~18 user choices**
- product-management: 10 categories × ~3-5 products = **~35 user choices**
- Combined unique: roughly **~50 distinct connector entries** for just
  these two plugins.

Extrapolating to the 16-plugin migration target: **~200-400 connector
mappings** (with heavy reuse since chat=Slack and pm=Linear-ish appear
across most plugins). This is a real surface — the kwpc repo doesn't
have a connector-decision matrix yet.

**This is the missing artifact.** Recommended: a single
`docs/spec/connector-migration-matrix.md` enumerating
`(upstream-plugin, ~~category, default-server, cli-alternative,
verdict)` rows. With ~6-10 unique categories across all 16 plugins,
this is roughly a **60-160 row matrix** — large but tractable. It's
the unblocker for batch-porting plugins beyond M1-M3.

---

## 6. Context7 finding

`Context7` does not have an entry for `anthropics/knowledge-work-plugins`
itself — the user-prompt term doesn't resolve to a canonical library
in the index. Closest matches were unrelated (ElizaOS knowledge plugin,
Obsidian plugins, Figma plugins). For this work, **the upstream README
read directly via `gh api repos/anthropics/knowledge-work-plugins/contents/README.md`
is the authoritative source, not Context7.**

This is fine — our Tier-1 source hierarchy already treats GH repos as
primary. Logging it so the next firing doesn't waste a Context7 call.

---

## 7. Recommendations (in priority order)

1. **Update `docs/spec/orchestration-strategy.md`** to either restate
   the goal as "5-plugin scaffold completion + engineering-cli = 6 plugins"
   OR expand the ladder to acknowledge the 10-plugin second wave. **Today's
   ambiguity between "all non-partner-led" and the M1→M3 ladder is the
   root problem.**
2. **Create `docs/spec/connector-migration-matrix.md`.** Author one row
   per upstream `~~category` × upstream-plugin combo. Decide MCP-server
   vs CLI-alternative vs out-of-scope per row. This unblocks any batch
   port effort.
3. **Don't break M1's discipline.** M1 (productivity-cli) still ships
   first. Don't pivot into a 16-plugin sprint. The point of the audit
   is to size the work honestly, not abandon the ladder.
4. **Surface the agentknowledgeworkers vs subagentapps question** to
   the user explicitly: is the older repo dead and `subagentapps` the
   only one going forward? If so, archive `agentknowledgeworkers/...`
   to remove ambiguity.
5. **Update `cli-parity-tracker.md`** to make explicit which upstream
   plugins are *not yet scaffolded in kwpc* — currently the tracker
   only covers the 4 that are. Add 10 rows for the un-scaffolded plugins
   (status: `unscoped`) so the gap is visible at a glance.

---

## 8. The one-line summary

> **Our strategy ports 6 of 16 migratable upstream plugins. To claim
> "all except partner-led" we need to either rescope the goal or expand
> the ladder by 10 plugins — and in either case, build a connector
> migration matrix first.**

---

*Pinned by: `installs/briefs/2026-04-26-kwpc-audit.md`. This brief is
load-bearing for the next milestone-planning conversation.*
