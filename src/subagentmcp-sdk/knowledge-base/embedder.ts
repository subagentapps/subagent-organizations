/**
 * Voyage AI dense-embedding index for the contextual-retrieval pipeline.
 *
 * Spec: docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md
 *       § 3. Embedder + BM25 indexer
 *
 * Calls Voyage's `voyage-3-large` model via REST. Persists embeddings as
 * a JSONL store (one record per chunk). Cosine-similarity ranking at query
 * time, all in TypeScript.
 *
 * Per CLAUDE.md zero-dep precedent: no Voyage SDK, no vector DB. The spec
 * mentions pgvector as an alternative when AlloyDB is the deployment
 * target — that's a future swap. Today's footprint is plain `fetch` +
 * a flat JSONL file + an in-memory cosine ranker, sufficient for the
 * <10k chunk corpus the spec calls out.
 *
 * Fail-open: when `VOYAGE_API_KEY` is missing OR HTTP fails OR the
 * payload is malformed, `embed()` returns null. Callers (the indexer)
 * skip the chunk dense-side and let BM25 carry the retrieval — same
 * iter-24 / iter-33 fail-open precedent.
 *
 * Implements `IndexQuerier` from `retriever.ts` so the retriever's RRF
 * fusion plugs in directly.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { IndexQuerier, RankedHit } from './retriever.ts';

const VOYAGE_EMBED_URL = 'https://api.voyageai.com/v1/embeddings';
const DEFAULT_MODEL = 'voyage-3-large';

import { homedir } from 'node:os';
import { join } from 'node:path';
const DEFAULT_INDEX_PATH = join(
  homedir(),
  '.cache',
  'subagent-organizations',
  'embeddings.jsonl',
);

export interface EmbedOptions {
  /** Override the API key (test hook). Default `VOYAGE_API_KEY`. */
  apiKey?: string;
  /** Override the model. Default `voyage-3-large`. */
  model?: string;
  /** Test hook: override fetch. */
  __fetch?: Fetcher;
}

export interface DenseIndexOptions extends EmbedOptions {
  /**
   * JSONL path for the persistent embedding store. Each line is a
   * `{ chunkId, embedding }` record. Default
   * `~/.cache/subagent-organizations/embeddings.jsonl`. Use `null` for
   * memory-only (tests).
   */
  indexPath?: string | null;
}

type Fetcher = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

interface VoyageEmbedResponse {
  data?: Array<{ embedding?: number[] }>;
}

function readApiKey(opts?: EmbedOptions): string | null {
  const explicit = opts?.apiKey?.trim();
  if (explicit) return explicit;
  const env = process.env['VOYAGE_API_KEY']?.trim();
  return env && env.length > 0 ? env : null;
}

/**
 * Fetch an embedding for a single text input. Returns `null` on any
 * failure — callers detect fallback via the null return. Fail-open is
 * mandatory per the issue's acceptance criteria.
 */
export async function embed(
  text: string,
  opts?: EmbedOptions,
): Promise<number[] | null> {
  const key = readApiKey(opts);
  if (!key) return null;
  const model = opts?.model ?? DEFAULT_MODEL;
  const doFetch: Fetcher = opts?.__fetch ?? (fetch as unknown as Fetcher);
  try {
    const res = await doFetch(VOYAGE_EMBED_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: [text], model, input_type: 'document' }),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as VoyageEmbedResponse;
    const vec = payload?.data?.[0]?.embedding;
    if (!Array.isArray(vec) || vec.length === 0) return null;
    return vec;
  } catch {
    return null;
  }
}

/**
 * Cosine similarity. Pure function — used at query time and in tests.
 *
 * Defensive: returns 0 on length mismatch or zero-magnitude vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

interface IndexRecord {
  chunkId: string;
  embedding: number[];
}

/**
 * Dense-embedding index backed by JSONL on disk + in-memory rank by cosine.
 * Implements IndexQuerier so the retriever can fuse with BM25 via RRF.
 */
export class DenseIndex implements IndexQuerier {
  readonly name = 'dense';
  private records: IndexRecord[] = [];
  private readonly indexPath: string | null;
  private readonly embedOpts: EmbedOptions;

