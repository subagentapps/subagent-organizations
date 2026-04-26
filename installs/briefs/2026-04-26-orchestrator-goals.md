# Brief — orchestrator goals for 2026-04-26

> Author: Claude Code (Opus 4.7), running under `opus-orchestrator.md` posture.
> Inputs: open PRs #2 + #105, open issue #10, last 7 days of merged commits,
> `docs/spec/orchestration-strategy.md` milestone ladder, `cli-parity-tracker.md`.
> Audience: alex@jadecli.com (next session, or the next `/loop` firing).

---

## 1. Where we actually are (read from disk, not memory)

The repo is **just past its first release-shaped artifact**. PR #2 (release-please)
is sitting at v0.0.2 with 19 features + 1 fix + 25 docs entries since v0.0.1. That
changelog is the most honest mirror of the last week's work. Pulling out the
shape:

| Sub-system | PRs landed | Maturity |
|---|---|---|
| `frontend/live-artifact` (8 PRs A→G + scaffold) | #96, #98, #99, #100, #101, #102, #103, #104 | Scaffold + shell + 8 components + Pages Functions + a11y/smoke. **Not deployed.** |
| `kb/contextual-retrieval` (6 PRs) | #81–#86 | End-to-end pipeline: chunker → contextualizer → embedder+BM25 → retriever (RRF) → reranker → eval harness. **Not yet wired into a real KB.** |
| `sdk/subagentmcp-sdk` readers | #66, #67, #69, #70, #71, #72, #68 | md/xml/html/js readers + bloom-cache + Crawlee fallback + HF inference. **Spec contracts mostly fulfilled; no smoke against a real subagent yet.** |
| `engineering-cli` specs only | #87, #91, #92, #93 | 3 skills specced, 0 implemented. |
| Productivity-cli | #45, #46 | 2/4 skills specced (`start`, `update`); `task-management` + `memory-management` **tbd**. |
| Orchestration | #65, #97, #105 | strategy + iter summary + this prompt. |

**Open issue:** exactly one — **#10**, the wave-0 Cloudflare Pages deploy.
Per `orchestration-strategy.md` §M3, the live frontend at `subagentorganizations.com`
is the explicit gate the user named for engineering-cli to start.

**Open PRs:** two —
- **#2** release-please: irreversible (tags `v0.0.2`, opens npm publish path). Auto-managed.
- **#105** orchestrator prompt: docs-only, self-authored this session.

---

## 2. What the PRs tell us as system-design inputs (not as merges)

### 2.1 PR #2 → "we now have a release loop"

The presence of a clean, current release-please PR after 50+ feature/doc commits
means **the Conventional Commits + commitlint + release-please pipeline works.**
We can stop second-guessing it. This unlocks:

- A trustworthy version surface for `package.json` consumers.
- A natural changelog-driven retrospective surface (the doc category is already
  organizing the prose).
- The ability to **freeze a baseline** before risky cross-org work (M3 work
  files issues against `subagentapps/subagent-xml`, etc. — having a tagged
  baseline to reason from is load-bearing for that).

The design implication: **release-please is not a chore, it's the spine.**
Treat it like CI — merging it is part of a steady cadence, not a special event.

### 2.2 PR #105 → "we made the orchestrator posture portable"

Until #105, every `/loop` firing re-derived the orchestration shape from CLAUDE.md
+ `orchestration-strategy.md` + four research docs. Locking it to one
`--append-system-prompt-file` makes it portable across:

- This session (CLI).
- The Desktop / Dispatch / Channels surfaces per `code.claude.com/platforms.md`.
- A second autonomous agent in M4 (alex@jadecli.com would `claude
  --append-system-prompt-file ./.claude/prompts/opus-orchestrator.md` and start
  inside the same posture).

Design implication: **prompts are part of the public API of this repo.**
They should ship in releases, be referenced by version, and (eventually) be
distributable as part of the plugin/MCP-Bundle path
(`modelcontextprotocol/mcpb`).

### 2.3 The unspoken signal in the changelog

