# CLI parity contracts

Status: **draft** (Wave 0 — pre-implementation)
Companion to:
- [`../research/cowork-plugin-connectors.md`](../research/cowork-plugin-connectors.md) — connector enums
- [`../research/knowledge-work-plugins-cli-survey.md`](../research/knowledge-work-plugins-cli-survey.md) — CLI repo state
- [`../../tests/cli/productivity-cli.test.ts`](../../tests/cli/productivity-cli.test.ts) — test enforcement (Bun)
- [`../../tests/cli/product-management-cli.test.ts`](../../tests/cli/product-management-cli.test.ts) — test enforcement (Bun)

## Why this exists

This is the spec the parity tests assert against. Each section declares one
upstream Cowork skill's **contract** — the input/output shape that the CLI
parallel must honor — plus any deliberate **deviation** (e.g. terminal-first
output instead of HTML dashboard) and **out-of-scope** items (connectors the
CLI doesn't support).

Per CLAUDE.md convention #3 (spec-first): no `src/` code lands without a
matching spec. This file unblocks Wave 1+ implementation by pinning the
contracts before any implementation choices burn into the code.

## Reading this file

Each contract uses a fixed structure:

```
### `<skill-name>`

- Upstream source: vendor path + line citation
- CLI command: `/path:command [args]`
- Input contract: …
- Output contract: …
- Connector dependency: ~~category → CLI resolution
- Deviations from upstream: …
- Out-of-scope: …
- Test mapping: which describe() block in tests/cli/*.test.ts
```

When the same key appears upstream as `~~category`, we resolve it once here
and cross-reference rather than repeating.

---

## Connector resolution table (the Big-3 + the Out-of-scope-7)

| Upstream `~~category` | CLI resolution | Notes |
|---|---|---|
| `~~project tracker` | **GitHub Projects** | Fixed; never user-choice. Source of truth. |
| `~~knowledge base` | **Repo Markdown + memory/** | Fixed; the `memory/` dir is the deep cache. |
| `~~chat` | **GitHub Issue comments** | A pragmatic substitute; not a true chat. |
| `~~office suite` | (out of scope) | Productivity only; CLI is terminal-first. |
| `~~email` | (out of scope) | Both plugins; surfaced as `OUT_OF_SCOPE_CONNECTOR`. |
| `~~calendar` | (out of scope) | Both plugins. |
| `~~design` | (out of scope) | PM only (Figma etc.). |
| `~~product analytics` | (out of scope) | PM only (Amplitude etc.). |
| `~~competitive intelligence` | (out of scope) | PM only (Similarweb etc.). |
| `~~meeting transcription` | (out of scope) | PM only (Fireflies etc.). |
| `~~user feedback` | (out of scope) | PM only (Intercom etc.). |

Skills depending on out-of-scope connectors must surface a structured error
(`code: "OUT_OF_SCOPE_CONNECTOR"`, `message: "skill X requires Y; CLI
substrate is Z"`), not silently no-op or fabricate.

---

## Productivity contracts (4 skills)

### `start`

- Upstream source: `vendor/anthropic/knowledge-work-plugins/productivity/skills/start/SKILL.md`
- CLI command: `/productivity:start`
- Input contract: none (zero args)
- Output contract: ensures `TASKS.md`, `CLAUDE.md`, `memory/` exist; **does not** create or open `dashboard.html` (CLI deviation)
- Connector dependency: optional `~~project tracker` if user wants initial task pull
- Deviations from upstream:
  - Skips `dashboard.html` creation entirely — terminal-first, no HTML
  - On fresh install, the memory bootstrap interview happens in the terminal, not via dashboard prompts
- Out-of-scope: visual dashboard, browser open
- Test mapping: `productivity-cli :: /start`

### `update`

- Upstream source: `vendor/anthropic/knowledge-work-plugins/productivity/skills/update/SKILL.md`
- CLI command: `/productivity:update [--comprehensive]`
- Input contract: optional `--comprehensive` flag
- Output contract: `UpdateResult { mode, tasksSynced, staleTriaged, memoryProposals }` (see test file)
- Connector dependency:
  - default mode: `~~project tracker` (= GitHub Projects)
  - `--comprehensive`: also `~~chat`, `~~email`, `~~calendar`
- Deviations from upstream:
  - `--comprehensive` returns `OUT_OF_SCOPE_CONNECTOR` partial result for email/calendar pieces; only chat (= GitHub Issue comments) and project tracker run
  - Triage threshold: stale = no update for >14 days (matches upstream default)
- Out-of-scope: email scan, calendar scan
- Test mapping: `productivity-cli :: /update`

### `task-management`

- Upstream source: `vendor/anthropic/knowledge-work-plugins/productivity/skills/task-management/SKILL.md`
- CLI command: not user-invocable; called by other skills (`user-invocable: false` in upstream frontmatter)
- Input contract: programmatic — add/list/complete via library calls
- Output contract: `TaskShape { id, title, status, issueRef? }`
- Connector dependency: GitHub Projects (the kwpc-schema package maps `TASKS.md` rows ↔ Issues)
- Deviations from upstream:
  - Dual-write: every task add hits both `TASKS.md` AND `gh issue create`. The `issueRef` field is the bridge.
  - On GitHub API outage: degrade to `TASKS.md` only with `WARN` log; never hard-fail
  - `TASKS.md` schema must remain markdown-checkbox compatible (`- [ ]` / `- [x]`) so users can edit by hand
- Out-of-scope: `dashboard.html` drag-and-drop reordering (no HTML)
- Test mapping: `productivity-cli :: task-management`

### `memory-management`

- Upstream source: `vendor/anthropic/knowledge-work-plugins/productivity/skills/memory-management/SKILL.md`
- CLI command: not user-invocable
- Input contract: shorthand string ("ask todd to do PSR for oracle")
- Output contract: expanded full-name string + cited memory entries
- Connector dependency: none (filesystem-local)
- Deviations from upstream:
  - Two-tier identical: `CLAUDE.md` (hot cache, ~30 entries) + `memory/` (full)
  - Promotion rule: entry referenced 3+ times → moves from `CLAUDE.md` to `memory/people.md` (matches upstream)
  - Ambiguous shorthand → returns disambiguation prompt, never silent guess
- Out-of-scope: none (this skill needs no external connector)
- Test mapping: `productivity-cli :: memory-management`

---

## Product-management contracts (8 skills)

### `write-spec`

- Upstream source: `vendor/anthropic/knowledge-work-plugins/product-management/skills/write-spec/SKILL.md`
- CLI command: `/product-management:write-spec <feature or problem statement>`
- Input contract: free-text problem statement (required)
- Output contract: `PrdShape` written to a markdown file in repo, not stdout-only
- Connector dependency: `~~knowledge base` (= repo markdown) for storing the spec
- Deviations from upstream:
  - Output is persisted as a file (terminal-first ≠ ephemeral)
  - Vague input triggers clarifying question, not silent generation
- Out-of-scope: none beyond the connector reductions
- Test mapping: `product-management-cli :: /write-spec`

### `roadmap-update`

- Upstream source: `vendor/anthropic/knowledge-work-plugins/product-management/skills/roadmap-update/SKILL.md`
- CLI command: `/product-management:roadmap-update <update description>`
- Input contract: free-text update description
- Output contract: roadmap persisted as GitHub Project (custom field for format type)
- Connector dependency: `~~project tracker` (= GitHub Projects)
- Deviations from upstream:
  - All 3 `RoadmapFormat` values supported (`now-next-later`, `quarterly`, `okr-aligned`)
  - No local `roadmap.html` — GitHub Projects is the substrate
- Out-of-scope: visualization layer (the GitHub Projects board IS the visualization)
- Test mapping: `product-management-cli :: /roadmap-update`

### `stakeholder-update`

- Upstream source: `vendor/anthropic/knowledge-work-plugins/product-management/skills/stakeholder-update/SKILL.md`
- CLI command: `/product-management:stakeholder-update <update type and audience>`
- Input contract: type ∈ {weekly, monthly, launch, risk-escalation} + audience ∈ {executive, engineering, customer}
- Output contract: rendered text by audience (executive ≤200 words, engineering technical, customer jargon-stripped)
- Connector dependency: `~~project tracker` only (the CLI pulls context from GitHub Issues + Projects, NOT email or Slack)
- Deviations from upstream:
  - Cannot pull context from connected email/Slack → relies on git history + Projects events
  - "Nothing material to report" is a valid output, never fabrication
- Out-of-scope: email/calendar/chat context pull
- Test mapping: `product-management-cli :: /stakeholder-update`

### `synthesize-research`

- Upstream source: `vendor/anthropic/knowledge-work-plugins/product-management/skills/synthesize-research/SKILL.md`
- CLI command: `/product-management:synthesize-research <research topic>`
- Input contract: file path or stdin pipe of research data (interviews, surveys, tickets)
- Output contract: `ResearchSynthesisShape { themes, personas, opportunityAreas }`
- Connector dependency: `~~knowledge base` (= repo markdown) for output persistence
- Deviations from upstream:
  - Cannot integrate with Dovetail/Otter.ai/Gong (`~~meeting transcription` out of scope)
  - Themes ranked by frequency × impact (matches upstream)
  - <3 data points → "insufficient data" warning
- Out-of-scope: meeting transcription pull, automatic interview scheduling
- Test mapping: `product-management-cli :: /synthesize-research`

### `competitive-brief`

- Upstream source: `vendor/anthropic/knowledge-work-plugins/product-management/skills/competitive-brief/SKILL.md`
- CLI command: `/product-management:competitive-brief <competitor or feature area>`
- Input contract: competitor name or feature area string
- Output contract: `CompetitiveBriefShape { competitor, featureMatrix, positioning, recommendation }`
- Connector dependency: `~~knowledge base` for output
- Deviations from upstream:
  - Cannot integrate with Similarweb/Crayon/Klue → user must provide URLs or text dumps
  - Never auto-scrapes the web; refuses competitor with no provided source
  - `recommendation` enum: `differentiate | parity | ignore`
- Out-of-scope: live competitive-intelligence service integration
- Test mapping: `product-management-cli :: /competitive-brief`

### `metrics-review`

- Upstream source: `vendor/anthropic/knowledge-work-plugins/product-management/skills/metrics-review/SKILL.md`
- CLI command: `/product-management:metrics-review <time period or focus>`
- Input contract: CSV file path, JSON pipe, or markdown table
- Output contract: ASCII chart + trend annotations + recommended actions (terminal-first)
- Connector dependency: none (data piped in)
- Deviations from upstream:
  - Cannot integrate with Amplitude/Pendo/Mixpanel/Heap (`~~product analytics` out of scope)
  - Output is ASCII not HTML (terminal-first per CLAUDE.md)
  - Flat data → "no significant trend" instead of forced narrative
- Out-of-scope: live analytics service integration
- Test mapping: `product-management-cli :: /metrics-review`

### `product-brainstorming`

- Upstream source: `vendor/anthropic/knowledge-work-plugins/product-management/skills/product-brainstorming/SKILL.md`
- CLI command: `/product-management:brainstorm` (also via `commands/brainstorm.md`)
- Input contract: optional initial problem statement; multi-turn dialogue follows
- Output contract: structured exploration log; final recommendation if user converges
- Connector dependency: none (pure dialogue)
- Deviations from upstream:
  - Multi-turn within ONE CLI invocation (no separate session model needed)
  - Frameworks supported: How Might We | Jobs-to-be-Done | First Principles | Opportunity Solution Tree
  - Modes: divergent ideation | assumption testing | strategy exploration
  - Challenges assumptions vs. silent acceptance — flags premature convergence
- Out-of-scope: none
- Test mapping: `product-management-cli :: /brainstorm`

### `sprint-planning`

- Upstream source: `vendor/anthropic/knowledge-work-plugins/product-management/skills/sprint-planning/SKILL.md`
- CLI command: `/product-management:sprint-planning [sprint name or date range]`
- Input contract: optional sprint identifier; pulls backlog from GitHub Project
- Output contract: `SprintPlanShape { sprintName, capacityPoints, committed, carryover }`
- Connector dependency: `~~project tracker` (= GitHub Projects; reads backlog + last-sprint columns)
- Deviations from upstream:
  - Capacity computed from `gh api /users/.../events` for PTO + meeting flags in calendar (BUT `~~calendar` is out of scope — capacity must therefore come from explicit user input)
  - Priority enum: `P0 | P1 | stretch`
  - Carryover pulled from previous sprint Project column
  - Capacity overflow → ranked-cut list, never silent overflow
- Out-of-scope: automatic PTO/calendar pull
- Test mapping: `product-management-cli :: /sprint-planning`

---

## Test enforcement

Each contract above maps to a `describe()` block in:

- [`tests/cli/productivity-cli.test.ts`](../../tests/cli/productivity-cli.test.ts)
- [`tests/cli/product-management-cli.test.ts`](../../tests/cli/product-management-cli.test.ts)

When Wave 0 ships skill content, each `.todo` test must:

1. Assert the upstream contract (input → output shape per the section above)
2. Assert the deviation (what the CLI does differently from cowork)
3. Assert the out-of-scope errors are surfaced with the expected `code` field

Per Anthropic's `develop-tests.md` eval design principle 3 ("volume over quality"),
the test files cover **breadth** — every skill, every connector category. As
implementations land, individual tests get fleshed out with concrete fixtures.

## Open questions

- Where does the `kwpc-schema` package's GraphQL schema live, and how does it
  encode the dual-write `TASKS.md` ↔ GitHub Issues mapping? `packages/schema`
  was empty in the Wave 0 survey.
- Does `sprint-planning` actually pull from a GitHub Project last-sprint
  column, or does it require a separate "sprints" table? TBD per Wave 0.
- The `dashboard.html` deletion is non-trivial — upstream `task-management`
  references it. Does the CLI's port of that skill silently skip the
  dashboard-update steps, or does it surface "no dashboard"?

These get resolved as Wave 0 + Wave 1 ship. This spec gets updated in lockstep.

## Sources

- All upstream `SKILL.md` files under `vendor/anthropic/knowledge-work-plugins/`
- `subagentapps/knowledge-work-plugins-cli/{CLAUDE.md, README.md, productivity-cli/.claude-plugin/plugin.json}` (read 2026-04-26 via gh api)
- Anthropic eval guidance: <https://platform.claude.com/docs/en/test-and-evaluate/develop-tests.md>
