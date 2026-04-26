# Frontend design brief — `subagentorganizations.com`

Status: **draft** (Wave 1 — for handoff to `claude.ai/design/`)
Audience: another agent working in `claude.ai/design/` Research Preview
Companion to:
- [`./README.md`](./README.md) — frontend spec index
- [`./vite-scaffold.md`](./vite-scaffold.md) — Vite + React 19 stack
- [`./live-data.md`](./live-data.md) — `/api/projects` data shape the UI consumes
- [`./content-routes.md`](./content-routes.md) — per-plugin pages, ADR viewer, changelog
- [`./three-env-staging.md`](./three-env-staging.md) — prod / staging / preview

## Why a separate brief

Our 6 frontend specs (~776 lines) describe **what** to build. This brief
condenses them into a **prompt-shaped** input for the `claude.ai/design/`
Research Preview tool, which expects 1–2 paragraphs of intent + concrete
visual constraints, not a multi-page contract.

When this brief is handed to `claude.ai/design/`, the output should be:
1. A prototype the design agent can iterate on
2. A reference design system (colors, type, spacing) we capture into
   `src/apps/live-artifact/src/styles/` once implementation lands

## The brief (paste into `claude.ai/design/` Prototype mode)

> **Project**: live-artifact dashboard for `subagentorganizations.com` —
> a single-page React app that renders a polyrepo's GitHub Project board,
> issues, and PRs as a real-time tracker.
>
> **Aesthetic**: flat-dark with a single teal accent. Inspired by Anthropic
> Labs' own Cowork artifact + Linear/Vercel dashboards. Heavy use of
> typography, restrained use of color, generous whitespace. **No drop
> shadows, no gradients, no rounded-corner skeuomorphism.** Borders
> 1px only.
>
> **Background**: `#0a0a0a` to `#111` range. Foreground text `#e5e5e5`.
> Muted text `#888`. **Single accent**: a teal in the `#14b8a6` →
> `#0d9488` range. Used SPARINGLY (active states, links, status: in-progress).
>
> **Typography**: system stack — `ui-sans-serif, -apple-system,
> BlinkMacSystemFont, "Segoe UI", sans-serif` for body. Monospace
> `ui-monospace, "JetBrains Mono", "Fira Code", monospace` for code,
> issue refs, SHAs. **No Google Fonts; no third-party type loads.**
>
> **Layout**: 3 main routes
> - `/` — dashboard (kanban grouped by Project Status × Plugin filter)
> - `/plugins/:name` — per-plugin landing (README excerpt + recent issues)
> - `/adr` + `/adr/:number` — ADR viewer (markdown rendering)
> - `/changelog` — combined changelog across plugins (reverse-chrono)
>
> **Components needed**:
> - **Issue card**: title, repo `/` issue number, plugin chip, priority chip,
>   wave chip, effort chip, optional assignee. ~80px tall.
> - **Status column**: Todo, In Progress, In Review, Done, Won't do (4 visible by default; Won't do collapses)
> - **Plugin chip**: 1 of 8 muted colors (productivity-cli, product-management-cli,
>   data-cli, platform-engineering, it-admin, engineering-cli, schema, meta-repo);
>   chip is a 1-px outlined pill, not filled
> - **Page shell**: top nav (logo / Dashboard / Plugins / ADR / Changelog),
>   no sidebar, no footer. Logo is a custom 24×24 SVG (Braille-pattern dot
>   matrix; 6-dot grid, 3 dots active forming the letters "SO" if possible)
>
> **Hidden requirement (the "field")**: there's a subtle Braille-dot
> backdrop animation behind the dashboard route only — sparse white dots
> drifting at <2 fps, opacity 0.03. Per our commit-scope convention this
> animation is in its own component called `<Field />`. NOT distracting;
> users should barely notice it.
>
> **Constraints**:
> - **Single dependency**: `lucide-react` for icons. No other UI libs.
> - **No Tailwind YET** — use plain CSS modules or vanilla CSS variables
>   so future Tailwind adoption is mechanical
> - Mobile breakpoint: 768px. At <768px collapse to vertical kanban
>   (one column, scroll-snap horizontal between status states)
> - Accessibility: WCAG AA contrast on all text/background pairs;
>   keyboard navigation across all interactive elements; focus rings
>   visible (1px teal outline)
> - Bundle target: <100 KB gzipped (excluding lucide-react icons used)
>
> **Data shape** (from `/api/projects` Pages Function):
> ```typescript
> type Issue = {
>   number: number;
>   title: string;
>   repo: string;
>   plugin: 'productivity-cli' | 'product-management-cli' | 'data-cli' |
>           'platform-engineering' | 'it-admin' | 'engineering-cli' |
>           'schema' | 'meta-repo';
>   status: 'Todo' | 'In Progress' | 'In Review' | 'Done' | "Won't do";
>   priority: 'P0' | 'P1' | 'P2' | 'Stretch';
>   wave: 'Wave 0' | 'Wave 1' | 'Wave 2' | 'Future';
>   effort: 'XS' | 'S' | 'M' | 'L' | 'XL';
>   assignee: string | null;
>   url: string;
> };
> ```
>
> **Output requested**: a prototype with the dashboard route fully designed
> (kanban + 6-8 sample issue cards), the page shell, and a minimal design
> system (colors as CSS variables, type ramp, spacing scale). The 3 other
> routes (plugins, ADR, changelog) can be sketched in a single follow-up.
>
> Do NOT include: login / auth UI (not in scope; CF Access handles this);
> charts (no analytics in v1); search bar (defer to v2); or a sidebar.