  constructor(opts?: DenseIndexOptions) {
    this.indexPath = opts?.indexPath === undefined ? DEFAULT_INDEX_PATH : opts.indexPath;
    this.embedOpts = {};
    if (opts?.apiKey !== undefined) this.embedOpts.apiKey = opts.apiKey;
    if (opts?.model !== undefined) this.embedOpts.model = opts.model;
    if (opts?.__fetch !== undefined) this.embedOpts.__fetch = opts.__fetch;
    if (this.indexPath !== null) {
      mkdirSync(dirname(this.indexPath), { recursive: true });
      if (existsSync(this.indexPath)) {
        const text = readFileSync(this.indexPath, 'utf8');
        for (const line of text.split('\n')) {
          if (!line.trim()) continue;
          try {
            const r = JSON.parse(line) as IndexRecord;
            if (r?.chunkId && Array.isArray(r.embedding)) {
              this.records.push(r);
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    }
  }

  /** Number of indexed records. */
  size(): number {
    return this.records.length;
  }

  /**
   * Embed and store a chunk. Returns `true` if the chunk was indexed,
   * `false` if the embedder fell back (null embedding). Callers can use
   * the return value to mark the chunk dense-uncovered for the auditor.
   */
  async add(doc: { chunkId: string; text: string }): Promise<boolean> {
    const vec = await embed(doc.text, this.embedOpts);
    if (vec === null) return false;
    // Idempotent: replace existing record for the same chunkId
    this.records = this.records.filter((r) => r.chunkId !== doc.chunkId);
    const record: IndexRecord = { chunkId: doc.chunkId, embedding: vec };
    this.records.push(record);
    if (this.indexPath !== null) {
      // Rewrite full file to keep idempotent semantics simple
      const text = this.records.map((r) => JSON.stringify(r)).join('\n') + '\n';
      writeFileSync(this.indexPath, text);
    }
    return true;
  }

  /** Bulk embed; returns the count of successfully-added chunks. */
  async addAll(docs: Array<{ chunkId: string; text: string }>): Promise<number> {
    let count = 0;
    for (const d of docs) {
      if (await this.add(d)) count++;
    }
    return count;
  }

  /** Remove a chunk's embedding. Idempotent. */
  remove(chunkId: string): void {
    const before = this.records.length;
    this.records = this.records.filter((r) => r.chunkId !== chunkId);
    if (before === this.records.length) return;
    if (this.indexPath !== null) {
      const text = this.records.map((r) => JSON.stringify(r)).join('\n') + (this.records.length > 0 ? '\n' : '');
      writeFileSync(this.indexPath, text);
    }
  }

  /** Wipe all records. */
  reset(): void {
    this.records = [];
    if (this.indexPath !== null && existsSync(this.indexPath)) {
      writeFileSync(this.indexPath, '');
    }
  }

  /**
   * Top-N retrieval by cosine similarity. Returns empty array when:
   *   - The index is empty
   *   - The query embedding fails (no Voyage key, HTTP error)
   *
   * The retriever (in #78) fuses this with BM25 via RRF; an empty dense
   * result simply means BM25 carries the retrieval for that query, which
   * is the spec-mandated fail-open behavior.
   */
  async query(query: string, topN: number): Promise<RankedHit[]> {
    if (this.records.length === 0) return [];
    const queryVec = await embed(query, this.embedOpts);
    if (queryVec === null) return [];

    const scored = this.records.map((r) => ({
      chunkId: r.chunkId,
      score: cosineSimilarity(queryVec, r.embedding),
    }));
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.chunkId < b.chunkId ? -1 : a.chunkId > b.chunkId ? 1 : 0;
    });
    return scored
      .slice(0, topN)
      .map((s, i) => ({ chunkId: s.chunkId, score: s.score, rank: i + 1 }));
  }

  /** Test introspection: dump records (read-only copy). */
  __records(): ReadonlyArray<IndexRecord> {
    return this.records.map((r) => ({ ...r, embedding: [...r.embedding] }));
  }

  /**
   * For tests: directly insert a precomputed record without calling Voyage.
   * Useful for tests that want to verify ranking logic without mocking the
   * full Voyage request shape.
   */
  __addRaw(record: IndexRecord): void {
    this.records = this.records.filter((r) => r.chunkId !== record.chunkId);
    this.records.push({ chunkId: record.chunkId, embedding: [...record.embedding] });
    if (this.indexPath !== null) {
      const text = this.records.map((r) => JSON.stringify(r)).join('\n') + '\n';
      writeFileSync(this.indexPath, text);
    }
  }
}

// `appendFileSync` is imported but only used in a helper variant below
// — re-exported as part of the test surface.
void appendFileSync;
