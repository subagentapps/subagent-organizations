# Brief — Local branch hygiene proposal (2026-04-26)

> Author: Claude (Opus 4.7) under `.claude/prompts/opus-orchestrator.md`
> Audience: alex@jadecli.com — review + approve before bulk delete
> Method: cross-reference local branches against GitHub PR state (merged / open)

---

## 1. Headline numbers

| Bucket | Count |
|---|---|
| Total local branches (excluding `main`) | 60 |
| Safe to delete (squash-merged PRs on origin) | **51** |
| Currently open PRs (must keep) | 7 |
| Outliers (need a per-branch decision) | 2 |
| **Sum** | 60 ✓ |

---

## 2. Why `git branch --merged main` returned zero

The naive command returns 0 — but 51 branches are actually shipped. Cause:
**every PR on this repo is squash-merged.** Squash creates a *new* commit on
`main` with no ancestry link to the source branch. `--merged` walks ancestry,
so it never sees them.

The right detection: cross-reference local branch names against
`gh pr list --state merged --base main` head-ref names. That's the method
used here.

---

## 3. The 51 safe-to-delete branches (full list)

All have `state=MERGED` PRs against `main`. Local refs are pure leftovers.

```
chore/cherry-pick-pr4-specs
chore/consolidate-routine-v1-outputs
chore/install-plans-superpowers-parry
chore/sha-pin-release-please-action
docs/akw-frontend-promote
docs/cli-review-md-ingest
docs/cli-skills-engineering-system-design
docs/cli-skills-engineering-testing-strategy
docs/cli-skills-productivity-start
docs/cli-skills-productivity-update
docs/contextual-retrieval-spec
docs/crawlee-parry-amend
docs/design-correction-iter15
docs/design-handoff-record
docs/design-handoff-state-iter14
docs/design-iter19-critique
docs/engineering-cli-architecture-review
docs/engineering-cli-incident-postmortem
docs/engineering-cli-stack-check
docs/frontend-design-brief
docs/kb-refresh-routine
docs/orchestrator-iter-21-42-summary
docs/pat-decision
docs/subagentapps-org-inventory
docs/task-history-snapshot
feat/bloom-cache
feat/cherry-pick-pr4-spec-residue
feat/cli-parity-tracker
feat/cookbook-categorization-and-routine-fix
feat/crawlee-fallback-extension-point
feat/engineering-cli-plan
feat/frontend-dashboard-kanban
feat/frontend-github-file-and-plugin-pages
feat/frontend-markdown-and-adr
feat/frontend-polish
feat/frontend-shell-and-routes
feat/frontend-useprojects-and-api
feat/kb-chunker
feat/kb-contextualizer
feat/kb-embedder-bm25
feat/kb-eval-harness
feat/kb-reranker
feat/kb-retriever
feat/live-artifact-scaffold
feat/parry-scan-hf-integration
feat/skill-creator-skill
feat/subagent-html-reader
feat/subagent-js-reader
feat/subagent-md-reader
feat/subagent-xml-reader
fix/frontend-build-types
```

