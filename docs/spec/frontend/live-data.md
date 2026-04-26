# Frontend: Live data — `/api/projects` Pages Function + KV cache + React data layer

Status: **draft** (Wave 0)
Source: `~/claude-projects/akw-artifact-context/akw-step3-live-data.txt` (614 lines, frozen audit copy)

## Purpose

Three pieces wire the dashboard to **live** GitHub Project + Issue data:

1. **Cloudflare Pages Function at `/api/projects`** — GraphQL proxy to GitHub
2. **Workers KV cache** with 5-min TTL — protects GitHub rate limits, makes
   page loads sub-100ms after warm
3. **React data layer** — `useProjects` hook, URL-synced selection,
   SWR-style cache, build-time static JSON fallback

End-to-end UX: page loads instantly from a cached build-time JSON snapshot,
client quietly fetches live data, swaps in **without flicker**.

## API contract

| Route | Returns |
|---|---|
| `GET /api/projects` | Summary of all projects (every plugin slug, totals) |
| `GET /api/projects/:slug` | Full milestone + issue + task tree for one slug |
| `GET /api/projects?fresh=1` | Bypass cache (dev/debug) |

Response cached in `SUBAGENT_CACHE` KV namespace for **300 seconds** (5
min). Cache key: `projects:<slug>`.

## Required environment bindings (wrangler.toml)

```toml
# Cloudflare Pages Function expects:
[[kv_namespaces]]
binding = "SUBAGENT_CACHE"
id = "<<wrangler-output>>"

# Plus secret bindings (NOT in wrangler.toml — set via dashboard or
# Cloudflare Secret Store binding for rotation):
#   GITHUB_TOKEN — fine-grained PAT, read-only, scoped to subagentapps org
```

## Pages Function shape

`src/apps/live-artifact/functions/api/projects.ts`:

```typescript
interface Env {
  GITHUB_TOKEN: string;       // fine-grained PAT, read-only, scoped to subagentapps org
  SUBAGENT_CACHE: KVNamespace;
  ENVIRONMENT: string;        // 'production' | 'staging' | 'preview'
}

const CACHE_TTL = 300;
const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

const PROJECT_MAP: Record<string, { owner: string; repo: string; label?: string }> = {
  'subagent-organizations': { owner: 'subagentapps', repo: 'subagent-organizations' },
  'kwpc':                   { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli' },
  'schema':                 { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli', label: 'area/schema' },
  'platform-engineering':   { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli', label: 'area/platform-engineering' },
  'productivity-cli':       { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli', label: 'area/productivity-cli' },
  'product-management-cli': { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli', label: 'area/product-management-cli' },
  'data-cli':               { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli', label: 'area/data-cli' },
  'it-admin':               { owner: 'subagentapps', repo: 'knowledge-work-plugins-cli', label: 'area/it-admin' },
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  // 1. Try cache (skip if ?fresh=1)
  // 2. Cache miss → GitHub GraphQL fetch
  // 3. Stash result in KV with CACHE_TTL
  // 4. Return JSON with Cache-Control + ETag headers
};
```

Full implementation lives in source `akw-step3-live-data.txt:13-262`. The
spec contract: function name, env shape, cache TTL, project map keys.

## Build-time static fallback

`src/apps/live-artifact/scripts/snapshot-projects.ts` runs in CI before
build, queries the same GraphQL shape, writes
`src/apps/live-artifact/public/projects-snapshot.json`. The React app
loads this synchronously at boot so the page renders before
`/api/projects` resolves.

When `/api/projects` returns, the React layer swaps in the live data with
a deterministic merge (no flicker; same shape).

## React data layer

```
useProjects(slug?: string): ProjectData
  ↓
  - Sync read of public/projects-snapshot.json (build-time)
  - Async fetch of /api/projects[/:slug] with stale-while-revalidate
  - URL-synced ?slug= for deep links
  - 30s background refetch when tab is focused
```

Hook lives at `src/apps/live-artifact/src/hooks/useProjects.ts`.

URL-syncing pattern (from source `:456-517`): selected project slug is the
URL hash + a `?slug=<value>` search param; both updated together so
deep-links work and back/forward navigation feels native.

## GitHub token setup

The token used by the Pages Function:

- **Fine-grained PAT**, scope: `subagentapps` org, **read-only**
- Permissions: `Issues: read`, `Pull requests: read`, `Projects: read`,
  `Metadata: read` (auto)
- Stored in Cloudflare dashboard env vars (current) → migrate to Secret
  Store binding (future) per [`./cloudflare-pages.md`](./cloudflare-pages.md)

This is **a different token** than the dev/automation token (which is
read-write). The Pages Function NEVER mutates GitHub state; it just
reads.

## Cache invalidation

- TTL-based (300s) — simple, predictable
- Manual: `?fresh=1` bypasses cache for dev
- Future: GitHub webhook → KV write to invalidate specific slugs on
  Issue/PR events. Tracked separately.

## Tasks → Claude Code TaskList integration

Source `:544-614` proposes `scripts/sync-tasks.sh <parent-issue-number>`
that mirrors GitHub sub-issues to local Claude Code TaskList for the
current branch's parent issue. Useful but out of scope for the frontend
spec; tracked separately.

## Out of scope

- Auth on `/api/projects` (it's read-only org data; if we ever return
  private fields, add CF Access — see [`./three-env-staging.md`](./three-env-staging.md))
- Webhooks for cache invalidation
- Mutation routes (POST/PUT/DELETE) — the dashboard is read-only

## Naming rename applied (vs source)

| Source | This spec |
|---|---|
| `agentknowledgeworkers` (org) | `subagentapps` |
| `AKW_CACHE` (KV binding) | `SUBAGENT_CACHE` |
| `'akw-site'` (project map slug) | `'subagent-organizations'` |
| GraphQL token "scoped to agentknowledgeworkers org" | "scoped to subagentapps org" |

## Sources

- `~/claude-projects/akw-artifact-context/akw-step3-live-data.txt`
- Cloudflare Pages Functions: <https://developers.cloudflare.com/pages/functions/>
- GitHub GraphQL API: <https://docs.github.com/en/graphql>
