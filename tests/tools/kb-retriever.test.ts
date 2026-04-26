/**
 * Unit tests for `src/subagentmcp-sdk/knowledge-base/retriever.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md
 *       § 4. Retriever
 */

import { describe, expect, test } from 'bun:test';
import {
  rrfContribution,
  fuseRankings,
  retrieve,
  type RankedHit,
  type IndexQuerier,
} from '../../src/subagentmcp-sdk/knowledge-base/retriever.ts';

describe('rrfContribution', () => {
  test('rank=1, k=60 → 1/61', () => {
    expect(rrfContribution(1, 60)).toBeCloseTo(1 / 61, 12);
  });
  test('rank=10, k=60 → 1/70', () => {
    expect(rrfContribution(10, 60)).toBeCloseTo(1 / 70, 12);
  });
  test('default k=60 used when omitted', () => {
    expect(rrfContribution(5)).toBeCloseTo(1 / 65, 12);
  });
  test('rejects rank < 1', () => {
    expect(() => rrfContribution(0)).toThrow();
    expect(() => rrfContribution(-1)).toThrow();
  });
  test('rejects non-integer rank', () => {
    expect(() => rrfContribution(1.5)).toThrow();
  });
});

describe('fuseRankings — basic fusion', () => {
  test('chunk in both indexes gets sum of contributions', () => {
    const dense: RankedHit[] = [{ chunkId: 'a', score: 0.9, rank: 1 }];
    const lexical: RankedHit[] = [{ chunkId: 'a', score: 5.0, rank: 1 }];
    const fused = fuseRankings(dense, lexical);
    expect(fused).toHaveLength(1);
    expect(fused[0]!.fusedScore).toBeCloseTo(2 / 61, 12);
    expect(fused[0]!.denseScore).toBe(0.9);
    expect(fused[0]!.lexicalScore).toBe(5.0);
    expect(fused[0]!.denseRank).toBe(1);
    expect(fused[0]!.lexicalRank).toBe(1);
  });

  test('chunk in only dense → lexical fields null', () => {
    const dense: RankedHit[] = [{ chunkId: 'a', score: 0.9, rank: 1 }];
    const fused = fuseRankings(dense, []);
    expect(fused).toHaveLength(1);
    expect(fused[0]!.lexicalScore).toBeNull();
    expect(fused[0]!.lexicalRank).toBeNull();
    expect(fused[0]!.denseScore).toBe(0.9);
  });

  test('chunk in only lexical → dense fields null', () => {
    const lexical: RankedHit[] = [{ chunkId: 'a', score: 5.0, rank: 1 }];
    const fused = fuseRankings([], lexical);
    expect(fused).toHaveLength(1);
    expect(fused[0]!.denseScore).toBeNull();
    expect(fused[0]!.lexicalScore).toBe(5.0);
  });

  test('empty inputs → empty output', () => {
    expect(fuseRankings([], [])).toEqual([]);
  });
});

describe('fuseRankings — ranking', () => {
  test('chunk in both indexes ranks above chunk in only one (same rank)', () => {
    // 'both' is at rank 1 in dense AND rank 1 in lexical → 2/61
    // 'denseOnly' is at rank 1 in dense only → 1/61
    // → 'both' should win
    const dense: RankedHit[] = [
      { chunkId: 'both', score: 0.9, rank: 1 },
      { chunkId: 'denseOnly', score: 0.85, rank: 2 },
    ];
    const lexical: RankedHit[] = [{ chunkId: 'both', score: 5.0, rank: 1 }];
    const fused = fuseRankings(dense, lexical);
    expect(fused[0]!.chunkId).toBe('both');
    expect(fused[1]!.chunkId).toBe('denseOnly');
  });

  test('better rank in either index wins over worse rank elsewhere', () => {
    // 'a' is rank 1 in dense, rank 100 in lexical → 1/61 + 1/160
    // 'b' is rank 2 in dense, rank 2 in lexical → 1/62 + 1/62
    // 'a' total: 0.01639 + 0.00625 = 0.02264
    // 'b' total: 0.01613 + 0.01613 = 0.03226
    // 'b' should win because pairs of mid-ranks beat one good + one bad
    const dense: RankedHit[] = [
      { chunkId: 'a', score: 0.9, rank: 1 },
      { chunkId: 'b', score: 0.85, rank: 2 },
    ];
    const lexical: RankedHit[] = [
      { chunkId: 'a', score: 1.0, rank: 100 },
      { chunkId: 'b', score: 4.5, rank: 2 },
    ];
    const fused = fuseRankings(dense, lexical);
    expect(fused[0]!.chunkId).toBe('b');
  });
});

describe('fuseRankings — ties', () => {
  test('equal fused scores → tie-break by dense score (desc)', () => {
    const dense: RankedHit[] = [
      { chunkId: 'lower', score: 0.5, rank: 1 },
      { chunkId: 'higher', score: 0.9, rank: 1 },
    ];
    const lexical: RankedHit[] = [];
    const fused = fuseRankings(dense, lexical);
    // Both at rank 1 → fused scores tie → 'higher' wins on dense score
    expect(fused[0]!.chunkId).toBe('higher');
    expect(fused[1]!.chunkId).toBe('lower');
  });

  test('equal fused + equal dense scores → tie-break by lexical', () => {
    const dense: RankedHit[] = [
      { chunkId: 'a', score: 0.5, rank: 1 },
      { chunkId: 'b', score: 0.5, rank: 1 },
    ];
    const lexical: RankedHit[] = [
      { chunkId: 'a', score: 1.0, rank: 50 },
      { chunkId: 'b', score: 5.0, rank: 50 },
    ];
    const fused = fuseRankings(dense, lexical);
    // Same fused, same dense → 'b' wins on lexical 5.0 vs 1.0
    expect(fused[0]!.chunkId).toBe('b');
  });

  test('all ties → lexicographic chunkId order', () => {
    const dense: RankedHit[] = [
      { chunkId: 'zzz', score: 0.5, rank: 1 },
      { chunkId: 'aaa', score: 0.5, rank: 1 },
      { chunkId: 'mmm', score: 0.5, rank: 1 },
    ];
    const fused = fuseRankings(dense, []);
    expect(fused.map((c) => c.chunkId)).toEqual(['aaa', 'mmm', 'zzz']);
  });
});

