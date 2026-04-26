# Lead-orchestrator pattern with human-in-loop

Companion to: [`../spec/subagentmcp-sdk/orchestrator/lead-pattern.md`](../spec/subagentmcp-sdk/orchestrator/lead-pattern.md)

This file is the **research** — the spec doc above is what we'll implement. Here I work
through what the right shape is from first principles + this session's actual experience.

## What we observed in this session

This session is a useful case study because it ran for a long time with substantial
sub-task decomposition. Things that went wrong:

| Mistake | Cost | Could have been avoided by |
|---|---|---|
| Pulled `lsp-3.17-specification.html` (915 KB) into context | ~250k raw tokens | Spawning a researcher subagent with a 200-word output cap |
| Read 11 WAF library pages sequentially into my own context | ~80k tokens | Same — fan out 11 subagents, synthesize summaries |
| Read Cowork blog post via `mcp__claude-in-chrome__get_page_text` and got 51 KB of slider JS | ~30k tokens | Routing through markdown-it / Readability before context |
| Re-pulled `sub-agents.md` twice in two different turns | ~10k tokens duplicated | Bloom-filter content-hash dedup |
| Wrote 36 markdown spec files in one commit | Mostly fine, but the diff itself entered context on review | Splitting commits + auto-summarizing via subagent |

Things that went well:
- Persisted everything to git regularly (PR #3, 11 commits) — recoverable from disk if context dies
- Used Chrome MCP correctly to verify blog facts I'd been stipulating
- Caught my own incorrect prior about TS LSP plugin existence — read the docs again

The pattern: **I succeed when I check facts in disk-persisted artifacts; I fail when I
treat my own context as the source of truth.**

## The right model

I am a *router*, not a worker. The worker context windows are subagents I spawn. My job:

1. **Decompose** the user's request into sub-tasks
2. **Decide mode**: sequential / fleet / team (decision tree in the spec doc)
3. **Spawn** + **monitor** + **synthesize**
4. **Gate** human approval on irreversible / costly operations
5. **Persist** intermediate state to disk every N steps

The shift from "I'll just read this myself" to "I'll spawn a researcher to read this" is
the single highest-ROI change available to me. Every long context I burn is a context the
user pays for.

## Why human-in-loop, not autonomous

The user's global CLAUDE.md says:

> *"For exploratory questions ('what could we do about X?', 'how should we approach this?',
> 'what do you think?'), respond in 2-3 sentences with a recommendation and the main
> tradeoff. Present it as something the user can redirect, not a decided plan. Don't
> implement until the user agrees."*

This is the user's preferred orchestration shape: I propose, they approve. The orchestrator
SDK encodes this with `approvalGate()` calls baked into the runtime — not relying on me
remembering to ask.

When *should* I act without approval? Per the global CLAUDE.md *"Executing actions with
care"* section:

- ✅ **Local, reversible**: editing files, running tests, reading files. Just do them.
- ⚠️ **Risky / shared / costly**: ask first.

The orchestrator runtime maps these onto types:
```ts
type Action =
  | { kind: 'local-reversible'; ... }      // auto-approved
  | { kind: 'shared-state'; ... }          // requires approvalGate
  | { kind: 'destructive'; ... }           // requires explicit-typed approval
  | { kind: 'spending'; ... };             // requires explicit-typed approval
```

## Why subagents > "be more careful"

Telling me "be more careful with context" is unreliable advice. Mid-session I forget; I
get lured by big interesting documents; I rationalize "but I might need it later." The
fix is structural: make the cheaper thing (spawn a researcher) the default.

The subagent pattern from `sub-agents.md`:

> *"Each subagent runs in its own context window with a custom system prompt, specific
> tool access, and independent permissions. ... Messages from within a subagent's context
> include a `parent_tool_use_id` field, letting you track which messages belong to which
> subagent execution."*

The key word: **independent context window**. The subagent's full read stays in *its*
window. My context only sees the subagent's structured return value.

Worked example for a future similar session:

```
User: "Read the WAF library pages and tell me what's relevant for our repo"

WRONG (what I did):
  for each page:
    fetch full markdown into my context
    extract relevant bits
    accumulate findings
  synthesize at end

RIGHT (what the orchestrator pattern prescribes):
  spawnFleet([
    { agentName: 'waf-researcher', prompt: 'Read page 1, return ≤200 words on relevance to a polyrepo meta-repo' },
    { agentName: 'waf-researcher', prompt: 'Read page 2, ...' },
    // ...11 total
  ])
  → 11 subagents in parallel, each reads in its own context, returns ≤200 words
  → I synthesize ~2200 words total instead of pulling 11 full pages (~80k tokens) into mine
```

Same answer, ~95% less context.

## Why agent teams, not just fleets

Fleet (Mode 2) is fan-out / fan-in: N parallel subagents, then merge. Teams (Mode 3) add
*coordination* — teammates can message each other.

The right use cases per `agent-teams.md`:

1. **Parallel code review** — 3 reviewers with different lenses (security/perf/tests).
   They could each work alone (fleet) but messaging lets the security reviewer flag a perf
   concern to the perf reviewer mid-flight.

2. **Competing hypotheses** — 5 investigators, each tasked with disproving the others'
   theories. The *debate structure* is the value-add; without messaging it's just 5
   parallel monologues.

3. **Long-running coordinated work** — anything where subtasks aren't fully knowable
   upfront. The team adapts as work proceeds.

For our polyrepo: agent teams fit the **multi-aspect code review** use case exactly. The
ultrareview command is essentially Anthropic's hosted version of this pattern.

## The cost-control tradeoff

Agent teams use significantly more tokens than a single session (per `agent-teams.md`):

> *"Each teammate has its own context window, and token usage scales with the number of
> active teammates. For research, review, and new feature work, the extra tokens are
> usually worthwhile. For routine tasks, a single session is more cost-effective."*

The orchestrator runtime should surface team cost estimates *before* spawning, not after.
A pre-spawn approval gate showing estimated tokens (and dollar cost on Max plan extra
usage) makes the tradeoff explicit.

## Persistence strategy

Three layers, in order of frequency / cost:

| Layer | When written | What survives | Cost |
|---|---|---|---|
| Memory file (`~/.claude/projects/.../memory/*.md`) | Every major checkpoint | Compaction; new sessions | Free |
| Git commit on the active PR | After each substantive deliverable | Forever | Free, just discipline |
| V2 session ID stored in `~/.claude/orchestrator/` | When session might continue tomorrow | Across processes via `unstable_v2_resumeSession` | Free; experimental |

The auto-memory pattern is the primary durability mechanism. Today I wrote my first one
(`subagent-organizations-state.md`) when context hit 70%. That should have been at 30%,
and at every major commit milestone.

## Non-goals

- **Replacing Claude Code's built-in subagent system.** We use `Agent`-tool delegation
  (Mode 2) and the experimental teams runtime (Mode 3). The SDK is a typed orchestration
  layer *on top*, not a parallel implementation.
- **Building a UI for orchestration.** Claude Code's terminal UI is the UI. The SDK is
  invoked from scripts and from inside Claude Code sessions.
- **Making me autonomous.** The whole point of the human-in-loop gates is that I don't
  silently spawn 10-teammate fleets and burn $50.

## Open questions

1. **How aggressive should the budget watcher be?** A 60% warn / 70% reroute / 85%
   compact set is conservative. The right values may be lower for cheap models, higher
   for Opus. Make configurable per-session.

2. **Should `approvalGate` time out?** The user might walk away from the terminal mid-flight.
   Default: no timeout, gate sits open forever. But for background fleets, a configurable
   "if no response in 10 min, abort" makes sense.

3. **Cross-session memory at the orchestrator level?** Auto-memory captures *project*
   state. Should the orchestrator also write *its own* state ("last fleet I spawned,
   what came back, what I synthesized")? Probably yes, but separate file to avoid mixing
   concerns.

## Key takeaway

The single most important thing for me to internalize from this session:

> **When you find yourself reaching for `WebFetch` on a long page, stop. Spawn a
> researcher subagent with a 200-word output cap instead.**

If I do nothing else from this spec, that one rule recovers most of the context I burn.
