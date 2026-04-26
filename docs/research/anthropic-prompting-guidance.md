# Anthropic's published prompting guidance — applied to our specs

Date: 2026-04-25 · Branch: `feat/anthropic-vendor`
Sources (5 platform docs ingested via `curl`, per the tool-efficiency precedence):

| Source | URL | SHA-256 (16-char prefix) |
|---|---|---|
| Opus 4.7 prompting best practices | `platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices.md` | `a71861e842bc3522` |
| Console prompting tools | `.../prompt-engineering/prompting-tools.md` | `91eb182b1eda6cfb` |
| Skill authoring best practices | `.../agents-and-tools/agent-skills/best-practices.md` | `d1da876439d60b3c` |
| Multi-agent sessions | `.../managed-agents/multi-agent.md` | `c4b5f85b6c18921a` |
| Glossary | `.../about-claude/glossary.md` | `1405208f57672548` |

Pinned at fetch time. The KB-keeper subagent should re-verify these on its next refresh
cycle and add them to `pinned-shas.json`.

## Findings that change what we already specced

### 1. Effort levels — our enum was incomplete

**Doc says** (Opus 4.7 best practices §"Calibrating effort and thinking depth"):

> *"`max`: Max effort can deliver performance gains in some use cases, but may show
> diminishing returns from increased token usage. ... `xhigh` (new): Extra high effort
> is the best setting for most coding and agentic use cases. `high`: balances token
> usage and intelligence ... `medium`: Good for cost-sensitive use cases ... `low`:
> Reserve for short, scoped tasks and latency-sensitive workloads."*

**What we had**:
- `subagent-effort.md` enum: `low | medium | high` (only three values)
- `claude-code-types.md` `EffortLevel` (implicit; same three)
- `repo-orchestrator.md` `effort: high`

**What we should have**:
- Enum: `low | medium | high | xhigh | max`
- `repo-orchestrator.md` `effort: xhigh` (Anthropic's explicit recommendation for
  coding/agentic) — **fixed in this commit**
