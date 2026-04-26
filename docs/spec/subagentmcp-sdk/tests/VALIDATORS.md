# `tests/subagentmcp-sdk/` — validators for every file the SDK creates

Per the user's instruction: *"tests/subagentmcp-sdk/ for validators of any files created."*

## Layout

```
tests/subagentmcp-sdk/
├── creators/
│   ├── subagent-creator.test.ts      ← validates agents/<name>.md emissions
│   ├── skill-creator.test.ts         ← validates skills/<name>/SKILL.md
│   ├── hook-creator.test.ts          ← validates settings.json hook entries
│   ├── lsp-server-creator.test.ts    ← validates .lsp.json blocks
│   └── mcp-server-creator.test.ts    ← validates .mcp.json blocks + scaffold .ts/.py
├── refs/
│   ├── sha-drift.test.ts             ← per-ref: re-fetch upstream, compare SHAs
│   └── schema-coverage.test.ts       ← every ref's schema matches every example in upstream code blocks
├── tools/
│   ├── bloom-cache.test.ts           ← false-positive rate within spec
│   ├── markdown-it.test.ts           ← deterministic HTML→MD conversion
│   ├── subagent-html.test.ts         ← end-to-end: fetch → readability → markdown → cap
│   ├── subagent-js.test.ts           ← AST extraction, schema validation
│   ├── subagent-xml.test.ts
│   └── subagent-md.test.ts
├── orchestrator/
│   ├── spawn-fleet.test.ts           ← N subagents complete; results aggregated correctly
│   ├── approval-gate.test.ts         ← human-in-loop gates trigger before destructive ops
│   ├── budget-watcher.test.ts        ← warn/compact triggers at correct thresholds
│   └── persist-session.test.ts       ← V2 resume pattern works across processes
├── fixtures/
│   ├── agents/                       ← known-good emissions for snapshot tests
│   ├── skills/
│   ├── hooks/
│   └── upstream-snapshots/           ← cached copies of upstream docs for offline testing
└── helpers/
    ├── memory-fs.ts                  ← in-memory fs for write-without-side-effects tests
    └── mock-llm.ts                   ← fake Claude Agent SDK for orchestrator tests
```

## Test runner

`bun test`. Each test file uses Bun's built-in test runner (no Jest/Vitest dep).

## Validation tiers

Every creator emission goes through three tiers of validation:

### Tier 1 — Schema validity

Generated frontmatter must parse against the creator's Zod schema:

```ts
// tests/subagentmcp-sdk/creators/subagent-creator.test.ts
import { test, expect } from 'bun:test';
import { SubagentCreator } from '../../../src/subagentmcp-sdk/creators/subagent-creator';
import { SubagentFrontmatterSchema } from '../../../src/subagentmcp-sdk/refs/sub-agents';
import { parseFrontmatter } from '../helpers/parse-frontmatter';

test('emits valid frontmatter for a security-reviewer', () => {
  const out = SubagentCreator.create({
    name: 'security-reviewer',
    description: 'Audit code for security regressions.',
    tools: ['Read', 'Grep', 'Glob'],
    model: 'sonnet',
    body: 'You are a security reviewer.',
  });
  const fm = parseFrontmatter(out.content);
  expect(SubagentFrontmatterSchema.safeParse(fm).success).toBe(true);
});
```

### Tier 2 — Cross-field constraints

Some constraints span fields (e.g., `tools: 'Agent'` is required if the body mentions
spawning subagents). These run as additional assertions per creator:

```ts
test('rejects subagent that uses Agent tool without naming it in tools', () => {
  expect(() => SubagentCreator.create({
    name: 'orchestrator',
    description: 'Spawns subagents',
    tools: ['Read', 'Bash'],   // missing Agent
    body: 'Spawn worker subagents to do X.',
  })).toThrow(/must include 'Agent'/);
});
```

### Tier 3 — Round-trip

Generate, parse, regenerate, expect bytewise-identical output. Catches non-deterministic
ordering / formatting drift in the renderer.

