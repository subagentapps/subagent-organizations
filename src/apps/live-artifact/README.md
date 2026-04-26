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
- **lucide-react** for iconography
- **wrangler** for Cloudflare Pages deployment

## Structure

```
src/apps/live-artifact/
├── src/
│   ├── App.tsx              ← root component (minimal at scaffold time)
│   ├── main.tsx             ← React entry point
│   ├── vite-env.d.ts        ← Vite type augmentations
│   └── components/          ← split here as the dashboard grows
├── public/
│   └── favicon.svg
├── functions/               ← Cloudflare Pages Functions (live data)
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── wrangler.toml
```

The component-level architecture is deliberately minimal at scaffold time
(one root `App.tsx`). Per the design brief
([`docs/spec/frontend/design-brief.md`](../../../docs/spec/frontend/design-brief.md)),
the next step splits into per-route components (kanban / outline-tree /
top-bar tabs) once the build pipeline is verified end-to-end.
