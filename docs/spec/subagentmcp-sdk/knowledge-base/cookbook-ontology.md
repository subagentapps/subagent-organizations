# Anthropic Cookbook ontology — 12 categories + porting rules

Status: **draft** (Wave 1)
Source: <https://platform.claude.com/cookbook/> (12 official cookbook categories as of 2026-04-25)
Companion to:
- [`./contextual-retrieval.md`](./contextual-retrieval.md) — RAG & Retrieval category implementation
- [`../tools/crawlee-content-layer.md`](../tools/crawlee-content-layer.md) — feeds raw markdown into the chunker

## Why this exists

The Anthropic Cookbook is the **authoritative reference** for production
Claude patterns. We organize our knowledge-base research against the
**same 12 categories** so a future query like "what's our retrieval
strategy?" maps directly to the same ontology Anthropic ships.

This file pins:
- The 12 official categories (verbatim names)
- Auth-substitution rules for porting cookbook examples into our setup
- Tool-routing for ingesting cookbook content (which scraper, which not)

## The 12 categories (verbatim from `platform.claude.com/cookbook/`)

| Category | URL filter | Our `docs/research/cookbook/` slug |
|---|---|---|
| Agent Patterns | `?category=Agent+Patterns` | `agent-patterns/` |
| Claude Agent SDK | `?category=Claude+Agent+SDK` | `claude-agent-sdk/` |
| Evals | `?category=Evals` | `evals/` |
| Fine-Tuning | `?category=Fine-Tuning` | `fine-tuning/` |
| Integrations | `?category=Integrations` | `integrations/` |
| Multimodal | `?category=Multimodal` | `multimodal/` |
| Observability | `?category=Observability` | `observability/` |
| RAG & Retrieval | `?category=RAG+%26+Retrieval` | `rag-and-retrieval/` |
| Responses | `?category=Responses` | `responses/` |
| Skills | `?category=Skills` | `skills/` |
| Thinking | `?category=Thinking` | `thinking/` |
| Tools | `?category=Tools` | `tools/` |

Slug format: lowercase + hyphens; `&` becomes `and`; URL-encoding stripped.

## Auth substitution — the load-bearing porting rule

Every cookbook example assumes a direct API key:

```python
import anthropic
client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env
```

**We do not use `ANTHROPIC_API_KEY` in this repo.** Production agents
run **inside Claude Code**, which exposes:

- **`CLAUDE_CODE_OAUTH_TOKEN`** — the OAuth token already issued for the
  current `claude` CLI session, stored in macOS Keychain via
  `claude auth login`

The substitution is:

| Cookbook says | Our equivalent |
|---|---|
| `os.environ["ANTHROPIC_API_KEY"]` | `os.environ["CLAUDE_CODE_OAUTH_TOKEN"]` |
| `anthropic.Anthropic()` (zero-arg constructor) | `anthropic.Anthropic(auth_token=os.environ["CLAUDE_CODE_OAUTH_TOKEN"], base_url="<claude-code-internal>")` (TBD when SDK ships the binding) |
| `from anthropic import Anthropic` | Same, but consider if Claude Agent SDK is the better choice — see Category note below |
| `claude-3-5-sonnet-20241022` model IDs | `claude-sonnet-4-6` per CLAUDE.md "knowledge cutoff" — verify against current `claude --version` model registry |
| Direct billing on Anthropic API | Counts against the user's Max plan usage per `support.claude.com/.../what-is-the-max-plan` |

**When the substitution is NOT clean** (must be flagged in the per-category
research doc):

- **Fine-Tuning** — fine-tuning is the API service; not exposed via
  Claude Code OAuth. Fine-tuning patterns require a real
  `ANTHROPIC_API_KEY` AND access to the fine-tuning beta. Default: skip
  this category until we have a use case warranting an API key
- **Multimodal** — images work via Claude Code today; cookbook patterns
  for raw multipart-base64 image upload should still work, but verify
- **Evals** — most cookbook eval patterns assume programmatic API
  access; should still work via OAuth but the rate limits differ

## Per-category posture (high level)

| Category | Posture | First action |
|---|---|---|
| Agent Patterns | **Adopt** — directly applicable to our orchestrator | Cross-reference with `docs/research/orchestrator-pattern.md` (already in repo) |
| Claude Agent SDK | **Adopt** — primary stack for our `subagentmcp-sdk` | Vendor-survey + cross-reference `vendor/anthropic/claude-agent-sdk-typescript` (already vendored) |
| Evals | **Adopt** — needed for the contextual-retrieval eval harness | See `docs/research/anthropic-prompting-guidance.md` for our existing eval posture |
| Fine-Tuning | **Defer** — needs ANTHROPIC_API_KEY which we don't use | Stub doc only; no implementation |
| Integrations | **Adopt selectively** — pick examples relevant to our stack (GitHub, Cloudflare, MCP servers) | Skip Slack/Salesforce/etc. until we have a use case |
| Multimodal | **Defer until needed** | Stub doc only |
| Observability | **Adopt** — token usage telemetry is load-bearing | Cross-reference with the `docs/spec/operational/` planned work |
| RAG & Retrieval | **Adopt — already started** | See `docs/spec/subagentmcp-sdk/knowledge-base/contextual-retrieval.md` |
| Responses | **Adopt** — JSON-mode + structured output is critical for prompt-adapter | TBD per Wave 1 |
| Skills | **Adopt — already started** | See `.claude/agents/*.md` (existing subagent skills) |
| Thinking | **Adopt** — extended-thinking is built into Opus 4.7 (this orchestrator) | Cross-reference with `docs/research/anthropic-prompting-guidance.md` (already in repo) |
| Tools | **Adopt** — tool-use is the foundation | Cross-reference with `docs/research/code.claude.com/docs/en/tools-reference.md` |

