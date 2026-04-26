/**
 * Unit tests for `src/subagentmcp-sdk/tools/_parry-scan.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md
 *       § parry integration
 *
 * Network is replaced by `__fetch` and the token path is overridden via
 * `tokenPath` so these tests run offline and don't depend on any HF account.
 */

import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  classify,
  scan,
  __clearScanCacheForTests,
} from '../../src/subagentmcp-sdk/tools/_parry-scan.ts';

afterEach(() => {
  __clearScanCacheForTests();
});

function tmpToken(content: string): { path: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'parry-test-'));
  const path = join(dir, 'token');
  writeFileSync(path, content);
  return {
    path,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function mockFetch(
  responses: Array<
    | { ok: true; json: unknown }
    | { ok: false; status: number }
    | { throw: Error }
  >,
): {
  fetcher: Parameters<typeof scan>[1] extends infer O
    ? O extends { __fetch?: infer F }
      ? F
      : never
    : never;
  callCount: () => number;
  calls: Array<{ url: string; init?: unknown }>;
} {
  const calls: Array<{ url: string; init?: unknown }> = [];
  let i = 0;
  const fetcher = (url: string, init?: unknown) => {
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
  return {
    fetcher: fetcher as never,
    callCount: () => calls.length,
    calls,
  };
}

describe('classify', () => {
  test('SAFE below 0.3 default', () => {
    expect(classify(0)).toBe('SAFE');
    expect(classify(0.29)).toBe('SAFE');
  });
  test('SUSPICIOUS in [0.3, 0.8) default', () => {
    expect(classify(0.3)).toBe('SUSPICIOUS');
    expect(classify(0.5)).toBe('SUSPICIOUS');
    expect(classify(0.79)).toBe('SUSPICIOUS');
  });
  test('MALICIOUS at/above 0.8 default', () => {
    expect(classify(0.8)).toBe('MALICIOUS');
    expect(classify(1.0)).toBe('MALICIOUS');
  });
  test('custom thresholds', () => {
    expect(classify(0.4, { suspicious: 0.5 })).toBe('SAFE');
    expect(classify(0.6, { suspicious: 0.5, malicious: 0.7 })).toBe('SUSPICIOUS');
    expect(classify(0.7, { suspicious: 0.5, malicious: 0.7 })).toBe('MALICIOUS');
  });
});

describe('scan — __forceScore test hook', () => {
  test('returns the injected score with via=stub', async () => {
    const result = await scan('any markdown', { __forceScore: 0.55 });
    expect(result.score).toBe(0.55);
    expect(result.label).toBe('SUSPICIOUS');
    expect(result.via).toBe('stub');
  });

  test('does not hit fetch when __forceScore is set', async () => {
    const m = mockFetch([{ throw: new Error('should not be called') }]);
    const result = await scan('x', { __forceScore: 0.1, __fetch: m.fetcher });
    expect(result.via).toBe('stub');
    expect(m.callCount()).toBe(0);
  });
});

describe('scan — no token (fail-open stub)', () => {
  test('returns SAFE/score=0/via=stub when token file does not exist', async () => {
    const result = await scan('untrusted text', {
      tokenPath: '/nonexistent/parry/token',
    });
    expect(result).toEqual({ label: 'SAFE', score: 0, via: 'stub' });
  });

  test('returns SAFE when token file exists but is empty', async () => {
    const tok = tmpToken('   \n');
    try {
      const result = await scan('text', { tokenPath: tok.path });
      expect(result.via).toBe('stub');
    } finally {
      tok.cleanup();
    }
  });
});

describe('scan — HF Inference API path', () => {
  test('SAFE response → label=SAFE, via=api', async () => {
    const tok = tmpToken('hf_xxxxx');
    const m = mockFetch([
      { ok: true, json: [[{ label: 'INJECTION', score: 0.05 }, { label: 'SAFE', score: 0.95 }]] },
    ]);
    try {
      const result = await scan('benign text', {
        tokenPath: tok.path,
        __fetch: m.fetcher,
      });
      expect(result.label).toBe('SAFE');
      expect(result.score).toBeCloseTo(0.05, 5);
      expect(result.via).toBe('api');
      expect(m.callCount()).toBe(1);
    } finally {
      tok.cleanup();
    }
  });

  test('SUSPICIOUS response surfaces the injection score', async () => {
    const tok = tmpToken('hf_xxxxx');
    const m = mockFetch([
      { ok: true, json: [[{ label: 'INJECTION', score: 0.55 }, { label: 'SAFE', score: 0.45 }]] },
    ]);
    try {
      const result = await scan('text', { tokenPath: tok.path, __fetch: m.fetcher });
      expect(result.label).toBe('SUSPICIOUS');
      expect(result.score).toBe(0.55);
      expect(result.via).toBe('api');
    } finally {
      tok.cleanup();
    }
  });

  test('MALICIOUS response triggers the BLOCK path', async () => {
    const tok = tmpToken('hf_xxxxx');
    const m = mockFetch([
      { ok: true, json: [[{ label: 'INJECTION', score: 0.95 }, { label: 'SAFE', score: 0.05 }]] },
    ]);
    try {
      const result = await scan('clearly bad text', {
        tokenPath: tok.path,
        __fetch: m.fetcher,
      });
      expect(result.label).toBe('MALICIOUS');
      expect(result.score).toBe(0.95);
    } finally {
      tok.cleanup();
    }
  });

  test('uses Bearer auth and POSTs to the model endpoint', async () => {
    const tok = tmpToken('hf_secret_token_value');
    const m = mockFetch([
      { ok: true, json: [[{ label: 'INJECTION', score: 0.1 }]] },
    ]);
    try {
      await scan('payload', { tokenPath: tok.path, __fetch: m.fetcher });
      const call = m.calls[0]!;
      expect(call.url).toContain('protectai/deberta-v3-base-prompt-injection-v2');
      const init = call.init as { method: string; headers: Record<string,string>; body: string };
      expect(init.method).toBe('POST');
      expect(init.headers['Authorization']).toBe('Bearer hf_secret_token_value');
      expect(JSON.parse(init.body)).toEqual({ inputs: 'payload' });
    } finally {
      tok.cleanup();
    }
  });
});

describe('scan — content-hash cache', () => {
  test('second call with same markdown does not refetch', async () => {
    const tok = tmpToken('hf_xxxxx');
    const m = mockFetch([
      { ok: true, json: [[{ label: 'INJECTION', score: 0.1 }]] },
    ]);
    try {
      const a = await scan('same body', { tokenPath: tok.path, __fetch: m.fetcher });
      const b = await scan('same body', { tokenPath: tok.path, __fetch: m.fetcher });
      expect(a).toEqual(b);
      expect(m.callCount()).toBe(1);
    } finally {
      tok.cleanup();
    }
  });

  test('different markdown triggers a second fetch', async () => {
    const tok = tmpToken('hf_xxxxx');
    const m = mockFetch([
      { ok: true, json: [[{ label: 'INJECTION', score: 0.1 }]] },
      { ok: true, json: [[{ label: 'INJECTION', score: 0.4 }]] },
    ]);
    try {
      await scan('body one', { tokenPath: tok.path, __fetch: m.fetcher });
      await scan('body two', { tokenPath: tok.path, __fetch: m.fetcher });
      expect(m.callCount()).toBe(2);
    } finally {
      tok.cleanup();
    }
  });

  test('threshold change invalidates cache (different bucket)', async () => {
    const tok = tmpToken('hf_xxxxx');
    const m = mockFetch([
      { ok: true, json: [[{ label: 'INJECTION', score: 0.4 }]] },
      { ok: true, json: [[{ label: 'INJECTION', score: 0.4 }]] },
    ]);
    try {
      await scan('same body', { tokenPath: tok.path, __fetch: m.fetcher });
      await scan('same body', {
        tokenPath: tok.path,
        __fetch: m.fetcher,
        thresholds: { suspicious: 0.5 },
      });
      expect(m.callCount()).toBe(2);
    } finally {
      tok.cleanup();
    }
  });

  test('__skipCache forces a refetch', async () => {
    const tok = tmpToken('hf_xxxxx');
    const m = mockFetch([
      { ok: true, json: [[{ label: 'INJECTION', score: 0.1 }]] },
      { ok: true, json: [[{ label: 'INJECTION', score: 0.1 }]] },
    ]);
    try {
      await scan('body', { tokenPath: tok.path, __fetch: m.fetcher });
      await scan('body', {
        tokenPath: tok.path,
        __fetch: m.fetcher,
        __skipCache: true,
      });
      expect(m.callCount()).toBe(2);
    } finally {
      tok.cleanup();
    }
  });
});

describe('scan — fail-open behavior', () => {
  test('HTTP 503 → SAFE/score=0/via=stub (does not throw)', async () => {
    const tok = tmpToken('hf_xxxxx');
    const m = mockFetch([{ ok: false, status: 503 }]);
    try {
      const result = await scan('text', { tokenPath: tok.path, __fetch: m.fetcher });
      expect(result.via).toBe('stub');
      expect(result.score).toBe(0);
      expect(result.label).toBe('SAFE');
    } finally {
      tok.cleanup();
    }
  });

  test('network throw → SAFE/via=stub', async () => {
    const tok = tmpToken('hf_xxxxx');
    const m = mockFetch([{ throw: new Error('econnrefused') }]);
    try {
      const result = await scan('text', { tokenPath: tok.path, __fetch: m.fetcher });
      expect(result.via).toBe('stub');
    } finally {
      tok.cleanup();
    }
  });

  test('malformed payload → SAFE/via=stub', async () => {
    const tok = tmpToken('hf_xxxxx');
    const m = mockFetch([{ ok: true, json: { unexpected: 'shape' } }]);
    try {
      const result = await scan('text', { tokenPath: tok.path, __fetch: m.fetcher });
      expect(result.via).toBe('stub');
    } finally {
      tok.cleanup();
    }
  });

  test('fail-open verdict is cached so HF outage is not retried per call', async () => {
    const tok = tmpToken('hf_xxxxx');
    const m = mockFetch([{ ok: false, status: 503 }]);
    try {
      const a = await scan('body', { tokenPath: tok.path, __fetch: m.fetcher });
      const b = await scan('body', { tokenPath: tok.path, __fetch: m.fetcher });
      expect(a.via).toBe('stub');
      expect(b.via).toBe('stub');
      expect(m.callCount()).toBe(1);
    } finally {
      tok.cleanup();
    }
  });
});
