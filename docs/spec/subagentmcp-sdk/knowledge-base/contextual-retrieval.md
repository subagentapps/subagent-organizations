# Contextual Retrieval — knowledge-base layer

Status: **draft** (Wave 1)
Source pin: <https://www.anthropic.com/engineering/contextual-retrieval> (content quoted verbatim by user 2026-04-25; SHA-pin TBD when fetched via `subagent-html` reader)
Companion to:
- [`../tools/crawlee-content-layer.md`](../tools/crawlee-content-layer.md) — feeds raw markdown into the chunker
- [`./README.md`](./README.md) — KB layer overall
- [`../../research/lsp-and-ingestion.md`](../../research/lsp-and-ingestion.md) — earlier ingestion design

## Why this exists

Plain RAG fails because chunks lose document context. The Anthropic blog
documents a 5-piece pipeline that drops top-20 retrieval failure rates from
**5.7% → 1.9%** (a 67% reduction) when fully assembled. The pipeline:

```
markdown document
   ↓
[chunker]              boundary + overlap policy
   ↓ chunks
[contextualizer]       Claude prepends chunk-specific context (50-100 tokens) using prompt caching
   ↓ (context + chunk) pairs
[embedder] + [BM25]    parallel: dense embeddings (Voyage/Gemini) + lexical BM25
   ↓ two indexes
[retriever]            top-150 from each, fused
   ↓ candidates
[reranker]             Cohere/Voyage reranker → top-20
   ↓
LLM context window
```

This spec defines the contract for each piece. Implementation is broken
into sized issues in Project #2 (see "Implementation issues" at bottom).

## The five pieces (the contract)

### 1. Chunker — `kb/chunker.ts`

**Responsibility:** split a markdown document into chunks with sane
boundaries.

