/**
 * Stub for parry prompt-injection scanning.
 *
 * The real implementation calls HuggingFace Inference API or a local
 * `parry` subprocess (per `crawlee-content-layer.md` § parry integration).
 * This stub is in place so readers can ship before parry's runtime is
 * wired up. The interface is final; only the body changes.
 *
 * Per CLAUDE.md #5: do not add submodules / vendored runtimes here.
 */

import type {
  ParryLabel,
  ParryScanResult,
  ParryThresholds,
} from './types.ts';

const DEFAULT_SUSPICIOUS = 0.3;
const DEFAULT_MALICIOUS = 0.8;

export function classify(
  score: number,
  thresholds?: ParryThresholds,
): ParryLabel {
  const sus = thresholds?.suspicious ?? DEFAULT_SUSPICIOUS;
  const mal = thresholds?.malicious ?? DEFAULT_MALICIOUS;
  if (score >= mal) return 'MALICIOUS';
  if (score >= sus) return 'SUSPICIOUS';
  return 'SAFE';
}

/**
 * Stub scan. Real implementation lives behind this signature; tests
 * inject a deterministic score by passing `__forceScore` in opts.
 *
 * NEVER returns a non-zero score for routine fixture content. If a test
 * wants a SUSPICIOUS or MALICIOUS verdict, it must inject explicitly.
 */
export async function scan(
  _markdown: string,
  opts?: { thresholds?: ParryThresholds; __forceScore?: number },
): Promise<ParryScanResult> {
  const score = opts?.__forceScore ?? 0;
  return {
    label: classify(score, opts?.thresholds),
    score,
    via: 'stub',
  };
}
