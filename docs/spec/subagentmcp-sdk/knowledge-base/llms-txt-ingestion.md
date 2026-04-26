# `llms.txt`-driven KB ingestion plan

Status: **draft** (Wave 1)
Source: <https://platform.claude.com/llms.txt> — pulled 2026-04-26 06:50Z (1311 lines, 1262 indexed pages)
Companion to:
- [`./cookbook-ontology.md`](./cookbook-ontology.md) — 12 cookbook categories (different surface)
- [`./contextual-retrieval.md`](./contextual-retrieval.md) — chunker/embedder/retriever/reranker pipeline
- [`../tools/crawlee-content-layer.md`](../tools/crawlee-content-layer.md) — 4 readers + bloom dedup

## Why this exists

`platform.claude.com/llms.txt` is the **canonical, auto-maintained sitemap** of every
Anthropic developer-platform doc page. It supersedes ad-hoc URL collections by:

1. **Single source of truth.** When Anthropic adds, renames, or removes a page,
   `llms.txt` updates within minutes. No more chasing dead links.
2. **Already markdown-friendly.** Every entry already points to a `.md` URL — the
   `subagent-md` reader handles them with passthrough.
3. **Pre-segmented.** Sections (`Build`, `Admin`, `Models & pricing`, `Client SDKs`,
   `API Reference`) tell us posture before fetching.
4. **Bilingual-aware.** Lists 11 non-English mirrors at `/docs/<lang>/...` — we
   ingest English only and treat translations as `link-only` references.

This file pins:
- The 5 sections + their per-section ingestion posture
- The reader assignment per section
- Dedup strategy against `cookbook-ontology.md`
- The watcher routine that detects upstream `llms.txt` deltas

## The 5 sections (verbatim from `llms.txt`, 2026-04-26)

| Section | Pages | Reader | Posture |
|---|---|---|---|
| `### Build` | 94 | `subagent-md` | **eager** — full ingest into KB |
| `### Admin` | 13 | `subagent-md` | **eager** — full ingest |
| `### Models & pricing` | 8 | `subagent-md` | **eager** — full ingest, re-fetch weekly (pricing churns) |
| `### Client SDKs` | 10 | `subagent-md` | **eager** — full ingest |
| `### API Reference` | 1137 | `subagent-md` (lazy) | **lazy** — index only; fetch on retrieval hit |

Total English pages: **1262**. Total tokens at ~3k tokens/page (markdown):
~3.8M tokens raw. With the chunking + contextualizer pipeline from
`contextual-retrieval.md`, embedded corpus is ~1.5M tokens after dedup.

## Why `### API Reference` is lazy