**Decisions baked in:**
- **Chunk size**: 800 tokens (matches the blog's example math: "800 token
  chunks, 8k token documents")
- **Boundary preference**: prefer markdown-section boundaries (`#`, `##`,
  `###`) over arbitrary token cuts
- **Overlap**: 100 tokens (small overlap protects against boundary-dropped
  context; large overlap explodes corpus size)
- **Output type**: `Chunk { id, docId, ordinal, text, tokenCount, headingPath }`

**Why these defaults**: the blog leaves chunk boundaries / overlap
explicitly open ("can affect retrieval performance"); we adopt the
example-math defaults until our own evals say otherwise.

**Implementation notes (2026-04-26, closes #75):**
- Token counting is approximate (`~4 chars/token`). Swap
  `approxTokenCount()` if a real tokenizer dep is justified later;
  the chunker's interface stays stable.
- `headingPath` uses ENCLOSING semantics: a heading at exactly the
  chunk's start offset is the chunk's own content, NOT part of the
  path. This avoids restating in the contextualizer's preamble what
  the chunk's first line already says.
- Code-fence aware: `#` lines inside ``` ``` ``` blocks are not
  treated as headings (would otherwise produce false-positive split
  points in technical docs).
- Stable IDs: `Chunk.id = sha256(docId + "|" + ordinal + "|" + text)`.
  Re-chunking the same document produces identical IDs — incremental
  re-indexing only re-contextualizes the chunks whose IDs changed.
- Boundary fallback order: heading > paragraph (blank line) > sentence
  end > hard cut at the budget edge.
- Empty/whitespace-only input emits a single empty chunk so the
  pipeline downstream has a deterministic entry to track.

### 2. Contextualizer — `kb/contextualizer.ts`

**Responsibility:** for each `(document, chunk)` pair, generate a 50–100
token preamble that situates the chunk in the document's overall context.

**The prompt (verbatim from Anthropic, do not paraphrase):**

```
<document>
{{WHOLE_DOCUMENT}}
</document>

Here is the chunk we want to situate within the whole document
<chunk>
{{CHUNK_CONTENT}}
</chunk>

Please give a short succinct context to situate this chunk within the
overall document for the purposes of improving search retrieval of the
chunk. Answer only with the succinct context and nothing else.
```

**Model**: Claude 3 Haiku (`claude-haiku-4-5-20251001` is the closest
current equivalent; the blog's Haiku is the cost-target reference).

**Prompt caching is mandatory**, not optional. Without it, the document
is re-passed for every chunk (cost scales as `O(N_chunks × document_tokens)`
instead of `O(document_tokens + N_chunks × chunk_tokens)`).

**Cost target** (verbatim from blog, with prompt caching):
- 800-token chunks
- 8k-token documents
- 50-token instruction
- 100-token output per chunk
- = **$1.02 per 1M document tokens, one-time** (regenerate only on document change)

**Output type**: `ContextualizedChunk { ...Chunk, contextPreamble: string }`

**Failure mode**: if the contextualizer call fails (rate limit, timeout),
fall back to embedding the raw chunk WITHOUT context — degraded mode, not
hard fail. Log the degradation in the chunk's metadata so re-runs can
retry.

### 3. Embedder + BM25 indexer — `kb/index.ts`

**Responsibility:** build TWO parallel indexes over `(contextPreamble + "\n\n" + chunk.text)`:

| Index | Engine | Why |
|---|---|---|
| Dense embeddings | **Voyage** (preferred) or **Gemini Text 004** | Per blog: top performers in their tests |
| Lexical | BM25 (e.g. `bm25-search` or PostgreSQL `tsvector` for AlloyDB matched stack) | Embeddings + BM25 beats embeddings alone |

**Decision: Voyage over Gemini** for now. Reasons:
1. Voyage has its own reranker (we may use it in piece 5)
2. Voyage's API integrates with the Claude SDK
3. Both work; Voyage is the simpler stack

**Output**: a `DenseIndex` and `BM25Index` keyed by chunk ID.

### 4. Retriever — `kb/retriever.ts`

**Responsibility:** parallel-fetch top-N from each index for a query, fuse
results, return top-150 candidates.

**Decisions baked in:**
- **Initial fan-out**: top-150 (matches blog's reranker input size)
- **Fusion**: Reciprocal Rank Fusion (RRF) with k=60 (standard); each
  index's top-N gets `1/(k+rank)` score, sum across both, sort
- **Output type**: `RetrievalCandidate[]` with both dense + lexical scores
  surfaced for debugging

**Why 150 not 20**: blog says reranker reads 150, picks 20. The fan-out
size is THIS layer's output, the trim-to-20 happens in piece 5.

**Implementation notes (2026-04-26, closes #78):**
- Pure function — no I/O, no randomness. `fuseRankings(dense, lexical, opts?)`
  is the synchronous core; `retrieve(query, denseIdx, lexicalIdx, opts?)`
  is the async dispatcher that runs both indexes in parallel via
  `Promise.all`.
- Decoupled from the embedder/BM25 implementations (#77) via the
  `IndexQuerier` interface — any index that returns `RankedHit[]` for a
  query plugs in. Tests stub freely; production wires Voyage AI +
  tsvector or in-memory BM25.
- **Tie-breaker**: equal `fusedScore` → higher dense score wins; equal
  dense → higher lexical wins; all-tied → lexicographic chunkId order.
  Deterministic so the eval harness in #80 produces reproducible top-20
  lists across runs.
- Defaults match the blog: `k=60`, `topN=150`, `perIndexTopN=150`.
  All overridable via `RetrieveOptions`.

**Responsibility:** rerank top-150 candidates → top-20 final chunks.

**Decision: Cohere reranker** matches the blog's tested config. **Voyage
reranker** is documented as untested but viable — we leave it as
configurable.

**Output type**: `RerankedChunk { chunk, contextPreamble, denseScore,
lexicalScore, fusedScore, rerankerScore }` for the top-20.

**Cost / latency note from blog**: reranking adds latency at runtime (not
build time). Reranker scores chunks in parallel, but it's an extra round
trip. Not free, but worth it: 49% → 67% retrieval improvement.

## End-to-end interface

```ts
// src/subagentmcp-sdk/knowledge-base/contextual-retrieval.ts

interface KBSourceDocument {
  id: string;
  url: string;
  markdown: string;          // from subagent-md / subagent-html via crawlee layer
  contentHash: string;       // SHA-256 from BloomCache
  fetchedAt: string;
}

interface ContextualizedChunk {
  id: string;
  docId: string;
  ordinal: number;
  text: string;
  tokenCount: number;
  headingPath: string[];     // e.g. ['Implementing Contextual Retrieval', 'Cost considerations']
  contextPreamble: string;   // the 50-100 tokens from Claude
  preambleSource: 'haiku' | 'fallback';  // 'fallback' if contextualizer call failed
}

interface RerankedChunk {
  chunk: ContextualizedChunk;
  scores: {
    dense: number;
    lexical: number;
    fused: number;
    reranker: number;
  };
}

// Builder (one-time per document, regenerate on content change)
async function indexDocument(doc: KBSourceDocument): Promise<{
  chunkCount: number;
  costUsd: number;
}>;

// Query (per-question)
async function retrieve(query: string, opts?: {
  topK?: number;             // default 20
  fanOut?: number;           // default 150
  rerank?: boolean;          // default true
}): Promise<RerankedChunk[]>;
```

## What this layer does NOT do

- **Fetch documents** — that's the crawlee layer's job (`subagent-md`,
  `subagent-html`, `subagent-xml`)
- **Sanitize against prompt-injection** — also crawlee (parry hook)
- **Generate the final response** — RAG-stage answer generation is the
  caller's job; we return chunks
- **Re-index on every query** — `indexDocument()` is build-time;
  `retrieve()` is query-time

## Eval harness

Per `develop-tests.md` posture: every retrieval implementation comes with
a test suite. Adopt the blog's metric:

- **Primary**: 1 − recall@20 (lower is better)
- **Targets** (calibrated against blog's reported numbers on similar domains):
  - **Plain embeddings**: ≤ 6.5% (close to 5.7%)
  - **Embeddings + BM25**: ≤ 4.0% (close to 2.9%)
  - **Embeddings + BM25 + Reranker**: ≤ 2.5% (close to 1.9%)

**Eval corpus**: TBD per Wave 2. Candidates: this repo's `docs/`, the
Cowork plugins surveyed in `docs/research/cowork-plugin-connectors.md`,
the Anthropic blog corpus at `claude.com/blog/*`.

**Test placement**: `tests/kb/contextual-retrieval.test.ts` (todo-cases
shipped with the spec; pass when implementation lands).

## Implementation issues (Wave 1)

Each piece becomes one autonomous-orchestrator iteration:

| # | Piece | Effort | Blocking |
|---|---|---|---|
| TBD | chunker | S | nothing |
| TBD | contextualizer | M | chunker; depends on Anthropic SDK with prompt caching |
| TBD | embedder + BM25 indexer | M | contextualizer; depends on Voyage SDK |
| TBD | retriever (RRF fusion) | S | embedder + BM25 |
| TBD | reranker (Cohere) | S | retriever |
| TBD | eval harness with 1−recall@20 metric | M | all of the above; first-pass corpus pinned |

Issues created in this PR (numbers fill in once `gh issue create` lands).

## Cost projection for our actual use case

Rough envelope:

- Document corpus today: ~25 KB across `docs/` (this repo's specs +
  research) + Cowork blog set (~6 posts × 50 KB) + Anthropic engineering
  blog (this one) ≈ 350 KB ≈ 90k tokens
- Cost to contextualize once: 90k tokens × $1.02/1M = **$0.09**
- Re-contextualize on document change: marginal (only changed docs)
- Embeddings (Voyage): 90k tokens × ~$0.02/1M for input ≈ negligible
- Reranking (Cohere): per-query cost at small scale; ~$1 per 1k queries

**Total budget**: well under $1/mo at current corpus size, even with
daily re-indexing. Scales linearly with corpus.

## References to ingest (curated reading list)

User-provided 2026-04-25 PDT alongside the spec source. Each gets pulled
via the appropriate crawlee reader once that reader lands, then annotated
into `docs/research/contextual-retrieval/<slug>.md`. Order = reading
priority for the spec author (high → low).

| # | URL | Reader | Why it's load-bearing |
|---|---|---|---|
| 1 | <https://www.anthropic.com/engineering/contextual-retrieval> | `subagent-html` | The primary source — verbatim quoted by user; re-fetch confirms SHA pin |
| 2 | <https://www.anthropic.com/news/contextual-retrieval> | `subagent-html` | The news-post version of #1; often slight wording differences (catch by diff) |
| 3 | <https://platform.claude.com/cookbook/capabilities-contextual-embeddings-guide> | `subagent-html` | Working-code companion to #1 |
| 4 | <https://github.com/anthropics/claude-cookbooks/blob/main/capabilities/retrieval_augmented_generation/guide.ipynb> | `subagent-md` (after `?raw=true` URL transform) OR direct git clone of `claude-cookbooks` | The authoritative RAG implementation notebook |
| 5 | <https://platform.claude.com/docs/en/build-with-claude/prompt-caching#explicit-cache-breakpoints> | `subagent-md` (URL+`.md` suffix) | Mandatory reading for the contextualizer's economics — explicit cache breakpoints unlock the $1.02 / 1M-tokens cost target |
| 6 | <https://aclanthology.org/W02-0405.pdf> | (PDF; needs PDF→md converter, defer or stage raw) | **The original BM25 paper** (Robertson 2002) — authoritative source for piece 3's lexical index |
| 7 | <https://arxiv.org/pdf/2212.10496> | (PDF; same caveat as #6) | **HyDE** (Hypothetical Document Embeddings) — alternative/complement to the contextualizer prompt; generate a hypothetical answer for the QUERY, embed that instead of the query |
| 8 | <https://www.llamaindex.ai/blog/a-new-document-summary-index-for-llm-powered-qa-systems-9a32ece2f9ec> | `subagent-html` | LlamaIndex's **Document Summary Index** — coarse-to-fine retrieval; different chunking strategy worth comparing against ours |
| 9 | <https://github.com/anthropics/claude-cookbooks/blob/main/misc/prompt_caching.ipynb> | `subagent-md` (raw URL transform) | Working-code companion to #5; concrete `.ipynb` patterns for the cache-breakpoint `cache_control: { type: "ephemeral" }` markers we'll need in the contextualizer |

### Where each reference influences the spec

| Reference | Influences |
|---|---|
| #1 Anthropic engineering blog | All 5 pieces (current spec body) |
| #2 News post | Cross-check #1's claims |
| #3 Cookbook page | Implementation detail for piece 2 (contextualizer) |
| #4 Cookbook notebook | Reference implementation; Voyage + Cohere wiring |
| #5 Prompt caching docs | **Piece 2 economics** — without explicit cache breakpoints the cost projection above (90k tokens × $1.02/1M = $0.09) is wrong by ~10× |
| #9 Prompt caching notebook | Concrete `cache_control` markers + measured cache-hit latency the contextualizer must replicate |
| #6 BM25 paper | Piece 3 — confirms BM25 as the lexical engine; deeper-tuned parameters from the paper may improve on out-of-the-box defaults |
| #7 HyDE paper | **Possible new piece 4.5** — apply HyDE on the query side as an alternative/complement to contextualizer on the chunk side. Open as a research issue. |
| #8 LlamaIndex Document Summary Index | **Possible piece 1 alternative** — coarse-to-fine summary→chunk hierarchy; may complement or replace the current chunker design |

### Tracking issues to open after the readers land

1. **#TBD (research)** — ingest references #1–5, write `docs/research/contextual-retrieval/<slug>.md` with verbatim ≤15-word quotes per copyright + our annotations, deep-link from this spec
2. **#TBD (research)** — read #6 BM25 paper, document any tuning parameters worth adopting beyond defaults, update piece 3
3. **#TBD (research+experiment)** — read #7 HyDE, decide whether to add piece 4.5 (query-side hypothetical document generation) to the pipeline
4. **#TBD (research)** — read #8 LlamaIndex DSI, decide whether to add it as an alternative chunker (`chunker-doc-summary.ts`)

These can't be opened until the readers exist — adding raw issues now
would just be deferred fetch work. Tracked here for when `subagent-html` /
`subagent-md` ship (issues #23, #25).

## Sources

- Anthropic engineering blog (primary): see References to ingest #1
- Voyage AI: <https://www.voyageai.com/> (embeddings + reranker)
- Cohere reranker: <https://cohere.com/rerank>
- BM25: standard IR algorithm; PostgreSQL `tsvector` is the AlloyDB-
  compatible default for our planned stack
- Original BM25 paper: see References to ingest #6
- HyDE paper: see References to ingest #7
- LlamaIndex Document Summary Index: see References to ingest #8
