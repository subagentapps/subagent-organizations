# engineering-cli port plan — wave-1 closeout for #51

Status: **plan committed** (closes #51)
Owner: orchestrator
Companion to:
- [`../spec/cli-skills/engineering-cli-overview.md`](../spec/cli-skills/engineering-cli-overview.md) — the manifest + skills surface
- [`../spec/cli-parity-tracker.md`](../spec/cli-parity-tracker.md) — 5 engineering rows
- [`./knowledge-work-plugins-cli-survey.md`](./knowledge-work-plugins-cli-survey.md) — CLI repo state

## Goals

1. Add `engineering-cli` as the 6th plugin in
   `subagentapps/knowledge-work-plugins-cli` so the CLI plugin family matches
   the upstream Cowork `knowledge-work-plugins` 1:1 for the skills we want
   to port.
2. Capture per-skill specs in `docs/spec/cli-skills/engineering-cli-*.md`
   first (per CLAUDE.md #2 spec-first), so the cross-repo PR is mechanical
   when it lands.
3. Pin a parity-tracker row for every engineering skill that ships.

## Where things stand (2026-04-26)

| Phase | Status |
|---|---|
| Plugin manifest spec | ✅ committed in this PR — [`engineering-cli-overview.md`](../spec/cli-skills/engineering-cli-overview.md) |
| 2 of 5 skill specs drafted | ✅ system-design (PR #59) + testing-strategy (PR #60) |
| Parity tracker | ✅ all 5 engineering rows present (PR #73) |
| 3 of 5 skill specs missing | ⏭ tracked as new issues opened from this PR (#TBD #TBD #TBD) |
| Upstream fork survey | ⏭ tracked as a routine (next 5-routine batch) |
| Cross-repo PR | ⏭ implementation phase — different repo (`knowledge-work-plugins-cli`) |

## Phase A — what closing #51 actually delivers

This PR ships:
1. `docs/spec/cli-skills/engineering-cli-overview.md` — the plugin
   manifest contract: `.claude-plugin/plugin.json` shape, 5-skill surface,
   cross-cutting decisions (markdown-only, no connectors), per-skill
   `disable-model-invocation` rationale.
2. `docs/research/engineering-cli-port-plan.md` (this file) — the plan
   that maps how to get from "manifest committed" to "cross-repo PR
   lands in the CLI repo".
3. **Three follow-up issues** opened from this PR for the missing skill
   specs (`stack-check`, `architecture-review`, `incident-postmortem`).
   They become Wave 2 P2 items in Project #2, sized S.
4. **One follow-up issue** to schedule a routine pass against
   `subagentapps/knowledge-work-plugins/engineering/skills/` to confirm
   the canonical 5-skill list (currently inferred — could be wrong).

## Phase B — what comes after

After Phase A merges, the path to a working `engineering-cli` is:

1. **Routine survey** of upstream fork → confirms or updates the skill
   list. If new skills are found, the parity tracker grows; if any of
   the assumed-5 don't exist, the tracker rows are removed (or
   relabeled `divergent` if we want to add one upstream doesn't).
2. **Three stub-skill specs** authored (one PR per skill, S each).
   Each spec mirrors the contract pattern from
   `engineering-cli-system-design.md`: required frontmatter, body
   structure verbatim from upstream, output type, divergence from
   upstream.
3. **Cross-repo PR** in `subagentapps/knowledge-work-plugins-cli` adds
   the `engineering-cli/` directory tree, copying each `SKILL.md` body
   from the spec. CHANGELOG entry for the cross-repo PR is
   release-please-managed; never hand-edited.
4. **Parity tracker auto-flips** to `ported` for each row when its
   spec lands (per the iter-29 derivation rule).

Total path = **4 spec-PRs** (3 stub specs + 1 cross-repo PR) + **1 routine**.

## Phase C — what's deliberately out of scope

- **The 6th plugin in the CLI repo's manifest** isn't a registry-level
  publish — the polyrepo CLI doesn't use a marketplace yet. Local-clone
  `/plugin install` is the install path, matching the rest of the CLI
  plugins. Marketplace publication is a wave-2 question.
- **Engineering data sources beyond Sentry** (Datadog, PagerDuty, etc.) —
  the parity-contracts list these as `~~observability` connectors which
  are out-of-scope for the CLI per `cli-parity-contracts.md`.
- **Generated diagrams (Mermaid, ASCII)** — handled inline by Claude in
  the skill body when prompted. We don't ship a separate diagram-emitter
  skill.

## Engineering plugin's relationship to the frontend track

Per iter-12 user direction: `system-design` and `testing-strategy` were
the prerequisites for frontend buildout. Both are now ported (PRs #59,
#60) — the frontend-track's `apps/live-artifact/` build can use them
today, even though the *plugin* (the cross-repo PR) hasn't shipped.

Translation: ported skills are usable as **standalone reference content**
for repo-local Claude Code work even before the cross-repo PR lands.
The cross-repo PR is what makes them discoverable in the CLI's plugin
catalog; absent it, they're still accessible as files under
`docs/spec/cli-skills/`.

## Risks + mitigations

**Risk 1**: the upstream fork's actual skill list differs from the
inferred 5. **Mitigation**: routine survey runs as Phase B step 1; the
3 stub-spec issues stay in Todo until the survey confirms each.

**Risk 2**: a stub skill turns out to need a connector we ruled out.
**Mitigation**: per-spec divergence section is mandatory; if a skill
cites a connector, the spec opens a new parity-contracts row first.

**Risk 3**: cross-repo PR conflicts with template repo updates.
**Mitigation**: the engineering plugin's directory shape is
boilerplate-uniform with the other 5 plugins; template diffs are
caught by the routine survey of the cli-repo at iter-21's pattern.

**Risk 4**: release-please mishandles the new plugin's first version.
**Mitigation**: every plugin starts at `0.0.1` per the established
pattern; release-please-config.json's `packages` block needs the new
plugin added in the cross-repo PR — that's a release-please-config
edit which is gated by CLAUDE.md #4 ("Don't edit CHANGELOG.md by
hand") + spec rule ("release-please-config" is gated). Treat as gate
trigger; surface to user before the cross-repo PR lands.

## Acceptance

- [x] Manifest spec committed
- [x] Plan committed
- [ ] 3 follow-up issues opened (created at the end of this PR via
      `gh issue create`; numbers fill in when this PR lands)
- [ ] Routine survey scheduled (next 5-routine batch — manual followup
      via RemoteTrigger)

## Sources

- `docs/research/knowledge-work-plugins-cli-survey.md` — CLI repo state
- `docs/spec/cli-skills/engineering-cli-system-design.md` (PR #59)
- `docs/spec/cli-skills/engineering-cli-testing-strategy.md` (PR #60)
- `docs/spec/cli-parity-tracker.md` (PR #73)
- `docs/spec/cli-parity-contracts.md` (PR #21)
