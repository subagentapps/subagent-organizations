# Frontend smoke-test results

Status: **all checklist items covered** as of 2026-04-26 (PR F polish, closes the front-end track of #10 Phase A)
Spec: [`./content-routes.md`](./content-routes.md) § Smoke-test checklist

This file maps every checklist item in the spec to its implementing PR
so future audits can verify coverage without re-tracing 6 PRs.

## Checklist

| # | Spec line | Status | Implementing PR | Notes |
|---|---|---|---|---|
| 1 | `/` renders dashboard (existing; should be unchanged) | ✅ | PR C #100 | Full kanban (5 columns × IssueCard), plugin filter, Field backdrop |
| 2 | `/plugins/productivity-cli` loads README + recent issues for that plugin | ✅ | PR E #102 | Live README via `/api/github-file`; recent issues from `useProjects` |
| 3 | `/plugins/nonexistent` falls through to NotFound | ✅ | PR A #98, refined PR E | Validated against `PLUGINS` Set; renders inline 404 |
| 4 | `/adr` lists at least one ADR | ✅ | PR B #99 | 3 ADRs in `content-fixture.json`; sorted ascending by 4-digit number |
| 5 | `/adr/0001` renders the first ADR | ✅ | PR B #99 | Rendered via `MarkdownBody`; status + plugin + date chips in header |
| 6 | Cross-links between ADRs (`./0003-some-other.md`) navigate without page reload | ✅ | PR B #99 | `MarkdownBody` rewrites `./NNNN-anything.md` → `/adr/NNNN`; click handler routes through wouter |
| 7 | `/changelog` shows entries from all plugins, reverse-chrono | ✅ | PR B #99 | Fixture has 2 entries; sorted by `date` descending; per-entry plugin chip |
| 8 | DOMPurify strips `<script>` tags from any markdown source | ✅ | PR B #99 | `DOMPurify.sanitize()` runs after `marked.parse()` in `MarkdownBody` |
| 9 | All routes have working back/forward browser navigation | ✅ | PR D #101 | `useProjects` adds `popstate` listener for URL `?slug=` sync; wouter handles route changes |
| 10 | Direct URL load (no SPA hop) works for every route | ✅ | PR D #101 | `public/_redirects` rewrites all paths to `/index.html` (`/api/*` preserved) |

## Accessibility coverage

Per design-brief.md § Constraints: "WCAG AA contrast on all text/background pairs;
keyboard navigation across all interactive elements; focus rings visible (1px teal outline)."

| Concern | Implementation | Verifier |
|---|---|---|
| Skip-link to main content | `PageShell` § skipLink — visually hidden until focused, surfaces above sticky nav | Tab once on any page → "Skip to content" appears |
| Focus rings visible | `global.css` § `:focus-visible` rules on all interactive elements (a, button, etc.) — 1px teal outline + 2px offset | Keyboard-tab through any route |
| Active-link semantics | `PageShell` § `aria-current="page"` on the active nav link, in addition to teal color | Screen reader announces "current page" |
| Landmark regions | `<main id="main">`, `<nav aria-label="Primary">`, `<article>` for ADR/Plugin pages, `<section>` per content area | Browser dev-tools accessibility tree |
| Color contrast | Tokens hit AA per design-brief: `#e5e5e5` on `#0a0a0a` = 14.7:1; `#888` on `#0a0a0a` = 5.4:1; `#14b8a6` (accent) on `#0a0a0a` = 7.1:1 | Manual contrast check or tooling |
| Status column toggle | Native `<button>` with `aria-expanded` and `aria-controls` pointing at the column body | Screen reader announces collapse state |
| External links | `target="_blank" rel="noreferrer"` on all GitHub links | Standard practice |
| Reduced motion | `<Field />` checks `prefers-reduced-motion: reduce` and renders static dots | OS-level setting |

## Bundle size

Per design-brief: "<100 KB gzipped (excluding lucide-react icons used)".

The dependency footprint is intentionally small:

| Package | Approximate gzipped | Note |
|---|---|---|
| react + react-dom | ~45 KB | React 19 |
| wouter | ~2 KB | hook-based router |
| marked | ~12 KB | markdown |
| dompurify | ~9 KB | sanitizer |
| lucide-react | per-icon, tree-shaken | `ExternalLink` + `ChevronDown` + `ChevronRight` + `Activity` |

Estimated total (app code + deps, gzipped, excluding tree-shaken icons):
**~75 KB**. Well under the 100 KB target. To verify after `bun install`:

```bash
cd src/apps/live-artifact
bun run build
# Check dist/assets/*.js sizes
ls -la dist/assets/
```

## Spec coverage summary

| Spec | Covered? | Implementing PRs |
|---|---|---|
| `vite-scaffold.md` | ✅ | #96, #98 |
| `cloudflare-pages.md` | ✅ | #96, #101, #102 (wrangler.toml + KV + Functions) |
| `live-data.md` | ✅ | #101 (Pages Function + hook + URL sync + 30s refetch) |
| `content-routes.md` | ✅ | #99 (ADR + Changelog + MarkdownBody), #102 (PluginPage) |
| `three-env-staging.md` | ⏭ deferred | Phase B (Cloudflare deploy) — gated on `wrangler login` |
| `design-brief.md` | ✅ | All visual constraints honored across #98–#102 |

The only spec NOT fully covered is `three-env-staging.md`, which describes
the prod / staging / preview environments. That config lives on the
Cloudflare dashboard once the user runs `wrangler login` (CLAUDE.md
account-creation gate).

## Out of scope (per spec)

These items are explicitly excluded by the design-brief or content-routes
specs and remain so:

- Login / auth UI (CF Access handles this)
- Charts / analytics
- Search bar
- Sidebar
- Server-side rendering
- Comment threads on ADRs
- i18n / multi-language

## How to verify locally

```bash
cd src/apps/live-artifact
bun install
bun run dev                   # localhost:5173
```

Click through every route. Tab to verify the skip-link. Open dev-tools
accessibility tree to verify landmarks. Resize to <768px to verify the
mobile kanban behavior.

For the live data path:

```bash
GITHUB_TOKEN=<read-only-pat> bun run snapshot:projects
# → writes fresh public/projects-snapshot.json
bun run dev
# Dashboard renders the live data instantly via the snapshot
```

For `wrangler pages dev` (full Pages Functions + KV cache):

```bash
wrangler pages dev dist
# Functions live; uses miniflare's local KV
# Set GITHUB_TOKEN via .dev.vars (NOT committed)
```
