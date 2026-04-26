# Provenance — `2026-04-25-akw-artifact-context/`

## Source

`/Users/alexzh/claude-projects/akw-artifact-context/`

## Date copied

2026-04-25 (PST evening, during the autonomous /loop run)

## Copied by

Claude (Opus 4.7 1M) per user instruction in the expanded directive,
explicit quote: *"when we cp those into staging into this repo so we
avoid doing something we already did. we want to replace the
'agentknowledgeworkers' to 'subagent-organizations'."*

## What's here

11 files, ~428 KB, all verbatim from the source:

| File | Lines | Topic | Promotion target (proposed) |
|---|---|---|---|
| `akw-canonical-glossary.md` | 1010 | Project vocabulary, 4-layer entity definitions | `docs/spec/glossary.md` (renamed) |
| `claude-code-plugins-scaffold.md` | 4007 | Full 5-plugin + schema-pkg monorepo scaffold | Cross-reference with `subagentapps/knowledge-work-plugins-cli` survey; do NOT re-scaffold (already done in cli repo) — extract only the schema GraphQL contract |
| `migration-plan.md` | 555 | Cowork → CLI plugin port plan, 14 milestones | `docs/spec/cowork-cli-migration.md` |
| `akw-cf-pages-setup.txt` | 211 | Cloudflare Pages deployment for agentknowledgeworkers.com | `docs/spec/frontend/cloudflare-pages.md` (renamed to subagentorganizations.com) |
| `akw-kwpc-adrs.txt` | 703 | Bootstrap deliverables for knowledge-work-plugins-cli | Already largely realized in the cli repo; extract only the ADRs |
| `akw-kwpc-automation.txt` | 714 | bootstrap-migration.sh + CI/CD | `scripts/bootstrap-migration.sh` (renamed) — but gated behind cross-org write |
| `akw-step3-live-data.txt` | 614 | Pages Function `/api/projects` + KV cache | `docs/spec/frontend/live-data.md` |
| `akw-step4-content-routes.txt` | 697 | Per-plugin pages, ADR rendering, changelog route | `docs/spec/frontend/content-routes.md` |
| `akw-step5-staging.txt` | 407 | Three-environment Cloudflare Access setup | `docs/spec/frontend/three-env-staging.md` |
| `akw-vite-scaffold.txt` | 329 | Vite + React project scaffold | `docs/spec/frontend/vite-scaffold.md` |

Total: ~10,247 lines.

## Token policy

**DO NOT read these files in full.** Use Bash + grep + head/sed to scope
each pass to ≤200 lines max. The promotion plan above is the index for
where each piece is destined.

Rule of thumb: one staged file's read budget is ≤2k tokens of input per
iteration. Anything bigger means you're trying to do too much at once and
should split into multiple promote operations.

## Naming convention to apply on promote

| Original | Renamed |
|---|---|
| `agentknowledgeworkers` | `subagent-organizations` (orgs that do many things) or `subagentapps` (the GitHub org) — pick by context |
| `akw` | `subagent-orgs` (in path/identifier contexts), `subagent-organizations` (in prose) |
| `agentknowledgeworkers.com` | `subagentorganizations.com` |
| `@agentknowledgeworkers/<pkg>` | `@subagentapps/<pkg>` (the npm scope must match the GitHub org per convention) |
| `kwpc` | unchanged — it's a stable acronym for "knowledge-work-plugins-cli" and lives inside the package name `kwpc-schema` |

## Audit-trail policy

Per `staging/README.md` rule 1: this directory is read-only after copy.
If a name in here is wrong (e.g. an `akw` we missed), fix the *promoted*
copy; the staging copy stays frozen so future iterations can answer
"what did the user originally hand us?"

## Next iterations should

1. **NOT** re-read the whole `claude-code-plugins-scaffold.md` (4007 lines).
   The `subagentapps/knowledge-work-plugins-cli` repo already exists; that
   work shipped. Only extract specific schema definitions if needed.
2. Promote the frontend specs (`akw-vite-scaffold.txt`, `akw-step3-*`,
   `akw-step4-*`, `akw-step5-*`, `akw-cf-pages-setup.txt`) into
   `docs/spec/frontend/` as 5 separate spec files, with the `agentknowledgeworkers`
   → `subagent-organizations` rename applied.
3. Promote `akw-canonical-glossary.md` → `docs/spec/glossary.md` after
   filtering for terms still relevant to the current architecture.
4. Promote `migration-plan.md` → `docs/spec/cowork-cli-migration.md` —
   this is genuinely new content not yet in the repo.
5. Discard `akw-kwpc-adrs.txt` and `akw-kwpc-automation.txt` — already
   realized in the `subagentapps/knowledge-work-plugins-cli` repo. Audit
   trail kept here.