describe('fuseRankings — option validation', () => {
  test('rejects k <= 0', () => {
    expect(() => fuseRankings([], [], { k: 0 })).toThrow();
    expect(() => fuseRankings([], [], { k: -1 })).toThrow();
  });
  test('rejects topN <= 0', () => {
    expect(() => fuseRankings([], [], { topN: 0 })).toThrow();
  });
});

describe('fuseRankings — topN cap', () => {
  test('caps output at topN', () => {
    const dense: RankedHit[] = Array.from({ length: 200 }, (_, i) => ({
      chunkId: `chunk-${String(i).padStart(3, '0')}`,
      score: 1 - i / 200,
      rank: i + 1,
    }));
    const fused = fuseRankings(dense, []);
    expect(fused).toHaveLength(150); // default topN=150
  });

  test('custom topN respected', () => {
    const dense: RankedHit[] = Array.from({ length: 50 }, (_, i) => ({
      chunkId: `c${i}`,
      score: 1 - i / 50,
      rank: i + 1,
    }));
    const fused = fuseRankings(dense, [], { topN: 10 });
    expect(fused).toHaveLength(10);
    expect(fused[0]!.chunkId).toBe('c0');
  });
});

describe('fuseRankings — determinism', () => {
  test('same input twice → identical output', () => {
    const dense: RankedHit[] = [
      { chunkId: 'a', score: 0.9, rank: 1 },
      { chunkId: 'b', score: 0.85, rank: 2 },
      { chunkId: 'c', score: 0.7, rank: 3 },
    ];
    const lexical: RankedHit[] = [
      { chunkId: 'a', score: 5.0, rank: 1 },
      { chunkId: 'd', score: 4.0, rank: 2 },
    ];
    const a = fuseRankings(dense, lexical);
    const b = fuseRankings(dense, lexical);
    expect(a).toEqual(b);
  });
});

describe('retrieve — concrete dispatch over IndexQuerier', () => {
  test('calls both queriers in parallel and fuses', async () => {
    const calls: string[] = [];
    const dense: IndexQuerier = {
      name: 'dense',
      async query(_q, topN) {
        calls.push(`dense:${topN}`);
        return [
          { chunkId: 'a', score: 0.9, rank: 1 },
          { chunkId: 'b', score: 0.85, rank: 2 },
        ];
      },
    };
    const lexical: IndexQuerier = {
      name: 'lexical',
      async query(_q, topN) {
        calls.push(`lexical:${topN}`);
        return [
          { chunkId: 'b', score: 5.0, rank: 1 },
          { chunkId: 'c', score: 4.0, rank: 2 },
        ];
      },
    };
    const result = await retrieve('hello', dense, lexical, { topN: 10 });
    expect(calls).toContain('dense:150');
    expect(calls).toContain('lexical:150');
    expect(result.length).toBe(3);
    // 'b' was in both, should rank first
    expect(result[0]!.chunkId).toBe('b');
  });

  test('respects perIndexTopN option', async () => {
    let receivedTopN = 0;
    const dense: IndexQuerier = {
      name: 'dense',
      async query(_q, topN) {
        receivedTopN = topN;
        return [];
      },
    };
    const lexical: IndexQuerier = {
      name: 'lexical',
      async query(_q, _topN) {
        return [];
      },
    };
    await retrieve('hello', dense, lexical, { perIndexTopN: 50 });
    expect(receivedTopN).toBe(50);
  });

  test('one index returning empty does not fail the call', async () => {
    const dense: IndexQuerier = {
      name: 'dense',
      async query() {
        return [];
      },
    };
    const lexical: IndexQuerier = {
      name: 'lexical',
      async query() {
        return [{ chunkId: 'only-lex', score: 1.0, rank: 1 }];
      },
    };
    const result = await retrieve('q', dense, lexical);
    expect(result).toHaveLength(1);
    expect(result[0]!.chunkId).toBe('only-lex');
  });
});

describe('retriever — blog-cited example math', () => {
  test('reproduces the blog example: top-150 in, top-150 out, RRF=60', async () => {
    // Construct 150 dense + 150 lexical with 50 overlap
    const dense: RankedHit[] = Array.from({ length: 150 }, (_, i) => ({
      chunkId: `chunk-${i}`,
      score: 1 - i / 150,
      rank: i + 1,
    }));
    const lexical: RankedHit[] = Array.from({ length: 150 }, (_, i) => ({
      chunkId: `chunk-${i + 100}`, // 100..249, overlap with dense at 100..149
      score: 10 - i / 15,
      rank: i + 1,
    }));
    const fused = fuseRankings(dense, lexical);
    // Total unique: 150 + 150 - 50 overlap = 250 → capped to 150
    expect(fused).toHaveLength(150);
    // Top result should be a chunk in both indexes — chunk-100 is rank 101
    // in dense and rank 1 in lexical: 1/161 + 1/61 ≈ 0.02260
    // chunk-0 is rank 1 in dense only: 1/61 ≈ 0.01639
    // chunk-100 should out-rank chunk-0
    const top = fused[0]!.chunkId;
    expect(top).toMatch(/^chunk-(1[0-4]\d)$/); // somewhere in 100..149 (the overlap window)
  });
});
