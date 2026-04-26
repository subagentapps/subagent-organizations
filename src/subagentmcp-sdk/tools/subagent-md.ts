/**
 * subagent-md — markdown passthrough reader.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *       § subagent-md (passthrough)
 *
 * For raw markdown URLs (GitHub raw, platform.claude.com docs `.md`,
 * `llms.txt` snapshots). Minimal processing:
 *
 * - Strip frontmatter into a separate `frontmatter` field
 * - Normalize line endings to LF
 * - Optionally strip code-block fences if `opts.unwrapCode` is set
 * - Run parry scan; return blocked result on MALICIOUS verdict
 * - Return raw markdown body + parsed frontmatter
 *
 * Per CLAUDE.md #2 + #3: this file is the implementation of the contract
 * in the spec. Update the spec first when adding fields.
 */

import type {
  ContentReader,
  ContentReaderOptions,
  ContentReaderResult,
} from './types.ts';
import { sha256 } from './types.ts';
import { scan, classify } from './_parry-scan.ts';

/** Options accepted by `subagentMd.read(url, opts)`. */
export interface MDReadOptions extends ContentReaderOptions {
  /**
   * If true, strip the leading and trailing fence of a single code-block
   * that wraps the entire body. No-op when the body isn't fenced.
   */
  unwrapCode?: boolean;
  /**
   * For tests: provide markdown directly instead of fetching the URL.
   * The url field on the result is still populated.
   */
  __injectMarkdown?: string;
  /**
   * For tests: inject a parry score without running the real scanner.
   * Same semantics as `_parry-scan.ts` `__forceScore`.
   */
  __forceParryScore?: number;
}

export interface MDReadResult {
  url: string;
  /** Markdown body, frontmatter removed, line-endings LF, optionally unwrapped. */
  body: string;
  /** Parsed frontmatter as a plain object; empty object if no frontmatter found. */
  frontmatter: Record<string, unknown>;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Tiny YAML-ish frontmatter parser. Supports:
 *   - `key: value` (string)
 *   - `key: 42` / `key: -1.5` (number)
 *   - `key: true` / `key: false` (boolean)
 *   - quoted strings: `key: "quoted"` or `key: 'quoted'`
 * Anything more complex (nested, lists, multi-line) is intentionally
 * out of scope; pull in `gray-matter` if/when we need it.
 */
function parseFrontmatter(raw: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf(':');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const valStr = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    if (valStr === '') {
      out[key] = '';
      continue;
    }
    if (valStr === 'true') {
      out[key] = true;
      continue;
    }
    if (valStr === 'false') {
      out[key] = false;
      continue;
    }
    const asNum = Number(valStr);
    if (!Number.isNaN(asNum) && /^-?\d+(\.\d+)?$/.test(valStr)) {
      out[key] = asNum;
      continue;
    }
    if (
      (valStr.startsWith('"') && valStr.endsWith('"')) ||
      (valStr.startsWith("'") && valStr.endsWith("'"))
    ) {
      out[key] = valStr.slice(1, -1);
      continue;
    }
    out[key] = valStr;
  }
  return out;
}

function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * If the entire body is wrapped in a single fenced code block (``` ... ```),
 * strip the fence pair. Returns the input unchanged otherwise.
 */
function maybeUnwrapCode(body: string): string {
  const m = body.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```\s*$/);
  return m && m[1] !== undefined ? m[1] : body;
}

async function fetchMarkdown(url: string): Promise<string> {
  const res = await fetch(url, { headers: { Accept: 'text/markdown, text/plain, */*' } });
  if (!res.ok) {
    throw new Error(`fetch ${url} -> HTTP ${res.status}`);
  }
  return await res.text();
}

export const subagentMd: ContentReader<MDReadOptions, MDReadResult> = {
  async read(
    url: string,
    opts?: MDReadOptions,
  ): Promise<ContentReaderResult<MDReadResult> | null> {
    let raw: string;
    try {
      raw = opts?.__injectMarkdown ?? (await fetchMarkdown(url));
    } catch {
      return {
        blocked: true,
        data: null,
        reason: 'fetch_failed',
        parryScore: null,
      };
    }

    let normalized = normalizeLineEndings(raw);

    if (opts?.maxBytes && normalized.length > opts.maxBytes) {
      normalized = normalized.slice(0, opts.maxBytes);
    }

    const fmMatch = normalized.match(FRONTMATTER_RE);
    let frontmatter: Record<string, unknown> = {};
    let body = normalized;
    if (fmMatch && fmMatch[1] !== undefined) {
      frontmatter = parseFrontmatter(fmMatch[1]);
      body = normalized.slice(fmMatch[0].length);
    }

    if (opts?.unwrapCode) {
      body = maybeUnwrapCode(body);
    }

    let parryScore: number | null = null;
    if (!opts?.skipParry) {
      const scanOpts: { thresholds?: ContentReaderOptions['parryThresholds']; __forceScore?: number } = {};
      if (opts?.parryThresholds !== undefined) scanOpts.thresholds = opts.parryThresholds;
      if (opts?.__forceParryScore !== undefined) scanOpts.__forceScore = opts.__forceParryScore;
      const scanResult = await scan(body, scanOpts);
      parryScore = scanResult.score;
      if (scanResult.label === 'MALICIOUS') {
        return {
          blocked: true,
          data: null,
          reason: 'prompt_injection',
          parryScore,
        };
      }
    }

    const warnings: string[] = [];
    if (parryScore !== null) {
      const label = classify(parryScore, opts?.parryThresholds);
      if (label === 'SUSPICIOUS') {
        warnings.push('prompt_injection_suspicious');
      }
    }

    const sourceSha256 = await sha256(body);

    return {
      blocked: false,
      data: { url, body, frontmatter },
      sourceSha256,
      parryScore,
      warnings,
    };
  },
};
