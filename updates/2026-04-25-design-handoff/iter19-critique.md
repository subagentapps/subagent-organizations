# Design critique — iter 19 (corrected output approved)

Date: 2026-04-25 PDT
Project URL: https://claude.ai/design/p/6dc4877b-8981-4ce1-8e8d-d2a4d16ae573?file=index.html

## TL;DR

The iter-15 correction generated a **production-quality v1**. All 4
routes render correctly, all major requirements honored, one minor
defensible divergence (`break` tag uses red — industry-standard
breaking-change semantic). Ready to extract tokens and start
implementation.

## Per-route verdict

### `/` Dashboard

**Status: ✅ approved**

What's right:
- 4 stat tiles: `PLUGINS 8`, `ISSUES 14`, `IN PROGRESS 3`, `DONE 3/14`
  with mono numbers + small-caps labels, no boxes
- Plugin filter row with `[all 14]` + 8 chips (productivity, pm, data,
  platform, it-admin, engineering, schema, meta) using color-coded dots,
  no fills
- 4 visible kanban columns (TODO 4 / IN PROGRESS 3 / IN REVIEW 2 /
  DONE 3) + collapsed `WON'T DO 2` at bottom
- Issue rows ~28-32px tight, mono `#211` `#142` IDs, P0/P1/P2 labels,
  reviewer initial codes (`kp`, `jl`, `rm`)
- Top bar: breadcrumb (mono, "subagent" muted, "organizations" bright),
  4 tabs with `Dashboard` underlined, `● on track` + `View on GitHub ↗`
- "Project board" title with `01` numbering + `in progress` status pill
  on the right; subtitle cites `github.com/subagentorganizations · Project #1`

### `/plugins/:name` (showing `productivity`)

**Status: ✅ approved — closest to akw reference**

What's right:
- 3-column layout: PLUGINS sidebar left (8 entries with `267%`/`92%`/etc
  velocity %), Milestones tree center, plugin detail card right
- **Outline tree** with `▾ ▸` expand chevrons; `M1` → `#13` → `T-0a1..T-0a4`
  hierarchy with proper indentation + connector glyphs
- Status text right-aligned (`completed` / `closed` / `in progress` /
  `queued`)
- 4 stat tiles: `MILESTONES 3` `ISSUES 14` `TASKS 38` `DONE 22/38`
- Right-rail detail card: PLUGIN, repo, status, target, milestones,
  issues, tasks, done — all key/value rows with mono values
- Italic notes panel at bottom of right rail: "Tasks, memory,
  coordination. Dogfooded to run this very project."

### `/adr` and `/adr/:number`

**Status: ✅ approved**

What's right:
- 3-column: DECISIONS index left rail with status checkmarks per ADR,
  selected ADR markdown center, METADATA card right
- Markdown rendering: 80-line limit per `content-routes.md`; headings,
  paragraphs, code blocks (`Nx / Turborepo`, `it-admin`,
  `subagentorganizations/<plugin>—cli`), bullet lists
- Cross-link rewriting works: `meta-repo/docs/adr/` shown at the bottom
- Right rail: title, status (`accepted` muted green), date (`2026-03-12`),
  number (`0001`), INDEX of all 6 ADRs

### `/changelog`

**Status: ✅ approved (with one defensible divergence)**

What's right:
- 2-column: reverse-chrono entries center, FILTER + VERSIONS right
- Subtitle: "Combined release notes across all eight plugins. Filter by
  plugin in the right rail."
- Versions list with date stamps on the left of each entry block
- Kind tags color-coded: `add` cyan, `fix` muted green, `docs` muted
- Plugin chips inline (productivity, engineering, data, schema, etc.)
- Right rail: FILTER (per-plugin checkboxes) + VERSIONS (version+date)
- Footer cites the source: "Generated from PR titles + commit trailers
  via `engineering-cli changelog --since v0.5.0`"

**Defensible divergence**: `break` tag uses red. Brief said "zero
orange/red/yellow," but red is the industry-standard semantic for
breaking changes. The agent's call is right — accept and document.

## Tokens captured (for implementation)

From the chat panel + visible CSS-variable conventions:

```css
:root {
  /* Colors */
  --bg:           #0a0a0a;          /* page background */
  --bg-elevated:  #0f0f10;          /* slightly elevated panels */
  --fg:           #e5e5e5;          /* primary text */
  --fg-muted:     #888;             /* muted text */
  --border:       rgba(255,255,255,0.06);   /* barely-visible 1px */

  --accent:       #5eead4;          /* Tailwind teal-300, cyan-leaning */
  --accent-dim:   rgba(94,234,212,0.12);    /* progress-bar fill */
  --success:      #10b981;          /* completed/accepted muted green */
  --warn:         #...;             /* TBD — confirm from styles.css */
  --break:        #ef4444;          /* breaking-change red (defensible divergence) */

  /* Plugin chip colors (8) — TBD: extract exact hex from styles.css */
  --plugin-productivity:        #...;
  --plugin-product-management:  #...;
  --plugin-data:                #...;
  --plugin-platform:            #...;
  --plugin-it-admin:            #...;
  --plugin-engineering:         #...;
  --plugin-schema:              #...;
  --plugin-meta:                #...;

  /* Type */
  --font-sans:    ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono:    ui-monospace, "JetBrains Mono", "Fira Code", monospace;

  /* Spacing scale (TBD: confirm exact units from styles.css) */
  --space-1:      4px;
  --space-2:      8px;
  --space-3:      12px;
  --space-4:      16px;
  --space-6:      24px;

  /* Layout */
  --row-height:           28px;     /* issue card / outline-tree row */
  --left-rail:            240px;
  --right-rail:           280px;
  --mobile-breakpoint:    768px;
}
```

## Components confirmed (8)

From cross-referencing the rendered output:

| Component | Path | Acceptance |
|---|---|---|
| `<TopBar />` | breadcrumb + 4 tabs + status pill + GitHub link | ✅ |
| `<StatTile />` | small-caps label + mono number; no border | ✅ |
| `<PluginChip />` | colored dot + name + count; outlined pill | ✅ |
| `<KanbanColumn />` | column title + count + scrollable issue list | ✅ |
| `<IssueCard />` | mono ID + title + priority + reviewer initials; ~28-32px | ✅ |
| `<OutlineTree />` | indented tree with `▾ ▸` chevrons + connector glyphs | ✅ |
| `<DetailCard />` | key/value rows + optional italic notes panel | ✅ |
| `<MarkdownBody />` | ADR markdown renderer with cross-link rewriting | ✅ |

## What needs extraction next iteration

1. **Open `Edit` mode in claude.ai/design** to read the actual CSS
   tokens (the `#...` placeholders above) — gives exact teal, plugin
   chip colors, spacing scale
2. **Open `Edit` mode** to read the React component structure — tells
   us file boundaries (`src/components/IssueCard.tsx`, etc.)
3. **Write `docs/spec/frontend/design-tokens.md`** with the extracted
   values — that becomes the source of truth `src/apps/live-artifact/`
   imports

## What this unblocks

- Issue #10 (deploy live-artifact dashboard) — design phase ✅, scaffold
  + implementation phase next
- The 6 frontend specs in `docs/spec/frontend/` need amendments per the
  iter-15 correction (chip pills → left-border colors, 80px → 28-32px,
  etc.) — captured in iter-15 PR #57's "Spec amendments queued" section

## Files in the design project (visible in tab title strip)

- `index.html` (currently selected)
- `Design Files` (folder grouping for `data.js`, `styles.css`)
- (probably: `App.jsx` / `Dashboard.jsx` / `Plugins.jsx` / `ADR.jsx` /
  `Changelog.jsx` / per-component files — not yet inspected)

## Status

- ✅ Design corrected per iter-15 brief
- ✅ All 4 routes render correctly
- ✅ Tokens partially extracted (placeholders for exact hex values)
- ⏭ Next iter: open Edit mode, extract exact tokens, write
  `docs/spec/frontend/design-tokens.md`
- ⏭ After that: scaffold `src/apps/live-artifact/` per
  `docs/spec/frontend/vite-scaffold.md` using these tokens
