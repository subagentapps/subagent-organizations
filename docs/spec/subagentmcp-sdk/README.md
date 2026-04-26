# `src/subagentmcp-sdk/` — typed primitives + directives for Claude Code orchestration

Date: 2026-04-25 · Branch: `feat/anthropic-vendor`
Companion to: [`../claude-code-types.md`](../claude-code-types.md), [`../markdown-to-typescript-migration.md`](../markdown-to-typescript-migration.md), [`../../research/orchestrator-pattern.md`](../../research/orchestrator-pattern.md)

## What this is

A TypeScript SDK that gives the Claude Code lead orchestrator (the user-side agent) a
**typed, validated, deduplicated** way to:

1. **Read** external content (HTML/JS/XML/Markdown pages) without polluting context with
   formatter noise — via a crawlee + readability + markdown-it + bloom-filter content layer
   that **replaces ad-hoc WebFetch / WebSearch usage** in our internal scripts
2. **Generate** Claude Code primitive files (subagent definitions, skills, hooks,
   `settings.json` blocks, `.lsp.json` configs, MCP server stubs) from typed templates,
   each pinned to the SHA of the upstream Anthropic doc page that defines its shape
3. **Validate** every generated file against Zod schemas before write — fail-closed when a
   subagent's `tools:` field has a typo or a hook's event name is misspelled
4. **Spawn** subagents in parallel or orchestrate an experimental agent team, with the SDK
   providing the typed task surface and the human-in-loop approval gates

This is a **scoped SDK**, not a re-implementation of the Anthropic SDK. It's built *on top*
of `@anthropic-ai/claude-agent-sdk` for the LLM calls and on plain Node/Bun for the
content layer. Our value-add: typed templates + SHA-pinned refs + a deduplicated reader.

## Why this exists

Honest accounting of the bugs we've already hit in this session that this SDK prevents:

| Real bug seen this session | What the SDK prevents |
|---|---|
| Cowork blog post pulled 51 KB of slider/draggable JS source as "page text" — burned ~30k tokens of pure noise | Content layer routes through markdown-it / Readability *before* returning to the LLM |
| LSP 3.17 spec pulled in full (915 KB / ~250k tokens) when we needed maybe 5% | Bloom-filter + section-aware reader returns only the sections you asked for |
| Subagent frontmatter docs pulled multiple times (sub-agents.md re-fetched in two separate turns) | Bloom-filter content cache by content-hash |
| The "subagent has 16 frontmatter keys" was discovered by manually grepping a markdown dump | A pinned ref with the YAML schema enumerated would have told us at type-check time |
| Earlier in session, claimed "no TS LSP plugin" — wrong; doc said otherwise but I didn't read carefully | SHA-pinned refs that reload when upstream changes catch this drift |

## What this SDK is NOT

- **Not a replacement for `@anthropic-ai/claude-agent-sdk`.** It uses the SDK; it doesn't
  reimplement it.
- **Not an MCP framework.** It can *generate* MCP server scaffolds (in `subagent-mcp-server/`),
  but the MCP wire protocol stays untouched. The "mcp" in the name reflects that subagents
  in Claude Code expose themselves *through* MCP-style tool surfaces, not that we're
  building an MCP server library.
- **Not a runtime daemon.** All entry points are bun-runnable scripts; no long-lived process.

## The naming choice

`subagentmcp-sdk` reads two ways. We mean: **"SDK for the layer where subagents and MCP
content tools intersect."** Subagents *consume* MCP-style tools (the typed content readers);
the SDK provides the typed interface for both. If at some point we need to disambiguate
in source, the package will be at `@subagentapps/subagentmcp-sdk` so the scope makes the
relationship clear.

