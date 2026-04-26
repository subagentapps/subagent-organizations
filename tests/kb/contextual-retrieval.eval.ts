/**
 * Eval harness for the contextual-retrieval pipeline.
 *
 * Spec: docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md
 *       § Eval harness
 *
 * NOT a unit test — runs against the live pipeline with a fixed eval set
 * (`tests/kb/eval-questions/questions.json`) and the repo's own docs as
 * the corpus. Reports 1−recall@20 across three tiers:
 *
 *   1. BM25-only           target: ≤ 6.5%
 *   2. + Contextual BM25   target: ≤ 4.0%   (skipped without ANTHROPIC_API_KEY)
 *   3. + Reranker          target: ≤ 2.5%   (skipped without COHERE_API_KEY)
 *
 * Tier 1 runs fully offline. Higher tiers report `skipped: <reason>`
 * when their API keys are absent — this keeps the eval useful as a
 * regression guard for the BM25 path while signaling what's gated on
 * paid APIs.
 *
 * Run: `bun run kb:eval` (NOT `bun test` — the file extension `.eval.ts`
 * keeps it out of the bun:test scan).
 *
 * Per-stage breakdown: each query reports which tier first found it.
 * "Caught at BM25" < "caught at +contextual" < "caught at +reranker"
 * < "missed entirely".
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chunk, type Chunk } from '../../src/subagentmcp-sdk/knowledge-base/chunker.ts';
import { contextualizeAll, type ContextualizedChunk } from '../../src/subagentmcp-sdk/knowledge-base/contextualizer.ts';
import { BM25Index } from '../../src/subagentmcp-sdk/knowledge-base/bm25.ts';
import { DenseIndex } from '../../src/subagentmcp-sdk/knowledge-base/embedder.ts';
import { fuseRankings, type RankedHit } from '../../src/subagentmcp-sdk/knowledge-base/retriever.ts';
import { rerank, type ChunkTextLookup } from '../../src/subagentmcp-sdk/knowledge-base/reranker.ts';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const QUESTIONS_PATH = join(HERE, 'eval-questions', 'questions.json');
const CORPUS_DIRS = [
  join(REPO_ROOT, 'docs', 'spec'),
  join(REPO_ROOT, 'docs', 'research'),
];

const TOP_N = 20;
const TARGETS = {
  bm25Only: 0.065,
  plusContextual: 0.04,
  plusReranker: 0.025,
};

interface EvalQuestion {
  id: string;
  query: string;
  expectedSubstrings: string[];
}

interface EvalSet {
  version: number;
  description: string;
  questions: EvalQuestion[];
}

interface CorpusDoc {
  /** Repo-relative path (e.g. `docs/spec/cli-parity-tracker.md`). */
  docId: string;
  /** Full file contents. */
  text: string;
}

interface EvalResult {
  questionId: string;
  query: string;
  /**
   * For each tier: which chunk IDs landed in top-N + whether the query
   * matched (any expectedSubstring appeared in any top-N chunk's text).
   */
  bm25Only: { matched: boolean; topChunks: string[] } | { skipped: string };
  plusContextual: { matched: boolean; topChunks: string[] } | { skipped: string };
  plusReranker: { matched: boolean; topChunks: string[] } | { skipped: string };
  caughtAt: 'bm25' | 'contextual' | 'reranker' | 'missed' | 'unknown';
}

/* ----------------------------- corpus loading ---------------------------- */

function loadCorpus(): CorpusDoc[] {
  const docs: CorpusDoc[] = [];
  for (const dir of CORPUS_DIRS) {
    walkMarkdown(dir, docs);
  }
  return docs;
}

function walkMarkdown(dir: string, out: CorpusDoc[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let s: ReturnType<typeof statSync>;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      walkMarkdown(full, out);
    } else if (s.isFile() && entry.endsWith('.md')) {
      const text = readFileSync(full, 'utf8');
      const docId = relative(REPO_ROOT, full);
      out.push({ docId, text });
    }
  }
}

/* ---------------------------- chunking step ----------------------------- */

