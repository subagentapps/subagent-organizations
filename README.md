# subagent-organizations

> A polyrepo where an Opus 4.7 orchestrator delegates to cheaper, faster
> workers and reviews their work. Premium output, honest cost.

Live: [`subagent-organizations.pages.dev`](https://subagent-organizations.pages.dev) ·
Custom domain: [`subagentorganizations.com`](https://subagentorganizations.com)
*(pending DNS — see issue [#10](https://github.com/subagentapps/subagent-organizations/issues/10))*
· Latest: [`v0.0.3`](https://github.com/subagentapps/subagent-organizations/releases/tag/v0.0.3)

## What this is

The meta-repo for `subagentapps/*`. A typed catalog of every external
package referenced from our zsh, Ghostty, and Claude Code workflows, plus
the orchestration scaffold that ports `anthropics/knowledge-work-plugins`
to the CLI as `subagentapps/knowledge-work-plugins-cli`.

It is **not** a vendoring repo — no submodules, no copied source. The
upstream lives at [`vendor/anthropic/knowledge-work-plugins/`](./vendor/)
(read-only) and we mirror only what we ship.

## What's load-bearing

| Document | Use when |
|---|---|
| [`.claude/CLAUDE.md`](./.claude/CLAUDE.md) | Always. 12 conventions: spec-first, Conventional Commits, no submodules, bun not npm. |
| [`.claude/prompts/opus-orchestrator.md`](./.claude/prompts/opus-orchestrator.md) | Session-start identity. Load via `claude --append-system-prompt-file`. |
| [`docs/spec/brand/voice.md`](./docs/spec/brand/voice.md) | Authoring anything visible. We Are / We Are Not + tone matrix + terminology rules. |
| [`docs/spec/orchestration-strategy.md`](./docs/spec/orchestration-strategy.md) | Sequencing decisions. M1→M4 milestone ladder; 5 load-bearing rules. |
| [`docs/spec/cli-skills/connector-availability-matrix.md`](./docs/spec/cli-skills/connector-availability-matrix.md) | Per-plugin migration scoping. 28 categories × Keep/Drop/Substitute. |
| [`docs/spec/plugin-migration-pattern.md`](./docs/spec/plugin-migration-pattern.md) | Porting an upstream plugin to kwpc-cli. Most skills are CLI-callable as-is. |
| [`docs/spec/frontend/cloudflare-pages.md`](./docs/spec/frontend/cloudflare-pages.md) | Deploy operations for the live-artifact dashboard. |

## Conventions

- **Conventional Commits** enforced by [`commitlint.config.cjs`](./commitlint.config.cjs). `release-please` depends on it.
- **Automated changelog** — `release-please` opens a release PR on every push to `main`. Merging it tags + updates [`CHANGELOG.md`](./CHANGELOG.md). Don't edit `CHANGELOG.md` by hand.
- **bun, not npm.** Lockfile is `bun.lock`. Local: `bun run render` / `bun test` / `bun run build`.
- **GitHub Projects v2** is the task substrate. No local `TASKS.md`, no Notion, no Jira. See [`docs/spec/projects-schema.md`](./docs/spec/projects-schema.md).
- **License** — MIT.

## Layout

```
.
├── src/
│   └── apps/
│       └── live-artifact/         # the dashboard at subagent-organizations.pages.dev
├── docs/
│   ├── spec/                      # implementation contracts (every src/ file has one)
│   └── research/                  # research feeding the specs
├── installs/
│   ├── prompts/                   # ultra-orchestration, parry, superpowers install plans
│   └── briefs/                    # date-stamped session briefs (audit logs, decisions)
├── vendor/anthropic/              # read-only upstream (anthropics/knowledge-work-plugins)
├── .claude/
│   ├── CLAUDE.md                  # project conventions
│   ├── prompts/                   # append-system-prompts (opus-orchestrator, sdk-author)
│   └── agents/                    # spawnable subagents (repo-orchestrator, doc-scout, …)
├── .github/workflows/             # release-please.yml, deploy-live-artifact.yml
└── CHANGELOG.md                   # release-please owns this
```

## How the orchestrator runs

Per [`docs/spec/brand/voice.md`](./docs/spec/brand/voice.md) §6 (cost
discipline rule):

- **Lead orchestrator**: Opus 4.7 at effort `xhigh`. Routes work; reviews
  results.
- **Subagents (workers)**: Haiku for reads + verbatim quotes (`Explore`,
  `doc-scout`, `prompt-adapter`); Sonnet for indexing + curation
  (`kb-keeper`, `manifest-curator`).
- **Auto-memory** at `~/.claude/projects/.../memory/` survives compaction.
- **`/loop`** drives the firing cadence; **`/schedule`** is the durable
  cloud variant.

## Status

Wave 0. Live deploy + 3 plugin connector specs (engineering, product-
management, master matrix) shipped. M1 (productivity-cli) skill bodies
remain. Per [`docs/spec/orchestration-strategy.md`](./docs/spec/orchestration-strategy.md)
the strict ladder is M1 → M2 → M3 → M4 (second account); we don't skip
ahead.
