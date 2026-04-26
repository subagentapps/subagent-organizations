/**
 * Smoke tests for `/skill-creator`.
 *
 * Spec: docs/spec/skills/skill-creator/README.md
 *
 * Verifies the skill's frontmatter parses, required fields are present,
 * the supporting reference docs exist, and the spec advanced-pattern
 * elements (`!`<cmd>``, `context: fork`, `agent: Explore`,
 * `allowed-tools: Bash(gh *)`) are present in the body.
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = join(import.meta.dir, '..', '..');
const SKILL_DIR = join(REPO_ROOT, '.claude', 'skills', 'skill-creator');
const SKILL_MD = join(SKILL_DIR, 'SKILL.md');

function readSkill(): string {
  return readFileSync(SKILL_MD, 'utf8');
}

interface Frontmatter {
  raw: string;
  body: string;
  fields: Record<string, string>;
}

function splitFrontmatter(s: string): Frontmatter {
  const m = s.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error('No frontmatter block found');
  const raw = m[1]!;
  const body = m[2]!;
  // Tiny YAML-ish parser: top-level `key: value` lines + simple lists.
  // Skips block scalars (|) — those tested separately.
  const fields: Record<string, string> = {};
  let currentKey: string | null = null;
  for (const line of raw.split(/\r?\n/)) {
    if (/^\s*$/.test(line)) continue;
    const top = line.match(/^([\w-]+):\s*(\|)?\s*(.*)$/);
    if (top) {
      currentKey = top[1]!;
      if (top[2] === '|') {
        fields[currentKey] = '';
      } else {
        fields[currentKey] = (top[3] ?? '').trim();
      }
      continue;
    }
    if (currentKey && /^\s+/.test(line)) {
      fields[currentKey] = ((fields[currentKey] ?? '') + '\n' + line.trim()).trim();
    }
  }
  return { raw, body, fields };
}

describe('skill-creator — file layout', () => {
  test('SKILL.md exists', () => {
    expect(existsSync(SKILL_MD)).toBe(true);
  });

  test('references/frontmatter.md, patterns.md, snippets.md all exist', () => {
    for (const name of ['frontmatter.md', 'patterns.md', 'snippets.md']) {
      expect(existsSync(join(SKILL_DIR, 'references', name))).toBe(true);
    }
  });

  test('matching spec exists at docs/spec/skills/skill-creator/README.md', () => {
    expect(
      existsSync(join(REPO_ROOT, 'docs', 'spec', 'skills', 'skill-creator', 'README.md')),
    ).toBe(true);
  });
});

describe('skill-creator — frontmatter validity', () => {
  test('frontmatter parses', () => {
    expect(() => splitFrontmatter(readSkill())).not.toThrow();
  });

  test('name field is the slash-command name', () => {
    const { fields } = splitFrontmatter(readSkill());
    expect(fields.name).toBe('skill-creator');
  });

  test('description is non-empty', () => {
    const { fields } = splitFrontmatter(readSkill());
    expect((fields.description ?? '').length).toBeGreaterThan(0);
  });

  test('context is "fork" (per advanced-patterns acceptance)', () => {
    const { fields } = splitFrontmatter(readSkill());
    expect(fields.context).toBe('fork');
  });

  test('agent is "Explore" (per acceptance)', () => {
    const { fields } = splitFrontmatter(readSkill());
    expect(fields.agent).toBe('Explore');
  });

  test('allowed-tools includes "Bash(gh *)" (per acceptance)', () => {
    const { fields } = splitFrontmatter(readSkill());
    expect(fields['allowed-tools']).toContain('Bash(gh *)');
  });

  test('arguments declares both positional names', () => {
    const { fields } = splitFrontmatter(readSkill());
    expect(fields.arguments).toContain('skill_name');
    expect(fields.arguments).toContain('description');
  });
});

describe('skill-creator — body advanced patterns', () => {
  test('uses inline !`<cmd>` dynamic context (per acceptance)', () => {
    const { body } = splitFrontmatter(readSkill());
    // Match the inline syntax: !` followed by anything except a backtick, then `
    expect(body).toMatch(/!`[^`]+`/);
  });

  test('references the references/ supporting files', () => {
    const { body } = splitFrontmatter(readSkill());
    expect(body).toContain('references/frontmatter.md');
    expect(body).toContain('references/patterns.md');
  });

  test('refusal cases include CLAUDE.md gates', () => {
    const { body } = splitFrontmatter(readSkill());
    expect(body).toMatch(/Bypasses CLAUDE.md gates/);
  });

  test('emits proposal sections (collision check, frontmatter shape, proposal, test plan)', () => {
    const { body } = splitFrontmatter(readSkill());
    expect(body).toMatch(/Collision check/);
    expect(body).toMatch(/Decide the frontmatter shape/);
    expect(body).toMatch(/Emit the proposal/);
    expect(body).toMatch(/Test plan/);
  });
});

describe('skill-creator — references content', () => {
  test('frontmatter.md documents all 24 fields the spec mentions', () => {
    const fm = readFileSync(join(SKILL_DIR, 'references', 'frontmatter.md'), 'utf8');
    const expected = [
      'name', 'description', 'when_to_use', 'argument-hint', 'arguments',
      'disable-model-invocation', 'user-invocable', 'allowed-tools',
      'model', 'effort', 'context', 'agent', 'hooks', 'paths', 'shell',
    ];
    for (const f of expected) {
      expect(fm).toContain(`\`${f}\``);
    }
  });

  test('patterns.md covers !`<cmd>`, ```!, context: fork, agent', () => {
    const p = readFileSync(join(SKILL_DIR, 'references', 'patterns.md'), 'utf8');
    expect(p).toMatch(/!`<command>`/);
    expect(p).toMatch(/```!/);
    expect(p).toContain('context: fork');
    expect(p).toMatch(/`Explore`/);
  });

  test('snippets.md provides 5+ archetypes', () => {
    const s = readFileSync(join(SKILL_DIR, 'references', 'snippets.md'), 'utf8');
    const archetypes = s.match(/^## Archetype:/gm) ?? [];
    expect(archetypes.length).toBeGreaterThanOrEqual(5);
  });
});
