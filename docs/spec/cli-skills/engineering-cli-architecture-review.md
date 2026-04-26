# `/engineering:architecture-review` — CLI implementation contract

Status: **draft (awaiting upstream survey)** — Wave 1, closes #89
Source: TBD — `subagentapps/knowledge-work-plugins/engineering/skills/architecture-review/SKILL.md` not yet surveyed in this workspace; spec drafted from the engineering plugin's role + the system-design pairing. When the routine survey lands, a follow-up PR pins the verbatim upstream body.
Companion to:
- [`./engineering-cli-overview.md`](./engineering-cli-overview.md) — plugin manifest contract
- [`./engineering-cli-system-design.md`](./engineering-cli-system-design.md) — produces designs that this skill reviews
- [`./engineering-cli-stack-check.md`](./engineering-cli-stack-check.md) — peer skill, same `disable-model-invocation: true` posture
- [`../cli-parity-tracker.md`](../cli-parity-tracker.md) — `engineering:architecture-review` row (status flips to `ported` when this lands)

Implementation target: `subagentapps/knowledge-work-plugins-cli` repo, path
`engineering-cli/skills/architecture-review/SKILL.md`.

## Purpose

Review an existing or proposed architecture against a fixed criteria
checklist. Used **before** committing to a major architectural decision
or **after** a system has been running long enough that its real-world
shape diverges from the original design.

Distinct from `system-design` (the *creation* skill): architecture-review
operates on a **specific architecture artifact** (a system-design output,
an ADR, an existing codebase) and produces a structured critique.

Per the engineering-cli overview, `disable-model-invocation: true` —
the user runs it deliberately when reviewing a specific architecture,
never auto-loaded.

## Required frontmatter

```yaml
---
name: architecture-review
description: Review an existing or proposed architecture against scalability, security, maintainability, cost, and team-fit criteria. Use after a system-design pass to critique the result, or before committing to a significant architectural decision.
when_to_use: |
  Trigger phrases (manual only — disable-model-invocation: true):
    - /engineering:architecture-review
    - /architecture-review
argument-hint: "[design-doc-path | adr-path | system-name]"
arguments: [target]
disable-model-invocation: true
allowed-tools: |
  Read
  Glob
  Grep
context: fork
agent: Explore
---
```

`paths` not set — the skill runs against any target the user names, not
a specific file pattern. The `argument-hint` makes the manual-invocation
shape explicit.

`context: fork + agent: Explore` because the skill produces a long
review report; running in Explore keeps the main session uncluttered
and matches the read-only posture (architecture-review never writes).

## Required body — 5-step framework (draft hypothesis)

The 5-step pattern from system-design fits cleanly here, except the
inputs flow inward (review existing) instead of outward (create new).

### Step 1 — Identify the artifact

The `$target` argument names what to review:
- A path to a design document or ADR — read the file
- A path to a directory — review the top-level architecture as
  inferable from `README.md`, `package.json` / equivalent, and the
  module graph (top-level dirs)
- A bare system name — ask the user to point to documentation; refuse
  to invent context

If the target can't be resolved, return early with `Refused: target
"<X>" not found in workspace; please pass a path or name a system
that's documented in this repo.`

### Step 2 — Establish the review criteria

Five axes by default:

| Axis | What to check |
|---|---|
| **Scalability** | What's the bottleneck at 10×, 100×, 1000× current load? Are scale-out points identified? Is there a single-writer constraint? |
| **Security** | Auth boundaries clear? Data classification documented? Input validation at trust boundaries? Secrets management explicit? |
| **Maintainability** | Module boundaries match team boundaries (Conway)? Onboarding cost estimated? Documentation present and current? Test coverage strategy? |
| **Cost** | Steady-state spend modeled? Burst-capacity costs known? Vendor lock-in risks? Cost-attribution per service / feature? |
| **Team-fit** | Required expertise matches team strengths? Operational burden sustainable for team size? On-call rotation feasible? |

The user can add or remove axes via the skill body's
`Additional review criteria` block (drafted below).

### Step 3 — Walk the artifact

