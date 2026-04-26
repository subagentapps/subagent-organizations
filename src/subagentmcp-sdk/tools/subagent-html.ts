/**
 * subagent-html — HTML page reader.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *
 * Plain `fetch` of the URL → `htmlToMarkdown()` → parry scan →
 * ContentReaderResult.
 *
 * Crawlee/Playwright fallback for JS-rendered pages is **out of scope** for
 * this PR — tracked as issue #27. When that lands, this reader gains an
 * automatic fallback path: detect "very small body" or "no <body> element"
 * and re-fetch via headless browser.
 */

import type {
  ContentReader,
  ContentReaderOptions,
  ContentReaderResult,
} from './types.ts';
import { sha256 } from './types.ts';
import { scan, classify } from './_parry-scan.ts';
import { htmlToMarkdown } from './_html-to-markdown.ts';

export interface HTMLReadOptions extends ContentReaderOptions {
  /** For tests: provide HTML directly instead of fetching the URL. */
  __injectHtml?: string;
  /** For tests: inject a parry score without running the real scanner. */
  __forceParryScore?: number;
}

export interface HTMLReadResult {
  url: string;
  markdown: string;
  /**
   * True when the converter truncated the output to fit `maxBytes`. Caller
   * may want to fetch the source URL directly for the full content.
   */
  truncated: boolean;
  /** Length in bytes of the markdown returned. */
  sliceLength: number;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`);
  return await res.text();
}

export const subagentHtml: ContentReader<HTMLReadOptions, HTMLReadResult> = {
  async read(
    url: string,
    opts?: HTMLReadOptions,
  ): Promise<ContentReaderResult<HTMLReadResult> | null> {
    let raw: string;
    try {
      raw = opts?.__injectHtml ?? (await fetchHtml(url));
    } catch {
      return {
        blocked: true,
        data: null,
        reason: 'fetch_failed',
        parryScore: null,
      };
    }

    const conv = htmlToMarkdown(raw, opts?.maxBytes !== undefined ? { maxBytes: opts.maxBytes } : undefined);

    if (conv.markdown === '') {
      // Likely a JS-only page or empty/error response. Crawlee fallback
      // (#27) will catch this; for now we surface it as a fetch failure.
      return {
        blocked: true,
        data: null,
        reason: 'fetch_failed',
        parryScore: null,
      };
    }

    let parryScore: number | null = null;
    if (!opts?.skipParry) {
      const scanOpts: { thresholds?: ContentReaderOptions['parryThresholds']; __forceScore?: number } = {};
      if (opts?.parryThresholds !== undefined) scanOpts.thresholds = opts.parryThresholds;
      if (opts?.__forceParryScore !== undefined) scanOpts.__forceScore = opts.__forceParryScore;
      const scanResult = await scan(conv.markdown, scanOpts);
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
      if (label === 'SUSPICIOUS') warnings.push('prompt_injection_suspicious');
    }

    const sourceSha256 = await sha256(conv.markdown);

    return {
      blocked: false,
      data: {
        url,
        markdown: conv.markdown,
        truncated: conv.truncated,
        sliceLength: conv.sliceLength,
      },
      sourceSha256,
      parryScore,
      warnings,
    };
  },
};
