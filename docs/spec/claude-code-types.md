# `src/claude-code/` — typed primitives + directives for Claude Code on Max plan

Date: 2026-04-25 · Branch: `feat/anthropic-vendor`
Companion to: [`docs/spec/polyrepo-architecture.md`](./polyrepo-architecture.md), [`./core/resource.md`](./core/resource.md)
Sources:
- https://code.claude.com/docs/en/claude-directory.md
- https://code.claude.com/docs/en/context-window.md
- https://code.claude.com/docs/en/env-vars.md
- https://code.claude.com/docs/en/platforms.md
- https://code.claude.com/docs/en/plugins-reference.md
- https://code.claude.com/docs/en/tools-reference.md

## Why this lives here

The user goal: *"developer knowledge base for Max subscriptions using `CLAUDE_CODE_OAUTH_TOKEN`
in their CLI terminal for polyrepo engineering to build a business."*

Translated to types:

- **Subject of every workflow**: a developer on a **Max subscription** running the **CLI**
  (per `platforms.md`, the CLI is the only surface with full feature set + Agent SDK + computer
  use on macOS for Pro/Max + third-party providers).
- **Auth model**: `CLAUDE_CODE_OAUTH_TOKEN` (long-lived, scoped to a single Max subscription).
- **Workflow shape**: meta-repo (`subagent-organizations`) drives N child KB repos via reusable
  workflows, change sets, and the manifest pattern from the polyrepo spec.
- **Output**: this file specifies the **TypeScript enum + Zod schema layer** that captures
  Claude Code's primitives and directives so the meta-repo can model and validate them.

## Two concept families

Per `plugins-reference.md`:

> *"Plugin components include skills, agents, hooks, MCP servers, LSP servers, and monitors."*

Per `tools-reference.md`:

> Built-in tools: `Bash`, `LSP`, `Monitor`, `PowerShell` (opt-in), plus the standard file/edit/grep/web tools.

Per `claude-directory.md`'s file reference (the 14-row table):

> `CLAUDE.md`, `rules/*.md`, `settings.json`, `settings.local.json`, `.mcp.json`, `.worktreeinclude`,
> `skills/<name>/SKILL.md`, `commands/*.md`, `output-styles/*.md`, `agents/*.md`,
> `agent-memory/<name>/`, `~/.claude.json`, `projects/<project>/memory/`, `keybindings.json`,
> `themes/*.json`.

These cluster into two families we model separately:

| Family | Examples | Modeled as |
|---|---|---|
| **Primitives** | Plugin components — skill, agent, hook, MCP server, LSP server, monitor | Discriminated-union of typed classes (existing `Resource` pattern in our `src/`) |
| **Directives** | Filesystem layout — CLAUDE.md, settings.json, rules/, skills/, commands/, output-styles/, themes/, .worktreeinclude | Path + content-shape contracts validated by Zod schemas |

Primitives are *what Claude Code runs*; directives are *where they live and how the runtime
loads them*.

## Enum layer

