---
name: prompts-collection
intent: Versioned, frontmatter-tagged prompts used to drive autonomous workflows in this repo
version: 0.1.0
last-tested: 2026-04-25
model-card-target: claude-opus-4-7[1m] (xhigh effort) | claude-sonnet-4-6 (medium)
---

# `installs/prompts/` — versioned prompt collection

This directory is the canonical home for **state-of-the-art prompts** used to
drive autonomous workflows (cron-fired loops, subagent dispatches, install
plans). Per Anthropic's published prompt-engineering guidance (chain prompts;
maintain a versioned collection over time), each prompt ships with frontmatter
that pins it to a specific intent + model card.

## Frontmatter spec

Every prompt file (`.md`) in or referenced by this directory carries a YAML
frontmatter block with the following keys:

| Key | Type | Required | Description |
|---|---|---|---|
| `name` | string (kebab-case) | yes | Stable identifier; matches filename stem |
| `intent` | string | yes | One-sentence description of what the prompt does |
| `version` | semver | yes | `MAJOR.MINOR.PATCH`; bump on intent or wording change |
| `last-tested` | YYYY-MM-DD | yes | Date of last successful run against the model-card target |
| `model-card-target` | string | yes | Comma-separated list: `model-id (effort)` per Claude Code model card |
| `description` | string | no | Longer explanation; falls back to first ¶ if absent |
| `chains-to` | array of name | no | Names of prompts this one is meant to call as next stage |
| `inputs` | array | no | Named arguments expected (free-form description) |
| `output-shape` | string | no | High-level shape of expected output (markdown / typed JSON / file edit / commit) |

Example minimal block:

```yaml
---
name: my-prompt
intent: Do one specific thing well
version: 0.1.0
last-tested: 2026-04-25
model-card-target: claude-sonnet-4-6 (medium)
---
```

## Why frontmatter, not external metadata

Each prompt is consumed by Claude Code in two ways:

1. **As a file Claude reads at runtime** (cron fire, `/loop` etc.) — then the
   frontmatter doubles as preamble + parameter contract
2. **As a row in this README's index table** — keeps discovery cheap

YAML frontmatter is parsed cleanly by both; markdown renderers hide it from
the human reader; `bun run scripts/render.ts` (planned) will read it for the
auto-generated index.

## Versioning policy

- **PATCH** — typo fix, formatting tweak, no behavioral change
- **MINOR** — adds new optional input, clarifies wording, no breaking change
- **MAJOR** — changes intent, output shape, or required inputs (callers must
  read the new version explicitly)

Bump `last-tested` whenever you re-run a prompt against its `model-card-target`
and observe expected behavior. Stale `last-tested` (>30 days) suggests the
prompt should be re-validated before relying on it.

## The current collection

| File | Intent | Version | Last tested | Target |
|---|---|---|---|---|
| [`../loop-prompt.md`](../loop-prompt.md) | Autonomous /loop driver — single source of truth for the dogfood cycle | 0.1.0 | 2026-04-25 | `claude-opus-4-7[1m] (xhigh)` |
| [`../superpowers-install.md`](../superpowers-install.md) | Deterministic install plan for the obra/superpowers skill bundle | 0.1.0 | 2026-04-25 | `claude-sonnet-4-6 (medium)` |
| [`../loop-plan.md`](../loop-plan.md) | Deprecated 12-task /loop queue, superseded by `loop-prompt.md` | 0.1.0 (frozen) | 2026-04-25 | n/a |
| [`./ultra-orchestration.md`](./ultra-orchestration.md) | Master sequencer for the 2026-04-25 expanded directive (5 chained phases + ultra-plan + ultra-review allocation) | 0.1.0 | never | `claude-opus-4-7[1m] (xhigh)` |
| [`./expand-vendor-subagentapps.md`](./expand-vendor-subagentapps.md) | Vendor 5 subagentapps repos as read-only submodules | 0.1.0 | never | `claude-sonnet-4-6 (medium)` |
| [`./promote-akw-context.md`](./promote-akw-context.md) | Promote akw staging into docs/spec/frontend/ + glossary with rename | 0.1.0 | never | `claude-sonnet-4-6 (medium)` |
| [`./frontend-deploy.md`](./frontend-deploy.md) | Deploy live-artifact dashboard to Cloudflare Pages on subagentorganizations.com | 0.1.0 | never | `claude-sonnet-4-6 (medium)` |
| [`./research-contextual-retrieval.md`](./research-contextual-retrieval.md) | Deep-read Anthropic contextual-retrieval blog + cookbook; vendor anthropics/cookbook | 0.1.0 | never | `claude-sonnet-4-6 (medium)` |
| [`./expand-kb-sources.md`](./expand-kb-sources.md) | Expand kb-keeper source catalog (sitemaps, llms.txt, jobs) using vendored subagentapps tools | 0.1.0 | never | `claude-sonnet-4-6 (medium)` |

> Note: `loop-prompt.md` and `superpowers-install.md` live in `installs/` (not
> `installs/prompts/`) because the cron job and install scripts reference them
> by their stable paths. This README indexes them in place. New prompt files
> created from scratch should land in `installs/prompts/<name>.md`.

## Future entries (per loop-prompt Phase D)

- `dogfood-cycle.md` — Phase D.12: model-card-aware variant of the loop prompt
- `test-stub-author.md` — Phase D.13: chained prompt that takes a skill spec
  and produces a typed Bun test stub
- `spec-to-impl.md` — Phase D.14: chained prompt that takes a spec + skill
  ref and produces a TypeScript skeleton

## Best practices baked into this format

| Practice | Where it shows up |
|---|---|
| Pin model card per prompt | `model-card-target` field |
| Track wording drift | `version` semver + `last-tested` |
| Chain don't bloat | `chains-to` references next-stage prompts by name |
| Reproducibility | `last-tested` date lets future-you know whether to re-validate |
| Token-efficient discovery | One README index, no per-file deep reading needed |

## See also

- [`../loop-prompt.md`](../loop-prompt.md) — the canonical autonomous-loop driver
- [`../../docs/research/anthropic-prompting-guidance.md`](../../docs/research/anthropic-prompting-guidance.md) — Anthropic's published Opus 4.7 guidance
- [`../../.claude/agents/`](../../.claude/agents/) — subagent definitions (each carries its own prompt as `prompt:` field)
- [`../../.claude/prompts/sdk-author.md`](../../.claude/prompts/sdk-author.md) — system-prompt overlay for SDK authoring
