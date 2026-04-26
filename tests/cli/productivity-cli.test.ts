/**
 * Parity test skeleton for `subagentapps/knowledge-work-plugins-cli` /
 * `productivity-cli` against upstream `anthropics/knowledge-work-plugins/
 * productivity`.
 *
 * Pinned to Anthropic-published eval guidance:
 * https://platform.claude.com/docs/en/test-and-evaluate/develop-tests.md
 *
 * Eval design (from upstream doc):
 *   1. Be task-specific (mirror real distribution)
 *   2. Automate when possible (string match, code-graded)
 *   3. Volume over quality (more tests > fewer hand-graded)
 *
 * This file is a SHAPE-ONLY skeleton. Every test is currently `.todo` —
 * implementations land in Wave 0+ once productivity-cli ships skill content.
 * Filling in tests requires the CLI binary to exist and be invokable.
 *
 * Upstream contract source: vendor/anthropic/knowledge-work-plugins/
 * productivity/skills/{start,update,task-management,memory-management}/SKILL.md
 *
 * Connector reduction (per docs/research/cowork-plugin-connectors.md):
 *   - ~~project tracker → GitHub Projects (fixed, not user-chosen)
 *   - ~~knowledge base  → repo Markdown + memory/ (fixed)
 *   - all other ~~* connectors → out_of_scope for the CLI
 */

import { describe, expect, test } from 'bun:test';

// ---------------------------------------------------------------------------
// Type contracts the CLI must honor for parity. These mirror what the upstream
// SKILL.md frontmatter promises. Implementations populate; tests assert.
// ---------------------------------------------------------------------------

type SkillFrontmatter = {
  name: string;
  description: string;
  'argument-hint'?: string;
  'user-invocable'?: boolean;
};

type StartResult = {
  /** Files the skill ensured exist on disk after running. */
  ensured: ReadonlyArray<'TASKS.md' | 'CLAUDE.md' | 'memory/' | 'dashboard.html'>;
  /** Whether dashboard was opened. CLI: always false (terminal-first, no HTML). */
  dashboardOpened: boolean;
  /** Memory bootstrap interview ran (true on fresh install). */
  bootstrapRan: boolean;
};

type UpdateMode = 'default' | 'comprehensive';

type UpdateResult = {
  mode: UpdateMode;
  /** Tasks synced from external sources (project tracker). */
  tasksSynced: number;
  /** Stale items triaged (status changed or commented). */
  staleTriaged: number;
  /** New memory entries proposed (not yet committed). */
  memoryProposals: number;
};

type TaskShape = {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'blocked' | 'done';
  /** Optional GitHub Issue cross-reference for CLI. */
  issueRef?: `${string}/${string}#${number}`;
};

// ---------------------------------------------------------------------------
// Skill: start  (upstream: productivity/skills/start/SKILL.md)
// ---------------------------------------------------------------------------

describe('productivity-cli :: /start (parity with cowork productivity/start)', () => {
  test.todo(
    'creates TASKS.md when missing — upstream contract: "If TASKS.md doesn\'t exist: Create it with the standard template"',
  );

  test.todo(
    'creates CLAUDE.md + memory/ when fresh install — upstream contract: "If CLAUDE.md and memory/ don\'t exist: This is a fresh setup"',
  );

  test.todo(
    'CLI does NOT open dashboard.html — divergence: terminal-first, no HTML output',
  );

  test.todo(
    'prompts for memory bootstrap interview on fresh install — upstream: "begin the memory bootstrap workflow"',
  );

  test.todo(
    'idempotent: re-running /start with all files present is a no-op (zero side effects)',
  );

  test.todo(
    'edge case: refuses to overwrite an existing non-template TASKS.md (per develop-tests.md eval principle 1: edge cases)',
  );
});

// ---------------------------------------------------------------------------
// Skill: update  (upstream: productivity/skills/update/SKILL.md)
// ---------------------------------------------------------------------------