async function chunkAll(docs: CorpusDoc[]): Promise<Chunk[]> {
  const out: Chunk[] = [];
  for (const doc of docs) {
    const chunks = await chunk(doc.text, doc.docId);
    out.push(...chunks);
  }
  return out;
}

/* --------------------------- recall scoring ----------------------------- */

function chunkTextById(chunks: Array<Chunk | ContextualizedChunk>): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of chunks) map.set(c.id, c.text);
  return map;
}

function chunkMatches(text: string, expected: string[]): boolean {
  for (const sub of expected) {
    if (text.includes(sub)) return true;
  }
  return false;
}

function topChunksMatch(
  topIds: string[],
  expected: string[],
  textById: Map<string, string>,
): boolean {
  for (const id of topIds) {
    const text = textById.get(id);
    if (text && chunkMatches(text, expected)) return true;
  }
  return false;
}

/* ------------------------------ tier runners ----------------------------- */

async function runBm25Tier(
  chunks: Chunk[],
  questions: EvalQuestion[],
  textById: Map<string, string>,
): Promise<Map<string, { matched: boolean; topChunks: string[] }>> {
  const idx = new BM25Index({ dbPath: ':memory:' });
  try {
    idx.addAll(chunks.map((c) => ({ chunkId: c.id, text: c.text })));
    const results = new Map<string, { matched: boolean; topChunks: string[] }>();
    for (const q of questions) {
      const hits = await idx.query(q.query, TOP_N);
      const ids = hits.map((h) => h.chunkId);
      results.set(q.id, {
        matched: topChunksMatch(ids, q.expectedSubstrings, textById),
        topChunks: ids,
      });
    }
    return results;
  } finally {
    idx.close();
  }
}

async function runContextualTier(
  chunks: Chunk[],
  questions: EvalQuestion[],
  corpus: CorpusDoc[],
): Promise<
  | Map<string, { matched: boolean; topChunks: string[] }>
  | { skipped: string }
> {
  const key = process.env['ANTHROPIC_API_KEY'] || process.env['CLAUDE_CODE_OAUTH_TOKEN'];
  if (!key) {
    return { skipped: 'ANTHROPIC_API_KEY (or CLAUDE_CODE_OAUTH_TOKEN) not set' };
  }
  // Group chunks by docId
  const byDoc = new Map<string, Chunk[]>();
  for (const c of chunks) {
    const list = byDoc.get(c.docId) ?? [];
    list.push(c);
    byDoc.set(c.docId, list);
  }
  const docTextById = new Map(corpus.map((d) => [d.docId, d.text]));
  const allContextualized: ContextualizedChunk[] = [];
  for (const [docId, docChunks] of byDoc) {
    const docText = docTextById.get(docId) ?? '';
    const ctx = await contextualizeAll(docText, docChunks);
    allContextualized.push(...ctx);
  }
  // Build BM25 over preamble+text where we have a preamble
  const idx = new BM25Index({ dbPath: ':memory:' });
  try {
    idx.addAll(
      allContextualized.map((c) => ({
        chunkId: c.id,
        text: c.contextPreamble ? `${c.contextPreamble}\n\n${c.text}` : c.text,
      })),
    );
    const textById = chunkTextById(allContextualized);
    const results = new Map<string, { matched: boolean; topChunks: string[] }>();
    for (const q of questions) {
      const hits = await idx.query(q.query, TOP_N);
      const ids = hits.map((h) => h.chunkId);
      results.set(q.id, {
        matched: topChunksMatch(ids, q.expectedSubstrings, textById),
        topChunks: ids,
      });
    }
    return results;
  } finally {
    idx.close();
  }
}

async function runRerankerTier(
  chunks: Chunk[],
  questions: EvalQuestion[],
  corpus: CorpusDoc[],
): Promise<
  | Map<string, { matched: boolean; topChunks: string[] }>
  | { skipped: string }
