# Architecture: 5-layer SDK

## The 5 layers + their dependencies

```
   orchestrator/        depends on creators + tools + refs
       ↓
   creators/            depends on refs + validators + tools (for fetching upstream examples)
       ↓
   refs/                depends on tools (for re-fetching the pinned doc to verify the SHA)
       ↓
   tools/               depends on validators (every fetched payload is schema-checked)
       ↓
   validators/          depends on nothing (pure Zod + TypeScript)
```

`validators/` at the bottom — pure functions, no side effects, no I/O. Everything else
flows up through it.

## Concrete interfaces (sketches)

### `validators/`

```ts
// src/subagentmcp-sdk/validators/index.ts
import { z, ZodError } from 'zod';

export interface ValidationResult<T> {
  ok: true;
  value: T;
  warnings: string[];
} | {
  ok: false;
  errors: Array<{ path: string; message: string; line?: number }>;
}

export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown,
  ctx?: { sourcePath?: string },
): ValidationResult<T>;

export class ValidationError extends Error {
  constructor(
    public readonly results: ValidationResult<unknown>['errors'],
    public readonly sourcePath?: string,
  );
}
```

### `tools/`

The content layer. Each subdirectory is one reader.

```ts
// src/subagentmcp-sdk/tools/types.ts

/** Universal Reader interface — every tool conforms to this. */
export interface ContentReader<TOptions, TResult> {
  /** What does this reader fetch? */
  readonly kind: 'html' | 'js' | 'xml' | 'md';
  /** Run the read. Returns null when bloom filter says "already seen". */
  read(url: string, opts?: TOptions): Promise<TResult | null>;
}

// src/subagentmcp-sdk/tools/subagent-html.ts
export interface HTMLReadOptions {
  /** Strip <script>, <style>, <noscript>; default true. */
  stripCode?: boolean;
  /** Use Mozilla Readability before markdown conversion; default true. */
  readability?: boolean;
  /** Max byte budget for the returned markdown (default 50_000 = ~12k tokens). */
  maxBytes?: number;
  /** CSS selector to scope the read (e.g. 'main', 'article'). */
  selector?: string;
}

export interface HTMLReadResult {
  /** Source URL (canonicalized). */
  url: string;
  /** Markdown body — already converted, ready to hand to the LLM. */
  markdown: string;
  /** SHA-256 of the source HTML, for ref pinning. */
  sourceSha256: string;
  /** Number of bytes saved by the bloom filter / readability pass. */
  bytesElided: number;
  /** Was this served from cache? */
  fromCache: boolean;
}

export const subagentHtml: ContentReader<HTMLReadOptions, HTMLReadResult>;
```

### `refs/`

```ts
// src/subagentmcp-sdk/refs/types.ts
import { z } from 'zod';

/** A reference to an upstream Anthropic doc page, pinned by SHA. */
export interface PinnedRef<TSchema extends z.ZodType> {
  /** e.g. 'sub-agents' */
  readonly name: string;
  /** Full upstream URL */
  readonly upstreamUrl: string;
  /** SHA-256 of the upstream HTML when this ref was last verified */
  readonly pinnedSha256: string;
  /** When the SHA was last verified (ISO 8601) */
  readonly verifiedAt: string;
  /** The Zod schema this ref defines */
  readonly schema: TSchema;
  /** Re-fetch upstream and check if SHA matches. Returns true if pin is still valid. */
  verify(): Promise<{ valid: boolean; currentSha: string }>;
}
```

### `creators/`

```ts
// src/subagentmcp-sdk/creators/types.ts
export interface Creator<TInput, TOutput extends { path: string; content: string }> {
  /** What does this creator emit? */
  readonly emits: 'subagent' | 'skill' | 'hook' | 'lsp-server' | 'mcp-server';
  /** Which ref does it consume? */
  readonly ref: PinnedRef<z.ZodType<TInput>>;
  /** Run the creator. Validates input against the ref's schema, then renders. */
  create(input: TInput): TOutput;
  /** Dry-run: validate input without writing. */
  validate(input: TInput): ValidationResult<TInput>;
}
```

### `orchestrator/`

```ts
// src/subagentmcp-sdk/orchestrator/types.ts

/** A unit of work the lead can dispatch. */
export interface Task {
  id: string;
  prompt: string;
  /** Which subagent handles this. References agents/<name>.md by name. */
  agentName: string;
  /** Required tools — overrides subagent default if specified. */
  tools?: string[];
  /** Stop after N turns. */
  maxTurns?: number;
  /** Run in background; lead doesn't block. */
  background?: boolean;
  /** Spawn in a git worktree. */
  isolation?: 'worktree' | 'none';
}

/** The lead's view of a spawned subagent. */
export interface AgentHandle {
  taskId: string;
  agentName: string;
  status: 'running' | 'completed' | 'failed' | 'awaiting-approval';
  result?: unknown;
  send(msg: string): Promise<void>;     // mailbox-style messaging (agent-teams primitive)
  receive(): AsyncIterable<unknown>;     // stream output back to lead
}

/** Spawn N subagents in parallel; return when all complete. */
export function spawnFleet(tasks: Task[]): Promise<AgentHandle[]>;

/** Spawn an agent team (experimental — uses CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1). */
export function runTeam(opts: {
  members: Array<{ name: string; role: string; agentName?: string }>;
  taskList: string[];
  displayMode?: 'tabs' | 'sidebar' | 'lead-only';
}): Promise<{ teamName: string; handles: AgentHandle[] }>;

/** Pause the lead until human-in-loop approves. */
export function approvalGate(prompt: string, default_?: 'allow' | 'deny'): Promise<boolean>;
```

## Cross-cutting concerns

### Error handling

Every layer follows fail-closed semantics:
- `validators/` returns `ValidationResult` (never throws on bad input)
- `tools/` returns `null` when bloom-filter cached or fetch fails (never throws)
- `creators/` throws `ValidationError` if input doesn't pass; never writes a partial file
- `orchestrator/` propagates failures up to the lead with structured `AgentHandle.status`

### Observability

Every layer emits structured events to a single log target — `~/.claude/subagentmcp-sdk/events.jsonl`
by default — for post-hoc analysis. Events include:

- `tool.fetch.start/complete/cached/error`
- `creator.validate.ok/fail`
- `orchestrator.spawn/complete/timeout`
- `ref.pin.verified/drifted`

### Subscription gating

The orchestrator checks `process.env.CLAUDE_CODE_OAUTH_TOKEN` at boot. Some features
(experimental agent teams, parallel fleets > 3) are Max-only and surface a clear error
on lower tiers.

## Why these layer boundaries

- **Refs are below creators** because creators consume schemas; refs don't depend on what
  creators do with them
- **Tools are above validators** because every fetched payload should be Zod-checked, but
  validators don't know or care about HTTP
- **Orchestrator is at the top** because it composes everything else; no other layer should
  import from it
- **No cycles permitted** — enforced by `tsup` build at compile time
