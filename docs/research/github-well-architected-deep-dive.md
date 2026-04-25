# GitHub Well-Architected — Deep Dive (11 library pages)

Date: 2026-04-25 · Branch: `feat/anthropic-vendor`
Companion to: [`github-well-architected.md`](./github-well-architected.md) (the framework summary)
Sources: 11 library pages from [`github/github-well-architected`](https://github.com/github/github-well-architected) at SHA `69113aa`

This doc captures the **substance** of the WAF — not just the structure. Each section below
is a per-page synthesis with verbatim quotes where they hit hard, plus a "what this means for
`subagent-organizations`" note when applicable.

## Pages covered

1. [Layers of GitHub Well-Architected](#1-layers-of-github-well-architected) — 4-layer model (Pillars / Design Principles / Checklists / Recommendations)
2. [About the Assessment](#2-about-the-assessment) — how a WAF assessment runs
3. [Getting Started Checklist](#3-getting-started-checklist) — the 6-step entry path
4. [Application Security: Design Principles](#4-application-security-design-principles) — 5 sub-principles × 3 maturity levels
5. [Application Security: Managing Dependency Threats](#5-managing-dependency-threats) — 6-layer defense-in-depth
6. [Application Security: Securing GitHub Actions Workflows](#6-securing-github-actions-workflows) — 12 design strategies
7. [Architecture: Implementing Polyrepo on GitHub](#7-implementing-polyrepo-on-github) — meta-repo, change sets, 4 branching models
8. [Architecture: Expanding the Context of Enterprise Custom Agents](#8-expanding-the-context-of-enterprise-custom-agents) — bypass the 30k char agent limit via MCP
9. [Scenarios: NIST SSDF Implementation](#9-nist-ssdf-implementation) — mapping NIST SP 800-218 to GitHub features
10. [Scenarios: Anti-patterns](#10-anti-patterns) — 12 common GitHub anti-patterns
11. *Release Notes (404 at the path I tried; not in repo as `release-notes.md`)*

---

## 1. Layers of GitHub Well-Architected

> Source: [`content/library/overview/layers.md`](https://github.com/github/github-well-architected/blob/main/content/library/overview/layers.md)

The framework is **4 layers**, not 3 as I initially described. The summary doc compressed
"Checklists" into "Recommendations" — that was wrong. Corrected model:

```
┌────────────────────────────────────────────────┐
│ 1. PILLARS — the "what"                        │   broad strategic outcomes
├────────────────────────────────────────────────┤
│ 2. DESIGN PRINCIPLES — the "how"               │   guiding heuristics per pillar
├────────────────────────────────────────────────┤
│ 3. CHECKLISTS — the "is it done?"              │   measurable evaluation tools
├────────────────────────────────────────────────┤
│ 4. RECOMMENDATIONS — the "do this" articles    │   opinionated, scenario-based
└────────────────────────────────────────────────┘
```

Why design principles matter (verbatim list of value):

- **Consistency and Standardization** — uniform decision-making framework
- **Guidance for Trade-offs** — performance vs. cost, security vs. usability
- **Alignment with Business Goals** — bridges objectives ↔ implementation
- **Scalability and Flexibility** — modularity, loose coupling, separation of concerns
- **Risk Mitigation** — redundancy, failover, security-by-default
- **Facilitation of Innovation** — solid base lets teams move fast safely
- **Documentation and Communication** — easier to explain to stakeholders
- **Long-term Maintainability** — simplicity-first

Why checklists matter (these are the operational layer):

- **Operationalize the design principles** into measurable tasks
- **Consistency across reviews** — repeatable assessments over time
- **Identifying gaps and risks** before they're critical
- **Facilitation of communication** — structured status to stakeholders
- **Guidance for continuous improvement** — feedback loop
- **Alignment with best practices** — keeps the architecture current

## 2. About the Assessment

> Source: [`content/library/overview/about-the-assessment.md`](https://github.com/github/github-well-architected/blob/main/content/library/overview/about-the-assessment.md)

A **GitHub Well-Architected Assessment** is conducted by GitHub or a partner. Four steps:

1. **Initial Review** — focused on the 5 pillars
2. **Interviews and Surveys** with key stakeholders
3. **Analysis and Scoring** — alignment with each pillar
4. **Recommendations** — executive summary + detail doc + worksession to push items into a system of record

After the assessment:

- **Prioritize** the recommendations
- **Develop an action plan** with timelines + owners
- **Continuous improvement** — assessments are designed to be iterative

> *"This site serves as a basis for an assessment."* — i.e., the wellarchitected.github.com site
> is a self-service guide; the assessment is the deeper, paid/partner-led version.

**For us**: not relevant in the formal sense (we won't pay for an assessment), but the
**4-step structure is a useful self-audit pattern**: Review → Interview → Score → Recommend.
Could be done internally for `subagent-organizations` once it has more contributors.

## 3. Getting Started Checklist

> Source: [`content/library/overview/getting-started-checklist.md`](https://github.com/github/github-well-architected/blob/main/content/library/overview/getting-started-checklist.md)

Six entry steps:

1. Engage with a GitHub or Partner expert
2. Review the framework (the 5 pillars)
3. Initial GitHub environment review against those pillars
4. Stakeholder interviews + surveys
5. Analysis and scoring
6. Review the expert's recommendations

Then drill down into per-pillar checklists:

- ⚙️ Productivity Checklist
- 👥 Collaboration Checklist
- 🔒 Application Security Checklist
- 📜 Governance Checklist
- 📐 Architecture Checklist

(Each lives at `/library/<pillar>/checklist` on the live site.)

## 4. Application Security: Design Principles

> Source: [`content/library/application-security/design-principles.md`](https://github.com/github/github-well-architected/blob/main/content/library/application-security/design-principles.md)

This is the **template every pillar follows**: each pillar has 5 sub-principles, and each
sub-principle has 3 maturity levels (Start / Mature / Advance) with approach + benefit tables.

App Security's five sub-principles:

| Sub-principle | Core idea |
|---|---|
| **Design for Security** | Embed security at every level, not bolted on later |
| **Design for Compliance** | Treat regulations as a strategic advantage, not just legal obligation |
| **Design for Proactivity** | Anticipate + mitigate before breaches; "shift-left" |
| **Design for Awareness** | Security culture starts at onboarding; not just an afterthought |
| **Keep it Simple** | Avoid overengineering security controls; complexity creates new vulnerabilities |

The **maturity ladder** (3 levels) is the framework's most reusable construct. For Design for
Security:

| Level | Defining behavior |
|---|---|
| **Start** | Educate teams, secure coding guidelines, basic access controls |
| **Mature** | Proactive code review throughout SDLC, incident response plan, classify data by sensitivity, comprehensive inventory, regular validation |
| **Advance** | AI/predictive analytics for threat detection, ephemeral & isolated build environments, secure defaults, prioritize controls on critical components |

This 3-level model is verbatim across every pillar in the framework. It's the *measurable*
output of the principles — answers "where are we?" instead of "what should we do?".

> *"Keep it simple. Avoid overengineering security controls that could lead to unnecessary
> complexity and potential vulnerabilities."*
> — direct quote from the Keep it Simple section. Worth tattooing on something.

## 5. Managing Dependency Threats

> Source: [`content/library/application-security/recommendations/managing-dependency-threats.md`](https://github.com/github/github-well-architected/blob/main/content/library/application-security/recommendations/managing-dependency-threats.md)
> Authors: Ken Muse, Josh Johanning · Published 2025-12-10

This article is a direct response to the **Shai-Hulud npm worm** (2025) and prescribes a
6-layer defense-in-depth model. Each layer is independently useful; together they form the
strongest protection.

| Layer | Mechanism | Why it works |
|---|---|---|
| **1. Disable lifecycle scripts** | `ignore-scripts=true` in `.npmrc`, `enableScripts: false` in `.yarnrc.yml` | Blocks the most common attack vector — package install scripts running with your user permissions |
| **2. Dev containers** | `.devcontainer/` or Codespaces | Even if malicious code runs, it can't reach your real `~`, SSH keys, or cloud credentials |
| **3. Signed commits with user interaction** | GPG/SSH/S/MIME with passphrase, biometric, or hardware key | Cryptographic key alone isn't enough — *human verification* (fingerprint, passphrase) blocks automated attacks |
| **4. Repository rulesets** | Require PRs, status checks, signed commits, code-owner review | Creates checkpoints where automated security scans catch malicious code |
| **5. Trusted publishing + verification** | OIDC for publishing, `npm publish --provenance`, `npm audit signatures` for consuming | Eliminates long-lived tokens; cryptographic provenance both ways |
| **6. Continuous monitoring** | Dependabot, dependency-review action, code scanning, secret scanning | Catches what slips through; alert-tuning prevents fatigue |

Killer quote on tradeoffs:

> *"Avoid auto-merging dependency updates without human review. Compromised maintainer accounts
> often push malicious code as patch releases specifically because they receive less scrutiny.
> Automated tests won't catch intentional backdoors."*

And on semver myths:

> *"Don't trust semver for security decisions: Semantic versioning indicates intended API
> compatibility, not security risk. A 'patch' release can contain arbitrary code changes.
> Attackers specifically target patch releases because organizations often fast-track them
> with less scrutiny."*

**For `subagent-organizations`**: 4 of these 6 layers are immediately applicable now:
- **Layer 1** — add `ignore-scripts=true` to a project `.npmrc` once we have npm deps beyond release-please
- **Layer 4** — already plan rulesets for `main`; the GH-WAF prescription says to ALSO require code-owner review (the same lesson from `homebrew-tap` PR #2)
- **Layer 5** — when we ship to npm, use OIDC trusted publishing + `npm publish --provenance`
- **Layer 6** — Dependabot config + dependency-review action are 2-file additions

## 6. Securing GitHub Actions Workflows

> Source: [`content/library/application-security/recommendations/actions-security/index.md`](https://github.com/github/github-well-architected/blob/main/content/library/application-security/recommendations/actions-security/index.md)
> Authors: Greg Mohler, Kitty Chiu

The **12 design strategies** for Actions security — this is the most operationally useful page
in the entire framework for anyone shipping a release pipeline. We're already doing several
based on the `stainless-app[bot]` research; calling out gaps:

| # | Strategy | We do this? |
|---|---|---|
| 1 | **OIDC for authentication** with cloud providers; short-lived tokens, no long-lived secrets | ❌ Not yet — no cloud deploys |
| 2 | **Repository rulesets** to enforce security policies | ❌ Org-level toggle still pending |
| 3 | **Least-privilege workflow permissions** — `permissions: {}` at workflow level, define per-job | ⚠️ Our `release-please.yml` uses `permissions: contents: write, pull-requests: write` workflow-wide. Should move to per-job. |
| 4 | **Dependabot** for action updates | ❌ Not configured |
| 5 | **Pin actions to full commit SHAs**, not tags | ❌ Currently use `@v4` for googleapis/release-please-action |
| 6 | **Avoid actions with mutable dependencies** (no unpinned containers, no curl-from-internet) | ✅ Currently only one action used |
| 7 | **Avoid workflow injection** — sanitize user input, don't use expressions in `run:` | ✅ N/A so far |
| 8 | **Avoid `pull_request_target`** — runs in base context with elevated permissions | ✅ N/A — we use `push:` not `pull_request_target:` |
| 9 | **Secure `workflow_run` workflows** | ✅ N/A |
| 10 | **Use `head.sha` not `head.ref`** to prevent injection | ✅ N/A |
| 11 | **Caution with public repos** — don't use self-hosted runners on public repos | ✅ Repo is private |
| 12 | **Restrict allowed actions** at enterprise/org/repo level | ❌ Not configured |

Concrete fix for our `release-please.yml`:

```yaml
# BEFORE (current — workflow-level permissions)
permissions:
  contents: write
  pull-requests: write
jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4   # floating tag
        with: { ... }
```

```yaml
# AFTER (WAF-aligned)
permissions: {}                                       # workflow-level zero
jobs:
  release-please:
    runs-on: ubuntu-latest
    permissions:                                      # scoped per-job
      contents: write
      pull-requests: write
    steps:
      - uses: googleapis/release-please-action@a02a34c4d4f8db0d51b3d1baee84019e8ed7c3d5 # v4.3.1
        # pinned by SHA, version in comment
        with: { ... }
```

Also from the article — the **OIDC `sub` claim** trick for cloud trust:

> *"Prefer immutable identifiers (e.g., `repository_owner_id:12345:repository_id:67890`) over
> mutable ones (e.g., `repo:github/some-repo`)."*

Because if a repo is renamed or transferred, mutable claims break (or worse, grant access to
the wrong repo).

## 7. Implementing Polyrepo on GitHub

> Source: [`content/library/architecture/recommendations/implementing-polyrepo-engineering.md`](https://github.com/github/github-well-architected/blob/main/content/library/architecture/recommendations/implementing-polyrepo-engineering.md)
> Authors: William Salazar, Kitty Chiu · Published 2026-02-24
> Tagged with **all 5 pillars** — rare; most articles hit 1–2

This is the most relevant article for the `subagentapps` org as a whole, even if not for
`subagent-organizations` specifically. We already operate as a polyrepo (jadecli, agentknowledgeworkers,
agentbloggers, subagentskills, managedsubagents, subagentapps).

Eight design strategies:

1. **Integration layer (meta-repo)** — a dedicated repo with a manifest pinning each component to a SHA/tag. Answers *"do these versions of components work together?"* — what we lack today.
2. **Change sets for cross-repo coordination** — e.g. `CHG-1042` parent issue in meta-repo, child issues in each affected repo, ID in branch + PR title.
3. **Branching/merge coordination model** — pick one of 4:
   - **Integration branch** (release-train) — most reliable, highest overhead
   - **Meta-repo manifest** — common in enterprises; reproducible BoM
   - **Versioned artifacts** — most scalable; decouples merges entirely
   - **Linked PRs with merge gating** — lightweight; needs ordering bot
4. **Reusable workflows as a versioned platform interface** — major tags (`v1`, `v2`), semver, CODEOWNERS protection, changelogs.
5. **Component releases vs. system releases** — components release independently (`v1.8.2`); system releases happen in the meta-repo (`system-2026.01.30`).
6. **Orchestration with safety model** — orchestrator/executor split, GitHub App not PAT, rulesets enforced against automation.
7. **Workflow telemetry** — emit structured runtime metrics from reusable workflows.
8. **Security campaigns with GHAS** — coordinate remediation via Projects with SLA tracking.

Verbatim quote that names the gap exactly:

> *"GitHub primitives (issues, pull requests, workflows) are repo-scoped by design. There is
> no native 'multi-repo change object,' so organizations must model one."*

**Phased adoption roadmap from the article**:

| Phase | Focus | Deliverables |
|---|---|---|
| 1 | Standardize and observe | Central workflow repo with versioning; runtime telemetry; baseline dashboards |
| 2 | Integration layer + change sets + branching | Integration repo with manifest; change set templates; conventions |
| 3 | Orchestration rollout | Orchestrator app for cross-repo issues; agent-ready primitives |
| 4 | Security campaign automation | Alert-to-issue automation; SLA management |

**For `subagentapps`**: we're at *Phase 0* (just have a few repos, no shared workflow
infrastructure). When we add a 2nd or 3rd repo to `subagentapps`, the right move per the WAF
article is to **start with Phase 1** — extract our `release-please.yml` and `commitlint.config.cjs`
into a shared `.github` repo with versioned reusable workflows.

## 8. Expanding the Context of Enterprise Custom Agents

> Source: [`content/library/architecture/recommendations/expanding-enterprise-custom-agents-context.md`](https://github.com/github/github-well-architected/blob/main/content/library/architecture/recommendations/expanding-enterprise-custom-agents-context.md)
> Author: Anthony Grutta · Published 2026-03-11

The problem: GitHub Enterprise Custom Agents define behavior via a single `.md` file in
`.github-private`, capped at **30,000 characters**. For complex orgs that's restrictive.

The solution: instruct the agent to fetch additional knowledge files at runtime via the
**GitHub MCP server** (which runs inside the Copilot agent automatically when Custom Agents
are enabled).

Architecture:

```
.github-private/
├── agents/
│   ├── security-reviewer.md         ← under 30k, includes "fetch these files at startup"
│   ├── architecture-advisor.md
│   └── ci-cd-expert.md
└── knowledge/
    ├── security/
    │   ├── secure-coding-standards.md
    │   ├── authentication-patterns.md
    │   └── vulnerability-remediation.md
    ├── architecture/
    │   └── ...
    └── ci-cd/
        └── github-actions-best-practices.md
```

The agent .md file (under 30k) declares:

```markdown
## Critical startup procedures

Before providing any recommendations, fetch all required knowledge resources from the
organization's knowledge base via the GitHub MCP server.

**Repository configuration:**
- Owner: `your-org-name`
- Repository: `.github-private`
- Branch: `main`

**Required files (fetch all before proceeding):**
1. `knowledge/ci-cd/github-actions-best-practices.md`
2. `knowledge/ci-cd/deployment-workflows.md`
...
```

Auth: per-repo `COPILOT_MCP_GITHUB_PERSONAL_ACCESS_TOKEN` secret in the `copilot` environment.
**Tradeoff: requires repeating per-repo PAT setup**; the article suggests automation:

```bash
for repo in $(gh repo list your-org --json name -q '.[].name'); do
  gh secret set COPILOT_MCP_GITHUB_PERSONAL_ACCESS_TOKEN \
    --repo your-org/$repo \
    --env copilot \
    --body "$PAT_VALUE"
done
```

**For us**: directly relevant when we adopt Custom Agents on `subagentapps`. The **knowledge
file pattern** also maps cleanly onto Claude Code's existing `~/.claude/agents/` + skill files
— we could mirror this layout in `.claude-plugins/` if we expand the local registry.

## 9. NIST SSDF Implementation

> Source: [`content/library/scenarios/nist-ssdf-implementation.md`](https://github.com/github/github-well-architected/blob/main/content/library/scenarios/nist-ssdf-implementation.md)
> Author: Greg Mohler · Published 2026-01-20
> Spans 4 pillars: app-security, governance, productivity, collaboration

Maps the [NIST Secure Software Development Framework SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final)
to GitHub features. Each SSDF practice is categorized as:

- **GitHub-native** — built-in features (Dependabot, secret scanning, code scanning, rulesets)
- **GitHub Integration** — needs external tools (e.g., SAST beyond CodeQL, SBOM tooling)
- **Out of scope** — organizational process, not technical

Five core design strategies:

1. **Leverage GitHub-native security features** before adding external integrations
2. **Implement defense in depth** — multiple layers, no single gate
3. **Automate security checks in CI/CD** via Actions
4. **Establish clear governance boundaries** — org-level policies, rulesets, custom properties
5. **Maintain comprehensive audit trails** — audit logs, workflow histories, alert data

**For us**: not a compliance target today, but the framework's classification taxonomy
(GitHub-native vs. Integration vs. Out-of-scope) is a useful tool when evaluating any new
security control we consider — forces us to ask "do we already have this built in?" first.

## 10. Anti-patterns

> Source: [`content/library/scenarios/anti-patterns.md`](https://github.com/github/github-well-architected/blob/main/content/library/scenarios/anti-patterns.md)

12 GitHub anti-patterns organized into 6 categories. **This is the most quotable page in the
framework** — every entry has clear "why it's bad / how to avoid" rows.

### Platform anti-patterns

#### Fragmented Organization Structure
> *"Creating separate GitHub organizations for different teams or projects when a single
> organization would suffice."*
- **Why bad**: permission/integration/policy overhead, hinders collaboration, creates silos.
- **How to avoid**: use teams + projects within a single org; centralize permission management.
- **Mirror check for us**: we have **6 orgs** (jadecli, agentknowledgeworkers, agentbloggers,
  subagentskills, managedsubagents, subagentapps). Per WAF, this is borderline. The split is
  defensible if each truly hosts a different operating model; otherwise consolidate.

### Planning anti-patterns

#### Vague Requirements
- Use issue templates, break complex reqs into sub-issues, add Copilot custom instructions for domain terminology.

#### Ineffective Work Management
- Consistent labels + milestones + projects; document standard workflows.

### Development anti-patterns

#### Poor Commit Practices
> *"Making large, unfocused commits with vague commit messages."*
- **Avoid**: small atomic commits, descriptive messages, consistent format.
- **For us**: we use Conventional Commits enforced by commitlint.

#### Inconsistent Branching Strategy
- Adopt Git Flow or GitHub Flow; automate branching enforcement via rulesets.

#### Accumulating Technical Debt
- Dedicate regular time, include refactoring in feature work, custom instructions to Copilot for code quality criteria.

#### Overengineering
> *"Building unnecessarily complex solutions or adding features without clear value."*
- **Avoid**: minimal viable deliverables, focus on current problem, validate with real feedback before investing.
- **Self-check**: 8-primitive `Resource` hierarchy on a manifest of 18 packages — is this
  overengineered? My answer: borderline; defensible because future expansion is the *whole
  point* of the manifest. But worth re-asking after the first 3 primitives are implemented.

### Collaboration anti-patterns

#### Bypassing Code Reviews
- Enforce rulesets requiring meaningful reviews; use Copilot for first-pass.

#### Delayed Feedback Cycles
- Automate PR checks for immediate feedback; PR age monitoring + escalation.

### CI anti-patterns

#### Insufficient Test Automation
- Build automated suites at all levels; Copilot custom instructions for testing strategy.

#### Neglecting Application Security Measures
> *"Overlooking security measures like secret management, dependency updates, and access controls."*
- **Avoid**: GitHub Secrets, Dependabot, 2FA, repo rulesets, security configurations.
- **For us**: tracked but not yet enabled (we have `file-guard` from claudekit; need Dependabot + CodeQL).

### CD anti-patterns

#### Large Releases
- Smaller more frequent releases; feature flags; canary/gradual rollouts.

#### Manual Deployment Processes
- Automate end-to-end; human approval gates only where judgment is required.

### Application Security anti-pattern (one-off)

#### Detecting PII with secret scanning custom patterns
This one is subtle and unusual:
> *"Secret scanning is designed for credentials and tokens that can be revoked and rotated.
> PII such as social security numbers and dates of birth is permanent and cannot be rotated."*
- The trap: secret-scanning alerts **store and display** the matched value. *"Once PII triggers
  an alert, the sensitive data is permanently embedded in the alert record. This creates a
  second, unmanageable copy of the very data the organization intended to protect."*
- The fix: use purpose-built **DLP tooling** (data loss prevention) for PII; secret scanning for credentials only.
- Compliance angle: stored alerts violate GDPR right-to-erasure, CCPA right-to-deletion, HIPAA disposal, and PCI DSS secure-deletion requirements.

**Anti-patterns we should explicitly defend against in this repo's `CLAUDE.md`**:
1. Bypassing code reviews (covered — claudekit `code-review-expert` agent)
2. Inconsistent branching (covered — conventional commits + commitlint)
3. Overengineering (named in our `manifest-curator.md` agent description)
4. Manual deployment (covered — release-please owns the release loop)

---

## Synthesis: top 5 actionable items for `subagent-organizations`

Drawn from across all 11 pages, ranked by leverage:

| # | Action | Source page | Effort |
|---|---|---|---|
| 1 | **Add `CODEOWNERS`** with `@admin-jadecli @alex-jadecli` | Pages 5, 6, 10 | 30 sec |
| 2 | **Pin `release-please-action@v4` to a SHA**; add comment with version | Page 6 | 1 min |
| 3 | **Move `permissions:` from workflow-level to per-job, default workflow to `permissions: {}`** | Page 6 | 2 min |
| 4 | **Add `dependabot.yml`** for the `github-actions` ecosystem (and `npm` once we have deps) | Pages 5, 9 | 5 min |
| 5 | **Add `.npmrc` with `ignore-scripts=true`** when we add the first npm dep | Page 5 | 30 sec |

All five are zero-tradeoff hardening steps that match patterns we've already noted in
`stainless-app-bot.md`. None require Anthropic-scale infrastructure or paid features.

## Sources (full URLs)

| # | URL |
|---|---|
| 1 | https://wellarchitected.github.com/library/overview/layers/ |
| 2 | https://wellarchitected.github.com/library/overview/about-the-assessment/ |
| 3 | https://wellarchitected.github.com/library/overview/getting-started-checklist/ |
| 4 | https://wellarchitected.github.com/library/application-security/design-principles/ |
| 5 | https://wellarchitected.github.com/library/application-security/recommendations/managing-dependency-threats/ |
| 6 | https://wellarchitected.github.com/library/application-security/recommendations/actions-security/ |
| 7 | https://wellarchitected.github.com/library/architecture/recommendations/implementing-polyrepo-engineering/ |
| 8 | https://wellarchitected.github.com/library/architecture/recommendations/expanding-enterprise-custom-agents-context/ |
| 9 | https://wellarchitected.github.com/library/scenarios/nist-ssdf-implementation/ |
| 10 | https://wellarchitected.github.com/library/scenarios/anti-patterns/ |
| 11 | (release-notes URL — no markdown source at `content/library/overview/release-notes.md`; likely auto-generated from CHANGELOG or rendered from a different layout) |
