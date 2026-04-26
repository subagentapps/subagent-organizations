---
name: research-contextual-retrieval
intent: Deep-read Anthropic's contextual-retrieval engineering blog + cookbook contextual-embeddings guide; annotate with our takeaways and deep-link
version: 0.1.0
last-tested: never (drafted 2026-04-25)
model-card-target: claude-sonnet-4-6 (medium)
description: After the frontend ships, deep-read two anchor sources for our knowledge-base improvements; vendor anthropics/cookbook as the 7th submodule; pin specific cookbook page as load-bearing reference for kb-keeper subagent.
chains-to: [expand-kb-sources]
inputs:
  - blog: https://www.anthropic.com/engineering/contextual-retrieval
  - cookbook_page: https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide
output-shape: 1 vendor submodule (anthropics/cookbook) + docs/research/contextual-retrieval.md
---

# Deep-read: Anthropic Contextual Retrieval

## Sequencing constraint

This prompt runs AFTER the frontend ships. The user's quote: *"as a goal
for after implementation of our typescript react frontend app, we want to
look into [contextual-retrieval]."*

If the frontend isn't deployed yet, refuse this prompt and run
`frontend-deploy` first.

## Source acquisition (token-efficient)

```bash
# 1. The blog post — text only
curl -sf "https://www.anthropic.com/engineering/contextual-retrieval" \
  -o /tmp/contextual-retrieval.html
# strip to text via existing tooling or markdown-it converter
```

For the cookbook, use the **vendor submodule** approach (it's a public repo):

```bash
chmod 644 .gitmodules
git submodule add --depth 1 \
  https://github.com/anthropics/anthropic-cookbook.git \
  vendor/anthropic/cookbook
# append: update = none, shallow = true
chmod 444 .gitmodules
```

Then `vendor/anthropic/cookbook/skills/contextual-embeddings/` is the
canonical text — no WebFetch needed.

## What to extract

The doc has known structure (we cite from prior surveys but verify each
load-bearing claim against the vendored copy):

1. **The technique**: prepending chunk-specific context to each chunk
   before embedding (typical wins: 35-50% reduction in failed retrievals)
2. **The implementation**: prompt-cache the document, generate per-chunk
   context with Claude, embed the concatenation
3. **Hybrid retrieval**: combine BM25 (sparse) + dense embeddings + a
   reranker (Voyage / Cohere)
4. **Cost trade-off**: ~$1.02 per 1M tokens of context generation with
   prompt caching; less without

## Output structure

`docs/research/contextual-retrieval.md`:

```markdown
# Anthropic Contextual Retrieval — annotated

## Source pin
- Blog: https://www.anthropic.com/engineering/contextual-retrieval (SHA: <sha256 of fetched HTML>)
- Cookbook: vendor/anthropic/cookbook/skills/contextual-embeddings/ (SHA: <git submodule SHA>)
- Date: 2026-...

## Verbatim load-bearing claims

> [≤ 15-word quotes per copyright rules, in quotation marks]

## Our takeaways
- How this changes kb-keeper (the indexing posture)
- How this affects the subagent-crawls vendored repo (does it already do this?)
- Cost projection for our knowledge base size

## Deep-links from this doc
- prompt-adapter cites this for retrieval pass
- kb-keeper cites this for the embedding pipeline
- subagent-crawls cites this for the chunk-context generation step
```

## Backlog items this triggers

After annotating, open issues in the appropriate vendored subagentapps
repos for:

- `subagent-crawls`: does the chunk-context-prepending step already exist?
  If not, file a `wave-0` `enhancement` issue
- `warehouse`: does it support hybrid BM25+dense+rerank? File issue if not
- `subagent-xml`: any contextual-retrieval-relevant XML schemas missing?

ALL upstream issue creation = cross-org write per CLAUDE.md gate. Stop
and ask user before opening.

## See also

- [`./expand-vendor-subagentapps.md`](./expand-vendor-subagentapps.md) — must run first
- [`./frontend-deploy.md`](./frontend-deploy.md) — must complete first (sequencing)
- [`./expand-kb-sources.md`](./expand-kb-sources.md) — runs after this
- `.claude/agents/kb-keeper.md` — gets updated with new indexing posture
