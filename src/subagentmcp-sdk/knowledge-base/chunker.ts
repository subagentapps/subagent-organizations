/**
 * Markdown chunker for the contextual-retrieval pipeline.
 *
 * Spec: docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md
 *       § 1. Chunker
 *
 * Splits a markdown document into 800-token chunks with 100-token overlap,
 * preferring markdown-heading boundaries when available.
 *
 * Per CLAUDE.md "TypeScript reference catalog" framing: zero-dep. Token
 * counting is approximate (~4 chars/token); this matches Anthropic's
 * back-of-envelope estimates and is good enough for chunk-size selection.
 * If a real tokenizer is needed later, swap `approxTokenCount()` — the
 * rest of the chunker keeps working.
 *
 * Per CLAUDE.md #2 + #3: this file mirrors the spec. Update the spec
 * first if changing field shapes or boundary policy.
 */

import { sha256 } from '../tools/types.ts';

/**
 * One chunk emitted by the chunker. Identified by `id` (stable across runs
 * for the same `(docId, ordinal, text)` tuple).
 */
export interface Chunk {
  /** Stable SHA-256 derived from `${docId}|${ordinal}|${text}`. */
  id: string;
  /** Caller-provided document identifier (URL, repo path, content hash). */
  docId: string;
  /** 0-based position of this chunk within the document. */
  ordinal: number;
  /** The chunk text, with leading/trailing whitespace trimmed. */
  text: string;
  /** Approximate token count (~4 chars/token). */
  tokenCount: number;
  /** Heading lineage at the chunk's start. e.g. `["# Top", "## Sub"]`. */
  headingPath: string[];
}

export interface ChunkOptions {
  /** Target chunk size in approximate tokens. Default 800. */
  chunkSize?: number;
  /** Overlap between adjacent chunks in approximate tokens. Default 100. */
  overlap?: number;
}

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_OVERLAP = 100;
const CHARS_PER_TOKEN = 4;

/** Approximate token count via the 4-chars-per-token heuristic. */
export function approxTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/** Convert a token budget back to characters. */
function tokensToChars(tokens: number): number {
  return tokens * CHARS_PER_TOKEN;
}

/**
 * Identify markdown heading lines as candidate split points.
 *
 * Returns sorted offsets where a heading begins (start of `#` char). The
 * file's start (offset 0) is always included.
 *
 * Code-fence aware: `#` lines inside ```` ``` ```` fenced blocks are NOT
 * treated as headings (they're code comments / preprocessor directives).
 * Inline code spans are not specifically handled — they don't start a
 * line with `#` so the line-start anchor in the regex already excludes them.
 */
export function findHeadingOffsets(markdown: string): number[] {
  const offsets: number[] = [0];
  const masked = maskFencedCode(markdown);
  const re = /(^|\n)(#{1,6}\s+\S)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked))) {
    const startOfHeading = m[1] === '\n' ? m.index + 1 : m.index;
    offsets.push(startOfHeading);
  }
  return [...new Set(offsets)].sort((a, b) => a - b);
}

/**
 * Replace fenced code-block content with same-length spaces so heading
 * regexes can scan the document without false positives, while keeping
 * offsets aligned. Fences themselves stay intact.
 */
