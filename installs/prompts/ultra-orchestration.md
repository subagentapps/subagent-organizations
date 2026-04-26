---
name: ultra-orchestration
intent: Master sequencer for the expanded directive — orchestrates 5 chained prompts under ultra-plan + ultra-review gates with HITL checkpoints
version: 0.1.0
last-tested: never (drafted 2026-04-25)
model-card-target: claude-opus-4-7[1m] (xhigh)
description: Top-level orchestration that runs the user's expanded 2026-04-25 directive end-to-end. Each phase is a separate ultra-plan run; merges a single PR; opens an ultra-review on the merged branch; gates HITL approvals at documented friction points.
chains-to: [expand-vendor-subagentapps, promote-akw-context, frontend-deploy, research-contextual-retrieval, expand-kb-sources]
inputs:
  - phase_to_execute: "all" | one of {phase-0, phase-1, …, phase-5}
output-shape: 1 ultra-plan per phase, 1 ultra-review per merged PR, 1 master tracking issue
---

# Ultra-orchestration — the expanded-directive master plan

## Map of the work

```
phase-0  Foundation    ← staging conventions, prompt collection         (this commit's PR)
                       ↓
phase-1  Vendor        ← expand-vendor-subagentapps.md
                       ↓
phase-2  Promote       ← promote-akw-context.md
                       ↓
phase-3  Frontend      ← frontend-deploy.md
                       ↓
phase-4  KB research   ← research-contextual-retrieval.md
                       ↓
phase-5  KB sources    ← expand-kb-sources.md
                       ↓
               (live-artifact dashboard online + KB enriched)
```

Each box = one self-contained PR + one ultra-plan run + one ultra-review.

## Ultra-plan / ultra-review integration

The user (Max plan) has 3 free /ultrareview runs through May 5, 2026 per
CLAUDE.md approval gate. **Allocation strategy:**

| Run | When | What it reviews |
|---|---|---|
| #1 | After phase-2 (promote akw + start frontend) | The first src/-equivalent code lands here (apps/live-artifact/ scaffold). Highest leverage — catches structural issues early. |
| #2 | After phase-4 (contextual-retrieval research applied) | The kb-keeper update is the second-most architectural change. |
| #3 | Reserved | Saved for the merge to main of all 5 phases. |

For phases 1, 3, 5 — use `pr-review-toolkit:code-reviewer` agent
(non-billed) instead of /ultrareview.

## Ultra-plan posture per phase

`ultra-plan` is the alignment ritual BEFORE writing code. Use it when:

- The phase touches 3+ files
- The phase has 2+ defensible implementation paths
- The user hasn't seen the proposed file layout

Skip it when:

- The phase is one-file and mechanical (e.g. just adding a submodule entry)

So per phase:

| Phase | Ultra-plan? | Why |
|---|---|---|
| phase-1 vendor | NO — single mechanical operation | One PR, 5 submodule adds |
| phase-2 promote | YES — 7 spec files, multiple paths | High-leverage rename |
| phase-3 frontend | YES — three-env CF setup, secret-store binding strategy | Structural |
| phase-4 KB research | NO — one research doc | Mechanical promotion |
| phase-5 KB sources | YES — depends on phase-1 vendor surveys | Tool routing decisions |

## HITL checkpoints (the user must say "yes" before each)

Per CLAUDE.md approval gates (cross-org write, account creation,
permissions), these checkpoints are non-negotiable:

| Checkpoint | What needs OK | Phase |
|---|---|---|
| C1 | OK to vendor 5 subagentapps repos? (no — preapproved per user directive) | phase-1 |
| C2 | OK to open issues in vendored repos for WAF deltas? | phase-1 follow-up |
| C3 | OK to promote `akw-canonical-glossary.md` (1010 lines)? | phase-2 |
| C4 | Cloudflare Pages project create + Secret Store reads/writes | phase-3 |
| C5 | Cross-org write: open issues in vendored subagentapps repos for contextual-retrieval gaps | phase-4 |
| C6 | Final merge of all 5 phases to main | phase-5 |

Phase-1 vendoring is preapproved per user's verbatim directive
*"adding our repos to vendors/subagentapps/ for these 5"*.

## Stop-and-ask triggers

Stop and ask the user mid-phase if:

- A staged file has a name not in the rename map (encountered an unknown
  abbreviation)
- A vendored repo's README claims something that contradicts our specs
- A Cloudflare API call returns a 4xx that suggests scope/auth issue
- A sitemap ingestion produces >100 MB of fresh data (storage check)

## Token-efficiency baseline (per phase)

- Read budget: ≤20k input tokens per iteration, ≤10k output
- Tool precedence per CLAUDE.md #8: GraphQL > curl > Read > WebFetch (last)
- Bash > Grep > Glob (per bcherny v2.1.117+)
- Subagent dispatch only when read >300 lines or work parallelizes cleanly
- ALWAYS use the `chmod 644` → edit → `chmod 444` pattern for `.gitmodules`

## Failure modes + recovery

1. **A vendored repo doesn't exist or is private** → drop from phase-1,
   note in survey, continue with remaining 4
2. **Promote pass exceeds 200-line read budget** → split into sub-promotes;
   ONE staged file may need 3 promotes
3. **Cloudflare deploy fails** → block phase-3, capture the error, surface
   to user; never retry destructively
4. **/ultrareview not yet available or quota burned** → fall back to
   `pr-review-toolkit:code-reviewer` agent + `silent-failure-hunter`
5. **Compaction mid-phase** → recovery via auto-memory; the phase's PR is
   the durable artifact

## Final acceptance (whole orchestration)

The expanded directive is "done" when:

1. ✓ All 5 vendored subagentapps repos appear in `vendor/subagentapps/`
2. ✓ All staged akw files are either promoted or explicitly discarded
3. ✓ `subagentorganizations.com` serves the live-artifact dashboard
4. ✓ `docs/research/contextual-retrieval.md` exists with annotations
5. ✓ `docs/research/kb-source-expansion.md` exists with fresh data
6. ✓ kb-keeper subagent's source catalog is updated
7. ✓ A master tracking issue exists in this repo summarizing all 6 PRs
8. ✓ Auto-memory updated with the new state

## See also

- [`./expand-vendor-subagentapps.md`](./expand-vendor-subagentapps.md)
- [`./promote-akw-context.md`](./promote-akw-context.md)
- [`./frontend-deploy.md`](./frontend-deploy.md)
- [`./research-contextual-retrieval.md`](./research-contextual-retrieval.md)
- [`./expand-kb-sources.md`](./expand-kb-sources.md)
- [`../../.claude/CLAUDE.md`](../../.claude/CLAUDE.md) approval-gate table
- [`../../staging/README.md`](../../staging/README.md) — staging convention
