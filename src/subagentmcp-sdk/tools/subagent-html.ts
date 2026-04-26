/**
 * subagent-html — HTML page reader.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *
 * Pipeline:
 *   plain fetch  → htmlToMarkdown   → parry scan → ContentReaderResult
 *   (or)
 *   plain fetch  → "looks JS-only?" → crawleeFallback.render → htmlToMarkdown → parry scan → ContentReaderResult
 *
 * The Crawlee fallback (issue #27) is opt-in: callers that need JS rendering
 * pass a `crawleeFallback` adapter in opts. With no adapter, behavior matches
 * iter-26 — JS-only pages return `fetch_failed`.
 */

import type {
  ContentReader,
  ContentReaderOptions,
  ContentReaderResult,
} from './types.ts';
import { sha256 } from './types.ts';
import { scan, classify } from './_parry-scan.ts';
import { htmlToMarkdown } from './_html-to-markdown.ts';
import {
  dispatchHtmlFetch,
  type CrawleeAdapter,
  type CrawleeAdapterOptions,
  type DispatchResult,
  type PlainFetcher,
} from './_crawlee-fallback.ts';

export interface HTMLReadOptions extends ContentReaderOptions {
  /**
   * Pluggable Crawlee/Playwright adapter for JS-rendered pages. When
   * present, the reader retries via the adapter if the plain fetch result
   * looks JS-only (per `_crawlee-fallback.ts` § isLikelyJsOnly).
   *
   * Adapter is constructed by the caller — readers don't pull Playwright
   * in as a dep. See `_crawlee-fallback.ts` header for an example impl.
   */
  crawleeFallback?: CrawleeAdapter;
  /** Knobs for the adapter (timeout, memory budget). */
  crawleeOptions?: CrawleeAdapterOptions;
  /** For tests: provide HTML directly instead of fetching the URL. */
  __injectHtml?: string;
  /** For tests: inject a parry score without running the real scanner. */
  __forceParryScore?: number;
  /** For tests: override the plain-fetch path used by the dispatcher. */
  __plainFetch?: PlainFetcher;
}

export interface HTMLReadResult {
  url: string;
  markdown: string;
  /** True when the converter truncated the output to fit `maxBytes`. */
  truncated: boolean;
  /** Length in bytes of the markdown returned. */
  sliceLength: number;
  /**
   * Which fetch path produced this result. Useful for provenance:
   *   'plain-fetch' — plain `fetch` succeeded with non-JS-only content
   *   'crawlee'     — fallback adapter rendered the page in a headless browser
   *   'inject'      — test-only: __injectHtml was used
   */
  fetchedVia: DispatchResult['via'] | 'inject';
}

export const subagentHtml: ContentReader<HTMLReadOptions, HTMLReadResult> = {
  async read(
    url: string,
    opts?: HTMLReadOptions,
  ): Promise<ContentReaderResult<HTMLReadResult> | null> {
    let raw: string;
    let fetchedVia: HTMLReadResult['fetchedVia'];
    if (opts?.__injectHtml !== undefined) {
      raw = opts.__injectHtml;
      fetchedVia = 'inject';
    } else {
      try {
        const dispatchOpts: Parameters<typeof dispatchHtmlFetch>[1] = {};
        if (opts?.crawleeFallback !== undefined) dispatchOpts.adapter = opts.crawleeFallback;
        if (opts?.crawleeOptions !== undefined) dispatchOpts.adapterOptions = opts.crawleeOptions;
        if (opts?.__plainFetch !== undefined) dispatchOpts.__plainFetch = opts.__plainFetch;
        const dispatched = await dispatchHtmlFetch(url, dispatchOpts);
        raw = dispatched.html;
        fetchedVia = dispatched.via;
      } catch {
        return {
          blocked: true,
          data: null,
          reason: 'fetch_failed',
          parryScore: null,
        };
      }
    }

    const conv = htmlToMarkdown(
      raw,
      opts?.maxBytes !== undefined ? { maxBytes: opts.maxBytes } : undefined,
    );

    if (conv.markdown === '') {
      // No prose extracted. With an adapter, the dispatcher would have
      // already retried via Crawlee — so this is a legitimate empty page.
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
        fetchedVia,
      },
      sourceSha256,
      parryScore,
      warnings,
    };
  },
};
