/**
 * Unit tests for `src/subagentmcp-sdk/knowledge-base/bm25.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md
 *       § 3. Embedder + BM25 indexer
 */

import { afterEach, describe, expect, test } from 'bun:test';
import {
  BM25Index,
  tokenize,
  type BM25Document,
} from '../../src/subagentmcp-sdk/knowledge-base/bm25.ts';

const HOLD: BM25Index[] = [];
afterEach(() => {
  while (HOLD.length) HOLD.pop()!.close();
});

function fresh(opts?: ConstructorParameters<typeof BM25Index>[0]): BM25Index {
  const idx = new BM25Index({ dbPath: ':memory:', ...opts });
  HOLD.push(idx);
  return idx;
}

describe('tokenize', () => {
  test('lowercases + splits on whitespace', () => {
    expect(tokenize('Hello World')).toEqual(['hello', 'world']);
  });
  test('strips punctuation', () => {
    expect(tokenize('Hello, world!')).toEqual(['hello', 'world']);
  });
  test('preserves alphanumerics', () => {
    expect(tokenize('chunk-1 v2 ok')).toEqual(['chunk', '1', 'v2', 'ok']);
  });
  test('empty input → empty array', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   \t\n  ')).toEqual([]);
  });
  test('handles unicode word characters', () => {
    expect(tokenize('café résumé')).toEqual(['café', 'résumé']);
  });
});

describe('BM25Index — basic add/query', () => {
  test('add then query a single document', async () => {
    const idx = fresh();
    idx.add({ chunkId: 'c1', text: 'The quick brown fox jumps over the lazy dog' });
    const hits = await idx.query('fox', 10);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.chunkId).toBe('c1');
    expect(hits[0]!.score).toBeGreaterThan(0);
    expect(hits[0]!.rank).toBe(1);
  });

  test('query with no matching terms returns empty', async () => {
    const idx = fresh();
    idx.add({ chunkId: 'c1', text: 'The quick brown fox' });
    const hits = await idx.query('elephant', 10);
    expect(hits).toEqual([]);
  });

  test('empty index returns empty results', async () => {
    const idx = fresh();
    const hits = await idx.query('anything', 10);
    expect(hits).toEqual([]);
  });

  test('docCount and avgDocLength reflect adds', () => {
    const idx = fresh();
    idx.add({ chunkId: 'c1', text: 'one two three' });
    idx.add({ chunkId: 'c2', text: 'four five' });
    expect(idx.docCount()).toBe(2);
    // Mean length = (3 + 2) / 2 = 2.5
    expect(idx.avgDocLength()).toBeCloseTo(2.5, 5);
  });
});

