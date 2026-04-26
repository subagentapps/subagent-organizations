/**
 * Parry prompt-injection scanning.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *       § parry integration
 *
 * Calls the HuggingFace Inference API for
 * `protectai/deberta-v3-base-prompt-injection-v2` when a token is available
 * at `~/.config/parry/token` (path overridable via `PARRY_TOKEN_PATH` env
 * or the `tokenPath` option). Falls back to the stub when no token is
 * configured — readers stay testable offline and a fresh checkout doesn't
 * need a HuggingFace account before `bun test` will run.
 *
 * Cache: in-memory by content SHA-256 + threshold bucket. The bloom-cache
 * integration in issue #24 will replace this with a persistent SQLite-backed
 * store; the function signature stays the same.
 *
 * Per CLAUDE.md #5: no submodules / vendored runtimes. The HF call is plain
 * `fetch`; no SDK dep.
 *
 * Per CLAUDE.md #2: this file mirrors `crawlee-content-layer.md` §
 * parry integration. Update the spec first if changing the contract.
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type {
  ParryLabel,
  ParryScanResult,
  ParryThresholds,
} from './types.ts';
import { sha256 } from './types.ts';
import { BloomCache, type BloomEntry } from './_bloom-cache.ts';

const DEFAULT_SUSPICIOUS = 0.3;
const DEFAULT_MALICIOUS = 0.8;

const HF_MODEL = 'protectai/deberta-v3-base-prompt-injection-v2';
const HF_INFERENCE_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

/** Default token path; per spec § Pre-requisites. */
const DEFAULT_TOKEN_PATH = join(homedir(), '.config', 'parry', 'token');

export function classify(
  score: number,
  thresholds?: ParryThresholds,
): ParryLabel {
  const sus = thresholds?.suspicious ?? DEFAULT_SUSPICIOUS;
  const mal = thresholds?.malicious ?? DEFAULT_MALICIOUS;
  if (score >= mal) return 'MALICIOUS';
  if (score >= sus) return 'SUSPICIOUS';
  return 'SAFE';
}

/**
 * Read the HF token from disk. Returns null when missing — caller falls
 * back to the stub. Trims trailing newlines and whitespace.
 */
