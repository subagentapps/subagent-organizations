# `subagentapps/knowledge-work-plugins-cli` — survey

Date: 2026-04-26 (PST 2026-04-25 evening)
Source repo: <https://github.com/subagentapps/knowledge-work-plugins-cli>
Template source: `agentknowledgeworkers/knowledge-work-plugins-cli` (private template; visibility=private; size=74; pushed 2026-04-25)
Method: `gh api` REST (authenticated as admin-jadecli)

## Why this exists

Per /loop directive (2026-04-25): we want to dogfood the CLI parallel of
Anthropic's Cowork `knowledge-work-plugins` — i.e. plugins that run in
the Claude Code terminal as agentic alternatives to human-in-the-loop
Cowork. Specifically: `productivity-cli` and `product-management-cli`.

Repo created 2026-04-26 01:27 UTC from a private template. Apache-2.0,
shell-language, default branch `main`, `is_template: false`.

## Repo layout (verified via REST)

```
knowledge-work-plugins-cli/
├── .claude/
│   └── settings.json
├── .github/
├── .husky/
├── .gitignore                            (564 B)
├── .release-please-manifest.json         (182 B)
├── CLAUDE.md                             (2,337 B)
├── CODEOWNERS                            (1,383 B)
├── LICENSE                               (10,696 B — Apache-2.0)
├── README.md                             (2,854 B)
├── REVIEW.md                             (1,843 B)
├── commitlint.config.js                  (417 B)
├── data-cli/                             ← Cowork "data"
├── productivity-cli/                     ← Cowork "productivity"
├── product-management-cli/               ← Cowork "product-management"
├── platform-engineering/                 ← Cowork "cowork-plugin-management"
├── it-admin/                             ← new (Anthropic Admin API wrapper)
├── packages/
│   └── (schema/ planned — `@agentknowledgeworkers/kwpc-schema`)
├── package.json                          (devdeps: husky, commitlint)
├── package-lock.json                     (39,400 B)
├── release-please-config.json            (2,915 B)
└── scripts/                              (CI helpers, bootstrap, pin checks)
```

## Plugin folder shape (uniform across all 5)

Verified for `productivity-cli/` (others identical):

```
productivity-cli/
├── .claude-plugin/
│   └── plugin.json                       ← name, version, description, author
├── CHANGELOG.md
├── README.md
└── package.json
```

`productivity-cli/.claude-plugin/plugin.json` (verbatim):

```json
{
  "name": "productivity-cli",
  "version": "0.1.1",
  "description": "Personal task view backed by GitHub Issues. CLAUDE.md + memory/ for personal shorthand; tasks come from assigned Issues in the kwpc project.",
  "author": { "name": "Anthropic" }
}
```

The plugins are scaffolds — they have manifests but no skill content yet
(no `skills/`, `commands/`, or `references/` folders). This is consistent
with the README's *"Pre-0.1.0. Wave 0 (foundation) in progress."*

## Key conventions (from CLAUDE.md)

- **Conventional Commits enforced via husky `commit-msg` + commitlint.**
  Allowed types match `release-please-config.json`: `feat`, `fix`, `perf`,
  `revert`, `docs`, `deps`, `chore`, `refactor`, `test`, `ci`, `build`,
  `style`. `feat`/`fix`/`perf` bump versions.
- **release-please with `linked-versions`** for the 5 plugins; `packages/schema`
  versions independently. Plugin `.claude-plugin/plugin.json` versions kept
  in sync via `extra-files`.
- **npm publish gated on `PUBLISH_TO_NPM == 'true'`** repo variable. Until
  set, release-please cuts git tags + GitHub Releases but does not publish
  to npm. Recommended dogfood path: `claude --plugin-dir <path>`.
- **`${CLAUDE_PLUGIN_ROOT}` for intra-plugin paths** — never hardcode.
- **Pin every external dep.** `/stack-check` (in `platform-engineering`)
  catches drift.
