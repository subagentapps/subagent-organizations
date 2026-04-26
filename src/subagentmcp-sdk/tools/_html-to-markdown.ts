/**
 * Minimal HTML → Markdown converter.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *       § markdown-it preprocessing (the conceptual pipeline; this file is
 *       the implementation, with the dep choices noted in the amended
 *       Implementation note).
 *
 * Per CLAUDE.md "TypeScript reference catalog" framing: deliberately
 * dep-free. The 3 deps the spec called for (`@mozilla/readability`,
 * `turndown`, `markdown-it`) total ~1.5MB unpacked across ~10 transitive
 * deps. For the use cases that matter (Anthropic doc pages, blog posts,
 * GitHub READMEs rendered to HTML, sitemap content) a focused converter
 * handling paragraphs / headings / links / lists / code / inline emphasis
 * does the job at <300 LOC.
 *
 * Pages where this is too crude (very loose markup, complex tables, JS-only
 * pages): #27 (Crawlee fallback) is the planned escape hatch. Both branches
 * end up calling this converter on the eventually-extracted HTML.
 *
 * Handled:
 *   - <h1..h6>      → '# ' .. '###### '
 *   - <p>           → blank-line separated paragraphs
 *   - <a href=...>  → [text](url)
 *   - <ul>/<ol>     → '- ' / '1. ' lists, depth-aware indent
 *   - <li>          → list item
 *   - <code>        → `inline`
 *   - <pre><code>   → fenced code block (with class language hint if present)
 *   - <pre>         → fenced code block (no language)
 *   - <strong>/<b>  → **emphasis**
 *   - <em>/<i>      → *emphasis*
 *   - <br>          → newline
 *   - <hr>          → '---'
 *   - <blockquote>  → '> ' prefixed lines
 *
 * Stripped (entire subtree dropped, including content):
 *   <script>, <style>, <nav>, <footer>, <aside>, <header>, <form>,
 *   <iframe>, <noscript>, <svg>, <button>, <select>
 *
 * Treated as transparent (children rendered, tag itself ignored):
 *   <span>, <div>, <main>, <article>, <section>, <body>, <html>,
 *   plus any unrecognized element
 *
 * Best-effort prose extraction: if `<article>` or `<main>` is present,
 * only that subtree is converted; otherwise the full body.
 *
 * Entities (`&amp;`, `&lt;`, etc.) are decoded; unknown entities pass
 * through verbatim. Numeric entities (`&#x2014;`, `&#8212;`) are decoded.
 */

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
  'meta', 'param', 'source', 'track', 'wbr',
]);

const STRIP_ELEMENTS = new Set([
  'script', 'style', 'nav', 'footer', 'aside', 'header', 'form',
  'iframe', 'noscript', 'svg', 'button', 'select', 'textarea',
]);

interface HtmlElement {
  type: 'element';
  name: string;
  attrs: Record<string, string>;
  children: HtmlNode[];
}

interface HtmlText {
  type: 'text';
  text: string;
}

type HtmlNode = HtmlElement | HtmlText;

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', mdash: '—', ndash: '–', hellip: '…',
  copy: '©', reg: '®', trade: '™',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_, ent: string) => {
    if (ent.startsWith('#x') || ent.startsWith('#X')) {
      const cp = parseInt(ent.slice(2), 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : `&${ent};`;
    }
    if (ent.startsWith('#')) {
      const cp = parseInt(ent.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : `&${ent};`;
    }
    const v = ENTITIES[ent.toLowerCase()];
    return v !== undefined ? v : `&${ent};`;
  });
}

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_:][\w:.\-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const key = m[1];
    if (key === undefined) continue;
    const v = m[3] ?? m[4] ?? m[5] ?? '';
    out[key.toLowerCase()] = decodeEntities(v);
  }
  return out;
}

/**
 * Parse a (possibly-malformed) HTML fragment into a tree. Lenient: void
 * elements close themselves; mismatched close tags pop until they match
 * something on the stack (or are ignored if nothing matches).
 */
