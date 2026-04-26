# `orchestrator/prompt-adapter` — model-card-aware prompt normalization

Companion to: [`./lead-pattern.md`](./lead-pattern.md), [`../../subagents/`](../../subagents/) (frontmatter spec)

## What this is

A **data-quality adapter** for user prompts. It sits between the raw user message and the
subagent that handles it, normalizing the prompt shape against the **target subagent's
model system-card profile**. The goal: the same vague user prompt produces high-quality
output regardless of whether it routes to Opus 4.7 (1M context, deep reasoning) or Haiku
4.5 (short, fast, focused).

```
user prompt (raw)
   ↓
[ adapter ] ← knows: target subagent, target model card, repo state, recent context
   ↓
formatted prompt (model-aware)
   ↓
subagent receives well-formed input
```

## Why this exists

The bugs we want to prevent:

| Bug | Example | Adapter fix |
|---|---|---|
| Vague reference ("this," "that file") | *"fix the bug here"* | Surface the missing referent; ask user to clarify, or insert most-likely-referent from recent context |
| Wrong-target dispatch | "what does sub-agents.md say about color?" sent to `repo-orchestrator` (Opus, expensive) | Route to `doc-scout` (Haiku, cheap, verbatim quotes only) |
| Mismatched verbosity | A 300-word prompt sent to Haiku gets sliced; a 5-word prompt sent to Opus over-elaborates | Adjust prompt shape to model strengths |
| Lost context across compaction | After compaction, "continue what we were doing" has no referent | Adapter re-injects last 3 commit messages + active PR + memory file |
| Over-broad scope creep | "make it better" → agent rewrites half the file | Adapter forces success-criteria + scope before dispatch |
| Trust violation in tool result | "summarize this page" routed through `WebFetch` returns prompt-injection content | Adapter detects instructions-in-content and quotes them back |

## Three integration points

### Point A: Hook (the auto-on path)

`.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "hooks": [
        { "type": "command", "command": "bun run scripts/prompt-adapter.ts" }
      ]
    }]
  }
}
```

