/**
 * Unit tests for `_crawlee-fallback.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *       § Why crawlee specifically (Implementation note 2026-04-26)
 *
 * Verifies:
 *   - isLikelyJsOnly heuristic flags small / no-body / noscript-dominated pages
 *   - dispatchHtmlFetch returns plain result when content is real
 *   - dispatchHtmlFetch invokes the adapter when content looks JS-only
 *   - dispatchHtmlFetch invokes the adapter when plain fetch throws (with adapter)
 *   - dispatchHtmlFetch falls through with no adapter (preserves iter-26 behavior)
 */

import { describe, expect, test } from 'bun:test';
import {
  isLikelyJsOnly,
  dispatchHtmlFetch,
  type CrawleeAdapter,
} from '../../src/subagentmcp-sdk/tools/_crawlee-fallback.ts';

describe('isLikelyJsOnly', () => {
  test('empty string → true', () => {
    expect(isLikelyJsOnly('')).toBe(true);
    expect(isLikelyJsOnly('   \n\t  ')).toBe(true);
  });

  test('tiny html (< 512 bytes) → true', () => {
    expect(isLikelyJsOnly('<html><body><div id="root"></div></body></html>')).toBe(true);
  });

  test('no body element → true', () => {
    const big = '<html>' + 'A'.repeat(1000) + '</html>';
    expect(isLikelyJsOnly(big)).toBe(true);
  });

  test('body present but content < 100 chars → true', () => {
    const html = `<!doctype html><html><head>${'X'.repeat(600)}</head><body><div id="root"></div></body></html>`;
    expect(isLikelyJsOnly(html)).toBe(true);
  });

  test('body dominated by noscript message → true', () => {
    const html = `<!doctype html><html><head>${'X'.repeat(500)}</head><body><div id="root"></div><noscript>You need JavaScript enabled to view this site, please reload after enabling.</noscript></body></html>`;
    expect(isLikelyJsOnly(html)).toBe(true);
  });

  test('real article with prose → false', () => {
    const article = `<!doctype html><html><head><title>X</title></head><body>
      <article>
        <h1>Real article</h1>
        <p>${'This is a paragraph with substantive prose. '.repeat(20)}</p>
        <p>Another paragraph with more text content here. ${'word '.repeat(50)}</p>
      </article>
    </body></html>`;
    expect(isLikelyJsOnly(article)).toBe(false);
  });

  test('large body padded with script tags but real prose → false', () => {
    const html = `<!doctype html><html><body>
      <script>${'noise '.repeat(500)}</script>
      <h1>Headline</h1>
      <p>${'real prose body content '.repeat(40)}</p>
      <script>${'more noise '.repeat(200)}</script>
    </body></html>`;
    expect(isLikelyJsOnly(html)).toBe(false);
  });
});

describe('dispatchHtmlFetch — plain success path', () => {
  test('returns plain HTML when content is real', async () => {
    const realHtml = `<!doctype html><html><body>${'<p>Body paragraph with ample prose content here. </p>'.repeat(40)}</body></html>`;
    const result = await dispatchHtmlFetch('https://example.invalid/x', {
      __plainFetch: async () => realHtml,
    });
    expect(result.via).toBe('plain-fetch');
    expect(result.html).toBe(realHtml);
  });
});

describe('dispatchHtmlFetch — fallback to adapter on JS-only content', () => {
  test('invokes adapter when plain returns JS-only HTML', async () => {
    const tinyHtml = '<html><body><div id="root"></div></body></html>';
    const renderedHtml = `<html><body><article><h1>Rendered</h1><p>${'rendered prose '.repeat(40)}</p></article></body></html>`;
    let renderCalls = 0;
    const adapter: CrawleeAdapter = {
      async render(_url) {
        renderCalls++;
        return { html: renderedHtml, status: 200 };
      },
    };

    const result = await dispatchHtmlFetch('https://example.invalid/x', {
      __plainFetch: async () => tinyHtml,
      adapter,
    });
    expect(renderCalls).toBe(1);
    expect(result.via).toBe('crawlee');
    expect(result.html).toBe(renderedHtml);
  });

  test('does NOT invoke adapter when plain returns real content', async () => {
    const realHtml = `<!doctype html><html><body>${'<p>Real prose content with substantial body. </p>'.repeat(40)}</body></html>`;
    let renderCalls = 0;
    const adapter: CrawleeAdapter = {
      async render(_url) {
        renderCalls++;
        return { html: '<html></html>', status: 200 };
      },
    };
    const result = await dispatchHtmlFetch('https://example.invalid/x', {
      __plainFetch: async () => realHtml,
      adapter,
    });
    expect(renderCalls).toBe(0);
    expect(result.via).toBe('plain-fetch');
  });

  test('invokes adapter when plain fetch throws', async () => {
    const renderedHtml = `<!doctype html><html><body>${'<p>Recovered prose content with body. </p>'.repeat(40)}</body></html>`;
    const adapter: CrawleeAdapter = {
      async render(_url) {
        return { html: renderedHtml, status: 200 };
      },
    };
    const result = await dispatchHtmlFetch('https://example.invalid/x', {
      __plainFetch: async () => {
        throw new Error('403 Forbidden');
      },
      adapter,
    });
    expect(result.via).toBe('crawlee');
    expect(result.html).toBe(renderedHtml);
  });

  test('passes adapterOptions through', async () => {
    let receivedOpts: unknown = null;
    const adapter: CrawleeAdapter = {
      async render(_url, o) {
        receivedOpts = o;
        return {
          html: `<!doctype html><html><body>${'<p>rendered prose body. </p>'.repeat(40)}</body></html>`,
          status: 200,
        };
      },
    };
    await dispatchHtmlFetch('https://example.invalid/x', {
      __plainFetch: async () => '<html></html>',
      adapter,
      adapterOptions: { timeoutMs: 5000, memoryBudgetMb: 256 },
    });
    expect(receivedOpts).toEqual({ timeoutMs: 5000, memoryBudgetMb: 256 });
  });
});

describe('dispatchHtmlFetch — no-adapter behavior preserves iter-26', () => {
  test('JS-only HTML returned as-is when no adapter', async () => {
    const tiny = '<html><body><div id="root"></div></body></html>';
    const result = await dispatchHtmlFetch('https://example.invalid/x', {
      __plainFetch: async () => tiny,
    });
    expect(result.via).toBe('plain-fetch');
    expect(result.html).toBe(tiny);
  });

  test('plain fetch error rethrown when no adapter', async () => {
    await expect(
      dispatchHtmlFetch('https://example.invalid/x', {
        __plainFetch: async () => {
          throw new Error('original-error');
        },
      }),
    ).rejects.toThrow('original-error');
  });
});
