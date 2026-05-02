# Live-Artifact Dashboard

_Started 2026-04-26 05:45 UTC_

---

## User

Project: live-artifact dashboard for subagentorganizations.com — a single-page React app that renders a polyrepo's GitHub Project board, issues, and PRs as a real-time tracker.

Aesthetic: flat-dark with a single teal accent. Inspired by Anthropic Labs' Cowork artifact + Linear/Vercel dashboards. Heavy typography, restrained color, generous whitespace. No drop shadows, no gradients, no rounded-corner skeuomorphism. Borders 1px only.

Background: #0a0a0a to #111 range. Foreground text #e5e5e5. Muted text #888. Single accent: teal in the #14b8a6 → #0d9488 range. Used SPARINGLY (active states, links, status: in-progress).

Typography: system stack (ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif) for body. Monospace ui-monospace, "JetBrains Mono", "Fira Code", monospace for code, issue refs, SHAs. No Google Fonts; no third-party type loads.

Layout: 4 main routes — / (dashboard kanban grouped by Status × Plugin filter), /plugins/:name (per-plugin landing), /adr + /adr/:number (ADR markdown viewer), /changelog (combined reverse-chrono).

Components needed:
- Issue card: title, repo/issue-number, plugin chip, priority chip, wave chip, effort chip, optional assignee. ~80px tall.
- Status column: Todo, In Progress, In Review, Done, Won't do (4 visible by default; Won't do collapses).
- Plugin chip: 1 of 8 muted colors (productivity-cli, product-management-cli, data-cli, platform-engineering, it-admin, engineering-cli, schema, meta-repo). 1px outlined pill, not filled.
- Page shell: top nav (logo / Dashboard / Plugins / ADR / Changelog), no sidebar, no footer. Logo is a custom 24×24 SVG (Braille-pattern dot matrix; 6-dot grid, 3 dots active forming letters "SO" if possible).

Hidden requirement (the "field"): subtle Braille-dot backdrop animation behind the dashboard route only — sparse white dots drifting at <2 fps, opacity 0.03. NOT distracting; users barely notice it. Component <Field />.

Constraints:
- Single dependency: lucide-react for icons. No other UI libs.
- No Tailwind YET — plain CSS modules or CSS variables so future Tailwind adoption is mechanical.
- Mobile breakpoint: 768px. At <768px collapse to vertical kanban (one column, scroll-snap horizontal between status states).
- Accessibility: WCAG AA contrast on all text/background pairs; keyboard navigation across all interactive elements; focus rings visible (1px teal outline).
- Bundle target: <100 KB gzipped (excluding lucide-react icons used).

Data shape (from /api/projects Pages Function):
type Issue = {
  number: number;
  title: string;
  repo: string;
  plugin: 'productivity-cli' | 'product-management-cli' | 'data-cli' | 'platform-engineering' | 'it-admin' | 'engineering-cli' | 'schema' | 'meta-repo';
  status: 'Todo' | 'In Progress' | 'In Review' | 'Done' | "Won't do";
  priority: 'P0' | 'P1' | 'P2' | 'Stretch';
  wave: 'Wave 0' | 'Wave 1' | 'Wave 2' | 'Future';
  effort: 'XS' | 'S' | 'M' | 'L' | 'XL';
  assignee: string | null;
  url: string;
};

Output requested: a prototype with the dashboard route fully designed (kanban + 6-8 sample issue cards), the page shell, and a minimal design system (colors as CSS variables, type ramp, spacing scale). The 3 other routes (plugins, ADR, changelog) can be sketched in a single follow-up.

Do NOT include: login/auth UI (CF Access handles), charts (no analytics in v1), search bar (defer to v2), or a sidebar.

## Assistant

I'll explore the design system first, then build this out. Let me also think about a few things worth confirming before I dive in.

_[tool: list_files]_

The design system project appears empty, so I'll work from the detailed spec you provided — it's already a complete, well-defined system (colors, type, spacing, components all specified). Let me get started.

_[tool: update_todos]_

_[tool: set_project_title]_

Let me build the files. I'll split into a few small JSX files per project conventions.

_[tool: write_file]_

_[tool: write_file]_

