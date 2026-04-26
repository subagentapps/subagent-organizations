# `/engineering:incident-postmortem` — CLI implementation contract

Status: **draft (awaiting upstream survey)** — Wave 1, closes #90
Source: TBD — `subagentapps/knowledge-work-plugins/engineering/skills/incident-postmortem/SKILL.md` not yet surveyed in this workspace; spec drafted from blameless-postmortem industry conventions (Google SRE, Etsy, PagerDuty) + the engineering-cli plugin's role. When the routine survey lands, a follow-up PR pins the verbatim upstream body.
Companion to:
- [`./engineering-cli-overview.md`](./engineering-cli-overview.md) — plugin manifest contract
- [`./engineering-cli-stack-check.md`](./engineering-cli-stack-check.md) — peer skill, same `disable-model-invocation: true` posture
- [`./engineering-cli-architecture-review.md`](./engineering-cli-architecture-review.md) — peer skill, similar 5-step output shape
- [`../cli-parity-tracker.md`](../cli-parity-tracker.md) — `engineering:incident-postmortem` row (status flips to `ported` when this lands)

Implementation target: `subagentapps/knowledge-work-plugins-cli` repo, path
`engineering-cli/skills/incident-postmortem/SKILL.md`.

## Purpose

Produce a structured, **blameless** postmortem document for a specific
past incident. The skill operates on after-the-fact inputs — incident
timeline notes, log excerpts, chat transcripts, the user's own
recollection — and emits a markdown postmortem suitable for sharing
with the team and filing in an incident archive.

Distinct from real-time incident response (an SRE / on-call concern,
not engineering-cli scope). This skill is **post-incident** — the
incident is over, the customer impact has stopped, the team is now
documenting what happened so future incidents are less likely.

Per the engineering-cli overview, `disable-model-invocation: true` —
the user runs it deliberately when writing up a specific incident,
never auto-loaded.

## Required frontmatter

```yaml
---
name: incident-postmortem
description: Produce a blameless postmortem document for a specific past incident. Reads notes, logs, transcripts; emits structured markdown with timeline, root cause, contributing factors, and action items. Use after the incident is resolved.
when_to_use: |
  Trigger phrases (manual only — disable-model-invocation: true):
    - /engineering:incident-postmortem
    - /incident-postmortem
    - /postmortem
argument-hint: "[incident-name | incident-doc-path]"
arguments: [target]
disable-model-invocation: true
allowed-tools: |
  Read
  Glob
  Grep
  Bash(date *)
context: fork
agent: Explore
---
```

`paths` not set — the skill runs against any incident the user names.
`Bash(date *)` is in the tool list because timeline reconstruction
sometimes requires timezone math; `date -u` and `date -j` are the
common forms.

`context: fork + agent: Explore` because the skill produces a long
document (postmortems run to multiple pages); fork keeps the main
session uncluttered.

## Required body — 5-step framework (draft hypothesis)

### Step 1 — Identify the incident

The `$target` argument names what to write up:
- A path to a file with incident notes — read the file
- A path to a directory containing per-incident artifacts (logs,
  screenshots, chat exports) — read the manifest and inventory the
  artifacts
- A bare incident name — ask the user to point to artifacts; refuse
  to invent a timeline

If the target can't be resolved, return early with `Refused: incident
"<X>" not found in workspace; please pass a path or name an incident
documented in this repo.`

### Step 2 — Reconstruct the timeline

Walk through the available artifacts in time order. Build a single
flat timeline with rows like:

```
| Time (UTC) | Source                | Event                                                          |
|---|---|---|
| 14:23:00   | datadog alert         | Latency p99 spiked from 200ms → 4s                             |
| 14:23:42   | slack #incidents      | "@oncall investigating spike"                                  |
| 14:25:10   | grafana annotation    | Database CPU at 100%                                           |
| 14:31:00   | git log               | `git revert abc1234` deployed                                  |
| 14:33:15   | datadog alert         | p99 back under 300ms                                           |
| 14:45:00   | slack #incidents      | "Incident closed; rollback applied; root cause TBD"            |
```

Source citations are mandatory — no entry without a citation. Skip
entries you can't substantiate; flag them in the "missing data"
section below.

### Step 3 — Identify the root cause

A single root cause statement, ≤ 2 sentences, framed as a **system
failure** not a person failure. Example:

> "The deployment of `abc1234` removed an index that the latency-sensitive
> query in `users.search` depended on, and the CI pipeline did not catch
> the regression because the production query workload isn't represented
> in the test fixtures."

Two failure points are named (the missing index, the gap in test
fixtures). Neither names a person.

### Step 4 — Enumerate contributing factors

Beyond the root cause, what made this incident worse / longer / more
expensive than it had to be? Categories:

- **Detection**: did the alert fire fast enough? (Time from impact
  start → first alert)
- **Diagnosis**: what slowed down the diagnosis? (Missing dashboards,
  unclear ownership, gnomic error messages)
- **Mitigation**: what slowed down the fix? (Deploy speed, lack of
  rollback automation, undocumented runbook)
- **Communication**: did stakeholders know what was happening? (Status
  page, customer comms, internal coordination)

Each contributing factor gets a 1-3 bullet narrative.

### Step 5 — Action items

For each contributing factor (and the root cause), produce 1-3 action
items in this shape:

```
- [ ] **<short title>** — <one-line description>
  Owner: <name or team>
  Severity: 🔴 important / 🟡 nit
  Issue: <issue link if filed; else "TBD">
