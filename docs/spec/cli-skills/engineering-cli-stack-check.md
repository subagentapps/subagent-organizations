# `/engineering:stack-check` — CLI implementation contract

Status: **draft (awaiting upstream survey)** — Wave 1, closes #88
Source: TBD — `subagentapps/knowledge-work-plugins/engineering/skills/stack-check/SKILL.md` not yet surveyed in this workspace; spec drafted from the umbrella's leading hypothesis ("manifest-vs-lockfile drift check"). When the routine survey lands, a follow-up PR pins the verbatim upstream body.
Companion to:
- [`./engineering-cli-overview.md`](./engineering-cli-overview.md) — plugin manifest contract
- [`./engineering-cli-system-design.md`](./engineering-cli-system-design.md) — paired skill (auto-load) for the design-then-check loop
- [`./engineering-cli-testing-strategy.md`](./engineering-cli-testing-strategy.md) — paired skill
- [`../cli-parity-tracker.md`](../cli-parity-tracker.md) — `engineering:stack-check` row (status flips from `tbd` → `ported` when this lands)

Implementation target: `subagentapps/knowledge-work-plugins-cli` repo, path
`engineering-cli/skills/stack-check/SKILL.md`.

## Purpose

Verify that the user's package manifest and lockfile agree, that pinned
versions are still valid, and that the locked tree matches the manifest's
declared range. Used **before** opening a PR that touches dependency
files, OR **after** running `bun install` / `npm install` to confirm the
install was clean.

Per the engineering-cli overview, this skill is `disable-model-invocation:
true` — the user runs it deliberately as a state inspection, never
auto-loaded.

## Required frontmatter

```yaml
---
name: stack-check
description: Verify package manifest and lockfile agree, pinned versions are valid, and the locked tree matches the manifest's declared range. Use before PRs that touch package.json / requirements.txt / Gemfile / etc., or after running an install.
when_to_use: |
  Trigger phrases (manual only — disable-model-invocation: true):
    - /engineering:stack-check
    - /stack-check
disable-model-invocation: true
allowed-tools: |
  Bash(bun *)
  Bash(npm *)
  Bash(jq *)
  Bash(git *)
  Read
context: fork
agent: Explore
paths:
  - "package.json"
  - "package-lock.json"
  - "bun.lock"
  - "bun.lockb"
  - "yarn.lock"
  - "pnpm-lock.yaml"
  - "requirements.txt"
  - "pyproject.toml"
  - "Gemfile"
  - "Gemfile.lock"
  - "go.mod"
  - "go.sum"
  - "Cargo.toml"
  - "Cargo.lock"
---
```

`paths` listed so the skill is **path-relevant** even though it's
`disable-model-invocation: true` — the discoverability signal in the
slash-command picker matches when the user is editing one of these
files. Per `code.claude.com/docs/en/skills.md` § Frontmatter reference,
`paths` is honored regardless of `disable-model-invocation`.

`context: fork + agent: Explore` because the skill produces a status
table that should not pollute the main session — Explore reads files,
runs the sub-binary, and returns the formatted report.

## Required body — 4-step framework (draft hypothesis)

The 5-step framework convention from system-design/testing-strategy
doesn't apply cleanly here — stack-check is a check, not a design
process. Instead, four sequenced inspection steps:

### Step 1 — Detect package manager

Read `package.json` / `pyproject.toml` / `Gemfile` / `go.mod` /
`Cargo.toml` to identify the ecosystem. Multiple manifests means
multi-language repo: report each independently.

### Step 2 — Verify lockfile presence + freshness

For the detected ecosystem, check:

- Lockfile exists at the conventional path
- Lockfile mtime is ≥ manifest mtime (manifest changed without re-locking
  is a drift signal)
- Lockfile parses (corrupted lock = blocker)

Report: `lockfile present? lockfile fresh? lockfile parses?`

### Step 3 — Manifest ↔ lockfile reconciliation

For each declared dependency in the manifest:
- The lockfile has an entry resolving the declared range
- The locked version satisfies the declared range (semver / pep-440 / etc.)
- No orphaned lockfile entries (locked dep not declared in manifest —
  often a stale install)

Report a 3-column table: `name | declared | locked | status`. Status
values: `ok` / `range-mismatch` / `missing-lock` / `orphan`.

### Step 4 — Optional: outdated check

