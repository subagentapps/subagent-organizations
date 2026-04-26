# Cowork plugin connectors — `productivity` and `product-management`

Date: 2026-04-26 (PST 2026-04-25 evening)
Source: `vendor/anthropic/knowledge-work-plugins/{productivity,product-management}/CONNECTORS.md` (read-only submodule, pinned SHA)
Companion to: [`./knowledge-work-plugins-cli-survey.md`](./knowledge-work-plugins-cli-survey.md)

## Why this matters for our polyrepo

The user's /loop directive: *"a human must connect the specific cowork plugin connectors with enums of options to enable the skills to work with the integrated system."* This file documents what those enums are — the human-in-the-loop choice surface that the upstream Cowork plugins expose, which our `*-cli` parallel must either replicate or declare an alternative for.

## How Cowork connectors work (verbatim, both plugins)

Plugin files use **`~~category`** as a placeholder for whatever tool the user connects in that category. For example, `~~project tracker` might mean Asana, Linear, Jira, or any other project tracker with an MCP server.

Plugins are **tool-agnostic** — they describe workflows in terms of categories (chat, project tracker, knowledge base, etc.) rather than specific products. The `.mcp.json` pre-configures specific MCP servers, but **any MCP server in that category works.**

This is the contract: skill files reference `~~category`, and the user resolves each category to a concrete product at install time via Cowork's connector UI.

## `productivity` plugin connector enums (6 categories)

| Category | Placeholder | Default servers (preconfigured) | Other supported |
|---|---|---|---|
| Chat | `~~chat` | Slack | Microsoft Teams, Discord |
| Email | `~~email` | Microsoft 365 | — |
| Calendar | `~~calendar` | Microsoft 365 | — |
| Knowledge base | `~~knowledge base` | Notion | Confluence, Guru, Coda |
| Project tracker | `~~project tracker` | Asana, Linear, Atlassian (Jira/Confluence), monday.com, ClickUp | Shortcut, Basecamp, Wrike |
| Office suite | `~~office suite` | Microsoft 365 | — |

**Total enum surface:** 6 categories × ~3 product options each = ~18 distinct user choices for a fully-connected install.

## `product-management` plugin connector enums (10 categories)

| Category | Placeholder | Default servers (preconfigured) | Other supported |
|---|---|---|---|
| Calendar | `~~calendar` | Google Calendar | Microsoft 365 |
| Chat | `~~chat` | Slack | Microsoft Teams |
| Competitive intelligence | `~~competitive intelligence` | Similarweb | Crayon, Klue |
| Design | `~~design` | Figma | Sketch, Adobe XD |
| Email | `~~email` | Gmail | Microsoft 365 |
| Knowledge base | `~~knowledge base` | Notion | Confluence, Guru, Coda |
| Meeting transcription | `~~meeting transcription` | Fireflies | Gong, Dovetail, Otter.ai |
| Product analytics | `~~product analytics` | Amplitude, Pendo | Mixpanel, Heap, FullStory |
| Project tracker | `~~project tracker` | Linear, Asana, monday.com, ClickUp, Atlassian (Jira/Confluence) | Shortcut, Basecamp |
| User feedback | `~~user feedback` | Intercom | Productboard, Canny, UserVoice |

**Total enum surface:** 10 categories × ~3-5 product options each = ~35 distinct user choices.

## Categories shared between both plugins

These appear in both `productivity` and `product-management`:

- **Chat** (`~~chat`)
- **Calendar** (`~~calendar`)
- **Email** (`~~email`)
- **Knowledge base** (`~~knowledge base`)
- **Project tracker** (`~~project tracker`)

That's 5 of 6 productivity categories overlapping with product-management. The non-overlap from productivity: `~~office suite`. Product-management adds 5 PM-specific categories.

## Skill inventory (what these connectors plug into)

### `productivity/skills/`

- `memory-management` — two-tier memory (CLAUDE.md + memory/)
- `task-management` — markdown TASKS.md
- `start` — `/start` command (init tasks + memory + dashboard)
- `update` — `/update` and `/update --comprehensive` commands
- `dashboard.html` — local HTML board (the live-artifact reference impl)

### `product-management/skills/`

- `competitive-brief` — `/competitive-brief`
- `metrics-review` — `/metrics-review`
- `product-brainstorming` — `/brainstorm`
- `roadmap-update` — `/roadmap-update`
- `sprint-planning` — (commands not directly listed in README)
- `stakeholder-update` — `/stakeholder-update`
- `synthesize-research` — `/synthesize-research`
- `write-spec` — `/write-spec`

### `product-management/commands/`

- `brainstorm.md` — only top-level command file (others live inside skills)

## How this maps to our `*-cli` parallel

The `subagentapps/knowledge-work-plugins-cli` README declares the parity intent:

> *"Plugins are tool-agnostic — they describe workflows in terms of categories ... rather than specific products."*

