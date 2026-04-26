---
name: promote-akw-context
intent: Promote akw-artifact-context staging into docs/spec/frontend/ + docs/spec/glossary.md with rename agentknowledgeworkers→subagent-organizations
version: 0.1.0
last-tested: never (drafted 2026-04-25)
model-card-target: claude-sonnet-4-6 (medium)
description: Reads selected sections of staging/2026-04-25-akw-artifact-context/ and produces clean spec files. Applies project naming rename throughout. Token-efficient — never reads a staged file in full.
chains-to: [frontend-deploy]
inputs:
  - staged_dir: staging/2026-04-25-akw-artifact-context/
  - rename_map: { "agentknowledgeworkers": "subagent-organizations", "akw": "subagent-orgs", "agentknowledgeworkers.com": "subagentorganizations.com", "@agentknowledgeworkers/": "@subagentapps/" }
output-shape: 5 frontend spec files + 1 glossary spec + 1 migration plan spec
---

# Promote akw-artifact-context to permanent specs

## Read budget per iteration

≤200 lines per staged file per pass. The `claude-code-plugins-scaffold.md`
(4007 lines) is **largely already realized** in `subagentapps/knowledge-work-plugins-cli`
— extract only the schema GraphQL contract, nothing else.

## Promotion table

| Staged file | Lines | Permanent home | Rename to apply |
|---|---|---|---|
| `akw-canonical-glossary.md` | 1010 | `docs/spec/glossary.md` | strip `akw` prefix; rename agentknowledgeworkers; keep entity definitions |
| `migration-plan.md` | 555 | `docs/spec/cowork-cli-migration.md` | applied throughout |
| `akw-cf-pages-setup.txt` | 211 | `docs/spec/frontend/cloudflare-pages.md` | agentknowledgeworkers.com → subagentorganizations.com |
| `akw-vite-scaffold.txt` | 329 | `docs/spec/frontend/vite-scaffold.md` | applied throughout |
| `akw-step3-live-data.txt` | 614 | `docs/spec/frontend/live-data.md` | rename + KV namespace `AKW_CACHE` → `SUBAGENT_CACHE` |
| `akw-step4-content-routes.txt` | 697 | `docs/spec/frontend/content-routes.md` | applied throughout |
| `akw-step5-staging.txt` | 407 | `docs/spec/frontend/three-env-staging.md` | applied throughout |
| `claude-code-plugins-scaffold.md` | 4007 | (extract schema only) → `docs/spec/kwpc-schema.md` | applied within extracted section |
| `akw-kwpc-adrs.txt` | 703 | DISCARD (already realized in cli repo) | — |
| `akw-kwpc-automation.txt` | 714 | DISCARD (gated on cross-org write) | — |

## Per-file pattern

For each row above:

1. `wc -l staging/2026-04-25-akw-artifact-context/<file>` — sanity-check
2. `grep -n '^#' staging/.../<file> | head -20` — get heading map
3. Decide what's ≤200 lines worth promoting; what's already in the cli repo
4. Read those exact line ranges with `Read` `offset` + `limit`
5. Write the promoted file applying the rename
6. Cross-reference back to the staging file in a `Sources` section
7. Commit: `docs(spec): promote <topic> from akw staging`

ONE promote = ONE commit = ONE PR row.

## Rename rules (applied during write, not as a sed pass)

Do the rename while writing the prose. Mechanical sed would miss context-
sensitive choices:

- `agentknowledgeworkers` (org noun) → `subagent-organizations` (the noun)
  OR `subagentapps` (the GitHub org). Pick by sentence:
  - "the agentknowledgeworkers project" → "the subagent-organizations project"
  - "@agentknowledgeworkers/<pkg>" → "@subagentapps/<pkg>" (npm scope follows GH org)
  - "agentknowledgeworkers.com" → "subagentorganizations.com"
- `akw` (3-letter abbrev) → `subagent-orgs` (path/identifier) OR
  `subagent-organizations` (prose)
- `kwpc` — UNCHANGED, stable acronym for "knowledge-work-plugins-cli"

## Anti-patterns

- DO NOT cat the whole staged file into the conversation
- DO NOT promote 2 files in one commit — keep diffs small
- DO NOT delete the staging copies after promote — they're the audit trail
- DO NOT promote `claude-code-plugins-scaffold.md` in full; extract only
  the schema (the rest is realized in the cli repo)

## See also

- [`../../staging/README.md`](../../staging/README.md) — staging convention
- [`../../staging/2026-04-25-akw-artifact-context/PROVENANCE.md`](../../staging/2026-04-25-akw-artifact-context/PROVENANCE.md) — what's in the staging
- [`./frontend-deploy.md`](./frontend-deploy.md) — runs after this for Cloudflare deploy
