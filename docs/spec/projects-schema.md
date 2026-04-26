# GitHub Projects schema for `subagentapps/knowledge-work-plugins-cli`

Status: **draft** (Wave 0 schema design — pre-application)
Companion to:
- [`../research/anthropic-github-conventions.md`](../research/anthropic-github-conventions.md) — label taxonomy
- [`../research/knowledge-work-plugins-cli-survey.md`](../research/knowledge-work-plugins-cli-survey.md) — repo state
- [`../research/cowork-plugin-connectors.md`](../research/cowork-plugin-connectors.md) — connector enums

## Why this exists

Per /loop directive Phase C: GitHub Projects is the **live-artifact project
task management** substrate for the polyrepo. CLAUDE.md of
`knowledge-work-plugins-cli` is explicit:

> *"GitHub Projects is the source of truth — no local TASKS.md or dashboards."*

This file pins the Project schema (custom fields, status columns, milestones,
views) so Wave 0 boards stay consistent across all 5 plugins and we can
generate them programmatically.

## Source of truth for the user-provided screenshots

The user provided 2 screenshots on 2026-04-25 of GitHub Projects boards in
`subagentapps/knowledge-work-plugins-cli`:

- **productivity-cli Wave 0**: 50% complete (16/8 tasks done — note: this
  ratio was provided verbatim; treat as `closed/total = 16/32` until
  re-verified with `read:project` scope)
- **product-management-cli Wave 0**: 50% complete (11/8 tasks done; status
  flagged "at risk")

Both have a single "Wave 0" milestone, due 2026-06.

The screenshots have not been re-fetched in this iteration (avoiding token-
heavy image OCR). If the schema below diverges from the actual board, the
user (or a future iteration with `read:project` scope) can correct it.

## Project layout (one Project per plugin)

We create **5 Projects total**, one per plugin:

| Project number | Title | Plugin |
|---|---|---|
| TBD | productivity-cli | productivity-cli |
| TBD | product-management-cli | product-management-cli |
| TBD | data-cli | data-cli |
| TBD | platform-engineering | platform-engineering |
| TBD | it-admin | it-admin |

Each Project lives at the **org level** (`subagentapps`) so issues in
`knowledge-work-plugins-cli` and `subagent-organizations` can both be
linked. (Project IDs assigned at creation.)

## Custom fields per Project

Five custom fields, all on every Project:

| Field name | Type | Options | Required? |
|---|---|---|---|
| `Status` | single-select | `Backlog`, `Ready`, `In progress`, `In review`, `Done`, `Won't do` | yes (default: `Backlog`) |
| `Priority` | single-select | `P0`, `P1`, `P2`, `Stretch` | no |
| `Wave` | single-select | `Wave 0`, `Wave 1`, `Wave 2`, `Future` | yes (default: `Wave 0`) |
| `Effort` | single-select | `XS`, `S`, `M`, `L`, `XL` | no |
| `Plugin` | single-select | `productivity-cli`, `product-management-cli`, `data-cli`, `platform-engineering`, `it-admin`, `schema`, `meta-repo` | yes |

Rationale:

- `Status` columns map 1:1 to the kanban view (6 columns is the upper bound
  for usable horizontal scan)
- `Priority` mirrors the test-skeleton enum (`P0 | P1 | stretch`)
  established in `tests/cli/product-management-cli.test.ts` for sprint
  planning, plus a `P2` for non-stretch low-priority
- `Wave` cleanly separates milestone-style grouping (Wave 0 = foundation,
  Wave 1 = first impl, Wave 2 = polish, Future = parking lot)
- `Effort` t-shirt sizes — agent-friendly (categorical, not point-estimate)
- `Plugin` is the cross-Project routing field; lets meta-repo issues land
  in any plugin's Project

## Views per Project

Three views, in this order:

1. **Board** (default) — kanban grouped by `Status`, sorted by `Priority`
2. **Wave-0 Backlog** — table filtered to `Wave: Wave 0` and `Status ≠ Done`,
   sorted by `Priority` then `Effort`
3. **Roadmap** — roadmap view grouped by `Wave`, with date range from
   first-Wave-0-issue-creation → next-quarter-end

## Milestone usage

GitHub Milestones (separate from custom-field `Wave`) for date-bound work:

- `Wave 0 (Foundation)` — due 2026-06-30
- `Wave 1 (First Implementation)` — due 2026-09-30
- `Wave 2 (Polish + Release)` — due 2026-12-31

