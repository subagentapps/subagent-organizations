# `creators/subagent-creator/` — the worked example

This is the concrete example you asked for: *"a `subagent-creator/` has a `refs/` with the
yaml format and all enums and SHA of `https://code.claude.com/docs/en/sub-agents.md`."*

## Layout

```
src/subagentmcp-sdk/creators/subagent-creator/
├── refs/
│   └── index.ts            # re-exports SubAgentsRef from ../../refs/sub-agents/
├── templates/
│   ├── code-reviewer.ts    # typed templates for common subagent shapes
│   ├── researcher.ts
│   ├── tdd-runner.ts
│   └── orchestrator.ts
├── render.ts               # turn validated input into agents/<name>.md content
├── write.ts                # render + write to disk; runs validators first
├── index.ts                # public surface
└── README.md               # how to use it
```

## Public API

```ts
// src/subagentmcp-sdk/creators/subagent-creator/index.ts
import { z } from 'zod';
import { SubAgentsRef, SubagentFrontmatterSchema } from '../../refs/sub-agents/index.js';
import type { Creator } from '../types.js';

export type SubagentInput = z.infer<typeof SubagentFrontmatterSchema> & {
  /** The system-prompt body (markdown after the frontmatter) */
  body: string;
};

export const SubagentCreator: Creator<SubagentInput, { path: string; content: string }> = {
  emits: 'subagent',
  ref: SubAgentsRef,
  create(input) {
    const validated = this.validate(input);
    if (!validated.ok) throw new ValidationError(validated.errors);
    return {
      path: `.claude/agents/${input.name}.md`,
      content: render(input),
    };
  },
  validate(input) {
    return validate(SubagentFrontmatterSchema.extend({ body: z.string() }), input);
  },
};

export { templates };
```

## Worked example: spawning a code-reviewer

```ts
import { SubagentCreator } from '@subagentapps/subagent-organizations/subagentmcp-sdk/creators/subagent-creator';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const { path, content } = SubagentCreator.create({
  name: 'security-reviewer',
  description: 'Audit code for security regressions. Use proactively before merging auth/permission changes.',
  tools: ['Read', 'Grep', 'Glob', 'Bash(git diff:*)'],
  model: 'sonnet',
  permissionMode: 'acceptEdits',
  maxTurns: 30,
  effort: 'high',
  color: 'red',  // 'destructive — uses Bash freely' per our convention
  body: `
You are a security reviewer.

When given a PR diff:
1. Identify auth/permission/input-validation changes
2. Check for regressions against the patterns in CLAUDE.md
3. Report findings grouped by severity (Critical / High / Medium / Low)
`,
});

mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, content);
```

The `create()` call:
1. Runs `SubagentFrontmatterSchema.parse(input)` — fails with a typed `ValidationError` if
   `tools:` has a typo, `color:` is invalid, etc.
2. Emits `.claude/agents/security-reviewer.md` with the YAML frontmatter on top and the
   body as the system prompt.

## Templates

`templates/` is a library of pre-validated shapes for the common subagents we want across
KB children:

```ts
// src/subagentmcp-sdk/creators/subagent-creator/templates/code-reviewer.ts
import type { SubagentInput } from '../index.js';

export const codeReviewerTemplate = (overrides?: Partial<SubagentInput>): SubagentInput => ({
  name: 'code-reviewer',
  description: 'Expert code reviewer. Use proactively after code changes.',
  tools: ['Read', 'Grep', 'Glob', 'Bash'],
  model: 'sonnet',
  permissionMode: 'acceptEdits',
  maxTurns: 25,
  color: 'green',
  body: defaultCodeReviewerBody,
  ...overrides,
});
```

A KB child can then:

```ts
import { codeReviewerTemplate } from '@subagentapps/subagent-organizations/subagentmcp-sdk/creators/subagent-creator/templates/code-reviewer';
import { SubagentCreator } from '@subagentapps/subagent-organizations/subagentmcp-sdk/creators/subagent-creator';

const { path, content } = SubagentCreator.create(
  codeReviewerTemplate({ name: 'kb-cowork-reviewer', maxTurns: 15 })
);
```

## Validation flow (when `create()` runs)

```
input
  ↓
SubagentFrontmatterSchema.safeParse()    ← Zod, from refs/sub-agents/
  ↓ ok=true
checkBodyTokenCap(body, 5000)            ← context-window.md compaction cap
  ↓ ok=true
checkToolsExist(input.tools)             ← every tool name is in BuiltinTool enum or matches /^Agent\(/ or /^mcp__/
  ↓ ok=true
checkColorConvention(input.color)        ← warn (not error) if color violates our role-convention
  ↓
{ path, content }
```

Any step failure → `ValidationError` with `path`, `line`, and a human-readable message.

## Tests

`tests/subagentmcp-sdk/creators/subagent-creator/` has:

- **Schema tests** — every required field rejected when missing; every optional field
  accepted when present; enum values exhaustively checked
- **Round-trip tests** — `create(input)` → parse the output → equal to original
- **Snapshot tests** — known-good fixtures under `tests/fixtures/agents/*.md`
- **Drift tests** — fetches `sub-agents.md`, parses YAML examples in code blocks, asserts
  every example validates against `SubagentFrontmatterSchema`. Catches schema lag.

## What this gives the orchestrator

When the lead orchestrator decides "spawn a security reviewer for this PR", it:

```ts
import { SubagentCreator } from '...creators/subagent-creator';
import { spawnFleet } from '...orchestrator';

const reviewer = SubagentCreator.create({...});
writeFileSync(reviewer.path, reviewer.content);

const [handle] = await spawnFleet([{
  id: 'sec-review-pr-3',
  agentName: 'security-reviewer',
  prompt: 'Review PR #3 for security regressions',
  maxTurns: 30,
}]);

for await (const event of handle.receive()) {
  // stream findings back to lead
}
```

Pre-validated config means the spawn cannot fail at runtime due to a malformed agent file
— a class of bug we currently have no defense against.

## Related

- [`../refs/SHA-PINNING.md`](../refs/SHA-PINNING.md) — how `SubAgentsRef` stays current
- [`../tests/VALIDATORS.md`](../tests/VALIDATORS.md) — what runs against generated files
- [`../orchestrator/lead-pattern.md`](../orchestrator/lead-pattern.md) — how creators feed
  the orchestrator
- [`../../subagents/`](../../subagents/) — per-key deeplink specs (the `refs/sub-agents/`
  schema mirrors these)