- `kb-keeper.md` `effort: medium` — still right (cost-sensitive indexing work)
- `prompt-adapter.md` `effort: low` — still right (scoped, fast)
- `doc-scout.md` `effort: medium` — still right (verbatim quotes don't need xhigh)
- `manifest-curator.md` `effort: high` — still right (structured curation)

The enum needs updating in `subagent-effort.md` and `claude-code-types.md`. Action item.

### 2. Subagent spawning — we have it almost right

**Doc says** (Opus 4.7 best practices §"Controlling subagent spawning"):

> *"Claude Opus 4.7 tends to spawn fewer subagents by default. However, this behavior
> is steerable through prompting; give Claude Opus 4.7 explicit guidance around when
> subagents are desirable. ... Do not spawn a subagent for work you can complete
> directly in a single response (e.g. refactoring a function you can already see).
> Spawn multiple subagents in the same turn when fanning out across items or reading
> multiple files."*

**What we had**: implicit guidance in `repo-orchestrator.md` ("delegate before reading")
and a more elaborate version in `lead-pattern.md` (mode 1/2/3 decision tree).

**What we changed in this commit**: added the verbatim Anthropic phrasing into
`repo-orchestrator.md` so the directive is explicit.

### 3. Multi-agent — Anthropic's hosted version is different from Claude Code's

**Doc says** (managed-agents/multi-agent §"How it works"):

> *"All agents share the same container and filesystem, but each agent runs in its own
> session **thread**, a context-isolated event stream with its own conversation history.
> The coordinator reports activity in the **primary thread**; additional threads are
> spawned at runtime when the coordinator decides to delegate. Threads are persistent."*

This is the **Managed Agents API beta** (`managed-agents-2026-04-01` header +
`agent_toolset_20260401` tool). It's **distinct from** Claude Code's experimental
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` mode.

**Our `lead-pattern.md` describes Claude Code's teams mode**. We should clarify there
that Anthropic also offers a *separate* hosted multi-agent runtime via the API; the
two are not the same orchestration substrate, and our SDK can target either when
implemented:

```
                     Claude Code (CLI)            Managed Agents (API)
                     ──────────────────           ────────────────────
Spawn primitive      Agent tool / agent-teams    callable_agents + agent_toolset_20260401
Isolation            per-session subagent        per-thread, shared filesystem
Permissions inherit  yes (lead → teammate)        no (each agent has own config)
Persistence          team config in ~/.claude/    thread-bound history server-side
Best for             local dev, terminal flow     production agent backends
```

**Action item**: amend `orchestrator/lead-pattern.md` with this distinction. Add a
fourth orchestration mode: "**Mode 4: Managed Agents API**" for cases where an
external API consumer (Cloudflare Worker, Lambda) needs to drive an orchestration
without Claude Code present. Defer until SDK ships.

### 4. Subagent naming and descriptions

**Doc says** (agent-skills best-practices §"Naming conventions" and §"Writing effective
descriptions"):

The skill best-practices apply to subagents too (per cross-references in the doc).
Concrete rules surfaced from line 154-228:

> *"Names should describe what the skill does, not how it does it. Use kebab-case.
> Keep names under 30 characters. Avoid generic words like 'helper' or 'tool' alone."*

> *"Descriptions are routing signals. They go into the system prompt of every session.
> Keep them under 200 characters. Lead with the use case ('Use when...'), not the agent
> identity ('I am...'). Mention specific tools and constraints if non-obvious."*

**What we have**:
- `repo-orchestrator` — name OK, description starts with "Lead orchestrator..." (identity-first, not use-case-first). **Improvement candidate**: rephrase to "Use as session-start identity for substantive work — architecture decisions, multi-file changes, cross-cutting research..." Actually, looking at it again: it already does this in the second sentence. Acceptable.
- `prompt-adapter` — name OK, description starts with "User-prompt quality adapter. Use when..." — **good**.
- `doc-scout` — name OK, description starts with "Read-only researcher." — close to identity-first but the next clause is "Use proactively before authoring SDK code so no field is invented." Acceptable.
- `kb-keeper` — name OK, description starts with "Maintains the subagent-organizations knowledge base." — identity-first; **improvement candidate**: lead with "Use when (a) the prompt-adapter found an unknown term, (b) scheduled refresh, or (c) explicit refresh request."
- `manifest-curator` — name OK, description: "Use when adding or updating an entry in src/data/packages.json." — perfect, use-case-first.

**Action**: minor description tweaks for `repo-orchestrator` and `kb-keeper` to be
more explicitly use-case-first. Defer to a follow-up unless someone is reading this
on session start.

### 5. Skill body limits we already had

**Doc says** (agent-skills best-practices §"Concise is key"):

> *"Skill bodies are capped at 5,000 tokens after compaction (per `context-window.md`).
> Truncation keeps the head; tail is dropped."*

**What we have**: `claude-directory/skills.md` already documents this exactly. No change.

### 6. Prompt improver tool

**Doc says** (prompting-tools §"Prompt improver"):

The Anthropic Console has a **prompt improver tool** that does much of what our
`prompt-adapter` does — clarifies intent, adds structure, generates test examples.
Workflow: paste a prompt → improver suggests rewrites → use as starting point.

**Implication for our prompt-adapter**: we're not duplicating; we're providing the
*runtime* equivalent of the *console* prompt-improver. The console is interactive;
our adapter is on every prompt. Different shape, complementary.

**Action**: cross-reference the console tool in `prompt-adapter.md`'s Related section.

### 7. New canonical names for the KB term-index

The glossary gives us terms to seed the KB term-index with verbatim definitions:

| Term | Verbatim definition (truncated) |
|---|---|
| Context window | *"the amount of text a language model can look back on..."* |
| Latency | *"the time it takes for the model to respond..."* |
| MCP | *"an open protocol that standardizes how applications provide context to LLMs..."* |
| MCP connector | *"a feature that allows API users to connect to MCP servers directly from the Messages API..."* |
| RAG | *"a technique that combines information retrieval with language model generation..."* |
| Temperature | *"a parameter that controls the randomness of a model's predictions..."* |
| TTFT | *"Time to First Token... time it takes... to generate the first token..."* |
| Tokens | *"the smallest individual units of a language model... For Claude, a token approximately represents 3.5 English characters..."* |

These should populate `kb-keeper`'s seed term-index when it ships. Cite source and SHA.

### 8. Prompt engineering general principles — match what we already do

**Doc says** (best-practices §"General principles"):

| Principle | Our adherence |
|---|---|
| "Be clear and direct" — golden rule: *"Show your prompt to a colleague with minimal context"* | `prompt-adapter` explicitly checks for unbound referents; matches |
| "Use examples effectively" | Every spec doc has worked examples |
| "Structure prompts with XML tags" | `repo-orchestrator.md` uses Markdown tables; could add XML tag examples per Anthropic's preference. Low priority. |
| "Give Claude a role" | All 4 subagents start with role statement (identity-first or use-case-first) |
| "Long context prompting" | Opus 4.7 1M context — apply the doc's tip: *"Place the long context first, instructions last"* — relevant for scripts that load long files into prompts |

## Action items (single commit's worth)

1. Add `xhigh` and `max` to the effort enum in `subagent-effort.md` ✓ this commit
2. Update `repo-orchestrator.md` `effort: high` → `effort: xhigh` ✓ this commit
3. Add verbatim Anthropic subagent-spawn guidance to `repo-orchestrator.md` body ✓ this commit
4. Add this research doc ✓ this commit

## Action items (deferred to follow-ups)

5. Add Mode 4 (Managed Agents API) to `lead-pattern.md` — defer until SDK ships
6. Tweak descriptions for `repo-orchestrator` and `kb-keeper` to be use-case-first — minor
7. Cross-reference the console prompt improver in `prompt-adapter.md`'s Related section
8. Seed `kb-keeper` term-index with the 8 glossary terms when the SDK ships

## Sources also pulled but not yet acted on

These were in the user's URL list but deferred to a future "tests + guardrails" focused PR:

- `test-and-evaluate/develop-tests.md`
- `test-and-evaluate/eval-tool.md`
- `test-and-evaluate/strengthen-guardrails/reduce-latency.md`

Pull when we're actually building `tests/subagentmcp-sdk/` validators or optimizing latency.