function parseHtml(input: string): HtmlElement {
  const root: HtmlElement = {
    type: 'element',
    name: '#root',
    attrs: {},
    children: [],
  };
  const stack: HtmlElement[] = [root];
  let i = 0;
  const len = input.length;

  function top(): HtmlElement {
    return stack[stack.length - 1]!;
  }

  function pushText(t: string): void {
    if (t === '') return;
    top().children.push({ type: 'text', text: t });
  }

  while (i < len) {
    if (input[i] !== '<') {
      // text run
      let j = i;
      while (j < len && input[j] !== '<') j++;
      pushText(decodeEntities(input.slice(i, j)));
      i = j;
      continue;
    }
    // tag start
    if (input.startsWith('<!--', i)) {
      const end = input.indexOf('-->', i + 4);
      i = end < 0 ? len : end + 3;
      continue;
    }
    if (input.startsWith('<![CDATA[', i)) {
      const end = input.indexOf(']]>', i + 9);
      const content = input.slice(i + 9, end < 0 ? len : end);
      pushText(content);
      i = end < 0 ? len : end + 3;
      continue;
    }
    if (input.startsWith('<!', i) || input.startsWith('<?', i)) {
      const end = input.indexOf('>', i);
      i = end < 0 ? len : end + 1;
      continue;
    }
    if (input[i + 1] === '/') {
      // close tag
      const end = input.indexOf('>', i + 2);
      if (end < 0) {
        i = len;
        break;
      }
      const closeName = input.slice(i + 2, end).trim().toLowerCase();
      // pop until match (or run out of stack)
      for (let s = stack.length - 1; s > 0; s--) {
        if (stack[s]!.name === closeName) {
          stack.length = s;
          break;
        }
      }
      i = end + 1;
      continue;
    }
    // open tag
    const tagEnd = (() => {
      let k = i + 1;
      while (k < len && input[k] !== '>' && input[k] !== '<') k++;
      return k;
    })();
    if (tagEnd >= len || input[tagEnd] !== '>') {
      // malformed: emit literal
      pushText('<');
      i++;
      continue;
    }
    const tagBody = input.slice(i + 1, tagEnd);
    const selfClosing = tagBody.endsWith('/');
    const tagBodyTrimmed = selfClosing ? tagBody.slice(0, -1) : tagBody;
    const spaceIdx = tagBodyTrimmed.search(/\s/);
    const name = (spaceIdx < 0 ? tagBodyTrimmed : tagBodyTrimmed.slice(0, spaceIdx))
      .toLowerCase();
    const attrSlice = spaceIdx < 0 ? '' : tagBodyTrimmed.slice(spaceIdx);
    const attrs = parseAttrs(attrSlice);
    i = tagEnd + 1;

    const elem: HtmlElement = {
      type: 'element',
      name,
      attrs,
      children: [],
    };
    top().children.push(elem);

    if (selfClosing || VOID_ELEMENTS.has(name)) {
      continue;
    }
    stack.push(elem);

    // For <script>/<style>, scan to matching </tag> raw — they hold non-HTML.
    if (name === 'script' || name === 'style') {
      const closeTag = `</${name}`;
      const end = input.toLowerCase().indexOf(closeTag, i);
      if (end < 0) {
        i = len;
      } else {
        // skip raw content; close-tag is consumed in next iteration
        i = end;
      }
    }
  }

  return root;
}

/**
 * Walk the tree to find the highest-priority prose subtree:
 *   1. <article> if present
 *   2. <main> if present
 *   3. <body> if present
 *   4. otherwise the root
 *
 * Only the FIRST match is returned — pages with multiple <article> elements
 * yield only the first.
 */
function selectProse(root: HtmlElement): HtmlElement {
  for (const tag of ['article', 'main', 'body']) {
    const found = findFirst(root, tag);
    if (found) return found;
  }
  return root;
}

function findFirst(node: HtmlElement, tag: string): HtmlElement | null {
  for (const c of node.children) {
    if (c.type !== 'element') continue;
    if (c.name === tag) return c;
    const nested = findFirst(c, tag);
    if (nested) return nested;
  }
  return null;
}

