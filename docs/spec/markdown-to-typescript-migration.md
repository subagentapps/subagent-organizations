# Migrate markdown specs → TypeScript with deeplinking

Date: 2026-04-25 · Branch: `feat/anthropic-vendor`
Reference pattern: [`code.claude.com/docs/en/context-window.md`](https://code.claude.com/docs/en/context-window.md)
Companion to: [`./claude-code-types.md`](./claude-code-types.md), [`./polyrepo-architecture.md`](./polyrepo-architecture.md)

## What the user observed

`context-window.md` isn't really a markdown document — it's an **MDX page that exports a
typed React component** (`<ContextWindow />`) backed by a structured event array. The prose
sections at the bottom (`## Related resources`) are deeplinks into other doc pages.

The data model in that file is, essentially:

```ts
type Event = {
  t: number;                  // 0..1 along the timeline
  kind: 'auto' | 'bang' | 'claude' | 'compact' | 'hook' | 'prompt' | 'slash' | 'sub' | 'user';
  label: string;
  tokens: number;
  color: string;              // '#E8A45C' etc.
  vis: 'hidden' | 'visible';
  desc: string;
  link?: string | null;       // '/en/memory#auto-memory'
  noSurviveCompact?: boolean;
  tip?: string;
};
```

That's the pattern we want to copy: **TypeScript as the source of truth, markdown rendered
from it, deeplinks across docs, and file paths that mirror the content tree.**

## The decision

So far we've written ~50 markdown files under `docs/spec/`. The structure was a useful
**test of the polyrepo design** — flexible while we explored — but the right end-state is
typed-data-with-renderers, not free-form markdown.

**Migration**: every markdown spec under `docs/spec/` becomes a TypeScript file at the same
relative path under `src/spec/`, exporting strongly-typed data. Markdown is regenerated from
the TS on every push. Deeplinks become typed cross-file references the compiler can resolve.

This is the same shift `context-window.md` made: from prose to data, with prose as a view
of the data.

## Filepath mirroring

The mapping rule: `docs/spec/<path>.md` → `src/spec/<path>.ts` with the **exact same** path
segments. The Anthropic docs site uses URL paths like `/en/context-window`, `/en/memory#auto-memory`,
`/en/sub-agents#enable-persistent-memory` — we mirror those as `src/spec/en/context-window.ts`,
exporting symbols matching the anchor IDs.

```
docs/spec/                          src/spec/                     code.claude.com path
└── claude-directory/               └── en/
    ├── claude-md.md          ←→        ├── memory.ts             /en/memory
    ├── settings-json.md      ←→        ├── settings.ts           /en/settings
    ├── agents.md             ←→        ├── sub-agents.ts         /en/sub-agents
    ├── skills.md             ←→        ├── skills.ts             /en/skills
    ├── rules.md              ←→        ├── memory.ts#rules       /en/memory#rules
    └── ...
└── subagents/                          ├── sub-agents/
    ├── README.md             ←→        │   ├── index.ts          /en/sub-agents
    ├── subagent-name.md      ←→        │   ├── name.ts           /en/sub-agents#name
    ├── subagent-tools.md     ←→        │   ├── tools.ts          /en/sub-agents#tools
    ├── subagent-color.md     ←→        │   └── color.ts          /en/sub-agents#color
    └── ...
└── claude-code-types.md      ←→     └── claude-code/types.ts
```

Because Claude Code's docs use `#anchor` for sub-sections rather than separate files,
we can either:
- **Option A** — match the docs 1:1 (one TS file per docs page; sub-sections are exported
  symbols within). Simpler routing, fewer files.
- **Option B** — one TS file per current markdown spec (more files, finer-grained imports,
  matches what we already have).

**Recommendation: Option A.** It's what `context-window.md` itself does — one MDX file with
many exported events keyed by ID. Cross-file references stay clean because every link target
is `<page>#<symbol>`.

## Deeplink shape

A `Link` is a typed reference to another spec entity. Mirrors the `link:` field in
context-window.md but compiler-checked.

```ts
// src/spec/_link.ts — the universal deeplink type
export interface DocLink {
  /** URL path on code.claude.com (or our generated docs site). e.g. '/en/memory#auto-memory' */
  href: string;
  /** Human label, used in rendered markdown */
  label: string;
  /** Internal symbol reference (compiler-checked when same-file) */
  ref?: () => unknown;
}

export const docLink = (href: string, label: string, ref?: () => unknown): DocLink =>
  ({ href, label, ref });
```

Every typed event/section/spec exports both its **data** and its **link**:

```ts
// src/spec/en/memory.ts
import { docLink } from '../_link.js';

export const autoMemory = {
  id: 'auto-memory' as const,
  title: 'Auto memory',
  description: "Claude's notes to itself across sessions...",
  cap: { lines: 200, bytes: 25_000 },
  compaction: 'reinjected-from-disk' as const,
};
export const autoMemoryLink = docLink('/en/memory#auto-memory', 'Auto memory', () => autoMemory);

export const claudeMdHierarchy = {
  id: 'choose-where-to-put-claude-md-files' as const,
  title: 'Choose where to put CLAUDE.md files',
  // ...
};
export const claudeMdHierarchyLink = docLink(
  '/en/memory#choose-where-to-put-claude-md-files',
  'CLAUDE.md hierarchy',
  () => claudeMdHierarchy,
);
```

Other files import the *link* (cheap; just a string + label) without pulling the entire
data structure:

```ts
// src/spec/en/context-window.ts
import { autoMemoryLink, claudeMdHierarchyLink } from './memory.js';
import { skillDescriptionLink } from './skills.js';

export const startupEvents = [
  {
    t: 0.035,
    kind: 'auto',
    label: 'Auto memory (MEMORY.md)',
    tokens: 680,
    color: '#E8A45C',
    vis: 'hidden',
    desc: "Claude's notes to itself...",
    link: autoMemoryLink,             // ← typed cross-reference
    noSurviveCompact: false,
  },
  // ... rest of timeline
] as const;
```

The compiler now catches:
- Typo'd link targets (the imported symbol must exist)
- Renamed pages (rename `autoMemory` → fixes every reference)
- Dead links (stale exports get a TS error)

## Renderer

A single `bun run scripts/render-spec.ts` pass walks `src/spec/`, calls `.toMarkdown()` on
each export, and writes the parallel `docs/spec/` tree. Markdown becomes generated output,
not source.

```ts
// src/spec/_renderer.ts (sketch)
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { glob } from 'fast-glob';

interface Renderable {
  id: string;
  title: string;
  toMarkdown(): string;
}

for (const path of await glob('src/spec/**/*.ts')) {
  const mod = await import(path);
  const out = Object.values(mod)
    .filter((x): x is Renderable => typeof x === 'object' && x && 'toMarkdown' in x)
    .map(x => x.toMarkdown())
    .join('\n\n---\n\n');
  const docPath = path.replace(/^src\/spec\//, 'docs/spec/').replace(/\.ts$/, '.md');
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(docPath, out);
}
```

The reverse direction (markdown → TS) isn't needed — TS is the source.

## What this gives the polyrepo

Recall the polyrepo plan: this meta-repo holds typed primitives, child KB repos consume
them. With this migration:

1. **`src/spec/`** is exported via the existing `package.json` `exports` map at
   `@subagentapps/subagent-organizations/spec/<path>`. Child KB repos `import { autoMemoryLink }`
   directly — no markdown parsing.
2. **Renderers ship in the same package.** A child repo can reuse `_renderer.ts` to render
   its own typed specs to markdown.
3. **Cross-repo links** become valid through the same `DocLink` type — a child KB's
   `import { ... } from '@subagentapps/subagent-organizations/spec/en/sub-agents'`
   resolves to a shared truth about sub-agent fields, with deeplinks back to the docs.

## File-by-file migration plan

Mapping each existing markdown spec (committed in PR #3) to its TS destination. Pages on
`code.claude.com` are the *external* deeplink targets; our `src/spec/en/*.ts` exports
mirror them.

| Current markdown | Becomes TS | External deeplinks it should resolve |
|---|---|---|
| `docs/spec/claude-code-types.md` | `src/spec/claude-code/types.ts` | `/en/plugins-reference#lspServers`, `/en/tools-reference#lsp-tool-behavior`, `/en/permissions`, `/en/hooks` |
| `docs/spec/claude-directory/README.md` | `src/spec/en/claude-directory.ts` | `/en/claude-directory`, `/en/context-window` |
| `docs/spec/claude-directory/claude-md.md` | merge into `src/spec/en/memory.ts` | `/en/memory` |
| `docs/spec/claude-directory/rules.md` | merge into `src/spec/en/memory.ts#rules` | `/en/memory#path-specific-rules` |
| `docs/spec/claude-directory/settings-json.md` | `src/spec/en/settings.ts` | `/en/settings`, `/en/permissions`, `/en/hooks` |
| `docs/spec/claude-directory/settings-local-json.md` | `src/spec/en/settings.ts#local` | `/en/settings#settings-files` |
| `docs/spec/claude-directory/mcp-json.md` | `src/spec/en/mcp.ts` | `/en/mcp#mcp-installation-scopes` |
| `docs/spec/claude-directory/worktreeinclude.md` | `src/spec/en/common-workflows.ts#worktrees` | `/en/common-workflows#copy-gitignored-files-to-worktrees` |
| `docs/spec/claude-directory/skills.md` | `src/spec/en/skills.ts` | `/en/skills` |
| `docs/spec/claude-directory/commands.md` | merge into `src/spec/en/skills.ts#commands` | `/en/skills` |
| `docs/spec/claude-directory/output-styles.md` | `src/spec/en/output-styles.ts` | `/en/output-styles` |
| `docs/spec/claude-directory/agents.md` | `src/spec/en/sub-agents.ts` | `/en/sub-agents` |
| `docs/spec/claude-directory/agent-memory.md` | `src/spec/en/sub-agents.ts#enable-persistent-memory` | `/en/sub-agents#enable-persistent-memory` |
| `docs/spec/claude-directory/claude-json.md` | `src/spec/en/settings.ts#global-config-settings` | `/en/settings#global-config-settings` |
| `docs/spec/claude-directory/global-projects.md` | `src/spec/en/memory.ts#auto-memory` | `/en/memory#auto-memory` |
| `docs/spec/claude-directory/keybindings.md` | `src/spec/en/keybindings.ts` | `/en/keybindings` |
| `docs/spec/claude-directory/themes.md` | `src/spec/en/terminal-config.ts#create-a-custom-theme` | `/en/terminal-config#create-a-custom-theme` |
| `docs/spec/subagents/*.md` (17 files) | `src/spec/en/sub-agents/*.ts` (one per key) OR merge as named exports in `src/spec/en/sub-agents.ts` | `/en/sub-agents#<key>` |
| `docs/spec/polyrepo-architecture.md` | `src/spec/polyrepo/architecture.ts` | (our own page) |
| `docs/research/*.md` | **not migrated.** Research stays as markdown. | — |

The merge cases consolidate per-page (Option A above). E.g., `claude-md.md`, `rules.md`,
`agent-memory.md`, `global-projects.md` all collapse into `src/spec/en/memory.ts` because
on the docs site they live under `/en/memory#<anchor>`.

## Concrete sketch for `src/spec/en/sub-agents.ts`

This is the highest-leverage file because the 17 subagent deeplinks consolidate cleanly:

```ts
// src/spec/en/sub-agents.ts
import { z } from 'zod';
import { docLink, type DocLink } from '../_link.js';
import { BuiltinTool, PermissionMode, HookEvent } from '../claude-code/enums.js';

// ─── Anchored sub-sections (each is its own deeplink target) ─────────────────

export const subagentName = {
  id: 'name' as const,
  title: 'name',
  required: true,
  schema: z.string().regex(/^[a-z0-9-]+$/),
  description: 'Stable identifier for the subagent. Equals the filename stem.',
  example: 'code-reviewer',
};
export const subagentNameLink = docLink('/en/sub-agents#name', 'name', () => subagentName);

export const subagentTools = {
  id: 'tools' as const,
  title: 'tools',
  required: false,
  schema: z.union([z.string(), z.array(z.nativeEnum(BuiltinTool))]),
  description: 'Allow-list of tools the subagent can call. Inherits all when omitted.',
  example: 'Read, Grep, Glob, Bash',
};
export const subagentToolsLink = docLink('/en/sub-agents#tools', 'tools', () => subagentTools);

export const subagentColor = {
  id: 'color' as const,
  title: 'color',
  required: false,
  schema: z.enum(['red','orange','yellow','green','blue','purple','pink','gray']),
  description: 'UI color tag for visual distinction in multi-pane sessions.',
  conventionForOurPolyrepo: {
    curator: 'blue',
    reviewer: 'green',
    builder: 'orange',
    researcher: 'purple',
    validator: 'gray',
    destructive: 'red',
  } as const,
};
export const subagentColorLink = docLink('/en/sub-agents#color', 'color', () => subagentColor);

// ... 14 more ...

// ─── The frontmatter as a typed whole ────────────────────────────────────────

export const SubagentFrontmatter = z.object({
  name: subagentName.schema,
  description: z.string().min(1),
  // ...
});

// ─── Renderable section descriptors for the markdown generator ───────────────

export const sections = [
  subagentName, subagentDescription, subagentPrompt, subagentTools,
  subagentDisallowedTools, subagentModel, subagentPermissionMode,
  subagentMcpServers, subagentHooks, subagentMaxTurns, subagentSkills,
  subagentInitialPrompt, subagentMemory, subagentEffort, subagentBackground,
  subagentIsolation, subagentColor,
] as const;

export const links = sections.map(s =>
  docLink(`/en/sub-agents#${s.id}`, s.title, () => s)
);
```

A child KB then writes:
```ts
// In a child KB's content/frontmatter-validator.ts
import { SubagentFrontmatter, subagentColorLink } from '@subagentapps/subagent-organizations/spec/en/sub-agents';
```

And the renderer produces a markdown file with the right deeplinks back into the
**generated** `docs/spec/en/sub-agents.md` *and* outbound to `code.claude.com/docs/en/sub-agents#color`.

## Build sequence

| Phase | Deliverable | Effort |
|---|---|---|
| **0** | This spec doc | (done — this file) |
| **1** | `src/spec/_link.ts` + `src/spec/_renderer.ts` skeletons | 30 min |
| **2** | Migrate `claude-code-types.md` → `src/spec/claude-code/{enums,types,schemas}.ts` (skeletons we already specced) | 1 hr |
| **3** | Migrate `subagents/*.md` (17 files) → `src/spec/en/sub-agents.ts` (one consolidated file with named exports per anchor) | 2 hr |
| **4** | Migrate `claude-directory/*.md` (15 files) → 9 TS files mirroring `code.claude.com/docs/en/<page>.ts` | 2 hr |
| **5** | Run `bun run scripts/render-spec.ts` to regenerate `docs/spec/`; commit and verify the markdown round-trips | 30 min |
| **6** | Add a CI check that fails the build if `docs/spec/` is out-of-sync with `src/spec/` (regenerate + git diff --exit-code) | 30 min |
| **7** | Delete the original markdown specs (now generated; live in TS) | 5 min |
| **8** | Wire to KB-children — the manifest's typed primitives all import from this module | (covered in polyrepo phase 1) |

## Tradeoffs vs. just keeping the markdown

| Concern | Markdown | Typed TS |
|---|---|---|
| Authoring speed for new specs | fast (just write it) | slower (types first, then content) |
| Reviewability of changes | high (just text diff) | high if renderer keeps deterministic output |
| Cross-file references | manual (string match) | compiler-checked |
| Reuse from child repos | requires markdown parsing | direct TS import |
| Drift between docs and code | possible | impossible (markdown is generated) |
| Onboarding cost | none | TS knowledge required |

**Net**: the TS approach is a one-time cost (~6 hours) that buys compile-time safety on
~50 cross-references and unlocks direct programmatic use from child KBs. Worth it.

## Anti-pattern flag

The WAF anti-patterns page calls out *Overengineering* explicitly:

> *"Building unnecessarily complex solutions or adding features without clear value."*

This proposal is on the line. It's defensible because:

- The deeplink pattern *already* exists in `context-window.md` — we're matching, not inventing.
- The compiler-checked reference is the same ROI as the discriminated-union design we adopted
  in `core/resource.md` — both prevent stringly-typed bugs.
- The renderer is 50 lines, not 5,000.

It would tip into overengineering if we: (a) added a custom DSL, (b) generated React MDX
components, (c) tried to round-trip prose-style markdown back into TS.

We're doing none of those. Just typed data + a deterministic markdown emitter.

## What I am NOT proposing

- Generating React components like Anthropic's `<ContextWindow />`. That's a docs-site
  feature; we don't ship a docs site (yet).
- Migrating `docs/research/*.md` to TS. Research is exploratory prose; types add no value.
- Auto-translating natural-language prose into TS structures. Authors write TS; markdown
  is the diff-friendly artifact.

## Open questions

1. **Anchor ID convention** — do we use `kebab-case` (matches Anthropic's URL fragments)
   or TypeScript-friendly `camelCase` exports? **Suggested**: `kebab-case` strings as the
   `id` field; `camelCase` for the JS-side variable names.
2. **External link checker** — should the renderer fetch each `code.claude.com` link to
   verify it 200s? **Suggested**: yes, but as a separate `bun run scripts/check-deeplinks.ts`
   in CI nightly, not on every render.
3. **Generated markdown header** — every generated file gets a `<!-- GENERATED FROM
   src/spec/<path>.ts — DO NOT EDIT -->` banner so contributors can't waste time editing
   the wrong file. Hook a pre-commit check to enforce.

## Sources

- https://code.claude.com/docs/en/context-window.md (the reference pattern)
- Existing typed primitives: [`./claude-code-types.md`](./claude-code-types.md)
- The 17 subagent deeplink markdown files: [`./subagents/`](./subagents/)
- The 15 .claude-directory specs: [`./claude-directory/`](./claude-directory/)
