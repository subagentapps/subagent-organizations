# `docs/spec/frontend/` — live-artifact dashboard contract

Status: **draft** (Wave 0 — pre-implementation)
Owner: `subagentapps/subagent-organizations`
Domain: `subagentorganizations.com` (user-owned via Cloudflare)

## Why this exists

This directory is the **spec-first contract** for the live-artifact project
tracker UI. Per `.claude/CLAUDE.md` convention #2 (spec-first), markdown
contracts under `docs/spec/` ship before any `src/` implementation.

The 5 specs below were promoted from `~/claude-projects/akw-artifact-context/`
on 2026-04-25 (originally written for the `agentknowledgeworkers` project)
and renamed throughout to `subagent-organizations` /
`subagentorganizations.com` /  `@subagentapps/<pkg>`.

## The 5 spec files

| File | Promoted from staging | Topic |
|---|---|---|
| [`vite-scaffold.md`](./vite-scaffold.md) | `akw-vite-scaffold.txt` | Vite + React 19 project skeleton (package.json, configs, layout) |
| [`cloudflare-pages.md`](./cloudflare-pages.md) | `akw-cf-pages-setup.txt` | Cloudflare Pages deploy + KV cache binding + wrangler.toml |
| [`live-data.md`](./live-data.md) | `akw-step3-live-data.txt` | Pages Function `/api/projects` GitHub GraphQL fetcher + KV cache |
| [`content-routes.md`](./content-routes.md) | `akw-step4-content-routes.txt` | Per-plugin pages, ADR rendering, changelog route |
| [`three-env-staging.md`](./three-env-staging.md) | `akw-step5-staging.txt` | Three-environment setup (prod / staging / preview) with Cloudflare Access |

## Naming rename applied throughout

| Original | Renamed to |
|---|---|
| `agentknowledgeworkers` (org noun) | `subagent-organizations` |
| `agentknowledgeworkers.com` (domain) | `subagentorganizations.com` |
| `@agentknowledgeworkers/<pkg>` (npm scope) | `@subagentapps/<pkg>` |
| `akw` (3-letter prefix in identifiers) | `subagent-orgs` |
| `AKW_CACHE` (KV binding) | `SUBAGENT_CACHE` |

`kwpc` (the kwpc-schema package acronym) is intentionally **unchanged** —
it's a stable ID for `knowledge-work-plugins-cli`.

## Out of scope (deliberately not promoted)

- `claude-code-plugins-scaffold.md` (4007 lines) — already realized in
  `subagentapps/knowledge-work-plugins-cli`; redundant.
- `akw-canonical-glossary.md` (1010 lines) — too broad; future iteration
  can promote selectively to `docs/spec/glossary.md`.
- `akw-kwpc-adrs.txt` (703 lines) — already realized in the cli repo.
- `akw-kwpc-automation.txt` (714 lines) — gated on cross-org write.
- `akw-landing-v1.tsx` (56 KB) — implementation, not spec; lands under
  `src/` once the 5 specs settle.
- `migration-plan.md` (555 lines) — separate scope (cowork→cli porting),
  not frontend.

## Sources

- Original artifacts: `~/claude-projects/akw-artifact-context/` (filesystem
  staging from earlier work; cp'd to the in-repo
  `staging/2026-04-25-akw-artifact-context/` on PR #4 for audit-trail)
- This promotion: 2026-04-25 PST, autonomous orchestrator iteration 2
