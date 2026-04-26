/**
 * subagent-js — extract a typed export from a JS/MDX source file.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *       § Subagent-js
 *
 * Canonical example: `code.claude.com/docs/en/context-window.md` exports
 * `EVENTS = [...]`. `subagent-html` would convert the prose around it but
 * lose the data. `subagent-js` parses the source and pulls the typed array.
 *
 * Pipeline:
 *   plain fetch → evaluateNamedExport → optional schema.parse → result
 *
 * No parry scan: this reader extracts data, not prose. The schema (and
 * caller-side validation) is the trust boundary.
 */

import type {
  ContentReader,
  ContentReaderOptions,
  ContentReaderResult,
} from './types.ts';
import { sha256 } from './types.ts';
import {
  evaluateNamedExport,
  JsLiteralError,
} from './_js-literal-eval.ts';

/** Zod-compatible schema duck-type. Same shape as subagent-xml's. */
export interface ParseableSchema<T> {
  parse(input: unknown): T;
}

export interface JSReadOptions extends ContentReaderOptions {
  /** Named export to extract (e.g. `'EVENTS'` from context-window.md). */
  exportName: string;
  /** Optional Zod-compatible schema validating the extracted shape. */
  schema?: ParseableSchema<unknown>;
  /** For tests: provide source directly instead of fetching the URL. */
  __injectSource?: string;
}

export interface JSReadResult<TData = unknown> {
  url: string;
  /** The extracted (and optionally schema-validated) value. */
  data: TData;
  /** SHA-256 of the source text (not the extracted value). */
  sourceSha256: string;
  /** Name of the export that was extracted. */
  exportName: string;
}

async function fetchSource(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Accept: 'text/javascript, text/plain, text/markdown, */*',
    },
  });
  if (!res.ok) throw new Error(`fetch ${url} -> HTTP ${res.status}`);
  return await res.text();
}

export const subagentJs: ContentReader<JSReadOptions, JSReadResult> = {
  async read(
    url: string,
    opts?: JSReadOptions,
  ): Promise<ContentReaderResult<JSReadResult> | null> {
    if (!opts?.exportName) {
      // Required option missing — fail closed; caller bug.
      return {
        blocked: true,
        data: null,
        reason: 'fetch_failed',
        parryScore: null,
      };
    }

    let source: string;
    try {
      source = opts.__injectSource ?? (await fetchSource(url));
    } catch {
      return {
        blocked: true,
        data: null,
        reason: 'fetch_failed',
        parryScore: null,
      };
    }

    if (opts.maxBytes && source.length > opts.maxBytes) {
      source = source.slice(0, opts.maxBytes);
    }

    let value: unknown;
    try {
      value = evaluateNamedExport(source, opts.exportName);
    } catch (e) {
      // JsLiteralError or unexpected — both are extraction failures.
      // Distinguish via the reason field so callers can decide whether
      // to upgrade to @babel/parser. We map both to `fetch_failed` for
      // now to keep the result shape narrow; the error message is lost
      // (fine for production, tests can re-evaluate directly).
      void e instanceof JsLiteralError; // type assertion for future use
      return {
        blocked: true,
        data: null,
        reason: 'fetch_failed',
        parryScore: null,
      };
    }

    if (opts.schema) {
      try {
        value = opts.schema.parse(value);
      } catch {
        return {
          blocked: true,
          data: null,
          reason: 'fetch_failed',
          parryScore: null,
        };
      }
    }

    const sourceSha256 = await sha256(source);

    return {
      blocked: false,
      data: {
        url,
        data: value,
        sourceSha256,
        exportName: opts.exportName,
      },
      sourceSha256,
      parryScore: null,
      warnings: [],
    };
  },
};