If the user opted in (`/engineering:stack-check --outdated`), run the
ecosystem's outdated-listing command:
- Bun: `bun outdated`
- npm: `npm outdated --json`
- pip: `pip list --outdated`
- bundler: `bundle outdated`

Report only top-level deps + their latest available versions. **Do not**
auto-suggest upgrades — that's a separate `/engineering:stack-upgrade`
skill (out of scope).

### Output

A structured markdown report with the four sections above plus a
**summary line** at the top:

```
Stack check: ✅ clean   (or)   ⚠ 3 issues   (or)   🛑 blocker

Ecosystem: bun (package.json + bun.lockb)
Lockfile: present, fresh (mtime +0min vs manifest), parses ok
Reconciliation:
  | name           | declared    | locked      | status         |
  |---------------|-------------|-------------|----------------|
  | bun-types     | ^1.3.11     | 1.3.11      | ok             |
  | typescript    | ^5.6.0      | 5.6.3       | ok             |

Outdated: skipped (run with --outdated to include)
```

The summary line is the most important part — a CI-style one-line
verdict that the orchestrator can use as a regression signal.

## Available context tools

The skill is `agent: Explore` (read-only) so it has no Edit / Write.
The Bash invocations listed in `allowed-tools` are exactly what the
4-step framework needs. `git` is in the list because reconciliation
sometimes needs to know "did the manifest change in this branch but not
the lockfile?" — `git diff main -- package.json bun.lockb` is the
diagnostic.

## Cross-cutting decisions (matches engineering-cli-overview.md)

| Decision | This skill |
|---|---|
| Markdown-output-only | yes — the report is markdown |
| No connectors required | yes — purely repo-local |
| `disable-model-invocation` | `true` — manual only |

## Divergence from upstream

**Awaiting upstream survey.** When the survey lands, this section
documents: (a) what skill body the upstream uses; (b) where the CLI
diverges. Likely divergences based on the parity-contracts pattern:

- Upstream may rely on `~~office suite` for sharing the report;
  CLI prints to stdout (terminal-first).
- Upstream may have a UI-driven inspector; CLI is text-output.
- Upstream may auto-suggest fixes; CLI is read-only by default per the
  step-4 boundary above.

## Tests (mirror to `tests/cli/engineering-cli.test.ts` when it exists)

Once the cross-repo PR for engineering-cli lands, add three test cases:

1. **Clean manifest+lockfile** → summary line shows `✅ clean`, status
   table all `ok`.
2. **Manifest drift** (a dep added to package.json but not in the
   lockfile) → summary line shows `⚠`, status `missing-lock` for that
   dep.
3. **Orphan in lockfile** (a dep removed from package.json but still in
   the lockfile) → summary line shows `⚠`, status `orphan` for that
   dep.

Tests live in the cli repo (`tests/cli/engineering-cli.test.ts`); fixture
trees under `tests/cli/fixtures/stack-check/{clean,drift,orphan}/`.

## Naming + paths

Slash-command alias: `/engineering:stack-check` (and `/stack-check` per
the `when_to_use` shorthand).

File path in the cli repo: `engineering-cli/skills/stack-check/SKILL.md`.

No supporting files (`references/` empty) on first ship — the 4-step
body is small enough that splitting would be overkill. If the body
grows past 200 lines, move ecosystem-specific reconciliation into
`references/<ecosystem>.md`.

## What this spec does NOT cover

- **Auto-fix.** Identifying drift is in scope; fixing it
  (`bun install --frozen-lockfile`, `npm ci`, etc.) is the user's
  decision. A future `/engineering:stack-upgrade` skill could automate
  this.
- **Vulnerability scanning.** `npm audit` / `pip-audit` are different
  surface — they belong to a security-cli plugin, not engineering.
- **Cross-language transitive dep analysis.** Each ecosystem is treated
  independently. A repo with both `package.json` and `pyproject.toml`
  produces two separate reports stitched together — no cross-linking.

## Sources

- [`./engineering-cli-overview.md`](./engineering-cli-overview.md) — plugin manifest
- [`../cli-parity-tracker.md`](../cli-parity-tracker.md) — engineering rows
- [`../../research/engineering-cli-port-plan.md`](../../research/engineering-cli-port-plan.md) — port plan
- TBD: upstream `engineering/skills/stack-check/SKILL.md` (routine survey pending)
