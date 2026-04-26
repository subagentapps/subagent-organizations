# SHA-pinning refs to upstream Anthropic doc pages

## The problem

Anthropic ships Claude Code releases ~weekly. Each release can change the shape of
primitives we model (subagent frontmatter keys, hook events, settings options). If our
Zod schemas drift from the docs, we generate files that fail at runtime.

We saw this exact bug earlier in the session: I claimed there was no TypeScript LSP plugin
because I'd searched `llms.txt` and missed that `plugins-reference.md` documents an entire
`lspServers:` block. A SHA-pinned ref to `plugins-reference.md` would have:

1. Frozen the schema we generated against
2. Surfaced a "drift detected" warning when a re-verification found a different SHA
3. Forced a deliberate update + acceptance step, not silent breakage

## The mechanism

Each ref is a TS file:

```ts
// src/subagentmcp-sdk/refs/sub-agents/index.ts
import { z } from 'zod';
import { definePinnedRef } from '../types.js';

export const SubagentFrontmatterSchema = z.object({
  name:        z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  prompt:      z.string().optional(),
  tools:       z.union([z.string(), z.array(z.string())]).optional(),
  disallowedTools: z.union([z.string(), z.array(z.string())]).optional(),
  model:       z.union([z.enum(['haiku','sonnet','opus','inherit']), z.string()]).optional(),
  permissionMode: z.enum(['default','acceptEdits','auto','plan','bypassPermissions','dangerouslySkipPermissions']).optional(),
  mcpServers:  z.unknown().optional(),
  hooks:       z.unknown().optional(),
  maxTurns:    z.number().int().positive().optional(),
  skills:      z.array(z.string()).optional(),
  initialPrompt: z.string().optional(),
  memory:      z.enum(['enabled','disabled']).optional(),
  effort:      z.enum(['low','medium','high']).optional(),
  background:  z.boolean().optional(),
  isolation:   z.enum(['worktree','none']).optional(),
  color:       z.enum(['red','orange','yellow','green','blue','purple','pink','gray']).optional(),
});

export const SubAgentsRef = definePinnedRef({
  name: 'sub-agents',
  upstreamUrl: 'https://code.claude.com/docs/en/sub-agents.md',
  // SHA-256 of the upstream MD content when verified. Update with `bun run verify-refs --update`.
  pinnedSha256: 'TBD-fill-in-on-first-fetch',
  verifiedAt: '2026-04-25T00:00:00Z',
  schema: SubagentFrontmatterSchema,
});
```

## Verification flow

A `bun run verify-refs` script walks every ref:

```ts
// scripts/verify-refs.ts (sketch)
import { glob } from 'fast-glob';
import { subagentMd } from '../src/subagentmcp-sdk/tools/subagent-md.js';

for (const refPath of await glob('src/subagentmcp-sdk/refs/**/index.ts')) {
  const { default: ref } = await import(refPath);
  const { valid, currentSha } = await ref.verify();
  if (!valid) {
    console.error(`DRIFT: ${ref.name}`);
    console.error(`  pinned:  ${ref.pinnedSha256}`);
    console.error(`  current: ${currentSha}`);
    console.error(`  upstream: ${ref.upstreamUrl}`);
    console.error(`  Re-pin with: bun run verify-refs --update ${ref.name}`);
    process.exit(1);
  }
}
```

CI integration:
- **PR check** runs `bun run verify-refs` (read-only). Fails if any ref has drifted.
- **Nightly job** runs the same with `--update` and opens a PR with the SHA bumps so a
  human can review the schema diff before adopting it.

## Why content-SHA, not git-SHA

Two choices for what to pin:

1. **Content SHA-256** of the rendered markdown (`https://code.claude.com/docs/en/sub-agents.md`)
2. **Git SHA** of the file at `github.com/anthropics/...`

We pick **content SHA** because:
- The docs site is the canonical published surface
- Git SHAs would force us to know which repo backs the docs site (it's `anthropic/claude-code-docs` for some pages, internal-only for others)
- Content SHA captures *what Claude Code's users actually see*, not what an internal repo says

Trade-off: if Anthropic re-renders without changing content (e.g., a CSS bump that doesn't
affect the `.md`), the SHA stays stable. If they change a code block from 4-space to
2-space indent, the SHA changes — false-positive drift. We accept this; rare in practice.

## Initial ref set

| Ref | Upstream | Schema target |
|---|---|---|
| `sub-agents` | `/en/sub-agents.md` | `SubagentFrontmatterSchema` |
| `skills` | `/en/skills.md` | `SkillFrontmatterSchema` |
| `hooks` | `/en/hooks.md` | `HookEntrySchema`, `HookEvent` enum |
| `settings` | `/en/settings.md` | `SettingsSchema` |
| `plugins-reference` | `/en/plugins-reference.md` | `PluginManifestSchema`, `LSPManifestSchema` |
| `mcp` | `/en/mcp.md` | `McpServerEntrySchema` |
| `agent-teams` | `/en/agent-teams.md` | Team config schema; teammate spawn rules |
| `permissions` | `/en/permissions.md` | `PermissionRule` parser |
| `env-vars` | `/en/env-vars.md` | env-var name → semantics map |

Each ref gets its own subdirectory so the renderer can emit individual `docs/refs/<name>.md`
deeplinks (matching the markdown-to-typescript-migration spec).

## Drift severity classification

When a ref drifts, the SDK auto-classifies the change:

| Classification | What it means | Action |
|---|---|---|
| `compatible` | New optional fields added | Auto-bump SHA in nightly PR |
| `additive-required` | New required field | Block PR; human must add the field to creators using this ref |
| `breaking` | Removed field, renamed enum value, type narrowed | Block PR; human must migrate creators |
| `unknown` | Unparseable change (e.g., big restructure) | Block PR; human must inspect manually |

Classification is mechanical: walk both schemas, diff field-by-field. The harder cases just
default to `unknown` and surface for human review.
