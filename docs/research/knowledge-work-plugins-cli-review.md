# `knowledge-work-plugins-cli/REVIEW.md` — ingested for our conventions

Source: <https://github.com/subagentapps/knowledge-work-plugins-cli/blob/main/REVIEW.md>
Content SHA-256: `47c09ae5c0ba9d340583b1d602d601fcd6d8131620ba7432a07423ff0e8d6226`
Captured: 2026-04-25 PDT, autonomous orchestrator iter 11
Companion to: [`./knowledge-work-plugins-cli-survey.md`](./knowledge-work-plugins-cli-survey.md)

## Why this file exists

The cli repo (`subagentapps/knowledge-work-plugins-cli`) ships a `REVIEW.md`
that defines **how `claude-review.yml` should review PRs**. We ingest those
rules here because:

1. The same severity calibration applies to PRs the autonomous orchestrator
   opens against the cli repo
2. Several of the rules are repository conventions the orchestrator must
   follow when **authoring** code (not just reviewing it) — pinning,
   `${CLAUDE_PLUGIN_ROOT}`, secrets, release-please ownership
3. We don't have `claude-review.yml` running here yet; when it ships, the
   same rules apply

## The 5 Important rules (from REVIEW.md §"Severity calibration")

These are **must-fix-before-merge** in the cli repo. Treating them as
authoring conventions in this repo too:

| # | Rule | Why it's load-bearing for us |
|---|---|---|
| 1 | **Unpinned external dependency** — any `uses:` action without a SHA, any `npm`/`npx` without a version, any `curl \| bash` | We use `gh` extensions + GitHub Actions; SHA pinning is non-optional |
| 2 | **Hardcoded path inside a plugin** instead of `${CLAUDE_PLUGIN_ROOT}` | Every cli skill we spec (#45, #46) must use `${CLAUDE_PLUGIN_ROOT}` |
| 3 | **Secret value** in any file other than `.env*` (gitignored) | Already in our gitignore; never put `gho_*`, `github_pat_*`, `CLOUDFLARE_API_TOKEN`, etc. anywhere committable |
| 4 | **`pull_request_target` trigger** in any workflow | When we add `.github/workflows/`, this trigger is banned — it grants secret access from forks |
| 5 | **Bypassing release-please ownership** of `CHANGELOG.md`, `.release-please-manifest.json`, or per-package versions | This repo ALREADY has release-please — convention #4 in CLAUDE.md says "Don't edit CHANGELOG.md by hand"; this rule is identical |
| 6 | **Breaking the `kwpc-schema` GraphQL contract** | Cli-repo specific (consumer plugins depend on it); doesn't apply directly here BUT applies when we author plugin specs that reference the schema |

## Volume controls (apply to our future review automations)

Capped at 5 nits per review, suppressed entirely on re-review, every finding
cites `file:line`. When we ship code-review automations (e.g. for the cli
repo's PRs), they inherit these rules.

## Skip docs-only PRs

REVIEW.md §"Skip docs-only PRs" is unambiguous:

> *"If every changed file matches `*.md`, post one top-level comment that
> says exactly `no findings — docs only` and stop."*

**Implication for the autonomous orchestrator**: most of my PRs to date
are docs-only (`docs/spec/`, `docs/research/`). When we run claude-review
against them, expect single-comment outcomes. That's the desired posture.

## Self-audit — does THIS repo honor the 6 Important rules today?

Verified 2026-04-25, autonomous orchestrator iter 11:

| Rule | Status here | Notes |
|---|---|---|
| 1. Pin actions/npm/curl | **Partial** | release-please workflow uses `googleapis/release-please-action@v4` (tag, not SHA). Action: open follow-up issue to SHA-pin. |
| 2. `${CLAUDE_PLUGIN_ROOT}` | **N/A** | This repo has no plugins; the rule applies to specs we author for plugins (which DO use it — see `docs/spec/cli-skills/productivity-cli-start.md` Step 8 already references it correctly) |
| 3. No secrets in committed files | **Pass** | `.env*` gitignored; `gho_*` only in macOS Keychain; CLOUDFLARE_API_TOKEN documented as Repo Secret in `docs/spec/frontend/cloudflare-pages.md` (NOT committed) |
| 4. No `pull_request_target` | **Pass** | Repo has zero `.github/workflows/*.yml` with that trigger. release-please uses standard `pull_request` |
| 5. release-please ownership | **Pass** | CLAUDE.md #4 enforces; CHANGELOG.md hand-edits banned |
| 6. kwpc-schema contract | **N/A** | We don't ship plugins that consume it (yet) |

**Delta to address**: Rule 1 (action SHA-pinning). Tracked as a follow-up
issue per the iter-9 chunking discipline.

## Action items for the autonomous orchestrator

When opening PRs against this repo OR the cli repo:

1. **Always pin Actions to a 40-char SHA**, never a tag. Tags can be moved.
2. **Never write secret values** to anything except a gitignored `.env*` file.
3. **Always cite `file:line`** in PR review comments and issue body
   references. Already standard for the orchestrator.
4. **Skip nits on docs-only PRs**.
5. **Output the tally line first**: `N important, M nits` (or `no
   blocking issues`). The author wants the shape before details.
6. **Suppress repeat nits** on re-review.

## Cross-references

- [`../spec/orchestration-strategy.md`](../spec/orchestration-strategy.md)
  §5 "Posture going forward" — already cites stay-in-Max-plan and
  one-milestone-at-a-time; the REVIEW.md severity rules complement those
- [`../spec/cli-parity-contracts.md`](../spec/cli-parity-contracts.md) —
  per-skill contracts already use `${CLAUDE_PLUGIN_ROOT}` (rule 2)
- `.claude/CLAUDE.md` #4 (don't edit CHANGELOG.md) — same as REVIEW.md
  Important rule 5
- [`./anthropic-github-conventions.md`](./anthropic-github-conventions.md)
  — the per-rule action-pinning practice (Anthropic Pattern 1)

## Verbatim source (audit copy)

For reproducibility, the full 46-line REVIEW.md is reproduced below
verbatim. Quoted in its entirety per fair-use audit purposes; this is not
the canonical source — that lives at the URL pinned at the top of this
file with the matching content SHA.

```markdown
# Review instructions

These rules override default review behavior for `claude-review.yml`.

## Skip what CI already catches

`.github/workflows/ci.yml` already blocks merge on: JSON parse, YAML parse, bash
syntax, shellcheck warnings, GraphQL parse, commitlint format, and `npm ci`
failures. Don't comment on any of these — they're either already failing the
build, or they're correct. Mentioning them is noise.

## Severity calibration

**🔴 Important** — must be fixed before merge:

- Unpinned external dependency (any `uses:` action without a SHA, any `npm`/`npx`
  invocation without a version, any `curl | bash`).
- Hardcoded path inside a plugin instead of `${CLAUDE_PLUGIN_ROOT}`.
- Secret value in any file other than `.env*` (which is gitignored).
- `pull_request_target` trigger in any workflow.
- Any change that bypasses `release-please` ownership of `CHANGELOG.md`,
  `.release-please-manifest.json`, or per-package versions.
- Any breakage to the `kwpc-schema` GraphQL contract that consumer plugins depend on.

**🟡 Nit** — worth mentioning, never blocking:

- Style, naming, prose preferences.
- Suggestions that improve clarity without changing behavior.

## Volume controls

- **Cap nits at 5** per review. If you find more, summarize as "plus N similar
  items" in the review body.
- **Re-review convergence**: after the first review on a PR, suppress new nits
  entirely. Only post Important findings on subsequent runs.
- **Cite `file:line`** for every finding. Don't infer behavior from naming.

## Skip docs-only PRs

If every changed file matches `*.md`, post one top-level comment that says
exactly `no findings — docs only` and stop.

## Summary shape

Open the review body with a one-line tally: `N important, M nits` (or `no
blocking issues` when N=0). The author wants the shape before the details.
```