But the CLI parallel collapses the connector surface in one specific way: **GitHub Projects is the source of truth.** That collapses `~~project tracker` to a single concrete product (GitHub) instead of leaving it as a user-choice enum. From the CLI repo's CLAUDE.md (verbatim):

> *"GitHub Projects is the source of truth — no local TASKS.md or dashboards."*

So the CLI's connector contract diverges as follows:

| Cowork category | Cowork resolution | CLI resolution |
|---|---|---|
| `~~project tracker` | user-chosen MCP server (Linear, Asana, etc.) | **fixed: GitHub Projects** |
| `~~office suite` | Microsoft 365 | (n/a — terminal-first, no office suite) |
| `~~knowledge base` | user-chosen (Notion etc.) | **likely: repo Markdown + memory/** (TBD per Wave 0) |
| `~~chat` | user-chosen | **likely: GitHub Issues + comments** (TBD) |
| `~~email`, `~~calendar` | user-chosen | (n/a — out of scope for terminal CLI) |
| `~~design` | Figma | (n/a — terminal CLI) |
| `~~product analytics` | Amplitude, Pendo, Mixpanel | (TBD — likely deferred to a separate plugin) |
| `~~competitive intelligence` | Similarweb, Crayon, Klue | (TBD) |
| `~~user feedback` | Intercom, Productboard, etc. | (TBD — possibly via GitHub Issues in a different label namespace) |
| `~~meeting transcription` | Fireflies, Gong, etc. | (n/a — terminal CLI) |

This is a **deliberate scope reduction** from Cowork's 16 distinct connector categories down to ~3 (project tracker, knowledge base, chat) all resolved to GitHub primitives. That tradeoff:

- **Pro:** zero connector setup; works out-of-the-box for any user with a GitHub account
- **Pro:** GitHub becomes the single audit-quality source of state (matches our SHA-pinning + audit-log posture)
- **Con:** loses the rich PM-tool integrations (Figma, Amplitude, Linear, etc.) — those workflows would need a separate plugin
- **Con:** assumes user is OK with public-or-private GitHub repos as their PM substrate

## Implications for our parity test stubs (Phase B)

When we write `tests/cli/productivity-cli.test.ts` and `tests/cli/product-management-cli.test.ts`, the test cases must:

1. **Assert the CLI's reduced connector surface** — i.e. tests should pin that `~~project tracker` resolves to GitHub Projects only, not check for Linear/Asana/etc.
2. **Assert that skills not requiring out-of-scope connectors still work** — e.g. `task-management` needs only `~~project tracker`, so it should fully port. Skills like `roadmap-update` that need Figma + Amplitude won't fully port and should fail loudly with an "out-of-scope connector" error.
3. **Treat Wave 0 plugins as scaffolds.** Don't write tests for skill content that doesn't exist yet; write contract-shape tests only.

## Connector enum schema (proposed for our SDK)

When `subagentmcp-sdk` ships its `Connector` primitive, the enum shape we should encode (from this analysis):

```typescript
type CoworkConnectorCategory =
  | 'chat'
  | 'email'
  | 'calendar'
  | 'knowledge_base'
  | 'project_tracker'
  | 'office_suite'              // productivity only
  | 'competitive_intelligence'  // PM only
  | 'design'                    // PM only
  | 'meeting_transcription'     // PM only
  | 'product_analytics'         // PM only
  | 'user_feedback';            // PM only

type CliConnectorResolution =
  | { category: 'project_tracker'; resolved: 'github_projects' }
  | { category: 'knowledge_base'; resolved: 'github_markdown' | 'memory_dir' }
  | { category: 'chat'; resolved: 'github_issues_comments' }
  | { category: CoworkConnectorCategory; resolved: 'out_of_scope' };
```

This encodes both the upstream Cowork enum and our deliberate CLI reduction.

## Open questions

- Does `productivity-cli`'s `task-management` skill still write a `TASKS.md` file or only GitHub Issues? (CLAUDE.md says *no local TASKS.md*, but the `productivity-cli/.claude-plugin/plugin.json` description says *"tasks come from assigned Issues in the kwpc project"*. Need to verify against the actual skill content when Wave 0 ships.)
- Where does `dashboard.html` go in the CLI? Cowork has it as a local HTML file; CLI README says *no dashboard.html — GitHub Projects is the dashboard*. Confirmed: it's deleted in the CLI parallel.
- How does the kwpc-schema package encode this connector reduction? `packages/schema` not yet surveyed.

## Sources

- `vendor/anthropic/knowledge-work-plugins/productivity/CONNECTORS.md` (19 lines, verbatim)
- `vendor/anthropic/knowledge-work-plugins/product-management/CONNECTORS.md` (23 lines, verbatim)
- `vendor/anthropic/knowledge-work-plugins/{productivity,product-management}/README.md` (skill + command tables)
- `subagentapps/knowledge-work-plugins-cli/CLAUDE.md` (already surveyed in companion file)
