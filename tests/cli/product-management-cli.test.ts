/**
 * Parity test skeleton for `subagentapps/knowledge-work-plugins-cli` /
 * `product-management-cli` against upstream `anthropics/knowledge-work-plugins/
 * product-management`.
 *
 * Pinned to Anthropic-published eval guidance:
 * https://platform.claude.com/docs/en/test-and-evaluate/develop-tests.md
 *
 * Eval design principles applied (verbatim from doc):
 *   1. Be task-specific (mirror real-world distribution)
 *   2. Automate when possible (string match, code-graded, LLM-graded)
 *   3. Volume over quality (more questions with lower-signal automated grading
 *      beats fewer hand-graded)
 *
 * Upstream skill set (8): competitive-brief, metrics-review,
 * product-brainstorming, roadmap-update, sprint-planning, stakeholder-update,
 * synthesize-research, write-spec.
 *
 * Connector reduction (per docs/research/cowork-plugin-connectors.md):
 *   - ~~project tracker → GitHub Projects (fixed)
 *   - ~~knowledge base  → repo Markdown + memory/ (fixed)
 *   - 7 other categories (design, product analytics, competitive intel,
 *     meeting transcription, user feedback, calendar, email) → out_of_scope
 *
 * This file is SHAPE-ONLY. All assertions are .todo until product-management-cli
 * Wave 0 ships skill content.
 */

import { describe, expect, test } from 'bun:test';

// ---------------------------------------------------------------------------
// Type contracts (mirror upstream SKILL.md frontmatter + body promises)
// ---------------------------------------------------------------------------

type PmSkillName =
  | 'competitive-brief'
  | 'metrics-review'
  | 'product-brainstorming'
  | 'roadmap-update'
  | 'sprint-planning'
  | 'stakeholder-update'
  | 'synthesize-research'
  | 'write-spec';

type PrdShape = {
  problemStatement: string;
  goals: string[];
  nonGoals: string[];
  userStories: string[];
  requirements: { must: string[]; should: string[]; nice: string[] };
  successMetrics: string[];
  openQuestions: string[];
};

type RoadmapFormat = 'now-next-later' | 'quarterly' | 'okr-aligned';

type StakeholderAudience = 'executive' | 'engineering' | 'customer';

type CompetitiveBriefShape = {
  competitor: string;
  featureMatrix: Array<{ feature: string; us: 'has' | 'partial' | 'gap'; them: 'has' | 'partial' | 'gap' }>;
  positioning: string;
  recommendation: 'differentiate' | 'parity' | 'ignore';
};

type ResearchSynthesisShape = {
  themes: Array<{ name: string; frequency: number; impact: 'high' | 'med' | 'low' }>;
  personas: string[];
  opportunityAreas: string[];
};

type SprintPlanShape = {
  sprintName: string;
  capacityPoints: number;
  committed: ReadonlyArray<{ id: string; points: number; priority: 'P0' | 'P1' | 'stretch' }>;
  carryover: ReadonlyArray<string>;
};

// ---------------------------------------------------------------------------
// Skill: write-spec
// ---------------------------------------------------------------------------

describe('product-management-cli :: /write-spec (parity with cowork write-spec)', () => {
  test.todo('produces a PrdShape with all 7 required sections');
  test.todo('asks for target users + constraints + success metrics before generating');
  test.todo('phases large asks into multiple specs (per upstream "breaking a big ask into a phased spec")');
  test.todo('output written to repo as markdown file, not stdout-only (terminal-first but persistent)');
  test.todo('edge case: vague problem statement triggers clarifying question, not silent generation');
});

// ---------------------------------------------------------------------------
// Skill: roadmap-update
// ---------------------------------------------------------------------------

describe('product-management-cli :: /roadmap-update (parity with cowork roadmap-update)', () => {
  test.todo('supports all 3 RoadmapFormat values: now-next-later, quarterly, okr-aligned');
  test.todo('reprioritization: when adding new initiative, surfaces what moves to make room');
  test.todo('dependency mapping: flags downstream items affected by a timeline shift');
  test.todo('persists roadmap to GitHub Projects (CLI substrate) — not local roadmap.html');
  test.todo('edge case: empty roadmap on first run prompts for format choice (no silent default)');
});

// ---------------------------------------------------------------------------
// Skill: stakeholder-update
// ---------------------------------------------------------------------------

describe('product-management-cli :: /stakeholder-update (parity with cowork stakeholder-update)', () => {
  test.todo('output varies by StakeholderAudience: executive (≤200 words), engineering (technical), customer (jargon-stripped)');
  test.todo('supports update types: weekly, monthly, launch, risk-escalation');
  test.todo('pulls context from GitHub Issues + Projects (CLI substrate); does NOT pull from email/Slack');
  test.todo('edge case: no recent activity returns "nothing material to report" instead of fabricating');
});

// ---------------------------------------------------------------------------
// Skill: synthesize-research
// ---------------------------------------------------------------------------

