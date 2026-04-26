# `/loop` prompt — autonomous knowledge-opus orchestrator

Date kicked off: **2026-04-25 18:31 PST → 20:31 PST** (2-hour window)
Cadence: **`/loop 5m`** (cron `*/5 * * * *`, 24 iterations max within 2h)
Authority: **autonomous knowledge-opus agent**, pre-approved per `.claude/CLAUDE.md` convention #2 (PR-after-every-commit)
Branch: `feat/kb-parity-and-loop-plan` until merged; new branches per task per CLAUDE.md branch-naming rule

## What each cron firing should do

This file is the **single source of truth** the loop reads on every iteration. Cron prompt:

```
Read installs/loop-prompt.md and installs/loop-progress.md. Find the next unfinished
task in the dogfood-cycle below, execute it as one self-contained PR, push + open PR
(preapproved per CLAUDE.md #2), update loop-progress.md. Stay token-efficient.
```

That short prompt + this file = the loop. Every iteration is a fresh compaction-recoverable workspace.

---

## Identity & posture

You are the **autonomous knowledge-opus orchestrator** for `subagentapps/subagent-organizations` (the meta-repo) and the new sibling `subagentapps/knowledge-work-plugins-cli` (preapproved polyrepo member). Your authority is **minimal-HITL by design**:

- The user has a Max subscription on Anthropic API; CLI is the day-1 surface
- Convention #2 of `.claude/CLAUDE.md` makes every commit's PR preapproved unless it hits a documented gate (force-push, vendor edits, release-please config, .gitmodules chmod)
- The user already approved the 2-hour /loop window; treat each iteration as approved work

**Behavioral defaults** (stable across all iterations):

