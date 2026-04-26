# `/engineering:testing-strategy` — CLI implementation contract

Status: **draft** (Wave 1)
Source: `subagentapps/knowledge-work-plugins/engineering/skills/testing-strategy/SKILL.md` (33 lines, fork-tracked)
Companion to:
- [`./engineering-cli-system-design.md`](./engineering-cli-system-design.md) (paired skill)
- [`../cli-parity-contracts.md`](../cli-parity-contracts.md) — overall CLI parity contracts
- [`../frontend/`](../frontend/) — frontend specs that will USE this skill for buildout
- [`../../research/anthropic-prompting-guidance.md`](../../research/anthropic-prompting-guidance.md) — references `develop-tests.md` eval design rationale
Implementation target: `subagentapps/knowledge-work-plugins-cli` repo, path
`engineering-cli/skills/testing-strategy/SKILL.md`

## Purpose

Design test strategies and test plans. Like `system-design`, this is a
**framework prompt** (testing pyramid + strategy-by-component-type)
rather than a tool/command — Claude loads it when the user asks
testing-architecture questions.

Per user direction (iter 12): this skill + `system-design` are the
**prerequisites for frontend buildout**. Together they shape how we
test `apps/live-artifact/` and the kwpc-schema package.

## Required frontmatter

```yaml
---
name: testing-strategy
description: Design test strategies and test plans. Trigger with "how should we test", "test strategy for", "write tests for", "test plan", "what tests do we need", or when the user needs help with testing approaches, coverage, or test architecture.
---
```

Verbatim from upstream `upstream:1-4`. Trigger phrases drive automatic
load when the user's prompt matches.

## Required body — testing pyramid + 4 component types + coverage rules + output

### Section 1 — Testing Pyramid

Verbatim from upstream `upstream:10-16`:

```
        /  E2E  \         Few, slow, high confidence
       / Integration \     Some, medium speed
      /    Unit Tests  \   Many, fast, focused
```

Three layers, top-to-bottom, with the canonical "few-slow-confident /
some-medium / many-fast-focused" framing.

### Section 2 — Strategy by Component Type

Verbatim from upstream `upstream:18-23`:

| Component | Test types |
|---|---|
| **API endpoints** | Unit tests for business logic, integration tests for HTTP layer, contract tests for consumers |
| **Data pipelines** | Input validation, transformation correctness, idempotency tests |
| **Frontend** | Component tests, interaction tests, visual regression, accessibility |
| **Infrastructure** | Smoke tests, chaos engineering, load tests |

### Section 3 — What to Cover

Verbatim from upstream `upstream:25-29`:

> Focus on: business-critical paths, error handling, edge cases,
> security boundaries, data integrity.
>
> Skip: trivial getters/setters, framework code, one-off scripts.

### Section 4 — Output

Verbatim from upstream `upstream:31-33`:

> Produce a test plan with: what to test, test type for each area,
> coverage targets, and example test cases. Identify gaps in existing
> coverage.

## Why no CLI-specific divergences

Like `system-design`, this is a **substrate-agnostic framework prompt**
that operates on prose. **Adopt verbatim.** The CLI port is a literal
copy of the upstream SKILL.md.

## Available context tools (expanded after iter 17-18 MCP additions)

When `/engineering:testing-strategy` runs in `subagent-organizations` or
the cli repo, it has access to a richer tool surface than upstream
Cowork. The framework stays canonical; the tools enrich Sections 2-3:

| MCP server | Use during testing-strategy |
|---|---|
| **GitHub** | List existing test files, scan PRs for test-coverage patterns, identify gaps |
| **Cloudflare Developer Platform** | Survey D1 / R2 / KV / Workers for "Infrastructure" component testing decisions |
| **Sentry** (iter 18) | `search_issues` / `search_events` to ground test cases in real production failures — esp. for "error handling" + "edge cases" coverage |
| **Stripe** (iter 18) | If touching payment flows: pull `list_disputes`, `list_refunds` to inform contract-test cases |
| **Neon** (iter 18) | `describe_table_schema` + `prepare_database_migration` for data-pipeline migration tests |
| **Slack** (iter 18) | Post test plans / coverage summaries to a channel for team review |
| **Figma** | When testing UI components: `get_design_context` provides the canonical visual contract for visual-regression tests |
| **Bun test runner** | `bun test` is the local runner per `.claude/CLAUDE.md` #6 |
| **GitHub Actions** | CI substrate for test execution; SHA-pinned per PR #58 (closes #52) |

These tools make the **"identify gaps"** clause of the Output section
quantitative — Sentry tells you which prod issues have no regression
test; GitHub PR scanning tells you which lines of `src/` have no test
file. Without them, gap-identification is qualitative guesswork.

## When the skill is in scope for our work

Concrete Wave-1 invocations:

1. **Frontend test plan** — apply to `apps/live-artifact/` per
   [`../frontend/`](../frontend/). Component tests (issue card, status
   column), interaction tests (kanban DnD or outline-tree expand/collapse
   per iter-15 corrections), visual regression vs the
   `claude.ai/design/` prototype, accessibility (WCAG AA per
   `design-brief.md`). **Highest-leverage first invocation.**
2. **kwpc-schema contract tests** — apply to `packages/schema/`. GraphQL
   schema federation needs contract tests for every consumer plugin per
   REVIEW.md Important rule 6.
3. **subagentmcp-sdk readers** — apply to issues #23, #25, #26
   (subagent-md/html/xml readers). Unit tests already scoped in those
   issues; this skill validates the test pyramid balance.
4. **Routine reliability** — apply to the `subagentapps-survey-*`
   routines (iter 8 v2). Smoke tests for "the routine fires and writes
   to inventory.md"; chaos tests for "what happens if target repo is
   inaccessible" (already happened in v1; lessons baked into v2).

## Tests for THIS skill

Same shape as `engineering-cli-system-design.md` — framework-prompt
skill with structural-output assertions. LLM-graded test cases:

| Test | Asserts |
|---|---|
| `triggers on "how should we test X"` | Frontmatter description trigger phrases work |
| `output contains a testing pyramid section` | Section 1 present |
| `output covers each of 4 component types relevant to the system asked about` | Section 2 selectively applied (not always all 4) |
| `output identifies what NOT to test` | Section 3's "Skip" clause applied |
| `output names coverage targets quantitatively where possible` | Section 4 — uses MCPs (Sentry / GitHub) when available, falls back to qualitative when not |

## Naming + paths

```
engineering-cli/
└── skills/
    └── testing-strategy/
        └── SKILL.md          ← verbatim from upstream
```

Plugin manifest entry:

```json
{
  "skills": [
    { "name": "testing-strategy", "description": "Design test strategies and test plans" }
  ]
}
```

## What this spec does NOT cover

- `system-design` — paired spec
  ([`./engineering-cli-system-design.md`](./engineering-cli-system-design.md))
- The other engineering-cli skills — separate specs per #51 umbrella
- Engineering-cli plugin manifest shape — covered by #51
- Test-runner choice for THIS repo (`bun test` is fixed by CLAUDE.md #6;
  test-strategy frame applies on top of that)

## Sources

- Upstream fork:
  <https://github.com/subagentapps/knowledge-work-plugins/blob/main/engineering/skills/testing-strategy/SKILL.md>
  (33 lines, current as of iter 18)
- iter 17-18 MCP additions: Figma, Notion, Cloudflare Developer
  Platform, Sentry, Stripe, Slack, Neon (all `mcp__*` namespaces; expand
  the gap-identification surface)
- `develop-tests.md` for the LLM-graded test design rationale
- This repo's `bun test` infrastructure (`bunfig.toml [test] root="tests"`
  per PR #21)