describe('product-management-cli :: /synthesize-research (parity with cowork synthesize-research)', () => {
  test.todo('output shape matches ResearchSynthesisShape: themes (with frequency+impact), personas, opportunityAreas');
  test.todo('themes ranked by frequency × impact, not raw count alone');
  test.todo('input source: file path or stdin pipe (terminal-first)');
  test.todo('CLI does NOT integrate with Dovetail/Otter.ai/Gong (out_of_scope per connector reduction)');
  test.todo('edge case: <3 data points returns "insufficient data" warning, not synthesized themes');
});

// ---------------------------------------------------------------------------
// Skill: competitive-brief
// ---------------------------------------------------------------------------

describe('product-management-cli :: /competitive-brief (parity with cowork competitive-brief)', () => {
  test.todo('output shape: CompetitiveBriefShape with featureMatrix + positioning + recommendation');
  test.todo('recommendation ∈ {differentiate, parity, ignore}');
  test.todo('CLI does NOT integrate with Similarweb/Crayon/Klue (out_of_scope per connector reduction)');
  test.todo('source data: user-provided URLs or text dumps; never auto-scrapes');
  test.todo('edge case: competitor name with no public info returns "research needed" prompt, not fabricated facts');
});

// ---------------------------------------------------------------------------
// Skill: metrics-review
// ---------------------------------------------------------------------------

describe('product-management-cli :: /metrics-review (parity with cowork metrics-review)', () => {
  test.todo('CLI does NOT integrate with Amplitude/Pendo/Mixpanel/Heap (out_of_scope per connector reduction)');
  test.todo('input: CSV file path, JSON pipe, or markdown table');
  test.todo('output: ASCII chart + trend annotations + recommended actions (terminal-first per CLAUDE.md)');
  test.todo('time-period argument: weekly | monthly | quarterly');
  test.todo('edge case: flat data returns "no significant trend" instead of forced narrative');
});

// ---------------------------------------------------------------------------
// Skill: product-brainstorming
// ---------------------------------------------------------------------------

describe('product-management-cli :: /brainstorm (parity with cowork product-brainstorming)', () => {
  test.todo('framework selection: How Might We | JTBD | First Principles | Opportunity Solution Tree');
  test.todo('mode: divergent ideation | assumption testing | strategy exploration');
  test.todo('challenges assumptions vs. accepting them silently (per upstream "challenges assumptions")');
  test.todo('multi-turn session: maintains context across sub-prompts within one CLI invocation');
  test.todo('edge case: user converges too early — skill flags "want to explore N more options first?"');
});

// ---------------------------------------------------------------------------
// Skill: sprint-planning
// ---------------------------------------------------------------------------

describe('product-management-cli :: /sprint-planning (parity with cowork sprint-planning)', () => {
  test.todo('output shape: SprintPlanShape with capacityPoints, committed, carryover');
  test.todo('priority enum: P0 | P1 | stretch (matches upstream "P0 vs. stretch")');
  test.todo('accounts for PTO and meetings when computing capacity');
  test.todo('handles carryover from previous sprint — pulls from GitHub Project last-sprint column');
  test.todo('edge case: capacity < commit total — returns ranked-cut list, not silent overflow');
});

// ---------------------------------------------------------------------------
// Cross-cutting: connector resolution (per cowork-plugin-connectors.md)
// ---------------------------------------------------------------------------

describe('product-management-cli :: connector resolution', () => {
  test.todo('~~project tracker → "github_projects" (fixed)');
  test.todo('~~knowledge base → "github_markdown" or "memory_dir"');
  test.todo('OUT_OF_SCOPE_CONNECTOR errors: design, product_analytics, competitive_intelligence, meeting_transcription, user_feedback, calendar, email');
  test.todo('connector mismatch surfaces actionable error: "skill X requires Y connector; CLI substrate is Z"');
});

// ---------------------------------------------------------------------------
// Frontmatter contracts (verbatim from upstream SKILL.md)
// ---------------------------------------------------------------------------

const UPSTREAM_SKILL_NAMES: ReadonlyArray<PmSkillName> = [
  'competitive-brief',
  'metrics-review',
  'product-brainstorming',
  'roadmap-update',
  'sprint-planning',
  'stakeholder-update',
  'synthesize-research',
  'write-spec',
];

test('skeleton: 8 PM skills enumerated (matches upstream skill folder count)', () => {
  expect(UPSTREAM_SKILL_NAMES).toHaveLength(8);
  // Sanity: the type union and the constant array stay in sync.
  const sample: PmSkillName = 'write-spec';
  expect(UPSTREAM_SKILL_NAMES).toContain(sample);
});

// Type-only export so workspace TS sees the contracts.
export type {
  PmSkillName,
  PrdShape,
  RoadmapFormat,
  StakeholderAudience,
  CompetitiveBriefShape,
  ResearchSynthesisShape,
  SprintPlanShape,
};
