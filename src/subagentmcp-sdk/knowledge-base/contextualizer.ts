/**
 * Contextualizer for the contextual-retrieval pipeline.
 *
 * Spec: docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md
 *       § 2. Contextualizer
 *
 * For each `(document, chunk)` pair, generates a 50-100 token preamble
 * that situates the chunk in the document's overall context. Run once per
 * chunk at index-build time; the preamble + chunk text is what gets
 * embedded + BM25-indexed downstream.
 *
 * Per CLAUDE.md "TypeScript reference catalog" framing: no @anthropic-ai/sdk
 * dep. The Messages API + prompt-caching wire-format is straightforward
 * via plain `fetch`. Same iter-24 parry-scan / iter-33 reranker precedent.
 * Swap to the SDK if we adopt streaming, batches, or beta features.
 *
 * Failure mode: degraded — if a request fails, return the chunk unchanged
 * with `contextPreamble: null` and `contextStatus: "failed"` so callers
 * can retry on a future index-rebuild without losing the chunk itself.
 */

import type { Chunk } from './chunker.ts';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_MAX_TOKENS = 200;
const PROMPT_CACHING_HEADER = 'prompt-caching-2024-07-31';

/**
 * The prompt body, verbatim from
 * <https://www.anthropic.com/news/contextual-retrieval>. Do NOT paraphrase.
 *
 * Layout: the document content is placed in a separate cacheable block so
 * Anthropic's prompt cache reuses it across all chunks of the same doc.
 */
const PROMPT_PREFIX = `<document>
`;

const PROMPT_BETWEEN = `
</document>

Here is the chunk we want to situate within the whole document
<chunk>
`;

const PROMPT_SUFFIX = `
</chunk>

Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else.`;

export interface ContextualizedChunk extends Chunk {
  /** The 50-100 token context produced by Claude. `null` on failure. */
  contextPreamble: string | null;
  /** "ok" on success; "failed" if the API call errored or returned nothing. */
  contextStatus: 'ok' | 'failed';
  /** Reason for failure, populated only when `contextStatus === "failed"`. */
  contextFailureReason: string | null;
}

export interface ContextualizeOptions {
  /** Override the API key (test hook + power-user). Default `ANTHROPIC_API_KEY`. */
  apiKey?: string;
  /** Override the model. Default `claude-haiku-4-5-20251001`. */
  model?: string;
  /** Max output tokens. Default 200 (50-100 token target + headroom). */
  maxTokens?: number;
  /** Test hook: override fetch. */
  __fetch?: Fetcher;
}

type Fetcher = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

interface AnthropicMessagesResponse {
  content?: Array<{ type: string; text?: string }>;
  /** Cache-related metadata; we don't act on it but surface it for tests. */
  usage?: { cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
}

/**
 * Resolve the API key. Returns null when both options and env are blank.
 *
 * Priority:
 *   1. `opts.apiKey` (explicit, including for tests)
 *   2. `ANTHROPIC_API_KEY` env
 *   3. `CLAUDE_CODE_OAUTH_TOKEN` env (per cookbook-ontology.md auth substitution)
 */
function readApiKey(opts?: ContextualizeOptions): string | null {
  const explicit = opts?.apiKey?.trim();
  if (explicit) return explicit;
  const env =
    process.env['ANTHROPIC_API_KEY']?.trim() ||
    process.env['CLAUDE_CODE_OAUTH_TOKEN']?.trim();
  return env && env.length > 0 ? env : null;
}

/**
 * Build the Anthropic request body for a single chunk. The document content
 * is placed in a cacheable block so multi-chunk runs hit the cache after
 * the first call.
 */
function buildRequestBody(
  document: string,
  chunkText: string,
  model: string,
  maxTokens: number,
): Record<string, unknown> {
  return {
    model,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: PROMPT_PREFIX + document + PROMPT_BETWEEN,
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: chunkText + PROMPT_SUFFIX,
          },
        ],
      },
    ],
  };
}

function extractText(payload: AnthropicMessagesResponse): string | null {
  if (!payload?.content || !Array.isArray(payload.content)) return null;
  const text = payload.content
    .filter((c) => c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text!)
    .join('')
    .trim();
  return text.length > 0 ? text : null;
}

function failedChunk(chunk: Chunk, reason: string): ContextualizedChunk {
  return {
    ...chunk,
    contextPreamble: null,
    contextStatus: 'failed',
    contextFailureReason: reason,
  };
}

/**
 * Contextualize a single chunk against its parent document.
 *
 * The document is sent in a cache-control block so a subsequent call for
 * the same document hits the prompt cache (~10× cheaper for cached input
 * tokens vs uncached). For batch contextualization across all chunks of
 * one document, prefer `contextualizeAll()` below — it issues calls
 * sequentially so the cache is warm by the second chunk.
 */
export async function contextualize(
  document: string,
  chunk: Chunk,
  opts?: ContextualizeOptions,
): Promise<ContextualizedChunk> {
  const key = readApiKey(opts);
  if (!key) {
    return failedChunk(chunk, 'missing_api_key');
  }
  const model = opts?.model ?? DEFAULT_MODEL;
  const maxTokens = opts?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const doFetch: Fetcher = opts?.__fetch ?? (fetch as unknown as Fetcher);

  const body = buildRequestBody(document, chunk.text, model, maxTokens);

  try {
    const res = await doFetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-beta': PROMPT_CACHING_HEADER,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return failedChunk(chunk, `http_${res.status}`);
    }
    const payload = (await res.json()) as AnthropicMessagesResponse;
    const text = extractText(payload);
    if (!text) {
      return failedChunk(chunk, 'empty_response');
    }
    return {
      ...chunk,
      contextPreamble: text,
      contextStatus: 'ok',
      contextFailureReason: null,
    };
  } catch (e) {
    return failedChunk(
      chunk,
      e instanceof Error ? `throw_${e.message}` : 'throw_unknown',
    );
  }
}

/**
 * Contextualize every chunk in a document. Issues calls sequentially so the
 * prompt cache warms after the first call (cache hit on identical document
 * blob). Subsequent calls in the same loop pay only `chunk_tokens` of new
 * input instead of `document_tokens + chunk_tokens`.
 *
 * Failures are logged on the per-chunk result, not thrown — a failed
 * chunk's `contextStatus = "failed"` so the eval pipeline can decide
 * whether to retry on the next rebuild.
 */
export async function contextualizeAll(
  document: string,
  chunks: Chunk[],
  opts?: ContextualizeOptions,
): Promise<ContextualizedChunk[]> {
  const out: ContextualizedChunk[] = [];
  for (const chunk of chunks) {
    out.push(await contextualize(document, chunk, opts));
  }
  return out;
}

/**
 * Test-only: expose the prompt template for assertions on verbatim
 * Anthropic prompt usage. Production code does not call this.
 */
export const __PROMPT_TEMPLATE_FOR_TESTS = {
  prefix: PROMPT_PREFIX,
  between: PROMPT_BETWEEN,
  suffix: PROMPT_SUFFIX,
};
