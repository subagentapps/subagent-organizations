/**
 * Minimal JS-literal evaluator. Pulls a single named export from a JS/MDX
 * source file and returns its value as plain JS data.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *       § Subagent-js
 *
 * Per CLAUDE.md "TypeScript reference catalog" framing: dep-free. The
 * issue's own guidance ("Defer until a second caller exists") plus the
 * iter-23/25/26/27 precedents (replacing xml2js / bloom-filters / markdown
 * stack / Crawlee with focused inline implementations) push toward a tiny
 * evaluator that handles the documented use case (`EVENTS` array in
 * `context-window.md`) and rejects shapes it can't safely evaluate so
 * callers know when to upgrade.
 *
 * Supported subset (JSON5-ish):
 *   - Object literals — keys may be unquoted identifiers, single- or
 *     double-quoted strings
 *   - Array literals
 *   - Strings: single- or double-quoted with backslash escapes; template
 *     literals are accepted only if they contain no `${...}` interpolation
 *   - Numbers: decimal, scientific, leading sign, hex (0x...)
 *   - `true` / `false` / `null` / `undefined`
 *   - Trailing commas in arrays/objects
 *   - Line (`//`) and block comments (between/within tokens)
 *
 * Rejected (returns null):
 *   - Function calls, member access, `new` expressions
 *   - Template literals with `${...}` interpolation
 *   - Computed object keys
 *   - Spread (`...x`)
 *   - JSX
 *   - Arrow functions / function expressions
 *
 * The evaluator throws a typed `JsLiteralError` on any of the above so the
 * caller can decide whether to upgrade to `@babel/parser`.
 */

export class JsLiteralError extends Error {
  override readonly name = 'JsLiteralError';
  constructor(
    message: string,
    public readonly position: number,
  ) {
    super(`${message} (at offset ${position})`);
  }
}

/**
 * Find `export const <name> = <expr>` in the source. Returns the offset of
 * the `<expr>` start and the end of the statement (so the caller can
 * extract the literal). Returns null if the named export is not found.
 *
 * Skips line and block comments and strings while scanning.
 */
