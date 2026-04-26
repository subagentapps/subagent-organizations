# 2-hour `/loop` task plan

Date: 2026-04-26 · Window: 17:10 PST → 19:10 PST (2 hours)
Cadence options: `/loop 5m` (24 tasks) | **`/loop 10m` (12 tasks)** | `/loop 15m` (8 tasks)
Recommended: **`/loop 10m`** — most tasks below need 5-8 min of work + a commit.

## How this works

`/loop <interval> <prompt>` reruns `<prompt>` every interval until you stop. Each iteration:
1. Loads the full session context (auto-memory + CLAUDE.md + this file)
2. Picks the **next unfinished task** from the queue below
3. Executes it (one PR-sized unit)
4. Updates `installs/loop-progress.md` with completion
5. Commits + pushes + opens a draft PR (or pushes to existing branch)

The key invariant: **each task is self-contained**. If iteration N fails, iteration N+1
re-attempts from a clean state. Tasks are ordered by dependency.

## The /loop prompt to use

```
/loop 10m Read installs/loop-plan.md, find the next unfinished task in the queue,
execute it as a single self-contained unit (one PR or one commit). Update
installs/loop-progress.md when done. If blocked, write the blocker to
loop-progress.md and skip to the next task. Never ask alex for permission unless
the task explicitly requires HITL approval.
```

## Task queue (12 tasks, 10-min cadence)

Priority order; mark complete in `installs/loop-progress.md`. Each task = one PR.

### Phase 1: KB cataloging (PRs 1-3)

#### Task 1 — `feat/kb-plugin-catalog`
**Goal**: Catalog `anthropics/claude-plugins-official` marketplace contents.
**Steps**:
1. New branch: `feat/kb-plugin-catalog`
2. Fetch `anthropics/claude-plugins-official` `.claude-plugin/marketplace.json` via GraphQL
3. Parse + write to `src/data/kb-plugins-official.json` (typed)
4. Add `KnowledgeBasePluginEntry` Zod schema in `src/spec/...`
5. Commit `feat(kb): catalog claude-plugins-official marketplace`
6. Push, open PR
**Time**: ~10 min. Token-efficient (GraphQL).

#### Task 2 — `feat/kb-mcp-registry`
**Goal**: Catalog `modelcontextprotocol/registry` server entries.
**Steps**:
1. Branch
2. GraphQL query for the registry's catalog file
3. Parse + write `src/data/kb-mcp-registry.json`
4. Add Zod schema for MCP server entries
5. Commit `feat(kb): catalog modelcontextprotocol/registry servers`
6. PR
**Time**: ~10 min.

#### Task 3 — `feat/kb-knowledge-work-plugins`
**Goal**: Catalog `anthropics/knowledge-work-plugins` (the Cowork-targeted plugins, 11.5k★).
**Steps**:
1. Branch
2. GraphQL: list plugins under that repo
3. For each, extract: name, description, MCP dependencies, intended KB target
4. Write to `src/data/kb-knowledge-work-plugins.json`
5. Commit `feat(kb): catalog knowledge-work-plugins for cowork`
6. PR
**Time**: ~12 min (more entries than tasks 1-2).

### Phase 2: Product survey (PRs 4-7)

#### Task 4 — `docs(research): notion developer docs survey`
**Goal**: Survey Notion's developer documentation, extract auth/primitives/auth model.
**Steps**:
1. Branch
2. `curl https://developers.notion.com/sitemap.xml | head` to find the surface
3. Pull the top-level developer doc page via `subagent-md`-equivalent (curl on .md if available, otherwise a single page)
4. Write `docs/research/kb-products/notion.md` with: capabilities table, auth model, primitives, MCP server status, Anthropic-equivalent crosswalk
5. Commit, PR

#### Task 5 — `docs(research): confluence developer docs survey`
Same shape, target `developer.atlassian.com/cloud/confluence`.

#### Task 6 — `docs(research): guru developer docs survey`
Same shape, target `developer.getguru.com`.

#### Task 7 — `docs(research): coda developer docs survey`
Same shape, target `coda.io/developers`. Note: Coda Packs is the closest analog to claude.com/plugins.

### Phase 3: Specs the loop should pick up

