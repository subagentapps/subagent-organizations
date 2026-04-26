/**
 * Integration tests for the Crawlee fallback hooked into `subagent-html`.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 */

import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { subagentHtml } from '../../src/subagentmcp-sdk/tools/subagent-html.ts';
import type { CrawleeAdapter } from '../../src/subagentmcp-sdk/tools/_crawlee-fallback.ts';
import {
  __clearScanCacheForTests,
  __setScanCachePathForTests,
} from '../../src/subagentmcp-sdk/tools/_parry-scan.ts';

beforeAll(() => {
  __setScanCachePathForTests(':memory:');
});

afterEach(() => {
  __clearScanCacheForTests();
});

describe('subagentHtml — Crawlee fallback wiring', () => {
  test('JS-only page upgraded via adapter; fetchedVia = "crawlee"', async () => {
    const tiny = '<html><body><div id="root"></div></body></html>';
    const rendered = `<!doctype html><html><body><article><h1>Real Title</h1><p>${'rendered body prose. '.repeat(30)}</p></article></body></html>`;

    const adapter: CrawleeAdapter = {
      async render(_url) {
        return { html: rendered, status: 200 };
      },
    };

    const result = await subagentHtml.read('https://example.invalid/x', {
      __plainFetch: async () => tiny,
      crawleeFallback: adapter,
      skipParry: true,
    });

    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.fetchedVia).toBe('crawlee');
    expect(result.data.markdown).toContain('# Real Title');
  });

  test('real content returns plain-fetch path; adapter not invoked', async () => {
    const real = `<!doctype html><html><head><title>Real</title></head><body><article><h1>Real</h1>${'<p>real prose body content with ample length to clear the heuristic. </p>'.repeat(20)}</article></body></html>`;
    let renderCalls = 0;
    const adapter: CrawleeAdapter = {
      async render(_url) {
        renderCalls++;
        return { html: '', status: 0 };
      },
    };

    const result = await subagentHtml.read('https://example.invalid/x', {
      __plainFetch: async () => real,
      crawleeFallback: adapter,
      skipParry: true,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.fetchedVia).toBe('plain-fetch');
    expect(renderCalls).toBe(0);
  });

  test('adapter invoked when plain fetch throws', async () => {
    const rendered = `<!doctype html><html><body><article><p>${'prose '.repeat(30)}</p></article></body></html>`;
    const adapter: CrawleeAdapter = {
      async render(_url) {
        return { html: rendered, status: 200 };
      },
    };

    const result = await subagentHtml.read('https://example.invalid/x', {
      __plainFetch: async () => {
        throw new Error('403');
      },
      crawleeFallback: adapter,
      skipParry: true,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.fetchedVia).toBe('crawlee');
  });

  test('without adapter, JS-only result is fetch_failed (iter-26 behavior preserved)', async () => {
    const tiny = '<html><body><div id="root"></div></body></html>';
    const result = await subagentHtml.read('https://example.invalid/x', {
      __plainFetch: async () => tiny,
      skipParry: true,
    });
    expect(result!.blocked).toBe(true);
    if (!result!.blocked) throw new Error('unreachable');
    expect(result.reason).toBe('fetch_failed');
  });

  test('adapter throws → reader returns fetch_failed (does not crash)', async () => {
    const tiny = '<html><body><div id="root"></div></body></html>';
    const adapter: CrawleeAdapter = {
      async render(_url) {
        throw new Error('playwright timeout');
      },
    };
    const result = await subagentHtml.read('https://example.invalid/x', {
      __plainFetch: async () => tiny,
      crawleeFallback: adapter,
      skipParry: true,
    });
    expect(result!.blocked).toBe(true);
    if (!result!.blocked) throw new Error('unreachable');
    expect(result.reason).toBe('fetch_failed');
  });

  test('__injectHtml path yields fetchedVia="inject" (test fixture parity)', async () => {
    const real = `<!doctype html><html><body><article><h1>Inject</h1><p>${'p '.repeat(40)}</p></article></body></html>`;
    const result = await subagentHtml.read('https://example.invalid/x', {
      __injectHtml: real,
      skipParry: true,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.fetchedVia).toBe('inject');
  });
});
