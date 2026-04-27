# product-management-cli connectors — Keep / Drop / Substitute decisions

> Status: load-bearing as of 2026-04-26
> Source: `vendor/anthropic/knowledge-work-plugins/product-management/{CONNECTORS.md, .mcp.json, README.md}`
> Implementation target: `subagentapps/knowledge-work-plugins-cli/product-management-cli/`
> Sibling: [`./engineering-cli-connectors.md`](./engineering-cli-connectors.md) (worked example)
> Pattern: [`../plugin-migration-pattern.md`](../plugin-migration-pattern.md)

---

## 1. The user's directive (2026-04-26)

> *"For instance for product-management, instead of jira/atlassian/linear/notion,
> we can use github projects and assign tasks there and use github issues
> and prs to complete tasks version controlled. We can reference the 40+
> modelcontextprotocol servers available https://www.npmjs.com/~pcarleton."*

This is the load-bearing instruction for product-management-cli's connector
strategy. **GitHub Projects + Issues + PRs replace the entire commercial-tracker
+ commercial-KB stack.** Version control is the value-add of doing product
management on a polyrepo.

---

## 2. The npm-published `@modelcontextprotocol/*` reality (verbatim from `npm view`)

Pulled from `https://registry.npmjs.com/-/v1/search?text=maintainer:pcarleton`:

39 packages, divided as:

### Framework SDKs (6 packages — for **building** MCP servers, not consuming them)

`@modelcontextprotocol/sdk`, `@modelcontextprotocol/server`, `@modelcontextprotocol/client`,
`@modelcontextprotocol/node`, `@modelcontextprotocol/conformance`,
`@modelcontextprotocol/inspector` (+ `inspector-client`, `inspector-server`,
`inspector-cli`).

### MCP Apps SDK (1 package — for the new interactive UI feature)

`@modelcontextprotocol/ext-apps` — *"Enable MCP servers to display interactive
user interfaces"*. This is the path for our live-artifact dashboard if we want
to render PM artifacts (roadmaps, retros, PRD diffs) inside Claude Code itself.

### Reference / example servers (3 packages)

`@modelcontextprotocol/server-filesystem`, `@modelcontextprotocol/server-memory`,
`@modelcontextprotocol/server-pdf`, `@modelcontextprotocol/server-everything`,
`@modelcontextprotocol/server-sequential-thinking`, `@modelcontextprotocol/server-debug`.

### MCP Apps demo servers (~20 packages — example UIs, not productivity tools)

`server-map`, `server-video-resource`, `server-wiki-explorer`, `server-cohort-heatmap`,
`server-system-monitor`, `server-transcript`, `server-shadertoy`,
`server-scenario-modeler`, `server-customer-segmentation`, `server-budget-allocator`,
`server-sheet-music`, `server-threejs`, `server-basic-{preact,react,vanillajs,vue,svelte,solid}`.

### Web framework adapters (3 packages)

`@modelcontextprotocol/express`, `@modelcontextprotocol/hono`,
`@modelcontextprotocol/fastify`.

### Honest signal

**None of the 39 packages substitute for Jira / Linear / Atlassian / Notion
directly.** They're framework-level (build your own MCP server) plus
example/demo servers for the new MCP Apps interactive UI feature.

The substitution path remains: **GitHub Projects v2 + GitHub Issues + GitHub PRs**,
called via `gh` CLI and the `@modelcontextprotocol/sdk`-built GitHub MCP server
(`https://api.github.com/mcp`, already in our `.mcp.json` for engineering-cli).

The pcarleton packages are **optional accelerators** for two specific PM workflows:
1. **`server-cohort-heatmap`** for `metrics-review` skill output (retention viz)
2. **`server-scenario-modeler`** for `product-brainstorming` skill (financial scenarios)
3. **`ext-apps`** as the SDK we'd use if we wanted to ship a custom MCP App for
   roadmap rendering inside Claude Code (post-M3 stretch).

These are noted in §4 per-skill where relevant. They are not load-bearing for
the v0.1.0 ship.

---

## 3. Decision matrix per category

10 categories × verdict, applying the heuristic table from
`engineering-cli-connectors.md` §6.

### 3.1 `~~calendar`  → **Drop** (no v0.1.0 use case)

| | |
|---|---|
| Verdict | **Drop** |
| Cowork default | Google Calendar (URL empty even upstream) / Microsoft 365 |
| Why drop | Empty URLs upstream — these were placeholders for native Cowork integrations, not real MCP servers. PM workflows in CLI don't currently need calendar context (no automated meeting scheduling in v0.1.0). |
| CLI substitute | None. Skill bodies referencing `~~calendar` (e.g., `stakeholder-update` for "next milestone date") fall back to user-supplied dates. |
| Future path | If we add a `caldav` MCP server later, the placeholder picks it up. No skill changes needed. |