#### Task 8 — `docs(spec): managed-agents Mode 4 in lead-pattern.md`
**Goal**: Add the deferred "Mode 4: Managed Agents API" section to `docs/spec/subagentmcp-sdk/orchestrator/lead-pattern.md` per finding #3 in `anthropic-prompting-guidance.md`.
**Steps**:
1. Branch `docs/managed-agents-mode-4`
2. Edit the file with the new section
3. Distinguishes Claude Code teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) from API-side `agent_toolset_20260401`
4. Commit, PR

#### Task 9 — `chore(claude): tweak subagent descriptions to use-case-first`
**Goal**: Apply finding #4 from `anthropic-prompting-guidance.md` — tweak `repo-orchestrator.md` and `kb-keeper.md` descriptions to lead with "Use when..." instead of identity.
**Steps**:
1. Branch `chore/subagent-descriptions`
2. Edit both files
3. Verify they still parse (Zod check planned, manual visual for now)
4. Commit, PR

#### Task 10 — `feat(spec): seed kb-keeper term-index with glossary`
**Goal**: Apply finding #7 — seed the kb-keeper term index with the 8 glossary terms.
**Steps**:
1. Branch `feat/kb-glossary-seed`
2. Create `src/data/kb-term-index.json` with the 8 terms + verbatim definitions + source SHA
3. Commit, PR

### Phase 4: Tests + tooling (PRs 11-12)

#### Task 11 — `feat(test): bun test scaffolding for subagentmcp-sdk`
**Goal**: Set up `tests/subagentmcp-sdk/` with the directory layout from `tests/VALIDATORS.md`. No actual tests yet; just the scaffold + `bun test` config + `package.json` script.
**Steps**:
1. Branch `feat/test-scaffold`
2. mkdir tree per spec
3. Add `bun.lockb` if not present, package.json `scripts.test`
4. One placeholder test file that asserts true
5. Commit, PR

#### Task 12 — `chore(ci): add CODEOWNERS + Dependabot config`
**Goal**: Apply WAF deep-dive findings #1 and #4 from `anthropic-prompting-guidance.md`.
**Steps**:
1. Branch `chore/codeowners-dependabot`
2. Create `.github/CODEOWNERS` with `* @admin-jadecli @alex-jadecli`
3. Create `.github/dependabot.yml` for github-actions ecosystem
4. Commit, PR

## Tracking file

Each `/loop` iteration should update `installs/loop-progress.md`:

```markdown
# Loop progress

| # | Task | Branch | PR | Status | Notes |
|---|---|---|---|---|---|
| 1 | catalog claude-plugins-official | feat/kb-plugin-catalog | #5 | merged | clean run |
| 2 | catalog mcp/registry | feat/kb-mcp-registry | #6 | open | awaiting tests |
| 3 | … | … | … | pending | |
```

## Stop conditions (the loop should NOT continue if)

1. The current branch has uncommitted changes that aren't from this iteration
2. A task fails 3 iterations in a row
3. CI fails on a previous merged PR (something broke; fix first)
4. We hit 19:10 PST (the 2-hour boundary)
5. Alex types `/stop` or any non-loop message

## Cadence rationale

| Cadence | Tasks per 2h | Quality | Cost |
|---|---|---|---|
| `/loop 3m` | 40 | Many tasks too short to fit in 3 min — produces partial commits | Highest cost (40 sessions × startup) |
| **`/loop 10m`** | **12** | **Each task ~10 min — fits cleanly; 1 commit per iteration** | **Reasonable** |
| `/loop 15m` | 8 | Tasks can be slightly larger; queue runs out before 2h ends | Lower cost |

User said 3 min in chat; **strongly recommend 10 min** based on task sizing in this queue.

## How alex steers mid-flight

If alex wants to redirect during the loop:

1. **Replace the queue**: edit `installs/loop-plan.md` and re-prioritize. Next iteration
   reads the updated file.
2. **Pause**: type any message in the session that isn't loop-shaped. Loop pauses.
3. **Resume**: just run `/loop 10m <same prompt>` again.
4. **Force a single iteration**: re-run the prompt without `/loop` to get one execution.

## What this turns into

By 19:10 PST: 12 PRs open (or merged), main branch grew by ~3-5k lines of typed catalog
data, the polyrepo has its first machine-readable KB foundation, and the deferred items
from `anthropic-prompting-guidance.md` are mostly closed.

The next session can spend its full context on `src/` implementation against the now-
populated KB, instead of doing more spec writing.