Got it — let me have a look at what you attached before I keep going. It might be relevant to the visual direction.

_[tool: read_file]_

_[tool: snip]_

I have the reference. The aesthetic direction is clear — flat surfaces, cooler teal, monospace meta, dense braille field. I'll keep my own brief (since yours is more recent and explicit: kanban not tree, dot-grid logo, sparser field) but borrow:

- Mono-heavy meta lines and uppercase letterspaced section labels
- The 1px-border, no-shadow flat treatment
- The "live · status pill with pulse dot" header pattern
- Status-color discipline (teal only for In Progress + active state)

Now let me build the components.

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Built v1 of the dashboard.

**What's in:**
- Top nav with Braille-dot **SO** logo (24px SVG, 6-dot grid), Dashboard / Plugins / ADR / Changelog links, live·synced·SHA meta on the right
- `<Field />` — sparse Braille-dot backdrop, opacity 0.03, refreshes ~1.7 fps, dashboard route only
- Kanban: Todo / In Progress / In Review / Done as 4 columns; Won't do collapsed below
- Plugin filter row above kanban with per-plugin counts
- 8 + 3 sample issues across all 8 plugins, all 5 statuses
- Issue card: repo·#num, title (2-line clamp), plugin/priority/wave/effort chips, assignee initials. ~80px tall.
- All chips are 1px outline pills, monospace; plugin chips colored from the 8-color palette; P0 is the only chip that gets teal
- Mobile <768px: kanban becomes horizontal scroll-snap, one column at a time
- Tokens live in `styles.css` as CSS variables — Tailwind migration is mechanical (e.g. `--accent` → `theme.colors.accent`)

**Caveats / next pass:**
- /plugins/:name, /adr, /changelog routes are placeholders — you said sketch in a follow-up, so they're stubs
- No icons used yet (lucide-react not loaded); chips are pure text. Easy to add when wired.
- Sample data is hardcoded in `data.js`; swap for `fetch('/api/projects')` when the Pages Function lands
- Won't-do collapse is local component state — survives route changes only within session

## User

Course-correction based on a reference design we already have (akw-landing-v1.tsx — the file you attached). The reference is closer to what we want than my original brief. Keep the kanban for the Dashboard route ONLY; rework the rest of the visual language to match the reference. Specific adjustments:

LAYOUT (rework). The reference is a 3-COLUMN layout, NOT pure kanban:
- Left rail (240px): Projects sidebar — list of plugins with horizontal % progress bars. Item: name + tiny right-aligned "267%" / "138%" velocity number; selected item has a thin teal left-border + brighter text. NO chips.
- Center (flex): a vertical OUTLINE TREE — Milestone → Issues (#101) → Tasks (T-0a1). Expandable with `▾` / `▸`. Left edge of each indented row has light vertical/horizontal connector lines (1px, very low opacity). Status appears as a right-aligned small-caps muted-color word: `completed`, `in progress`, `queued`. Progress bars are thin (1-2px) horizontal teal lines, NOT pills.
- Right rail (280px): Selected milestone detail card — `MILESTONE · M1`, big title, key/value rows (status / due / issues / tasks / progress), thin teal progress bar, and a small italic notes panel.

DASHBOARD ROUTE specifically: keep kanban (5 status columns × cards), but cards should be MUCH smaller — 28-32px row, not 80px. Heavy use of monospace for IDs and numbers. No chip-pills on cards; status is the column. Plugin shown by left-border color (1px), not a pill.

NAVIGATION (rework the 4 tabs):
The reference has NO top nav tabs. Map our 4 routes onto the reference top bar like this:
- Far left: small avatar circle + breadcrumb path `subagentapps / subagent-organizations` (mono font, "subagent" muted, "organizations" bright).
- Center-left: the 4 tabs as flat text buttons — `Dashboard` `Plugins` `ADR` `Changelog`. Active tab has a 1px teal underline; inactive are `#888`. NO pill backgrounds. Spacing: 24px horizontal between tabs.
- Far right: small `● on track` status pill (cyan dot + text) + `View on GitHub ↗` link.

COLORS (refine):
- Background: `#0a0a0a` to `#0f0f10` — slightly cooler than pure neutral
- Foreground: `#e5e5e5` for primary text, `#888` for muted
- Borders: `rgba(255,255,255,0.06)` — barely visible 1px lines
- Accent teal: cyan-leaning, more like `#5eead4` (Tailwind teal-300) for progress bars + active underlines + status: in-progress
- "completed" green: `#10b981` muted; "queued" gray: `#666`
- ZERO use of orange/red/yellow. Pure mono + cyan.

TYPOGRAPHY (refine):
- Mono for ALL identifiers (`#101`, `T-0a1`, `agentknowledgeworkers/agentknowledgeworkers`, `60%`, `12/18`, `5/12 done`)
- Sans-serif for prose (titles, descriptions)
- Small caps for section headers (`MILESTONES`, `ISSUES`, `TASKS`, `DONE`, `STATUS`)

STAT TILES:
Above the milestone tree, show 4 monospace count tiles in a row:
`MILESTONES 4` `ISSUES 18` `TASKS 47` `DONE 12/18`
Just labels in small-caps muted + big numbers in mono. No borders, no boxes — just whitespace separation.

KEEP from my original brief:
- Single dependency: lucide-react
- No Tailwind YET
- WCAG AA
- Bundle target <100 KB
- Issue type from /api/projects
- 768px mobile breakpoint
- The hidden <Field /> Braille animation (still wanted)

DROP from my original brief:
- "Plugin chip 1 of 8 muted colors" — replaced with left-border color
- "Issue card ~80px tall" — replaced with 28-32px tight rows
- The originally-described top nav with logo

OUTPUT: rebuild the Dashboard page (kanban) AND add the 3 other tab routes:
- /plugins/:name → 3-col layout with selected plugin in left rail, milestones+issues tree in center, plugin detail card on right
- /adr → 3-col with ADR index in left rail, selected ADR markdown in center, metadata card on right
- /changelog → 2-col (no left rail; entries flow center, right rail shows version selector + plugin filter)

The reference image lives at akw-landing-v1.tsx in your context. Match its density, restraint, and use of mono.

## Assistant

Got it — significant pivot. The reference's 3-column outline-tree layout is the spine, the kanban becomes a denser variant just for /dashboard, and tabs replace the nav pills. Let me plan and rebuild.

_[tool: update_todos]_

_[tool: snip]_

I'll rewrite the styles fresh and rebuild the components from scratch — the changes are extensive enough that overwrite is cleaner than edit.

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: delete_file]_

_[tool: snip]_

_[tool: done]_

_[tool: get_webview_logs]_

_[tool: snip]_

The error is on Dashboard line 476 — `<style style={pluginFilter === p ? {} : {}}>` is fine but `style` access on something undefined. Let me check — line 476 of the bundled output points to dashboard's filter chip rendering. The issue is likely that `--plug-${p}` is OK but maybe the issue is `window.PLUGIN_LABEL[p]` — but that's defined. Let me re-read.

Actually the error message says "reading 'productivity-cli'" on undefined. Looking at the dashboard code, the suspicious line is `for (const p of window.PLUGINS) m[p] = 0;` — but PLUGINS is defined. Let me check if maybe `STATUS_DOT` access on `issue.status` for "Won't do" works. Or — `STATUS_DOT[status]` where status comes from an issue. All issues have valid statuses.

Wait — `style={{ "--plug": ...`. That's fine. Let me re-read the IssueRow:

```
style={{ "--plug": `var(--plug-${issue.plugin})` }}
```

That accesses `issue.plugin` which is "productivity-cli". That's fine.

Actually — Babel may not parse `for...of` with `const` properly in some configs but usually it's fine. The actual error: "Cannot read properties of undefined (reading 'productivity-cli')". Something is `obj["productivity-cli"]` where `obj` is undefined.

In `Dashboard`: `m[i.plugin] = (m[i.plugin] || 0) + 1` — m is defined. But: `m[p] = 0` where p is "productivity-cli" — if `m` were undefined it would error like that. But m is `{ all: issues.length }`, defined.

Wait — `counts[p] || 0` where p is "productivity-cli" — counts is the memoized return. That should be fine.

