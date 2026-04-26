# Knowledge-base parity research

Date: 2026-04-26 · Branch: `feat/kb-parity-and-loop-plan`
Goal (per user): *"research these 4 applications by finding the developer documentation and their 4 MCPs and how to reach parity to them as a 'knowledge base'"*

The 4 KB products to parity-match:
1. **Notion**
2. **Confluence**
3. **Guru**
4. **Coda**

The 4 Anthropic surfaces to catalog:
1. `claude.com/connectors`
2. `claude.com/plugins`
3. `claude.com/customers`
4. The new Cowork "Live artifacts" surface (verified via screenshot at `updates/cowork/2026-04-25-cowork-live-artifacts-dispatch.png`)

## Pinning the example sources (per repo discipline)

We bias all examples + patterns to **actual Anthropic / MCP / safety-research engineers**.
Top repos surveyed via GraphQL on 2026-04-26 (cheapest fetch per our tool-precedence):

### Anthropic top repos by stars (60 total in org)

| Repo | Stars | Why relevant to this research |
|---|---|---|
| `anthropics/skills` | 123,846 | Public Agent Skills repo — the canonical example pattern for a skill-based KB integration |
| `anthropics/claude-code` | 117,903 | Source repo for our daily driver |
| `anthropics/claude-cookbooks` | 41,550 | Working notebook examples — gold for cookbook-pattern documentation |
| `anthropics/prompt-eng-interactive-tutorial` | 34,996 | The canonical prompting tutorial — primary source |
| `anthropics/courses` | 20,862 | Educational courses — structure model |
| **`anthropics/claude-plugins-official`** | **17,840** | **Official plugin marketplace — directly maps onto `claude.com/plugins`** |
| `anthropics/claude-quickstarts` | 16,304 | Deployable starter projects |
| **`anthropics/knowledge-work-plugins`** | **11,549** | **"Open source repository of plugins primarily intended for knowledge workers to use in Claude Cowork" — DIRECTLY relevant to KB-parity goal** |
| `anthropics/financial-services-plugins` | 7,767 | Industry-vertical plugin pattern |
| `anthropics/claude-code-action` | 7,280 | GitHub Action — release pipeline pattern reference |

### MCP top repos by stars (40 total in org)

| Repo | Stars | Why relevant |
|---|---|---|
| `modelcontextprotocol/servers` | 84,528 | Reference MCP servers — our connector parity baseline |
| `modelcontextprotocol/python-sdk` | 22,771 | Python SDK |
| `modelcontextprotocol/typescript-sdk` | 12,282 | TypeScript SDK (already vendored) |
| `modelcontextprotocol/inspector` | 9,559 | Visual testing for MCP servers |
| `modelcontextprotocol/modelcontextprotocol` | 7,929 | Spec + docs |
| **`modelcontextprotocol/registry`** | **6,732** | **Community registry — our directory parity baseline** |
| `modelcontextprotocol/go-sdk` | 4,431 | Go SDK |
| `modelcontextprotocol/csharp-sdk` | 4,217 | C# SDK |
| `modelcontextprotocol/java-sdk` | 3,381 | Java SDK |
| `modelcontextprotocol/rust-sdk` | 3,338 | Rust SDK |

### safety-research top repos by stars (37 total in org)

| Repo | Stars | Why relevant |
|---|---|---|
| `safety-research/bloom` | 1,298 | Behavior eval — pattern for KB content evaluation |
| `safety-research/persona_vectors` | 406 | Activation-space monitoring — relevant for prompt-adapter telemetry |
| `safety-research/SCONE-bench` | 177 | Benchmark structure |
| `safety-research/automated-w2s-research` | 171 | Automated research pipeline |
| `safety-research/assistant-axis` | 132 | Assistant-axis monitoring — relevant for orchestrator drift detection |
| `safety-research/safety-tooling` | 115 | Inference API for many LLMs + research tooling |
| `safety-research/open-source-alignment-faking` | 56 | Alignment-faking replication |

## The 4 KB products

### 1. Notion

| Aspect | What we know | Source |
|---|---|---|
| Product type | All-in-one workspace; pages, databases, wiki | notion.com |
| MCP server | Likely third-party at `modelcontextprotocol/servers` | TBD: verify in registry |
| Developer docs | `developers.notion.com` (REST API + JS SDK + integrations) | TBD: confirm URL |
| Auth model | OAuth 2.0 (workspace-scoped) + integration tokens | docs |
| Distinct primitives | Blocks, databases, properties, relations, rollups | docs |
| Knowledge-base shape | Block-tree pages with database tables | docs |
| Anthropic-equivalent | Cowork projects + Claude `Memory` | screenshot |

