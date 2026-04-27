# Frontend: Content routes — per-plugin pages, ADR viewer, changelog

Status: **draft** (Wave 0)
Source: `~/claude-projects/akw-artifact-context/akw-step4-content-routes.txt` (697 lines, frozen audit copy)

## Purpose

Adds four content routes to the dashboard. Keeps the dashboard's flat-dark
aesthetic + teal accent. Adds **only one** new dependency category
(markdown renderer + sanitizer). Same route shell for all pages.

## Route table

| Path | Purpose |
|---|---|
| `/` | Dashboard (the live-artifact tracker — exists per [`./live-data.md`](./live-data.md)) |
| `/plugins` | PluginsIndex — 8-tile catalog grid (label + summary + open-issue count, links to `/plugins/:name`). Distinct from Dashboard; previously aliased to it. |
| `/plugins/:name` | Per-plugin landing page, templated from GitHub README + repo metadata |
| `/adr` | ADR index (auto-generated from `docs/adr/*.md` files in target repos) |
| `/adr/:number` | Individual ADR view |
| `/changelog` | Combined changelog across all plugins |
| `*` | NotFound page |

### PluginsIndex contract (`/plugins`)

Renders a grid (4-cols wide, 2-cols tablet, 1-col phone) of all 8 entries
in `PLUGIN_REGISTRY`. Each tile:

- Label (mono, primary): `<info.label>` from registry
- Open-issue count badge: `countByPlugin(issues)[slug]` via `useProjects()`
  + `lib/issueCounts.ts`
- Summary (one-line prose, brand-voice §4): `<info.summary>` from registry
- Owner/repo footer: `<info.ownerRepo>` + arrow icon
- Entire tile is a `<Link href="/plugins/:slug">` — full-card click target

Source-of-truth coupling: the tally helper `countByPlugin` is shared
with Dashboard (`lib/issueCounts.ts`) so the two routes can't drift on
"how do we count open issues per plugin".

## Required dependencies

| Package | Size | Purpose |
|---|---|---|
| `wouter` | 2 KB | Hook-based router; smaller than React Router for our needs |
| `marked` | 30 KB | Markdown → HTML; zero deps |
| `dompurify` | ~20 KB | HTML sanitization post-marked-render (XSS protection) |
| `@types/unist` (dev) | — | Future markdown AST manipulation |

Total cost: ~50 KB gzipped. Lower than alternatives (React Router + remark
chain would be 100+ KB).

## Required Pages Function: `/api/github-file`

`src/apps/live-artifact/functions/api/github-file.ts` — fetches a single
file from a GitHub repo via REST (cheaper than GraphQL for raw file
content), 5-min KV cache shared with `/api/projects`.

Query params:
- `owner`, `repo`, `path` (URL-encoded), `ref` (optional, defaults to
  default branch)

Response: `{ content: string, sha: string, encoding: 'utf-8' }`

Cache key: `gh-file:<owner>:<repo>:<path>:<ref>`. TTL: 300s.

## Component contracts

| Component | Path | Responsibility |
|---|---|---|
| `Router` | `src/routes/index.tsx` | wouter `Switch` mapping routes → components |
| `PluginPage` | `src/routes/PluginPage.tsx` | Loads README + plugin.json + recent issues; renders shell + body |
| `AdrIndex` | `src/routes/AdrIndex.tsx` | Lists ADRs from each plugin's `docs/adr/*.md` directory |
| `AdrPage` | `src/routes/AdrPage.tsx` | Renders single ADR via `MarkdownBody` |
| `Changelog` | `src/routes/Changelog.tsx` | Reverse-chrono merge of all plugin CHANGELOGs |
| `NotFound` | `src/routes/NotFound.tsx` | 404 with link back to `/` |
| `MarkdownBody` | `src/components/MarkdownBody.tsx` | `marked` + `DOMPurify`; styled with same Tailwind tokens as the dashboard |
| `PageShell` | `src/components/PageShell.tsx` | Header (logo + nav), main, footer; shared across all routes |

## ADR rendering rules

- ADRs live at `docs/adr/NNNN-title.md` in target repos (Anthropic-style 4-digit prefixed)
- Index sorts by NNNN ascending
- Front-matter (if present) parsed for `status`, `date`, `deciders`
- Body rendered via `MarkdownBody`
- Cross-links between ADRs (`./0003-some-other.md`) rewritten to
  `/adr/0003` so they navigate within the SPA

## Changelog merge

- Pulls each plugin's `CHANGELOG.md` (fetched via `/api/github-file`)
- Parses release-please's standard structure (## [X.Y.Z] — date)
- Merges all entries, sorts reverse-chrono
- Each entry tagged with the source plugin name as a chip

## Smoke-test checklist

After implementation:

- [ ] `/` renders dashboard (existing; should be unchanged)
- [ ] `/plugins/productivity-cli` loads README + recent issues for that plugin
- [ ] `/plugins/nonexistent` falls through to NotFound
- [ ] `/adr` lists at least one ADR
- [ ] `/adr/0001` renders the first ADR
- [ ] Cross-links between ADRs navigate without page reload
- [ ] `/changelog` shows entries from all plugins, reverse-chrono
- [ ] DOMPurify strips `<script>` tags from any markdown source
- [ ] All routes have working back/forward browser navigation
- [ ] Direct URL load (no SPA hop) works for every route — needs
      `_redirects` or wrangler `not_found_handling: "single-page-application"`

## Out of scope

- Server-side rendering (SPA only; static + KV cache is fast enough)
- Comment threads on ADRs (use GitHub issues)
- Search across ADRs/changelog (deferred to Wave 1+)
- i18n / multi-language

## Naming rename applied (vs source)

The source's `agentknowledgeworkers` references in Pages Function
defaults are rewritten to `subagentapps` — same pattern as
[`./live-data.md`](./live-data.md).

## Sources

- `~/claude-projects/akw-artifact-context/akw-step4-content-routes.txt`
- wouter: <https://github.com/molefrog/wouter>
- marked: <https://marked.js.org/>
- DOMPurify: <https://github.com/cure53/DOMPurify>
