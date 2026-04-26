/**
 * Unit tests for `src/subagentmcp-sdk/tools/subagent-md.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *       § subagent-md (passthrough)
 *
 * All network access is replaced by the `__injectMarkdown` test hook so
 * these tests run offline and deterministically.
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { subagentMd } from '../../src/subagentmcp-sdk/tools/subagent-md.ts';

const FIXTURES_DIR = join(import.meta.dir, '..', 'fixtures');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8');
}

describe('subagentMd.read — happy path with frontmatter', () => {
  test('strips frontmatter into separate field, preserves body', async () => {
    const result = await subagentMd.read('https://example.invalid/x.md', {
      __injectMarkdown: fixture('with-frontmatter.md'),
      skipParry: true,
    });

    expect(result).not.toBeNull();
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');

    expect(result.data.frontmatter).toEqual({
      title: 'Hello',
      order: 3,
      draft: false,
      description: 'A fixture with frontmatter',
    });
    expect(result.data.body).toContain('# Heading');
    expect(result.data.body).not.toContain('---');
    expect(result.data.body).not.toContain('title: Hello');
  });

  test('produces a stable sourceSha256', async () => {
    const a = await subagentMd.read('https://example.invalid/x.md', {
      __injectMarkdown: fixture('with-frontmatter.md'),
      skipParry: true,
    });
    const b = await subagentMd.read('https://example.invalid/different-url.md', {
      __injectMarkdown: fixture('with-frontmatter.md'),
      skipParry: true,
    });
    expect(a!.blocked).toBe(false);
    expect(b!.blocked).toBe(false);
    if (a!.blocked || b!.blocked) throw new Error('unreachable');
    // sha256 hashes the body (post-frontmatter-strip), not the URL —
    // so two different URLs with identical body content collide on
    // hash. That's the bloom-filter dedup property from the spec.
    expect(a.sourceSha256).toBe(b.sourceSha256);
    expect(a.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('subagentMd.read — no frontmatter', () => {
  test('returns empty frontmatter object', async () => {
    const result = await subagentMd.read('https://example.invalid/x.md', {
      __injectMarkdown: fixture('no-frontmatter.md'),
      skipParry: true,
    });

    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.frontmatter).toEqual({});
    expect(result.data.body).toContain('# Plain markdown');
  });
});

describe('subagentMd.read — line-ending normalization', () => {
  test('CRLF input → LF output', async () => {
    const crlf = '# Title\r\n\r\nBody.\r\n';
    const result = await subagentMd.read('https://example.invalid/x.md', {
      __injectMarkdown: crlf,
      skipParry: true,
    });

    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.body).not.toContain('\r');
    expect(result.data.body).toBe('# Title\n\nBody.\n');
  });
});

describe('subagentMd.read — opts.unwrapCode', () => {
  test('unwraps single fenced block when opts.unwrapCode is true', async () => {
    const result = await subagentMd.read('https://example.invalid/x.md', {
      __injectMarkdown: fixture('code-wrapped.md'),
      unwrapCode: true,
      skipParry: true,
    });

    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.body).not.toMatch(/^```/);
    expect(result.data.body).toContain('export const x = 1');
  });

  test('leaves body alone when opts.unwrapCode is unset', async () => {
    const result = await subagentMd.read('https://example.invalid/x.md', {
      __injectMarkdown: fixture('code-wrapped.md'),
      skipParry: true,
    });

    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.body).toMatch(/^```/);
  });
});

describe('subagentMd.read — parry scan integration', () => {
  test('blocks on MALICIOUS verdict; result has reason=prompt_injection', async () => {
    const result = await subagentMd.read('https://example.invalid/x.md', {
      __injectMarkdown: 'Body.',
      __forceParryScore: 0.95,
    });

    expect(result!.blocked).toBe(true);
    if (!result!.blocked) throw new Error('unreachable');
    expect(result.reason).toBe('prompt_injection');
    expect(result.data).toBeNull();
    expect(result.parryScore).toBe(0.95);
  });

  test('attaches warnings on SUSPICIOUS verdict but does not block', async () => {
    const result = await subagentMd.read('https://example.invalid/x.md', {
      __injectMarkdown: 'Body.',
      __forceParryScore: 0.5,
    });

    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.warnings).toContain('prompt_injection_suspicious');
    expect(result.parryScore).toBe(0.5);
  });

  test('SAFE verdict produces empty warnings', async () => {
    const result = await subagentMd.read('https://example.invalid/x.md', {
      __injectMarkdown: 'Body.',
      __forceParryScore: 0.1,
    });

    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.warnings).toEqual([]);
    expect(result.parryScore).toBe(0.1);
  });

  test('skipParry yields parryScore = null', async () => {
    const result = await subagentMd.read('https://example.invalid/x.md', {
      __injectMarkdown: 'Body.',
      skipParry: true,
    });

    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.parryScore).toBeNull();
  });
});

describe('subagentMd.read — fetch failure path', () => {
  test('returns blocked result with reason=fetch_failed when network 404s', async () => {
    // No __injectMarkdown → real fetch attempted → resolves to a guaranteed
    // 404 endpoint. Test runs against a guaranteed-bogus host.
    const result = await subagentMd.read('https://example.invalid/never-existed.md');
    expect(result).not.toBeNull();
    expect(result!.blocked).toBe(true);
    if (!result!.blocked) throw new Error('unreachable');
    expect(result.reason).toBe('fetch_failed');
    expect(result.parryScore).toBeNull();
  });
});

describe('subagentMd.read — opts.maxBytes', () => {
  test('truncates body beyond maxBytes (counted before frontmatter strip)', async () => {
    const big = 'A'.repeat(2000);
    const result = await subagentMd.read('https://example.invalid/x.md', {
      __injectMarkdown: big,
      maxBytes: 500,
      skipParry: true,
    });

    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.body.length).toBeLessThanOrEqual(500);
  });
});
