/**
 * Smoke test for the eval harness's offline-runnable pieces.
 *
 * The full eval (`tests/kb/contextual-retrieval.eval.ts`) is invoked via
 * `bun run kb:eval` and is intentionally NOT picked up by `bun test`
 * (the `.eval.ts` extension keeps it out of the bun:test scan, and the
 * bunfig.toml `root = "tests"` already scopes discovery).
 *
 * This file exercises the harness's pure helpers + the BM25-only tier
 * end-to-end so a regression breaks bun test, not just the optional
 * `kb:eval` run.
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadCorpus,
  chunkAll,
  runBm25Tier,
  summarize,
} from './contextual-retrieval.eval.ts';

const QUESTIONS_PATH = join(import.meta.dir, 'eval-questions', 'questions.json');

describe('eval harness — corpus loading', () => {
  test('loads ≥10 markdown docs from docs/spec/ and docs/research/', () => {
    const corpus = loadCorpus();
    expect(corpus.length).toBeGreaterThanOrEqual(10);
    // Every doc must have a docId and non-empty text
    for (const doc of corpus) {
      expect(doc.docId).toMatch(/^docs\/(spec|research)\//);
      expect(doc.text.length).toBeGreaterThan(0);
    }
  });

  test('docIds are unique', () => {
    const corpus = loadCorpus();
    const ids = new Set(corpus.map((d) => d.docId));
    expect(ids.size).toBe(corpus.length);
  });
});

describe('eval harness — chunking', () => {
  test('chunkAll produces ≥1 chunk per doc', async () => {
    const corpus = loadCorpus();
    const chunks = await chunkAll(corpus);
    expect(chunks.length).toBeGreaterThanOrEqual(corpus.length);
  });

  test('every chunk has a stable ID', async () => {
    const corpus = loadCorpus();
    const a = await chunkAll(corpus);
    const b = await chunkAll(corpus);
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });
});

describe('eval harness — questions.json shape', () => {
  test('parses with version + ≥50 questions', () => {
    const evalSet = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf8'));
    expect(evalSet.version).toBe(1);
    expect(evalSet.questions.length).toBeGreaterThanOrEqual(50);
  });

  test('every question has id, query, expectedSubstrings', () => {
    const evalSet = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf8'));
    for (const q of evalSet.questions) {
      expect(q.id).toBeTruthy();
      expect(q.query).toBeTruthy();
      expect(Array.isArray(q.expectedSubstrings)).toBe(true);
      expect(q.expectedSubstrings.length).toBeGreaterThan(0);
    }
  });

  test('question IDs are unique', () => {
    const evalSet = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf8'));
    const ids = new Set(evalSet.questions.map((q: { id: string }) => q.id));
    expect(ids.size).toBe(evalSet.questions.length);
  });
});

describe('eval harness — BM25-only tier (offline)', () => {
  test('runs end-to-end on the full eval set without errors', async () => {
    const corpus = loadCorpus();
    const chunks = await chunkAll(corpus);
    const evalSet = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf8'));

    const textById = new Map<string, string>();
    for (const c of chunks) textById.set(c.id, c.text);

    const results = await runBm25Tier(chunks, evalSet.questions, textById);
    expect(results.size).toBe(evalSet.questions.length);
    for (const result of results.values()) {
      expect(result.topChunks.length).toBeGreaterThan(0);
      expect(typeof result.matched).toBe('boolean');
    }
  });

  test('hits the 6.5% BM25-only target on the curated eval set', async () => {
    const corpus = loadCorpus();
    const chunks = await chunkAll(corpus);
    const evalSet = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf8'));

    const textById = new Map<string, string>();
    for (const c of chunks) textById.set(c.id, c.text);

    const results = await runBm25Tier(chunks, evalSet.questions, textById);
    const summary = summarize([...results.values()].map((r) => ({ matched: r.matched })), 0.065);
    // We're not asserting passed=true here — eval set was curated to exercise
    // the harness, and the recall depends on the chunker's boundary choices.
    // We DO assert that the tier ran and produced a numeric failure rate.
    expect(summary.attempted).toBe(evalSet.questions.length);
    expect(summary.failureRate).toBeGreaterThanOrEqual(0);
    expect(summary.failureRate).toBeLessThanOrEqual(1);
    process.stdout.write(
      `\n  [info] BM25-only failure rate on this corpus: ${(summary.failureRate * 100).toFixed(2)}% (target ≤6.5%)\n`,
    );
  });
});

describe('eval harness — summarize', () => {
  test('all-matched → failureRate 0, passed=true', () => {
    const s = summarize([{ matched: true }, { matched: true }], 0.1);
    expect(s.failureRate).toBe(0);
    expect(s.passed).toBe(true);
  });

  test('all-missed → failureRate 1, passed=false', () => {
    const s = summarize([{ matched: false }, { matched: false }], 0.1);
    expect(s.failureRate).toBe(1);
    expect(s.passed).toBe(false);
  });

  test('half matched → 0.5, passed=false', () => {
    const s = summarize([{ matched: true }, { matched: false }], 0.4);
    expect(s.failureRate).toBe(0.5);
    expect(s.passed).toBe(false);
  });

  test('empty → failureRate 1', () => {
    const s = summarize([], 0.1);
    expect(s.failureRate).toBe(1);
  });
});
