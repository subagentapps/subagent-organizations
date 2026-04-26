/**
 * Unit tests for `_js-literal-eval.ts`.
 *
 * Spec: docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md § Subagent-js
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  evaluateNamedExport,
  JsLiteralError,
} from '../../src/subagentmcp-sdk/tools/_js-literal-eval.ts';

const FIXTURES_DIR = join(import.meta.dir, '..', 'fixtures');
function fixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), 'utf8');
}

describe('evaluateNamedExport — primitives', () => {
  test('string', () => {
    expect(evaluateNamedExport('export const X = "hello";', 'X')).toBe('hello');
  });

  test('single-quoted string', () => {
    expect(evaluateNamedExport("export const X = 'hi';", 'X')).toBe('hi');
  });

  test('number — integer', () => {
    expect(evaluateNamedExport('export const X = 42;', 'X')).toBe(42);
  });

  test('number — negative + float + scientific', () => {
    expect(evaluateNamedExport('export const A = -1.5;', 'A')).toBe(-1.5);
    expect(evaluateNamedExport('export const B = 1e3;', 'B')).toBe(1000);
    expect(evaluateNamedExport('export const C = -2.5e-1;', 'C')).toBe(-0.25);
  });

  test('number — hex', () => {
    expect(evaluateNamedExport('export const X = 0xff;', 'X')).toBe(255);
  });

  test('booleans + null + undefined', () => {
    expect(evaluateNamedExport('export const A = true;', 'A')).toBe(true);
    expect(evaluateNamedExport('export const B = false;', 'B')).toBe(false);
    expect(evaluateNamedExport('export const C = null;', 'C')).toBeNull();
    expect(evaluateNamedExport('export const D = undefined;', 'D')).toBeUndefined();
  });

  test('let / var also work', () => {
    expect(evaluateNamedExport('export let X = 1;', 'X')).toBe(1);
    expect(evaluateNamedExport('export var X = 1;', 'X')).toBe(1);
  });
});

describe('evaluateNamedExport — strings', () => {
  test('escape sequences', () => {
    expect(evaluateNamedExport('export const X = "a\\nb\\tc";', 'X')).toBe('a\nb\tc');
  });

  test('unicode escape \\u', () => {
    expect(evaluateNamedExport('export const X = "\\u00e9";', 'X')).toBe('é');
  });

  test('unicode escape \\u{...}', () => {
    expect(evaluateNamedExport('export const X = "\\u{1f600}";', 'X')).toBe('😀');
  });

  test('template literal without interpolation accepted', () => {
    expect(evaluateNamedExport('export const X = `plain text`;', 'X')).toBe('plain text');
  });

  test('template literal WITH interpolation rejected', () => {
    expect(() =>
      evaluateNamedExport('export const X = `hi ${name}`;', 'X'),
    ).toThrow(JsLiteralError);
  });
});

describe('evaluateNamedExport — arrays', () => {
  test('empty array', () => {
    expect(evaluateNamedExport('export const X = [];', 'X')).toEqual([]);
  });

  test('flat array of mixed primitives', () => {
    expect(evaluateNamedExport('export const X = [1, "two", true, null];', 'X'))
      .toEqual([1, 'two', true, null]);
  });

  test('trailing comma allowed', () => {
    expect(evaluateNamedExport('export const X = [1, 2, 3,];', 'X')).toEqual([1, 2, 3]);
  });

  test('nested arrays', () => {
    expect(evaluateNamedExport('export const X = [[1,2],[3,4]];', 'X'))
      .toEqual([[1, 2], [3, 4]]);
  });

  test('spread rejected', () => {
    expect(() =>
      evaluateNamedExport('export const X = [...other];', 'X'),
    ).toThrow(JsLiteralError);
  });
});

describe('evaluateNamedExport — objects', () => {
  test('unquoted keys', () => {
    expect(evaluateNamedExport('export const X = { a: 1, b: "two" };', 'X'))
      .toEqual({ a: 1, b: 'two' });
  });

  test('quoted keys', () => {
    expect(evaluateNamedExport('export const X = { "a-key": 1 };', 'X'))
      .toEqual({ 'a-key': 1 });
  });

  test('trailing comma allowed', () => {
    expect(evaluateNamedExport('export const X = { a: 1, b: 2, };', 'X'))
      .toEqual({ a: 1, b: 2 });
  });

  test('nested objects', () => {
    expect(evaluateNamedExport('export const X = { outer: { inner: 1 } };', 'X'))
      .toEqual({ outer: { inner: 1 } });
  });

  test('computed keys rejected', () => {
    expect(() =>
      evaluateNamedExport('export const X = { [key]: 1 };', 'X'),
    ).toThrow(JsLiteralError);
  });

  test('spread rejected', () => {
    expect(() =>
      evaluateNamedExport('export const X = { ...other };', 'X'),
    ).toThrow(JsLiteralError);
  });
});

describe('evaluateNamedExport — comments + whitespace', () => {
  test('line comments inside object', () => {
    const src = `export const X = {
      // a comment
      a: 1,
      b: 2, // another
    };`;
    expect(evaluateNamedExport(src, 'X')).toEqual({ a: 1, b: 2 });
  });

  test('block comments inside array', () => {
    const src = `export const X = [
      1,
      /* skipped */
      2,
    ];`;
    expect(evaluateNamedExport(src, 'X')).toEqual([1, 2]);
  });
});

describe('evaluateNamedExport — error cases', () => {
  test('export not found', () => {
    expect(() =>
      evaluateNamedExport('export const Y = 1;', 'X'),
    ).toThrow(/not found/);
  });

  test('function call rejected', () => {
    expect(() =>
      evaluateNamedExport('export const X = compute(1, 2);', 'X'),
    ).toThrow(JsLiteralError);
  });

  test('arrow function rejected', () => {
    expect(() =>
      evaluateNamedExport('export const X = () => 1;', 'X'),
    ).toThrow(JsLiteralError);
  });

  test('reference to identifier rejected', () => {
    expect(() =>
      evaluateNamedExport('export const X = SOMETHING;', 'X'),
    ).toThrow(JsLiteralError);
  });

  test('JsLiteralError carries position info', () => {
    try {
      evaluateNamedExport('export const X = compute();', 'X');
      throw new Error('unreachable');
    } catch (e) {
      expect(e).toBeInstanceOf(JsLiteralError);
      if (e instanceof JsLiteralError) {
        expect(e.position).toBeGreaterThan(0);
      }
    }
  });
});

describe('evaluateNamedExport — context-window-events fixture', () => {
  test('extracts EVENTS array verbatim', () => {
    const src = fixture('context-window-events.mdx');
    const events = evaluateNamedExport(src, 'EVENTS') as Array<Record<string, unknown>>;
    expect(events).toHaveLength(5);
    expect(events[0]).toMatchObject({
      t: 0,
      kind: 'system',
      label: 'Session start',
      tokens: 1200,
    });
    expect(events[2]).toMatchObject({
      kind: 'tool',
      link: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview',
    });
    expect(events[3]?.link).toBeNull();
    expect(events[4]?.tokens).toBe(-3000);
    expect(events[4]?.vis).toBe('hidden');
  });
});

describe('evaluateNamedExport — multiple exports in one file', () => {
  test('picks the requested one', () => {
    const src = `
      export const A = [1, 2];
      export const B = "hello";
      export const C = { x: true };
    `;
    expect(evaluateNamedExport(src, 'A')).toEqual([1, 2]);
    expect(evaluateNamedExport(src, 'B')).toBe('hello');
    expect(evaluateNamedExport(src, 'C')).toEqual({ x: true });
  });
});
