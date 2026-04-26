/**
 * Bloom-filter + SQLite content cache.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *       § Bloom filter design
 *
 * Two-tier:
 *   - Bloom filter: ~120KB for 100k items at 1% FP, lives in memory.
 *     "Definitely not seen" → skip SQLite read entirely.
 *   - SQLite: persistent payload store for content the bloom recognizes.
 *
 * Per CLAUDE.md "TypeScript reference catalog" framing:
 *
 * - **No `bloom-filters` npm dep.** A bloom filter is a deterministic
 *   algorithm; the inline implementation here is ~80 LOC. Pulling in the
 *   npm package would 2× the install size for a class with 4 methods.
 * - **No `better-sqlite3` dep.** Bun ships `bun:sqlite` natively. The two
 *   APIs are similar enough that swapping in better-sqlite3 in a Node
 *   port would be mechanical.
 *
 * Per CLAUDE.md #2: this file mirrors the spec's `Bloom filter design`
 * section. Update the spec first if changing field shapes.
 */

import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/** Spec § "What gets cached on a BLOCK" — discriminated by `kind`. */
export type BloomEntry =
  | {
      kind: 'content';
      markdown: string;
      parryScore: number | null;
      fetchedAt: string;
    }
  | {
      kind: 'blocked';
      reason: string;
      parryScore: number | null;
      fetchedAt: string;
    };

export interface BloomCacheOptions {
  /** Default 100k. Affects bloom-filter sizing. */
  expectedItems?: number;
  /** Default 0.01 (1%). Lower = more memory. */
  fpRate?: number;
  /**
   * SQLite database path. Use `:memory:` for tests. Default
   * `~/.cache/subagent-organizations/bloom-cache.sqlite`. Parent dirs are
   * created on demand.
   */
  dbPath?: string;
}

/** Default ~/.cache path; per spec § Bloom filter design. */
import { homedir } from 'node:os';
import { join } from 'node:path';
const DEFAULT_DB_PATH = join(
  homedir(),
  '.cache',
  'subagent-organizations',
  'bloom-cache.sqlite',
);

/**
 * Two 32-bit hashes derived from a string via FNV-1a (h1) and DJB2 (h2).
 * Used with double-hashing: `h_i(x) = (h1 + i*h2) mod m`. Avoids running
 * k separate cryptographic hashes per insert/lookup.
 */