> {
  const cohereKey = process.env['COHERE_API_KEY'];
  if (!cohereKey) {
    return { skipped: 'COHERE_API_KEY not set' };
  }
  const anthropicKey = process.env['ANTHROPIC_API_KEY'] || process.env['CLAUDE_CODE_OAUTH_TOKEN'];
  if (!anthropicKey) {
    return { skipped: 'ANTHROPIC_API_KEY (or CLAUDE_CODE_OAUTH_TOKEN) not set' };
  }
  // Same as contextual tier through retrieval, then rerank top-150 → top-20
  const byDoc = new Map<string, Chunk[]>();
  for (const c of chunks) {
    const list = byDoc.get(c.docId) ?? [];
    list.push(c);
    byDoc.set(c.docId, list);
  }
  const docTextById = new Map(corpus.map((d) => [d.docId, d.text]));
  const allContextualized: ContextualizedChunk[] = [];
  for (const [docId, docChunks] of byDoc) {
    const docText = docTextById.get(docId) ?? '';
    const ctx = await contextualizeAll(docText, docChunks);
    allContextualized.push(...ctx);
  }
  const bm25 = new BM25Index({ dbPath: ':memory:' });
  const dense = new DenseIndex({ indexPath: null });
  try {
    bm25.addAll(
      allContextualized.map((c) => ({
        chunkId: c.id,
        text: c.contextPreamble ? `${c.contextPreamble}\n\n${c.text}` : c.text,
      })),
    );
    // Optional dense — fail-open if Voyage absent
    await dense.addAll(
      allContextualized.map((c) => ({
        chunkId: c.id,
        text: c.contextPreamble ? `${c.contextPreamble}\n\n${c.text}` : c.text,
      })),
    );
    const textById = chunkTextById(allContextualized);
    const lookup: ChunkTextLookup = {
      textFor(id) {
        const c = allContextualized.find((c) => c.id === id);
        if (!c) return null;
        return { text: c.text, contextPreamble: c.contextPreamble };
      },
    };
    const results = new Map<string, { matched: boolean; topChunks: string[] }>();
    for (const q of questions) {
      const [bmHits, denseHits] = await Promise.all([
        bm25.query(q.query, 150),
        dense.query(q.query, 150),
      ]);
      const fused = fuseRankings(bmHits, denseHits, { topN: 150 });
      const reranked = await rerank(q.query, fused, lookup, { topN: TOP_N });
      const ids = reranked.map((r) => r.chunkId);
      results.set(q.id, {
        matched: topChunksMatch(ids, q.expectedSubstrings, textById),
        topChunks: ids,
      });
    }
    return results;
  } finally {
    bm25.close();
  }
}

/* ----------------------------- orchestration ---------------------------- */

interface TierSummary {
  attempted: number;
  matched: number;
  failureRate: number;
  target: number;
  passed: boolean;
}

function summarize(
  tier: { matched: boolean }[],
  target: number,
): TierSummary {
  const matched = tier.filter((t) => t.matched).length;
  const attempted = tier.length;
  const failureRate = attempted === 0 ? 1 : 1 - matched / attempted;
  return {
    attempted,
    matched,
    failureRate,
    target,
    passed: failureRate <= target,
  };
}