## Layered architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│ orchestrator/   ← lead-orchestrator runtime: spawnFleet(), runTeam(),       │
│                  approvalGate(), fanOut/fanIn helpers                       │
├────────────────────────────────────────────────────────────────────────────┤
│ creators/       ← typed templates that emit Claude Code primitive files     │
│   ├── subagent-creator/     ← agents/*.md (with SHA-pinned schema)          │
│   ├── skill-creator/        ← skills/<name>/SKILL.md                        │
│   ├── hook-creator/         ← settings.json hooks block                     │
│   ├── lsp-server-creator/   ← .lsp.json entry                               │
│   └── mcp-server-creator/   ← .mcp.json entry + scaffold (.ts/.py)          │
├────────────────────────────────────────────────────────────────────────────┤
│ refs/           ← Zod schemas + SHA-pins of upstream Anthropic doc pages    │
│   Each subdirectory = one upstream page = one ref                           │
├────────────────────────────────────────────────────────────────────────────┤
│ tools/          ← content layer (replaces WebFetch / WebSearch)             │
│   ├── subagent-html         ← Crawlee + Readability                         │
│   ├── subagent-js           ← strip JS, capture only relevant data attrs    │
│   ├── subagent-xml          ← XML → Markdown via xml2js + xslt              │
│   ├── subagent-md           ← passthrough; minor normalization              │
│   ├── _bloom-cache          ← shared content-hash dedup across all readers  │
│   └── _markdown-it          ← shared HTML→MD converter                      │
├────────────────────────────────────────────────────────────────────────────┤
│ validators/     ← every emitted file routed here before write               │
│                  Returns Zod-typed errors with file path + line context     │
└────────────────────────────────────────────────────────────────────────────┘
```

## Files in this directory (specs)

| Spec | Covers |
|---|---|
| [`./architecture.md`](./architecture.md) | The 5-layer design, with concrete TS interfaces |
| [`./refs/SHA-PINNING.md`](./refs/SHA-PINNING.md) | How each ref pins to an upstream doc SHA + drift detection |
| [`./creators/subagent-creator.md`](./creators/subagent-creator.md) | The concrete worked example you asked for |
| [`./tools/crawlee-content-layer.md`](./tools/crawlee-content-layer.md) | The crawlee + readability + markdown-it + bloom-filter design |
| [`./orchestrator/lead-pattern.md`](./orchestrator/lead-pattern.md) | Lead-orchestrator + human-in-loop + subagents/teams |
| [`./tests/VALIDATORS.md`](./tests/VALIDATORS.md) | What validation runs against each generated file type |

## The anti-overengineering check

WAF anti-patterns explicitly flags overengineering:

> *"Building unnecessarily complex solutions or adding features without clear value."*

This SDK adds 5 layers. Each one earns its place by preventing a specific bug we've already hit
(see the table at top). If at implementation time any layer can't justify itself, drop it:

| Layer | Drop if… |
|---|---|
| `tools/` content layer | We never re-pull a page or never wrestle with HTML noise — but we already have, so this stays |
| `creators/` | We're generating each file by hand and nobody else will use the SDK — possible, but a single creator file is < 100 LOC |
| `refs/` SHA-pinning | We don't care about doc drift — but Anthropic ships ~weekly and we already saw drift this session |
| `validators/` | Generated files never have bugs — they will |
| `orchestrator/` | We never spawn parallel subagents — we already do; this is just typing what's there |

## Build sequence

| Phase | Deliverable | Effort |
|---|---|---|
| **0** | This directory of specs (you're reading it) | — |
| **1** | `src/subagentmcp-sdk/refs/sub-agents/` — first concrete ref, SHA-pinned | 1 hr |
| **2** | `src/subagentmcp-sdk/tools/_bloom-cache.ts` + `_markdown-it.ts` + `subagent-html.ts` | 3 hr |
| **3** | `src/subagentmcp-sdk/creators/subagent-creator/` — first creator, end-to-end | 2 hr |
| **4** | `src/subagentmcp-sdk/validators/` — Zod-driven validator for the first creator's output | 1 hr |
| **5** | `tests/subagentmcp-sdk/subagent-creator.test.ts` — fixture-based tests | 1 hr |
| **6** | `src/subagentmcp-sdk/orchestrator/` — lead-orchestrator runtime | 4 hr |
| **7** | Migrate the existing ad-hoc WebFetch usage in our scripts to use the content layer | 1 hr |
| **8** | Add the remaining creators (skill, hook, lsp-server, mcp-server) | 4 hr each |

Total to MVP: ~12 hrs. Each phase is independently revertible.

## Sources

All upstream Anthropic docs pinned by SHA in `refs/SHA-PINNING.md`. The current set:

- `sub-agents.md` — for `creators/subagent-creator/`
- `skills.md` — for `creators/skill-creator/`
- `hooks.md` — for `creators/hook-creator/`
- `plugins-reference.md` — for `creators/lsp-server-creator/` and `creators/mcp-server-creator/`
- `mcp.md` — for `creators/mcp-server-creator/`
- `settings.md` — for the settings.json schema
- `agent-teams.md` — for `orchestrator/team-mode.ts`
- `agent-sdk/typescript-v2-preview.md` — for `orchestrator/session-resume.ts`
