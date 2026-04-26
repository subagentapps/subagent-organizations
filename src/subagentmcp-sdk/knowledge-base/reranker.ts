/**
 * Cohere reranker for the contextual-retrieval pipeline.
 *
 * Spec: docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md
 *       § 5. Reranker
 *
 * Calls Cohere's `rerank-3.5` endpoint via REST when `COHERE_API_KEY` is
 * present. Fail-open when the key is missing OR HTTP fails OR the payload
 * is malformed: returns the retriever's input order truncated to top-N
 * with `rerankerScore: null`. Same iter-24 parry-scan precedent: interface
 * + fallback ships now; the real Cohere account-creation is a runtime gate
 * that activates when the token appears.
 *
 * Per CLAUDE.md "TypeScript reference catalog" framing: no Cohere SDK dep —
 * plain `fetch` against the REST endpoint.
 */

import type { RetrievalCandidate } from './retriever.ts';

const COHERE_RERANK_URL = 'https://api.cohere.ai/v2/rerank';
const DEFAULT_MODEL = 'rerank-v3.5';
const DEFAULT_TOP_N = 20;

/**
 * Caller-provided lookup that returns the text + optional contextPreamble
 * for a chunk by ID. Decouples the reranker from the chunker / contextualizer
 * concrete implementations — tests stub this freely.
 */
export interface ChunkTextLookup {
  /** Returns `null` for unknown IDs. */
  textFor(chunkId: string): {
    text: string;
    contextPreamble?: string | null;
  } | null;
}

/**
 * One element of the reranker's output. Surfaces every score from the
 * pipeline so callers can audit which stage contributed what.
 */
export interface RerankedChunk {
  chunkId: string;
  /** Original chunk text (what the LLM actually sees). */
  text: string;
  /** Contextualizer preamble if the chunk has been contextualized; else null. */
  contextPreamble: string | null;
  /** Native dense (cosine) score from the embedder, if any. */
  denseScore: number | null;
  /** Native BM25 score from the lexical index, if any. */
  lexicalScore: number | null;
  /** RRF score from the retriever. */
  fusedScore: number;
  /**
   * Cohere rerank score. `null` when the reranker fell back (no key, HTTP
   * failure, malformed payload). Callers can detect fallback via this field.
   */
  rerankerScore: number | null;
  /** Final 0-based position in the reranked list. */
  finalRank: number;
}

export interface RerankOptions {
  /** Cap output. Default 20 per spec / blog. */
  topN?: number;
  /** Cohere model. Default `rerank-v3.5`. */
  model?: string;
  /** Override key path for tests / power-users. Default reads `COHERE_API_KEY`. */
  apiKey?: string;
  /** Test hook: override fetch. */
  __fetch?: Fetcher;
}

type Fetcher = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Cohere rerank API response shape (subset we consume). */
interface CohereRerankResponse {
  results: Array<{
    index: number;
    relevance_score: number;
  }>;
}

/**
 * Pull the API key from `opts.apiKey` first, then `COHERE_API_KEY` env.
 * Returns null when both are absent / blank.
 */
function readApiKey(opts?: RerankOptions): string | null {
  if (opts?.apiKey && opts.apiKey.trim()) return opts.apiKey.trim();
  const env = process.env['COHERE_API_KEY']?.trim();
  return env && env.length > 0 ? env : null;
}

/**
 * Truncate the candidates to top-N and emit `RerankedChunk[]` using the
 * caller's lookup. Used both as the fallback path and as the post-rerank
 * shape constructor.
 */
function toRerankedChunks(
  candidates: RetrievalCandidate[],
  lookup: ChunkTextLookup,
  topN: number,
  rerankerScores: Map<string, number> | null,
): RerankedChunk[] {
  const out: RerankedChunk[] = [];
  for (let i = 0; i < candidates.length && out.length < topN; i++) {
    const c = candidates[i]!;
    const txt = lookup.textFor(c.chunkId);
    if (!txt) continue;
    out.push({
      chunkId: c.chunkId,
      text: txt.text,
      contextPreamble: txt.contextPreamble ?? null,
      denseScore: c.denseScore,
      lexicalScore: c.lexicalScore,
      fusedScore: c.fusedScore,
      rerankerScore: rerankerScores?.get(c.chunkId) ?? null,
      finalRank: out.length,
    });
  }
  return out;
}

/**
 * Rerank candidates via Cohere `rerank-v3.5`. Fails open: any error path
 * (missing key, HTTP non-2xx, throw, bad payload) returns the original
 * order truncated to `topN` with `rerankerScore: null`.
 *
 * The fail-open path is the SAME shape as the success path — callers
 * detect fallback by checking whether any element has
 * `rerankerScore === null`.
 */
export async function rerank(
  query: string,
  candidates: RetrievalCandidate[],
  lookup: ChunkTextLookup,
  opts?: RerankOptions,
): Promise<RerankedChunk[]> {
  const topN = opts?.topN ?? DEFAULT_TOP_N;
  if (topN <= 0) throw new Error(`topN must be > 0, got ${topN}`);
  if (candidates.length === 0) return [];

  const key = readApiKey(opts);
  if (!key) {
    return toRerankedChunks(candidates, lookup, topN, null);
  }

  // Build the documents list in the same order as candidates so the
  // response's `index` field maps back cleanly.
  const documents: string[] = [];
  const indexToChunkId: string[] = [];
  for (const c of candidates) {
    const txt = lookup.textFor(c.chunkId);
    if (!txt) continue;
    documents.push(
      txt.contextPreamble ? `${txt.contextPreamble}\n\n${txt.text}` : txt.text,
    );
    indexToChunkId.push(c.chunkId);
  }
  if (documents.length === 0) return [];

  const doFetch: Fetcher = opts?.__fetch ?? (fetch as unknown as Fetcher);
  let scores: Map<string, number> | null = null;
  try {
    const res = await doFetch(COHERE_RERANK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts?.model ?? DEFAULT_MODEL,
        query,
        documents,
        top_n: topN,
      }),
    });
    if (!res.ok) {
      return toRerankedChunks(candidates, lookup, topN, null);
    }
    const payload = (await res.json()) as CohereRerankResponse;
    if (!payload || !Array.isArray(payload.results)) {
      return toRerankedChunks(candidates, lookup, topN, null);
    }
    scores = new Map();
    // Build a re-ordered candidate list according to Cohere's results.
    const reordered: RetrievalCandidate[] = [];
    const seen = new Set<string>();
    for (const r of payload.results) {
      const chunkId = indexToChunkId[r.index];
      if (!chunkId || seen.has(chunkId)) continue;
      const orig = candidates.find((c) => c.chunkId === chunkId);
      if (!orig) continue;
      reordered.push(orig);
      seen.add(chunkId);
      scores.set(chunkId, r.relevance_score);
    }
    return toRerankedChunks(reordered, lookup, topN, scores);
  } catch {
    return toRerankedChunks(candidates, lookup, topN, null);
  }
}