function readToken(tokenPath: string): string | null {
  try {
    const raw = readFileSync(tokenPath, 'utf8').trim();
    return raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

/**
 * HF Inference API response shape for text-classification models.
 * Returned as `[[{ label, score }, { label, score }]]` — one classifier
 * head, two output labels (`INJECTION` and `SAFE`).
 */
interface HFClassifyEntry {
  label: string;
  score: number;
}

function extractInjectionScore(payload: unknown): number | null {
  if (!Array.isArray(payload)) return null;
  const head = payload[0];
  if (!Array.isArray(head)) return null;
  for (const entry of head as HFClassifyEntry[]) {
    if (typeof entry?.label === 'string' && typeof entry?.score === 'number') {
      const lab = entry.label.toUpperCase();
      if (lab === 'INJECTION' || lab === 'MALICIOUS') return entry.score;
    }
  }
  return null;
}

/**
 * Optional fetch override for tests. Defaults to global `fetch`.
 */
type Fetcher = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/**
 * Persistent cache backed by `_bloom-cache.ts` (#24). Keyed by
 * `${contentHash}:${suspicious}:${malicious}`. The threshold portion of the
 * key isolates callers using non-default thresholds — recompute, don't share.
 *
 * The bloom-cache stores `BloomEntry`, but we need to round-trip a
 * `ParryScanResult`. We pack `{ score, via }` into the entry's
 * `parryScore` + `markdown` fields:
 *   - `kind: 'content'`, `parryScore`, `markdown`=via — for SAFE/SUSPICIOUS API hits
 *   - `kind: 'blocked'`, `reason`='prompt_injection' — for MALICIOUS
 *
 * Cache initialization is **lazy** so importing this module does not open a
 * SQLite file on disk. Tests that don't exercise the cache stay fast.
 */
let cacheInstance: BloomCache | null = null;
let cacheDbPath: string | undefined; // undefined = use default path

function getCache(): BloomCache {
  if (cacheInstance === null) {
    cacheInstance = new BloomCache(
      cacheDbPath !== undefined ? { dbPath: cacheDbPath } : undefined,
    );
  }
  return cacheInstance;
}

function packToEntry(r: ParryScanResult): BloomEntry {
  if (r.label === 'MALICIOUS') {
    return {
      kind: 'blocked',
      reason: 'prompt_injection',
      parryScore: r.score,
      fetchedAt: new Date().toISOString(),
    };
  }
  return {
    kind: 'content',
    markdown: r.via, // doubles as the via marker
    parryScore: r.score,
    fetchedAt: new Date().toISOString(),
  };
}

function unpackFromEntry(e: BloomEntry, thresholds?: ParryThresholds): ParryScanResult {
  if (e.kind === 'blocked') {
    return {
      label: 'MALICIOUS',
      score: e.parryScore ?? 1.0,
      via: 'api',
    };
  }
  const score = e.parryScore ?? 0;
  return {
    label: classify(score, thresholds),
    score,
    via: e.markdown === 'api' ? 'api' : 'stub',
  };
}

export interface ScanOptions {
  thresholds?: ParryThresholds;
  /** Override token path (test hook + power-user override). */
  tokenPath?: string;
  /** Override fetcher (test hook). */
  __fetch?: Fetcher;
  /**
   * Test/CI: deterministic score injection. Bypasses HF entirely. The
   * subagent-md and subagent-xml tests use this so they don't depend on
   * network or HF token presence.
   */
  __forceScore?: number;
  /**
   * If true, skip the in-memory cache for this call. Useful in tests that
   * want to verify the HF call ran rather than served a cached result.
   */
  __skipCache?: boolean;
}

/**
 * Scan markdown for prompt-injection. Returns `{ score, label, via }`.
 *
 * Behavior matrix:
 *   - `__forceScore` set         → returns that score, via='stub'
 *   - HF token at tokenPath      → live API call, via='api', cached by content hash
 *   - No token                   → returns score=0 SAFE, via='stub'
 *   - HF call fails (network/HTTP) → score=0 SAFE, via='stub' (fail-open)
 *
 * Fail-open is deliberate: a transient HF outage should not block all reads.
 * The bloom cache will eventually persist the SAFE-by-fallback verdict so
 * callers can audit which pages were scanned vs. fallback-passed.
 */
export async function scan(
  markdown: string,
  opts?: ScanOptions,
): Promise<ParryScanResult> {
  if (opts?.__forceScore !== undefined) {
    return {
      label: classify(opts.__forceScore, opts.thresholds),
      score: opts.__forceScore,
      via: 'stub',
    };
  }

  const tokenPath =
    opts?.tokenPath ??
    process.env['PARRY_TOKEN_PATH'] ??
    DEFAULT_TOKEN_PATH;
  const token = readToken(tokenPath);
  if (!token) {
    return { label: 'SAFE', score: 0, via: 'stub' };
  }

  const sus = opts?.thresholds?.suspicious ?? DEFAULT_SUSPICIOUS;
  const mal = opts?.thresholds?.malicious ?? DEFAULT_MALICIOUS;
  const contentHash = await sha256(markdown);
  const cacheKey = `${contentHash}:${sus}:${mal}`;

  if (!opts?.__skipCache) {
    const cache = getCache();
    const cachedEntry = cache.get(cacheKey);
    if (cachedEntry) return unpackFromEntry(cachedEntry, opts?.thresholds);
  }

  const doFetch: Fetcher = opts?.__fetch ?? (fetch as unknown as Fetcher);

  let score: number;
  try {
    const res = await doFetch(HF_INFERENCE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: markdown }),
    });
    if (!res.ok) {
      const fallback: ParryScanResult = { label: 'SAFE', score: 0, via: 'stub' };
      // Cache the fail-open verdict so we don't hammer a broken HF endpoint.
      getCache().put(cacheKey, packToEntry(fallback));
      return fallback;
    }
    const payload = (await res.json()) as unknown;
    const extracted = extractInjectionScore(payload);
    if (extracted === null) {
      const fallback: ParryScanResult = { label: 'SAFE', score: 0, via: 'stub' };
      getCache().put(cacheKey, packToEntry(fallback));
      return fallback;
    }
    score = extracted;
  } catch {
    const fallback: ParryScanResult = { label: 'SAFE', score: 0, via: 'stub' };
    getCache().put(cacheKey, packToEntry(fallback));
    return fallback;
  }

  const result: ParryScanResult = {
    label: classify(score, opts?.thresholds),
    score,
    via: 'api',
  };
  getCache().put(cacheKey, packToEntry(result));
  return result;
}

/**
 * Test-only: reset the bloom cache (in-memory + on-disk).
 *
 * Production code should let cache entries age out via fetch-time logic
 * once that's added; tests use this to start with a clean slate so dedup
 * across tests doesn't mask real changes.
 */
export function __clearScanCacheForTests(): void {
  if (cacheInstance) {
    cacheInstance.reset();
  }
}

/**
 * Test-only: redirect the bloom cache at a non-default path (typically
 * `:memory:`). Must be called before the first `scan()`. If called after
 * the cache has been opened, closes the existing handle and reopens at
 * the new path.
 */
export function __setScanCachePathForTests(dbPath: string): void {
  if (cacheInstance) {
    cacheInstance.close();
    cacheInstance = null;
  }
  cacheDbPath = dbPath;
}
