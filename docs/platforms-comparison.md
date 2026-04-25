# Mintlify vs Stainless vs Slate

Research date: 2026-04-25 · Decision target: where (and whether) to host docs for this repo.

## Summary

| Tool | What it actually is | Open source? | Hosting | Best for | Fit for *this* repo |
|---|---|---|---|---|---|
| **Mintlify** | SaaS docs site builder. MDX + components + AI-search. | Components/templates open ([mintlify/docs](https://github.com/mintlify/docs)); engine is closed SaaS. | Mintlify-hosted (free tier) or self-hosted via Vercel/Cloudflare. | Modern API/SDK product docs with rich navigation, search, OpenAPI ingestion. | **Overkill**. Lovely output but brings AI-search + SaaS features we don't need for an internal manifest. |
| **Stainless** | SDK *generator* (not docs). OpenAPI spec → idiomatic Python/TS/Go/Java/Ruby SDKs. | Closed SaaS; some helpers under [stainless-api/](https://github.com/stainless-api). | Stainless cloud builds + their generators. | Companies shipping a public REST API who want first-class SDKs (Anthropic, OpenAI, Cloudflare, Together AI all use Stainless). | **Wrong category**. We're not generating SDKs from an OpenAPI spec. Stainless solves a different problem than docs. |
| **Slate** ([ringcentral/slate](https://github.com/ringcentral/slate) — fork of [tripit/slate](https://github.com/tripit/slate)) | Static-site generator for "three-pane" API docs. Markdown-only, Ruby/Middleman build. | MIT. Self-hosted, GitHub Pages-ready. | Self-host (GitHub Pages, Netlify, anywhere static). | Single-page API reference with multilingual code samples (Stripe-style two-column layout). | **Closest match** but the Ruby/Middleman toolchain is dated; community has moved to forks like [slatedocs/slate](https://github.com/slatedocs/slate). |

## Anatomy

### Mintlify
- **Source format**: MDX (Markdown + React components like `<Card>`, `<Tabs>`, `<CodeGroup>` — same primitives the Anthropic Claude Code docs use).
- **Config**: `docs.json` (renamed from `mint.json` in 2024) defines navigation, theme, integrations.
- **Build**: nothing local — Mintlify ingests your repo and renders. Local dev is `mint dev`.
- **OpenAPI**: drop a spec at `openapi.json`/`yaml`, Mintlify auto-generates pages.
- **Pricing tiers (public, 2025)**: Free (1 editor, public docs). Pro ($150/editor/mo). Custom for enterprise. Self-hosting requires Pro+.
- **Used by**: Anthropic, ElevenLabs, Resend, Hume, OpenPipe.

### Stainless
- **Not a docs platform.** It's an **SDK generator** — feed it OpenAPI, get language-specific client libraries.
- **Output**: idiomatic SDKs (e.g., `anthropic-sdk-python`, `openai-node`) with typed clients, retries, streaming, pagination.
- **Pricing**: paid SaaS, custom pricing.
- **Used by**: Anthropic (`@anthropic-ai/sdk`), OpenAI, Cloudflare, Together AI, Lithic.
- **Why it's in this comparison**: people often say "Stainless" when they mean "the Anthropic-style SDK + docs experience." But the docs side of that experience is *Mintlify*, not Stainless.

### Slate
- **Output**: a single static HTML page with two columns — prose left, code-samples right.
- **Source format**: Markdown with three-backtick code blocks tagged by language; `--all-languages-tabs` switches between them.
- **Build**: `bundle exec middleman build` → static HTML.
- **Deployment**: GitHub Pages, S3, anywhere static.
- **Maintenance**: original tripit/slate hasn't been updated in years; the **active fork is [slatedocs/slate](https://github.com/slatedocs/slate)** (the ringcentral fork is essentially abandoned in 2017). RingCentral's fork is what was specifically asked about — but if going Slate, use the slatedocs one.
- **Used by**: Travis-CI, Coinbase (older docs), Dwolla, NASA — almost all 2014–2018 vintage. Stripe-inspired.

## Fit analysis for `subagent-organizations`

This repo's docs needs:
- ~20 short pages (one per primitive + a few high-level guides)
- Source-pinned code snippets that mirror `src/`
- Markdown-friendly, version-controlled, no SaaS lock-in
- Renderable from `packages.json` data
- Ideally consumable as plain markdown on GitHub *and* as a polished site if needed later

**Verdict by tool:**
- **Stainless** — wrong tool. Skip.
- **Mintlify** — works, but the value-add (search, components, hosted CDN) is wasted on a 20-page internal reference. Adds an MDX dialect to learn and a SaaS dependency.
- **Slate** — right shape (single-page, code-on-the-right) but wrong era (Ruby/Middleman, declining maintenance even on the active fork).

**My recommendation: none of the three. Use [Nextra](https://nextra.site) or [Astro Starlight](https://starlight.astro.build) or just GitHub-rendered markdown.**

Why:
- We already have **markdown specs** in this branch — they render fine on github.com.
- If we ever need a hosted site, **Astro Starlight** (MIT, Astro-based, built-in search via Pagefind, deploys to Cloudflare Pages free) gives 90% of Mintlify's polish with no SaaS, ingests the same markdown we already have, and matches your stack (TS + bun + Cloudflare).
- Mintlify becomes interesting only if/when these docs leave the org and need public AI-search and OpenAPI ingestion.

**Action for now**: keep docs in `docs/` as plain markdown; revisit Starlight if traffic warrants it.

## Sources

- https://mintlify.com — pricing and feature pages
- https://www.stainless.com — product overview
- https://github.com/tripit/slate — Slate upstream
- https://github.com/slatedocs/slate — active community fork
- https://github.com/ringcentral/slate — the fork explicitly asked about (last meaningful update ~2017)
- https://starlight.astro.build — recommended alternative