For each axis, the skill produces:
- **Findings**: 1-3 bullets per axis with file:line citations from the
  artifact (or "not addressed" if the axis isn't covered)
- **Severity**: `🔴 important` / `🟡 nit` / `🟢 strength` per finding
  (matches the cli REVIEW.md severity convention so cross-skill output
  is consistent)
- **Concrete questions**: 1-2 questions the architect should answer
  to close the gap

### Step 4 — Identify cross-cutting concerns

Issues that span multiple axes (e.g. "the chosen DB is a scalability
bottleneck AND a cost concern AND a team-fit risk"). These get a
separate "Cross-cutting" section in the output, with the axes they
span listed explicitly.

### Step 5 — Recommend disposition

One of:
- **Approve** — the architecture meets the bar; no important findings.
- **Approve with conditions** — important findings exist but each has
  a concrete fix the architect can apply; list them.
- **Block** — important findings exist and at least one is structural
  (no obvious fix without re-design); recommend going back to
  `/engineering:system-design`.

The disposition is a **recommendation**, not a decision. The architect
owns the decision; the skill is a structured second opinion.

### Output

A markdown document with sections in this order:

```
# Architecture review: <target>

**Disposition**: <Approve | Approve with conditions | Block>
**Reviewed**: <ISO timestamp>
**Target**: <resolved path or system name>

## Findings

### Scalability
- 🔴 ...
### Security
- 🟡 ...
### Maintainability
### Cost
### Team-fit

## Cross-cutting

## Questions for the architect

## Disposition reasoning
```

## Additional review criteria

Users can add custom axes by editing the skill body's
`## Additional review criteria` section in their fork. The default 5
axes above match the most-common review checklists; adding a 6th
(e.g. "Compliance" for regulated industries) is straightforward.

## Cross-cutting decisions (matches engineering-cli-overview.md)

| Decision | This skill |
|---|---|
| Markdown-output-only | yes — the review is a markdown doc |
| No connectors required | yes — purely repo-local reads |
| `disable-model-invocation` | `true` — manual only |

## Divergence from upstream

**Awaiting upstream survey.** Anticipated divergences based on
parity-contracts patterns:

- Upstream may run a real-time review session via `~~office suite`
  (Google Docs / Notion); CLI emits to stdout (terminal-first).
- Upstream may pull stakeholder input from `~~chat` (Slack); CLI
  delegates to "Questions for the architect" output and lets the user
  share via the channel of their choice.
- Upstream may have a multi-reviewer voting flow; CLI is a single-pass
  review (the Claude session is the reviewer).

## Tests (mirror to `tests/cli/engineering-cli.test.ts` when it exists)

Once the cross-repo PR for engineering-cli lands, add three test cases:

1. **Approve case**: review a synthetic clean architecture (ADR with
   all 5 axes addressed) → disposition is `Approve`, findings are
   mostly `🟢 strength`.
2. **Approve-with-conditions case**: review an ADR missing the cost
   axis → disposition is `Approve with conditions`, "Cost" findings
   include `🔴 not addressed: no cost model documented`.
3. **Block case**: review an architecture where two axes have
   structural problems (e.g. monolithic DB at planned 1000× scale +
   single-writer constraint) → disposition is `Block`, recommended
   action mentions revisiting `/engineering:system-design`.

Tests live in the cli repo (`tests/cli/engineering-cli.test.ts`); fixture
ADRs under `tests/cli/fixtures/architecture-review/{approve,conditions,block}/`.

## Naming + paths

Slash-command alias: `/engineering:architecture-review` (and
`/architecture-review` per `when_to_use`).

File path in the cli repo:
`engineering-cli/skills/architecture-review/SKILL.md`.

No supporting files (`references/` empty) on first ship — the body is
small enough at one file. If Additional review criteria grow into a
library of axis-specific checklists, move them into
`references/<axis>.md` (e.g. `references/security-axis.md`).

## What this spec does NOT cover

- **Live system metrics review** — that's an SRE concern, not engineering
  per the plugin's scope. The skill operates on documentation /
  architecture artifacts, not Datadog dashboards.
- **Code review** — line-level code review is a separate workflow
  (`pr-review-toolkit:code-reviewer`). architecture-review reviews
  the design, not the implementation.
- **Cost optimization recommendations** — finding "cost is not modeled"
  is in scope; recommending specific savings is out (would need access
  to the actual billing data).
- **Compliance / legal review** — separate domain. The skill flags
  "no compliance posture documented" as a finding but doesn't review
  whether the proposed architecture meets HIPAA / GDPR / etc.

## Sources

- [`./engineering-cli-overview.md`](./engineering-cli-overview.md) — plugin manifest
- [`./engineering-cli-system-design.md`](./engineering-cli-system-design.md) — paired creation skill
- [`../cli-parity-tracker.md`](../cli-parity-tracker.md) — engineering rows
- [`../../research/engineering-cli-port-plan.md`](../../research/engineering-cli-port-plan.md) — port plan
- [`../../research/knowledge-work-plugins-cli-review.md`](../../research/knowledge-work-plugins-cli-review.md) — REVIEW.md severity conventions (🔴 / 🟡 / 🟢) reused here
- TBD: upstream `engineering/skills/architecture-review/SKILL.md` (routine survey pending)