Look at the categories: the doc commits **outpace** the feature commits 25:19,
and almost every feature commit closes a numbered spec issue. That confirms
spec-first (CLAUDE.md #2) is producing actual leverage — features compress into
fewer commits because the contract was negotiated up front. This is the core
operating discipline the orchestrator prompt §0 codifies.

---

## 3. Today's goals (in priority order, scoped to one /loop session)

### G1 — Decide on PR #2 (release-please v0.0.2)

**Decision required from user.** I cannot merge release-please unilaterally
(HITL gate per CLAUDE.md). Two paths:

- **Merge** → tags v0.0.2, opens publish workflow if one exists. **Recommended**
  if no in-flight breaking changes; the changelog accurately reflects the
  state of `main`.
- **Defer** → leave open until the live-artifact deploy (#10) lands, ship as
  v0.1.0 with the deploy as the headline feature. Marginally cleaner narrative,
  but stalls the spine.

### G2 — Decide on PR #105 (orchestrator prompt)

**Self-authored, docs-only, no runtime impact.** Lower bar. Two paths:

- **Merge** → makes the prompt available to any session via
  `--append-system-prompt-file` from `main`.
- **Hold for review** → if the user wants to read all 408 lines first.

### G3 — Address the gate to M3: deploy issue #10

This is the **only open issue**, tagged `wave-0`. Frontend scaffold + 7 PRs are
already merged. The remaining work is *deployment configuration*, not code:

- Wire the build to Cloudflare Pages (likely via `wrangler pages deploy` or
  GitHub Actions per `cloudflare` skill / `wrangler` skill — both available
  in this session).
- Configure `subagentorganizations.com` DNS (gated on user — domain-control).
- Cut a v0.1.0 once it's live, so M3 (engineering-cli) can start against a
  tagged baseline.

**This is the single highest-leverage task in the repo right now.** Per the
orchestration-strategy doc: "Frontend gates the second account. M3 → frontend
live → cost telemetry → THEN alex@jadecli.com runs a second agent."

### G4 — Close the productivity-cli parity gap (M1 exit criteria)

Two specs left for productivity-cli: `task-management`, `memory-management`.
Both are blocked on the Projects schema decisions in `projects-schema.md`.
Authoring these two specs is **one focused session each** — unblocks M1
exit and lets the cron move from `loop-prompt.md` to a real GitHub
Project board.

### G5 — Don't start (intentionally)

- ❌ M2 (product-management-cli skill bodies). Strict ladder; M1 first.
- ❌ M3 implementation (engineering-cli code). Specced only; gated on #10
  being live.
- ❌ Cross-org writes against the 5 vendored repos. HITL gate.
- ❌ Any branch cleanup of the 53 local branches without explicit user OK.

---

## 4. Posture notes for the next loop firing

- **Cadence:** stay in 5-minute mode through M1 + M2; stretch to 1h only after
  M2 closes (per orchestration-strategy.md §5).
- **Subagent fan-out:** the failed `code-review-expert` call this firing
  reminds us — specialist subagents that need 1M context will block on the
  user's extra-usage flag. Default to standard-context specialists
  (`Explore`, `doc-scout`, `typescript-expert`) until that's resolved.
- **Branch hygiene:** 53 local branches with `[origin/...]` tracking is high
  — many are merged into `main` (the entire #10 frontend series A-G plus
  scaffold). Before next session, run `git branch --merged main` to identify
  cleanup candidates and surface to user.
- **Memory file:** the project-memory path
  `~/.claude/projects/-Users-alexzh-...subagent-organizations/memory/MEMORY.md`
  doesn't exist yet. First write to it should be a one-line summary of this
  brief.

---

## 5. The one-line summary

> **Today is about deciding the release cadence (PR #2) and unblocking the
> single open issue (#10 = the M3 gate). Everything else is intentionally
> deferred.**

---

*Pinned by: `installs/briefs/2026-04-26-orchestrator-goals.md`. Future loops
should read this brief before TaskList.*
