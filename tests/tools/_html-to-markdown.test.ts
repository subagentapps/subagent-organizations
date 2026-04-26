/**
 * Unit tests for `_html-to-markdown.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *       § markdown-it preprocessing (Implementation note 2026-04-26)
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { htmlToMarkdown } from '../../src/subagentmcp-sdk/tools/_html-to-markdown.ts';

const FIXTURES_DIR = join(import.meta.dir, '..', 'fixtures');
function fixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8');
}

describe('htmlToMarkdown — primitives', () => {
  test('plain paragraph', () => {
    const r = htmlToMarkdown('<p>Hello world.</p>');
    expect(r.markdown).toBe('Hello world.');
    expect(r.truncated).toBe(false);
  });

  test('headings 1-6', () => {
    const r = htmlToMarkdown('<h1>A</h1><h2>B</h2><h3>C</h3><h4>D</h4><h5>E</h5><h6>F</h6>');
    expect(r.markdown).toContain('# A');
    expect(r.markdown).toContain('## B');
    expect(r.markdown).toContain('### C');
    expect(r.markdown).toContain('#### D');
    expect(r.markdown).toContain('##### E');
    expect(r.markdown).toContain('###### F');
  });

  test('inline emphasis', () => {
    const r = htmlToMarkdown('<p>Some <strong>bold</strong> and <em>italic</em>.</p>');
    expect(r.markdown).toContain('**bold**');
    expect(r.markdown).toContain('*italic*');
  });

  test('inline code', () => {
    const r = htmlToMarkdown('<p>Use <code>fetch()</code> here.</p>');
    expect(r.markdown).toContain('`fetch()`');
  });

  test('link', () => {
    const r = htmlToMarkdown('<p>See <a href="https://example.com">example</a>.</p>');
    expect(r.markdown).toContain('[example](https://example.com)');
  });

  test('unordered list', () => {
    const r = htmlToMarkdown('<ul><li>one</li><li>two</li></ul>');
    expect(r.markdown).toContain('- one');
    expect(r.markdown).toContain('- two');
  });

  test('ordered list', () => {
    const r = htmlToMarkdown('<ol><li>first</li><li>second</li><li>third</li></ol>');
    expect(r.markdown).toContain('1. first');
    expect(r.markdown).toContain('2. second');
    expect(r.markdown).toContain('3. third');
  });

  test('fenced code block with language hint', () => {
    const r = htmlToMarkdown('<pre><code class="language-python">print("hi")</code></pre>');
    expect(r.markdown).toContain('```python');
    expect(r.markdown).toContain('print("hi")');
    expect(r.markdown).toContain('```');
  });

  test('blockquote', () => {
    const r = htmlToMarkdown('<blockquote><p>quoted text</p></blockquote>');
    expect(r.markdown).toContain('> quoted text');
  });

  test('hr', () => {
    const r = htmlToMarkdown('<p>before</p><hr><p>after</p>');
    expect(r.markdown).toContain('---');
  });

  test('decodes entities', () => {
    const r = htmlToMarkdown('<p>foo &amp; bar &mdash; ok</p>');
    expect(r.markdown).toContain('foo & bar — ok');
  });
});

describe('htmlToMarkdown — chrome stripping', () => {
  test('drops <script> and <style> entirely', () => {
    const r = htmlToMarkdown('<p>kept</p><script>console.log("noise")</script><style>.x{}</style><p>also kept</p>');
    expect(r.markdown).toContain('kept');
    expect(r.markdown).toContain('also kept');
    expect(r.markdown).not.toContain('console.log');
    expect(r.markdown).not.toContain('.x{}');
  });

  test('drops <nav>, <footer>, <aside>, <header>, <form>, <iframe>', () => {
    const html = `
      <header>HEADER_NOISE</header>
      <nav>NAV_NOISE</nav>
      <main><p>real content</p></main>
      <aside>ASIDE_NOISE</aside>
      <footer>FOOTER_NOISE</footer>
      <form>FORM_NOISE</form>
      <iframe>IFRAME_NOISE</iframe>
    `;
    const r = htmlToMarkdown(html);
    expect(r.markdown).toContain('real content');
    for (const noise of ['HEADER_NOISE', 'NAV_NOISE', 'ASIDE_NOISE', 'FOOTER_NOISE', 'FORM_NOISE', 'IFRAME_NOISE']) {
      expect(r.markdown).not.toContain(noise);
    }
  });
});

describe('htmlToMarkdown — prose subtree extraction', () => {
  test('prefers <article> over surrounding chrome', () => {
    const r = htmlToMarkdown('<body><nav>nav</nav><article><p>article body</p></article><footer>foot</footer></body>');
    expect(r.markdown).toContain('article body');
    expect(r.markdown).not.toContain('nav');
    expect(r.markdown).not.toContain('foot');
  });

  test('falls back to <main> when no <article>', () => {
    const r = htmlToMarkdown('<body><main><p>main body</p></main></body>');
    expect(r.markdown).toContain('main body');
  });

  test('falls back to <body> when no <article>/<main>', () => {
    const r = htmlToMarkdown('<body><p>body para</p></body>');
    expect(r.markdown).toContain('body para');
  });
});

describe('htmlToMarkdown — Anthropic blog fixture', () => {
  test('produces clean markdown with chrome removed', () => {
    const r = htmlToMarkdown(fixture('anthropic-blog.html'));
    expect(r.markdown).toContain('# Introducing contextual retrieval');
    expect(r.markdown).toContain('## Results');
    expect(r.markdown).toContain('## Implementation');
    expect(r.markdown).toContain('**RAG**');
    expect(r.markdown).toContain('*contextual retrieval*');
    expect(r.markdown).toContain('1.9% retrieval failure');
    expect(r.markdown).toContain('```python');
    expect(r.markdown).toContain('[cookbook](https://github.com/anthropics/anthropic-cookbook)');
    // chrome stripped
    expect(r.markdown).not.toContain('© 2026 Anthropic');
    expect(r.markdown).not.toContain('tracker noise');
    expect(r.markdown).not.toContain('.brand');
  });
});

describe('htmlToMarkdown — Cowork-style chrome bloat', () => {
  test('strips JS slider config and footer/form noise; keeps article body', () => {
    const r = htmlToMarkdown(fixture('cowork-bloat.html'));
    expect(r.markdown).toContain('# How we built Cowork');
    expect(r.markdown).toContain('## The vision');
    expect(r.markdown).toContain('engineering teams');
    expect(r.markdown).not.toContain('SLIDER_CONFIG');
    expect(r.markdown).not.toContain('Subscribe');
    expect(r.markdown).not.toContain('Cookies');
    expect(r.markdown).not.toContain('tracker.start');
  });

  test('output is small relative to input', () => {
    const html = fixture('cowork-bloat.html');
    const r = htmlToMarkdown(html);
    // Rough sanity: clean markdown should be < 30% of raw HTML for this fixture.
    expect(r.markdown.length).toBeLessThan(html.length * 0.3);
  });
});

describe('htmlToMarkdown — JS-only page', () => {
  test('produces empty (or near-empty) output for JS-only shell', () => {
    const r = htmlToMarkdown(fixture('js-only.html'));
    // <noscript> is not in our strip list, so its message may bleed through;
    // accept either empty or just the noscript message.
    expect(r.markdown.length).toBeLessThan(120);
    expect(r.markdown).not.toContain('<script');
    expect(r.markdown).not.toContain('<div');
  });
});

describe('htmlToMarkdown — maxBytes', () => {
  test('truncates output at byte boundary, sets truncated=true', () => {
    const big = '<p>' + 'A'.repeat(10000) + '</p>';
    const r = htmlToMarkdown(big, { maxBytes: 500 });
    expect(r.truncated).toBe(true);
    expect(r.markdown.length).toBe(500);
    expect(r.sliceLength).toBe(500);
  });

  test('does not truncate when under budget', () => {
    const small = '<p>short</p>';
    const r = htmlToMarkdown(small, { maxBytes: 1000 });
    expect(r.truncated).toBe(false);
    expect(r.markdown).toBe('short');
  });
});

describe('htmlToMarkdown — malformed HTML resilience', () => {
  test('unmatched close tag does not throw', () => {
    expect(() => htmlToMarkdown('<p>open<span></p>')).not.toThrow();
  });

  test('void elements do not need close tags', () => {
    expect(() => htmlToMarkdown('<p>line one<br>line two</p>')).not.toThrow();
    const r = htmlToMarkdown('<p>line one<br>line two</p>');
    expect(r.markdown).toContain('line one');
    expect(r.markdown).toContain('line two');
  });

  test('truncated input does not throw', () => {
    expect(() => htmlToMarkdown('<p>partial')).not.toThrow();
  });
});