### 3.2 `~~chat`  → **Substitute** → `gh pr comment` / `gh issue comment`

Same verdict as `engineering-cli-connectors.md` §2.1. Threaded discussion
lives in GitHub. Optional: enable Slack MCP if user OAuths. PM-specific
note: stakeholder-update outputs become **a GitHub Issue body** in a
designated `stakeholder-updates` label, not a Slack post. Version-controlled,
searchable, and links cleanly back to the PRs / Issues that drove the
update.

### 3.3 `~~competitive intelligence`  → **Drop** (paid OAuth; degrade to manual URL list)

| | |
|---|---|
| Verdict | **Drop** with `OUT_OF_SCOPE_CONNECTOR` declaration |
| Cowork default | Similarweb (`https://mcp.similarweb.com/mcp`) |
| Why drop | Similarweb / Crayon / Klue all require paid accounts + OAuth. The polyrepo budget envelope (Max plan) doesn't support those subscriptions. Already marked **divergent** in `cli-parity-tracker.md`. |
| CLI substitute | Manual URL list — user provides competitor homepage URLs; skill uses `WebFetch` (or `subagent-html` once shipped) to read public-facing pages. |
| Per-skill impact | `competitive-brief` skill body explicitly handles the "no SimilarWeb available" branch — outputs a structured brief from public web data only, with a `Confidence: low (no traffic data)` note. |
| Future path | If user adds Similarweb later, the placeholder picks it up automatically. |

### 3.4 `~~design`  → **Keep** (Figma MCP works) + Substitute fallback

| | |
|---|---|
| Verdict | **Keep with `mcp__figma__*` opt-in** |
| Cowork default | Figma (`https://mcp.figma.com/mcp`) |
| Why keep | Figma's MCP server is publicly available; `mcp__figma__*` tools are already auth-stubbed in this Claude Code session. PM workflows that link to design (e.g., `write-spec` referencing mockups) work when user has connected Figma. |
| CLI substitute when no Figma | Skill bodies fall back to "describe the design or paste a Figma URL"; `WebFetch` against the Figma URL returns a public preview if the file is shared. |
| Implementation | Keep `figma` entry in `.mcp.json` but mark as opt-in in CONNECTORS.md. |

### 3.5 `~~email`  → **Drop** (no v0.1.0 use case)

Same rationale as `~~calendar`. Empty URL upstream. PM workflows don't email
in v0.1.0 — `stakeholder-update` writes to a GitHub Issue, not an inbox.

### 3.6 `~~knowledge base`  → **Substitute** → `rg` over `docs/`

Same verdict as `engineering-cli-connectors.md` §2.4. The KB is on disk
(`docs/spec/`, `docs/research/`, `installs/`). PRs **become** the KB —
spec PRs are the canonical "decision history."

**PM-specific divergence:** `synthesize-research` upstream pulls from
Notion's "research repository." In CLI, the substitute is
`docs/research/<topic>.md` files committed via `feat(research):` PRs.
Same artifact, version-controlled.

### 3.7 `~~meeting transcription`  → **Drop** (paid OAuth; manual paste)

| | |
|---|---|
| Verdict | **Drop** |
| Cowork default | Fireflies (`https://api.fireflies.ai/mcp`); other options Gong, Dovetail, Otter.ai |
| Why drop | All require paid accounts + OAuth. |
| CLI substitute | Manual paste — user pastes meeting notes / transcripts directly into the skill invocation. |
| Per-skill impact | `synthesize-research` accepts pasted text; no upstream-tool dependency. |
| Future path | The pcarleton **`@modelcontextprotocol/server-transcript`** is "MCP App Server for live speech transcription" — could be self-hosted as a CLI-local alternative for users who want a headless option. Stretch, post-M3. |

### 3.8 `~~product analytics`  → **Drop** (paid OAuth; degrade)

| | |
|---|---|
| Verdict | **Drop** with `OUT_OF_SCOPE_CONNECTOR` |
| Cowork default | Amplitude (`https://mcp.amplitude.com/mcp`), Pendo (`https://app.pendo.io/mcp/v0/shttp`) |
| Why drop | Both paid, both OAuth. Already marked **divergent** in `cli-parity-tracker.md`. |
| CLI substitute | (a) repo-local SQLite for users tracking their own metrics; (b) external API token (Amplitude REST API) for users with their own keys; (c) the pcarleton **`@modelcontextprotocol/server-cohort-heatmap`** as a self-hosted alternative for retention visualization. |
| Per-skill impact | `metrics-review` skill explicitly outputs "no analytics connected — paste KPI numbers to compare" branch. |

### 3.9 `~~project tracker`  → **Substitute** → **GitHub Projects v2** (the user's directive)

