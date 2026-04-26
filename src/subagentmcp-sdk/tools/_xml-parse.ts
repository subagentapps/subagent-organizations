/**
 * Minimal XML parser for the documented use cases:
 *   - sitemap.xml (https://www.sitemaps.org/protocol.html)
 *   - Atom feeds (RFC 4287)
 *   - RSS 2.0 (https://www.rssboard.org/rss-specification)
 *   - Trivial OpenAPI/Swagger XML
 *
 * Deliberately tiny and dep-free. Handles:
 *   - Element nesting with attributes
 *   - CDATA sections
 *   - Standard XML entities (&amp; &lt; &gt; &quot; &apos;)
 *   - Self-closing tags
 *   - XML declaration + comments (skipped)
 *   - Namespaces (treated as part of the tag name; no resolution)
 *
 * Does NOT handle:
 *   - DTD subsets / external entities (correct: prevents XXE attacks)
 *   - Custom entity declarations
 *   - Mixed content beyond the subset above
 *
 * Output: a recursive `XmlNode` tree.
 *
 * Per CLAUDE.md "TypeScript reference catalog" framing: primitives in the SDK
 * stay zero-dep where the dep would dwarf the work it does. fast-xml-parser is
 * 1MB unpacked across 4 transitive deps — too heavy for parsing the 4 schemas
 * above.
 */

export interface XmlNode {
  /** Tag name including any namespace prefix (e.g. `atom:entry`). */
  name: string;
  /** Attributes as a plain object; values are strings. Empty when none. */
  attrs: Record<string, string>;
  /** Child element nodes. */
  children: XmlNode[];
  /**
   * Concatenated text content directly inside this element (excluding text
   * inside descendant elements). CDATA is decoded into this string.
   */
  text: string;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
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
    const v = ENTITIES[ent];
    return v !== undefined ? v : `&${ent};`;
  });
}

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  // Match name="value" or name='value' or name=value (unquoted)
  const re = /([a-zA-Z_:][\w:.\-]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const key = m[1];
    if (key === undefined) continue;
    const v = m[3] ?? m[4] ?? m[5] ?? '';
    out[key] = decodeEntities(v);
  }
  return out;
}

/**
 * Parse an XML document. Returns the root element. Throws on malformed input
 * (unclosed tags, unbalanced nesting). Top-level text outside the root and
 * leading XML declarations / comments are stripped.
 */
