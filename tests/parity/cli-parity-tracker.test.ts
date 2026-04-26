/**
 * Guards `docs/spec/cli-parity-tracker.md` against drift from filesystem
 * reality.
 *
 * Spec: docs/spec/cli-parity-tracker.md
 *
 * The matrix is hand-maintained but its `status` column is derivable from
 * `docs/spec/cli-skills/` — this test catches rows that drift (e.g. a spec
 * lands but the matrix still says `tbd`).
 */

import { describe, expect, test } from 'bun:test';
import {
  TRACKED_SKILLS,
  deriveStatus,
  parseTrackerMatrix,
  check,
} from '../../src/parity/check.ts';

describe('parity tracker — matrix declarations match filesystem state', () => {
  test('every tracked skill has a row in the matrix', () => {
    const declared = parseTrackerMatrix();
    const missing: string[] = [];
    for (const { plugin, skill } of TRACKED_SKILLS) {
      const key = `${plugin}:${skill}`;
      if (!declared.has(key)) missing.push(key);
    }
    expect(missing).toEqual([]);
  });

  test('declared status matches derived status (no drift)', () => {
    const diffs = check();
    expect(diffs).toEqual([]);
  });
});

describe('parity tracker — derivation rules', () => {
  test('deriveStatus returns "ported" when the spec file exists', () => {
    expect(deriveStatus('productivity', 'start')).toBe('ported');
    expect(deriveStatus('productivity', 'update')).toBe('ported');
  });

  test('deriveStatus returns "tbd" when the spec file is missing', () => {
    expect(deriveStatus('productivity', 'task-management')).toBe('tbd');
    expect(deriveStatus('productivity', 'memory-management')).toBe('tbd');
    expect(deriveStatus('product-management', 'write-spec')).toBe('tbd');
  });

  test('deriveStatus handles the engineering plugin', () => {
    expect(deriveStatus('engineering', 'system-design')).toBe('ported');
    expect(deriveStatus('engineering', 'testing-strategy')).toBe('ported');
    expect(deriveStatus('engineering', 'stack-check')).toBe('ported');
    expect(deriveStatus('engineering', 'architecture-review')).toBe('ported');
    expect(deriveStatus('engineering', 'incident-postmortem')).toBe('tbd');
  });
});

describe('parity tracker — invariants', () => {
  test('every (plugin, skill) pair is unique', () => {
    const seen = new Set<string>();
    for (const { plugin, skill } of TRACKED_SKILLS) {
      const key = `${plugin}:${skill}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  test('plugin names are restricted to the in-scope set', () => {
    const ALLOWED = new Set([
      'productivity',
      'product-management',
      'engineering',
    ]);
    for (const { plugin } of TRACKED_SKILLS) {
      expect(ALLOWED.has(plugin)).toBe(true);
    }
  });
});