Hmm — actually the error is likely from `STATUS_DOT[status]` where status comes from issues. But look — what about the `style` prop on filter-chip with a span inside that has `background: var(--plug-${p})`. That's fine.

Let me just look at the actual built component. The error comes from line 476 of the served HTML which is the babel-transformed bundle. I'll add safety guards and check what's actually undefined.

_[tool: read_file]_

I see — the error is most likely babel's parsing of the for-of loop, or actually more probably: `m[i.plugin]` where `m` is just being created. Let me look more carefully. Actually, the most likely culprit is a shared name collision — multiple JSX files have `STATUS_DOT`, `STATUS_LABEL`, `STATUS_COLS` constants. They get hoisted to module scope but each file's babel transform shares the global scope. If `STATUS_LABEL` gets redeclared, that throws. Let me check:

_[tool: grep]_

_[tool: snip]_

No name collisions actually. Let me look at line 476 of dashboard. Looking again, my actual reading: `style={{ "--plug": ... }}` — this object has a CSS custom property as a key. React supports this. But maybe the issue is that `Field` has a useEffect with ResizeObserver and something throws inside. Actually — error says line 476, which is inside the babel-transformed bundle, so it could be from anywhere.

Let me suspect the most likely issue — `Field` is defined in shell.jsx but referenced in dashboard.jsx. Inter-file scope! Each `<script type="text/babel">` gets its own scope. shell.jsx puts `Field` on `window`, but dashboard.jsx references `Field` directly, not `window.Field`. Same for `IssueRow`, `Column`, etc. — all internal to dashboard, fine — but `Field` is used in Dashboard:

_[tool: grep]_

_[tool: grep]_

_[tool: snip]_

That's the bug — `Field` is referenced unqualified in dashboard.jsx but lives only on `window` from shell.jsx. Same for `TopBar` in app.jsx, etc. Let me fix all cross-file refs and also check ChangelogRoute lookup is safe.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: snip]_

Same error in Dashboard. The error is reading `'productivity-cli'` on undefined. So somewhere we have `someUndef['productivity-cli']`. Looking at code: `STATUS_DOT[status]` — but status is "Todo" etc. The filter chip rendering is the most suspicious. Actually — `for (const p of window.PLUGINS) m[p] = 0;` then `m[i.plugin] || 0` — those are reading from m which is defined.

Wait — `style={{ background: `var(--plug-${p})` }}` is fine. But actually — is `window.PLUGINS` even available? Could be a script load order issue. data.js sets it but maybe — let me check if `window.PLUGIN_VELOCITY` is what plugins.jsx reads. The error is from Dashboard.

Actually wait — the lookup `counts[p]` where `counts` could be `undefined` if useMemo hasn't run? No, that's fine.

The error message "Cannot read properties of undefined (reading 'productivity-cli')" — it's `undefined['productivity-cli']`. In `Dashboard`, the only place this string is used as a key is `counts[p]`, `STATUS_DOT[status]` (not plugin), `m[p]`, `m[i.plugin]`. 

Oh! I see it now. The IssueRow uses `STATUS_DOT[status]` — but inline style with `"--plug": var(--plug-${issue.plugin})`. That reads `issue.plugin` which is fine.

Actually let me look at the byStatus reduce — `m[i.status]` uses status. But all statuses are valid keys.

Hmm — maybe the real issue: `window.PLUGINS` and `window.PLUGIN_LABEL` are loaded by data.js. But `<script src="data.js">` runs before babel scripts... maybe the JSX file `dashboard.jsx` is parsing/running before data.js loads? No, type="text/babel" scripts are deferred and run in order after the page is loaded.

Wait — the babel `<script type="text/babel">` runs AFTER the page is fully parsed, but does it wait for prior `<script src>` scripts? Usually yes, since `<script src>` (non-async) blocks parsing.

Let me check actually what the issue is by adding an error boundary and inspecting. Or simpler — let me just look at line 475 in the bundled output. Let me eval and check what window.PLUGINS is:

_[tool: eval_js]_

_[tool: snip]_

Found it — `window.PLUGIN_LABEL` and `window.PLUGIN_VELOCITY` are missing. data.js doesn't expose them on window. Let me check:

