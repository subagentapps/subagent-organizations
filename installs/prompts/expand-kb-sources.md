---
name: expand-kb-sources
intent: Expand kb-keeper's source catalog with Anthropic jobs + 5 sitemaps + 2 llms.txt files; analyze fresh data via existing 5 subagentapps tools
version: 0.1.0
last-tested: never (drafted 2026-04-25)
model-card-target: claude-sonnet-4-6 (medium)
description: Aim is to improve our knowledge base across the 4 KB-parity competitors (Notion/Confluence/Guru/Coda) by ingesting all referenced Anthropic surfaces. Reuses subagent-crawls + warehouse + anthropic-docs-scraper rather than re-implementing parsing.
chains-to: []
inputs:
  - sitemaps: ["support.claude.com/sitemap.xml", "platform.claude.com/sitemap.xml", "anthropic.com/sitemap.xml", "claude.com/sitemap.xml"]
  - llms_txt: ["platform.claude.com/llms.txt", "code.claude.com/docs/llms.txt"]
  - jobs_anchor: "https://job-boards.greenhouse.io/anthropic/jobs/5197337008"
  - tools: ["subagent-xml (for sitemap parsing)", "subagent-crawls (for content)", "warehouse (storage)", "anthropic-docs-scraper", "subagents-platform-execution"]
output-shape: docs/research/kb-source-expansion.md + updates to .claude/agents/kb-keeper.md source list
---

# Expand kb-keeper's source catalog

## Why

User directive: *"we should aim to build our knowledge-base by improving
across the knowledge-base 4 competitors in the knowledge-work-plugins"*
(Notion / Confluence / Guru / Coda — see `docs/research/kb-parity-research.md`).

To do that, we need fresh, comprehensive Anthropic source data —
across jobs postings, sitemaps, and llms.txt files. The 5 vendored
subagentapps repos already handle parsing; this prompt **uses** them
rather than re-implementing.

## Source list (verbatim)

### Job postings (single anchor; expand via search)

- `https://job-boards.greenhouse.io/anthropic/jobs/5197337008` — anchor
  job; use it to find the full Anthropic job board listing
  (`https://job-boards.greenhouse.io/anthropic/jobs`) and filter for KB-
  related roles (search: `knowledge`, `retrieval`, `embeddings`,
  `documentation`, `developer relations`)

### Sitemaps (4 XML)

- `support.claude.com/sitemap.xml`
- `platform.claude.com/sitemap.xml`
- `anthropic.com/sitemap.xml`
- `claude.com/sitemap.xml`

### llms.txt (2)

- `platform.claude.com/llms.txt`
- `code.claude.com/docs/llms.txt`

## Tool routing (which vendored repo handles which)

Per CLAUDE.md #8 token-efficient tool precedence:

| Source kind | Tool | Reason |
|---|---|---|
| `*.xml` sitemaps | `vendor/subagentapps/subagent-xml` (after vendoring) | Already parses sitemap XML |
| Page contents | `vendor/subagentapps/subagent-crawls` | Crawlee + Readability |
| Storage/dedup | `vendor/subagentapps/warehouse` | The local cache substrate |
| Anthropic docs specifically | `vendor/subagentapps/anthropic-docs-scraper` | Already scoped to Anthropic |
| Workflow orchestration | `vendor/subagentapps/subagents-platform-execution` | Orchestration layer |
| `.txt`/`.md` files | `curl` direct | KB-precedence rule, no parser needed |
| Greenhouse jobs HTML | `subagent-crawls` (HTML w/ Readability) | Or stick with the official job board API if exposed |

## Pre-condition

`expand-vendor-subagentapps` MUST have completed first. If those 5 repos
aren't yet vendored, refuse this prompt and run that one first.

## Steps

1. **Survey**: for each of the 5 vendored repos, document its current
   capability surface in `docs/research/vendor-subagentapps-survey.md`
   (1 section per repo, ≤30 lines each)
2. **Integrate**: write `docs/spec/kb-source-routing.md` declaring which
   repo handles which source kind
3. **Test pipe**: run ONE source through end-to-end (sitemap → crawl →
   warehouse) and document the result
4. **Audit gaps**: any source that doesn't cleanly map to an existing tool
   becomes a `wave-0` issue in the relevant repo
5. **Document**: `docs/research/kb-source-expansion.md` summarizes what's
   in scope, what fresh data we got, and how it compares to the 4 KB
   competitors

## Anti-patterns

- DO NOT re-implement parsing for sources our 5 repos already handle —
  that's why we vendor them
- DO NOT WebFetch a sitemap (it's `.xml` — use `curl` per CLAUDE.md #8)
- DO NOT pull all sitemaps in parallel without bounding — they may be
  large; sample first via `curl -sI` for content-length
- DO NOT scrape behind authentication walls (`support.claude.com` may
  have anonymous access; verify before assuming)

## Sources

- User directive 2026-04-25 (verbatim in
  `staging/2026-04-25-expanded-directive/prompt-verbatim.md`)
- Existing KB parity research (`docs/research/kb-parity-research.md`)
- bcherny signal — for Live Artifacts canonical definition

## Open questions

- Greenhouse job postings: is there a stable JSON endpoint, or do we
  need HTML scraping? Verify the first time we hit the anchor URL
- llms.txt: does each Anthropic surface follow the same schema? Compare
  the 2 we have access to and document the deltas
