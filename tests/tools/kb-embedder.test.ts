/**
 * Unit tests for `src/subagentmcp-sdk/knowledge-base/embedder.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md
 *       § 3. Embedder + BM25 indexer
 *
 * Network is replaced via `__fetch`; api key via `apiKey` option so tests
 * don't depend on env state.
 */

import { afterEach, describe, expect, test } from 'bun:test';
import {
  embed,
  cosineSimilarity,
  DenseIndex,
  type EmbedOptions,
  type DenseIndexOptions,
} from '../../src/subagentmcp-sdk/knowledge-base/embedder.ts';

const HOLD: DenseIndex[] = [];
afterEach(() => {
  HOLD.length = 0;
});

function fresh(opts?: DenseIndexOptions): DenseIndex {
  const idx = new DenseIndex({ indexPath: null, ...opts });
  HOLD.push(idx);
  return idx;
}

function mockFetch(
  responses: Array<
    | { ok: true; json: unknown }
    | { ok: false; status: number }
    | { throw: Error }
  >,
): {
  fetcher: NonNullable<EmbedOptions['__fetch']>;
  calls: Array<{ url: string; init?: unknown }>;
} {
  const calls: Array<{ url: string; init?: unknown }> = [];
  let i = 0;
  const fetcher: NonNullable<EmbedOptions['__fetch']> = (url, init) => {
    calls.push({ url, init });
    const r = responses[i++];
    if (!r) throw new Error(`mockFetch exhausted at call ${i}`);
    if ('throw' in r) throw r.throw;
    if (r.ok) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(r.json),
      });
    }
    return Promise.resolve({
      ok: false,
      status: r.status,
      json: () => Promise.resolve({}),
    });
  };
  return { fetcher, calls };
}

function vec(...n: number[]): number[] {
  return n;
}

describe('cosineSimilarity', () => {
  test('identical vectors → 1', () => {
    expect(cosineSimilarity(vec(1, 0, 0), vec(1, 0, 0))).toBeCloseTo(1, 10);
  });
  test('orthogonal vectors → 0', () => {
    expect(cosineSimilarity(vec(1, 0), vec(0, 1))).toBeCloseTo(0, 10);
  });
  test('opposite vectors → -1', () => {
    expect(cosineSimilarity(vec(1, 0), vec(-1, 0))).toBeCloseTo(-1, 10);
  });
  test('length mismatch → 0', () => {
    expect(cosineSimilarity(vec(1), vec(1, 1))).toBe(0);
  });
  test('empty → 0', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });
  test('zero-magnitude → 0', () => {
    expect(cosineSimilarity(vec(0, 0), vec(1, 1))).toBe(0);
  });
});

describe('embed — fail-open paths', () => {
  test('missing api key + no env → null', async () => {
    const result = await embed('hello', {
      apiKey: '',
      __fetch: () => {
        throw new Error('should not call fetch with no key');
      },
    });
    expect(result).toBeNull();
  });

  test('whitespace-only api key treated as missing', async () => {
    const result = await embed('hello', {
      apiKey: '   ',
      __fetch: () => {
        throw new Error('should not call fetch');
      },
    });
    expect(result).toBeNull();
  });

  test('HTTP 503 → null', async () => {
    const m = mockFetch([{ ok: false, status: 503 }]);
    const result = await embed('hello', { apiKey: 'pa_xxx', __fetch: m.fetcher });
    expect(result).toBeNull();
  });

  test('network throw → null', async () => {
    const m = mockFetch([{ throw: new Error('econnrefused') }]);
    const result = await embed('hello', { apiKey: 'pa_xxx', __fetch: m.fetcher });
    expect(result).toBeNull();
  });

  test('malformed payload → null', async () => {
    const m = mockFetch([{ ok: true, json: { unexpected: 'shape' } }]);
    const result = await embed('hello', { apiKey: 'pa_xxx', __fetch: m.fetcher });
    expect(result).toBeNull();
  });

  test('empty embedding array → null', async () => {
    const m = mockFetch([{ ok: true, json: { data: [{ embedding: [] }] } }]);
    const result = await embed('hello', { apiKey: 'pa_xxx', __fetch: m.fetcher });
    expect(result).toBeNull();
  });
});