## Tool routing — which scraper for which content

**Critical**: `platform.claude.com/sitemap.xml` and the cookbook page-list
**only ever** go through `subagentapps/subagent-crawls`. NOT the generic
`subagent-html`/`subagent-xml` readers from
[`../tools/crawlee-content-layer.md`](../tools/crawlee-content-layer.md).

### Why a specialized scraper

Per the user's note 2026-04-25:

> *"the sitemap we should only ever use a specialized scrapy crawler for
> https://platform.claude.com/sitemap.xml like this repo
> https://github.com/subagentapps/subagent-crawls/blob/main/CLAUDE.md
> i created yesterday."*

`subagent-crawls` is a Python scrapy-based crawler with rules tuned for
`platform.claude.com`'s response shapes, rate limits, and pagination.
The generic readers in our crawlee layer don't have those tunings and
would either rate-limit-block or pull bad data.

### Routing table

| URL pattern | Scraper |
|---|---|
| `platform.claude.com/sitemap.xml` | `subagent-crawls` (Python, Scrapy) |
| `platform.claude.com/cookbook/?category=*` | `subagent-crawls` |
| `platform.claude.com/cookbook/<slug>` | `subagent-crawls` |
| `platform.claude.com/llms.txt` | `curl` direct (it's plain text — token-precedent CLAUDE.md) |
| `platform.claude.com/docs/en/*.md` | `curl` direct OR `subagent-md` reader |
| `claude.com/blog/*` | `subagent-html` (general HTML) — different surface |
| `anthropic.com/engineering/*` | `subagent-html` |
| `github.com/anthropics/claude-cookbooks/*` | `subagent-md` (raw URL) OR git clone of vendored repo |

### How `subagent-crawls` integrates with our pipeline

The crawls scraper writes its output to **markdown files** that the
contextual-retrieval pipeline (chunker → contextualizer → embedder →
retriever → reranker) consumes the same way it would consume any other
markdown source. The scraper is just the FETCH layer; everything
downstream is shared.

```
platform.claude.com/sitemap.xml
   ↓
subagent-crawls (scrapy + tuned rules)
   ↓ markdown files
docs/research/cookbook/<category>/<slug>.md
   ↓
contextual-retrieval pipeline (per ./contextual-retrieval.md)
   ↓
queryable KB
```

### What `subagent-crawls` does NOT do

- Run our generic `crawlee-content-layer` pipeline (different stack)
- Apply parry scanning (cookbook content is trusted Anthropic-published
  source — parry overhead unnecessary; if we ever add user-contributed
  content to the KB, scanning becomes mandatory)
- Bloom-cache (the scraper's own state machine handles dedup)

## Implementation plan (when this work picks up)

| # | Step | Pre-req | Effort |
|---|---|---|---|
| 1 | Vendor `subagentapps/subagent-crawls` per the established pattern | None (cross-org-write gate per CLAUDE.md, but user owns this repo) | XS |
| 2 | Create `docs/research/cookbook/<slug>/README.md` for each of the 12 categories with the "first action" from the table above | Step 1 done | M (12 docs) |
| 3 | Run `subagent-crawls` against `platform.claude.com/cookbook/?category=Agent+Patterns` to populate `docs/research/cookbook/agent-patterns/*.md` | Steps 1-2 | S per category |
| 4 | Repeat for the 11 other categories | Step 3 | S each |
| 5 | Annotate each cookbook example with auth-substitution per § "Auth substitution" above | Steps 3-4 | S per example |
| 6 | Feed the populated `docs/research/cookbook/` into the contextual-retrieval pipeline | RAG layer #32 | M |

## Sources

- Anthropic cookbook root: <https://platform.claude.com/cookbook/>
- 12 category pages (linked from the table above)
- `subagentapps/subagent-crawls` — the scraper repo (user-owned)
  - README: <https://github.com/subagentapps/subagent-crawls/blob/main/README.md>
  - CLAUDE.md: <https://github.com/subagentapps/subagent-crawls/blob/main/CLAUDE.md>
- Anthropic cookbooks GitHub: <https://github.com/anthropics/claude-cookbooks>
  (mirrored content; less useful than the rendered `platform.claude.com/cookbook` page since the GitHub version is .ipynb files)
- Max plan usage: <https://support.claude.com/en/articles/11049741-what-is-the-max-plan>
- CLAUDE_CODE_OAUTH_TOKEN docs: TBD pin once we have the canonical doc URL
