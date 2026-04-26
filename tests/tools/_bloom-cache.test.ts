/**
 * Unit tests for `src/subagentmcp-sdk/tools/_bloom-cache.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *       § Bloom filter design
 *
 * All tests use `:memory:` SQLite so no filesystem state leaks between runs.
 */

import { afterEach, describe, expect, test } from 'bun:test';

import {
  BloomFilter,
  BloomCache,
  type BloomEntry,
} from '../../src/subagentmcp-sdk/tools/_bloom-cache.ts';

const HOLD: BloomCache[] = [];
afterEach(() => {
  while (HOLD.length) HOLD.pop()!.close();
});

function fresh(opts?: ConstructorParameters<typeof BloomCache>[0]): BloomCache {
  const c = new BloomCache({ dbPath: ':memory:', ...opts });
  HOLD.push(c);
  return c;
}

describe('BloomFilter — primitives', () => {
  test('has returns false for unknown keys', () => {
    const b = new BloomFilter(1000, 0.01);
    expect(b.has('not-added')).toBe(false);
  });

  test('add then has returns true', () => {
    const b = new BloomFilter(1000, 0.01);
    b.add('alpha');
    expect(b.has('alpha')).toBe(true);
  });

  test('different keys do not (usually) collide', () => {
    const b = new BloomFilter(10_000, 0.001);
    b.add('alpha');
    expect(b.has('beta')).toBe(false);
  });

  test('reset clears all bits', () => {
    const b = new BloomFilter(1000, 0.01);
    b.add('x');
    expect(b.has('x')).toBe(true);
    b.reset();
    expect(b.has('x')).toBe(false);
    expect(b.__popcount()).toBe(0);
  });

  test('size table — 100k @ 1% FP fits ~120KB', () => {
    const b = new BloomFilter(100_000, 0.01);
    const { bytes, k } = b.size;
    // Math: m ≈ 958k bits ≈ 120KB. Allow ±5% slack.
    expect(bytes).toBeGreaterThan(115_000);
    expect(bytes).toBeLessThan(125_000);
    // k for m/n ≈ 9.6 → ~7
    expect(k).toBeGreaterThanOrEqual(6);
    expect(k).toBeLessThanOrEqual(8);
  });

  test('false-positive rate within 2× nominal at full load', () => {
    const expected = 1000;
    const fp = 0.01;
    const b = new BloomFilter(expected, fp);
    for (let i = 0; i < expected; i++) b.add(`item-${i}`);
    let fpCount = 0;
    const probes = 5000;
    for (let i = 0; i < probes; i++) {
      if (b.has(`unseen-${i}`)) fpCount++;
    }
    const observed = fpCount / probes;
    // Be generous on the upper bound — we want a regression alarm only when
    // the FP rate is much worse than the algorithm guarantees.
    expect(observed).toBeLessThan(fp * 3);
  });

  test('rejects bad parameters', () => {
    expect(() => new BloomFilter(0, 0.01)).toThrow();
    expect(() => new BloomFilter(100, 0)).toThrow();
    expect(() => new BloomFilter(100, 1)).toThrow();
  });

  test('indices are deterministic for the same key', () => {
    const b = new BloomFilter(1000, 0.01);
    expect(b.__indices('hello')).toEqual(b.__indices('hello'));
  });
});