```ts
test('round-trip: create → parse → re-create produces identical output', () => {
  const input = { ...validInput };
  const out1 = SubagentCreator.create(input);
  const reparsed = parseSubagentFile(out1.content);
  const out2 = SubagentCreator.create(reparsed);
  expect(out2.content).toBe(out1.content);
});
```

### Tier 4 — Snapshot

Known-good fixture matching:

```ts
test('matches fixture: code-reviewer template', async () => {
  const out = SubagentCreator.create(codeReviewerTemplate());
  const fixture = await Bun.file('tests/subagentmcp-sdk/fixtures/agents/code-reviewer.md').text();
  expect(out.content).toBe(fixture);
});
```

Fixtures regenerate via `bun run scripts/regen-fixtures.ts` after intentional output
format changes.

## Drift tests (the unique-to-this-SDK ones)

For each ref, test:

1. **SHA-pin still valid** — re-fetch upstream, hash, compare to `pinnedSha256`. Fails if
   drifted (intentional — the failure prompts a deliberate update PR).
2. **Schema covers all upstream examples** — parse YAML code-blocks from upstream
   markdown, assert each validates against the schema. If Anthropic ships a new
   subagent example with a field we don't have, this test fails immediately.

```ts
// tests/subagentmcp-sdk/refs/schema-coverage.test.ts
import { test, expect } from 'bun:test';
import { SubAgentsRef, SubagentFrontmatterSchema } from '../../../src/subagentmcp-sdk/refs/sub-agents';
import { extractYamlExamples } from '../helpers/extract-examples';
import { subagentMd } from '../../../src/subagentmcp-sdk/tools/subagent-md';

test('every YAML example in sub-agents.md validates against SubagentFrontmatterSchema', async () => {
  const md = await subagentMd.read(SubAgentsRef.upstreamUrl);
  const examples = extractYamlExamples(md!.markdown);
  for (const ex of examples) {
    const result = SubagentFrontmatterSchema.safeParse(ex);
    if (!result.success) {
      console.error(`Example failed validation:`, ex);
      console.error(result.error.issues);
    }
    expect(result.success).toBe(true);
  }
});
```

## Bloom-cache test

The bloom filter has a tunable false-positive rate; we test it stays within spec:

```ts
test('bloom cache false-positive rate stays under 1%', () => {
  const cache = new BloomCache({ expectedItems: 10_000, fpRate: 0.01 });
  for (let i = 0; i < 10_000; i++) cache.add(`item-${i}`);
  let falsePositives = 0;
  for (let i = 10_000; i < 20_000; i++) {
    if (cache.has(`item-${i}`)) falsePositives++;
  }
  expect(falsePositives / 10_000).toBeLessThan(0.01);
});
```

## Orchestrator tests

Use the `helpers/mock-llm.ts` to avoid actual API calls:

```ts
test('spawnFleet returns N handles for N tasks', async () => {
  const tasks = Array.from({ length: 5 }, (_, i) => ({
    id: `t${i}`, agentName: 'tester', prompt: 'noop', maxTurns: 1,
  }));
  const handles = await spawnFleet(tasks, { llm: mockLlm });
  expect(handles).toHaveLength(5);
});

test('approvalGate blocks until human responds', async () => {
  const decision = approvalGate('OK to push?', undefined);
  // ...inject human response...
  expect(await decision).toBe(true);
});
```

## CI integration

```yaml
# .github/workflows/_reusable-kb-validate.yml (additions)
- name: SDK tests
  run: bun test tests/subagentmcp-sdk/

- name: SDK ref drift check
  run: bun test tests/subagentmcp-sdk/refs/sha-drift.test.ts
  continue-on-error: true   # don't block PR on drift; surface via comment
```

## Coverage targets

Honest targets:
- **Schemas**: 100% of every public Zod schema field exercised
- **Creators**: 100% of templates have a snapshot fixture
- **Tools**: 90% line coverage; 100% of error paths
- **Orchestrator**: smoke tests only (real LLM calls are integration tests, not in this dir)

## Related

- [`../README.md`](../README.md) — SDK overview
- [`../creators/subagent-creator.md`](../creators/subagent-creator.md) — what's being validated
- [`../refs/SHA-PINNING.md`](../refs/SHA-PINNING.md) — drift detection mechanism
