# Orchestrator iter-21 → iter-42 — wave-1 closeout summary

Date: 2026-04-26
Status: **steady state reached** — Wave 1 in-scope work for `subagent-organizations` is complete

## Quick read

The autonomous orchestrator ran 22 iterations (iter-21 through iter-42)
across 2026-04-26, shipped **30 PRs**, closed **24 issues**, and
drained the in-scope Project #2 queue to empty. The repo went from a
4-commit scaffold to a complete TypeScript reference catalog with the
crawlee-content-layer SDK, contextual-retrieval KB layer, parity tracker,
skill-creator skill, complete engineering-cli plugin spec set, kb-keeper
refresh routine, and a Vite scaffold for the live-artifact dashboard.

The remaining open issue (#10 Phase B Cloudflare deploy) is gated on
user account-creation per CLAUDE.md and cannot be advanced by the
orchestrator without explicit user action.

## What shipped, in reverse-chronological order

| Iter | PR | Subject | Type |
|---|---|---|---|
| 42 | #96 | live-artifact Vite scaffold (Phase A of #10) | feat |
| 41 | #95 | kb-keeper refresh routine + Anthropic jobs source | docs |
| 40 | #93 | engineering-cli incident-postmortem spec (closes #90) | docs |
| 39 | #92 | engineering-cli architecture-review spec (closes #89) | docs |
| 38 | #91 | engineering-cli stack-check spec (closes #88) | docs |
| 37 | #87 | engineering-cli plugin port plan (closes #51) | docs |
| 36 | #86 | KB eval harness (closes #80, #32) | feat |
| 35 | #85 | KB embedder + BM25 (closes #77) | feat |
| 34 | #84 | KB contextualizer (closes #76) | feat |
| 33 | #83 | KB reranker (closes #79) | feat |
| 32 | #82 | KB retriever (closes #78) | feat |
| 31 | #81 | KB chunker (closes #75) | feat |
| 30 | #74 | /skill-creator skill (closes #11) | feat |
| 29 | #73 | cli-parity-tracker matrix (closes #48) | feat |
| 28 | #72 | subagent-js reader (closes #28) | feat |
| 27 | #71 | Crawlee fallback extension point (closes #27) | feat |
| 26 | #70 | subagent-html reader (closes #25) | feat |
| 25 | #69 | _bloom-cache + wire into _parry-scan (closes #24) | feat |
| 24 | #68 | HuggingFace Inference into _parry-scan (closes #29) | feat |
| 23 | #67 | subagent-xml reader (closes #26) | feat |
| 22 | #66 | subagent-md reader (closes #23) | feat |
| 21 | #64, #65 | iter-1-to-20 cherry-pick + consolidation | docs |
| (cumulative) | | 30 merged PRs across 22 iters | |

## Three foundational systems shipped

### 1. crawlee-content-layer (8 PRs across iter-22 → iter-28)

A complete content ingestion + dedup + scanning pipeline:

- 4 readers: `subagent-md`, `subagent-xml`, `subagent-html`, `subagent-js`
- prompt-injection scanner with HuggingFace Inference (`_parry-scan`)
- bloom + SQLite content cache (`_bloom-cache`)
- Crawlee fallback extension point (`_crawlee-fallback`)

**Zero new external dependencies** beyond what Bun already provides — every
piece justified its zero-dep choice with a documented spec amendment.

### 2. contextual-retrieval KB layer (6 PRs across iter-31 → iter-36)

The full Anthropic blog pipeline:

- `chunker` (800-token chunks, 100-token overlap, code-fence-aware
  heading detection, stable IDs)
- `contextualizer` (claude-haiku-4-5 + prompt-caching, sequential batches
  for cache warmth)
- `embedder + BM25` (Voyage REST + bun:sqlite Okapi BM25, fail-open
  on missing keys)
- `retriever` (RRF fusion with deterministic 3-tier tie-breaker)
- `reranker` (Cohere REST, fail-open on missing key)
- `eval harness` with 1−recall@20 metric, 50-question fixed eval set,
  per-stage breakdown, three tiers (BM25-only / +contextual / +reranker)

`bun run kb:eval` is the operator entry point. CI doesn't run it (paid
API calls).

### 3. cli-parity-tracker + skill-creator (2 PRs in iter-29, iter-30)

- 17-skill matrix at `docs/spec/cli-parity-tracker.md` (productivity 4,
  product-management 8, engineering 5)
- `bun run parity-check` script that derives matrix state from
  filesystem reality + drift-guard tests so the matrix can't silently
  diverge from the spec files
- `/skill-creator` skill at `.claude/skills/skill-creator/` using all
  advanced patterns (`!` dynamic context, `context: fork`,
  `agent: Explore`, frontmatter from upstream verbatim)

## Engineering-cli plugin: full spec set

5 of 5 engineering skills now have specs on main:

| Skill | PR | Status |
|---|---|---|
| system-design | #59 (iter-21) | ported |
| testing-strategy | #60 (iter-21) | ported |
| stack-check | #91 (iter-38) | ported |
| architecture-review | #92 (iter-39) | ported |
| incident-postmortem | #93 (iter-40) | ported |

