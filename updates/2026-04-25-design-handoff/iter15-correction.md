# Design correction sent — iter 15

Date: 2026-04-25 PDT
Project URL: https://claude.ai/design/p/6dc4877b-8981-4ce1-8e8d-d2a4d16ae573?file=index.html

## Context

By iter 15 the design generation from iter 13 had completed
(`?file=index.html` in the URL). The user sent a reference design — a
screenshot of the rendered `akw-landing-v1.tsx` from the staging area —
and asked for a course-correction in `claude.ai/design/`.

The reference shows what we ACTUALLY want, which differs in several
material ways from the original brief (PR #54). Corrections sent.

## Material corrections

### Layout: NOT pure kanban — 3-column outline-tree

Original brief implied single-column kanban + page shell. Reference shows
three columns:

- **Left rail (240px)**: Projects sidebar (plugin list + horizontal % bars)
- **Center**: vertical OUTLINE TREE — Milestone → Issue (#101) → Task
  (T-0a1) with expandable arrows (▾/▸) and 1px low-opacity connector lines
- **Right rail (280px)**: selected-milestone detail card

Dashboard route keeps kanban but at much higher density (28-32px rows,
not 80px cards).

### Navigation: tabs in top bar, NOT a separate nav strip

Reference has no separate tab strip. 4 routes mapped into top bar:

- Far left: avatar + breadcrumb `subagentapps / subagent-organizations`
  (mono font, "subagent" muted, "organizations" bright)
- Center-left: 4 flat-text tabs `Dashboard` / `Plugins` / `ADR` /
  `Changelog`. Active = 1px teal underline; inactive = `#888`. No pill
  backgrounds; 24px horizontal spacing
- Far right: `● on track` status + `View on GitHub ↗` link

### Colors: cooler accent, ZERO orange/red/yellow

- Teal: `#5eead4` (Tailwind teal-300) — cyan-leaning. NOT the
  `#14b8a6 → #0d9488` range originally specified
- Borders: `rgba(255,255,255,0.06)` — barely visible
- Pure mono + cyan + (optional muted green for `completed`)
- "completed" green: `#10b981` muted; "queued" gray: `#666`

### Typography: heavy mono usage

- Mono for ALL identifiers: `#101`, `T-0a1`, repo paths, `60%`, `12/18`,
  `5/12 done`
- Small caps for section headers: `MILESTONES`, `ISSUES`, `TASKS`, `DONE`,
  `STATUS`

### Stat tiles: 4 plain monospace counts

Above the milestone tree:

```
MILESTONES 4    ISSUES 18    TASKS 47    DONE 12/18
```

No borders, no boxes — just whitespace.

## Kept from the original brief

- Single dependency: `lucide-react`
- No Tailwind YET
- WCAG AA, <100 KB gzipped, 768px mobile breakpoint
- `Issue` data shape from `/api/projects`
- The `<Field />` Braille-dot backdrop animation

## Dropped

- "Plugin chip with 1 of 8 muted colors" — replaced with 1px left-border color
- "Issue card ~80px tall" — replaced with 28-32px tight rows
- The originally-described top nav with logo

## Added

Per-route layouts for the 3 non-dashboard tabs:

| Route | Layout |
|---|---|
| `/plugins/:name` | 3-col: selected plugin in left rail, milestones tree center, plugin detail right |
| `/adr` | 3-col: ADR index left, selected markdown center, metadata card right |
| `/changelog` | 2-col: entries center, version selector + plugin filter right |

## Status

- ✅ Course-correction sent to `claude.ai/design/`
- ⏭ Wait for regeneration (the design agent re-runs through the same
  todo list with the new constraints)
- ⏭ Re-screenshot when complete; critique against this correction

## Implications for our specs

When the corrected design lands and we approve it, the following spec
files need amendments:

| Spec file | Likely change |
|---|---|
| `docs/spec/frontend/design-brief.md` | Replace with this corrected brief; old brief was speculative |
| `docs/spec/frontend/content-routes.md` | Update component table: drop chip pills, add outline-tree component |
| `docs/spec/frontend/vite-scaffold.md` | No change (stack constraints unchanged) |
| `docs/spec/cli-skills/*.md` | No change (these are skill specs, not UI specs) |

A consolidation PR (post-prototype-approval) lands those amendments
together with the actual `src/apps/live-artifact/` scaffold.
