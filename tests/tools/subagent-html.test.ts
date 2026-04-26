/**
 * Unit tests for `src/subagentmcp-sdk/tools/subagent-html.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 */

import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { subagentHtml } from '../../src/subagentmcp-sdk/tools/subagent-html.ts';
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

const FIXTURES_DIR = join(import.meta.dir, '..', 'fixtures');
function fixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8');
}

describe('subagentHtml.read — happy path', () => {
  test('Anthropic blog fixture: clean markdown extracted', async () => {
    const result = await subagentHtml.read('https://example.invalid/blog.html', {
      __injectHtml: fixture('anthropic-blog.html'),
      skipParry: true,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.markdown).toContain('# Introducing contextual retrieval');
    expect(result.data.markdown).toContain('1.9% retrieval failure');
    expect(result.data.markdown).not.toContain('tracker noise');
    expect(result.data.truncated).toBe(false);
  });

  test('Cowork fixture: chrome stripped, prose preserved', async () => {
    const result = await subagentHtml.read('https://example.invalid/cowork.html', {
      __injectHtml: fixture('cowork-bloat.html'),
      skipParry: true,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.markdown).toContain('# How we built Cowork');
    expect(result.data.markdown).not.toContain('SLIDER_CONFIG');
  });

  test('produces stable sourceSha256 from markdown body', async () => {
    const a = await subagentHtml.read('https://example.invalid/x.html', {
      __injectHtml: fixture('anthropic-blog.html'),
      skipParry: true,
    });
    const b = await subagentHtml.read('https://example.invalid/different-url.html', {
      __injectHtml: fixture('anthropic-blog.html'),
      skipParry: true,
    });
    if (a!.blocked || b!.blocked) throw new Error('unreachable');
    expect(a.sourceSha256).toBe(b.sourceSha256);
    expect(a.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('subagentHtml.read — JS-only page treated as fetch_failed', () => {
  test('JS shell with <120 chars of extractable content → blocked', async () => {
    const result = await subagentHtml.read('https://example.invalid/x.html', {
      __injectHtml: '<html><head></head><body><div id="root"></div></body></html>',
      skipParry: true,
    });
    expect(result!.blocked).toBe(true);
    if (!result!.blocked) throw new Error('unreachable');
    expect(result.reason).toBe('fetch_failed');
  });
});

describe('subagentHtml.read — parry integration', () => {
  test('blocks on MALICIOUS verdict', async () => {
    const result = await subagentHtml.read('https://example.invalid/x.html', {
      __injectHtml: '<p>any body</p>',
      __forceParryScore: 0.95,
    });
    expect(result!.blocked).toBe(true);
    if (!result!.blocked) throw new Error('unreachable');
    expect(result.reason).toBe('prompt_injection');
    expect(result.parryScore).toBe(0.95);
  });

  test('warns on SUSPICIOUS but does not block', async () => {
    const result = await subagentHtml.read('https://example.invalid/x.html', {
      __injectHtml: '<p>any body</p>',
      __forceParryScore: 0.5,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.warnings).toContain('prompt_injection_suspicious');
  });

  test('SAFE verdict yields no warnings', async () => {
    const result = await subagentHtml.read('https://example.invalid/x.html', {
      __injectHtml: '<p>safe body</p>',
      __forceParryScore: 0.05,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.warnings).toEqual([]);
  });
});

describe('subagentHtml.read — maxBytes', () => {
  test('truncates output and sets truncated=true', async () => {
    const big = '<p>' + 'A'.repeat(10000) + '</p>';
    const result = await subagentHtml.read('https://example.invalid/x.html', {
      __injectHtml: big,
      maxBytes: 500,
      skipParry: true,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.truncated).toBe(true);
    expect(result.data.markdown.length).toBe(500);
    expect(result.data.sliceLength).toBe(500);
  });
});

describe('subagentHtml.read — fetch failure', () => {
  test('returns blocked when network fails', async () => {
    const result = await subagentHtml.read('https://example.invalid/never-existed.html');
    expect(result!.blocked).toBe(true);
    if (!result!.blocked) throw new Error('unreachable');
    expect(result.reason).toBe('fetch_failed');
  });
});