/** Render an HtmlNode tree to markdown. */
function render(node: HtmlNode, ctx: RenderCtx): string {
  if (node.type === 'text') {
    if (ctx.preserveWhitespace) return node.text;
    return node.text.replace(/\s+/g, ' ');
  }
  if (STRIP_ELEMENTS.has(node.name)) return '';

  switch (node.name) {
    case 'h1': case 'h2': case 'h3':
    case 'h4': case 'h5': case 'h6': {
      const level = parseInt(node.name.slice(1), 10);
      const inner = renderChildren(node, ctx).trim();
      return `\n\n${'#'.repeat(level)} ${inner}\n\n`;
    }
    case 'p': {
      const inner = renderChildren(node, ctx).trim();
      return inner ? `\n\n${inner}\n\n` : '';
    }
    case 'br':
      return '  \n';
    case 'hr':
      return '\n\n---\n\n';
    case 'a': {
      const inner = renderChildren(node, ctx).trim();
      const href = node.attrs.href ?? '';
      if (!inner) return '';
      if (!href) return inner;
      return `[${inner}](${href})`;
    }
    case 'img': {
      // images are link-only references per spec
      const alt = node.attrs.alt ?? '';
      const src = node.attrs.src ?? '';
      return src ? `[${alt || 'image'}](${src})` : '';
    }
    case 'strong': case 'b': {
      const inner = renderChildren(node, ctx).trim();
      return inner ? `**${inner}**` : '';
    }
    case 'em': case 'i': {
      const inner = renderChildren(node, ctx).trim();
      return inner ? `*${inner}*` : '';
    }
    case 'code': {
      if (ctx.inPre) return renderChildren(node, ctx);
      const inner = renderChildren(node, { ...ctx, preserveWhitespace: true });
      return `\`${inner.replace(/`/g, '\\`')}\``;
    }
    case 'pre': {
      // Pull a language hint from a <code class="language-xxx"> child.
      let lang = '';
      const codeChild = node.children.find(
        (c): c is HtmlElement => c.type === 'element' && c.name === 'code',
      );
      if (codeChild) {
        const cls = codeChild.attrs.class ?? '';
        const m = cls.match(/language-([a-zA-Z0-9_-]+)/);
        if (m) lang = m[1] ?? '';
      }
      const body = renderChildren(node, {
        ...ctx,
        inPre: true,
        preserveWhitespace: true,
      });
      return `\n\n\`\`\`${lang}\n${body.replace(/\n+$/, '')}\n\`\`\`\n\n`;
    }
    case 'blockquote': {
      const inner = renderChildren(node, ctx).trim();
      const prefixed = inner.split('\n').map((l) => `> ${l}`).join('\n');
      return `\n\n${prefixed}\n\n`;
    }
    case 'ul': case 'ol': {
      const ordered = node.name === 'ol';
      const items: string[] = [];
      let counter = 1;
      for (const c of node.children) {
        if (c.type !== 'element' || c.name !== 'li') continue;
        const inner = renderChildren(c, {
          ...ctx,
          listDepth: (ctx.listDepth ?? 0) + 1,
        }).trim();
        const indent = '  '.repeat(ctx.listDepth ?? 0);
        const bullet = ordered ? `${counter}.` : '-';
        items.push(`${indent}${bullet} ${inner}`);
        counter++;
      }
      return `\n\n${items.join('\n')}\n\n`;
    }
    case 'li': {
      // bare <li> outside <ul>/<ol> — treat as paragraph
      return renderChildren(node, ctx);
    }
    default:
      // transparent: render children
      return renderChildren(node, ctx);
  }
}

interface RenderCtx {
  inPre?: boolean;
  preserveWhitespace?: boolean;
  listDepth?: number;
}

function renderChildren(node: HtmlElement, ctx: RenderCtx): string {
  let out = '';
  for (const c of node.children) out += render(c, ctx);
  return out;
}

/** Collapse runs of >2 newlines to exactly 2; trim whole-document edges. */
function tidy(markdown: string): string {
  return markdown
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Convert HTML to markdown. Throws nothing — bad input produces best-effort
 * output (possibly empty). Caller decides whether to treat empty output as
 * a "fetch failed" signal.
 *
 * `maxBytes` truncates the OUTPUT (post-conversion) at the byte boundary.
 * The slice metadata returned alongside lets callers know they got a partial.
 */
export function htmlToMarkdown(
  html: string,
  opts?: { maxBytes?: number },
): { markdown: string; truncated: boolean; sliceLength: number } {
  const root = parseHtml(html);
  const subtree = selectProse(root);
  const raw = renderChildren(subtree, {});
  const tidied = tidy(raw);
  const max = opts?.maxBytes ?? Infinity;
  if (tidied.length <= max) {
    return { markdown: tidied, truncated: false, sliceLength: tidied.length };
  }
  return {
    markdown: tidied.slice(0, max),
    truncated: true,
    sliceLength: max,
  };
}
