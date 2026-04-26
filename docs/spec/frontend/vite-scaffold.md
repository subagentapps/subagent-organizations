# Frontend: Vite + React scaffold

Status: **draft** (Wave 0)
Source: `~/claude-projects/akw-artifact-context/akw-vite-scaffold.txt` (329 lines, frozen audit copy)
Implementation target: `src/apps/live-artifact/` (planned; per CLAUDE.md #3 mirrors this spec 1:1)

## Purpose

The live-artifact dashboard is a single-page Vite + React 19 app that renders
the polyrepo's GitHub Project board (via Cloudflare Pages Function — see
[`./live-data.md`](./live-data.md)) and ships to `subagentorganizations.com`
via Cloudflare Pages.

## Stack contract

| Layer | Choice | Rationale |
|---|---|---|
| Build | **Vite 6** | Fast HMR; matches Anthropic frontend posture |
| Runtime | **React 19** | Server Components ready; matches Cowork |
| Icons | `lucide-react` | Single dep, MIT, broadly used |
| TS | **TypeScript 5.6+** | Enables `target: es2022` |
| Node | `>=20` (`engines.node`) | Cloudflare Pages requirement |
| Deploy | `wrangler pages deploy` | Per [`./cloudflare-pages.md`](./cloudflare-pages.md) |
| Style | (TBD — likely Tailwind 4 or CSS modules) | Decision deferred to Wave 1 |

## Required package.json shape (the contract)

```json
{
  "name": "@subagentapps/live-artifact",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "deploy": "wrangler pages deploy dist --project-name=subagent-organizations"
  },
  "dependencies": {
    "lucide-react": "^0.383",
    "react": "^19",
    "react-dom": "^19"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4.3",
    "typescript": "^5.6",
    "vite": "^6",
    "wrangler": "^3.80"
  },
  "engines": { "node": ">=20" }
}
```

The package name is `@subagentapps/live-artifact` (npm scope = the GitHub org).
The Cloudflare Pages project name is `subagent-organizations` (matches the repo).

## Required directory layout

```
src/apps/live-artifact/
├── .github/
│   └── workflows/
│       └── deploy.yml         ← spec'd in three-env-staging.md
├── public/
│   └── favicon.svg
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── vite-env.d.ts
│   └── components/            ← split App.tsx as the dashboard grows
├── functions/                 ← Cloudflare Pages Functions (live-data.md)
│   └── .gitkeep
├── .gitignore
├── .nvmrc
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── wrangler.toml              ← spec'd in cloudflare-pages.md
├── LICENSE
└── README.md
```

## Key vite.config.ts decisions

- `resolve.alias: { '@': path.resolve(__dirname, './src') }` — short imports
- `build.target: 'es2022'` — CF Pages supports modern JS; no transpile cost
- `build.rollupOptions.output.manualChunks` — split `react` and `lucide-react`
  into their own chunks (cache stability across deploys)
- `server.port: 5173` — Vite default, kept consistent with `localhost:5173`
  reference in our existing `gitignore`/dev tooling
- `server.strictPort: false` — auto-shift to 5174 if 5173 is busy

## Out of scope for this spec

- Component-level architecture (`src/components/*`) — TBD per Wave 1
- Styling system choice — TBD
- Test framework choice (`bun test` vs `vitest`) — defer; align to repo
  CLAUDE.md #6 (use bun)
- Auth (Cloudflare Access) — see [`./three-env-staging.md`](./three-env-staging.md)
- Server-side data fetching — see [`./live-data.md`](./live-data.md)

## Acceptance criteria

When implementation lands:

1. `bun run dev` (or `npm run dev`) starts Vite on `localhost:5173`
2. `bun run build` produces `dist/` with content-hashed assets and source-maps
3. `bun run lint` passes with zero ESLint errors
4. The `dist/` output is deployable to Cloudflare Pages without further
   transformation (smoke-tested in `preview` env per
   [`./three-env-staging.md`](./three-env-staging.md))

## Naming rename applied (vs source)

| Source | This spec |
|---|---|
| `agentknowledgeworkers/agentknowledgeworkers` repo | `subagentapps/subagent-organizations` (this repo, under `src/apps/live-artifact/`) |
| `wrangler pages deploy --project-name=agentknowledgeworkers` | `--project-name=subagent-organizations` |
| Description "Agent Knowledge Workers — landing page + live project tracker dogfooded from knowledge-work-plugins-cli" | "Live-artifact dashboard for the subagentapps polyrepo, dogfooded from knowledge-work-plugins-cli" |

## Sources

- `~/claude-projects/akw-artifact-context/akw-vite-scaffold.txt` (frozen audit copy on PR #4 staging)
- Vite 6 docs: <https://vitejs.dev/>
- Cloudflare Pages docs: <https://developers.cloudflare.com/pages/>