1137 pages × ~12 SDK variants per endpoint (Python, TypeScript, Go, Java, PHP,
Ruby, C#, CLI, Terraform, plus `(Beta)` variants) = mostly templated SDK
boilerplate. Eager ingest would 5x the corpus for ~10% of useful retrieval
matches.

**Lazy strategy.** The retriever's BM25 index includes all 1137 page **titles +
URLs**. When a query matches, the reader fetches that single page on-demand and
caches via the bloom filter (`tools/_bloom-cache.ts`). 95% of API Reference
pages will never be fetched — the few that match real queries get full
treatment.

## Posture per section in detail

### `### Build` (94 pages, eager)

The core developer-facing docs. Examples (sample, 2026-04-26):

- `agents-and-tools/agent-skills/overview.md`
- `managed-agents/overview.md`
- `build-with-claude/prompt-engineering/overview.md`
- `agents-and-tools/tool-use/overview.md`
- `build-with-claude/extended-thinking.md`
- `build-with-claude/batch-processing.md`
- `build-with-claude/citations.md`
- `build-with-claude/compaction.md`
- `build-with-claude/context-editing.md`
- `agents-and-tools/tool-use/advisor-tool.md`
- `agents-and-tools/tool-use/bash-tool.md`
- `agents-and-tools/tool-use/code-execution-tool.md`
- `agents-and-tools/tool-use/computer-use-tool.md`
- `managed-agents/cloud-containers.md`
- `managed-agents/environments.md`
- `managed-agents/files.md`
- `managed-agents/github.md`
- `managed-agents/vaults.md`

These map directly onto the cookbook ontology in `cookbook-ontology.md`:

| llms.txt path prefix | Maps to cookbook category |
|---|---|
| `agents-and-tools/agent-skills/` | `Skills` |
| `agents-and-tools/tool-use/` | `Tools` |
| `build-with-claude/extended-thinking*` | `Thinking` |
| `build-with-claude/prompt-engineering/` | `Agent Patterns` |
| `managed-agents/` | `Claude Agent SDK` (also has its own `agent-sdk` cookbook entries) |
| `about-claude/use-case-guides/` | varies (multimodal, evals, etc.) |

**Dedup rule.** When a doc page is also covered by a cookbook URL,
`cookbook-ontology.md` wins as the canonical source — `llms.txt`-derived doc
gets cross-linked via `seeAlso` field, not duplicated in the embedding corpus.

### `### Admin` (13 pages, eager)

Org/workspace administration. Examples:

- `api/admin/workspaces.md`
- `api/admin/api-keys.md` (inferred from Admin section presence)
- `api/admin/users.md` (inferred)

Small, stable, valuable — eager ingest is cheap. Tag with `audience: platform-admin`.

### `### Models & pricing` (8 pages, eager + weekly refresh)

The 8-page model catalog. **Re-fetch weekly via watcher routine** because
pricing tables and model availability change. Relevant pages:

- `about-claude/models/overview.md`
- `about-claude/pricing.md`
- `about-claude/model-deprecations.md`
- `about-claude/models/<model-id>.md` (one per active model)

Tag with `decay: 7d` — embedder treats older snapshots as superseded once a
new fetch lands.

### `### Client SDKs` (10 pages, eager)

One per language plus the OpenAI compatibility shim:

- `api/sdks/csharp.md`, `api/sdks/cli.md`, `api/sdks/go.md`,
  `api/sdks/java.md`, `api/sdks/php.md`, `api/sdks/python.md`,
  `api/sdks/ruby.md`, `api/sdks/typescript.md`
- `api/openai-sdk.md` (compatibility)
- `api/client-sdks.md` (overview)

Eager. Stable. Tag with `audience: integrator`.

### `### API Reference` (1137 pages, lazy index)

Per-endpoint reference docs, multiplied by 12 SDK variants. The pattern:

```
/docs/en/api/{endpoint}.md                              ← canonical
/docs/en/api/cli/{endpoint}.md                          ← CLI variant
/docs/en/api/python/{endpoint}.md                       ← Python variant
/docs/en/api/typescript/{endpoint}.md                   ← TS variant
... (×12 SDK languages)
/docs/en/api/{lang}/beta/{endpoint}.md                  ← Beta variants per language
```

**Index-only ingest.** For each entry:

```ts
{
  url: "https://platform.claude.com/docs/en/api/...",
  title: "...",
  section: "API Reference",
  reader: "subagent-md",
  posture: "lazy",
  bm25_indexed: true,
  embedded: false,                  // contents not yet fetched
  fetched_at: null,
}
```

When the retriever ranks an entry into the top-N for a user query, the
reader fetches the page, the chunker + contextualizer + embedder runs, and
`embedded: true` flips. Subsequent queries hit the cached version.

**Cap.** No more than 50 lazy fetches per orchestrator run (prevents
runaway corpus growth from a single noisy query). The retriever logs
`lazy_fetch_skipped` if we hit the cap.

## The watcher routine

A weekly RemoteTrigger routine compares the live `llms.txt` against the
last-snapshotted version:

```jsonc
{
  "name": "kb-llms-txt-watcher",
  "cron_expression": "0 6 * * 1",   // Mondays 06:00 UTC
  "job_config": {
    "ccr": {
      "environment_id": "env_01CX7jwqo9ohLswpczaznAWf",
      "session_context": {
        "model": "claude-haiku-4-5-20251001",
        "sources": [
          { "git_repository": { "url": "https://github.com/subagentapps/subagent-organizations" } }
        ],
        "allowed_tools": ["Bash", "Read", "Write", "Edit"]
      },
      "events": [{ "data": { /* prompt below */ } }]
    }
  }
}
```

The prompt:

> Fetch <https://platform.claude.com/llms.txt> via curl. Diff against
> `docs/research/llms-txt-snapshots/<latest>.txt`. If sections changed
> (page added, removed, renamed) open one PR titled
> `kb: llms.txt delta <date>` with:
> 1. New snapshot file
> 2. `docs/research/llms-txt-deltas/<date>.md` listing additions/removals/renames
> 3. Issues against `subagent-organizations` for each new page that needs
>    eager ingest (cap at 5 per delta)
> If no changes, exit silently.

**Why Haiku.** Diff + small markdown writes — Sonnet would be wasteful.

## Reader integration

`subagent-md` (from `crawlee-content-layer.md`) handles `.md` URLs natively.
The watcher triggers a follow-up routine that walks the eager sections and
calls:

```ts
import { subagentMd } from "../../tools/subagent-md";

for (const entry of llmsTxt.eager) {
  const result = await subagentMd.read(entry.url, {
    expectedExtension: ".md",
    stripFrontmatter: true,
  });
  if (!result) continue;          // bloom hit; already in corpus
  await chunker.ingest(entry, result.markdown);
  await contextualizer.annotate(entry, result.markdown);
  await embedder.embed(entry);
}
```

Per the bloom-filter design, re-running the eager loop is idempotent — same
content hash → cache hit → no re-embed.

## Cost estimate

| Step | Pages | Tokens (in) | Tokens (out) | Cost (Haiku 4.5 cached) |
|---|---|---|---|---|
| Eager ingest (Build+Admin+M&P+SDKs) | 125 | ~375k | ~125k | ~$0.40 |
| Lazy ingest (50 cap × API Ref) | 50 | ~150k | ~50k | ~$0.16 |
| Contextualizer (per chunk, ~10 chunks/page × 175 pages) | 1750 chunks | ~5.25M | ~875k | ~$2.50 with cache |
| Embedder (Voyage-3-large) | 1750 chunks | ~5.25M | n/a | ~$0.30 |
| Weekly watcher (delta-only) | ~5 pages/week | ~15k | ~5k | ~$0.02/wk |

**Total bootstrap cost: ~$3.40.** Weekly maintenance: ~$0.02. Negligible
relative to the value of an always-fresh KB.

## Out of scope

- **Translations.** 11 non-English mirrors are link-only. We don't embed
  them, but the BM25 index keeps the URLs so a query in (e.g.) German can
  surface the correct translated page even if our corpus is English.
- **Diff against `code.claude.com`.** That host is the Claude Code product
  surface (CLI, hooks, plugins). Some content is mirrored under
  `platform.claude.com/docs/en/`; tracking the divergence is `cookbook-ontology.md`'s job.
- **`llms-full.txt`.** Linked at the bottom of `llms.txt` — much larger
  inline-content version. Skip; we already fetch per-page via
  `subagent-md`. `llms-full.txt` would be redundant after one pass.

## Open questions

1. **Section drift.** If Anthropic renames `### Build` to `### Develop`, does
   the watcher re-classify all 94 pages? **Decision:** yes — section is the
   primary `posture` selector.
2. **Cookbook overlap.** Some `Build` pages (e.g., `build-with-claude/extended-thinking.md`)
   are also reachable via `cookbook-ontology.md`'s `Thinking` category. The
   dedup rule above handles this, but we should add a unit test under
   `tests/subagentmcp-sdk/knowledge-base/dedup.test.ts`.
3. **Beta variants.** Many entries are tagged `(Beta) (cli)`, `(Beta) (Python)`,
   etc. **Decision:** treat the per-language Beta as a *facet* of the
   canonical entry, not a separate page. Reduces lazy-fetch cap pressure.

## Sources

- `llms.txt` (snapshotted to `docs/research/llms-txt-snapshots/2026-04-26.txt` in a follow-up PR)
- Anthropic blog: <https://www.anthropic.com/news/contextual-retrieval> (already cited in `contextual-retrieval.md`)
- This repo: [`cookbook-ontology.md`](./cookbook-ontology.md), [`contextual-retrieval.md`](./contextual-retrieval.md), [`../tools/crawlee-content-layer.md`](../tools/crawlee-content-layer.md)