Highlights:
- **The full PR-A-through-G frontend series** (#98–#104, all merged into v0.0.2) is in this set.
- **The 6 KB contextual-retrieval branches** (#81–#86) are all here.
- **The 5 SDK reader branches** (subagent-md/xml/html/js + bloom-cache) are all here.

---

## 4. The 7 currently-open PR branches (must keep)

```
docs/kwpc-audit-2026-04-26                  → PR #107
docs/plugin-migration-pattern               → PR #108
docs/brand-voice                            → PR #109
docs/engineering-cli-connectors             → PR #110
docs/product-management-cli-connectors      → PR #111
docs/connector-availability-matrix          → PR #112
feat/issue-10-deploy-workflow               → PR #113
```

Plus current working branch `chore/branch-hygiene-inventory` (this brief)
will join when this PR opens.

---

## 5. The 2 outliers — per-branch decisions

### Outlier A: `feat/kb-parity-and-loop-plan`

- **Tracking**: `origin/feat/kb-parity-and-loop-plan`
- **Tip commit**: `6a2b1a0 docs(prompts): github-pat-fine-grained — reusable Chrome MCP PAT setup script`
- **Unmerged commits ahead of main**: 10
- **No open PR.**

The 10 unmerged commits are all topics that **already shipped to main as
separate, smaller PRs** during the cherry-pick-from-PR-4 cleanup
(`docs(spec): cherry-pick orchestration-strategy + projects-schema from PR #4`
+ `feat(parity): cli-parity-tracker matrix` + several others in v0.0.2's
changelog). The branch is a stale WIP.

**Recommendation**: delete locally + delete remote. The work is in main
under different commits.

### Outlier B: `pr-4-staging`

- **Tracking**: none (orphan local-only branch)
- **Tip commit**: `6a2b1a0` — **identical to `feat/kb-parity-and-loop-plan`**
- **Note**: flagged as anomalous in the very first turn of this session
  ("only branch without `[origin/...]` tracking")

This is a local-only ref pointing at the same commit as Outlier A. Almost
certainly a leftover staging label from the PR #4 cleanup work.

**Recommendation**: delete locally. Nothing on origin to clean up.

---

## 6. The proposed cleanup commands

When the user approves, run **either** of:

### Option A — full cleanup (one command)

```bash
# Delete all 51 safe-to-delete locals (already on origin merged-PRs)
xargs -I{} git branch -D {} < installs/briefs/2026-04-26-branch-hygiene-deletes.txt

# Delete the two outliers
git branch -D feat/kb-parity-and-loop-plan
git branch -D pr-4-staging

# Optional: prune origin remotes that have already been deleted on github
git remote prune origin
```

(The deletes-only file is a strict subset of §3 above; ship as a sibling
file when this brief lands.)

### Option B — selective (delete only specific buckets)

```bash
# Just the frontend PR-A-G series (v0.0.2 cleanup)
git branch -D feat/frontend-shell-and-routes feat/frontend-markdown-and-adr \
              feat/frontend-dashboard-kanban feat/frontend-useprojects-and-api \
              feat/frontend-github-file-and-plugin-pages feat/frontend-polish \
              fix/frontend-build-types feat/live-artifact-scaffold

# Just the KB contextual-retrieval series
git branch -D feat/kb-chunker feat/kb-contextualizer feat/kb-embedder-bm25 \
              feat/kb-retriever feat/kb-reranker feat/kb-eval-harness

# Just the SDK reader series
git branch -D feat/subagent-md-reader feat/subagent-xml-reader \
              feat/subagent-html-reader feat/subagent-js-reader \
              feat/bloom-cache feat/crawlee-fallback-extension-point \
              feat/parry-scan-hf-integration
```

---

## 7. Why I'm not auto-deleting

Per the orchestrator prompt §1.6 ("smallest reversible action") and
CLAUDE.md, bulk branch deletion is a *user-side decision*. Deleting 51 local
branches isn't strictly destructive (they're all preserved on the remote as
merged PRs) but it's a one-shot action with no easy "undo" workflow.

This brief surfaces the proposal. The user runs the commands when ready.

---

## 8. Net result if Option A runs

| Before | After |
|---|---|
| 60 local branches | **8** (main + 7 open-PR branches) |
| `git branch -vv` is a 60-line page | `git branch -vv` fits on one screen |
| Branch tab-completion shows ~60 candidates | ~8 candidates |
| New work starts from a clean baseline | Same |

---

## 9. Provenance

- Method: `gh pr list --state merged --base main --limit 200 --json headRefName`
  cross-referenced against `git for-each-ref refs/heads/`
- Validated 60 = 51 + 7 + 2 (no double-counts)
- Authored by Claude (Opus 4.7) under `.claude/prompts/opus-orchestrator.md`