```ts
// src/claude-code/enums.ts
// All values verified against the Claude Code docs (claude-directory.md,
// plugins-reference.md, tools-reference.md) at SHA <pin>.

/**
 * Plugin component kinds — what a plugin can ship.
 * Source: plugins-reference.md §"Plugin components reference"
 */
export enum PluginComponentKind {
  Skill      = 'skill',
  Agent      = 'agent',
  Hook       = 'hook',
  MCPServer  = 'mcp-server',
  LSPServer  = 'lsp-server',
  Monitor    = 'monitor',
  Theme      = 'theme',
}

/**
 * Hook lifecycle events.
 * Source: plugins-reference.md §"Hooks", confirmed by claudekit + parry usage.
 */
export enum HookEvent {
  PreToolUse        = 'PreToolUse',
  PostToolUse       = 'PostToolUse',
  PostToolUseFailure = 'PostToolUseFailure',
  UserPromptSubmit  = 'UserPromptSubmit',
  Stop              = 'Stop',
  SubagentStop      = 'SubagentStop',
  SessionStart      = 'SessionStart',
  SessionEnd        = 'SessionEnd',
  CwdChanged        = 'CwdChanged',       // shipped in w13 per updates/claude-code/2026-w13/07-other-wins.md
  FileChanged       = 'FileChanged',      // ditto
}

/**
 * Permission modes — how Claude treats tool-call approvals.
 * Source: tools-reference.md, our existing aliases.zsh, w13 release notes.
 */
export enum PermissionMode {
  Default                   = 'default',
  AcceptEdits               = 'acceptEdits',
  Auto                      = 'auto',         // shipped in w13
  Plan                      = 'plan',
  BypassPermissions         = 'bypassPermissions',
  DangerouslySkipPermissions = 'dangerouslySkipPermissions',
}

/**
 * Settings file scopes — where a settings file lives, ordered low → high precedence
 * Source: claude-directory.md §"Settings precedence" link → settings.md
 */
export enum SettingsScope {
  Global       = 'global',          // ~/.claude/settings.json
  Project      = 'project',         // <repo>/.claude/settings.json
  ProjectLocal = 'project-local',   // <repo>/.claude/settings.local.json (gitignored)
  CLIFlag      = 'cli-flag',        // --settings <path>
  Managed      = 'managed',         // managed-settings.d/  (org policy, highest)
}

/**
 * Subscription tiers — capability gates for Max-plan KB workflows.
 * Source: platforms.md §"Where to run Claude Code"
 */
export enum SubscriptionTier {
  Free       = 'free',
  Pro        = 'pro',
  Max        = 'max',                // target tier for our polyrepo workflow
  Team       = 'team',
  Enterprise = 'enterprise',
}

/**
 * Surfaces — which Claude Code interface is in use.
 * Source: platforms.md §"Where to run Claude Code"
 */
export enum Surface {
  CLI       = 'cli',                 // full feature set + Agent SDK + computer use
  Desktop   = 'desktop',
  VSCode    = 'vs-code',
  JetBrains = 'jetbrains',
  Web       = 'web',
  Mobile    = 'mobile',
}

/**
 * Built-in tools — names that appear in `permissions.allow` / `tools:` frontmatter.
 * Source: tools-reference.md §"Tools" + the SDK overview's "Built-in tools" tab.
 */
export enum BuiltinTool {
  Read       = 'Read',
  Write      = 'Write',
  Edit       = 'Edit',
  MultiEdit  = 'MultiEdit',
  Bash       = 'Bash',
  Glob       = 'Glob',
  Grep       = 'Grep',
  WebSearch  = 'WebSearch',
  WebFetch   = 'WebFetch',
  Monitor    = 'Monitor',
  LSP        = 'LSP',
  PowerShell = 'PowerShell',         // Windows-only, opt-in via env var
  AskUserQuestion = 'AskUserQuestion',
}

/**
 * Settings precedence ranks — used for resolving conflicting values.
 * Source: claude-directory.md §"File reference" + linked settings precedence.
 */
export enum SettingsPrecedence {
  Managed       = 100,   // org policy — overrides everything
  CLIFlag       = 80,    // --settings, --permission-mode etc.
  ProjectLocal  = 60,    // .claude/settings.local.json
  Project       = 40,    // .claude/settings.json
  Global        = 20,    // ~/.claude/settings.json
  EnvironmentVar = 10,   // varies — see env-vars.md
}

/**
 * Lifecycle of a configuration item across compaction.
 * Source: context-window.md §"What survives compaction"
 */
export enum CompactionFate {
  Unchanged           = 'unchanged',          // System prompt, output style
  ReinjectedFromDisk  = 'reinjected-from-disk', // CLAUDE.md, unscoped rules, auto memory
  LostUntilTrigger    = 'lost-until-trigger',  // path-scoped rules, nested CLAUDE.md
  ReinjectedTruncated = 'reinjected-truncated', // skill bodies (5k/25k caps)
  RunsAsCode          = 'runs-as-code',         // hooks
}

/**
 * Auth modes for `CLAUDE_CODE_OAUTH_TOKEN` and friends.
 * Source: env-vars.md, authentication.md.
 */
export enum AuthMode {
  OAuthToken     = 'oauth-token',         // CLAUDE_CODE_OAUTH_TOKEN — Max-plan target
  AnthropicApiKey = 'anthropic-api-key',  // ANTHROPIC_API_KEY — direct API
  Bedrock        = 'bedrock',             // CLAUDE_CODE_USE_BEDROCK
  Vertex         = 'vertex',              // CLAUDE_CODE_USE_VERTEX
  Foundry        = 'foundry',             // CLAUDE_CODE_USE_FOUNDRY
}
```