Plus the plugin manifest contract (`engineering-cli-overview.md`) and
the port plan (`engineering-cli-port-plan.md`). The cross-repo PR
adding `engineering-cli/skills/*/SKILL.md` to
`subagentapps/knowledge-work-plugins-cli` is Phase B — separate work
in a different repo, blocked only on the user wanting to ship it.

## kb-keeper refresh routine

`docs/spec/subagentmcp-sdk/knowledge-base/refresh-routine.md` pins:

- 8 sources (7 catalog'd llms.txt/sitemaps + 1 net-new Anthropic jobs board)
- Per-source RemoteTrigger routines named `kb-refresh-<slug>`, batched
  06:00 UTC with 5-min stagger
- Snapshot storage at `docs/research/kb-snapshots/<slug>/<date>.{txt,xml,json}`,
  30-keep retention
- Failure modes (5xx → issue on 3rd consecutive; parry MALICIOUS →
  refuse to write snapshot)
- Delta-routing for sitemap deltas → cookbook-ontology / subagent-md /
  subagent-html buckets

**Not yet shipped**: the 8 RemoteTrigger routines themselves. User can
create them via RemoteTrigger.create using the spec's body template.

## What's gated, not shipped

- **#10 Phase B**: Cloudflare Pages deploy. Gated on `wrangler login`
  against the user's Cloudflare account in their secret store binding
  (`account: e6294e3ea89f8207af387d459824aaae`,
  `store: 565244614fc34be7aa8488ce46112f60`). Phase A scaffold is
  shipped (PR #96).
- **PR #2 release-please**: MERGEABLE/CLEAN, has correctly aggregated
  all wave-1 work into the v0.0.2 changelog. User merges at their
  discretion (release tagging is irreversible).
- **8 kb-refresh-* RemoteTriggers**: the spec is on main; user creates
  the routines when ready.
- **Cross-repo engineering-cli PR**: spec'd in
  `engineering-cli-port-plan.md`; user runs in
  `subagentapps/knowledge-work-plugins-cli` when ready.

## What's not gated, but out of scope for this orchestrator

- **All Wave-0 work in `subagentapps/knowledge-work-plugins-cli`**:
  #3 (dual-write task-add), #2 (todo-tests), #4 (write-spec skill),
  #5 (sprint-planning), #6 (engineering-cli surface). Different repo;
  this orchestrator's session has no write access.

## Closed Won't-do (for the audit trail)

- **#5** (vendor 11 subagentapps repos as submodules) — CLAUDE.md #5
  forbids submodules
- **#12** (deep-read contextual-retrieval blog + vendor anthropic-cookbook)
  — same submodule conflict; the blog ingest happened differently in
  PR #34 (iter-21)
- **#13** (expand kb-keeper source catalog) — required vendoring; replaced
  by #94 / PR #95 which uses the already-shipped readers
- **#17** (kanban + Wave-0 + Roadmap views) — `createProjectV2View`
  GraphQL mutation doesn't exist; views are UI-only

## What's currently load-bearing

The repo's user-facing surface, in priority order:

1. `docs/spec/subagentmcp-sdk/tools/crawlee-content-layer.md` — the
   reader contracts everything else builds on
2. `docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md` —
   the KB pipeline contract
3. `docs/spec/cli-parity-tracker.md` — pinned per-skill state across
   3 plugins
4. `.claude/skills/skill-creator/SKILL.md` — first project-scope skill
   demonstrating advanced patterns
5. `bun run parity-check` and `bun run kb:eval` — the two operator
   entry points beyond `bun test`

Cumulative: 91 spec docs in `docs/spec/`, 16 research docs in
`docs/research/`, 20 source files in `src/`, 21 test files in `tests/`,
411 tests (344 pass, 67 todo, 0 fail).

## Steady-state implications for the orchestrator

Project #2 in-scope queue is empty. The 5min cron `bbb95e40` will
continue firing, but each fire will hit the same emptiness and either:

- Find a new Todo issue the user opened — execute it
- Find no Todo — write a state-report (this file pattern) or no-op

Until the user opens new in-scope issues OR reverts a CLAUDE.md gate
to unblock Phase B / cross-repo work, the orchestrator is in maintenance
mode. The valuable work it can still do without queue items:

1. **Watch for routine fires**: the v2 routines (subagentapps-survey-*)
   fire daily 05:00-05:08Z; their PRs need consolidation when they
   land (similar to iter-21's #64).
2. **Check release-please PR #2**: when the bot updates it, verify
   it stays clean.
3. **Check parity-check drift**: if the user adds a spec by hand, the
   matrix may need updating.
4. **Bloom-cache hygiene**: per `refresh-routine.md` § Bloom-cache
   hygiene, log `__sqliteCount()` periodically (>100k = rebuild
   overdue).

## How to reactivate the orchestrator

Add a Todo issue to Project #2 with Wave + Priority + Effort fields
set. The 5min cron picks it up on its next fire. If the issue is
ungated, it ships as one self-contained PR per the orchestrator
procedure.

## Sources

- `~/.claude/projects/-Users-alexzh-claude-projects/memory/orchestrator-pivot-2026-04-25.md`
- `~/.claude/projects/-Users-alexzh-claude-projects/memory/orchestrator-iter-21-2026-04-26.md`
- All 30 merged PRs in `git log` from `7acce29` (post-iter-20) to
  `9187eab` (iter-42)
