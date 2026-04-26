# `subagentmcp-sdk/knowledge-base/` — typed source-of-truth catalog

Companion to: [`../orchestrator/prompt-adapter.md`](../orchestrator/prompt-adapter.md), [`../refs/SHA-PINNING.md`](../refs/SHA-PINNING.md)

## The framing

> **User prompts are not specs. They are starting points.**

A user prompt arrives with intent + maybe context. It rarely arrives with the right
canonical names, the right field values, or the right source URLs. The orchestrator's
first job — before routing to a model, before reshaping the prompt — is to **check the
knowledge base**: does the prompt reference something we already know? If yes, hydrate
the prompt with verified facts. If no, fetch the relevant source, update the KB, then
proceed.

This file defines:

1. **What the KB is** — a typed catalog of pinned sources
2. **Where the sources live** — the URL list below, with format + volatility class
3. **How "check before answer" works** — the integration into the prompt-adapter
4. **How tools are selected** — token-efficiency precedence (GraphQL-first for GitHub, etc.)

## The sources

Each source is a pinnable, machine-fetchable index of a body of knowledge. They split into
five domains:

### 1. Claude Code documentation

| Source | URL | Format | Volatility | Pinning |
|---|---|---|---|---|
| Claude Code docs index | `https://code.claude.com/docs/llms.txt` | flat `.txt` (URL list + one-liners) | medium (~weekly) | content-SHA |
| Claude Code page | any `/docs/en/<slug>.md` | markdown | per-release | content-SHA per page |
| Claude Code changelog | `/docs/en/changelog.md` | markdown | per-release | content-SHA |
| Claude Code What's-new | `/docs/en/whats-new/<week>.md` | markdown | weekly | content-SHA per week |

### 2. Anthropic platform / SDK documentation

| Source | URL | Format | Volatility |
|---|---|---|---|
| Platform docs index | `https://platform.claude.com/llms.txt` | flat `.txt` | medium |
| Platform sitemap | `https://platform.claude.com/sitemap.xml` | XML | medium |
| Anthropic site sitemap | `https://anthropic.com/sitemap.xml` | XML | low |
| Anthropic news index | (under `claude.com/sitemap.xml`) | XML | medium |

### 3. MCP (Model Context Protocol)

| Source | URL | Format | Volatility |
|---|---|---|---|
| MCP docs index | `https://modelcontextprotocol.io/llms.txt` | flat `.txt` | medium |
| MCP sitemap | `https://modelcontextprotocol.io/sitemap.xml` | XML | medium |

### 4. Support / community

| Source | URL | Format | Volatility |
|---|---|---|---|
| Support sitemap | `https://support.claude.com/sitemap.xml` | XML | medium |

### 5. Source code (npm + GitHub)

| Source | Endpoint | Format | Volatility | Tool of choice |
|---|---|---|---|---|
| npm packages under `anthropic-ai` | `https://www.npmjs.com/~anthropic-ai` (and `npm view <pkg> --json`) | JSON | high (per-release) | `npm view --json` (low-token) |
| npm packages under `modelcontextprotocol` | same shape | JSON | high | `npm view --json` |
| GitHub repos under `anthropics/*` | GraphQL `/graphql` | JSON | high | **GraphQL** (token-efficient; see §"Tool selection") |
| GitHub repos under `modelcontextprotocol/*` | same | JSON | high | GraphQL |

### Master site index

| URL | Why we list it |
|---|---|
| `https://claude.com/sitemap.xml` | Catches `/blog/*` posts not in `code.claude.com/docs` (see Cowork / Desktop / Design posts we read earlier) |

## Volatility classes

| Class | Re-pin cadence | Used for |
|---|---|---|
| **low** | quarterly | corporate pages, archived content |
| **medium** | weekly | most docs, sitemap rollups |
| **high** | per-fetch | npm releases, GitHub default branches |

The KB-keeper subagent walks each source on its cadence; emits a drift PR when content
SHA changes.

## How "check before answer" works

The prompt-adapter algorithm gains a **pass 0** before its existing six passes:

```
user prompt (raw)
   ↓
[ pass 0: KB check ]
   ↓
   - identify nouns/proper-names in the prompt
   - look each up in the KB index (in-memory map of source → known names → SHA)
   - if all referents are KB-known: hydrate prompt with canonical names + URLs
   - if any referent is unknown: queue a KB-update request, then either
       (a) proceed with caveat ("the term X isn't in our KB — adapter will note this"),
       (b) block + ask user to confirm spelling, or
       (c) fan out a doc-scout subagent to find the canonical name first
   ↓
[ existing passes 1-6 ]
   ↓
formatted prompt → subagent
```

`(a)` is the default for low-stakes; `(b)` is for ambiguous terms; `(c)` is for the
common case ("user mentioned a flag name we don't have yet").

The KB itself lives at:

```
src/subagentmcp-sdk/knowledge-base/
├── index.ts              ← typed KbIndex with all sources
├── sources/
│   ├── code-claude-llms-txt.ts        ← parses /docs/llms.txt; exposes .pages[]
│   ├── platform-claude-llms-txt.ts
│   ├── modelcontextprotocol-llms-txt.ts
│   ├── claude-com-sitemap.ts          ← parses sitemap XML; exposes .urls[]
│   ├── anthropic-com-sitemap.ts
│   ├── platform-claude-sitemap.ts
│   ├── support-claude-sitemap.ts
│   ├── mcp-io-sitemap.ts
│   ├── npm-anthropic-ai.ts            ← npm registry view; exposes .packages[].versions[]
│   ├── npm-modelcontextprotocol.ts
│   ├── github-anthropics.ts           ← GraphQL; exposes .repos[].defaultBranch
│   └── github-modelcontextprotocol.ts
├── pinned-shas.json      ← SHA-256 per source URL, machine-managed
└── kb-cache.sqlite       ← parsed indexes; rebuilt on drift
```

`index.ts` exports a single `KbIndex` object the prompt-adapter consumes:

```ts
export interface KbSource {
  id: string;                          // 'code-claude-llms-txt'
  url: string;
  format: 'llms-txt' | 'sitemap' | 'npm-registry' | 'github-graphql';
  volatility: 'low' | 'medium' | 'high';
  lastFetched: string;                 // ISO 8601
  pinnedSha256: string;
  /** Parsed pages/urls/packages — schema varies by format */
  contents: KbContents;
}

export interface KbIndex {
  sources: Record<string, KbSource>;
  /**
   * Reverse index: given a noun phrase, which sources mention it?
   * Built from .contents at parse time.
   */
  termIndex: Map<string, string[]>;    // term → source ids

  /** Fast lookup the prompt-adapter uses on every prompt */
  has(term: string): { found: boolean; sources: string[]; canonicalName?: string };
}
```

`termIndex` is a normalized lower-case noun-phrase map. Hits include canonical-name
correction (e.g., user types "claud-code-oauth-token", lookup finds `CLAUDE_CODE_OAUTH_TOKEN`).

## Tool selection — token efficiency first

The user's principle: **prefer GraphQL for GitHub repository exploration over `gh api`,
`gh CLI`, or `gh MCP`**, unless a different tool wins on latency *or* memory *or* tokens.

We make this measurable. Every fetch tool gets a budget in `tokens-per-useful-byte`,
where "useful bytes" = the bytes the LLM actually consumes after parsing.

### Per-tool measured efficiency (initial; refine empirically)

| Tool | Use case | Tokens per useful byte | Latency | Memory |
|---|---|---|---|---|
| **GraphQL** (`mcp__plugin_github_github__*` GraphQL queries) | precisely-shaped repo / commit / file queries | **0.3** (best) | medium | low |
| `gh api` REST | full-object responses with much overhead | 1.2 | medium | low |
| `gh CLI` (`gh repo view`, `gh pr list`) | rendered output with formatting | 0.9 | medium | low |
| `gh` MCP plugin tools (REST under the hood) | same as `gh api` for our purposes | 1.0 | low | medium |
| `git ls-remote` + `git archive` | fetching a single ref's tree/blob | 0.4 | high | low |
| `npm view <pkg> --json` | npm package metadata | 0.5 | low | low |
| `curl <url>` (raw) | flat .txt / sitemap / .md | 1.0 | low | low |
| `WebFetch` (with HTML→summary) | rendered HTML pages | **3.5 (worst)** | high | high |
| `subagent-html` (Crawlee + Readability + markdown-it) | HTML pages, post-implementation | 0.8 | medium | medium |
| `subagent-md` (passthrough) | docs `.md` URLs | 1.0 | low | low |