describe('embed — Voyage API success path', () => {
  test('returns the embedding from the response', async () => {
    const m = mockFetch([
      { ok: true, json: { data: [{ embedding: [0.1, 0.2, 0.3] }] } },
    ]);
    const result = await embed('hello', { apiKey: 'pa_xxx', __fetch: m.fetcher });
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  test('uses Bearer auth and POSTs the documented body', async () => {
    const m = mockFetch([
      { ok: true, json: { data: [{ embedding: [0.1] }] } },
    ]);
    await embed('payload text', { apiKey: 'pa_secret', __fetch: m.fetcher });
    const init = m.calls[0]!.init as {
      method: string;
      headers: Record<string, string>;
      body: string;
    };
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer pa_secret');
    const body = JSON.parse(init.body);
    expect(body.input).toEqual(['payload text']);
    expect(body.model).toBe('voyage-3-large');
    expect(body.input_type).toBe('document');
  });

  test('custom model overrides default', async () => {
    const m = mockFetch([
      { ok: true, json: { data: [{ embedding: [0.1] }] } },
    ]);
    await embed('x', {
      apiKey: 'pa_xxx',
      model: 'voyage-3-lite',
      __fetch: m.fetcher,
    });
    const init = m.calls[0]!.init as { body: string };
    expect(JSON.parse(init.body).model).toBe('voyage-3-lite');
  });
});

describe('DenseIndex — add + query', () => {
  test('add stores embedding and query ranks by cosine', async () => {
    const idx = fresh({
      apiKey: 'pa_xxx',
      __fetch: mockFetch([
        { ok: true, json: { data: [{ embedding: [1, 0, 0] }] } }, // c1
        { ok: true, json: { data: [{ embedding: [0, 1, 0] }] } }, // c2
        { ok: true, json: { data: [{ embedding: [1, 0, 0] }] } }, // query
      ]).fetcher,
    });
    expect(await idx.add({ chunkId: 'c1', text: 'about cats' })).toBe(true);
    expect(await idx.add({ chunkId: 'c2', text: 'about dogs' })).toBe(true);
    expect(idx.size()).toBe(2);
    const hits = await idx.query('cats again', 10);
    expect(hits[0]!.chunkId).toBe('c1');
    expect(hits[0]!.score).toBeCloseTo(1, 5);
  });

  test('add returns false when embedder fails (no key) — chunk skipped', async () => {
    const idx = fresh(); // no apiKey
    const result = await idx.add({ chunkId: 'c1', text: 'anything' });
    expect(result).toBe(false);
    expect(idx.size()).toBe(0);
  });

  test('query returns empty when index is empty', async () => {
    const idx = fresh({ apiKey: 'pa_xxx' });
    const hits = await idx.query('q', 10);
    expect(hits).toEqual([]);
  });

  test('query returns empty when query embedding fails', async () => {
    const idx = fresh({
      apiKey: 'pa_xxx',
      __fetch: mockFetch([
        { ok: true, json: { data: [{ embedding: [1, 0] }] } },   // add
        { ok: false, status: 503 },                              // query fails
      ]).fetcher,
    });
    await idx.add({ chunkId: 'c1', text: 'x' });
    const hits = await idx.query('q', 10);
    expect(hits).toEqual([]);
  });
});

describe('DenseIndex — __addRaw (test-only direct insert)', () => {
  test('bypasses Voyage so ranking can be tested deterministically', async () => {
    const idx = fresh({
      apiKey: 'pa_xxx',
      __fetch: mockFetch([
        // Only the query call hits fetch
        { ok: true, json: { data: [{ embedding: [1, 0, 0] }] } },
      ]).fetcher,
    });
    idx.__addRaw({ chunkId: 'c-cat', embedding: [1, 0, 0] });
    idx.__addRaw({ chunkId: 'c-dog', embedding: [0, 1, 0] });
    idx.__addRaw({ chunkId: 'c-mid', embedding: [0.7, 0.7, 0] });
    const hits = await idx.query('cat-like query', 3);
    expect(hits[0]!.chunkId).toBe('c-cat');
    expect(hits[1]!.chunkId).toBe('c-mid');
    expect(hits[2]!.chunkId).toBe('c-dog');
  });

  test('determinism: tied scores break by chunkId asc', async () => {
    const idx = fresh({
      apiKey: 'pa_xxx',
      __fetch: mockFetch([
        { ok: true, json: { data: [{ embedding: [1, 0] }] } },
      ]).fetcher,
    });
    idx.__addRaw({ chunkId: 'zzz', embedding: [1, 0] });
    idx.__addRaw({ chunkId: 'aaa', embedding: [1, 0] });
    idx.__addRaw({ chunkId: 'mmm', embedding: [1, 0] });
    const hits = await idx.query('q', 10);
    expect(hits.map((h) => h.chunkId)).toEqual(['aaa', 'mmm', 'zzz']);
  });
});

describe('DenseIndex — re-add + remove', () => {
  test('add same chunkId twice replaces the old embedding', async () => {
    const idx = fresh({
      apiKey: 'pa_xxx',
      __fetch: mockFetch([
        { ok: true, json: { data: [{ embedding: [1, 0] }] } },   // c1 v1
        { ok: true, json: { data: [{ embedding: [0, 1] }] } },   // c1 v2
      ]).fetcher,
    });
    await idx.add({ chunkId: 'c1', text: 'old' });
    await idx.add({ chunkId: 'c1', text: 'new' });
    expect(idx.size()).toBe(1);
    expect(idx.__records()[0]!.embedding).toEqual([0, 1]);
  });

  test('remove drops the chunk', () => {
    const idx = fresh();
    idx.__addRaw({ chunkId: 'c1', embedding: [1, 0] });
    idx.__addRaw({ chunkId: 'c2', embedding: [0, 1] });
    idx.remove('c1');
    expect(idx.size()).toBe(1);
    expect(idx.__records()[0]!.chunkId).toBe('c2');
  });

  test('remove of unknown chunkId is a no-op', () => {
    const idx = fresh();
    idx.__addRaw({ chunkId: 'c1', embedding: [1, 0] });
    idx.remove('nonexistent');
    expect(idx.size()).toBe(1);
  });

  test('reset wipes all records', () => {
    const idx = fresh();
    idx.__addRaw({ chunkId: 'c1', embedding: [1, 0] });
    idx.__addRaw({ chunkId: 'c2', embedding: [0, 1] });
    idx.reset();
    expect(idx.size()).toBe(0);
  });
});

describe('DenseIndex — IndexQuerier interface', () => {
  test('name is "dense"', () => {
    const idx = fresh();
    expect(idx.name).toBe('dense');
  });

  test('query returns RankedHit shape', async () => {
    const idx = fresh({
      apiKey: 'pa_xxx',
      __fetch: mockFetch([
        { ok: true, json: { data: [{ embedding: [1, 0] }] } },
      ]).fetcher,
    });
    idx.__addRaw({ chunkId: 'c1', embedding: [1, 0] });
    const hits = await idx.query('q', 10);
    expect(hits[0]).toHaveProperty('chunkId');
    expect(hits[0]).toHaveProperty('score');
    expect(hits[0]).toHaveProperty('rank');
    expect(hits[0]!.rank).toBe(1);
  });
});

describe('DenseIndex — addAll batching', () => {
  test('returns the count of successfully-added chunks', async () => {
    const idx = fresh({
      apiKey: 'pa_xxx',
      __fetch: mockFetch([
        { ok: true, json: { data: [{ embedding: [1, 0] }] } },
        { ok: false, status: 503 }, // chunk 2 fails
        { ok: true, json: { data: [{ embedding: [0, 1] }] } },
      ]).fetcher,
    });
    const count = await idx.addAll([
      { chunkId: 'c1', text: 'a' },
      { chunkId: 'c2', text: 'b' },
      { chunkId: 'c3', text: 'c' },
    ]);
    expect(count).toBe(2);
    expect(idx.size()).toBe(2);
  });
});

describe('DenseIndex — JSONL persistence', () => {
  test('round-trips records across instances on the same path', async () => {
    const path = `${process.env['TMPDIR'] ?? '/tmp'}/dense-roundtrip-${Date.now()}.jsonl`;
    const a = new DenseIndex({ indexPath: path });
    a.__addRaw({ chunkId: 'persist-c1', embedding: [0.5, 0.5] });
    a.__addRaw({ chunkId: 'persist-c2', embedding: [-0.5, 0.5] });
    expect(a.size()).toBe(2);

    const b = new DenseIndex({ indexPath: path });
    expect(b.size()).toBe(2);
    const ids = b.__records().map((r) => r.chunkId).sort();
    expect(ids).toEqual(['persist-c1', 'persist-c2']);

    // cleanup
    try {
      require('node:fs').unlinkSync(path);
    } catch {
      /* best-effort */
    }
  });
});
