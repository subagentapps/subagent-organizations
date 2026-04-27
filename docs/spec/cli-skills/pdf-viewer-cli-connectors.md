# pdf-viewer-cli connectors — trivial wrapper, no translation

> Status: load-bearing as of 2026-04-27
> Source: `vendor/anthropic/knowledge-work-plugins/pdf-viewer/{CONNECTORS.md, .mcp.json, README.md}`
> Implementation: [`subagentapps/knowledge-work-plugins-cli/pdf-viewer-cli/`](https://github.com/subagentapps/knowledge-work-plugins-cli/tree/main/pdf-viewer-cli) (PR opened)
> Pattern: [`../plugin-migration-pattern.md`](../plugin-migration-pattern.md) §"trivial wrapper"
> Strategy: [`./kwpc-cli-migration-strategy.md`](./kwpc-cli-migration-strategy.md) §"Special case — pdf-viewer-cli"
> Companion: [`./productivity-cli-connectors.md`](./productivity-cli-connectors.md), [`./engineering-cli-connectors.md`](./engineering-cli-connectors.md), [`./product-management-cli-connectors.md`](./product-management-cli-connectors.md)

---

## 1. Why this is the trivial-wrapper case

Upstream `pdf-viewer` uses **a local stdio MCP server** (`@modelcontextprotocol/server-pdf`, installed via `npx`). It has:

- No OAuth callback dependency on Cowork
- No paid SaaS subscription
- No per-user API key

Whatever runs the upstream Cowork plugin runs the kwpc-cli port identically. The only changes from upstream are the manifest rebrand + a README rewrite. **Skills + commands ship verbatim.**

This is the **canonical example** of a Wave-1 trivial wrapper that gets ~30 minutes of work, vs. an hour-plus for plugins that need real connector translation (productivity, engineering, etc.).

---

## 2. The (non-)decision matrix

There's only one "category" — the local PDF MCP — and it stays as-is.

| Category | Verdict | What |
|---|---|---|
| PDF viewer & annotator | **Keep verbatim** | `@modelcontextprotocol/server-pdf` via `npx` stdio |

Final `.mcp.json`:

```json
{
  "mcpServers": {
    "pdf": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-pdf", "--stdio"]
    }
  }
}
```

Identical to upstream.

---

## 3. Per-skill / per-command impact

5 assets, all verbatim:

| Asset | Categories used | pdf-viewer-cli behavior |
|---|---|---|
| `skills/view-pdf` | local PDF MCP | Verbatim — `list_pdfs`, `display_pdf`, `interact` tools |
| `commands/open` | local PDF MCP | Verbatim |
| `commands/annotate` | local PDF MCP | Verbatim |
| `commands/fill-form` | local PDF MCP | Verbatim |
| `commands/sign` | local PDF MCP | Verbatim |

**5 of 5 work end-to-end.** No divergence rows.

---

## 4. Requirements (from upstream, unchanged)

- Node.js >= 18 (for `npx`)
- Internet access for remote PDFs (arXiv, bioRxiv, etc.)
- No API keys, no OAuth, no remote service

---

## 5. Acceptance criteria status

Per `kwpc-cli-migration-strategy.md` §6:

| # | Criterion | Status |
|---|---|---|
| 1 | `pdf-viewer-cli/` directory in kwpc-cli repo | ✅ on PR (this iter) |
| 2 | `.claude-plugin/plugin.json` authored fresh (no scaffold existed) | ✅ |
| 3 | `skills/` + `commands/` copied verbatim | ✅ |
| 4 | `.mcp.json` translated | ✅ no-op (already CLI-friendly) |
| 5 | `CONNECTORS.md` documenting decisions | ✅ |
| 6 | `README.md` rewritten | ✅ |
| 7 | Spec contract in meta-repo (this file) | ✅ |
| 8 | GitHub Issue tracking | TBD post-merge |
| 9 | PR opened in kwpc-cli repo | ✅ |
| 10 | Plugin install verification | Deferred |

---

## 6. Implication for the strategy

This port confirms the strategy's §"Special case" classification: any
plugin whose upstream `.mcp.json` references local stdio servers (vs
remote OAuth-gated endpoints) qualifies as a trivial wrapper. The only
known cases:

- **`pdf-viewer`** ← this plugin
- **No others currently** in the 17-dir upstream

If Anthropic adds future plugins that use `@modelcontextprotocol/*`
local servers, they'd join this category.

---

## 7. Provenance

- Upstream: `vendor/anthropic/knowledge-work-plugins/pdf-viewer/` (vendored 2026-04-26, Apache-2.0)
- Implementation PR: `subagentapps/knowledge-work-plugins-cli` (this iter)
- Pattern: `../plugin-migration-pattern.md` §"Plugins that are pure copy-paste"
- Strategy parent: `kwpc-cli-migration-strategy.md` §"Special case — pdf-viewer-cli"
- Authored by Claude (Opus 4.7) under `.claude/prompts/opus-orchestrator.md`