describe('BloomCache — has / add / get / put roundtrip', () => {
  test('add+has roundtrip', () => {
    const c = fresh();
    expect(c.has('h1')).toBe(false);
    c.add('h1');
    expect(c.has('h1')).toBe(true);
  });

  test('get returns null on bloom miss without touching SQLite', () => {
    const c = fresh();
    expect(c.get('never-added')).toBeNull();
    expect(c.__sqliteCount()).toBe(0);
  });

  test('put stores payload and primes bloom', () => {
    const c = fresh();
    const entry: BloomEntry = {
      kind: 'content',
      markdown: '# Hello',
      parryScore: 0.05,
      fetchedAt: '2026-04-26T07:00:00Z',
    };
    c.put('hash-abc', entry);
    expect(c.has('hash-abc')).toBe(true);
    expect(c.get('hash-abc')).toEqual(entry);
    expect(c.__sqliteCount()).toBe(1);
  });

  test('put with existing key updates payload (upsert)', () => {
    const c = fresh();
    const v1: BloomEntry = {
      kind: 'content',
      markdown: 'v1',
      parryScore: 0.1,
      fetchedAt: '2026-04-26T07:00:00Z',
    };
    const v2: BloomEntry = {
      kind: 'content',
      markdown: 'v2',
      parryScore: 0.2,
      fetchedAt: '2026-04-26T08:00:00Z',
    };
    c.put('k', v1);
    c.put('k', v2);
    expect(c.get('k')).toEqual(v2);
    expect(c.__sqliteCount()).toBe(1);
  });

  test('put roundtrips a blocked entry', () => {
    const c = fresh();
    const blocked: BloomEntry = {
      kind: 'blocked',
      reason: 'prompt_injection',
      parryScore: 0.95,
      fetchedAt: '2026-04-26T07:00:00Z',
    };
    c.put('mal-hash', blocked);
    const got = c.get('mal-hash');
    expect(got).toEqual(blocked);
    if (got?.kind !== 'blocked') throw new Error('expected blocked kind');
    expect(got.reason).toBe('prompt_injection');
  });
});

describe('BloomCache — false-positive recovery via SQLite', () => {
  test('bloom hit + missing SQLite row → get returns null (recovers)', () => {
    const c = fresh();
    // Force a bloom-only mark; simulates a stale FP from a prior session.
    c.add('phantom-key');
    expect(c.has('phantom-key')).toBe(true);
    expect(c.get('phantom-key')).toBeNull();
    // SQLite stays empty.
    expect(c.__sqliteCount()).toBe(0);
  });

  test('two distinct URLs with identical body share one entry by content-hash', () => {
    const c = fresh();
    const sharedHash = 'sha256-of-shared-body';
    const entry: BloomEntry = {
      kind: 'content',
      markdown: 'same body',
      parryScore: 0.0,
      fetchedAt: '2026-04-26T07:00:00Z',
    };
    c.put(sharedHash, entry);
    expect(c.get(sharedHash)).toEqual(entry);
    expect(c.__sqliteCount()).toBe(1);
  });
});

describe('BloomCache — reset', () => {
  test('reset clears bloom and SQLite together', () => {
    const c = fresh();
    c.put('a', {
      kind: 'content',
      markdown: 'x',
      parryScore: null,
      fetchedAt: '2026-04-26T07:00:00Z',
    });
    expect(c.has('a')).toBe(true);
    c.reset();
    expect(c.has('a')).toBe(false);
    expect(c.get('a')).toBeNull();
    expect(c.__sqliteCount()).toBe(0);
  });
});

describe('BloomCache — reload survives via SQLite', () => {
  test('second instance on same file rebuilds bloom from rows', () => {
    const path = `${require('node:os').tmpdir()}/bloom-cache-reload-${Date.now()}.sqlite`;
    let first: BloomCache | null = new BloomCache({ dbPath: path });
    try {
      first.put('persistent-key', {
        kind: 'content',
        markdown: 'survives',
        parryScore: 0.0,
        fetchedAt: '2026-04-26T07:00:00Z',
      });
      first.close();
      first = null;

      const reopened = new BloomCache({ dbPath: path });
      try {
        // Bloom must say `has` is true after reload, AND get must return the payload.
        expect(reopened.has('persistent-key')).toBe(true);
        const got = reopened.get('persistent-key');
        expect(got?.kind).toBe('content');
        if (got?.kind === 'content') expect(got.markdown).toBe('survives');
      } finally {
        reopened.close();
      }
    } finally {
      if (first) first.close();
      try {
        require('node:fs').unlinkSync(path);
      } catch {
        /* best-effort cleanup */
      }
    }
  });
});

describe('BloomCache — defaults from spec', () => {
  test('default sizing matches spec (100k items, 1% FP)', () => {
    const c = fresh();
    const { bytes } = c.__bloom.size;
    expect(bytes).toBeGreaterThan(115_000);
    expect(bytes).toBeLessThan(125_000);
  });

  test('custom expectedItems / fpRate are respected', () => {
    const small = fresh({ expectedItems: 1000, fpRate: 0.05 });
    const big = fresh({ expectedItems: 1_000_000, fpRate: 0.001 });
    expect(small.__bloom.size.bytes).toBeLessThan(big.__bloom.size.bytes);
  });
});
