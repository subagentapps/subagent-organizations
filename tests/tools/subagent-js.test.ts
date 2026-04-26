/**
 * Unit tests for `src/subagentmcp-sdk/tools/subagent-js.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md § Subagent-js
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { subagentJs } from '../../src/subagentmcp-sdk/tools/subagent-js.ts';

const FIXTURES_DIR = join(import.meta.dir, '..', 'fixtures');
function fixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8');
}

describe('subagentJs.read — happy path', () => {
  test('extracts EVENTS array from context-window-events.mdx', async () => {
    const result = await subagentJs.read(
      'https://example.invalid/context-window.mdx',
      {
        exportName: 'EVENTS',
        __injectSource: fixture('context-window-events.mdx'),
      },
    );
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    const events = result.data.data as Array<Record<string, unknown>>;
    expect(events).toHaveLength(5);
    expect(events[0]?.kind).toBe('system');
    expect(result.data.exportName).toBe('EVENTS');
  });

  test('sourceSha256 reflects source bytes (not extracted value)', async () => {
    const a = await subagentJs.read('https://example.invalid/x.js', {
      exportName: 'X',
      __injectSource: 'export const X = [1, 2, 3];',
    });
    const b = await subagentJs.read('https://example.invalid/y.js', {
      exportName: 'X',
      __injectSource: 'export const X = [1, 2, 3];',
    });
    if (a!.blocked || b!.blocked) throw new Error('unreachable');
    expect(a.sourceSha256).toBe(b.sourceSha256);
    expect(a.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('subagentJs.read — schema validation', () => {
  test('runs schema.parse and surfaces the validated result', async () => {
    const seen: unknown[] = [];
    const schema = {
      parse(input: unknown) {
        seen.push(input);
        return { validated: true, raw: input };
      },
    };
    const result = await subagentJs.read('https://example.invalid/x.js', {
      exportName: 'X',
      __injectSource: 'export const X = { a: 1 };',
      schema,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(seen).toEqual([{ a: 1 }]);
    expect(result.data.data).toEqual({ validated: true, raw: { a: 1 } });
  });

  test('blocks when schema.parse throws', async () => {
    const schema = {
      parse(_input: unknown) {
        throw new Error('schema mismatch');
      },
    };
    const result = await subagentJs.read('https://example.invalid/x.js', {
      exportName: 'X',
      __injectSource: 'export const X = "wrong-type";',
      schema,
    });
    expect(result!.blocked).toBe(true);
    if (!result!.blocked) throw new Error('unreachable');
    expect(result.reason).toBe('fetch_failed');
  });
});

describe('subagentJs.read — failure paths', () => {
  test('missing exportName option → blocked', async () => {
    const result = await subagentJs.read('https://example.invalid/x.js', {
      // @ts-expect-error - intentionally missing required field for runtime guard test
      exportName: '',
      __injectSource: 'export const X = 1;',
    });
    expect(result!.blocked).toBe(true);
  });

  test('export not found → blocked with reason=fetch_failed', async () => {
    const result = await subagentJs.read('https://example.invalid/x.js', {
      exportName: 'MISSING',
      __injectSource: 'export const X = 1;',
    });
    expect(result!.blocked).toBe(true);
    if (!result!.blocked) throw new Error('unreachable');
    expect(result.reason).toBe('fetch_failed');
  });

  test('unsupported syntax → blocked', async () => {
    const result = await subagentJs.read('https://example.invalid/x.js', {
      exportName: 'X',
      __injectSource: 'export const X = compute(1, 2);',
    });
    expect(result!.blocked).toBe(true);
  });

  test('real fetch failure → blocked', async () => {
    const result = await subagentJs.read(
      'https://example.invalid/never-existed.js',
      { exportName: 'X' },
    );
    expect(result!.blocked).toBe(true);
    if (!result!.blocked) throw new Error('unreachable');
    expect(result.reason).toBe('fetch_failed');
  });
});

describe('subagentJs.read — maxBytes', () => {
  test('truncates source before evaluation', async () => {
    // Construct a source where the export's RHS extends past byte 200.
    const filler = 'A'.repeat(200);
    const src = `// ${filler}\nexport const X = [1,2,3];`;
    const result = await subagentJs.read('https://example.invalid/x.js', {
      exportName: 'X',
      __injectSource: src,
      maxBytes: 100,
    });
    // Truncated to 100 bytes — the export statement is gone, so extraction
    // fails. This proves maxBytes is honored. (Real callers should pick a
    // budget large enough to include the export they want.)
    expect(result!.blocked).toBe(true);
  });
});