- **Terminal-first output:** plain text, pipeable JSON, ASCII charts.
  No HTML.
- **GitHub Projects is the source of truth** — no local `TASKS.md` or
  dashboards.
- **Pure bash + jq in CI. No Python in workflows.**

## "Don'ts" list (from CLAUDE.md)

- Don't add a root `package.json` script that touches plugin packages —
  each plugin is independent.
- Don't bypass the commit-msg hook (`--no-verify`); fix the message instead.
- Don't edit `CHANGELOG.md` or `.release-please-manifest.json` by hand —
  release-please owns them.

## Cowork ↔ CLI plugin parity (verbatim from README.md)

| Plugin                    | For                                  | Equivalent Cowork plugin       |
|---------------------------|--------------------------------------|--------------------------------|
| `data-cli`                | Data analysts in the terminal        | `data`                         |
| `productivity-cli`        | Personal task view (GitHub-backed)   | `productivity`                 |
| `product-management-cli`  | Team coordination via GitHub Projects| `product-management`           |
| `platform-engineering`    | Plugin authoring + `/stack-check`    | `cowork-plugin-management`     |
| `it-admin`                | Anthropic Admin API wrapper          | (new)                          |

Plus shared: `@agentknowledgeworkers/kwpc-schema` (canonical GraphQL schema +
bash client mapping kwpc primitives onto GitHub Projects).

## Planned commands (productivity-cli README)

`/my-tasks`, `/task-add`. Personal memory skills (CLAUDE.md, memory/)
ported from Cowork unchanged. No `dashboard.html` — GitHub Projects is
the dashboard.

## How this fits our polyrepo

This repo is a **preapproved write-target** per the user's /loop directive
("treat this as a preapproved repo in our polyrepo you can modify"). It is
NOT a vendored read-only submodule like `vendor/anthropic/knowledge-work-plugins`.

Our roles:

- `vendor/anthropic/knowledge-work-plugins` (read-only submodule, just added):
  upstream Cowork plugins for reference. Audit-quality snapshot.
- `subagentapps/knowledge-work-plugins-cli` (separate repo, write-allowed):
  the CLI parallel we will dogfood and contribute to.
- `subagentapps/subagent-organizations` (this repo): the meta-repo. Pins
  both via `kb-manifest.json` (planned) and tracks the integration.

## Posture for the /loop run

1. **Don't fork or vendor it.** Modify it in place via cloning when needed,
   or use `gh api` for read-only metadata queries (cheaper).
2. **Match its conventions exactly.** Conventional Commits, husky hooks,
   release-please ownership of CHANGELOGs, `${CLAUDE_PLUGIN_ROOT}` paths,
   bash+jq CI, no Python.
3. **GitHub Projects is the canonical task surface** for live-artifact
   project management — see Phase C of `installs/loop-prompt.md`.
4. **Test productivity-cli + product-management-cli only after Wave 0
   foundation lands.** They're scaffolds today; building skill content
   on top of empty manifests would be premature.

## Open questions

- Where do `kwpc-schema` types live? `packages/schema` directory exists
  but its tree was not surveyed in this pass — pull the contents next
  iteration.
- What does `REVIEW.md` say? 1,843 B file at root; not yet read.
- What are the 1 open issue and the planned `Plugin: *-cli` milestones?
  Run `gh issue list -R subagentapps/knowledge-work-plugins-cli` next.
- What's in `.github/workflows/`? README claims release-please,
  pin-freshness, acceptance tests — verify.

## Sources

- `gh api repos/subagentapps/knowledge-work-plugins-cli` — repo metadata
- `gh api repos/subagentapps/knowledge-work-plugins-cli/contents` — root tree
- `gh api repos/subagentapps/knowledge-work-plugins-cli/contents/{README,CLAUDE,productivity-cli/...}.md` — file contents

All authenticated as admin-jadecli. No long-context-beta failures.