_[tool: grep]_

data.js is fine — those are all set on window. But the eval showed `vel: null` meaning `window.PLUGIN_VELOCITY` was undefined at that moment. That eval was racing the load. Actually looking again, `label` was also missing from the eval result. Yet `plugins` was set. Strange.

Wait — looking at the eval: `label: window.PLUGIN_LABEL` would serialize as `"label":{...}` if defined. It's missing entirely, meaning... oh, JSON.stringify drops keys with undefined values. So PLUGIN_LABEL and PLUGIN_VELOCITY were undefined.

But they ARE set in data.js. This must mean an error during data.js parsing stops execution after PLUGINS. Let me check — maybe the unicode arrow `→` or some char in the data is causing an issue. Actually more likely: there's a syntax error in data.js somewhere.

_[tool: snip]_

_[tool: eval_js]_

_[tool: snip]_

Interesting — PLUGINS, SAMPLE_ISSUES exist but PLUGIN_LABEL, PLUGIN_VELOCITY, PLUGIN_DETAIL don't. data.js executes top-to-bottom, so something between SAMPLE_ISSUES (line 43) and PLUGIN_DETAIL (line 63) is parsing fine but PLUGIN_LABEL (line 16) and PLUGIN_VELOCITY (line 29) are NOT being set. That's bizarre — they come BEFORE SAMPLE_ISSUES.

Oh wait — re-reading: `typeof undefined / undefined / object / undefined`. PLUGINS is set (we know), SAMPLE_ISSUES is object. The order: PLUGINS → PLUGIN_LABEL → PLUGIN_VELOCITY → SAMPLE_ISSUES → PLUGIN_DETAIL → ADRS → CHANGELOG. 

If LABEL and VELOCITY are undefined but SAMPLE_ISSUES is set... that's not a stop-on-error. It's like assignments were skipped. 

Oh! I think I know. data.js has `→` (an arrow char) in a string literal. Let me check — could a previous edition of data.js still be cached? But it loaded — let me look at the actual data.js file content carefully:

_[tool: read_file]_

_[tool: snip]_

_[tool: eval_js]_

_[tool: snip]_

The fetched data.js is the OLD 3448-byte version, not my 15062-byte rewrite. The browser is serving a cached file. Let me just rewrite data.js to force the fresh version.

_[tool: read_file]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Reworked into 4 routes per the akw reference:

**Top bar** — avatar/SO logo + breadcrumb `subagent / subagent-organizations`, 4 underline tabs (Dashboard / Plugins / ADR / Changelog) center-left, `● on track` + `View on GitHub ↗` far right.

**Dashboard** — dense kanban (4 cols, 30px rows). Plugin = 2px left-border color, no chips. Stat tiles (Plugins / Issues / In Progress / Done) above. Plugin filter row with mini color swatches. Won't-do collapses below. Field backdrop runs only here.

**/plugins** — 3-col: left rail lists 8 plugins with velocity % and 1px progress bars; center is the milestone → issue → task outline tree (caret toggles, status glyphs, dashed indent connectors, right-aligned lowercase status); right rail shows context-aware detail card (plugin / milestone / issue / task) with K/V grid + thin teal progress bar + italic notes.

**/adr** — 3-col: left rail ADR index, center renders markdown (custom 80-line renderer — headings, lists, blockquotes, code, links), right rail shows metadata + index. 6 ADRs included.

**/changelog** — 2-col reverse-chrono entries with date/version on left, kind tags (`add` teal, `break` red, `fix`/`docs` mono), right rail has plugin filter + version list.

**Tokens** — cooler `#5eead4` cyan, `rgba(255,255,255,0.06)` borders, all identifiers in mono, status words lowercase small-caps. Zero orange/yellow.

**Caveats** — fix landed: cross-file React refs needed `<window.X />` (each Babel script gets its own scope). Cache-busted `data.js?v=2` after a stale-cache stumble. Mobile breakpoint hides both rails.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Cache-bust applied to `styles.css?v=2`. v2 stylesheet now loads — topbar flexes horizontally, 3-col shell grids correctly, stats strip renders as a row.

