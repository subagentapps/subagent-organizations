/**
 * Reciprocal Rank Fusion retriever for the contextual-retrieval pipeline.
 *
 * Spec: docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md
 *       § 4. Retriever
 *
 * Pure function: takes top-N hits from each of dense + lexical indexes,
 * fuses via RRF (k=60 standard), returns top-150 unique chunk IDs ranked
 * by fused score.
 *
 * Per CLAUDE.md "TypeScript reference catalog" framing: zero-dep, sortable
 * with the standard library.
 *
 * Decoupled from #77 (embedder + BM25) via the `IndexQuerier` interface —
 * any concrete index that returns `RankedHit[]` for a query can be plugged
 * in. Tests use stub queriers; production wires Voyage AI + tsvector or
 * an in-memory BM25.
 */

/**
 * One hit from a single index. `score` is the index-native score (cosine
 * similarity for dense, BM25 score for lexical). `rank` is 1-based position
 * within that index's results for the query — RRF only uses rank, but we
 * carry score for debugging.
 */
export interface RankedHit {
  /** Chunk ID — same value space as `Chunk.id` from the chunker. */
  chunkId: string;
  /** Native score from the index (kept for debugging, not used by RRF). */
  score: number;
  /** 1-based rank within this index's results for the query. */
  rank: number;
}

/**
 * One element of the retriever's output. Surfaces both index-native scores
 * for debugging plus the fused score actually used for ranking.
 */
export interface RetrievalCandidate {
  chunkId: string;
  /** Sum of `1/(k+rank)` contributions across the indexes that found this chunk. */
  fusedScore: number;
  /** Native dense score (cosine similarity) if found in dense; else null. */
  denseScore: number | null;
  /** Native lexical score (BM25) if found in lexical; else null. */
  lexicalScore: number | null;
  /** Rank within the dense index, or null if not found there. */
  denseRank: number | null;
  /** Rank within the lexical index, or null if not found there. */
  lexicalRank: number | null;
}

export interface FuseOptions {
  /** RRF damping constant. Default 60 per the spec / standard practice. */
  k?: number;
  /** Cap output at top-N. Default 150 per the spec (reranker fan-in). */
  topN?: number;
}

const DEFAULT_K = 60;
const DEFAULT_TOP_N = 150;

/**
 * Compute the RRF score for a chunk that appeared at `rank` in some index.
 *
 *     contribution = 1 / (k + rank)
 *
 * `rank` is 1-based per RRF convention (the original Cormack et al. paper
 * uses 1-indexed ranks).
 */
export function rrfContribution(rank: number, k = DEFAULT_K): number {
  if (!Number.isInteger(rank) || rank < 1) {
    throw new Error(`rank must be a positive integer, got ${rank}`);
  }
  return 1 / (k + rank);
}

/**
 * Fuse two ranked lists via Reciprocal Rank Fusion. Pure function — no
 * I/O, no randomness; same input → same output, every call.
 *
 * Tie-breaking when two candidates have identical `fusedScore`:
 *   1. Whichever has a higher dense score wins
 *   2. If dense ties (or both null), higher lexical score wins
 *   3. If both score buckets tie, lexicographic chunkId order
 *
 * The deterministic tie-breaker matters because the eval harness in #80
 * needs reproducible top-20 lists across runs.
 */
export function fuseRankings(
  dense: RankedHit[],
  lexical: RankedHit[],
  opts?: FuseOptions,
): RetrievalCandidate[] {
  const k = opts?.k ?? DEFAULT_K;
  const topN = opts?.topN ?? DEFAULT_TOP_N;
  if (k <= 0) throw new Error(`k must be > 0, got ${k}`);
  if (topN <= 0) throw new Error(`topN must be > 0, got ${topN}`);

  // Map: chunkId → in-progress candidate. We add contributions as we walk
  // each list, then sort + cap at the end.
  const byId = new Map<string, RetrievalCandidate>();

  function record(
    hits: RankedHit[],
    side: 'dense' | 'lexical',
  ): void {
    for (const hit of hits) {
      let candidate = byId.get(hit.chunkId);
      if (!candidate) {
        candidate = {
          chunkId: hit.chunkId,
          fusedScore: 0,
          denseScore: null,
          lexicalScore: null,
          denseRank: null,
          lexicalRank: null,
        };
        byId.set(hit.chunkId, candidate);
      }
      candidate.fusedScore += rrfContribution(hit.rank, k);
      if (side === 'dense') {
        candidate.denseScore = hit.score;
        candidate.denseRank = hit.rank;
      } else {
        candidate.lexicalScore = hit.score;
        candidate.lexicalRank = hit.rank;
      }
    }
  }

  record(dense, 'dense');
  record(lexical, 'lexical');

  const all = [...byId.values()];
  all.sort((a, b) => {
    if (b.fusedScore !== a.fusedScore) return b.fusedScore - a.fusedScore;
    const ad = a.denseScore ?? -Infinity;
    const bd = b.denseScore ?? -Infinity;
    if (bd !== ad) return bd - ad;
    const al = a.lexicalScore ?? -Infinity;
    const bl = b.lexicalScore ?? -Infinity;
    if (bl !== al) return bl - al;
    return a.chunkId < b.chunkId ? -1 : a.chunkId > b.chunkId ? 1 : 0;
  });

  return all.slice(0, topN);
}

/**
 * Pluggable index. Concrete implementations land in #77 (embedder + BM25)
 * and elsewhere; the retriever consumes only this interface so its tests
 * can stub freely.
 */
export interface IndexQuerier {
  /** Index identifier — used in logs / debug output. */
  readonly name: string;
  /**
   * Look up the top-N chunks for the query. Implementations are expected
   * to return at most `topN` hits, ranked 1..N (1 = best). Order should
   * be stable for the same query.
   */
  query(query: string, topN: number): Promise<RankedHit[]>;
}

export interface RetrieveOptions extends FuseOptions {
  /** Per-index fan-out before fusion. Default 150. */
  perIndexTopN?: number;
}

/**
 * Run a query through both indexes in parallel, fuse the results, return
 * the top-N candidates.
 */
export async function retrieve(
  query: string,
  dense: IndexQuerier,
  lexical: IndexQuerier,
  opts?: RetrieveOptions,
): Promise<RetrievalCandidate[]> {
  const perIndexTopN = opts?.perIndexTopN ?? DEFAULT_TOP_N;
  const [denseHits, lexicalHits] = await Promise.all([
    dense.query(query, perIndexTopN),
    lexical.query(query, perIndexTopN),
  ]);
  const fuseOpts: FuseOptions = {};
  if (opts?.k !== undefined) fuseOpts.k = opts.k;
  if (opts?.topN !== undefined) fuseOpts.topN = opts.topN;
  return fuseRankings(denseHits, lexicalHits, fuseOpts);
}
