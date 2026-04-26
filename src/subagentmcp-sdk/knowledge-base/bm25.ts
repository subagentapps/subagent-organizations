/**
 * BM25 lexical index for the contextual-retrieval pipeline.
 *
 * Spec: docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md
 *       § 3. Embedder + BM25 indexer
 *
 * Pure-TS Okapi BM25 implementation over a bun:sqlite-backed inverted index.
 * Persistent across process restarts; deterministic ranking; no external
 * dependencies beyond bun:sqlite (which is built in).
 *
 * The spec accepts PostgreSQL `tsvector` as an alternative when the
 * deployment matches AlloyDB's stack — that's a future swap. Today's
 * footprint is Bun-native + zero deps, consistent with iter-25's
 * _bloom-cache.ts decision.
 *
 * Implements `IndexQuerier` from `retriever.ts` so the retriever's RRF
 * fusion plugs in directly.
 */

import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { IndexQuerier, RankedHit } from './retriever.ts';

/** Standard Okapi BM25 parameters; defaults match Lucene/Elasticsearch. */
const DEFAULT_K1 = 1.2;
const DEFAULT_B = 0.75;

export interface BM25Options {
  /** Term-frequency saturation. Default 1.2. */
  k1?: number;
  /** Length normalization. Default 0.75. */
  b?: number;
  /**
   * SQLite path for persistence. Use `:memory:` for tests / ephemeral.
   * Default: `~/.cache/subagent-organizations/bm25.sqlite`.
   */
  dbPath?: string;
}

/** Single document indexed in BM25. */
export interface BM25Document {
  chunkId: string;
  /** Pre-tokenization text — typically `${preamble}\n\n${chunkText}`. */
  text: string;
}

import { homedir } from 'node:os';
import { join } from 'node:path';
const DEFAULT_DB_PATH = join(
  homedir(),
  '.cache',
  'subagent-organizations',
  'bm25.sqlite',
);

/**
 * Tokenize text into lowercase ASCII word terms. Strips punctuation,
 * keeps alphanumerics, splits on whitespace.
 *
 * Deliberately simple — non-English / inflection / stemming are out of
 * scope at this stage. Matches Anthropic's blog's "naive BM25 baseline"
 * before contextualization adds the retrieval gain.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * BM25 lexical index. Persistent via bun:sqlite. Implements `IndexQuerier`.
 *
 * Schema:
 *   docs(chunkId TEXT PK, length INTEGER NOT NULL)
 *   postings(term TEXT, chunkId TEXT, tf INTEGER NOT NULL, PRIMARY KEY(term, chunkId))
 *   stats(key TEXT PK, value REAL NOT NULL)  -- 'doc_count', 'sum_lengths'
 */
export class BM25Index implements IndexQuerier {
  readonly name = 'bm25';
  private readonly db: Database;
  private readonly k1: number;
  private readonly b: number;

