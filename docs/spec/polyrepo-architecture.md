# Polyrepo architecture: this repo as the meta-repo for managed knowledge-base children

Date: 2026-04-25 · Branch: `feat/anthropic-vendor`
Companion to: [`docs/research/github-well-architected-deep-dive.md`](../research/github-well-architected-deep-dive.md) §7
Source pattern: https://wellarchitected.github.com/library/architecture/recommendations/implementing-polyrepo-engineering/

> **Stipulated example, not verified.** This doc uses three Anthropic announcements
> (Anthropic Labs Design Labs at claude.ai/design, a Claude Desktop update, a Claude Cowork
> update) as illustrative child repos. I could not independently fetch
> `https://claude.com/blogs/` (302→`claude.ai/blogs` returns 403 for this client).
> The architecture below stands regardless of whether the announcements are real; the
> child repos are placeholders for any three markdown knowledge bases you'd want to manage
> together.

## Context

The WAF polyrepo article names the gap exactly:

> *"GitHub primitives (issues, pull requests, workflows) are repo-scoped by design.
> There is no native 'multi-repo change object,' so organizations must model one."*

This doc designs how `subagentapps/subagent-organizations` plays the **integration-layer
(meta-repo)** role for three child knowledge-base repos. The meta-repo holds **only**
manifests, integration tests, reusable workflows, and CI config — never the children's code.
The children are independent markdown KBs that release on their own cadence.

## The 3 child repos (illustrative)

| # | Child repo | Subject | Sources to track |
|---|---|---|---|
| 1 | `subagentapps/kb-anthropic-design-labs` | Anthropic Labs "Design Labs" at claude.ai/design | Blog post + `claude.ai/design` UI surface + design-system primitives released via the labs |
| 2 | `subagentapps/kb-claude-desktop` | Claude Desktop releases & features | Blog posts on each desktop update; settings & permission model evolution; computer-use feature |
| 3 | `subagentapps/kb-claude-cowork` | Claude Cowork (multi-user/team workflows) | Blog posts on cowork; team admin, agent-team interactions |

Each child repo is a **pure-markdown KB** — no source code, no build step. Same shape we use
in `docs/spec/` here, but per-product.

## The decision: `.gitmodules` vs `.gitattributes` vs neither

Three real options for how the meta-repo *references* the children. I'm picking based on the
WAF polyrepo article's design-strategy section.

### Option A — `.gitmodules` (vendoring, what `vendor/anthropic/` does today)

**When**: you need byte-exact reproducibility, want the children's source physically on disk
when you clone the meta-repo, or are auditing fixed snapshots.

**Layout sketch**:
```
subagent-organizations/                    ← meta-repo
├── vendor/kb/
│   ├── kb-anthropic-design-labs/          ← submodule, pinned SHA
│   ├── kb-claude-desktop/                 ← submodule, pinned SHA
│   └── kb-claude-cowork/                  ← submodule, pinned SHA
└── .gitmodules                            ← chmod 444, update = none
```

**Pros**: identical pattern to our `vendor/anthropic/` setup; `git clone --recurse-submodules`
hands a contributor a full reading copy of all four repos.

**Cons**: forces every meta-repo clone to pull all children; bumping a child requires editing
`.gitmodules` (or resetting the submodule pointer), which is friction for the kind of
*frequent small docs updates* a KB sees.

**Verdict for this case**: **wrong tool.** Vendoring is for *I want this snapshot frozen*
(Anthropic SDKs that change weekly). KBs change daily and you want to read the *latest*, not
a snapshot.

### Option B — `.gitattributes` (none of what you'd think)

`.gitattributes` is **not** a multi-repo mechanism — it's per-file path attribute metadata
inside a single repo (line endings, diff drivers, merge strategies, `linguist-vendored`,
LFS pointers, etc.). It cannot reference another repo.

**When you'd use it inside a meta-repo**: marking generated docs as `linguist-generated`,
forcing LF endings on all `.md`, declaring `*.lock binary` so diffs collapse, treating the
manifest as `merge=union`. Useful, but **not the cross-repo glue you're asking for.**

I'm including this here because the question conflates the two — it's worth making the
distinction explicit so future-you doesn't reach for it for the wrong reason.

### Option C — manifest-only reference (what the WAF article actually prescribes)

A typed JSON/YAML file in the meta-repo pins each child to a tag or SHA *without* cloning
their source. The `release-please` action already pinned similar metadata for this repo.