## Zod schema layer

```ts
// src/claude-code/schemas.ts
import { z } from 'zod';
import {
  PluginComponentKind, HookEvent, PermissionMode, SettingsScope,
  SubscriptionTier, Surface, BuiltinTool, AuthMode,
} from './enums.js';

// ─── Common ──────────────────────────────────────────────────────────────────

export const PathString = z.string().min(1);
export const NodeMajorTagOrSha = z.string().regex(/^(v\d+(?:\.\d+){0,2}|[a-f0-9]{7,40})$/);

// ─── settings.json (project + global) ────────────────────────────────────────
// Source: settings.md §"Available settings" + observed shape in our own ~/.claude/settings.json

const PermissionRule = z.string();   // e.g. "Bash(git log:*)"; full grammar lives in permissions.md

export const SettingsSchema = z.object({
  '$schema':     z.string().optional(),
  permissions:   z.object({
    allow:       z.array(PermissionRule).default([]),
    deny:        z.array(PermissionRule).default([]),
    defaultMode: z.nativeEnum(PermissionMode).optional(),
  }).optional(),
  hooks:         z.record(z.nativeEnum(HookEvent), z.array(z.object({
    matcher:     z.string().optional(),
    hooks:       z.array(z.discriminatedUnion('type', [
      z.object({ type: z.literal('command'),  command: z.string(), if: z.string().optional(), timeout: z.number().optional() }),
      z.object({ type: z.literal('prompt'),   prompt:  z.string(), if: z.string().optional(), timeout: z.number().optional() }),
      z.object({ type: z.literal('mcp_tool'), server:  z.string(), tool: z.string() }),  // shipped v2.1.118
    ])),
  }))).optional(),
  env:           z.record(z.string(), z.string()).optional(),
  enabledPlugins: z.record(z.string(), z.boolean()).optional(),
  preferredNotifChannel: z.enum(['terminal_bell','iterm2','os','none']).optional(),
  statusLine:    z.unknown().optional(),
  theme:         z.string().optional(),
  cleanupPeriodDays: z.number().int().positive().optional(),
});

// ─── plugin.json + .lsp.json ─────────────────────────────────────────────────

export const LSPServerEntry = z.object({
  command: z.string(),
  args:    z.array(z.string()),
  extensionToLanguage: z.record(z.string(), z.string()).optional(),
  initializationOptions: z.unknown().optional(),
});

export const LSPManifestSchema = z.record(z.string(), LSPServerEntry);

export const PluginManifestSchema = z.object({
  name:        z.string().min(1),
  version:     z.string(),
  description: z.string().optional(),
  author:      z.union([z.string(), z.object({ name: z.string(), email: z.string().optional(), url: z.string().optional() })]).optional(),
  license:     z.string().optional(),
  homepage:    z.string().url().optional(),
  repository:  z.unknown().optional(),
  commands:    z.array(z.string()).optional(),
  agents:      z.array(z.string()).optional(),
  hooks:       z.string().optional(),                  // path to hooks.json
  mcpServers:  z.union([z.string(), z.unknown()]).optional(),
  lspServers:  z.union([z.string(), LSPManifestSchema]).optional(),
  monitors:    z.array(z.string()).optional(),
  themes:      z.array(z.string()).optional(),
  userConfig:  z.unknown().optional(),                 // shipped v2.1.83 — keychain-backed
});

// ─── Subagent (agents/*.md frontmatter) ──────────────────────────────────────

export const SubagentFrontmatter = z.object({
  name:         z.string().min(1),
  description:  z.string().min(1),
  tools:        z.array(z.union([z.nativeEnum(BuiltinTool), z.string()])).optional(),
  disallowedTools: z.array(z.string()).optional(),
  permissionMode: z.nativeEnum(PermissionMode).optional(),
  initialPrompt: z.string().optional(),                // shipped v2.1.85
  hooks:        z.unknown().optional(),
  mcpServers:   z.unknown().optional(),
});

// ─── Skill (skills/<name>/SKILL.md frontmatter) ──────────────────────────────

export const SkillFrontmatter = z.object({
  name:        z.string().min(1),
  description: z.string().min(1),
  // Per context-window.md, skill bodies are capped at 5,000 tokens after compaction.
  // We don't validate token count here; lint runs separately.
});

// ─── Rule (rules/*.md frontmatter) ───────────────────────────────────────────

export const RuleFrontmatter = z.object({
  paths:       z.array(z.string()).optional(),         // e.g. ["src/**/*.ts"]
  description: z.string().optional(),
});

// ─── Subscription / surface / auth context ───────────────────────────────────
// Used by polyrepo workflows to gate Max-only features.

export const RuntimeContext = z.object({
  subscription: z.nativeEnum(SubscriptionTier),
  surface:      z.nativeEnum(Surface),
  auth:         z.nativeEnum(AuthMode),
  oauthTokenPresent: z.boolean(),     // process.env.CLAUDE_CODE_OAUTH_TOKEN exists
});

// ─── Composite: the meta-repo's KB-child Resource ─────────────────────────────
// This is the new primitive proposed in polyrepo-architecture.md, made strict.

export const KnowledgeBaseEntrySchema = z.object({
  id:           z.string().regex(/^kb-[a-z0-9-]+$/),
  name:         z.string().min(1),
  repo:         z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  ref:          NodeMajorTagOrSha,
  topic:        z.enum(['design','product','protocol','research']),
  subjectUrl:   z.string().url(),
  blogUrl:      z.string().url().optional(),
  publishDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lastBumped:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  owners:       z.array(z.string().regex(/^@[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)?$/)).min(1),
  requiredSubscription: z.nativeEnum(SubscriptionTier).default(SubscriptionTier.Max),
});
```

