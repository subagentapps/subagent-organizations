# `/engineering:system-design` — CLI implementation contract

Status: **draft** (Wave 1)
Source: `subagentapps/knowledge-work-plugins/engineering/skills/system-design/SKILL.md` (42 lines, fork-tracked)
Companion to:
- [`./engineering-cli-testing-strategy.md`](./engineering-cli-testing-strategy.md) (paired skill, separate spec)
- [`../cli-parity-contracts.md`](../cli-parity-contracts.md) — overall CLI parity contracts
- [`../frontend/`](../frontend/) — frontend specs that will USE this skill for buildout
Implementation target: `subagentapps/knowledge-work-plugins-cli` repo, path
`engineering-cli/skills/system-design/SKILL.md`

## Purpose

Help design systems and evaluate architectural decisions. The skill is a
**framework prompt** (5-step process) rather than a tool/command — it
loads when the user asks system-design questions and shapes Claude's
response into a structured design document.

Per user direction (iter 12): this skill + `testing-strategy` are
**prerequisites for frontend buildout**. The framework here informs how
we design `apps/live-artifact/` and the kwpc-schema package.

## Required frontmatter

```yaml
---
name: system-design
description: Design systems, services, and architectures. Trigger with "design a system for", "how should we architect", "system design for", "what's the right architecture for", or when the user needs help with API design, data modeling, or service boundaries.
---
```

Verbatim from upstream `upstream:1-4`. The trigger phrases ARE the
discoverability signal — Claude loads this skill when the user's prompt
matches one of them.

## Required body — 5-step framework + Output section

### Step 1 — Requirements gathering

Verbatim from upstream `upstream:12-15`:
- Functional requirements (what it does)
- Non-functional requirements (scale, latency, availability, cost)
- Constraints (team size, timeline, existing tech stack)

### Step 2 — High-level design

Verbatim from upstream `upstream:17-21`:
- Component diagram
- Data flow
- API contracts
- Storage choices

### Step 3 — Deep dive

Verbatim from upstream `upstream:23-28`:
- Data model design
- API endpoint design (REST, GraphQL, gRPC)
- Caching strategy
- Queue/event design
- Error handling and retry logic

### Step 4 — Scale and reliability

Verbatim from upstream `upstream:30-34`:
- Load estimation
- Horizontal vs. vertical scaling
- Failover and redundancy
- Monitoring and alerting

### Step 5 — Trade-off analysis

Verbatim from upstream `upstream:36-38`:
- Every decision has trade-offs. Make them explicit.
- Consider: complexity, cost, team familiarity, time to market, maintainability

### Output

Verbatim from upstream `upstream:40-42`:

> Produce clear, structured design documents with diagrams (ASCII or
> described), explicit assumptions, and trade-off analysis. Always
> identify what you'd revisit as the system grows.

## Why no CLI-specific divergences

This skill is **substrate-agnostic**. It's a framework that operates on
prose + diagrams; it doesn't depend on any external connectors that
would force a CLI port to differ from upstream Cowork. **Adopt
verbatim.** Every CLI port of this skill matches upstream 1:1.

The only port-time consideration is: when the skill is invoked **inside
this repo** (subagent-organizations), it should be aware of the repo's
existing context tools (now expanded — see "Available context tools"
below).

## Available context tools (expanded after iter 17 MCP additions)

When `/engineering:system-design` runs in `subagent-organizations` or
the cli repo, it has access to **MCP tools beyond the bare skill body**:

| MCP server | Use during system-design |
|---|---|
| **GitHub** (`mcp__plugin_github_github__*`) | Read repo state, list existing files/components/specs to ground architecture decisions in current code |
| **Cloudflare Developer Platform** (`mcp__claude_ai_Cloudflare_Developer_Platform__*`) | Survey existing D1 / R2 / KV / Hyperdrive / Workers — informs storage-choice decisions in Step 2 + 3 |
| **Figma** (`mcp__figma__*`) | Read design context (`get_design_context`, `get_screenshot`, `get_metadata`) when system-design touches a UI surface — generate diagrams via `generate_diagram` for the design-document output |
| **Notion** (`mcp__notion__*`) | Search/fetch existing design docs in the user's Notion workspace; create new design-document pages as the Output |
| **Chrome MCP** (`mcp__claude-in-chrome__*`) | Live-read a target system or competitor's UI for analysis |

**These are tools the skill USES, not steps it adds.** The 5-step
framework above stays canonical. The MCPs make Step 2 (high-level
design) and Step 5 (trade-off analysis) richer, but the structure is
unchanged.

## When the skill is in scope for our work

Concrete Wave-1 invocations that should use this skill:

1. **`docs/spec/frontend/` system-design pass** — apply the 5-step
   framework to validate the existing 6 specs (vite-scaffold,
   cloudflare-pages, live-data, content-routes, three-env-staging,
   design-brief). Produce a `docs/research/system-design/frontend.md`
   that flags any gaps. **Highest-leverage first invocation.**
2. **kwpc-schema GraphQL contract review** — apply the framework to
   `packages/schema/` (in the cli repo, not yet built). Surface
   federation / versioning / consumer-impact questions before plugins
   start consuming it.
3. **subagentmcp-sdk `tools/` layer** — apply to the crawlee-content
   layer + parry integration (issues #23, #24, #25, #26, #27, #28, #29).
   Step 4 (scale + reliability) is where bloom-cache sizing + parry rate
   limits get pinned.
4. **Engineering-cli plugin shape** (issue #51 umbrella) — what
   sub-skills should engineering-cli expose? Step 1's requirements
   gathering produces the canonical answer.

## Tests (mirror to `tests/cli/engineering-cli.test.ts` when it exists)

Tests for a framework-prompt skill differ from action-skill tests. The
contract is "produces structured output that conforms to the 5-step
framework," not "calls the right tool." Test cases:

| Test | Asserts |
|---|---|
| `triggers on "design a system for X"` | Skill loads when prompt matches one of the trigger phrases (frontmatter description) |
| `output contains all 5 framework sections` | The response body has Requirements / High-Level / Deep Dive / Scale / Trade-offs headings |
| `every decision section ends with explicit trade-offs` | Step 5 enforced; review-skill rule |
| `output flags assumptions explicitly` | Per the Output section's "explicit assumptions" requirement |
| `output identifies what to revisit as system grows` | Per the Output section's "what you'd revisit" requirement |

These are LLM-graded tests per `develop-tests.md` eval design principles
2 (automate when possible) and 3 (volume over quality).

## Naming + paths

```
engineering-cli/
└── skills/
    └── system-design/
        └── SKILL.md          ← this contract's body (verbatim from upstream)
```

Plugin manifest entry:

```json
{
  "skills": [
    { "name": "system-design", "description": "Design systems and architectures" }
  ]
}
```

## What this spec does NOT cover

- `testing-strategy` — separate spec
  ([`./engineering-cli-testing-strategy.md`](./engineering-cli-testing-strategy.md))
- The other engineering-cli skills (TBD per #51 umbrella) —
  separate specs
- Engineering-cli plugin manifest shape — covered by #51 umbrella

## Sources

- Upstream fork:
  <https://github.com/subagentapps/knowledge-work-plugins/blob/main/engineering/skills/system-design/SKILL.md>
  (42 lines, current as of iter 17)
- iter 17 MCP additions: Figma, Notion, Cloudflare Developer Platform
  (all `mcp__*` namespaces)
- `develop-tests.md` for the test design rationale
