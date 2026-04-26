/**
 * subagent-xml — XML feed reader.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md § subagent-xml
 *
 * Handles sitemaps, Atom/RSS feeds, OpenAPI XML. Returns the parsed XML tree
 * and (optionally) a selected subtree validated against a Zod-compatible
 * schema.
 *
 * Per CLAUDE.md #2 + #3: this file is the implementation of the contract in
 * the spec.
 *
 * Schema validation uses *duck-typed* `Schema.parse(value)`. Zod's `ZodType`
 * already exposes this method, so callers can pass a Zod schema directly
 * without us pulling Zod in as a runtime dep. Anything with a compatible
 * shape (Valibot, Yup, hand-rolled validators) also works.
 */

import type {
  ContentReader,
  ContentReaderOptions,
  ContentReaderResult,
} from './types.ts';
import { sha256 } from './types.ts';
import { scan, classify } from './_parry-scan.ts';
import { parseXml, selectXml, type XmlNode } from './_xml-parse.ts';

/** Zod-compatible schema duck-type. Avoids importing Zod as a runtime dep. */
export interface ParseableSchema<T> {
  parse(input: unknown): T;
}

export interface XMLReadOptions extends ContentReaderOptions {
  /**
   * XPath-ish selector to extract a sub-tree. See `_xml-parse.ts` for the
   * supported subset (`/root/child`, `//descendant`, `/*`, `[n]` positional).
   * Omit to return the document root.
   */
  selector?: string;
  /** Validation schema for the extracted shape. */
  schema?: ParseableSchema<unknown>;
  /** For tests: provide raw XML directly instead of fetching the URL. */
  __injectXml?: string;
  /** For tests: inject a parry score without running the real scanner. */
  __forceParryScore?: number;
}

export interface XMLReadResult<TData = unknown> {
  url: string;
  /** The selected subtree (or full root if no selector). Single node when the selector matches one element; first match if multiple. */
  node: XmlNode;
  /** All matching nodes when the selector returns multiple. Empty when selector matched one or none. */
  nodes: XmlNode[];
  /** Result of `schema.parse(node)` when a schema is provided; otherwise `node`. */
  data: TData;
}

async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { Accept: 'application/xml, text/xml, application/atom+xml, application/rss+xml, */*' },
  });
  if (!res.ok) {
    throw new Error(`fetch ${url} -> HTTP ${res.status}`);
  }
  return await res.text();
}

export const subagentXml: ContentReader<XMLReadOptions, XMLReadResult> = {
  async read(
    url: string,
    opts?: XMLReadOptions,
  ): Promise<ContentReaderResult<XMLReadResult> | null> {
    let raw: string;
    try {
      raw = opts?.__injectXml ?? (await fetchXml(url));
    } catch {
      return {
        blocked: true,
        data: null,
        reason: 'fetch_failed',
        parryScore: null,
      };
    }

    let xml = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (opts?.maxBytes && xml.length > opts.maxBytes) {
      xml = xml.slice(0, opts.maxBytes);
    }

    let root: XmlNode;
    try {
      root = parseXml(xml);
    } catch {
      return {
        blocked: true,
        data: null,
        reason: 'fetch_failed',
        parryScore: null,
      };
    }

    let selected: XmlNode[];
    if (opts?.selector) {
      selected = selectXml(root, opts.selector);
      if (selected.length === 0) {
        return {
          blocked: true,
          data: null,
          reason: 'fetch_failed',
          parryScore: null,
        };
      }
    } else {
      selected = [root];
    }

    let parryScore: number | null = null;
    if (!opts?.skipParry) {
      const scanOpts: { thresholds?: ContentReaderOptions['parryThresholds']; __forceScore?: number } = {};
      if (opts?.parryThresholds !== undefined) scanOpts.thresholds = opts.parryThresholds;
      if (opts?.__forceParryScore !== undefined) scanOpts.__forceScore = opts.__forceParryScore;
      // Scan the raw XML — CDATA contents are visible there too.
      const scanResult = await scan(xml, scanOpts);
      parryScore = scanResult.score;
      if (scanResult.label === 'MALICIOUS') {
        return {
          blocked: true,
          data: null,
          reason: 'prompt_injection',
          parryScore,
        };
      }
    }

    const warnings: string[] = [];
    if (parryScore !== null) {
      const label = classify(parryScore, opts?.parryThresholds);
      if (label === 'SUSPICIOUS') {
        warnings.push('prompt_injection_suspicious');
      }
    }

    const node = selected[0]!;
    let data: unknown = node;
    if (opts?.schema) {
      try {
        data = opts.schema.parse(node);
      } catch {
        return {
          blocked: true,
          data: null,
          reason: 'fetch_failed',
          parryScore,
        };
      }
    }

    const sourceSha256 = await sha256(xml);

    return {
      blocked: false,
      data: {
        url,
        node,
        nodes: selected,
        data,
      },
      sourceSha256,
      parryScore,
      warnings,
    };
  },
};