```

Action items are **specific** ("add `users.search` to the test
fixtures"), **owned** ("Owner: @platform-team"), and **trackable**
("Issue: #123" or "TBD"). Vague items like "improve testing" are
not acceptable — push back to the user to make them concrete.

The severity convention reuses cli REVIEW.md's 🔴/🟡 markers. There
is no 🟢 here — postmortems track corrective actions, not strengths.

### Output

A markdown document with sections in this order:

```
# Incident postmortem: <incident name>

**Status**: Draft / Final
**Authored**: <ISO timestamp>
**Author**: <user-provided>
**Incident date**: <YYYY-MM-DD>
**Duration**: <HH:MM>
**Severity**: SEV-1 / SEV-2 / SEV-3 (user-provided)
**Customer impact**: <one sentence>

## Summary

<2-3 sentence executive summary>

## Timeline

(table from Step 2)

## Root cause

(statement from Step 3)

## Contributing factors

### Detection
### Diagnosis
### Mitigation
### Communication

## Action items

(list from Step 5)

## Missing data

<artifacts that would have helped but weren't available>

## Lessons learned

<2-3 bullets, blameless framing>
```

The **Status: Draft / Final** field at the top matters — the user runs
the skill once on a Draft, iterates with stakeholders, then runs it
again with Status: Final and the action items closed.

## Blameless posture (required)

The skill **must** frame all findings as system failures, not person
failures. Examples:

| ❌ Don't write | ✅ Write instead |
|---|---|
| "Alice deployed bad code" | "The deployment of commit `abc1234` introduced a regression that test coverage didn't catch" |
| "Bob took too long to respond" | "Time-to-page (8 minutes) exceeded the SLO of 2 minutes due to alert routing not including weekend on-call" |
| "QA missed it" | "The test suite did not include a fixture matching the failing production query workload" |

If the user provides incident notes that name people negatively, the
skill **rephrases** them in the postmortem output — not silently, but
with an explicit "Note: rewrote person-blame to system-blame in the
following entries: <list>". The user can review the rewrite.

## Cross-cutting decisions (matches engineering-cli-overview.md)

| Decision | This skill |
|---|---|
| Markdown-output-only | yes — postmortem is a shareable markdown doc |
| No connectors required | yes — operates on user-provided files |
| `disable-model-invocation` | `true` — manual only |

## Divergence from upstream

**Awaiting upstream survey.** Anticipated divergences based on
parity-contracts patterns:

- Upstream may auto-pull from `~~chat` (Slack #incidents); CLI requires
  the user to paste / save the relevant transcript first.
- Upstream may write to `~~knowledge base` (Confluence); CLI prints to
  stdout, user files manually.
- Upstream may track action items in a project tracker; CLI emits them
  with `Issue: TBD` markers and the user files them via
  `/productivity:task-management` or directly with `gh issue create`.

## Tests (mirror to `tests/cli/engineering-cli.test.ts` when it exists)

Once the cross-repo PR for engineering-cli lands, add three test cases:

1. **Clean blameless case**: review a synthetic incident with system
   failures only → output's "Lessons learned" frames everything as
   process improvements; "Action items" all owned + trackable; no
   person-blame in any section.
2. **Person-blame rewrite case**: incident notes contain "Carol broke
   the build" → output rephrases to "the build break was undetected
   by CI"; the explicit "rewrote person-blame" note is present.
3. **Missing-data case**: incident notes lack a clear timeline →
   output's "Missing data" section calls out which artifacts would
   close the gap (e.g. "no Datadog screenshots; no chat transcript
   between 14:30-14:45").

Tests live in the cli repo (`tests/cli/engineering-cli.test.ts`); fixture
incidents under `tests/cli/fixtures/incident-postmortem/{clean,blame,missing}/`.

## Naming + paths

Slash-command alias: `/engineering:incident-postmortem`,
`/incident-postmortem`, and `/postmortem` per `when_to_use`.

File path in the cli repo:
`engineering-cli/skills/incident-postmortem/SKILL.md`.

No supporting files (`references/` empty) on first ship. If the
blameless-rewrite rules grow into a substantial corpus of examples,
move them into `references/blameless-rewrite-examples.md`.

## What this spec does NOT cover

- **Real-time incident response.** The skill operates on past incidents
  only. Live incidents are an SRE / on-call concern; this plugin
  doesn't address them.
- **Customer-facing status updates.** A separate concern (statuspage,
  customer support); the postmortem is the *internal* artifact.
- **Severity-rating algorithm.** The user provides the SEV-1/2/3
  rating; the skill doesn't calculate it from impact data.
- **Root-cause analysis methodology debates** (5-whys vs. fishbone
  vs. timeline-walking). The skill uses timeline-walking by default
  because it composes naturally with Step 2's timeline reconstruction;
  a future variant can add 5-whys as an option.

## Sources

- [`./engineering-cli-overview.md`](./engineering-cli-overview.md) — plugin manifest
- [`./engineering-cli-stack-check.md`](./engineering-cli-stack-check.md) — peer skill (same posture)
- [`./engineering-cli-architecture-review.md`](./engineering-cli-architecture-review.md) — peer skill (same disposition pattern)
- [`../cli-parity-tracker.md`](../cli-parity-tracker.md) — engineering rows
- [`../../research/engineering-cli-port-plan.md`](../../research/engineering-cli-port-plan.md) — port plan
- [`../../research/knowledge-work-plugins-cli-review.md`](../../research/knowledge-work-plugins-cli-review.md) — REVIEW.md severity conventions
- TBD: upstream `engineering/skills/incident-postmortem/SKILL.md` (routine survey pending)
- Industry conventions: Google SRE Workbook ch. 13 "The Postmortem Culture", Etsy "Blameless Postmortems" (2012), PagerDuty Incident Response docs