describe('productivity-cli :: /update (parity with cowork productivity/update)', () => {
  test.todo(
    'default mode: pulls assignments from GitHub Projects (CLI substrate for ~~project tracker)',
  );

  test.todo(
    'default mode: triages stale tasks (>14 days no update) per upstream "triage stale or overdue tasks"',
  );

  test.todo(
    '--comprehensive: scans email/calendar/chat — CLI returns out_of_scope error (no email/calendar connectors)',
  );

  test.todo(
    'output shape: { mode, tasksSynced, staleTriaged, memoryProposals } matches UpdateResult type',
  );

  test.todo(
    'edge case: empty TASKS.md returns valid-but-zero result, not error',
  );
});

// ---------------------------------------------------------------------------
// Skill: task-management  (upstream: productivity/skills/task-management/SKILL.md)
// ---------------------------------------------------------------------------

describe('productivity-cli :: task-management (parity with cowork task-management)', () => {
  test.todo(
    'task add: appends to TASKS.md AND creates GitHub Issue (CLI dual-write per CLAUDE.md "GitHub Projects is the source of truth")',
  );

  test.todo(
    'task complete: marks done in TASKS.md AND closes GitHub Issue',
  );

  test.todo(
    'task list: returns TaskShape[] with id, title, status, optional issueRef',
  );

  test.todo(
    'TASKS.md schema: must remain markdown-checkbox compatible with upstream (- [ ] / - [x])',
  );

  test.todo(
    'edge case: GitHub API outage falls back to TASKS.md only with WARN log, not hard fail',
  );
});

// ---------------------------------------------------------------------------
// Skill: memory-management  (upstream: productivity/skills/memory-management/SKILL.md)
// ---------------------------------------------------------------------------

describe('productivity-cli :: memory-management (parity with cowork memory-management)', () => {
  test.todo(
    'two-tier architecture: CLAUDE.md (hot cache, ~30 entries) + memory/ (full knowledge base)',
  );

  test.todo(
    'shorthand decode: "ask todd to do PSR for oracle" expands to full names (per upstream Goal section)',
  );

  test.todo(
    'memory promotion: entry referenced 3+ times in CLAUDE.md → moves to memory/people.md',
  );

  test.todo(
    'CLI parity: same prompts and same output shape as upstream cowork productivity',
  );

  test.todo(
    'edge case: ambiguous shorthand returns disambiguation prompt, not silent guess',
  );
});

// ---------------------------------------------------------------------------
// Cross-cutting: connector resolution (per cowork-plugin-connectors.md)
// ---------------------------------------------------------------------------

describe('productivity-cli :: connector resolution', () => {
  test.todo(
    '~~project tracker resolves to "github_projects" (fixed, not user-choice)',
  );

  test.todo(
    '~~knowledge base resolves to "github_markdown" or "memory_dir"',
  );

  test.todo(
    'unsupported categories (~~office_suite, ~~email, ~~calendar) error with code "OUT_OF_SCOPE_CONNECTOR" not silent skip',
  );
});

// ---------------------------------------------------------------------------
// Wave 0 acceptance: this file compiles and `bun test` succeeds.
// All real assertions land Wave 1+.
// ---------------------------------------------------------------------------

test('skeleton: types compile and Bun test runner sees this file', () => {
  // Sanity check that imports resolve and Bun discovers the suite.
  const sample: TaskShape = {
    id: 't-001',
    title: 'verify CLI parity',
    status: 'open',
    issueRef: 'subagentapps/knowledge-work-plugins-cli#1',
  };
  expect(sample.status).toBe('open');
  expect(sample.issueRef).toMatch(/^[\w-]+\/[\w-]+#\d+$/);
});

// Type-only export so the file participates in workspace TS even when not run.
export type {
  SkillFrontmatter,
  StartResult,
  UpdateMode,
  UpdateResult,
  TaskShape,
};
