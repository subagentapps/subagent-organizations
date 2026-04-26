---
name: expand-vendor-subagentapps
intent: Vendor 5 subagentapps repos as read-only submodules under vendor/subagentapps/ and backlog code-quality issues
version: 0.1.0
last-tested: never (drafted 2026-04-25)
model-card-target: claude-sonnet-4-6 (medium)
description: Adds five sibling repos as audit-quality vendored submodules, applies the same chmod 444 .gitmodules + update=none + shallow=true policy as vendor/anthropic/, and surveys each for well-architect-framework violations.
chains-to: [promote-akw-context, expand-kb-sources]
inputs:
  - subagentapps_repos: ["subagent-xml", "subagent-crawls", "subagents-platform-execution", "warehouse", "anthropic-docs-scraper"]
output-shape: 5 new submodule entries in .gitmodules + 1 PR with vendor adds + 1 follow-up issue per repo logging WAF deltas
---

# Vendor 5 subagentapps repos

## Why this prompt exists

Per user directive 2026-04-25: *"i want to be able to orchestrate usage of and
improvements on by adding our repos to vendors/subagentapps/ for these 5"*
followed by the list above. Quality caveat: *"these were only built in the
last couple days so code quality very likely has many issues that do not line
up with our well architect framework."*

So: vendor first (audit-quality snapshot), then survey, then **backlog issues
as GitHub Issues** in each upstream repo.

## Steps (single iteration)

1. `chmod 644 .gitmodules` (the file is currently 444 by design — see
   CLAUDE.md convention #5)
2. For each of the 5 repos:
   ```bash
   git submodule add --depth 1 \
     https://github.com/subagentapps/<repo>.git \
     vendor/subagentapps/<repo>
   ```
3. After all 5 are added, append `update = none` and `shallow = true` to
   each new entry (mirror the existing `vendor/anthropic/*` pattern)
4. `chmod 444 .gitmodules`
5. Commit: `chore(vendor): vendor 5 subagentapps repos for orchestration + improvement`
6. Push, treat PR as preapproved per CLAUDE.md #2

## Survey (separate iteration — DO NOT bundle)

For each vendored repo, run a token-efficient survey:

```bash
# inside vendor/subagentapps/<repo>
ls -la | head -20
test -f README.md && head -30 README.md
test -f package.json && cat package.json | jq '.name, .version, .scripts'
test -f .github/workflows && ls .github/workflows
git -C vendor/subagentapps/<repo> log --oneline -5
```

Document findings in `docs/research/vendor-subagentapps-survey.md` —
ONE doc, FIVE sections, NO deep code reads on the first pass.

## Issue backlog (separate iteration per repo)

For each repo where the survey turned up WAF violations (probably all 5
given the user's caveat), open GitHub Issues in the **upstream** repo
(NOT here) using the labels we proposed in
`docs/research/anthropic-github-conventions.md`:

- `bug` for actual bugs
- `enhancement` for missing features
- `documentation` if README is sparse
- `wave-0` if it's foundation-level

Issue creation = cross-org write per CLAUDE.md approval gate. **Block on
user OK before opening any issue.**

## Anti-patterns

- DO NOT clone the repos as regular dirs — submodule is the right shape
- DO NOT skip `chmod 444 .gitmodules` on the way out
- DO NOT bundle vendor + survey + backlog into one PR — they're 3 separate
  iterations with 3 separate PRs
- DO NOT read source code in the survey pass — list only

## See also

- [`../../docs/research/anthropic-github-conventions.md`](../../docs/research/anthropic-github-conventions.md) — label scheme
- [`./promote-akw-context.md`](./promote-akw-context.md) — runs after this so
  the staged akw frontend specs land in `docs/spec/frontend/`
