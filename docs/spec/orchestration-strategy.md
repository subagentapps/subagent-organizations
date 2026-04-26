# Orchestration strategy — what's working, what's next

Status: load-bearing as of 2026-04-25 PST
Owner: this repo's `repo-orchestrator` subagent
Companion to:
- [`./projects-schema.md`](./projects-schema.md) — GitHub Projects custom fields
- [`./cli-parity-contracts.md`](./cli-parity-contracts.md) — productivity-cli + product-management-cli skill contracts
- [`../research/anthropic-github-conventions.md`](../research/anthropic-github-conventions.md) — label taxonomy
- [`../../installs/prompts/ultra-orchestration.md`](../../installs/prompts/ultra-orchestration.md) — phase sequencer

## 1. What's actually been working

This document captures the strategy that produced the current state of this
repo (PR #3 merged, PR #4 active with 8 dogfood iterations + chained-prompt
decomposition). It's written as "what's load-bearing" rather than as a
forward plan, because forward plans live in
[`../../installs/prompts/`](../../installs/prompts/).

### 1.1 The five load-bearing rules

Every meaningful artifact in this repo traces back to one of these:

1. **Spec-first.** A `docs/spec/<topic>.md` file exists before any
   `src/<topic>.ts`. Out of 87 completed tasks, 0 violated this. The cost
   has been: 1-2 extra commits per feature. The benefit: every code change
   has a written contract its tests can assert against.
2. **Conventional Commits + auto-PR.** Every commit gets pushed to a PR
   immediately, treated as preapproved unless it hits a documented gate
   (force-push, vendor edits, release-please config, .gitmodules chmod,
   cross-org write, account creation). 9+ clean commits on PR #4 in 1
   evening with zero rework.
3. **Token-efficient tool precedence.** GraphQL > `npm view --json` > `curl`
   for `.txt`/`.md`/`.xml`/`.json` > `subagent-html` (planned) > `WebFetch`
   (last resort). Caught 30k-token blowups (Cowork blog pages) and fixed
   by routing through `curl` instead. CLAUDE.md #8.
