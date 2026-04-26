/**
 * Unit tests for `src/subagentmcp-sdk/knowledge-base/reranker.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md
 *       § 5. Reranker
 *
 * Network is replaced via the `__fetch` test hook; api key is set via
 * `apiKey` option so tests don't depend on `COHERE_API_KEY` env state.
 */

import { describe, expect, test } from 'bun:test';
import {
  rerank,
  type ChunkTextLookup,
  type RerankOptions,
} from '../../src/subagentmcp-sdk/knowledge-base/reranker.ts';
import type { RetrievalCandidate } from '../../src/subagentmcp-sdk/knowledge-base/retriever.ts';

function candidates(...ids: string[]): RetrievalCandidate[] {
  return ids.map((id, i) => ({
    chunkId: id,
    fusedScore: 1 - i / 100,
    denseScore: 0.9 - i / 100,
    lexicalScore: 5 - i / 10,
    denseRank: i + 1,
    lexicalRank: i + 1,
  }));
}

const lookup: ChunkTextLookup = {
  textFor(id) {
    return { text: `body of ${id}`, contextPreamble: `preamble for ${id}` };
  },
};

function mockFetch(
  responses: Array<
    | { ok: true; json: unknown }
    | { ok: false; status: number }
    | { throw: Error }
  >,
): {
  fetcher: NonNullable<RerankOptions['__fetch']>;
  callCount: () => number;
  calls: Array<{ url: string; init?: unknown }>;
} {
  const calls: Array<{ url: string; init?: unknown }> = [];
  let i = 0;
  const fetcher: NonNullable<RerankOptions['__fetch']> = (url, init) => {
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
  return {
    fetcher,
    callCount: () => calls.length,
    calls,
  };
}

describe('rerank — fail-open paths (no Cohere account)', () => {
  test('missing apiKey + no env → returns input order truncated to topN', async () => {
    // Use an empty apiKey to force the no-key branch. Don't pass __fetch
    // so any accidental network call would also throw.
    const result = await rerank('query', candidates('a', 'b', 'c'), lookup, {
      apiKey: '',
      topN: 2,
      // Sabotage: if the impl tries to fetch despite no key, this throws.
      __fetch: () => {
        throw new Error('should not call fetch with no key');
      },
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.chunkId).toBe('a');
    expect(result[1]!.chunkId).toBe('b');
    // rerankerScore is null on the fail-open path
    expect(result[0]!.rerankerScore).toBeNull();
    expect(result[1]!.rerankerScore).toBeNull();
  });

  test('whitespace-only apiKey treated as missing', async () => {
    const result = await rerank('query', candidates('a', 'b'), lookup, {
      apiKey: '   ',
      __fetch: () => {
        throw new Error('should not call fetch');
      },
    });
    expect(result[0]!.rerankerScore).toBeNull();
  });

  test('HTTP 503 → fail-open, original order preserved', async () => {
    const m = mockFetch([{ ok: false, status: 503 }]);
    const result = await rerank('query', candidates('a', 'b', 'c'), lookup, {
      apiKey: 'co_xxx',
      __fetch: m.fetcher,
      topN: 2,
    });
    expect(result.map((r) => r.chunkId)).toEqual(['a', 'b']);
    expect(result.every((r) => r.rerankerScore === null)).toBe(true);
  });

  test('network throw → fail-open', async () => {
    const m = mockFetch([{ throw: new Error('econnrefused') }]);
    const result = await rerank('query', candidates('a', 'b'), lookup, {
      apiKey: 'co_xxx',
      __fetch: m.fetcher,
    });
    expect(result.map((r) => r.chunkId)).toEqual(['a', 'b']);
    expect(result.every((r) => r.rerankerScore === null)).toBe(true);
  });

  test('malformed payload → fail-open', async () => {
    const m = mockFetch([{ ok: true, json: { unexpected: 'shape' } }]);
    const result = await rerank('query', candidates('a', 'b'), lookup, {
      apiKey: 'co_xxx',
      __fetch: m.fetcher,
    });
    expect(result.every((r) => r.rerankerScore === null)).toBe(true);
  });
});

describe('rerank — Cohere API success path', () => {
  test('reorders candidates by Cohere relevance_score', async () => {
    // Input order: a, b, c. Cohere says best-to-worst is c (idx 2), a (idx 0), b (idx 1).
    const m = mockFetch([
      {
        ok: true,
        json: {
          results: [
            { index: 2, relevance_score: 0.95 },
            { index: 0, relevance_score: 0.55 },
            { index: 1, relevance_score: 0.20 },
          ],
        },
      },
    ]);
    const result = await rerank('query', candidates('a', 'b', 'c'), lookup, {
      apiKey: 'co_xxx',
      __fetch: m.fetcher,
      topN: 3,
    });
    expect(result.map((r) => r.chunkId)).toEqual(['c', 'a', 'b']);
    expect(result[0]!.rerankerScore).toBe(0.95);
    expect(result[1]!.rerankerScore).toBe(0.55);
    expect(result[2]!.rerankerScore).toBe(0.20);
  });

  test('finalRank is 0-based position in reordered output', async () => {
    const m = mockFetch([
      {
        ok: true,
        json: {
          results: [
            { index: 1, relevance_score: 0.9 },
            { index: 0, relevance_score: 0.5 },
          ],
        },
      },
    ]);
    const result = await rerank('q', candidates('a', 'b'), lookup, {
      apiKey: 'co_xxx',
      __fetch: m.fetcher,
    });
    expect(result[0]!.finalRank).toBe(0);
    expect(result[1]!.finalRank).toBe(1);
  });

  test('passes through original retrieval scores', async () => {
    const m = mockFetch([
      {
        ok: true,
        json: { results: [{ index: 0, relevance_score: 0.9 }] },
      },
    ]);
    const result = await rerank('q', candidates('a'), lookup, {
      apiKey: 'co_xxx',
      __fetch: m.fetcher,
    });
    expect(result[0]!.fusedScore).toBe(1);
    expect(result[0]!.denseScore).toBe(0.9);
    expect(result[0]!.lexicalScore).toBe(5);
  });

  test('uses Bearer auth and POSTs the documented body', async () => {
    const m = mockFetch([
      {
        ok: true,
        json: { results: [{ index: 0, relevance_score: 0.9 }] },
      },
    ]);
    await rerank('hello world', candidates('a', 'b'), lookup, {
      apiKey: 'co_secret_token',
      __fetch: m.fetcher,
      topN: 2,
    });
    const call = m.calls[0]!;
    expect(call.url).toContain('rerank');
    const init = call.init as { method: string; headers: Record<string, string>; body: string };
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer co_secret_token');
    const body = JSON.parse(init.body);
    expect(body.query).toBe('hello world');
    expect(body.top_n).toBe(2);
    // Documents go in the order the candidates were passed
    expect(body.documents).toHaveLength(2);
    expect(body.documents[0]).toContain('body of a');
    expect(body.documents[1]).toContain('body of b');
  });

  test('document text uses contextPreamble + body when present', async () => {
    const m = mockFetch([
      {
        ok: true,
        json: { results: [{ index: 0, relevance_score: 0.9 }] },
      },
    ]);
    await rerank('q', candidates('a'), lookup, {
      apiKey: 'co_xxx',
      __fetch: m.fetcher,
    });
    const init = m.calls[0]!.init as { body: string };
    const sent = JSON.parse(init.body).documents[0];
    expect(sent).toContain('preamble for a');
    expect(sent).toContain('body of a');
  });

  test('document text uses body alone when contextPreamble is missing', async () => {
    const noPreambleLookup: ChunkTextLookup = {
      textFor(id) {
        return { text: `body of ${id}` };
      },
    };
    const m = mockFetch([
      {
        ok: true,
        json: { results: [{ index: 0, relevance_score: 0.9 }] },
      },
    ]);
    await rerank('q', candidates('a'), noPreambleLookup, {
      apiKey: 'co_xxx',
      __fetch: m.fetcher,
    });
    const init = m.calls[0]!.init as { body: string };
    const sent = JSON.parse(init.body).documents[0];
    expect(sent).toBe('body of a');
  });
});

describe('rerank — option validation', () => {
  test('rejects topN <= 0', async () => {
    expect(rerank('q', candidates('a'), lookup, { topN: 0 })).rejects.toThrow();
    expect(rerank('q', candidates('a'), lookup, { topN: -1 })).rejects.toThrow();
  });

  test('empty candidates → empty result without API call', async () => {
    const m = mockFetch([
      { throw: new Error('should not be called') },
    ]);
    const result = await rerank('q', [], lookup, {
      apiKey: 'co_xxx',
      __fetch: m.fetcher,
    });
    expect(result).toEqual([]);
    expect(m.callCount()).toBe(0);
  });

  test('custom model passed through', async () => {
    const m = mockFetch([
      {
        ok: true,
        json: { results: [{ index: 0, relevance_score: 0.9 }] },
      },
    ]);
    await rerank('q', candidates('a'), lookup, {
      apiKey: 'co_xxx',
      model: 'rerank-experimental',
      __fetch: m.fetcher,
    });
    const init = m.calls[0]!.init as { body: string };
    expect(JSON.parse(init.body).model).toBe('rerank-experimental');
  });
});

describe('rerank — lookup miss handling', () => {
  test('chunks without text are dropped', async () => {
    const partialLookup: ChunkTextLookup = {
      textFor(id) {
        if (id === 'b') return null;
        return { text: `body of ${id}` };
      },
    };
    const m = mockFetch([
      {
        ok: true,
        json: {
          results: [
            { index: 0, relevance_score: 0.9 },
            { index: 1, relevance_score: 0.5 }, // 'b' didn't make it in due to lookup miss
          ],
        },
      },
    ]);
    const result = await rerank('q', candidates('a', 'b', 'c'), partialLookup, {
      apiKey: 'co_xxx',
      __fetch: m.fetcher,
    });
    // 'b' was filtered out before sending to Cohere; the response's index 1
    // refers to 'c' in the sent documents.
    expect(result.map((r) => r.chunkId)).toEqual(['a', 'c']);
  });
});

describe('rerank — determinism', () => {
  test('same inputs → same output (success path)', async () => {
    const respA = {
      ok: true as const,
      json: {
        results: [
          { index: 1, relevance_score: 0.9 },
          { index: 0, relevance_score: 0.5 },
        ],
      },
    };
    const respB = { ...respA };
    const a = await rerank('q', candidates('x', 'y'), lookup, {
      apiKey: 'k',
      __fetch: mockFetch([respA]).fetcher,
    });
    const b = await rerank('q', candidates('x', 'y'), lookup, {
      apiKey: 'k',
      __fetch: mockFetch([respB]).fetcher,
    });
    expect(a).toEqual(b);
  });
});