### Selection rule

```
For each fetch task, the SDK picks the tool with the lowest:
  score = w_t * tokens_per_useful_byte + w_l * latency_seconds + w_m * memory_mb
With weights:
  w_t = 1.0   (tokens are the primary cost on Max plan)
  w_l = 0.05  (latency matters but less than tokens)
  w_m = 0.001 (memory rarely binds for our workloads)
```

For GitHub repo exploration: **GraphQL wins by a factor of ~3-4× over REST**. The
SDK defaults to GraphQL.

Override if any of:
- The task needs a feature only available via REST (some endpoints don't have GraphQL equivalents)
- The latency penalty matters more than tokens (synchronous dev-loop step)
- The repo's GraphQL access is rate-limited harder than REST in the moment

### Concrete GraphQL queries the SDK exposes

```ts
// src/subagentmcp-sdk/knowledge-base/sources/github-anthropics.ts

const REPO_LIST_QUERY = `
  query OrgRepos($owner: String!, $first: Int!) {
    organization(login: $owner) {
      repositories(first: $first, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          name
          description
          defaultBranchRef { name target { ... on Commit { oid committedDate } } }
          updatedAt
          pushedAt
        }
      }
    }
  }
`;
```

**Token cost of this query**: ~50 tokens of GraphQL string + ~300 tokens of typed JSON
response for 30 repos. Compare to `gh api orgs/anthropics/repos`: ~50 tokens of URL +
**~5,000 tokens of raw JSON** (every repo carries dozens of fields we don't use).

10× saving on a single query, scaled across the daily polling we'd do for drift detection,
adds up.

## What lives in the KB vs. what's fetched on demand

| Content | In KB? | Why |
|---|---|---|
| Page **titles + URLs + one-liners** from llms.txt | yes | Always fits; needed for routing |
| Sitemap **URL list** | yes | Same — small, navigational |
| **Canonical names** (env vars, flag names, settings keys, frontmatter fields) | yes | These are what the prompt-adapter checks against |
| **Full page bodies** of `code.claude.com/docs/en/<slug>.md` | NO — fetch on demand | Too big; cache to bloom-filter cache instead |
| **npm package metadata** (name, current version, repo URL) | yes | Tiny per package |
| **Full `package.json`** for each | NO — fetch on demand | Verbose |
| GitHub repo **default branch + last commit SHA** | yes | Tiny |
| GitHub **file contents** | NO — fetch on demand | Already in our `vendor/anthropic/` for the repos we care about |

Net KB size on disk: **~50–200 KB** total. Fits comfortably in memory.

## Refresh cadence per source

```ts
// scripts/refresh-kb.ts (planned)

const cadence: Record<string, number> = {
  // hours between refreshes
  'code-claude-llms-txt':           24,    // weekly is too rare; daily is the right cadence
  'platform-claude-llms-txt':       24,
  'modelcontextprotocol-llms-txt':  24,
  'claude-com-sitemap':             24,
  'anthropic-com-sitemap':         168,    // weekly — corp pages
  'platform-claude-sitemap':        24,
  'support-claude-sitemap':         72,
  'mcp-io-sitemap':                 24,
  'npm-anthropic-ai':                6,    // 4× daily — releases happen often
  'npm-modelcontextprotocol':        6,
  'github-anthropics':              12,    // 2× daily — graphql is cheap
  'github-modelcontextprotocol':    12,
};
```

A nightly GitHub Actions workflow runs the refresh, opens a PR with the SHA bumps, and
includes a diff summary so a human can sanity-check the changes.

## Integration with prompt-adapter

The adapter's pass 0 (KB check) walks like this:

```ts
// Within adaptPrompt(input):

// Pass 0: KB check
const terms = extractNounPhrases(input.rawPrompt);
const kbHits = terms.map(t => kb.has(t));
const unknownTerms = kbHits.filter(h => !h.found).map(h => h.term);
const correctedTerms = kbHits.filter(h => h.canonicalName && h.canonicalName !== h.queriedAs);

if (unknownTerms.length > 0) {
  // depending on stakes, queue KB update OR ask user OR proceed with warning
  return { ..., warnings: [...warnings, `unknown terms: ${unknownTerms.join(', ')}`] };
}

if (correctedTerms.length > 0) {
  // hydrate prompt: replace user's typo'd term with the canonical
  rawPrompt = applyCorrections(rawPrompt, correctedTerms);
}

// continue to passes 1-6...
```

## When to update the KB

The user's instruction was: *"the subagent checks knowledge or updates knowledge."* The
update path is owned by **`kb-keeper`** (a new subagent). It runs on three triggers:

1. **Prompt-adapter found unknown term + user confirmed it's a real thing** — kb-keeper
   fetches the relevant source, indexes it, returns
2. **Scheduled refresh** — daily / weekly per cadence above
3. **Explicit invocation** — *"use kb-keeper to refresh the npm anthropic-ai catalog"*

`kb-keeper` is read+write. It can edit `pinned-shas.json` and `kb-cache.sqlite`. It runs
the GraphQL queries, the `npm view --json` calls, the curl-fetches.

`doc-scout` stays read-only — it queries the KB and the underlying docs, but never
mutates KB state.

## Anti-patterns

| Anti-pattern | Replace with |
|---|---|
| Hard-code the source URLs in 6 different files | Single `index.ts` exports them; everything else imports |
| Re-fetch the full llms.txt every prompt | Memory-cached, only re-fetched on cadence or drift |
| Fetch a full doc page just to learn the canonical flag name | Pre-extract canonical names into the term index at refresh time |
| Use `gh api` because it's the default `gh CLI` invocation | GraphQL is preferred unless the operation isn't supported there |
| Mix corporate site pages (anthropic.com/news) with technical docs (code.claude.com/docs) | Separate sources with separate volatility; refresh independently |
| Trust the KB index without SHA-pinning | Every source has a `pinnedSha256`; drift = block + human review |

## Why this matters specifically for our session

This session burned ~80k tokens on WAF library pages, ~250k on the LSP spec, ~30k on
Cowork blog soup. **All of these would have been small-token KB lookups** if the KB
existed:

- WAF page titles: would be in `code-claude-llms-txt` — wait, no, that's a different
  domain. Actually `github.com/github/github-well-architected` would map to a GraphQL
  query against `github`. Fine — would still have been ~300 tokens via GraphQL vs. 80k via WebFetch
- LSP spec: would be a single SHA-pinned ref; we'd fetch the version SHA + read offsets
  for the ~5 sections we actually needed
- Cowork blog: in `claude-com-sitemap`; the body fetched once via `subagent-html` post-readability

## Sources for the sources

| Source-list URL | Authority |
|---|---|
| https://code.claude.com/docs/llms.txt | Anthropic-published, the "doc index" convention |
| https://platform.claude.com/llms.txt | Anthropic-published platform variant |
| https://modelcontextprotocol.io/llms.txt | MCP-published |
| `*.com/sitemap.xml` | Web standard (sitemaps.org) |
| npm registry | Public npm.org API |
| GitHub GraphQL | docs.github.com/en/graphql |

All open-access. No auth required for fetch (npm + GraphQL allow anonymous read of public
packages/repos at lower rate limits than authenticated; we authenticate via gh CLI when
possible to raise the rate limit).

## Related

- [`../orchestrator/prompt-adapter.md`](../orchestrator/prompt-adapter.md) — consumer of the KB
- [`../refs/SHA-PINNING.md`](../refs/SHA-PINNING.md) — same pinning discipline applied here
- [`../tools/crawlee-content-layer.md`](../tools/crawlee-content-layer.md) — fetcher of last resort for HTML pages
- [`../../../../.claude/agents/kb-keeper.md`](../../../../.claude/agents/kb-keeper.md) — the subagent that maintains all this
