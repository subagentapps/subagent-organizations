/**
 * Crawlee/Playwright fallback for JS-rendered pages.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *       § Why crawlee specifically
 *
 * Per CLAUDE.md "TypeScript reference catalog" framing: this file ships the
 * **interface and dispatch heuristic** for the Crawlee fallback, NOT the
 * 300MB Chromium runtime. Callers that hit JS-only pages in production
 * provide a `CrawleeAdapter` implementation (typically a thin wrapper
 * around Crawlee's `PlaywrightCrawler`); the readers consume it.
 *
 * This keeps the dep cost off everyone who does not need JS rendering.
 * Issue #27's body explicitly says "defer until we hit a JS-only page in
 * real use" — adopting Playwright eagerly would penalize every install for
 * a feature only the few callers that scrape claude.ai/blogs need.
 *
 * The runtime is zero-dep here. A consumer that needs the real thing does
 * roughly:
 *
 *   import { PlaywrightCrawler } from 'crawlee';
 *   const adapter: CrawleeAdapter = {
 *     async render(url, opts) {
 *       const out = { html: '', status: 0 };
 *       const crawler = new PlaywrightCrawler({
 *         requestHandler: async ({ page, response }) => {
 *           out.status = response?.status() ?? 0;
 *           out.html = await page.content();
 *         },
 *         maxConcurrency: 1,
 *       });
 *       await crawler.run([url]);
 *       return out;
 *     },
 *   };
 *   subagentHtml.read(url, { crawleeFallback: adapter });
 */

/**
 * Heuristic for "this fetched HTML looks JS-only / not real content".
 * Returns true when the html is a candidate for re-fetch via Crawlee.
 *
 * Rules (any one triggers fallback):
 *   1. Empty / whitespace-only
 *   2. Length < 512 bytes — most static pages are larger; JS-only shells
 *      are typically a few hundred bytes
 *   3. No <body> tag at all
 *   4. <body> body content (after stripping <script>/<style>) under 100 chars
 *   5. Body content is dominated (>80%) by a `noscript` warning
 *
 * The first three are crisp. Rules 4 and 5 are heuristic; tune via tests
 * if real-world pages produce false positives.
 */
export function isLikelyJsOnly(html: string): boolean {
  if (!html || /^\s*$/.test(html)) return true;
  if (html.length < 512) return true;
  const lowered = html.toLowerCase();
  if (!lowered.includes('<body')) return true;

  // Strip script/style/svg/style content for the body-content estimate.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyInner = bodyMatch?.[1] ?? '';
  const cleaned = bodyInner
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < 100) return true;

  const noscriptMatch = bodyInner.match(/<noscript[^>]*>([\s\S]*?)<\/noscript>/i);
  const noscriptText = (noscriptMatch?.[1] ?? '').replace(/<[^>]+>/g, '').trim();
  if (noscriptText.length > 0 && noscriptText.length / cleaned.length > 0.8) {
    return true;
  }

  return false;
}

/** Result a CrawleeAdapter must return after rendering a URL. */
export interface CrawleeRenderResult {
  /** Fully-rendered HTML — what `page.content()` returns from Playwright. */
  html: string;
  /** HTTP status from the navigation response. 0 if unknown. */
  status: number;
}

export interface CrawleeAdapterOptions {
  /** Soft timeout for page-load + JS execution. Adapter may ignore. */
  timeoutMs?: number;
  /** Hint for resource budget. Adapter may ignore. */
  memoryBudgetMb?: number;
}

/**
 * Pluggable adapter. Callers that need JS rendering provide a real impl
 * backed by Crawlee/Playwright; tests pass a stub.
 */
export interface CrawleeAdapter {
  render(url: string, opts?: CrawleeAdapterOptions): Promise<CrawleeRenderResult>;
}

/**
 * Dispatch helper used by readers: try plain fetch first, return its result
 * if good, otherwise hand off to the adapter. Callers that don't supply an
 * adapter get the plain-fetch result unconditionally (current `subagent-html`
 * behavior).
 *
 * Returns the fetched HTML and a tag indicating which path was used so
 * callers can record provenance.
 */
export interface DispatchResult {
  html: string;
  via: 'plain-fetch' | 'crawlee';
}

/**
 * Plain-fetch wrapper used by the dispatcher. Surfaced for test injection.
 */
export type PlainFetcher = (url: string) => Promise<string>;

const defaultPlainFetcher: PlainFetcher = async (url) => {
  const res = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`);
  return await res.text();
};

export interface DispatchOptions {
  adapter?: CrawleeAdapter;
  adapterOptions?: CrawleeAdapterOptions;
  /** Test hook: override the plain-fetch path. */
  __plainFetch?: PlainFetcher;
}

/**
 * Try plain fetch; if it throws OR `isLikelyJsOnly` flags the result, ask
 * the adapter to render. If no adapter is provided, the plain-fetch result
 * (or its error) is returned as-is — callers that haven't opted in stay
 * with the iter-26 behavior.
 */
export async function dispatchHtmlFetch(
  url: string,
  opts?: DispatchOptions,
): Promise<DispatchResult> {
  const plain = opts?.__plainFetch ?? defaultPlainFetcher;
  let plainHtml: string | null = null;
  let plainError: unknown = null;
  try {
    plainHtml = await plain(url);
  } catch (e) {
    plainError = e;
  }

  if (plainHtml !== null && !isLikelyJsOnly(plainHtml)) {
    return { html: plainHtml, via: 'plain-fetch' };
  }

  if (!opts?.adapter) {
    if (plainHtml !== null) {
      // Plain succeeded but the result looks JS-only and no adapter is
      // configured — return as-is so the reader can flag it.
      return { html: plainHtml, via: 'plain-fetch' };
    }
    // Plain failed and no adapter — re-throw the original error.
    throw plainError;
  }

  const rendered = await opts.adapter.render(
    url,
    opts.adapterOptions,
  );
  return { html: rendered.html, via: 'crawlee' };
}
