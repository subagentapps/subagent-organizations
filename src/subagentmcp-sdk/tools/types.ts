/**
 * Shared types for the crawlee-content-layer readers.
 *
 * Mirrors the contract in
 * docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md.
 *
 * Per CLAUDE.md #3: src/ mirrors docs/spec/ 1:1. Update the spec first if
 * adding fields here.
 */

/**
 * Decision rules from `crawlee-content-layer.md` § parry integration.
 * Score range is [0, 1].
 */
export type ParryLabel = 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS';

export interface ParryScanResult {
  label: ParryLabel;
  score: number;
  /** Where the scan ran ("api" = HF Inference, "subprocess" = local parry CLI). */
  via: 'api' | 'subprocess' | 'stub';
}

/** Optional thresholds for SUSPICIOUS / MALICIOUS classification. */
export interface ParryThresholds {
  /** score ≥ this is SUSPICIOUS unless ≥ malicious. Default 0.3. */
  suspicious?: number;
  /** score ≥ this is MALICIOUS. Default 0.8. */
  malicious?: number;
}

/** Common options every reader accepts. */
export interface ContentReaderOptions {
  /** Override default 0.3 / 0.8 parry thresholds. */
  parryThresholds?: ParryThresholds;
  /**
   * If true, skip the parry scan entirely. Use only for tests of unrelated
   * pipeline stages or trusted local fixtures.
   */
  skipParry?: boolean;
  /** Max bytes to keep from the raw input. Reader truncates beyond this. */
  maxBytes?: number;
}

/**
 * Reader output is a discriminated union — caller pattern-matches on
 * `blocked` (true → no `data`).
 */
export type ContentReaderResult<TData> =
  | {
      blocked: false;
      data: TData;
      /** SHA-256 of the post-processed content; what the bloom filter keys on. */
      sourceSha256: string;
      /** parryScore is null when skipParry is set. */
      parryScore: number | null;
      /** Soft warnings; never empty for SUSPICIOUS pages. */
      warnings: string[];
    }
  | {
      blocked: true;
      data: null;
      reason: 'prompt_injection' | 'budget_exceeded' | 'fetch_failed';
      parryScore: number | null;
    };

/**
 * Every reader implements this interface. `read(url, opts)` returns null
 * only on bloom-cache *miss followed by* an external error that prevents
 * even a blocked-result entry; otherwise it always resolves to a result.
 */
export interface ContentReader<TOpts extends ContentReaderOptions, TData> {
  read(url: string, opts?: TOpts): Promise<ContentReaderResult<TData> | null>;
}

/**
 * Compute SHA-256 of a UTF-8 string. Used for bloom-filter keys.
 * Lives here (not in the reader) because every reader needs it.
 */
export async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