export function parseXml(input: string): XmlNode {
  let i = 0;
  const len = input.length;
  // Strip BOM, XML declaration, and leading whitespace/comments.
  if (input.charCodeAt(0) === 0xfeff) i = 1;

  function skipProlog(): void {
    while (i < len) {
      // skip whitespace
      while (i < len) {
        const c = input.charCodeAt(i);
        if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) i++;
        else break;
      }
      if (input.startsWith('<?', i)) {
        const end = input.indexOf('?>', i);
        if (end < 0) throw new Error('Unterminated XML declaration');
        i = end + 2;
        continue;
      }
      if (input.startsWith('<!--', i)) {
        const end = input.indexOf('-->', i);
        if (end < 0) throw new Error('Unterminated XML comment');
        i = end + 3;
        continue;
      }
      if (input.startsWith('<!DOCTYPE', i) || input.startsWith('<!doctype', i)) {
        const end = input.indexOf('>', i);
        if (end < 0) throw new Error('Unterminated DOCTYPE');
        i = end + 1;
        continue;
      }
      break;
    }
  }

  skipProlog();
  if (i >= len || input[i] !== '<') {
    throw new Error('Expected root element');
  }

  const root = readElement();
  return root;

  function readElement(): XmlNode {
    if (input[i] !== '<') throw new Error(`Expected '<' at offset ${i}`);
    i++;
    const tagStart = i;
    while (i < len) {
      const c = input[i];
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '/' || c === '>') break;
      i++;
    }
    const name = input.slice(tagStart, i);
    if (!name) throw new Error(`Empty tag name at offset ${tagStart}`);
    // Read attributes until '>' or '/>'
    const attrStart = i;
    let selfClosing = false;
    while (i < len) {
      const c = input[i];
      if (c === '>') {
        const attrSlice = input.slice(attrStart, i);
        const attrs = parseAttrs(attrSlice);
        i++;
        const node: XmlNode = { name, attrs, children: [], text: '' };
        readContent(node);
        return node;
      }
      if (c === '/' && input[i + 1] === '>') {
        const attrSlice = input.slice(attrStart, i);
        const attrs = parseAttrs(attrSlice);
        i += 2;
        selfClosing = true;
        return { name, attrs, children: [], text: '' };
      }
      i++;
    }
    if (!selfClosing) throw new Error(`Unterminated tag <${name}`);
    return { name, attrs: {}, children: [], text: '' };
  }

  function readContent(node: XmlNode): void {
    let textBuf = '';
    while (i < len) {
      if (input[i] === '<') {
        if (input.startsWith('</', i)) {
          // close tag
          i += 2;
          const closeStart = i;
          while (i < len && input[i] !== '>') i++;
          const closeName = input.slice(closeStart, i).trim();
          if (closeName !== node.name) {
            throw new Error(
              `Mismatched tag: opened <${node.name}>, closed </${closeName}>`,
            );
          }
          i++;
          node.text = decodeEntities(textBuf);
          return;
        }
        if (input.startsWith('<![CDATA[', i)) {
          const end = input.indexOf(']]>', i + 9);
          if (end < 0) throw new Error('Unterminated CDATA');
          textBuf += input.slice(i + 9, end);
          i = end + 3;
          continue;
        }
        if (input.startsWith('<!--', i)) {
          const end = input.indexOf('-->', i);
          if (end < 0) throw new Error('Unterminated comment in element body');
          i = end + 3;
          continue;
        }
        // child element
        const child = readElement();
        node.children.push(child);
        continue;
      }
      textBuf += input[i];
      i++;
    }
    throw new Error(`Unterminated element <${node.name}>`);
  }
}

/**
 * Lightweight XPath-ish selector. Supported syntax:
 *   - "/root/child"               absolute, root-anchored
 *   - "//element"                  descendant-or-self
 *   - "/root/*"                    star matches any single element
 *   - "/root/child[2]"             1-based positional predicate
 * Returns all matching nodes (possibly empty). No attribute predicates,
 * no axes beyond `//`, no functions.
 */
export function selectXml(root: XmlNode, selector: string): XmlNode[] {
  if (selector === '' || selector === '/') return [root];
  const isDescendant = selector.startsWith('//');
  const path = (isDescendant ? selector.slice(2) : selector.replace(/^\//, ''))
    .split('/')
    .filter(Boolean);
  if (path.length === 0) return [root];

  let pool: XmlNode[];
  if (isDescendant) {
    pool = collectAll(root);
  } else {
    pool = [root];
  }
  for (let depth = 0; depth < path.length; depth++) {
    const step = path[depth] ?? '';
    const m = step.match(/^([\w:*-]+)(?:\[(\d+)\])?$/);
    if (!m) return [];
    const tag = m[1];
    const idx1 = m[2] !== undefined ? parseInt(m[2], 10) : null;
    const next: XmlNode[] = [];
    for (const node of pool) {
      const candidates = depth === 0 && !isDescendant
        ? [node].filter((n) => tag === '*' || n.name === tag)
        : node.children.filter((c) => tag === '*' || c.name === tag);
      if (idx1 !== null) {
        const picked = candidates[idx1 - 1];
        if (picked) next.push(picked);
      } else {
        next.push(...candidates);
      }
    }
    pool = next;
    if (pool.length === 0) return [];
  }
  return pool;
}

function collectAll(node: XmlNode): XmlNode[] {
  const out: XmlNode[] = [node];
  for (const c of node.children) out.push(...collectAll(c));
  return out;
}
