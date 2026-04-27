# design-cli connectors — Keep / Drop / Substitute decisions

> Status: load-bearing as of 2026-04-27
> Source: `vendor/anthropic/knowledge-work-plugins/design/{CONNECTORS.md, .mcp.json, README.md}`
> Implementation: [`subagentapps/knowledge-work-plugins-cli/design-cli/`](https://github.com/subagentapps/knowledge-work-plugins-cli/tree/main/design-cli) (PR #10)
> Pattern: [`../plugin-migration-pattern.md`](../plugin-migration-pattern.md)
> Strategy: [`./kwpc-cli-migration-strategy.md`](./kwpc-cli-migration-strategy.md)

---

## 1. Decision matrix per category

| Category | Decision | What it means |
|---|---|---|
| `~~chat` | **Substitute** → `gh pr/issue comment` | Threaded discussion in GitHub. Slack opt-in. |
| `~~design tool` | **Keep** | Figma MCP — opt-in via user OAuth |
| `~~knowledge base` | **Substitute** → `rg` over `docs/` | KB on disk |
| `~~project tracker` | **Substitute → GitHub Projects v2** | `gh project item-*`, `gh issue *` |
| `~~user feedback` | **Substitute** → GitHub Issues with `user-feedback` label | Version-controlled feedback queue |
| `~~product analytics` | **Drop** | research-synthesis degrades to manual KPI paste |

**Final `.mcp.json`: 1 server (figma).** Down from 9 upstream.

---

## 2. Per-skill impact (7 skills)

| Skill | Categories | Behavior |
|---|---|---|
| `accessibility-review` | `~~design tool` | Figma when connected; manual paste otherwise |
| `design-critique` | `~~design tool`, `~~chat` | Figma + gh pr comment |
| `design-handoff` | `~~design tool`, `~~knowledge base` | Figma + rg over `docs/` |
| `design-system` | `~~design tool`, `~~knowledge base` | Same |
| `research-synthesis` | `~~product analytics`, `~~user feedback` | Drop analytics → manual; substitute feedback → gh issue list |
| `user-research` | `~~knowledge base` | Substitute → `rg` |
| `ux-copy` | (none) | No connector dependency |

**7 of 7 work**; design-tool-dependent skills degrade to manual paste when Figma not connected.

---

## 3. Provenance

- Upstream: `vendor/anthropic/knowledge-work-plugins/design/` (vendored 2026-04-26, Apache-2.0)
- Implementation PR: [`subagentapps/knowledge-work-plugins-cli#10`](https://github.com/subagentapps/knowledge-work-plugins-cli/pull/10)
- Authored by Claude (Opus 4.7) under `.claude/prompts/opus-orchestrator.md`
