# Provenance — `2026-04-25-expanded-directive/`

## Source

User chat message during the autonomous /loop run (2026-04-25 PST evening,
between iteration 8 and any iteration 9).

## What's here

- `prompt-verbatim.md` — the exact text of the original expanded
  directive (vendor + akw + Cloudflare + contextual-retrieval + KB)
- `prompt-verbatim-part-2.md` — three follow-up messages: orchestrator +
  autonomous-agents architecture, cost+schedule answers, strategy doc
  + dogfood gate + tools-reference + Projects context. Also consolidates
  every URL/link from messages 3-5 in one searchable section.

## Why it's staged

The user explicitly asked: *"can you save this prompt and restructure it
for looping?"* and then again, after the more detailed expansion: *"can
you prepare that and reformat it and prepare for an ultra-plan and
ultra-review."*

We freeze the verbatim form here, then decompose into chained prompts
under `installs/prompts/` (the trusted, structured, versioned home).

## Promotion plan

| Source theme | Destination | Status |
|---|---|---|
| Staging convention itself | `staging/README.md` | done (this file's sibling) |
| Vendor 5 subagentapps repos | `installs/prompts/expand-vendor-subagentapps.md` | TBD this iteration |
| akw → subagent-organizations rename | `installs/prompts/promote-akw-context.md` | TBD this iteration |
| Cloudflare Pages + Secret Store | `docs/spec/frontend/cloudflare-deploy.md` + `installs/prompts/frontend-deploy.md` | TBD this iteration |
| Anthropic contextual-retrieval research | `installs/prompts/research-contextual-retrieval.md` | TBD this iteration |
| KB sources expansion (jobs, sitemaps, llms.txt) | `installs/prompts/expand-kb-sources.md` | TBD this iteration |
| Live-artifact polyrepo dashboard | `docs/spec/live-artifact-dashboard.md` | TBD this iteration |
| ultra-plan + ultra-review orchestration | `installs/prompts/ultra-orchestration.md` | TBD this iteration |

## Audit-trail policy

Read-only after copy. The verbatim text never gets edited. If the user
clarifies later, capture the clarification in `installs/prompts/<name>.md`
or in a follow-up staging directory dated to the clarification.
