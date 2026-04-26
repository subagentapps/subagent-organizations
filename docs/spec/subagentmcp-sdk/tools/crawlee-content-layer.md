# `tools/` — the crawlee-based content layer

Replaces ad-hoc WebFetch / WebSearch usage in our scripts. Routes all external content
through a typed pipeline that **converts to markdown before content reaches the LLM
context** and **dedups via bloom filter** so the same page never burns context twice.

## Why this exists (the bugs we already hit)

| Bug | This layer's fix |
|---|---|
| Cowork blog post pulled 51 KB of slider/draggable JS as "page text" — ~30k tokens of pure noise | Mozilla Readability + markdown-it preprocessing strips chrome/scripts |
| LSP 3.17 spec downloaded in full (915 KB / ~250k tokens) | Section-aware reader with byte budget; bloom-filter cache |
| `code.claude.com/docs/en/sub-agents.md` fetched twice in two different turns | Content-hash bloom filter; second fetch returns `null` from cache |
| WebFetch failing on JS-heavy pages (claude.ai/blogs returned 403) | Crawlee uses Playwright headless Chromium for JS-rendered pages |
| Manual HTML grepping with no schema validation | Outputs are typed `HTMLReadResult` with `sourceSha256` ready for ref pinning |
| Untrusted external content can carry prompt-injection payloads (e.g. hidden `Ignore previous instructions...` in scraped HTML) | `parry` scans every reader's output before LLM context exposure (see "parry integration" section) |

## The four readers