4. **Staging convention** (CLAUDE.md #12). External inputs land in
   `staging/<YYYY-MM-DD>-<topic>/` with `PROVENANCE.md`, never read in
   full, promoted selectively. Avoided dumping a 1010-line glossary +
   4007-line scaffold into context.
5. **Auto-memory + compaction recovery.** Every meaningful state change
   updates `~/.claude/projects/-Users-alexzh-claude-projects/memory/`. PR
   #3 merge survived 2 compactions during its build. The /loop scaffold
   adds resume protocol (read MEMORY.md → loop-progress.md → git log →
   pick up).

### 1.2 The orchestration pattern

```
                        ┌──────────────────────┐
   user message ─────►  │ repo-orchestrator    │ (Opus 4.7 xhigh)
                        │ — lead identity      │
                        │ — convention-keeper  │
                        │ — gate-enforcer      │
                        └──────┬───────────────┘
                               │ delegates by capability
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
        ┌──────────────┐ ┌────────────┐ ┌─────────────────┐
        │ prompt-      │ │ kb-keeper  │ │ doc-scout       │
        │ adapter      │ │ Sonnet med │ │ Haiku low       │
        │ Haiku low    │ │ orange     │ │ blue (RO)       │
        │ yellow       │ │            │ │                 │
        └──────────────┘ └────────────┘ └─────────────────┘
                                          ▲
                                          │ verbatim quote requests
                                          (read-only)
```

Four subagents already shipped (`.claude/agents/`):

- `repo-orchestrator.md` — Opus 4.7, xhigh, lead identity. Always-on for
  the main session. Owns convention enforcement.
- `prompt-adapter.md` — Haiku, low. Pre-processes ambiguous user prompts
  through a 6-pass pipeline (Pass 0 = KB check; Passes 1-6 = model
  routing).
- `kb-keeper.md` — Sonnet, medium. Maintains `pinned-shas.json`,
  `term-index.json`, `kb-cache.sqlite` over a 12-source catalog with
  cadences from 6h to 168h.
- `doc-scout.md` — Haiku, low. Read-only verbatim quoter. No `Write` or
  `Edit` access. Used for citations.

`manifest-curator.md` is also defined (curates `packages.json` + the
planned `kb-manifest.json`).

### 1.3 What hasn't worked yet (and what we did about it)

| Problem | Root cause | Fix in place |
|---|---|---|
| WebFetch + WebSearch failed repeatedly with "long context beta not yet available" | Subscription tier didn't include the beta | CLAUDE.md #8 routes through `curl` + GraphQL instead. Hasn't failed since. |
| `bun test` recursed into vendor submodules and ran 715 noisy tests | Bun's default test discovery walks the whole tree | `bunfig.toml` `[test] root = "tests"` (fixed in iter 4) |
| Cron `8090e0a1` survived only as long as the session | `CronCreate` is session-scoped per `tools-reference.md` | Documented; future automation will use `/scheduled-tasks` cloud or Desktop, not in-session cron |
| PR #4 grew to 24 files / 11k+ lines | No mid-PR split discipline | Going forward: split into 3 topical PRs before /ultrareview |
| Read-only `read:project` scope blocks Projects v2 queries | gh token doesn't have it | Document the workaround: `gh auth refresh -h github.com -s read:project,project` (one-time, interactive). User must run it. |

## 2. The dogfood roadmap (the "what's next" slice)

The user's directive (2026-04-25 evening): *"You must learn product-management-cli
and productivity-cli and keep using the 5 minute cron jobs to orchestrate work
to complete the milestone driven project. once you pass this milestone, then
we want to implement the engineering-cli. only once you successfully get all
skills working on migrated then will alex-jadecli use a second autonomous
agent."*

That's three milestones in strict order. We don't skip ahead.

### Milestone M1 — productivity-cli works for personal task tracking

**Goal**: this repo's day-to-day tasks are managed via `productivity-cli`
skills (`/start`, `/update`, `task-management`, `memory-management`)
backed by GitHub Issues + Projects in `subagentapps/subagent-organizations`,
not by `TaskCreate`/`TaskUpdate` only.

**Exit criteria**:
1. `productivity-cli/` ships skill content (Wave 0 → Wave 1) — currently
   plugin manifest only, no skill bodies (per
   [`../research/knowledge-work-plugins-cli-survey.md`](../research/knowledge-work-plugins-cli-survey.md))
2. The 24 todo-tests in
   [`../../tests/cli/productivity-cli.test.ts`](../../tests/cli/productivity-cli.test.ts)
   move from `.todo` to passing implementations
3. A GitHub Project exists in `subagentapps` with the schema in
   [`./projects-schema.md`](./projects-schema.md), and at least 5 real
   tasks from this repo's backlog have lived in it through at least one
   complete state transition (Backlog → Ready → In progress → Done)
4. Memory bootstrap (CLAUDE.md + `memory/`) ran successfully and decoded
   at least one piece of project shorthand (e.g. "akw" → "subagent-organizations")

**Time estimate**: incremental over 1-2 weeks, one task per `/loop` 5-min
firing while the cron is active.

**Cron strategy during M1**: same `*/5 * * * *` cadence as the original
/loop run, but the tasks come from the GitHub Project, not from a
`loop-prompt.md` text plan. The cron prompt becomes:

> Read installs/prompts/dogfood-cycle.md. Pull the next ready issue from
> the productivity-cli GitHub Project (Status: Ready, sorted by Priority).
> Execute it as one self-contained PR. Update the Project item to In review.
> Token-efficient.

This dogfoods the productivity-cli's own task-management skill: we are
the user, the CLI is the substrate.

### Milestone M2 — product-management-cli coordinates the polyrepo

**Goal**: cross-repo coordination work (specs, roadmap updates,
stakeholder updates, sprint planning) flows through `product-management-cli`
skills against the polyrepo's GitHub Projects.

**Pre-requisites**: M1 complete. Plus `read:project,project` scope on the
gh token (user runs `gh auth refresh` once).

**Exit criteria**:
1. `product-management-cli/` ships skill content for the 8 skills surveyed
   (`write-spec`, `roadmap-update`, `stakeholder-update`,
   `synthesize-research`, `competitive-brief`, `metrics-review`,
   `product-brainstorming`, `sprint-planning`)
2. The 43 todo-tests in
   [`../../tests/cli/product-management-cli.test.ts`](../../tests/cli/product-management-cli.test.ts)
   are passing
3. At least one cross-repo coordination event ran end-to-end through the
   CLI: e.g. `/write-spec` produces a markdown spec that lands as an Issue
   in the right repo with the right labels per
   [`../research/anthropic-github-conventions.md`](../research/anthropic-github-conventions.md);
   `/sprint-planning` reads from the GitHub Project last-sprint column and
   produces a `SprintPlanShape`
4. The 12 contracts in [`./cli-parity-contracts.md`](./cli-parity-contracts.md)
   each have at least one passing test

**Cron strategy during M2**: cadence stays at 5 min while milestones are
active. Once M1 + M2 both pass, the cadence can stretch to 1h (chief-of-
staff style) since most work routes through the CLI rather than per-tick
Claude execution.

### Milestone M3 — engineering-cli builds the polyrepo infrastructure

**Goal**: `engineering-cli` (planned as the 6th plugin in the kwpc-cli
suite) handles cross-repo build/CI/test/release work autonomously.

**Pre-requisites**: M1 + M2 complete. Frontend dashboard from
[`../../staging/2026-04-25-akw-artifact-context/`](../../staging/2026-04-25-akw-artifact-context/)
deployed to `subagentorganizations.com` via Cloudflare Pages — this is
the gate the user explicitly named.

**Exit criteria** (drafted; confirmable when M2 is closer):
1. `engineering-cli/` ships skills for `/stack-check`, `/release-bump`,
   `/test-coverage`, `/dep-audit` (or similar — TBD per Wave 0 design)
2. The 5 vendored `subagentapps/*` repos
   (`subagent-xml`, `subagent-crawls`, `subagents-platform-execution`,
   `warehouse`, `anthropic-docs-scraper`) are integrated as either
   submodules under `vendor/subagentapps/` or as published packages
   referenced from `kb-manifest.json`
3. WAF deltas in those 5 repos are filed as GitHub Issues against each
   upstream (cross-org write — gated on user OK per CLAUDE.md)
4. The Anthropic engineering blog
   (https://www.anthropic.com/engineering) is being ingested on a
   scheduled cadence into `docs/research/anthropic-engineering-digest.md`

### Milestone M4 — second account joins (stretch, post-M3)

**Goal**: `alex@jadecli.com` runs a second autonomous agent in parallel
to `admin@jadecli.com`'s chief-of-staff. Total available usage:
40× /month across both Max plans, no paid overage.

**Pre-requisites**: M3 complete. Frontend dashboard live. Cost telemetry
running for 1-2 weeks showing burn well under 20× per account.

**Exit criteria** (deferred — design when we get there):
1. Account separation strategy chosen (by repo? by capability? by shift?)
2. Both agents respect a shared GitHub Projects view as their
   coordination substrate
3. Daily brief lands somewhere observable (file in this repo, GitHub
   Project status update, or Channels per
   https://code.claude.com/docs/en/channels.md)

## 3. The Tools Reference, mapped to our usage

Per https://code.claude.com/docs/en/tools-reference.md (verbatim, captured
2026-04-25). This table is the **load-bearing decoder** for which tool
maps to which posture in our work.

| Tool | Used as | Notes specific to this repo |
|---|---|---|
| `Agent` | Subagent dispatch, parallelizable reads | 4 subagents already in `.claude/agents/`. Use for any read >300 lines or for parallel surveys (e.g. 5 vendored repos at once). |
| `AskUserQuestion` | HITL gates per CLAUDE.md approval-gate table | Used today for the cost-ceiling + schedule-infra question |
| `Bash` | Default execution surface (per bcherny v2.1.117+) | Subsumes `Grep`/`Glob`. Use `rg` / `fd` / `bfs` / `ugrep` directly. |
| `CronCreate` / `Delete` / `List` | **Session-scoped** per tools-reference; not for production schedules | Used during the 2h /loop run; explicitly NOT the path forward. Production schedules route through `/scheduled-tasks` cloud or Desktop. |
| `Edit` / `Write` | File mutations | Always preceded by `Read`. Convention #5 keeps `vendor/anthropic/` read-only via chmod. |
| `EnterPlanMode` / `ExitPlanMode` | Plan-mode for non-trivial design work | Used when the user wants to inspect before commits. `/ultraplan` is the cloud variant. |
| `EnterWorktree` / `ExitWorktree` | Parallel session isolation | Not yet used; reserve for when `bun test` + a build run need to coexist with normal work |
| `Glob` / `Grep` | **Deprecated for new work** per CLAUDE.md #11 | Use `Bash` with `rg`/`fd` instead. Existing references stay. |
| `LSP` | Code intelligence — type errors, jump-to-def | Will activate once `src/` lands and we install marksman/taplo/yaml-language-server per `polyglot-lsp` plugin |
| `Monitor` | Background watcher (v2.1.98+) | Use for: tail CI, watch a long-running build, poll for PR status changes. **Replaces `while sleep` polling.** Not yet used in this repo. |
| `NotebookEdit` | Jupyter cells | Out of scope for this repo |
| `PowerShell` | Native PS on Windows | Not used (macOS-only) |
| `Read` | File reads (always before edits) | The `limit`/`offset` parameters are how we honor staging-convention rule 4 (selective reads) |
| `ListMcpResourcesTool` / `ReadMcpResourceTool` | MCP resource access | Used by `claude-in-chrome`, `context7`, `plugin_github_github`, etc. |
| `SendMessage` | Resume a stopped subagent | Available only with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Not yet enabled here. |
| `Skill` | Invoke a Skill | Used for `/loop`, `/schedule`, plugin-provided slash commands |
| `TaskCreate` / `Get` / `List` / `Update` / `Stop` | Session task list | Used heavily during /loop iterations. Going forward, M1's exit moves the source of truth from this in-session list to GitHub Issues + Projects. |
| `TeamCreate` / `TeamDelete` | Agent teams | Same gate as `SendMessage` (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). Not yet enabled. |
| `TodoWrite` | Non-interactive todo list (Agent SDK) | Reserved for headless CI flows when SDK ships |
| `ToolSearch` | Deferred-tool loader (this session has it on) | Used today to load `CronCreate`, `AskUserQuestion`, `CronList`, `CronDelete` on demand |
| `WebFetch` / `WebSearch` | **Last-resort** per CLAUDE.md #8 | Cheap-source kinds (md/txt/xml/json) MUST go through `curl` first. |
| `Write` | Same as Edit — preceded by Read for existing files | Gitignore + staging conventions apply |

## 4. GitHub Projects integration plan (the spine)

Per the GitHub docs ([about projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)):
Projects are the **adaptable table/board/roadmap** that integrates with
issues + PRs at user or org level. Keys we'll use:

- **Built-in workflows** — auto-set fields when items are added/changed
  (e.g. when an Issue gets a `wave-0` label, set `Wave` field to `Wave 0`)
- **Auto-add by criteria** — every new Issue with a `plugin:productivity-cli`
  label auto-joins the productivity-cli Project
- **Status updates** — `On track` / `At risk` (per the Wave 0
  product-management-cli screenshot showing "at risk")
- **Templates** — once Project A is set up cleanly, we set it as a
  template; Projects B-E inherit fields/views/workflows
- **GraphQL API + GitHub Actions** — per the GitHub docs, this is the
  programmatic surface; matches CLAUDE.md #8's GraphQL precedence

### Setup sequence (gated)

1. **User action** — `gh auth refresh -h github.com -s read:project,project`
   (one-time, interactive, on the user's machine; not something I can do)
2. **Read** — `gh api graphql -f query='{ organization(login: "subagentapps") { projectsV2 { nodes { number title closed } } } }'`
   to enumerate existing Projects
3. **Plan** — for each missing Project per the schema in
   [`./projects-schema.md`](./projects-schema.md), produce a creation plan
   (no execution yet)
4. **HITL checkpoint** — user OKs cross-org write to create the 5
   Projects + 18 labels + 3 milestones in the cli repo
5. **Execute** — `gh project create` × 5 + `gh label create` × 18 +
   `gh milestone create` × 3 (mostly idempotent; safe to re-run)
6. **Wire automations** — built-in workflows (auto-add, status sync) via
   the Projects UI initially, with a follow-up to encode them in
   `.github/workflows/` for source control

### Why this matters for M1

Step 5 is the gate on M1 starting in earnest. The 5-min cron during M1
pulls work items from these Projects, not from `loop-prompt.md`. The
`loop-prompt.md` artifact stays as the original kickstart; the steady-
state work source is the Projects.

## 5. Posture going forward

| Posture | Concrete commitment |
|---|---|
| Stay inside Max plan | No paid overage. Cost telemetry needed (TBD: `cc-stats` or similar). If overage hits, pause cron immediately. |
| One milestone at a time | M1 → M2 → M3 → M4. No skipping; no parallel start of M3 while M1 is half-done. |
| 5-min cron during M1 + M2 | Same cadence as the original /loop. Stretches to 1h chief-of-staff cadence only after M2 closes. |
| Strategy doc as load-bearing | This file is updated when the strategy changes, not when execution moves. Execution lives in `installs/loop-progress.md`. |
| Stretch goals stay stretch | The 4 standing personas (engineering / monetization / science / research subagents) are deferred to post-M3 unless the dogfood explicitly surfaces a need. |
| Frontend gates the second account | M3 → frontend live → cost telemetry → THEN alex@jadecli.com runs a second agent. Not before. |

## 6. Sources

- [`https://code.claude.com/docs/en/tools-reference.md`](https://code.claude.com/docs/en/tools-reference.md) (verbatim above)
- [`https://code.claude.com/docs/en/platforms.md`](https://code.claude.com/docs/en/platforms.md) — Dispatch / Remote Control / Channels / Slack / Scheduled tasks (5 surfaces)
- [`https://code.claude.com/docs/en/scheduled-tasks.md`](https://code.claude.com/docs/en/scheduled-tasks.md) — durable schedules (CLI / Desktop / cloud Routines)
- [`https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects`](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects)
- This repo's `.claude/CLAUDE.md` (12 conventions)
- Anthropic Max plan: https://support.claude.com/en/articles/11049741-what-is-the-max-plan
  (20× monthly usage; the budget envelope this whole strategy fits inside)