function findExportRhs(
  source: string,
  exportName: string,
): { start: number; end: number } | null {
  // Match `export const FOO`, `export let FOO`, `export var FOO`. We allow
  // semicolons and newlines for the end-of-statement, but the proper end
  // comes from the literal-evaluator (which knows when a value closes).
  const re = new RegExp(
    `(^|\\n)\\s*export\\s+(?:const|let|var)\\s+${escapeRegex(exportName)}\\s*=\\s*`,
    'g',
  );
  const m = re.exec(source);
  if (!m) return null;
  const start = m.index + m[0].length;
  return { start, end: source.length };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface Cursor {
  src: string;
  i: number;
}

function skipWhitespaceAndComments(c: Cursor): void {
  while (c.i < c.src.length) {
    const ch = c.src[c.i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      c.i++;
      continue;
    }
    if (ch === '/' && c.src[c.i + 1] === '/') {
      const nl = c.src.indexOf('\n', c.i + 2);
      c.i = nl < 0 ? c.src.length : nl + 1;
      continue;
    }
    if (ch === '/' && c.src[c.i + 1] === '*') {
      const end = c.src.indexOf('*/', c.i + 2);
      c.i = end < 0 ? c.src.length : end + 2;
      continue;
    }
    return;
  }
}

function readString(c: Cursor): string {
  const quote = c.src[c.i];
  if (quote !== '"' && quote !== "'") {
    throw new JsLiteralError('Expected string', c.i);
  }
  c.i++;
  let out = '';
  while (c.i < c.src.length) {
    const ch = c.src[c.i];
    if (ch === '\\') {
      const next = c.src[c.i + 1];
      switch (next) {
        case 'n': out += '\n'; break;
        case 't': out += '\t'; break;
        case 'r': out += '\r'; break;
        case 'b': out += '\b'; break;
        case 'f': out += '\f'; break;
        case '\\': out += '\\'; break;
        case '\'': out += '\''; break;
        case '"': out += '"'; break;
        case '`': out += '`'; break;
        case '/': out += '/'; break;
        case '0': out += '\0'; break;
        case 'x': {
          const hex = c.src.slice(c.i + 2, c.i + 4);
          out += String.fromCharCode(parseInt(hex, 16));
          c.i += 2;
          break;
        }
        case 'u': {
          if (c.src[c.i + 2] === '{') {
            const close = c.src.indexOf('}', c.i + 3);
            const cp = parseInt(c.src.slice(c.i + 3, close), 16);
            out += String.fromCodePoint(cp);
            c.i = close - 1;
          } else {
            const hex = c.src.slice(c.i + 2, c.i + 6);
            out += String.fromCharCode(parseInt(hex, 16));
            c.i += 4;
          }
          break;
        }
        case '\n':
          // line continuation
          break;
        default:
          if (next === undefined) throw new JsLiteralError('Unterminated escape', c.i);
          out += next;
          break;
      }
      c.i += 2;
      continue;
    }
    if (ch === quote) {
      c.i++;
      return out;
    }
    if (ch === '\n') {
      throw new JsLiteralError('Unterminated string (newline before close)', c.i);
    }
    out += ch;
    c.i++;
  }
  throw new JsLiteralError('Unterminated string', c.i);
}

function readTemplateLiteral(c: Cursor): string {
  if (c.src[c.i] !== '`') throw new JsLiteralError('Expected template', c.i);
  c.i++;
  let out = '';
  while (c.i < c.src.length) {
    const ch = c.src[c.i];
    if (ch === '`') {
      c.i++;
      return out;
    }
    if (ch === '\\') {
      const next = c.src[c.i + 1];
      if (next === '`' || next === '\\' || next === '$') {
        out += next;
        c.i += 2;
        continue;
      }
      // fall-through: treat other escapes the same as in regular strings
      switch (next) {
        case 'n': out += '\n'; break;
        case 't': out += '\t'; break;
        case 'r': out += '\r'; break;
        case '\\': out += '\\'; break;
        default: out += next ?? ''; break;
      }
      c.i += 2;
      continue;
    }
    if (ch === '$' && c.src[c.i + 1] === '{') {
      throw new JsLiteralError(
        'Template literal with ${...} interpolation not supported',
        c.i,
      );
    }
    out += ch;
    c.i++;
  }
  throw new JsLiteralError('Unterminated template literal', c.i);
}

function readNumber(c: Cursor): number {
  const start = c.i;
  if (c.src[c.i] === '+' || c.src[c.i] === '-') c.i++;
  if (c.src[c.i] === '0' && (c.src[c.i + 1] === 'x' || c.src[c.i + 1] === 'X')) {
    c.i += 2;
    while (c.i < c.src.length && /[0-9a-fA-F]/.test(c.src[c.i] ?? '')) c.i++;
    return parseInt(c.src.slice(start), 16);
  }
  while (c.i < c.src.length && /[0-9]/.test(c.src[c.i] ?? '')) c.i++;
  if (c.src[c.i] === '.') {
    c.i++;
    while (c.i < c.src.length && /[0-9]/.test(c.src[c.i] ?? '')) c.i++;
  }
  if (c.src[c.i] === 'e' || c.src[c.i] === 'E') {
    c.i++;
    if (c.src[c.i] === '+' || c.src[c.i] === '-') c.i++;
    while (c.i < c.src.length && /[0-9]/.test(c.src[c.i] ?? '')) c.i++;
  }
  const n = Number(c.src.slice(start, c.i));
  if (!Number.isFinite(n)) throw new JsLiteralError('Invalid number', start);
  return n;
}

function readIdentifier(c: Cursor): string {
  const start = c.i;
  while (c.i < c.src.length && /[A-Za-z0-9_$]/.test(c.src[c.i] ?? '')) c.i++;
  return c.src.slice(start, c.i);
}

function readValue(c: Cursor): unknown {
  skipWhitespaceAndComments(c);
  if (c.i >= c.src.length) {
    throw new JsLiteralError('Unexpected end of input', c.i);
  }
  const ch = c.src[c.i];
  if (ch === '"' || ch === '\'') return readString(c);
  if (ch === '`') return readTemplateLiteral(c);
  if (ch === '[') return readArray(c);
  if (ch === '{') return readObject(c);
  if (ch === '-' || ch === '+' || (ch !== undefined && /[0-9]/.test(ch))) {
    return readNumber(c);
  }
  if (ch !== undefined && /[A-Za-z_$]/.test(ch)) {
    const ident = readIdentifier(c);
    if (ident === 'true') return true;
    if (ident === 'false') return false;
    if (ident === 'null') return null;
    if (ident === 'undefined') return undefined;
    // Reject any other identifier — likely a function call, variable
    // reference, or `new` expression.
    throw new JsLiteralError(
      `Unsupported identifier "${ident}" — only true/false/null/undefined accepted`,
      c.i - ident.length,
    );
  }
  throw new JsLiteralError(`Unexpected character "${ch}"`, c.i);
}

function readArray(c: Cursor): unknown[] {
  if (c.src[c.i] !== '[') throw new JsLiteralError('Expected [', c.i);
  c.i++;
  const out: unknown[] = [];
  while (true) {
    skipWhitespaceAndComments(c);
    if (c.src[c.i] === ']') {
      c.i++;
      return out;
    }
    if (c.src[c.i] === '.' && c.src[c.i + 1] === '.' && c.src[c.i + 2] === '.') {
      throw new JsLiteralError('Spread operator not supported', c.i);
    }
    out.push(readValue(c));
    skipWhitespaceAndComments(c);
    if (c.src[c.i] === ',') {
      c.i++;
      continue;
    }
    if (c.src[c.i] === ']') {
      c.i++;
      return out;
    }
    throw new JsLiteralError('Expected , or ] in array', c.i);
  }
}

function readObject(c: Cursor): Record<string, unknown> {
  if (c.src[c.i] !== '{') throw new JsLiteralError('Expected {', c.i);
  c.i++;
  const out: Record<string, unknown> = {};
  while (true) {
    skipWhitespaceAndComments(c);
    if (c.src[c.i] === '}') {
      c.i++;
      return out;
    }
    if (c.src[c.i] === '[') {
      throw new JsLiteralError('Computed object keys not supported', c.i);
    }
    if (c.src[c.i] === '.' && c.src[c.i + 1] === '.' && c.src[c.i + 2] === '.') {
      throw new JsLiteralError('Spread operator not supported', c.i);
    }
    let key: string;
    const ch = c.src[c.i];
    if (ch === '"' || ch === '\'') {
      key = readString(c);
    } else if (ch !== undefined && /[A-Za-z_$]/.test(ch)) {
      key = readIdentifier(c);
    } else {
      throw new JsLiteralError(`Expected object key`, c.i);
    }
    skipWhitespaceAndComments(c);
    if (c.src[c.i] !== ':') {
      throw new JsLiteralError('Expected : after object key', c.i);
    }
    c.i++;
    out[key] = readValue(c);
    skipWhitespaceAndComments(c);
    if (c.src[c.i] === ',') {
      c.i++;
      continue;
    }
    if (c.src[c.i] === '}') {
      c.i++;
      return out;
    }
    throw new JsLiteralError('Expected , or } in object', c.i);
  }
}

/**
 * Locate `export const <name> = <expr>` and evaluate `<expr>` as a
 * JSON5-ish literal. Returns the value, or throws JsLiteralError if the
 * export is not found or the RHS contains unsupported syntax.
 */
export function evaluateNamedExport(source: string, exportName: string): unknown {
  const found = findExportRhs(source, exportName);
  if (!found) {
    throw new JsLiteralError(
      `Named export "${exportName}" not found`,
      0,
    );
  }
  const cursor: Cursor = { src: source, i: found.start };
  const value = readValue(cursor);
  // Allow trailing whitespace, comments, semicolons, and additional code.
  return value;
}
