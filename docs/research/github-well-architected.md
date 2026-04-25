# GitHub Well-Architected Framework

Date: 2026-04-25 · Branch: `feat/anthropic-vendor`
Source repo: [`github/github-well-architected`](https://github.com/github/github-well-architected) (created 2025-12-09, MIT, Hugo + TypeScript, 20★)
Live site: https://wellarchitected.github.com

## TL;DR

The **GitHub Well-Architected Framework** (GH-WAF) is GitHub's official, community-driven
playbook for adopting and operating GitHub Enterprise — analogous to AWS's and Azure's
Well-Architected Frameworks but scoped to **developer experience and platform adoption**
rather than cloud infrastructure. It's an open-source Hugo site curated by GitHub's
customer-facing engineers, partners, and customer contributors.

> *"Apply design thinking to build and ship your software securely and at scale with GitHub."*
> — site tagline

For a small-org repo like `subagent-organizations`, GH-WAF is **mostly aspirational** — it's
written for organizations adopting GitHub Enterprise. But its **5-pillar / 3-layer mental model**
is genuinely useful as a self-audit checklist when designing repos that other people will
contribute to.

## The framework structure

### Mission (verbatim)

> *Provides community-driven guidance to help organizations adopt and deploy GitHub effectively.*
> *Foster opinionated, prescriptive best practices, design principles, and strategic insights.*
> *GitHub Docs remains the primary source of truth for implementation details* — this is design
> thinking layered on top.

### The 5 pillars

| Pillar | What it covers |
|---|---|
| **Productivity** | Speed/efficiency. Automation, CI/CD, Actions, Packages. |
| **Collaboration** | Teamwork. PRs, code reviews, project boards, discussions. |
| **Application Security** | Secure software. Dependabot, security advisories, code scanning, secret scanning. |
| **Governance** | Compliance + controls. Permissions, access controls, audit logs, rulesets. |
| **Architecture** | How to design and deploy GitHub itself for scale, reliability, efficiency. |

Pillars are *interdependent* — e.g. tightening **Governance** (CODEOWNERS, branch rules) often
slows **Productivity**. The framework's job is to make those tradeoffs explicit.

### The 3 layers (this is the actually-useful mental model)

```
┌──────────────────────────────────────────┐
│ 1. PILLARS — the "what"                  │   ← strategic outcomes
│    (Productivity / Collaboration / …)    │
├──────────────────────────────────────────┤
│ 2. DESIGN PRINCIPLES — the "how"         │   ← guiding heuristics
│    e.g. "automate repetitive tasks"      │
├──────────────────────────────────────────┤
│ 3. RECOMMENDATIONS — the "do this"       │   ← prescriptive actions
│    e.g. "Use release-please for tagging" │
└──────────────────────────────────────────┘
```

Each piece of guidance must declare which **pillar** it serves, which **design principles**
inside that pillar it expresses, and what **recommendations** (concrete steps) follow. This
is also literally how the repo is organized:

```
content/library/
├── productivity/
├── collaboration/
├── application-security/
├── governance/
├── architecture/
├── overview/
└── scenarios/        ← cross-pillar walkthroughs
```

A new article is created via:
```bash
hugo new content library/{PILLAR}/recommendations/{ARTICLE-NAME}.md
```

## How GH-WAF compares to its inspirations

GitHub's framework openly acknowledges its lineage in `docs/framework-overview.md`:

| | AWS WAF | Azure WAF | GH-WAF |
|---|---|---|---|
| **Domain** | Cloud infrastructure | Cloud infrastructure | Developer platform adoption |
| **Pillars** | 6 (Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability) | 5 (Reliability, Security, Cost Optimization, Operational Excellence, Performance Efficiency) | 5 (Productivity, Collaboration, App Security, Governance, Architecture) |
| **Source** | Closed (AWS docs) | Closed (Microsoft Learn) | **Open source, MIT** ([repo](https://github.com/github/github-well-architected)) |
| **Contribution model** | AWS-only | Microsoft-only | Community PRs welcome (`github/github-well-architected` is public) |
| **Inspiration target** | Cloud architects | Cloud architects | DevEx leads, platform engineers |

The key differentiator: GH-WAF is the **only one of the three that lives as a public OSS repo**
you can fork, PR, or — relevant to us — vendor.

## What this means for `subagent-organizations`

This repo is tiny. We don't need a full WAF assessment. But three of the framework's design
patterns are directly applicable, and one we already partially adopted in PR #3 maps cleanly
to it.

### Pillar self-audit (current state)

| Pillar | Where we stand today | Gap relative to GH-WAF |
|---|---|---|
| **Productivity** | release-please + conventional commits + bun runtime + tsup planned | None — already aligned with the "automate releases" principle |
| **Collaboration** | PR-based workflow, draft PRs, conventional-commit messages | Missing: PR template, issue templates, discussions enabled |
| **Application Security** | claudekit `file-guard` hook in `.claude/settings.json`; pinned action SHAs noted in research | Missing: Dependabot config, CodeQL, secret scanning toggle, `SECURITY.md` |
| **Governance** | None yet (just admin-jadecli writing) | Missing: `CODEOWNERS`, branch protection on `main`, required-reviewer rule (the same gotcha hit by `anthropics/homebrew-tap` in PR #2 — see `stainless-app-bot.md`) |
| **Architecture** | Spec-first (`docs/spec/`), discriminated-union primitives, modular layout | Already disciplined |

### The three highest-leverage actions GH-WAF would prescribe for us

1. **Add `CODEOWNERS`** (Governance). The exact lesson PR #2 of `anthropics/homebrew-tap` taught:
   > *"The L3 ruleset on this repo has require_code_owner_review enabled, but without a
   > CODEOWNERS file that requirement has nothing to enforce."*

   Cost: 30 seconds. File:
   ```
   *  @admin-jadecli @alex-jadecli
   ```

2. **Pin all GitHub Action `uses:` by SHA** (Application Security). Already noted in the
   stainless-app research. Currently `release-please.yml` uses `@v4`. Switch to a 40-char SHA
   so a malicious action publisher pushing a new tag can't compromise our pipeline.

3. **Add a PR template** (Collaboration). One-line wins: forces every PR to declare
   pillar/principle/recommendation alignment if we choose to be principled, or just a
   summary + test plan if we don't.

### The one anti-pattern this repo could fall into

GH-WAF cautions against treating its 5 pillars as silos. The temptation here is real because
our `src/primitives/*.ts` design *is* explicitly siloed by `kind`. The cure: when adding any
new primitive to `src/`, the corresponding `docs/spec/*.md` must call out which **other** primitives
it composes with — keeps the inheritance hierarchy from drifting into "8 disconnected classes."

## What's in the repo (architecture of the framework itself)

| Path | Purpose |
|---|---|
| `content/library/<pillar>/` | All published articles, grouped by pillar |
| `content/library/scenarios/` | Cross-pillar walkthroughs |
| `archetypes/` | Hugo content scaffolds — define the frontmatter schema for new articles |
| `layouts/` | Hugo HTML templates |
| `src/` | TypeScript bits (search index, interactive components) |
| `tools/server`, `tools/setup`, `tools/test`, `tools/lint` | Dev scripts (no Makefile) |
| `playwright.config.js` | E2E tests for the rendered site |
| `charter.md` | 19 KB document defining governance of *the framework itself* — useful read for any community-driven OSS effort |
| `.devcontainer/` | Codespaces-ready dev environment |

License: **MIT** ([LICENSE](https://github.com/github/github-well-architected/blob/main/LICENSE)).
Maintained by GitHub's Customer Engineering org with PRs from partners + customers.

## Contributing path (if we ever want to)

The framework explicitly invites contributions:

1. Open in Codespaces (badge in README).
2. `hugo new content library/{PILLAR}/recommendations/{ARTICLE-NAME}.md`.
3. Follow the [taxonomy spec](https://github.com/github/github-well-architected/blob/main/docs/taxonomies.md)
   for frontmatter (pillar, principle, recommendation).
4. PR to `github/github-well-architected`.

Plausible articles we could contribute from our research:
- *"Hardening release pipelines: lessons from anthropic-cli + homebrew-tap"* (Application Security
  pillar) — direct port of `docs/research/stainless-app-bot.md`.
- *"Choosing a release-PR bot identity: github-actions[bot] vs custom App vs SaaS"* (Productivity
  + Governance) — based on the recommendation in this branch.

## Practical applicability ranking

| Use of GH-WAF | Worth it for our repo? |
|---|---|
| **Mental model for self-audit** (5 pillars × 3 layers) | ✅ Yes — already applied above |
| **Adopt the 3 immediate Governance/Security recommendations** (CODEOWNERS, pinned action SHAs, PR template) | ✅ Yes — small cost, big signal |
| **Vendor it as a submodule** (like the Anthropic repos in `vendor/anthropic/`) | ❌ No — it's a Hugo site, not a library; reading it on github.com is enough |
| **Mirror its content/library structure inside `docs/`** | ❌ No — overkill for a 20-page docs tree |
| **Contribute back articles** | 🟡 Eventually — only if we publish a polished writeup of our bot research |

## Sources

- https://wellarchitected.github.com — live site
- https://github.com/github/github-well-architected — source repo (MIT)
- https://github.com/github/github-well-architected/blob/main/docs/framework-overview.md — pillars + layers spec
- https://github.com/github/github-well-architected/blob/main/charter.md — governance of the framework itself
- https://github.com/orgs/community/discussions?discussions_q=label%3A%22GitHub+Well-Architected%22 — community discussions