function maskFencedCode(markdown: string): string {
  // Walk lines linearly. Track in-fence state. Inside a fence, replace
  // every non-newline char with a space (preserving offsets).
  const out: string[] = [];
  let inFence = false;
  let fenceMarker = '';
  let i = 0;
  const len = markdown.length;
  while (i < len) {
    // Find the next line break (or EOF)
    const lineEnd = markdown.indexOf('\n', i);
    const sliceEnd = lineEnd < 0 ? len : lineEnd;
    const line = markdown.slice(i, sliceEnd);
    if (!inFence) {
      const m = line.match(/^(```|~~~)/);
      if (m) {
        inFence = true;
        fenceMarker = m[1]!;
        out.push(line); // fence line itself: preserved
      } else {
        out.push(line);
      }
    } else {
      if (line.startsWith(fenceMarker)) {
        inFence = false;
        out.push(line); // closing fence: preserved
      } else {
        // Mask the line content with spaces (same length as line)
        out.push(' '.repeat(line.length));
      }
    }
    if (lineEnd < 0) break;
    out.push('\n');
    i = lineEnd + 1;
  }
  return out.join('');
}

/**
 * Walk headings in document order and maintain the current heading path
 * (h1 > h2 > h3 trail) that ENCLOSES the offset.
 *
 * "Encloses" means strictly preceding — a heading at exactly `offset` is
 * the chunk's own content, not its enclosing context. This matches the
 * contextual-retrieval pipeline's intent: tell the contextualizer where
 * a chunk lives in the document hierarchy, without restating what the
 * chunk's own first line already says.
 */
export function headingPathAt(markdown: string, offset: number): string[] {
  const path: Array<{ level: number; text: string }> = [];
  const re = /^(#{1,6})\s+(.+?)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) {
    if (m.index >= offset) break;
    const level = m[1]!.length;
    const text = m[2]!;
    while (path.length > 0 && path[path.length - 1]!.level >= level) {
      path.pop();
    }
    path.push({ level, text: `${'#'.repeat(level)} ${text}` });
  }
  return path.map((p) => p.text);
}

/**
 * Pick the next break point in `[from, fromPlusBudget]` that prefers the
 * latest heading boundary in the window. Falls back to the budget end.
 */
function pickBoundary(
  markdown: string,
  from: number,
  budgetChars: number,
  headings: number[],
): number {
  const limit = Math.min(from + budgetChars, markdown.length);
  if (limit >= markdown.length) return markdown.length;

  // Find the latest heading at or before `limit`, but strictly after `from`
  // so we make forward progress.
  let candidate = -1;
  for (const h of headings) {
    if (h <= from) continue;
    if (h > limit) break;
    candidate = h;
  }
  if (candidate > 0) return candidate;

  // No heading boundary in the window. Try to break on a paragraph
  // boundary (blank line) or sentence end before the limit so we don't
  // chop mid-word.
  const para = markdown.lastIndexOf('\n\n', limit);
  if (para > from) return para + 2;
  const sentence = markdown.slice(from, limit).search(/[.!?]\s+\w/);
  if (sentence > 0) {
    // sentence is an offset within the slice; convert and advance past
    // the matched punctuation+space.
    const m = markdown.slice(from + sentence).match(/[.!?]\s+/);
    if (m) return from + sentence + m[0].length;
  }
  return limit;
}

/**
 * Split a markdown document into chunks. Always returns at least one
 * chunk (even for empty/whitespace-only input — the chunk text is empty,
 * tokenCount is 0).
 */
export async function chunk(
  markdown: string,
  docId: string,
  opts?: ChunkOptions,
): Promise<Chunk[]> {
  const chunkSize = opts?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = opts?.overlap ?? DEFAULT_OVERLAP;
  if (chunkSize <= 0) throw new Error('chunkSize must be > 0');
  if (overlap < 0) throw new Error('overlap must be >= 0');
  if (overlap >= chunkSize) {
    throw new Error('overlap must be < chunkSize');
  }
  const budgetChars = tokensToChars(chunkSize);
  const overlapChars = tokensToChars(overlap);
  const headings = findHeadingOffsets(markdown);

  const chunks: Chunk[] = [];
  let cursor = 0;
  let ordinal = 0;
  while (cursor < markdown.length) {
    const end = pickBoundary(markdown, cursor, budgetChars, headings);
    const text = markdown.slice(cursor, end).replace(/^\s+|\s+$/g, '');
    const headingPath = headingPathAt(markdown, cursor);
    const id = await sha256(`${docId}|${ordinal}|${text}`);
    chunks.push({
      id,
      docId,
      ordinal,
      text,
      tokenCount: approxTokenCount(text),
      headingPath,
    });
    ordinal++;
    if (end >= markdown.length) break;
    // Advance with overlap. Guard against zero-progress (boundary at cursor).
    const nextCursor = Math.max(end - overlapChars, cursor + 1);
    cursor = nextCursor;
  }

  if (chunks.length === 0) {
    // empty / whitespace-only input → emit a single empty chunk so the
    // pipeline downstream has a deterministic entry.
    const id = await sha256(`${docId}|0|`);
    chunks.push({
      id,
      docId,
      ordinal: 0,
      text: '',
      tokenCount: 0,
      headingPath: [],
    });
  }

  return chunks;
}
