# live-artifact — subagent-organizations dashboard

Live-artifact dashboard for the `subagentapps` polyrepo: a single-page
React 19 + Vite 6 app that renders the GitHub Project board, per-plugin
landing pages, ADRs, and a combined changelog. Deploys to
`subagentorganizations.com` via Cloudflare Pages.

Spec: [`docs/spec/frontend/`](../../../docs/spec/frontend/) — 6 specs total

## Develop

```bash
cd src/apps/live-artifact
bun install
bun run dev          # vite dev server, http://localhost:5173
```

The dev server reads from the bundled `public/projects-snapshot.json` +
`public/content-fixture.json`. To pull live data:

```bash
GITHUB_TOKEN=<read-only-pat> bun run snapshot:projects
# rewrites public/projects-snapshot.json with current GitHub state
bun run dev
```

## Build

```bash
bun run build        # outputs to ./dist
bun run preview      # serve ./dist locally
```

`bun run prebuild` runs the snapshot script automatically before
`bun run build` (no-op without `GITHUB_TOKEN`).

## Deploy

```bash
bun run deploy       # wrangler pages deploy dist --project-name=subagent-organizations
```

`wrangler login` is a one-time user-action gate. KV namespace setup:

```bash
wrangler kv namespace create SUBAGENT_CACHE
# Paste the `id` into wrangler.toml under [[kv_namespaces]]
```

`GITHUB_TOKEN` for the Pages Functions:

```bash
wrangler pages secret put GITHUB_TOKEN --project-name=subagent-organizations
```

## Stack

- **Vite 6** + **React 19** + **TypeScript 5.6+**
- **wouter** (~2 KB) — hook-based router
- **marked** + **dompurify** — markdown rendering with XSS sanitization
- **lucide-react** — iconography (tree-shaken; only the 4 icons we use)
- **wrangler** — Cloudflare Pages deployment

Bundle: ~75 KB gzipped (excluding tree-shaken icons), well under the
spec's 100 KB target.

## Structure

```
src/apps/live-artifact/
├── src/
│   ├── App.tsx              ← wires <Router />
│   ├── router.tsx           ← wouter Switch over the 4 routes
│   ├── main.tsx             ← React entry + global.css
│   ├── styles/
│   │   ├── tokens.css       ← design tokens (colors / type / spacing)
│   │   └── global.css       ← base reset + body type + focus rings
│   ├── types/
│   │   └── Issue.ts         ← Issue type from the spec
│   ├── hooks/
│   │   └── useProjects.ts   ← snapshot-then-live data hook
│   ├── lib/
│   │   ├── projectsFetcher.ts  ← reads /projects-snapshot.json
│   │   ├── contentFetcher.ts   ← reads /content-fixture.json
│   │   ├── githubFile.ts       ← /api/github-file client
│   │   └── pluginRegistry.ts   ← 8 plugins → repo + readme path
│   ├── components/
│   │   ├── PageShell/       ← top-nav + skip-link + main
│   │   ├── Logo/            ← 24×24 Braille SVG
│   │   ├── Field/           ← Braille-dot backdrop animation (Dashboard only)
│   │   ├── MarkdownBody/    ← marked + DOMPurify + cross-link rewriter
│   │   ├── Chip/            ← 17-tone outlined pill
│   │   ├── IssueCard/       ← single issue row
│   │   ├── StatusColumn/    ← kanban column with collapse
│   │   ├── KanbanGrid/      ← 5-column flex container
│   │   └── PluginFilter/    ← multi-select plugin chips
│   └── routes/
│       ├── Dashboard.tsx    ← `/` — full kanban + filter + Field
│       ├── PluginPage.tsx   ← `/plugins/:name` — README + recent issues
│       ├── AdrIndex.tsx     ← `/adr` — sorted ADR list
│       ├── AdrPage.tsx      ← `/adr/:number` — single ADR with markdown
│       ├── Changelog.tsx    ← `/changelog` — reverse-chrono merge
│       ├── NotFound.tsx     ← fallback 404
│       └── shared.module.css
├── functions/
│   └── api/
│       ├── projects.ts      ← GraphQL → Issue[] with KV cache
│       └── github-file.ts   ← REST single-file with KV cache
├── scripts/
│   └── snapshot-projects.ts ← build-time fixture generator
├── public/
│   ├── _redirects           ← SPA fallback for Cloudflare Pages
│   ├── favicon.svg
│   ├── projects-snapshot.json  ← build-time fixture (or live snapshot)
│   └── content-fixture.json    ← ADR + changelog fixture
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── wrangler.toml
```

## Multi-PR roadmap

The full per-spec implementation landed in 6 shippable slices:

| PR | Scope | Merged |
|---|---|---|
| ✅ A | Shell + 4 stub routes + Field animation + design tokens | #98 |
| ✅ B | MarkdownBody + AdrIndex + AdrPage + Changelog | #99 |
| ✅ C | Dashboard kanban: IssueCard / StatusColumn / KanbanGrid / PluginFilter | #100 |
| ✅ D | useProjects hook + /api/projects Pages Function + URL `?slug=` sync | #101 |
| ✅ E | /api/github-file Pages Function + PluginPage with live README | #102 |
| ✅ F | snapshot-projects script + accessibility audit + README + smoke-test | this |

The dashboard works locally with no Cloudflare auth (snapshot fallback).
With `GITHUB_TOKEN` + KV bound, it serves live data.

## Smoke test

[`docs/spec/frontend/smoke-test-results.md`](../../../docs/spec/frontend/smoke-test-results.md)
maps every checklist item from the spec to its implementing PR.

## Accessibility

- WCAG AA contrast on all text/background pairs (token-checked)
- Skip-link to main content (Tab once on any page)
- Focus rings visible on every interactive element (1px teal)
- `aria-current="page"` on active nav link
- `aria-expanded` / `aria-controls` on collapsible status columns
- `prefers-reduced-motion: reduce` respected by the Field animation
- Mobile breakpoint at 768px: vertical scroll-snap kanban