The `Wave` custom field and the Milestone are redundant by design — Milestone
appears on the Issue page itself (visible to Issue commenters), while the
Project field appears on the Project board. Keeping them in sync is the
job of the eventual `kwpc-schema` package.

## Issue → Project link contract

Every Issue in `knowledge-work-plugins-cli` should:

1. Have **at least one** `plugin:*` label (from the 18-label set in
   `anthropic-github-conventions.md`)
2. Be added to **exactly one** Project (the one matching its `plugin:*`
   label, or `meta-repo` if cross-cutting)
3. Have its `Plugin` custom field set to match the label
4. Have its `Wave` custom field set to match the Milestone

This redundancy gives us reliable filtering whether the consumer looks at
Issues, Project board, or Milestone.

## Schema enforcement

When `kwpc-schema` (the planned shared package in `packages/schema/`)
ships, it should expose:

```typescript
type ProjectFieldName = 'Status' | 'Priority' | 'Wave' | 'Effort' | 'Plugin';

type StatusOption = 'Backlog' | 'Ready' | 'In progress' | 'In review' | 'Done' | "Won't do";
type PriorityOption = 'P0' | 'P1' | 'P2' | 'Stretch';
type WaveOption = 'Wave 0' | 'Wave 1' | 'Wave 2' | 'Future';
type EffortOption = 'XS' | 'S' | 'M' | 'L' | 'XL';
type PluginOption =
  | 'productivity-cli' | 'product-management-cli' | 'data-cli'
  | 'platform-engineering' | 'it-admin' | 'schema' | 'meta-repo';

type ProjectFieldValue =
  | { field: 'Status'; value: StatusOption }
  | { field: 'Priority'; value: PriorityOption }
  | { field: 'Wave'; value: WaveOption }
  | { field: 'Effort'; value: EffortOption }
  | { field: 'Plugin'; value: PluginOption };
```

Discriminated union; each Issue's Project field set is `ProjectFieldValue[]`.

## Bootstrapping (deferred — gated)

Programmatic Project creation requires:

1. `read:project` + `project` scopes on the gh token (currently absent;
   `gh auth refresh -h github.com -s read:project,project` fixes)
2. A user OK for cross-org/cross-repo write per CLAUDE.md approval gates

When unblocked, the bootstrap script (`scripts/bootstrap-projects.sh`,
not yet written) does:

```
for plugin in productivity-cli product-management-cli data-cli platform-engineering it-admin; do
  gh project create --owner subagentapps --title "$plugin" --format json
  # …add 5 fields with options listed above
  # …add 3 views
done
```

## Live-artifact ↔ Cowork-Live-Artifact alignment

Boris Cherny's verbatim definition (from `bcherny-signal.md` 2026-04-20):

> *"In Cowork, Claude can now build live artifacts: dashboards and trackers
> connected to your apps and files. Open one any time and it refreshes with
> current data."*

Our `subagentapps/*` GitHub Projects ARE the CLI-substrate equivalent of
Cowork's live-artifact dashboards. The schema above defines what "current
data" means: 5 custom fields, 6 status columns, 3 views, hierarchical
Wave/Plugin grouping.

This is the dogfood loop closing on itself: the loop is producing the live
artifact (this repo's PR queue) using the same primitives it specifies.

## Open questions

- Do the user-provided screenshots show 6 status columns or fewer? The
  text "50% complete (16/8 done)" doesn't tell us. Verify when re-fetching.
- Is "at risk" (visible in product-management-cli screenshot) a separate
  field, a Status value, or a Priority value? Defer to actual board read.
- Should `Plugin` be multi-select to support cross-cutting issues, or is
  single-select + `meta-repo` the right shape? Tradeoff: multi-select makes
  the Plugin filter view harder to render.

## Test mapping

This spec backs:

- Phase C.8 (label mirror) — already gated on cross-org write
- Phase C.10 (Wave 0 task wiring) — gated; this schema must land first
- The eventual `kwpc-schema` package's GraphQL types

Tests for the schema itself land in `tests/cli/projects-schema.test.ts`
when `kwpc-schema` exposes its types — premature now.

## Sources

- User-provided screenshots (2026-04-25 18:31 PST), unverified
- `anthropics/*` label survey via GraphQL (Phase C.7)
- `subagentapps/knowledge-work-plugins-cli/CLAUDE.md` ("GitHub Projects is
  the source of truth")
- Boris Cherny canonical Live Artifacts definition
  (`docs/research/bcherny-signal.md` 2026-04-20)
