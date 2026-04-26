# live-artifact — subagent-organizations dashboard

Live-artifact dashboard for the `subagentapps` polyrepo.

Spec: [`docs/spec/frontend/`](../../../docs/spec/frontend/)

## Develop

```bash
cd src/apps/live-artifact
bun install
bun run dev          # vite dev server, http://localhost:5173
```

## Build

```bash
bun run build        # outputs to ./dist
bun run preview      # serve ./dist locally
```

## Deploy

```bash
bun run deploy       # wrangler pages deploy dist --project-name=subagent-organizations
```

Cloudflare account auth (`wrangler login`) is a one-time user-action gate — see
[`docs/spec/frontend/cloudflare-pages.md`](../../../docs/spec/frontend/cloudflare-pages.md).

## Stack

- **Vite 6** + **React 19** + **TypeScript 5.6+**
- **wouter** — hook-based router (~2KB)
- **marked** + **dompurify** — markdown rendering with XSS sanitization
- **lucide-react** — iconography
- **wrangler** — Cloudflare Pages deployment

## Structure

```
src/apps/live-artifact/
├── src/
│   ├── App.tsx              ← wires <Router />
│   ├── router.tsx           ← wouter Switch over the 4 routes
│   ├── main.tsx             ← React entry point + global.css import
│   ├── vite-env.d.ts        ← Vite type augmentations
│   ├── styles/
│   │   ├── tokens.css       ← design tokens (single source of truth)
│   │   └── global.css       ← base reset + body type
│   ├── components/
│   │   ├── PageShell/       ← top-nav + main; used by every route
│   │   ├── Logo/            ← 24×24 Braille SVG logo
│   │   └── Field/           ← Braille-dot backdrop animation (Dashboard only)
│   └── routes/
│       ├── Dashboard.tsx    ← `/` — kanban (stub in PR A; full in PR C)
│       ├── PluginPage.tsx   ← `/plugins/:name` (stub; PR E adds README + issues)
│       ├── AdrIndex.tsx     ← `/adr` (stub; PR B)
│       ├── AdrPage.tsx      ← `/adr/:number` (stub; PR B)
│       ├── Changelog.tsx    ← `/changelog` (stub; PR B)
│       ├── NotFound.tsx     ← fallback 404
│       └── shared.module.css
├── public/
│   └── favicon.svg
├── functions/               ← Cloudflare Pages Functions (PR D + PR E)
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── wrangler.toml
```

## Multi-PR roadmap

The full per-spec implementation lands in shippable slices:

| PR | Scope |
|---|---|
| **A** (this) | Shell + 4 stub routes + Field animation + design tokens |
| B | MarkdownBody + AdrIndex + AdrPage + Changelog (read static markdown) |
| C | Dashboard kanban: 8 components (IssueCard, StatusColumn, chips, KanbanGrid) wired against static fixture |
| D | useProjects hook + /api/projects Pages Function (offline-fallback if no GITHUB_TOKEN) |
| E | /api/github-file Pages Function + plugin landing pages + ADR fetch |
| F | Final polish: snapshot fixture build script, README pass, accessibility audit |

PR D + E need the user to set up Cloudflare account / GITHUB_TOKEN (CLAUDE.md
gates), but the routes degrade gracefully without them — local dev shows the
build-time `projects-snapshot.json` fixture instead of live data.