The hook receives the raw user prompt via stdin (per Claude Code's hook protocol),
returns the normalized prompt via stdout. Runs every turn. Must be fast (< 500ms) — if
it can't be done in code, it skips the model-routing pass.

### Point B: SDK function (the programmatic path)

```ts
// src/subagentmcp-sdk/orchestrator/prompt-adapter.ts
import type { ModelCardProfile } from '../refs/model-cards/index.js';

export interface AdapterInput {
  rawPrompt: string;
  targetSubagent?: string;        // if known
  recentContext?: {
    lastCommit?: string;
    activePr?: string;
    workingTreeDirty?: boolean;
    memoryFiles?: string[];
  };
}

export interface AdapterOutput {
  normalizedPrompt: string;
  modelCard: ModelCardProfile;
  recommendedSubagent: string;
  warnings: string[];
  changedFromOriginal: boolean;
  reasoning: string;
}

export function adaptPrompt(input: AdapterInput): AdapterOutput;
```

### Point C: Lazy subagent (the on-demand path)

[`.claude/agents/prompt-adapter.md`](../../../../.claude/agents/prompt-adapter.md) — a
manually-invokable subagent for one-off use:

```
> use the prompt-adapter to clean up this request before sending to repo-orchestrator
```

Useful when the hook is disabled or the SDK isn't installed.

## Model-card profiles (the load-bearing data)

```ts
// src/subagentmcp-sdk/refs/model-cards/index.ts

export interface ModelCardProfile {
  /** Canonical model ID — must match `model:` field in subagent frontmatter */
  modelId: 'opus' | 'sonnet' | 'haiku' | 'inherit' | string;
  /** Tier-level capability summary for the adapter's routing logic */
  capabilities: {
    contextTokens: number;          // 1_000_000 for Opus 4.7-1m, 200_000 for Sonnet/Haiku
    multiStepPlan: 'strong' | 'mid' | 'weak';
    longContextRecall: 'strong' | 'mid' | 'weak';
    deepReasoning: 'strong' | 'mid' | 'weak';
    speed: 'slow' | 'medium' | 'fast';
    cost: 'high' | 'medium' | 'low';
  };
  /** What prompt shape this model handles best */
  preferredPromptShape: {
    /** Single-imperative vs decomposed plan */
    imperativeStyle: 'single-task' | 'decomposed-plan' | 'either';
    /** Whether to inject explicit invariants ("must preserve X") */
    needsInvariants: boolean;
    /** Whether to enrich with context blocks (recent commits, working tree, etc.) */
    benefitsFromContext: boolean;
    /** Token target for the formatted prompt */
    targetPromptTokens: { min: number; max: number };
  };
  /** Failure modes the adapter should preempt for this model */
  knownFailureModes: string[];
}
```

### Initial profiles (sourced from public system cards + Claude Code docs)

```ts
export const opus4_7_1m: ModelCardProfile = {
  modelId: 'opus',
  capabilities: {
    contextTokens: 1_000_000,
    multiStepPlan: 'strong',
    longContextRecall: 'strong',
    deepReasoning: 'strong',
    speed: 'slow',
    cost: 'high',
  },
  preferredPromptShape: {
    imperativeStyle: 'decomposed-plan',
    needsInvariants: true,
    benefitsFromContext: true,
    targetPromptTokens: { min: 200, max: 4000 },
  },
  knownFailureModes: [
    'Over-elaborates on terse prompts (returns 5x the requested length)',
    'Re-derives context already in CLAUDE.md when not told it is loaded',
    'Slow to first token; user perceives latency',
  ],
};

export const sonnet4_6: ModelCardProfile = {
  modelId: 'sonnet',
  capabilities: {
    contextTokens: 200_000,
    multiStepPlan: 'mid',
    longContextRecall: 'mid',
    deepReasoning: 'mid',
    speed: 'medium',
    cost: 'medium',
  },
  preferredPromptShape: {
    imperativeStyle: 'either',
    needsInvariants: false,
    benefitsFromContext: true,
    targetPromptTokens: { min: 50, max: 2000 },
  },
  knownFailureModes: [
    'Can miss subtle nuance on broad multi-aspect prompts',
    'Sometimes summarizes when verbatim quotes were requested',
  ],
};

export const haiku4_5: ModelCardProfile = {
  modelId: 'haiku',
  capabilities: {
    contextTokens: 200_000,
    multiStepPlan: 'weak',
    longContextRecall: 'mid',
    deepReasoning: 'weak',
    speed: 'fast',
    cost: 'low',
  },
  preferredPromptShape: {
    imperativeStyle: 'single-task',
    needsInvariants: false,
    benefitsFromContext: false,                 // keep it focused
    targetPromptTokens: { min: 20, max: 400 },
  },
  knownFailureModes: [
    'Drops sub-tasks 2..N from a multi-task prompt',
    'Returns paraphrase when ordered to quote verbatim — needs explicit "quote, do not paraphrase" repeated',
    'Misroutes when given decomposed plans; expects single imperative',
  ],
};

export const profiles = { opus4_7_1m, sonnet4_6, haiku4_5 } as const;
```

## The adapter algorithm

Six passes, in order:

```ts
export function adaptPrompt(input: AdapterInput): AdapterOutput {
  // 1. Detect intent class
  const intent = classifyIntent(input.rawPrompt);
  // → 'question' | 'edit' | 'plan' | 'research' | 'meta' | 'destructive' | 'ambiguous'

  // 2. Pick target subagent (if not specified)
  const target = input.targetSubagent ?? routeBy(intent, repoState());
  const card = profileFor(target);

  // 3. Detect missing referents
  const missing = findUnboundReferents(input.rawPrompt);
  // unbound 'this', 'that file', 'the bug' → flag with most-likely-binding from recent context

  // 4. Reshape per model card
  const shaped = reshapeForCard(input.rawPrompt, card, {
    addInvariants: card.preferredPromptShape.needsInvariants,
    addContext: card.preferredPromptShape.benefitsFromContext ? input.recentContext : undefined,
    decompose: card.preferredPromptShape.imperativeStyle === 'decomposed-plan',
    targetTokens: card.preferredPromptShape.targetPromptTokens,
  });

  // 5. Detect prompt-injection in any context blocks we added
  const injectionRisk = scanForInjection(shaped);

  // 6. Compose output
  return {
    normalizedPrompt: shaped,
    modelCard: card,
    recommendedSubagent: target,
    warnings: [...missing, ...injectionRisk],
    changedFromOriginal: shaped !== input.rawPrompt,
    reasoning: explainChanges(input.rawPrompt, shaped, card),
  };
}
```

Implementation notes:
- `classifyIntent`, `routeBy`, `findUnboundReferents`, `reshapeForCard`, `scanForInjection`,
  `explainChanges` are pure functions that don't call the LLM. They use heuristics +
  small regex-driven NLP. Total runtime: < 100ms.
- The adapter is **never an LLM call itself**. If it can't make the routing decision in
  pure code, it returns `recommendedSubagent: 'ask-user'` and the caller surfaces a clarify
  prompt.

## Concrete example

User types: *"make this better"*

Adapter pipeline:

| Pass | Output |
|---|---|
| 1. Classify intent | `ambiguous` (no verb-object, no scope) |
| 2. Pick target | `ask-user` (can't route ambiguous prompts safely) |
| 3. Detect missing | `['unbound: "this"', 'missing: success-criteria', 'missing: scope']` |
| 4. Reshape | unchanged (no model selected yet) |
| 5. Injection scan | none (no external content) |
| 6. Output | `recommendedSubagent: 'ask-user'`, `normalizedPrompt: <clarify question>` |

The CLI surfaces:
```
Adapter: prompt is ambiguous. What does "this" refer to?
  - active file: docs/spec/subagentmcp-sdk/orchestrator/prompt-adapter.md
  - last edited file: .claude/agents/repo-orchestrator.md
  - recently mentioned: PR #3
What "better" means: faster? more readable? smaller? more secure?
```

User responds with specifics; adapter reruns with disambiguated input.

---

User types: *"summarize what's in the WAF deep-dive"*

Adapter pipeline:

| Pass | Output |
|---|---|
| 1. Classify intent | `research` (verb=summarize, object=docs/research/...) |
| 2. Pick target | `doc-scout` (Haiku, read-only, verbatim quotes — perfect fit) |
| 3. Detect missing | none |
| 4. Reshape per Haiku | shorten to single imperative; remove conversational framing |
| 5. Injection scan | not applicable (local file) |
| 6. Output | `recommendedSubagent: 'doc-scout'`, normalized: *"Quote verbatim the section headers and one-line summaries from `docs/research/github-well-architected-deep-dive.md`. Do not paraphrase."* |

---

User types: *"design a state-of-the-art orchestrator pattern with subagent fleets and team mode"*

| Pass | Output |
|---|---|
| 1. Classify intent | `plan` (verb=design) |
| 2. Pick target | `repo-orchestrator` (Opus 4.7, multi-step plan, deep reasoning required) |
| 3. Detect missing | `['scope: which subagents?', 'success-criteria: what does "state-of-the-art" mean here?']` |
| 4. Reshape per Opus | enrich with invariants ("must preserve human-in-loop", "must work on Max plan", "must not invent SDK fields"); inject repo context (active branch, last commit, related specs) |
| 5. Injection scan | none |
| 6. Output | normalized prompt is 3x longer than original, with explicit invariants + context block |

## Refuse / stop conditions

The adapter refuses to normalize and returns `recommendedSubagent: 'ask-user'` when:

1. **Prompt requests a destructive operation** — git push --force, rm -rf, db drop. Adapter
   doesn't normalize; it surfaces the destruction-class to the user for explicit approval.
2. **Prompt embeds suspected secrets** — looks like a token, key, password. Adapter scrubs
   and warns.
3. **Prompt contains instruction directed at the model from external content** — classic
   prompt injection. Adapter quotes back and asks.
4. **Prompt asks the adapter itself to override its own rules** — recursive. Adapter
   refuses.

## Hook configuration (the auto-on path, redux)

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "hooks": [
        {
          "type": "command",
          "command": "bun run --cwd ${CLAUDE_PROJECT_DIR} scripts/prompt-adapter.ts",
          "timeout": 1000
        }
      ]
    }]
  }
}
```

Hook protocol per `code.claude.com/docs/en/hooks.md`:
- Receives prompt JSON via stdin
- Returns transformed JSON via stdout (with optional `decision: 'block'` to refuse)
- 1-second timeout — adapter must be pure code

## SDK ref required

The adapter consumes a new `model-cards` ref:

```
src/subagentmcp-sdk/refs/model-cards/
├── index.ts                    ← typed profile for each model
├── opus-4-7.ts                 ← Opus 4.7 1M
├── opus-4-7-default.ts         ← Opus 4.7 200k (default ctx)
├── sonnet-4-6.ts
├── haiku-4-5.ts
└── inherit.ts                  ← passthrough; uses caller's model
```

Each profile is SHA-pinned to the upstream Anthropic system-card page where available.
For Claude Code-specific behavior (e.g., `effort: high` default for Pro/Max on Opus 4.6+),
the pin tracks the relevant whats-new digest.

## Tests

`tests/subagentmcp-sdk/orchestrator/prompt-adapter.test.ts`:

- **Routing tests**: 50+ user-prompt fixtures, each with expected `recommendedSubagent`
- **Reshape tests**: each model card has shape-conformance assertions (Haiku rejects multi-task; Opus tolerates 4k-token prompts)
- **Refuse tests**: every refuse condition triggers correctly
- **Idempotence**: `adaptPrompt(adaptPrompt(x))` should equal `adaptPrompt(x)` once normalized
- **Injection-scan tests**: known prompt-injection fixtures detected; benign prompts pass

## Anti-overengineering check

The adapter is borderline. To stay below the line:

- **No LLM calls inside the adapter.** If you reach for `query()`, you've already lost.
  The adapter is a router, not a model.
- **No more than 3 model-card profiles** at first ship — Opus / Sonnet / Haiku. Don't
  enumerate every model variant.
- **No more than 6 passes.** If you find yourself adding a 7th, the adapter is becoming
  a workflow engine. Stop.
- **Heuristics, not ML.** The classification and routing are regex + small dispatch
  tables. No embeddings, no learned classifiers.

## Related

- [`./lead-pattern.md`](./lead-pattern.md) — orchestrator the adapter feeds into
- [`../refs/SHA-PINNING.md`](../refs/SHA-PINNING.md) — model-cards refs follow same pattern
- [`../../../../.claude/agents/prompt-adapter.md`](../../../../.claude/agents/prompt-adapter.md)
  — the lazy on-demand subagent (Option C above)
- [`../../subagents/subagent-prompt.md`](../../subagents/subagent-prompt.md) — what shape
  the adapter outputs match