**Parity question for our polyrepo**: can `subagentmcp-sdk` create a `notion-creator/` that emits Notion pages from Claude Code subagent outputs?

### 2. Confluence (Atlassian)

| Aspect | What we know | Source |
|---|---|---|
| Product type | Wiki + team collaboration; spaces, pages, hierarchies | atlassian.com |
| MCP server | `modelcontextprotocol/servers` likely has one | TBD: verify |
| Developer docs | `developer.atlassian.com/cloud/confluence/` | TBD: confirm URL |
| Auth model | Atlassian OAuth 2.0 + API tokens | docs |
| Distinct primitives | Spaces, pages, comments, labels, blueprints, macros | docs |
| Knowledge-base shape | Space-scoped tree of pages with rich text + macros | docs |
| Anthropic-equivalent | Claude Cowork "spaces" (if any), Live artifacts | screenshot |

### 3. Guru

| Aspect | What we know | Source |
|---|---|---|
| Product type | Knowledge cards + verification + AI search | getguru.com |
| MCP server | TBD — likely third-party | check registry |
| Developer docs | `developer.getguru.com` | TBD: confirm |
| Auth model | OAuth 2.0 + API tokens | docs |
| Distinct primitives | Cards (atomic knowledge units), Collections, Boards, Verification status, Tags | docs |
| Knowledge-base shape | Atomic verifiable cards with expiration + verification cycles | docs |
| Anthropic-equivalent | Claude Code rules/ + skills/ + agent-memory/ | claude-directory.md |

The **verification cycle** is Guru's distinct value-add. Its analog in our world: SHA-pinned refs + `kb-keeper` drift detection.

### 4. Coda

| Aspect | What we know | Source |
|---|---|---|
| Product type | Docs as software; tables + buttons + automations | coda.io |
| MCP server | TBD | check registry |
| Developer docs | `coda.io/developers` | TBD: confirm |
| Auth model | OAuth 2.0 + API tokens | docs |
| Distinct primitives | Tables, formulas, buttons, automations, packs | docs |
| Knowledge-base shape | Document-as-app with embedded data tables | docs |
| Anthropic-equivalent | Claude Cowork artifacts + Live artifacts | screenshot |

Coda's **Packs** (3rd-party plugin SDK) is the closest analog to `claude.com/plugins`.

## The 4 Anthropic surfaces

### `claude.com/connectors`

What it is (per glossary in `platform.claude.com/docs/en/about-claude/glossary.md`):
> *"The MCP connector is a feature that allows API users to connect to MCP servers
> directly from the Messages API without building an MCP client. This enables seamless
> integration with MCP-compatible tools and services through the Claude API. The MCP
> connector supports features like tool calling and is available in beta."*

**Catalog approach**: cross-reference `modelcontextprotocol/registry` with claude.com's
public connector list. Goal: enumerate every connector + its source repo + auth model.

### `claude.com/plugins`

Ground truth: **`anthropics/claude-plugins-official`** (17.8k★) is the marketplace repo
backing this. Contents are the canonical plugin set.

**Catalog approach**: clone or vendor `claude-plugins-official`, parse `marketplace.json`,
emit a typed plugin index. The shape mirrors what `subagentmcp-sdk/refs/` does for docs.

### `claude.com/customers`

This is a **marketing surface** — case studies / logos / testimonials. Not a developer
surface, but useful for **whose KB integrations are public**. Cross-reference with
`anthropics/financial-services-plugins` and similar industry-vertical plugin repos to
identify production deployments.

### Cowork Live Artifacts (new, verified via screenshot)

Per the 2026-04-25 screenshot (`updates/cowork/2026-04-25-cowork-live-artifacts-dispatch.png`):

The Cowork project sidebar now shows:
- **Cowork** (top tab, active)
- **+ New task** (⌘N)
- **Projects**
- **Scheduled**
- **Live artifacts** ← NEW
- **Dispatch** (Beta)
- **Customize**

Plus new **Pinned** + **Recents** + **Memory** + **Projects from Chat** sections.

**Live artifacts** is plausibly the surface where Cowork persists generated artifacts
(documents, dashboards, code). This maps closely onto:
- Notion → blocks/databases
- Confluence → pages
- Guru → cards
- Coda → tables/buttons

