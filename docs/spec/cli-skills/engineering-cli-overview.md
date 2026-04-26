# `engineering-cli` — plugin overview + manifest contract

Status: **draft** (Wave 1, closes #51)
Implementation target: `subagentapps/knowledge-work-plugins-cli/engineering-cli/`
Companion to:
- [`./engineering-cli-system-design.md`](./engineering-cli-system-design.md) — the `system-design` skill spec
- [`./engineering-cli-testing-strategy.md`](./engineering-cli-testing-strategy.md) — the `testing-strategy` skill spec
- [`../cli-parity-tracker.md`](../cli-parity-tracker.md) — tracks the 5 engineering rows
- [`../cli-parity-contracts.md`](../cli-parity-contracts.md) — overall parity contracts
- [`../../research/engineering-cli-port-plan.md`](../../research/engineering-cli-port-plan.md) — the port plan

## Why this exists

`subagentapps/knowledge-work-plugins-cli` is a polyrepo of 5 plugins matching
the upstream Cowork plugins surveyed in
[`../../research/knowledge-work-plugins-cli-survey.md`](../../research/knowledge-work-plugins-cli-survey.md):
`productivity-cli`, `product-management-cli`, `data-cli`, `platform-engineering`,
and `it-admin`. The CLI repo's Wave 0 scaffold has all 5 — but **not**
`engineering-cli`. This spec pins the manifest shape so when the cross-repo
PR lands, it matches the rest of the plugins exactly.

## Plugin manifest (`.claude-plugin/plugin.json`)

The CLI repo's other plugins use a uniform shape. `engineering-cli` follows
the same pattern:

```json
{
  "name": "engineering-cli",
  "version": "0.0.1",
  "description": "Engineering skills for the Claude Code CLI — system design, testing strategy, stack checks, architecture reviews, and incident postmortems. Mirrors subagentapps/knowledge-work-plugins/engineering with terminal-first output.",
  "author": "subagentapps"
}
```

Companion files (also uniform across plugins):

```
engineering-cli/
├── .claude-plugin/
│   └── plugin.json          ← shape above
├── CHANGELOG.md             ← release-please-managed; do NOT edit by hand
├── README.md                ← user-facing docs; ≤200 lines
├── package.json             ← devDeps only (commitlint, husky inherited from root)
└── skills/
    ├── system-design/SKILL.md         ← per engineering-cli-system-design.md
    ├── testing-strategy/SKILL.md      ← per engineering-cli-testing-strategy.md
    ├── stack-check/SKILL.md           ← TBD (issue tracked)
    ├── architecture-review/SKILL.md   ← TBD (issue tracked)
    └── incident-postmortem/SKILL.md   ← TBD (issue tracked)
```

## Skills surface

The 5 skills currently scoped under engineering-cli, per
`docs/spec/cli-parity-tracker.md` § engineering:

| Skill | Status | Spec | Divergence from upstream |
|---|---|---|---|
| `system-design` | ported | [`engineering-cli-system-design.md`](./engineering-cli-system-design.md) | upstream is design-collaboration; CLI is markdown-output-only |
| `testing-strategy` | ported | [`engineering-cli-testing-strategy.md`](./engineering-cli-testing-strategy.md) | adds Sentry MCP integration for gap-identification |
| `stack-check` | tbd | (none yet) | TBD |
| `architecture-review` | tbd | (none yet) | TBD |
| `incident-postmortem` | tbd | (none yet) | TBD |

These 5 are the **minimum-known set** — derived from frontend-track needs
and parity with the upstream plugin's directory listing as of
2026-04-26. The upstream fork (`subagentapps/knowledge-work-plugins/engineering/`)
isn't surveyed in this workspace; a routine survey would pin the canonical
list. See the port plan for the survey TODO.

## What this plugin doesn't do (out of scope)

- **Code generation** — system-design and architecture-review produce design
  documents, not code. Code-emitting skills live in `productivity-cli` (e.g.
  `task-management`).
- **Runtime monitoring** — `incident-postmortem` operates on a *past* incident
  (logs, transcripts, RCA). Live monitoring is `it-admin` territory.
- **Test execution** — `testing-strategy` produces a strategy + plan;
  running the tests is the user's responsibility (or a separate
  `productivity-cli` skill if we add one).

## Cross-cutting decisions

### Markdown-output-only

Every skill in this plugin emits markdown to stdout. No HTML, no Slack
webhook, no Notion writeback. This matches the parity-contract rule
"terminal-first output" and the iter-21 framing of the CLI as a
"TypeScript reference catalog" — the CLI is a thin shell over Claude
that reads files and prints structured text.

### No connectors required

Unlike `product-management-cli` (which depends on `~~product analytics`
etc.) and `productivity-cli` (which uses `~~project tracker → GitHub
Projects`), the engineering plugin uses **only repo-local context**:
the user's open files + git history + the spec docs themselves.

The lone exception is **Sentry MCP** for `testing-strategy`'s
gap-identification step — but per
[`./engineering-cli-testing-strategy.md`](./engineering-cli-testing-strategy.md),
it's optional and the skill degrades gracefully without it.

### `disable-model-invocation`

For each skill:

| Skill | `disable-model-invocation` | Rationale |
|---|---|---|
| `system-design` | `false` | Auto-loads when the user asks "design X" — the trigger phrases ARE the discoverability signal |
| `testing-strategy` | `false` | Auto-loads when the user asks "how should we test X" |
| `stack-check` | `true` | Manual `/engineering:stack-check` — runs a state inspection that we want under user control |
| `architecture-review` | `true` | Manual — large output; user-triggered keeps it deliberate |
| `incident-postmortem` | `true` | Manual — operates on a specific incident the user names |

## Manifest publication

When the cross-repo PR lands, release-please takes over the version field.
Until then, `0.0.1` matches the other plugins' starting versions. No
auto-publish to a marketplace; the plugin loads via local-clone path
(`/plugin install file://path/to/engineering-cli`) the same way the rest
of the CLI plugins do.

## Acceptance for this spec

- [x] Plugin manifest shape pinned (matches the 5 existing CLI plugins)
- [x] 5-skill surface enumerated with status / spec / divergence
- [x] Cross-cutting decisions documented (markdown-only, no connectors,
      `disable-model-invocation` per-skill)
- [x] Out-of-scope boundary documented
- [ ] Upstream fork survey (deferred — needs a routine pass; tracked in
      port plan)
- [ ] 3 stub skill specs (deferred — tracked as separate issues from this
      umbrella)
- [ ] Cross-repo PR adding `engineering-cli/` to the CLI repo (deferred —
      implementation phase, separate work)
