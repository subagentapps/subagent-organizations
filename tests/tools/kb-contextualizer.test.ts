/**
 * Unit tests for `src/subagentmcp-sdk/knowledge-base/contextualizer.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md
 *       § 2. Contextualizer
 *
 * Network is replaced via `__fetch`; api key via `apiKey` option so tests
 * don't depend on env state.
 */

import { describe, expect, test } from 'bun:test';
import {
  contextualize,
  contextualizeAll,
  __PROMPT_TEMPLATE_FOR_TESTS,
  type ContextualizeOptions,
} from '../../src/subagentmcp-sdk/knowledge-base/contextualizer.ts';
import type { Chunk } from '../../src/subagentmcp-sdk/knowledge-base/chunker.ts';

const PROMPT = __PROMPT_TEMPLATE_FOR_TESTS;

function chunk(id: string, text: string, ordinal = 0): Chunk {
  return {
    id,
    docId: 'doc',
    ordinal,
    text,
    tokenCount: Math.ceil(text.length / 4),
    headingPath: [],
  };
}

function mockFetch(
  responses: Array<
    | { ok: true; json: unknown }
    | { ok: false; status: number }
    | { throw: Error }
  >,
): {
  fetcher: NonNullable<ContextualizeOptions['__fetch']>;
  calls: Array<{ url: string; init?: unknown }>;
} {
  const calls: Array<{ url: string; init?: unknown }> = [];
  let i = 0;
  const fetcher: NonNullable<ContextualizeOptions['__fetch']> = (url, init) => {
    calls.push({ url, init });
    const r = responses[i++];
    if (!r) throw new Error(`mockFetch exhausted at call ${i}`);
    if ('throw' in r) throw r.throw;
    if (r.ok) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(r.json),
      });
    }
    return Promise.resolve({
      ok: false,
      status: r.status,
      json: () => Promise.resolve({}),
    });
  };
  return { fetcher, calls };
}

const SAMPLE_OK_RESPONSE = {
  content: [
    {
      type: 'text',
      text: 'This chunk introduces the chapter on testing-strategy fundamentals.',
    },
  ],
  usage: { cache_read_input_tokens: 0, cache_creation_input_tokens: 1500 },
};

describe('contextualize — verbatim Anthropic prompt', () => {
  test('prompt prefix matches blog text exactly', () => {
    expect(PROMPT.prefix).toBe('<document>\n');
  });

  test('between block separates document from chunk via documented tags', () => {
    expect(PROMPT.between).toContain('</document>');
    expect(PROMPT.between).toContain('<chunk>');
    expect(PROMPT.between).toContain('Here is the chunk we want to situate');
  });

  test('suffix asks for succinct context only — verbatim', () => {
    expect(PROMPT.suffix).toContain('</chunk>');
    expect(PROMPT.suffix).toContain('Please give a short succinct context');
    expect(PROMPT.suffix).toContain('Answer only with the succinct context and nothing else');
  });
});

describe('contextualize — happy path', () => {
  test('attaches Claude-generated preamble + status=ok', async () => {
    const m = mockFetch([{ ok: true, json: SAMPLE_OK_RESPONSE }]);
    const result = await contextualize('Document body.', chunk('c1', 'A chunk.'), {
      apiKey: 'sk_xxx',
      __fetch: m.fetcher,
    });
    expect(result.contextStatus).toBe('ok');
    expect(result.contextPreamble).toBe(
      'This chunk introduces the chapter on testing-strategy fundamentals.',
    );
    expect(result.contextFailureReason).toBeNull();
    // Original chunk fields preserved
    expect(result.id).toBe('c1');
    expect(result.text).toBe('A chunk.');
  });

  test('uses claude-haiku-4-5 model by default', async () => {
    const m = mockFetch([{ ok: true, json: SAMPLE_OK_RESPONSE }]);
    await contextualize('Doc.', chunk('c1', 'A.'), {
      apiKey: 'sk_xxx',
      __fetch: m.fetcher,
    });
    const init = m.calls[0]!.init as { body: string };
    const body = JSON.parse(init.body);
    expect(body.model).toBe('claude-haiku-4-5-20251001');
  });

  test('custom model overrides default', async () => {
    const m = mockFetch([{ ok: true, json: SAMPLE_OK_RESPONSE }]);
    await contextualize('Doc.', chunk('c1', 'A.'), {
      apiKey: 'sk_xxx',
      model: 'claude-sonnet-4-6',
      __fetch: m.fetcher,
    });
    const init = m.calls[0]!.init as { body: string };
    expect(JSON.parse(init.body).model).toBe('claude-sonnet-4-6');
  });
});