## How these get used

1. **`src/data/kb-manifest.json`** is validated against `KnowledgeBaseEntrySchema` array on
   every CI run via the polyrepo's `_reusable-kb-validate.yml` workflow.
2. **`~/.claude/settings.json`** in any child KB repo can be validated by a hook that runs
   `SettingsSchema.safeParse()` on save — catches malformed permissions or hook entries
   before the user opens a session.
3. **`PluginManifestSchema`** validates `.claude-plugin/plugin.json` for the planned
   `kb-template` repo so every new KB child ships with a known-good manifest.
4. **`RuntimeContext`** is computed once at session start and consumed by skills that need
   to gate behavior (e.g., a "deploy KB to Cloudflare Pages" skill that only enables on
   `subscription === Max && oauthTokenPresent === true`).
5. **`HookEvent` / `PermissionMode` / `BuiltinTool` enums** become the source of truth for
   any string referencing those concepts elsewhere in our `src/` — no more stringly-typed
   `'PreToolUse'` floating around.

## What this DOES NOT do (and shouldn't)

- **No code yet.** This is the spec. `src/claude-code/enums.ts` and `src/claude-code/schemas.ts`
  ship in a future `feat(claude-code-types):` PR.
- **Doesn't validate at runtime in the CLI itself.** Claude Code's runtime owns its own
  validation. We're modeling these so *our* meta-repo + child KBs can reason about them.
- **Doesn't try to track every Claude Code release.** Pin to the SHAs of the doc pages used
  (`code.claude.com/docs/en/...md`) and update on a quarterly cadence.

## Sources / pin

| File | URL | Pulled |
|---|---|---|
| `claude-directory.md` | https://code.claude.com/docs/en/claude-directory.md | 2026-04-25 |
| `context-window.md` | https://code.claude.com/docs/en/context-window.md | 2026-04-25 |
| `env-vars.md` | https://code.claude.com/docs/en/env-vars.md | 2026-04-25 |
| `platforms.md` | https://code.claude.com/docs/en/platforms.md | 2026-04-25 |
| `plugins-reference.md` | https://code.claude.com/docs/en/plugins-reference.md | 2026-04-25 |
| `tools-reference.md` | https://code.claude.com/docs/en/tools-reference.md | 2026-04-25 |