function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function djb2_32(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * Inline bloom filter. Backed by a Uint8Array bit-vector. Exposes only
 * what `BloomCache` needs: `has`, `add`, `reset`, plus internals
 * (`__indices`, `__bits`) for tests.
 */
export class BloomFilter {
  private readonly bits: Uint8Array;
  private readonly mBits: number;
  private readonly k: number;

  constructor(expectedItems: number, fpRate: number) {
    if (expectedItems <= 0) throw new Error('expectedItems must be > 0');
    if (fpRate <= 0 || fpRate >= 1) throw new Error('fpRate must be in (0,1)');
    // m = -n * ln(p) / (ln 2)^2
    const m = Math.ceil((-expectedItems * Math.log(fpRate)) / Math.LN2 ** 2);
    // k = (m/n) * ln 2; clamp to [1, 32] for sanity.
    const k = Math.max(1, Math.min(32, Math.round((m / expectedItems) * Math.LN2)));
    this.mBits = m;
    this.k = k;
    this.bits = new Uint8Array(Math.ceil(m / 8));
  }

  /** Indices that bit `key` maps to. Used by has + add + tests. */
  __indices(key: string): number[] {
    const h1 = fnv1a32(key);
    const h2 = djb2_32(key) || 1; // ensure h2 != 0 to avoid degenerate cycles
    const out: number[] = [];
    for (let i = 0; i < this.k; i++) {
      // (h1 + i*h2) mod mBits, computed without overflow risk
      const idx = (h1 + Math.imul(i, h2)) >>> 0;
      out.push(idx % this.mBits);
    }
    return out;
  }

  has(key: string): boolean {
    const indices = this.__indices(key);
    for (const idx of indices) {
      if (!this.__bitSet(idx)) return false;
    }
    return true;
  }

  add(key: string): void {
    for (const idx of this.__indices(key)) {
      this.__setBit(idx);
    }
  }

  reset(): void {
    this.bits.fill(0);
  }

  __bitSet(idx: number): boolean {
    return (this.bits[idx >>> 3]! & (1 << (idx & 7))) !== 0;
  }

  private __setBit(idx: number): void {
    this.bits[idx >>> 3]! |= 1 << (idx & 7);
  }

  /** Test introspection: number of set bits. */
  __popcount(): number {
    let c = 0;
    for (const byte of this.bits) {
      let b = byte;
      while (b) {
        b &= b - 1;
        c++;
      }
    }
    return c;
  }

  /** Test introspection: filter sizing. */
  get size(): { mBits: number; k: number; bytes: number } {
    return { mBits: this.mBits, k: this.k, bytes: this.bits.length };
  }
}

/**
 * Two-tier cache backing the readers' dedup + persistence.
 *
 * Layered semantics:
 *   - `has(key)`        → bloom only; fast, allows false-positives
 *   - `get(key)`        → bloom miss returns null without touching SQLite;
 *                         bloom hit consults SQLite for the real payload
 *   - `put(key, entry)` → SQLite first, then `bloom.add(key)`
 *   - `add(key)`        → bloom-only mark (used by stage flags that don't
 *                         have a payload yet, e.g., URL-seen-but-fetching)
 *
 * SQLite schema:
 *   CREATE TABLE entries (
 *     key TEXT PRIMARY KEY,
 *     payload TEXT NOT NULL,    -- JSON-serialized BloomEntry
 *     fetched_at TEXT NOT NULL  -- ISO8601, redundant with payload but indexable
 *   )
 *
 * The bloom is rebuilt from SQLite on every constructor call so a process
 * restart doesn't lose dedup state. The cost is one full-table scan at
 * startup; for 100k entries that's ~50ms.
 */
export class BloomCache {
  private readonly bloom: BloomFilter;
  private readonly db: Database;

  constructor(opts?: BloomCacheOptions) {
    const expectedItems = opts?.expectedItems ?? 100_000;
    const fpRate = opts?.fpRate ?? 0.01;
    const dbPath = opts?.dbPath ?? DEFAULT_DB_PATH;

    this.bloom = new BloomFilter(expectedItems, fpRate);

    if (dbPath !== ':memory:') {
      mkdirSync(dirname(dbPath), { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        key TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        fetched_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_entries_fetched_at ON entries(fetched_at);
    `);

    // Rebuild bloom from SQLite so a restart preserves dedup state.
    const rows = this.db.query<{ key: string }, []>(
      'SELECT key FROM entries',
    ).all();
    for (const r of rows) this.bloom.add(r.key);
  }

  /** Bloom-only "seen" check. False-positives are acceptable per spec. */
  has(key: string): boolean {
    return this.bloom.has(key);
  }

  /** Mark a key as seen without storing a payload. */
  add(key: string): void {
    this.bloom.add(key);
  }

  /**
   * Look up the payload for `key`. Returns null if:
   *   - bloom says definitely-not-seen, or
   *   - bloom says maybe-seen but SQLite has no row (false-positive)
   */
  get(key: string): BloomEntry | null {
    if (!this.bloom.has(key)) return null;
    const row = this.db
      .query<{ payload: string }, [string]>(
        'SELECT payload FROM entries WHERE key = ?',
      )
      .get(key);
    if (!row) return null;
    try {
      return JSON.parse(row.payload) as BloomEntry;
    } catch {
      return null;
    }
  }

  /** Store a fresh fetch. SQLite first, then bloom.add. */
  put(key: string, entry: BloomEntry): void {
    const payload = JSON.stringify(entry);
    this.db
      .query<unknown, [string, string, string]>(
        `INSERT INTO entries(key, payload, fetched_at) VALUES (?,?,?)
         ON CONFLICT(key) DO UPDATE SET payload=excluded.payload, fetched_at=excluded.fetched_at`,
      )
      .run(key, payload, entry.fetchedAt);
    this.bloom.add(key);
  }

  /** Test/admin reset. Wipes both layers. */
  reset(): void {
    this.bloom.reset();
    this.db.exec('DELETE FROM entries');
  }

  /** Test introspection. */
  get __bloom(): BloomFilter {
    return this.bloom;
  }

  /** Test introspection: row count via SQLite. */
  __sqliteCount(): number {
    const row = this.db
      .query<{ c: number }, []>('SELECT COUNT(*) AS c FROM entries')
      .get();
    return row?.c ?? 0;
  }

  /** Close the SQLite connection. Tests must call this for in-memory DBs. */
  close(): void {
    this.db.close();
  }
}