**Layout sketch**:
```
subagent-organizations/                    ← meta-repo
├── src/data/kb-manifest.json              ← pins each child to a ref
├── src/primitives/knowledge-base.ts       ← new Resource subclass
└── .github/workflows/
    ├── _reusable-kb-validate.yml          ← reusable workflow each child calls
    └── kb-integration.yml                 ← validates the composed system
```

**Pros**: tiny diff to bump a child (`"ref": "v1.2.3" → "v1.2.4"` one-liner); doesn't drag
KB source into the meta-repo clone; reuses our existing `Resource` primitive design.

**Cons**: contributors who want all children locally need a `bun run sync` script to
clone-on-demand (already specced in `docs/spec/manifest/sync.md`).

**Verdict**: **this is the right answer for a polyrepo of KB children.** Vendoring (Option A)
is reserved for things you snapshot for audit; KBs you reference.

### Recommended hybrid

- **Manifest** at `src/data/kb-manifest.json` for the KB children (Option C)
- **Submodules** at `vendor/anthropic/` for the SDK pins we already have (Option A) — different
  problem, different tool
- **`.gitattributes`** in the meta-repo only to enforce LF + mark generated files (Option B
  used for what it's actually for)

The two patterns coexist in the same meta-repo because they answer different questions.

## What the meta-repo does for its children

The polyrepo article's design strategies translated to KB children:

| WAF strategy | What the meta-repo holds |
|---|---|
| **1. Integration manifest** | `src/data/kb-manifest.json` pinning each child to a tag |
| **2. Change sets** | Parent tracking issues here with `CHG-####` IDs; child issues link back |
| **3. Branching/merge model** | "Versioned artifacts" (Option 3 in WAF article) — children release independently; meta-repo bumps via Dependabot-style PR |
| **4. Reusable workflows** | `.github/workflows/_reusable-kb-*.yml` — KB linting, dead-link check, frontmatter schema validation; children call these via `uses: subagentapps/subagent-organizations/.github/workflows/_reusable-kb-validate.yml@v1` |
| **5. Component vs system releases** | Each child cuts its own `vX.Y.Z`; meta-repo cuts `kb-system-2026.05.01` snapshot tags pinning the set |
| **6. Orchestration safety** | A small GitHub App (or `RELEASE_APP_*` pattern from anthropic-cli) opens "bump KB" PRs in the meta-repo when any child cuts a tag |
| **7. Workflow telemetry** | Each child's reusable-workflow run emits a structured log line meta-repo aggregates into a dashboard |
| **8. Security campaigns** | Dependabot at the meta-repo level surfaces vulnerable transitive deps if any child uses npm |

## Concrete repo layouts

### Meta-repo (this repo, expanded)

```
subagent-organizations/
├── .github/
│   ├── CODEOWNERS                         ← already planned (WAF action #1)
│   ├── dependabot.yml                     ← already planned (WAF action #4)
│   └── workflows/
│       ├── release-please.yml             ← exists — bumps THIS repo
│       ├── kb-bump-on-child-release.yml   ← NEW — receives child release events, opens bump PR
│       ├── kb-integration.yml             ← NEW — runs against a manifest snapshot
│       ├── _reusable-kb-validate.yml      ← NEW — called by each child
│       ├── _reusable-kb-publish.yml       ← NEW — called by each child for deploys
│       └── _reusable-kb-release.yml       ← NEW — called by each child for tag → release
├── .gitmodules                            ← unchanged; only vendor/anthropic/* (chmod 444)
├── .gitattributes                         ← NEW — LF, linguist-generated for REFERENCES.md
├── src/
│   ├── core/, primitives/, directives/    ← existing spec
│   ├── data/
│   │   ├── packages.json                  ← existing — zsh/cc/terminal manifest
│   │   └── kb-manifest.json               ← NEW — pins the 3 KB children
│   └── primitives/
│       └── knowledge-base.ts              ← NEW — KnowledgeBase extends Resource
├── docs/
│   ├── spec/, research/                   ← existing
│   └── polyrepo/
│       ├── README.md                      ← how the meta-repo manages children
│       ├── change-sets.md                 ← CHG-#### conventions
│       ├── kb-onboarding.md               ← "to add a 4th KB child, do these steps"
│       └── reusable-workflows.md          ← contract for each _reusable-* workflow
├── vendor/
│   ├── anthropic/                         ← existing — submodules (Option A)
│   └── kb/                                ← OPTIONAL — sync.ts can populate for local reading
└── package.json, etc.
```

### Each child repo (e.g. `kb-anthropic-design-labs`)

```
kb-anthropic-design-labs/
├── .github/
│   ├── CODEOWNERS                         ← copies pattern from meta-repo
│   └── workflows/
│       ├── validate.yml                   ← calls _reusable-kb-validate from meta-repo
│       ├── release.yml                    ← calls _reusable-kb-release from meta-repo
│       └── notify-meta.yml                ← on tag, dispatches to meta-repo via repository_dispatch
├── content/
│   ├── _index.md                          ← landing page
│   ├── overview/
│   │   ├── what-is-design-labs.md
│   │   └── claude-ai-design-tour.md
│   ├── primitives/                        ← if labs ships design-system primitives
│   │   ├── color-tokens.md
│   │   ├── typography.md
│   │   └── components.md
│   └── changelog/
│       └── 2026-04-launch.md
├── archetypes/
│   └── default.md                         ← Hugo-style frontmatter scaffold
├── frontmatter.schema.json                ← validated by _reusable-kb-validate
├── CHANGELOG.md                           ← release-please managed
├── release-please-config.json             ← inherits from meta-repo via include
├── .release-please-manifest.json
└── README.md
```

The key file is `.github/workflows/notify-meta.yml`. After a child cuts `vX.Y.Z`:

```yaml
name: notify-meta-on-release
on:
  release:
    types: [published]
permissions: {}
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Dispatch to meta-repo
        env:
          GH_TOKEN: ${{ secrets.META_DISPATCH_TOKEN }}      # short-lived; from a GitHub App
        run: |
          gh api -X POST repos/subagentapps/subagent-organizations/dispatches \
            -f event_type='kb-child-released' \
            -f client_payload[child]='kb-anthropic-design-labs' \
            -f client_payload[ref]='${{ github.event.release.tag_name }}'
```

The meta-repo's `kb-bump-on-child-release.yml` listens for that dispatch, opens a PR
updating `src/data/kb-manifest.json`, and lets the maintainer (or release-please) merge.

## The KB manifest (concrete shape)

Mirrors `packages.json` but typed against a new `KnowledgeBase` primitive:

```json
{
  "$schema": "../schema/kb-manifest.schema.json",
  "kbs": [
    {
      "id": "kb-anthropic-design-labs",
      "name": "Anthropic Labs — Design Labs",
      "repo": "subagentapps/kb-anthropic-design-labs",
      "ref": "v0.1.0",
      "topic": "design",
      "subjectUrl": "https://claude.ai/design",
      "blogUrl": "https://claude.com/blogs/<slug-tbd>",
      "lastBumped": "2026-04-25",
      "owners": ["@admin-jadecli"]
    },
    {
      "id": "kb-claude-desktop",
      "name": "Claude Desktop",
      "repo": "subagentapps/kb-claude-desktop",
      "ref": "v0.1.0",
      "topic": "product",
      "subjectUrl": "https://claude.ai/download",
      "blogUrl": "https://claude.com/blogs/<slug-tbd>",
      "lastBumped": "2026-04-25",
      "owners": ["@admin-jadecli"]
    },
    {
      "id": "kb-claude-cowork",
      "name": "Claude Cowork",
      "repo": "subagentapps/kb-claude-cowork",
      "ref": "v0.1.0",
      "topic": "product",
      "subjectUrl": "https://claude.ai/cowork",
      "blogUrl": "https://claude.com/blogs/<slug-tbd>",
      "lastBumped": "2026-04-25",
      "owners": ["@admin-jadecli"]
    }
  ]
}
```

## The new `KnowledgeBase` primitive (spec stub)

```ts
// src/primitives/knowledge-base.ts
import { Resource, type ResourceArgs } from '../core/resource.js';
import type { InstallDirective } from '../directives/installable.js';

export type KbTopic = 'design' | 'product' | 'protocol' | 'research';

export interface KnowledgeBaseArgs extends ResourceArgs {
  topic: KbTopic;
  subjectUrl: string;        // the thing being documented
  blogUrl?: string;          // announcement post if any
  owners: string[];          // GitHub handles for CODEOWNERS sync
}

export class KnowledgeBase extends Resource {
  readonly kind = 'knowledge-base' as const;
  readonly topic: KbTopic;
  readonly subjectUrl: string;
  readonly blogUrl?: string;
  readonly owners: string[];

  constructor(args: KnowledgeBaseArgs);

  install(): InstallDirective;
  // → { kind: 'reference-only' } — KBs are read on github.com, not installed
}
```

This extends `kind` in `src/core/kind.ts` with `'knowledge-base'`, which by the
discriminated-union design **forces the renderer and validator to handle it** at compile
time. No runtime "did I forget?" bug possible.

## Branching & coordination model — pick "Versioned artifacts" (WAF Option 3)

The polyrepo article lists 4 options. Here's why **Versioned artifacts** wins for a
KB-children polyrepo:

| Option | Fit for KB children |
|---|---|
| **1. Integration branch** (release train) | ❌ Overkill — KBs don't need synchronized cuts |
| **2. Meta-repo manifest** (with PRs against shared meta) | 🟡 Possible, but every KB merge spawns a meta PR — noisy |
| **3. Versioned artifacts** | ✅ **Each child cuts releases on its own cadence; meta-repo manifest receives a bump PR via `repository_dispatch`** |
| **4. Linked PRs with merge gating** | ❌ Wrong shape; no cross-repo changes that need to merge atomically |

> *"Routine dependency updates are best handled through versioned artifacts, where each
> component releases independently and consumers update at their own pace."*
> — WAF polyrepo article

KBs are exactly that pattern: each child has its own release cadence; the meta-repo *consumes*
those releases via a manifest update.

## CODEOWNERS strategy

The meta-repo owns a **template**:
```
# .github/CODEOWNERS — meta-repo template
*       @admin-jadecli
src/data/kb-manifest.json  @admin-jadecli @alex-jadecli
```

Each KB child has its own scoped CODEOWNERS that the meta-repo's `_reusable-kb-validate.yml`
checks for:
```
# .github/CODEOWNERS — kb-claude-desktop
*       @admin-jadecli
content/changelog/  @admin-jadecli @alex-jadecli   # only specific reviewers can touch changelog
```

Recall the lesson from `anthropics/homebrew-tap` PR #2: a ruleset requiring code-owner review
**does nothing** without a CODEOWNERS file. The validate workflow enforces presence.

## Reusable workflows — the platform interface

Each meta-repo workflow is treated as an internal product per WAF Strategy #4:

| Workflow | Inputs | Job |
|---|---|---|
| `_reusable-kb-validate.yml` | `version` (Hugo/markdown), `frontmatter-schema-path` | Lint markdown, validate frontmatter, dead-link check |
| `_reusable-kb-release.yml` | `package-name` | release-please-action invocation; pinned by SHA |
| `_reusable-kb-publish.yml` | `target` (gh-pages, cf-pages, etc.) | Optional — only if a child KB renders to a site |

Children call these with major-tag pin:
```yaml
jobs:
  validate:
    uses: subagentapps/subagent-organizations/.github/workflows/_reusable-kb-validate.yml@v1
    with:
      frontmatter-schema-path: ./frontmatter.schema.json
```

WAF tradeoff guidance:

> *"Pin to major tag (`@v1`): Teams get bug fixes automatically, [risk of] breaking changes
> in minor updates if not careful. Pin to exact version (`@v1.2.3`): Full reproducibility,
> requires manual updates for every fix."*

For our scale: **major-tag pinning is right.** Children get bug fixes; the meta-repo
maintains a back-compat contract for the `v1` line.

## Change sets — `CHG-####` for cross-KB changes

When a single change spans multiple KBs (e.g. "rename Cowork → Teams across all docs"):

1. **Parent tracking issue** in this meta-repo: title `[CHG-1042] Rename Cowork → Teams`,
   labels `change-set`, `priority/p2`, body lists affected children + acceptance criteria.
2. **Child issues** auto-created in each affected KB child repo, linked back to parent
   (using GitHub Sub-issues — released GA in 2025).
3. **Branch naming** in each child: `changeset/CHG-1042/cowork-to-teams`.
4. **PR titles** include `[CHG-1042]` prefix.
5. Once all child PRs merge and tag, meta-repo manifest is bumped in a single combined PR.

We don't need a separate "integration branch" because KB content changes don't usually need
*atomic* cross-repo merges — `eventually consistent across children within an hour* is fine.

## `.gitattributes` (Option B — the right use)

```gitattributes
# .gitattributes in subagent-organizations
* text=auto eol=lf
*.md          text diff=markdown
*.json        text
package-lock.json     binary linguist-generated
REFERENCES.md          linguist-generated
src/data/*.json       merge=union     # avoid conflicts on parallel manifest bumps
.gitmodules            -text -merge   # don't auto-merge; humans must reconcile
```

`merge=union` on the manifest helps when multiple "bump KB child" PRs land near-simultaneously
— git will keep both edits side-by-side instead of conflicting on a single file.

## Bootstrap recipe — adding a 4th child KB

Once this architecture is in place, adding a new KB is a 5-minute checklist:

```bash
# 1. Create the child repo from a template (we'd ship subagentapps/kb-template)
gh repo create subagentapps/kb-claude-projects-update \
  --template subagentapps/kb-template \
  --private --description "KB for Claude Projects update"

# 2. Cut the first release (release-please will open a Release PR via the reusable workflow)
gh repo clone subagentapps/kb-claude-projects-update
cd kb-claude-projects-update
# add some content/, commit with feat:, push to main
gh pr merge --squash <release-pr>   # cuts v0.1.0

# 3. (automatic) The child's notify-meta.yml dispatches to the meta-repo,
#    which opens a bump PR adding the child to src/data/kb-manifest.json

# 4. Review + merge the bump PR. Done.
```

## What we're NOT doing (anti-patterns explicitly avoided)

Per the WAF anti-patterns page (`docs/research/github-well-architected-deep-dive.md` §10):

- ❌ **Fragmented Organization Structure** — all 3 children stay under `subagentapps`, no new org
- ❌ **Manual Deployment Processes** — `notify-meta.yml` + auto-bump PR removes the human step
- ❌ **Bypassing Code Reviews** — CODEOWNERS at both layers + reusable validation workflow
- ❌ **Inconsistent Branching Strategy** — `changeset/CHG-####/<slug>` convention enforced by ruleset
- ❌ **Treating the integration repo as a monorepo that contains code** — the polyrepo article
  calls this out specifically; KB content **never** lives here, only manifests + CI

## Build sequence (when to do what)

| Phase | Deliverable | Effort |
|---|---|---|
| **0** | Land THIS spec doc + sign off on the architecture | 30 min review |
| **1** | Ship `src/primitives/knowledge-base.ts` + `src/data/kb-manifest.json` (initial empty array) + new `kind` value | 1 hr |
| **2** | Ship `_reusable-kb-validate.yml` + matching `kb-template` repo skeleton | 2 hr |
| **3** | Create the 3 child repos from the template; populate with v0.1.0 content drawn from the blog posts | 1 hr per repo |
| **4** | Wire `notify-meta.yml` + meta-repo's `kb-bump-on-child-release.yml`; verify a manual tag propagates | 2 hr |
| **5** | Ship `_reusable-kb-release.yml`; switch each child to use it | 1 hr |
| **6** | Add `_reusable-kb-publish.yml` only if any child needs a hosted site | optional |

Every phase is independently revertible — no big-bang migration.

## Open questions to resolve before Phase 1

1. **Where do the children's blog-post sources live?** Option: each child repo gets
   `sources/blog-snapshot.md` capturing the announcement at vendor-snapshot time.
2. **Do we want CHANGELOG.md per child, or one aggregate in the meta-repo?** WAF says component
   releases are independent → per-child CHANGELOGs (each with their own `release-please`).
3. **Public or private children?** Defaulting to private, but if these become external
   reference docs, they could be public with no auth concerns (it's just notes about
   public Anthropic announcements).
4. **GitHub App for `META_DISPATCH_TOKEN`** — same `RELEASE_APP_*` pattern from the
   anthropic-cli research (`docs/research/stainless-app-bot.md`), or reuse `gh auth token`
   from a repo secret? App is cleaner; cost is a one-time setup.

## Sources

- WAF polyrepo article: https://wellarchitected.github.com/library/architecture/recommendations/implementing-polyrepo-engineering/
- Companion research: [`../research/github-well-architected-deep-dive.md`](../research/github-well-architected-deep-dive.md) §7
- Existing primitive design: [`./core/resource.md`](./core/resource.md), [`./primitives/awesome-list.md`](./primitives/awesome-list.md) (template for new `KnowledgeBase` primitive)
- Existing manifest design: [`./manifest/load.md`](./manifest/load.md), [`./manifest/render.md`](./manifest/render.md), [`./manifest/sync.md`](./manifest/sync.md)
- Bot/release pipeline patterns to copy: [`../research/stainless-app-bot.md`](../research/stainless-app-bot.md)
- Anthropic blog posts (referenced as stipulated examples; not independently fetched in this session): https://claude.com/blogs/