| | |
|---|---|
| Verdict | **Substitute — GitHub Projects v2 only** |
| Cowork defaults | Linear, Asana, monday.com, ClickUp, Atlassian (Jira/Confluence) — five commercial trackers |
| Why drop all five | The user's explicit instruction: *"instead of jira/atlassian/linear/notion, we can use github projects and assign tasks there and use github issues and prs to complete tasks version controlled."* This is the **defining brand difference** between Cowork PM and CLI PM — the CLI's PM workflows are the same artifacts engineering already version-controls. |
| CLI substitute | **`gh project item-list`, `gh issue list`, `gh issue create`, `gh pr list`, `gh pr create`** — and the GraphQL Projects v2 API (already partially wired; Project #2 "Polyrepo Wave 0 — subagentapps" exists with the schema in `docs/spec/projects-schema.md`). |
| Per-skill impact | Each PM skill that referenced `~~project tracker` gets a one-paragraph translation block in its CLI spec: |

| PM skill | Upstream behavior | CLI behavior |
|---|---|---|
| `write-spec` | Pulls related Linear/Jira tickets | Pulls related GitHub Issues via `gh issue list --label feature` |
| `roadmap-update` | Edits Linear/Asana boards | Updates GitHub Project's `Status` and `Priority` fields via GraphQL |
| `sprint-planning` | Reads sprint columns from project tracker | Reads `gh project item-list <n>` filtered by current iteration |
| `stakeholder-update` | Aggregates ticket movement across trackers | Aggregates closed Issues + merged PRs in the time window via `gh search` |

| | |
|---|---|
| Implementation | Drop `linear`, `asana`, `monday`, `clickup`, `atlassian` from `.mcp.json`. The remaining `github` entry covers it. |

### 3.10 `~~user feedback`  → **Drop** (paid OAuth; substitute = GitHub Issue label)

| | |
|---|---|
| Verdict | **Drop** with substitute |
| Cowork default | Intercom (`https://mcp.intercom.com/mcp`); other options Productboard, Canny, UserVoice |
| Why drop | All paid, all OAuth. |
| CLI substitute | **GitHub Issues with `user-feedback` label.** External feedback gets filed as an Issue (manually or via a webhook), and skills consume it via `gh issue list --label user-feedback`. Version-controlled, queryable, links to commits that addressed it. |
| Per-skill impact | `synthesize-research` and `write-spec` both ingest from `gh issue list --label user-feedback`. |

---

## 4. Final `product-management-cli/.mcp.json`

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.github.com/mcp"
    },
    "figma": {
      "type": "http",
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

**Two servers.** Down from 16 upstream.

The `figma` entry is opt-in — it's only useful when the user has authed with
Figma. Skills handle the unconnected case gracefully.

---

## 5. Per-skill impact summary (8 upstream skills)

| Upstream skill | Categories used | product-management-cli impact |
|---|---|---|
| `competitive-brief` | `~~competitive intelligence` | Drop → degrade to manual URL list. Already marked divergent in cli-parity-tracker.md. |
| `metrics-review` | `~~product analytics` | Drop → degrade to manual KPI input or self-hosted server-cohort-heatmap. Already marked divergent. |
| `product-brainstorming` | (none) | Pure copy-paste. No connector dependency. |
| `roadmap-update` | `~~project tracker`, `~~knowledge base` | Substitute both → GitHub Projects + `rg`. Strong fit; this is what the kwpc-cli was built for. |
| `sprint-planning` | `~~project tracker` | Substitute → GitHub Project iteration field. Already an open spec contract in cli-parity-tracker.md. |
| `stakeholder-update` | `~~project tracker`, `~~chat` | Substitute → GitHub Project query + GitHub Issue thread (`stakeholder-update` label). |
| `synthesize-research` | `~~knowledge base`, `~~meeting transcription`, `~~user feedback` | Substitute → `rg` + manual paste + `gh issue list --label user-feedback`. |
| `write-spec` | `~~project tracker`, `~~knowledge base`, `~~design` | Substitute → GitHub Issues + `rg` + Figma (opt-in). Spec output IS the PR. |

**6 of 8 skills work end-to-end with substitutions; 2 (competitive-brief,
metrics-review) ship as `divergent` with documented degradation.** This
matches the existing `cli-parity-tracker.md` row for those two skills.

---

## 6. The CONNECTORS.md to ship in `product-management-cli/`

```markdown
# Connectors — product-management-cli

CLI parallel of `anthropics/knowledge-work-plugins/product-management`.
**Defining difference**: PM artifacts are GitHub-native and version-controlled.

## How tool references work

Plugin files use `~~category` as a placeholder. Each category here resolves
either to an MCP server in `.mcp.json` or to a substitute below.

## Connector decisions

| Category | Decision | What it means |
|---|---|---|
| `~~calendar` | Drop | User supplies dates manually. |
| `~~chat` | Substitute → GitHub Issue / PR comments | Threaded, version-controlled, searchable. |
| `~~competitive intelligence` | Drop (`OUT_OF_SCOPE_CONNECTOR`) | Manual URL list; public web data only. |
| `~~design` | Keep (Figma, opt-in) | Falls back to URL preview when not connected. |
| `~~email` | Drop | Stakeholder updates write to GitHub Issues, not email. |
| `~~knowledge base` | Substitute → `rg` over `docs/` | Spec PRs become the KB. |
| `~~meeting transcription` | Drop | Paste transcripts manually. |
| `~~product analytics` | Drop (`OUT_OF_SCOPE_CONNECTOR`) | Paste KPIs manually; or self-host server-cohort-heatmap. |
| `~~project tracker` | **Substitute → GitHub Projects v2** | The defining choice. Issues + PRs + Projects = the tracker. |
| `~~user feedback` | Substitute → GitHub Issues `user-feedback` label | Version-controlled feedback queue. |

## Optional self-hosted MCP servers

For users who want richer output without paid OAuth:

| Skill | Optional server | npm package | Use |
|---|---|---|---|
| `metrics-review` | server-cohort-heatmap | `@modelcontextprotocol/server-cohort-heatmap` | Retention heatmap visualization |
| `product-brainstorming` | server-scenario-modeler | `@modelcontextprotocol/server-scenario-modeler` | Financial scenario modeling |

These are MCP App servers — they render interactive UIs inside Claude Code.
Self-hosted, no OAuth, no subscription.

## Skills that work fully headless (no connectors needed)

`product-brainstorming`, `roadmap-update`, `sprint-planning`, `stakeholder-update`,
`synthesize-research`, `write-spec` — all 6 work end-to-end with the GitHub
substitutions.

## Skills that ship as divergent

`competitive-brief`, `metrics-review` — graceful degradation; manual input or
optional self-hosted server.
```

---

## 7. Mapping to the engineering pattern

| Heuristic from `engineering-cli-connectors.md` §6 | Applied to product-management |
|---|---|
| Chat → `gh pr/issue comment` | ✅ Direct apply |
| Source control → Keep | (Not a category here — PM doesn't directly ship code) |
| Project tracker → GitHub Projects v2 | ✅ Direct apply (the user-mandated rule) |
| Knowledge base → `rg` over `docs/` | ✅ Direct apply |
| Monitoring / incident mgmt → Drop | (Not categories here) |
| CI/CD → `gh run` | (Not a category here) |
| Email / Calendar → Drop | ✅ Direct apply |
| Design (Figma) → Keep if MCP available | ✅ Direct apply |
| Product analytics → Drop (paid OAuth) | ✅ Direct apply |
| Data warehouse → Keep BigQuery | (Not a category here — that's data-cli) |

**8 of 10 categories applied a default heuristic with no per-plugin reasoning
required.** The remaining 2 (`~~competitive intelligence`, `~~user feedback`)
got new defaults that should propagate to other plugins:

- **Paid intelligence services (competitive intel, market research) → Drop with manual URL list**
- **User-feedback channels (Intercom, Productboard, Canny, UserVoice) → Substitute → GitHub Issues with `user-feedback` label**

These additions are now part of the heuristics for future plugins
(`customer-support`, `marketing`, `sales` will all hit similar categories).

---

## 8. Open questions for the user

1. **`stakeholder-update` output destination.** Recommendation: **a GitHub Issue
   body** in a designated `stakeholder-update` label, with audience (exec /
   eng / customer) as a sub-label (`stakeholder-update:exec` etc.). Confirm?
2. **`user-feedback` label workflow.** Should we ship a GitHub Action that
   auto-applies the `user-feedback` label on Issues containing certain keywords?
   Or stay manual? Recommendation: stay manual for v0.1.0; revisit when feedback
   volume justifies automation.
3. **Self-hosted MCP servers (`server-cohort-heatmap`, `server-scenario-modeler`).**
   Ship as optional in CONNECTORS.md (recommended) or omit entirely until users ask?

---

## 9. Provenance

- Upstream: `anthropics/knowledge-work-plugins/product-management/` (vendored)
- pcarleton npm reality: `https://registry.npmjs.com/-/v1/search?text=maintainer:pcarleton` (39 packages, captured 2026-04-26)
- Pattern source: `docs/spec/cli-skills/engineering-cli-connectors.md`
- Brand grounding: `docs/spec/brand/voice.md` §6 + the user's 2026-04-26 directive on GitHub-native PM
- Authored by: Claude (Opus 4.7) under `.claude/prompts/opus-orchestrator.md`
