# Anthropic GitHub conventions — labels, templates, project taxonomy

Date: 2026-04-26 (PST 2026-04-25 evening)
Method: GraphQL via `gh api graphql` (token-efficient, per CLAUDE.md #8)
Repos surveyed: 5 most-active under `anthropics/*`
  - `claude-code` (117k★)
  - `skills` (123k★)
  - `claude-cookbooks` (41k★)
  - `claude-plugins-official` (17.8k★)
  - `knowledge-work-plugins` (11.5k★)

Companion to: [`./knowledge-work-plugins-cli-survey.md`](./knowledge-work-plugins-cli-survey.md), [`../spec/cli-parity-contracts.md`](../spec/cli-parity-contracts.md)

## Why this matters

Per /loop directive (Phase C): the user wants to use GitHub Projects as the
**live-artifact project task management system** for the polyrepo, following
Anthropic engineering conventions as v1 guidance. This file pins what those
conventions actually look like, sourced from the canonical repos.

## Two label patterns observed

The 5 surveyed repos cleanly split into two patterns:

### Pattern 1 — "Rich taxonomy" (claude-code)

`anthropics/claude-code` has **86 labels**. It's the only one with deep area
+ platform + priority taxonomies. Used for a complex CLI/SDK product with
many surfaces (web, IDE, terminal, CI).

Categories (extracted by prefix):

- **`area:*` (38 labels)** — `area:agent`, `area:cli`, `area:mcp`,
  `area:permissions`, `area:plugins`, `area:skills`, `area:tools`,
  `area:tui`, `area:ui`, `area:web`, etc. Maps surface → triage owner.
- **`platform:*` (10 labels)** — `platform:macos`, `platform:linux`,
  `platform:windows`, `platform:wsl`, `platform:ios`, `platform:android`,
  `platform:vscode`, `platform:intellij`, `platform:web`,
  `platform:aws-bedrock`. All same color `#93A5FF`.
- **`api:*` (3 labels)** — `api:anthropic`, `api:bedrock`, `api:vertex`.
- **`perf:*` (3 labels)** — `perf:cpu`, `perf:memory`, `perf:reliability`.
- **Priority (3 labels)** — `high-priority`, `med-priority`, `low-priority`.
- **State (10+ labels)** — `bug`, `enhancement`, `documentation`,
  `regression`, `stale`, `needs-info`, `needs-repro`, `has repro`,
  `duplicate`, `wontfix`, `oncall`, `data-loss`, `autoclose`.
- **Authoring (1 label)** — `claude-code-assisted` `#c4a5f7` (consistent
  across all 5 repos — the one cross-repo signal).

### Pattern 2 — "GitHub default + plugin extras" (the 4 plugin/skill repos)

`skills`, `claude-cookbooks`, `claude-plugins-official`,
`knowledge-work-plugins` all use **10–13 labels** with the same shape:

- 9 GitHub-default labels: `bug`, `documentation`, `duplicate`,
  `enhancement`, `good first issue`, `help wanted`, `invalid`, `question`,
  `wontfix`
- The Anthropic-cross-repo signal: `claude-code-assisted` `#c4a5f7`
- Repo-specific extras:
  - `claude-cookbooks`: `dependencies`, `pending`, `python:uv`
  - `claude-plugins-official`: `new-plugin`, `sha-bump`
  - `knowledge-work-plugins`: `new-plugin` (different color: `#0e8a16` vs the
    plugins-official `#834efb`)

The shared GitHub-default colors line up exactly:

| Label | Color |
|---|---|
| `bug` | `#d73a4a` |
| `documentation` | `#0075ca` |
| `enhancement` | `#a2eeef` |
| `good first issue` | `#7057ff` |
| `help wanted` | `#008672` |
| `question` | `#d876e3` |
| `duplicate` | `#cfd3d7` |
| `invalid` | `#e4e669` |
| `wontfix` | `#ffffff` |
| `claude-code-assisted` | `#c4a5f7` |

This is the **GitHub stock palette + the Anthropic cross-repo signal**.

## Issue templates (claude-code only — others use defaults)

`anthropics/claude-code/.github/ISSUE_TEMPLATE/`:

- `bug_report.yml`
- `config.yml`
- `documentation.yml`
- `feature_request.yml`
- `model_behavior.yml`

The `model_behavior.yml` is unusual outside Anthropic — captures cases where
the model itself misbehaves (vs a CLI bug). Worth borrowing if we ever ship
LLM-driven CLI tools.

The 4 plugin/skill repos do not have custom issue templates — they rely on
GitHub's default Issue type.

## Project boards (could not survey directly)

GraphQL `organization.projectsV2` requires the `read:project` token scope,
which `gh auth` does not include by default. Tried:

```graphql
{ organization(login: "anthropics") { projectsV2(first: 10) { nodes { number title } } } }
```

Returned `INSUFFICIENT_SCOPES` with the exact missing scope name. Workaround
options if this becomes load-bearing:

1. `gh auth refresh -h github.com -s read:project,project` (interactive — can
   be done once; works thereafter)
2. Survey individual repo Projects via `repository.projectsV2` (same scope)
3. Read the Anthropic engineering blog or a public Anthropic talk for any
   public-facing project conventions (deferred — not part of this iter)

For now we infer Project conventions from labels + the
`subagentapps/knowledge-work-plugins-cli` user-provided screenshots
(Wave 0 boards: 50% complete, 16/8 productivity, 11/8 product-mgmt).

## Recommended label set for `subagentapps/knowledge-work-plugins-cli`

Mirror Pattern 2 (the plugin/skill default), adding repo-specific signals:

```yaml
# .github/labels.yml — proposed for knowledge-work-plugins-cli
- name: bug
  color: d73a4a
  description: Something isn't working
- name: documentation
  color: 0075ca
  description: Improvements or additions to documentation
- name: duplicate
  color: cfd3d7
  description: This issue or pull request already exists
- name: enhancement
  color: a2eeef
  description: New feature or request
- name: good first issue
  color: 7057ff
  description: Good for newcomers
- name: help wanted
  color: 008672
  description: Extra attention is needed
- name: invalid
  color: e4e669
  description: This doesn't seem right
- name: question
  color: d876e3
  description: Further information is requested
- name: wontfix
  color: ffffff
  description: This will not be worked on
- name: claude-code-assisted
  color: c4a5f7
  description: Authored or co-authored with Claude Code
# repo-specific
- name: plugin:productivity-cli
  color: 0e8a16
  description: Affects productivity-cli
- name: plugin:product-management-cli
  color: 0e8a16
  description: Affects product-management-cli
- name: plugin:data-cli
  color: 0e8a16
  description: Affects data-cli
- name: plugin:platform-engineering
  color: 0e8a16
  description: Affects platform-engineering
- name: plugin:it-admin
  color: 0e8a16
  description: Affects it-admin
- name: schema
  color: 1d76db
  description: Affects @agentknowledgeworkers/kwpc-schema
- name: wave-0
  color: fbca04
  description: Wave 0 foundation milestone
- name: wave-1
  color: f29513
  description: Wave 1 implementation milestone
```

That's 18 labels total (10 cross-Anthropic + 5 plugin scopes + 1 schema + 2
wave milestones). Less than `claude-code`'s 86, more than the 11 of
`knowledge-work-plugins` — calibrated to the polyrepo's actual surface.