describe('contextualize — wire format', () => {
  test('uses x-api-key + anthropic-version + prompt-caching beta header', async () => {
    const m = mockFetch([{ ok: true, json: SAMPLE_OK_RESPONSE }]);
    await contextualize('Doc.', chunk('c1', 'A.'), {
      apiKey: 'sk_secret',
      __fetch: m.fetcher,
    });
    const init = m.calls[0]!.init as {
      headers: Record<string, string>;
    };
    expect(init.headers['x-api-key']).toBe('sk_secret');
    expect(init.headers['anthropic-version']).toBe('2023-06-01');
    expect(init.headers['anthropic-beta']).toContain('prompt-caching');
    expect(init.headers['content-type']).toBe('application/json');
  });

  test('puts the document in a cache_control: ephemeral block', async () => {
    const m = mockFetch([{ ok: true, json: SAMPLE_OK_RESPONSE }]);
    await contextualize('Long parent document body.', chunk('c1', 'Chunk text.'), {
      apiKey: 'sk_xxx',
      __fetch: m.fetcher,
    });
    const init = m.calls[0]!.init as { body: string };
    const body = JSON.parse(init.body);
    expect(body.messages).toHaveLength(1);
    const blocks = body.messages[0].content;
    expect(blocks).toHaveLength(2);
    // First block: document + cache_control
    expect(blocks[0].type).toBe('text');
    expect(blocks[0].text).toContain('<document>');
    expect(blocks[0].text).toContain('Long parent document body.');
    expect(blocks[0].text).toContain('</document>');
    expect(blocks[0].text).toContain('<chunk>');
    expect(blocks[0].cache_control).toEqual({ type: 'ephemeral' });
    // Second block: chunk text + suffix prompt, NOT cached
    expect(blocks[1].type).toBe('text');
    expect(blocks[1].text).toContain('Chunk text.');
    expect(blocks[1].text).toContain('</chunk>');
    expect(blocks[1].cache_control).toBeUndefined();
  });

  test('default max_tokens is 200', async () => {
    const m = mockFetch([{ ok: true, json: SAMPLE_OK_RESPONSE }]);
    await contextualize('D.', chunk('c1', 'A.'), {
      apiKey: 'sk_xxx',
      __fetch: m.fetcher,
    });
    const init = m.calls[0]!.init as { body: string };
    expect(JSON.parse(init.body).max_tokens).toBe(200);
  });
});

describe('contextualize — failure paths (degraded mode)', () => {
  test('missing api key → failed/missing_api_key, chunk unchanged', async () => {
    const result = await contextualize('Doc.', chunk('c1', 'A.'), {
      apiKey: '',
      __fetch: () => {
        throw new Error('should not call fetch');
      },
    });
    expect(result.contextStatus).toBe('failed');
    expect(result.contextFailureReason).toBe('missing_api_key');
    expect(result.contextPreamble).toBeNull();
    expect(result.text).toBe('A.');
  });

  test('HTTP 429 → failed/http_429', async () => {
    const m = mockFetch([{ ok: false, status: 429 }]);
    const result = await contextualize('Doc.', chunk('c1', 'A.'), {
      apiKey: 'sk_xxx',
      __fetch: m.fetcher,
    });
    expect(result.contextStatus).toBe('failed');
    expect(result.contextFailureReason).toBe('http_429');
  });

  test('HTTP 500 → failed/http_500', async () => {
    const m = mockFetch([{ ok: false, status: 500 }]);
    const result = await contextualize('Doc.', chunk('c1', 'A.'), {
      apiKey: 'sk_xxx',
      __fetch: m.fetcher,
    });
    expect(result.contextFailureReason).toBe('http_500');
  });

  test('network throw → failed/throw_*', async () => {
    const m = mockFetch([{ throw: new Error('econnreset') }]);
    const result = await contextualize('Doc.', chunk('c1', 'A.'), {
      apiKey: 'sk_xxx',
      __fetch: m.fetcher,
    });
    expect(result.contextStatus).toBe('failed');
    expect(result.contextFailureReason).toContain('econnreset');
  });

  test('empty content array → failed/empty_response', async () => {
    const m = mockFetch([{ ok: true, json: { content: [] } }]);
    const result = await contextualize('Doc.', chunk('c1', 'A.'), {
      apiKey: 'sk_xxx',
      __fetch: m.fetcher,
    });
    expect(result.contextFailureReason).toBe('empty_response');
  });

  test('whitespace-only response → failed/empty_response', async () => {
    const m = mockFetch([
      { ok: true, json: { content: [{ type: 'text', text: '   \n\t  ' }] } },
    ]);
    const result = await contextualize('Doc.', chunk('c1', 'A.'), {
      apiKey: 'sk_xxx',
      __fetch: m.fetcher,
    });
    expect(result.contextFailureReason).toBe('empty_response');
  });
});

