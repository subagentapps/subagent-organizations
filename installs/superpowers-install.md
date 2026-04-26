# Superpowers install plan

Date: 2026-04-26 · Companion to: [`./tier-2-installs.md`](./tier-2-installs.md)
Source: [`obra/superpowers`](https://github.com/obra/superpowers) — Jesse Vincent's
SDLC-focused skill bundle, MIT-licensed. We surveyed the README in PR #3's tier-2
research; this is the deterministic install plan.

## Why now

Per user instruction (2026-04-25): *"focus you as the lead autonomous agent leading this
knowledge-base with minimal human in the loop guidance for specifications. you are the
orchestrator the well architected polyrepo we are building out."*

Superpowers ships TDD + planning + review skills that compose with our `repo-orchestrator`
identity. The install layers two existing patterns:

- Our **lead-orchestrator** subagent (drives, delegates, gates HITL approvals)
- **Superpowers' SDLC skills** (brainstorming, writing-plans, executing-plans, TDD,
  code-review, finishing-a-development-branch)

Together: orchestrator does the routing; Superpowers provides the operational primitives.

## Install (you run this — Claude can't slash-command on your behalf)

Inside an active Claude Code session:

```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

Or use Anthropic's official marketplace shortcut:

```
/plugin install superpowers@claude-plugins-official
```

Both paths work; Anthropic-official has stricter quality gates but lags upstream by ~days.
**Recommendation**: install from `superpowers-marketplace` for latest.

## Verify

```bash
ls ~/.claude/plugins/marketplaces/superpowers-marketplace/skills 2>&1 | head -20
```

Expected skills (per the PR #3 research at `tier-2-installs.md`):

| Skill | Purpose |
|---|---|
| `brainstorming` | Socratic design refinement (activates *before* writing code) |
| `using-git-worktrees` | Isolated workspace per task |
| `writing-plans` | Bite-sized 2-5 min tasks with exact file paths |
| `subagent-driven-development` | Two-stage review per task (spec compliance, then quality) |
| `executing-plans` | Batch execution with human checkpoints |
| `test-driven-development` | RED-GREEN-REFACTOR enforcement |
| `requesting-code-review` | Pre-review checklist |
| `receiving-code-review` | Responding to feedback |
| `finishing-a-development-branch` | Merge/PR/discard decision workflow |
| `systematic-debugging` | 4-phase root-cause process |
| `verification-before-completion` | Confirm fix before declaring done |
| `dispatching-parallel-agents` | Concurrent subagent workflows |
| `writing-skills` | Create new skills following best practices |
| `using-superpowers` | Introduction to the skills system |

## How this composes with our existing setup

| Our subagent | Composes with | Net effect |
|---|---|---|
| `repo-orchestrator` | `dispatching-parallel-agents` skill | Orchestrator gains explicit parallel-fanout mechanics |
| `repo-orchestrator` | `writing-plans` + `executing-plans` skills | Orchestrator gains the plan-first→execute discipline natively |
| `repo-orchestrator` | `subagent-driven-development` skill | Two-stage review per task (spec-compliance, then quality) — matches our existing claudekit `code-review-expert` |
| `prompt-adapter` | `brainstorming` skill | Adapter routes vague prompts to brainstorming for clarification |
| `kb-keeper` | `using-git-worktrees` | KB refresh PRs run in worktrees automatically |
| `manifest-curator` | `verification-before-completion` | Curator verifies manifest changes before declaring done |
| (no equivalent yet) | `test-driven-development` | Becomes our default for `src/` implementation |

## Anti-pattern guard

Per user's stated goal — *"minimal human in the loop guidance for specifications"* —
Superpowers + repo-orchestrator should NOT escalate every micro-decision back to alex.
Specifically:

- **Plan reviews**: orchestrator presents the plan ONCE, alex approves ONCE. Then
  Superpowers `executing-plans` runs without re-asking on every task.
- **Test-first**: TDD skill auto-activates; orchestrator doesn't ask permission to write
  the failing test first.
- **Worktrees**: any task with `isolation: worktree` (per our subagent frontmatter spec)
  auto-spawns into a worktree without confirmation.

The HITL gates that DO stay in place (mirroring `repo-orchestrator.md` "Approval gates"):
- `git push --force`
- Spawning >3 subagents simultaneously OR an agent team
- Anything in `vendor/anthropic/` (read-only by design)
- `release-please-config.json` edits
- Any cross-repo write to a different org

## After install — the first task

Once Superpowers is installed and verified, the right first task is:

> *"Use the brainstorming skill to refine the kb-parity-research.md plan into 5
> implementation PRs, then use writing-plans to break the first PR into 2-5 minute tasks."*

That gives us:
1. A clean handoff from spec→plan→tasks
2. Worked Superpowers experience before the /loop run
3. A concrete first-PR scope for the loop iterations

## Out of scope

- We do NOT install Superpowers nightly (just stable)
- We do NOT enable all 14 skills if some don't apply — review the list, disable unused
- We do NOT use Superpowers' `subagent-driven-development` for trivial single-file edits

## Sources

- `github.com/obra/superpowers` README (PR #3 research at `installs/tier-2-installs.md`)
- `installs/tier-2-installs.md` Phase 4 (Superpowers slot)
- User's 2026-04-25 instruction context
