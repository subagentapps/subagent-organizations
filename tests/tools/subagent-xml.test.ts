/**
 * Unit tests for `src/subagentmcp-sdk/tools/subagent-xml.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md § subagent-xml
 *
 * All network access is replaced by `__injectXml` so these tests run offline.
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { subagentXml } from '../../src/subagentmcp-sdk/tools/subagent-xml.ts';
import { parseXml, selectXml } from '../../src/subagentmcp-sdk/tools/_xml-parse.ts';

const FIXTURES_DIR = join(import.meta.dir, '..', 'fixtures');

function fixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8');
}

describe('parseXml — primitives', () => {
  test('parses simple element with attrs and text', () => {
    const root = parseXml('<root attr="v"><child>hi</child></root>');
    expect(root.name).toBe('root');
    expect(root.attrs).toEqual({ attr: 'v' });
    expect(root.children).toHaveLength(1);
    expect(root.children[0]!.name).toBe('child');
    expect(root.children[0]!.text).toBe('hi');
  });

  test('decodes XML entities', () => {
    const root = parseXml('<r>foo &amp; bar &lt;ok&gt;</r>');
    expect(root.text).toBe('foo & bar <ok>');
  });

  test('decodes CDATA verbatim including markup characters', () => {
    const root = parseXml('<r><![CDATA[Body with <markup> & symbols.]]></r>');
    expect(root.text).toBe('Body with <markup> & symbols.');
  });

  test('handles self-closing tags', () => {
    const root = parseXml('<r><a/><b foo="bar" /></r>');
    expect(root.children).toHaveLength(2);
    expect(root.children[0]!.name).toBe('a');
    expect(root.children[1]!.attrs).toEqual({ foo: 'bar' });
  });

  test('strips XML declaration and comments', () => {
    const root = parseXml(
      '<?xml version="1.0"?>\n<!-- header -->\n<r>x</r>',
    );
    expect(root.name).toBe('r');
    expect(root.text).toBe('x');
  });

  test('throws on mismatched close tag', () => {
    expect(() => parseXml('<r><a></b></r>')).toThrow(/Mismatched/);
  });
});

describe('selectXml — XPath subset', () => {
  test('absolute path returns root match', () => {
    const root = parseXml('<feed><entry>1</entry><entry>2</entry></feed>');
    const result = selectXml(root, '/feed');
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('feed');
  });

  test('absolute path returns multiple children', () => {
    const root = parseXml('<feed><entry>1</entry><entry>2</entry></feed>');
    const result = selectXml(root, '/feed/entry');
    expect(result).toHaveLength(2);
    expect(result[0]!.text).toBe('1');
  });

  test('descendant axis matches at any depth', () => {
    const root = parseXml('<a><b><c>x</c></b><d><c>y</c></d></a>');
    const result = selectXml(root, '//c');
    expect(result).toHaveLength(2);
    expect(result.map((n) => n.text)).toEqual(['x', 'y']);
  });

  test('positional predicate (1-based)', () => {
    const root = parseXml('<feed><entry>1</entry><entry>2</entry><entry>3</entry></feed>');
    const result = selectXml(root, '/feed/entry[2]');
    expect(result).toHaveLength(1);
    expect(result[0]!.text).toBe('2');
  });

  test('star matches any element', () => {
    const root = parseXml('<a><b/><c/></a>');
    expect(selectXml(root, '/a/*')).toHaveLength(2);
  });
});

describe('subagentXml.read — sitemap.xml', () => {
  test('extracts every <loc> via descendant axis', async () => {
    const result = await subagentXml.read('https://example.invalid/sitemap.xml', {
      __injectXml: fixture('sitemap.xml'),
      selector: '//loc',
      skipParry: true,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.nodes).toHaveLength(3);
    expect(result.data.nodes[0]!.text).toBe('https://platform.claude.com/docs/en/intro');
    expect(result.data.nodes[2]!.text).toBe('https://platform.claude.com/docs/en/api/overview');
  });

  test('returns full root when no selector', async () => {
    const result = await subagentXml.read('https://example.invalid/sitemap.xml', {
      __injectXml: fixture('sitemap.xml'),
      skipParry: true,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.node.name).toBe('urlset');
    expect(result.data.node.children).toHaveLength(3);
  });
});

describe('subagentXml.read — atom feed', () => {
  test('extracts entries; CDATA decoded into text', async () => {
    const result = await subagentXml.read('https://example.invalid/atom.xml', {
      __injectXml: fixture('atom.xml'),
      selector: '/feed/entry',
      skipParry: true,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.nodes).toHaveLength(2);
    const summaries = result.data.nodes.map((entry) =>
      entry.children.find((c) => c.name === 'summary')?.text,
    );
    expect(summaries[0]).toBe('The first post.');
    expect(summaries[1]).toBe('Body with <markup> & special chars.');
  });

  test('decodes & entity in title', async () => {
    const result = await subagentXml.read('https://example.invalid/atom.xml', {
      __injectXml: fixture('atom.xml'),
      selector: '/feed/entry[2]/title',
      skipParry: true,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.node.text).toBe('Second entry, with & entity');
  });
});

describe('subagentXml.read — OpenAPI XML', () => {
  test('extracts /api/paths/path attrs', async () => {
    const result = await subagentXml.read('https://example.invalid/openapi.xml', {
      __injectXml: fixture('openapi.xml'),
      selector: '/api/paths/path',
      skipParry: true,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.data.nodes).toHaveLength(3);
    expect(result.data.nodes.map((n) => n.attrs.method)).toEqual(['GET', 'GET', 'POST']);
    expect(result.data.nodes.map((n) => n.attrs.uri)).toEqual([
      '/users',
      '/users/{id}',
      '/users',
    ]);
  });
});

describe('subagentXml.read — schema validation', () => {
  test('runs schema.parse and surfaces the result on data', async () => {
    const seen: unknown[] = [];
    const schema = {
      parse(input: unknown) {
        seen.push(input);
        return { ok: true };
      },
    };
    const result = await subagentXml.read('https://example.invalid/sitemap.xml', {
      __injectXml: fixture('sitemap.xml'),
      selector: '/urlset',
      schema,
      skipParry: true,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(seen).toHaveLength(1);
    expect(result.data.data).toEqual({ ok: true });
  });

  test('blocks when schema.parse throws', async () => {
    const schema = {
      parse(_input: unknown) {
        throw new Error('schema mismatch');
      },
    };
    const result = await subagentXml.read('https://example.invalid/sitemap.xml', {
      __injectXml: fixture('sitemap.xml'),
      schema,
      skipParry: true,
    });
    expect(result!.blocked).toBe(true);
    if (!result!.blocked) throw new Error('unreachable');
    expect(result.reason).toBe('fetch_failed');
  });
});

describe('subagentXml.read — parry integration', () => {
  test('blocks on MALICIOUS verdict', async () => {
    const result = await subagentXml.read('https://example.invalid/x.xml', {
      __injectXml: '<r>safe body</r>',
      __forceParryScore: 0.95,
    });
    expect(result!.blocked).toBe(true);
    if (!result!.blocked) throw new Error('unreachable');
    expect(result.reason).toBe('prompt_injection');
    expect(result.parryScore).toBe(0.95);
  });

  test('warns but does not block on SUSPICIOUS', async () => {
    const result = await subagentXml.read('https://example.invalid/x.xml', {
      __injectXml: '<r>body</r>',
      __forceParryScore: 0.5,
    });
    expect(result!.blocked).toBe(false);
    if (result!.blocked) throw new Error('unreachable');
    expect(result.warnings).toContain('prompt_injection_suspicious');
  });
});

describe('subagentXml.read — failure paths', () => {
  test('returns blocked when parse fails', async () => {
    const result = await subagentXml.read('https://example.invalid/x.xml', {
      __injectXml: '<r>unclosed',
      skipParry: true,
    });
    expect(result!.blocked).toBe(true);
  });

  test('returns blocked when selector matches nothing', async () => {
    const result = await subagentXml.read('https://example.invalid/x.xml', {
      __injectXml: '<r><a/></r>',
      selector: '/r/nonexistent',
      skipParry: true,
    });
    expect(result!.blocked).toBe(true);
  });

  test('returns blocked on real fetch failure', async () => {
    const result = await subagentXml.read('https://example.invalid/never-existed.xml');
    expect(result!.blocked).toBe(true);
    if (!result!.blocked) throw new Error('unreachable');
    expect(result.reason).toBe('fetch_failed');
  });
});