describe('contextualize — env fallback', () => {
  test('falls back to ANTHROPIC_API_KEY env', async () => {
    const m = mockFetch([{ ok: true, json: SAMPLE_OK_RESPONSE }]);
    const prev = process.env['ANTHROPIC_API_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'sk_from_env';
    try {
      const result = await contextualize('Doc.', chunk('c1', 'A.'), {
        __fetch: m.fetcher,
      });
      expect(result.contextStatus).toBe('ok');
      const init = m.calls[0]!.init as { headers: Record<string, string> };
      expect(init.headers['x-api-key']).toBe('sk_from_env');
    } finally {
      if (prev !== undefined) process.env['ANTHROPIC_API_KEY'] = prev;
      else delete process.env['ANTHROPIC_API_KEY'];
    }
  });

  test('falls back to CLAUDE_CODE_OAUTH_TOKEN env', async () => {
    const m = mockFetch([{ ok: true, json: SAMPLE_OK_RESPONSE }]);
    const prevA = process.env['ANTHROPIC_API_KEY'];
    const prevC = process.env['CLAUDE_CODE_OAUTH_TOKEN'];
    delete process.env['ANTHROPIC_API_KEY'];
    process.env['CLAUDE_CODE_OAUTH_TOKEN'] = 'cc_oauth';
    try {
      const result = await contextualize('Doc.', chunk('c1', 'A.'), {
        __fetch: m.fetcher,
      });
      expect(result.contextStatus).toBe('ok');
      const init = m.calls[0]!.init as { headers: Record<string, string> };
      expect(init.headers['x-api-key']).toBe('cc_oauth');
    } finally {
      if (prevA !== undefined) process.env['ANTHROPIC_API_KEY'] = prevA;
      if (prevC !== undefined) process.env['CLAUDE_CODE_OAUTH_TOKEN'] = prevC;
      else delete process.env['CLAUDE_CODE_OAUTH_TOKEN'];
    }
  });
});

describe('contextualizeAll — sequential processing for cache warmth', () => {
  test('processes chunks in order, returning one result per chunk', async () => {
    const m = mockFetch([
      {
        ok: true,
        json: { content: [{ type: 'text', text: 'preamble for c1' }] },
      },
      {
        ok: true,
        json: { content: [{ type: 'text', text: 'preamble for c2' }] },
      },
      {
        ok: true,
        json: { content: [{ type: 'text', text: 'preamble for c3' }] },
      },
    ]);
    const chunks = [
      chunk('c1', 'first chunk', 0),
      chunk('c2', 'second chunk', 1),
      chunk('c3', 'third chunk', 2),
    ];
    const results = await contextualizeAll('Doc body.', chunks, {
      apiKey: 'sk_xxx',
      __fetch: m.fetcher,
    });
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.id)).toEqual(['c1', 'c2', 'c3']);
    expect(results.map((r) => r.contextPreamble)).toEqual([
      'preamble for c1',
      'preamble for c2',
      'preamble for c3',
    ]);
    expect(m.calls).toHaveLength(3);
  });

  test('one failure does not abort the batch', async () => {
    const m = mockFetch([
      {
        ok: true,
        json: { content: [{ type: 'text', text: 'preamble c1' }] },
      },
      { ok: false, status: 429 },
      {
        ok: true,
        json: { content: [{ type: 'text', text: 'preamble c3' }] },
      },
    ]);
    const results = await contextualizeAll(
      'Doc.',
      [chunk('c1', 'A', 0), chunk('c2', 'B', 1), chunk('c3', 'C', 2)],
      { apiKey: 'sk_xxx', __fetch: m.fetcher },
    );
    expect(results).toHaveLength(3);
    expect(results[0]!.contextStatus).toBe('ok');
    expect(results[1]!.contextStatus).toBe('failed');
    expect(results[1]!.contextFailureReason).toBe('http_429');
    expect(results[2]!.contextStatus).toBe('ok');
  });

  test('every call sends the same document block (so prompt cache hits)', async () => {
    const m = mockFetch([
      { ok: true, json: { content: [{ type: 'text', text: 'p1' }] } },
      { ok: true, json: { content: [{ type: 'text', text: 'p2' }] } },
    ]);
    await contextualizeAll(
      'Identical document body.',
      [chunk('c1', 'A', 0), chunk('c2', 'B', 1)],
      { apiKey: 'sk_xxx', __fetch: m.fetcher },
    );
    const blocks0 = JSON.parse((m.calls[0]!.init as { body: string }).body)
      .messages[0].content[0];
    const blocks1 = JSON.parse((m.calls[1]!.init as { body: string }).body)
      .messages[0].content[0];
    expect(blocks0.text).toBe(blocks1.text);
    expect(blocks0.cache_control).toEqual({ type: 'ephemeral' });
    expect(blocks1.cache_control).toEqual({ type: 'ephemeral' });
  });

  test('empty chunks array → empty results, no API calls', async () => {
    const m = mockFetch([{ throw: new Error('should not be called') }]);
    const results = await contextualizeAll('Doc.', [], {
      apiKey: 'sk_xxx',
      __fetch: m.fetcher,
    });
    expect(results).toEqual([]);
    expect(m.calls).toHaveLength(0);
  });
});