## Why this shape

Reviewed against the 6 specs:

| Spec | Pulled-forward decisions |
|---|---|
| `vite-scaffold.md` | Single dependency on `lucide-react`; system font stack; bundle target |
| `live-data.md` | The exact `Issue` data shape (matches `/api/projects` response) |
| `content-routes.md` | Route enum (4 routes) + components (PageShell, MarkdownBody) |
| `cloudflare-pages.md` | Color tokens implied by `subagentorganizations.com` brand work + the `field` commit-scope hinting at the Braille animation |
| `three-env-staging.md` | Production-only design — staging gets the same UI behind CF Access |
| `README.md` | The 4-route layout + the kwpc-vs-meta-repo plugin distinction |

## What's deliberately ambiguous (intentional design freedom)

- Exact teal value within the `#14b8a6 → #0d9488` range
- Specific spacing scale (4-8-12-16 vs 4-8-16-24 etc.)
- Font weight choices (the brief says "system stack", lets the design
  agent pick weights)
- Animation easing for `<Field />` — design agent picks
- Logo's exact Braille-dot pattern (the "SO" hint is a suggestion, not a
  mandate)

The design agent should explore these. We'll converge on the actual
choices when the prototype lands and we promote tokens into
`src/apps/live-artifact/src/styles/`.

## Handoff workflow

When the autonomous orchestrator (or you, manually) opens this brief at
`claude.ai/design/`:

1. Open `claude.ai/design/` in Chrome MCP
2. Pick **Prototype** mode
3. Set **Project name**: `subagentorganizations-live-artifact`
4. **Design system**: use Default for the first iteration
5. Paste the bracketed-quote section above into the prompt input
6. Generate the prototype
7. **Capture the result URL** — save to `updates/2026-04-25-design-handoff/`
8. **Capture screenshots** of the dashboard route + the design-system
   page — save to the same dir
9. Open a follow-up issue here referencing the prototype URL and listing
   any additional iterations needed

The Chrome MCP work is a **separate iteration** from this brief PR.

## What this brief does NOT do

- Specify the actual code — that's the implementation phase per
  `vite-scaffold.md`
- Replace the 6 frontend specs — they're still the contract; this is the
  design-input layer above them
- Authorize the design agent to deploy anything — output is a prototype
  artifact, not production code
- Decide v2 features (search, charts, login UI) — explicitly excluded

## Sources

- The 6 frontend specs in `docs/spec/frontend/` (PR #18 — should merge to
  main before this brief is acted on)
- `claude.ai/design/` Research Preview screenshot 2026-04-25 PDT
- Internal aesthetic references in `docs/spec/frontend/cloudflare-pages.md`
  commit-scope conventions (Braille `field` animation is the load-bearing
  hidden detail)
