# `orchestrator/lead-pattern.md` — Claude as lead, human in loop

Sources:
- `code.claude.com/docs/en/sub-agents.md` (delegation primitives)
- `code.claude.com/docs/en/agent-teams.md` (experimental teams mode — `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)
- `code.claude.com/docs/en/agent-sdk/typescript-v2-preview.md` (V2 sessions for cross-process continuity)
- This session's actual experience as ground truth

## The role

I (Claude Code in the user's terminal) am the **lead orchestrator**. The user (alex) is
**human-in-loop**, not subordinate. I drive when:

- Tasks are decomposable into typed sub-tasks
- Work would benefit from parallel exploration
- Cross-cutting research is needed before committing to an approach

The user drives when:
- Approving spending (premium runs, ultrareview, parallel fleet >3)
- Authorizing destructive operations (`git push --force`, `rm -rf`, db drops)
- Choosing between equally-defensible approaches I've surfaced
- Calling timeouts ("compact now," "stop the fleet")

I **never** do these things autonomously, regardless of how routine they look.

## Three orchestration modes

### Mode 1: Sequential (the default)

I do everything in one context window. Use when:
- Total work fits in one context comfortably
- Tasks are dependent (each step needs the prior step's output)
- Cost matters — single-session is cheapest

### Mode 2: Subagent fleet (parallel via `Agent` tool)

I spawn N subagents in parallel via the `Agent` tool. Each runs in its own context window;
their full reads stay there, only summaries return to me. Use when:
- N independent reads (e.g., "read these 11 WAF library pages") — exactly the case where
  this session burned context unnecessarily
- One subagent per file/topic, results synthesized at the end
- Cost is acceptable (each subagent has its own context budget)

```ts
// orchestrator/spawn-fleet.ts
import { spawnFleet } from '@subagentapps/subagent-organizations/subagentmcp-sdk/orchestrator';

const handles = await spawnFleet([
  { id: 'r1', agentName: 'researcher', prompt: 'Read WAF page 1...', maxTurns: 5 },
  { id: 'r2', agentName: 'researcher', prompt: 'Read WAF page 2...', maxTurns: 5 },
  // ...11 total
]);

const summaries = await Promise.all(handles.map(h => h.result));
// I synthesize the summaries; the 11 full pages never enter my context
```

**This is what I should have done** when reading the 11 WAF pages earlier in this session.
Instead I pulled them all sequentially into my own context.

### Mode 3: Agent team (experimental, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)

Long-lived team of teammates with shared task list + mailbox. Use when:
- Work involves coordination over time (not just fan-out fan-in)
- Teammates need to message each other (e.g., debate competing hypotheses)
- The lead orchestrates from a tab/sidebar UI

Key architectural facts (from `agent-teams.md`):

| Component | Role |
|---|---|
| Team lead | The main session — me |
| Teammates | Separate Claude Code instances, each in own context window |
| Task list | Shared list at `~/.claude/tasks/{team-name}/` |
| Mailbox | Messaging between agents |
| Team config | `~/.claude/teams/{team-name}/config.json` (auto-managed; never hand-edit) |

Worked examples from the docs (verbatim use-cases):
- **Parallel code review**: 3 reviewers, each with a different lens (security, perf, tests)
- **Competing hypotheses**: 5 investigators with adversarial prompts ("disprove each other's
  theories")

Spawn syntax:
```ts
await runTeam({
  members: [
    { name: 'sec-reviewer', role: 'security review', agentName: 'security-reviewer' },
    { name: 'perf-reviewer', role: 'performance', agentName: 'performance-expert' },
    { name: 'test-reviewer', role: 'test coverage', agentName: 'testing-expert' },
  ],
  taskList: ['Review PR #3 for findings'],
  displayMode: 'sidebar',
});
```

## Decision tree: which mode for which task

```
Is this task decomposable into ≥2 independent subtasks?
├── No  → Mode 1 (sequential)
└── Yes
    │
    Do subtasks need to communicate or run for >5 min?
    ├── No  → Mode 2 (fleet) — parallel fan-out
    └── Yes → Mode 3 (team)  — long-running coordination
```

For most things in the polyrepo workflow:
- Reading docs / scraping / research → **fleet** (Mode 2)
- Generating + validating creator outputs → **sequential** (Mode 1)
- Multi-aspect code review → **team** (Mode 3) — exact use case in `agent-teams.md`

## Human-in-loop gates

Implemented as `approvalGate(prompt, default_)` — pauses the orchestrator until the user
responds in the terminal. Uses Claude Code's built-in approval mechanism, not custom UI.

Always-required approvals (matches user's global CLAUDE.md):
- Any `git push` (especially `--force`)
- Any deletion (file, branch, rm -rf)
- Spending: ultrareview, parallel fleet >3 subagents, agent team
- Cross-org or cross-repo write operations
- Anything irreversible

The orchestrator runtime calls `approvalGate()` for these *automatically* — they're not
optional. Defining the gate-list in code (not in CLAUDE.md prose) means the lead can't
"forget" to ask.

## Token budget management

The orchestrator tracks per-agent token usage and surfaces a budget summary every N turns:

```ts
// orchestrator/budget.ts
export interface BudgetSnapshot {
  leadTokens: number;
  fleetTokens: Record<string, number>;
  totalTokens: number;
  budget: number;
  remainingPct: number;
}

/** Auto-spawn warning at 70% budget; auto-trigger /compact at 85%. */
export function watchBudget(opts: { warnAt: number; compactAt: number }): void;
```

Lessons from this session: I let context climb to 70% before noticing. The budget watcher
should pre-empt that — at 60% it warns, at 70% it routes new fetches through subagents
unconditionally, at 85% it triggers /compact with a directive ("preserve PR #3 state, drop
research scrapings").

## Cross-session persistence (V2 SDK preview)

For long-running workflows that span multiple terminal sessions, use V2's
`unstable_v2_resumeSession({ sessionId })`:

```ts
// orchestrator/persist.ts
import { unstable_v2_createSession, unstable_v2_resumeSession } from '@anthropic-ai/claude-agent-sdk';

/** Save a session ID to ~/.claude/orchestrator/active-sessions.json */
export function persistSession(sessionId: string, label: string): void;

/** Resume by label. Pulls sessionId from disk. */
export async function resumeSession(label: string): Promise<SDKSession>;
```

Pattern for our polyrepo: each `_reusable-kb-ingest.yml` workflow run records its session
ID. The next ingest resumes the same session. Two benefits:
1. The agent has prior context (knows what's already been ingested)
2. Reduces per-run startup cost

V2 is `unstable_*` so we don't ship it in production code yet. The `orchestrator/persist.ts`
file is a thin shim that we can swap to V1 if V2 changes shape.

## What this looks like in practice

A future session opens. I'd:

1. Read this memory file (`~/.claude/projects/.../memory/subagent-organizations-state.md`) — comes for free via auto memory
2. Decide what the task is from the user's prompt
3. Pick a mode using the decision tree
4. If Mode 2 or 3: surface the spawn plan to the user, wait for approval
5. Spawn, monitor, synthesize, hand back

No more "I read the LSP spec into context as 250k raw tokens" mistakes.

## Anti-patterns explicitly prohibited

Drawn from the WAF anti-patterns page + this session's actual mistakes:

| Anti-pattern | Replace with |
|---|---|
| `WebFetch(big-page-url)` and dump 250k tokens | `subagentHtml.read(url)` with byte budget |
| Re-fetching the same URL twice in different turns | Bloom-filter cache automatically dedups |
| Writing 36 markdown files in one commit without checkpointing | Auto-memory write at every N-files-or-30-min boundary |
| Spawning subagents without an approval gate when fleet > 3 | `approvalGate()` mandatory above the threshold |
| Mixing research + spec writing in one context | Subagent fleet for research; lead writes specs from the synthesized summaries |
| Trusting an Anthropic doc claim from memory ("I think TS LSP isn't in plugins") | Always re-verify via SHA-pinned ref, or spawn a researcher |

## Related

- [`../README.md`](../README.md) — SDK overview
- [`../tools/crawlee-content-layer.md`](../tools/crawlee-content-layer.md) — what the
  fleet's researchers actually use to read pages
- [`../creators/subagent-creator.md`](../creators/subagent-creator.md) — how to define
  the researcher subagents this orchestrator spawns
- [`../refs/SHA-PINNING.md`](../refs/SHA-PINNING.md) — why we track upstream doc drift