  constructor(opts?: BM25Options) {
    this.k1 = opts?.k1 ?? DEFAULT_K1;
    this.b = opts?.b ?? DEFAULT_B;
    const dbPath = opts?.dbPath ?? DEFAULT_DB_PATH;
    if (dbPath !== ':memory:') {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS docs (
        chunkId TEXT PRIMARY KEY,
        length INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS postings (
        term TEXT NOT NULL,
        chunkId TEXT NOT NULL,
        tf INTEGER NOT NULL,
        PRIMARY KEY (term, chunkId)
      );
      CREATE INDEX IF NOT EXISTS idx_postings_term ON postings(term);
      CREATE TABLE IF NOT EXISTS stats (
        key TEXT PRIMARY KEY,
        value REAL NOT NULL
      );
    `);
    if (this.docCount() === 0) {
      this.setStat('doc_count', 0);
      this.setStat('sum_lengths', 0);
    }
  }

  private setStat(key: string, value: number): void {
    this.db
      .query<unknown, [string, number]>(
        `INSERT INTO stats(key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      )
      .run(key, value);
  }

  private getStat(key: string): number {
    const row = this.db
      .query<{ value: number }, [string]>(
        'SELECT value FROM stats WHERE key = ?',
      )
      .get(key);
    return row?.value ?? 0;
  }

  /** Total documents currently indexed. */
  docCount(): number {
    const row = this.db
      .query<{ c: number }, []>('SELECT COUNT(*) AS c FROM docs')
      .get();
    return row?.c ?? 0;
  }

  /** Mean document length in tokens — used in the BM25 length-norm term. */
  avgDocLength(): number {
    const n = this.docCount();
    if (n === 0) return 0;
    return this.getStat('sum_lengths') / n;
  }

  /** Insert or replace one document. Idempotent for the same chunkId. */
  add(doc: BM25Document): void {
    const tokens = tokenize(doc.text);
    const length = tokens.length;
    // Compute term frequencies in this doc
    const tf = new Map<string, number>();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
    }
    // If the doc already exists, remove its old postings + length first
    // so we maintain stats correctly under re-add.
    const existing = this.db
      .query<{ length: number }, [string]>(
        'SELECT length FROM docs WHERE chunkId = ?',
      )
      .get(doc.chunkId);
    if (existing) {
      this.db
        .query<unknown, [string]>('DELETE FROM postings WHERE chunkId = ?')
        .run(doc.chunkId);
      this.db
        .query<unknown, [string]>('DELETE FROM docs WHERE chunkId = ?')
        .run(doc.chunkId);
      this.setStat('doc_count', this.getStat('doc_count') - 1);
      this.setStat('sum_lengths', this.getStat('sum_lengths') - existing.length);
    }
    // Insert new
    this.db
      .query<unknown, [string, number]>(
        'INSERT INTO docs(chunkId, length) VALUES (?, ?)',
      )
      .run(doc.chunkId, length);
    const insertPosting = this.db.query<unknown, [string, string, number]>(
      'INSERT INTO postings(term, chunkId, tf) VALUES (?, ?, ?)',
    );
    for (const [term, count] of tf) {
      insertPosting.run(term, doc.chunkId, count);
    }
    this.setStat('doc_count', this.getStat('doc_count') + 1);
    this.setStat('sum_lengths', this.getStat('sum_lengths') + length);
  }

  /** Bulk-add documents in a single transaction (faster). */
  addAll(docs: BM25Document[]): void {
    this.db.transaction(() => {
      for (const d of docs) this.add(d);
    })();
  }

  /** Remove a document. Idempotent for already-absent chunkIds. */
  remove(chunkId: string): void {
    const existing = this.db
      .query<{ length: number }, [string]>(
        'SELECT length FROM docs WHERE chunkId = ?',
      )
      .get(chunkId);
    if (!existing) return;
    this.db
      .query<unknown, [string]>('DELETE FROM postings WHERE chunkId = ?')
      .run(chunkId);
    this.db
      .query<unknown, [string]>('DELETE FROM docs WHERE chunkId = ?')
      .run(chunkId);
    this.setStat('doc_count', this.getStat('doc_count') - 1);
    this.setStat('sum_lengths', this.getStat('sum_lengths') - existing.length);
  }

  /** Wipe all documents and reset stats. */
  reset(): void {
    this.db.exec('DELETE FROM postings; DELETE FROM docs; DELETE FROM stats;');
    this.setStat('doc_count', 0);
    this.setStat('sum_lengths', 0);
  }

  /** Compute IDF for one term. log((N - df + 0.5) / (df + 0.5) + 1). */
  idf(term: string): number {
    const N = this.docCount();
    if (N === 0) return 0;
    const row = this.db
      .query<{ df: number }, [string]>(
        'SELECT COUNT(*) AS df FROM postings WHERE term = ?',
      )
      .get(term);
    const df = row?.df ?? 0;
    return Math.log(1 + (N - df + 0.5) / (df + 0.5));
  }

  /**
   * BM25 score for one document on one query (sum of per-term contributions).
   * Used by `query()` — exposed for unit tests.
   */
  score(query: string, chunkId: string): number {
    const queryTerms = tokenize(query);
    const doc = this.db
      .query<{ length: number }, [string]>(
        'SELECT length FROM docs WHERE chunkId = ?',
      )
      .get(chunkId);
    if (!doc) return 0;
    const avgdl = this.avgDocLength() || 1;
    let sum = 0;
    const getTf = this.db.query<{ tf: number }, [string, string]>(
      'SELECT tf FROM postings WHERE term = ? AND chunkId = ?',
    );
    for (const term of new Set(queryTerms)) {
      const tfRow = getTf.get(term, chunkId);
      const tf = tfRow?.tf ?? 0;
      if (tf === 0) continue;
      const idf = this.idf(term);
      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + this.b * (doc.length / avgdl));
      sum += idf * (numerator / denominator);
    }
    return sum;
  }

  /**
   * Top-N retrieval. Returns RankedHit[] sorted by descending BM25 score.
   * Ties broken by chunkId (lexicographic ascending) for determinism.
   */
  async query(query: string, topN: number): Promise<RankedHit[]> {
    const queryTerms = [...new Set(tokenize(query))];
    if (queryTerms.length === 0 || this.docCount() === 0) return [];

    // Collect candidate chunkIds: any doc that contains at least one query term.
    const placeholders = queryTerms.map(() => '?').join(', ');
    const rows = this.db
      .query<{ chunkId: string }, string[]>(
        `SELECT DISTINCT chunkId FROM postings WHERE term IN (${placeholders})`,
      )
      .all(...queryTerms);
    const candidates = rows.map((r) => r.chunkId);

    const scored = candidates.map((chunkId) => ({
      chunkId,
      score: this.score(query, chunkId),
    }));
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.chunkId < b.chunkId ? -1 : a.chunkId > b.chunkId ? 1 : 0;
    });
    return scored
      .slice(0, topN)
      .map((s, i) => ({ chunkId: s.chunkId, score: s.score, rank: i + 1 }));
  }

  /** Close the SQLite handle. Tests must call this for in-memory DBs. */
  close(): void {
    this.db.close();
  }
}