Worth deeper investigation — what's the artifact format? File-system-backed? Server-backed?
Does it have a public API yet?

## Parity matrix (the deliverable)

| Capability | Notion | Confluence | Guru | Coda | Cowork (today) | Cowork + parity additions |
|---|---|---|---|---|---|---|
| Block-tree documents | ✓ | ✓ | partial | ✓ | partial (artifacts) | adds: structured page hierarchy |
| Atomic-card verification | — | — | ✓ | — | — | adds: SHA-pinned card model |
| Live tables / databases | ✓ | partial | — | ✓ | — | adds: table primitive |
| Embedded automations | partial | partial | — | ✓ | partial (Dispatch) | enhance: Dispatch → broader automation primitive |
| 3rd-party plugin marketplace | partial | ✓ (apps) | — | ✓ (Packs) | ✓ (claude.com/plugins) | enhance: scope expansion |
| MCP-first integration | — | partial | — | partial | ✓ | leads: this is the differentiator |
| Knowledge-graph relations | ✓ | partial | partial | ✓ | TBD | TBD |
| AI authoring | partial | partial | ✓ | ✓ | ✓ | leads: native Claude integration |

**The differentiator**: Cowork is **MCP-first** by design. Notion/Confluence/Guru/Coda
are all bolting MCP onto existing products. Our parity goal isn't to *replace* them —
it's to make Cowork the natural choice when MCP-native KB workflows matter.

## Concrete deliverables (next 5 PRs)

| # | PR title | Scope | Branch suggestion |
|---|---|---|---|
| 1 | `feat(kb): catalog claude-plugins-official marketplace` | Vendor + parse `anthropics/claude-plugins-official`; emit typed index | `feat/kb-plugin-catalog` |
| 2 | `feat(kb): catalog modelcontextprotocol/registry servers` | Same shape for the MCP server registry | `feat/kb-mcp-registry` |
| 3 | `feat(kb): catalog claude-customers public references` | Cross-reference financial-services-plugins + knowledge-work-plugins for production case studies | `feat/kb-customer-catalog` |
| 4 | `docs(research): notion + confluence + guru + coda dev-docs survey` | Read each product's developer docs (token-efficient via `subagent-md`); produce per-product capability + auth + primitive catalog | `feat/kb-product-survey` |
| 5 | `feat(kb): live-artifacts deep-dive` | Investigate Cowork's Live artifacts when public docs land; for now, document the screenshot evidence + speculate about format | `feat/kb-live-artifacts` |

Each fits cleanly in one /loop iteration (10–20 min of research + commit).

## Sources verified during this commit (for kb-keeper to pin)

| URL | Format | SHA-pin status |
|---|---|---|
| `github.com/anthropics` (org) | GraphQL | TBD by kb-keeper |
| `github.com/modelcontextprotocol` (org) | GraphQL | TBD |
| `github.com/safety-research` (org) | GraphQL | TBD |
| `anthropics/claude-plugins-official` repo | GraphQL | not yet pinned |
| `anthropics/knowledge-work-plugins` repo | GraphQL | not yet pinned |
| `modelcontextprotocol/registry` repo | GraphQL | not yet pinned |
| `modelcontextprotocol/servers` repo | GraphQL | not yet pinned |

## Out of scope (intentionally)

- Building a Notion / Confluence / Guru / Coda **clone** — we're cataloging, not
  reimplementing
- Implementing every MCP connector — the registry exists; we reference it
- Designing Cowork's Live artifacts API — Anthropic owns that

## Anti-patterns to avoid (per WAF anti-patterns + this session's experience)

- Don't `WebFetch` the marketing pages and dump 30k tokens of slider/draggable JS
- Don't paraphrase developer docs from memory — use `doc-scout` for verbatim quotes
- Don't pin to `main` for any of the example repos — pin to a tag or SHA
- Don't fork the example repos into our org — vendor as submodules if needed (already
  done for the SDK + spec repos)

## Sources

- Top repo lists pulled via GraphQL: `gh api graphql` with org-scoped queries
- Cowork screenshot: `updates/cowork/2026-04-25-cowork-live-artifacts-dispatch.png`
- Glossary: `platform.claude.com/docs/en/about-claude/glossary.md` (SHA `1405208f57672548`)
- KB polyrepo source catalog: [`../spec/subagentmcp-sdk/knowledge-base/README.md`](../spec/subagentmcp-sdk/knowledge-base/README.md)