async function main(): Promise<void> {
  const evalSet: EvalSet = JSON.parse(readFileSync(QUESTIONS_PATH, 'utf8'));
  const questions = evalSet.questions;

  process.stdout.write(`Eval set: ${evalSet.questions.length} questions (v${evalSet.version})\n`);
  process.stdout.write('Loading corpus from docs/spec/, docs/research/...\n');
  const corpus = loadCorpus();
  process.stdout.write(`Corpus: ${corpus.length} markdown docs\n`);
  const chunks = await chunkAll(corpus);
  process.stdout.write(`Chunked: ${chunks.length} chunks\n\n`);
  const textById = chunkTextById(chunks);

  process.stdout.write('Tier 1: BM25-only ...\n');
  const tier1 = await runBm25Tier(chunks, questions, textById);

  process.stdout.write('Tier 2: + Contextual BM25 ...\n');
  const tier2 = await runContextualTier(chunks, questions, corpus);

  process.stdout.write('Tier 3: + Reranker ...\n');
  const tier3 = await runRerankerTier(chunks, questions, corpus);

  /* per-question caughtAt + per-tier summary */
  const results: EvalResult[] = [];
  for (const q of questions) {
    const t1 = tier1.get(q.id)!;
    const t2 = 'skipped' in tier2 ? { skipped: tier2.skipped } : tier2.get(q.id)!;
    const t3 = 'skipped' in tier3 ? { skipped: tier3.skipped } : tier3.get(q.id)!;
    let caughtAt: EvalResult['caughtAt'];
    if (t1 && 'matched' in t1 && t1.matched) caughtAt = 'bm25';
    else if (t2 && 'matched' in t2 && t2.matched) caughtAt = 'contextual';
    else if (t3 && 'matched' in t3 && t3.matched) caughtAt = 'reranker';
    else if ('skipped' in t2 && 'skipped' in t3) caughtAt = 'unknown';
    else caughtAt = 'missed';
    results.push({
      questionId: q.id,
      query: q.query,
      bm25Only: t1,
      plusContextual: t2,
      plusReranker: t3,
      caughtAt,
    });
  }

  /* Summarize */
  const tier1Summary = summarize(
    [...tier1.values()].filter((v) => 'matched' in v) as { matched: boolean }[],
    TARGETS.bm25Only,
  );
  const tier2Summary =
    'skipped' in tier2
      ? null
      : summarize(
          [...tier2.values()].filter((v) => 'matched' in v) as { matched: boolean }[],
          TARGETS.plusContextual,
        );
  const tier3Summary =
    'skipped' in tier3
      ? null
      : summarize(
          [...tier3.values()].filter((v) => 'matched' in v) as { matched: boolean }[],
          TARGETS.plusReranker,
        );

  process.stdout.write('\n=== Tier results ===\n');
  process.stdout.write(`BM25-only:        ${formatTier(tier1Summary)}\n`);
  process.stdout.write(
    `+ Contextual:     ${
      tier2Summary
        ? formatTier(tier2Summary)
        : `skipped (${(tier2 as { skipped: string }).skipped})`
    }\n`,
  );
  process.stdout.write(
    `+ Reranker:       ${
      tier3Summary
        ? formatTier(tier3Summary)
        : `skipped (${(tier3 as { skipped: string }).skipped})`
    }\n`,
  );

  /* Per-stage breakdown */
  const breakdown = { bm25: 0, contextual: 0, reranker: 0, missed: 0, unknown: 0 };
  for (const r of results) breakdown[r.caughtAt]++;
  process.stdout.write('\n=== Per-stage breakdown (where each query was first caught) ===\n');
  for (const [stage, count] of Object.entries(breakdown)) {
    process.stdout.write(`  ${stage.padEnd(12)} ${count}\n`);
  }

  /* List missed queries (the most useful diagnostic) */
  const missed = results.filter(
    (r) => r.caughtAt === 'missed' || r.caughtAt === 'unknown',
  );
  if (missed.length > 0) {
    process.stdout.write('\n=== Missed queries ===\n');
    for (const m of missed) {
      process.stdout.write(`  ${m.questionId}: "${m.query}"\n`);
    }
  }

  /* Exit code */
  const passed = tier1Summary.passed &&
    (tier2Summary === null || tier2Summary.passed) &&
    (tier3Summary === null || tier3Summary.passed);
  if (!passed) {
    process.stdout.write(
      '\nFAIL: at least one tier exceeded its 1−recall@20 target\n',
    );
    process.exit(1);
  }
  process.stdout.write('\nPASS: all attempted tiers met their targets\n');
}

function formatTier(s: TierSummary): string {
  const pct = (s.failureRate * 100).toFixed(2);
  const target = (s.target * 100).toFixed(1);
  const status = s.passed ? 'PASS' : 'FAIL';
  return `${status}  failure=${pct}%  target≤${target}%  matched=${s.matched}/${s.attempted}`;
}

if (import.meta.main) {
  main().catch((e) => {
    process.stderr.write(`\nUnhandled error: ${e}\n`);
    process.exit(2);
  });
}

/* Exported for testability — the smoke test imports these helpers without
 * triggering main(). */
export { loadCorpus, chunkAll, runBm25Tier, summarize };
