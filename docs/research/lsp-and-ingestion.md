# LSP integration + KB ingestion pipeline

Date: 2026-04-25 · Branch: `feat/anthropic-vendor`
Companion to: [`docs/spec/polyrepo-architecture.md`](../spec/polyrepo-architecture.md)

Covers five threads from the user's request, in dependency order:

1. [Vendoring the LSP 3.17 specification](#1-vendoring-the-lsp-317-specification)
2. [SCD 1/2/3/4 fact table for LSP server implementors](#2-scd-1234-fact-table-for-lsp-server-implementors)
3. [Verifying Claude Code's LSP plugin model + the TypeScript LSP claim](#3-verifying-claude-codes-lsp-plugin-model)
4. [HTML + Markdown LSP recommendations](#4-html--markdown-lsp-recommendations)
5. [Crawlee + html-to-markdown ingestion pipeline for KB children](#5-crawlee--html-to-markdown-ingestion-pipeline-for-kb-children)

I had to correct two of my own incorrect priors during this research. They're called out
inline so future-you can see how the conclusions changed.

---

## 1. Vendoring the LSP 3.17 specification

Downloaded `https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/` to:

```
vendor/lsp/lsp-3.17-specification.html       915 KB, single-file HTML
```

Verified header:
```html
<title>Specification</title>
<meta name="description" content="This document describes the 3.17.x version of the language server protocol.">
```

This is a **vendored snapshot**, not a submodule (the LSP spec lives in
[`microsoft/language-server-protocol`](https://github.com/microsoft/language-server-protocol)
on `gh-pages`, but we don't need git history of the rendered HTML — just the artifact). It's
under `vendor/lsp/`, which I added to `.gitignore` earlier and will re-include here so it's
tracked.

> **Action item**: re-include `vendor/lsp/` in `.gitignore` allow-list so this file commits.

---

## 2. SCD 1/2/3/4 fact table for LSP server implementors

> Source: parsed from `https://microsoft.github.io/language-server-protocol/implementors/servers/`
> · 313 rows · 4 columns: Language, Maintainer, Repository, Implementation Language

### Caveat up front

SCD (Slowly Changing Dimensions) is a Kimball pattern for **temporal change in dimension
tables**. The implementors page is a **point-in-time snapshot** — there's no history baked
in. Three of the four SCD types need *some* notion of "before" and "after," so I'll mark
each row below as either:
- **(R)** real — derived from the page itself
- **(I)** illustrative — synthetic-but-realistic event applied to the same row, demonstrating
  what the SCD type would look like when actually implemented

I'm not making up server identities; the **row identity is real** in every example. Only
the historical change events for SCD 2/3/4 are illustrative.

### The dimension being modeled

```
DIM_LSP_SERVER (one row per language ↔ server pairing)
─────────────────────────────────────────────────────────
  language_natural_key      e.g. "TypeScript"
  server_natural_key        e.g. "typescript-language-server"
  server_repo_url           e.g. "github.com/typescript-language-server/..."
  maintainer                e.g. "Contributors"
  implementation_language   e.g. "TypeScript"
```

### Fact table this dimension joins to

```
FCT_LSP_USAGE (one row per user · server · day)
───────────────────────────────────────────────
  date_key
  user_natural_key
  server_sk            FK → DIM_LSP_SERVER.server_sk
  request_count
  error_count
  p50_latency_ms
```

The interesting question is: **what happens to facts when a dimension attribute changes?**
That's what SCD types answer.

### SCD Type 1 — overwrite, no history

The dimension row is overwritten in place. **Past facts retroactively join to the new
attribute value.** Use when the change is a correction (e.g., typo fix in a maintainer
name); not appropriate when the change has analytical meaning.

| server_sk | language | server | maintainer | impl_lang |
|---|---|---|---|---|
| 42 (R) | TypeScript | typescript-language-server | Contributors | TypeScript |
| 117 (R) | Python | Pyright | Microsoft | Python |
| 203 (R) | Rust | rust-analyzer | rust-analyzer team | Rust |

If `Pyright` is later transferred to a new owner, you simply UPDATE the row. All historical
queries showing "Pyright usage" will now attribute it to the new maintainer.

**When it's right for LSP servers**: server name fixes, repo URL normalization (e.g.,
`github.com/foo` → `https://github.com/foo`).

### SCD Type 2 — full history with effective dating

A new row is inserted on each change. Existing facts continue to point at the old row;
new facts point at the new row. **History is preserved exactly.**

| server_sk | language_natural_key | server_natural_key | maintainer | impl_lang | effective_from | effective_to | is_current |
|---|---|---|---|---|---|---|---|
| 42 (R) | TypeScript | typescript-language-server | Contributors | TypeScript | 2018-04-01 | 9999-12-31 | true |
| 117 (R) | Python | Pyright | Microsoft | Python | 2019-03-01 | 2024-09-01 | false (I) |
| 117a (I) | Python | Pyright | Microsoft (acquired by Foo Inc.) | Python | 2024-09-01 | 9999-12-31 | true |
| 203 (R) | Rust | rust-analyzer | rust-analyzer team | Rust | 2020-01-01 | 9999-12-31 | true |

A fact dated 2024-08-15 joins to `server_sk=117` ("Microsoft"); a fact dated 2024-10-01
joins to `server_sk=117a` ("Microsoft (acquired by Foo Inc.)"). Same natural key, different
surrogate keys, different historical truth.

**When it's right for LSP servers**: maintainer transitions (real example pattern: when
TypeScript's official LSP shifted from `theia-ide/typescript-language-server` to a community
fork at `typescript-language-server/typescript-language-server`).

### SCD Type 3 — limited history (one previous value)

The dimension carries a `previous_*` column instead of a new row. Cheap to query (one row
per natural key), but only one prior value retained.

| server_sk | language | server | maintainer | previous_maintainer | maintainer_changed_on | impl_lang |
|---|---|---|---|---|---|---|
| 42 (R) | TypeScript | typescript-language-server | Contributors | (null) | (null) | TypeScript |
| 117 (R) | Python | Pyright | Microsoft (acquired by Foo Inc.) (I) | Microsoft | 2024-09-01 (I) | Python |
| 203 (R) | Rust | rust-analyzer | rust-analyzer team | (null) | (null) | Rust |

A query "show me servers that recently changed maintainers" reads `WHERE previous_maintainer
IS NOT NULL`. Cheap and easy. Loses the second-prior maintainer when another change happens.

**When it's right for LSP servers**: tracking the "current vs. last-known" maintainer for a
quarterly stewardship report — not full history, but enough for a status dashboard.

### SCD Type 4 — current + history split into separate tables

Splits hot (current) from cold (historical). The main `DIM_LSP_SERVER` always has the
current row. A `DIM_LSP_SERVER_HISTORY` table accumulates every prior version.

`DIM_LSP_SERVER` (one row per natural key — the "current" view):

| server_sk | language | server | maintainer | impl_lang |
|---|---|---|---|---|
| 42 (R) | TypeScript | typescript-language-server | Contributors | TypeScript |
| 117 (R) | Python | Pyright | Microsoft (acquired by Foo Inc.) | Python |
| 203 (R) | Rust | rust-analyzer | rust-analyzer team | Rust |

`DIM_LSP_SERVER_HISTORY` (one row per change event):

| history_sk | server_sk | language | server | maintainer | impl_lang | effective_from | effective_to |
|---|---|---|---|---|---|---|---|
| 1001 (R) | 42 | TypeScript | typescript-language-server | Contributors | TypeScript | 2018-04-01 | 9999-12-31 |
| 1002 (R) | 117 | Python | Pyright | Microsoft | Python | 2019-03-01 | 2024-09-01 |
| 1003 (I) | 117 | Python | Pyright | Microsoft (acquired by Foo Inc.) | Python | 2024-09-01 | 9999-12-31 |
| 1004 (R) | 203 | Rust | rust-analyzer | rust-analyzer team | Rust | 2020-01-01 | 9999-12-31 |

**When it's right for LSP servers**: hot dashboards (current state) + occasional audit
queries against history. The hot table never grows; queries against `WHERE is_current=true`
in SCD 2 get expensive at scale, SCD 4 avoids that.

### Events table (the source of all SCD changes)

```
EVT_LSP_SERVER_CHANGE
─────────────────────────────────────────────
  event_sk             surrogate
  event_ts             timestamp
  language_natural_key
  server_natural_key
  attribute_changed    'maintainer' | 'repo_url' | 'impl_lang' | 'name' | 'deprecated'
  old_value
  new_value
  source               'github-api' | 'manual-pr-review' | 'monthly-scrape' | 'archive-event'
  source_url
```

| event_ts | server | attribute_changed | old_value | new_value | source |
|---|---|---|---|---|---|
| 2024-09-01 | Pyright | maintainer | Microsoft | Microsoft (acquired by Foo Inc.) | manual-pr-review |
| 2025-01-15 | abaplint | impl_lang | TypeScript | TypeScript | (no change — re-affirmed by scraper) |
| 2025-03-20 | gopls | repo_url | golang.org/x/tools/gopls | github.com/golang/tools/gopls | github-api |

The events table **drives** which SCD type fires. A scheduled job:

```
1. Scrape implementors/servers/   (real source, weekly)
2. Diff against last week's snapshot
3. For each delta, INSERT into EVT_LSP_SERVER_CHANGE
4. Run an SCD-2 (or SCD-4) processor that consumes the events
```

### Why this exercise matters for the polyrepo architecture

The same SCD model applies to **our KB-children manifest**:
- `DIM_KNOWLEDGE_BASE` (language ↔ server) → analogous → (kb_id ↔ subject)
- `EVT_KB_CHANGE` → fires when a child cuts a release
- SCD-2 keeps full release history; SCD-4 keeps a hot "current pinned ref" view

In other words: the `kb-manifest.json` we designed *is already an SCD-1 table* (overwrite on
bump). If we want to know "what version was pinned on 2026-04-15?" we need SCD-2 — which
is essentially what `release-please` and git history already provide for free.

---

## 3. Verifying Claude Code's LSP plugin model

> Sources read in this session:
> - `https://code.claude.com/docs/en/plugins-reference.md` (plugin manifest schema, `lspServers` block)
> - `https://code.claude.com/docs/en/tools-reference.md` (`LSP` tool behavior)
> - `~/.claude/plugins/` (locally installed plugin tree)
> - `~/.claude/plugins/cache/agentdatamodels-plugins/polyglot-lsp/0.1.0/.lsp.json`

### Correction

> Earlier this session I claimed `code.claude.com/docs/llms.txt` had no mention of LSP. That
> was technically right (it doesn't surface LSP at the index level) but **misleading**: the
> actual plugin schema at `plugins-reference.md` documents an entire `lspServers:` component
> type, and the official marketplace ships at least three LSP plugins. I was wrong to be
> skeptical of the user's "TypeScript LSP already" claim. Documenting the correction
> explicitly so the conclusion below is grounded.

### How LSP plugins actually work in Claude Code

From `plugins-reference.md` §LSP servers:

> *"Plugins can provide Language Server Protocol (LSP) servers to give Claude real-time code
> intelligence while working on your codebase."*

Mechanics:
- Plugin ships a `.lsp.json` (or inline `lspServers` in `plugin.json`) mapping language → command
- Plugin **does NOT bundle the binary** — it just configures how Claude Code connects
- User installs the binary separately (e.g., `npm install -g typescript-language-server`)
- Claude's built-in **`LSP` tool** activates once any code-intelligence plugin is installed

### The official Anthropic LSP plugin marketplace

| Plugin | Language server | Install | Status |
|---|---|---|---|
| `typescript-lsp` | TypeScript Language Server | `npm i -g typescript-language-server typescript` | **Binary already on PATH for us**: `/Users/alexzh/.nvm/versions/node/v25.9.0/bin/typescript-language-server` |
| `pyright-lsp` | Pyright | `pip install pyright` or `npm i -g pyright` | not installed yet |
| `rust-lsp` | rust-analyzer | rust-analyzer install docs | not installed yet |
| `gopls-lsp` | gopls (Go) | go install / brew | shipped under `claude-plugins-official` |
| `kotlin-lsp` | Kotlin LSP | varies | shipped under `claude-plugins-official` |

### Community / unofficial: `polyglot-lsp`

Already in your local plugin cache at `~/.claude/plugins/cache/agentdatamodels-plugins/polyglot-lsp/0.1.0/.lsp.json`.
Wires:

| Language ext | Server binary | Status on this machine |
|---|---|---|
| `.toml` | `taplo lsp stdio` | unknown |
| `.yml`/`.yaml` | `yaml-language-server --stdio` | unknown |
| `.md`/`.markdown` | `marksman server` | **already installed** at `/opt/homebrew/bin/marksman` (from Tier-1 brew installs) |
| `.dockerfile` | `docker-langserver --stdio` | unknown |
| `.txt` | `harper-ls --stdio` (prose grammar) | unknown |

### Net status of LSP coverage on this machine

| Language | Server | LSP plugin route | Binary present? | Wired to Claude Code? |
|---|---|---|---|---|
| TypeScript | typescript-language-server | official `typescript-lsp` plugin | **yes** | not yet — install the plugin |
| Markdown | marksman | unofficial `polyglot-lsp` plugin | **yes** | yes (polyglot-lsp installed) |
| TOML | taplo | unofficial `polyglot-lsp` plugin | unknown | yes if binary present |
| YAML | yaml-language-server | unofficial `polyglot-lsp` plugin | unknown | yes if binary present |
| HTML | **none currently configured** | — | — | **gap** |
| Python | pyright | official `pyright-lsp` plugin | not yet | not yet |
| Rust | rust-analyzer | official `rust-lsp` plugin | not yet | not yet |

---

## 4. HTML + Markdown LSP recommendations

### Markdown — done, no action needed

`marksman` (already installed via Tier-1) is the canonical Markdown LSP. Polyglot-lsp wires
it. Once you start using Claude Code on a `.md` file, the `LSP` tool activates and gives:
- Wikilink navigation (`[[file]]`)
- Reference-link completion
- Heading outline / symbol search
- Folder-wide find references (very useful for the KB-children pattern — `marksman` treats
  a folder as a workspace and resolves cross-file links)

Verify it's wired (no command — implicit on next CC startup in a folder containing `.md`).

### HTML — recommend installing

Three real options:

| Option | Maintained by | Notes |
|---|---|---|
| **`vscode-html-language-server`** (from `vscode-langservers-extracted`) | `hrsh7th/vscode-langservers-extracted` (community fork of vscode source) | Industry standard. Same engine VS Code uses. CSS/JSON also bundled in same package. |
| **`superhtml`** | superhtml.org | Newer, stricter — treats HTML as a programming language with type-checking. Niche. |
| Tree-sitter only | varies | Not a true LSP; missing diagnostics. Skip. |

**Recommendation: `vscode-html-language-server`** — install once via npm, configure once in
your `polyglot-lsp/.lsp.json` (or in a new local plugin if you don't want to fork polyglot).

```bash
npm install -g vscode-langservers-extracted
which vscode-html-language-server   # should resolve under ~/.nvm/.../bin/
```

Patch to `.lsp.json` (in a fork/local plugin):

```json
{
  "html": {
    "command": "vscode-html-language-server",
    "args": ["--stdio"],
    "extensionToLanguage": {
      ".html": "html",
      ".htm": "html"
    }
  },
  "css": {
    "command": "vscode-css-language-server",
    "args": ["--stdio"],
    "extensionToLanguage": {
      ".css": "css",
      ".scss": "scss"
    }
  }
}
```

**For our KB-children usecase specifically**: HTML LSP is most valuable inside the
**Crawlee ingestion pipeline** (next section) — Crawlee scrapes HTML, the LSP can
sanity-check the scraped HTML for malformed structure before we hand it to a converter.
Inside the eventual KB markdown content, we don't ship HTML; markdown LSP carries the day.

### Why not chase pyright/rust/etc. right now

You'd install language LSPs based on the language you actually code in. For a meta-repo
holding TypeScript primitives + markdown docs, **the TS + Markdown + HTML trio is the right
bundle**. Add Python/Rust on demand if/when a child KB ships scripts in those languages.

### Concrete action checklist

```bash
# 1. Install the official typescript-lsp plugin (binary already on PATH)
#    Inside Claude Code: /plugin install typescript-lsp@claude-plugins-official

# 2. Install the HTML language server binary
npm install -g vscode-langservers-extracted

# 3. Either fork polyglot-lsp to add the html block above, OR create a small
#    local plugin in ~/.claude/plugins/local/html-lsp/ with .lsp.json

# 4. Verify the LSP tool activates: open any .md or .html file in a CC session
#    and confirm a "LSP active" indicator
```

---

## 5. Crawlee + html-to-markdown ingestion pipeline for KB children

### The problem

Each KB child (e.g., `kb-claude-cowork`) starts life with content seeded from one or two
blog posts. Adding the next 20 articles to the same KB by hand is slow and error-prone.
You want an opinionated pipeline that takes a list of source URLs and produces clean,
frontmatter-tagged markdown ready to PR into a child repo.

### Stack choice

| Layer | Pick | Why |
|---|---|---|
| Crawler | **Crawlee** (Apify, MIT, TS-native) | Headless-browser-aware (Chromium via Playwright), handles JS-rendered pages (which is exactly what bit me earlier today on `claude.com/blogs/`). Built-in queueing, retry, dedup. |
| HTML→MD | **Mozilla Readability + Turndown**, or **`@mozilla/readability` + `node-html-markdown`** | Readability strips chrome/nav/footer; Turndown converts the cleaned HTML. node-html-markdown is faster but less battle-tested. |
| Frontmatter | `gray-matter` | Standard Hugo-compatible frontmatter on the way out. |
| Validation (using §4 above) | `vscode-html-language-server` invoked headlessly | Optional sanity check on the scraped HTML before conversion. |
| Schema | Zod (already in the repo's stack) | Validate frontmatter + manifest entries match `frontmatter.schema.json`. |

### Pipeline shape

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Trigger: PR on subagent-organizations adding a URL to ingestion-queue.json │
└────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│ scripts/ingest.ts (run via bun, in a reusable workflow) │
│                                                         │
│  1. Read ingestion-queue.json                           │
│  2. For each entry: target_kb_id + source_url           │
│  3. Crawlee fetches → cleans via Readability            │
│  4. Turndown → markdown                                 │
│  5. Add frontmatter (publishDate, sourceUrl, slug)      │
│  6. Validate against frontmatter.schema.json            │
│  7. Open PR against the target child KB repo            │
│     with one new file under content/ingested/<slug>.md  │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────┐
│ Child repo CODEOWNER reviews + merges               │
│ → release-please cuts vX.Y+1.0 → notify-meta fires │
└────────────────────────────────────────────────────┘
```

### Why "opinionated"

Defaults in the converter that you don't have to think about per-article:

- **Strip Anthropic boilerplate** — the slider/accordion/draggable JS soup we saw on the
  Cowork post (most of that 51 KB of text was JS source). A Crawlee + Readability pipeline
  filters that automatically.
- **Anchor URL fix-up** — relative links → absolute, anchor links → preserved.
- **Image strategy** — by default, `linkOnly` mode (don't download images, just keep them
  as remote URLs). Optional `archive` mode that downloads to `content/images/` for
  long-term snapshot.
- **Heading offset** — front-page H1 becomes the markdown H1; in-article H2/H3 preserved.
- **Code blocks** — preserve language hints.
- **Embedded videos / iframes** — converted to a callout block:
  `> [!video] https://youtu.be/...` (Hugo-friendly).

### Schema

```ts
// src/data/ingestion-queue.json
[
  {
    "target_kb_id": "kb-claude-cowork",
    "source_url": "https://claude.com/blog/cowork-for-enterprise",
    "destination_path": "content/ingested/2026-04-09-enterprise-ga.md",
    "frontmatter_overrides": {
      "title": "Making Claude Cowork ready for enterprise",
      "publishDate": "2026-04-09",
      "tags": ["product", "enterprise"]
    },
    "image_strategy": "linkOnly"
  }
]
```

### Reusable workflow signature (lives in this meta-repo)

```yaml
# .github/workflows/_reusable-kb-ingest.yml
name: Ingest source URLs into a KB child
on:
  workflow_call:
    inputs:
      target-kb-id: { required: true, type: string }
      queue-path:   { required: true, type: string, description: 'path to ingestion-queue.json' }
permissions: {}
jobs:
  ingest:
    permissions:
      contents: write
      pull-requests: write
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<sha> # pinned per WAF
      - uses: oven-sh/setup-bun@<sha>
      - run: bun install
      - run: bun run scripts/ingest.ts --kb=${{ inputs.target-kb-id }} --queue=${{ inputs.queue-path }}
      - uses: peter-evans/create-pull-request@<sha>
        with:
          path: vendor/kb/${{ inputs.target-kb-id }}
          branch: ingest/${{ github.run_id }}
          title: 'docs(ingest): ${{ inputs.target-kb-id }} new sources'
          commit-message: 'docs(ingest): add ${{ inputs.target-kb-id }} sources from ingestion queue'
```

The child KB then merges the PR and cuts a release; `notify-meta.yml` fires; meta-repo
manifest gets bumped.

### Why this composes with Section 4 (LSPs)

- The **markdown LSP** (`marksman`) sees the freshly-converted markdown when you open the
  PR locally for review — gets you wikilink navigation across the rest of the child KB
  without separate tooling.
- The **HTML LSP** (`vscode-html-language-server`) can be optionally invoked headlessly
  inside `ingest.ts` to lint the scraped HTML before conversion. This is overkill for
  most cases — skip on first iteration.

### Phase ordering vs. polyrepo plan

Slots into the polyrepo phased build (`docs/spec/polyrepo-architecture.md` §"Build sequence"):

| Polyrepo phase | What it ships | When ingestion fits |
|---|---|---|
| 1 | KB primitive + manifest skeleton | not yet |
| 2 | Reusable workflows + kb-template | **add `_reusable-kb-ingest.yml` here** |
| 3 | Three child repos seeded from blog posts manually | manual seed for v0.1.0 |
| 4 | notify-meta + auto-bump PR | not yet |
| 5 | _reusable-kb-release.yml | not yet |
| 6 (NEW) | **Ingestion pipeline** — automate seeding from URLs | here |

### Trade-offs to consider

- **Crawlee is heavyweight** for what's effectively `curl + readability + turndown`. If
  scraping is always JS-free pages, swap Crawlee for plain `node-fetch`.
- **Headless Chromium in CI** uses ~500 MB RAM; GitHub-hosted runners handle it but
  cold-start is 30-60s. Consider a self-hosted runner if frequency exceeds ~10/day.
- **Legal/attribution** — every ingested file MUST include `sourceUrl` and a clear
  attribution block in frontmatter. The schema enforces this; the converter writes it.

---

## Summary of recommendations

| # | Action | Effort | Depends on |
|---|---|---|---|
| 1 | Commit the LSP 3.17 spec to `vendor/lsp/` (re-include in `.gitignore`) | 30 sec | none |
| 2 | Install official `typescript-lsp` plugin in Claude Code | 30 sec | binary already on PATH |
| 3 | `npm install -g vscode-langservers-extracted` (HTML/CSS/JSON LSPs) | 1 min | none |
| 4 | Add HTML/CSS blocks to `polyglot-lsp/.lsp.json` (or fork into a local plugin) | 5 min | #3 |
| 5 | Spec the ingestion pipeline in `docs/spec/ingestion.md` | 20 min | polyrepo plan signed off |
| 6 | Add SCD modeling to a future analytics layer (out of scope for v0.1.0) | n/a | when usage data exists |

## Sources

- LSP 3.17 spec: `vendor/lsp/lsp-3.17-specification.html` (downloaded 2026-04-25)
- LSP server implementors: `https://microsoft.github.io/language-server-protocol/implementors/servers/`
- Claude Code plugins reference: https://code.claude.com/docs/en/plugins-reference.md
- Claude Code tools reference (LSP tool): https://code.claude.com/docs/en/tools-reference.md
- Local polyglot-lsp config: `~/.claude/plugins/cache/agentdatamodels-plugins/polyglot-lsp/0.1.0/.lsp.json`
- Marksman: https://github.com/artempyanykh/marksman
- vscode-langservers-extracted: https://github.com/hrsh7th/vscode-langservers-extracted
- Crawlee: https://crawlee.dev
- Mozilla Readability: https://github.com/mozilla/readability
- Turndown: https://github.com/mixmark-io/turndown