describe('BM25Index — ranking', () => {
  test('docs containing more query terms rank higher', async () => {
    const idx = fresh();
    idx.add({ chunkId: 'c1', text: 'fox dog cat' });
    idx.add({ chunkId: 'c2', text: 'fox' });
    idx.add({ chunkId: 'c3', text: 'cat dog' });
    const hits = await idx.query('fox dog', 10);
    // c1 has both, c2 has fox, c3 has dog → c1 ranks 1st
    expect(hits[0]!.chunkId).toBe('c1');
  });

  test('rare-term docs out-rank common-term docs (IDF)', async () => {
    const idx = fresh();
    // 'common' appears in many docs; 'rare' only in c-rare
    for (let i = 0; i < 10; i++) {
      idx.add({ chunkId: `c-common-${i}`, text: 'common text here' });
    }
    idx.add({ chunkId: 'c-rare', text: 'common rare' });
    const hits = await idx.query('common rare', 5);
    expect(hits[0]!.chunkId).toBe('c-rare');
  });

  test('topN caps results', async () => {
    const idx = fresh();
    for (let i = 0; i < 20; i++) {
      idx.add({ chunkId: `c${i}`, text: `chunk ${i} fox text` });
    }
    const hits = await idx.query('fox', 5);
    expect(hits).toHaveLength(5);
  });

  test('ranks are sequential 1..N', async () => {
    const idx = fresh();
    for (let i = 0; i < 5; i++) {
      idx.add({ chunkId: `c${i}`, text: `chunk ${i} fox` });
    }
    const hits = await idx.query('fox', 5);
    expect(hits.map((h) => h.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  test('determinism: ties broken by lexicographic chunkId', async () => {
    const idx = fresh();
    // Identical text → identical scores → tie-break must be deterministic
    idx.add({ chunkId: 'zzz', text: 'identical text body' });
    idx.add({ chunkId: 'aaa', text: 'identical text body' });
    idx.add({ chunkId: 'mmm', text: 'identical text body' });
    const hits = await idx.query('identical text body', 10);
    expect(hits.map((h) => h.chunkId)).toEqual(['aaa', 'mmm', 'zzz']);
  });

  test('BM25 saturation: 100 occurrences of fox should not score 100x more than 1', async () => {
    const idx = fresh();
    idx.add({ chunkId: 'c-once', text: 'fox once' });
    idx.add({ chunkId: 'c-many', text: 'fox '.repeat(100) });
    // Both docs contain fox; saturation means many is < 10× once even
    // though TF differs by 100×
    const hits = await idx.query('fox', 10);
    const once = hits.find((h) => h.chunkId === 'c-once')!;
    const many = hits.find((h) => h.chunkId === 'c-many')!;
    expect(many.score / once.score).toBeLessThan(10);
  });
});

describe('BM25Index — re-add semantics (idempotent)', () => {
  test('adding the same chunkId twice replaces the old text', async () => {
    const idx = fresh();
    idx.add({ chunkId: 'c1', text: 'old text fox' });
    idx.add({ chunkId: 'c1', text: 'new text dog' });
    expect(idx.docCount()).toBe(1);
    const foxHits = await idx.query('fox', 10);
    expect(foxHits).toEqual([]);
    const dogHits = await idx.query('dog', 10);
    expect(dogHits).toHaveLength(1);
  });

  test('avgDocLength updates after re-add', () => {
    const idx = fresh();
    idx.add({ chunkId: 'c1', text: 'one two three four five' }); // 5 tokens
    idx.add({ chunkId: 'c2', text: 'a b' });                     // 2 tokens
    expect(idx.avgDocLength()).toBeCloseTo(3.5, 5);
    idx.add({ chunkId: 'c1', text: 'replaced' });                // now 1 + 2 = 3 / 2 = 1.5
    expect(idx.avgDocLength()).toBeCloseTo(1.5, 5);
  });
});

describe('BM25Index — remove + reset', () => {
  test('remove drops the doc and updates stats', async () => {
    const idx = fresh();
    idx.add({ chunkId: 'c1', text: 'fox' });
    idx.add({ chunkId: 'c2', text: 'fox dog' });
    idx.remove('c1');
    expect(idx.docCount()).toBe(1);
    const hits = await idx.query('fox', 10);
    expect(hits.map((h) => h.chunkId)).toEqual(['c2']);
  });

  test('remove of unknown chunkId is a no-op', () => {
    const idx = fresh();
    idx.add({ chunkId: 'c1', text: 'fox' });
    idx.remove('nonexistent');
    expect(idx.docCount()).toBe(1);
  });

  test('reset wipes everything', async () => {
    const idx = fresh();
    idx.add({ chunkId: 'c1', text: 'fox' });
    idx.reset();
    expect(idx.docCount()).toBe(0);
    expect(await idx.query('fox', 10)).toEqual([]);
  });
});

describe('BM25Index — bulk add (transaction)', () => {
  test('addAll stores all docs and updates stats once', () => {
    const idx = fresh();
    const docs: BM25Document[] = [
      { chunkId: 'c1', text: 'one two three' },
      { chunkId: 'c2', text: 'four five' },
      { chunkId: 'c3', text: 'six' },
    ];
    idx.addAll(docs);
    expect(idx.docCount()).toBe(3);
    expect(idx.avgDocLength()).toBeCloseTo((3 + 2 + 1) / 3, 5);
  });
});

describe('BM25Index — IndexQuerier interface', () => {
  test('exposes name "bm25"', () => {
    const idx = fresh();
    expect(idx.name).toBe('bm25');
  });

  test('query returns RankedHit shape compatible with retriever', async () => {
    const idx = fresh();
    idx.add({ chunkId: 'c1', text: 'fox' });
    const hits = await idx.query('fox', 10);
    // RankedHit = { chunkId, score, rank }
    expect(hits[0]).toHaveProperty('chunkId');
    expect(hits[0]).toHaveProperty('score');
    expect(hits[0]).toHaveProperty('rank');
  });
});

describe('BM25Index — fixture corpus', () => {
  test('100-doc corpus produces sensible top-10 for a multi-term query', async () => {
    const idx = fresh();
    const corpus: BM25Document[] = [];
    for (let i = 0; i < 100; i++) {
      corpus.push({
        chunkId: `chunk-${String(i).padStart(3, '0')}`,
        text: `document ${i} body talking about topic ${i % 5}`,
      });
    }
    // Doc 42 specifically mentions "fox"
    corpus[42] = {
      chunkId: 'chunk-042',
      text: 'document 42 body about a fox jumping over rocks',
    };
    idx.addAll(corpus);
    expect(idx.docCount()).toBe(100);
    const hits = await idx.query('fox jumping', 10);
    expect(hits[0]!.chunkId).toBe('chunk-042');
  });
});