## What's deliberately NOT mirrored

- **`area:*` from claude-code (38 labels)** — too granular for a 5-plugin
  CLI. The `plugin:*` namespace already does the job.
- **`platform:*` from claude-code (10 labels)** — terminal-first means
  most platform issues are CLI-wide, not platform-specific. Add later if
  triage demands it.
- **`api:*`, `perf:*`** — premature; revisit once the CLI ships.
- **`oncall`, `data-loss`, `autoclose`** — pipeline-internal at Anthropic
  scale; we don't run an oncall rotation.

## What we adopt verbatim

- The 9 GitHub-stock colors (don't fight the muscle memory)
- `claude-code-assisted` (#c4a5f7) — the cross-repo signal
- The `<noun>:<value>` namespacing pattern when adding categories
- The plugin-repos' "minimal labels + project board does the heavy lifting"
  philosophy (vs claude-code's 86-label triage system)

## Implications for `subagentapps/subagent-organizations` (this repo)

We should also mirror the same label set here — both repos in the polyrepo
should use the same triage vocabulary. Sub-namespaces:

- `subagent-organizations` adds: `kb:*` (kb-children pinning),
  `subagent:*` (which subagent), `vendor:*` (which vendored submodule),
  `spec` (`docs/spec/` changes)
- `knowledge-work-plugins-cli` adds: `plugin:*`, `schema`, `wave-N`

That's the convention we ship in Phase C.8 (label mirror).

## Test mapping

This research document feeds:

- Phase C.8 — `subagentapps/knowledge-work-plugins-cli/.github/labels.yml`
  (the label-mirror script)
- Phase C.9 — `docs/spec/projects-schema.md` (custom field shapes)
- Phase C.10 — Wave 0 task wiring (issues + milestone in
  knowledge-work-plugins-cli)

## Open questions

- What custom fields do the actual Wave 0 GitHub Projects use (status,
  priority, sprint, due-date)? User-provided screenshots show Wave 0 boards
  but field names need verification. Defer to Phase C.9 with the user's
  guidance or via a `read:project`-scoped token.
- Does `claude-code-assisted` get applied automatically or by manual review?
  Its consistent presence across all 5 repos suggests an Anthropic-internal
  bot. Worth investigating if we want auto-application on our PRs.

## Sources

- `gh api graphql` against `repository.labels(first: 100)` for each of 5 repos
- `gh api repos/anthropics/claude-code/contents/.github/ISSUE_TEMPLATE`
- (org-level Projects v2 query failed: `INSUFFICIENT_SCOPES` for `read:project`)

All queries authenticated as `admin-jadecli` per identity table in `~/.claude/CLAUDE.md`.