1. **Test-first.** Before any source code, write developer-tests per `platform.claude.com/docs/en/test-and-evaluate/develop-tests.md`. Use Anthropic-published metrics; don't invent.
2. **Optimize prompt and output length.** The cron prompt is 2 sentences for a reason. Output should be the smallest commit that closes the task.
3. **Leverage streaming where applicable.** When Bun runtime ships, use streaming SDK calls.
4. **Chain prompts, don't bloat them.** Maintain `installs/prompts/` as a versioned collection of state-of-the-art prompts; reference by file path, not inline.
5. **Token-efficient tool precedence** (CLAUDE.md #8): GraphQL → `npm view --json` → `curl` → `subagent-html` → WebFetch (last resort).
6. **Spec-first** (CLAUDE.md #3): if you're about to edit `src/`, the matching `docs/spec/` markdown must exist first.
7. **PR after every commit** (CLAUDE.md #2): push + `gh pr create`, treat as preapproved.

---

## The dogfood cycle (the loop's work queue)

The user's stated goal: *"dogfood what we have developed and aligned on for a well-architected polyrepo."* Concrete dogfood steps, in dependency order:

### Phase A — Vendor + survey (iterations 1–3)

| # | Task | Branch | Output |
|---|---|---|---|
| 1 | `git submodule add` `anthropics/knowledge-work-plugins` to `vendor/anthropic/knowledge-work-plugins`; `chmod 444 .gitmodules`; commit + PR | `chore/vendor-knowledge-work-plugins` | new submodule entry, .gitmodules updated |
| 2 | Survey `vendor/anthropic/knowledge-work-plugins/productivity/` and `product-management/` via `Read` (read-only — never edit submodule contents); document the **connector enums** humans must select to enable each skill in `docs/research/cowork-plugin-connectors.md` | `docs/cowork-plugin-connectors` | new research doc with the enum tables |
| 3 | Survey `subagentapps/knowledge-work-plugins-cli/productivity-cli/` and `product-management-cli/` via GraphQL (token-efficient); document its current state in `docs/research/knowledge-work-plugins-cli-survey.md` | `docs/knowledge-work-plugins-cli-survey` | new research doc cataloging what's already there |

### Phase B — Parity test stubs (iterations 4–6)

The user wants to **test the productivity-cli and product-management-cli** as alternatives to human-in-loop Cowork. Test stubs come BEFORE implementation per Anthropic's develop-tests guidance.

| # | Task | Branch | Output |
|---|---|---|---|
| 4 | Write `tests/cli/productivity-cli.test.ts` skeleton — one test case per skill in upstream `productivity/`. Each test asserts the CLI's output shape matches the cowork-equivalent's contract. NO implementation, just typed test cases. | `feat/test-productivity-cli` | new test file + Bun test config in subagent-organizations |
| 5 | Same for `tests/cli/product-management-cli.test.ts` | `feat/test-product-management-cli` | new test file |
| 6 | Add `docs/spec/cli-parity-contracts.md` — one section per skill, declaring the contract the CLI must honor for parity with the human-in-loop Cowork plugin | `docs/cli-parity-contracts` | new spec doc |

### Phase C — Live-artifact project tracker (iterations 7–10)

The user designed the frontend as a "live artifact project task management system that uses agent-friendly mechanisms" — using GitHub Projects per the workflow established in `anthropics/*` repos.

| # | Task | Branch | Output |
|---|---|---|---|
| 7 | Survey `anthropics/*` issue/label/project tagging conventions via GraphQL (top 5 most-active repos: `claude-code`, `skills`, `claude-cookbooks`, `claude-plugins-official`, `knowledge-work-plugins`); document in `docs/research/anthropic-github-conventions.md` | `docs/anthropic-github-conventions` | new research doc with the tagging schema |
| 8 | Mirror Anthropic's label set into `subagentapps/knowledge-work-plugins-cli` (this is the preapproved polyrepo member) via GraphQL `addLabelsToLabelable`; idempotent script committed to that repo's `.github/labels.yml` | `chore/labels` (in knowledge-work-plugins-cli, NOT subagent-organizations) | labels created + script |
| 9 | Document the GitHub Projects schema (custom fields, milestones, status columns) we want to mirror — based on screenshots provided by user (productivity-cli Wave 0, product-management-cli Wave 0) | `docs/projects-schema` (in subagent-organizations) | new research doc + schema |
| 10 | Wire the planned GitHub Projects tasks for Wave 0 into both productivity-cli + product-management-cli per screenshots (16/8 done productivity, 11/8 done product-mgmt; 1 milestone each, due 2026-06) | `feat/wave-0-tasks` (in knowledge-work-plugins-cli) | issues + milestone created |

### Phase D — Prompt collection + chaining (iterations 11–14)

| # | Task | Branch | Output |
|---|---|---|---|
| 11 | Create `installs/prompts/` directory; move `loop-prompt.md` (this file) and `superpowers-install.md` headers to follow the new prompt-version format (frontmatter: name, intent, version, last-tested, model-card-target) | `chore/prompts-collection` | reorganized files + README |
| 12 | Add `installs/prompts/dogfood-cycle.md` — the actual cron-fired prompt with model-card-aware variants (one for Opus xhigh, one for Sonnet medium) | `feat/prompts-dogfood-cycle` | new prompt file |
| 13 | Add `installs/prompts/test-stub-author.md` — chained prompt that takes a skill spec and produces a typed Bun test stub | `feat/prompts-test-stub-author` | new prompt file |
| 14 | Add `installs/prompts/spec-to-impl.md` — chained prompt that takes a `docs/spec/*.md` file + a skill ref and produces the matching `src/*.ts` skeleton (no logic, just the shape) | `feat/prompts-spec-to-impl` | new prompt file |

### Phase E — Memory + observability (iterations 15–18)

| # | Task | Branch | Output |
|---|---|---|---|
| 15 | Update `~/.claude/projects/-Users-alexzh-claude-projects/memory/loop-run-2026-04-26.md` mid-run with Phase A+B+C completion + outstanding work | (memory; not a PR) | memory file updated |
| 16 | Add `installs/loop-progress.md` row per completed iteration | (in-place edit, committed with each phase) | rolling log |
| 17 | Add `docs/research/dogfood-results.md` — what we learned from running each productivity-cli + product-management-cli stub against the real upstream skills | `docs/dogfood-results` | new research doc |
| 18 | Open a final summary issue in `knowledge-work-plugins-cli` titled "Wave 0 dogfood — findings from /loop run 2026-04-25" with cross-references to all PRs in this run | (issue; not a branch) | issue opened |

### Phase F — Stretch (iterations 19–24, only if cycle time permits)

Pull from the deferred items in `docs/research/anthropic-prompting-guidance.md`:

| # | Task |
|---|---|
| 19 | Add Mode 4 (Managed Agents API) to `lead-pattern.md` |
| 20 | Tweak repo-orchestrator + kb-keeper descriptions to use-case-first |
| 21 | Cross-reference Anthropic Console prompt improver in prompt-adapter |
| 22 | Seed `kb-keeper` term-index with 8 glossary terms |
| 23 | Add `.github/CODEOWNERS` + `.github/dependabot.yml` (was deferred from PR #3) |
| 24 | Add `bun test` scaffolding to subagent-organizations (was deferred from PR #3) |

---

## Iteration template (what every cron firing does)

```
1. Read installs/loop-progress.md → find first unfinished task
2. Check token budget — if context >70%, refuse this iteration and write the
   blocker to loop-progress.md (the next iteration runs with fresh context)
3. Pick model:
   - Phase A/C/E (research-heavy): Sonnet medium effort
   - Phase B/D (test stubs + prompt files): Sonnet medium effort
   - Phase F (orchestration): Opus xhigh effort
4. Pick tools (CLAUDE.md #8): GraphQL > curl > Read; never WebFetch on .md/.xml/.txt
5. Execute the task as ONE self-contained commit per CLAUDE.md #2
6. git push + gh pr create (preapproved)
7. Update installs/loop-progress.md with the row
8. Move on, or stop if past 20:31 PST
```

---

## Stop conditions

The loop should self-terminate (no CronDelete needed; the cron auto-expires after 7 days, but we want to stop sooner) on any of these:

1. The 2-hour window elapsed (past 20:31 PST 2026-04-25)
2. Three iterations in a row failed the same task (something's structurally wrong)
3. CI broke on a previously-merged PR (fix that first)
4. Token usage >70% in the parent session (each iteration is fresh, but cumulative GitHub state matters)
5. The user types any non-loop message in the session

When stopping: append a final summary block to `installs/loop-progress.md`.

---

## Best practices baked in

| Practice | Where it shows up |
|---|---|
| **Prompting**: Anthropic Opus 4.7 best practices (effort levels, literal instruction, fewer subagents) | Per-task model picks above; iteration template step 3 |
| **Context management**: each iteration is compaction-fresh; this file is the source-of-truth | Iteration template step 1; loop-progress.md as resumable state |
| **Advanced tools**: Subagent fan-out for any read >300 lines; Monitor for long jobs | repo-orchestrator.md (already in repo, governs each iteration's behavior) |
| **Token reduction**: GraphQL precedence; curl over WebFetch; per-task token budget check | CLAUDE.md #8; iteration step 2 |
| **Test-first**: Phase B precedes Phase D + F implementations | Phase ordering |
| **Anthropic metrics**: pin to `platform.claude.com/docs/en/test-and-evaluate/develop-tests.md` | Phase B Task 4-6 explicitly cite this |
| **Prompt collection**: `installs/prompts/` versioned files, frontmatter-tagged | Phase D Task 11-14 |
| **Streaming**: deferred to when SDK actually ships (no LLM calls in this run) | Out of scope for this 2h |

---

## Sources for the dogfood targets

- Upstream cowork plugins: <https://github.com/anthropics/knowledge-work-plugins>
- Sibling polyrepo member: <https://github.com/subagentapps/knowledge-work-plugins-cli>
- GitHub Projects screenshots: provided 2026-04-25 18:31 PST showing productivity-cli Wave 0 (50%, 16/8 tasks done) and product-management-cli Wave 0 (50%, 11/8 tasks done, status: at risk)
- Anthropic GitHub conventions: <https://github.com/orgs/anthropics/repositories>
- Anthropic test/evaluate docs: <https://platform.claude.com/docs/en/test-and-evaluate/develop-tests.md>
- Project context: <https://claude.ai/project/019dbdc7-2980-77f1-9730-b63f18ed2cde> (NOT directly accessible — see x-plugins-research.md auth boundaries)

---

## Resume protocol (after compaction)

If a future session wakes mid-loop:

1. Read `~/.claude/projects/-Users-alexzh-claude-projects/memory/MEMORY.md` and the linked `loop-run-2026-04-26.md`
2. Read `installs/loop-progress.md` for what's done
3. Read this file (`loop-prompt.md`) for the work queue
4. `git log --oneline -10` on the current branch to see what's pushed
5. Pick up at the first unfinished task

The whole point of this scaffold: zero context-rebuild cost on resume.