| Reader | When | Output |
|---|---|---|
| `subagent-html` | HTML pages (most docs, blog posts) | Markdown via Readability + markdown-it |
| `subagent-js` | Pages where the *data* is in JS (e.g., context-window.md's `EVENTS` array) | Extracted typed data structures |
| `subagent-xml` | Atom/RSS feeds, sitemaps, OpenAPI XML | Markdown via xml2js + xslt or direct schema parse |
| `subagent-md` | Markdown sources (raw GitHub, docs `.md` URLs) | Passthrough with frontmatter normalization |

All four conform to `ContentReader<TOpts, TResult>` from `tools/types.ts`.

## Pipeline (single fetch)

```
url
  ↓
[bloom check]                    ← short-circuit if seen before
  ↓ miss
[crawlee fetch]                  ← Playwright if JS-required, plain HTTPS otherwise
  ↓ html bytes
[Readability]                    ← strip chrome, nav, footer, scripts
  ↓ cleaned html
[markdown-it]                    ← HTML → Markdown
  ↓ markdown
[byte-budget enforcement]        ← truncate if > maxBytes; return slice with offset+length
  ↓ markdown slice
[validators.fetchedContent()]    ← Zod check on the result shape
  ↓
[bloom add(content-hash)]        ← so future fetches dedup
  ↓
HTMLReadResult                    → returned to caller
```

## Bloom filter design

**Implementation note (2026-04-26):** the original spec called for the
`bloom-filters` npm package + `better-sqlite3`. We replaced both:

- **Bloom filter**: zero-dep, ~80 LOC inline in `_bloom-cache.ts`. A bloom
  filter is a deterministic algorithm; FNV-1a + DJB2 derive two 32-bit
  hashes, double-hashing produces the k indices. For a "TypeScript reference
  catalog" SDK, the npm dep would 2× install size for one class with
  4 methods.
- **SQLite**: `bun:sqlite` (built-in to Bun) instead of `better-sqlite3`.
  The two APIs are similar enough that a Node port would be mechanical:
  `import { Database } from 'bun:sqlite'` → `import Database from 'better-sqlite3'`.

**Reload safety.** The constructor rebuilds the bloom from SQLite on every
open, so a process restart keeps dedup state. Cost: ~50ms full-table scan
at 100k entries.

**Schema:**

```sql
CREATE TABLE entries (
  key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,    -- JSON-serialized BloomEntry
  fetched_at TEXT NOT NULL  -- ISO8601, redundant with payload but indexable
);
CREATE INDEX idx_entries_fetched_at ON entries(fetched_at);
```

The `fetched_at` index is for future TTL eviction; the bloom layer doesn't
need it.

Why bloom, not a hash set:

- **Memory**: a hash set of 100k SHA-256s is ~3 MB; a bloom filter for 100k items at 1%
  false-positive rate is ~120 KB
- **False-positives are acceptable**: a bloom-filter "saw it before" miss means we *might*
  re-fetch a page we already cached at the SQLite-level — cheap, not catastrophic
- **No false-negatives**: if bloom says "definitely not seen", the SQLite cache is consulted

```ts
// src/subagentmcp-sdk/tools/_bloom-cache.ts
import { BloomFilter } from 'bloom-filters';
import Database from 'better-sqlite3';

export class BloomCache {
  private bloom: BloomFilter;
  private db: Database.Database;
  // Default: 100k expected items, 1% false-positive rate
  constructor(opts?: { expectedItems?: number; fpRate?: number; dbPath?: string });

  /** Returns true if URL or content has been seen. */
  has(key: string): boolean;

  /** Mark as seen. */
  add(key: string): void;

  /** Get cached payload by content-hash. Returns null on bloom miss. */
  get(contentHash: string): { markdown: string; fetchedAt: string } | null;

  /** Store fresh fetch. */
  put(contentHash: string, payload: { markdown: string; fetchedAt: string }): void;

  /** Clear bloom + SQLite. */
  reset(): void;
}
```

The bloom filter is keyed by **content SHA-256** (not URL) so:
- The same URL fetched twice with different content → both stored (e.g., `ultrareview.md`
  before and after a doc update)
- Different URLs returning identical content → one cache entry, two URL pointers

## markdown-it preprocessing

**Implementation note (2026-04-26):** the original spec called out
`markdown-it` (768KB unpacked + 6 transitive deps), `@mozilla/readability`
(154KB), and `turndown` (192KB + `@mixmark-io/domino`). For the use cases
that matter (Anthropic doc pages, blog posts, GitHub README HTML, sitemap
content), a focused converter handling paragraphs / headings / links /
lists / code / inline emphasis does the job at <300 LOC.

`_html-to-markdown.ts` provides:

- HTML tokenizer that handles void elements, mismatched tags, CDATA,
  comments without throwing
- Best-effort prose subtree extraction: prefers `<article>` over `<main>`
  over `<body>` over root
- Strip list (entire subtree dropped, content included): `script`, `style`,
  `nav`, `footer`, `aside`, `header`, `form`, `iframe`, `noscript`, `svg`,
  `button`, `select`, `textarea`
- Markdown rendering: `<h1..h6>`, `<p>`, `<a>`, `<ul>/<ol>/<li>`, `<code>`,
  `<pre><code class="language-X">`, `<strong>/<b>`, `<em>/<i>`, `<br>`,
  `<hr>`, `<blockquote>`, `<img>` (link-only)
- Entity decoding (`&amp;`, `&mdash;`, numeric `&#x2014;`)
- Output truncation at byte boundary with `truncated: true` slice metadata

Pages that need a real DOM (very loose markup, complex tables, JS-only
shells) hit the **Crawlee fallback** in #27 — but the conversion still
ends here, after the headless-browser pass renders into static HTML.

The original spec's snippet stays below as the conceptual reference; the
runtime is `_html-to-markdown.ts`.

Configured to keep the bits Claude actually needs:

```ts
// src/subagentmcp-sdk/tools/_markdown-it.ts
import MarkdownIt from 'markdown-it';

export const md = new MarkdownIt({
  html: false,        // strip raw HTML; we want clean markdown
  linkify: true,      // auto-linkify URLs
  typographer: false, // no smart-quote noise
}).disable([
  'image',            // images are linkOnly references, not embedded
]);

export function htmlToMarkdown(html: string, opts?: { maxBytes?: number }): string {
  const cleaned = readability(html);     // Mozilla Readability
  const turned = turndown(cleaned, {     // turndown config tuned to match Anthropic doc style
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });
  return opts?.maxBytes ? truncate(turned, opts.maxBytes) : turned;
}
```

## Why crawlee specifically

**Implementation note (2026-04-26):** the original spec called for adopting
Crawlee + Playwright as runtime deps. Per the issue's own guidance ("defer
until we hit a JS-only page in real use") and CLAUDE.md "TypeScript
reference catalog" framing, this repo ships the **interface and dispatch
heuristic** for the Crawlee fallback, not the ~300MB Playwright runtime.

Callers that need JS rendering provide a `CrawleeAdapter` implementation
(typically a thin wrapper around Crawlee's `PlaywrightCrawler`); the
readers consume it through a single opt-in option:

```ts
import { PlaywrightCrawler } from 'crawlee';
import { subagentHtml } from '...tools/subagent-html';
import type { CrawleeAdapter } from '...tools/_crawlee-fallback';

const adapter: CrawleeAdapter = {
  async render(url, opts) {
    const out = { html: '', status: 0 };
    const crawler = new PlaywrightCrawler({
      requestHandler: async ({ page, response }) => {
        out.status = response?.status() ?? 0;
        out.html = await page.content();
      },
      maxConcurrency: 1,
    });
    await crawler.run([url]);
    return out;
  },
};

const result = await subagentHtml.read(url, { crawleeFallback: adapter });
```

This keeps Playwright's footprint off everyone who does not need JS
rendering — consistent with the iter-23/25/26 zero-dep pattern.

### isLikelyJsOnly heuristic

`_crawlee-fallback.ts:isLikelyJsOnly()` flags fetched HTML for adapter
re-fetch when ANY of:

1. Empty / whitespace-only
2. Length < 512 bytes
3. No `<body>` tag at all
4. `<body>` content (after stripping `<script>`/`<style>`/`<svg>`) under
   100 chars
5. `<noscript>` text dominates body content (>80% of total)

The dispatcher (`dispatchHtmlFetch`) tries plain fetch first, returns its
result on success-and-not-flagged, and otherwise delegates to the adapter.
Errors thrown by the plain fetch also delegate (with adapter present) so
`claude.ai/blogs` returning HTTP 403 to plain fetch routes through
Playwright.

### Provenance

`HTMLReadResult.fetchedVia` records which path produced the markdown:
`'plain-fetch'`, `'crawlee'`, or `'inject'` (test-only). Callers that
audit content provenance (e.g., bloom cache row provenance for
incident-response) read this field.

Three concrete features earn it over plain `fetch`:

1. **Playwright for JS-rendered pages** — `claude.ai/blogs` returns 403 to plain `fetch`
   but renders fine in headless Chromium. Crawlee handles the browser pool.
2. **Built-in queueing + retry + dedup** — we don't reinvent these
3. **Auto-throttling** — respects rate limits via crawlee's `RequestQueue`

Cost: ~500 MB RAM for headless Chromium when active. We default to **plain fetch first,
fall back to Playwright** only when the plain fetch fails or returns suspicious content
(very small HTML, no `<body>` content, JS-only redirects).

## Subagent-js: extracting typed data from MDX/JS pages

**Implementation note (2026-04-26):** the original spec called for
`@babel/parser` (~1MB unpacked) + `@babel/traverse` to handle full-fidelity
JS AST traversal. Per the issue's own guidance ("Defer until a second
caller exists") and the iter-23/25/26/27 zero-dep precedents, this repo
ships a **JSON5-ish literal evaluator** that handles the documented use
case (`EVENTS` array in `context-window.md`) and rejects shapes it can't
safely evaluate so callers know when to upgrade.

Supported subset (in `_js-literal-eval.ts`):
- Object literals (unquoted or quoted keys)
- Array literals
- Strings (single/double-quoted with backslash escapes; template literals
  *without* `${...}` interpolation)
- Numbers (decimal, scientific, signed, hex)
- `true` / `false` / `null` / `undefined`
- Trailing commas
- Line + block comments

Rejected (throws `JsLiteralError`):
- Function calls, member access, `new` expressions
- Template literals with interpolation
- Computed object keys, spread operators
- JSX, arrow functions, function expressions

When a real second caller surfaces with one of the rejected shapes, swap
the body of `evaluateNamedExport()` for a `@babel/parser` call — the
`subagent-js` reader interface stays stable.

`context-window.md` is the canonical example: the page exports a React component whose
`EVENTS` array is the actual data structure we care about. `subagent-html` would convert
the prose around it but lose the data. `subagent-js` parses the JS source:

```ts
// src/subagentmcp-sdk/tools/subagent-js.ts
import { parse } from '@babel/parser';
import { traverse } from '@babel/traverse';

export interface JSReadOptions {
  /** Named export to extract. e.g. 'EVENTS' from context-window.md */
  exportName: string;
  /** Zod schema to validate the extracted data against */
  schema: z.ZodType;
}

export interface JSReadResult<T> {
  url: string;
  data: T;
  sourceSha256: string;
  fromCache: boolean;
}

/** Extracts a named export from an MDX/JS page and validates against the provided schema. */
export const subagentJs: ContentReader<JSReadOptions, JSReadResult<unknown>>;
```

Worked example:

```ts
import { z } from 'zod';
import { subagentJs } from '...tools/subagent-js';

const EventSchema = z.object({
  t: z.number(), kind: z.string(), label: z.string(),
  tokens: z.number(), color: z.string(), vis: z.enum(['hidden','visible']),
  desc: z.string(), link: z.string().nullable().optional(),
});

const result = await subagentJs.read('https://code.claude.com/docs/en/context-window.md', {
  exportName: 'EVENTS',
  schema: z.array(EventSchema),
});

if (result) {
  for (const event of result.data) {
    // event is fully typed; .label, .tokens, .desc all autocomplete
  }
}
```

This is the **right** way to read context-window.md, not a `WebFetch` that pulls the
prose around the data and forces the LLM to re-extract it.

## subagent-xml

For Atom/RSS, sitemaps, OpenAPI/Swagger XML. Less common but worth typing for completeness.

**Implementation note (2026-04-26):** the original spec called out `xml2js` and
Zod as runtime deps. We replaced both:

- **XML parsing**: zero-dep — `_xml-parse.ts` is a 200-line tag walker covering
  the documented subset (sitemaps, Atom, RSS 2.0, trivial OpenAPI). `xml2js`
  was 1MB unpacked across 4 transitive deps; for a "TypeScript reference
  catalog" SDK that's disproportionate to the work.
- **Schema validation**: duck-typed — `XMLReadOptions.schema` accepts any
  `{ parse(input): T }`. Zod's `ZodType` already exposes `.parse()`, so
  callers can pass Zod schemas directly without us importing Zod ourselves.
  Valibot, Yup, and hand-rolled validators also work.

**Selector subset.** `_xml-parse.ts:selectXml()` handles:
- `/root/child` — absolute, root-anchored
- `//element` — descendant-or-self
- `/root/*` — star matches any single element
- `/root/child[2]` — 1-based positional predicate

No attribute predicates, no axes beyond `//`, no XPath functions. If a future
caller needs more, swap `_xml-parse.ts` for a real XPath engine; the public
reader interface is selector-string-in / nodes-out, so the swap is local.

```ts
// src/subagentmcp-sdk/tools/subagent-xml.ts
import type { XmlNode } from './_xml-parse.ts';

export interface ParseableSchema<T> {
  parse(input: unknown): T;
}

export interface XMLReadOptions extends ContentReaderOptions {
  /** XPath-ish selector (subset documented above). Omit for full root. */
  selector?: string;
  /** Validation schema for the extracted shape (Zod-compatible duck-type). */
  schema?: ParseableSchema<unknown>;
}

export interface XMLReadResult<TData = unknown> {
  url: string;
  node: XmlNode;          // first match (or full root if no selector)
  nodes: XmlNode[];       // all matches when selector returns multiple
  data: TData;            // schema.parse(node) result, else node verbatim
}
```

## subagent-md (passthrough)

For raw markdown URLs (GitHub raw, docs `.md` URLs). Minimal processing:

- Strip frontmatter into a separate `frontmatter` field
- Normalize line endings to LF
- Optionally strip code-block fences if `opts.unwrapCode` is set
- Return both raw markdown body and parsed frontmatter

## parry integration — prompt-injection scanning

Every reader runs **parry** (prompt-injection scanner; HuggingFace-hosted
`protectai/deberta-v3-base-prompt-injection-v2`) on its markdown output
**before** the bloom-filter `add()` call. Caching the scan result with the
content hash means a page is scanned **once per content version**, not
once per LLM read.

### Pipeline placement

```
…
[markdown-it]                    ← HTML → Markdown
  ↓ markdown
[byte-budget enforcement]
  ↓ markdown slice
[parry.scan(markdown)]           ← NEW. Returns { score, label, decision }.
  ↓ scanned markdown
[validators.fetchedContent()]    ← Zod check on result shape (now includes parryScore)
  ↓
[bloom add(content-hash)]        ← scan result is part of the cached payload
  ↓
HTMLReadResult                    → returned to caller (with parryScore field)
```

### Decision rules

| `parry.scan()` label | Default action |
|---|---|
| `SAFE` (score < 0.3) | Return content normally |
| `SUSPICIOUS` (0.3 ≤ score < 0.8) | Return content with `warnings: ["prompt_injection_suspicious"]`; caller may downgrade trust |
| `MALICIOUS` (score ≥ 0.8) | Return `{ data: null, blocked: true, reason: "prompt_injection" }`; do NOT cache content; cache the BLOCK decision so re-fetch short-circuits |

Thresholds are configurable per reader via `ContentReaderOptions.parryThresholds`.

### Why scan markdown, not HTML

- Readability strips most chrome; the markdown is what reaches the LLM
- HTML scanning produces false positives on legitimate `<script>` blocks
- Markdown is what the bloom filter hashes, so scan + hash are atomic

### Implementation notes (2026-04-26)

The runtime in `_parry-scan.ts` adds three behaviors not in the original spec:

1. **Token-driven activation.** When `~/.config/parry/token` is missing or
   empty, `scan()` returns `{ label: 'SAFE', score: 0, via: 'stub' }` —
   readers stay testable offline and a fresh checkout passes `bun test`
   without anyone touching the HuggingFace gate. Override path with the
   `PARRY_TOKEN_PATH` env var or the `tokenPath` option.
2. **Fail-open on transient HF errors.** A 5xx, network throw, or
   malformed payload returns the same `via: 'stub'` SAFE verdict. The
   alternative (failing closed) would block all reads during an HF outage.
   Fail-open + caching the fail-open result means the reader is degraded
   (no scan) but not broken. The bloom-cache integration in #24 will
   record `via` so callers can audit which pages were scanned vs.
   fallback-passed.
3. **Threshold-bucketed cache key.** The in-memory cache (placeholder for
   #24's bloom cache) is keyed by `${contentHash}:${suspicious}:${malicious}`.
   A caller that switches to stricter thresholds invalidates only their
   bucket — other callers' cached results stay valid.

### What gets cached on a BLOCK

```ts
type BloomEntry =
  | { kind: 'content'; markdown: string; parryScore: number; fetchedAt: string }
  | { kind: 'blocked'; reason: string; parryScore: number; fetchedAt: string };
```

A blocked entry means the next fetch of the same content hash returns the
block decision **without re-running parry** — defends against attacker
re-trying the same payload.

### Cost

Parry scans run via **HuggingFace Inference API** (free tier sufficient for
<1k scans/day). No GPU needed locally. Token-cost: ~50 tokens per page (the
score + label, not the page content).

### Out of scope for this layer

- Custom training of a parry model — use the published one
- Real-time scanning of LLM **outputs** — that's a separate hook
  (`UserPromptSubmit` / `PostMessage`)
- Authentication-aware scanning (different thresholds for trusted vs
  untrusted sources) — defer until we have a `source.trustLevel` enum

### Pre-requisites

- HuggingFace API token in `~/.config/parry/token` (account creation =
  CLAUDE.md gate; user sets up once)
- `parry` Python package installed via `uv` (per `installs/tier-2-installs.md`)
- The reader pipeline calls `parry` via subprocess or HTTP API; both
  abstractions live in `tools/_parry-scan.ts`

## Migration plan

| Existing usage | Replace with |
|---|---|
| `WebFetch(url, prompt)` for HTML pages | `subagentHtml.read(url)` + a separate prompt to the LLM |
| `WebFetch` for `code.claude.com/docs/en/*.md` | `subagentMd.read(url)` |
| Manual `curl ... \| sed/awk` for parsing GitHub README content | `subagentMd.read(url)` |
| Reading `context-window.md` for the EVENTS array | `subagentJs.read(url, { exportName: 'EVENTS', schema })` |
| `WebFetch` for sitemaps / RSS | `subagentXml.read(url, { schema })` |

## Out of scope (intentionally)

- **General-purpose web crawler** — we're not building Googlebot. Single-URL fetch with
  optional 1-hop link-follow is the cap.
- **Image / video fetching** — markdown only. Use `image-cache/` (Claude Code's own
  caching) for visual content.
- **JS execution beyond reading** — we extract data, not run user-side scripts.
- **Authentication** — every reader is anonymous. Auth'd content goes through MCP servers
  with proper credential handling.

## Sources

- Crawlee: https://crawlee.dev (MIT, Apify)
- Mozilla Readability: https://github.com/mozilla/readability (Apache-2.0)
- markdown-it: https://github.com/markdown-it/markdown-it (MIT)
- bloom-filters npm: https://github.com/Callidon/bloom-filters (MIT)
- @babel/parser for JS extraction: https://babeljs.io
- xml2js: https://github.com/Leonidas-from-XIV/node-xml2js (MIT)
- parry (prompt-injection scanner): https://github.com/protectai/llm-guard + HF model `protectai/deberta-v3-base-prompt-injection-v2`
