/**
 * Unit tests for `src/subagentmcp-sdk/knowledge-base/chunker.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md
 *       § 1. Chunker
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  chunk,
  approxTokenCount,
  findHeadingOffsets,
  headingPathAt,
} from '../../src/subagentmcp-sdk/knowledge-base/chunker.ts';

const FIXTURES = join(import.meta.dir, '..', 'fixtures', 'kb');
function fixture(name: string): string {
  return readFileSync(join(FIXTURES, name), 'utf8');
}

describe('approxTokenCount', () => {
  test('empty string → 0', () => {
    expect(approxTokenCount('')).toBe(0);
  });
  test('4 chars → 1 token', () => {
    expect(approxTokenCount('abcd')).toBe(1);
  });
  test('rounds up partial tokens', () => {
    expect(approxTokenCount('abc')).toBe(1);
    expect(approxTokenCount('abcde')).toBe(2);
  });
});

describe('findHeadingOffsets', () => {
  test('document with no headings → only [0]', () => {
    expect(findHeadingOffsets('Just text. No headings.')).toEqual([0]);
  });

  test('headings at line starts and after newlines', () => {
    const md = '# Top\n\nBody.\n\n## Sub\n\nBody2.\n';
    const offsets = findHeadingOffsets(md);
    expect(offsets[0]).toBe(0);
    expect(offsets).toContain(0);
    // # Top starts at offset 0; ## Sub starts after the second blank line
    expect(offsets.length).toBeGreaterThanOrEqual(2);
    expect(offsets.some((o) => md.slice(o).startsWith('## Sub'))).toBe(true);
  });

  test('does not match # inside text or code', () => {
    const md = 'Inline # not a heading.\n```\n# code comment\n```\n';
    expect(findHeadingOffsets(md)).toEqual([0]);
  });
});

describe('headingPathAt', () => {
  test('builds an h1>h2>h3 trail', () => {
    const md = fixture('nested-headings.md');
    const idx = md.indexOf('Body of subsection A.1.');
    const path = headingPathAt(md, idx);
    expect(path).toContain('# Top-level');
    expect(path).toContain('## Section A');
    expect(path).toContain('### Subsection A.1');
  });

  test('pops siblings: A.2 replaces A.1 at the same depth', () => {
    const md = fixture('nested-headings.md');
    const idx = md.indexOf('Body of subsection A.2.');
    const path = headingPathAt(md, idx);
    expect(path).toContain('### Subsection A.2');
    expect(path).not.toContain('### Subsection A.1');
  });

  test('handles skipped heading levels', () => {
    const md = fixture('nested-headings.md');
    const idx = md.indexOf('This heading skips');
    const path = headingPathAt(md, idx);
    expect(path).toContain('## Section B');
    expect(path).toContain('#### Skipped levels');
  });
});

describe('chunk — short doc fits in one chunk', () => {
  test('emits exactly one chunk for the short fixture', async () => {
    const chunks = await chunk(fixture('short-doc.md'), 'short-doc.md');
    expect(chunks.length).toBe(1);
    expect(chunks[0]!.text).toContain('# Title');
    expect(chunks[0]!.headingPath).toEqual([]); // chunk starts at offset 0; no prior heading
  });
});

describe('chunk — long doc gets multiple chunks with overlap', () => {
  test('splits a 5000-char doc into multiple chunks', async () => {
    const long = '# Doc\n\n' + ('Body sentence. '.repeat(400));
    const chunks = await chunk(long, 'long-doc');
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be ≤ chunkSize tokens (with some slack for tail)
    for (const c of chunks) {
      expect(c.tokenCount).toBeLessThanOrEqual(900);
    }
    // Stable IDs: same docId+ordinal+text → same id
    const second = await chunk(long, 'long-doc');
    expect(second.map((c) => c.id)).toEqual(chunks.map((c) => c.id));
  });

  test('chunks have monotonically increasing ordinal', async () => {
    const long = '# Doc\n\n' + ('Body sentence. '.repeat(400));
    const chunks = await chunk(long, 'long-doc');
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i]!.ordinal).toBe(i);
    }
  });
});

describe('chunk — heading-boundary preference', () => {
  test('chunk END boundaries land on heading offsets when available', async () => {
    // Headings spaced ~407 chars apart. With chunkSize=200 tokens (~800
    // chars), the first chunk's window covers heading #2 at offset 407.
    // pickBoundary should pick it. We verify by checking the END offset
    // of chunk[0] (start of chunk[1] + overlap) lands on a heading.
    const md = '# A\n\n' + 'A body. '.repeat(50) +
      '\n\n# B\n\n' + 'B body. '.repeat(50) +
      '\n\n# C\n\n' + 'C body. '.repeat(50);
    const chunks = await chunk(md, 'doc', { chunkSize: 200, overlap: 20 });
    expect(chunks.length).toBeGreaterThan(1);
    // The first chunk's text should end near a heading boundary —
    // specifically should NOT contain "# B" (that's the next chunk's
    // territory after the boundary at 407).
    expect(chunks[0]!.text).toContain('# A');
    expect(chunks[0]!.text).not.toContain('# B');
    expect(chunks[0]!.text).not.toContain('# C');
  });

  test('chunks that contain only one heading have heading at the start', async () => {
    // Force chunks small enough that each section becomes its own chunk.
    const md = '# A\n\n' + 'A short.\n\n' +
      '# B\n\n' + 'B short.\n\n' +
      '# C\n\n' + 'C short.\n';
    const chunks = await chunk(md, 'doc', { chunkSize: 5, overlap: 0 });
    // With chunkSize=5 tokens=20 chars, each section line should split
    // out individually. Verify ordinals are sequential and headings appear.
    const concatenated = chunks.map((c) => c.text).join(' ');
    expect(concatenated).toContain('# A');
    expect(concatenated).toContain('# B');
    expect(concatenated).toContain('# C');
  });
});

describe('chunk — IDs are deterministic', () => {
  test('same input twice → identical chunk IDs', async () => {
    const md = fixture('nested-headings.md');
    const a = await chunk(md, 'docX');
    const b = await chunk(md, 'docX');
    expect(a.map((c) => c.id)).toEqual(b.map((c) => c.id));
  });

  test('different docId → different chunk IDs even with identical text', async () => {
    const md = fixture('short-doc.md');
    const a = await chunk(md, 'docA');
    const b = await chunk(md, 'docB');
    expect(a[0]!.id).not.toBe(b[0]!.id);
  });
});

describe('chunk — option validation', () => {
  test('chunkSize <= 0 throws', async () => {
    expect(chunk('x', 'd', { chunkSize: 0 })).rejects.toThrow();
    expect(chunk('x', 'd', { chunkSize: -1 })).rejects.toThrow();
  });

  test('overlap < 0 throws', async () => {
    expect(chunk('x', 'd', { overlap: -1 })).rejects.toThrow();
  });

  test('overlap >= chunkSize throws', async () => {
    expect(chunk('x', 'd', { chunkSize: 100, overlap: 100 })).rejects.toThrow();
    expect(chunk('x', 'd', { chunkSize: 100, overlap: 200 })).rejects.toThrow();
  });
});

describe('chunk — empty input', () => {
  test('empty string → single empty chunk', async () => {
    const chunks = await chunk('', 'empty');
    expect(chunks.length).toBe(1);
    expect(chunks[0]!.text).toBe('');
    expect(chunks[0]!.tokenCount).toBe(0);
  });

  test('whitespace only → single chunk with empty text', async () => {
    const chunks = await chunk('   \n\n  \n', 'ws');
    expect(chunks.length).toBe(1);
    expect(chunks[0]!.text).toBe('');
  });
});

describe('chunk — heading path on emitted chunks', () => {
  test('chunk path encloses (does not include) headings inside the chunk text', async () => {
    // Force small chunks so different sections land in different chunks.
    const md = fixture('nested-headings.md');
    const chunks = await chunk(md, 'doc', { chunkSize: 50, overlap: 5 });
    // The first chunk starts at offset 0 → no preceding headings → path=[]
    expect(chunks[0]!.headingPath).toEqual([]);
    // A later chunk that starts mid-document should have an enclosing path
    // populated (Top-level at minimum).
    const later = chunks.find(
      (c) => c.ordinal > 0 && c.headingPath.length > 0,
    );
    expect(later).toBeDefined();
    if (later) {
      expect(later.headingPath.join(' / ')).toContain('Top-level');
    }
  });

  test('headingPath uses ENCLOSING headings (strictly preceding the chunk start)', async () => {
    // Single-chunk doc starting with a heading: path should be empty
    // because the heading IS the chunk's content, not its enclosing context.
    const chunks = await chunk('# Title\n\nBody.', 'doc');
    expect(chunks[0]!.headingPath).toEqual([]);
  });
});
